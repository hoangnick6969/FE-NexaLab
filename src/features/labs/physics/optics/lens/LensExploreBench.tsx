/**
 * Lens bench Explore (FL-23 thin lens, kit `k6-lens-bench@1`): special rays, image construction on a scale grid, focal length,
 * magnifier. No LabRun, no submission, no score; every change goes to the local notebook (spec fl-23-thin-lens-explore-spec.md).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Info, RotateCcw } from "lucide-react";
import { checkReading, evaluateFocal, evaluateImage, evaluateMagnifier, evaluateRays, type LensLabConfig, type LensStation } from "@nexalab/sim/optics/lens";
import { buildObservationLogExport } from "../../../shared/explore/observation-log";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { LabHeaderSlot, LabSpace } from "../../../shared/LabSpace";
import { LabQuestionPanel } from "../../../shared/question-panel/LabQuestionPanel";
import { listLensKitItems } from "./kit-items";
import {
  LENS_STATION_VI, RAY_PREDICTION_VI, RAY_VI, appendLensEntry, describeImage, formatMm, formatPower, lensKindVi, lensLogStore, parallelRayAnswer, parseMm,
  type LensLogEntry, type RayId, type RayPrediction,
} from "./lens-log";
import { FocalDiagram, ImageDiagram, MagnifierDiagram, RaysDiagram } from "./LensStage2D";
import { LensStage3D, type LensStageState } from "./LensStage3D";
import "./lens-explore.css";

const ERROR_VI: Record<string, string> = {
  STATION_NOT_ENABLED: "Bàn này không có trạm đó.",
  LENS_NOT_ALLOWED: "Trạm này không dùng thấu kính đó.",
  DISTANCE_NOT_INTEGER: "Khoảng cách đổi theo từng milimét.",
  DISTANCE_OUT_OF_RANGE: "Khoảng cách nằm ngoài giá quang học.",
  DISTANCE_OFF_STEP: "Khoảng cách đổi theo từng bước của thước.",
};
const ALL_RAYS: RayId[] = ["parallel", "centre", "focus"];
/** Station 3 hides the focal length: lenses are named by letter. */
const LETTER = ["A", "B", "C", "D"];
const clampStep = (value: number, min: number, max: number, step: number) => Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step));

type Check = { ok: boolean; textVi: string };

export type LensExploreBenchProps = { config: LensLabConfig; storageKey: string; activityId?: string; exitTo?: string; onExit?: () => void; draftNotice?: string };

