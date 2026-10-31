import { ecologyTolerance } from "@nexalab/sim";

// FL-20 checkpoint evidence. Checkpoint states are the fixed steps the server
// requires; `observed` is local UI progress kept only in the draft and never
// sent (the run host submits checkpoints + explanation).

export type EcoCheckpointId = "T_INSIDE" | "T_ABOVE" | "LIMITS" | "IMPORT" | "DENSITY" | "AGE";
export type EcoChoice =
  | "PERSISTS" | "NOT_PERSIST" | "L1" | "L2" | "L3" | "L4"
  | "FISH_A" | "FISH_B" | "FISH_C" | "NONE" | "GROWING" | "STABLE" | "DECLINING";
export type DensityUnit = "PER_HA" | "PER_M2" | "PER_M3";
export type DensityAnswer = { value: string; unit: DensityUnit };
export type EcoState =
  | { setup: "tolerance"; speciesId: "ca-ro-phi"; factor: "TEMPERATURE"; valueDeciC: number }
  | { setup: "tolerance-sweep"; speciesId: "ca-ro-phi"; factor: "TEMPERATURE" }
  | { setup: "import-comparison"; siteId: "site-demo"; factor: "TEMPERATURE" }
  | { setup: "density"; populationId: "lim-xanh" | "bap-cai" | "ca-chep" }
  | { setup: "age-structure"; sampleId: "P1" | "P2" | "P3" };
export type EcoCheckpoint = { id: EcoCheckpointId; state: EcoState; prediction: EcoChoice | DensityAnswer | null };
export type EcoEvidence = {
  checkpoints: [EcoCheckpoint, EcoCheckpoint, EcoCheckpoint, EcoCheckpoint, EcoCheckpoint, EcoCheckpoint];
  explanation: "A" | "B" | "C" | null;
  observed: Record<EcoCheckpointId, boolean>;
};
export type EcoObservation = ReturnType<typeof ecologyTolerance>;

export const ECO_CHECKPOINT_IDS: EcoCheckpointId[] = ["T_INSIDE", "T_ABOVE", "LIMITS", "IMPORT", "DENSITY", "AGE"];
export const ECO_CHOICES: Record<Exclude<EcoCheckpointId, "DENSITY">, EcoChoice[]> = {
  T_INSIDE: ["PERSISTS", "NOT_PERSIST"],
  T_ABOVE: ["PERSISTS", "NOT_PERSIST"],
  LIMITS: ["L1", "L2", "L3", "L4"],
  IMPORT: ["FISH_A", "FISH_B", "FISH_C", "NONE"],
  AGE: ["GROWING", "STABLE", "DECLINING"],
};
/** LIMITS option ranges, fixed in activity version 1 (deci °C). */
export const LIMIT_OPTIONS: Record<"L1" | "L2" | "L3" | "L4", [number, number]> = {
  L1: [56, 420], L2: [0, 420], L3: [56, 300], L4: [300, 440],
};
export const DENSITY_UNITS: DensityUnit[] = ["PER_HA", "PER_M2", "PER_M3"];
export const DENSITY_PATTERN = /^\d{1,9}([.,]\d{1,3})?$/;
/** LIMITS is read after the sweep; every other checkpoint is predicted before it is observed. */
export const OBSERVE_FIRST: ReadonlySet<EcoCheckpointId> = new Set(["LIMITS"]);

const water = (valueDeciC: number): EcoState => ({ setup: "tolerance", speciesId: "ca-ro-phi", factor: "TEMPERATURE", valueDeciC });
export const ECO_STATES: Record<EcoCheckpointId, EcoState> = {
  T_INSIDE: water(300),
  T_ABOVE: water(440),
  LIMITS: { setup: "tolerance-sweep", speciesId: "ca-ro-phi", factor: "TEMPERATURE" },
  IMPORT: { setup: "import-comparison", siteId: "site-demo", factor: "TEMPERATURE" },
  DENSITY: { setup: "density", populationId: "bap-cai" },
  AGE: { setup: "age-structure", sampleId: "P3" },
};

