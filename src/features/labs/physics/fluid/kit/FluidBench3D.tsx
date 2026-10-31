import type { ReactNode } from "react";
import { PhysicsStage, type StageView } from "../../shared/PhysicsStage";
import { K3_UNITS_PER_MM } from "./k3-geometry";

/** Top of the shared room's bench, in scene units. */
const BENCH_TOP = 0.02;

/** Where K3 apparatus stands on the bench, in mm from the bench centre (x right, z towards the learner). */
export const K3_SLOTS = {
  balance: [-230, 0, 20],
  cylinder: [40, 0, -10],
  beaker: [190, 0, 20],
  tray: [-20, 0, 210],
} as const satisfies Record<string, readonly [number, number, number]>;

const k3View: StageView = {
  position: [0.45, 1.35, 3.1], target: [0.12, 0.3, 0],
  narrowPosition: [0, 1.7, 3.7], narrowTarget: [0, 0.3, 0],
  minDistance: 1, maxDistance: 6,
};

/**
 * Shared K3 workbench: the physics room with studio lighting, an
 * on-demand frame loop and a millimetre-scaled bench group. Children are
 * apparatus in mm; each Lab decides which apparatus and states to show.
 */
export function FluidBench3D({ children, view = k3View }: { children: ReactNode; view?: StageView }) {
  return <PhysicsStage realism frameloop="demand" view={view}>
    <group position={[0, BENCH_TOP, 0]} scale={K3_UNITS_PER_MM}>{children}</group>
  </PhysicsStage>;
}

export function K3Slot({ at, children }: { at: keyof typeof K3_SLOTS; children: ReactNode }) {
  return <group position={[...K3_SLOTS[at]]}>{children}</group>;
}
