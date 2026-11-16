import { Html } from "@react-three/drei";
import { reagentById, type VesselVisualState } from "@nexalab/sim/wet-bench";
import type { SafetyApparatusKind } from "@nexalab/sim/safety-scenario";
import type { ReactNode } from "react";
import { defineText } from "../../../../i18n";
import { PhysicsStage, type BenchViewPreset } from "../../physics/shared/PhysicsStage";
import type { KitItem } from "../../runtime/explore-registry";
import { Beaker3D } from "../../shared/items/beaker";
import { LabSceneContext } from "../../shared/LabSpace";
import { ReagentBottle3D, TestTube3D } from "../wet-bench/kit/apparatus3d";
import { bottleCategory, CLEAR, reagentLook } from "../wet-bench/kit/liquid-look";
import "./safety-scenario.css";

const text = defineText({ vi: { scene: "Cảnh phòng thí nghiệm 3D" }, en: { scene: "3D laboratory scene" } });
const view: BenchViewPreset = {
  wide: { position: [0.22, 1.28, 2.12], target: [0, 0.19, 0] },
  narrow: { position: [0.22, 1.28, 2.12], target: [0, 0.19, 0] },
  minDistance: 1.35, maxDistance: 4, fitWidth: 2.6,
};
const emptyTube: VesselVisualState = {
  liquidLevel: 0, liquidTint: null, indicator: null, gasBubbles: { intensity: "none", gasId: null },
  precipitate: null, solids: [], stoppered: false, powder: null,
};

function Goggles() {
  return <group position={[0, 0.075, 0]}>
    {[-0.108, 0.108].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh><boxGeometry args={[0.202, 0.13, 0.07]} /><meshStandardMaterial color="#4b7180" /></mesh>
      <mesh position={[0, 0, 0.037]}><boxGeometry args={[0.174, 0.104, 0.01]} /><meshStandardMaterial color="#c0e3ec" metalness={0.15} roughness={0.16} /></mesh>
    </group>)}
    <mesh position={[0, 0.018, 0]}><boxGeometry args={[0.06, 0.033, 0.06]} /><meshStandardMaterial color="#4b7180" /></mesh>
    <mesh position={[0, -0.022, -0.074]} scale={[1.08, 0.48, 1]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.175, 0.011, 8, 32]} /><meshStandardMaterial color="#334155" />
    </mesh>
  </group>;
}

function Gloves() {
  return <group rotation-y={0.12}>
    {[-0.103, 0.103].map((x, side) => <group key={x} position={[x, 0.028, side * 0.03]} rotation-y={side ? 0.14 : -0.14}>
      <mesh><boxGeometry args={[0.122, 0.028, 0.15]} /><meshStandardMaterial color="#537bb8" /></mesh>
      {[0, 1, 2, 3].map(finger => <mesh key={finger} position={[-0.044 + finger * 0.029, 0, -0.102]}>
        <boxGeometry args={[0.024, 0.026, 0.083 - Math.abs(1 - finger) * 0.012]} /><meshStandardMaterial color="#6c94d1" />
      </mesh>)}
    </group>)}
  </group>;
}

function LabCoat() {
  return <group position={[0, 0.027, 0]} rotation-y={-0.14}>
    <mesh><boxGeometry args={[0.28, 0.043, 0.34]} /><meshStandardMaterial color="#f6f8f6" /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * 0.148, 0, -0.07]} rotation-y={side * -0.42}>
      <boxGeometry args={[0.083, 0.037, 0.225]} /><meshStandardMaterial color="#e1e8e5" />
    </mesh>)}
    <mesh position={[0, 0.023, 0]}><boxGeometry args={[0.012, 0.003, 0.31]} /><meshStandardMaterial color="#9caeaa" /></mesh>
  </group>;
}

