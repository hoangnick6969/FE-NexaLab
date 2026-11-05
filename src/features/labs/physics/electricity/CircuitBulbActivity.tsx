import { circuit, evidenceFrom, switchClosed, phaseOf, type BulbEvidence, type Checkpoint, type Phase, type Prediction } from "./circuit-bulb-evidence";
export { defaultBulbEvidence, bulbEvidenceReady, type BulbEvidence } from "./circuit-bulb-evidence";
import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, Info, Lightbulb, X } from "lucide-react";
import { defineText } from "../../../../i18n";
import { CircuitBulb3DStage } from "./CircuitBulb3DStage";
import { LabRendererToggle, useLabRendererMode } from "../../shared/LabRendererToggle";
import "./CircuitBulbActivity.css";

const text = defineText({
  vi: {
    title: "Khám phá mạch điện",
    intro: "Dự đoán trước, sau đó thao tác công tắc trên sơ đồ để xem mô hình phản hồi.",
    draft: "Kết quả chỉ được ghi nhận sau khi em nộp. Bản nháp tự lưu trên thiết bị này.",
    steps: ["Dự đoán lần 1", "Đóng công tắc", "Dự đoán lần 2", "Mở công tắc", "Giải thích", "Nộp kết quả"],
    predictClosed: "Khi đóng công tắc, em dự đoán bóng đèn sẽ thế nào?",
    predictOpen: "Khi mở công tắc, em dự đoán bóng đèn sẽ thế nào?",
    predictionHint: "Chọn dự đoán trước khi thay đổi công tắc.",
    switchClosedPrompt: "Giờ hãy đóng công tắc trên sơ đồ.",
    switchOpenPrompt: "Giờ hãy mở công tắc trên sơ đồ.",
    switchClosed: "Công tắc đang đóng",
    switchOpen: "Công tắc đang mở",
    closedShort: "Đóng",
    openShort: "Mở",
    closeSwitch: "Đóng công tắc",
    openSwitch: "Mở công tắc",
    closedObservation: "Khi công tắc đóng, đường điện kín và bóng đèn sáng.",
    openObservation: "Khi công tắc mở, đường điện bị ngắt và bóng đèn tắt.",
    bulbOn: "Bóng đèn sáng",
    bulbOff: "Bóng đèn tắt",
    circuitClosed: "Đường điện kín",
    circuitOpen: "Đường điện bị ngắt",
    predict: "Dự đoán của em",
    on: "Sáng",
    off: "Tắt",
    explanation: "Vì sao bóng đèn tắt khi mở công tắc?",
    a: "Công tắc mở làm ngắt đường đi của dòng điện.",
    b: "Nguồn điện biến mất khi mở công tắc.",
    c: "Một dây dẫn biến thành chất cách điện.",
    ready: "Em đã hoàn thành các dự đoán và phần giải thích.",
    resultPending: "Sau khi nộp, em sẽ thấy kết quả chấm và phản hồi cho từng dự đoán.",
    diagram: "Sơ đồ mạch điện một vòng gồm nguồn điện, bóng đèn, dây nối và công tắc có thể thao tác.",
    battery: "Nguồn điện",
    bulb: "Bóng đèn",
    switchName: "Công tắc",
    question: "Câu hỏi", closeQuestion: "Đóng câu hỏi",
    modelLimit: "Mô hình lý tưởng để học về mạch kín và mạch hở; không tính dòng điện, độ sáng hay độ an toàn của mạch thật.",
  },
  en: {
    title: "Explore a circuit",
    intro: "Predict first, then use the switch on the diagram to see how the model responds.",
    draft: "Your result is recorded only after you submit. An unfinished draft is saved on this device.",
    steps: ["Predict 1", "Close switch", "Predict 2", "Open switch", "Explain", "Submit"],
    predictClosed: "What do you predict will happen to the bulb when the switch is closed?",
    predictOpen: "What do you predict will happen to the bulb when the switch is opened?",
    predictionHint: "Choose your prediction before changing the switch.",
    switchClosedPrompt: "Now close the switch on the diagram.",
    switchOpenPrompt: "Now open the switch on the diagram.",
    switchClosed: "Switch is closed",
    switchOpen: "Switch is open",
    closedShort: "Closed",
    openShort: "Open",
    closeSwitch: "Close the switch",
    openSwitch: "Open the switch",
    closedObservation: "With the switch closed, the path is complete and the bulb lights.",
    openObservation: "With the switch open, the path is broken and the bulb turns off.",
    bulbOn: "Bulb is on",
    bulbOff: "Bulb is off",
    circuitClosed: "Complete path",
    circuitOpen: "Broken path",
    predict: "Your prediction",
    on: "On",
    off: "Off",
    explanation: "Why does the bulb turn off when the switch is opened?",
    a: "The open switch breaks the path for the current.",
    b: "The battery disappears when the switch opens.",
    c: "A wire turns into an insulator.",
    ready: "You have completed both predictions and your explanation.",
    resultPending: "After you submit, you will see the score and feedback for each prediction.",
    diagram: "A one-loop circuit diagram with a power source, bulb, connecting wires and an interactive switch.",
    battery: "Power source",
    bulb: "Bulb",
    switchName: "Switch",
    question: "Questions", closeQuestion: "Close questions",
    modelLimit: "An idealised model for learning about complete and broken circuits. It does not calculate current, brightness or real-circuit safety.",
  },
});
const t = text();

