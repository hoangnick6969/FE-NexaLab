import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { CircuitBulb3DStage } from "../physics/electricity/CircuitBulb3DStage";
import { EmInduction3DStage } from "../physics/electricity/induction/EmInduction3DStage";
import { Density3DStage } from "../physics/fluid/density/Density3DStage";
import type { BenchViewPreset, StageView } from "../physics/shared/PhysicsStage";
import { defaultDensityEvidence } from "../physics/fluid/density/density-evidence";
import { WetBenchStage } from "../chemistry/wet-bench/WetBenchStage";
import { GeneProtein3DStage } from "../biology/molecular/gene-protein/GeneProtein3DStage";
import { defaultGeneEvidence } from "../biology/molecular/gene-protein/gene-evidence";
import { initialGeneBench } from "../biology/molecular/gene-protein/gene-bench";
import { initialBench } from "../physics/fluid/density/Density2DStage";
import { FluidBench3D, OverflowCan3D, SpringDynamometer3D, ForceVectorOverlay3D, Specimen3D, k3Specimen, k3Material } from "../physics/fluid/kit";
import { fl03DensityConfig } from "../physics/fluid/density/fl03-density.config";
import { K5Stage3D } from "../physics/mechanics/kit/K5Stage";
import { ThermalBench3D } from "../physics/thermal/kit/ThermalBenchStage";
import { AnatomyStage } from "../biology/anatomy/kit/AnatomyStage";
import { EyeModel } from "../biology/anatomy/kit/EyeModel";
import { accommodationFromLensPower } from "../biology/anatomy/kit/eye-geometry";
import { EYE_CENTRE, EYE_ROTATION, OpticsRays } from "../biology/anatomy/eye-optics/EyeOpticsActivity";
import { PondView3D } from "../biology/ecology/tolerance/PondView3D";
import "../biology/ecology/tolerance/EcologyToleranceActivity.css";
import { FoodWebView3D } from "../biology/ecology/food-web/FoodWebView3D";
import { ENERGY_CHAIN, type SpeciesId } from "../biology/ecology/food-web/fw-evidence";
import { FOOD_WEB_SPECIES } from "@nexalab/sim";
import "../biology/ecology/food-web/FoodWebActivity.css";
import "../shared/LabSpace.css";
import { WetBenchKitStage } from "../chemistry/wet-bench/kit/WetBenchKitStage";
import { benchReducer, initialBenchState, type BenchAction, type BenchUiState } from "../chemistry/wet-bench/kit/bench-reducer";
import { fl11Config, fl12Config, fl13Config, fl14aConfig } from "../chemistry/wet-bench/labs";
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/** K2 explore benches: a mid-session state built from the same reducer actions a student would perform. */
function k2Thumbnail(config: ChemistryLabConfig, steps: Array<Record<string, unknown>>, view: BenchViewPreset = k2ThumbnailView) {
  const played = steps.reduce<BenchUiState>((current, step) => benchReducer(current, { now: 0, ...step } as BenchAction), initialBenchState(config));
  const state: BenchUiState = { ...played, focusVesselId: null, notice: null, banner: null };
  return <div className="k2-thumbnail">
    <WetBenchKitStage state={state} dispatch={() => undefined} hovered={null} onHover={() => undefined} viewResetSignal={0} view={view} />
    {/* Text tags are hidden so the card reads in any language (and kit.css is not loaded here). */}
    <style>{`.k2-vessel-tag, .k2-bottle-tag, .k2-strip-chip, .k2-drag-tag, .k2-lcd, .lab-item-lcd { display: none !important; }`}</style>
  </div>;
}
/** Capture-only framing: the tube rack and the reagent shelf fill the card, no HUD insets. */
const k2ThumbnailView: BenchViewPreset = {
  wide: { position: [-0.45, 1.35, 1.75], target: [-0.45, 0.25, -0.3] },
  narrow: { position: [-0.45, 1.35, 1.75], target: [-0.45, 0.25, -0.3] },
  minDistance: 0.8, maxDistance: 6,
};
const dropper = { type: "hold", held: { kind: "tool", tool: "dropper", apparatusId: "dropper" } };
const fill = (reagentId: string, vesselId: string) => [{ type: "click_bottle", reagentId }, { type: "click_vessel", vesselId }];

