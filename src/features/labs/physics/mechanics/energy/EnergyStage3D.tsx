/**
 * FL-24 3D bench on the shared physics room (millimetres). Decorative: every reading is also in the DOM panel.
 * Station 1: a pendulum on a frame with three energy bars beside it. Station 2: a hoist with gauge, ruler and stopwatch.
 */
import { useContext, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EnergyApparatusKind, EnergyStation } from "@nexalab/sim/mechanics/energy";
import { LabSceneContext } from "../../../shared/LabSpace";
import { Stopwatch3D } from "../../../shared/items/stopwatch";
import { PhysicsStage, type BenchViewPreset } from "../../shared/PhysicsStage";
import { formatSeconds, pendulumAngle, type LiftView, type PendulumView } from "./energy-log";

const MM = 0.004;
const BENCH_TOP = 0.02;
/** Shared items are modelled in item units; 1 unit = 250 mm on this bench. */
const ITEM_MM = 250;
const X = { pendulum: -420, hoist: 420 } as const;
/** The pendulum frame (≈ 0.7 m) and the energy bars are drawn at half scale, the hoist (1 m lift) at 0.3, so each station fits one camera. */
const PENDULUM_SCALE = 0.5;
const HOIST_SCALE = 0.3;
const BAR_H = 360;

export type EnergyStageState = {
  station: EnergyStation;
  pendulum: PendulumView | null;
  lengthMm: number;
  scaleMj: number;
  lift: LiftView | null;
  lifted: boolean;
  maxDistanceMm: number;
  reduced: boolean;
};
type Renderer = ComponentType<{ state: EnergyStageState }>;

const world = (mm: number) => mm * MM;
/** The panel covers the right (wide) or bottom (narrow); the header bar and status chip cover the top. */
const insets: BenchViewPreset["insets"] = (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12, top: narrow ? 96 : 130 });
/** `narrowX` centres the phone camera on the whole station (the wide camera sits off to the right, so it aims further left). */
const view = (x: number, y: number, fitWidth: number, narrowX = x): BenchViewPreset => ({
  wide: { position: [world(x) + 0.3, 1.3, 2.6], target: [world(x), y, 0] },
  narrow: { position: [world(narrowX), 1.9, 4.8], target: [world(narrowX), y - 0.1, 0] },
  minDistance: 0.9, maxDistance: 7, fitWidth, insets,
});
/** One stable camera per station (module constants, so the camera only moves when the station changes). */
const STATION_VIEWS: Record<EnergyStation, BenchViewPreset> = { pendulum: view(X.pendulum - 120, 0.75, 3.6, X.pendulum - 60), hoist: view(X.hoist + 20, 1, 3.6) };

function useDamped(to: number, reduced: boolean, apply: (value: number) => void, rate = 6) {
  const value = useRef(to);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [to, invalidate]);
  useFrame((state, delta) => {
    value.current = reduced ? to : THREE.MathUtils.damp(value.current, to, rate, Math.min(delta, 1 / 30));
    if (Math.abs(value.current - to) < 1e-4) value.current = to;
    apply(value.current);
    if (value.current !== to) state.invalidate();
  });
}

const Box = ({ size, position, color, metal = 0.1 }: { size: [number, number, number]; position: [number, number, number]; color: string; metal?: number }) =>
  <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={metal} roughness={0.55} /></mesh>;

