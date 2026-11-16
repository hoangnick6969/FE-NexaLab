/**
 * FL-23 3D bench on the shared physics room (millimetres). Decorative: every reading is also in the 2D diagram and the DOM panel.
 * The disk lies flat inside a dark booth so the laser beams stand out; 2D (x, y down) maps to 3D (x, z towards the viewer).
 */
import { useContext, useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import * as THREE from "three";
import type { OpticsApparatusKind } from "@nexalab/sim/optics";
import { LabSceneContext } from "../../../shared/LabSpace";
import { PhysicsStage, type BenchViewPreset } from "../../shared/PhysicsStage";
import { prismGeometry, rayGeometry, type PrismView, type RayView } from "./refraction-log";

const MM = 0.004;
const BENCH_TOP = 0.02;
const R = 150;
const DISK_H = 6;
const BLOCK_H = 30;
/** Beams run just above the disk, through the middle of the block's height. */
const BEAM_Y = DISK_H + BLOCK_H / 2;

/** Station 1/2 draw `ray`; station 3 draws `prism` (its path only once `revealed`). */
export type RefractionStageState = { station: "into-block" | "out-of-block" | "prism"; ray: RayView | null; prism: PrismView | null; revealed: boolean; reduced: boolean };
type Renderer = ComponentType<{ state: RefractionStageState }>;

const insets: BenchViewPreset["insets"] = (size, narrow) => ({ right: narrow ? 8 : Math.min(size.width * .31, 420), bottom: narrow ? Math.min(size.height * .48, 420) : 12, top: narrow ? 96 : 130 });
/** Looking down on the disk from the front, high enough to see the angles. */
const VIEW: BenchViewPreset = {
  wide: { position: [0.2, 1.9, 1.5], target: [0, 0.05, 0] },
  narrow: { position: [0, 2.6, 2.2], target: [0, 0, 0] },
  minDistance: 0.8, maxDistance: 5, fitWidth: 1.9, insets,
};

/** Canvas texture of the disk face: same 1° ticks and 10° labels as the 2D diagram. */
function useDiskTexture() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 1024;
    const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const c = size / 2;
    const r = size * 0.48;
    ctx.fillStyle = "#f4f1e8"; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2b2b2b"; ctx.fillStyle = "#2b2b2b"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 26px sans-serif";
    for (let theta = 0; theta < 360; theta++) {
      const len = theta % 10 === 0 ? 34 : theta % 5 === 0 ? 22 : 12;
      const a = theta * Math.PI / 180;
      ctx.lineWidth = theta % 10 === 0 ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(c + r * Math.sin(a), c - r * Math.cos(a)); ctx.lineTo(c + (r - len) * Math.sin(a), c - (r - len) * Math.cos(a)); ctx.stroke();
      if (theta % 10 === 0) {
        const fromNormal = theta % 180 <= 90 ? theta % 180 : 180 - (theta % 180);
        ctx.fillText(String(fromNormal), c + (r - 62) * Math.sin(a), c - (r - 62) * Math.cos(a));
      }
    }
    ctx.setLineDash([14, 10]); ctx.lineWidth = 2; ctx.strokeStyle = "#6b7774";
    ctx.beginPath(); ctx.moveTo(c, c - r); ctx.lineTo(c, c + r); ctx.stroke();
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function DiskItem() {
  const map = useDiskTexture();
  return <group name="protractor_disk">
    <mesh position={[0, DISK_H / 2, 0]} receiveShadow><cylinderGeometry args={[R + 12, R + 12, DISK_H, 64]} /><meshStandardMaterial color="#d9d4c7" roughness={0.8} /></mesh>
    {/* Face texture: canvas y (down) maps to +z, so the lower half of the 2D diagram sits towards the viewer. */}
    <mesh position={[0, DISK_H + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[R + 8, 96]} /><meshStandardMaterial map={map ?? undefined} color={map ? "#ffffff" : "#f4f1e8"} roughness={0.9} /></mesh>
  </group>;
}

function BlockItem({ state }: { state: RefractionStageState }) {
  if (state.station === "prism" || !state.ray) return null;
  const water = state.ray.mediumId === "water";
  // Half cylinder on +z (towards the viewer): theta from -90° to 90° around the y axis.
  return <mesh name="half_cylinder" position={[0, DISK_H + BLOCK_H / 2 + 0.5, 0]}>
    <cylinderGeometry args={[R - 4, R - 4, BLOCK_H, 64, 1, false, -Math.PI / 2, Math.PI]} />
    <meshPhysicalMaterial color={water ? "#7fb8e6" : "#cfe9ef"} transparent opacity={water ? 0.42 : 0.32} roughness={0.05} transmission={0.6} thickness={20} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>;
}

/** A beam from a to b at the beam height, as a thin glowing box. */
function Beam({ a, b, intensity, name, colour = "#ff2a2a", thin = false }: { a: { x: number; y: number }; b: { x: number; y: number }; intensity: number; name: string; colour?: string; thin?: boolean }) {
  const dx = b.x - a.x;
  const dz = b.y - a.y;
  const length = Math.hypot(dx, dz);
  if (length < 0.5) return null;
  return <mesh name={name} position={[(a.x + b.x) / 2, BEAM_Y, (a.y + b.y) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]}>
    <boxGeometry args={[length, thin ? 1.4 : 2.2, thin ? 1.4 : 2.2]} />
    <meshBasicMaterial color={colour} transparent opacity={Math.max(0.12, Math.min(1, intensity))} toneMapped={false} />
  </mesh>;
}

function LightItem({ state }: { state: RefractionStageState }) {
  if (state.station === "prism") return <PrismLight state={state} />;
  const { ray } = state;
  if (!ray) return null;
  const g = rayGeometry(ray, 0, 0, R);
  const centre = { x: 0, y: 0 };
  const transmitted = ray.refractionDeg === null ? 0 : 1 - ray.reflectance;
  const laser = { x: g.incident.x * 1.25, y: g.incident.y * 1.25 };
  return <group name="light_source">
    <Beam name="incident" a={laser} b={centre} intensity={1} />
    <Beam name="reflected" a={centre} b={g.reflected} intensity={ray.reflectance} />
    {g.refracted && <Beam name="refracted" a={centre} b={g.refracted} intensity={transmitted} />}
    <mesh position={[laser.x * 1.08, BEAM_Y, laser.y * 1.08]} rotation={[0, -Math.atan2(-laser.y, -laser.x), 0]} castShadow>
      <boxGeometry args={[60, 22, 22]} /><meshStandardMaterial color="#2f3a40" metalness={0.4} roughness={0.4} />
    </mesh>
  </group>;
}

const PRISM_SIDE = 170;
const SCREEN_X = 205;
const SPECTRUM_COLOUR: Record<string, string> = { red: "#ff2a2a", orange: "#ff8a1e", yellow: "#ffe11e", green: "#2ee05a", blue: "#2f7bff", indigo: "#5a3dff", violet: "#b04bff" };
const prismPath = (view: PrismView) => {
  const indices = view.light === "white" && view.spectrum.length ? view.spectrum.map((colour) => colour.indexMilli) : [view.indexMilli];
  return prismGeometry(view.apexDeg, view.incidenceDeg, indices, 0, 0, PRISM_SIDE, SCREEN_X);
};

function PrismLight({ state }: { state: RefractionStageState }) {
  const view = state.prism;
  if (!view) return null;
  const g = prismPath(view);
  const start = { x: g.entry.x - g.incident.x * 140, y: g.entry.y - g.incident.y * 140 };
  const white = view.light === "white";
  return <group name="light_source">
    <Beam name="incident" a={start} b={g.entry} intensity={1} colour={white ? "#ffffff" : undefined} />
    {state.revealed && g.rays.map((ray, k) => {
      const colour = white ? SPECTRUM_COLOUR[view.spectrum[k]?.id ?? ""] ?? "#ffffff" : undefined;
      return <group key={ray.indexMilli}>
        {ray.exit && <Beam name="inside" a={ray.entry} b={ray.exit} intensity={white ? 0.6 : 1} colour={colour} thin />}
        {ray.exit && ray.out && <Beam name="exit" a={ray.exit} b={g.toScreen(ray.exit, ray.out)} intensity={1} colour={colour} thin={white} />}
      </group>;
    })}
    <mesh position={[start.x * 1.06, BEAM_Y, start.y * 1.06]} rotation={[0, -Math.atan2(g.entry.y - start.y, g.entry.x - start.x), 0]} castShadow>
      <boxGeometry args={[60, 22, 22]} /><meshStandardMaterial color="#2f3a40" metalness={0.4} roughness={0.4} />
    </mesh>
  </group>;
}

function PrismItem({ state }: { state: RefractionStageState }) {
  const view = state.prism;
  const shape = useMemo(() => {
    if (!view) return null;
    const g = prismPath(view);
    // Shape y = -screen y, so after rotating -90° about x the triangle lies flat with screen y towards the viewer (+z).
    const triangle = new THREE.Shape([new THREE.Vector2(g.apex.x, -g.apex.y), new THREE.Vector2(g.left.x, -g.left.y), new THREE.Vector2(g.right.x, -g.right.y)]);
    return triangle;
  }, [view?.apexDeg]); // the triangle depends on the apex angle only
  if (state.station !== "prism" || !shape) return null;
  return <mesh name="prism" position={[0, DISK_H + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <extrudeGeometry args={[shape, { depth: BLOCK_H, bevelEnabled: false }]} />
    <meshPhysicalMaterial color="#cfe9ef" transparent opacity={0.35} roughness={0.05} transmission={0.6} thickness={20} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>;
}

function ScreenItem({ state }: { state: RefractionStageState }) {
  if (state.station !== "prism") return null;
  return <mesh name="screen" position={[SCREEN_X + 3, 50, 0]}><boxGeometry args={[6, 100, 240]} /><meshStandardMaterial color="#f4f4ef" roughness={0.9} /></mesh>;
}

/** Dark booth around the disk (back and two sides), so the beams read well as in a real optics bench. */
function Booth() {
  const W = 2 * R + 160;
  const H = 120;
  const material = <meshStandardMaterial color="#1d2226" roughness={0.95} />;
  return <group name="booth">
    <mesh position={[0, 1, 0]} receiveShadow><boxGeometry args={[W, 2, W]} />{material}</mesh>
    <mesh position={[0, H / 2, -W / 2]}><boxGeometry args={[W, H, 4]} />{material}</mesh>
    <mesh position={[-W / 2, H / 2, 0]}><boxGeometry args={[4, H, W]} />{material}</mesh>
    <mesh position={[W / 2, H / 2, 0]}><boxGeometry args={[4, H, W]} />{material}</mesh>
  </group>;
}

/** Table and speed card live in the panel only. */
const PanelOnly: Renderer = () => null;

/** One renderer per apparatus kind of the engine (P0 C2.3). */
export const APPARATUS_RENDERERS: Record<OpticsApparatusKind, Renderer> = {
  protractor_disk: DiskItem,
  half_cylinder: BlockItem,
  light_source: LightItem,
  measurement_table: PanelOnly,
  speed_card: PanelOnly,
  prism: PrismItem,
  screen: ScreenItem,
};

export function RefractionStage3D({ apparatus, state, active = true, children }: {
  apparatus: ReadonlyArray<{ id: string; kind: OpticsApparatusKind }>;
  state: RefractionStageState;
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
    <group position={[0, BENCH_TOP, 0]} scale={MM}>
      <Booth />
      {apparatus.map((item) => {
        const Item = APPARATUS_RENDERERS[item.kind];
        return <Item key={item.id} state={state} />;
      })}
      {children}
    </group>
  </PhysicsStage>;
}
