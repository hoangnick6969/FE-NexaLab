import { lazy, Suspense, type ComponentType } from "react";
import { InlineLoader } from "../../../components/ui";
import { defineText } from "../../../i18n";
import { Circuit, defaultCircuit } from "../physics/electricity/Circuit";
import { bulbEvidenceReady, CircuitBulbActivity, defaultBulbEvidence } from "../physics/electricity/CircuitBulbActivity";
import { circuitBulbCopy, CircuitBulbResult } from "../physics/electricity/CircuitBulbResult";
import { Chemistry } from "../chemistry/Chemistry";
import { checkpointViewForRenderer } from "./checkpoint-views";
import { DensityActivity, defaultDensityEvidence, densityEvidenceReady } from "../physics/fluid/density/DensityActivity";
import { DensityResult, densityCopy } from "../physics/fluid/density/DensityResult";
import { defaultGeneEvidence, geneEvidenceReady } from "../biology/molecular/gene-protein/gene-evidence";
import { GeneResult, geneResultCopy } from "../biology/molecular/gene-protein/GeneResult";

const text = defineText({ vi: { loadingEye: "Đang nạp mô hình 3D giải phẫu mắt…", loadingGene: "Đang nạp mô hình phân tử DNA…" }, en: { loadingEye: "Loading the 3D eye anatomy model…", loadingGene: "Loading the DNA molecule scene…" } });
const Eye = lazy(() => import("../biology/anatomy/Eye"));
// FL-27 pulls in the K7 molecular kit; load it only when that Lab opens.
const GeneProteinActivity = lazy(() => import("../biology/molecular/gene-protein/GeneProteinActivity").then((module) => ({ default: module.GeneProteinActivity })));

/** Where the pinned server rubric expects learner data in a `lab-contract/1` submission. */
export type SubmissionEnvelope = "labState" | "checkpoints" | "evidence";

export type LabActivityProps = { state: any; onChange: (next: any) => void; result?: any; resetKey: number; runtimeParams?: Record<string, string | number> | null };

export type GuidedActivity = {
  /** Submission is enabled only when the activity evidence is complete. */
  ready: (state: unknown) => boolean;
  copy: () => { submit: string; waiting: string; resultTitle: string; assessment: string };
  Result: ComponentType<{ result: any; verdict: string }>;
};

/**
 * Presentation for one deployed model family. A renderer never computes
 * official science or scores; the server result replaces any preview.
 */
export type LabActivityRenderer = {
  key: string;
  labId: string;
  modelRefs: readonly string[];
  envelope: SubmissionEnvelope;
  Activity: ComponentType<LabActivityProps>;
  defaultState: () => unknown;
  /** Guided activities own their steps and feedback; legacy challenges use the shared challenge panel, preview and tutor. */
  guided?: GuidedActivity;
};

