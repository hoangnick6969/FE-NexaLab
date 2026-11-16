/**
 * Optics bench Explore (FL-23, kit `k6-optics-bench@1`): Snell law into a half-cylinder, total internal reflection out of it.
 * No LabRun, no submission, no score; every change goes to the local notebook (spec fl-23-refraction-explore-spec.md).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Info, RotateCcw } from "lucide-react";
import {
  appendReading, checkCriticalGuess, evaluateRay, lightSpeedInMedium, sineRatio,
  type OpticsStation, type RefractionLabConfig, type TableRow,
} from "@nexalab/sim/optics";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { listRefractionKitItems } from "./kit-items";
import {
  STATION_VI, appendRefractionEntry, describeRay, describeRayChange, describeReading, formatAngle, formatIndex, formatRatio, formatSine, formatSpeed,
  parseAngle, refractionLogStore, type RayView, type RefractionLogEntry,
} from "./refraction-log";
import { RefractionDiagram } from "./RefractionStage2D";
import { RefractionStage3D } from "./RefractionStage3D";
import "./refraction-explore.css";

const ERROR_VI: Record<string, string> = {
  STATION_NOT_ENABLED: "Bàn này không có trạm đó.",
  MEDIUM_NOT_ALLOWED: "Bộ thí nghiệm không có khối này.",
  INCIDENCE_NOT_INTEGER: "Góc tới đổi theo từng độ.",
  INCIDENCE_OUT_OF_RANGE: "Góc tới nằm ngoài khoảng đèn xoay được.",
  TABLE_FULL: "Bảng đo của khối này đã đủ số lần đo. Xoá bảng để đo lại.",
  ALREADY_MEASURED: "Góc tới này đã có trong bảng.",
  NO_REFRACTED_RAY: "Không có tia khúc xạ để đo.",
};
const STEPS = [-5, -1, 1, 5] as const;
const rad = (deg: number) => deg * Math.PI / 180;

type Input = { station: OpticsStation; mediumId: string; angles: Record<OpticsStation, number> };
/** Per medium on station 2: the largest angle that still refracted and the first angle seen with total internal reflection. */
type Search = Record<string, { maxRefractedDeg?: number; firstTotalDeg?: number }>;
type Check = { mediumId: string; guessDeg: number; ok: boolean; criticalDeg: number };

function readRay(config: RefractionLabConfig, input: Input): { ok: true; view: RayView } | { ok: false; error: string } {
  const result = evaluateRay(config, { station: input.station, mediumId: input.mediumId, incidenceDeg: input.angles[input.station] });
  if (!result.ok) return { ok: false, error: result.code };
  const refraction = result.refraction;
  return { ok: true, view: {
    station: result.station, mediumId: result.medium.id, mediumVi: result.medium.labelVi, indexMilli: result.medium.indexMilli, incidenceDeg: result.incidenceDeg,
    refractionDeg: refraction.kind === "refracted" ? refraction.refractionDeg : null, reflectance: result.refraction.reflectance, criticalDeg: result.criticalDeg,
  } };
}

const initialInput = (config: RefractionLabConfig): Input => ({ station: config.stations[0], mediumId: config.media[0].id, angles: { "into-block": 30, "out-of-block": 30 } });

export type RefractionExploreBenchProps = {
  config: RefractionLabConfig;
  /** Notebook key: `labId@activity.id` on `/labs/:id` (P0 C1.2), `labId@configVersion` on the dev route. */
  storageKey: string;
  activityId?: string;
  exitTo?: string;
  onExit?: () => void;
  draftNotice?: string;
};

