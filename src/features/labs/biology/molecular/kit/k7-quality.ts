import { createContext, useContext } from "react";

/** Rendering tiers (plan §5.6); measured on target devices before any default is claimed. */
export type K7Tier = "high" | "mid" | "low";

export const K7_TIERS: Record<K7Tier, { dpr: [number, number]; particles: number; detail: number; clearcoat: boolean }> = {
  high: { dpr: [1, 2], particles: 260, detail: 5, clearcoat: true },
  mid: { dpr: [1, 1.5], particles: 120, detail: 4, clearcoat: true },
  low: { dpr: [1, 1], particles: 0, detail: 3, clearcoat: false },
};

/** First guess from the device; PerformanceMonitor lowers it when frames drop. */
export function initialK7Tier(): K7Tier {
  if (typeof navigator === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 2) return "low";
  return cores >= 8 && memory >= 8 ? "high" : "mid";
}

export const lowerTier = (tier: K7Tier): K7Tier => (tier === "high" ? "mid" : "low");

export const K7QualityContext = createContext<K7Tier>("mid");
export const useK7Quality = () => K7_TIERS[useContext(K7QualityContext)];
