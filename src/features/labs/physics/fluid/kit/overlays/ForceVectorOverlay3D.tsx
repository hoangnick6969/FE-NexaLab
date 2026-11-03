import { useMemo } from "react";
import * as THREE from "three";

function ForceArrow({ direction, magnitudeN, color }: { direction: 1 | -1; magnitudeN: number; color: string }) {
  const length = THREE.MathUtils.clamp(Math.max(0, magnitudeN) * 32, 0, 145);
  const points = useMemo(() => {
    const start = new THREE.Vector3(0, 0, 0); const end = new THREE.Vector3(0, direction * Math.max(length - 11, 1), 0);
    return { start, end };
  }, [direction, length]);
  return <group visible={magnitudeN > 0.015}>
    <arrowHelper args={[new THREE.Vector3(0, direction, 0), points.start, Math.max(length, 1), color, 11, 7]} />
    <mesh position={[0, direction * (length + 14), 0]}>
      <sphereGeometry args={[3.2, 16, 12]} /><meshBasicMaterial color={color} />
    </mesh>
  </group>;
}

/** Visual vectors use caller-provided readings; this component never solves the force model. */
export function ForceVectorOverlay3D({ weightN, buoyantForceN, position = [0, 85, 90] }: { weightN: number; buoyantForceN: number; position?: [number, number, number] }) {
  return <group position={position}>
    <ForceArrow direction={-1} magnitudeN={weightN} color="#bd3f38" />
    <ForceArrow direction={1} magnitudeN={buoyantForceN} color="#287875" />
  </group>;
}
