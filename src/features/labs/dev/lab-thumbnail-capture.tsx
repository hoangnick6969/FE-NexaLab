import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { CircuitBulb3DStage } from "../physics/electricity/CircuitBulb3DStage";
import { EmInduction3DStage } from "../physics/electricity/induction/EmInduction3DStage";
import { Density3DStage } from "../physics/fluid/density/Density3DStage";
import type { StageView } from "../physics/shared/PhysicsStage";
import { defaultDensityEvidence } from "../physics/fluid/density/density-evidence";
import { WetBenchStage } from "../chemistry/wet-bench/WetBenchStage";
import { GeneProtein3DStage } from "../biology/molecular/gene-protein/GeneProtein3DStage";
import { defaultGeneEvidence } from "../biology/molecular/gene-protein/gene-evidence";
import { initialGeneBench } from "../biology/molecular/gene-protein/gene-bench";
import { initialBench } from "../physics/fluid/density/Density2DStage";
import "../shared/LabSpace.css";

const densityThumbnailView: StageView = {
  position: [-0.25, 1.28, 1.95], target: [-0.4, 0.3, 0.08],
  narrowPosition: [-0.25, 1.28, 1.95], narrowTarget: [-0.4, 0.3, 0.08],
  minDistance: 1, maxDistance: 3,
};

const scenes: Record<string, () => ReactNode> = {
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
