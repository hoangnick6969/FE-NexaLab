import { Html } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";

export function GraduatedCatchBeaker({ volumeMl, position = [0, 0, 0] }: { volumeMl: number; position?: [number, number, number] }) {
  const scale = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#123852"; ctx.font = "bold 28px system-ui";
    for (let ml = 0; ml <= 70; ml += 5) { const y = 512 - (1 + ml * 1000 / (Math.PI * 22 ** 2)) / 56 * 512; ctx.fillRect(18, y, ml % 10 === 0 ? 80 : 50, 3); if (ml % 10 === 0 && ml > 0) ctx.fillText(String(ml), 108, y + 8); }
    ctx.fillText("mL", 90, 50); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, []);
  useEffect(() => () => scale.dispose(), [scale]);
  const waterHeight = Math.max(.05, volumeMl * 1000 / (Math.PI * 22 ** 2));
  return <group position={position} name="collector">
    <mesh position={[0, 28, 0]}><cylinderGeometry args={[25, 23, 56, 64, 1, true]} /><meshPhysicalMaterial color="#e0f2fe" transmission={.92} roughness={.08} ior={1.47} thickness={1.4} transparent opacity={.65} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh name="catch-water-volume" position={[0, 1 + waterHeight / 2, 0]}><cylinderGeometry args={[22, 22, waterHeight, 48]} /><meshPhysicalMaterial color="#38bdf8" transmission={.9} thickness={30} attenuationColor="#0284c7" attenuationDistance={.15} ior={1.333} transparent opacity={.65} roughness={.06} depthWrite={false} /></mesh>
    <mesh name="catch-water-tint" position={[0, 1 + waterHeight / 2, 0]} renderOrder={2}><cylinderGeometry args={[21.8, 21.8, waterHeight, 48]} /><meshBasicMaterial color="#0ea5e9" transparent opacity={.52} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[0, 56, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[25, .7, 8, 64]} /><meshStandardMaterial color="#e0f7ff" metalness={.5} roughness={.12} /></mesh>
    <mesh position={[0, 28, 25.1]}><planeGeometry args={[24, 56]} /><meshBasicMaterial map={scale} transparent depthWrite={false} /></mesh>
    <Html position={[45, 30, 0]} center style={{ pointerEvents: "none" }}><span className="buoyancy-scene-badge">V tràn = {volumeMl.toFixed(1)} mL</span></Html>
  </group>;
}
