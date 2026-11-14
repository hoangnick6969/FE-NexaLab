/** Procedural K2 apparatus meshes. Presentation only: every visual comes from `VesselVisualState`. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, InstancedMesh, Mesh } from "three";
import * as THREE from "three";
import { SPECIES, type VesselVisualState } from "@nexalab/sim/wet-bench";
import { CATEGORY_COLOR, LITMUS_HEX, visualFill, type BottleCategory, type Look } from "./liquid-look";

const LABEL_ARC = 1.9;
const GLASS = { color: "#e0f2fe", transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0.02, depthWrite: false, side: THREE.DoubleSide } as const;

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Invisible click target, about 1.4× the real part, so small tools and tubes are easy to grab. */
export function Collider({ size, y = 0, x = 0, z = 0 }: { size: [number, number, number]; y?: number; x?: number; z?: number }) {
  return <mesh position={[x, y, z]} scale={1.4}>
    <boxGeometry args={size} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
  </mesh>;
}

/** Liquid column that eases up when volume is added, with a visible surface (meniscus). */
function Liquid({ fullHeight, rBottom, rTop, y0, fill, look }: { fullHeight: number; rBottom: number; rTop: number; y0: number; fill: number; look: Look }) {
  const group = useRef<Group>(null);
  const current = useRef(fill);
  const reduced = prefersReducedMotion();
  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    current.current += (fill - current.current) * Math.min(1, delta * (reduced ? 60 : 7));
    node.scale.y = Math.max(current.current, 0.001);
    node.visible = current.current > 0.004;
  });
  return <group ref={group} position={[0, y0, 0]} scale-y={Math.max(fill, 0.001)} visible={fill > 0.004}>
    <mesh position={[0, fullHeight / 2, 0]}>
      <cylinderGeometry args={[rTop, rBottom, fullHeight, 32]} />
      <meshStandardMaterial color={look.color} transparent opacity={look.opacity} roughness={0.25} depthWrite={false} />
    </mesh>
    <mesh position={[0, fullHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[rTop * 0.98, 32]} />
      <meshBasicMaterial color={look.surface} transparent opacity={0.6} depthWrite={false} />
    </mesh>
    <mesh position={[0, fullHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[rTop * 0.98, 0.004, 6, 32]} />
      <meshBasicMaterial color={look.surface} transparent opacity={0.95} depthWrite={false} />
    </mesh>
  </group>;
}

/** Rising bubbles for a few seconds after a gas-producing change. */
function Bubbles({ intensity, at, radius, height, bottom }: { intensity: VesselVisualState["gasBubbles"]["intensity"]; at: number; radius: number; height: number; bottom: number }) {
  const count = intensity === "vigorous" ? 30 : intensity === "medium" ? 16 : intensity === "low" ? 7 : 0;
  const mesh = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ angle: (i * 2.399) % (Math.PI * 2), r: radius * (0.25 + ((i * 37) % 60) / 100), offset: (i * 0.137) % 1, speed: 0.6 + ((i * 13) % 10) / 20 })), [count, radius]);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const reduced = prefersReducedMotion();
  useFrame(() => {
    if (!mesh.current) return;
    const elapsed = (Date.now() - at) / 1000;
    const alive = reduced ? 1 : Math.max(0, 1 - elapsed / 4.5);
    seeds.forEach((seed, i) => {
      const t = reduced ? seed.offset : (seed.offset + elapsed * seed.speed) % 1;
      const scale = alive > 0 ? 0.006 + 0.006 * (1 - t) : 0;
      matrix.makeScale(scale, scale, scale).setPosition(Math.cos(seed.angle) * seed.r, bottom + t * height, Math.sin(seed.angle) * seed.r);
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  if (!count) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
    <sphereGeometry args={[1, 8, 6]} />
    <meshStandardMaterial color="#ffffff" transparent opacity={0.9} roughness={0.1} />
  </instancedMesh>;
}

function Solids({ visual, floorY, spread }: { visual: VesselVisualState; floorY: number; spread: number }) {
  return <>{visual.solids.map((solid, index) => {
    const color = solid.coatingColor ?? SPECIES[solid.species].solidColor ?? "#999999";
    const size = Math.max(0.35, Math.cbrt(Math.max(0, solid.remainingRatio)));
    const x = ((index % 3) - 1) * spread;
    if (solid.shape === "nail") return <group key={solid.pieceId} position={[x * 0.5, floorY + 0.14, 0]} rotation={[0, 0, 0.18]}>
      <mesh castShadow><cylinderGeometry args={[0.007, 0.004, 0.26, 10]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.45} /></mesh>
      <mesh position={[0, 0.13, 0]}><cylinderGeometry args={[0.016, 0.016, 0.006, 14]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.45} /></mesh>
    </group>;
    if (solid.shape === "foil") return <mesh key={solid.pieceId} position={[x * 0.5, floorY + 0.06, 0]} rotation={[0, 0.4, 0.08]} castShadow><boxGeometry args={[0.035, 0.11, 0.004]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.35} /></mesh>;
    if (solid.shape === "chips") return <mesh key={solid.pieceId} position={[x, floorY + 0.03 * size, 0]} scale={size} castShadow><dodecahedronGeometry args={[0.035, 0]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
    return <mesh key={solid.pieceId} position={[x, floorY + 0.02 * size, 0.005 * index]} scale={size} castShadow><icosahedronGeometry args={[0.022, 0]} /><meshStandardMaterial color={color} metalness={0.5} roughness={0.5} /></mesh>;
  })}</>;
}

function Precipitate({ visual, radius, floorY }: { visual: VesselVisualState; radius: number; floorY: number }) {
  if (!visual.precipitate) return null;
  const h = 0.006 + 0.03 * visual.precipitate.amount;
  return <mesh position={[0, floorY + h / 2, 0]}><cylinderGeometry args={[radius * 0.95, radius * 0.95, h, 24]} /><meshStandardMaterial color={visual.precipitate.color} roughness={1} /></mesh>;
}

export type VesselProps = { visual: VesselVisualState; look: Look; flashAt: number | null; strip?: "red" | "purple" | "blue" };

export function TestTube3D({ visual, look, flashAt, strip }: VesselProps) {
  const H = 0.5;
  const R = 0.05;
  const fill = visualFill(visual.liquidLevel);
  return <group>
    <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R, R, H - R, 24, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, R * 0.55, 0]}><sphereGeometry args={[R, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshPhysicalMaterial {...GLASS} opacity={0.45} /></mesh>
    <mesh position={[0, H - 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.0055, 8, 28]} /><meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.8} /></mesh>
    <Liquid fullHeight={0.43} y0={0.025} rBottom={R * 0.84} rTop={R * 0.9} fill={fill} look={look} />
    <Precipitate visual={visual} radius={R * 0.8} floorY={0.015} />
    <Solids visual={visual} floorY={0.015} spread={0.012} />
    {flashAt && <Bubbles intensity={visual.gasBubbles.intensity} at={flashAt} radius={R * 0.7} height={Math.max(fill * 0.43, 0.05)} bottom={0.02} />}
    <Collider size={[0.12, 0.5, 0.12]} y={0.25} />
  </group>;
}

export function Beaker3D({ visual, look, flashAt, strip, radius = 0.15, height = 0.3 }: VesselProps & { radius?: number; height?: number }) {
  const fill = visualFill(visual.liquidLevel);
  const inner = height - 0.03;
  return <group>
    <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[radius, radius * 0.94, height, 36, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[radius * 0.94, radius * 0.94, 0.02, 36]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
    <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.008, 8, 36]} /><meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.85} /></mesh>
    {[0.25, 0.5, 0.75].map((fraction) => <mesh key={fraction} position={[radius * 0.7, height * fraction, radius * 0.72]}><boxGeometry args={[0.05, 0.004, 0.002]} /><meshStandardMaterial color="#475569" /></mesh>)}
    <Liquid fullHeight={inner} y0={0.02} rBottom={radius * 0.88} rTop={radius * 0.9} fill={fill} look={look} />
    <Precipitate visual={visual} radius={radius * 0.85} floorY={0.02} />
    <Solids visual={visual} floorY={0.02} spread={0.05} />
    {flashAt && <Bubbles intensity={visual.gasBubbles.intensity} at={flashAt} radius={radius * 0.6} height={Math.max(fill * inner, 0.05)} bottom={0.03} />}
    <Collider size={[radius * 2, height + 0.04, radius * 2]} y={height / 2} />
  </group>;
}

export function Flask3D({ visual, look, flashAt, strip }: VesselProps) {
  const body = 0.24;
  const level = visualFill(visual.liquidLevel) * body * 0.95;
  const topRadius = 0.17 - (0.17 - 0.05) * (level / body);
  return <group>
    <mesh position={[0, body / 2, 0]}><cylinderGeometry args={[0.05, 0.17, body, 36, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, 0.008, 0]}><cylinderGeometry args={[0.17, 0.17, 0.016, 36]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
    <mesh position={[0, body + 0.05, 0]}><cylinderGeometry args={[0.045, 0.05, 0.1, 24, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, body + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.045, 0.006, 8, 24]} /><meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.85} /></mesh>
    {level > 0.002 && <mesh position={[0, 0.016 + level / 2, 0]}><cylinderGeometry args={[topRadius * 0.92, 0.155, level, 32]} /><meshStandardMaterial color={look.color} transparent opacity={look.opacity} roughness={0.25} depthWrite={false} /></mesh>}
    {level > 0.002 && <mesh position={[0, 0.016 + level, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[topRadius * 0.9, 32]} /><meshBasicMaterial color={look.surface} transparent opacity={0.6} depthWrite={false} /></mesh>}
    <Precipitate visual={visual} radius={0.15} floorY={0.016} />
    <Solids visual={visual} floorY={0.016} spread={0.05} />
    {flashAt && <Bubbles intensity={visual.gasBubbles.intensity} at={flashAt} radius={0.1} height={Math.max(level, 0.05)} bottom={0.02} />}
    {visual.stoppered && <mesh position={[0, body + 0.11, 0]}><cylinderGeometry args={[0.056, 0.042, 0.06, 20]} /><meshStandardMaterial color="#6b3d2a" roughness={0.8} /></mesh>}
    <Collider size={[0.34, 0.42, 0.34]} y={0.21} />
  </group>;
}

/** Semi-transparent glass bottle with the coloured liquid visible inside and a category-coloured label. */
export function ReagentBottle3D({ look, solid, category }: { look: Look; solid: boolean; category: BottleCategory }) {
  const band = CATEGORY_COLOR[category];
  return <group>
    <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.085, 0.085, 0.24, 28]} /><meshPhysicalMaterial {...GLASS} opacity={0.45} /></mesh>
    {!solid && <>
      <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.078, 0.078, 0.14, 24]} /><meshStandardMaterial color={look.color} transparent opacity={Math.max(look.opacity, 0.7)} roughness={0.3} depthWrite={false} /></mesh>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.076, 24]} /><meshBasicMaterial color={look.surface} transparent opacity={0.7} depthWrite={false} /></mesh>
    </>}
    {solid && <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.076, 0.076, 0.09, 24]} /><meshStandardMaterial color="#d6d3d1" roughness={1} /></mesh>}
    <mesh position={[0, 0.255, 0]}><cylinderGeometry args={[0.036, 0.062, 0.034, 24]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
    <mesh position={[0, 0.282, 0]} castShadow><cylinderGeometry args={[0.043, 0.043, 0.022, 24]} /><meshStandardMaterial color="#334155" roughness={0.6} /></mesh>
    <mesh position={[0, 0.301, 0]} castShadow><cylinderGeometry args={[0.04, 0.043, 0.016, 24]} /><meshStandardMaterial color="#1e293b" roughness={0.5} /></mesh>
    {/* Label wraps the front of the body (curved, not a flat card); the category band sits inside it. */}
    <mesh position={[0, 0.115, 0]}><cylinderGeometry args={[0.0865, 0.0865, 0.1, 28, 1, true, -LABEL_ARC / 2, LABEL_ARC]} /><meshStandardMaterial color="#f8fafc" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.148, 0]}><cylinderGeometry args={[0.0872, 0.0872, 0.03, 28, 1, true, -LABEL_ARC / 2 + 0.05, LABEL_ARC - 0.1]} /><meshStandardMaterial color={band} roughness={0.7} side={THREE.DoubleSide} /></mesh>
    <Collider size={[0.18, 0.34, 0.18]} y={0.17} />
  </group>;
}

