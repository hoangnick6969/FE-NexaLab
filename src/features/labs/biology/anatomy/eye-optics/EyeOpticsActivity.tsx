import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { defineText } from "../../../../../i18n";
import { AnatomyStage, CalloutPins, type Callout, type FocusTarget } from "../kit/AnatomyStage";
import { EYE_PART_ANCHORS, EYE_PART_IDS, EyeModel, MM, type EyePartId } from "../kit/EyeModel";
import { accommodationFromLensPower } from "../kit/eye-geometry";
import { CORNEA_POWER_D, FOCUS_TOLERANCE_D, paraxialFan, requiredPowerD, traceEye, type Vec2 } from "../kit/optics";
import {
  DISTANCE_OPTIONS_M, EYE_OPTICS_SCENARIOS, GLASSES_RANGE_D, LENS_RANGE_D, POWER_STEP_D,
  eyeOpticsEvidenceFrom, eyeOpticsEvidenceReady, type EyeOpticsEvidence, type Phase2Attempt, type ScenarioId,
} from "./eye-optics-evidence";
import "./eye-optics.css";

const text = defineText({
  vi: {
    phaseNames: "1. Gọi tên bộ phận", phaseOptics: "2. Điều tiết và kính",
    lockedOptics: "Hoàn thành tên của cả 8 bộ phận để mở phần điều tiết.",
    partLabel: (n: number) => `Tên bộ phận ${n}`, partPlaceholder: "Nhập tên tiếng Việt",
    view: "Xem", viewing: (n: number) => `Đang xem: bộ phận ${n}`,
    partHint: "Chọn “Xem” để đưa camera tới bộ phận, rồi nhập tên của nó.",
    scenario: "Tình huống", distance: "Khoảng cách tới vật", infinity: "Vô cực (xa)",
    lens: "Độ phồng thể thủy tinh (độ tụ, D)", glasses: "Kính đeo (D): âm là phân kỳ, dương là hội tụ",
    rays: "Hiện đường tia", section: "Cắt đôi theo mặt phẳng dọc",
    onRetina: "Ảnh rơi đúng trên màng lưới.",
    before: (mm: string) => `Ảnh rơi ${mm} mm trước màng lưới.`,
    behind: (mm: string) => `Ảnh rơi ${mm} mm sau màng lưới.`,
    blur: (mm: string) => `Vệt loang trên màng lưới: ${mm} mm.`,
    drawnNear: "Vật được vẽ gần hơn tỉ lệ để thấy đường tia; kết quả tính theo khoảng cách thật.",
    stageLabel: "Mô hình 3D nhãn cầu, cắt dọc, có đường tia khi bật",
    labelsLabel: "Danh sách bộ phận cần gọi tên",
    fallback: "Mô hình minh hoạ, không phải mô hình giải phẫu chuẩn y khoa. Mọi thao tác trên 3D cũng có nút tương đương bên cạnh.",
    scenarioName: { "normal-near": "Mắt bình thường, vật ở 25 cm", "myopia-far": "Mắt cận thị nhẹ, vật ở xa", "hyperopia-near": "Mắt viễn thị, vật ở 40 cm" },
    scenarioHelp: "Đặt vật đúng khoảng cách, rồi chỉnh điều tiết và kính để ảnh rơi trên màng lưới.",
  },
  en: {
    phaseNames: "1. Name the parts", phaseOptics: "2. Accommodation and lenses",
    lockedOptics: "Name all 8 parts to unlock accommodation.",
    partLabel: (n: number) => `Name of part ${n}`, partPlaceholder: "Type the name in Vietnamese",
    view: "View", viewing: (n: number) => `Viewing: part ${n}`,
    partHint: "Choose “View” to move the camera to the part, then type its name.",
    scenario: "Scenario", distance: "Object distance", infinity: "Infinity (far)",
    lens: "Lens bulge (lens power, D)", glasses: "Glasses (D): negative diverges, positive converges",
    rays: "Show rays", section: "Cut along the sagittal plane",
    onRetina: "The image lands on the retina.",
    before: (mm: string) => `The image lands ${mm} mm in front of the retina.`,
    behind: (mm: string) => `The image lands ${mm} mm behind the retina.`,
    blur: (mm: string) => `Blur on the retina: ${mm} mm.`,
    drawnNear: "The object is drawn closer than scale to show the rays; the result uses the real distance.",
    stageLabel: "3D eye model, sectioned, with optional light rays",
    labelsLabel: "Parts to name",
    fallback: "An illustrative model, not a medical-grade anatomy model. Every 3D action also has a button beside the model.",
    scenarioName: { "normal-near": "Normal eye, object at 25 cm", "myopia-far": "Mildly myopic eye, distant object", "hyperopia-near": "Hyperopic eye, object at 40 cm" },
    scenarioHelp: "Place the object at the right distance, then adjust the lens and glasses so the image lands on the retina.",
  },
});

