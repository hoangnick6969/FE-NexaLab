/**
 * Sizes and anchor points of the K2-3.3 shared instruments, as plain numbers (no rendering code).
 * Components draw from these; benches and tests read them without loading three.js.
 */
import type { LabItemAnchor } from "./item";

// Graduated cylinder
export type CylinderSize = { radius: number; height: number };
export const CYLINDER_DEFAULT_SIZE: CylinderSize = { radius: 0.06, height: 0.5 };
export const CYLINDER_FLOOR = 0.02;
const CYLINDER_RIM_CLEARANCE = 0.025;
export const CYLINDER_DEFAULT_DIVISIONS = 10;

/** Height of the liquid column, and of the printed scale, when the cylinder is drawn full. */
export const cylinderInnerHeight = (size: CylinderSize = CYLINDER_DEFAULT_SIZE) => size.height - CYLINDER_FLOOR - CYLINDER_RIM_CLEARANCE;

/** Anchor points in the local frame of a cylinder of the given size. `inside` is the floor where the liquid starts. */
export function cylinderAnchors(size: CylinderSize = CYLINDER_DEFAULT_SIZE): { base: LabItemAnchor; inside: LabItemAnchor; mouth: LabItemAnchor } {
  return { base: [0, 0, 0], inside: [0, CYLINDER_FLOOR, 0], mouth: [0, size.height, 0] };
}

/** Local y of each scale mark, from the first mark above the floor to the last one at full scale. */
export function cylinderMarkHeights(size: CylinderSize = CYLINDER_DEFAULT_SIZE, divisions: number = CYLINDER_DEFAULT_DIVISIONS): number[] {
  const count = Math.max(0, Math.floor(divisions));
  return Array.from({ length: count }, (_, index) => CYLINDER_FLOOR + (cylinderInnerHeight(size) * (index + 1)) / count);
}

// Thermometer
export const THERMOMETER_DEFAULT_LENGTH = 0.6;
export const THERMOMETER_DEFAULT_DIVISIONS = 10;

/** Height of the full scale: from the middle of the bulb to the top of the stem, minus the cap. */
export const thermometerScaleHeight = (length: number = THERMOMETER_DEFAULT_LENGTH) => length - 0.04;

/** `bulb` is the sensing end; `top` is the closed end of the stem; `display` is where a readout floats. */
export function thermometerAnchors(length: number = THERMOMETER_DEFAULT_LENGTH): { bulb: LabItemAnchor; top: LabItemAnchor; display: LabItemAnchor } {
  return { bulb: [0, 0, 0], top: [0, length, 0], display: [0, length + 0.05, 0] };
}

// Stopwatch: `button` is the top of the start button; `display` is the centre of the readout.
export const STOPWATCH_ANCHORS = { base: [0, 0, 0], display: [0, 0.045, 0.01], button: [0, 0.05, -0.075] } as const satisfies Record<string, LabItemAnchor>;
