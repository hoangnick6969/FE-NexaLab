import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";
import { K7_MOTION } from "../k7-motion";

const STEP = 0.1;

/**
 * A scalar that eases towards `target` inside the frame loop (no React state
 * per frame). Requests frames until settled; reduced motion snaps.
 */
export function useDamped(target: number, lambda: number = K7_MOTION.followLambda) {
  const value = useRef(target);
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [target, invalidate]);
  useFrame((state, delta) => {
    if (value.current === target) return;
    value.current = reduced ? target : THREE.MathUtils.damp(value.current, target, lambda, Math.min(delta, STEP));
    if (Math.abs(value.current - target) < 1e-3) value.current = target;
    state.invalidate();
  });
  return value;
}

type Vec3 = readonly [number, number, number];

/** Group that glides to `position` (and optional `rotation`) on a damped path, starting at `from` when given. */
export function Follow({ position, from, rotation, scale = 1, lambda = K7_MOTION.followLambda, children }: {
  position: Vec3;
  from?: Vec3;
  rotation?: Vec3;
  scale?: number;
  lambda?: number;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const goal = useRef(new THREE.Vector3(...position));
  const goalQuaternion = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler());
  goal.current.set(...position);
  goalQuaternion.current.setFromEuler(euler.current.set(...(rotation ?? [0, 0, 0])));
  useEffect(() => { invalidate(); }, [position[0], position[1], position[2], rotation?.[0], rotation?.[1], rotation?.[2], scale, invalidate]);
  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    if (reduced) {
      node.position.copy(goal.current);
      node.quaternion.copy(goalQuaternion.current);
      node.scale.setScalar(scale);
      return;
    }
    const alpha = 1 - Math.exp(-lambda * Math.min(delta, STEP));
    node.position.lerp(goal.current, alpha);
    node.quaternion.slerp(goalQuaternion.current, alpha);
    node.scale.setScalar(THREE.MathUtils.lerp(node.scale.x, scale, alpha));
    const settled = node.position.distanceToSquared(goal.current) < 1e-6 && node.quaternion.angleTo(goalQuaternion.current) < 1e-3 && Math.abs(node.scale.x - scale) < 1e-3;
    if (settled) { node.position.copy(goal.current); node.quaternion.copy(goalQuaternion.current); node.scale.setScalar(scale); }
    else state.invalidate();
  });
  // Initial transform only; afterwards the frame loop owns it.
  const initial = useRef({ position: [...(from ?? position)] as [number, number, number], rotation: rotation ? [...rotation] as [number, number, number] : undefined, scale });
  return <group ref={group} position={initial.current.position} rotation={initial.current.rotation} scale={initial.current.scale}>{children}</group>;
}
