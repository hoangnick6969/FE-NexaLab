/**
 * Mechanical energy bench Explore (FL-24, kit `k5-energy-bench@1`): pendulum energy bars and hoist work/power.
 * No LabRun, no submission, no score; every change goes to the local notebook (spec fl-24-mechanical-energy-explore-spec.md).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Info, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import {
  PENDULUM_POSITIONS, comparePower, evaluateHoist, evaluatePendulum, type EnergyLabConfig, type EnergyStation, type PendulumPosition,
} from "@nexalab/sim/mechanics/energy";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { formatGrams, listEnergyKitItems } from "./kit-items";
import {
  POSITION_VI, appendEnergyEntry, describeLift, describeLiftAction, describePendulumAction, describePendulumChange, energyLogStore,
  formatJoules, formatMetres, formatNewtons, formatSeconds, formatWatts, matchesValue, type EnergyLogEntry, type LiftView, type PendulumView,
} from "./energy-log";
import { Hoist2D, Pendulum2D } from "./EnergyStage2D";
import { EnergyStage3D } from "./EnergyStage3D";
import "./energy-explore.css";

const STATION_VI: Record<EnergyStation, string> = { pendulum: "Trạm 1 · Con lắc", hoist: "Trạm 2 · Tời kéo vật" };
const POSITION_BUTTON_VI: Record<PendulumPosition, string> = { release: "Điểm thả", "mid-down": "Giữa (xuống)", lowest: "Thấp nhất", "mid-up": "Giữa (lên)", "far-high": "Bên kia" };
const ERROR_VI: Record<string, string> = {
  MASS_NOT_ALLOWED: "Bộ thí nghiệm không có quả nặng này.",
  HEIGHT_OUT_OF_RANGE: "Độ cao thả nằm ngoài khoảng cho phép của con lắc.",
  HEIGHT_OFF_STEP: "Độ cao thả đổi theo từng bước của thước.",
  POSITION_UNKNOWN: "Không có mốc này.",
  DISTANCE_OUT_OF_RANGE: "Quãng đường nằm ngoài khoảng tời kéo được.",
  DISTANCE_OFF_STEP: "Quãng đường đổi theo từng bước của thước.",
  MOTOR_NOT_ALLOWED: "Bộ thí nghiệm không có động cơ này.",
  DURATION_NOT_POSITIVE: "Thời gian kéo phải lớn hơn 0.",
};
const BARS = [["kinetic", "Động năng Wđ"], ["potential", "Thế năng Wt"], ["mechanical", "Cơ năng W"]] as const;

type PendulumInput = { massG: number; dropHeightMm: number; position: PendulumPosition };
type HoistInput = { massG: number; distanceMm: number; motorId: string };
type Read<T> = { ok: true; view: T } | { ok: false; error: string } | null;

function readPendulum(config: EnergyLabConfig, input: PendulumInput): Read<PendulumView> {
  if (!config.pendulum) return null;
  const result = evaluatePendulum(config.pendulum, input);
  if (!result.ok) return { ok: false, error: result.code };
  return { ok: true, view: { massG: input.massG, dropHeightMm: input.dropHeightMm, position: result.position, heightMm: result.heightMm, potentialMj: result.potentialMj, kineticMj: result.kineticMj, mechanicalMj: result.mechanicalMj } };
}

function readHoist(config: EnergyLabConfig, input: HoistInput): Read<LiftView> {
  if (!config.hoist) return null;
  const result = evaluateHoist(config.hoist, input);
  if (!result.ok) return { ok: false, error: result.code };
  const motorVi = config.hoist.motors.find((motor) => motor.id === input.motorId)?.labelVi ?? input.motorId;
  return { ok: true, view: { massG: result.massG, distanceMm: result.distanceMm, motorId: result.motorId, motorVi, forceMilliNewtons: result.forceMilliNewtons, durationMs: result.durationMs, workMj: result.workMj, powerMw: result.powerMw } };
}

const initialPendulum = (config: EnergyLabConfig): PendulumInput => ({
  massG: config.pendulum?.massesG.includes(200) ? 200 : config.pendulum?.massesG[0] ?? 100,
  dropHeightMm: config.pendulum?.maxDropHeightMm ?? 0,
  position: "release",
});
const initialHoist = (config: EnergyLabConfig): HoistInput => ({
  massG: config.hoist?.massesG.includes(1000) ? 1000 : config.hoist?.massesG[0] ?? 0,
  distanceMm: !config.hoist ? 0
    : 500 >= config.hoist.minDistanceMm && 500 <= config.hoist.maxDistanceMm && (500 - config.hoist.minDistanceMm) % config.hoist.distanceStepMm === 0 ? 500 : config.hoist.minDistanceMm,
  motorId: config.hoist?.motors[0]?.id ?? "slow",
});

export type EnergyExploreBenchProps = {
  config: EnergyLabConfig;
  /** Notebook key: `labId@activity.id` on `/labs/:id` (P0 C1.2), `labId@configVersion` on the dev route. */
  storageKey: string;
  activityId?: string;
  exitTo?: string;
  onExit?: () => void;
  draftNotice?: string;
};

