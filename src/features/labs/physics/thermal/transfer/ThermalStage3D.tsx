/**
 * FL-08 3D bench on the shared physics room (millimetres). Decorative: every reading is also in the DOM panel.
 * One stable camera per station; motion only presents states the sim already holds.
 */
import { useContext, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ThermalApparatusKind, ThermalStation } from "@nexalab/sim/thermal";
import { LabSceneContext } from "../../../shared/LabSpace";
import { Thermometer3D } from "../../../shared/items/thermometer";
import { Stopwatch3D } from "../../../shared/items/stopwatch";
import { PhysicsStage, type BenchViewPreset } from "../../shared/PhysicsStage";
import type { RodView, TubeView } from "./transfer-log";

const MM = 0.004;
const BENCH_TOP = 0.02;
/** Shared items are modelled in item units; 1 unit = 250 mm on this bench. */
const ITEM_MM = 250;
const X = { conduction: -520, convection: 0, radiation: 600 } as const;
const ROD_COLOR: Record<string, { color: string; metalness: number; roughness: number; opacity?: number }> = {
  copper: { color: "#b87333", metalness: 0.8, roughness: 0.3 },
  aluminium: { color: "#c9ced3", metalness: 0.8, roughness: 0.35 },
  steel: { color: "#7d868c", metalness: 0.75, roughness: 0.4 },
  glass: { color: "#cfeaf2", metalness: 0, roughness: 0.05, opacity: 0.55 },
  wood: { color: "#a4703f", metalness: 0, roughness: 0.8 },
};

const world = (mm: number) => mm * MM;
const insets: BenchViewPreset["insets"] = (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12 });
const view = (x: number, y: number): BenchViewPreset => ({
  wide: { position: [world(x) + 0.3, 1.1, 2.3], target: [world(x), y, 0] },
  narrow: { position: [world(x), 1.7, 4.4], target: [world(x), y - 0.1, 0] },
  minDistance: 0.9, maxDistance: 6, fitWidth: 2.2, insets,
});
/** One stable camera per station (module constants, so the camera only moves when the station changes). */
const STATION_VIEWS: Record<ThermalStation, BenchViewPreset> = { conduction: view(X.conduction, 0.5), convection: view(X.convection, 0.55), radiation: view(X.radiation, 0.5) };

function useDamped(to: number, reduced: boolean, apply: (value: number) => void, rate = 8) {
  const value = useRef(to);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [to, invalidate]);
  useFrame((state, delta) => {
    value.current = reduced ? to : THREE.MathUtils.damp(value.current, to, rate, Math.min(delta, 1 / 30));
    if (Math.abs(value.current - to) < 0.01) value.current = to;
    apply(value.current);
    if (value.current !== to) state.invalidate();
  });
}

function Flame({ lit, reduced }: { lit: boolean; reduced: boolean }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!flame.current || !lit) return;
    const t = state.clock.elapsedTime;
    flame.current.scale.set(1, reduced ? 1 : 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.05, 1);
    if (!reduced) state.invalidate();
  });
  return <group>
    <mesh position={[0, 18, 0]}><cylinderGeometry args={[22, 26, 36, 24]} /><meshStandardMaterial color="#dfe7ea" transparent opacity={0.6} roughness={0.1} /></mesh>
    <mesh position={[0, 40, 0]}><cylinderGeometry args={[3, 3, 10, 8]} /><meshStandardMaterial color="#e9e1c8" /></mesh>
    {lit && <mesh ref={flame} position={[0, 58, 0]}><coneGeometry args={[8, 30, 16]} /><meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={1.4} transparent opacity={0.85} /></mesh>}
  </group>;
}

function Pin({ x, dropped, reduced }: { x: number; dropped: boolean; reduced: boolean }) {
  const pin = useRef<THREE.Group>(null);
  useDamped(dropped ? -142 : 0, reduced, (y) => { if (pin.current) pin.current.position.y = y; }, 5);
  return <group ref={pin} position={[x, 0, 0]}>
    <mesh position={[0, -4, 0]}><sphereGeometry args={[5, 12, 8]} /><meshStandardMaterial color="#f3e7b5" roughness={0.6} /></mesh>
    <mesh position={[0, -16, 0]} rotation={[0, 0, dropped ? Math.PI / 2 : 0]}><cylinderGeometry args={[1.4, 1.4, 22, 8]} /><meshStandardMaterial color="#9aa3a0" metalness={0.7} roughness={0.3} /></mesh>
  </group>;
}

/** What every apparatus renderer of this bench receives: the three stations' state and the open station's clock. */
export type ThermalStageState = {
  station: ThermalStation;
  reduced: boolean;
  conduction?: { rods: RodView[]; lengthMm: number; heated: boolean };
  convection?: { tubes: TubeView[]; dye: boolean };
  radiation?: { lampOn: boolean; screen: boolean; surface: "black" | "silver"; tenthsC: number };
  clock: { seconds: number; running: boolean };
};
type Renderer = ComponentType<{ state: ThermalStageState }>;

