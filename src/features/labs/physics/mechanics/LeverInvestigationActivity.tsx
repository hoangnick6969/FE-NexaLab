import { useEffect, useRef, useState } from "react";
import { classifyLeverCase, evaluateLeverBench } from "@nexalab/sim";
import { api } from "../../../../lib/api";
import { LabRendererToggle, useLabRendererMode } from "../../shared/LabRendererToggle";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { ChoiceGroup, LabQuestionPanel } from "../../shared/question-panel/LabQuestionPanel";
import { K5Stage2D, K5Stage3D, type K5Attachment, type K5Tilt } from "./kit/K5Stage";
import { K5Toolbox } from "./kit/K5Toolbox";
import "./lever-investigation.css";

type Event = { type: string; [key: string]: unknown };
type Snapshot = { events: Event[]; observation?: unknown };
const presets = { C1: { load: -100, force: 1000, gauge: 200 }, C2: { load: 150, force: 2000, gauge: -100 }, C3: { load: -250, force: 500, gauge: 50 } } as const;
type Preset = keyof typeof presets;
const format = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");
const model = (attachments: K5Attachment[]) => evaluateLeverBench({ fixtureId: "lever-bench-reference-v1", attachments });
const TILTS: Array<{ value: K5Tilt; label: string }> = [{ value: "TILT_LEFT", label: "Nghiêng trái" }, { value: "LEVEL", label: "Nằm ngang" }, { value: "TILT_RIGHT", label: "Nghiêng phải" }];
const initial: K5Attachment[] = [{ kind: "WEIGHT", positionMillimetres: -100, forceMilliNewtons: 1000 }];

