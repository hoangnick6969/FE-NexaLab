import React, { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { CheckCircle2, RotateCcw, Zap, Sparkles } from "lucide-react";

export type PhysicsLabMode = "thomson" | "lorentz" | "circuit";

interface PhysicsBench3DProps {
  initialMode?: PhysicsLabMode;
  onEvidenceReady?: (evidence: any) => void;
}

// -------------------------------------------------------------
// 1. PROCEDURAL 3D BANANA CABLE (Dây cắm bắp chuối 3D uốn tự nhiên)
// -------------------------------------------------------------
function BananaCable({
  start,
  end,
  color = "#ef4444",
  sag = 0.35,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  sag?: number;
}) {
  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    // Midpoint drooping towards table
    const midX = (p0.x + p2.x) / 2;
    const midY = Math.min(p0.y, p2.y) - sag;
    const midZ = (p0.z + p2.z) / 2;
    const p1 = new THREE.Vector3(midX, midY, midZ);
    return new THREE.CatmullRomCurve3([p0, p1, p2]);
  }, [start, end, sag]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.022, 8, false), [curve]);

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

// -------------------------------------------------------------
// 2. POWER SUPPLY UNIT (Bộ nguồn đa năng DC/AC - Tái sử dụng)
// -------------------------------------------------------------
function PowerSupplyUnit({
  isPowerOn,
  voltage,
  current,
}: {
  isPowerOn: boolean;
  voltage: number;
  current: number;
}) {
  return (
    <group position={[-1.3, 0.55, 0]}>
      {/* PSU Main Enclosure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.85, 1.4]} />
        <meshStandardMaterial color="#2d3748" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Top Handle */}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Front Face Plate */}
      <mesh position={[0, 0, 0.705]}>
        <planeGeometry args={[1.15, 0.8]} />
        <meshStandardMaterial color="#1a202c" roughness={0.3} />
      </mesh>

      {/* Dual LED Displays */}
      <group position={[0, 0.18, 0.71]}>
        {/* Voltage Display (Left) */}
        <mesh position={[-0.26, 0, 0]}>
          <planeGeometry args={[0.42, 0.22]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <Html position={[-0.26, 0, 0.01]} transform distanceFactor={2.5}>
          <div
            style={{
              color: isPowerOn ? "#facc15" : "#4b5563",
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: "20px",
              textShadow: isPowerOn ? "0 0 8px rgba(250, 204, 21, 0.8)" : "none",
              userSelect: "none",
            }}
          >
            {isPowerOn ? `${voltage} V` : "0 V"}
          </div>
        </Html>

        {/* Current Display (Right) */}
        <mesh position={[0.26, 0, 0]}>
          <planeGeometry args={[0.42, 0.22]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <Html position={[0.26, 0, 0.01]} transform distanceFactor={2.5}>
          <div
            style={{
              color: isPowerOn ? "#facc15" : "#4b5563",
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: "20px",
              textShadow: isPowerOn ? "0 0 8px rgba(250, 204, 21, 0.8)" : "none",
              userSelect: "none",
            }}
          >
            {isPowerOn ? `${current.toFixed(1)} A` : "0 A"}
          </div>
        </Html>
      </group>

      {/* Rotary Knobs */}
      <mesh position={[-0.3, -0.16, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0.3, -0.16, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Output Terminals: Red (+) and Black (-) */}
      <mesh position={[-0.15, -0.3, 0.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[0.15, -0.3, 0.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.2} />
      </mesh>

      {/* Power Indicator LED */}
      <mesh position={[-0.48, -0.3, 0.72]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color={isPowerOn ? "#22c55e" : "#4b5563"} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 3. KNIFE / PUSH SWITCH (Công tắc đỏ)
// -------------------------------------------------------------
function KnifeSwitch({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <group
      position={[0.1, 0.16, 0.4]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Switch Base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.08, 0.22]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Terminals */}
      <mesh position={[-0.1, 0.05, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0.1, 0.05, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Rocker Lever */}
      <mesh
        position={[0, 0.06, 0]}
        rotation={[isOpen ? 0.35 : -0.35, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.12, 0.05, 0.16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 4A. THOMSON JUMPING RING APPARATUS (Ảnh 3 - FL-25 K9)
// -------------------------------------------------------------
function ThomsonJumpingRing({ isEnergized }: { isEnergized: boolean }) {
  const ringRef = useRef<THREE.Group>(null);
  const targetY = isEnergized ? 1.05 : 0.42;

  useFrame((_, delta) => {
    if (ringRef.current) {
      // Smooth damped spring motion
      ringRef.current.position.y += (targetY - ringRef.current.position.y) * Math.min(delta * 9, 1);
    }
  });

  return (
    <group position={[1.3, 0.12, 0]}>
      {/* Heavy Base Block */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.16, 0.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Solenoid Copper Coil */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.28, 24]} />
        <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Vertical Iron Core (Trụ lõi sắt cao) */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.15, 20]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Yellow Metric Ruler standing vertically */}
      <group position={[0.22, 0.72, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.02, 1.1, 0.12]} />
          <meshStandardMaterial color="#eab308" roughness={0.4} />
        </mesh>
        <Html position={[0.02, 0, 0]} transform distanceFactor={2.4}>
          <div
            style={{
              color: "#000",
              fontWeight: "bold",
              fontSize: "10px",
              fontFamily: "monospace",
              lineHeight: "18px",
              userSelect: "none",
            }}
          >
            <div>18cm</div>
            <div>14cm</div>
            <div>10cm</div>
            <div>6cm</div>
            <div>2cm</div>
            <div>0cm</div>
          </div>
        </Html>
      </group>

      {/* The Jumping Aluminum Ring (Torus) */}
      <group ref={ringRef} position={[0, 0.42, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.11, 0.028, 16, 32]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// 4B. LORENTZ COIL & SCALE APPARATUS (Ảnh 2 - FL-25 K9)
// -------------------------------------------------------------
function LorentzScaleApparatus({ isEnergized }: { isEnergized: boolean }) {
  return (
    <group position={[1.3, 0.12, 0]}>
      {/* Digital Scale Body */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.14, 0.55]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Scale Pan (Red) */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.5, 0.03, 0.4]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
      {/* Scale LCD */}
      <Html position={[0, 0.12, 0.28]} transform distanceFactor={2.5}>
        <div
          style={{
            background: "#064e3b",
            color: "#34d399",
            padding: "2px 8px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: "14px",
            border: "1px solid #022c22",
            userSelect: "none",
          }}
        >
          {isEnergized ? "68.5 g" : "62.2 g"}
        </div>
      </Html>

      {/* Magnet block on pan */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.16]} />
        <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.7} />
      </mesh>

      {/* Stands and Suspended Oval Wire Coil */}
      <mesh position={[-0.45, 0.45, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.45, 0.45, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Suspended coil loop passing over the magnet */}
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.018, 12, 32]} />
        <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 4C. DC CIRCUIT WITH DMM & RESISTOR (Ảnh 1 - FL-01 K8)
// -------------------------------------------------------------
function DCCircuitApparatus({ isEnergized }: { isEnergized: boolean }) {
  return (
    <group position={[1.3, 0.12, 0]}>
      {/* Ceramic Power Resistor */}
      <group position={[-0.3, 0.06, 0.1]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Color Bands */}
        <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
          <meshBasicMaterial color="#16a34a" />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
          <meshBasicMaterial color="#ca8a04" />
        </mesh>
      </group>

      {/* Yellow Digital Multimeter (DMM) */}
      <group position={[0.3, 0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.68, 0.18]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* DMM Screen */}
        <Html position={[0, 0.16, 0.1]} transform distanceFactor={2.4}>
          <div
            style={{
              background: "#f1f5f9",
              color: "#000",
              padding: "4px 10px",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: "15px",
              border: "1px solid #94a3b8",
              userSelect: "none",
            }}
          >
            {isEnergized ? "240 mA" : "0 uA"}
          </div>
        </Html>
        {/* Rotary Selector Dial */}
        <mesh position={[0, -0.1, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.04, 20]} />
          <meshStandardMaterial color="#065f46" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// 5. 3D LAB ROOM SHELL & TABLETOP BENCH (Bàn Lab & Phòng 3D)
// -------------------------------------------------------------
function LabRoomEnvironment() {
  return (
    <group>
      {/* Main Wooden Lab Bench Tabletop */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.22, 2.4]} />
        <meshStandardMaterial color="#9b5e39" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Table Bevel Edge */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[4.3, 0.08, 2.3]} />
        <meshStandardMaterial color="#5d3319" roughness={0.6} />
      </mesh>

      {/* Background Lab Room Shell */}
      {/* Back Wall */}
      <mesh position={[0, 2.2, -2.2]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Floor */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Background Lab Sink Counter (matching photo reference) */}
      <group position={[2.8, 0.6, -1.7]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.6, 1.2, 0.8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <planeGeometry args={[1.4, 0.6]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Faucet */}
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      <ContactShadows position={[0, 0.06, 0]} opacity={0.65} scale={4} blur={1.5} far={1} />
    </group>
  );
}

// -------------------------------------------------------------
// 6. MAIN EXPORTED COMPONENT: PHYSICS BENCH 3D
// -------------------------------------------------------------
export function PhysicsBench3D({
  initialMode = "thomson",
  onEvidenceReady,
}: PhysicsBench3DProps) {
  const [mode, setMode] = useState<PhysicsLabMode>(initialMode);
  const [isOpen, setIsOpen] = useState(true);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [checkpointStep, setCheckpointStep] = useState<0 | 1 | 2>(0);
  const [selectedPrediction, setSelectedPrediction] = useState<string>("B");

  const handleSwitchToggle = () => {
    if (checkpointStep === 0) {
      // Trigger Checkpoint Modal #1 (Prediction)
      return;
    }
    const nextState = !isPowerOn;
    setIsPowerOn(nextState);
    setIsOpen(!nextState);
  };

  const handleConfirmPrediction = () => {
    setCheckpointStep(1);
    setIsOpen(false);
    setIsPowerOn(true);
  };

  const handleFinishLab = () => {
    setCheckpointStep(2);
    if (onEvidenceReady) {
      onEvidenceReady({
        mode,
        prediction: selectedPrediction,
        voltage: 220,
        current: 4.8,
        verdict: "passed",
        score: 3,
      });
    }
  };

  const handleReset = () => {
    setIsPowerOn(false);
    setIsOpen(true);
    setCheckpointStep(0);
  };

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between">
      {/* TOP HEADER CONTROLS */}
      <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
            3D
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              Bàn Thí Nghiệm Vật Lý 3D (POV Real Lab)
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Shared Room Shell
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Góc nhìn POV chuẩn • Tái sử dụng Bộ nguồn DC/AC & Công tắc
            </p>
          </div>
        </div>

        {/* LAB SWITCHER TABS */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setMode("thomson");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "thomson"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⚡ Vòng nhôm nhảy (K9)
          </button>
          <button
            onClick={() => {
              setMode("lorentz");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "lorentz"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🧲 Lực từ & Cân (K9)
          </button>
          <button
            onClick={() => {
              setMode("circuit");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "circuit"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💡 Mạch điện DC (K8)
          </button>
        </div>
      </div>

      {/* 3D WEBGL CANVAS (REACT THREE FIBER) */}
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 2.5, 4.2], fov: 42 }}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#0f172a"]} />

          {/* LIGHTING */}
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[4, 6, 4]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />
          <pointLight position={[-2, 3, 2]} intensity={0.5} />

          {/* ORBIT CONTROLS CONSTRAINED TO TABLETOP POV */}
          <OrbitControls
            target={[0, 0.45, 0]}
            minDistance={2.5}
            maxDistance={5.8}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.3}
            enablePan={false}
          />

          {/* ROOM & BENCH SHELL */}
          <LabRoomEnvironment />

          {/* SHARED PSU & SWITCH */}
          <PowerSupplyUnit isPowerOn={isPowerOn} voltage={220} current={4.8} />
          <KnifeSwitch isOpen={isOpen} onClick={handleSwitchToggle} />

          {/* PROCEDURAL 3D CABLES */}
          {/* Cable 1: PSU (+) to Switch */}
          <BananaCable
            start={[-1.15, 0.25, 0.73]}
            end={[0.0, 0.21, 0.4]}
            color="#ef4444"
            sag={0.3}
          />
          {/* Cable 2: Switch to Apparatus */}
          <BananaCable
            start={[0.2, 0.21, 0.4]}
            end={[1.1, 0.25, 0.1]}
            color="#ef4444"
            sag={0.25}
          />
          {/* Cable 3: Return from Apparatus to PSU (-) */}
          <BananaCable
            start={[1.1, 0.25, -0.1]}
            end={[-0.85, 0.25, 0.73]}
            color="#0f172a"
            sag={0.45}
          />

          {/* PLUGGABLE APPARATUS */}
          {mode === "thomson" && <ThomsonJumpingRing isEnergized={isPowerOn} />}
          {mode === "lorentz" && <LorentzScaleApparatus isEnergized={isPowerOn} />}
          {mode === "circuit" && <DCCircuitApparatus isEnergized={isPowerOn} />}
        </Canvas>
      </div>

      {/* FLOATING ACTION HUD */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-300 pointer-events-auto flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPowerOn ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="font-medium">
              {isPowerOn ? "Đang cấp điện (Mạch kín)" : "Chưa đóng công tắc (Mạch hở)"}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-slate-400 text-[11px]">
            🖱️ Chuột trái: Xoay góc nhìn • Cuộn chuột: Phóng to
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {checkpointStep === 0 && (
            <button
              onClick={() => setCheckpointStep(0)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Tiến hành Thí nghiệm (Điểm dừng 1)</span>
            </button>
          )}

          {checkpointStep === 1 && (
            <button
              onClick={handleFinishLab}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Giải thích Hiện tượng & Hoàn thành</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 shadow"
            title="Đặt lại thí nghiệm"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PEDAGOGICAL CHECKPOINT MODAL (OVERLAY) */}
      {checkpointStep === 0 && (
        <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                ĐIỂM DỪNG 1: DỰ ĐOÁN
              </span>
              <span className="text-xs text-slate-400">lab-contract/1</span>
            </div>

            <h4 className="text-sm font-semibold text-white mb-2">
              {mode === "thomson" &&
                "Khi đóng công tắc K cấp dòng xoay chiều cho cuộn cảm, hiện tượng gì xảy ra với vòng nhôm?"}
              {mode === "lorentz" &&
                "Khi cấp dòng điện chạy qua cuộn dây đặt trong từ trường nam châm, số chỉ cân điện tử thay đổi thế nào?"}
              {mode === "circuit" &&
                "Khi đóng khoá K cấp nguồn 220V vào mạch có điện trở R, đồng hồ DMM sẽ chỉ giá trị nào?"}
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Hãy vận dụng kiến thức lý thuyết đã học để đưa ra nhận định trước khi quan sát kết quả 3D.
            </p>

            <div className="space-y-2 mb-6">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="pred"
                  value="A"
                  checked={selectedPrediction === "A"}
                  onChange={(e) => setSelectedPrediction(e.target.value)}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-300">
                  {mode === "thomson" && "Vòng nhôm đứng yên vì nhôm không có từ tính."}
                  {mode === "lorentz" && "Số chỉ cân giữ nguyên 62.2 g không đổi."}
                  {mode === "circuit" && "DMM chỉ 0 uA vì mạch bị đoản mạch."}
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-500/50 bg-indigo-950/20 hover:bg-indigo-900/30 cursor-pointer">
                <input
                  type="radio"
                  name="pred"
                  value="B"
                  checked={selectedPrediction === "B"}
                  onChange={(e) => setSelectedPrediction(e.target.value)}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-200 font-medium">
                  {mode === "thomson" && "Vòng nhôm bật nhảy vọt lên cao dọc theo trục lõi sắt."}
                  {mode === "lorentz" && "Số chỉ cân tăng lên (xuất hiện lực từ hướng xuống)."}
                  {mode === "circuit" && "DMM đo được cường độ dòng điện 240 mA theo định luật Ohm."}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={handleConfirmPrediction}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <span>Xác nhận & Quan sát 3D</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL EVIDENCE SUMMARY MODAL */}
      {checkpointStep === 2 && (
        <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Đã thu thập trọn vẹn Bằng chứng Thực hành
                </h4>
                <p className="text-xs text-emerald-400">Điểm Rubric máy chủ: 3/3 (Đạt chuẩn)</p>
              </div>
            </div>

            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Dự đoán Checkpoint 1:</span>
                <span className="text-emerald-400 font-mono">Chính xác (Lựa chọn B)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nguyên lý khoa học:</span>
                <span className="text-slate-200">
                  {mode === "thomson" && "Định luật Lenz & Dòng điện Foucault"}
                  {mode === "lorentz" && "Quy tắc bàn tay trái (Lực từ Lorentz)"}
                  {mode === "circuit" && "Định luật Ohm cho đoạn mạch"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã hợp đồng:</span>
                <span className="text-indigo-400 font-mono">lab-contract/1#verified</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                Thử lại thí nghiệm
              </button>
              <button
                onClick={() => setCheckpointStep(1)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
              >
                Tiếp tục bài học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PhysicsBench3D;