// Layout shared by the renderers that sit together (a flame under a rod end, a tube or the dye flask).
const rodZs = (count: number) => (count === 1 ? [0] : count === 2 ? [-40, 40] : [-70, 0, 70]);
const TUBE_TILT = -0.5;
const tubeX = (index: number) => -110 + index * 170;
const alongTube = (d: number) => Math.sin(-TUBE_TILT) * d;
const DYE_AT: [number, number, number] = [240, 0, -40];
const FLASK_X = 90;

function RodRackItem({ state }: { state: ThermalStageState }) {
  const conduction = state.conduction;
  if (!conduction) return null;
  const { rods, lengthMm } = conduction;
  const zs = rodZs(rods.length);
  return <group position={[X.conduction, 0, 0]} name="rod_rack">
    {[-lengthMm / 2 - 20, lengthMm / 2 + 20].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 4, 0]}><boxGeometry args={[60, 8, 200]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
      <mesh position={[0, 85, 0]}><cylinderGeometry args={[5, 5, 170, 12]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 160, 0]}><boxGeometry args={[14, 10, 180]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
    </group>)}
    {rods.map((rod, index) => {
      const look = ROD_COLOR[rod.material] ?? ROD_COLOR.steel;
      return <group key={index} position={[0, 160, zs[index]]} name={`rod-${rod.material}`}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[6, 6, lengthMm, 20]} /><meshStandardMaterial color={look.color} metalness={look.metalness} roughness={look.roughness} transparent={look.opacity !== undefined} opacity={look.opacity ?? 1} /></mesh>
        {rod.pins.map((pin) => <Pin key={pin.id} x={-lengthMm / 2 + pin.positionMm} dropped={pin.dropped} reduced={state.reduced} />)}
      </group>;
    })}
  </group>;
}

function SpiritLampItem({ state }: { state: ThermalStageState }) {
  const { conduction, convection, reduced } = state;
  const heating = !!convection?.tubes.some((tube) => tube.flame !== null);
  return <group name="spirit_lamp">
    {conduction && <group position={[X.conduction - conduction.lengthMm / 2 + 6, 0, 0]}><Flame lit={conduction.heated} reduced={reduced} /></group>}
    {convection?.tubes.map((tube, index) => tube.flame && <group key={tube.id} position={[X.convection + tubeX(index) + alongTube(tube.flame === "bottom" ? 8 : 140), -12, 0]}><Flame lit reduced={reduced} /></group>)}
    {convection?.dye && <group position={[X.convection + DYE_AT[0], 0, DYE_AT[2]]}><Flame lit={heating} reduced={reduced} /></group>}
  </group>;
}

function TestTube({ tube, x, reduced }: { tube: TubeView; x: number; reduced: boolean }) {
  const wax = useRef<THREE.Mesh>(null);
  useDamped(tube.melted ? 0.25 : 1, reduced, (s) => { if (wax.current) wax.current.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6); });
  return <group position={[x, 0, 0]} name={`tube-${tube.id}`}>
    <mesh position={[-70, 4, 0]}><boxGeometry args={[60, 8, 80]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
    <mesh position={[-70, 110, 0]}><cylinderGeometry args={[4, 4, 220, 10]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
    <group position={[0, 70, 0]} rotation={[0, 0, TUBE_TILT]}>
      <mesh position={[0, 85, 0]}><cylinderGeometry args={[11, 11, 170, 20, 1, true]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.35} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 80, 0]}><cylinderGeometry args={[9.5, 9.5, 160, 20]} /><meshStandardMaterial color="#7cc3e6" transparent opacity={0.45} roughness={0.15} depthWrite={false} /></mesh>
      <mesh ref={wax} position={[0, tube.wax === "bottom" ? 14 : 150, 0]}><sphereGeometry args={[7, 14, 10]} /><meshStandardMaterial color="#f6e27a" roughness={0.5} transparent opacity={tube.melted ? 0.6 : 1} /></mesh>
    </group>
  </group>;
}

function TestTubesItem({ state }: { state: ThermalStageState }) {
  if (!state.convection) return null;
  return <group position={[X.convection, 0, 0]} name="test_tubes">
    {state.convection.tubes.map((tube, index) => <TestTube key={tube.id} tube={tube} x={tubeX(index)} reduced={state.reduced} />)}
  </group>;
}

