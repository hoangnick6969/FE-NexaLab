/**
 * Thermal bench Explore (FL-08, kit `k4-thermal-bench@1`): the three stations of SGK KHTN 8 Bài 28, each with its own
 * simulated clock. No LabRun, no submission, no score; actions and the events they cause go to the local notebook.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, FastForward, Info, Pause, Play, RotateCcw } from "lucide-react";
import {
  CONDUCTIVITY_TABLE, evaluateConduction, evaluateConvection, evaluateRadiation,
  type RadiationEvent, type RodMaterial, type Surface, type ThermalLabConfig, type ThermalStation,
} from "@nexalab/sim/thermal";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { listThermalKitItems } from "./kit-items";
import {
  FLAME_VI, WAX_VI, appendThermalEntry, describeRodsAtEnd, droppedBetween, formatSeconds, formatTenthsC, materialVi, meltedBetween, pinDropVi,
  thermalLogStore, tubeMeltVi, tubeStillVi, type RodView, type ThermalLogEntry, type TubeView,
} from "./transfer-log";
import { useStationClock, type StationClock } from "./useStationClock";
import { Conduction2D, Convection2D, Radiation2D } from "./ThermalStage2D";
import { ThermalStage3D } from "./ThermalStage3D";
import "./transfer-explore.css";

const STATION_VI: Record<ThermalStation, string> = { conduction: "Dẫn nhiệt", convection: "Đối lưu", radiation: "Bức xạ nhiệt" };
const SKIP_SECONDS = 60;

function ClockBar({ clock, speeds, maxSeconds, canRun, testId }: { clock: StationClock; speeds: readonly number[]; maxSeconds: number; canRun: boolean; testId: string }) {
  const done = clock.seconds >= maxSeconds;
  return <div className="fl08-clock" data-testid={testId}>
    <span className="fl08-time" aria-live="off">Đồng hồ: <b data-testid={`${testId}-seconds`}>{clock.seconds} s</b> / {maxSeconds} s</span>
    <div className="fl08-row">
      {clock.running
        ? <button type="button" onClick={clock.pause}><Pause size={14} aria-hidden="true" />Dừng</button>
        : <button type="button" onClick={clock.play} disabled={!canRun || done}><Play size={14} aria-hidden="true" />Chạy</button>}
      <button type="button" onClick={() => clock.skip(SKIP_SECONDS)} disabled={!canRun || done}><FastForward size={14} aria-hidden="true" />Tua thêm {SKIP_SECONDS} s</button>
    </div>
    <div className="fl08-row" role="group" aria-label="Tốc độ đồng hồ">
      {speeds.map((speed) => <button key={speed} type="button" aria-pressed={clock.speed === speed} onClick={() => clock.setSpeed(speed)}>×{speed}</button>)}
    </div>
  </div>;
}

export type ThermalExploreBenchProps = {
  config: ThermalLabConfig;
  storageKey: string;
  activityId?: string;
  exitTo?: string;
  onExit?: () => void;
  draftNotice?: string;
};

export function ThermalExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice }: ThermalExploreBenchProps) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:thermal-k4-transfer");
  const [station, setStation] = useState<ThermalStation>(config.stations[0]);
  const max = config.clock.maxSeconds;
  const speeds = config.clock.speeds;
  const conductionClock = useStationClock(max, speeds[speeds.length - 1]);
  const convectionClock = useStationClock(max, speeds[speeds.length - 1]);
  const radiationClock = useStationClock(max, speeds[Math.min(1, speeds.length - 1)]);
  const conductionSettings = config.conduction;
  const [rods, setRods] = useState<RodMaterial[]>(() => conductionSettings?.materials.slice(0, conductionSettings.maxRods) ?? []);
  const [heated, setHeated] = useState(false);
  const [flames, setFlames] = useState<Record<"1" | "2", "bottom" | "mouth" | null>>({ "1": null, "2": null });
  const [heating, setHeating] = useState(false);
  const [events, setEvents] = useState<RadiationEvent[]>([{ atSeconds: 0, lampOn: false, screen: false, surface: "black" }]);
  const [log, setLog] = useState<ThermalLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:thermal-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listThermalKitItems(config), [config]);
  const logRef = useRef(log);
  logRef.current = log;
  const add = (entry: Omit<ThermalLogEntry, "seq" | "at">) => setLog((current) => appendThermalEntry(current, { ...entry, at: Date.now() }));

  // Readings of the three stations at their clocks.
  const conductionResult = conductionSettings ? evaluateConduction(conductionSettings, max, { rods, heated, elapsedSeconds: conductionClock.seconds }) : null;
  const rodViews: RodView[] = conductionResult?.ok ? conductionResult.rods.map((rod) => ({ material: rod.material, pins: rod.pins.map((pin) => ({ ...pin })) })) : [];
  const convectionResult = config.convection ? evaluateConvection(config.convection, max, { flames: heating ? flames : {}, elapsedSeconds: convectionClock.seconds }) : null;
  const tubeViews: TubeView[] = convectionResult?.ok ? convectionResult.tubes.map((tube) => ({ ...tube, flame: flames[tube.id] })) : [];
  const radiationResult = config.radiation ? evaluateRadiation(config.radiation, max, events, radiationClock.seconds) : null;
  const tenthsC = radiationResult?.ok ? radiationResult.tenthsC : config.radiation?.startTenthsC ?? 0;
  const radiationNow = events[events.length - 1];

  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void thermalLogStore.load(storageKey).then((entries) => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void thermalLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:thermal-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  // Events the clocks cause: pins that drop, wax that melts, and what is still unchanged when the window ends.
  const lastRods = useRef<RodView[]>([]);
  const conductionEnded = useRef(false);
  useEffect(() => {
    const before = lastRods.current;
    lastRods.current = rodViews;
    if (!heated) return;
    for (const event of droppedBetween(before, rodViews)) add({ station: "conduction", simSeconds: event.seconds, actionVi: pinDropVi(event), phenomenaVi: [] });
    if (conductionClock.seconds >= max && !conductionEnded.current) {
      conductionEnded.current = true;
      add({ station: "conduction", simSeconds: max, actionVi: `Hết ${formatSeconds(max)} quan sát`, phenomenaVi: describeRodsAtEnd(rodViews) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductionClock.seconds, heated]);
  const lastTubes = useRef<TubeView[]>([]);
  const convectionEnded = useRef(false);
  useEffect(() => {
    const before = lastTubes.current;
    lastTubes.current = tubeViews;
    if (!heating || !config.convection) return;
    for (const tube of meltedBetween(before, tubeViews)) add({ station: "convection", simSeconds: config.convection.meltSeconds, actionVi: tubeMeltVi(tube, config.convection.meltSeconds), phenomenaVi: [] });
    if (convectionClock.seconds >= max && !convectionEnded.current) {
      convectionEnded.current = true;
      for (const tube of tubeViews.filter((t) => t.flame && !t.melted)) add({ station: "convection", simSeconds: max, actionVi: tubeStillVi(tube, max), phenomenaVi: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convectionClock.seconds, heating]);

  const resetConduction = () => { conductionClock.reset(); setHeated(false); lastRods.current = []; conductionEnded.current = false; };
  const setRod = (index: number, material: RodMaterial) => { resetConduction(); setRods((current) => current.map((value, i) => (i === index ? material : value))); };
  const light = () => {
    setHeated(true);
    conductionClock.play();
    add({ station: "conduction", simSeconds: conductionClock.seconds, actionVi: `Đốt đầu A của thanh ${rods.map(materialVi).join(", ")}`, phenomenaVi: [] });
  };
  const resetConvection = () => { convectionClock.reset(); setHeating(false); lastTubes.current = []; convectionEnded.current = false; };
  const setFlame = (id: "1" | "2", flame: "bottom" | "mouth" | null) => { resetConvection(); setFlames((current) => ({ ...current, [id]: flame })); };
  const startHeating = () => {
    setHeating(true);
    convectionClock.play();
    const lit = (["1", "2"] as const).filter((id) => flames[id]).map((id) => `ống (${id}) ${FLAME_VI[flames[id]!]}`);
    add({ station: "convection", simSeconds: 0, actionVi: `Bắt đầu đun: ${lit.join(", ")}`, phenomenaVi: [] });
  };
  const changeRadiation = (patch: Partial<Omit<RadiationEvent, "atSeconds">>, actionVi: string) => {
    const at = radiationClock.seconds;
    const next = { ...radiationNow, ...patch, atSeconds: at };
    setEvents((current) => (current[current.length - 1].atSeconds === at ? [...current.slice(0, -1), next] : [...current, next]));
    add({ station: "radiation", simSeconds: at, actionVi, phenomenaVi: [`Nhiệt kế ${formatTenthsC(tenthsC)} lúc ${formatSeconds(at)}`] });
  };
  const resetRadiation = () => { radiationClock.reset(); setEvents([{ atSeconds: 0, lampOn: false, screen: false, surface: radiationNow.surface }]); };
  const resetAll = () => { resetConduction(); resetConvection(); resetRadiation(); };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const status = station === "conduction"
    ? heated ? `Đã đốt đầu A · ${conductionClock.seconds} s · ${rodViews.map((rod) => `${materialVi(rod.material)} ${rod.pins.filter((pin) => pin.dropped).length} đinh rơi`).join(", ")}` : "Chưa đốt đầu A"
    : station === "convection"
      ? heating ? `Đang đun · ${convectionClock.seconds} s · ${tubeViews.map((tube) => `ống (${tube.id}) ${tube.melted ? "sáp đã chảy" : "sáp chưa chảy"}`).join(", ")}` : "Chưa đun"
      : `Nhiệt kế ${formatTenthsC(tenthsC)} · ${radiationClock.seconds} s · đèn ${radiationNow.lampOn ? "bật" : "tắt"}${radiationNow.screen ? ", có tấm gỗ" : ""}`;
  const last = log.at(-1);
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={resetAll} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;
  const table = Object.entries(CONDUCTIVITY_TABLE).sort((a, b) => a[1].relative - b[1].relative);

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools}>
    <div className="fl08-explore" data-testid="thermal-explore" data-kit={config.kit} data-station={station}>
      <div className="fl08-scene">
        {mode === "3d"
          ? <ThermalStage3D station={station} reduced={reduced}
            conduction={conductionSettings ? { rods: rodViews, lengthMm: conductionSettings.rodLengthMm, heated } : undefined}
            convection={config.convection ? { tubes: tubeViews, dye: config.convection.dye } : undefined}
            radiation={config.radiation ? { lampOn: radiationNow.lampOn, screen: radiationNow.screen, surface: radiationNow.surface, tenthsC, seconds: radiationClock.seconds, running: radiationClock.running } : undefined} />
          : <div className="fl08-2d" data-testid="thermal-2d">
            {station === "conduction" && conductionSettings && <Conduction2D rods={rodViews} lengthMm={conductionSettings.rodLengthMm} heated={heated} />}
            {station === "convection" && <Convection2D tubes={tubeViews} />}
            {station === "radiation" && <Radiation2D lampOn={radiationNow.lampOn} screen={radiationNow.screen} surface={radiationNow.surface} tenthsC={tenthsC} />}
          </div>}
        <p className="fl08-observation" role="status">{status} · Mô hình lý tưởng</p>
      </div>
      <LabHeaderSlot fallbackClassName="fl08-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="fl08-explore" prefix="fl08" className="fl08-explore-panel" ariaLabel="Bàn nhiệt" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn nhiệt" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="thermal-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="fl08-items">{items.map((item) => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        {config.stations.length > 1 && <div className="fl08-tabs" role="tablist" aria-label="Trạm thí nghiệm">
          {config.stations.map((id) => <button key={id} type="button" role="tab" aria-selected={station === id} onClick={() => setStation(id)}>{STATION_VI[id]}</button>)}
        </div>}

        {station === "conduction" && conductionSettings && <section className="lqp-section" data-testid="thermal-conduction"><h3>Dẫn nhiệt</h3>
          <div className="fl08-rods">
            {rods.map((material, index) => <label key={index}>Giá {index + 1}
              <select value={material} onChange={(e) => setRod(index, e.target.value as RodMaterial)}>
                {conductionSettings.materials.map((option) => <option key={option} value={option}>{materialVi(option)}</option>)}
              </select>
            </label>)}
          </div>
          {!heated && <button type="button" className="fl08-primary" onClick={light}>Đốt đầu A</button>}
          <ClockBar clock={conductionClock} speeds={speeds} maxSeconds={max} canRun={heated} testId="clock-conduction" />
          <table className="fl08-table" data-testid="thermal-pins">
            <thead><tr><th scope="col">Thanh</th>{conductionSettings.pinPositionsMm.map((x, index) => <th key={x} scope="col">{["a", "b", "c", "d", "e", "f", "g", "h"][index]}</th>)}</tr></thead>
            <tbody>{rodViews.map((rod, index) => <tr key={index} data-rod={rod.material}>
              <th scope="row">{materialVi(rod.material)}</th>
              {rod.pins.map((pin) => <td key={pin.id} data-dropped={pin.dropped}>{pin.dropped ? formatSeconds(pin.meltSeconds!) : "–"}</td>)}
            </tr>)}</tbody>
          </table>
          {config.measurements.includes("conductivity_table") && <details className="fl08-k"><summary>Bảng 28.1 · Khả năng dẫn nhiệt so với không khí</summary>
            <table className="fl08-table" data-testid="thermal-k-table"><tbody>{table.map(([id, row]) => <tr key={id}><th scope="row">{row.labelVi}</th><td>{row.relative.toLocaleString("vi-VN")}</td></tr>)}</tbody></table>
          </details>}
        </section>}

        {station === "convection" && config.convection && <section className="lqp-section" data-testid="thermal-convection"><h3>Đối lưu</h3>
          {config.convection.tubes.map((tube) => <div key={tube.id} className="fl08-row fl08-tube" role="group" aria-label={`Ống (${tube.id}), sáp ${WAX_VI[tube.wax]}`}>
            <span>Ống ({tube.id}) · sáp {WAX_VI[tube.wax]}</span>
            {(["mouth", "bottom"] as const).map((flame) => <button key={flame} type="button" aria-pressed={flames[tube.id] === flame} onClick={() => setFlame(tube.id, flames[tube.id] === flame ? null : flame)}>Đun {FLAME_VI[flame]}</button>)}
          </div>)}
          {!heating && <button type="button" className="fl08-primary" onClick={startHeating} disabled={!flames["1"] && !flames["2"]}>Bắt đầu đun</button>}
          <ClockBar clock={convectionClock} speeds={speeds} maxSeconds={max} canRun={heating} testId="clock-convection" />
          <ul className="fl08-results" data-testid="thermal-tubes">{tubeViews.map((tube) => <li key={tube.id} data-tube={tube.id} data-melted={tube.melted}>Ống ({tube.id}): {tube.melted ? `sáp ${WAX_VI[tube.wax]} đã chảy` : `sáp ${WAX_VI[tube.wax]} chưa chảy`}</li>)}</ul>
        </section>}

        {station === "radiation" && config.radiation && <section className="lqp-section" data-testid="thermal-radiation"><h3>Bức xạ nhiệt</h3>
          <div className="fl08-row">
            <button type="button" aria-pressed={radiationNow.lampOn} onClick={() => changeRadiation({ lampOn: !radiationNow.lampOn }, radiationNow.lampOn ? "Tắt đèn" : "Bật đèn")}>{radiationNow.lampOn ? "Tắt đèn" : "Bật đèn"}</button>
            <button type="button" aria-pressed={radiationNow.screen} onClick={() => changeRadiation({ screen: !radiationNow.screen }, radiationNow.screen ? "Bỏ tấm gỗ" : "Đặt tấm gỗ chắn")}>{radiationNow.screen ? "Bỏ tấm gỗ" : "Đặt tấm gỗ chắn"}</button>
          </div>
          <div className="fl08-row" role="group" aria-label="Mặt ngoài bình">
            {(["black", "silver"] as Surface[]).map((surface) => <button key={surface} type="button" aria-pressed={radiationNow.surface === surface} onClick={() => radiationNow.surface !== surface && changeRadiation({ surface }, `Đổi sang bình ${surface === "black" ? "phủ đen" : "tráng bạc"}`)}>{surface === "black" ? "Phủ đen" : "Tráng bạc"}</button>)}
          </div>
          <ClockBar clock={radiationClock} speeds={speeds} maxSeconds={max} canRun testId="clock-radiation" />
          <p className="fl08-reading">Nhiệt kế: <b data-testid="thermal-thermometer">{formatTenthsC(tenthsC)}</b></p>
          <button type="button" className="fl08-link" onClick={resetRadiation}>Làm lại trạm bức xạ</button>
        </section>}

        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map((prompt) => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="fl08-limits">{config.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="fl08-log" aria-label="Nhật ký thí nghiệm" data-testid="thermal-log">
      <h2>Nhật ký thí nghiệm</h2>
      {log.length === 0 ? <p>Chưa có dòng nào. Mỗi thao tác và mỗi lần đinh rơi, sáp chảy sẽ được ghi ở đây.</p>
        : <ol>{[...log].reverse().map((entry) => <li key={entry.seq}><b>{entry.actionVi}</b>{entry.phenomenaVi.length > 0 && <span>{entry.phenomenaVi.join(". ")}</span>}<small>{STATION_VI[entry.station]} · {formatSeconds(entry.simSeconds)}</small></li>)}</ol>}
    </section>}
    <div className="lab-actions fl08-dock">
      <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
      <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map((item) => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
