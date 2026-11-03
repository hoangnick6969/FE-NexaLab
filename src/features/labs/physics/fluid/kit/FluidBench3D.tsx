import type { ReactNode } from "react";
import { PhysicsStage, type StageView } from "../../shared/PhysicsStage";
import { K3_UNITS_PER_MM } from "./k3-geometry";
import type { BenchViewPreset } from "../../shared/PhysicsStage";

export type K3CameraPreset = "overview" | "meniscus" | "dynamometer";

/** Top of the shared room's bench, in scene units. */
const BENCH_TOP = 0.02;

/** Where K3 apparatus stands on the bench, in mm from the bench centre (x right, z towards the learner). */
export const K3_SLOTS = {
  // Slot coordinates are millimetres; with the 0.004 stage scale they map
  // to the requested world positions: balance -1.2 m, can 0 m, cylinder 0.9 m.
  balance: [-300, 0, 0],
  dynamometer: [-300, 0, 260],
  cylinder: [225, 0, 0],
  beaker: [500, 0, -70],
  overflowCan: [0, 0, 0],
  sampleStaging: [-400, 0, 0],
  /** Backwards-compatible slot name used by the existing FL-03 density stage. */
  tray: [-130, 0, 190],
} as const satisfies Record<string, readonly [number, number, number]>;

const k3View: StageView = {
  position: [0.45, 1.35, 3.1], target: [0.12, 0.3, 0],
  narrowPosition: [0, 1.7, 3.7], narrowTarget: [0, 0.3, 0],
  minDistance: 1, maxDistance: 6,
};

export const K3_CAMERA_PRESETS: Record<K3CameraPreset, BenchViewPreset> = {
  overview: {
    wide: { position: k3View.position, target: k3View.target },
    narrow: { position: k3View.narrowPosition, target: k3View.narrowTarget },
    minDistance: k3View.minDistance, maxDistance: k3View.maxDistance,
    fitWidth: 4.1,
    insets: (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12 }),
  },
  meniscus: {
    wide: { position: [1.43, 0.45, 1.1], target: [0.9, 0.42, 0] },
    narrow: { position: [1.38, 0.45, 1.3], target: [0.9, 0.42, 0] },
    minDistance: 0.7, maxDistance: 3.2,
    maxPolarAngle: Math.PI / 2.02,
  },
  dynamometer: {
    wide: { position: [-0.83, 0.76, 1.65], target: [-1.2, 0.40, 1.04] },
    narrow: { position: [-0.75, 0.86, 1.84], target: [-1.2, 0.40, 1.04] },
    minDistance: 0.65, maxDistance: 3.4,
  },
};

/**
 * Shared K3 workbench: the physics room with studio lighting, an
 * on-demand frame loop and a millimetre-scaled bench group. Children are
 * apparatus in mm; each Lab decides which apparatus and states to show.
 */
export function FluidBench3D({ children, view, cameraPreset = "overview", active = true }: { children: ReactNode; view?: StageView | BenchViewPreset; cameraPreset?: K3CameraPreset; active?: boolean }) {
  const activeView = view ?? K3_CAMERA_PRESETS[cameraPreset];
  return <PhysicsStage realism frameloop="demand" view={activeView} active={active}>
    <group position={[0, BENCH_TOP, 0]} scale={K3_UNITS_PER_MM}>{children}</group>
  </PhysicsStage>;
}

export function K3Slot({ at, children }: { at: keyof typeof K3_SLOTS; children: ReactNode }) {
  return <group position={[...K3_SLOTS[at]]}>{children}</group>;
}
