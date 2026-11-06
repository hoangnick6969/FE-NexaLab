export type Prediction = "ON" | "OFF" | null;
export type BulbCircuit = {
  nodes: Array<{ id: string; type: "battery" | "bulb" | "switch"; closed?: boolean }>;
  edges: Array<{ source: string; target: string }>;
};
export type Checkpoint = { id: "CLOSED" | "OPEN"; state: BulbCircuit; prediction: Prediction };
export type BulbEvidence = { checkpoints: [Checkpoint, Checkpoint]; explanation: "A" | "B" | "C" | null };
export type Phase = "predict-closed" | "switch-closed" | "predict-open" | "switch-open" | "explain" | "ready";

export function circuit(closed: boolean): BulbCircuit {
  return {
    nodes: [{ id: "battery", type: "battery" }, { id: "bulb", type: "bulb" }, { id: "switch", type: "switch", closed }],
    edges: [{ source: "battery", target: "bulb" }, { source: "bulb", target: "switch" }, { source: "switch", target: "battery" }],
  };
}

export function defaultBulbEvidence(): BulbEvidence {
  return {
    checkpoints: [
      { id: "CLOSED", state: circuit(false), prediction: null },
      { id: "OPEN", state: circuit(true), prediction: null },
    ],
    explanation: null,
  };
}

export function evidenceFrom(value: any): BulbEvidence {
  const valid = Array.isArray(value?.checkpoints) && value.checkpoints.length === 2 &&
    value.checkpoints[0]?.id === "CLOSED" && value.checkpoints[1]?.id === "OPEN" &&
    value.checkpoints.every((item: any) =>
      Array.isArray(item?.state?.nodes) && Array.isArray(item?.state?.edges) &&
      item.state.nodes.some((node: any) => node?.type === "switch" && typeof node.closed === "boolean") &&
      (item.prediction === null || item.prediction === "ON" || item.prediction === "OFF")) &&
    (value.explanation === null || ["A", "B", "C"].includes(value.explanation));
  return valid ? value : defaultBulbEvidence();
}

export function switchClosed(checkpoint: Checkpoint) {
  return checkpoint.state.nodes.find((node) => node.type === "switch")?.closed === true;
}

export function phaseOf(evidence: BulbEvidence): Phase {
  if (evidence.checkpoints[0].prediction === null) return "predict-closed";
  if (!switchClosed(evidence.checkpoints[0])) return "switch-closed";
  if (evidence.checkpoints[1].prediction === null) return "predict-open";
  if (switchClosed(evidence.checkpoints[1])) return "switch-open";
  if (!evidence.explanation) return "explain";
  return "ready";
}

/** SAI-01A in-run hint targets: the step waiting for a prediction, and the last observed one. */
export function bulbHintStep(value: unknown) {
  const evidence = evidenceFrom(value);
  const phase = phaseOf(evidence);
  const [closed, open] = evidence.checkpoints;
  const ask = phase === "predict-closed" ? "prediction:CLOSED" : phase === "predict-open" ? "prediction:OPEN" : phase === "explain" ? "explanation" : null;
  const observed = open.prediction !== null && !switchClosed(open) ? open
    : closed.prediction !== null && switchClosed(closed) ? closed : null;
  return {
    ask: ask ? { criterion: ask } : null,
    reflect: observed ? { criterion: "prediction:" + observed.id, state: observed.state, prediction: observed.prediction } : null,
  };
}

export function bulbEvidenceReady(value: unknown): boolean {
  const evidence = evidenceFrom(value);
  return switchClosed(evidence.checkpoints[0]) && evidence.checkpoints[0].prediction !== null &&
    !switchClosed(evidence.checkpoints[1]) && evidence.checkpoints[1].prediction !== null &&
    ["A", "B", "C"].includes(evidence.explanation ?? "");
}

