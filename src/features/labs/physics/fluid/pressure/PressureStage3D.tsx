/**
 * FL-04 3D bench on the shared K3 room (millimetres). Decorative: every reading is also in the DOM panel.
 * Station 1: a glass tank with a depth ruler and the membrane probe; the membranes cup inwards by level.
 * Station 2: two connected cylinders with pistons, pans and weights; the pistons only show the direction.
 */
import { useContext, useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { DepthProbeSettings, FluidStation, PistonSettings } from "@nexalab/sim/fluid";
import type { BenchViewPreset } from "../../shared/PhysicsStage";
import { LabSceneContext } from "../../../shared/LabSpace";
import { FluidBench3D } from "../kit";
import type { PistonReading, ProbeReading } from "./pressure-log";

const WATER = "#5fb4dc";
const GLASS = "#dff3fb";
const RUBBER = "#e2725b";
const TANK_X = -170;
const PISTONS_X = 300;
const TANK_W = 300;
const TANK_D = 200;
const PROBE_R = 34;
const PROBE_H = 90;
const TUBE_H = 160;
/** Visual depth of a fully cupped membrane, in mm. */
const CUP_MM = 14;
const PISTON_TRAVEL_MM = 18;

/** World x of a bench position in mm (K3 scale 0.004 mm → units). */
const world = (mm: number) => mm * 0.004;
const insets: BenchViewPreset["insets"] = (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12 });
/** One stable camera per station (module constants, so the camera only moves when the station changes). */
const STATION_VIEWS: Record<FluidStation, BenchViewPreset> = {
  "depth-probe": {
    wide: { position: [world(TANK_X) + 0.35, 1.15, 2.45], target: [world(TANK_X), 0.55, 0] },
    narrow: { position: [world(TANK_X), 1.8, 4.8], target: [world(TANK_X), 0.4, 0] },
    minDistance: 0.9, maxDistance: 6, fitWidth: 2.4, insets,
  },
  pistons: {
    wide: { position: [world(PISTONS_X) + 0.3, 1.1, 2.3], target: [world(PISTONS_X), 0.55, -0.08] },
    narrow: { position: [world(PISTONS_X), 1.7, 4.4], target: [world(PISTONS_X), 0.45, -0.08] },
    minDistance: 0.9, maxDistance: 6, fitWidth: 2.2, insets,
  },
};

/** Damped approach of `position.y` (or a scale axis) to `to`; reduced motion snaps. */
function useDamped(to: number, reduced: boolean, apply: (value: number) => void) {
  const value = useRef(to);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [to, invalidate]);
  useFrame((state, delta) => {
    value.current = reduced ? to : THREE.MathUtils.damp(value.current, to, 8, Math.min(delta, 1 / 30));
    if (Math.abs(value.current - to) < 0.01) value.current = to;
    apply(value.current);
    if (value.current !== to) state.invalidate();
  });
}

/** A rubber membrane over a hole of radius `r`, facing +z in its own frame; it cups towards -z by `level / levels`. */
function Membrane({ level, levels, r, reduced }: { level: number; levels: number; r: number; reduced: boolean }) {
  const cup = useRef<THREE.Mesh>(null);
  useDamped((level / levels) * CUP_MM, reduced, (depth) => { if (cup.current) cup.current.scale.z = Math.max(0.02, depth / r); });
  return <group>
    <mesh ref={cup} scale={[1, 1, 0.02]}>
      <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <meshStandardMaterial color={RUBBER} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
    <mesh><torusGeometry args={[r, 2.2, 8, 32]} /><meshStandardMaterial color="#9a3f2c" roughness={0.6} /></mesh>
  </group>;
}

