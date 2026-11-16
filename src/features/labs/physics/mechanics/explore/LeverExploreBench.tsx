/**
 * Mechanics bench Explore (FL-06, kit `k5-lever-bench@1`): free play on the lever bar with the weights and spring
 * gauge the config enables. No LabRun, no submission, no score; every change goes to the local notebook.
 * Layout A of the Lab Space: header controls, full-bleed scene, panel on the right, notebook dock bottom left.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Download, Info, RotateCcw } from "lucide-react";
import { evaluateLeverBench } from "@nexalab/sim";
import type { LeverLabConfig } from "@nexalab/sim/mechanics";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { K5Stage2D, K5Stage3D, type K5Attachment, type K5Tilt } from "../kit/K5Stage";
import { K5Toolbox } from "../kit/K5Toolbox";
import { formatNewtons, listLeverKitItems } from "./kit-items";
import { appendLeverEntry, describeLeverAction, describeLeverChange, formatMoment, leverLogStore, type LeverLogEntry, type LeverReading } from "./lever-log";
import "../lever-investigation.css";
import "./lever-explore.css";

const TILT_STATUS: Record<K5Tilt, string> = { LEVEL: "Thanh nằm ngang", TILT_LEFT: "Đầu trái nghiêng xuống", TILT_RIGHT: "Đầu phải nghiêng xuống" };

function read(config: LeverLabConfig, attachments: readonly K5Attachment[]) {
  const result = evaluateLeverBench({ fixtureId: config.fixtureId, attachments });
  if (!result.ok) return null;
  const value = result.value;
  return { value, reading: { tilt: value.displayState, leftMomentNmm: value.ccwMomentMilliNewtonMillimetres, rightMomentNmm: value.cwMomentMilliNewtonMillimetres } satisfies LeverReading };
}

export type LeverExploreBenchProps = {
  config: LeverLabConfig;
  /** Notebook key: `labId@activity.id` on `/labs/:id` (P0 C1.2), `labId@configVersion` on the dev route. */
  storageKey: string;
  activityId?: string;
  exitTo?: string;
  onExit?: () => void;
  draftNotice?: string;
  /** Class Explore: the student's task panel, shown in the question panel (P0 C3.4). */
  classSection?: ReactNode;
};

export function LeverExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice, classSection }: LeverExploreBenchProps) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:mechanics-k5");
  const [attachments, setAttachments] = useState<K5Attachment[]>(() => config.initialAttachments.map(a => ({ ...a })));
  const [log, setLog] = useState<LeverLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:lever-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listLeverKitItems(config), [config]);
  const gauge = config.enabledApparatus.some(item => item.kind === "spring_gauge");
  const show = (measurement: LeverLabConfig["measurements"][number]) => config.measurements.includes(measurement);
  const locked = useMemo(() => (config.lockInitialAttachments ? config.initialAttachments.map(a => a.positionMillimetres) : []), [config]);
  const current = read(config, attachments);
  const logRef = useRef(log);
  logRef.current = log;

  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void leverLogStore.load(storageKey).then(entries => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void leverLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:lever-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  const change = (next: K5Attachment[]) => {
    const before = read(config, attachments);
    const after = read(config, next);
    const action = describeLeverAction(attachments, next);
    setAttachments(next);
    if (!before || !after || !action) return;
    setLog(appendLeverEntry(logRef.current, {
      at: Date.now(), actionVi: action.actionVi, merge: action.merge, phenomenaVi: describeLeverChange(before.reading, after.reading),
      readings: { leftMomentNmm: after.reading.leftMomentNmm, rightMomentNmm: after.reading.rightMomentNmm }, attachments: next.map(a => ({ ...a })),
    }));
  };
  const reset = () => { change(config.initialAttachments.map(a => ({ ...a }))); setError(""); };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const tilt = current?.value.displayState ?? "LEVEL";
  const last = log.at(-1);
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={reset} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools} classSection={classSection}>
    <div className="k5-activity k5-explore" data-testid="lever-explore" data-kit={config.kit}>
      <div className="k5-scene">
        {mode === "3d" ? <K5Stage3D attachments={attachments} tilt={tilt} reduced={reduced} /> : <K5Stage2D attachments={attachments} tilt={tilt} />}
        <p className="k5-observation" role="status">{TILT_STATUS[tilt]} · Mô hình lý tưởng</p>
      </div>
      <LabHeaderSlot fallbackClassName="k5-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="k5-explore" prefix="k5" className="k5-explore-panel" ariaLabel="Bàn cơ" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn cơ" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="lever-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="k5-explore-items">{items.map(item => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        <K5Toolbox title="Treo dụng cụ" attachments={attachments} onChange={change} onError={setError} weights={config.weights.availableMilliNewtons} gauge={gauge} maxWeights={config.weights.maxCount} locked={locked} />
        {error && <p role="alert" className="k5-error">{error}</p>}
        {show("moment_table") && current && <section className="lqp-section"><h3>Bảng moment</h3>
          {current.value.attachments.length === 0 ? <p>Chưa treo dụng cụ nào.</p> : <table className="k5-explore-table" data-testid="lever-moment-table">
            <thead><tr><th scope="col">Dụng cụ</th><th scope="col">F</th><th scope="col">d</th><th scope="col">M = F × d</th></tr></thead>
            <tbody>{current.value.attachments.map(row => <tr key={row.positionMillimetres}>
              <td>{row.kind === "GAUGE" ? "Lực kế" : "Quả nặng"} · {row.positionMillimetres === 0 ? "O" : row.positionMillimetres < 0 ? "trái" : "phải"}</td>
              <td>{show("force_labels") ? formatNewtons(row.forceMilliNewtons) : "?"}</td>
              <td>{show("ruler") ? `${String(row.armMillimetres / 1000).replace(".", ",")} m` : "?"}</td>
              <td>{formatMoment(row.unsignedMomentMilliNewtonMillimetres)}</td>
            </tr>)}</tbody>
          </table>}
          <p className="k5-explore-sums">Tổng bên trái: <b>{formatMoment(current.reading.leftMomentNmm)}</b> · Tổng bên phải: <b>{formatMoment(current.reading.rightMomentNmm)}</b></p>
        </section>}
        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map(prompt => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={e => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="k5-explore-limits">{config.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="k5-explore-log" aria-label="Nhật ký thí nghiệm" data-testid="lever-log">
        <h2>Nhật ký thí nghiệm</h2>
        {log.length === 0 ? <p>Chưa có dòng nào. Mỗi lần treo, tháo hay chỉnh dụng cụ sẽ được ghi ở đây.</p>
          : <ol>{[...log].reverse().map(entry => <li key={entry.seq}><b>{entry.actionVi}</b><span>{entry.phenomenaVi.join(". ")}</span>{show("moment_table") && <small>Trái {formatMoment(entry.readings.leftMomentNmm)} · Phải {formatMoment(entry.readings.rightMomentNmm)}</small>}</li>)}</ol>}
      </section>}
      <div className="lab-actions k5-explore-dock">
        <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
        <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map(item => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