export function LensExploreBench({ config, storageKey, activityId, exitTo, onExit, draftNotice }: LensExploreBenchProps) {
  // Catalog: FL-23 is 2D-first; the grid is where image distances are read.
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:k6-lens", "2d");
  const [station, setStation] = useState<LensStation>(config.stations[0]);
  const [raysLens, setRaysLens] = useState(config.rays?.lensIds[0] ?? "");
  const [prediction, setPrediction] = useState<RayPrediction | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [imageLens, setImageLens] = useState(config.image?.lensIds[0] ?? "");
  const [imageDistance, setImageDistance] = useState(config.image ? clampStep(300, config.image.minDistanceMm, config.image.maxDistanceMm, config.image.stepMm) : 0);
  const [shownRays, setShownRays] = useState<RayId[]>(["parallel", "centre"]);
  const [readGuess, setReadGuess] = useState({ distance: "", height: "" });
  const [imageCheck, setImageCheck] = useState<Check | null>(null);
  const [focalLens, setFocalLens] = useState(config.focal?.lensIds[0] ?? "");
  const [focalDistance, setFocalDistance] = useState(config.focal ? clampStep(150, config.focal.minDistanceMm, config.focal.maxDistanceMm, config.focal.stepMm) : 0);
  const [focalGuess, setFocalGuess] = useState("");
  const [focalCheck, setFocalCheck] = useState<Check | null>(null);
  const [loupeLens, setLoupeLens] = useState(config.magnifier?.lensIds[0] ?? "");
  const [loupeDistance, setLoupeDistance] = useState(config.magnifier ? clampStep(40, config.magnifier.minDistanceMm, config.magnifier.maxDistanceMm, config.magnifier.stepMm) : 0);
  const [log, setLog] = useState<LensLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(`nexalab:lens-explore-answers:${storageKey}`) ?? "{}"); } catch { return {}; } });
  const items = useMemo(() => listLensKitItems(config), [config]);
  const logRef = useRef(log);
  logRef.current = log;

  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  useEffect(() => { let alive = true; void lensLogStore.load(storageKey).then(entries => { if (alive) { setLog(entries); setLoaded(true); } }); return () => { alive = false; }; }, [storageKey]);
  useEffect(() => { if (loaded) void lensLogStore.save(storageKey, log); }, [loaded, log, storageKey]);
  useEffect(() => { try { localStorage.setItem(`nexalab:lens-explore-answers:${storageKey}`, JSON.stringify(answers)); } catch { /* per-session only */ } }, [answers, storageKey]);

  const add = (entry: Omit<LensLogEntry, "seq" | "at">) => setLog(appendLensEntry(logRef.current, { at: Date.now(), ...entry }));
  const rays = config.rays ? evaluateRays(config, raysLens) : null;
  const imageRead = config.image ? evaluateImage(config, { lensId: imageLens, distanceMm: imageDistance }) : null;
  const focalRead = config.focal ? evaluateFocal(config, { lensId: focalLens, objectDistanceMm: focalDistance }) : null;
  const loupeRead = config.magnifier ? evaluateMagnifier(config, { lensId: loupeLens, distanceMm: loupeDistance }) : null;
  const focalLetter = (lensId: string) => `Thấu kính ${LETTER[config.focal?.lensIds.indexOf(lensId) ?? 0] ?? "?"}`;

  /* Station 1 */
  const pickRaysLens = (lensId: string) => { setRaysLens(lensId); setPrediction(null); setRevealed(false); const lens = config.lenses.find((item) => item.id === lensId); if (lens) add({ station: "rays", actionVi: `Đặt ${lens.labelVi.toLowerCase()} lên giá`, phenomenaVi: [] }); };
  const reveal = () => {
    if (!prediction || !rays?.ok) return;
    setRevealed(true);
    const converging = rays.lens.focalMm > 0;
    add({ station: "rays", actionVi: `Dự đoán tia song song trục chính: ${RAY_PREDICTION_VI[prediction].toLowerCase()}; hiện tia ló`, phenomenaVi: [
      converging ? "Tia song song trục chính ló ra đi qua tiêu điểm F′" : "Tia song song trục chính ló ra có đường kéo dài đi qua tiêu điểm F′",
      "Tia qua quang tâm O truyền thẳng",
      converging ? "Tia qua tiêu điểm F ló ra song song với trục chính" : "Tia hướng tới tiêu điểm F ló ra song song với trục chính",
      `Dự đoán của em ${prediction === parallelRayAnswer() ? "khớp" : "chưa khớp"} với mô hình`,
    ] });
  };

  /* Station 2 */
  const moveImage = (next: { lensId?: string; distanceMm?: number }) => {
    const lensId = next.lensId ?? imageLens;
    const distanceMm = next.distanceMm ?? imageDistance;
    const result = evaluateImage(config, { lensId, distanceMm });
    if (!result.ok) { setError(ERROR_VI[result.code] ?? result.code); return; }
    setError("");
    setImageLens(lensId);
    setImageDistance(distanceMm);
    setImageCheck(null);
    add({ station: "image", actionVi: `${result.lens.labelVi}: vật cách thấu kính ${formatMm(distanceMm)}`, merge: `image-${lensId}`, phenomenaVi: shownRays.length >= 2 ? [`Dựng được ${describeImage(result.image)}`] : [] });
  };
  const toggleRay = (ray: RayId) => setShownRays((current) => current.includes(ray) ? current.filter((item) => item !== ray) : [...current, ray]);
  const checkImage = () => {
    if (!imageRead?.ok || !config.image) return;
    const image = imageRead.image;
    if (image.kind === "none") { setImageCheck({ ok: true, textVi: "Vật ở tiêu điểm: không có ảnh để đo." }); return; }
    const d = parseMm(readGuess.distance);
    const h = parseMm(readGuess.height);
    if (d === null || h === null) { setError("Nhập d′ và h′ em đọc trên lưới (mm)."); return; }
    setError("");
    const tol = config.image.toleranceMm;
    const okD = checkReading(Math.abs(d), Math.abs(image.distanceMm), tol);
    const okH = checkReading(Math.abs(h), Math.abs(image.heightMm), tol);
    const textVi = `Mô hình: d′ = ${formatMm(Math.abs(image.distanceMm))}${image.real ? "" : " (ảnh ảo, cùng phía với vật)"}, h′ = ${formatMm(Math.abs(image.heightMm))}; em đọc d′ ${okD ? "khớp" : "chưa khớp"}, h′ ${okH ? "khớp" : "chưa khớp"} (sai số ±${tol} mm)`;
    setImageCheck({ ok: okD && okH, textVi });
    add({ station: "image", actionVi: `Kiểm tra số đọc trên lưới: d′ = ${formatMm(d)}, h′ = ${formatMm(h)}`, phenomenaVi: [textVi] });
  };

  /* Station 3 */
  const moveFocal = (next: { lensId?: string; distanceMm?: number }) => {
    const lensId = next.lensId ?? focalLens;
    const distanceMm = next.distanceMm ?? focalDistance;
    const result = evaluateFocal(config, { lensId, objectDistanceMm: distanceMm });
    if (!result.ok) { setError(ERROR_VI[result.code] ?? result.code); return; }
    setError("");
    setFocalLens(lensId);
    setFocalDistance(distanceMm);
    if (next.lensId) setFocalCheck(null);
    add({ station: "focal", actionVi: `${focalLetter(lensId)}: dịch vật và màn, mỗi bên cách thấu kính ${formatMm(distanceMm)}`, merge: `focal-${lensId}`,
      phenomenaVi: [result.sharpAndEqual ? `Ảnh rõ nét và bằng vật; khoảng cách vật – màn L = ${formatMm(result.separationMm)}` : Number.isFinite(result.blurMm) ? "Ảnh trên màn còn nhoè" : "Không hứng được ảnh trên màn"] });
  };
  const checkFocal = () => {
    if (!focalRead?.ok || !config.focal) return;
    const typed = parseMm(focalGuess);
    if (typed === null) { setError("Nhập tiêu cự em tính được (mm)."); return; }
    setError("");
    const ok = checkReading(typed, focalRead.lens.focalMm, config.focal.toleranceMm);
    const textVi = `${focalLetter(focalLens)} có tiêu cự ${formatMm(focalRead.lens.focalMm)}; em tính ${Number.isFinite(typed) ? formatMm(typed) : focalGuess}: ${ok ? "khớp" : "chưa khớp"} (sai số ±${config.focal.toleranceMm} mm)`;
    setFocalCheck({ ok, textVi });
    add({ station: "focal", actionVi: `Kiểm tra tiêu cự của ${focalLetter(focalLens).toLowerCase()}`, phenomenaVi: [textVi] });
  };

  /* Station 4 */
  const moveLoupe = (next: { lensId?: string; distanceMm?: number }) => {
    const lensId = next.lensId ?? loupeLens;
    const distanceMm = next.distanceMm ?? loupeDistance;
    const result = evaluateMagnifier(config, { lensId, distanceMm });
    if (!result.ok) { setError(ERROR_VI[result.code] ?? result.code); return; }
    setError("");
    setLoupeLens(lensId);
    setLoupeDistance(distanceMm);
    add({ station: "magnifier", actionVi: `Kính lúp ${formatPower(result.power)} cách vật ${formatMm(distanceMm)}`, merge: `loupe-${lensId}`,
      phenomenaVi: [result.usable ? `Vật trong khoảng tiêu cự: thấy ${describeImage(result.image)}` : result.image.kind === "none" ? "Vật ở tiêu điểm: không thấy ảnh rõ" : "Vật ngoài khoảng tiêu cự: ảnh thật ngược chiều ở phía bên kia, không dùng như kính lúp"] });
  };

  const reset = () => {
    setPrediction(null); setRevealed(false); setShownRays(["parallel", "centre"]); setReadGuess({ distance: "", height: "" });
    setImageCheck(null); setFocalGuess(""); setFocalCheck(null); setError("");
  };
  const exportLog = () => {
    const data = buildObservationLogExport({ labId: config.labId, activityId: activityId ?? `config-${config.configVersion}`, engine: config.engine, title: config.title }, log);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `nhat-ky-${config.labId}.json` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const scene = (() => {
    if (station === "rays" && rays?.ok) return { node: <RaysDiagram focalMm={rays.lens.focalMm} revealed={revealed} />, stage: { station, focalMm: rays.lens.focalMm, objectMm: -2.5 * Math.abs(rays.lens.focalMm), screenMm: null, blur: null, imageScale: null }, status: `${rays.lens.labelVi}: ba tia đặc biệt` };
    if (station === "image" && imageRead?.ok) return { node: <ImageDiagram focalMm={imageRead.lens.focalMm} distanceMm={imageDistance} heightMm={imageRead.objectHeightMm} image={imageRead.image} rays={shownRays} formula={config.display.lensFormula} />,
      stage: { station, focalMm: imageRead.lens.focalMm, objectMm: -imageDistance, screenMm: null, blur: null, imageScale: null },
      status: `Vật cách thấu kính ${formatMm(imageDistance)}${shownRays.length >= 2 ? `: ${describeImage(imageRead.image)}` : ""}` };
    if (station === "focal" && focalRead?.ok) {
      const k = focalRead.image.kind === "image" && focalRead.image.real ? focalRead.image.magnification : null;
      return { node: <FocalDiagram distanceMm={focalDistance} blurMm={focalRead.blurMm} magnification={k} lensLabel={focalLetter(focalLens)} />,
        stage: { station, focalMm: focalRead.lens.focalMm, objectMm: -focalDistance, screenMm: focalDistance, blur: Number.isFinite(focalRead.blurMm) ? focalRead.blurMm : null, imageScale: k },
        status: `${focalLetter(focalLens)}: L = ${formatMm(focalRead.separationMm)}, ảnh ${focalRead.sharpAndEqual ? "rõ nét và bằng vật" : "chưa rõ nét"}` };
    }
    if (station === "magnifier" && loupeRead?.ok) return { node: <MagnifierDiagram focalMm={loupeRead.lens.focalMm} distanceMm={loupeDistance} image={loupeRead.image} power={loupeRead.power} />,
      stage: { station, focalMm: loupeRead.lens.focalMm, objectMm: loupeDistance, screenMm: null, blur: null, imageScale: null },
      status: `Kính lúp ${formatPower(loupeRead.power)} cách vật ${formatMm(loupeDistance)}` };
    return null;
  })();
  const last = log.at(-1);
  const tools = <>
    <button type="button" onClick={() => setIntroOpen(true)} aria-label="Giới thiệu và an toàn"><Info size={14} aria-hidden="true" /><span>Giới thiệu</span></button>
    <button type="button" className="lab-reset" onClick={reset} aria-label="Làm lại"><RotateCcw size={14} aria-hidden="true" /><span>Làm lại</span></button>
  </>;
  const slider = (labelVi: string, aria: string, value: number, range: { minDistanceMm: number; maxDistanceMm: number; stepMm: number }, onChange: (value: number) => void) => <>
    <label className="fl23l-slider">{labelVi}: <b>{formatMm(value)}</b>
      <input type="range" min={range.minDistanceMm} max={range.maxDistanceMm} step={range.stepMm} value={value} aria-label={aria} onChange={e => onChange(Number(e.target.value))} />
    </label>
    <div className="fl23l-row" role="group" aria-label={`${aria}: bước`}>
      {[-5, -1, 1, 5].map(k => { const next = value + k * range.stepMm; return <button key={k} type="button" disabled={next < range.minDistanceMm || next > range.maxDistanceMm} onClick={() => onChange(next)}>{k > 0 ? "+" : "−"}{formatMm(Math.abs(k) * range.stepMm)}</button>; })}
    </div>
  </>;

  return <LabSpace title={config.title} exitTo={exitTo} onExit={onExit} tools={tools}>
    <div className="fl23l-explore" data-testid="lens-explore" data-kit={config.kit} data-station={station}>
      <div className="fl23l-scene">
        {scene && (mode === "3d" ? <LensStage3D apparatus={config.enabledApparatus} state={scene.stage as LensStageState} /> : <div className="fl23l-2d" data-testid="lens-2d">{scene.node}</div>)}
        <p className="fl23l-observation" role="status">{scene?.status ?? ""} · Mô hình thấu kính mỏng</p>
      </div>
      <LabHeaderSlot fallbackClassName="fl23l-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
      <LabQuestionPanel id="fl23l-explore" prefix="fl23l" className="fl23l-explore-panel" ariaLabel="Bàn thấu kính" open={panelOpen} onOpenChange={setPanelOpen}
        badgeLabel="Mở bàn thấu kính" eyebrow={config.contextLabel ?? "Vật lý · Khám phá"} stepLabel="Khám phá tự do · không chấm điểm" heading={config.title} closeLabel="Đóng bảng">
        <section className="lqp-section" data-testid="lens-kit-items"><h3>Dụng cụ và thành phần</h3>
          <ul className="fl23l-items">{items.map(item => <li key={item.id} data-item={item.id}><b>{item.labelVi}</b><span>{item.purposeVi}</span></li>)}</ul>
        </section>
        {config.stations.length > 1 && <div className="fl23l-tabs" role="tablist" aria-label="Trạm thí nghiệm">
          {config.stations.map(id => <button key={id} type="button" role="tab" aria-selected={station === id} onClick={() => { setStation(id); setError(""); }}>{LENS_STATION_VI[id]}</button>)}
        </div>}

        {station === "rays" && config.rays && rays?.ok && <section className="lqp-section" data-testid="lens-rays"><h3>Ba tia sáng đặc biệt</h3>
          <div className="fl23l-row" role="group" aria-label="Thấu kính">
            {config.rays.lensIds.map(id => { const lens = config.lenses.find(item => item.id === id)!; return <button key={id} type="button" aria-pressed={raysLens === id} onClick={() => pickRaysLens(id)}>Thấu kính {lensKindVi(lens.focalMm)}</button>; })}
          </div>
          <p className="fl23l-note">O là quang tâm, đường nằm ngang là trục chính, F và F′ là hai tiêu điểm chính, cách O một tiêu cự f = {formatMm(Math.abs(rays.lens.focalMm))}.</p>
          {!revealed ? <div className="fl23l-predict">
            <p className="fl23l-note">Tia song song với trục chính sẽ ló ra khỏi thấu kính thế nào?</p>
            <div className="fl23l-row" role="group" aria-label="Dự đoán tia ló">
              {(Object.keys(RAY_PREDICTION_VI) as RayPrediction[]).map(option => <button key={option} type="button" aria-pressed={prediction === option} onClick={() => setPrediction(option)}>{RAY_PREDICTION_VI[option]}</button>)}
            </div>
            <div className="fl23l-row"><button type="button" className="fl23l-primary" disabled={!prediction} onClick={reveal}>Hiện tia ló</button></div>
          </div> : <p className="fl23l-result" data-testid="lens-rays-result" data-match={prediction === parallelRayAnswer()}>
            Em dự đoán: {prediction ? RAY_PREDICTION_VI[prediction].toLowerCase() : "?"} · {prediction === parallelRayAnswer() ? "khớp với mô hình" : "chưa khớp: tia ló đi qua (hoặc kéo dài qua) F′"}
          </p>}
        </section>}

        {station === "image" && config.image && imageRead?.ok && <section className="lqp-section" data-testid="lens-image"><h3>Dựng ảnh của vật AB</h3>
          <div className="fl23l-row" role="group" aria-label="Thấu kính">
            {config.image.lensIds.map(id => { const lens = config.lenses.find(item => item.id === id)!; return <button key={id} type="button" aria-pressed={imageLens === id} onClick={() => moveImage({ lensId: id })}>{lens.labelVi}</button>; })}
          </div>
          {slider("Khoảng cách vật – thấu kính d", "Khoảng cách vật", imageDistance, config.image, (value) => moveImage({ distanceMm: value }))}
          <div className="fl23l-row" role="group" aria-label="Tia dùng để dựng ảnh">
            {ALL_RAYS.map(ray => <button key={ray} type="button" aria-pressed={shownRays.includes(ray)} onClick={() => toggleRay(ray)}>{RAY_VI[ray]}</button>)}
          </div>
          {shownRays.length < 2 ? <p className="fl23l-note">Chọn ít nhất hai tia để dựng ảnh B′.</p>
            : <p className="fl23l-reading" data-testid="lens-image-kind">Tính chất: <b>{describeImage(imageRead.image)}</b></p>}
          {shownRays.length >= 2 && imageRead.image.kind === "image" && <div className="fl23l-guess">
            <label>Khoảng cách ảnh – thấu kính d′ em đọc trên lưới (mm)<input inputMode="decimal" value={readGuess.distance} onChange={e => setReadGuess({ ...readGuess, distance: e.target.value })} /></label>
            <label>Chiều cao ảnh h′ (mm)<input inputMode="decimal" value={readGuess.height} onChange={e => setReadGuess({ ...readGuess, height: e.target.value })} /></label>
            <button type="button" onClick={checkImage}>Kiểm tra</button>
          </div>}
          {imageCheck && <p className="fl23l-result" data-testid="lens-image-check" data-ok={imageCheck.ok}>{imageCheck.textVi}</p>}
        </section>}

        {station === "focal" && config.focal && focalRead?.ok && <section className="lqp-section" data-testid="lens-focal"><h3>Đo tiêu cự thấu kính hội tụ</h3>
          <div className="fl23l-row" role="group" aria-label="Thấu kính cần đo">
            {config.focal.lensIds.map(id => <button key={id} type="button" aria-pressed={focalLens === id} onClick={() => moveFocal({ lensId: id })}>{focalLetter(id)}</button>)}
          </div>
          <p className="fl23l-note">Vật và màn luôn cách thấu kính bằng nhau. Dịch cho tới khi ảnh trên màn rõ nét và cao bằng vật, đọc khoảng cách vật – màn L rồi tính f.</p>
          {slider("Khoảng cách vật – thấu kính (= màn – thấu kính)", "Khoảng cách vật và màn", focalDistance, config.focal, (value) => moveFocal({ distanceMm: value }))}
          <p className="fl23l-reading" data-testid="lens-focal-state" data-sharp={focalRead.sharpAndEqual}>L = <b>{formatMm(focalRead.separationMm)}</b> · {focalRead.sharpAndEqual ? "ảnh rõ nét và bằng vật" : Number.isFinite(focalRead.blurMm) ? "ảnh còn nhoè" : "không hứng được ảnh"}</p>
          <div className="fl23l-guess">
            <label>Tiêu cự em tính được (mm)<input inputMode="decimal" value={focalGuess} onChange={e => setFocalGuess(e.target.value)} /></label>
            <button type="button" onClick={checkFocal}>Kiểm tra</button>
          </div>
          {focalCheck && <p className="fl23l-result" data-testid="lens-focal-check" data-ok={focalCheck.ok}>{focalCheck.textVi}</p>}
        </section>}

        {station === "magnifier" && config.magnifier && loupeRead?.ok && <section className="lqp-section" data-testid="lens-magnifier"><h3>Kính lúp</h3>
          <div className="fl23l-row" role="group" aria-label="Kính lúp">
            {config.magnifier.lensIds.map(id => { const lens = config.lenses.find(item => item.id === id)!; return <button key={id} type="button" aria-pressed={loupeLens === id} onClick={() => moveLoupe({ lensId: id })}>{formatPower(250 / lens.focalMm)} (f = {formatMm(lens.focalMm)})</button>; })}
          </div>
          {slider("Khoảng cách kính – vật", "Khoảng cách kính lúp", loupeDistance, config.magnifier, (value) => moveLoupe({ distanceMm: value }))}
          <p className="fl23l-reading" data-testid="lens-magnifier-state" data-usable={loupeRead.usable}>
            {loupeRead.usable ? <>Vật trong khoảng tiêu cự: <b>{describeImage(loupeRead.image)}</b></> : loupeRead.image.kind === "none" ? "Vật ở tiêu điểm: không thấy ảnh rõ" : "Vật ngoài khoảng tiêu cự: không dùng được như kính lúp"}
          </p>
          <p className="fl23l-note">Số bội giác ghi trên kính: G = 25/f (f tính bằng cm) = {formatPower(loupeRead.power)}.</p>
        </section>}

        {error && <p role="alert" className="fl23l-error">{error}</p>}
        {(config.pedagogy.observationPrompts?.length ?? 0) > 0 && <section className="lqp-section"><h3>Gợi ý quan sát</h3>
          {config.pedagogy.observationPrompts!.map(prompt => prompt.kind === "free_text"
            ? <label key={prompt.id}>{prompt.textVi}<textarea rows={3} value={answers[prompt.id] ?? ""} onChange={e => setAnswers({ ...answers, [prompt.id]: e.target.value })} /></label>
            : <p key={prompt.id}>{prompt.textVi}</p>)}
        </section>}
        <details className="lqp-section"><summary>Giới hạn của mô hình</summary><ul className="fl23l-limits">{config.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      </LabQuestionPanel>
      <p className="sr-only" aria-live="polite">{last ? `${last.actionVi}. ${last.phenomenaVi.join(". ")}` : ""}</p>
    </div>
    {logOpen && <section className="fl23l-log" aria-label="Nhật ký thí nghiệm" data-testid="lens-log">
      <h2>Nhật ký thí nghiệm</h2>
      {log.length === 0 ? <p>Chưa có dòng nào. Mỗi lần đổi thấu kính, dịch vật, dựng ảnh, đo tiêu cự hay dùng kính lúp sẽ được ghi ở đây.</p>
        : <ol>{[...log].reverse().map(entry => <li key={entry.seq}><b>{entry.actionVi}</b><span>{entry.phenomenaVi.join(". ")}</span></li>)}</ol>}
    </section>}
    <div className="lab-actions fl23l-dock">
      <button type="button" className="secondary" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}><BookOpen size={16} aria-hidden="true" />Nhật ký ({log.length})</button>
      <button type="button" className="secondary" disabled={!log.length} onClick={exportLog}><Download size={16} aria-hidden="true" />Xuất nhật ký</button>
    </div>
    {introOpen && <LabIntroOverlay title={config.title} contextLabel={config.contextLabel} outcomes={config.outcomeSummary} safety={config.safetyBriefing} limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired} acknowledged draftNotice={draftNotice}
      apparatus={items.map(item => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))} materials={[]}
      onEnter={() => setIntroOpen(false)} onClose={log.length ? () => setIntroOpen(false) : undefined} />}
  </LabSpace>;
}