const pick = <T,>(list: readonly T[], index: number) => list[Math.min(Math.max(index, 0), list.length - 1)];

/** Axis frame (mm, anterior = +y) to the eye group, which is turned so light enters from the left. */
const scene = ([x, y]: Vec2): [number, number, number] => [x * MM, y * MM, 0];
const EYE_ROTATION: [number, number, number] = [0, 0, Math.PI / 2];
/** The same point in world space, for the camera focus rig. */
const world = ([x, y]: Vec2): [number, number, number] => [-y * MM, x * MM, 0];
const RAY_COLORS = ["#2563eb", "#d97706", "#2563eb"];

function OpticsRays({ axialMm, objectDistanceM, providedPowerD }: { axialMm: number; objectDistanceM: number | null; providedPowerD: number }) {
  const fan = useMemo(() => paraxialFan({ axialMm, objectDistanceM, providedPowerD }), [axialMm, objectDistanceM, providedPowerD]);
  const chief = fan[1];
  const objectStart = chief[0];
  const retinaImage = chief[2];
  return (
    <group>
      {objectDistanceM !== null && <Line points={[scene([0, objectStart[1]]), scene(objectStart)]} color="#2f6b52" lineWidth={3} />}
      {fan.map((ray, index) => <Line key={index} points={ray.map(scene)} color={RAY_COLORS[index]} lineWidth={2} />)}
      <mesh position={scene(retinaImage)}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color="#2f6b52" emissive="#2f6b52" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function EyeOpticsActivity({ state, onChange, resetKey }: { state: unknown; onChange: (next: EyeOpticsEvidence) => void; resetKey: number }) {
  const t = text();
  const evidence = eyeOpticsEvidenceFrom(state);
  const optionalLocked = !eyeOpticsEvidenceReady(evidence);
  const [phase, setPhase] = useState<"names" | "optics">("names");
  const [part, setPart] = useState<EyePartId>("cornea");
  const [focus, setFocus] = useState<FocusTarget>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [showRays, setShowRays] = useState(true);
  const [sectioned, setSectioned] = useState(true);

  useEffect(() => { setPhase("names"); setPart("cornea"); setFocus(null); setScenarioIndex(0); }, [resetKey]);
  useEffect(() => { if (optionalLocked && phase === "optics") setPhase("names"); }, [optionalLocked, phase]);
  // Phase 2 frames the whole eye again, whatever part phase 1 last focused.
  useEffect(() => { if (phase === "optics") setFocus({ point: [0, 0, 0], key: Date.now() }); }, [phase]);

  const focusPart = (id: EyePartId) => {
    setPart(id);
    const [x, y] = EYE_PART_ANCHORS[id];
    setFocus({ point: world([x, y]), key: Date.now() });
  };

  const setLabel = (id: EyePartId, value: string) => onChange({ ...evidence, phase1: { labels: { ...evidence.phase1.labels, [id]: value.slice(0, 100) } } });
  const scenario = pick(EYE_OPTICS_SCENARIOS, scenarioIndex);
  const attempt: Phase2Attempt = evidence.phase2.find((item) => item.scenarioId === scenario.id) ?? evidence.phase2[0];
  const setAttempt = (change: Partial<Phase2Attempt>) => onChange({
    ...evidence,
    phase2: evidence.phase2.map((item) => (item.scenarioId === scenario.id ? { ...item, ...change } : item)),
  });
  const providedPowerD = attempt.glassesPowerD + CORNEA_POWER_D + attempt.lensPowerD;
  const trace = useMemo(
    () => traceEye({ axialMm: scenario.axialMm, objectDistanceM: attempt.objectDistanceM, providedPowerD }),
    [scenario.axialMm, attempt.objectDistanceM, providedPowerD],
  );
  const offset = trace.imageOffsetMm ?? 0;
  const offsetText = Math.abs(offset).toFixed(1);
  // Same dioptre tolerance as the rubric, so "on the retina" here means the same thing as on the server.
  const defocusD = providedPowerD - requiredPowerD(scenario.axialMm, attempt.objectDistanceM);
  const readout = Math.abs(defocusD) <= FOCUS_TOLERANCE_D + 1e-9 ? t.onRetina : offset > 0 ? t.before(offsetText) : t.behind(offsetText);
  const blurText = t.blur(trace.blurMm.toFixed(2));

  const callouts: Callout[] = EYE_PART_IDS.map((id, index) => ({
    id,
    label: String(index + 1),
    position: scene(EYE_PART_ANCHORS[id]),
    active: part === id,
    onSelect: () => focusPart(id),
  }));

  return (
    <div className="eye-optics">
      <div className="eye-optics-phases" role="tablist" aria-label={t.phaseNames}>
        <button type="button" role="tab" aria-selected={phase === "names"} className={phase === "names" ? "is-active" : ""} onClick={() => setPhase("names")}>{t.phaseNames}</button>
        <button type="button" role="tab" aria-selected={phase === "optics"} className={phase === "optics" ? "is-active" : ""} disabled={optionalLocked} onClick={() => setPhase("optics")}>{t.phaseOptics}</button>
      </div>
      {optionalLocked && phase === "names" && <p className="tiny muted">{t.lockedOptics}</p>}

      <div className="eye-optics-layout">
        <AnatomyStage label={t.stageLabel} focus={focus} cameraPosition={[1.1, 0.9, -4.4]}>
          <group rotation={EYE_ROTATION}>
          <EyeModel
            axialMm={phase === "optics" ? scenario.axialMm : 22.6}
            accommodation={phase === "optics" ? accommodationFromLensPower(attempt.lensPowerD) : 0}
            pupilMm={2.5}
            sectioned={sectioned}
            highlight={phase === "names" ? part : null}
            onPick={phase === "names" ? focusPart : undefined}
          />
          {phase === "names" && <CalloutPins callouts={callouts} />}
          {phase === "optics" && showRays && (
            <OpticsRays axialMm={scenario.axialMm} objectDistanceM={attempt.objectDistanceM} providedPowerD={providedPowerD} />
          )}
          </group>
        </AnatomyStage>

        {phase === "names" ? (
          <section className="eye-optics-panel" aria-label={t.labelsLabel}>
            <p className="tiny muted">{t.partHint}</p>
            <ol className="eye-optics-parts">
              {EYE_PART_IDS.map((id, index) => (
                <li key={id} className={part === id ? "is-active" : ""}>
                  <label>
                    <span>{t.partLabel(index + 1)}</span>
                    <input
                      value={evidence.phase1.labels[id] ?? ""}
                      placeholder={t.partPlaceholder}
                      onFocus={() => focusPart(id)}
                      onChange={(event) => setLabel(id, event.target.value)}
                    />
                  </label>
                  <button type="button" className="secondary" aria-label={`${t.view} ${index + 1}`} onClick={() => focusPart(id)}>{t.view}</button>
                </li>
              ))}
            </ol>
            <p className="tiny muted">{t.viewing(EYE_PART_IDS.indexOf(part) + 1)}</p>
          </section>
        ) : (
          <section className="eye-optics-panel" aria-label={t.scenarioHelp}>
            <p className="tiny muted">{t.scenarioHelp}</p>
            <div className="eye-optics-scenarios" role="group" aria-label={t.scenario}>
              {EYE_OPTICS_SCENARIOS.map((item, index) => (
                <button key={item.id} type="button" className={index === scenarioIndex ? "is-active" : "secondary"} aria-pressed={index === scenarioIndex} onClick={() => setScenarioIndex(index)}>
                  {t.scenarioName[item.id]}
                </button>
              ))}
            </div>
            <label className="field">
              <span>{t.distance}</span>
              <select value={attempt.objectDistanceM ?? "inf"} onChange={(event) => setAttempt({ objectDistanceM: event.target.value === "inf" ? null : Number(event.target.value) })}>
                {DISTANCE_OPTIONS_M.map((value) => (
                  <option key={value ?? "inf"} value={value ?? "inf"}>{value === null ? t.infinity : `${value.toLocaleString("vi-VN")} m`}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t.lens} · {attempt.lensPowerD.toFixed(2)} D</span>
              <input type="range" min={LENS_RANGE_D.min} max={LENS_RANGE_D.max} step={POWER_STEP_D} value={attempt.lensPowerD} onChange={(event) => setAttempt({ lensPowerD: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>{t.glasses} · {attempt.glassesPowerD.toFixed(2)} D</span>
              <input type="range" min={GLASSES_RANGE_D.min} max={GLASSES_RANGE_D.max} step={POWER_STEP_D} value={attempt.glassesPowerD} onChange={(event) => setAttempt({ glassesPowerD: Number(event.target.value) })} />
            </label>
            <p className="eye-optics-readout" role="status" aria-live="polite">{readout} {blurText}</p>
            <div className="eye-optics-toggles">
              <label><input type="checkbox" checked={showRays} onChange={(event) => setShowRays(event.target.checked)} /> {t.rays}</label>
              <label><input type="checkbox" checked={sectioned} onChange={(event) => setSectioned(event.target.checked)} /> {t.section}</label>
            </div>
            {attempt.objectDistanceM !== null && attempt.objectDistanceM < 0.25 && <p className="tiny muted">{t.drawnNear}</p>}
          </section>
        )}
      </div>
      <p className="tiny muted">{t.fallback}</p>
    </div>
  );
}