export function Rack3D() {
  const width = 0.24 * 6;
  return <group>
    {[0.04, 0.22].map((y) => <mesh key={y} position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[width, 0.018, 0.16]} /><meshStandardMaterial color="#b4874f" roughness={0.7} /></mesh>)}
    {[-1, 1].map((side) => <mesh key={side} position={[side * width / 2, 0.12, 0]} castShadow><boxGeometry args={[0.02, 0.24, 0.16]} /><meshStandardMaterial color="#9a7040" /></mesh>)}
  </group>;
}

/** Dropper lying on the bench. */
export function Dropper3D() {
  return <group>
    <group rotation={[0, 0, Math.PI / 2.4]} position={[0, 0.03, 0]}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.007, 0.0035, 0.14, 12]} /><meshPhysicalMaterial {...GLASS} opacity={0.55} /></mesh>
      <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.022, 16, 12]} /><meshStandardMaterial color="#dc2626" roughness={0.5} /></mesh>
    </group>
    <Collider size={[0.2, 0.1, 0.1]} y={0.04} x={-0.03} />
  </group>;
}

/** Dropper held upright, tip at the origin. `liquid` fills the glass tube and shows what was drawn up. */
export function DropperUpright({ liquid, squeezeAt, fill = 1 }: { liquid: Look | null; squeezeAt: number | null; fill?: number }) {
  const bulb = useRef<Mesh>(null);
  useFrame(() => {
    if (!bulb.current) return;
    const t = squeezeAt ? (Date.now() - squeezeAt) / 1000 : 9;
    const s = t < 0.35 ? 1 - 0.28 * Math.sin((Math.PI * t) / 0.35) : 1;
    bulb.current.scale.set(1 + (1 - s) * 0.4, s, 1 + (1 - s) * 0.4);
  });
  return <group>
    <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.01, 0.0035, 0.14, 14]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
    {liquid && fill > 0.01 && <mesh position={[0, 0.005 + 0.04 * fill, 0]} scale={[1, fill, 1]}><cylinderGeometry args={[0.0085, 0.003, 0.08, 12]} /><meshStandardMaterial color={liquid.color} transparent opacity={0.95} roughness={0.3} /></mesh>}
    <mesh position={[0, 0.145, 0]}><cylinderGeometry args={[0.013, 0.013, 0.014, 14]} /><meshStandardMaterial color="#1f2937" roughness={0.6} /></mesh>
    <mesh ref={bulb} position={[0, 0.19, 0]}><sphereGeometry args={[0.024, 18, 14]} /><meshStandardMaterial color="#dc2626" roughness={0.45} /></mesh>
  </group>;
}

