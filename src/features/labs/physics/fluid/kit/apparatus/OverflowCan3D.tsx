import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GraduatedCatchBeaker } from "./GraduatedCatchBeaker";
import type { K3LiquidKind } from "./Beaker3D";
import { Html } from "@react-three/drei";

/** Eureka can starts filled to its spout. Collector volume approaches the displaced target; stream stops at equilibrium. */
export function OverflowCan3D({ collectedMl, liquidKind = "water", submergedMl = 0 }: { collectedMl: number; liquidKind?: K3LiquidKind; submergedMl?: number }) {
  const invalidate = useThree(s => s.invalidate);
  const actual = useRef(0); const flow = useRef(0); const ripple = useRef(0); const surface = useRef<THREE.Mesh>(null); const stream = useRef<THREE.Mesh>(null);
  const [displayMl, setDisplayMl] = useState(0);
  const [flowing, setFlowing] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const spout = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(39, 90, 0), new THREE.Vector3(52, 90, 0), new THREE.Vector3(64, 84, 0), new THREE.Vector3(70, 74, 0)]), 32, 2.5, 12, false), []);
  useEffect(() => () => spout.dispose(), [spout]);
  useEffect(() => { ripple.current = 1; invalidate(); }, [submergedMl, invalidate]);
  useEffect(() => { if (collectedMl < actual.current) { actual.current = collectedMl; setDisplayMl(collectedMl); } invalidate(); }, [collectedMl, invalidate]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, .1); const difference = Math.max(0, collectedMl - actual.current);
    flow.current += (Math.min(1, difference * 2) - flow.current) * (1 - Math.exp(-dt * 8));
    actual.current += Math.min(difference, Math.max(.05, difference * 1.8) * dt);
    if (difference < .015) actual.current = collectedMl;
    if (Math.abs(actual.current - displayMl) > .02 || difference < .015 && actual.current !== displayMl) setDisplayMl(actual.current);
    ripple.current *= Math.exp(-dt * 3.5);
    if (surface.current) surface.current.position.y = 90 + Math.sin(state.clock.elapsedTime * 12) * ripple.current * .7;
    if (ring.current) { ring.current.scale.setScalar(1 + (1 - ripple.current) * 3.5); (ring.current.material as THREE.MeshBasicMaterial).opacity = ripple.current * .55; }
    if (stream.current) { stream.current.visible = flow.current > .025; stream.current.scale.x = stream.current.scale.z = Math.max(.35, Math.sqrt(flow.current)); }
    if (flowing !== (flow.current > .025)) setFlowing(flow.current > .025);
    if (difference > .005 || flow.current > .01 || ripple.current > .01) state.invalidate();
  });
  return <group name="overflow-can">
    <mesh position={[0, 50, 0]} castShadow><cylinderGeometry args={[42, 42, 100, 64, 1, true]} /><meshPhysicalMaterial color="#e0f2fe" transmission={.92} roughness={.08} ior={1.47} thickness={1.2} transparent opacity={.65} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh name="eureka-water-volume" position={[0, 45, 0]}><cylinderGeometry args={[39, 39, 88, 64]} /><meshPhysicalMaterial color="#38bdf8" transmission={.9} opacity={.65} transparent thickness={78} attenuationColor="#0284c7" attenuationDistance={.18} ior={liquidKind === "brine" ? 1.37 : 1.333} roughness={.06} depthWrite={false} /></mesh>
    <mesh name="eureka-water-tint" position={[0, 45, 0]} renderOrder={2}><cylinderGeometry args={[38.8, 38.8, 88, 64, 1, true]} /><meshBasicMaterial color="#0284c7" transparent opacity={.24} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
    <mesh ref={surface} name="eureka-water-surface" position={[0, 90, 0]} rotation-x={-Math.PI / 2} renderOrder={3}><circleGeometry args={[39, 64]} /><meshBasicMaterial color="#38bdf8" transparent opacity={.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
    <mesh ref={ring} position={[0, 91, 0]} rotation-x={Math.PI / 2} renderOrder={4}><torusGeometry args={[8, .18, 6, 64]} /><meshBasicMaterial color="#b5f3ff" transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
    {[90, 100].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[y === 100 ? 42 : 39, y === 100 ? .9 : .35, 8, 64]} /><meshStandardMaterial color="#d7f5ff" metalness={.45} roughness={.12} transparent opacity={.85} /></mesh>)}
    <mesh geometry={spout}><meshStandardMaterial color="#b9d8e5" metalness={.7} roughness={.15} /></mesh>
    <mesh ref={stream} name="eureka-overflow-stream" position={[70, 51, 0]} renderOrder={4}><cylinderGeometry args={[2, 2.5, 46, 16]} /><meshBasicMaterial color="#38bdf8" transparent opacity={.88} depthWrite={false} toneMapped={false} /></mesh>
    {flowing && <Html position={[97, 65, 0]} center style={{ pointerEvents: "none" }}><span className="buoyancy-scene-badge is-buoyancy">Nước đang tràn</span></Html>}
    <GraduatedCatchBeaker position={[70, 0, 0]} volumeMl={displayMl} />
  </group>;
}
