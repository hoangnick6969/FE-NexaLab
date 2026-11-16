/**
 * FL-08 3D bench on the shared physics room (millimetres). Decorative: every reading is also in the DOM panel.
 * One stable camera per station; motion only presents states the sim already holds.
 */
import { useContext, useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ThermalStation } from "@nexalab/sim/thermal";
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

function ConductionStation({ rods, lengthMm, heated, reduced }: { rods: RodView[]; lengthMm: number; heated: boolean; reduced: boolean }) {
  const zs = rods.length === 1 ? [0] : rods.length === 2 ? [-40, 40] : [-70, 0, 70];
  return <group position={[X.conduction, 0, 0]} name="fl08-conduction">
    {[-lengthMm / 2 - 20, lengthMm / 2 + 20].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 4, 0]}><boxGeometry args={[60, 8, 200]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
      <mesh position={[0, 85, 0]}><cylinderGeometry args={[5, 5, 170, 12]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 160, 0]}><boxGeometry args={[14, 10, 180]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
    </group>)}
    {rods.map((rod, index) => {
      const look = ROD_COLOR[rod.material] ?? ROD_COLOR.steel;
      return <group key={index} position={[0, 160, zs[index]]} name={`rod-${rod.material}`}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[6, 6, lengthMm, 20]} /><meshStandardMaterial color={look.color} metalness={look.metalness} roughness={look.roughness} transparent={look.opacity !== undefined} opacity={look.opacity ?? 1} /></mesh>
        {rod.pins.map((pin) => <Pin key={pin.id} x={-lengthMm / 2 + pin.positionMm} dropped={pin.dropped} reduced={reduced} />)}
      </group>;
    })}
    <group position={[-lengthMm / 2 + 6, 0, 0]}><Flame lit={heated} reduced={reduced} /></group>
  </group>;
}

function TestTube({ tube, x, reduced }: { tube: TubeView; x: number; reduced: boolean }) {
  const wax = useRef<THREE.Mesh>(null);
  useDamped(tube.melted ? 0.25 : 1, reduced, (s) => { if (wax.current) wax.current.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6); });
  const tilt = -0.5;
  const along = (d: number) => [Math.sin(-tilt) * d, Math.cos(-tilt) * d] as const;
  const waxD = tube.wax === "bottom" ? 14 : 150;
  const flameD = tube.flame === "bottom" ? 8 : 140;
  const [fx] = along(flameD);
  return <group position={[x, 0, 0]} name={`tube-${tube.id}`}>
    <mesh position={[-70, 4, 0]}><boxGeometry args={[60, 8, 80]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
    <mesh position={[-70, 110, 0]}><cylinderGeometry args={[4, 4, 220, 10]} /><meshStandardMaterial color="#8a9396" metalness={0.6} roughness={0.35} /></mesh>
    <group position={[0, 70, 0]} rotation={[0, 0, tilt]}>
      <mesh position={[0, 85, 0]}><cylinderGeometry args={[11, 11, 170, 20, 1, true]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.35} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 80, 0]}><cylinderGeometry args={[9.5, 9.5, 160, 20]} /><meshStandardMaterial color="#7cc3e6" transparent opacity={0.45} roughness={0.15} depthWrite={false} /></mesh>
      <mesh ref={wax} position={[0, waxD, 0]}><sphereGeometry args={[7, 14, 10]} /><meshStandardMaterial color="#f6e27a" roughness={0.5} transparent opacity={tube.melted ? 0.6 : 1} /></mesh>
    </group>
    {tube.flame && <group position={[fx, -12, 0]}><Flame lit reduced={reduced} /></group>}
  </group>;
}

function DyeFlask({ heated, reduced }: { heated: boolean; reduced: boolean }) {
  const loop = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!loop.current || !heated || reduced) return;
    loop.current.rotation.z -= delta * 0.9;
    state.invalidate();
  });
  // The flask stands on a tripod; the spirit lamp sits under its floor.
  return <group position={[240, 0, -40]} name="fl08-dye">
    {[0, 1, 2].map((leg) => <mesh key={leg} position={[Math.cos(leg * 2.1) * 48, 50, Math.sin(leg * 2.1) * 48]}><cylinderGeometry args={[3, 3, 100, 8]} /><meshStandardMaterial color="#59646b" metalness={0.5} roughness={0.4} /></mesh>)}
    <mesh position={[0, 100, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[50, 3, 8, 32]} /><meshStandardMaterial color="#59646b" metalness={0.5} roughness={0.4} /></mesh>
    <group position={[0, 102, 0]}>
      <mesh position={[0, 70, 0]}><cylinderGeometry args={[45, 45, 140, 32, 1, true]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 62, 0]}><cylinderGeometry args={[42, 42, 124, 32]} /><meshStandardMaterial color="#7cc3e6" transparent opacity={0.35} depthWrite={false} /></mesh>
      {heated && <group ref={loop} position={[0, 62, 0]}>
        <mesh><torusGeometry args={[28, 4, 8, 40]} /><meshStandardMaterial color="#7b2d8e" transparent opacity={0.55} /></mesh>
      </group>}
    </group>
    <Flame lit={heated} reduced={reduced} />
  </group>;
}

