import { useEffect, useMemo, useRef, useState } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";

/** Eyepiece position in the microscope's local frame (mm), for the zoom-in camera move. */
export const MICROSCOPE_EYEPIECE_MM = [0, 372, 62] as const;

const ENAMEL = "#f1efe8";
const ANODISED = "#1c2023";
const CHROME = "#c9d0d4";

/**
 * Upright compound light microscope (mm, origin on the bench under the base,
 * eyepieces facing the learner): enamel base and C-arm, mechanical stage with
 * clips and a stained slide, condenser and lamp, a turret with colour-coded
 * 4×/10×/40× objectives, binocular head and coarse/fine focus knobs. It is
 * the doorway to the molecular view: hover glows, click opens it.
 */
export function Microscope3D({ onOpen, active = true }: { onOpen?: () => void; active?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const [hovered, setHovered] = useState(false);
  const halo = useRef<THREE.Mesh>(null);
  const arm = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 30, -92), new THREE.Vector3(0, 120, -104), new THREE.Vector3(0, 220, -92), new THREE.Vector3(0, 292, -44),
  ]), 48, 19, 20, false), []);
  useEffect(() => () => arm.dispose(), [arm]);
  // The cursor is reset on unmount so it never sticks after the scene changes.
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  useEffect(() => { document.body.style.cursor = hovered && onOpen ? "pointer" : ""; invalidate(); }, [hovered, onOpen, invalidate]);
  useFrame((state) => {
    if (!halo.current) return;
    halo.current.visible = active;
    if (!active) return;
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.35 * pulse;
    halo.current.scale.setScalar(1 + (reduced ? 0 : 0.08 * pulse));
    if (!reduced) state.invalidate();
  });

  const glow = hovered ? 0.18 : 0;
  const enamel = <meshPhysicalMaterial color={ENAMEL} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.25} emissive="#3fb8b0" emissiveIntensity={glow} />;
  const handlers = onOpen ? {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(true); },
    onPointerOut: () => setHovered(false),
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen(); },
  } : {};

  return <group {...handlers}>
    {/* Base and lamp port */}
    <RoundedBox args={[184, 34, 236]} radius={12} smoothness={4} position={[0, 17, -8]} castShadow receiveShadow>{enamel}</RoundedBox>
    <mesh position={[0, 35, 12]}><cylinderGeometry args={[20, 22, 4, 40]} /><meshStandardMaterial color={ANODISED} roughness={0.4} /></mesh>
    <mesh position={[0, 37.2, 12]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[14, 40]} /><meshStandardMaterial color="#fff6d8" emissive="#ffe7a8" emissiveIntensity={1.4} toneMapped={false} /></mesh>
    <mesh position={[70, 30, 90]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[9, 9, 10, 24]} /><meshStandardMaterial color={ANODISED} roughness={0.5} /></mesh>
    {/* C-arm */}
    <mesh geometry={arm} castShadow>{enamel}</mesh>
    {/* Condenser under the stage */}
    <mesh position={[0, 96, 12]}><cylinderGeometry args={[17, 14, 26, 32]} /><meshStandardMaterial color={ANODISED} roughness={0.35} metalness={0.4} /></mesh>
    {/* Mechanical stage, clips and slide */}
    <RoundedBox args={[150, 10, 136]} radius={3} smoothness={3} position={[0, 120, 10]} castShadow><meshStandardMaterial color={ANODISED} roughness={0.45} metalness={0.3} /></RoundedBox>
    <mesh position={[0, 125.2, 12]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[9, 32]} /><meshStandardMaterial color="#fff2c4" emissive="#ffe39a" emissiveIntensity={0.9} toneMapped={false} /></mesh>
    <mesh position={[0, 126, 12]}><boxGeometry args={[76, 1.2, 26]} /><meshPhysicalMaterial color="#e9f6ff" transmission={0.9} roughness={0.05} thickness={1.2} transparent opacity={0.55} /></mesh>
    <mesh position={[4, 126.8, 12]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[7, 32]} /><meshStandardMaterial color="#c94f8a" transparent opacity={0.75} /></mesh>
    {[-26, 26].map((x) => <mesh key={x} position={[x, 127.5, -6]} rotation={[0.12, 0, 0]}><boxGeometry args={[8, 1.6, 40]} /><meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.2} /></mesh>)}
    {/* Focus knobs: coarse inside, fine outside, both sides */}
    {[-1, 1].map((side) => <group key={side} position={[side * 30, 152, -78]} rotation={[0, 0, Math.PI / 2]}>
      <mesh position={[0, side * -12, 0]}><cylinderGeometry args={[24, 24, 14, 40]} /><meshStandardMaterial color={ANODISED} roughness={0.55} /></mesh>
      <mesh position={[0, side * -24, 0]}><cylinderGeometry args={[14, 14, 12, 32]} /><meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.25} /></mesh>
    </group>)}
    {/* Head, turret and objectives (4× red, 10× yellow, 40× blue bands) */}
    <RoundedBox args={[78, 62, 100]} radius={14} smoothness={4} position={[0, 300, -20]} castShadow>{enamel}</RoundedBox>
    <group position={[0, 262, 14]} rotation={[0.22, 0, 0]}>
      <mesh><cylinderGeometry args={[34, 30, 16, 48]} /><meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.18} /></mesh>
      {[["#d8443a", 30], ["#e6b42a", 38], ["#3d8fe0", 46]].map(([band, length], index) => {
        const angle = (index - 1) * 0.9;
        return <group key={index} position={[Math.sin(angle) * 18, -8, Math.cos(angle) * 18 - 6]} rotation={[0.25 * Math.cos(angle), 0, -0.25 * Math.sin(angle)]}>
          <mesh position={[0, -(length as number) / 2, 0]}><cylinderGeometry args={[9, 6.5, length as number, 28]} /><meshStandardMaterial color={CHROME} metalness={0.95} roughness={0.2} /></mesh>
          <mesh position={[0, -(length as number) * 0.55, 0]}><cylinderGeometry args={[9.3, 9.3, 3, 28]} /><meshStandardMaterial color={band as string} roughness={0.4} /></mesh>
        </group>;
      })}
    </group>
    {/* Binocular eyepieces tilted towards the learner */}
    {[-19, 19].map((x) => <group key={x} position={[x, 330, 18]} rotation={[0.62, 0, 0]}>
      <mesh position={[0, 26, 0]}><cylinderGeometry args={[11, 12, 56, 32]} />{enamel}</mesh>
      <mesh position={[0, 58, 0]}><cylinderGeometry args={[12.5, 12.5, 12, 32]} /><meshStandardMaterial color={ANODISED} roughness={0.85} /></mesh>
    </group>)}
    {/* Pulsing ring on the bench marks the microscope as the way in */}
    <mesh ref={halo} position={[0, 1.5, -8]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[128, 140, 72]} />
      <meshBasicMaterial color="#3fd0c6" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}