const phaseIndex: Record<Phase, number> = {
  "predict-closed": 0,
  "switch-closed": 1,
  "predict-open": 2,
  "switch-open": 3,
  explain: 4,
  ready: 5,
};

export function CircuitBulbActivity({ state, onChange }: { state: unknown; onChange: (value: BulbEvidence) => void }) {
  const [viewMode, setViewMode] = useLabRendererMode("nexalab:lab-view:circuit-bulb");
  const [questionOpen, setQuestionOpen] = useState(true);
  const badge = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  const toggleQuestion = (open: boolean) => {
    setQuestionOpen(open);
    requestAnimationFrame(() => {
      if (open) {
        close.current?.focus({ preventScroll: true });
      } else {
        badge.current?.focus({ preventScroll: true });
      }
    });
  };
  const evidence = evidenceFrom(state);
  const phase = phaseOf(evidence);
  const checkpointIndex = phase === "predict-closed" || phase === "switch-closed" ? 0 : 1;
  const checkpoint = evidence.checkpoints[checkpointIndex];
  const closed = switchClosed(checkpoint);
  const switchIsActive = phase === "switch-closed" || phase === "switch-open";
  const showObservation = phase === "predict-open" || phase === "explain" || phase === "ready";

  const updateCheckpoint = (index: number, next: Checkpoint) => {
    const checkpoints = [...evidence.checkpoints] as [Checkpoint, Checkpoint];
    checkpoints[index] = next;
    onChange({ ...evidence, checkpoints });
  };
  const predict = (prediction: Exclude<Prediction, null>) =>
    updateCheckpoint(checkpointIndex, { ...checkpoint, prediction });
  const toggleDiagramSwitch = () =>
    updateCheckpoint(checkpointIndex, { ...checkpoint, state: circuit(!closed) });
  const setExplanation = (explanation: "A" | "B" | "C") => onChange({ ...evidence, explanation });

  const question = phase === "predict-closed" ? t.predictClosed : phase === "switch-closed" ? t.switchClosedPrompt :
    phase === "predict-open" ? t.predictOpen : phase === "switch-open" ? t.switchOpenPrompt :
      phase === "explain" ? t.explanation : t.ready;

  return <section className="bulb-activity" data-testid="bulb-activity" aria-label={t.title}>
    <LabRendererToggle mode={viewMode} onChange={setViewMode} />
    {viewMode === "3d" ? <CircuitBulb3DStage closed={closed} switchIsActive={switchIsActive} onToggleSwitch={toggleDiagramSwitch} isLit={showObservation && closed} /> : <div className="bulb-2d-stage" data-testid="bulb-2d-stage">
      <svg viewBox="0 0 900 500" role="img" aria-label={`${t.title}: ${closed ? t.circuitClosed : t.circuitOpen}; ${showObservation && closed ? t.bulbOn : t.bulbOff}`}>
        <defs><filter id="bulb-glow"><feGaussianBlur stdDeviation="12" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <path d="M185 250 H350 M550 250 H715 V390 H185 V250" fill="none" stroke="#b64738" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M350 250 H426 M474 250 H550" fill="none" stroke={closed ? "#31866a" : "#87918d"} strokeWidth="12" strokeLinecap="round" />
        <rect x="95" y="194" width="90" height="112" rx="16" fill="#325c85" stroke="#d7e2e8" strokeWidth="6" />
        <text x="140" y="244" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">9V</text><text x="140" y="274" textAnchor="middle" fill="#d7e2e8" fontSize="15">NGUỒN</text>
        <circle cx="450" cy="250" r="42" fill="#f4f2e8" stroke="#52645e" strokeWidth="8" />
        <path d={closed ? "M426 250 L474 250" : "M426 250 L470 222"} fill="none" stroke="#d39a32" strokeWidth="12" strokeLinecap="round" />
        <circle cx="735" cy="390" r="68" fill={showObservation && closed ? "#ffe38a" : "#e7e5d9"} stroke="#56645f" strokeWidth="8" filter={showObservation && closed ? "url(#bulb-glow)" : undefined} />
        <path d="M705 390 Q735 350 765 390 M714 426 H756 M720 440 H750" fill="none" stroke="#65736d" strokeWidth="7" strokeLinecap="round" />
        <text x="450" y="340" textAnchor="middle" fill="#344a42" fontSize="20" fontWeight="600">CÔNG TẮC {closed ? "ĐÓNG" : "MỞ"}</text>
        <text x="735" y="490" textAnchor="middle" fill="#344a42" fontSize="20" fontWeight="600">BÓNG ĐÈN</text>
      </svg>
    </div>}
    <span className="sr-only bulb-step-count">{phaseIndex[phase]+1} / 6</span>
    <button
      className={`bulb-accessible-switch ${switchIsActive ? "is-switch-active" : "is-switch-disabled"}`}
      type="button"
      aria-label={`${closed ? t.switchClosed : t.switchOpen}. ${closed ? t.openSwitch : t.closeSwitch}.`}
      aria-pressed={closed}
      disabled={!switchIsActive}
      onClick={toggleDiagramSwitch}
      data-testid="bulb-diagram-switch"
    >
      <span className={`bulb-switch-dot ${closed ? "is-closed" : "is-open"}`} aria-hidden="true" />
      <span className="bulb-switch-text">{closed ? t.openSwitch : t.closeSwitch}</span>
    </button>
    <button ref={badge} type="button" className="secondary bulb-question-badge" aria-expanded={questionOpen} aria-controls="bulb-questions" onClick={() => toggleQuestion(!questionOpen)}>
      <CircleHelp size={16} aria-hidden="true" />
      <span>{t.question} · {phaseIndex[phase]+1}/6</span>
    </button>
    <div id="bulb-questions" className={`bulb-content ${questionOpen ? "is-open question-open" : "is-closed question-closed"}`} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); toggleQuestion(false); } }}>
      <div className="bulb-companion-header">
        <div className="bulb-companion-badge">
          <span className="bulb-companion-discipline">VẬT LÝ · KHÁM PHÁ MẠCH</span>
          <span className="bulb-question-label">{t.steps[phaseIndex[phase]]} · {phaseIndex[phase]+1}/6</span>
        </div>
        <button ref={close} type="button" className="bulb-question-close-btn" aria-label={t.closeQuestion} title={t.closeQuestion} onClick={() => toggleQuestion(false)}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="bulb-stepper-track" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`bulb-stepper-pill ${i < phaseIndex[phase] ? "is-done" : i === phaseIndex[phase] ? "is-current" : ""}`}
          />
        ))}
      </div>

      <div className="bulb-question" aria-live="polite">
        <h3 className="bulb-question-text">{question}</h3>
      </div>

      {(phase === "predict-closed" || phase === "predict-open") && <fieldset className="bulb-prediction" data-testid={`bulb-prediction-${checkpoint.id.toLowerCase()}`}>
        <legend>{t.predict}</legend>
        {(["ON", "OFF"] as const).map(prediction => (
          <label key={prediction} className="bulb-choice">
            <input
              type="radio"
              name={`prediction-${checkpoint.id}`}
              value={prediction}
              checked={checkpoint.prediction === prediction}
              onChange={() => predict(prediction)}
            />
            <Lightbulb size={18} aria-hidden="true" />
            <span>{prediction === "ON" ? t.on : t.off}</span>
          </label>
        ))}
      </fieldset>}

      <div className="bulb-observation" role="status" aria-live="polite" data-testid="bulb-observation">
        {showObservation ? (
          <div className="bulb-observation-content">
            <span className={`bulb-observation-dot ${closed ? "is-lit" : "is-off"}`} aria-hidden="true" />
            <div className="bulb-observation-info">
              <b>{closed ? t.bulbOn : t.bulbOff}</b>
              <small>{closed ? t.closedObservation : t.openObservation}</small>
            </div>
          </div>
        ) : (
          <div className="bulb-observation-hint">
            <Info size={15} aria-hidden="true" />
            <span>{t.predictionHint}</span>
          </div>
        )}
      </div>

      {phase === "explain" && <fieldset className="bulb-explanation" data-testid="bulb-explanation">
        <legend>{t.explanation}</legend>
        {(["A", "B", "C"] as const).map(answer => (
          <label key={answer} className="bulb-explanation-choice">
            <input
              type="radio"
              name="bulb-explanation"
              value={answer}
              checked={evidence.explanation === answer}
              onChange={() => setExplanation(answer)}
            />
            <span className="bulb-explanation-letter">{answer}</span>
            <span className="bulb-explanation-text">{t[answer.toLowerCase() as "a" | "b" | "c"]}</span>
          </label>
        ))}
      </fieldset>}

      {phase === "ready" && <div className="bulb-ready" role="status"><Check size={18} aria-hidden="true" /><span>{t.ready}</span></div>}
      <p className="bulb-model-limit">{t.modelLimit}</p>
    </div>
  </section>;
}