function ConvectionStation({ tubes, dye, reduced }: { tubes: TubeView[]; dye: boolean; reduced: boolean }) {
  return <group position={[X.convection, 0, 0]} name="fl08-convection">
    {tubes.map((tube, index) => <TestTube key={tube.id} tube={tube} x={-110 + index * 170} reduced={reduced} />)}
    {dye && <DyeFlask heated={tubes.some((tube) => tube.flame !== null)} reduced={reduced} />}
  </group>;
}

function RadiationStation({ lampOn, screen, surface, tenthsC, seconds, running }: { lampOn: boolean; screen: boolean; surface: "black" | "silver"; tenthsC: number; seconds: number; running: boolean }) {
  const fill = Math.min(1, Math.max(0, (tenthsC - 200) / 200));
  return <group position={[X.radiation, 0, 0]} name="fl08-radiation">
    <group position={[-170, 0, 0]}>
      <mesh position={[0, 20, 0]}><cylinderGeometry args={[30, 34, 40, 24]} /><meshStandardMaterial color="#e6e8e9" roughness={0.5} /></mesh>
      <mesh position={[0, 80, 0]}><sphereGeometry args={[34, 24, 16]} /><meshStandardMaterial color={lampOn ? "#fff4c2" : "#eef1f2"} emissive={lampOn ? "#ffcf57" : "#000000"} emissiveIntensity={lampOn ? 1.6 : 0} transparent opacity={0.9} /></mesh>
      {lampOn && <pointLight position={[0, 80, 0]} intensity={0.6} distance={2} color="#ffd27a" />}
    </group>
    {screen && <mesh position={[-60, 110, 0]} name="wood-screen"><boxGeometry args={[18, 220, 200]} /><meshStandardMaterial color="#c58a49" roughness={0.75} /></mesh>}
    <group position={[90, 0, 0]}>
      <mesh position={[0, 4, 0]}><boxGeometry args={[160, 8, 140]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
      <mesh position={[0, 85, 0]} name={`flask-${surface}`}><sphereGeometry args={[58, 32, 24]} /><meshStandardMaterial color={surface === "black" ? "#1d1f20" : "#d9dee2"} metalness={surface === "black" ? 0.05 : 1} roughness={surface === "black" ? 0.85 : 0.12} /></mesh>
      <mesh position={[0, 155, 0]}><cylinderGeometry args={[16, 16, 30, 20]} /><meshStandardMaterial color="#e8f6fb" transparent opacity={0.4} /></mesh>
      <group position={[0, 70, 0]} scale={ITEM_MM}><Thermometer3D length={0.6} fill={fill} divisions={10} /></group>
    </group>
    <group position={[200, 0, 120]} scale={ITEM_MM * 0.6}><Stopwatch3D reading={`${seconds} s`} running={running} /></group>
  </group>;
}

export type ThermalStageProps = {
  station: ThermalStation;
  reduced: boolean;
  conduction?: { rods: RodView[]; lengthMm: number; heated: boolean };
  convection?: { tubes: TubeView[]; dye: boolean };
  radiation?: { lampOn: boolean; screen: boolean; surface: "black" | "silver"; tenthsC: number; seconds: number; running: boolean };
  active?: boolean;
  children?: ReactNode;
};

export function ThermalStage3D({ station, reduced, conduction, convection, radiation, active = true, children }: ThermalStageProps) {
  const sceneRoot = useContext(LabSceneContext);
  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);
  return <PhysicsStage realism frameloop="demand" view={STATION_VIEWS[station]} active={active}>
    <group position={[0, BENCH_TOP, 0]} scale={MM}>
      {conduction && <ConductionStation rods={conduction.rods} lengthMm={conduction.lengthMm} heated={conduction.heated} reduced={reduced} />}
      {convection && <ConvectionStation tubes={convection.tubes} dye={convection.dye} reduced={reduced} />}
      {radiation && <RadiationStation {...radiation} />}
      {children}
    </group>
  </PhysicsStage>;
}
