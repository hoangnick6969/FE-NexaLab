import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { dampedSpringStep } from "../k3-motion";

/** Local origin is the lower end of the cylindrical housing; top suspension eye is y=160 mm. */
export function SpringDynamometer3D({ forceN, onSettled, massKg = .035 }: { forceN: number; onSettled?: (valueN: number) => void; massKg?: number }) {
  const invalidate = useThree(s => s.invalidate); const coil = useRef<THREE.Mesh>(null); const pointer = useRef<THREE.Mesh>(null); const hook = useRef<THREE.Group>(null);
  const extension = useRef(0); const velocity = useRef(0);
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 241 }, (_, i) => { const t = i / 240; return new THREE.Vector3(Math.cos(t * 24 * Math.PI) * 6, -t * 68, Math.sin(t * 24 * Math.PI) * 6); })), 240, .65, 8, false), []);
  const texture = useMemo(() => { const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 1024; const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#183b52"; ctx.font = "bold 48px system-ui"; for (let n = 0; n <= 50; n++) { const y = 90 + n * 16.8; ctx.fillRect(0, y, n % 10 === 0 ? 95 : 50, 4); if (n % 10 === 0) ctx.fillText(String(n / 10), 115, y + 15); } ctx.fillText("N", 112, 55); const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  useEffect(() => () => { geometry.dispose(); texture.dispose(); }, [geometry, texture]);
  useEffect(() => invalidate(), [forceN, invalidate]);
  useFrame((state, delta) => {
    const target = THREE.MathUtils.clamp(forceN, 0, 5) * 10.4;
    const next = dampedSpringStep(extension.current, velocity.current, target, Math.min(delta, .1), { stiffness: 100, damping: 12, massKg: .3 + massKg });
    extension.current = next.position; velocity.current = next.velocity;
    if (coil.current) coil.current.scale.y = 1 + next.position / 68;
    if (pointer.current) pointer.current.position.y = 125 - next.position * 1.9;
    if (hook.current) hook.current.position.y = -next.position;
    if (Math.abs(target - next.position) > .01 || Math.abs(next.velocity) > .02) state.invalidate(); else onSettled?.(forceN);
  });
  return <group name="dynamometer">
    <mesh position={[0, 75, 0]}><cylinderGeometry args={[15, 15, 150, 48, 1, true]} /><meshPhysicalMaterial color="#e0f2fe" transmission={.92} ior={1.47} thickness={1} roughness={.08} transparent opacity={.55} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {[0, 150].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[16, 16, 4, 48]} /><meshStandardMaterial color="#bdced8" metalness={.85} roughness={.22} /></mesh>)}
    <mesh ref={coil} geometry={geometry} position={[-4, 135, 0]}><meshStandardMaterial color="#b8c7d0" metalness={.95} roughness={.2} /></mesh>
    <mesh position={[8, 75, 15.1]}><planeGeometry args={[18, 132]} /><meshBasicMaterial map={texture} transparent depthWrite={false} /></mesh>
    <mesh ref={pointer} position={[0, 125, 17]}><boxGeometry args={[25, 2, 1]} /><meshStandardMaterial color="#ef4444" roughness={.3} /></mesh>
    <mesh position={[0, 160, 0]}><torusGeometry args={[7, 1.6, 12, 32]} /><meshStandardMaterial color="#c5d4dc" metalness={.9} roughness={.15} /></mesh>
    <group ref={hook}><mesh position={[0, -7, 0]}><cylinderGeometry args={[.9, .9, 14, 12]} /><meshStandardMaterial color="#b5c7d0" metalness={.9} roughness={.2} /></mesh><mesh position={[0, -16, 0]}><torusGeometry args={[5, 1.2, 12, 28, Math.PI * 1.7]} /><meshStandardMaterial color="#cbd5e1" metalness={.9} roughness={.15} /></mesh></group>
  </group>;
}
