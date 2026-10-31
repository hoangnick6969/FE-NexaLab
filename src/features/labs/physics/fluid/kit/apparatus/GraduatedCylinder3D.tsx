import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { K3Instruments } from "../k3-config";
import { cylinderGraduations, cylinderHeightMm, cylinderLevelMm, MENISCUS_RISE_MM } from "../k3-geometry";
import { K3_MOTION, usePrefersReducedMotion, type LiquidSample } from "../k3-motion";

type Cylinder = K3Instruments["cylinder"];
const PX_PER_MM = 12;

/** Closed glass shell: thick base, straight wall with real thickness and a rolled lip. */
function glassProfile(cylinder: Cylinder) {
  const inner = cylinder.innerDiameterMm / 2;
  const outer = inner + cylinder.wallMm;
  const top = cylinderHeightMm(cylinder);
  const floor = cylinder.baseMm - 3;
  return [
    new THREE.Vector2(0, floor),
    new THREE.Vector2(outer, floor),
    new THREE.Vector2(outer, top - 1.5),
    new THREE.Vector2(outer + 1.2, top - 0.6),
    new THREE.Vector2(outer + 0.8, top),
    new THREE.Vector2(inner, top),
    new THREE.Vector2(inner, cylinder.baseMm),
    new THREE.Vector2(0.001, cylinder.baseMm),
  ];
}

/** Printed scale drawn once from the same geometry that places the liquid surface. */
function useScaleTexture(cylinder: Cylinder) {
  const texture = useMemo(() => {
    const top = cylinderHeightMm(cylinder);
    const spanMm = top - cylinder.baseMm;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = Math.ceil(spanMm * PX_PER_MM);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1c3e78";
    ctx.font = "700 64px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const lengths = { short: 70, medium: 110, long: 170 } as const;
    for (const mark of cylinderGraduations(cylinder)) {
      const y = canvas.height - (mark.yMm - cylinder.baseMm) * PX_PER_MM;
      const width = lengths[mark.length];
      ctx.fillRect(250 - width, y - 3, width, 6);
      if (mark.label) ctx.fillText(mark.label, 262, y);
    }
    ctx.fillText("mL", 262, canvas.height - (cylinderLevelMm(cylinder, cylinder.capacityMl) + 14) * PX_PER_MM);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }, [cylinder]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Concave water surface: centre at 0, rising by the meniscus height at the wall. */
function meniscusGeometry(radius: number) {
  const points = Array.from({ length: 13 }, (_, i) => {
    const r = (radius * i) / 12;
    return new THREE.Vector2(Math.max(r, 0.001), MENISCUS_RISE_MM * Math.pow(r / radius, 6));
  });
  return new THREE.LatheGeometry(points, 64);
}

/**
 * 100 mL-class graduated cylinder (mm units). `volumeMl` is the model's liquid
 * volume; the surface eases to its level and the scale is read at the bottom
 * of the meniscus.
 */
export function GraduatedCylinder3D({ cylinder, volumeMl, liquid, children }: { cylinder: Cylinder; volumeMl: number; liquid?: MutableRefObject<LiquidSample>; children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const scale = useScaleTexture(cylinder);
  const inner = cylinder.innerDiameterMm / 2;
  const outer = inner + cylinder.wallMm;
  const top = cylinderHeightMm(cylinder);
  const glass = useMemo(() => new THREE.LatheGeometry(glassProfile(cylinder), 72), [cylinder]);
  const surface = useMemo(() => meniscusGeometry(inner - 0.15), [inner]);
  useEffect(() => () => { glass.dispose(); surface.dispose(); }, [glass, surface]);
  const column = useRef<THREE.Mesh>(null);
  const cap = useRef<THREE.Mesh>(null);
  const level = useRef(cylinderLevelMm(cylinder, volumeMl));
  const target = cylinderLevelMm(cylinder, volumeMl);

  // Ringing after each change: the surface tilts a little and settles within ~1 s.
  // Reduced motion never starts it, so the surface simply stops at its level.
  const ringing = useRef(0);
  useEffect(() => { ringing.current = reduced ? 0 : 1; invalidate(); }, [target, reduced, invalidate]);
  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30);
    const frameTarget = liquid ? cylinderLevelMm(cylinder, liquid.current.volumeMl) : target;
    level.current = liquid ? frameTarget : reduced ? target : THREE.MathUtils.damp(level.current, target, K3_MOTION.liquidLevelLambda, step);
    if (Math.abs(level.current - target) < 0.005) level.current = target;
    const height = Math.max(level.current, 0.001);
    if (column.current) {
      column.current.scale.y = height;
      column.current.position.y = cylinder.baseMm + height / 2;
      column.current.visible = level.current > 0.01;
    }
    if (cap.current) {
      cap.current.position.y = cylinder.baseMm + level.current;
      cap.current.visible = level.current > 0.01;
      if (liquid) ringing.current = liquid.current.ripple;
      cap.current.rotation.z = ringing.current > 0.002 ? Math.sin(state.clock.elapsedTime * 16) * 0.035 * ringing.current : 0;
    }
    if (ringing.current > 0.002) {
      ringing.current *= Math.exp(-step * 3.5);
      state.invalidate();
    }
    if (!liquid && level.current !== target) state.invalidate();
  });

  return <group>
    {/* Hexagonal polypropylene foot. */}
    <mesh position={[0, (cylinder.baseMm - 3) / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[outer + 16, outer + 18, cylinder.baseMm - 3, 6]} />
      <meshStandardMaterial color="#2f6fb0" roughness={0.45} />
    </mesh>
    <mesh geometry={glass} castShadow>
      <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.02} ior={1.47} roughness={0.04} specularIntensity={1} envMapIntensity={1.2} depthWrite={false} />
    </mesh>
    <mesh position={[0, (cylinder.baseMm + top) / 2, 0]} renderOrder={2}>
      <cylinderGeometry args={[outer + 0.08, outer + 0.08, top - cylinder.baseMm, 64, 1, true, -Math.PI / 4, Math.PI / 2]} />
      <meshStandardMaterial map={scale} transparent alphaTest={0.4} roughness={0.5} side={THREE.FrontSide} />
    </mesh>
    {/* Water draws in the transparent pass so it stays visible through the transmissive glass. */}
    <mesh name="cylinder-water-column" ref={column} renderOrder={1}>
      <cylinderGeometry args={[inner - 0.15, inner - 0.15, 1, 64, 1, true]} />
      <meshPhysicalMaterial color="#8fcbe8" transparent opacity={0.62} roughness={0.05} ior={1.333} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="cylinder-water-surface" ref={cap} geometry={surface} renderOrder={1}>
      <meshPhysicalMaterial color="#a8d8ef" transparent opacity={0.7} roughness={0.03} ior={1.333} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {children}
  </group>;
}