function PendulumItem({ state }: { state: EnergyStageState }) {
  const arm = useRef<THREE.Group>(null);
  const view = state.pendulum;
  const target = view ? pendulumAngle(state.lengthMm, view.heightMm, view.position) : 0;
  useDamped(target, state.reduced, (value) => { if (arm.current) arm.current.rotation.z = value; });
  const top = state.lengthMm + 120;
  const radius = 18 + (view?.massG ?? 100) / 20;
  // Retort stand behind the swing plane: a post and an arm reaching forward to the pivot, so a swing of up to ±L never meets the stand.
  return <group position={[X.pendulum - 120, 0, 0]} scale={PENDULUM_SCALE} name="pendulum">
    <Box size={[320, 16, 300]} position={[0, 8, -60]} color="#6b5a49" />
    <Box size={[18, top, 18]} position={[0, top / 2, -190]} color="#8a949a" metal={0.6} />
    <Box size={[14, 14, 200]} position={[0, top, -95]} color="#8a949a" metal={0.6} />
    <group ref={arm} position={[0, top, 0]}>
      <mesh position={[0, -state.lengthMm / 2, 0]}><cylinderGeometry args={[1.5, 1.5, state.lengthMm, 6]} /><meshStandardMaterial color="#2f3a40" /></mesh>
      <mesh position={[0, -state.lengthMm, 0]} castShadow><sphereGeometry args={[radius, 32, 16]} /><meshStandardMaterial color="#b9832f" metalness={0.7} roughness={0.3} /></mesh>
    </group>
  </group>;
}

