// K3 fluid bench: presentation shared by FL-03 density, FL-04 pressure and FL-05 buoyancy.
// No model, rubric or Outcome lives here; each Lab supplies state from its pinned run.
export { k3LabConfigSchema, parseK3LabConfig, k3Material, k3Specimen } from "./k3-config";
export type { K3LabConfig, K3Material, K3Specimen, K3Instruments } from "./k3-config";
export { K3_UNITS_PER_MM, cylinderGraduations, cylinderHeightMm, cylinderLevelMm, displacedLevelRiseMm, formatReading, parseDecimal } from "./k3-geometry";
export { K3_MOTION, dampedFlowStep, dampedSpringStep, usePrefersReducedMotion } from "./k3-motion";
export { FluidBench3D, K3Slot, K3_SLOTS, K3_CAMERA_PRESETS, type K3CameraPreset } from "./FluidBench3D";
export { DigitalBalance3D, BALANCE_PAN_TOP_MM, BALANCE_PAN_Z_MM } from "./apparatus/DigitalBalance3D";
export { GraduatedCylinder3D } from "./apparatus/GraduatedCylinder3D";
export { Beaker3D } from "./apparatus/Beaker3D";
export { OverflowCan3D } from "./apparatus/OverflowCan3D";
export { GraduatedCatchBeaker } from "./apparatus/GraduatedCatchBeaker";
export { RetortStand3D } from "./apparatus/RetortStand3D";
export { SpringDynamometer3D } from "./apparatus/SpringDynamometer3D";
export { ForceVectorOverlay3D } from "./overlays/ForceVectorOverlay3D";
export { PourStream3D, type PourStreamSample } from "./apparatus/PourStream3D";
export { Specimen3D } from "./apparatus/Specimen3D";
export { Balance2D, Cylinder2D, Ruler2D, Specimen2D, CupGlyph, blobPath } from "./two-d/K3Apparatus2D";
export { K3Hud, type K3Station } from "./hud/K3Hud";
export { FluidKitLayoutShell } from "./layout/FluidKitLayoutShell";
