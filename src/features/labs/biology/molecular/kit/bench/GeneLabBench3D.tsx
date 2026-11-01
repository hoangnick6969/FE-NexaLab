import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PhysicsStage, type BenchViewPreset } from "../../../../physics/shared/PhysicsStage";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";
import { TextLabel } from "../molecules/labels";
import { MICROSCOPE_EYEPIECE_MM, Microscope3D } from "./Microscope3D";
import { Thermocycler3D, TubeRack3D } from "./Thermocycler3D";

/** Same bench scale as the K3 apparatus, so instruments read at a consistent size in the shared room. */
const UNITS_PER_MM = 0.004;
const BENCH_TOP = 0.02;

/** Where K7 apparatus stands on the shared bench (mm from its centre; x right, z towards the learner). */
export const K7_BENCH_SLOTS = {
  microscope: [-60, 0, 70],
  thermocycler: [330, 0, -90],
  rack: [-380, 0, 150],
} as const satisfies Record<string, readonly [number, number, number]>;

const VIEW: BenchViewPreset = {
  wide: { position: [0.15, 2.35, 4.4], target: [0.05, 0.62, 0] },
  narrow: { position: [0, 2.6, 5.6], target: [0, 0.6, 0] },
  minDistance: 1.2,
  maxDistance: 9,
  fitWidth: 4.4,
  insets: (size, narrow) => (narrow || size.width <= 640 ? { right: 0, bottom: size.height * 0.52, top: 120 } : { right: Math.min(432, size.width * 0.42), bottom: 0, top: 72 }),
};

const toWorld = (slot: readonly [number, number, number], local: readonly [number, number, number]) =>
  new THREE.Vector3((slot[0] + local[0]) * UNITS_PER_MM, BENCH_TOP + (slot[1] + local[1]) * UNITS_PER_MM, (slot[2] + local[2]) * UNITS_PER_MM);

/**
 * Glides the camera down to the microscope eyepiece, then reports arrival so
 * the activity can swap to the molecular view. Reduced motion arrives at once.
 */
function EyepieceZoom({ active, eyepiece, onArrive }: { active: boolean; eyepiece: THREE.Vector3; onArrive?: () => void }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null;
  const reduced = usePrefersReducedMotion();
  const started = useRef(0);
  const arrived = useRef(false);
  const look = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => eyepiece.clone().add(new THREE.Vector3(0, 0.1, 0.12)), [eyepiece]);
  useEffect(() => {
    arrived.current = false;
    started.current = 0;
    if (controls) controls.enabled = !active;
    if (active && reduced) { arrived.current = true; onArrive?.(); }
  }, [active, reduced]);
  useFrame((state, delta) => {
    if (!active || arrived.current) return;
    if (!started.current) { started.current = state.clock.elapsedTime; look.copy(eyepiece).add(new THREE.Vector3(0, -0.4, -0.6)); }
    const alpha = 1 - Math.exp(-4.2 * Math.min(delta, 0.1));
    camera.position.lerp(goal, alpha);
    look.lerp(eyepiece, alpha);
    camera.lookAt(look);
    state.invalidate();
    if (camera.position.distanceTo(goal) < 0.03 || state.clock.elapsedTime - started.current > 1.1) { arrived.current = true; onArrive?.(); }
  });
  return null;
}

/**
 * K7 entry scene: the shared physical room with a molecular-biology bench
 * (microscope, PCR thermocycler, tube rack). Clicking the microscope, or its
 * DOM button in the guide, zooms into the eyepiece and opens the molecular
 * view. Presentation only; nothing here is evidence.
 */
export function GeneLabBench3D({ onOpenMicroscope, zooming = false, onZoomArrive, microscopeLabel, children }: {
  onOpenMicroscope?: () => void;
  zooming?: boolean;
  onZoomArrive?: () => void;
  /** Short call to action floated over the microscope (localised by the Lab). */
  microscopeLabel?: string;
  children?: ReactNode;
}) {
  const eyepiece = useMemo(() => toWorld(K7_BENCH_SLOTS.microscope, MICROSCOPE_EYEPIECE_MM), []);
  return <PhysicsStage realism frameloop="demand" view={VIEW}>
    <group position={[0, BENCH_TOP, 0]} scale={UNITS_PER_MM}>
      <group position={[...K7_BENCH_SLOTS.microscope]} rotation={[0, 0.18, 0]}>
        <Microscope3D onOpen={zooming ? undefined : onOpenMicroscope} active={!zooming} />
      </group>
      <group position={[...K7_BENCH_SLOTS.thermocycler]} rotation={[0, -0.42, 0]}><Thermocycler3D /></group>
      <group position={[...K7_BENCH_SLOTS.rack]} rotation={[0, 0.25, 0]}><TubeRack3D /></group>
      {children}
    </group>
    {microscopeLabel && !zooming && <TextLabel text={microscopeLabel} height={0.11} position={[eyepiece.x, eyepiece.y + 0.42, eyepiece.z]} fill="rgba(31, 111, 120, 0.92)" ink="#ffffff" />}
    <EyepieceZoom active={zooming} eyepiece={eyepiece} onArrive={onZoomArrive} />
  </PhysicsStage>;
}