/** FL-13: acids, water and bases side by side; phenolphthalein pink in both bases, litmus strips dipped in acid, water and vinegar. */
const acidBaseThumbnail = () => k2Thumbnail(fl13Config, [
  dropper, { type: "preset", microliters: 1000 },
  ...fill("HCl_0_1M", "T1"), ...fill("NaOH_0_1M", "T2"), ...fill("H2O_distilled", "T3"),
  ...fill("CH3COOH_0_1M", "T4"), ...fill("CaOH2_0_01M", "T5"),
  { type: "click_bottle", reagentId: "phenolphthalein_indicator" }, { type: "click_vessel", vesselId: "T2" }, { type: "click_vessel", vesselId: "T5" },
  { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "litmus_paper", apparatusId: "litmus" } },
  { type: "click_vessel", vesselId: "T1" }, { type: "click_vessel", vesselId: "T3" }, { type: "click_vessel", vesselId: "T4" },
  { type: "release" },
]);

/** FL-14a: Zn, Fe and Cu each in dilute HCl, and an iron nail in CuSO4. */
const metalReactivityThumbnail = () => k2Thumbnail(fl14aConfig, [
  dropper, { type: "preset", microliters: 1000 },
  ...fill("HCl_0_1M", "T1"), ...fill("HCl_0_1M", "T2"), ...fill("HCl_0_1M", "T3"), ...fill("CuSO4_0_1M", "T4"),
  { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "tongs", apparatusId: "tongs" } },
  ...fill("Zn_granule", "T1"), ...fill("Fe_nail", "T2"), ...fill("Cu_foil", "T3"), ...fill("Fe_nail", "T4"),
  { type: "release" },
]);

/** FL-11: CuSO4 dissolved to a blue solution in the beaker, a flask of NaCl filled to its mark, and water in the cylinder. */
const solutionConcentrationView: BenchViewPreset = {
  wide: { position: [-0.4, 1.0, 1.95], target: [-0.4, 0.2, 0.3] },
  narrow: { position: [-0.4, 1.0, 1.95], target: [-0.4, 0.2, 0.3] },
  minDistance: 0.8, maxDistance: 6,
};
const spoon = (reagentId: string, milligrams: number) => [
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } }, { type: "click_bottle", reagentId },
  { type: "set_powder", milligrams }, { type: "click_vessel", vesselId: "B1" }, { type: "release" },
];
const solutionConcentrationThumbnail = () => k2Thumbnail(fl11Config, [
  ...spoon("CuSO4_powder", 2500),
  { type: "click_bottle", reagentId: "H2O_pour" }, { type: "preset", microliters: 25000 },
  { type: "click_vessel", vesselId: "B1" }, { type: "click_vessel", vesselId: "B1" }, { type: "click_vessel", vesselId: "G1" }, { type: "preset", microliters: 10000 }, { type: "click_vessel", vesselId: "G1" },
  { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "glass_rod", apparatusId: "rod" } }, { type: "click_vessel", vesselId: "B1" }, { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } }, { type: "click_bottle", reagentId: "NaCl_powder" }, { type: "set_powder", milligrams: 585 },
  { type: "click_vessel", vesselId: "V1" }, { type: "release" },
  { type: "click_bottle", reagentId: "H2O_pour" }, { type: "preset", microliters: 25000 }, { type: "click_vessel", vesselId: "V1" }, { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "glass_rod", apparatusId: "rod" } }, { type: "click_vessel", vesselId: "V1" }, { type: "release" },
  { type: "fill_mark", vesselId: "V1" },
], solutionConcentrationView);

