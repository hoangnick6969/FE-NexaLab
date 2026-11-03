import { Html } from "@react-three/drei";
import { PhysicsStage } from "../../shared/PhysicsStage";
import { LabSceneContext } from "../../../shared/LabSpace";
import { thermalDegrees, type ThermalObservation } from "../thermal-readings";

const THERMAL_VIEW = { wide: { position: [0, 2.7, 5.3] as [number, number, number], target: [0, .55, 0] as [number, number, number] }, narrow: { position: [0, 3.5, 6.8] as [number, number, number], target: [0, .55, 0] as [number, number, number] }, fitWidth: 4.2, maxDistance: 11 };

export function ThermalBench2D({ output }: { output: ThermalObservation }) {
  const fluidHeight = 8 + Math.max(0, Math.min(10000, output.riseMilliCelsius)) / 10000 * 92;
  return <div className="thermal-scene thermal-2d" role="img" aria-label={`Nhiệt lượng kế: nước 100 g; joulemeter ${output.meterReadingMilliJoules / 1000} J; nhiệt kế ${thermalDegrees(output.thermometerReadingMilliCelsius)} °C`}>
    <svg viewBox="0 0 680 440" aria-hidden="true">
      <rect width="680" height="440" fill="#e4e8e5" />
      <rect x="25" y="345" width="630" height="28" rx="5" fill="#ad794c" />
      <path d="M245 135 L255 320 Q350 352 445 320 L455 135 Z" fill="#e4eceb" stroke="#53666b" strokeWidth="8" />
      <path d="M263 230 L437 230 L433 312 Q350 340 267 312 Z" fill="#72b7ca" />
      <ellipse cx="350" cy="135" rx="105" ry="22" fill="#d9e6e5" stroke="#53666b" strokeWidth="6" />
      <path d="M310 115 L310 275 Q310 295 325 295 L335 295" fill="none" stroke={output.heaterState === "ON" ? "#ca7146" : "#7d716a"} strokeWidth="13" />
      <rect x="385" y="78" width="15" height="205" rx="7" fill="#f4f3e9" stroke="#4f6264" strokeWidth="3" />
      <rect x="390" y={280 - fluidHeight} width="5" height={fluidHeight} fill="#b24d3b" />
      <circle cx="392.5" cy="282" r="9" fill="#b24d3b" />
      <path d="M310 115 L310 65 L140 65 L140 200" fill="none" stroke="#525c60" strokeWidth="4" />
      <rect x="45" y="200" width="160" height="105" rx="12" fill="#52666b" />
      <rect x="57" y="232" width="136" height="43" rx="4" fill="#e7eee0" />
      <text x="125" y="220" textAnchor="middle" fill="#fff" fontSize="15">JOULEMETER</text>
      <text x="125" y="260" textAnchor="middle" fill="#203c36" fontSize="24">{output.meterReadingMilliJoules / 1000} J</text>
      <text x="475" y="112" fill="#243b38" fontSize="22">{thermalDegrees(output.thermometerReadingMilliCelsius)} °C</text>
      <text x="350" y="400" textAnchor="middle" fill="#243b38" fontSize="17">Nước 100 g · nhiệt lượng kế lý tưởng</text>
    </svg>
  </div>;
}

/** K4 owns apparatus; PhysicsStage supplies the shared physical room. */
export function ThermalBench3D({ output }: { output: ThermalObservation }) {
  const fluidHeight = .08 + Math.max(0, Math.min(10000, output.riseMilliCelsius)) / 10000 * .9;
  return <div className="thermal-scene thermal-3d" aria-label="Bàn nhiệt lượng kế 3D">
    <LabSceneContext.Provider value={undefined}>
      <PhysicsStage realism frameloop="demand" view={THERMAL_VIEW}>
        <group position={[.35, .68, 0]}>
          <mesh castShadow><cylinderGeometry args={[.82, .76, 1.25, 48, 1, true]} /><meshStandardMaterial color="#bbd1d3" side={2} transparent opacity={.8} roughness={.3} /></mesh>
          <mesh position={[0, -.45, 0]}><cylinderGeometry args={[.75, .75, .13, 48]} /><meshStandardMaterial color="#5f7476" /></mesh>
          <mesh position={[0, -.17, 0]}><cylinderGeometry args={[.72, .68, .66, 48]} /><meshStandardMaterial color="#62aec5" transparent opacity={.7} roughness={.25} /></mesh>
          <mesh position={[0, .65, 0]}><cylinderGeometry args={[.86, .86, .1, 48]} /><meshStandardMaterial color="#c8d7d4" roughness={.5} /></mesh>
          <mesh position={[-.26, .32, 0]}><cylinderGeometry args={[.055, .055, 1.4, 20]} /><meshStandardMaterial color={output.heaterState === "ON" ? "#c78257" : "#7d716a"} metalness={.5} roughness={.4} /></mesh>
          <group position={[.3, .5, 0]}>
            <mesh><cylinderGeometry args={[.052, .052, 1.66, 20]} /><meshStandardMaterial color="#edf2ed" metalness={.12} roughness={.24} /></mesh>
            <mesh position={[0, -.82 + fluidHeight / 2, .054]}><cylinderGeometry args={[.018, .018, fluidHeight, 12]} /><meshStandardMaterial color="#c84435" emissive="#7c1c14" emissiveIntensity={.18} /></mesh>
            <mesh position={[0, -.82, 0]}><sphereGeometry args={[.075, 18, 14]} /><meshStandardMaterial color="#c84435" emissive="#7c1c14" emissiveIntensity={.18} /></mesh>
            {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[i % 2 === 0 ? -.008 : 0, .48 - i * .12, .056]}><boxGeometry args={[i % 2 === 0 ? .042 : .024, .012, .008]} /><meshStandardMaterial color="#52666b" /></mesh>)}
            <mesh position={[0, .85, 0]}><cylinderGeometry args={[.067, .067, .045, 20]} /><meshStandardMaterial color="#78898a" metalness={.6} roughness={.3} /></mesh>
          </group>
          <Html position={[.8, 1.05, .1]} center style={{ pointerEvents: "none" }}><span className="thermal-instrument-label">{thermalDegrees(output.thermometerReadingMilliCelsius)} °C</span></Html>
        </group>
        <group position={[-1.15, .32, .25]}>
          <mesh castShadow><boxGeometry args={[1, .62, .6]} /><meshStandardMaterial color="#52666b" roughness={.5} /></mesh>
          <Html position={[0, .05, .32]} center transform distanceFactor={4} style={{ pointerEvents: "none" }}><span className="thermal-meter-label">{output.meterReadingMilliJoules / 1000} J</span></Html>
        </group>
        <mesh position={[-.5, .15, .2]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.02, .02, 1.2, 10]} /><meshStandardMaterial color="#485452" /></mesh>
      </PhysicsStage>
    </LabSceneContext.Provider>
  </div>;
}
