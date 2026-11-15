import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Text } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";
import { PhysicalLabEnvironment } from "../../shared/PhysicalLabEnvironment";
import { Beaker3D, type BeakerSize } from "../../shared/items/beaker";
import { DIGITAL_SCALE_ANCHORS, DigitalScale3D } from "../../shared/items/digital-scale";
import type { LiquidLook } from "../../shared/items/glass";

/** Shared scale enlarged 2.4×: a 1.87 × 1.2 body whose pan (1.73 × 0.86) takes the two beakers side by side. */
const SCALE_FACTOR = 2.4;
const SCALE_Y = 0.02;
// Pan surface (0.096 in item units) plus a small gap: a beaker floor flush with the pan z-fights.
const PAN_TOP = SCALE_Y + (DIGITAL_SCALE_ANCHORS.pan[1] - 0.004) * SCALE_FACTOR + 0.006;
/** 250 mL beakers, the size the previous bench-owned glass had. */
const BEAKER_SIZE: BeakerSize = { radius: 0.37, height: 0.64 };
/** The vessel group pivots about the beaker's middle so the pour tilt looks natural. */
const VESSEL_Y = PAN_TOP + BEAKER_SIZE.height / 2;
const PAN_Z = DIGITAL_SCALE_ANCHORS.pan[2] * SCALE_FACTOR;
/** Pour pose: centre lifted and moved left so the tipped rim (-0.72 rad) lands over beaker 2 at x 0.42. */
const POUR_X = -0.05;
const POUR_LIFT = 0.42;
const POUR_TILT = 0.72;
/** Lowest point of the tipped rim, where the stream leaves the glass. */
const LIP_X = POUR_X + BEAKER_SIZE.radius * Math.cos(POUR_TILT) + (BEAKER_SIZE.height / 2) * Math.sin(POUR_TILT);
const LIP_Y = VESSEL_Y + POUR_LIFT - BEAKER_SIZE.radius * Math.sin(POUR_TILT) + (BEAKER_SIZE.height / 2) * Math.cos(POUR_TILT);
const STREAM_BOTTOM = PAN_TOP + 0.2;
/** Before mixing: two clear, colourless solutions (blue only shows the level). After: milky BaSO₄ suspension. */
const SOLUTION: LiquidLook = { color: "#9bd6e8", opacity: 0.38, surface: "#a7dceb" };
const SUSPENSION: LiquidLook = { color: "#f8fafc", opacity: 0.94, surface: "#f1f5f9" };
const SOLUTION_FILL = 0.3;
const MIXED_FILL = 0.72;

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
    // Pouring lifts the beaker above the other one's rim before it tips, so the glass never cuts through it or the pan.
    group.current.position.x += ((pouring ? POUR_X : x) - group.current.position.x) * amount;
    group.current.position.y += ((pouring ? VESSEL_Y + POUR_LIFT : VESSEL_Y) - group.current.position.y) * amount;
    group.current.rotation.z += ((pouring ? -POUR_TILT : 0) - group.current.rotation.z) * amount;
  });
  // D1-2.2: the glass is the shared beaker (`shared/items/`); this bench keeps the solution look, the BaSO₄ sediment,
  // the printed 50–250 mL marks, the spout and the reagent label, passed as children in the beaker's own frame.
  return <group ref={group} position={[x, VESSEL_Y, PAN_Z]}>
    <group position={[0, -BEAKER_SIZE.height / 2, 0]}>
      <Beaker3D {...BEAKER_SIZE} graduations={[]} fill={empty ? 0 : mixed ? MIXED_FILL : SOLUTION_FILL} liquid={mixed ? SUSPENSION : SOLUTION}>
        {!empty && mixed && <mesh position={[0, 0.045, 0]}>
          <cylinderGeometry args={[BEAKER_SIZE.radius * 0.88, BEAKER_SIZE.radius * 0.88, 0.05, 48]} />
          <meshStandardMaterial color="#ffffff" roughness={0.85} />
        </mesh>}
        {/* Printed volume marks (50–250 mL) on the front of the glass */}
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = 0.12 + tick * 0.09;
          const isMajor = tick % 2 === 0;
          const radius = BEAKER_SIZE.radius * (0.94 + 0.06 * (y / BEAKER_SIZE.height));
          const z = Math.sqrt(radius ** 2 - 0.22 ** 2) + 0.006;
          return <group key={tick} position={[0.22, y, z]}>
            <mesh rotation={[0, Math.atan2(0.22, z), 0]}>
              <boxGeometry args={[isMajor ? 0.105 : 0.065, 0.008, 0.006]} />
              <meshStandardMaterial color="#53656a" roughness={0.55} />
            </mesh>
            {isMajor && <Text position={[-0.075, 0, 0.004]} anchorX="right" anchorY="middle" fontSize={0.045} color="#53656a">{`${50 + tick * 50}`}</Text>}
          </group>;
        })}
        {/* Pouring spout */}
        <mesh position={[BEAKER_SIZE.radius, BEAKER_SIZE.height + 0.005, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.045, 0.02, 0.06]} />
          <meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.85} />
        </mesh>
        {/* Frosted marking patch */}
        <mesh position={[0, 0.29, BEAKER_SIZE.radius * 0.97]}>
          <planeGeometry args={[0.28, 0.16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.7} side={2} depthWrite={false} />
        </mesh>
      </Beaker3D>
    </group>
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

      {/* Shared digital scale (D1-2.2), enlarged so its pan holds two 250 mL beakers. The reading stays the server's. */}
      <group position={[0, SCALE_Y, 0]} scale={SCALE_FACTOR}>
        <DigitalScale3D reading={scaleReading} />
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
        <mesh position={[LIP_X, (LIP_Y + STREAM_BOTTOM) / 2, PAN_Z]}>
          <cylinderGeometry args={[0.022, 0.016, LIP_Y - STREAM_BOTTOM, 16]} />
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