/** Falling drop from the dropper tip to the liquid surface. */
export function Droplet({ at, color, fromY, toY }: { at: number; color: string; fromY: number; toY: number }) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    if (!mesh.current) return;
    const t = (Date.now() - at) / 1000;
    const duration = 0.42;
    mesh.current.visible = t >= 0 && t < duration + 0.05;
    const k = Math.min(1, Math.max(0, t / duration));
    mesh.current.position.y = fromY + (toY - fromY) * k * k;
    mesh.current.scale.setScalar(k >= 1 ? 0.01 : 1);
  });
  return <mesh ref={mesh} visible={false} position={[0, fromY, 0]} scale={[0.9, 1.25, 0.9]}>
    <sphereGeometry args={[0.011, 12, 10]} />
    <meshStandardMaterial color={color} transparent opacity={0.95} roughness={0.2} />
  </mesh>;
}

/** Litmus box with strips sticking out. */
export function LitmusBox3D() {
  return <group>
    <mesh position={[0, 0.035, 0]} castShadow><boxGeometry args={[0.16, 0.07, 0.1]} /><meshStandardMaterial color="#f5f0df" /></mesh>
    {[-0.04, 0, 0.04].map((x) => <mesh key={x} position={[x, 0.1, 0]}><boxGeometry args={[0.014, 0.08, 0.002]} /><meshStandardMaterial color={LITMUS_HEX.purple} /></mesh>)}
    <Collider size={[0.16, 0.15, 0.1]} y={0.07} />
  </group>;
}