export function LeverInvestigationActivity({ runId, onSubmit, onNewRun, attempt, pendingSubmit, examMode = false }: { runId: string; onSubmit: () => void; onNewRun: () => void; attempt: any; pendingSubmit: boolean; examMode?: boolean }) {
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:mechanics-k5");
  const [attachments, setAttachments] = useState<K5Attachment[]>(initial);
  const [predictions, setPredictions] = useState<Array<K5Tilt | "">>(["", "", ""]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialAnswers, setTrialAnswers] = useState<Array<K5Tilt | "">>(["", "", ""]);
  const [recordedForce, setRecordedForce] = useState("");
  const [recordedArm, setRecordedArm] = useState("");
  const [momentAnswer, setMomentAnswer] = useState("");
  const [presetId, setPresetId] = useState<Preset>("C1");
  const [gaugeForce, setGaugeForce] = useState<number | "">("");
  const [verifiedGaugeForce, setVerifiedGaugeForce] = useState<number | "">("");
  const [caseId, setCaseId] = useState<"FULCRUM_BETWEEN" | "LOAD_BETWEEN" | "EFFORT_BETWEEN">("FULCRUM_BETWEEN");
  const [advantageAnswer, setAdvantageAnswer] = useState<"GAIN" | "EQUAL" | "NO_GAIN" | "">("");
  const [directionAnswer, setDirectionAnswer] = useState<"yes" | "no" | "">("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reduced, setReduced] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const media = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduced(media.matches); change(); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => { let alive = true; setSnapshot(null); void api<Snapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`).then(x => { if (alive) setSnapshot(x); }).catch(() => { if (alive) setError("Không tải được tiến trình. Hãy thử lại."); }); return () => { alive = false; }; }, [runId]);
  useEffect(() => { const lost = (event: globalThis.Event) => { event.preventDefault(); setMode("2d"); }; document.addEventListener("webglcontextlost", lost, true); return () => document.removeEventListener("webglcontextlost", lost, true); }, [setMode]);
  const send = async (event: Event) => { if (pending) return; setPending(true); setError(""); try { const next = await api<Snapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`, "POST", { idempotencyKey: crypto.randomUUID(), event }); setSnapshot(next); } catch { setError("Chưa ghi được bước. Hãy thử lại; tiến trình đã ghi vẫn được giữ."); } finally { setPending(false); } };
  const step = snapshot?.events.length ?? 0;
  useEffect(() => { if ((step === 3 || step === 4) && !attachments.some(a => a.kind === "GAUGE")) setPreset(presetId); }, [step]);
  const present = model(attachments);
  const output = present.ok ? present.value : null;
  const setPreset = (id: Preset) => { setPresetId(id); setGaugeForce(""); setVerifiedGaugeForce(""); setAttachments([{ kind: "WEIGHT", positionMillimetres: presets[id].load, forceMilliNewtons: presets[id].force }, { kind: "GAUGE", positionMillimetres: presets[id].gauge, forceMilliNewtons: 0 }]); };
  const cases = { FULCRUM_BETWEEN: { fulcrumMillimetres: 0, loadMillimetres: -50, effortMillimetres: 150 }, LOAD_BETWEEN: { fulcrumMillimetres: -250, loadMillimetres: -100, effortMillimetres: 250 }, EFFORT_BETWEEN: { fulcrumMillimetres: -250, loadMillimetres: 250, effortMillimetres: -200 } } as const;
  const caseInput = cases[caseId];
  const caseResult = classifyLeverCase(caseInput);
  const trials = [-100, 0, 100].map(positionMillimetres => ({ attachments: [{ kind: "WEIGHT" as const, positionMillimetres, forceMilliNewtons: 1000 }] }));
  const displayedAttachments = step === 0 ? [] : step === 1 ? trials[trialIndex].attachments : attachments;
  const displayedModel = model(displayedAttachments);
  const displayedTilt = step === 0 ? "LEVEL" : displayedModel.ok ? displayedModel.value.displayState : "LEVEL";
  return <div className="k5-activity">
    <div className="k5-scene" ref={stageRef}>
      {mode === "3d" ? <K5Stage3D attachments={displayedAttachments} tilt={displayedTilt} reduced={reduced} /> : <K5Stage2D attachments={displayedAttachments} tilt={displayedTilt} />}
      <div className="k5-ruler-guide" aria-label="Cách đọc vị trí và cánh tay đòn"><strong>Đọc thước đòn bẩy</strong><span>O là điểm tựa (0 mm). Số âm ở bên trái, số dương ở bên phải; mỗi lỗ cách nhau 50 mm.</span><span>Cánh tay đòn d là khoảng cách từ O đến lỗ móc: tại −100 mm thì d = 100 mm = 0,1 m.</span></div>
      <p className="k5-observation" role="status">{step === 0 ? "Ghi dự đoán để mở quan sát" : displayedTilt === "LEVEL" ? "Thanh nằm ngang · Mô hình lý tưởng" : displayedTilt === "TILT_LEFT" ? "Đầu trái nghiêng xuống · Mô hình lý tưởng" : "Đầu phải nghiêng xuống · Mô hình lý tưởng"}</p>
    </div>
    <LabHeaderSlot fallbackClassName="k5-view-toggle"><LabRendererToggle mode={mode} onChange={setMode} /></LabHeaderSlot>
    <LabQuestionPanel id="k5-questions" prefix="k5" open={questionOpen} onOpenChange={setQuestionOpen}
      badgeLabel={`Câu hỏi, bước ${Math.min(step + 1, 6)}/6`} eyebrow="Vật lý 8 · K5 Cơ học · FL-06" stepLabel={`Bước ${Math.min(step + 1, 6)}/6`}
      progress={{ count: 6, current: Math.min(step + 1, 6) }} heading="Moment lực và đòn bẩy" closeLabel="Đóng câu hỏi">
      <p>Bàn A–C: điểm tựa O cố định; lực kéo xuống. Sơ đồ ứng dụng D ở phần riêng.</p>
      {/* Steps A (predict, then observe three set positions) draw the Lab's own cases, so free tools would hang nothing visible. */}
      {step >= 2 ? <K5Toolbox attachments={attachments} onChange={setAttachments} onError={setError} />
        : <p className="lqp-section k5-tools-locked" role="note">Dụng cụ tự gắn mở từ bước B. Ở phần A, bàn đòn hiển thị đúng các vị trí của bài.</p>}
      {error && <p role="alert" className="k5-error">{error}</p>}
      {!snapshot && <p role="status">Đang tải tiến trình…</p>}
      {snapshot && <div className="lqp-section k5-notebook">
        {step === 0 && <section><h3>A · Dự đoán chiều quay</h3><p>Trước khi quan sát, dự đoán thanh khi treo cùng quả nặng ở bên trái, tại O, bên phải.</p>{["Bên trái", "Tại O", "Bên phải"].map((label,i)=><ChoiceGroup key={i} variant="segment" legend={`Dự đoán ${label.toLowerCase()}`} name={`k5-predict-${i}`} options={TILTS} value={predictions[i] || null} onChange={(tilt)=>setPredictions(predictions.map((p,j)=>i===j?tilt:p))} />)}<button disabled={pending || predictions.some(p=>!p)} onClick={() => void send({ type: "PREDICTED_ROTATION", predictions: [-100,0,100].map((positionMillimetres,i)=>({positionMillimetres,prediction:predictions[i]})) })}>{pending ? "Đang ghi…" : "Ghi dự đoán"}</button></section>}
        {step === 1 && <section><h3>A · Quan sát ba vị trí</h3><p>Chọn lần lượt tải bên trái, tại O và bên phải. Nhìn bàn đòn rồi tự ghi trạng thái mỗi lần.</p><div className="k5-trial-tabs">{["Bên trái", "Tại O", "Bên phải"].map((label,i)=><button key={i} type="button" aria-pressed={trialIndex===i} onClick={()=>setTrialIndex(i)}>{label}</button>)}</div><ChoiceGroup variant="segment" legend={`Trạng thái lần ${trialIndex+1}`} name={`k5-trial-${trialIndex}`} options={TILTS} value={trialAnswers[trialIndex] || null} onChange={(tilt)=>setTrialAnswers(trialAnswers.map((answer,i)=>i===trialIndex?tilt:answer))} /><button disabled={pending || trialAnswers.some(a=>!a)} onClick={() => void send({ type: "OBSERVED_ROTATION", trials: trials.map((trial,i)=>({...trial,observedState:trialAnswers[i]})) })}>{pending ? "Đang ghi…" : "Ghi quan sát"}</button></section>}
        {step === 2 && <section><h3>B · Đo moment lực</h3><p>Chọn một quả nặng đang gắn. Ghi lực F, cánh tay đòn d và moment M = F × d. Không dùng góc nghiêng để tính d.</p><p>Vị trí đo: {attachments[0]?.positionMillimetres ?? 0} mm. Hãy đọc dụng cụ và vạch trên thanh.</p><label>F (N)<input inputMode="decimal" value={recordedForce} onChange={e=>setRecordedForce(e.target.value)} /></label><label>d (m)<input inputMode="decimal" value={recordedArm} onChange={e=>setRecordedArm(e.target.value)} /></label><label>M (N·m)<input inputMode="decimal" value={momentAnswer} onChange={e => setMomentAnswer(e.target.value)} /></label><button disabled={pending || !output || !recordedForce || !recordedArm || !momentAnswer || [recordedForce,recordedArm,momentAnswer].some(x=>!Number.isFinite(Number(x.replace(",","."))))} onClick={() => void send({ type: "MEASURED_MOMENT", attachments, selectedPositionMillimetres: attachments[0].positionMillimetres, recordedForceMilliNewtons: Math.round(Number(recordedForce.replace(",","."))*1000), recordedArmMillimetres: Math.round(Number(recordedArm.replace(",","."))*1000), recordedMomentMilliNewtonMillimetres: Math.round(Number(momentAnswer.replace(",","."))*1_000_000) })}>{pending ? "Đang ghi…" : "Ghi phép đo"}</button></section>}
        {step === 3 && <section><h3>C · Dự đoán cân bằng</h3><ChoiceGroup variant="segment" legend="Bộ đề" name="k5-preset" value={presetId} options={(Object.keys(presets) as Preset[]).map(id => ({ value: id, label: id }))} onChange={setPreset} /><p>Tải {format(presets[presetId].force/1000,1)} N tại {presets[presetId].load} mm; lực kế tại {presets[presetId].gauge} mm. Hãy dự đoán lực cần kéo.</p><label>Lực kế dự đoán (N)<select value={gaugeForce} onChange={e => setGaugeForce(e.target.value===""?"":Number(e.target.value))}><option value="">Chọn lực</option>{Array.from({length:51},(_,i)=>i*100).map(n=><option key={n} value={n}>{format(n/1000,1)}</option>)}</select></label><button disabled={pending || gaugeForce===""} onClick={() => void send({ type: "PREDICTED_EQUILIBRIUM", presetId, predictedGaugeForceMilliNewtons: gaugeForce })}>{pending ? "Đang ghi…" : "Ghi dự đoán cân bằng"}</button></section>}
        {step === 4 && <section><h3>C · Kiểm tra cân bằng</h3><p>Điều chỉnh lực kế sau dự đoán; quan sát thanh rồi đối chiếu F₁d₁ = F₂d₂.</p><label>Lực kế kiểm tra (N)<select value={verifiedGaugeForce} onChange={e=>{const next=e.target.value===""?"":Number(e.target.value);setVerifiedGaugeForce(next);if(next!=="")setAttachments(attachments.map(a=>a.kind==="GAUGE"?{...a,forceMilliNewtons:next}:a));}}><option value="">Chọn lực</option>{Array.from({length:51},(_,i)=>i*100).map(n=><option key={n} value={n}>{format(n/1000,1)}</option>)}</select></label><button disabled={pending || verifiedGaugeForce===""} onClick={() => void send({ type: "VERIFIED_EQUILIBRIUM", presetId, gaugeForceMilliNewtons: verifiedGaugeForce })}>{pending ? "Đang ghi…" : "Xác nhận bằng lực kế"}</button></section>}
        {step === 5 && <section><h3>D · Ứng dụng riêng</h3><p>Sơ đồ dưới đây chỉ dùng phân tích vị trí; bàn A–C không mô phỏng các cấu hình cần lực kéo lên.</p><ChoiceGroup variant="segment" legend="Cấu hình" name="k5-case" value={caseId} onChange={(next)=>{setCaseId(next);setAdvantageAnswer("");setDirectionAnswer("");}}
          options={[{ value: "FULCRUM_BETWEEN" as const, label: "Điểm tựa ở giữa" }, { value: "LOAD_BETWEEN" as const, label: "Tải ở giữa" }, { value: "EFFORT_BETWEEN" as const, label: "Lực tác dụng ở giữa" }]} /><svg className="k5-case-diagram" viewBox="0 0 360 95" role="img" aria-label={`Sơ đồ: điểm tựa ${caseInput.fulcrumMillimetres} mm, tải ${caseInput.loadMillimetres} mm, lực tác dụng ${caseInput.effortMillimetres} mm`}><line x1="25" y1="60" x2="335" y2="60" stroke="#5f7880" strokeWidth="9" />{[[caseInput.fulcrumMillimetres,"O"],[caseInput.loadMillimetres,"Tải"],[caseInput.effortMillimetres,"Lực"]].map(([x,label])=><g key={String(label)}><circle cx={180+Number(x)*.6} cy="60" r="11" fill={label==="O"?"#cba34f":label==="Tải"?"#648395":"#7c9b67"}/><text x={180+Number(x)*.6} y="35" textAnchor="middle" fontSize="14">{label}</text></g>)}</svg><p>O = {caseInput.fulcrumMillimetres} mm; tải = {caseInput.loadMillimetres} mm; lực = {caseInput.effortMillimetres} mm.</p><ChoiceGroup variant="segment" legend="Lợi về lực?" name="k5-advantage" value={advantageAnswer || null} onChange={setAdvantageAnswer}
          options={[{ value: "GAIN" as const, label: "Có lợi" }, { value: "EQUAL" as const, label: "Bằng lực" }, { value: "NO_GAIN" as const, label: "Không lợi" }]} /><ChoiceGroup variant="segment" legend="Đổi hướng lực?" name="k5-direction" value={directionAnswer || null} onChange={setDirectionAnswer}
          options={[{ value: "yes" as const, label: "Có" }, { value: "no" as const, label: "Không" }]} /><button disabled={pending || !caseResult.ok || !advantageAnswer || !directionAnswer} onClick={() => void send({ type: "APPLIED_LEVER_CASE", ...caseInput, forceAdvantage: advantageAnswer, changesForceDirection: directionAnswer==="yes" })}>{pending ? "Đang ghi…" : "Ghi kết luận ứng dụng"}</button></section>}
        {step === 6 && <section><h3>Hoàn thành sổ thí nghiệm</h3><p>Các bước đã được ghi trên máy chủ. Kết quả chấm chính thức do máy chủ tính lại.</p><button disabled={pendingSubmit || Boolean(attempt)} onClick={onSubmit}>{pendingSubmit ? "Đang lưu…" : examMode ? "Lưu lần chạy Lab" : "Nộp bài"}</button></section>}
      </div>}
      {attempt && !examMode && <section className="lqp-section" role="status"><h3>Kết quả từ máy chủ</h3><p>{attempt.verdict === "passed" ? "Đã đạt" : "Cần luyện tập thêm"}</p><button onClick={onNewRun}>Lượt mới</button></section>}
    </LabQuestionPanel>
  </div>;
}