export function RefractionExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice }: RefractionExploreBenchProps) {
  // Catalog: FL-23 is 2D-first, the disk is where angles are read (Q-6).
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:k6-optics", "2d");
  const [input, setInput] = useState(() => initialInput(config));
  const [rows, setRows] = useState<TableRow[]>([]);
  const [search, setSearch] = useState<Search>({});
  const [guess, setGuess] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [log, setLog] = useState<RefractionLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:refraction-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listRefractionKitItems(config), [config]);
  const read = readRay(config, input);
  const ray = read.ok ? read.view : null;
  const station = input.station;
  const settings = station === "into-block" ? config.intoBlock : config.outOfBlock;
  const logRef = useRef(log);
  logRef.current = log;
  const inputRef = useRef(input);
  inputRef.current = input;
  const searchRef = useRef(search);
  searchRef.current = search;
  const sineColumns = config.display.sineColumns;

  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void refractionLogStore.load(storageKey).then(entries => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void refractionLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:refraction-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  const add = (entry: Omit<RefractionLogEntry, "seq" | "at">) => setLog(appendRefractionEntry(logRef.current, { at: Date.now(), ...entry }));

  /** Station 2 bookkeeping: the first total internal reflection of a medium is a notebook event of its own. */
  const track = (view: RayView) => {
    if (view.station !== "out-of-block") return;
    const current = searchRef.current[view.mediumId] ?? {};
    const next = { ...current };
    if (view.refractionDeg === null) {
      if (current.firstTotalDeg === undefined || view.incidenceDeg < current.firstTotalDeg) next.firstTotalDeg = view.incidenceDeg;
      if (current.firstTotalDeg === undefined) add({ station: view.station, actionVi: `Lần đầu thấy phản xạ toàn phần với khối ${view.mediumVi.toLowerCase()} ở góc tới ${formatAngle(view.incidenceDeg)}`, phenomenaVi: ["Không còn tia khúc xạ; toàn bộ ánh sáng phản xạ lại trong khối"], ray: view });
    } else if (current.maxRefractedDeg === undefined || view.incidenceDeg > current.maxRefractedDeg) next.maxRefractedDeg = view.incidenceDeg;
    searchRef.current = { ...searchRef.current, [view.mediumId]: next };
    setSearch(searchRef.current);
  };

  const move = (next: Input) => {
    const before = readRay(config, inputRef.current);
    const after = readRay(config, next);
    if (!after.ok) { setError(ERROR_VI[after.error] ?? after.error); return; }
    setError("");
    inputRef.current = next;
    setInput(next);
    if (!before.ok) return;
    const view = after.view;
    if (view.mediumId !== before.view.mediumId) {
      add({ station: view.station, actionVi: `Đổi khối thành ${view.mediumVi.toLowerCase()} (n = ${formatIndex(view.indexMilli)})`, phenomenaVi: [describeRay(view)], ray: view });
    } else if (view.station === before.view.station && view.incidenceDeg !== before.view.incidenceDeg) {
      add({ station: view.station, actionVi: `Xoay đèn tới góc tới ${formatAngle(view.incidenceDeg)} (${view.mediumVi.toLowerCase()})`, merge: `angle-${view.station}-${view.mediumId}`, phenomenaVi: [describeRay(view), ...describeRayChange(before.view, view)], ray: view });
    }
    track(view);
  };
  const setAngle = (deg: number) => move({ ...inputRef.current, angles: { ...inputRef.current.angles, [station]: deg } });
  const switchStation = (next: OpticsStation) => {
    setError("");
    const target = { ...inputRef.current, station: next };
    inputRef.current = target;
    setInput(target);
    const view = readRay(config, target);
    if (view.ok) track(view.view);
  };

  const record = () => {
    if (!ray || !config.intoBlock) return;
    const result = evaluateRay(config, { station: ray.station, mediumId: ray.mediumId, incidenceDeg: ray.incidenceDeg });
    if (!result.ok) return;
    const added = appendReading(rows, result, config.intoBlock.maxReadings);
    if (!added.ok) { setError(ERROR_VI[added.code]); return; }
    setError("");
    setRows(added.rows);
    add({ station: ray.station, actionVi: `Ghi lần đo ${added.rows.filter((row) => row.mediumId === ray.mediumId).length} của khối ${ray.mediumVi.toLowerCase()}`, phenomenaVi: describeReading(ray, sineColumns), ray });
  };
  const clearTable = () => {
    if (!ray) return;
    setRows(rows.filter((row) => row.mediumId !== ray.mediumId));
    add({ station: ray.station, actionVi: `Xoá bảng đo của khối ${ray.mediumVi.toLowerCase()}`, phenomenaVi: [] });
  };
  const checkCritical = () => {
    if (!ray || ray.criticalDeg === null || !config.outOfBlock) return;
    const typed = parseAngle(guess);
    if (typed === null) { setError("Nhập góc tới hạn em đo được (độ)."); return; }
    const ok = checkCriticalGuess(typed, ray.criticalDeg, config.outOfBlock.criticalToleranceDeg);
    setError("");
    setCheck({ mediumId: ray.mediumId, guessDeg: typed, ok, criticalDeg: ray.criticalDeg });
    add({ station: ray.station, actionVi: `Kiểm tra góc tới hạn của khối ${ray.mediumVi.toLowerCase()}: em đo ${Number.isFinite(typed) ? formatAngle(typed) : guess}`,
      phenomenaVi: [`Mô hình: góc tới hạn ${formatAngle(ray.criticalDeg)}; em đo ${ok ? "khớp" : "chưa khớp"} (sai số cho phép ±${config.outOfBlock.criticalToleranceDeg}°)`], ray });
  };
  const reset = () => {
    const first = initialInput(config);
    inputRef.current = first;
    setInput(first);
    setRows([]);
    searchRef.current = {};
    setSearch({});
    setGuess("");
    setCheck(null);
    setError("");
  };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const mediumRows = ray ? rows.filter((row) => row.mediumId === ray.mediumId) : [];
  const found = ray ? search[ray.mediumId] : undefined;
  const shownCheck = check && ray && check.mediumId === ray.mediumId ? check : null;
  const speedCard = config.enabledApparatus.some((item) => item.kind === "speed_card");
  const last = log.at(-1);
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={reset} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools}>
    <div className="fl23-explore" data-testid="optics-explore" data-kit={config.kit} data-station={station}>
      <div className="fl23-scene">
        {ray && (mode === "3d"
          ? <RefractionStage3D apparatus={config.enabledApparatus} state={{ ray, reduced }} />
          : <div className="fl23-2d" data-testid="optics-2d"><RefractionDiagram ray={ray} /></div>)}
        <p className="fl23-observation" role="status">{ray ? describeRay(ray) : ""} · Mô hình tia sáng</p>
      </div>
      <LabHeaderSlot fallbackClassName="fl23-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="fl23-explore" prefix="fl23" className="fl23-explore-panel" ariaLabel="Bàn quang học" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn quang học" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="optics-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="fl23-items">{items.map(item => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        {config.stations.length > 1 && <div className="fl23-tabs" role="tablist" aria-label="Trạm thí nghiệm">
          {config.stations.map(id => <button key={id} type="button" role="tab" aria-selected={station === id} onClick={() => switchStation(id)}>{STATION_VI[id]}</button>)}
        </div>}
        {ray && settings && <section className="lqp-section" data-testid="optics-controls"><h3>{station === "into-block" ? "Ánh sáng đi từ không khí vào khối" : "Ánh sáng đi từ khối ra không khí"}</h3>
          {config.media.length > 1 && <div className="fl23-row" role="group" aria-label="Khối bán trụ">
            {config.media.map(medium => <button key={medium.id} type="button" aria-pressed={input.mediumId === medium.id} onClick={() => move({ ...inputRef.current, mediumId: medium.id })}>{medium.labelVi}</button>)}
          </div>}
          <label className="fl23-slider">Góc tới i: <b>{formatAngle(ray.incidenceDeg)}</b>
            <input type="range" min={0} max={settings.maxIncidenceDeg} step={1} value={ray.incidenceDeg} aria-label="Góc tới" onChange={e => setAngle(Number(e.target.value))} />
          </label>
          <div className="fl23-row" role="group" aria-label="Xoay đèn">
            {STEPS.map(step => <button key={step} type="button" disabled={ray.incidenceDeg + step < 0 || ray.incidenceDeg + step > settings.maxIncidenceDeg} onClick={() => setAngle(ray.incidenceDeg + step)}>{step > 0 ? `+${step}°` : `${step}°`}</button>)}
          </div>
          <p className="fl23-reading" data-testid="optics-reading" data-total={ray.refractionDeg === null}>
            {ray.refractionDeg === null ? "Không có tia khúc xạ: phản xạ toàn phần" : <>Góc khúc xạ đọc trên đĩa: <b>{formatAngle(ray.refractionDeg)}</b></>}
          </p>
          {station === "into-block" && config.intoBlock && <>
            <div className="fl23-row">
              <button type="button" className="fl23-primary" onClick={record} disabled={mediumRows.length >= config.intoBlock.maxReadings}>Ghi vào bảng</button>
              <button type="button" onClick={clearTable} disabled={!mediumRows.length}>Xoá bảng {ray.mediumVi.toLowerCase()}</button>
            </div>
            <table className="fl23-table" data-testid="optics-table" data-medium={ray.mediumId}>
              <thead><tr><th scope="col">Lần</th><th scope="col">i</th><th scope="col">r</th><th scope="col">sin i</th><th scope="col">sin r</th><th scope="col">sin i / sin r</th></tr></thead>
              <tbody>
                {mediumRows.length === 0 && <tr><td colSpan={6} className="fl23-note">Chưa có lần đo. Chọn góc tới rồi bấm "Ghi vào bảng" (tối đa {config.intoBlock.maxReadings} lần).</td></tr>}
                {mediumRows.map((row, index) => {
                  const ratio = sineRatio(row.incidenceDeg, row.refractionDeg);
                  return <tr key={row.incidenceDeg} data-row={row.incidenceDeg}>
                    <td>{index + 1}</td><td>{formatAngle(row.incidenceDeg)}</td><td>{formatAngle(row.refractionDeg)}</td>
                    <td>{sineColumns ? formatSine(Math.sin(rad(row.incidenceDeg))) : "?"}</td>
                    <td>{sineColumns ? formatSine(Math.sin(rad(row.refractionDeg))) : "?"}</td>
                    <td data-ratio>{sineColumns ? (ratio === null ? "—" : formatRatio(ratio)) : "?"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!sineColumns && mediumRows.length > 0 && <p className="fl23-note">Dấu ? là phần em tự tính bằng máy tính.</p>}
            <p className="fl23-note">Ánh sáng đi vào môi trường chiết quang hơn: tia khúc xạ lệch lại gần pháp tuyến, không bao giờ xảy ra phản xạ toàn phần.</p>
          </>}
          {station === "out-of-block" && config.outOfBlock && <>
            <p className="fl23-note" data-testid="optics-search">
              {found?.maxRefractedDeg !== undefined ? `Góc tới lớn nhất còn tia khúc xạ: ${formatAngle(found.maxRefractedDeg)}. ` : ""}
              {found?.firstTotalDeg !== undefined ? `Góc tới nhỏ nhất đã thấy phản xạ toàn phần: ${formatAngle(found.firstTotalDeg)}.` : "Tăng dần góc tới cho tới khi tia khúc xạ biến mất."}
            </p>
            <div className="fl23-guess">
              <label>Góc tới hạn em đo được (độ)<input inputMode="decimal" value={guess} onChange={e => setGuess(e.target.value)} /></label>
              <button type="button" onClick={checkCritical}>Kiểm tra</button>
            </div>
            {shownCheck && <p className="fl23-result" data-testid="optics-critical-result" data-ok={shownCheck.ok}>
              Góc tới hạn của khối {ray.mediumVi.toLowerCase()}: {formatAngle(shownCheck.criticalDeg)} · em đo {Number.isFinite(shownCheck.guessDeg) ? formatAngle(shownCheck.guessDeg) : "?"}: {shownCheck.ok ? "khớp" : "chưa khớp"}
            </p>}
          </>}
          {speedCard && station === "into-block" && <p className="fl23-speed" data-testid="optics-speed">
            Chiết suất {ray.mediumVi.toLowerCase()} n = {formatIndex(ray.indexMilli)} · tốc độ ánh sáng v = c/n = {formatSpeed(lightSpeedInMedium(ray.indexMilli))} (c = {formatSpeed(config.lightSpeedKmS)})
          </p>}
        </section>}
        {error && <p role="alert" className="fl23-error">{error}</p>}
        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map(prompt => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={e => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="fl23-limits">{config.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="fl23-log" aria-label="Nhật ký thí nghiệm" data-testid="optics-log">
      <h2>Nhật ký thí nghiệm</h2>
      {log.length === 0 ? <p>Chưa có dòng nào. Mỗi lần đổi khối, xoay đèn, ghi bảng đo hay kiểm tra góc tới hạn sẽ được ghi ở đây.</p>
        : <ol>{[...log].reverse().map(entry => <li key={entry.seq}><b>{entry.actionVi}</b><span>{entry.phenomenaVi.join(". ")}</span></li>)}</ol>}
    </section>}
    <div className="lab-actions fl23-dock">
      <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
      <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map(item => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