function TubeHolder() {
  return <group position={[0, 0.031, 0]} rotation-y={0.45}>
    {[-1, 1].map(side => <mesh key={side} position={[0, 0, side * 0.042]} rotation-y={side * 0.08}>
      <boxGeometry args={[0.38, 0.036, 0.038]} /><meshStandardMaterial color="#c99561" />
    </mesh>)}
    <mesh position={[0.035, 0.016, 0]}>
      <boxGeometry args={[0.038, 0.025, 0.116]} /><meshStandardMaterial color="#68737d" metalness={0.55} />
    </mesh>
  </group>;
}

function AlcoholLamp() {
  return <>
    <mesh position={[0, 0.077, 0]}><cylinderGeometry args={[0.10, 0.135, 0.154, 32]} /><meshStandardMaterial color="#9bb6c5" roughness={0.3} /></mesh>
    <mesh position={[0, 0.169, 0]}><cylinderGeometry args={[0.064, 0.072, 0.054, 24]} /><meshStandardMaterial color="#475569" metalness={0.55} /></mesh>
    <mesh position={[0, 0.207, 0]}><cylinderGeometry args={[0.016, 0.016, 0.025, 12]} /><meshStandardMaterial color="#55504a" /></mesh>
  </>;
}

function UnlabelledBottle() {
  return <>
    <mesh position={[0, 0.124, 0]}><cylinderGeometry args={[0.086, 0.086, 0.246, 28]} /><meshPhysicalMaterial color="#bfd1c7" roughness={0.28} transparent opacity={0.74} /></mesh>
    <mesh position={[0, 0.257, 0]}><cylinderGeometry args={[0.044, 0.086, 0.032, 28]} /><meshStandardMaterial color="#b2c6bb" /></mesh>
    <mesh position={[0, 0.286, 0]}><cylinderGeometry args={[0.046, 0.046, 0.032, 24]} /><meshStandardMaterial color="#263746" /></mesh>
  </>;
}

const apparatus: Record<SafetyApparatusKind, () => ReactNode> = {
  safety_goggles: Goggles, protective_gloves: Gloves, lab_coat: LabCoat,
  beaker_100ml: () => <Beaker3D fill={0} liquid={CLEAR} />,
  test_tube: () => <group position={[0.24, 0.065, 0]} rotation-z={Math.PI / 2}><TestTube3D visual={emptyTube} look={CLEAR} flashAt={null} /></group>,
  test_tube_holder: TubeHolder, alcohol_lamp: AlcoholLamp,
};

export default function SafetyBenchStage({ items, showLabels = true }: { items: readonly KitItem[]; showLabels?: boolean }) {
  const columns = Math.min(3, items.length);
  return <div className="safety-view3d" role="group" aria-label={text().scene} data-testid="safety-scene-3d">
    <LabSceneContext.Provider value={undefined}>
      <PhysicsStage view={view} reflections frameloop="demand">
        {items.map((item, index) => {
          const row = Math.floor(index / columns);
          const rowWidth = Math.min(columns, items.length - row * columns);
          const reagent = reagentById(item.id);
          const Apparatus = item.rendererKey === "unlabelled-bottle" ? UnlabelledBottle : apparatus[item.rendererKey as SafetyApparatusKind];
          return <group key={item.id} position={[(index % columns - (rowWidth - 1) / 2) * 0.68, 0.025, row * 0.58 - 0.22]} scale={1.4}>
            {reagent ? <ReagentBottle3D look={reagentLook(reagent)} category={bottleCategory(reagent)} solid={reagent.composition.kind === "solid" || reagent.composition.kind === "powder"} /> : Apparatus && <Apparatus />}
            {showLabels && item.category === "material" && <Html center position={[0, reagent ? 0.6 : 0.28, 0]} style={{ pointerEvents: "none" }}>
              <span className="safety-bottle-label">{item.labelVi}</span>
            </Html>}
          </group>;
        })}
      </PhysicsStage>
    </LabSceneContext.Provider>
  </div>;
}
