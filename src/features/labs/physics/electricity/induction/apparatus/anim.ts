import { createContext, useContext, useEffect, useState, type MutableRefObject } from "react";

/** Per-frame presentation values written by the stage driver and read by apparatus through refs. */
export type EmAnim = {
  /** Signed illustrative current level in [-1, 1]; sign comes from the model observation. */
  level: number;
  /** Bar magnet travel, 0 = OUTSIDE, 1 = INSIDE. */
  travel: number;
  /** Generator rotor angle in radians. */
  rotor: number;
  reduced: boolean;
};

export const EmAnimContext = createContext<MutableRefObject<EmAnim> | null>(null);

export function useEmAnim() {
  const anim = useContext(EmAnimContext);
  if (!anim) throw new Error("EmAnimContext is missing");
  return anim;
}

/** Live prefers-reduced-motion value; follows OS changes during the session. */
export function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const change = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}

// Scene layout shared by the apparatus (1 unit ≈ 10 cm; bench top at y ≈ 0.02).
export const LAYOUT = {
  axisY: .36,
  coil: { length: .9, flangeRadius: .3, boreRadius: .17 },
  magnet: { length: 1.1, section: .16, outsideCenterX: -1.17, insideCenterX: -.3, railZ: -.42 },
  generator: { x: 1.02, z: 0 },
  galvanometer: { position: [1.92, .02, -.62] as [number, number, number], rotationY: -.62 },
  leds: { position: [1.78, .02, .78] as [number, number, number], rotationY: -.45 },
};
