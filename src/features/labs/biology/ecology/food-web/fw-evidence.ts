import { FOOD_WEB_CAUSES, FOOD_WEB_SPECIES, foodWeb } from "@nexalab/sim";

// FL-21 checkpoint evidence. Fixed checkpoints carry the state the server
// requires; CHAIN carries the learner's own chain. `observed` is local UI
// progress kept only in the draft and never sent.

export type FwCheckpointId = "ROLES" | "CHAIN" | "ENERGY" | "HUNT" | "DEFOREST" | "CAUSES";
export type SpeciesId = keyof typeof FOOD_WEB_SPECIES;
export type CauseId = keyof typeof FOOD_WEB_CAUSES;
export type Role = "PRODUCER" | "CONSUMER" | "DECOMPOSER";
export type Effect = "INCREASE" | "DECREASE" | "NO_DIRECT_EFFECT";
export type RolesAnswer = { co: Role; ech: Role; "nam-vi-khuan": Role };
export type FwPrediction = RolesAnswer | "CHAIN" | { value: string } | Effect | CauseId[];
export type FwCheckpoint = { id: FwCheckpointId; state: Record<string, unknown>; prediction: FwPrediction | null };
export type FwEvidence = {
  checkpoints: [FwCheckpoint, FwCheckpoint, FwCheckpoint, FwCheckpoint, FwCheckpoint, FwCheckpoint];
  explanation: "A" | "B" | "C" | null;
  observed: Record<FwCheckpointId, boolean>;
};

const FW_CHECKPOINT_IDS: FwCheckpointId[] = ["ROLES", "CHAIN", "ENERGY", "HUNT", "DEFOREST", "CAUSES"];
export const ROLE_ITEMS = ["co", "ech", "nam-vi-khuan"] as const;
export const ROLES: Role[] = ["PRODUCER", "CONSUMER", "DECOMPOSER"];
export const EFFECTS: Effect[] = ["INCREASE", "DECREASE", "NO_DIRECT_EFFECT"];
export const CAUSE_IDS = Object.keys(FOOD_WEB_CAUSES).sort() as CauseId[];
const SPECIES_IDS = Object.keys(FOOD_WEB_SPECIES) as SpeciesId[];
export const ENERGY_CHAIN = ["co", "chau-chau", "ech", "ran"] as const;
export const ASKED: Record<"HUNT" | "DEFOREST", { removed: SpeciesId; asked: SpeciesId }> = {
  HUNT: { removed: "ran", asked: "ech" },
  DEFOREST: { removed: "cay-xanh", asked: "sau" },
};
export const DECIMAL_PATTERN = /^\d{1,9}([.,]\d{1,3})?$/;
export const MAX_CHAIN = 6;

const W = { webId: "W1" };
const FIXED_STATES: Record<Exclude<FwCheckpointId, "CHAIN">, Record<string, unknown>> = {
  ROLES: { setup: "roles", ...W },
  ENERGY: { setup: "energy", ...W, chain: [...ENERGY_CHAIN] },
  HUNT: { setup: "remove", ...W, speciesId: "ran" },
  DEFOREST: { setup: "remove", ...W, speciesId: "cay-xanh" },
  CAUSES: { setup: "causes", ...W },
};
export const chainState = (nodes: SpeciesId[]) => ({ setup: "chain", ...W, nodes });

export function defaultFwEvidence(): FwEvidence {
  return {
    checkpoints: FW_CHECKPOINT_IDS.map((id) => ({ id, state: id === "CHAIN" ? chainState([]) : { ...FIXED_STATES[id] }, prediction: null })) as FwEvidence["checkpoints"],
    explanation: null,
    observed: { ROLES: false, CHAIN: false, ENERGY: false, HUNT: false, DEFOREST: false, CAUSES: false },
  };
}

const validPrediction = (id: FwCheckpointId, prediction: any): boolean => {
  if (prediction === null) return true;
  if (id === "ROLES") return ROLE_ITEMS.every((item) => ROLES.includes(prediction?.[item])) && Object.keys(prediction).length === ROLE_ITEMS.length;
  if (id === "CHAIN") return prediction === "CHAIN";
  if (id === "ENERGY") return typeof prediction?.value === "string" && DECIMAL_PATTERN.test(prediction.value);
  if (id === "CAUSES") return Array.isArray(prediction) && prediction.every((cause, i) => CAUSE_IDS.includes(cause) && (i === 0 || prediction[i - 1] < cause));
  return EFFECTS.includes(prediction);
};
const validState = (id: FwCheckpointId, state: any): boolean => {
  if (id !== "CHAIN") return JSON.stringify(state) === JSON.stringify(FIXED_STATES[id]);
  return state?.setup === "chain" && state.webId === "W1" && Array.isArray(state.nodes) && state.nodes.length <= MAX_CHAIN &&
    state.nodes.every((node: string) => SPECIES_IDS.includes(node as SpeciesId)) && new Set(state.nodes).size === state.nodes.length;
};

export function fwEvidenceFrom(value: any): FwEvidence {
  const valid = Array.isArray(value?.checkpoints) && value.checkpoints.length === 6 &&
    value.checkpoints.every((item: any, index: number) => item?.id === FW_CHECKPOINT_IDS[index] && validState(item.id, item.state) && validPrediction(item.id, item.prediction)) &&
    (value.explanation === null || ["A", "B", "C"].includes(value.explanation)) &&
    FW_CHECKPOINT_IDS.every((id) => typeof value?.observed?.[id] === "boolean");
  return valid ? value : defaultFwEvidence();
}

export type FwPhase =
  | { kind: "predict"; id: FwCheckpointId; index: number }
  | { kind: "act"; id: FwCheckpointId; index: number }
  | { kind: "explain" }
  | { kind: "ready" };

/** The next step follows from evidence alone, so a restored draft resumes in place. */
export function fwPhaseOf(evidence: FwEvidence): FwPhase {
  for (const [index, checkpoint] of evidence.checkpoints.entries()) {
    if (checkpoint.prediction === null) return { kind: "predict", id: checkpoint.id, index };
    if (!evidence.observed[checkpoint.id]) return { kind: "act", id: checkpoint.id, index };
  }
  return evidence.explanation ? { kind: "ready" } : { kind: "explain" };
}
export const FW_STEP_COUNT = FW_CHECKPOINT_IDS.length * 2 + 1;
export const fwStepNumber = (phase: FwPhase) =>
  phase.kind === "explain" || phase.kind === "ready" ? FW_STEP_COUNT : phase.index * 2 + (phase.kind === "predict" ? 1 : 2);

export const fwEvidenceReady = (value: unknown) => fwPhaseOf(fwEvidenceFrom(value)).kind === "ready";

/** Advisory preview from the pinned shared model; the server result replaces it. */
export function previewFw(state: Record<string, unknown>): any {
  try { return foodWeb(state); } catch { return null; }
}
