import { createContext, useContext } from "react";

/** K8 rendering tiers; school machines are expected to run "high", PerformanceMonitor steps down when frames drop. */
export type EcoTier = "high" | "mid" | "low";

export const ECO_TIERS: Record<EcoTier, { dpr: [number, number]; fish: number; grass: number; shadows: boolean; caustics: boolean; surface: [number, number] }> = {
  high: { dpr: [1, 2], fish: 9, grass: 140, shadows: true, caustics: true, surface: [96, 36] },
  mid: { dpr: [1, 1.5], fish: 7, grass: 90, shadows: false, caustics: true, surface: [64, 24] },
  low: { dpr: [1, 1], fish: 5, grass: 40, shadows: false, caustics: false, surface: [32, 12] },
};

export function initialEcoTier(): EcoTier {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (cores <= 2 || memory <= 2) return "low";
  return cores <= 4 ? "mid" : "high";
}

export const lowerEcoTier = (tier: EcoTier): EcoTier => (tier === "high" ? "mid" : "low");

export const EcoQualityContext = createContext<EcoTier>("high");
export const useEcoQuality = () => ECO_TIERS[useContext(EcoQualityContext)];