/** FL-12: three stoppered flasks after 40 simulated seconds: chips in 0,1 M, chips in 0,2 M and powder in 0,1 M, bubbling at different rates. */
const reactionRateView: BenchViewPreset = {
  wide: { position: [0.3, 1.15, 2.2], target: [0.3, 0.2, 0.5] },
  narrow: { position: [0.3, 1.15, 2.2], target: [0.3, 0.2, 0.5] },
  minDistance: 0.8, maxDistance: 6,
};
const stopFlask = (vesselId: string) => [{ type: "hold", held: { kind: "tool", tool: "stopper", apparatusId: "stopper" } }, { type: "click_vessel", vesselId }];
const reactionRateThumbnail = () => k2Thumbnail(fl12Config, [
  ...stopFlask("F1"), ...stopFlask("F2"), ...stopFlask("F3"),
  { type: "hold", held: { kind: "tool", tool: "tongs", apparatusId: "tongs" } }, { type: "click_bottle", reagentId: "CaCO3_chips" },
  { type: "click_vessel", vesselId: "F1" }, { type: "click_vessel", vesselId: "F2" }, { type: "release" },
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } }, { type: "click_bottle", reagentId: "CaCO3_powder" },
  { type: "click_vessel", vesselId: "F3" }, { type: "release" },
  { type: "wait", seconds: 10 },
], reactionRateView);

const densityThumbnailView: StageView = {
  position: [-0.25, 1.28, 1.95], target: [-0.4, 0.3, 0.08],
  narrowPosition: [-0.25, 1.28, 1.95], narrowTarget: [-0.4, 0.3, 0.08],
  minDistance: 1, maxDistance: 3,
};

/** FL-16: sectioned eye with a ray fan focused on the retina (normal eye, object at 25 cm, lens 20 D). Capture-only framing. */
const eyeOpticsThumbnail = () => <div className="eye-thumbnail">
  <AnatomyStage label="FL-16 eye" focus={null} cameraPosition={[0.85, 0.6, -6.2]} target={EYE_CENTRE}>
    <group rotation={EYE_ROTATION}>
      <EyeModel axialMm={22.6} accommodation={accommodationFromLensPower(20)} pupilMm={2.5} sectioned highlight={null} />
      <OpticsRays axialMm={22.6} objectDistanceM={0.25} providedPowerD={63} inFocus />
    </group>
  </AnatomyStage>
  <style>{`.eye-thumbnail .anatomy-stage { width: 1280px; height: 720px; aspect-ratio: auto; min-height: 0; border: 0; border-radius: 0; }`}</style>
</div>;

/** FL-20: the cut-open pond at 28 °C with the cá rô phi school swimming (inside its tolerance range). */
const ecologyThumbnail = () => <div className="eco-thumbnail">
  <PondView3D valueDeciC={280} fish="persists" vigor={0.9} label="FL-20 pond" valueLabel="28,0 °C" layoutKey="thumbnail" />
  <style>{`.eco-thumbnail { position: relative; width: 1280px; height: 720px; }`}</style>
</div>;

/** FL-21: the meadow diorama with every food → eater arrow and the energy chain lit; labels are hidden so the card reads in any language. */
const foodWebThumbnail = () => <div className="fw-thumbnail">
  <FoodWebView3D names={Object.fromEntries(Object.keys(FOOD_WEB_SPECIES).map((id) => [id, id])) as Record<SpeciesId, string>}
    roleNames={{ PRODUCER: "", CONSUMER: "", DECOMPOSER: "" }} effectNames={{ INCREASE: "", DECREASE: "", NO_DIRECT_EFFECT: "" }}
    removedLabel="" chain={[...ENERGY_CHAIN]} label="FL-21 meadow" illustrative="" layoutKey="thumbnail" />
  <style>{`.fw-thumbnail { position: relative; width: 1280px; height: 720px; } .fw-thumbnail .fw-meadow-labels, .fw-thumbnail .fw-meadow-note { display: none; }`}</style>
</div>;

