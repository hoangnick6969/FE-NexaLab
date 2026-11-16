import { Bounds } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { FL06_LEVER_EXPLORE_CONFIG } from "@nexalab/sim/mechanics";
import { reagentById, type VesselVisualState } from "@nexalab/sim/wet-bench";
import { FL15_SAFETY_CONFIG, safetyScenarioReagentById } from "@nexalab/sim/safety-scenario";
import { Dropper3D, ReagentBottle3D, TestTube3D } from "../chemistry/wet-bench/kit/apparatus3d";
import { FIXTURE_RENDERERS, VESSEL_RENDERERS } from "../chemistry/wet-bench/kit/apparatus-renderers";
import { bottleCategory, CLEAR, reagentLook } from "../chemistry/wet-bench/kit/liquid-look";
import { Beaker3D } from "../shared/items/beaker";
import { safetyApparatus } from "../chemistry/safety/SafetyBenchStage";
import { Stopwatch3D } from "../shared/items/stopwatch";
import { Thermometer3D } from "../shared/items/thermometer";
import { K5Hanger } from "../physics/mechanics/kit/K5Stage";
import { weightSetThumbnailKey } from "../physics/mechanics/explore/kit-items";
import { k2LabConfigs } from "../chemistry/wet-bench/labs";
import { listWetBenchKitItems } from "../chemistry/wet-bench/kit/kit-items";
import { listSafetyKitItems } from "../chemistry/safety/kit-items";
import { physicsKitScenes } from "./physics-kit-thumbnail-scenes";
import { accommodationFromLensPower } from "../biology/anatomy/kit/eye-geometry";
import { EyeModel } from "../biology/anatomy/kit/EyeModel";
import { Thermometer3D as PondThermometer3D } from "../biology/ecology/kit/Thermometer3D";
import { PeaPlant3D } from "../biology/genetics/MendelGarden3D";
import { fl27GeneConfig } from "../biology/molecular/gene-protein/fl27-gene.config";
import { pairDna, parseDna } from "../biology/molecular/kit/k7-codons";
import { DnaDuplex3D } from "../biology/molecular/kit/molecules/DnaDuplex3D";
import { helixSpec } from "../biology/molecular/kit/k7-geometry";

const empty: VesselVisualState = {
  liquidLevel: 0, liquidTint: null, indicator: null, gasBubbles: { intensity: "none", gasId: null },
  precipitate: null, solids: [], stoppered: false, powder: null,
};
const emptyVessel = { visual: empty, look: CLEAR, flashAt: null };
const coding = parseDna(fl27GeneConfig.variants[0].coding);
const helix = helixSpec(fl27GeneConfig.structure);
const reagents = new Set([
  ...Object.values(k2LabConfigs).flatMap(listWetBenchKitItems),
  ...listSafetyKitItems(FL15_SAFETY_CONFIG),
].filter(({ category }) => category === "material").map(({ id }) => id));

export const kitScenes: Record<string, ReactNode> = {
  ...Object.fromEntries(Object.entries(VESSEL_RENDERERS).map(([key, { Body }]) =>
    [`kit/chemistry/${key}`, <Body {...emptyVessel} wasteMicroliters={0} />])),
  ...Object.fromEntries(Object.entries(FIXTURE_RENDERERS).map(([key, { Body }]) =>
    [`kit/chemistry/${key}`, <Body scaleReading="0,00 g" clockReading="00:00" clockRunning={false} />])),
  "kit/chemistry/test_tube": <group rotation-z={-0.32}><TestTube3D {...emptyVessel} /></group>,
  "kit/chemistry/dropper_pipette": <group rotation-z={-0.55}><Dropper3D /></group>,
  "kit/chemistry/beaker_100ml": <Beaker3D fill={0} liquid={CLEAR} />,
  ...Object.fromEntries(Object.entries(safetyApparatus)
    .filter(([key]) => key !== "test_tube" && key !== "beaker_100ml")
    .map(([key, Apparatus]) => [`kit/chemistry/${key}`, <Apparatus />])),
  "kit/physics/stopwatch": <Stopwatch3D reading="00:00" />,
  "kit/physics/thermometer": <Thermometer3D fill={0.25} reading="25,0 °C" />,
  "kit/physics/weight_set": <K5Hanger kind="WEIGHT" />,
  "kit/physics/spring_gauge": <K5Hanger kind="GAUGE" />,
  ...physicsKitScenes,
  "kit/biology/garden-plot": <PeaPlant3D position={[0, 0, 0]} genotype="Aa" />,
  "kit/explore-support/eye-model": <group rotation-z={-Math.PI / 2}>
    <EyeModel axialMm={22.6} accommodation={accommodationFromLensPower(20)} pupilMm={2.5} sectioned highlight={null} />
  </group>,
  "kit/biology/gene-strand": <group rotation-z={0.25}>
    {/* Bounds fits before the DNA sets its instance matrices on the first frame. */}
    <mesh visible={false}><boxGeometry args={[coding.length * helix.rise + 0.7, 2.7, 2.7]} /></mesh>
    <DnaDuplex3D structure={fl27GeneConfig.structure} upper={coding} lower={coding.map(pairDna)} />
  </group>,
  "kit/biology/thermometer": <PondThermometer3D valueDeciC={250} label="" animate={false} position={[0, 0, 0]} />,
  ...Object.fromEntries([...reagents].map((id) => {
      const reagent = reagentById(id) ?? safetyScenarioReagentById(id);
      if (!reagent) throw new Error(`Missing thumbnail reagent: ${id}`);
      return [`kit/chemistry/reagent-${id}`, <ReagentBottle3D
        look={reagentLook(reagent)} category={bottleCategory(reagent)}
        solid={reagent.composition.kind === "solid" || reagent.composition.kind === "powder"}
      />];
    })),
  ...Object.fromEntries((FL06_LEVER_EXPLORE_CONFIG.classTemplates ?? []).flatMap((template) => template.weightOptions.map((set) =>
    [`kit/physics/${weightSetThumbnailKey(set)}`, <group rotation-y={-0.36}>
      {set.map((_, index) => <group key={index} position={[index * 0.46, 0, 0]}><K5Hanger kind="WEIGHT" /></group>)}
    </group>]))),
};

export function KitThumbnailScene({ children, cameraPosition = [2, 2.3, 5] }: { children: ReactNode; cameraPosition?: [number, number, number] }) {
  return <Canvas orthographic camera={{ position: cameraPosition, zoom: 100 }} gl={{ localClippingEnabled: true }} dpr={1} frameloop="demand">
    <color attach="background" args={["#526d70"]} />
    <hemisphereLight args={["#f7fcff", "#789196", 2]} />
    <directionalLight position={[1, 3, 4]} intensity={2} />
    <directionalLight position={[-3, 1, -2]} intensity={1.2} />
    <Bounds fit clip margin={1.35}>{children}</Bounds>
  </Canvas>;
}