function EnergyBar({ x, value, scaleMj, color, reduced }: { x: number; value: number; scaleMj: number; color: string; reduced: boolean }) {
  const bar = useRef<THREE.Mesh>(null);
  const share = scaleMj > 0 ? Math.max(0.001, Math.min(1, value / scaleMj)) : 0.001;
  useDamped(share, reduced, (v) => { if (bar.current) { bar.current.scale.y = v; bar.current.position.y = 30 + (BAR_H * v) / 2; } }, 8);
  return <group position={[x, 0, 0]}>
    <mesh position={[0, 30 + BAR_H / 2, -6]}><boxGeometry args={[46, BAR_H, 4]} /><meshStandardMaterial color="#e8ecef" /></mesh>
    <mesh ref={bar} position={[0, 30, 0]}><boxGeometry args={[40, BAR_H, 12]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
  </group>;
}

function EnergyBarsItem({ state }: { state: EnergyStageState }) {
  const view = state.pendulum;
  if (!view) return null;
  return <group position={[X.pendulum + 240, 0, -40]} scale={PENDULUM_SCALE} name="energy_bars">
    <Box size={[200, 30, 40]} position={[0, 15, 0]} color="#3c4a52" />
    <EnergyBar x={-60} value={view.kineticMj} scaleMj={state.scaleMj} color="#e0653a" reduced={state.reduced} />
    <EnergyBar x={0} value={view.potentialMj} scaleMj={state.scaleMj} color="#2f7fd1" reduced={state.reduced} />
    <EnergyBar x={60} value={view.mechanicalMj} scaleMj={state.scaleMj} color="#2e9d63" reduced={state.reduced} />
  </group>;
}

/** Frame height: the highest lift (max 1 000 mm drawn at HOIST_SCALE) plus the largest load and the gauge above it must stay under the pulley. */
const HOIST_TOP = 1000 * HOIST_SCALE + 220;
const loadSize = (massG: number) => 40 + Math.min(40, massG / 50);
const GAUGE_H = 60;
/** The gauge hangs 10 mm above the top of the load box (the box stands on the 16 mm base). */
const GAUGE_BOTTOM = (size: number) => 16 + size + 10;

function HoistItem({ state }: { state: EnergyStageState }) {
  const load = useRef<THREE.Group>(null);
  const rope = useRef<THREE.Mesh>(null);
  const lift = state.lift;
  const size = loadSize(lift?.massG ?? 200);
  const rise = state.lifted && lift ? lift.distanceMm * HOIST_SCALE : 0;
  useDamped(rise, state.reduced, (value) => {
    if (load.current) load.current.position.y = value;
    if (rope.current) {
      // The rope runs from under the pulley to the top of the spring gauge that hangs on the load.
      const length = Math.max(1, HOIST_TOP - 30 - (GAUGE_BOTTOM(size) + GAUGE_H + value));
      rope.current.scale.y = length;
      rope.current.position.y = HOIST_TOP - 30 - length / 2;
    }
  }, 2.5);
  return <group position={[X.hoist, 0, 0]} name="hoist">
    <Box size={[420, 16, 200]} position={[0, 8, 0]} color="#6b5a49" />
    <Box size={[24, HOIST_TOP, 24]} position={[-150, HOIST_TOP / 2, 0]} color="#8a949a" metal={0.6} />
    <Box size={[220, 20, 24]} position={[-50, HOIST_TOP, 0]} color="#8a949a" metal={0.6} />
    <mesh position={[40, HOIST_TOP - 22, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[20, 20, 16, 24]} /><meshStandardMaterial color="#59646b" metalness={0.6} /></mesh>
    <Box size={[90, 70, 80]} position={[-150, 50, 70]} color={lift?.motorId === "fast" ? "#c2410c" : "#2563eb"} />
    <mesh ref={rope} position={[60, HOIST_TOP / 2, 0]}><boxGeometry args={[3, 1, 3]} /><meshStandardMaterial color="#2f3a40" /></mesh>
    <group ref={load}>
      <Box size={[size, size, size]} position={[60, 16 + size / 2, 0]} color="#7d6a55" />
    </group>
  </group>;
}

function SpringGaugeItem({ state }: { state: EnergyStageState }) {
  const gauge = useRef<THREE.Group>(null);
  const lift = state.lift;
  const size = loadSize(lift?.massG ?? 200);
  const rise = state.lifted && lift ? lift.distanceMm * HOIST_SCALE : 0;
  useDamped(rise, state.reduced, (value) => { if (gauge.current) gauge.current.position.y = GAUGE_BOTTOM(size) + value; }, 2.5);
  return <group ref={gauge} position={[X.hoist + 60, GAUGE_BOTTOM(size), 0]} name="spring_gauge">
    <mesh position={[0, GAUGE_H / 2, 0]}><cylinderGeometry args={[10, 10, GAUGE_H, 16]} /><meshStandardMaterial color="#e2b65e" metalness={0.3} /></mesh>
    <mesh position={[0, -5, 0]}><cylinderGeometry args={[1.5, 1.5, 10, 6]} /><meshStandardMaterial color="#2f3a40" /></mesh>
  </group>;
}

function RulerItem() {
  return <group position={[X.hoist + 160, 0, 20]} name="ruler">
    <Box size={[30, 1100 * HOIST_SCALE, 6]} position={[0, 16 + (1100 * HOIST_SCALE) / 2, 0]} color="#f2d27a" />
    {Array.from({ length: 11 }, (_, index) => <Box key={index} size={[16, 3, 8]} position={[-8, 16 + index * 100 * HOIST_SCALE, 2]} color="#3b2f1e" />)}
  </group>;
}

function StopwatchItem({ state }: { state: EnergyStageState }) {
  const reading = state.lifted && state.lift ? formatSeconds(state.lift.durationMs) : "0 s";
  return <group position={[X.hoist - 60, 16, 140]} scale={ITEM_MM * 0.5} name="stopwatch"><Stopwatch3D reading={reading} running={false} /></group>;
}

/** One renderer per apparatus kind of the engine (P0 C2.3): the stage looks each enabled item up by its kind. */
export const APPARATUS_RENDERERS: Record<EnergyApparatusKind, Renderer> = {
  pendulum: PendulumItem,
  energy_bars: EnergyBarsItem,
  hoist: HoistItem,
  spring_gauge: SpringGaugeItem,
  ruler: RulerItem,
  stopwatch: StopwatchItem,
};

export function EnergyStage3D({ apparatus, state, active = true, children }: {
  apparatus: ReadonlyArray<{ id: string; kind: EnergyApparatusKind }>;
  state: EnergyStageState;
  active?: boolean;
  children?: ReactNode;
}) {
  const sceneRoot = useContext(LabSceneContext);
  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);
  return <PhysicsStage realism frameloop="demand" view={STATION_VIEWS[state.station]} active={active}>
    <group position={[0, BENCH_TOP, 0]} scale={MM}>
      {apparatus.map((item) => {
        const Item = APPARATUS_RENDERERS[item.kind];
        return <Item key={item.id} state={state} />;
      })}
      {children}
    </group>
  </PhysicsStage>;
}