/** Strip held in the hand, tip at the origin; the lower half eases to the colour it turned. */
export function LitmusStrip3D({ colour }: { colour: keyof typeof LITMUS_HEX | null }) {
  const lower = useRef<Mesh>(null);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    const material = lower.current?.material as THREE.MeshStandardMaterial | undefined;
    if (!material) return;
    target.set(colour ? LITMUS_HEX[colour] : LITMUS_HEX.purple);
    material.color.lerp(target, Math.min(1, delta * 6));
  });
  return <group>
    <mesh position={[0, 0.085, 0]}><boxGeometry args={[0.016, 0.1, 0.003]} /><meshStandardMaterial color={LITMUS_HEX.purple} roughness={0.8} /></mesh>
    <mesh ref={lower} position={[0, 0.02, 0]}><boxGeometry args={[0.016, 0.03, 0.003]} /><meshStandardMaterial color={LITMUS_HEX.purple} roughness={0.8} /></mesh>
  </group>;
}

/** pH pen. `inserted` stands it upright (tip near y = 0); otherwise it lies on the bench. */
export function PhMeter3D({ inserted }: { inserted: boolean }) {
  return <group rotation={inserted ? [0, 0, 0] : [0, 0, Math.PI / 2.1]} position={inserted ? [0, 0, 0] : [0, 0.03, 0]}>
    <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.022, 0.018, 0.22, 16]} /><meshStandardMaterial color="#0ea5e9" roughness={0.45} /></mesh>
    <mesh position={[0, 0.2, 0.0205]}><planeGeometry args={[0.03, 0.05]} /><meshStandardMaterial color="#d9f99d" emissive="#4d7c0f" emissiveIntensity={0.35} /></mesh>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.008, 0.008, 0.1, 10]} /><meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.35} /></mesh>
    <mesh position={[0, 0.275, 0]}><cylinderGeometry args={[0.014, 0.022, 0.03, 16]} /><meshStandardMaterial color="#0369a1" /></mesh>
    {!inserted && <Collider size={[0.1, 0.34, 0.08]} y={0.12} />}
  </group>;
}

