import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { PhysicsStage } from "../../shared/PhysicsStage";
import { LabSceneContext } from "../../../shared/LabSpace";

export type K5Attachment = { kind: "WEIGHT" | "GAUGE"; positionMillimetres: number; forceMilliNewtons: number };
export type K5Tilt = "TILT_LEFT" | "LEVEL" | "TILT_RIGHT";
export const K5_HOLES = [-250, -200, -150, -100, -50, 0, 50, 100, 150, 200, 250] as const;
const angle = (tilt: K5Tilt) => tilt === "TILT_LEFT" ? .18 : tilt === "TILT_RIGHT" ? -.18 : 0;
const newtons = (mN: number) => `${(mN / 1000).toFixed(1).replace(".", ",")} N`;

/** The SVG is a complete, legible alternate view of the same model output. */
export function K5Stage2D({ attachments, tilt }: { attachments: readonly K5Attachment[]; tilt: K5Tilt }) {
  return <div className="k5-visual k5-visual-2d" role="img" aria-label={`Thanh đòn ${tilt === "LEVEL" ? "nằm ngang" : tilt === "TILT_LEFT" ? "nghiêng trái" : "nghiêng phải"}. ${attachments.length} dụng cụ đang gắn.`}>
    <svg viewBox="0 0 700 350" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="700" height="350" fill="#e4e8e5" />
      <rect x="40" y="285" width="620" height="22" rx="5" fill="#ad794c" />
      <path d="M350 190 L310 280 L390 280 Z" fill="#647478" stroke="#354145" strokeWidth="3" />
      <circle cx="350" cy="190" r="14" fill="#c5cdd0" stroke="#354145" strokeWidth="3" />
      <g transform={`rotate(${-angle(tilt) * 180 / Math.PI} 350 190)`}>
        <rect x="90" y="179" width="520" height="22" rx="5" fill="#b48151" stroke="#63452e" strokeWidth="3" />
        {K5_HOLES.map((position, index) => <g key={position}><circle cx={100 + index * 50} cy="190" r="7" fill="#29383a" stroke="#e4d9bb" strokeWidth="2" /><text x={100 + index * 50} y="170" textAnchor="middle" fontSize="13" fill="#243039">{position}</text></g>)}
        {attachments.map(item => { const x = 350 + item.positionMillimetres; return <g key={item.positionMillimetres}><line x1={x} x2={x} y1="198" y2="230" stroke="#354145" strokeWidth="3" /><rect x={x - 25} y="230" width="50" height="38" rx="5" fill={item.kind === "GAUGE" ? "#e2b65e" : "#6d8390"} stroke="#354145" strokeWidth="2" /><text x={x} y="253" textAnchor="middle" fontSize="12" fill="#1d2b30">{newtons(item.forceMilliNewtons)}</text></g>; })}
      </g>
      <text x="350" y="335" textAnchor="middle" fontSize="16" fill="#263238">O = 0 mm · 11 lỗ, cách nhau 50 mm</text>
    </svg>
  </div>;
}

function Apparatus({ attachments, tilt, reduced }: { attachments: readonly K5Attachment[]; tilt: K5Tilt; reduced: boolean }) {
  const bar = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!bar.current) return;
    const target = angle(tilt);
    bar.current.rotation.z = reduced ? target : THREE.MathUtils.damp(bar.current.rotation.z, target, 7, delta);
  });
  return <group position={[0, .5, 0]}>
    <mesh position={[0, -.25, 0]} castShadow><cylinderGeometry args={[.55, .85, .6, 4]} /><meshStandardMaterial color="#77858a" metalness={.45} roughness={.35} /></mesh>
    <mesh position={[0, 0, .12]} castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.13, .13, .5, 32]} /><meshStandardMaterial color="#c2ccd0" metalness={.8} roughness={.25} /></mesh>
    <group ref={bar}>
      <mesh castShadow><boxGeometry args={[5.2, .18, .28]} /><meshStandardMaterial color="#ab7649" roughness={.5} /></mesh>
      {K5_HOLES.map(position => <group key={position} position={[position / 100, .105, .16]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.06, .013, 8, 16]} /><meshStandardMaterial color={position === 0 ? "#eab653" : "#243a42"} metalness={.55} roughness={.35} /></mesh><mesh position={[0, .09, 0]}><boxGeometry args={[.012, .09, .012]} /><meshStandardMaterial color="#f5ede0" /></mesh><Html position={[0, .3, .1]} center style={{ pointerEvents: "none" }}><span className={`k5-3d-mark${position === 0 ? " k5-3d-mark-origin" : ""}`}>{position === 0 ? "O · 0" : position > 0 ? `+${position}` : position}</span></Html></group>)}
      {attachments.map(item => <group key={item.positionMillimetres} position={[item.positionMillimetres / 100, -.28, .08]}>
        <mesh castShadow><cylinderGeometry args={[.035, .035, .42, 8]} /><meshStandardMaterial color="#5b6869" metalness={.7} roughness={.3} /></mesh>
        <mesh position={[0, -.28, 0]} castShadow><cylinderGeometry args={[.18, .18, .2, 24]} /><meshStandardMaterial color={item.kind === "GAUGE" ? "#dfae52" : "#6d8390"} metalness={.35} roughness={.45} /></mesh>
      </group>)}
    </group>
  </group>;
}

export function K5Stage3D({ attachments, tilt, reduced }: { attachments: readonly K5Attachment[]; tilt: K5Tilt; reduced: boolean }) {
  return <div className="k5-visual k5-visual-3d" aria-label="Bàn đòn bẩy 3D"><LabSceneContext.Provider value={undefined}><PhysicsStage realism frameloop="always" view={{ wide: { position: [0, 2.9, 6.8], target: [0, .35, 0] }, narrow: { position: [0, 4.4, 9], target: [0, .2, 0] }, fitWidth: 5.4, maxDistance: 14 }}><Apparatus attachments={attachments} tilt={tilt} reduced={reduced} /></PhysicsStage></LabSceneContext.Provider></div>;
}