export function defaultEcoEvidence(): EcoEvidence {
  return {
    checkpoints: ECO_CHECKPOINT_IDS.map((id) => ({ id, state: { ...ECO_STATES[id] }, prediction: null })) as EcoEvidence["checkpoints"],
    explanation: null,
    observed: { T_INSIDE: false, T_ABOVE: false, LIMITS: false, IMPORT: false, DENSITY: false, AGE: false },
  };
}

const validPrediction = (id: EcoCheckpointId, prediction: unknown) => {
  if (prediction === null) return true;
  if (id === "DENSITY") {
    const answer = prediction as DensityAnswer;
    return typeof answer?.value === "string" && DENSITY_PATTERN.test(answer.value) && DENSITY_UNITS.includes(answer.unit) && Object.keys(answer).length === 2;
  }
  return (ECO_CHOICES[id] as unknown[]).includes(prediction);
};

export function ecoEvidenceFrom(value: any): EcoEvidence {
  const valid = Array.isArray(value?.checkpoints) && value.checkpoints.length === 6 &&
    value.checkpoints.every((item: any, index: number) => item?.id === ECO_CHECKPOINT_IDS[index] &&
      JSON.stringify(item.state) === JSON.stringify(ECO_STATES[item.id as EcoCheckpointId]) &&
      validPrediction(item.id, item.prediction)) &&
    (value.explanation === null || ["A", "B", "C"].includes(value.explanation)) &&
    ECO_CHECKPOINT_IDS.every((id) => typeof value?.observed?.[id] === "boolean");
  return valid ? value : defaultEcoEvidence();
}

export type EcoPhase =
  | { kind: "predict"; id: EcoCheckpointId; index: number }
  | { kind: "act"; id: EcoCheckpointId; index: number }
  | { kind: "explain" }
  | { kind: "ready" };

/** The next step follows from evidence alone, so a restored draft resumes in place. */
export function ecoPhaseOf(evidence: EcoEvidence): EcoPhase {
  for (const [index, checkpoint] of evidence.checkpoints.entries()) {
    const predicted = checkpoint.prediction !== null, observed = evidence.observed[checkpoint.id];
    if (OBSERVE_FIRST.has(checkpoint.id)) {
      if (!observed) return { kind: "act", id: checkpoint.id, index };
      if (!predicted) return { kind: "predict", id: checkpoint.id, index };
    } else {
      if (!predicted) return { kind: "predict", id: checkpoint.id, index };
      if (!observed) return { kind: "act", id: checkpoint.id, index };
    }
  }
  return evidence.explanation ? { kind: "ready" } : { kind: "explain" };
}
export const ECO_STEP_COUNT = ECO_CHECKPOINT_IDS.length * 2 + 1;
export function ecoStepNumber(phase: EcoPhase) {
  if (phase.kind === "explain" || phase.kind === "ready") return ECO_STEP_COUNT;
  const first = OBSERVE_FIRST.has(phase.id) ? "act" : "predict";
  return phase.index * 2 + (phase.kind === first ? 1 : 2);
}

export function ecoEvidenceReady(value: unknown) {
  return ecoPhaseOf(ecoEvidenceFrom(value)).kind === "ready";
}

/** Advisory preview from the pinned shared model; the server result replaces it. */
export function previewEco(state: EcoState): EcoObservation | null {
  try { return ecologyTolerance(state); } catch { return null; }
}
export const tolerance = (valueDeciC: number) => previewEco(water(valueDeciC)) as Extract<EcoObservation, { setup: "tolerance" }> | null;

/** 56 → "5,6"; Vietnamese decimal comma. */
export const formatDeciC = (value: number) => (value / 10).toFixed(1).replace(".", ",");
export const formatCount = (value: number) => value.toLocaleString("vi-VN");
