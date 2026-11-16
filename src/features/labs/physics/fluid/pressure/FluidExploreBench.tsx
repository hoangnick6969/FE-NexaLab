/**
 * Fluid bench Explore (FL-04, kit `k3-fluid-bench@1`): the two stations of SGK KHTN 8 Bài 16 on the K3 room.
 * No LabRun, no submission, no score; every change goes to the local notebook (spec fl-04-liquid-pressure-explore-spec.md).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Info, Minus, Plus, RotateCcw } from "lucide-react";
import { evaluateDepthProbe, evaluatePistons, type FluidLabConfig, type FluidStation } from "@nexalab/sim/fluid";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { formatNewtons, listFluidKitItems } from "./kit-items";
import {
  OUTCOME_VI, appendPressureEntry, describePistonAction, describePistonChange, describeProbeAction, describeProbeChange, formatPascals, positionVi,
  pressureLogStore, type PistonReading, type PressureLogEntry, type ProbeReading,
} from "./pressure-log";
import { DepthProbe2D, Pistons2D } from "./PressureStage2D";
import { PressureStage3D } from "./PressureStage3D";
import "./pressure-explore.css";

const STATION_VI: Record<FluidStation, string> = { "depth-probe": "Trạm 1 · Màng cao su", pistons: "Trạm 2 · Hai pit-tông" };
const PROBE_ERROR_VI = {
  DEPTH_OUT_OF_RANGE: "Bình trụ chỉ hạ được trong khoảng cho phép của bể.",
  DEPTH_OFF_STEP: "Độ sâu đổi theo từng bước 10 mm.",
  POSITION_NOT_ALLOWED: "Vị trí này không có trên giá đỡ.",
} as const;
const PISTON_ERROR_VI = {
  NEGATIVE_COUNT: "Đĩa này không còn quả nặng nào để bỏ.",
  PAN_FULL: "Mỗi đĩa chỉ đặt được số quả tối đa của bộ thí nghiệm.",
  WEIGHTS_EXHAUSTED: "Đã dùng hết quả nặng trong bộ.",
} as const;
const levelVi = (level: number, levels: number) => level === 0 ? "phẳng" : `lõm mức ${level}/${levels}`;

type Read<T, E> = { ok: true; reading: T } | { ok: false; error: E } | null;

function readProbe(config: FluidLabConfig, depthMm: number, positionMm: number): Read<ProbeReading, keyof typeof PROBE_ERROR_VI> {
  if (!config.depthProbe) return null;
  const result = evaluateDepthProbe(config.depthProbe, config.display.deformationLevels, { depthMm, positionMm });
  if (!result.ok) return { ok: false, error: result.code };
  const { A, B, C } = result.membranes;
  return { ok: true, reading: { depthMm, positionMm, levels: { A: A.level, B: B.level, C: C.level }, pascals: { A: A.pascals, C: C.pascals } } };
}

function readPistons(config: FluidLabConfig, pan1: number, pan2: number): Read<PistonReading, keyof typeof PISTON_ERROR_VI> {
  if (!config.pistons) return null;
  const result = evaluatePistons(config.pistons, { pan1, pan2 });
  if (!result.ok) return { ok: false, error: result.code };
  return { ok: true, reading: { pan1, pan2, outcome: result.outcome, pascals: result.pascals } };
}

export type FluidExploreBenchProps = {
  config: FluidLabConfig;
  /** Notebook key: `labId@activity.id` on `/labs/:id` (P0 C1.2), `labId@configVersion` on the dev route. */
  storageKey: string;
  activityId?: string;
  exitTo?: string;
  onExit?: () => void;
  draftNotice?: string;
};

