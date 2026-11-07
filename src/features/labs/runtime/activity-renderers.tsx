import type { ComponentType } from "react";
import { loadLabActivity } from "./lazy-lab-activity";
import { defaultCircuit } from "../physics/electricity/circuit-state";
import { bulbEvidenceReady, defaultBulbEvidence } from "../physics/electricity/circuit-bulb-evidence";
import { circuitBulbCopy, CircuitBulbResult } from "../physics/electricity/CircuitBulbResult";
import { checkpointViewForRenderer } from "./checkpoint-views";
import { defaultDensityEvidence, densityEvidenceReady } from "../physics/fluid/density/density-evidence";
import { DensityResult, densityCopy } from "../physics/fluid/density/DensityResult";
import { defaultBuoyancyEvidence, buoyancyEvidenceReady, BuoyancyResult, buoyancyCopy } from "../physics/fluid/buoyancy/BuoyancyEvidence";
import { defaultGeneEvidence, geneEvidenceReady } from "../biology/molecular/gene-protein/gene-evidence";
import { GeneResult, geneResultCopy } from "../biology/molecular/gene-protein/GeneResult";
import { defaultEyeOpticsEvidence, eyeOpticsEvidenceReady } from "../biology/anatomy/eye-optics/eye-optics-evidence";
import { EyeOpticsResult, eyeOpticsCopy } from "../biology/anatomy/eye-optics/EyeOpticsResult";

const Circuit = loadLabActivity(() => import("../physics/electricity/Circuit").then((module) => ({ default: module.Circuit })));
const CircuitBulbActivity = loadLabActivity(() => import("../physics/electricity/CircuitBulbActivity").then((module) => ({ default: module.CircuitBulbActivity })));
const Chemistry = loadLabActivity(() => import("../chemistry/Chemistry").then((module) => ({ default: module.Chemistry })));
const DensityActivity = loadLabActivity(() => import("../physics/fluid/density/DensityActivity").then((module) => ({ default: module.DensityActivity })));
const BuoyancyActivity = loadLabActivity(() => import("../physics/fluid/buoyancy/BuoyancyActivity").then((module) => ({ default: module.BuoyancyActivity })));
const Eye = loadLabActivity(() => import("../biology/anatomy/Eye"));
const EyeOpticsActivity = loadLabActivity(() => import("../biology/anatomy/eye-optics/EyeOpticsActivity").then((module) => ({ default: module.EyeOpticsActivity })));
const GeneProteinActivity = loadLabActivity(() => import("../biology/molecular/gene-protein/GeneProteinActivity").then((module) => ({ default: module.GeneProteinActivity })));

/** Where the pinned server rubric expects learner data in a `lab-contract/1` submission. */
export type SubmissionEnvelope = "labState" | "checkpoints" | "evidence";

export type LabActivityProps = { state: any; onChange: (next: any) => void; result?: any; resetKey: number; runtimeParams?: Record<string, string | number> | null; runtimeConfig?: unknown; displayQuestions?: string[]; authoring?: boolean; onDisplayQuestionChange?: (index: number, value: string) => void };

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
    key: "buoyancy-bench", labId: "buoyancy", modelRefs: ["buoyancy@1.0.0"], envelope: "evidence",
    defaultState: defaultBuoyancyEvidence,
    Activity: (props) => <BuoyancyActivity {...props} />,
    guided: { ready: buoyancyEvidenceReady, copy: buoyancyCopy, Result: BuoyancyResult },
  },
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
    // FL-20 ecology-tolerance; its scene loads when selected.
    key: "ecology-tolerance", labId: "ecology-tolerance", modelRefs: ["ecology-tolerance@1.0.0"], envelope: "checkpoints",
    defaultState: () => checkpointViewForRenderer("ecology-tolerance")!.defaultEvidence(),
    Activity: ({ state, onChange }) => {
      const view = checkpointViewForRenderer("ecology-tolerance")!;
      return <view.Activity state={state} onChange={onChange} />;
    },
    guided: {
      ready: (state) => checkpointViewForRenderer("ecology-tolerance")!.ready(state),
      copy: circuitBulbCopy,
      Result: ({ result, verdict }) => <CircuitBulbResult result={result} verdict={verdict} describeObservation={checkpointViewForRenderer("ecology-tolerance")!.describeResult} />,
    },
  },
  {
    // FL-21 food-web; its scene loads when selected.
    key: "food-web", labId: "food-web", modelRefs: ["food-web@1.0.0"], envelope: "checkpoints",
    defaultState: () => checkpointViewForRenderer("food-web")!.defaultEvidence(),
    Activity: ({ state, onChange }) => {
      const view = checkpointViewForRenderer("food-web")!;
      return <view.Activity state={state} onChange={onChange} />;
    },
    guided: {
      ready: (state) => checkpointViewForRenderer("food-web")!.ready(state),
      copy: circuitBulbCopy,
      Result: ({ result, verdict }) => <CircuitBulbResult result={result} verdict={verdict} describeObservation={checkpointViewForRenderer("food-web")!.describeResult} />,
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
    // FL-27 gene-to-protein, private engineering prototype. The server pins a gene variant per run (runtimeParams.variantId)
    // and marks the evidence with rubric gene-protein-stations@1.0.0.
    key: "gene-expression", labId: "gene-protein", modelRefs: ["gene-expression@1.0.0"], envelope: "evidence",
    defaultState: defaultGeneEvidence,
    Activity: ({ state, onChange, resetKey, runtimeParams }) => <GeneProteinActivity state={state} onChange={onChange} resetKey={resetKey} runtimeParams={runtimeParams} />,
    guided: { ready: geneEvidenceReady, copy: geneResultCopy, Result: GeneResult },
  },
  {
    key: "mass-conservation", labId: "mass-conservation", modelRefs: ["mass-conservation@1.0.0"], envelope: "labState",
    defaultState: () => ({}),
    Activity: () => null, // The run-bound FL-10 activity is rendered by Lab.
  },
  {
    key: "lever-bench", labId: "lever-equilibrium", modelRefs: ["lever-bench@1.0.0"], envelope: "labState",
    defaultState: () => ({}), Activity: () => null, // Run-bound K5 activity renders in Lab.
  },
  {
    key: "thermal-bench", labId: "thermal-energy", modelRefs: ["thermal-bench@1.0.0"], envelope: "labState",
    defaultState: () => ({}), Activity: () => null, // Run-bound K4 activity renders in Lab.
  },
  {
    key: "chemistry", labId: "chemistry", modelRefs: ["chemistry@1.0.0"], envelope: "labState",
    defaultState: () => ({ reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 }),
    Activity: ({ state, onChange, result }) => <Chemistry state={state} onChange={onChange} result={result} />,
  },
  {
    key: "eye", labId: "eye", modelRefs: ["eye@1.0.0"], envelope: "labState",
    defaultState: () => ({ answers: {} }),
    Activity: ({ state, onChange, resetKey }) => <Eye key={resetKey} state={state} onChange={onChange} />,
  },
  {
    // FL-16 eye structure (phase 1) and accommodation with corrective lenses (phase 2). Rubric eye-anatomy-optics@1.0.0.
    key: "eye-anatomy-optics", labId: "eye-optics", modelRefs: ["eye-optics@1.0.0"], envelope: "evidence",
    defaultState: defaultEyeOpticsEvidence,
    Activity: ({ state, onChange, resetKey }) => <EyeOpticsActivity state={state} onChange={onChange} resetKey={resetKey} />,
    guided: { ready: eyeOpticsEvidenceReady, copy: eyeOpticsCopy, Result: EyeOpticsResult },
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
