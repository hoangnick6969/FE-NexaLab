import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/** Thermocycler display: temperature, cycle count and the denature–anneal–extend trace (numbers only). */
function screenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const c = canvas.getContext("2d")!;
  const sky = c.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, "#0d3b4f");
  sky.addColorStop(1, "#06202c");
  c.fillStyle = sky;
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = "#9ff0ff";
  c.font = "700 72px ui-monospace, Consolas, monospace";
  c.fillText("95.0°C", 28, 92);
  c.font = "600 34px ui-monospace, Consolas, monospace";
  c.fillStyle = "#7fd7c4";
  c.fillText("12/30", 360, 88);
  // One PCR cycle: 95 °C, 55 °C, 72 °C plateaus.
  c.strokeStyle = "#ffd36b";
  c.lineWidth = 6;
  c.beginPath();
  const points: [number, number][] = [[24, 270], [60, 150], [150, 150], [180, 250], [260, 250], [285, 205], [380, 205], [410, 150], [490, 150]];
  points.forEach(([x, y], index) => (index ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.strokeStyle = "rgba(159,240,255,0.25)";
  c.lineWidth = 2;
  for (const y of [150, 205, 250]) { c.beginPath(); c.moveTo(20, y); c.lineTo(500, y); c.stroke(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Benchtop PCR thermocycler (mm, origin on the bench): body with a domed
 * heated lid, a sloped control panel with a live-looking display and keypad,
 * and front vents. Context for replication (SGK mentions PCR); decorative.
 */
export function Thermocycler3D() {
  const screen = useMemo(screenTexture, []);
  useEffect(() => () => screen.dispose(), [screen]);
  const body = <meshPhysicalMaterial color="#eef1f3" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />;
  return <group>
    <RoundedBox args={[270, 120, 320]} radius={14} smoothness={4} position={[0, 60, 0]} castShadow receiveShadow>{body}</RoundedBox>
    {/* Heated lid with a darker seam */}
    <RoundedBox args={[262, 46, 230]} radius={18} smoothness={4} position={[0, 140, -40]} castShadow>{body}</RoundedBox>
    <mesh position={[0, 119, -40]}><boxGeometry args={[264, 4, 232]} /><meshStandardMaterial color="#9aa6ad" roughness={0.5} /></mesh>
    <mesh position={[0, 165, -40]}><boxGeometry args={[80, 4, 22]} /><meshStandardMaterial color="#c7d0d6" metalness={0.6} roughness={0.3} /></mesh>
    {/* Sloped control panel on the front of the top, in front of the lid */}
    <group position={[0, 126, 118]} rotation={[0.32, 0, 0]}>
      <RoundedBox args={[250, 10, 78]} radius={4} smoothness={3}><meshStandardMaterial color="#d9dfe3" roughness={0.5} /></RoundedBox>
      <mesh position={[-44, 5.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[112, 62]} />
        <meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const column = index % 4, row = Math.floor(index / 4);
        return <RoundedBox key={index} args={[16, 5, 14]} radius={2} smoothness={2} position={[40 + column * 21, 6.5, -20 + row * 20]}>
          <meshStandardMaterial color={index === 11 ? "#2fb36b" : "#2b73c8"} roughness={0.35} />
        </RoundedBox>;
      })}
    </group>
    {/* Front vents */}
    {Array.from({ length: 9 }, (_, index) => <mesh key={index} position={[-100 + index * 25, 26, 160.5]}><boxGeometry args={[14, 30, 2]} /><meshStandardMaterial color="#2c3438" roughness={0.8} /></mesh>)}
  </group>;
}

/** Blue rack of eight capped PCR tubes, as on a molecular-biology bench. */
export function TubeRack3D() {
  const caps = ["#e85d75", "#f2b13c", "#45b36b", "#3d8fe0", "#a864d6", "#e85d75", "#f2b13c", "#45b36b"];
  return <group>
    <RoundedBox args={[150, 18, 40]} radius={4} smoothness={3} position={[0, 9, 0]} castShadow><meshStandardMaterial color="#2f7fd1" roughness={0.45} /></RoundedBox>
    {caps.map((cap, index) => <group key={index} position={[-63 + index * 18, 18, 0]}>
      <mesh position={[0, 10, 0]}><cylinderGeometry args={[5.4, 3, 22, 20]} /><meshPhysicalMaterial color="#f3fbff" transmission={0.7} roughness={0.15} thickness={1} transparent opacity={0.8} /></mesh>
      <mesh position={[0, 3, 0]}><sphereGeometry args={[3, 14, 10]} /><meshStandardMaterial color="#cfe8ff" transparent opacity={0.85} /></mesh>
      <mesh position={[0, 22.5, 0]}><cylinderGeometry args={[6, 6, 3.5, 20]} /><meshStandardMaterial color={cap} roughness={0.4} /></mesh>
    </group>)}
  </group>;
}
