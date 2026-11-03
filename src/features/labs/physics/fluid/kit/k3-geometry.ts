import type { K3Instruments } from "./k3-config";

/**
 * Presentation geometry for the K3 bench. Apparatus is modelled in real
 * millimetres and drawn at this scale inside the shared physics room, so the
 * printed scale and the liquid surface come from one mapping.
 */
export const K3_UNITS_PER_MM = 0.004;

type Cylinder = K3Instruments["cylinder"];

/** Height of a liquid column above the zero line: V / (π r²). Geometry only, not a measurement. */
export function cylinderLevelMm(cylinder: Cylinder, volumeMl: number) {
  const radius = cylinder.innerDiameterMm / 2;
  return (Math.max(0, volumeMl) * 1000) / (Math.PI * radius * radius);
}

/** Displaced liquid height for a constant-area vessel. Inputs and output are mm/mL. */
export function displacedLevelRiseMm(volumeSubmergedMl: number, innerDiameterMm: number) {
  const radius = innerDiameterMm / 2;
  return Math.max(0, volumeSubmergedMl) * 1000 / (Math.PI * radius * radius);
}

export function cylinderHeightMm(cylinder: Cylinder) {
  return cylinder.baseMm + cylinderLevelMm(cylinder, cylinder.capacityMl) + cylinder.headroomMm;
}

export type Graduation = { volumeMl: number; yMm: number; length: "short" | "medium" | "long"; label: string | null };

/** Marks every division, a medium mark every 5 and a numbered long mark every 10 divisions. */
export function cylinderGraduations(cylinder: Cylinder): Graduation[] {
  const count = Math.round(cylinder.capacityMl / cylinder.resolutionMl);
  return Array.from({ length: count + 1 }, (_, index) => {
    const volumeMl = Number((index * cylinder.resolutionMl).toFixed(6));
    const length = index % 10 === 0 ? "long" : index % 5 === 0 ? "medium" : "short";
    return {
      volumeMl,
      yMm: cylinder.baseMm + cylinderLevelMm(cylinder, volumeMl),
      length,
      label: length === "long" && index > 0 ? String(volumeMl) : null,
    };
  });
}

/** Concave water meniscus rise at the glass, a fixed visual approximation. */
export const MENISCUS_RISE_MM = 1.4;

/** Number as a balance or notebook shows it, at the instrument resolution and locale decimal mark. */
export function formatReading(value: number, resolution: number, locale: "vi" | "en" = "vi") {
  const decimals = Math.max(0, Math.ceil(-Math.log10(resolution) - 1e-9));
  const fixed = (Math.round(value / resolution) * resolution).toFixed(decimals);
  return locale === "vi" ? fixed.replace(".", ",") : fixed;
}

/** Accepts "0,6" and "0.6"; returns null for anything that is not one finite number. */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Deterministic display sequence while a balance settles on its final value.
 * Display only: the last element is exactly the reading supplied by the model.
 */
export function balanceSettleSequence(readingG: number, resolutionG: number) {
  const steps = readingG === 0 ? [0] : [1.035, 0.982, 1.008, 0.997, 1];
  return steps.map((factor) => Math.round((readingG * factor) / resolutionG) * resolutionG);
}
