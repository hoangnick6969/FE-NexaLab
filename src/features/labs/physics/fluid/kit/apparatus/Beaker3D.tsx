import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { K3Instruments } from "../k3-config";
import { K3_MOTION, usePrefersReducedMotion } from "../k3-motion";

type Beaker = K3Instruments["beaker"];
const WALL_MM = 1.5;

/** Open glass beaker with a lip: thick base, straight wall with real thickness (mm units). */
function beakerProfile(beaker: Beaker) {
  const inner = beaker.innerDiameterMm / 2;
  const outer = inner + WALL_MM;
  const floor = WALL_MM;
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(outer, 0),
    new THREE.Vector2(outer, beaker.heightMm - 1),
    new THREE.Vector2(outer + 0.6, beaker.heightMm),
    new THREE.Vector2(inner, beaker.heightMm),
    new THREE.Vector2(inner, floor),
    new THREE.Vector2(0.001, floor),
  ];
}

/**
 * Glass beaker with a water column that eases to `waterMl` (mm units). The
 * column uses the same mL-to-height mapping as the graduated cylinder: height
 * is volume over the bore's cross-section.
 */
export function Beaker3D({ beaker, waterMl, children }: { beaker: Beaker; waterMl: number; children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const radius = beaker.innerDiameterMm / 2;
  const glass = useMemo(() => new THREE.LatheGeometry(beakerProfile(beaker), 64), [beaker]);
  useEffect(() => () => glass.dispose(), [glass]);
  const column = useRef<THREE.Mesh>(null);
  const target = (Math.max(0, waterMl) * 1000) / (Math.PI * radius * radius);
  const level = useRef(target);

  useEffect(() => invalidate(), [target, invalidate]);
  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30);
    level.current = reduced ? target : THREE.MathUtils.damp(level.current, target, K3_MOTION.liquidLevelLambda, step);
    if (Math.abs(level.current - target) < 0.005) level.current = target;
    if (column.current) {
      column.current.visible = level.current > 0.01;
      column.current.scale.y = Math.max(level.current, 0.001);
      column.current.position.y = level.current / 2;
    }
    if (level.current !== target) state.invalidate();
  });

  return <group>
    <mesh geometry={glass} castShadow>
      <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.02} ior={1.52} roughness={0.04} specularIntensity={1} envMapIntensity={1.2} depthWrite={false} />
    </mesh>
    <mesh ref={column} renderOrder={1}>
      <cylinderGeometry args={[radius - 0.2, radius - 0.2, 1, 48, 1, true]} />
      <meshPhysicalMaterial color="#8fcbe8" transparent opacity={0.62} roughness={0.05} ior={1.333} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {children}
  </group>;
}
