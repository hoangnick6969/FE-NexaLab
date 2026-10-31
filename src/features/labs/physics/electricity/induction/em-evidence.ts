import { emInduction } from "@nexalab/sim";

// FL-25 checkpoint evidence. The checkpoint states are the fixed apparatus
// steps the server requires; `observed` is local UI progress kept only in the
// draft and never sent (the run host submits checkpoints + explanation).

export type EmCheckpointId = "STILL" | "PUSH" | "PULL" | "ROTATE";
export type EmPrediction = "CURRENT" | "NO_CURRENT" | "SAME" | "OPPOSITE" | "NONE" | "ONE_DIRECTION" | "ALTERNATING";
export type EmState =
  | { setup: "magnet-coil"; circuit: "CLOSED" | "OPEN"; poleFacingCoil: "N" | "S"; magnetPosition: "OUTSIDE" | "INSIDE"; motion: "STILL" | "TOWARD" | "AWAY" }
  | { setup: "generator"; circuit: "CLOSED" | "OPEN"; rotation: "STILL" | "CW" | "CCW"; turns: 0 | 1 };
export type EmCheckpoint = { id: EmCheckpointId; state: EmState; prediction: EmPrediction | null };
export type EmEvidence = {
  checkpoints: [EmCheckpoint, EmCheckpoint, EmCheckpoint, EmCheckpoint];
  explanation: "A" | "B" | "C" | null;
  observed: Record<EmCheckpointId, boolean>;
};
export type EmObservation = ReturnType<typeof emInduction>;

export const EM_CHECKPOINT_IDS: EmCheckpointId[] = ["STILL", "PUSH", "PULL", "ROTATE"];
export const EM_CHOICES: Record<EmCheckpointId, EmPrediction[]> = {
  STILL: ["CURRENT", "NO_CURRENT"],
  PUSH: ["CURRENT", "NO_CURRENT"],
  PULL: ["SAME", "OPPOSITE", "NONE"],
  ROTATE: ["ONE_DIRECTION", "ALTERNATING", "NONE"],
};
const STATES: Record<EmCheckpointId, EmState> = {
  STILL: { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "N", magnetPosition: "OUTSIDE", motion: "STILL" },
  PUSH: { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "N", magnetPosition: "INSIDE", motion: "TOWARD" },
  PULL: { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "N", magnetPosition: "OUTSIDE", motion: "AWAY" },
  ROTATE: { setup: "generator", circuit: "CLOSED", rotation: "CW", turns: 1 },
};

export function defaultEmEvidence(): EmEvidence {
  return {
    checkpoints: EM_CHECKPOINT_IDS.map((id) => ({ id, state: { ...STATES[id] }, prediction: null })) as EmEvidence["checkpoints"],
    explanation: null,
    observed: { STILL: false, PUSH: false, PULL: false, ROTATE: false },
  };
}

export function emEvidenceFrom(value: any): EmEvidence {
  const valid = Array.isArray(value?.checkpoints) && value.checkpoints.length === 4 &&
    value.checkpoints.every((item: any, index: number) => item?.id === EM_CHECKPOINT_IDS[index] &&
      JSON.stringify(item.state) === JSON.stringify(STATES[item.id as EmCheckpointId]) &&
      (item.prediction === null || EM_CHOICES[item.id as EmCheckpointId].includes(item.prediction))) &&
    (value.explanation === null || ["A", "B", "C"].includes(value.explanation)) &&
    EM_CHECKPOINT_IDS.every((id) => typeof value?.observed?.[id] === "boolean");
  return valid ? value : defaultEmEvidence();
}

export type EmPhase =
  | { kind: "predict"; id: EmCheckpointId; index: number }
  | { kind: "act"; id: EmCheckpointId; index: number }
  | { kind: "explain" }
  | { kind: "ready" };

/** The next step follows from evidence alone, so a restored draft resumes in place. */
export function emPhaseOf(evidence: EmEvidence): EmPhase {
  for (const [index, checkpoint] of evidence.checkpoints.entries()) {
    if (checkpoint.prediction === null) return { kind: "predict", id: checkpoint.id, index };
    if (!evidence.observed[checkpoint.id]) return { kind: "act", id: checkpoint.id, index };
  }
  return evidence.explanation ? { kind: "ready" } : { kind: "explain" };
}
export const EM_STEP_COUNT = 9;
export function emStepNumber(phase: EmPhase) {
  if (phase.kind === "predict") return phase.index * 2 + 1;
  if (phase.kind === "act") return phase.index * 2 + 2;
  return 9;
}

export function emEvidenceReady(value: unknown) {
  const evidence = emEvidenceFrom(value);
  return emPhaseOf(evidence).kind === "ready";
}

/** Advisory preview from the pinned shared model; the server result replaces it. */
export function previewObservation(state: EmState): EmObservation | null {
  try { return emInduction(state); } catch { return null; }
}