function DepthRuler({ waterLevelMm, height }: { waterLevelMm: number; height: number }) {
  const ticks = [];
  for (let depth = 0; depth <= waterLevelMm; depth += 10) {
    const major = depth % 50 === 0;
    ticks.push(<mesh key={depth} position={[major ? -6 : -3, waterLevelMm - depth, 1.5]}><boxGeometry args={[major ? 14 : 8, major ? 1.6 : 0.9, 0.6]} /><meshBasicMaterial color="#21313a" /></mesh>);
  }
  return <group position={[TANK_W / 2 + 14, 0, TANK_D / 2 - 10]}>
    <mesh position={[0, height / 2, 0]}><boxGeometry args={[22, height, 3]} /><meshStandardMaterial color="#f4ecd2" roughness={0.6} /></mesh>
    {ticks}
  </group>;
}

function DepthStation({ settings, levels, probe, reduced }: { settings: DepthProbeSettings; levels: number; probe: ProbeReading; reduced: boolean }) {
  const holder = useRef<THREE.Group>(null);
  const water = settings.waterLevelMm;
  // The probe is placed by the depth of its floor membrane C below the water surface.
  useDamped(water - probe.depthMm, reduced, (y) => { if (holder.current) holder.current.position.y = y; });
  const slide = useRef<THREE.Group>(null);
  useDamped(probe.positionMm * 0.9, reduced, (x) => { if (slide.current) slide.current.position.x = x; });
  return <group position={[TANK_X, 0, 0]} name="fl04-depth-station">
    <mesh position={[0, 3, 0]} receiveShadow><boxGeometry args={[TANK_W + 16, 6, TANK_D + 16]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
    <mesh position={[0, water / 2 + 6, 0]} name="fl04-water">
      <boxGeometry args={[TANK_W - 6, water, TANK_D - 6]} />
      <meshStandardMaterial color={WATER} transparent opacity={0.42} roughness={0.15} depthWrite={false} />
    </mesh>
    <mesh position={[0, settings.tankHeightMm / 2 + 6, 0]}>
      <boxGeometry args={[TANK_W, settings.tankHeightMm, TANK_D]} />
      <meshStandardMaterial color={GLASS} transparent opacity={0.16} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <DepthRuler waterLevelMm={water} height={settings.tankHeightMm} />
    <group ref={slide}>
      <group ref={holder} position={[0, water - probe.depthMm, 0]}>
        <group position={[0, 6, 0]}>
          {/* Probe body, floor membrane C (facing down) and side membranes A (left) and B (right). */}
          <mesh position={[0, PROBE_H / 2, 0]}><cylinderGeometry args={[PROBE_R, PROBE_R, PROBE_H, 40, 1, true]} /><meshStandardMaterial color="#f1f7fa" transparent opacity={0.5} roughness={0.1} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, PROBE_H + TUBE_H / 2, 0]}><cylinderGeometry args={[12, 12, TUBE_H, 24, 1, true]} /><meshStandardMaterial color="#f1f7fa" transparent opacity={0.55} roughness={0.1} side={THREE.DoubleSide} /></mesh>
          <group rotation={[-Math.PI / 2, 0, 0]} name="membrane-C"><Membrane level={probe.levels.C} levels={levels} r={PROBE_R - 2} reduced={reduced} /></group>
          <group position={[-PROBE_R, settings.sideHoleOffsetMm, 0]} rotation={[0, -Math.PI / 2, 0]} name="membrane-A"><Membrane level={probe.levels.A} levels={levels} r={13} reduced={reduced} /></group>
          <group position={[PROBE_R, settings.sideHoleOffsetMm, 0]} rotation={[0, Math.PI / 2, 0]} name="membrane-B"><Membrane level={probe.levels.B} levels={levels} r={13} reduced={reduced} /></group>
        </group>
      </group>
    </group>
  </group>;
}

function Weights({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => <mesh key={index} position={[0, 6 + index * 11, 0]} castShadow>
    <cylinderGeometry args={[11, 11, 10, 24]} /><meshStandardMaterial color="#59646b" metalness={0.55} roughness={0.35} />
  </mesh>)}</>;
}

