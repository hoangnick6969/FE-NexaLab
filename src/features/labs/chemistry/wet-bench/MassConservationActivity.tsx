import { useEffect, useRef, useState } from "react";
import { api } from "../../../../lib/api";
import { LabRendererToggle, useLabRendererMode } from "../../shared/LabRendererToggle";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { ChoiceGroup, LabQuestionPanel } from "../../shared/question-panel/LabQuestionPanel";
import { WetBenchStage } from "./WetBenchStage";
import "./MassConservationActivity.css";

type Event = { type: "PREDICTED"; prediction: string; reason?: string } | { type: "READ_BEFORE" | "MIXED" | "READ_AFTER" };
type Snapshot = { events: Event[]; readings: { beforeScaleMilligrams: number | null; afterScaleMilligrams: number | null } };
type Answers = { comparison?: string; explanationAttempts?: string[]; calculation?: string; applicationV1?: string; applicationV2?: string; applicationV3?: string; reflectionNote?: string };
const choices = [
  ["predict.increase", "Số chỉ sẽ lớn hơn"], ["predict.decrease", "Số chỉ sẽ nhỏ hơn"], ["predict.same", "Số chỉ sẽ bằng lần cân đầu"],
];
const explain = [
  ["explain.rearrange", "Nguyên tử không mất đi hay tự sinh ra. Chúng sắp xếp lại thành chất mới; mọi chất vẫn nằm trên cân."],
  ["explain.new_substance_heavier", "Chất mới tạo thành nên khối lượng tăng; cân chưa kịp cập nhật."],
  ["explain.solid_not_weighed", "Chất rắn lắng xuống đáy cốc nên không còn được cân tính."],
];
const feedback: Record<string, string> = {
  "explain.rearrange": "Phù hợp với mô hình: các nguyên tử được bảo toàn và mọi chất vẫn nằm trong phạm vi được cân.",
  "explain.new_substance_heavier": "Cân đã được đọc sau phản ứng. Hãy so lại số đo và xem nguyên tử có được thêm vào không.",
  "explain.solid_not_weighed": "Đáy cốc và chất rắn vẫn nằm trên đĩa cân. Chất chỉ không được cân khi rời khỏi cân.",
};
const APPLICATION_CHOICES = [{ value: "increase", label: "Lớn hơn" }, { value: "decrease", label: "Nhỏ hơn" }, { value: "same", label: "Bằng nhau" }];
const grams = (mg: number | null) => mg == null ? null : `${(mg / 1000).toFixed(1).replace(".", ",")} g`;

