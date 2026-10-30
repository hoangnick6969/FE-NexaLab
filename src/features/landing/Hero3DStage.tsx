import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { Zap, Eye, FlaskConical, Layers, Sun, RotateCw, ArrowRight } from "lucide-react";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    stageLabel: "Phòng thí nghiệm ảo 3D",
    hintInteract: "Kéo để xoay 360° · Cuộn để phóng to",
    tabPhysics: "Vật lý",
    tabBiology: "Sinh học",
    tabChemistry: "Hóa học",

    // Physics
    physicsHeading: "Mạch điện & Đèn dây tóc 3D",
    physicsDesc: "Dòng electron chạy qua dây dẫn đốt nóng dây tóc vonfram, kiểm chứng định luật Ôm.",
    switchClose: "ĐÓNG MẠCH",
    switchOpen: "MỞ MẠCH",
    physicsTelemetry: "9.0V · 350Ω · 25.7 mA",
    physicsCta: "Vào lab Vật lý",

    // Biology
    biologyHeading: "Giải phẫu Mắt 3D & Quang học",
    biologyDesc: "Quan sát khúc xạ ánh sáng qua giác mạc, thể thủy tinh và hội tụ trên võng mạc.",
    explodeLayers: "Bóc tách các lớp",
    assembleLayers: "Thu gọn nguyên khối",
    toggleRays: "Tia sáng quang học",
    biologyTelemetry: "Khúc xạ n=1.376 · Tiêu cự f=17mm",
    biologyCta: "Vào lab Sinh học",

    // Chemistry
    chemistryHeading: "Bình phản ứng & Thử quỳ tím",
    chemistryDesc: "Quan sát dung dịch sủi bọt khí và phản ứng đổi màu giấy quỳ theo độ pH thực tế.",
    dipStrip: "Nhúng giấy quỳ",
    pullStrip: "Rút giấy quỳ",
    acid: "Axit (pH 2)",
    neutral: "Nước cất (pH 7)",
    base: "Bazơ (pH 12)",
    chemistryTelemetry: "Chất chỉ thị pH · Phản ứng tức thì",
    chemistryCta: "Vào lab Hóa học",
  },
  en: {
    stageLabel: "Interactive 3D Laboratory",
    hintInteract: "Drag to rotate 360° · Scroll to zoom",
    tabPhysics: "Physics",
    tabBiology: "Biology",
    tabChemistry: "Chemistry",

    // Physics
    physicsHeading: "3D Circuit & Filament Bulb",
    physicsDesc: "Electrons flow through copper wiring to heat the tungsten filament, verifying Ohm's Law.",
    switchClose: "CLOSE CIRCUIT",
    switchOpen: "OPEN CIRCUIT",
    physicsTelemetry: "9.0V · 350Ω · 25.7 mA",
    physicsCta: "Enter Physics Lab",

    // Biology
    biologyHeading: "3D Eye Anatomy & Optics",
    biologyDesc: "Observe optical refraction through cornea and lens, projecting onto the photoreceptive retina.",
    explodeLayers: "Explode layers",
    assembleLayers: "Assemble model",
    toggleRays: "Light rays",
    biologyTelemetry: "Refraction n=1.376 · Focal f=17mm",
    biologyCta: "Enter Biology Lab",

    // Chemistry
    chemistryHeading: "Reaction Beaker & Litmus Test",
    chemistryDesc: "Observe effervescent bubbles and litmus paper color transitions across real pH environments.",
    dipStrip: "Dip Litmus Strip",
    pullStrip: "Withdraw Strip",
    acid: "Acid (pH 2)",
    neutral: "Water (pH 7)",
    base: "Base (pH 12)",
    chemistryTelemetry: "pH Indicator · Real-time Reaction",
    chemistryCta: "Enter Chemistry Lab",
  },
});
const t = text();

/* =========================================================================
   FLOATING 3D SCIENTIFIC RELICS (BACKGROUND AMBIENCE)
========================================================================= */

