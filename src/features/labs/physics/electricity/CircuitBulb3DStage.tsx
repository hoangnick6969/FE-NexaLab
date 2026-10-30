import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PhysicsStage } from "../shared/PhysicsStage";
import * as THREE from "three";

interface CircuitBulb3DStageProps {
  closed: boolean;
  switchIsActive: boolean;
  onToggleSwitch: () => void;
  isLit: boolean;
}

// -------------------------------------------------------------
// Procedural High-Fidelity Cable with Catenary Physics Sag
// -------------------------------------------------------------
export function Wire({
  start,
  end,
  color = "#ef4444",
  sag = 0.28,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  sag?: number;
}) {
  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p3 = new THREE.Vector3(...end);
    const dist = p0.distanceTo(p3);
    const effectiveSag = Math.max(sag, dist * 0.18);
    const p1 = new THREE.Vector3(
      p0.x * 0.65 + p3.x * 0.35,
      Math.max(.07, Math.min(p0.y, p3.y) - effectiveSag),
      p0.z * 0.65 + p3.z * 0.35
    );
    const p2 = new THREE.Vector3(
      p0.x * 0.35 + p3.x * 0.65,
      Math.max(.07, Math.min(p0.y, p3.y) - effectiveSag),
      p0.z * 0.35 + p3.z * 0.65
    );
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }, [start, end, sag]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 36, 0.022, 10, false), [curve]);

  return (
    <group>
      <mesh geometry={tubeGeo} castShadow>
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.08} />
      </mesh>
      {/* Molded Banana Jack Sleeves at ends */}
      <mesh position={start} castShadow>
        <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={end} castShadow>
        <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Detailed 3D DC Battery Power Cell
