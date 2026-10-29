import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { Zap, Eye, FlaskConical, ArrowRight, Layers, Sun, RotateCw } from "lucide-react";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    sectionTitle: "Khám phá phòng lab tương tác 3D",
    sectionDesc: "Xoay, phóng to, bóc tách cấu tạo và vận hành thí nghiệm khoa học trực quan trong không gian 3D chân thực.",
    tabPhysics: "Vật lý: Mạch điện & Đèn 3D",
    tabBiology: "Sinh học: Giải phẫu Mắt 3D",
    tabChemistry: "Hóa học: Bình phản ứng 3D",
    
    // Physics
    physicsTitle: "Định luật Ôm & Dòng điện trong mạch kín",
    physicsDesc: "Khi đóng công tắc, dòng electron chuyển dịch qua dây dẫn, đốt nóng dây tóc vonfram làm bóng đèn phát sáng và tỏa nhiệt.",
    physicsSwitchOn: "ĐÓNG MẠCH",
    physicsSwitchOff: "NGẮT MẠCH",
    physicsCurrent: "Dòng điện: 25.7 mA",
    physicsVolt: "Hiệu điện thế: 9.0 V",
    physicsRes: "Điện trở: 350 Ω",
    physicsHint: "Click công tắc để quan sát dây tóc phát sáng và dòng electron di chuyển",
    enterPhysics: "Vào phòng lab Vật lý",

    // Biology
    biologyTitle: "Quang hình học nhãn cầu & Đường truyền ánh sáng",
    biologyDesc: "Ánh sáng đi qua giác mạc, hội tụ qua thể thủy tinh và in hình ảnh ngược chiều lên màng lưới (võng mạc).",
    biologyExplode: "Bóc tách các lớp",
    biologyNormal: "Thu gọn nguyên khối",
    biologyRay: "Hiện tia sáng quang học",
    biologyRayOff: "Ẩn tia sáng",
    biologyHint: "Kéo chuột hoặc ngón tay để xoay 360°, cuộn để phóng to",
    enterBiology: "Vào phòng lab Sinh học",

    // Chemistry
    chemistryTitle: "Thử nghiệm pH & Phản ứng đổi màu quỳ tím",
    chemistryDesc: "Giấy quỳ tím đóng vai trò chất chỉ thị màu: chuyển đỏ khi gặp axit, giữ màu tím trong môi trường trung tính và chuyển xanh khi gặp bazơ.",
    acidBtn: "Dung dịch Axit (pH 2)",
    neutralBtn: "Nước cất (pH 7)",
    baseBtn: "Dung dịch Bazơ (pH 12)",
    dipBtn: "Nhúng giấy quỳ vào cốc",
    resetDip: "Rút giấy quỳ lên",
    enterChemistry: "Vào phòng lab Hóa học",
  },
  en: {
    sectionTitle: "Interactive 3D Lab Explorer",
    sectionDesc: "Rotate, inspect, dissect structures, and operate physical science experiments in real-time 3D.",
    tabPhysics: "Physics: 3D Circuit & Bulb",
    tabBiology: "Biology: 3D Eye Anatomy",
    tabChemistry: "Chemistry: 3D Reaction Beaker",

    // Physics
    physicsTitle: "Ohm's Law & Closed Circuit Current",
    physicsDesc: "Closing the switch allows electrons to flow through copper wires, heating the tungsten filament until it glows brightly.",
    physicsSwitchOn: "CIRCUIT CLOSED",
    physicsSwitchOff: "CIRCUIT OPEN",
    physicsCurrent: "Current: 25.7 mA",
    physicsVolt: "Voltage: 9.0 V",
    physicsRes: "Resistance: 350 Ω",
    physicsHint: "Click the switch to ignite the filament and observe electron flow",
    enterPhysics: "Enter Physics Lab",

    // Biology
    biologyTitle: "Eye Anatomy & Optical Ray Tracing",
    biologyDesc: "Light refracts through the cornea, focuses through the crystalline lens, and projects onto the photoreceptive retina.",
    biologyExplode: "Exploded layers",
    biologyNormal: "Assembled view",
    biologyRay: "Show light rays",
    biologyRayOff: "Hide rays",
    biologyHint: "Drag to rotate 360°, scroll to zoom in/out",
    enterBiology: "Enter Biology Lab",

    // Chemistry
    chemistryTitle: "pH Indicator & Litmus Color Transition",
    chemistryDesc: "Litmus serves as a natural pH indicator: turning red in acid, purple in neutral water, and deep blue in alkaline solutions.",
    acidBtn: "Acidic Solution (pH 2)",
    neutralBtn: "Pure Water (pH 7)",
    baseBtn: "Alkaline Solution (pH 12)",
    dipBtn: "Dip Litmus Paper",
    resetDip: "Withdraw Paper",
    enterChemistry: "Enter Chemistry Lab",
  },
});
const t = text();

