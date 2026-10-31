// K3 fluid bench: presentation shared by FL-03 density, FL-04 pressure and FL-05 buoyancy.
// No model, rubric or Outcome lives here; each Lab supplies state from its pinned run.
export { k3LabConfigSchema, parseK3LabConfig, k3Material, k3Specimen } from "./k3-config";
export type { K3LabConfig, K3Material, K3Specimen, K3Instruments } from "./k3-config";
export { K3_UNITS_PER_MM, cylinderGraduations, cylinderHeightMm, cylinderLevelMm, formatReading, parseDecimal } from "./k3-geometry";
export { K3_MOTION, usePrefersReducedMotion } from "./k3-motion";
export { FluidBench3D, K3Slot, K3_SLOTS } from "./FluidBench3D";
export { DigitalBalance3D, BALANCE_PAN_TOP_MM } from "./apparatus/DigitalBalance3D";
export { GraduatedCylinder3D } from "./apparatus/GraduatedCylinder3D";
export { Specimen3D } from "./apparatus/Specimen3D";
export { Balance2D, Cylinder2D } from "./two-d/K3Apparatus2D";
export { K3Hud, type K3Station } from "./hud/K3Hud";
