import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { K3Instruments } from "../k3-config";
import { K3_MOTION, dampedSpringStep, usePrefersReducedMotion, type LiquidSample } from "../k3-motion";
import { displacedLevelRiseMm } from "../k3-geometry";
import { BEAKER_DEFAULT_SIZE, Beaker3D as SharedBeaker3D, beakerAnchors } from "../../../../shared/items/beaker";

type Beaker = K3Instruments["beaker"];
const WALL_MM = 1.5;

/**
 * FL-03 beaker (D1-2.1): the glass is the shared beaker of `shared/items/` (scaled from its own units to this
 * bench's mm); the water column, its motion, pours and displacement stay with the fluid bench. The column keeps the
 * name `beaker-water-column` and its mm scale, which the pour-conservation test reads.
 *
 * Glass beaker with a water column that eases to `waterMl` (mm units). The
 * column uses the same mL-to-height mapping as the graduated cylinder: height
 * is volume over the bore's cross-section.
 */
export type K3LiquidKind = "water" | "brine";
/** Plain (non-transmission) water like the shared LiquidColumn: transmission sampled the brown bench and tinted the water orange. */
const LIQUID_LOOK: Record<K3LiquidKind, { color: string; surface: string }> = { water: { color: "#7cc8e8", surface: "#d6f1fb" }, brine: { color: "#a9d8ea", surface: "#e6f6fb" } };

export function Beaker3D({ beaker, waterMl, liquid, liquidKind = "water", submergedVolumeMl = 0, children }: { beaker: Beaker; waterMl: number; liquid?: MutableRefObject<LiquidSample>; liquidKind?: K3LiquidKind; submergedVolumeMl?: number; children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const radius = beaker.innerDiameterMm / 2;
  // Shared beaker drawn at its default size, stretched to this beaker's outer radius and height (mm).
  const shell = useMemo(() => { const outer = radius + WALL_MM; const sx = outer / BEAKER_DEFAULT_SIZE.radius; const sy = beaker.heightMm / BEAKER_DEFAULT_SIZE.height; return { scale: [sx, sy, sx] as [number, number, number], floorMm: beakerAnchors().inside[1] * sy, waterRadius: Math.min(radius - 0.2, outer * 0.94 - 1) }; }, [radius, beaker.heightMm]);
  const floor = shell.floorMm;
  const column = useRef<THREE.Mesh>(null);
  const cap = useRef<THREE.Mesh>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const ringing = useRef(0);
  const rippleAmplitude = useRef(0);
  const rippleVelocity = useRef(0);
  const baseVolumeMl = Math.max(0, waterMl);
  const target = (baseVolumeMl * 1000) / (Math.PI * radius * radius) + displacedLevelRiseMm(submergedVolumeMl, beaker.innerDiameterMm);
  const level = useRef(target);
  const levelVelocity = useRef(0);

  useEffect(() => { ringing.current = reduced ? 0 : 1; invalidate(); }, [target, reduced, invalidate]);
  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30);
    const frameTarget = liquid ? Math.max(0, liquid.current.volumeMl) * 1000 / (Math.PI * radius * radius) : target;
    const targetMm = liquid ? frameTarget : target;
    // Coordinated pours already provide animated, conserved volumes. A second
    // spring here would make the rendered receiving volume lag behind the source.
    if (liquid || reduced) { level.current = targetMm; levelVelocity.current = 0; }
    else {
      const next = dampedSpringStep(level.current, levelVelocity.current, targetMm, step, K3_MOTION.surfaceSpring);
      level.current = next.position; levelVelocity.current = next.velocity;
    }
    if (Math.abs(level.current - targetMm) < 0.005 && Math.abs(levelVelocity.current) < 0.02) { level.current = targetMm; levelVelocity.current = 0; }
    if (column.current) {
      column.current.visible = level.current > 0.01;
      column.current.scale.y = Math.max(level.current, 0.001);
      column.current.position.y = floor + level.current / 2;
    }
    const impactTarget = liquid ? liquid.current.ripple : Math.min(0.55, Math.abs(targetMm - baseVolumeMl * 1000 / (Math.PI * radius * radius)) / 12);
    if (reduced) rippleAmplitude.current = 0;
    else { const rippleState = dampedSpringStep(rippleAmplitude.current, rippleVelocity.current, impactTarget, step, K3_MOTION.surfaceSpring); rippleAmplitude.current = Math.max(0, Math.min(1, rippleState.position)); rippleVelocity.current = rippleState.velocity; }
    const strength = rippleAmplitude.current;
    if (cap.current) {
      cap.current.visible = level.current > 0.01;
      cap.current.position.y = floor + level.current;
      cap.current.rotation.x = -Math.PI / 2 + Math.sin(state.clock.elapsedTime * 16) * 0.018 * strength;
    }
    if (ripple.current) {
      ripple.current.visible = strength > 0.005 && level.current > 0.01;
      ripple.current.position.y = floor + level.current + 0.3;
      const wave = (state.clock.elapsedTime * 1.7) % 1;
      ripple.current.scale.setScalar(0.2 + wave * 0.75);
      (ripple.current.material as THREE.MeshBasicMaterial).opacity = strength * (1 - wave) * 0.55;
    }
    ringing.current *= Math.exp(-step * 4);
    if (Math.abs(level.current - targetMm) > 0.005 || Math.abs(levelVelocity.current) > 0.02 || ringing.current > 0.005 || Math.abs(rippleAmplitude.current - impactTarget) > 0.005 || Math.abs(rippleVelocity.current) > 0.02) state.invalidate();
  });

  return <group>
    <group scale={shell.scale}><SharedBeaker3D fill={0} liquid={{ color: LIQUID_LOOK[liquidKind].color, opacity: 0, surface: LIQUID_LOOK[liquidKind].surface }} /></group>
    <mesh name="beaker-water-column" ref={column} renderOrder={1}>
      <cylinderGeometry args={[shell.waterRadius, shell.waterRadius, 1, 48, 1, true]} />
      <meshStandardMaterial color={LIQUID_LOOK[liquidKind].color} transparent opacity={0.55} roughness={0.2} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="beaker-water-surface" ref={cap} position={[0, floor, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <circleGeometry args={[shell.waterRadius, 48]} />
      <meshBasicMaterial color={LIQUID_LOOK[liquidKind].surface} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <ringGeometry args={[shell.waterRadius * 0.15, shell.waterRadius * 0.21, 48]} />
      <meshBasicMaterial color="#e5faff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {children}
  </group>;
}
