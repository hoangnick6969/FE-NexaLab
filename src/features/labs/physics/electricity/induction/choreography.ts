import type { EmCheckpointId, EmEvidence, EmObservation } from "./em-evidence";

// Presentation timing only. The scientific result is the model observation;
// these functions decide how that observation is shown over time.

export type EmAction = "still" | "push" | "pull" | "rotate";
/** `reverse` turns the generator the other way (free explore only); checkpoints never set it. */
export type EmCue = { action: EmAction | null; nonce: number; reverse?: boolean };

export const ACTION_FOR: Record<EmCheckpointId, EmAction> = { STILL: "still", PUSH: "push", PULL: "pull", ROTATE: "rotate" };

export const EM_TIMING = {
  still: 1500, // observe a held magnet
  move: 900, // push or pull stroke
  settle: 900, // needle returns after the stroke
  rotate: 2400, // one crank turn
  rotateSettle: 500,
  reducedHold: 1200, // reduced motion: static deflection is held this long
  reducedPhase: 380, // reduced motion: one 45° frame of the generator
};

export function actionDuration(action: EmAction, reduced: boolean) {
  if (action === "still") return EM_TIMING.still;
  if (action === "rotate") return reduced ? EM_TIMING.reducedPhase * 9 : EM_TIMING.rotate + EM_TIMING.rotateSettle;
  return reduced ? EM_TIMING.reducedHold + 300 : EM_TIMING.move + EM_TIMING.settle;
}

/** Where the bar magnet rests between actions, derived from evidence so a restored draft looks the same. */
export function magnetRest(evidence: EmEvidence): "OUTSIDE" | "INSIDE" {
  return evidence.observed.PUSH && !evidence.observed.PULL ? "INSIDE" : "OUTSIDE";
}

const ease = (p: number) => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 = OUTSIDE, 1 = INSIDE during an action; null when the action does not move the magnet. */
export function magnetTravel(action: EmAction | null, ms: number, reduced: boolean): number | null {
  if (action !== "push" && action !== "pull") return null;
  const p = reduced ? 1 : ease(clamp01(ms / EM_TIMING.move));
  return action === "push" ? p : 1 - p;
}

/** Unsigned rotor progress (radians) of the generator magnet; 0 points along the coil axis. */
export function rotorAngle(action: EmAction | null, ms: number, reduced: boolean): number {
  if (action !== "rotate") return 0;
  if (reduced) return Math.min(8, Math.floor(ms / EM_TIMING.reducedPhase)) * Math.PI / 4;
  return clamp01(ms / EM_TIMING.rotate) * Math.PI * 2;
}

const sign = (direction: string | undefined) => direction === "D1" ? 1 : direction === "D2" ? -1 : 0;

/**
 * Signed, unitless current level in [-1, 1] that drives the needle, LEDs and
 * arrows. Its sign always comes from the model observation; its shape is an
 * illustration (no magnitude is modelled).
 */
export function currentLevel(action: EmAction | null, ms: number, observation: EmObservation | null, reduced: boolean): number {
  if (!action || !observation || observation.inducedCurrent !== "PRESENT") return 0;
  if (observation.setup === "magnet-coil") {
    const s = sign(observation.direction);
    if (reduced) return ms < EM_TIMING.reducedHold ? s : 0;
    return ms < EM_TIMING.move ? s * Math.sin(Math.PI * clamp01(ms / EM_TIMING.move)) : 0;
  }
  // Generator: phase samples are 45° apart; sample 2 (90°) carries the first half-turn direction.
  const s = sign(observation.phaseDirections[2]);
  const angle = rotorAngle(action, ms, reduced);
  if (!reduced && ms >= EM_TIMING.rotate) return 0;
  if (reduced && ms >= EM_TIMING.reducedPhase * 8) return 0;
  return s * Math.sin(angle);
}

/** Rotor angle as drawn: the progress, negated for a reversed turn. */
export function drawnRotorAngle(cue: EmCue, ms: number, reduced: boolean) {
  return rotorAngle(cue.action, ms, reduced) * (cue.reverse ? -1 : 1);
}
