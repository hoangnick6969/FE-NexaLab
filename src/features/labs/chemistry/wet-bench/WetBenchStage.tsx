import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Text } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";
import { PhysicalLabEnvironment } from "../../shared/PhysicalLabEnvironment";

function Vessel({
  x,
  mixed,
  empty = false,
  pouring = false,
  label,
  chemicalName,
  safetyTag,
  safetyColor,
  badgeColor,
  labelOffsetX = 0,
}: {
  x: number;
  mixed: boolean;
  empty?: boolean;
  pouring?: boolean;
  label: string;
  chemicalName?: string;
  safetyTag?: string;
  safetyColor?: string;
  badgeColor?: string;
  labelOffsetX?: number;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    const amount = Math.min(1, delta * 4.5);
    group.current.position.x += ((pouring ? 0.05 : x) - group.current.position.x) * amount;
    group.current.rotation.z += ((pouring ? -0.72 : 0) - group.current.rotation.z) * amount;
  });
  return <group ref={group} position={[x, 0.668, 0]}>
    {/* Glass beaker bottom base plate */}
    <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.33, 0.33, 0.04, 48]} />
      <meshPhysicalMaterial
        color="#e0f2f4"
        transparent
        opacity={0.48}
        roughness={0.05}
        metalness={0.02}
        transmission={0.88}
        thickness={0.35}
        ior={1.52}
      />
    </mesh>
    {/* Glass beaker cylindrical body */}
    <mesh position={[0, 0.02, 0]} castShadow>
      <cylinderGeometry args={[0.38, 0.33, 0.62, 48, 1, true]} />
      <meshPhysicalMaterial
        color="#e6f5f7"
        transparent
        opacity={0.3}
        roughness={0.04}
        metalness={0.02}
        transmission={0.94}
        thickness={0.25}
        ior={1.52}
        side={2}
        depthWrite={false}
      />
    </mesh>
    {/* Vertical specular highlight reflections on glass */}
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.31, 0.02, 0.16]}>
        <boxGeometry args={[0.02, 0.54, 0.015]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.65} roughness={0.12} depthWrite={false} />
      </mesh>
    ))}
    {/* Beaker rolled top lip rim */}
    <mesh position={[0, 0.335, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.38, 0.022, 12, 48]} />
      <meshPhysicalMaterial
        color="#e0f2f4"
        transparent
        opacity={0.5}
        roughness={0.05}
        transmission={0.86}
        ior={1.52}
      />
    </mesh>
    {/* Beaker pouring spout lip */}
    <mesh position={[0.38, 0.34, 0]} rotation={[0, 0, -Math.PI / 6]}>
      <boxGeometry args={[0.045, 0.02, 0.06]} />
      <meshPhysicalMaterial
        color="#e0f2f4"
        transparent
        opacity={0.5}
        roughness={0.05}
        transmission={0.86}
        ior={1.52}
      />
    </mesh>
    {/* Enamel graduation volume marks (50 - 250 ml) */}
    {[0, 1, 2, 3, 4].map((tick) => {
      const y = -0.18 + tick * 0.09;
      const isMajor = tick % 2 === 0;
      const bodyY = y - 0.02;
      const radius = 0.33 + ((bodyY + 0.29) / 0.62) * 0.05;
      const z = Math.sqrt(radius ** 2 - 0.22 ** 2) + 0.006;
      return (
        <group key={tick} position={[0.22, y, z]}>
          <mesh rotation={[0, Math.atan2(0.22, z), 0]}>
            <boxGeometry args={[isMajor ? 0.105 : 0.065, 0.008, 0.006]} />
            <meshStandardMaterial color="#53656a" roughness={0.55} />
          </mesh>
          {isMajor && <Text position={[-0.075, 0, 0.004]} anchorX="right" anchorY="middle" fontSize={0.045} color="#53656a">{`${50 + tick * 50}`}</Text>}
        </group>
      );
    })}
    {/* Frosted marking label patch on beaker glass */}
    <mesh position={[0, -0.01, 0.35]}>
      <planeGeometry args={[0.28, 0.16]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.7} side={2} depthWrite={false} />
    </mesh>
    {/* Aqueous solution before mixing: completely clear, colorless, realistic water IOR */}
    {!empty && !mixed && (
      <>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.32, 0.31, 0.18, 48]} />
          <meshPhysicalMaterial
            color="#9bd6e8"
            transparent
            opacity={0.38}
            roughness={0.08}
            transmission={0.68}
            thickness={0.35}
            ior={1.333}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -0.108, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.008, 48]} />
          <meshPhysicalMaterial
            color="#a7dceb"
            transparent
            opacity={0.72}
            roughness={0.08}
            transmission={0.5}
            ior={1.333}
          />
        </mesh>
      </>
    )}
    {/* Reaction products: Milky white BaSO4 precipitate suspension and sediment */}
    {!empty && mixed && (
      <>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.35, 0.31, 0.44, 48]} />
          <meshStandardMaterial
            color="#f8fafc"
            transparent
            opacity={0.94}
            roughness={0.55}
          />
        </mesh>
        <mesh position={[0, -0.255, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.05, 48]} />
          <meshStandardMaterial color="#ffffff" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.008, 48]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.35} />
        </mesh>
      </>
    )}
    {/* High-contrast laboratory reagent label */}
    <Html position={[labelOffsetX, 0.45, 0]} center distanceFactor={5.2}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 8,
        whiteSpace: "nowrap",
        background: badgeColor || "#1e3a5f",
        color: "#fff",
        border: "1.5px solid rgba(255, 255, 255, 0.8)",
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.35)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        pointerEvents: "none",
        userSelect: "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}>{label}</span>
          {safetyTag && (
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: 4,
              background: safetyColor || "#ef4444",
              color: "#fff",
              letterSpacing: "0.03em"
            }}>{safetyTag}</span>
          )}
        </div>
        {chemicalName && <span style={{ fontSize: 9.5, opacity: 0.92, marginTop: 1 }}>{chemicalName}</span>}
      </div>
    </Html>
  </group>;
}