function FloatingBackgroundRelics() {
  const moleculeRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const prismRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (moleculeRef.current) {
      moleculeRef.current.position.y = 1.3 + Math.sin(elapsed * 0.7) * 0.12;
      moleculeRef.current.rotation.x = elapsed * 0.2;
      moleculeRef.current.rotation.y = elapsed * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.position.y = -1.2 + Math.cos(elapsed * 0.6) * 0.1;
      ringRef.current.rotation.y = elapsed * 0.15;
      ringRef.current.rotation.z = Math.sin(elapsed * 0.4) * 0.2;
    }
    if (prismRef.current) {
      prismRef.current.position.y = 0.8 + Math.sin(elapsed * 0.8 + 1) * 0.1;
      prismRef.current.rotation.y = elapsed * 0.25;
      prismRef.current.rotation.z = elapsed * 0.15;
    }
  });

  return (
    <group position={[0, 0, -2.2]}>
      {/* Floating Molecule (Top Left) */}
      <group ref={moleculeRef} position={[-2.4, 1.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.7} roughness={0.2} transparent opacity={0.65} />
        </mesh>
        {[
          [0.35, 0.25, 0],
          [-0.35, 0.25, 0.1],
          [0, -0.38, -0.15],
        ].map(([x, y, z], idx) => (
          <group key={idx}>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[0.1, 14, 14]} />
              <meshStandardMaterial color="#f472b6" metalness={0.6} roughness={0.2} transparent opacity={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Floating Carbon Ring / Torus (Bottom Right) */}
      <group ref={ringRef} position={[2.5, -1.2, 0]}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.42, 0.035, 16, 48]} />
          <meshStandardMaterial color="#a78bfa" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Floating Glass Prism (Top Right) */}
      <group ref={prismRef} position={[2.4, 0.9, 0]}>
        <mesh>
          <octahedronGeometry args={[0.26]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            roughness={0.1}
            metalness={0.1}
            transmission={0.85}
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>
    </group>
  );
}

/* =========================================================================
   1. PHYSICS 3D: HIGH-CRAFT WORKBENCH WITH INCANDESCENT BULB & CIRCUIT
========================================================================= */

function ElectronStream({ isClosed }: { isClosed: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const count = 16;
  const loopPoints = useMemo(() => [
    new THREE.Vector3(-1.8, 0.08, -1.0),
    new THREE.Vector3(1.8, 0.08, -1.0),
    new THREE.Vector3(1.8, 0.08, 1.0),
    new THREE.Vector3(-1.8, 0.08, 1.0),
  ], []);

  const spline = useMemo(() => new THREE.CatmullRomCurve3(loopPoints, true), [loopPoints]);

  useFrame(({ clock }) => {
    if (!isClosed || !groupRef.current) return;
    const t = clock.getElapsedTime() * 0.25;
    groupRef.current.children.forEach((child, i) => {
      const u = (t + i / count) % 1;
      child.position.copy(spline.getPointAt(u));
    });
  });

  if (!isClosed) return null;

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={loopPoints[0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}
    </group>
  );
}

function PhysicsHeroScene({ isClosed, onToggle }: { isClosed: boolean; onToggle: () => void }) {
  const switchLeverRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (switchLeverRef.current) {
      const target = isClosed ? 0 : -0.58;
      switchLeverRef.current.rotation.z = THREE.MathUtils.lerp(switchLeverRef.current.rotation.z, target, 0.22);
    }
  });

  return (
    <group position={[0, -0.35, 0]}>
      {/* Matte Studio Platform */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[4.8, 0.1, 3.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Copper Wire Rectangular Traces */}
      <mesh position={[0, 0.015, -1.0]}>
        <boxGeometry args={[3.6, 0.03, 0.06]} />
        <meshStandardMaterial color={isClosed ? "#f59e0b" : "#94a3b8"} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.015, 1.0]}>
        <boxGeometry args={[3.6, 0.03, 0.06]} />
        <meshStandardMaterial color={isClosed ? "#f59e0b" : "#94a3b8"} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-1.8, 0.015, 0]}>
        <boxGeometry args={[0.06, 0.03, 2.0]} />
        <meshStandardMaterial color={isClosed ? "#f59e0b" : "#94a3b8"} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[1.8, 0.015, 0]}>
        <boxGeometry args={[0.06, 0.03, 2.0]} />
        <meshStandardMaterial color={isClosed ? "#f59e0b" : "#94a3b8"} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Electron Flow Simulation */}
      <ElectronStream isClosed={isClosed} />

      {/* 9V Heavy Duty Battery (Left) */}
      <group position={[-1.8, 0.38, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.72, 0.85]} />
          <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.2} />
        </mesh>
        {/* Label strip */}
        <mesh position={[0.28, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        {/* Anode & Cathode Terminals */}
        <mesh position={[0, 0.41, -0.22]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          <meshStandardMaterial color="#ef4444" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.41, 0.22]}>
          <cylinderGeometry args={[0.09, 0.09, 0.1, 8]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Knife Switch (Front: z=1.0) */}
      <group position={[0, 0.08, 1.0]}>
        {/* Insulating base */}
        <mesh>
          <boxGeometry args={[1.0, 0.08, 0.38]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        {/* Terminals */}
        <mesh position={[-0.32, 0.12, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.32, 0.12, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Rotating Lever Arm */}
        <group
          ref={switchLeverRef}
          position={[-0.32, 0.18, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <mesh position={[0.32, 0, 0]}>
            <boxGeometry args={[0.64, 0.055, 0.07]} />
            <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Red ball handle */}
          <mesh position={[0.66, 0.04, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Ceramic Resistor (Back: z=-1.0) */}
      <group position={[0, 0.14, -1.0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.72, 20]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        {/* Color Coding Bands */}
        <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.104, 0.104, 0.05, 20]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.104, 0.104, 0.05, 20]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>

      {/* Incandescent 3D Edison Bulb (Right: x=1.8) */}
      <group position={[1.8, 0.58, 0]}>
        {/* Threaded Metal Base */}
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.34, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Contact pin */}
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Glass Envelope */}
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.54, 32, 32]} />
          <meshPhysicalMaterial
            color={isClosed ? "#fef08a" : "#f1f5f9"}
            roughness={0.08}
            metalness={0.05}
            transmission={0.85}
            transparent
            opacity={isClosed ? 0.75 : 0.38}
            emissive={isClosed ? "#f59e0b" : "#000000"}
            emissiveIntensity={isClosed ? 0.8 : 0}
          />
        </mesh>

        {/* Tungsten Filament (Double Torus Loop) */}
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.024, 16, 32, Math.PI * 1.6]} />
          <meshStandardMaterial
            color={isClosed ? "#ffffff" : "#475569"}
            emissive={isClosed ? "#fef08a" : "#000000"}
            emissiveIntensity={isClosed ? 4.8 : 0}
          />
        </mesh>

        {/* Real Dynamic 3D Point Light when illuminated */}
        {isClosed && (
          <>
            <pointLight position={[0, 0.22, 0]} color="#fbbf24" intensity={5.0} distance={8} decay={1.8} />
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.78, 16, 16]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.16} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/* =========================================================================
   2. BIOLOGY 3D: DETAILED HUMAN EYE ANATOMY & OPTICAL RAY CONVERGENCE
========================================================================= */