const scenes: Record<string, () => ReactNode> = {
  "acid-base-indicators": acidBaseThumbnail,
  "metal-reactivity": metalReactivityThumbnail,
  "solution-concentration": solutionConcentrationThumbnail,
  "reaction-rate": reactionRateThumbnail,
  "food-web": foodWebThumbnail,
  "ecology-tolerance": ecologyThumbnail,
  "thermal-energy": () => <ThermalBench3D output={{ elapsedMilliseconds: 50000, meterReadingMilliJoules: 2100000, thermometerReadingMilliCelsius: 30000, riseMilliCelsius: 5000, heaterState: "ON" }} />,
  buoyancy: () => {
    const kit = fl03DensityConfig;
    const specimen = k3Specimen(kit, "iron-1v");
    return <FluidBench3D view={{ position: [.45, 1.8, 2.8], target: [0, .65, .1], narrowPosition: [.45, 1.8, 2.8], narrowTarget: [0, .65, .1], minDistance: .6, maxDistance: 4 }}>
      <OverflowCan3D collectedMl={10} />
      <group position={[0, 160, 0]}><SpringDynamometer3D forceN={.667} /></group>
      <group position={[0, 48, 0]}><Specimen3D specimen={specimen} material={k3Material(kit, specimen.materialId)} /><ForceVectorOverlay3D weightN={.765} buoyantForceN={.098} position={[20, 20, 50]} /></group>
    </FluidBench3D>;
  },
  "eye-optics": eyeOpticsThumbnail,
  circuit: () => <CircuitBulb3DStage closed switchIsActive={false} onToggleSwitch={() => undefined} isLit />,
  "em-induction": () => <EmInduction3DStage
    cue={{ action: null, nonce: 0, startedAt: 0 }}
    observation={null}
    restTravel={0}
    reduced
    showField={false}
    pole="N"
    circuit="CLOSED"
    activeTarget={null}
    onActivate={() => undefined}
    viewResetSignal={0}
  />,
  density: () => <Density3DStage
    station="pebble"
    evidence={defaultDensityEvidence()}
    bench={{ ...initialBench(), onPan: true, exploreId: "iron-1v" }}
    view={densityThumbnailView}
  />,
  "mass-conservation": () => <WetBenchStage mixed pouring={false} scaleReading="435,0 g" onContextLost={() => undefined} />,
  "gene-protein": () => <GeneProtein3DStage station="structure" evidence={defaultGeneEvidence()} bench={initialGeneBench("structure")} />,
  "lever-equilibrium": () => <div className="k5-thumbnail-close"><K5Stage3D attachments={[
    { kind: "WEIGHT", positionMillimetres: -150, forceMilliNewtons: 1500 },
    { kind: "WEIGHT", positionMillimetres: 100, forceMilliNewtons: 1000 },
  ]} tilt="LEVEL" reduced />
    <style>{`.k5-thumbnail-close .physics-stage { --k5-thumbnail-zoom: 1; } .k5-thumbnail-close canvas { transform: scale(1.35); }`}</style>
  </div>,
};

const labId = new URLSearchParams(location.search).get("lab");
document.documentElement.dataset.labThumbnailIds = Object.keys(scenes).join(",");

function Scene() {
  const scene = labId ? scenes[labId] : undefined;
  return scene ? scene() : <p>Unknown lab thumbnail fixture: {labId ?? "(none)"}</p>;
}

function CapturePage() {
  return <main className="capture-scene" data-lab-id={labId ?? ""}>
    <Scene />
  </main>;
}

document.body.innerHTML = '<div id="root"></div>';
document.documentElement.lang = "en";
document.body.style.cssText = "margin:0;width:1280px;height:720px;overflow:hidden;background:#dfe3e1";
const captureStyle = document.createElement("style");
captureStyle.textContent = `
  html, body, #root { width: 1280px; height: 720px; margin: 0; overflow: hidden; }
  .capture-scene { position: relative; width: 1280px; height: 720px; overflow: hidden; background: #dfe3e1; }
  .capture-scene .physics-stage { position: relative !important; inset: auto !important; width: 1280px !important; height: 720px !important; z-index: 0 !important; }
  .capture-scene canvas { display: block; width: 100% !important; height: 100% !important; }
`;
document.head.append(captureStyle);
createRoot(document.getElementById("root")!).render(<CapturePage />);