/** Reusable K2 bench shell; FL-10 supplies its vessel state and scale reading. */
export function WetBenchStage({
  mixed,
  pouring,
  scaleReading = "— — —",
  onContextLost,
}: {
  mixed: boolean;
  pouring: boolean;
  scaleReading?: string;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [2.4, 3.2, 6.4], fov: 45 }}
      onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true })}
    >
      <PhysicalLabEnvironment />

      {/* Precision Laboratory Electronic Balance */}
      <group position={[0, 0.06, 0]}>
      {/* Compact top-pan balance sized for two 250 ml beakers. */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.96, 0.22, 1.48]} />
        <meshStandardMaterial color="#dfe4e1" roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[2.02, 0.04, 1.54]} />
        <meshStandardMaterial color="#46504e" roughness={0.48} metalness={0.16} />
      </mesh>
      {/* 4 Rubber dampening feet */}
      {[-0.82, 0.82].flatMap((fx) =>
        [-0.62, 0.62].map((fz) => (
          <mesh key={`${fx}:${fz}`} position={[fx, 0, fz]}>
            <cylinderGeometry args={[0.055, 0.065, 0.06, 20]} />
            <meshStandardMaterial color="#252b29" roughness={0.82} />
          </mesh>
        ))
      )}
      {/* Bubble spirit level on balance */}
      <group position={[0.72, 0.192, -0.48]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.08, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.048, 24]} />
          <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* Raised load cell and circular stainless steel weighing pan */}
      <mesh position={[0, 0.23, -0.08]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.08, 32]} />
        <meshStandardMaterial color="#78827f" metalness={0.68} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, -0.08]} receiveShadow>
        <cylinderGeometry args={[0.88, 0.88, 0.04, 64]} />
        <meshStandardMaterial color="#b9c1bf" metalness={0.58} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.303, -0.08]} receiveShadow>
        <cylinderGeometry args={[0.84, 0.84, 0.01, 64]} />
        <meshStandardMaterial color="#e2e6e4" metalness={0.72} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.309, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.012, 8, 64]} />
        <meshStandardMaterial color="#87918e" metalness={0.74} roughness={0.24} />
      </mesh>
      {/* Front angled control fascia */}
      <mesh position={[0, 0.075, 0.735]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.9, 0.22, 0.075]} />
        <meshStandardMaterial color="#353e3c" metalness={0.12} roughness={0.48} />
      </mesh>
      {/* Control membrane buttons */}
      {[-0.79, 0.79].map((bx) => (
        <mesh key={bx} position={[bx, 0.09, 0.78]} rotation={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.012, 20]} />
          <meshStandardMaterial color="#aeb8b4" roughness={0.42} />
        </mesh>
      ))}
      {/* Backlit digital LCD display screen */}
      <mesh position={[0, 0.09, 0.78]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.58, 0.14, 0.016]} />
        <meshStandardMaterial color="#111917" roughness={0.24} />
      </mesh>
      <Html position={[0, 0.095, 0.795]} rotation={[-0.12, 0, 0]} transform distanceFactor={2.4}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: 62,
          height: 24,
          background: "#101b17",
          border: "1px solid #384843",
          borderRadius: 3,
          padding: "0 4px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.9)",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 5, color: "#6bd4a6", fontWeight: 700, letterSpacing: "0.04em" }}>● STABLE</span>
            <span style={{ fontSize: 5, color: "#83938d" }}>NET</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#a8f0cb",
              letterSpacing: "0.02em",
              textShadow: "0 0 5px rgba(92, 222, 160, 0.38)"
            }}>
              {scaleReading}
            </span>
          </div>
        </div>
      </Html>
      </group>

      <OrbitControls
        target={[0, 0.15, -0.2]}
        enablePan={false}
        enableZoom
        minDistance={5.2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Reaction vessels with high-contrast labels and colorless solutions */}
      <Vessel
        x={-0.42}
        mixed={false}
        empty={mixed}
        pouring={pouring}
        label="BaCl₂ · Cốc 1"
        chemicalName="Bari clorua · 0,1 M"
        safetyTag="ĐỘC"
        safetyColor="#ef4444"
        badgeColor="#243e52"
        labelOffsetX={-0.18}
      />
      <Vessel
        x={0.42}
        mixed={mixed}
        label="Na₂SO₄ · Cốc 2"
        chemicalName="Natri sulfat · 0,1 M"
        badgeColor="#344b45"
        labelOffsetX={0.18}
      />

      {/* Aqueous liquid pouring stream */}
      {pouring && (
        <mesh position={[0.12, 0.62, 0]} rotation={[0, 0, -0.44]}>
          <cylinderGeometry args={[0.026, 0.018, 0.82, 16]} />
          <meshPhysicalMaterial
            color="#f4fbfe"
            transparent
            opacity={0.48}
            roughness={0.03}
            transmission={0.92}
            thickness={0.2}
            ior={1.333}
          />
        </mesh>
      )}
    </Canvas>
  );
}
