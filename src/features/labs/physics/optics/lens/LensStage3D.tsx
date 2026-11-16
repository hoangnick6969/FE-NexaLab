/**
 * FL-23 lens bench 3D view (millimetres): an optical bench with a ruler in the K6 dark booth, the lens, the F-shaped lamp,
 * the screen and the magnifier. Decorative: positions follow the panel; every reading is in the 2D diagram and the DOM panel.
 */
import { useContext, useEffect, type ComponentType, type ReactNode } from "react";
import * as THREE from "three";
import type { LensApparatusKind } from "@nexalab/sim/optics/lens";
import { LabSceneContext } from "../../../shared/LabSpace";
import { PhysicsStage, type BenchViewPreset } from "../../shared/PhysicsStage";
import type { LensStationId } from "./lens-log";

const MM = 0.004;
const BENCH_TOP = 0.02;
const RAIL_Y = 40;
const AXIS_Y = 110;

/** Positions along the bench (mm from the lens; negative on the object's side) and what the screen shows. */
export type LensStageState = {
  station: LensStationId;
  focalMm: number;
  objectMm: number;
  screenMm: number | null;
  /** 0 sharp, larger is blurrier; null when no image reaches the screen. */
  blur: number | null;
  imageScale: number | null;
};
type Renderer = ComponentType<{ state: LensStageState }>;

const insets: BenchViewPreset["insets"] = (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12, top: narrow ? 96 : 130 });
const VIEW: BenchViewPreset = {
  wide: { position: [0.3, 1.2, 2.4], target: [0, 0.35, 0] },
  narrow: { position: [0, 1.6, 4.2], target: [0, 0.3, 0] },
  minDistance: 0.8, maxDistance: 6, fitWidth: 3.6, insets,
};

function Bench() {
  return <group name="optical_bench">
    <mesh position={[0, RAIL_Y / 2, 0]} receiveShadow><boxGeometry args={[900, RAIL_Y, 40]} /><meshStandardMaterial color="#59646b" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, RAIL_Y + 0.5, 21]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[880, 10]} /><meshStandardMaterial color="#f2d27a" /></mesh>
    {Array.from({ length: 45 }, (_, k) => <mesh key={k} position={[-440 + k * 20, RAIL_Y + 1, 23]}><boxGeometry args={[1.2, 1, k % 5 === 0 ? 8 : 4]} /><meshStandardMaterial color="#3b2f1e" /></mesh>)}
  </group>;
}

const Post = ({ x, height = AXIS_Y - RAIL_Y }: { x: number; height?: number }) =>
  <mesh position={[x, RAIL_Y + height / 2, 0]}><cylinderGeometry args={[4, 4, height, 12]} /><meshStandardMaterial color="#8a949a" metalness={0.6} /></mesh>;

function LensItem({ state }: { state: LensStageState }) {
  if (state.station === "magnifier") return null;
  const diverging = state.focalMm < 0;
  return <group name="lens">
    <Post x={0} />
    {/* A thin disc along the principal axis (x): thicker in the middle for a converging lens, thinner for a diverging one. */}
    <mesh position={[0, AXIS_Y, 0]} scale={[diverging ? 0.08 : 0.2, 1, 1]}>
      <sphereGeometry args={[45, 32, 16]} />
      <meshPhysicalMaterial color="#d8eef3" transparent opacity={0.35} roughness={0.05} transmission={0.6} thickness={10} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, AXIS_Y, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[45, 2.5, 8, 48]} /><meshStandardMaterial color="#2f3a40" /></mesh>
  </group>;
}

function LampItem({ state }: { state: LensStageState }) {
  const x = state.station === "magnifier" ? -60 : state.objectMm;
  return <group name="object_lamp" position={[x, 0, 0]}>
    <Post x={0} height={AXIS_Y - RAIL_Y - 25} />
    <mesh position={[-15, AXIS_Y, 0]}><boxGeometry args={[30, 50, 50]} /><meshStandardMaterial color="#2f3a40" /></mesh>
    {/* The F-shaped opening, lit. */}
    <mesh position={[1, AXIS_Y, -6]}><boxGeometry args={[2, 24, 4]} /><meshBasicMaterial color="#fff3b0" toneMapped={false} /></mesh>
    <mesh position={[1, AXIS_Y + 10, 0]}><boxGeometry args={[2, 4, 14]} /><meshBasicMaterial color="#fff3b0" toneMapped={false} /></mesh>
    <mesh position={[1, AXIS_Y + 1, -1]}><boxGeometry args={[2, 4, 10]} /><meshBasicMaterial color="#fff3b0" toneMapped={false} /></mesh>
  </group>;
}

