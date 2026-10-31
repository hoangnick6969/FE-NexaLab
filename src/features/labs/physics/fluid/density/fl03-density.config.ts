import { parseK3LabConfig } from "../kit/k3-config";

/**
 * FL-03 sample configuration for development and the K3 preview.
 *
 * PROPOSED_UNAPPROVED: densities follow the KHTN 8 Bài 13–14 examples
 * (cast iron 2 × 3 × 5 cm, 210 g; wood block; water; pebble) and still need a
 * science reviewer's source and tolerance decision (plan §5, CAT-4). A
 * released Lab reads these values from its pinned pack, not from this file.
 */
export const fl03DensityConfig = parseK3LabConfig({
  configVersion: 1,
  reviewStatus: "PROPOSED_UNAPPROVED",
  instruments: {
    balance: { capacityG: 500, resolutionG: 0.1 },
    cylinder: { capacityMl: 100, resolutionMl: 1, innerDiameterMm: 27, wallMm: 1.5, headroomMm: 24, baseMm: 8 },
    ruler: { lengthMm: 300, resolutionMm: 1 },
    beaker: { capacityMl: 100, innerDiameterMm: 50, heightMm: 70, emptyMassG: 48.6 },
  },
  materials: [
    { id: "iron", label: { vi: "Sắt", en: "Iron" }, kind: "metal", referenceDensityGcm3: 7.8, appearance: { color: "#8a8d8f", roughness: 0.42, metalness: 0.9 } },
    { id: "aluminium", label: { vi: "Nhôm", en: "Aluminium" }, kind: "metal", referenceDensityGcm3: 2.7, appearance: { color: "#c9ccd0", roughness: 0.3, metalness: 0.95 } },
    { id: "copper", label: { vi: "Đồng", en: "Copper" }, kind: "metal", referenceDensityGcm3: 8.9, appearance: { color: "#b8734a", roughness: 0.32, metalness: 1 } },
    { id: "cast-iron", label: { vi: "Gang", en: "Cast iron" }, kind: "metal", referenceDensityGcm3: 7, appearance: { color: "#55585a", roughness: 0.62, metalness: 0.78 } },
    { id: "wood", label: { vi: "Gỗ", en: "Wood" }, kind: "wood", referenceDensityGcm3: 0.6, appearance: { color: "#c49a6c", roughness: 0.72, metalness: 0 } },
    { id: "pebble", label: { vi: "Sỏi", en: "Pebble" }, kind: "stone", referenceDensityGcm3: 2.6, appearance: { color: "#8f877c", roughness: 0.86, metalness: 0 } },
    { id: "water", label: { vi: "Nước", en: "Water" }, kind: "liquid", referenceDensityGcm3: 1, appearance: { color: "#e8f6ff", roughness: 0.02, metalness: 0 } },
  ],
  specimens: [
    // Bài 13, thí nghiệm 1: iron bars of V, 2V, 3V (V = 10 cm³).
    { shape: "box", id: "iron-1v", materialId: "iron", sizeMm: [20, 20, 25], massG: 78 },
    { shape: "box", id: "iron-2v", materialId: "iron", sizeMm: [20, 20, 50], massG: 156 },
    { shape: "box", id: "iron-3v", materialId: "iron", sizeMm: [20, 30, 50], massG: 234 },
    // Bài 13, thí nghiệm 2: iron, aluminium, copper of the same volume.
    { shape: "box", id: "aluminium-1v", materialId: "aluminium", sizeMm: [20, 20, 25], massG: 27 },
    { shape: "box", id: "copper-1v", materialId: "copper", sizeMm: [20, 20, 25], massG: 89 },
    // Bài 13 exercise.
    { shape: "box", id: "cast-iron-block", materialId: "cast-iron", sizeMm: [20, 30, 50], massG: 210 },
    // Bài 14 I: rectangular wood block variants.
    { shape: "box", id: "wood-block-a", materialId: "wood", sizeMm: [100, 60, 40], massG: 144 },
    { shape: "box", id: "wood-block-b", materialId: "wood", sizeMm: [80, 50, 30], massG: 72 },
    // Bài 14 III: pebbles that fit through the cylinder.
    { shape: "irregular", id: "pebble-a", materialId: "pebble", volumeMl: 12, massG: 31.2, maxWidthMm: 22, seed: 17 },
    { shape: "irregular", id: "pebble-b", materialId: "pebble", volumeMl: 9, massG: 23.4, maxWidthMm: 20, seed: 42 },
  ],
  tolerances: { readingDivisions: 1, relativeCalculation: 0.01, referenceBand: 0.05 },
});

/** Station order mirrors the textbook (plan §5.2); Class Labs may disable a station, never reorder its science. */
export const fl03Stations = [
  { id: "explore", specimens: ["iron-1v", "iron-2v", "iron-3v", "aluminium-1v", "copper-1v"] },
  { id: "block", specimens: ["wood-block-a", "wood-block-b"] },
  { id: "water", specimens: [] },
  { id: "pebble", specimens: ["pebble-a", "pebble-b"] },
  { id: "conclusion", specimens: [] },
] as const;
