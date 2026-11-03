import { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PhysicalLabEnvironment } from "../../../shared/PhysicalLabEnvironment";
import { usePrefersReducedMotion } from "../../../shared/motion/usePrefersReducedMotion";

/**
 * EX-A lab room: the shared physical room (K1/K2/K3/K7 reuse it) scaled up
 * around the enlarged eye model, so the model stands on the bench like a
 * classroom anatomy model. World units are the eye kit's (0.1 per mm of eye).
 */
export const ROOM_SCALE = 3;
/** Bench top in world units: just under the eyeball (sclera radius about 1.2). */
export const BENCH_TOP_Y = -1.62;
/** Shared room bench top in its own units, from PhysicalLabEnvironment. */
const ROOM_BENCH_TOP = 0.02;

const CHROME = "#c9d0d4";
const ENAMEL = "#f1efe8";

/** Snellen-style chart: rows of letters shrinking towards the bottom. */
function useChartTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbfbf7";
    ctx.fillRect(0, 0, 512, 720);
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const rows: [string, number][] = [["E", 150], ["F P", 96], ["T O Z", 70], ["L P E D", 52], ["P E C F D", 40], ["E D F C Z P", 31], ["F E L O P Z D", 24], ["D E F P O T E C", 18]];
    let y = 105;
    rows.forEach(([letters, size], index) => {
      ctx.font = `700 ${size}px Arial, sans-serif`;
      ctx.fillText(letters, 256, y);
      ctx.font = "500 16px Arial, sans-serif";
      ctx.fillText(String(index + 1), 30, y);
      y += size * 0.62 + 38;
    });
    ctx.strokeStyle = "#c62828";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 548);
    ctx.lineTo(452, 548);
    ctx.stroke();
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Visual-acuity chart on a small easel, facing the eye from the cornea side. */
function AcuityChart() {
  const map = useChartTexture();
  // The face (local −z) turns towards the camera and the eye.
  return <group position={[4.7, BENCH_TOP_Y, 2.4]} rotation={[0, 0.55, 0]}>
    <RoundedBox args={[3.1, 4.2, 0.12]} radius={0.06} smoothness={3} position={[0, 2.35, 0]}><meshStandardMaterial color="#e7e3d8" roughness={0.6} /></RoundedBox>
    <mesh position={[0, 2.35, -0.065]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.8, 3.9]} /><meshStandardMaterial map={map} roughness={0.85} /></mesh>
    {[-1.1, 1.1].map((x) => <mesh key={x} position={[x, 0.55, 0.35]} rotation={[-0.32, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 1.3, 12]} /><meshStandardMaterial color="#6b5034" roughness={0.6} /></mesh>)}
  </group>;
}

/** Trial lens case: plus lenses with black rims, minus lenses with red rims. */
function TrialLensCase() {
  const lenses = useMemo(() => [-1, 1].flatMap((row) => [-2, -1, 0, 1, 2].map((col) => ({ x: col * 0.62, z: row * 0.42, minus: row < 0 }))), []);
  return <group position={[-4.3, BENCH_TOP_Y, -2.2]} rotation={[0, 0.35, 0]}>
    <RoundedBox args={[3.6, 0.28, 1.5]} radius={0.05} smoothness={3} position={[0, 0.14, 0]}><meshStandardMaterial color="#20384f" roughness={0.9} /></RoundedBox>
    {/* Open lid leaning back from the far edge */}
    <mesh position={[0, 0.98, 0.98]} rotation={[0.3, 0, 0]}><boxGeometry args={[3.6, 1.5, 0.08]} /><meshStandardMaterial color="#20384f" roughness={0.9} /></mesh>
    {lenses.map(({ x, z, minus }) => <group key={`${x}:${z}`} position={[x, 0.3, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.035, 8, 28]} /><meshStandardMaterial color={minus ? "#b3261e" : "#1b1b1b"} roughness={0.4} metalness={0.3} /></mesh>
      <mesh><cylinderGeometry args={[0.2, 0.2, 0.02, 28]} /><meshPhysicalMaterial color="#e8f4ff" roughness={0.05} transmission={0.85} thickness={0.1} transparent opacity={0.6} /></mesh>
    </group>)}
  </group>;
}

/** Pedestal that holds the eyeball above the bench, with the pulsing ring that marks it as the way in. */
function ModelStand({ pulse }: { pulse: boolean }) {
  const reduced = usePrefersReducedMotion();
  const halo = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!halo.current) return;
    halo.current.visible = pulse;
    if (!pulse) return;
    const wave = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.4 * wave;
    halo.current.scale.setScalar(1 + (reduced ? 0 : 0.08 * wave));
    if (!reduced) state.invalidate();
  });
  return <group position={[-0.2, BENCH_TOP_Y, 0]}>
    <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.75, 0.82, 0.12, 48]} /><meshPhysicalMaterial color={ENAMEL} roughness={0.35} clearcoat={0.7} /></mesh>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.06, 0.06, 0.45, 16]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} /></mesh>
    <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.04, 10, 40]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} /></mesh>
    <mesh ref={halo} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.0, 1.12, 64]} />
      <meshBasicMaterial color="#3fd0c6" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}

/** The room, the stand and the bench props. Presentation only; nothing here is evidence. */
export function EyeLabRoom({ pulse }: { pulse: boolean }) {
  // The room is turned to face the camera, which looks at the section from −z.
  return <>
    <group position={[0, BENCH_TOP_Y - ROOM_BENCH_TOP * ROOM_SCALE, 0]} rotation={[0, Math.PI, 0]} scale={ROOM_SCALE}>
      <PhysicalLabEnvironment />
    </group>
    <ModelStand pulse={pulse} />
    <AcuityChart />
    <TrialLensCase />
  </>;
}

/**
 * Entry move: while `entered` is false the camera stands back in the room;
 * when it turns true the camera glides in to the working view and reports
 * arrival. Reduced motion arrives at once. Orbit is locked during the flight.
 */
export function EntryFlight({ entered, room, close, target, onArrive }: {
  entered: boolean;
  room: [number, number, number];
  close: [number, number, number];
  /** Orbit centre for both views. */
  target: [number, number, number];
  onArrive?: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean; target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((state) => state.invalidate);
  const reduced = usePrefersReducedMotion();
  const flying = useRef(false);
  const started = useRef(0);
  const goal = useMemo(() => new THREE.Vector3(...close), [close]);

  useEffect(() => {
    if (!controls) return;
    if (!entered) {
      flying.current = false;
      controls.target.set(...target);
      camera.position.set(...room);
      controls.enabled = true;
    } else if (reduced) {
      camera.position.copy(goal);
      onArrive?.();
    } else {
      flying.current = true;
      started.current = performance.now();
      controls.enabled = false;
    }
    controls.update();
    invalidate();
  }, [entered, controls, reduced]);

  useFrame((state, delta) => {
    if (!flying.current || !controls) return;
    camera.position.lerp(goal, 1 - Math.exp(-3.4 * Math.min(delta, 0.1)));
    controls.update();
    state.invalidate();
    // The time cap keeps arrival independent of frame rate (a throttled tab draws few frames).
    if (camera.position.distanceTo(goal) < 0.02 || performance.now() - started.current > 1600) {
      camera.position.copy(goal);
      controls.update();
      flying.current = false;
      controls.enabled = true;
      onArrive?.();
    }
  });
  return null;
}
