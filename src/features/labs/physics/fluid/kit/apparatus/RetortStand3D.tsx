import { useMemo } from "react";
import * as THREE from "three";

export function RigRod({ from, to, radius = 2 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const { midpoint, quaternion, length } = useMemo(() => { const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to); return { midpoint: start.clone().add(end).multiplyScalar(.5), length: start.distanceTo(end), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()) }; }, [from.join(), to.join()]);
  return <mesh position={midpoint} quaternion={quaternion} castShadow><cylinderGeometry args={[radius, radius, length, 24]} /><meshStandardMaterial color="#bacbd5" metalness={.9} roughness={.2} /></mesh>;
}
export function RetortStand3D({ clampY }: { clampY: number }) {
  return <group name="retort-stand">
    <mesh position={[-95, 6, -25]} castShadow receiveShadow><boxGeometry args={[110, 12, 95]} /><meshStandardMaterial color="#303c43" metalness={.72} roughness={.55} /></mesh>
    {[-130, -60].map(x => [-55, 10].map(z => <mesh key={`${x}-${z}`} position={[x, 2, z]}><cylinderGeometry args={[6, 6, 4, 16]} /><meshStandardMaterial color="#17232b" roughness={.8} /></mesh>))}
    <RigRod from={[-95, 12, -25]} to={[-95, 450, -25]} radius={3.4} />
    <mesh position={[-95, clampY, -25]} castShadow><boxGeometry args={[19, 22, 19]} /><meshStandardMaterial color="#515e65" metalness={.8} roughness={.3} /></mesh>
    <RigRod from={[-95, clampY, -25]} to={[0, clampY, 0]} radius={2.6} />
    <mesh position={[-95, clampY, -9]}><sphereGeometry args={[8, 20, 16]} /><meshStandardMaterial color="#147d9b" metalness={.45} roughness={.3} /></mesh>
    <mesh position={[0, clampY - 6, 0]}><torusGeometry args={[5, 1.5, 12, 24]} /><meshStandardMaterial color="#c5d5df" metalness={.9} roughness={.2} /></mesh>
  </group>;
}