function Piston({ x, r, offset, count, label, reduced }: { x: number; r: number; offset: number; count: number; label: string; reduced: boolean }) {
  const rod = useRef<THREE.Group>(null);
  const top = 150;
  useDamped(top + offset, reduced, (y) => { if (rod.current) rod.current.position.y = y; });
  return <group position={[x, 0, 0]} name={label}>
    <mesh position={[0, 100, 0]}><cylinderGeometry args={[r + 3, r + 3, 200, 40, 1, true]} /><meshStandardMaterial color={GLASS} transparent opacity={0.25} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, (top + offset + 14) / 2, 0]}><cylinderGeometry args={[r, r, top + offset - 14, 40]} /><meshStandardMaterial color={WATER} transparent opacity={0.5} roughness={0.15} depthWrite={false} /></mesh>
    <group ref={rod} position={[0, top + offset, 0]}>
      <mesh><cylinderGeometry args={[r, r, 10, 40]} /><meshStandardMaterial color="#e06a9a" roughness={0.5} /></mesh>
      <mesh position={[0, 40, 0]}><cylinderGeometry args={[4, 4, 70, 12]} /><meshStandardMaterial color="#9aa3a0" metalness={0.6} roughness={0.3} /></mesh>
      <group position={[0, 76, 0]}>
        <mesh><cylinderGeometry args={[30, 26, 4, 32]} /><meshStandardMaterial color="#cfd6d2" metalness={0.4} roughness={0.35} /></mesh>
        <Weights count={count} />
      </group>
    </group>
  </group>;
}

function PistonStation({ settings, pistons, reduced }: { settings: PistonSettings; pistons: PistonReading; reduced: boolean }) {
  // Radii keep the area ratio of the config: r ∝ √area.
  const r1 = 42;
  const r2 = r1 * Math.sqrt(settings.areasMm2[1] / settings.areasMm2[0]);
  const offset1 = pistons.outcome === "piston1_down" ? -PISTON_TRAVEL_MM : pistons.outcome === "piston2_down" ? PISTON_TRAVEL_MM / 2 : 0;
  const offset2 = pistons.outcome === "piston2_down" ? -PISTON_TRAVEL_MM : pistons.outcome === "piston1_down" ? PISTON_TRAVEL_MM * 2 : 0;
  return <group position={[PISTONS_X, 0, -20]} name="fl04-piston-station">
    <mesh position={[0, 4, 0]} receiveShadow><boxGeometry args={[320, 8, 120]} /><meshStandardMaterial color="#3a4a52" roughness={0.6} /></mesh>
    <mesh position={[0, 22, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[12, 12, 200, 20]} /><meshStandardMaterial color={WATER} transparent opacity={0.6} roughness={0.15} /></mesh>
    <Piston x={-90} r={r1} offset={offset1} count={pistons.pan1} label="piston-1" reduced={reduced} />
    <Piston x={90} r={r2} offset={offset2} count={pistons.pan2} label="piston-2" reduced={reduced} />
  </group>;
}

export function PressureStage3D({ station, depthSettings, pistonSettings, levels, probe, pistons, reduced, active = true, children }: {
  station: FluidStation;
  depthSettings?: DepthProbeSettings;
  pistonSettings?: PistonSettings;
  levels: number;
  probe: ProbeReading | null;
  pistons: PistonReading | null;
  reduced: boolean;
  active?: boolean;
  children?: ReactNode;
}) {
  const sceneRoot = useContext(LabSceneContext);
  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);
  return <FluidBench3D view={STATION_VIEWS[station]} active={active}>
    {depthSettings && probe && <DepthStation settings={depthSettings} levels={levels} probe={probe} reduced={reduced} />}
    {pistonSettings && pistons && <PistonStation settings={pistonSettings} pistons={pistons} reduced={reduced} />}
    {children}
  </FluidBench3D>;
}