export function FluidExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice }: FluidExploreBenchProps) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:fluid-k3-pressure");
  const [station, setStation] = useState<FluidStation>(config.stations[0]);
  const [probeState, setProbeState] = useState({ depthMm: 0, positionMm: config.depthProbe?.positionsMm.includes(0) ? 0 : config.depthProbe?.positionsMm[0] ?? 0 });
  const [pans, setPans] = useState({ pan1: 0, pan2: 0 });
  const [log, setLog] = useState<PressureLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:fluid-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listFluidKitItems(config), [config]);
  const showPa = config.display.pressureReading;
  const levels = config.display.deformationLevels;
  const probe = readProbe(config, probeState.depthMm, probeState.positionMm);
  const pistons = readPistons(config, pans.pan1, pans.pan2);
  const probeReading = probe?.ok ? probe.reading : null;
  const pistonReading = pistons?.ok ? pistons.reading : null;
  const logRef = useRef(log);
  logRef.current = log;

  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void pressureLogStore.load(storageKey).then(entries => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void pressureLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:fluid-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  const moveProbe = (next: { depthMm: number; positionMm: number }, merge?: string) => {
    const after = readProbe(config, next.depthMm, next.positionMm);
    if (!after) return;
    if (!after.ok) { setError(PROBE_ERROR_VI[after.error]); return; }
    setError("");
    setProbeState(next);
    if (!probeReading) return;
    const action = describeProbeAction(probeReading, after.reading);
    if (!action) return;
    setLog(appendPressureEntry(logRef.current, { at: Date.now(), station: "depth-probe", actionVi: action, merge, phenomenaVi: describeProbeChange(probeReading, after.reading, showPa), probe: after.reading }));
  };
  const setPan = (pan: "pan1" | "pan2", delta: 1 | -1) => {
    const next = { ...pans, [pan]: pans[pan] + delta };
    const after = readPistons(config, next.pan1, next.pan2);
    if (!after) return;
    if (!after.ok) { setError(PISTON_ERROR_VI[after.error]); return; }
    setError("");
    setPans(next);
    if (!pistonReading || !config.pistons) return;
    const action = describePistonAction(pistonReading, after.reading, formatNewtons(config.pistons.weightMilliNewtons));
    if (!action) return;
    setLog(appendPressureEntry(logRef.current, { at: Date.now(), station: "pistons", actionVi: action, phenomenaVi: describePistonChange(after.reading, showPa), pistons: after.reading }));
  };
  const reset = () => {
    setProbeState({ depthMm: 0, positionMm: config.depthProbe?.positionsMm.includes(0) ? 0 : config.depthProbe?.positionsMm[0] ?? 0 });
    setPans({ pan1: 0, pan2: 0 });
    setError("");
  };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const status = station === "depth-probe"
    ? probeReading ? `Đáy bình trụ ở độ sâu ${probeReading.depthMm} mm, ${positionVi(probeReading.positionMm)}` : ""
    : pistonReading ? OUTCOME_VI[pistonReading.outcome] : "";
  const last = log.at(-1);
  const probeSettings = config.depthProbe;
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={reset} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools}>
    <div className="fl04-explore" data-testid="fluid-explore" data-kit={config.kit} data-station={station}>
      <div className="fl04-scene">
        {mode === "3d"
          ? <PressureStage3D station={station} depthSettings={config.depthProbe} pistonSettings={config.pistons} levels={levels} probe={probeReading} pistons={pistonReading} reduced={reduced} />
          : <div className="fl04-2d" data-testid="fluid-2d">
            {station === "depth-probe" && probeSettings && probeReading && <DepthProbe2D settings={probeSettings} probe={probeReading} levels={levels} />}
            {station === "pistons" && config.pistons && pistonReading && <Pistons2D settings={config.pistons} pistons={pistonReading} />}
          </div>}
        <p className="fl04-observation" role="status">{status} · Mô hình lý tưởng</p>
      </div>
      <LabHeaderSlot fallbackClassName="fl04-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="fl04-explore" prefix="fl04" className="fl04-explore-panel" ariaLabel="Bàn chất lỏng" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn chất lỏng" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="fluid-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="fl04-items">{items.map(item => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        {config.stations.length > 1 && <div className="fl04-tabs" role="tablist" aria-label="Trạm thí nghiệm">
          {config.stations.map(id => <button key={id} type="button" role="tab" aria-selected={station === id} onClick={() => { setStation(id); setError(""); }}>{STATION_VI[id]}</button>)}
        </div>}
        {station === "depth-probe" && probeSettings && probeReading && <section className="lqp-section" data-testid="fluid-probe-controls"><h3>Nhúng bình trụ</h3>
          <label className="fl04-slider">Độ sâu của đáy bình trụ: <b>{probeReading.depthMm} mm</b>
            <input type="range" min={0} max={probeSettings.maxDepthMm} step={probeSettings.depthStepMm} value={probeState.depthMm}
              onChange={e => moveProbe({ ...probeState, depthMm: Number(e.target.value) }, "probe-drag")} />
          </label>
          <div className="fl04-row">
            <button type="button" onClick={() => moveProbe({ ...probeState, depthMm: probeState.depthMm - probeSettings.depthStepMm })} disabled={probeState.depthMm === 0}><Minus size={14} aria-hidden="true" />Nâng lên {probeSettings.depthStepMm} mm</button>
            <button type="button" onClick={() => moveProbe({ ...probeState, depthMm: probeState.depthMm + probeSettings.depthStepMm })}><Plus size={14} aria-hidden="true" />Hạ thêm {probeSettings.depthStepMm} mm</button>
          </div>
          <div className="fl04-row" role="group" aria-label="Vị trí ngang trong bể">
            {probeSettings.positionsMm.map(mm => <button key={mm} type="button" aria-pressed={probeState.positionMm === mm} onClick={() => moveProbe({ ...probeState, positionMm: mm })}>{mm === 0 ? "Giữa" : `${mm > 0 ? "+" : "−"}${Math.abs(mm)} mm`}</button>)}
          </div>
          <table className="fl04-table" data-testid="fluid-membranes">
            <thead><tr><th scope="col">Màng</th><th scope="col">Độ sâu</th><th scope="col">Biến dạng</th>{showPa && <th scope="col">Áp suất</th>}</tr></thead>
            <tbody>
              <tr data-membrane="C"><td>C (đáy)</td><td>{probeReading.depthMm} mm</td><td>{levelVi(probeReading.levels.C, levels)}</td>{showPa && <td>{formatPascals(probeReading.pascals.C)}</td>}</tr>
              <tr data-membrane="A"><td>A (thành trái)</td><td>{Math.max(0, probeReading.depthMm - probeSettings.sideHoleOffsetMm)} mm</td><td>{levelVi(probeReading.levels.A, levels)}</td>{showPa && <td>{formatPascals(probeReading.pascals.A)}</td>}</tr>
              <tr data-membrane="B"><td>B (thành phải)</td><td>{Math.max(0, probeReading.depthMm - probeSettings.sideHoleOffsetMm)} mm</td><td>{levelVi(probeReading.levels.B, levels)}</td>{showPa && <td>{formatPascals(probeReading.pascals.A)}</td>}</tr>
            </tbody>
          </table>
        </section>}
        {station === "pistons" && config.pistons && pistonReading && <section className="lqp-section" data-testid="fluid-piston-controls"><h3>Đặt quả nặng ({formatNewtons(config.pistons.weightMilliNewtons)} mỗi quả)</h3>
          {(["pan1", "pan2"] as const).map((pan, index) => <div key={pan} className="fl04-row fl04-pan" role="group" aria-label={`Đĩa (${index + 1})`}>
            <span>Đĩa ({index + 1}): <b data-testid={`fluid-${pan}`}>{pans[pan]}</b> quả{showPa ? ` · ${formatPascals(pistonReading.pascals[index])}` : ""}</span>
            <button type="button" aria-label={`Bỏ một quả nặng khỏi đĩa (${index + 1})`} onClick={() => setPan(pan, -1)}><Minus size={14} aria-hidden="true" /></button>
            <button type="button" aria-label={`Đặt một quả nặng lên đĩa (${index + 1})`} onClick={() => setPan(pan, 1)}><Plus size={14} aria-hidden="true" /></button>
          </div>)}
          <p className="fl04-outcome" data-testid="fluid-piston-outcome" data-outcome={pistonReading.outcome}>{OUTCOME_VI[pistonReading.outcome]}</p>
        </section>}
        {error && <p role="alert" className="fl04-error">{error}</p>}
        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map(prompt => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={e => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="fl04-limits">{config.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="fl04-log" aria-label="Nhật ký thí nghiệm" data-testid="fluid-log">
      <h2>Nhật ký thí nghiệm</h2>
      {log.length === 0 ? <p>Chưa có dòng nào. Mỗi lần nhúng, dời bình trụ hay đặt quả nặng sẽ được ghi ở đây.</p>
        : <ol>{[...log].reverse().map(entry => <li key={entry.seq}><b>{entry.actionVi}</b><span>{entry.phenomenaVi.join(". ")}</span></li>)}</ol>}
    </section>}
    <div className="lab-actions fl04-dock">
      <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
      <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map(item => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
