import { useEffect, useState } from "react";

/** Motion timings for K3 apparatus (plan §6.4). Values settle on model state; they never write back. */
export const K3_MOTION = {
  balanceDashesMs: 250,
  balanceSettleMs: 750,
  panSpring: { stiffness: 300, damping: 26 },
  liquidLevelLambda: 6,
  dynamometerSpring: { stiffness: 180, damping: 22, massKg: 0.035 },
  specimenSpring: { stiffness: 240, damping: 26, minimumMassKg: 0.025, maximumMassKg: 0.4 },
  surfaceSpring: { stiffness: 34, damping: 7, massKg: 0.12 },
  overflowFlowTimeConstant: 0.24,
} as const;

/** Semi-implicit damped spring step, stable with bounded frame substeps. */
export function dampedSpringStep(position: number, velocity: number, target: number, deltaSeconds: number, config: { stiffness: number; damping: number; massKg: number }) {
  const steps = Math.max(1, Math.ceil(Math.max(0, deltaSeconds) / (1 / 120)));
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.1) / steps;
  let x = position;
  let v = velocity;
  for (let index = 0; index < steps; index += 1) {
    const acceleration = (config.stiffness * (target - x) - config.damping * v) / config.massKg;
    v += acceleration * dt;
    x += v * dt;
  }
  return { position: x, velocity: v };
}

export function dampedFlowStep(rate: number, targetRate: number, deltaSeconds: number, timeConstant: number) {
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) / Math.max(timeConstant, 0.001));
  return rate + (targetRate - rate) * alpha;
}

const query = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Mutable presentation samples shared within the R3F frame, never evidence. */
export type LiquidSample = { volumeMl: number; ripple: number };
export type BalanceSample = { readingG: number; flowing: boolean };