export function MassConservationActivity({ runId, state, onChange, onSubmit, onNewRun, attempt, pendingSubmit }: {
  runId: string; state: unknown; onChange: (state: Answers) => void;
  onSubmit: () => void; onNewRun: () => void; attempt: any; pendingSubmit: boolean;
}) {
  const answers = (state ?? {}) as Answers;
  const [mode, setMode] = useLabRendererMode("nexalab:lab-view:wet-bench");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [safeRead, setSafeRead] = useState(false);
  const [reason, setReason] = useState("");
  const [activeAnswer, setActiveAnswer] = useState<keyof Answers | null>(null);
  const [pending, setPending] = useState(false);
  const [pouring, setPouring] = useState(false);
  const [retry, setRetry] = useState<{ key: string; event: Event } | null>(null);
  const [error, setError] = useState("");
  const [questionOpen, setQuestionOpen] = useState(true);
  const skipAnimation = useRef<(() => void) | null>(null);
  useEffect(() => () => { skipAnimation.current?.(); }, []);
  useEffect(() => {
    let active = true;
    setSnapshot(null);
    setError("");
    setRetry(null);
    void api<Snapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`).then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setError("Không tải được tiến trình. Thử tải lại phòng thực hành."); });
    return () => { active = false; };
  }, [runId]);
  const send = async (event: Event) => {
    if (pending) return;
    setPending(true); setError("");
    const request = retry ?? { key: crypto.randomUUID(), event };
    try {
      if (request.event.type === "MIXED") setPouring(true);
      const next = await api<Snapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`, "POST", { idempotencyKey: request.key, event: request.event });
      if (request.event.type === "MIXED" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 1400);
          skipAnimation.current = () => { window.clearTimeout(timer); resolve(); };
        });
      skipAnimation.current = null;
      setPouring(false);
      setSnapshot(next); setRetry(null);
    } catch {
      setPouring(false);
      setError("Chưa ghi được bước này. Hãy thử lại; bài làm của em vẫn được giữ.");
      setRetry(request);
      try {
        const current = await api<Snapshot>(`/lab-runs/${encodeURIComponent(runId)}/events`);
        setSnapshot(current);
        if (current.events.length > step) setRetry(null);
      } catch { /* Keep the last confirmed state. */ }
    } finally { setPending(false); }
  };
  const step = snapshot?.events.length ?? 0;
  const mixed = step >= 3;
  const visibleReading = step === 2 ? grams(snapshot?.readings.beforeScaleMilligrams ?? null)
    : step === 4 ? grams(snapshot?.readings.afterScaleMilligrams ?? null) : null;
  const latestExplanation = answers.explanationAttempts?.at(-1);
  const ready = step === 4 && Boolean(answers.comparison && latestExplanation && answers.calculation && answers.applicationV1 && answers.applicationV2);
  const setAnswer = (name: keyof Answers, value: string) => { setActiveAnswer(name); onChange({ ...answers, [name]: value }); };
  const prediction = snapshot?.events.find((event): event is Extract<Event, { type: "PREDICTED" }> => event.type === "PREDICTED")?.prediction;
  const actualComparison = snapshot?.readings.beforeScaleMilligrams === snapshot?.readings.afterScaleMilligrams ? "compare.same" : (snapshot?.readings.afterScaleMilligrams ?? 0) > (snapshot?.readings.beforeScaleMilligrams ?? 0) ? "compare.increase" : "compare.decrease";
  let responseEffect: { kind: string; symbol: string; title: string; detail: string; correct?: boolean } | null = null;
  if (step === 1 && prediction) {
    const selected = choices.find(([code]) => code === prediction)?.[1] ?? "Dự đoán đã gửi";
    responseEffect = { kind: "prediction", symbol: prediction === "predict.increase" ? "↗" : prediction === "predict.decrease" ? "↘" : "→", title: `Dự đoán của em: ${selected.toLowerCase()}`, detail: "Mũi tên thể hiện dự đoán, chưa phải số đo của cân." };
  } else if (step === 4 && activeAnswer === "applicationV3" && answers.applicationV3) {
    const correct = answers.applicationV3 === "scope";
    responseEffect = { kind: "application", symbol: correct ? "◎" : "↺", title: correct ? "Đúng với phạm vi mô phỏng" : "Hãy xem lại ranh giới được cân", detail: correct ? "Không có chất rời khỏi cân trong tình huống này." : "Cốc mở không tự động là hệ kín; hãy xét chất có rời khỏi cân không.", correct };
  } else if (step === 4 && activeAnswer === "applicationV2" && answers.applicationV2) {
    const correct = answers.applicationV2 === "same";
    responseEffect = { kind: "application", symbol: correct ? "◎" : "↺", title: correct ? "Khí vẫn nằm trong phạm vi cân" : "Hãy theo dõi khí trong bình kín", detail: "Cả bình và khí bên trong đều nằm trên cân.", correct };
  } else if (step === 4 && activeAnswer === "applicationV1" && answers.applicationV1) {
    const correct = answers.applicationV1 === "decrease";
    responseEffect = { kind: "application", symbol: correct ? "↘" : "↺", title: correct ? "Khí rời khỏi phạm vi cân" : "Hãy theo dõi khí thoát ra", detail: "Khi khí bay khỏi cốc hở, cân không còn đo phần khí đó.", correct };
  } else if (step === 4 && activeAnswer === "calculation" && answers.calculation) {
    const correct = answers.calculation === "35-and-35";
    responseEffect = { kind: "calculation", symbol: correct ? "=" : "≠", title: correct ? "Hai tổng khối lượng bằng nhau" : "Hãy cộng lại từng vế", detail: "Đây là ví dụ tính toán, tách biệt với số liệu mô phỏng trên cân.", correct };
  } else if (step === 4 && activeAnswer === "explanationAttempts" && latestExplanation) {
    const correct = latestExplanation === "explain.rearrange";
    responseEffect = { kind: "explanation", symbol: correct ? "⚛" : "↺", title: correct ? "Nguyên tử được sắp xếp lại" : "Chất rắn vẫn nằm trên cân", detail: correct ? "Số nguyên tử mỗi loại được giữ nguyên khi tạo chất mới." : feedback[latestExplanation], correct };
  } else if (step === 4 && activeAnswer === "comparison" && answers.comparison) {
    const correct = answers.comparison === actualComparison;
    responseEffect = { kind: "comparison", symbol: correct ? "✓" : "↺", title: correct ? "Lựa chọn khớp với số đo" : "Lựa chọn chưa khớp với số đo", detail: `Số đo thực tế: ${grams(snapshot?.readings.beforeScaleMilligrams ?? null)} trước và ${grams(snapshot?.readings.afterScaleMilligrams ?? null)} sau.`, correct };
  }
  const stepNumber = Math.min(step + 1, 5);
  const toggle = <LabRendererToggle mode={mode} onChange={setMode} />;
  return <div className="k2-activity">
    <div className={`k2-stage${mode === "2d" && (step === 2 || step === 4) ? " k2-stage-2d-reading" : ""}`} data-response={responseEffect?.kind} aria-label="Bàn hoá học với cân điện tử và hai cốc thuỷ tinh">
      {mode === "3d" ? (
        <WetBenchStage
          mixed={mixed}
          pouring={pouring}
          scaleReading={visibleReading ?? "— — —"}
          onContextLost={() => setMode("2d")}
        />
      ) : (
        <div className={`k2-stage-2d ${pouring ? "mixing" : ""}`} role="img" aria-label={`Sơ đồ cân điện tử; 2 cốc trên cân; số chỉ ${visibleReading ?? "chưa đọc"}`}>
          <div className={`k2-cup vessel-ba ${mixed ? "emptied" : ""}`}>
            <span>BaCl₂ · Cốc 1</span>
            <i />
          </div>
          <div className={`k2-cup vessel-na ${mixed ? "mixed" : ""}`}>
            <span>Na₂SO₄ · Cốc 2</span>
            <i />
          </div>
          <div className="k2-scale">
            <b>{visibleReading ?? "— — —"}</b>
            <small>g · CÂN ĐIỆN TỬ</small>
          </div>
        </div>
      )}
      {responseEffect && <div key={`${responseEffect.kind}-${responseEffect.title}`} className={`k2-response-effect ${responseEffect.kind}${responseEffect.correct === undefined ? "" : responseEffect.correct ? " is-correct" : " is-review"}`} aria-live="polite">
        <span className="k2-response-symbol" aria-hidden="true">{responseEffect.symbol}</span>
        <span><strong>{responseEffect.title}</strong><small>{responseEffect.detail}</small></span>
      </div>}
      <div className="k2-scale-readout" aria-live="polite"><small>{visibleReading ? "Số liệu mô phỏng · Hai cốc trên cân" : "Phạm vi được cân · Hai cốc trên cân"}</small><strong>{visibleReading ?? "Chờ đọc số"}</strong></div>
      <span className="k2-scene-label">Dung dịch thực tế không màu · xanh nhạt chỉ làm rõ mực chất lỏng · kết tủa BaSO₄ màu trắng xuất hiện sau phản ứng</span>
    </div>
    <LabHeaderSlot fallbackClassName="k2-view-toggle">{toggle}</LabHeaderSlot>
    <LabQuestionPanel id="k2-questions" prefix="k2" open={questionOpen} onOpenChange={setQuestionOpen}
      badgeLabel={`Câu hỏi, bước ${stepNumber}/5`} eyebrow="Hoá học 8 · Bàn hoá ướt · FL-10" stepLabel={`Bước ${stepNumber}/5`}
      progress={{ count: 5, current: stepNumber }} heading="Bảo toàn khối lượng" closeLabel="Đóng câu hỏi">
      <p className="k2-phases">Dự đoán — Quan sát — Giải thích — Vận dụng</p>
      {error && <p role="alert" className="k2-error">{error}</p>}
      {retry && <button className="secondary" onClick={() => void send(retry.event)}>Thử ghi lại bước</button>}
      {!snapshot && <p role="status">Đang tải tiến trình từ máy chủ…</p>}
      {snapshot && step === 0 && <section className="lqp-section"><h3>{safeRead ? "Dự đoán của em" : "Lưu ý an toàn"}</h3>
        {!safeRead ? <><p>Muối barium tan có độc tính. Đây là thí nghiệm mô phỏng; không tự làm tại nhà. Trong phòng thí nghiệm thật, chỉ thực hiện theo hướng dẫn của giáo viên, dùng kính và găng tay, không nếm hoặc chạm trực tiếp, xử lý hoá chất theo quy định.</p><button className="primary" onClick={() => setSafeRead(true)}>Em đã đọc</button></> : <><p>Khi đổ dung dịch cốc (1) vào cốc (2), lắc nhẹ rồi đặt cả hai cốc trở lại cân, số chỉ thay đổi thế nào?</p><label>Lý do của em (không bắt buộc)<textarea value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} /></label><div className="k2-options">{choices.map(([code, label]) => <button key={code} disabled={pending || Boolean(retry)} onClick={() => void send({ type: "PREDICTED", prediction: code, ...(reason.trim() ? { reason: reason.trim() } : {}) })}>{label}</button>)}</div></>}
      </section>}
      {snapshot && step === 1 && <section className="lqp-section"><h3>Đọc cân trước phản ứng</h3><p>Hai cốc đã ở trên cân: cốc (1) chứa dung dịch barium chloride, cốc (2) chứa dung dịch sodium sulfate. Hãy đọc tổng khối lượng của cả hai cốc và dung dịch.</p><button className="primary" disabled={pending || Boolean(retry)} onClick={() => void send({ type: "READ_BEFORE" })}>Đọc cân trước</button></section>}
      {snapshot && step === 2 && <section className="lqp-section"><h3>Quan sát phản ứng</h3><p>Số trước: <b>{grams(snapshot.readings.beforeScaleMilligrams)} · Số liệu mô phỏng</b></p><p>Đổ cốc (1) vào cốc (2), lắc nhẹ. Chất rắn trắng xuất hiện trong mô phỏng.</p><button className="primary" disabled={pending || Boolean(retry)} onClick={() => void send({ type: "MIXED" })}>Rót, lắc và quan sát</button>{pouring && <button className="secondary" onClick={() => skipAnimation.current?.()}>Bỏ qua hoạt cảnh</button>}</section>}
      {snapshot && step === 3 && <section className="lqp-section"><h3>Đọc cân sau phản ứng</h3><p>Cốc vừa rót hết đã trở lại cân. <b>Cả hai cốc</b> và chất rắn đều nằm trong phạm vi được cân. Hãy đọc lại số chỉ.</p><button className="primary" disabled={pending || Boolean(retry)} onClick={() => void send({ type: "READ_AFTER" })}>Đọc cân sau</button></section>}
      {snapshot && step === 4 && <section className="lqp-section"><h3>Giải thích kết quả</h3><p>Trước: <b>{grams(snapshot.readings.beforeScaleMilligrams)}</b> · Sau: <b>{grams(snapshot.readings.afterScaleMilligrams)}</b> <small>Số liệu mô phỏng</small></p><p>Dự đoán ban đầu: {choices.find(([code]) => code === (snapshot.events[0] as any).prediction)?.[1]}</p>
        <ChoiceGroup legend="So sánh hai số đo" name="k2-comparison" value={answers.comparison} onChange={(value) => setAnswer("comparison", value)}
          options={[{ value: "compare.increase", label: "Sau lớn hơn" }, { value: "compare.decrease", label: "Sau nhỏ hơn" }, { value: "compare.same", label: "Bằng nhau" }]} />
        <ChoiceGroup legend="Lời giải thích nào phù hợp?" name="k2-explanation" value={latestExplanation} options={explain.map(([code, label]) => ({ value: code, label }))}
          onChange={(code) => { setActiveAnswer("explanationAttempts"); onChange({ ...answers, explanationAttempts: [...(answers.explanationAttempts ?? []), code].slice(-10) }); }} />{latestExplanation && <p role="status">{feedback[latestExplanation]}</p>}
        <label>Dự đoán của em khớp hay khác kết quả? Em muốn điều chỉnh điều mình nghĩ như thế nào? (không chấm điểm)<textarea value={answers.reflectionNote ?? ""} maxLength={2000} onChange={(e) => setAnswer("reflectionNote", e.target.value)} /></label>
        <details><summary>Ví dụ tính toán</summary><p>20,8 g BaCl₂ + 14,2 g Na₂SO₄ → 23,3 g BaSO₄ + 11,7 g NaCl. Tổng khối lượng hai phía là bao nhiêu?</p><ChoiceGroup variant="segment" legend="Tổng khối lượng vế trước và vế sau" name="k2-calculation" value={answers.calculation} onChange={(value) => setAnswer("calculation", value)}
          options={[{ value: "35-and-35", label: "35,0 g và 35,0 g" }, { value: "35-and-34", label: "35,0 g và 34,0 g" }, { value: "34-and-35", label: "34,0 g và 35,0 g" }]} /></details>
        <details><summary>Hình minh hoạ · Sắp xếp lại nguyên tử</summary><p>Không phải quan sát trực tiếp. Trước và sau đều có 1 Ba, 2 Cl, 2 Na, 1 S và 4 O; chỉ cách kết hợp thành chất thay đổi.</p></details>
        <div className="lqp-section k2-application"><strong>Tình huống giả định · Vận dụng</strong><ChoiceGroup variant="segment" legend="Khí thoát khỏi cốc hở trên cân thì số chỉ sẽ…" name="k2-application-v1" value={answers.applicationV1} onChange={(value) => setAnswer("applicationV1", value)}
          options={APPLICATION_CHOICES} /><ChoiceGroup variant="segment" legend="Khí ở lại trong bình kín, cả bình nằm trên cân thì số chỉ sẽ…" name="k2-application-v2" value={answers.applicationV2} onChange={(value) => setAnswer("applicationV2", value)}
          options={APPLICATION_CHOICES} /></div>
        <ChoiceGroup legend="Hai cốc không đậy nắp mà số cân vẫn bằng nhau. Vì sao? (phản tư, không chấm điểm)" name="k2-application-v3" value={answers.applicationV3} onChange={(value) => setAnswer("applicationV3", value)}
          options={[{ value: "scope", label: "Không có chất rời phạm vi được cân trong mô phỏng này" }, { value: "open_closed", label: "Cốc mở luôn là hệ kín" }, { value: "always_exact", label: "Mọi phản ứng đều cho số cân bằng nhau tuyệt đối" }]} />
        <p className="k2-note">Hai cốc mở trong mô phỏng này cho số cân bằng nhau vì giả định không có chất rời khỏi phạm vi được cân. Thí nghiệm thật có sai số.</p>
        <button className="primary" disabled={!ready || pendingSubmit || Boolean(attempt)} onClick={onSubmit}>{pendingSubmit ? "Đang nộp…" : "Nộp kết quả"}</button>
      </section>}
      {attempt && <section className="lqp-section k2-result" role="status"><h3>Kết quả từ máy chủ</h3><p>{attempt.verdict === "passed" ? "Em đã hoàn thành hoạt động." : "Em có thể xem lại phần giải thích và thử lượt mới."}</p><p>Trong mô phỏng lý tưởng này, mọi chất vẫn nằm trong phạm vi được cân nên tổng khối lượng trước và sau bằng nhau. Thí nghiệm thật có sai số; lab ảo không thay thế thực hành thật.</p><button className="secondary" onClick={() => { if (window.confirm("Bắt đầu lượt mới? Bài làm hiện tại sẽ được giữ trong lịch sử.")) onNewRun(); }}>Bắt đầu lượt mới</button></section>}
    </LabQuestionPanel>
  </div>;
}
