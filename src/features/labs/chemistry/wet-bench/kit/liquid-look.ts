/** Illustrative liquid and label colours for the K2 scene. Presentation only; chemistry comes from the sim. */
import { SPECIES, type Reagent, type VesselState, type VesselVisualState } from "@nexalab/sim/wet-bench";

export type Look = { color: string; opacity: number; surface: string };

export const CLEAR: Look = { color: "#bae6fd", opacity: 0.65, surface: "#38bdf8" };
const VINEGAR: Look = { color: "#fde047", opacity: 0.72, surface: "#facc15" };
const LIMEWATER: Look = { color: "#e2e8f0", opacity: 0.75, surface: "#cbd5e1" };
const COPPER_SULFATE: Look = { color: "#0284c7", opacity: 0.85, surface: "#38bdf8" };
const INDICATOR: Look = { color: "#fbcfe8", opacity: 0.7, surface: "#f9a8d4" };

/** Colour of a liquid as it looks inside its bottle or dropper. */
export function reagentLook(reagent: Reagent): Look {
  const composition = reagent.composition;
  if (composition.kind === "indicator") return INDICATOR;
  if (composition.kind === "powder") return CLEAR;
  if (composition.kind === "solution") {
    if (composition.solute === "CuSO4") return COPPER_SULFATE;
    if (composition.solute === "CH3COOH") return VINEGAR;
    if (composition.solute === "CaOH2") return LIMEWATER;
  }
  return CLEAR;
}

/** Liquid colour in a vessel: the sim's tint (ions, indicator) wins; otherwise the look of what was added. */
export function vesselLook(vessel: VesselState, visual: VesselVisualState): Look {
  if (visual.liquidTint) {
    return { color: visual.liquidTint.color, opacity: Math.max(0.78, Math.min(0.9, visual.liquidTint.opacity + 0.35)), surface: visual.liquidTint.color };
  }
  if (vessel.added["CH3COOH_0_1M"]?.microliters) return VINEGAR;
  if (vessel.added["CaOH2_0_01M"]?.microliters) return LIMEWATER;
  return CLEAR;
}

/** Non-linear fill so even one drop is a visible layer: 22 % to 88 % of the inner height. */
export const visualFill = (level: number) => (level > 0 ? Math.max(0.22, Math.min(0.88, Math.cbrt(level))) : 0);

export type BottleCategory = "acid" | "base" | "neutral" | "indicator" | "salt" | "metal" | "mineral";
export const CATEGORY_COLOR: Record<BottleCategory, string> = {
  acid: "#ef4444", base: "#3b82f6", neutral: "#22c55e", indicator: "#d946ef", salt: "#0ea5e9", metal: "#64748b", mineral: "#a8a29e",
};

export function bottleCategory(reagent: Reagent): BottleCategory {
  const composition = reagent.composition;
  if (composition.kind === "indicator") return "indicator";
  if (composition.kind === "solid") return composition.species === "CaCO3" ? "mineral" : "metal";
  if (composition.kind === "powder") return SPECIES[composition.species].acidBase.kind === "neutral" ? "neutral" : "salt";
  if (!composition.solute) return "neutral";
  const role = SPECIES[composition.solute].acidBase;
  if (role.kind === "strong_acid" || role.kind === "weak_acid") return "acid";
  if (role.kind === "strong_base") return "base";
  return role.kind === "neutral" ? "neutral" : "salt";
}

export const LITMUS_HEX = { red: "#ef4444", purple: "#a855f7", blue: "#3b82f6" } as const;
