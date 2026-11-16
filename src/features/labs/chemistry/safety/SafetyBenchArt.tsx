import { Beaker, FlaskConical, Glasses, ShieldCheck, TestTube2, TriangleAlert } from "lucide-react";
import "./safety-scenario.css";

export function SafetyBenchArt({ sceneId }: { sceneId?: string }) {
  const Heating = sceneId === "heat-tube" ? TestTube2 : FlaskConical;
  return <div className="safety-art" aria-hidden="true" data-thumbnail-ready>
    <div className="safety-art__bench" />
    <div className="safety-art__bottle"><Heating /><TriangleAlert className="safety-art__warning" /></div>
    <Beaker className="safety-art__beaker" />
    <div className="safety-art__gear"><Glasses /><ShieldCheck /></div>
  </div>;
}