function DyeFlaskItem({ state }: { state: ThermalStageState }) {
  const loop = useRef<THREE.Group>(null);
  const heated = !!state.convection?.tubes.some((tube) => tube.flame !== null);
  useFrame((frame, delta) => {
    if (!loop.current || !heated || state.reduced) return;
    loop.current.rotation.z -= delta * 0.9;
    frame.invalidate();
  });
  if (!state.convection?.dye) return null;
  // The flask stands on a tripod; the spirit lamp renderer puts a flame under its floor.
  return <group position={[X.convection + DYE_AT[0], 0, DYE_AT[2]]} name="dye_flask">
    {[0, 1, 2].map((leg) => <mesh key={leg} position={[Math.cos(leg * 2.1) * 48, 50, Math.sin(leg * 2.1) * 48]}><cylinderGeometry args={[3, 3, 100, 8]} /><meshStandardMaterial color="#59646b" metalness={0.5} roughness={0.4} /></mesh>)}
    <mesh position={[0, 100, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[50, 3, 8, 32]} /><meshStandardMaterial color="#59646b" metalness={0.5} roughness={0.4} /></mesh>
    <group position={[0, 102, 0]}>
      <mesh position={[0, 70, 0]}><cylinderGeometry args={[45, 45, 140, 32, 1, true]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 62, 0]}><cylinderGeometry args={[42, 42, 124, 32]} /><meshStandardMaterial color="#7cc3e6" transparent opacity={0.35} depthWrite={false} /></mesh>
      {heated && <group ref={loop} position={[0, 62, 0]}><mesh><torusGeometry args={[28, 4, 8, 40]} /><meshStandardMaterial color="#7b2d8e" transparent opacity={0.55} /></mesh></group>}
    </group>
  </group>;
}

function HeatLampItem({ state }: { state: ThermalStageState }) {
  if (!state.radiation) return null;
  const on = state.radiation.lampOn;
  return <group position={[X.radiation - 170, 0, 0]} name="heat_lamp">
    <mesh position={[0, 20, 0]}><cylinderGeometry args={[30, 34, 40, 24]} /><meshStandardMaterial color="#e6e8e9" roughness={0.5} /></mesh>
    <mesh position={[0, 80, 0]}><sphereGeometry args={[34, 24, 16]} /><meshStandardMaterial color={on ? "#fff4c2" : "#eef1f2"} emissive={on ? "#ffcf57" : "#000000"} emissiveIntensity={on ? 1.6 : 0} transparent opacity={0.9} /></mesh>
    {on && <pointLight position={[0, 80, 0]} intensity={0.6} distance={2} color="#ffd27a" />}
  </group>;
}

function WoodScreenItem({ state }: { state: ThermalStageState }) {
  if (!state.radiation?.screen) return null;
  return <mesh position={[X.radiation - 60, 110, 0]} name="wood_screen"><boxGeometry args={[18, 220, 200]} /><meshStandardMaterial color="#c58a49" roughness={0.75} /></mesh>;
}

function CoatedFlaskItem({ state }: { state: ThermalStageState }) {
  if (!state.radiation) return null;
  const black = state.radiation.surface === "black";
  return <group position={[X.radiation + FLASK_X, 0, 0]} name="coated_flask">
    <mesh position={[0, 4, 0]}><boxGeometry args={[160, 8, 140]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
    <mesh position={[0, 85, 0]} name={`flask-${state.radiation.surface}`}><sphereGeometry args={[58, 32, 24]} /><meshStandardMaterial color={black ? "#1d1f20" : "#d9dee2"} metalness={black ? 0.05 : 1} roughness={black ? 0.85 : 0.12} /></mesh>
    <mesh position={[0, 155, 0]}><cylinderGeometry args={[16, 16, 30, 20]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.4} /></mesh>
  </group>;
}

function ThermometerItem({ state }: { state: ThermalStageState }) {
  if (!state.radiation) return null;
  const fill = Math.min(1, Math.max(0, (state.radiation.tenthsC - 200) / 200));
  return <group position={[X.radiation + FLASK_X, 70, 0]} scale={ITEM_MM} name="thermometer"><Thermometer3D length={0.6} fill={fill} divisions={10} /></group>;
}

function StopwatchItem({ state }: { state: ThermalStageState }) {
  // The open station's clock, beside that station.
  return <group position={[X[state.station] + 200, 0, 120]} scale={ITEM_MM * 0.6} name="stopwatch"><Stopwatch3D reading={`${state.clock.seconds} s`} running={state.clock.running} /></group>;
}

/** One renderer per apparatus kind of the engine (P0 C2.3): the stage looks each enabled item up by its kind. */
export const APPARATUS_RENDERERS: Record<ThermalApparatusKind, Renderer> = {
  rod_rack: RodRackItem,
  spirit_lamp: SpiritLampItem,
  test_tubes: TestTubesItem,
  dye_flask: DyeFlaskItem,
  heat_lamp: HeatLampItem,
  coated_flask: CoatedFlaskItem,
  wood_screen: WoodScreenItem,
  thermometer: ThermometerItem,
  stopwatch: StopwatchItem,
};

export function ThermalStage3D({ apparatus, state, active = true, children }: {
  apparatus: ReadonlyArray<{ id: string; kind: ThermalApparatusKind }>;
  state: ThermalStageState;
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