const renderers: readonly LabActivityRenderer[] = [
  {
    key: "em-induction", labId: "em-induction", modelRefs: ["em-induction@1.0.0"], envelope: "checkpoints",
    defaultState: () => checkpointViewForRenderer("em-induction")!.defaultEvidence(),
    Activity: ({ state, onChange }) => {
      const view = checkpointViewForRenderer("em-induction")!;
      return <view.Activity state={state} onChange={onChange} />;
    },
    guided: {
      ready: (state) => checkpointViewForRenderer("em-induction")!.ready(state),
      copy: circuitBulbCopy,
      Result: ({ result, verdict }) => <CircuitBulbResult result={result} verdict={verdict} describeObservation={checkpointViewForRenderer("em-induction")!.describeResult} />,
    },
  },
  {
    key: "circuit", labId: "circuit", modelRefs: ["circuit@1.0.0"], envelope: "labState",
    defaultState: defaultCircuit,
    Activity: ({ state, onChange, resetKey }) => <Circuit key={resetKey} initial={state.nodes ? state : defaultCircuit()} onChange={onChange} />,
  },
  {
    key: "circuit-bulb", labId: "circuit", modelRefs: ["circuit-bulb@1.0.0"], envelope: "checkpoints",
    defaultState: defaultBulbEvidence,
    Activity: ({ state, onChange }) => <CircuitBulbActivity state={state} onChange={onChange} />,
    guided: { ready: bulbEvidenceReady, copy: circuitBulbCopy, Result: CircuitBulbResult },
  },
  {
    // FL-03 density, 2D pilot. Needs a pinned density-bench pack and an active Lab to launch.
    key: "density-bench", labId: "density", modelRefs: ["density-bench@1.0.0"], envelope: "evidence",
    defaultState: defaultDensityEvidence,
    Activity: ({ state, onChange, resetKey, runtimeParams }) => <DensityActivity state={state} onChange={onChange} resetKey={resetKey} runtimeParams={runtimeParams} />,
    guided: { ready: densityEvidenceReady, copy: densityCopy, Result: DensityResult },
  },
  {
    // FL-27 gene-to-protein, private engineering prototype. Needs a pinned gene-expression pack and an active Lab to launch.
    key: "gene-expression", labId: "gene-protein", modelRefs: ["gene-expression@1.0.0"], envelope: "evidence",
    defaultState: defaultGeneEvidence,
    Activity: ({ state, onChange, resetKey, runtimeParams }) => <Suspense fallback={<InlineLoader message={text().loadingGene} />}>
      <GeneProteinActivity state={state} onChange={onChange} resetKey={resetKey} runtimeParams={runtimeParams} />
    </Suspense>,
    guided: { ready: geneEvidenceReady, copy: geneResultCopy, Result: GeneResult },
  },
  {
    key: "mass-conservation", labId: "mass-conservation", modelRefs: ["mass-conservation@1.0.0"], envelope: "labState",
    defaultState: () => ({}),
    Activity: () => null, // The run-bound FL-10 activity is rendered by Lab.
  },
  {
    key: "chemistry", labId: "chemistry", modelRefs: ["chemistry@1.0.0"], envelope: "labState",
    defaultState: () => ({ reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 }),
    Activity: ({ state, onChange, result }) => <Chemistry state={state} onChange={onChange} result={result} />,
  },
  {
    key: "eye", labId: "eye", modelRefs: ["eye@1.0.0"], envelope: "labState",
    defaultState: () => ({ answers: {} }),
    Activity: ({ state, onChange, resetKey }) => <Suspense fallback={<InlineLoader message={text().loadingEye} />}>
      <Eye key={resetKey} state={state} onChange={onChange} />
    </Suspense>,
  },
];

const byKey = new Map(renderers.map((renderer) => [renderer.key, renderer]));

export const labRenderer = (key: string | null | undefined) => (key ? byKey.get(key) ?? null : null);

export const hasLabRenderer = (labId: string) => renderers.some((renderer) => renderer.labId === labId);

/** Renderer for a launch; each deployed model version needs one explicit entry, otherwise none. */
export function resolveLabRenderer(launch: { rendererKey: string | null; labId: string; modelRef: string }) {
  const renderer = labRenderer(launch.rendererKey ?? launch.labId);
  return renderer?.labId === launch.labId && renderer.modelRefs.includes(launch.modelRef) ? renderer : null;
}

/** Renderer for a Lab outside a run (teacher preview): its configured model, else the Lab's legacy view. */
export function previewLabRenderer(labId: string, modelRef?: string | null) {
  return renderers.find((renderer) => renderer.labId === labId && modelRef && renderer.modelRefs.includes(modelRef)) ??
    labRenderer(labId);
}

export function submissionPayload(renderer: LabActivityRenderer, state: unknown) {
  if (renderer.envelope === "checkpoints") {
    const evidence = state as { checkpoints?: unknown; explanation?: unknown } | null;
    return { checkpoints: evidence?.checkpoints, explanation: evidence?.explanation };
  }
  return renderer.envelope === "evidence" ? { evidence: state } : { labState: state };
}
