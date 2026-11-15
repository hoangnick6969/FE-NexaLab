import { useEffect, useRef, useState } from "react";
import { api } from "../../../../lib/api";
import { LabRendererToggle, useLabRendererMode } from "../../shared/LabRendererToggle";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { ChoiceGroup, LabQuestionPanel } from "../../shared/question-panel/LabQuestionPanel";
import { ThermalBench2D, ThermalBench3D } from "./kit/ThermalBenchStage";
import { parseThermalEnergy, parseThermalTemperature, thermalDegrees, type ThermalEvent, type ThermalObservation, type ThermalSnapshot } from "./thermal-readings";
import "./thermal-energy.css";

const initial: ThermalObservation = { elapsedMilliseconds: 0, meterReadingMilliJoules: 0, thermometerReadingMilliCelsius: 25000, riseMilliCelsius: 0, heaterState: "OFF" };
const ratios = [{ value: "more_than_double", label: "Hơn gấp đôi" }, { value: "double", label: "Gấp đôi" }, { value: "less_than_double", label: "Ít hơn gấp đôi" }];
const directions = [{ value: "increase", label: "Tăng" }, { value: "same", label: "Không đổi" }, { value: "decrease", label: "Giảm" }];
const boundaries = [{ value: "equal_ideal_only", label: "Trong nhiệt lượng kế lý tưởng của mô hình" }, { value: "always_equal", label: "Luôn bằng nhau trong mọi thí nghiệm thực tế" }, { value: "unrelated", label: "Hai đại lượng không liên quan" }];
const criteria: Record<string, string> = { R1: "Ghi dự đoán trước khi đun", R2: "Đọc điện năng và nhiệt độ ở 50 s", R3: "Tính độ tăng nhiệt độ ở 50 s", R4: "Ghi phép đo ở 100 s", R5: "So sánh hai độ tăng nhiệt độ", R6: "Nhận ra giới hạn nhiệt lượng kế lý tưởng" };
type Draft = { step: number; choice: string; fields: string[]; ratio: string; boundary: string };
function readDraft(key: string): Draft | null {
  try { const v = JSON.parse(sessionStorage.getItem(key) ?? "null"); return v && Number.isInteger(v.step) && typeof v.choice === "string" && Array.isArray(v.fields) && v.fields.length === 3 && v.fields.every((item: unknown) => typeof item === "string") && typeof v.ratio === "string" && typeof v.boundary === "string" ? v : null; } catch { return null; }
}
function Notebook({ observations, events }: Pick<ThermalSnapshot, "observations" | "events">) {
  const measurements = events.filter(event => event.type === "RECORDED_FIRST_MEASUREMENT" || event.type === "RECORDED_SECOND_MEASUREMENT");
  return <section className="lqp-section thermal-notebook" aria-label="Sổ số đo và đồ thị"><h3>Sổ số đo</h3>
    <table><caption>Số chỉ dụng cụ · T₀ = 25,0 °C</caption><thead><tr><th scope="col">t (s)</th><th scope="col">E (J)</th><th scope="col">T (°C)</th></tr></thead><tbody>{observations.map(item => <tr key={item.elapsedMilliseconds}><th scope="row">{item.elapsedMilliseconds / 1000}</th><td>{item.meterReadingMilliJoules / 1000}</td><td>{thermalDegrees(item.thermometerReadingMilliCelsius)}</td></tr>)}</tbody></table>
    {measurements.length > 0 && <details><summary>Số em đã ghi</summary><ul>{measurements.map(item => <li key={item.type}>{Number(item.elapsedMilliseconds) / 1000} s: E = {Number(item.energyMilliJoules) / 1000} J; T = {thermalDegrees(Number(item.temperatureMilliCelsius))} °C; ΔT = {thermalDegrees(Number(item.riseMilliCelsius))} °C</li>)}</ul></details>}
    <svg className="thermal-chart" viewBox="0 0 350 155" role="img" aria-label={`Đồ thị nhiệt độ theo thời gian: ${observations.map(item => `${item.elapsedMilliseconds / 1000} giây, ${thermalDegrees(item.thermometerReadingMilliCelsius)} độ C`).join("; ")}`}>
      <path d="M38 15 V118 H326" fill="none" stroke="#6c8480" strokeWidth="2" />
      {[25, 30, 35].map(v => <g key={v}><line x1="38" y1={118 - (v - 25) * 9} x2="326" y2={118 - (v - 25) * 9} stroke="#dbe4df" /><text x="30" y={122 - (v - 25) * 9} textAnchor="end">{v}</text></g>)}
      <polyline points={observations.map(item => `${38 + item.elapsedMilliseconds / 100000 * 280},${118 - item.riseMilliCelsius / 1000 * 9}`).join(" ")} fill="none" stroke="#23756c" strokeWidth="3" />
      {observations.map(item => <g key={item.elapsedMilliseconds}><circle cx={38 + item.elapsedMilliseconds / 100000 * 280} cy={118 - item.riseMilliCelsius / 1000 * 9} r="4" fill="#23756c" /><text x={38 + item.elapsedMilliseconds / 100000 * 280} y="137" textAnchor="middle">{item.elapsedMilliseconds / 1000}</text></g>)}<text x="4" y="12">°C</text><text x="329" y="152" textAnchor="end">t (s)</text>
    </svg></section>;
}
export function ThermalEnergyActivity({ runId, onSubmit, onNewRun, attempt, pendingSubmit, examMode = false, transport = api, submissionError, fixture = false }: {
  runId: string; onSubmit: () => void; onNewRun: () => void; attempt: any; pendingSubmit: boolean; examMode?: boolean; transport?: typeof api; submissionError?: unknown; fixture?: boolean;
}) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:thermal-k4");
  const [snapshot, setSnapshot] = useState<ThermalSnapshot | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [touched, setTouched] = useState(false);
  const [choice, setChoice] = useState(""), [fields, setFields] = useState(["", "", ""]), [ratio, setRatio] = useState(""), [boundary, setBoundary] = useState("");
  const [reduced, setReduced] = useState(false), [webglLost, setWebglLost] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(true);
  const retry = useRef<{ event: ThermalEvent; key: string } | null>(null), busy = useRef(false), currentRun = useRef(runId);
  currentRun.current = runId;
  const draftKey = `nexalab:thermal-draft:${runId}`;
  const load = async () => {
    setError("");
    try { const next = await transport<ThermalSnapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`); if (currentRun.current !== runId) return; setSnapshot(next); const draft = readDraft(draftKey); if (draft?.step === next.events.length) { setChoice(draft.choice); setFields(draft.fields); setRatio(draft.ratio); setBoundary(draft.boundary); setTouched(draft.fields.some(Boolean)); } }
    catch { if (currentRun.current === runId) setError("Không tải được tiến trình. Em có thể thử tải lại hoặc bắt đầu lượt mới."); }
  };
  useEffect(() => { setSnapshot(null); setChoice(""); setFields(["", "", ""]); setRatio(""); setBoundary(""); setTouched(false); retry.current = null; void load(); }, [runId, transport]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change);
    const lost = (event: globalThis.Event) => { event.preventDefault(); setWebglLost(true); }; document.addEventListener("webglcontextlost", lost, true);
    const canvas = document.createElement("canvas"); let supported = false;
    try { const context = canvas.getContext("webgl2") || canvas.getContext("webgl"); supported = Boolean(context); context?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* The 2D view remains fully usable. */ }
    if (!supported) setWebglLost(true);
    return () => { media.removeEventListener("change", change); document.removeEventListener("webglcontextlost", lost, true); };
  }, []);
  useEffect(() => { if (!snapshot) return; try { sessionStorage.setItem(draftKey, JSON.stringify({ step: snapshot.events.length, choice, fields, ratio, boundary })); } catch { /* Server events remain available if browser storage is full. */ } }, [snapshot, draftKey, choice, fields, ratio, boundary]);
  const send = async (event: ThermalEvent) => {
    if (busy.current) return; busy.current = true; setPending(true); setError("");
    const request = retry.current ?? { event, key: crypto.randomUUID() }; retry.current = request;
    try { const next = await transport<ThermalSnapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`, "POST", { idempotencyKey: request.key, event: request.event }); if (currentRun.current !== runId) return; retry.current = null; setSnapshot(next); setChoice(""); setFields(["", "", ""]); setTouched(false); }
    catch { if (currentRun.current === runId) setError("Bước chưa được ghi nhận. Bấm “Thử ghi lại bước” để gửi lại đúng nội dung vừa gửi."); }
    finally { busy.current = false; setPending(false); }
  };
  const step = snapshot?.events.length ?? 0, output = snapshot?.observation?.value ?? initial, effectiveMode = reduced || webglLost ? "2d" : mode;
  const reading = [parseThermalEnergy(fields[0]), parseThermalTemperature(fields[1]), parseThermalTemperature(fields[2])];
  const update = (index: number, value: string) => { setTouched(true); setFields(fields.map((old, at) => at === index ? value : old)); };
  const result = attempt?.simulationResult, disabled = pending || Boolean(retry.current);
  const toggle = <LabRendererToggle mode={effectiveMode} onChange={next => { if (!(reduced || webglLost)) setMode(next); }} />;
  return <div className="thermal-activity"><div className="thermal-stage">{effectiveMode === "3d" ? <ThermalBench3D output={output} /> : <ThermalBench2D output={output} />}
    <div className="thermal-readout" role="status"><b>{output.elapsedMilliseconds / 1000} s</b><span>Joulemeter {output.meterReadingMilliJoules / 1000} J</span><span>Nhiệt kế {thermalDegrees(output.thermometerReadingMilliCelsius)} °C</span><small>{output.heaterState === "AUTO_STOP" ? "Heater đã ngắt · đạt giới hạn 100 s" : output.heaterState === "ON" ? "Heater cấp năng lượng · đã đến mốc quan sát" : "Heater tắt · nước 100 g"}</small></div></div>
    <LabHeaderSlot fallbackClassName="thermal-view-toggle">{toggle}</LabHeaderSlot>
    <LabQuestionPanel id="thermal-questions" prefix="thermal" open={questionOpen} onOpenChange={setQuestionOpen}
      badgeLabel={`Câu hỏi, bước ${Math.min(step + 1, 6)}/6`} eyebrow="Vật lý 8 · K4 Thực hành nhiệt" stepLabel={`Bước ${Math.min(step + 1, 6)}/6`}
      heading="Năng lượng nhiệt" closeLabel="Đóng câu hỏi">
      {(reduced || webglLost) && <p className="thermal-hint">Đang dùng 2D {reduced ? "theo lựa chọn giảm chuyển động" : "vì thiết bị không hỗ trợ hoặc đã mất WebGL"}. Mọi thao tác và số đo vẫn đầy đủ.</p>}
      <p className="thermal-intro">Đun một mẫu nước 100 g bằng heater 42 W, đọc joulemeter và nhiệt kế, rồi so sánh hai mốc đo.</p>
      <details className="thermal-assumptions"><summary>Điều kiện mô phỏng và cách đọc dụng cụ</summary><p>T₀ = 25,0 °C. Joulemeter chia đến 1 J; nhiệt kế chia đến 0,1 °C. Thời gian tối đa 100 s, nhiệt độ tối đa 35,0 °C.</p><p>Giả định kỹ thuật: không mất nhiệt, bỏ qua nhiệt dung cốc và coi nhiệt dung riêng không đổi. Joulemeter đo điện năng; nhiệt mẫu bằng điện năng này chỉ theo mô hình nhiệt lượng kế lý tưởng. Đây là thí nghiệm ảo.</p></details>
      {error && <div className="thermal-error" role="alert"><p>{error}</p>{retry.current ? <button disabled={pending} onClick={() => void send(retry.current!.event)}>Thử ghi lại bước</button> : <button onClick={() => void load()}>Tải lại tiến trình</button>}<button disabled={pending || pendingSubmit} onClick={onNewRun}>Bắt đầu lượt mới</button></div>}
      {submissionError && <p className="thermal-error" role="alert">Chưa nộp được bài. Hãy thử lại; sổ đã ghi vẫn được giữ.</p>}
      {!snapshot && !error && <p role="status">Đang tải tiến trình…</p>}
      {snapshot && <><nav className="thermal-progress" aria-label="Tiến trình thí nghiệm">{["Dự đoán", "Đun", "Đo 50 s", "Dự đoán tiếp", "Đo 100 s", "Kết luận"].map((label, index) => <span key={label} aria-current={step === index ? "step" : undefined} data-complete={step > index}>{index + 1}. {label}</span>)}</nav>
        <div className="lqp-section thermal-checkpoint" aria-busy={pending}>
          {(step === 0 || step === 3) && <><h3>{step === 0 ? "A · Dự đoán nhiệt độ" : "C · Dự đoán lần đo thứ hai"}</h3><p>{step === 0 ? "Trước khi đun, em dự đoán nhiệt độ nước sẽ thay đổi thế nào? Dự đoán chưa đúng vẫn được ghi nhận." : "Nếu tiếp tục đun đến 100 s, độ tăng nhiệt độ ΔT tính từ T₀ = 25,0 °C sẽ thế nào so với ΔT ở 50 s?"}</p><ChoiceGroup key={step} disabled={disabled} legend={step === 0 ? "Dự đoán chiều đổi nhiệt độ" : "Dự đoán quan hệ hai độ tăng nhiệt độ"} name={`thermal-choice-${step}`} value={choice || null} options={step === 0 ? directions : ratios} onChange={setChoice} /><button className="primary" disabled={disabled || !choice} onClick={() => void send({ type: step === 0 ? "PREDICTED_TEMPERATURE_CHANGE" : "PREDICTED_SECOND_MEASUREMENT", choice })}>Ghi dự đoán</button></>}
          {step === 1 && <><h3>B · Bắt đầu phép đo</h3><p>Heater công suất 42 W. Chạy mô phỏng đến mốc 50 s rồi đọc số chỉ của hai dụng cụ. Hai lần đo thuộc cùng một quá trình đun.</p><button className="primary" disabled={disabled} onClick={() => void send({ type: "STARTED_HEATING" })}>Đun đến 50 s</button></>}
          {(step === 2 || step === 4) && <><h3>{step === 2 ? "B · Ghi số đo ở 50 s" : "C · Ghi số đo ở 100 s"}</h3><p>Đọc E và T trên dụng cụ. Tính ΔT = T − 25,0 °C. Nhập E là số nguyên; T và ΔT có tối đa một chữ số thập phân.</p>{["Điện năng E (J)", "Nhiệt độ T (°C)", "Độ tăng ΔT (°C)"].map((label, index) => <label key={label}>{label}<input disabled={disabled} inputMode={index === 0 ? "numeric" : "decimal"} value={fields[index]} onChange={event => update(index, event.target.value)} aria-invalid={touched && reading[index] === null} aria-describedby={touched && reading[index] === null ? `thermal-input-${index}-error` : undefined} />{touched && reading[index] === null && <small id={`thermal-input-${index}-error`} role="alert">{index === 0 ? "Nhập số nguyên từ 0 đến 10000 J, không thêm đơn vị hoặc dấu phân nhóm." : "Nhập số từ 0 đến 100 °C, tối đa một chữ số sau dấu phẩy hoặc dấu chấm."}</small>}</label>)}<button className="primary" disabled={disabled || reading.some(value => value === null)} onClick={() => void send({ type: step === 2 ? "RECORDED_FIRST_MEASUREMENT" : "RECORDED_SECOND_MEASUREMENT", elapsedMilliseconds: step === 2 ? 50000 : 100000, energyMilliJoules: reading[0]!, temperatureMilliCelsius: reading[1]!, riseMilliCelsius: reading[2]! })}>Ghi số đo</button></>}
          {step === 5 && <><h3>D · Kết luận từ số đo</h3><ChoiceGroup disabled={disabled} legend="Theo bảng, ΔT ở 100 s so với ở 50 s" name="thermal-ratio" value={ratio || null} options={ratios} onChange={setRatio} /><ChoiceGroup disabled={disabled} legend="Khi nào nhiệt lượng mẫu bằng điện năng joulemeter?" name="thermal-boundary" value={boundary || null} options={boundaries} onChange={setBoundary} /><button className="primary" disabled={disabled || !ratio || !boundary} onClick={() => void send({ type: "EXPLAINED_ENERGY_BOUNDARY", ratioChoice: ratio, boundaryChoice: boundary })}>Ghi kết luận</button></>}
          {step === 6 && !attempt && <><h3>Sổ thí nghiệm đã hoàn thành</h3><p>Kiểm tra lại bảng số đo trước khi nộp. Kết quả chính thức do máy chủ tính lại từ các bước đã ghi.</p><button className="primary" disabled={pendingSubmit} onClick={onSubmit}>{pendingSubmit ? "Đang lưu…" : examMode ? "Lưu lần chạy Lab" : "Nộp bài"}</button></>}
        </div><Notebook observations={snapshot.observations} events={snapshot.events} /></>}
      {attempt && !examMode && <section className="thermal-result" role="status"><h3>{fixture ? "Hoàn thành fixture UI" : "Kết quả máy chủ"}</h3><p>{fixture ? "Lượt thử không được lưu thành kết quả học tập." : `${attempt.verdict === "passed" ? "Đã đạt" : "Cần luyện tập thêm"} · ${result?.score ?? "—"}/6 điểm`}</p>{result?.criteria && <ul>{Object.entries(result.criteria).map(([key, passed]) => <li key={key}>{passed ? "✓" : "○"} {criteria[key]}</li>)}</ul>}<button className="secondary" disabled={pendingSubmit} onClick={onNewRun}>Lượt mới</button></section>}
    </LabQuestionPanel></div>;
}