function BiologyHeroScene({ exploded, showRays }: { exploded: boolean; showRays: boolean }) {
  const eyeRef = useRef<THREE.Group>(null);
  const factor = exploded ? 1.55 : 1.0;

  useFrame(({ clock }) => {
    if (eyeRef.current) {
      eyeRef.current.rotation.y = clock.getElapsedTime() * 0.22;
    }
  });

  return (
    <group ref={eyeRef} position={[0, 0, 0]}>
      {/* 1. Sclera (Outer Protective White Coat) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.32, 36, 36]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.3}
          metalness={0.05}
          transparent
          opacity={exploded ? 0.22 : 0.88}
        />
      </mesh>

      {/* 2. Cornea (Clear Front Optical Bulge) */}
      <mesh position={[0, 0, 1.25 * factor]}>
        <sphereGeometry args={[0.78, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          roughness={0.08}
          metalness={0.05}
          transmission={0.85}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* 3. Deep Iris Ring */}
      <mesh position={[0, 0, 0.96 * factor]}>
        <ringGeometry args={[0.26, 0.72, 32]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. Central Pupil */}
      <mesh position={[0, 0, 0.97 * factor]}>
        <circleGeometry args={[0.26, 32]} />
        <meshBasicMaterial color="#090d16" />
      </mesh>

      {/* 5. Crystalline Lens (Biconvex) */}
      <mesh position={[0, 0, 0.64 * factor]} scale={[1, 1, 0.44]}>
        <sphereGeometry args={[0.62, 32, 24]} />
        <meshPhysicalMaterial
          color="#fef08a"
          roughness={0.12}
          metalness={0.05}
          transmission={0.78}
          transparent
          opacity={0.72}
        />
      </mesh>

      {/* 6. Retina (Internal Photoreceptor Hemispherical Cup) */}
      <mesh position={[0, 0, -0.7 * factor]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[1.14, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
        <meshStandardMaterial color="#f87171" roughness={0.45} side={THREE.BackSide} />
      </mesh>

      {/* 7. Optic Nerve Stem */}
      <mesh position={[0, 0, -1.75 * factor]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.8, 24]} />
        <meshStandardMaterial color="#fde047" roughness={0.45} />
      </mesh>

      {/* Optical Light Convergence Rays */}
      {showRays && (
        <group>
          {/* Top Ray */}
          <mesh position={[0, 0.25, 0.45]} rotation={[-0.14, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
          </mesh>
          {/* Optical Axis Ray */}
          <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.95} />
          </mesh>
          {/* Bottom Ray */}
          <mesh position={[0, -0.25, 0.45]} rotation={[0.14, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
          </mesh>
          {/* Retina Focal Point */}
          <mesh position={[0, 0, -1.05 * factor]}>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* =========================================================================
   3. CHEMISTRY 3D: BOROSILICATE BEAKER WITH BUBLING LIQUID & LITMUS DIP
========================================================================= */

type SolutionMode = "acid" | "neutral" | "base";

function ChemistryHeroScene({ solution, isDipped }: { solution: SolutionMode; isDipped: boolean }) {
  const paperRef = useRef<THREE.Group>(null);
  const bubblesGroup = useRef<THREE.Group>(null);

  const fluidColor = solution === "acid" ? "#f43f5e" : solution === "neutral" ? "#a855f7" : "#2563eb";
  const stainedColor = solution === "acid" ? "#e11d48" : solution === "neutral" ? "#9333ea" : "#1d4ed8";

  useFrame(({ clock }, delta) => {
    // Smooth rising bubbles
    if (bubblesGroup.current) {
      bubblesGroup.current.children.forEach((bubble) => {
        bubble.position.y += delta * 0.42;
        if (bubble.position.y > 0.8) {
          bubble.position.y = -0.7;
          bubble.position.x = (Math.random() - 0.5) * 0.9;
          bubble.position.z = (Math.random() - 0.5) * 0.9;
        }
      });
    }
    // Smooth translation of litmus paper
    if (paperRef.current) {
      const targetY = isDipped ? 0.2 : 1.35;
      paperRef.current.position.y = THREE.MathUtils.lerp(paperRef.current.position.y, targetY, 0.16);
    }
  });

  return (
    <group position={[0, -0.22, 0]}>
      {/* Borosilicate Glass Beaker Wall */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 2.05, 36, 1, true]} />
        <meshPhysicalMaterial
          color="#f8fafc"
          roughness={0.06}
          metalness={0.08}
          transmission={0.88}
          transparent
          opacity={0.36}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Beaker bottom base */}
      <mesh position={[0, -1.02, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.06, 36]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.1} transparent opacity={0.4} />
      </mesh>
      {/* Volumetric Graduation Ticks */}
      {[-0.45, -0.15, 0.15, 0.45].map((y, i) => (
        <mesh key={i} position={[0.99, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.035, 0.24, 0.015]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Reacting Liquid Mass */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.68, 36]} />
        <meshStandardMaterial
          color={fluidColor}
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={0.84}
        />
      </mesh>

      {/* Effervescent Rising Bubbles */}
      <group ref={bubblesGroup}>
        {[
          [-0.32, -0.6, 0.25, 0.045],
          [0.34, -0.2, -0.28, 0.06],
          [-0.18, 0.1, -0.32, 0.05],
          [0.22, -0.5, 0.38, 0.042],
          [0.12, 0.35, 0.12, 0.055],
        ].map(([bx, by, bz, size], i) => (
          <mesh key={i} position={[bx, by, bz]}>
            <sphereGeometry args={[size, 14, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      {/* Litmus Paper Strip */}
      <group ref={paperRef} position={[0, 1.35, 0]}>
        {/* Upper dry section */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.26, 0.72, 0.02]} />
          <meshStandardMaterial color="#c084fc" roughness={0.8} />
        </mesh>
        {/* Lower reacting tip */}
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.26, 0.62, 0.02]} />
          <meshStandardMaterial color={isDipped ? stainedColor : "#c084fc"} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/* =========================================================================
   HERO 3D LAB STAGE (APPLE-GRADE INTERACTIVE COMPONENT)
========================================================================= */

export function Hero3DStage() {
  const [activeTab, setActiveTab] = useState<"physics" | "biology" | "chemistry">("physics");

  // Physics state
  const [isClosed, setIsClosed] = useState(true);

  // Biology state
  const [exploded, setExploded] = useState(false);
  const [showRays, setShowRays] = useState(true);

  // Chemistry state
  const [solution, setSolution] = useState<SolutionMode>("acid");
  const [isDipped, setIsDipped] = useState(true);

  return (
    <div className="hero-3d-stage-card" aria-label={t.stageLabel}>
      {/* Header with Segmented 3-Lab Switcher */}
      <div className="hero-stage-topbar">
        <div className="hero-stage-tabs">
          <button
            type="button"
            className={`hero-tab-pill ${activeTab === "physics" ? "is-active" : ""}`}
            onClick={() => setActiveTab("physics")}
          >
            <Zap size={15} /> {t.tabPhysics}
          </button>
          <button
            type="button"
            className={`hero-tab-pill ${activeTab === "biology" ? "is-active" : ""}`}
            onClick={() => setActiveTab("biology")}
          >
            <Eye size={15} /> {t.tabBiology}
          </button>
          <button
            type="button"
            className={`hero-tab-pill ${activeTab === "chemistry" ? "is-active" : ""}`}
            onClick={() => setActiveTab("chemistry")}
          >
            <FlaskConical size={15} /> {t.tabChemistry}
          </button>
        </div>
        <span className="hero-stage-hint">{t.hintInteract}</span>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="hero-stage-viewport">
        <Canvas
          camera={{ position: [0, 2.6, 5.0], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          className="hero-webgl-canvas"
        >
          {/* Studio Lights */}
          <ambientLight intensity={1.9} />
          <directionalLight position={[6, 9, 6]} intensity={2.4} castShadow />

          {/* Floating Background Relics */}
          <FloatingBackgroundRelics />

          {/* Active 3D Subject Scene */}
          {activeTab === "physics" && (
            <PhysicsHeroScene isClosed={isClosed} onToggle={() => setIsClosed(!isClosed)} />
          )}
          {activeTab === "biology" && (
            <BiologyHeroScene exploded={exploded} showRays={showRays} />
          )}
          {activeTab === "chemistry" && (
            <ChemistryHeroScene solution={solution} isDipped={isDipped} />
          )}

          <OrbitControls
            makeDefault
            enableZoom={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.05}
            dampingFactor={0.08}
          />
        </Canvas>

        {/* Floating Glassmorphic Interactive Controls */}
        <div className="hero-stage-glass-overlay">
          {activeTab === "physics" && (
            <div className="stage-controls-row">
              <button
                type="button"
                className={`stage-switch-btn ${isClosed ? "is-closed" : "is-open"}`}
                onClick={() => setIsClosed(!isClosed)}
              >
                <Zap size={15} /> {isClosed ? t.switchClose : t.switchOpen}
              </button>
              <span className="stage-telemetry-badge">
                <b>{isClosed ? "25.7 mA" : "0.0 mA"}</b> · {t.physicsTelemetry}
              </span>
            </div>
          )}

          {activeTab === "biology" && (
            <div className="stage-controls-row">
              <button
                type="button"
                className={`stage-action-pill ${exploded ? "is-on" : ""}`}
                onClick={() => setExploded(!exploded)}
              >
                <Layers size={15} /> {exploded ? t.assembleLayers : t.explodeLayers}
              </button>
              <button
                type="button"
                className={`stage-action-pill ${showRays ? "is-on" : ""}`}
                onClick={() => setShowRays(!showRays)}
              >
                <Sun size={15} /> {t.toggleRays}
              </button>
              <span className="stage-telemetry-badge">{t.biologyTelemetry}</span>
            </div>
          )}

          {activeTab === "chemistry" && (
            <div className="stage-controls-row">
              <button
                type="button"
                className={`stage-action-pill ${isDipped ? "is-on" : ""}`}
                onClick={() => setIsDipped(!isDipped)}
              >
                <RotateCw size={15} /> {isDipped ? t.pullStrip : t.dipStrip}
              </button>
              <div className="stage-ph-selector">
                <button
                  type="button"
                  className={`ph-chip ph-acid ${solution === "acid" ? "is-active" : ""}`}
                  onClick={() => setSolution("acid")}
                >
                  {t.acid}
                </button>
                <button
                  type="button"
                  className={`ph-chip ph-neutral ${solution === "neutral" ? "is-active" : ""}`}
                  onClick={() => setSolution("neutral")}
                >
                  {t.neutral}
                </button>
                <button
                  type="button"
                  className={`ph-chip ph-base ${solution === "base" ? "is-active" : ""}`}
                  onClick={() => setSolution("base")}
                >
                  {t.base}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Humanized Scientific Footer */}
      <div className="hero-stage-footer">
        <div className="hero-stage-info">
          <b>
            {activeTab === "physics"
              ? t.physicsHeading
              : activeTab === "biology"
              ? t.biologyHeading
              : t.chemistryHeading}
          </b>
          <p>
            {activeTab === "physics"
              ? t.physicsDesc
              : activeTab === "biology"
              ? t.biologyDesc
              : t.chemistryDesc}
          </p>
        </div>
        <Link
          to="/login"
          className={`hero-stage-cta cta-${activeTab}`}
        >
          <span>
            {activeTab === "physics"
              ? t.physicsCta
              : activeTab === "biology"
              ? t.biologyCta
              : t.chemistryCta}
          </span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

