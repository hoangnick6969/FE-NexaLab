import { Bounds } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { FL06_LEVER_EXPLORE_CONFIG } from "@nexalab/sim/mechanics";
import { REAGENTS, type VesselVisualState } from "@nexalab/sim/wet-bench";
import { Dropper3D, ReagentBottle3D, TestTube3D } from "../chemistry/wet-bench/kit/apparatus3d";
import { FIXTURE_RENDERERS, VESSEL_RENDERERS } from "../chemistry/wet-bench/kit/apparatus-renderers";
import { bottleCategory, CLEAR, reagentLook } from "../chemistry/wet-bench/kit/liquid-look";
import { Beaker3D } from "../shared/items/beaker";
import { safetyApparatus } from "../chemistry/safety/SafetyBenchStage";
import { Stopwatch3D } from "../shared/items/stopwatch";
import { Thermometer3D } from "../shared/items/thermometer";
import { K5Hanger } from "../physics/mechanics/kit/K5Stage";
import { weightSetThumbnailKey } from "../physics/mechanics/explore/kit-items";
import { fl13Config } from "../chemistry/wet-bench/labs/fl-13.config";

const empty: VesselVisualState = {
  liquidLevel: 0, liquidTint: null, indicator: null, gasBubbles: { intensity: "none", gasId: null },
  precipitate: null, solids: [], stoppered: false, powder: null,
};
const emptyVessel = { visual: empty, look: CLEAR, flashAt: null };

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
  ...Object.fromEntries((fl13Config.classTemplates ?? []).flatMap((template) => template.reagentGroups.flatMap((group) =>
    group.options.map((id) => {
      const reagent = REAGENTS[id];
      return [`kit/chemistry/reagent-${id}`, <ReagentBottle3D
        look={reagentLook(reagent)} category={bottleCategory(reagent)}
        solid={reagent.composition.kind === "solid" || reagent.composition.kind === "powder"}
      />];
    })))),
  ...Object.fromEntries((FL06_LEVER_EXPLORE_CONFIG.classTemplates ?? []).flatMap((template) => template.weightOptions.map((set) =>
    [`kit/physics/${weightSetThumbnailKey(set)}`, <group rotation-y={-0.36}>
      {set.map((_, index) => <group key={index} position={[index * 0.46, 0, 0]}><K5Hanger kind="WEIGHT" /></group>)}
    </group>]))),
};

export function KitThumbnailScene({ children }: { children: ReactNode }) {
  return <Canvas orthographic camera={{ position: [2, 2.3, 5], zoom: 100 }} dpr={1} frameloop="demand">
    <color attach="background" args={["#526d70"]} />
    <hemisphereLight args={["#f7fcff", "#789196", 2]} />
    <directionalLight position={[1, 3, 4]} intensity={2} />
    <directionalLight position={[-3, 1, -2]} intensity={1.2} />
    <Bounds fit clip margin={1.35}>{children}</Bounds>
  </Canvas>;
}