/* =========================================================================
   1. 3D PHYSICS SCENE: CIRCUIT WORKBENCH WITH FILAMENT & POINT LIGHT
========================================================================= */

function ElectronFlow({ active }: { active: boolean }) {
  const count = 18;
  const particlesRef = useRef<THREE.Group>(null);

  // Wire loop path: Rectangle on the table
  const points = useMemo(() => {
    return [
      new THREE.Vector3(-2.2, 0.08, -1.2),
      new THREE.Vector3(2.2, 0.08, -1.2),
      new THREE.Vector3(2.2, 0.08, 1.2),
      new THREE.Vector3(-2.2, 0.08, 1.2),
    ];
  }, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, true), [points]);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current) return;
    particlesRef.current.children.forEach((mesh, i) => {
      const u = (Date.now() * 0.0003 + i / count) % 1;
      const pos = curve.getPointAt(u);
      mesh.position.copy(pos);
    });
  });

  if (!active) return null;

  return (
    <group ref={particlesRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={points[0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}
    </group>
  );
}

function Physics3DScene({ isSwitchOn, onToggleSwitch }: { isSwitchOn: boolean; onToggleSwitch: () => void }) {
  const switchArmRef = useRef<THREE.Group>(null);
  const filamentIntensity = isSwitchOn ? 4.5 : 0;

  useFrame(() => {
    if (switchArmRef.current) {
      // Smoothly animate switch arm angle
      const targetAngle = isSwitchOn ? 0 : -0.55; // 0 rad = closed, ~-30 deg = open
      switchArmRef.current.rotation.z = THREE.MathUtils.lerp(switchArmRef.current.rotation.z, targetAngle, 0.2);
    }
  });

  return (
    <group position={[0, -0.4, 0]}>
      {/* Workbench Table Surface */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.1, 3.6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Circuit Wires (Thick Rounded Traces) */}
      <mesh position={[0, 0.02, -1.2]}>
        <boxGeometry args={[4.4, 0.03, 0.06]} />
        <meshStandardMaterial color={isSwitchOn ? "#f59e0b" : "#94a3b8"} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 1.2]}>
        <boxGeometry args={[4.4, 0.03, 0.06]} />
        <meshStandardMaterial color={isSwitchOn ? "#f59e0b" : "#94a3b8"} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-2.2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.03, 2.4]} />
        <meshStandardMaterial color={isSwitchOn ? "#f59e0b" : "#94a3b8"} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[2.2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.03, 2.4]} />
        <meshStandardMaterial color={isSwitchOn ? "#f59e0b" : "#94a3b8"} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Electron particles */}
      <ElectronFlow active={isSwitchOn} />

      {/* Battery (Left) */}
      <group position={[-2.2, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.7, 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        {/* Terminals */}
        <mesh position={[0, 0.38, -0.2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          <meshStandardMaterial color="#ef4444" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.38, 0.2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Interactive Knife Switch (Front: z=1.2) */}
      <group position={[0, 0.08, 1.2]}>
        {/* Switch base */}
        <mesh>
          <boxGeometry args={[1.1, 0.08, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
        {/* Left post */}
        <mesh position={[-0.35, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Right contact clip */}
        <mesh position={[0.35, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Rotating arm (Clickable) */}
        <group
          ref={switchArmRef}
          position={[-0.35, 0.18, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwitch();
          }}
        >
          <mesh position={[0.35, 0, 0]}>
            <boxGeometry args={[0.7, 0.06, 0.08]} />
            <meshStandardMaterial color="#b45309" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Insulated handle */}
          <mesh position={[0.72, 0.05, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* Resistor (Back: z=-1.2) */}
      <group position={[0, 0.15, -1.2]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.7, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
        </mesh>
        {/* Color bands */}
        <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.105, 0.105, 0.05, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.105, 0.105, 0.05, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>

      {/* 3D Light Bulb (Right: x=2.2) */}
      <group position={[2.2, 0.55, 0]}>
        {/* Metal base */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.35, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Glass envelope */}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.52, 32, 32]} />
          <meshStandardMaterial
            color={isSwitchOn ? "#fef08a" : "#f8fafc"}
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={isSwitchOn ? 0.75 : 0.35}
            emissive={isSwitchOn ? "#f59e0b" : "#000000"}
            emissiveIntensity={isSwitchOn ? 0.8 : 0}
          />
        </mesh>

        {/* Glowing Tungsten Filament */}
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.025, 16, 32, Math.PI * 1.5]} />
          <meshStandardMaterial
            color={isSwitchOn ? "#ffffff" : "#475569"}
            emissive={isSwitchOn ? "#fef08a" : "#000000"}
            emissiveIntensity={filamentIntensity}
          />
        </mesh>

        {/* Real 3D Point Light casting warm illumination on table */}
        {isSwitchOn && (
          <>
            <pointLight position={[0, 0.2, 0]} color="#fbbf24" intensity={4.5} distance={7} decay={1.8} />
            {/* Soft halo sprite */}
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.7, 16, 16]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.18} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/* =========================================================================
   2. 3D BIOLOGY SCENE: 3D EYE ANATOMY & LIGHT RAY CONVERGENCE
========================================================================= */

function Biology3DScene({ exploded, showRays }: { exploded: boolean; showRays: boolean }) {
  const eyeGroupRef = useRef<THREE.Group>(null);
  const factor = exploded ? 1.6 : 1.0;

  // Gentle idle rotation
  useFrame((_, delta) => {
    if (eyeGroupRef.current) {
      eyeGroupRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <group ref={eyeGroupRef} position={[0, 0, 0]}>
      {/* 1. Sclera (Outer White Protective Shell) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.35, 36, 36]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.05} transparent opacity={exploded ? 0.25 : 0.88} />
      </mesh>

      {/* 2. Cornea (Clear Front Bulge) */}
      <mesh position={[0, 0, 1.25 * factor]}>
        <sphereGeometry args={[0.78, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.1} transparent opacity={0.65} />
      </mesh>

      {/* 3. Iris (Colored Ring) */}
      <mesh position={[0, 0, 0.95 * factor]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.26, 0.72, 32]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. Pupil (Central Dark Aperture) */}
      <mesh position={[0, 0, 0.96 * factor]}>
        <circleGeometry args={[0.26, 32]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* 5. Crystalline Lens (Biconvex Transparent Lens) */}
      <mesh position={[0, 0, 0.65 * factor]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.62, 32, 24]} />
        <meshStandardMaterial color="#fef08a" roughness={0.15} metalness={0.05} transparent opacity={0.7} />
      </mesh>

      {/* 6. Retina (Internal Hemispherical Screen at Back) */}
      <mesh position={[0, 0, -0.7 * factor]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[1.15, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <meshStandardMaterial color="#f87171" roughness={0.5} side={THREE.BackSide} />
      </mesh>

      {/* 7. Optic Nerve (Extending from rear to brain) */}
      <mesh position={[0, 0, -1.75 * factor]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.8, 20]} />
        <meshStandardMaterial color="#fde047" roughness={0.5} />
      </mesh>

      {/* 8. Optical Light Rays (Simulating Light Convergence) */}
      {showRays && (
        <group>
          {/* Ray 1 (Top converging) */}
          <mesh position={[0, 0.25, 0.45]} rotation={[-0.14, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
          </mesh>
          {/* Ray 2 (Central axis) */}
          <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.95} />
          </mesh>
          {/* Ray 3 (Bottom converging) */}
          <mesh position={[0, -0.25, 0.45]} rotation={[0.14, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 2.8, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
          </mesh>
          {/* Focal point spot on Retina */}
          <mesh position={[0, 0, -1.05 * factor]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* =========================================================================
   3. 3D CHEMISTRY SCENE: GLASS BEAKER, FLUID REACTION & LITMUS TEST
========================================================================= */

type SolutionType = "acid" | "neutral" | "base";

function Chemistry3DScene({ solution, isDipped }: { solution: SolutionType; isDipped: boolean }) {
  const paperRef = useRef<THREE.Group>(null);
  const bubblesRef = useRef<THREE.Group>(null);

  // Colors based on solution pH
  const liquidColor = solution === "acid" ? "#f43f5e" : solution === "neutral" ? "#a855f7" : "#2563eb";
  const tipColor = solution === "acid" ? "#e11d48" : solution === "neutral" ? "#9333ea" : "#1d4ed8";

  // Rising bubbles animation
  useFrame((_, delta) => {
    if (bubblesRef.current) {
      bubblesRef.current.children.forEach((bubble) => {
        bubble.position.y += delta * 0.4;
        if (bubble.position.y > 0.8) {
          bubble.position.y = -0.7;
          bubble.position.x = (Math.random() - 0.5) * 0.9;
          bubble.position.z = (Math.random() - 0.5) * 0.9;
        }
      });
    }

    // Smooth dip movement
    if (paperRef.current) {
      const targetY = isDipped ? 0.2 : 1.35;
      paperRef.current.position.y = THREE.MathUtils.lerp(paperRef.current.position.y, targetY, 0.15);
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* 3D Glass Beaker */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 2.0, 32, 1, true]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.08} metalness={0.1} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Beaker bottom */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.05, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.1} transparent opacity={0.4} />
      </mesh>
      {/* Measurement marks (white ticks) */}
      {[-0.4, 0, 0.4].map((y, idx) => (
        <mesh key={idx} position={[0.98, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.04, 0.25, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* 3D Solution Fluid inside beaker */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.65, 32]} />
        <meshStandardMaterial color={liquidColor} roughness={0.15} metalness={0.05} transparent opacity={0.82} />
      </mesh>

      {/* Effervescent Rising Bubbles */}
      <group ref={bubblesRef}>
        {[
          [-0.3, -0.6, 0.2, 0.045],
          [0.35, -0.2, -0.25, 0.06],
          [-0.15, 0.1, -0.3, 0.05],
          [0.2, -0.5, 0.35, 0.04],
          [0.1, 0.3, 0.1, 0.055],
        ].map(([bx, by, bz, size], i) => (
          <mesh key={i} position={[bx, by, bz]}>
            <sphereGeometry args={[size, 14, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} transparent opacity={0.65} />
          </mesh>
        ))}
      </group>

      {/* 3D Litmus Paper Strip */}
      <group ref={paperRef} position={[0, 1.35, 0]}>
        {/* Upper dry section */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.24, 0.7, 0.02]} />
          <meshStandardMaterial color="#c084fc" roughness={0.8} />
        </mesh>
        {/* Lower reacting tip (dips into liquid) */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.24, 0.6, 0.02]} />
          <meshStandardMaterial color={isDipped ? tipColor : "#c084fc"} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/* =========================================================================
   MAIN 3D LAB SHOWCASE COMPONENT
========================================================================= */

export function Lab3DShowcase() {
  const [activeTab, setActiveTab] = useState<"physics" | "biology" | "chemistry">("physics");

  // Physics state
  const [isSwitchOn, setIsSwitchOn] = useState(true);

  // Biology state
  const [exploded, setExploded] = useState(false);
  const [showRays, setShowRays] = useState(true);

  // Chemistry state
  const [solution, setSolution] = useState<SolutionType>("acid");
  const [isDipped, setIsDipped] = useState(true);

  return (
    <section className="landing-3d-section" id="phong-lab">
      <div className="landing-3d-header">
        <h2>{t.sectionTitle}</h2>
        <p>{t.sectionDesc}</p>

        {/* Apple-style Segmented Control */}
        <div className="lab-segmented-bar">
          <button
            type="button"
            className={`seg-btn ${activeTab === "physics" ? "is-active" : ""}`}
            onClick={() => setActiveTab("physics")}
          >
            <Zap size={17} /> {t.tabPhysics}
          </button>
          <button
            type="button"
            className={`seg-btn ${activeTab === "biology" ? "is-active" : ""}`}
            onClick={() => setActiveTab("biology")}
          >
            <Eye size={17} /> {t.tabBiology}
          </button>
          <button
            type="button"
            className={`seg-btn ${activeTab === "chemistry" ? "is-active" : ""}`}
            onClick={() => setActiveTab("chemistry")}
          >
            <FlaskConical size={17} /> {t.tabChemistry}
          </button>
        </div>
      </div>

      <div className="lab-3d-workbench">
        {/* WebGL Canvas Viewport */}
        <div className="lab-canvas-container">
          <Canvas
            camera={{ position: [0, 2.8, 5.2], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            className="showcase-webgl-canvas"
          >
            <ambientLight intensity={1.8} />
            <directionalLight position={[6, 9, 6]} intensity={2.2} castShadow />

            {activeTab === "physics" && (
              <Physics3DScene isSwitchOn={isSwitchOn} onToggleSwitch={() => setIsSwitchOn(!isSwitchOn)} />
            )}
            {activeTab === "biology" && (
              <Biology3DScene exploded={exploded} showRays={showRays} />
            )}
            {activeTab === "chemistry" && (
              <Chemistry3DScene solution={solution} isDipped={isDipped} />
            )}

            <OrbitControls
              makeDefault
              enableZoom={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.1}
              dampingFactor={0.08}
            />
          </Canvas>

          {/* Interactive floating toolbar on canvas */}
          <div className="canvas-interactive-overlay">
            {activeTab === "physics" && (
              <div className="overlay-tools">
                <button
                  type="button"
                  className={`overlay-action-btn ${isSwitchOn ? "btn-on" : "btn-off"}`}
                  onClick={() => setIsSwitchOn(!isSwitchOn)}
                >
                  <Zap size={15} /> {isSwitchOn ? t.physicsSwitchOn : t.physicsSwitchOff}
                </button>
                <span className="overlay-telemetry">
                  <b>{isSwitchOn ? t.physicsCurrent : "0.0 mA"}</b> · {t.physicsVolt} · {t.physicsRes}
                </span>
              </div>
            )}

            {activeTab === "biology" && (
              <div className="overlay-tools">
                <button
                  type="button"
                  className={`overlay-action-btn ${exploded ? "btn-active" : ""}`}
                  onClick={() => setExploded(!exploded)}
                >
                  <Layers size={15} /> {exploded ? t.biologyNormal : t.biologyExplode}
                </button>
                <button
                  type="button"
                  className={`overlay-action-btn ${showRays ? "btn-active" : ""}`}
                  onClick={() => setShowRays(!showRays)}
                >
                  <Sun size={15} /> {showRays ? t.biologyRayOff : t.biologyRay}
                </button>
              </div>
            )}

            {activeTab === "chemistry" && (
              <div className="overlay-tools chem-tools">
                <button
                  type="button"
                  className={`overlay-action-btn ${isDipped ? "btn-active" : ""}`}
                  onClick={() => setIsDipped(!isDipped)}
                >
                  <RotateCw size={15} /> {isDipped ? t.resetDip : t.dipBtn}
                </button>
                <div className="ph-toggles">
                  <button
                    type="button"
                    className={`ph-pill ph-acid ${solution === "acid" ? "is-sel" : ""}`}
                    onClick={() => setSolution("acid")}
                  >
                    Axit (pH 2)
                  </button>
                  <button
                    type="button"
                    className={`ph-pill ph-neutral ${solution === "neutral" ? "is-sel" : ""}`}
                    onClick={() => setSolution("neutral")}
                  >
                    Nước cất (pH 7)
                  </button>
                  <button
                    type="button"
                    className={`ph-pill ph-base ${solution === "base" ? "is-sel" : ""}`}
                    onClick={() => setSolution("base")}
                  >
                    Bazơ (pH 12)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Educational Insight Card */}
        <div className="lab-insight-panel">
          {activeTab === "physics" && (
            <div className="insight-content">
              <span className="insight-badge badge-physics">VẬT LÝ THCS · LỚP 9</span>
              <h3>{t.physicsTitle}</h3>
              <p>{t.physicsDesc}</p>
              <div className="insight-metrics">
                <div className="metric-box">
                  <span className="metric-val">{isSwitchOn ? "25.7 mA" : "0.0 mA"}</span>
                  <span className="metric-lbl">Cường độ (I)</span>
                </div>
                <div className="metric-box">
                  <span className="metric-val">9.0 V</span>
                  <span className="metric-lbl">Hiệu điện thế (U)</span>
                </div>
                <div className="metric-box">
                  <span className="metric-val">350 Ω</span>
                  <span className="metric-lbl">Điện trở (R)</span>
                </div>
              </div>
              <p className="insight-hint">{t.physicsHint}</p>
              <Link to="/login" className="insight-cta cta-physics">
                {t.enterPhysics} <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {activeTab === "biology" && (
            <div className="insight-content">
              <span className="insight-badge badge-biology">SINH HỌC THCS · LỚP 8</span>
              <h3>{t.biologyTitle}</h3>
              <p>{t.biologyDesc}</p>
              <div className="insight-keypoints">
                <div className="keypoint-item">
                  <b>Giác mạc & Thể thủy tinh</b>
                  <small>Thấu kính hội tụ bẻ cong ánh sáng chính xác về võng mạc.</small>
                </div>
                <div className="keypoint-item">
                  <b>Màng lưới (Võng mạc)</b>
                  <small>Tập trung hàng triệu tế bào cảm thụ ánh sáng chuyển thành xung thần kinh.</small>
                </div>
              </div>
              <p className="insight-hint">{t.biologyHint}</p>
              <Link to="/login" className="insight-cta cta-biology">
                {t.enterBiology} <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {activeTab === "chemistry" && (
            <div className="insight-content">
              <span className="insight-badge badge-chemistry">HÓA HỌC THCS · LỚP 8–9</span>
              <h3>{t.chemistryTitle}</h3>
              <p>{t.chemistryDesc}</p>
              <div className="insight-keypoints">
                <div className="keypoint-item">
                  <b>Hiện tượng quỳ tím</b>
                  <small>
                    {solution === "acid"
                      ? "Môi trường giàu ion H⁺ làm quỳ tím chuyển màu đỏ tươi."
                      : solution === "neutral"
                      ? "Nồng độ H⁺ và OH⁻ cân bằng, giữ nguyên sắc tím tự nhiên."
                      : "Môi trường giàu ion OH⁻ làm quỳ tím chuyển màu xanh thẫm."}
                  </small>
                </div>
              </div>
              <Link to="/login" className="insight-cta cta-chemistry">
                {t.enterChemistry} <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

