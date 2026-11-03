import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { K3Instruments } from "../k3-config";
import { K3_MOTION, dampedSpringStep, usePrefersReducedMotion, type LiquidSample } from "../k3-motion";
import { displacedLevelRiseMm } from "../k3-geometry";

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
export type K3LiquidKind = "water" | "brine";
const LIQUID_OPTICS: Record<K3LiquidKind, { ior: number; color: string }> = { water: { ior: 1.333, color: "#b9e7f6" }, brine: { ior: 1.37, color: "#d9f0f7" } };

export function Beaker3D({ beaker, waterMl, liquid, liquidKind = "water", submergedVolumeMl = 0, children }: { beaker: Beaker; waterMl: number; liquid?: MutableRefObject<LiquidSample>; liquidKind?: K3LiquidKind; submergedVolumeMl?: number; children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const radius = beaker.innerDiameterMm / 2;
  const glass = useMemo(() => new THREE.LatheGeometry(beakerProfile(beaker), 64), [beaker]);
  useEffect(() => () => glass.dispose(), [glass]);
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
      column.current.position.y = 1.5 + level.current / 2;
    }
    const impactTarget = liquid ? liquid.current.ripple : Math.min(0.55, Math.abs(targetMm - baseVolumeMl * 1000 / (Math.PI * radius * radius)) / 12);
    if (reduced) rippleAmplitude.current = 0;
    else { const rippleState = dampedSpringStep(rippleAmplitude.current, rippleVelocity.current, impactTarget, step, K3_MOTION.surfaceSpring); rippleAmplitude.current = Math.max(0, Math.min(1, rippleState.position)); rippleVelocity.current = rippleState.velocity; }
    const strength = rippleAmplitude.current;
    if (cap.current) {
      cap.current.visible = level.current > 0.01;
      cap.current.position.y = 1.5 + level.current;
      cap.current.rotation.x = -Math.PI / 2 + Math.sin(state.clock.elapsedTime * 16) * 0.018 * strength;
    }
    if (ripple.current) {
      ripple.current.visible = strength > 0.005 && level.current > 0.01;
      ripple.current.position.y = 1.5 + level.current + 0.3;
      const wave = (state.clock.elapsedTime * 1.7) % 1;
      ripple.current.scale.setScalar(0.2 + wave * 0.75);
      (ripple.current.material as THREE.MeshBasicMaterial).opacity = strength * (1 - wave) * 0.55;
    }
    ringing.current *= Math.exp(-step * 4);
    if (Math.abs(level.current - targetMm) > 0.005 || Math.abs(levelVelocity.current) > 0.02 || ringing.current > 0.005 || Math.abs(rippleAmplitude.current - impactTarget) > 0.005 || Math.abs(rippleVelocity.current) > 0.02) state.invalidate();
  });

  return <group>
    <mesh geometry={glass} castShadow>
      <meshPhysicalMaterial color="#ffffff" transparent transmission={0.92} thickness={0.12} ior={1.47} roughness={0.08} opacity={0.28} specularIntensity={1} envMapIntensity={1.2} depthWrite={true} />
    </mesh>
    <mesh name="beaker-water-column" ref={column} renderOrder={1}>
      <cylinderGeometry args={[radius - 0.2, radius - 0.2, 1, 48, 1, true]} />
      <meshPhysicalMaterial color={LIQUID_OPTICS[liquidKind].color} transparent opacity={0.72} roughness={0.035} transmission={0.82} thickness={0.08} ior={LIQUID_OPTICS[liquidKind].ior} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="beaker-water-surface" ref={cap} position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <circleGeometry args={[radius - 0.2, 48]} />
      <meshPhysicalMaterial color={LIQUID_OPTICS[liquidKind].color} transparent opacity={0.76} roughness={0.035} clearcoat={1} ior={LIQUID_OPTICS[liquidKind].ior} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <ringGeometry args={[radius * 0.15, radius * 0.21, 48]} />
      <meshBasicMaterial color="#e5faff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {children}
  </group>;
}
