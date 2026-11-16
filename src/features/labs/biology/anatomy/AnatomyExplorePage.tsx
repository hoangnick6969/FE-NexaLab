/**
 * `/labs/:id` page of kit `anatomy` (FL-16 studio, Kit bổ trợ). The student picks a released eye scenario, then sets
 * the lens power and, if needed, glasses; the eye shows where the image forms. 3D reuses the Guided eye-optics studio
 * (`AnatomyStage`, `EyeModel` cut open, `OpticsRays`); 2D is a ray diagram from the same display optics. The power the
 * eye needs comes from `eye-optics@1.0.0` (`fl16PowerResult`); "on the retina" uses the rubric tolerance. Explore only.
 */
import { useEffect, useMemo, useState } from "react";
import { EYE_OPTICS_SCENARIOS, GLASSES_POWER_RANGE_D, LENS_POWER_RANGE_D, POWER_STEP_D } from "@nexalab/sim/eye-optics";
import type { AnatomyExploreConfig } from "@nexalab/sim/explore-kits";
import { fl16PowerResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { AnatomyStage } from "./kit/AnatomyStage";
import { EyeModel } from "./kit/EyeModel";
import { accommodationFromLensPower } from "./kit/eye-geometry";
import { CORNEA_POWER_D, FOCUS_TOLERANCE_D, traceEye } from "./kit/optics";
import { EYE_CENTRE, EYE_ROTATION, OpticsRays } from "./eye-optics/EyeOpticsActivity";
import { EyeRayDiagram2D } from "./EyeRayDiagram2D";
import { anatomyBench, anatomySummary } from "./anatomy-bench";
import "./eye-optics/eye-optics.css";
import "./anatomy-explore.css";

const CLOSE_VIEW: [number, number, number] = [1.7, 1.3, -12];
const dioptre = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")} D`;

export default function AnatomyExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as AnatomyExploreConfig;
  const scenarios = EYE_OPTICS_SCENARIOS.filter((item) => config.spec.allowedScenarios.includes(item.id));
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const [lensPowerD, setLensPowerD] = useState<number>(LENS_POWER_RANGE_D.min);
  const [glassesPowerD, setGlassesPowerD] = useState(0);
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const shown = can3d ? view : "2d";
  useEffect(() => { setLensPowerD(LENS_POWER_RANGE_D.min); setGlassesPowerD(0); }, [scenarioId]);

  const scenario = scenarios.find((item) => item.id === scenarioId);
  const result = scenarioId ? fl16PowerResult(scenarioId) : null;
  const axialMm = (scenario?.axialLengthM ?? 0.0226) * 1000;
  const objectDistanceM = scenario?.objectDistanceM ?? null;
  const providedPowerD = CORNEA_POWER_D + lensPowerD + glassesPowerD;
  const trace = useMemo(() => traceEye({ axialMm, objectDistanceM, providedPowerD }), [axialMm, objectDistanceM, providedPowerD]);
  const defocusD = result ? providedPowerD - result.powerD : 0;
  const inFocus = Math.abs(defocusD) <= FOCUS_TOLERANCE_D + 1e-9;
  const offset = trace.imageOffsetMm ?? 0;
  const imageText = inFocus ? "Ảnh rõ, nằm trên võng mạc" : offset > 0 ? `Ảnh hội tụ trước võng mạc ${Math.abs(offset).toFixed(1).replace(".", ",")} mm` : `Ảnh hội tụ sau võng mạc ${Math.abs(offset).toFixed(1).replace(".", ",")} mm`;
  const stageLabel = `Mô hình mắt cắt dọc, ${scenario?.label ?? ""}. ${imageText}.`;
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={shown} onChange={setView} /></LabHeaderSlot> : null;
  const status = <span className="explore-status" data-tone={inFocus ? "ok" : "warn"} data-testid="eye-image-status">{imageText}</span>;

  const scene = shown === "3d"
    ? <>
        {toggle}
        <AnatomyStage label={stageLabel} focus={null} cameraPosition={CLOSE_VIEW} target={EYE_CENTRE}>
          <group rotation={EYE_ROTATION}>
            <EyeModel axialMm={axialMm} accommodation={accommodationFromLensPower(lensPowerD)} pupilMm={2.5} sectioned highlight={null} />
            <OpticsRays axialMm={axialMm} objectDistanceM={objectDistanceM} providedPowerD={providedPowerD} inFocus={inFocus} />
          </group>
        </AnatomyStage>
        <div className="explore-overlay" data-testid="anatomy-page">
          <h2>Studio mắt · anatomy · {scenario?.label}</h2>
          {status}
          <p className="explore-field-hint">Kéo để xoay mô hình. Tia xanh và cam đi qua giác mạc, thể thủy tinh rồi tới võng mạc; chấm đỏ là nơi tia thực sự hội tụ.</p>
        </div>
      </>
    : <div className="anatomy-2d" data-testid="anatomy-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Studio mắt · anatomy</span><h2>{scenario?.label}</h2></div>
          {status}
        </header>
        <EyeRayDiagram2D axialMm={axialMm} objectDistanceM={objectDistanceM} providedPowerD={providedPowerD} lensPowerD={lensPowerD} glassesPowerD={glassesPowerD} inFocus={inFocus} label={stageLabel} />
      </div>;

  const controls = <>
    <label className="explore-field">Kịch bản
      <select className="explore-select" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} aria-label="Kịch bản">
        {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label className="explore-field">
      <span className="explore-field-row"><span>Độ tụ thể thủy tinh (điều tiết)</span><span className="explore-field-value">{dioptre(lensPowerD)}</span></span>
      <input className="explore-range" type="range" min={LENS_POWER_RANGE_D.min} max={LENS_POWER_RANGE_D.max} step={POWER_STEP_D} value={lensPowerD}
        onChange={(event) => setLensPowerD(Number(event.target.value))} aria-valuetext={dioptre(lensPowerD)} />
      <span className="explore-range-scale" aria-hidden="true"><span>{LENS_POWER_RANGE_D.min} D · thả lỏng</span><span>{LENS_POWER_RANGE_D.max} D</span></span>
    </label>
    <label className="explore-field">
      <span className="explore-field-row"><span>Kính đeo</span><span className="explore-field-value">{glassesPowerD === 0 ? "không đeo" : dioptre(glassesPowerD)}</span></span>
      <input className="explore-range" type="range" min={GLASSES_POWER_RANGE_D.min} max={GLASSES_POWER_RANGE_D.max} step={POWER_STEP_D} value={glassesPowerD}
        onChange={(event) => setGlassesPowerD(Number(event.target.value))} aria-valuetext={glassesPowerD === 0 ? "không đeo kính" : dioptre(glassesPowerD)} />
      <span className="explore-range-scale" aria-hidden="true"><span>−10 D · phân kỳ</span><span>0</span><span>+10 D · hội tụ</span></span>
    </label>
  </>;

  const readout = scenario && result && <>
    {status}
    <dl>
      <dt>Độ tụ cần có</dt><dd data-testid="eye-power">{result.powerD.toFixed(2).replace(".", ",")} D (trục mắt {(scenario.axialLengthM * 1000).toFixed(1).replace(".", ",")} mm)</dd>
      <dt>Đang có</dt><dd>{providedPowerD.toFixed(2).replace(".", ",")} D = giác mạc {CORNEA_POWER_D} D + thể thủy tinh {lensPowerD.toFixed(2).replace(".", ",")} D{glassesPowerD ? ` + kính ${dioptre(glassesPowerD)}` : ""}</dd>
      <dt>Chênh lệch</dt><dd>{dioptre(defocusD)}</dd>
    </dl>
  </>;

  const journalSummary = scenarioId ? `${anatomySummary(scenarioId)}; đang đặt ${providedPowerD.toFixed(2)} D${glassesPowerD ? ` (kính ${dioptre(glassesPowerD)})` : ""}: ${imageText.toLowerCase()}` : "";
  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={anatomyBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout || undefined} sceneKind={shown === "3d" ? "full" : "card"} testId="anatomy-bench"
    journalSummary={journalSummary} canSave={Boolean(scenarioId)} />;
}