function ScreenItem({ state }: { state: LensStageState }) {
  if (state.screenMm === null) return null;
  const sharp = state.blur !== null && state.blur < 0.5;
  const size = state.imageScale !== null && state.blur !== null ? Math.min(90, 24 * Math.abs(state.imageScale)) : 0;
  return <group name="screen" position={[state.screenMm, 0, 0]}>
    <Post x={0} height={30} />
    <mesh position={[3, AXIS_Y, 0]}><boxGeometry args={[4, 140, 140]} /><meshStandardMaterial color="#f4f4ef" roughness={0.9} /></mesh>
    {/* A translucent screen: the spot shows on the lens side and through to the back, which faces the camera. */}
    {size > 0 && [[0.5, -Math.PI / 2], [5.5, Math.PI / 2]].map(([x, turn]) => <mesh key={x} position={[x, AXIS_Y, 0]} rotation={[0, turn, 0]}>
      <circleGeometry args={[size / 2 + (sharp ? 0 : Math.min(30, (state.blur ?? 0) * 2)), 32]} />
      <meshBasicMaterial color="#ffe9a0" transparent opacity={sharp ? 0.95 : 0.4} toneMapped={false} />
    </mesh>)}
  </group>;
}

function MagnifierItem({ state }: { state: LensStageState }) {
  if (state.station !== "magnifier") return null;
  // On this station `objectMm` is the distance from the object (at −60 mm) to the magnifier.
  return <group name="magnifier" position={[-60 + state.objectMm, 0, 0]}>
    <mesh position={[0, AXIS_Y, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[30, 3, 8, 40]} /><meshStandardMaterial color="#1f2a30" /></mesh>
    <mesh position={[0, AXIS_Y, 0]} scale={[0.25, 1, 1]}><sphereGeometry args={[30, 24, 12]} /><meshPhysicalMaterial color="#e3f4f7" transparent opacity={0.3} transmission={0.6} depthWrite={false} /></mesh>
    <mesh position={[0, AXIS_Y - 70, 0]}><cylinderGeometry args={[5, 5, 80, 10]} /><meshStandardMaterial color="#1f2a30" /></mesh>
  </group>;
}

function Booth() {
  const material = <meshStandardMaterial color="#1d2226" roughness={0.95} />;
  return <group name="booth">
    <mesh position={[0, 1, 0]} receiveShadow><boxGeometry args={[980, 2, 320]} />{material}</mesh>
    <mesh position={[0, 90, -160]}><boxGeometry args={[980, 180, 4]} />{material}</mesh>
  </group>;
}

const PanelOnly: Renderer = () => null;
/** One renderer per apparatus kind of the engine (P0 C2.3). */
export const APPARATUS_RENDERERS: Record<LensApparatusKind, Renderer> = {
  optical_bench: Bench,
  lens: LensItem,
  object_lamp: LampItem,
  screen: ScreenItem,
  magnifier: MagnifierItem,
  grid: PanelOnly,
};

export function LensStage3D({ apparatus, state, active = true, children }: {
  apparatus: ReadonlyArray<{ id: string; kind: LensApparatusKind }>;
  state: LensStageState;
  active?: boolean;
  children?: ReactNode;
}) {
  const sceneRoot = useContext(LabSceneContext);
  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);
  return <PhysicsStage realism frameloop="demand" view={VIEW} active={active}>
    {/* Turned a little so the faces of the lamp, lens and screen (which look along the bench) face the camera. */}
    <group position={[0, BENCH_TOP, 0]} scale={MM} rotation={[0, -0.5, 0]}>
      <Booth />
      {apparatus.map((item) => {
        const Item = APPARATUS_RENDERERS[item.kind];
        return <Item key={item.id} state={state} />;
      })}
      {children}
    </group>
  </PhysicsStage>;
}
