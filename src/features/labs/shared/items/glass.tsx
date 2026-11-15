/** Glass and liquid parts reused by shared items and by bench-owned glassware. Presentation only. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import * as THREE from "three";

export const GLASS = { color: "#e0f2fe", transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0.02, depthWrite: false, side: THREE.DoubleSide } as const;

/** How a bench wants a liquid drawn. The bench decides the colour from its own model. */
export type LiquidLook = { color: string; opacity: number; surface: string };

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Liquid column with a visible surface. `fill` (0–1 of `fullHeight`) comes from the bench;
 * the column only eases towards it.
 */
export function LiquidColumn({ fullHeight, rBottom, rTop, y0, fill, look }: { fullHeight: number; rBottom: number; rTop: number; y0: number; fill: number; look: LiquidLook }) {
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