export function RestPhMeter3D() {
  return <group>
    <PhMeter3D inserted={false} />
    <Collider size={[0.34, 0.1, 0.09]} y={0.05} x={-0.04} />
  </group>;
}

/** Tongs lying on the bench. */
export function Tongs3D() {
  return <group position={[0, 0.012, 0]} rotation={[0, 0.5, 0]}>
    {[-1, 1].map((side) => <mesh key={side} position={[0, 0, side * 0.012]} rotation={[0, side * 0.08, 0]} castShadow><boxGeometry args={[0.24, 0.008, 0.008]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></mesh>)}
    <Collider size={[0.26, 0.06, 0.1]} y={0.02} />
  </group>;
}

/** Tongs held with a solid piece at the tip (origin). `piece` is the solid colour, null when empty. */
export function TongsHolding({ piece, shape }: { piece: string | null; shape: string | null }) {
  return <group>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 0.006, 0.09, 0]} rotation={[0, 0, side * -0.06]} castShadow><boxGeometry args={[0.007, 0.18, 0.012]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></mesh>)}
    {piece && (shape === "nail"
      ? <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[0.006, 0.004, 0.14, 8]} /><meshStandardMaterial color={piece} metalness={0.6} roughness={0.45} /></mesh>
      : shape === "foil"
        ? <mesh position={[0, -0.01, 0]}><boxGeometry args={[0.03, 0.08, 0.003]} /><meshStandardMaterial color={piece} metalness={0.7} roughness={0.35} /></mesh>
        : <mesh position={[0, 0.005, 0]}><icosahedronGeometry args={[0.022, 0]} /><meshStandardMaterial color={piece} roughness={0.7} /></mesh>)}
  </group>;
}

export function Stopper3D() {
  return <group>
    <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.056, 0.042, 0.06, 20]} /><meshStandardMaterial color="#6b3d2a" roughness={0.8} /></mesh>
    <Collider size={[0.12, 0.08, 0.12]} y={0.03} />
  </group>;
}

export function Scale3D() {
  return <group>
    <mesh position={[0, 0.04, 0]} castShadow receiveShadow><boxGeometry args={[0.78, 0.08, 0.5]} /><meshStandardMaterial color="#e2e8f0" roughness={0.5} /></mesh>
    <mesh position={[0, 0.09, -0.04]}><boxGeometry args={[0.72, 0.012, 0.36]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, 0.05, 0.252]}><planeGeometry args={[0.3, 0.05]} /><meshStandardMaterial color="#bcd9a8" emissive="#5f8c4c" emissiveIntensity={0.3} /></mesh>
  </group>;
}

/** Flat ring under a target: valid (teal), snapped (green), held source (amber), out of scope (red). */
export function TargetRing({ radius, tone }: { radius: number; tone: "valid" | "active" | "held" | "warning" | "focus" }) {
  const color = { valid: "#0d9488", active: "#16a34a", held: "#d97706", warning: "#dc2626", focus: "#4f46e5" }[tone];
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
    <ringGeometry args={[radius, radius + (tone === "active" ? 0.03 : 0.018), 40]} />
    <meshBasicMaterial color={color} transparent opacity={tone === "valid" ? 0.7 : 0.95} depthWrite={false} />
  </mesh>;
}