export function EnergyExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice }: EnergyExploreBenchProps) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:k5-energy");
  const [station, setStation] = useState<EnergyStation>(config.stations[0]);
  const [pendulumInput, setPendulumInput] = useState(() => initialPendulum(config));
  const [hoistInput, setHoistInput] = useState(() => initialHoist(config));
  const [lifted, setLifted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [guess, setGuess] = useState({ work: "", power: "" });
  const [checkedLifts, setCheckedLifts] = useState<Record<string, LiftView>>({});
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<EnergyLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:energy-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listEnergyKitItems(config), [config]);
  const readings = config.display.energyReadings;
  const pendulumRead = readPendulum(config, pendulumInput);
  const hoistRead = readHoist(config, hoistInput);
  const pendulum = pendulumRead?.ok ? pendulumRead.view : null;
  const lift = hoistRead?.ok ? hoistRead.view : null;
  const scaleMj = config.pendulum ? (Math.max(...config.pendulum.massesG) * config.pendulum.maxDropHeightMm) / 100 : 0;
  const showResult = lifted && (checked || readings);
  const logRef = useRef(log);
  logRef.current = log;
  const pendulumRef = useRef(pendulumInput);
  pendulumRef.current = pendulumInput;

  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void energyLogStore.load(storageKey).then(entries => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void energyLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:energy-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  const movePendulum = (next: PendulumInput, merge?: string) => {
    const before = readPendulum(config, pendulumRef.current);
    const after = readPendulum(config, next);
    if (!after) return;
    if (!after.ok) { setError(ERROR_VI[after.error] ?? after.error); setPlaying(false); return; }
    setError("");
    pendulumRef.current = next;
    setPendulumInput(next);
    if (!before?.ok) return;
    const action = describePendulumAction(before.view, after.view);
    if (!action) return;
    setLog(appendEnergyEntry(logRef.current, { at: Date.now(), station: "pendulum", actionVi: action, merge, phenomenaVi: describePendulumChange(before.view, after.view, readings), pendulum: after.view }));
  };
  // "Thả": walks the five checkpoints once; each step is a logged position like a button press.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const index = PENDULUM_POSITIONS.indexOf(pendulumRef.current.position);
      if (index >= PENDULUM_POSITIONS.length - 1) { setPlaying(false); return; }
      movePendulum({ ...pendulumRef.current, position: PENDULUM_POSITIONS[index + 1] });
    }, reduced ? 400 : 900);
    return () => clearInterval(timer);
  });
  const play = () => {
    if (playing) { setPlaying(false); return; }
    if (pendulumRef.current.position === "far-high") movePendulum({ ...pendulumRef.current, position: "release" });
    setPlaying(true);
  };

  const changeHoist = (next: HoistInput) => {
    const after = readHoist(config, next);
    if (!after) return;
    if (!after.ok) { setError(ERROR_VI[after.error] ?? after.error); return; }
    setError("");
    setHoistInput(next);
    setLifted(false);
    setChecked(false);
    setGuess({ work: "", power: "" });
  };
  const pull = () => {
    if (!lift) return;
    setLifted(true);
    setChecked(false);
    // With the readings on there is no "Kiểm tra" step, so each pull counts for the two-motor comparison right away.
    if (readings) setCheckedLifts({ ...checkedLifts, [lift.motorId]: lift });
    setLog(appendEnergyEntry(logRef.current, { at: Date.now(), station: "hoist", actionVi: describeLiftAction(lift), phenomenaVi: describeLift(lift, readings), lift }));
  };
  const check = () => {
    if (!lift || !lifted) return;
    setChecked(true);
    setCheckedLifts({ ...checkedLifts, [lift.motorId]: lift });
    const work = matchesValue(guess.work, lift.workMj);
    const power = matchesValue(guess.power, lift.powerMw);
    const verdict = (value: boolean | null, name: string) => value === null ? `${name}: chưa nhập` : `${name} em tính ${value ? "khớp" : "chưa khớp"} mô hình`;
    setLog(appendEnergyEntry(logRef.current, { at: Date.now(), station: "hoist", actionVi: `Kiểm tra công và công suất (${lift.motorVi.toLowerCase()})`, phenomenaVi: [...describeLift(lift, true).slice(1), `${verdict(work, "Công")}; ${verdict(power, "công suất")}`], lift }));
  };
  const reset = () => {
    setPlaying(false);
    setPendulumInput(initialPendulum(config));
    setHoistInput(initialHoist(config));
    setLifted(false);
    setChecked(false);
    setGuess({ work: "", power: "" });
    setCheckedLifts({});
    setError("");
  };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const slow = checkedLifts.slow;
  const fast = checkedLifts.fast;
  const comparison = slow && fast && slow.massG === fast.massG && slow.distanceMm === fast.distanceMm ? comparePower(slow, fast) : null;
  const status = station === "pendulum"
    ? pendulum ? `Con lắc ở ${POSITION_VI[pendulum.position]}, độ cao ${pendulum.heightMm} mm` : ""
    : lift ? (lifted ? `Đã kéo vật ${formatGrams(lift.massG)} lên ${lift.distanceMm} mm` : `Tời sẵn sàng kéo vật ${formatGrams(lift.massG)}`) : "";
  const last = log.at(-1);
  const pendulumSettings = config.pendulum;
  const hoistSettings = config.hoist;
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={reset} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools}>
    <div className="fl24-explore" data-testid="energy-explore" data-kit={config.kit} data-station={station}>
      <div className="fl24-scene">
        {mode === "3d"
          ? <EnergyStage3D apparatus={config.enabledApparatus} state={{ station, pendulum, lengthMm: pendulumSettings?.lengthMm ?? 600, scaleMj, lift, lifted, maxDistanceMm: hoistSettings?.maxDistanceMm ?? 1000, reduced }} />
          : <div className="fl24-2d" data-testid="energy-2d">
            {station === "pendulum" && pendulumSettings && pendulum && <Pendulum2D view={pendulum} lengthMm={pendulumSettings.lengthMm} scaleMj={scaleMj} />}
            {station === "hoist" && hoistSettings && lift && <Hoist2D lift={lift} maxDistanceMm={hoistSettings.maxDistanceMm} lifted={lifted} />}
          </div>}
        <p className="fl24-observation" role="status">{status} · Mô hình lý tưởng</p>
      </div>
      <LabHeaderSlot fallbackClassName="fl24-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="fl24-explore" prefix="fl24" className="fl24-explore-panel" ariaLabel="Bàn năng lượng cơ học" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn năng lượng" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="energy-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="fl24-items">{items.map(item => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        {config.stations.length > 1 && <div className="fl24-tabs" role="tablist" aria-label="Trạm thí nghiệm">
          {config.stations.map(id => <button key={id} type="button" role="tab" aria-selected={station === id} onClick={() => { setStation(id); setError(""); setPlaying(false); }}>{STATION_VI[id]}</button>)}
        </div>}
        {station === "pendulum" && pendulumSettings && pendulum && <section className="lqp-section" data-testid="energy-pendulum-controls"><h3>Con lắc đơn</h3>
          <div className="fl24-row" role="group" aria-label="Quả nặng">
            {pendulumSettings.massesG.map(mass => <button key={mass} type="button" aria-pressed={pendulumInput.massG === mass} onClick={() => movePendulum({ ...pendulumInput, massG: mass })}>{mass} g</button>)}
          </div>
          <label className="fl24-slider">Độ cao thả h₀: <b>{pendulum.dropHeightMm} mm</b>
            <input type="range" min={0} max={pendulumSettings.maxDropHeightMm} step={pendulumSettings.heightStepMm} value={pendulumInput.dropHeightMm} aria-label="Độ cao thả"
              onChange={e => movePendulum({ ...pendulumInput, dropHeightMm: Number(e.target.value), position: "release" }, "drop-drag")} />
          </label>
          <div className="fl24-row">
            <button type="button" onClick={() => movePendulum({ ...pendulumInput, dropHeightMm: pendulumInput.dropHeightMm - pendulumSettings.heightStepMm, position: "release" })} disabled={pendulumInput.dropHeightMm === 0}><Minus size={14} aria-hidden="true" />Hạ {pendulumSettings.heightStepMm} mm</button>
            <button type="button" onClick={() => movePendulum({ ...pendulumInput, dropHeightMm: pendulumInput.dropHeightMm + pendulumSettings.heightStepMm, position: "release" })}><Plus size={14} aria-hidden="true" />Nâng {pendulumSettings.heightStepMm} mm</button>
            <button type="button" onClick={play} aria-pressed={playing}>{playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{playing ? "Dừng" : "Thả con lắc"}</button>
          </div>
          <div className="fl24-row" role="group" aria-label="Mốc của con lắc">
            {PENDULUM_POSITIONS.map(position => <button key={position} type="button" aria-pressed={pendulumInput.position === position} onClick={() => { setPlaying(false); movePendulum({ ...pendulumInput, position }); }}>{POSITION_BUTTON_VI[position]}</button>)}
          </div>
          <p className="fl24-note">Độ cao quả nặng: <b data-testid="energy-height">{pendulum.heightMm} mm</b></p>
          <div className="fl24-bars" data-testid="energy-bars" aria-label="Thanh năng lượng">
            {BARS.map(([key, label]) => {
              const value = key === "kinetic" ? pendulum.kineticMj : key === "potential" ? pendulum.potentialMj : pendulum.mechanicalMj;
              const percent = scaleMj > 0 ? Math.round((value / scaleMj) * 1000) / 10 : 0;
              return <div key={key} className={`fl24-bar-row fl24-bar-${key}`} data-kind={key} data-percent={percent}>
                <span>{label}</span>
                <span className="fl24-bar-track"><span className="fl24-bar-fill" style={{ width: `${percent}%` }} /></span>
                {readings && <b>{formatJoules(value)}</b>}
              </div>;
            })}
          </div>
        </section>}
        {station === "hoist" && hoistSettings && lift && <section className="lqp-section" data-testid="energy-hoist-controls"><h3>Tời kéo vật</h3>
          <div className="fl24-row" role="group" aria-label="Vật nặng">
            {hoistSettings.massesG.map(mass => <button key={mass} type="button" aria-pressed={hoistInput.massG === mass} onClick={() => changeHoist({ ...hoistInput, massG: mass })}>{formatGrams(mass)}</button>)}
          </div>
          <label className="fl24-slider">Quãng đường kéo: <b>{hoistInput.distanceMm} mm</b>
            <input type="range" min={hoistSettings.minDistanceMm} max={hoistSettings.maxDistanceMm} step={hoistSettings.distanceStepMm} value={hoistInput.distanceMm} aria-label="Quãng đường kéo"
              onChange={e => changeHoist({ ...hoistInput, distanceMm: Number(e.target.value) })} />
          </label>
          <div className="fl24-row" role="group" aria-label="Động cơ">
            {hoistSettings.motors.map(motor => <button key={motor.id} type="button" aria-pressed={hoistInput.motorId === motor.id} onClick={() => changeHoist({ ...hoistInput, motorId: motor.id })}>{motor.labelVi}</button>)}
          </div>
          <div className="fl24-row"><button type="button" className="fl24-primary" onClick={pull} disabled={lifted}>Kéo vật</button></div>
          <table className="fl24-table" data-testid="energy-hoist-readings">
            <tbody>
              <tr data-reading="force"><th scope="row">Lực kế F</th><td>{lifted ? formatNewtons(lift.forceMilliNewtons) : "—"}</td></tr>
              <tr data-reading="distance"><th scope="row">Thước s</th><td>{lifted ? `${lift.distanceMm} mm (${formatMetres(lift.distanceMm)})` : "—"}</td></tr>
              <tr data-reading="time"><th scope="row">Đồng hồ t</th><td>{lifted ? formatSeconds(lift.durationMs) : "—"}</td></tr>
            </tbody>
          </table>
          {lifted && <div className="fl24-guess">
            <label>Công A em tính (J)<input inputMode="decimal" value={guess.work} onChange={e => setGuess({ ...guess, work: e.target.value })} /></label>
            <label>Công suất P em tính (W)<input inputMode="decimal" value={guess.power} onChange={e => setGuess({ ...guess, power: e.target.value })} /></label>
            {!readings && <button type="button" onClick={check} disabled={checked}>Kiểm tra</button>}
          </div>}
          {showResult && <p className="fl24-result" data-testid="energy-hoist-result">A = {formatJoules(lift.workMj)} · P = {formatWatts(lift.powerMw)}</p>}
          {comparison && <p className="fl24-result" data-testid="energy-power-compare" data-compare={comparison}>
            Cùng vật và quãng đường: hai động cơ thực hiện cùng công {formatJoules(slow!.workMj)}; {comparison === "equal" ? "công suất bằng nhau" : `${comparison === "second" ? fast!.motorVi : slow!.motorVi} có công suất lớn hơn`}.
          </p>}
        </section>}
        {error && <p role="alert" className="fl24-error">{error}</p>}
        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map(prompt => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={e => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="fl24-limits">{config.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="fl24-log" aria-label="Nhật ký thí nghiệm" data-testid="energy-log">
      <h2>Nhật ký thí nghiệm</h2>
      {log.length === 0 ? <p>Chưa có dòng nào. Mỗi lần đổi quả nặng, độ cao, mốc của con lắc hay kéo vật sẽ được ghi ở đây.</p>
        : <ol>{[...log].reverse().map(entry => <li key={entry.seq}><b>{entry.actionVi}</b><span>{entry.phenomenaVi.join(". ")}</span></li>)}</ol>}
    </section>}
    <div className="lab-actions fl24-dock">
      <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
      <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map(item => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
