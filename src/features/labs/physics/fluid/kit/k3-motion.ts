import { useEffect, useState } from "react";

/** Motion timings for K3 apparatus (plan §6.4). Values settle on model state; they never write back. */
export const K3_MOTION = {
  balanceDashesMs: 250,
  balanceSettleMs: 750,
  panSpring: { stiffness: 300, damping: 26 },
  liquidLevelLambda: 6,
} as const;

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