// -------------------------------------------------------------
export function Battery3D() {
  return (
    <group position={[-1.4, 0.36, 0]}>
      {/* Battery Heavy Cell Body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.65, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.25} />
      </mesh>
      {/* Zinc-carbon outer jacket */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.262, 0.262, 0.42, 32]} />
        <meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Positive Terminal (+) with Brass Crown */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.07, 16]} />
        <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Red Insulator Ring */}
      <mesh position={[0, 0.326, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.015, 24]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      {/* Negative Terminal (-) Bottom Metal Cap */}
      <mesh position={[0, -0.326, 0]} receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// High-Detail Incandescent Bulb with Thermal Filament Physics
// -------------------------------------------------------------
function LightBulb3D({ isLit }: { isLit: boolean }) {
  const tempRef = useRef(0);
  const filamentMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glassMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    // Thermal incandescence: heating up takes ~0.15s, cooling down takes ~0.35s
    const target = isLit ? 1.0 : 0.0;
    const rate = target > tempRef.current ? 14 : 4.5;
    tempRef.current += (target - tempRef.current) * Math.min(delta * rate, 1);
    const temp = tempRef.current;

    // Planck radiation color approximation
    if (filamentMatRef.current) {
      if (temp > 0.01) {
        filamentMatRef.current.emissive = new THREE.Color().setHSL(0.1 + 0.04 * temp, 1.0, 0.4 + 0.4 * temp);
        filamentMatRef.current.emissiveIntensity = temp * 4.5;
      } else {
        filamentMatRef.current.emissive = new THREE.Color(0x000000);
        filamentMatRef.current.emissiveIntensity = 0;
      }
    }

    // Glass warmth transmission
    if (glassMatRef.current) {
      glassMatRef.current.emissive = new THREE.Color().setHSL(0.12, 0.9, 0.5 * temp);
      glassMatRef.current.emissiveIntensity = temp * 0.9;
    }

    // Point Light Stefan-Boltzmann scaling
    if (lightRef.current) {
      lightRef.current.intensity = Math.pow(temp, 2.5) * 4.2;
    }
  });

  return (
    <group position={[0, 0.38, 0]}>
      {/* Molded Porcelain Socket Base */}
      <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.16, 24]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Brass Screw Threads (E27) */}
      <mesh position={[0, -0.11, 0]} castShadow>
        <cylinderGeometry args={[0.155, 0.155, 0.12, 24]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Thread Ridge Detail */}
      <mesh position={[0, -0.11, 0]}>
        <torusGeometry args={[0.158, 0.015, 8, 24]} />
        <meshStandardMaterial color="#a16207" metalness={0.8} />
      </mesh>

      {/* Clear Glass Bulb Dome with Physical Optics */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshPhysicalMaterial
          ref={glassMatRef}
          color="#ffffff"
          transmission={0}
          opacity={0.28}
          transparent
          roughness={0.05}
          metalness={0.02}
          ior={1.52}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Internal Glass Stem Mount */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.045, 0.075, 0.18, 16]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0} opacity={0.3}
          transparent
          roughness={0.1}
          ior={1.5}
        />
      </mesh>

      {/* Support Lead Wires */}
      <mesh position={[-0.035, 0.09, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      <mesh position={[0.035, 0.09, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>

      {/* Coiled Tungsten Filament */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <torusGeometry args={[0.07, 0.014, 12, 24]} />
        <meshStandardMaterial
          ref={filamentMatRef}
          color="#475569"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Radiant Glow Point Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.15, 0]}
        color="#fef08a"
        intensity={0}
        distance={4.8}
        decay={2}
        castShadow
        shadow-bias={-0.001}
      />
    </group>
  );
}

// -------------------------------------------------------------
// Snappy Mechanical Knife Switch with Smooth Kinetic Action
// -------------------------------------------------------------
export function Switch3D({
  closed,
  active,
  onClick,
}: {
  closed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const armRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (armRef.current) {
      // Snappy mechanical click rotation
      const targetAngle = closed ? 0.0 : 0.65;
      armRef.current.rotation.z += (targetAngle - armRef.current.rotation.z) * Math.min(delta * 24, 1);
    }
  });

  return (
    <group
      position={[1.3, 0.14, 0]}
      onClick={() => {
        if (active) onClick();
      }}
      onPointerOver={() => {
        if (active) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Molded Bakelite/Plastic Base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.08, 0.32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.15} />
      </mesh>

      {/* Heavy Brass Fixed Jaw Contact (Right) */}
      <mesh position={[0.16, 0.08, 0]} castShadow>
        <boxGeometry args={[0.06, 0.09, 0.08]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Heavy Brass Hinge Contact (Left) */}
      <mesh position={[-0.16, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.07, 16]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rotating Knife Arm Assembly */}
      <group ref={armRef} position={[-0.16, 0.08, 0]}>
        {/* Brass Blade */}
        <mesh position={[0.16, 0.02, 0]} castShadow>
          <boxGeometry args={[0.34, 0.035, 0.045]} />
          <meshStandardMaterial color="#eab308" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Insulated Safety Handle Knob */}
        <mesh position={[0.33, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.052, 16, 16]} />
          <meshStandardMaterial color="#ef4444" roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT: CircuitBulb3DStage
// -------------------------------------------------------------
export function CircuitBulb3DStage({
  closed,
  switchIsActive,
  onToggleSwitch,
  isLit,
}: CircuitBulb3DStageProps) {
  return <PhysicsStage>
    <Battery3D />
    <LightBulb3D isLit={isLit} />
    <Switch3D closed={closed} active={switchIsActive} onClick={onToggleSwitch} />
    <Wire start={[-1.4,.7,0]} end={[-.16,.18,0]} color="#ef4444" sag={.1} />
    <Wire start={[.16,.18,0]} end={[1.14,.18,0]} color="#ef4444" sag={.08} />
    <Wire start={[1.44,.18,0]} end={[-1.4,.14,.22]} color="#273844" sag={.08} />
  </PhysicsStage>;
}
export default CircuitBulb3DStage;
