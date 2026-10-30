import { useState } from "react";
import { Check, CircleHelp, Lightbulb, Zap } from "lucide-react";
import { defineText } from "../../i18n";
import { CircuitBulb3DStage } from "./CircuitBulb3DStage";
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
    modelLimit: "An idealised model for learning about complete and broken circuits. It does not calculate current, brightness or real-circuit safety.",
  },
});
const t = text();

type Prediction = "ON" | "OFF" | null;
type BulbCircuit = {
  nodes: Array<{ id: string; type: "battery" | "bulb" | "switch"; closed?: boolean }>;
  edges: Array<{ source: string; target: string }>;
};
type Checkpoint = { id: "CLOSED" | "OPEN"; state: BulbCircuit; prediction: Prediction };
export type BulbEvidence = { checkpoints: [Checkpoint, Checkpoint]; explanation: "A" | "B" | "C" | null };
type Phase = "predict-closed" | "switch-closed" | "predict-open" | "switch-open" | "explain" | "ready";

function circuit(closed: boolean): BulbCircuit {
  return {
    nodes: [{ id: "battery", type: "battery" }, { id: "bulb", type: "bulb" }, { id: "switch", type: "switch", closed }],
    edges: [{ source: "battery", target: "bulb" }, { source: "bulb", target: "switch" }, { source: "switch", target: "battery" }],
  };
}

export function defaultBulbEvidence(): BulbEvidence {
  return {
    checkpoints: [
      { id: "CLOSED", state: circuit(false), prediction: null },
      { id: "OPEN", state: circuit(true), prediction: null },
    ],
    explanation: null,
  };
}

function evidenceFrom(value: any): BulbEvidence {
  const valid = Array.isArray(value?.checkpoints) && value.checkpoints.length === 2 &&
    value.checkpoints[0]?.id === "CLOSED" && value.checkpoints[1]?.id === "OPEN" &&
    value.checkpoints.every((item: any) =>
      Array.isArray(item?.state?.nodes) && Array.isArray(item?.state?.edges) &&
      item.state.nodes.some((node: any) => node?.type === "switch" && typeof node.closed === "boolean") &&
      (item.prediction === null || item.prediction === "ON" || item.prediction === "OFF")) &&
    (value.explanation === null || ["A", "B", "C"].includes(value.explanation));
  return valid ? value : defaultBulbEvidence();
}

function switchClosed(checkpoint: Checkpoint) {
  return checkpoint.state.nodes.find((node) => node.type === "switch")?.closed === true;
}

function phaseOf(evidence: BulbEvidence): Phase {
  if (evidence.checkpoints[0].prediction === null) return "predict-closed";
  if (!switchClosed(evidence.checkpoints[0])) return "switch-closed";
  if (evidence.checkpoints[1].prediction === null) return "predict-open";
  if (switchClosed(evidence.checkpoints[1])) return "switch-open";
  if (!evidence.explanation) return "explain";
  return "ready";
}

export function bulbEvidenceReady(value: unknown): boolean {
  const evidence = evidenceFrom(value);
  return switchClosed(evidence.checkpoints[0]) && evidence.checkpoints[0].prediction !== null &&
    !switchClosed(evidence.checkpoints[1]) && evidence.checkpoints[1].prediction !== null &&
    ["A", "B", "C"].includes(evidence.explanation ?? "");
}

const phaseIndex: Record<Phase, number> = {
  "predict-closed": 0,
  "switch-closed": 1,
  "predict-open": 2,
  "switch-open": 3,
  explain: 4,
  ready: 5,
};

export function CircuitBulbActivity({ state, onChange }: { state: unknown; onChange: (value: BulbEvidence) => void }) {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const evidence = evidenceFrom(state);
  const phase = phaseOf(evidence);
  const checkpointIndex = phase === "predict-closed" || phase === "switch-closed" ? 0 : 1;
  const checkpoint = evidence.checkpoints[checkpointIndex];
  const closed = switchClosed(checkpoint);
  const switchIsActive = phase === "switch-closed" || phase === "switch-open";
  const showObservation = phase === "predict-open" || phase === "explain" || phase === "ready";
  const observedClosedState = switchClosed(evidence.checkpoints[0]);

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

  return (
    <section className="bulb-activity" data-testid="bulb-activity" aria-labelledby="bulb-activity-title">
      <header className="bulb-activity-header">
        <div>
          <p className="bulb-eyebrow"><Zap size={15} aria-hidden="true" /> KHOA HỌC TỰ NHIÊN · MẠCH ĐIỆN</p>
          <h2 id="bulb-activity-title">{t.title}</h2>
          <p className="bulb-intro">{t.intro}</p>
        </div>
        <span className="bulb-step-count" aria-live="polite">{phaseIndex[phase] + 1} / {t.steps.length}</span>
      </header>

      <ol className="bulb-progress" aria-label={t.title}>
        {t.steps.map((label, index) => {
          const complete = index < phaseIndex[phase];
          const current = index === phaseIndex[phase];
          return (
            <li key={label} className={complete ? "is-complete" : current ? "is-current" : ""} aria-current={current ? "step" : undefined}>
              <span className="bulb-progress-number">{complete ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="bulb-content">
        <div className="bulb-question" aria-live="polite">
          <span className="bulb-question-icon"><CircleHelp size={19} aria-hidden="true" /></span>
          <div>
            <p className="bulb-question-label">{phase === "explain" ? t.predict : t.steps[phaseIndex[phase]]}</p>
            <h3>{question}</h3>
            {(phase === "predict-closed" || phase === "predict-open") && <p className="bulb-helper">{t.predictionHint}</p>}
          </div>
        </div>

        {(phase === "predict-closed" || phase === "predict-open") && (
          <fieldset className="bulb-prediction" data-testid={`bulb-prediction-${checkpoint.id.toLowerCase()}`}>
            <legend>{t.predict}</legend>
            {(["ON", "OFF"] as const).map((prediction) => (
              <label key={prediction} className={`bulb-choice ${checkpoint.prediction === prediction ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name={`prediction-${checkpoint.id}`}
                  value={prediction}
                  checked={checkpoint.prediction === prediction}
                  onChange={() => predict(prediction)}
                />
                <span className={`bulb-choice-icon ${prediction === "ON" ? "is-on" : "is-off"}`} aria-hidden="true">
                  <Lightbulb size={21} />
                </span>
                <span>{prediction === "ON" ? t.on : t.off}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div className={`bulb-diagram-shell ${switchIsActive ? "can-toggle" : ""}`}>
          <div className="bulb-diagram-heading">
            <div>
              <b>{t.steps[checkpointIndex === 0 ? 1 : 3]}</b>
              <span>{closed ? t.switchClosed : t.switchOpen}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700/60 text-xs" role="tablist" aria-label="Chế độ hiển thị">
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  viewMode === "3d" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                🪐 3D Bàn Lab
              </button>
              <button
                type="button"
                onClick={() => setViewMode("2d")}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                  viewMode === "2d" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                📐 2D Sơ đồ
              </button>
            </div>
            <span className="bulb-live-state" data-state={showObservation ? (closed ? "on" : "off") : "hidden"}>
              {showObservation ? <><Lightbulb size={17} aria-hidden="true" /><b>{closed ? t.bulbOn : t.bulbOff}</b></> : t.bulb}
            </span>
          </div>
          {viewMode === "3d" ? (
            <div className="bulb-3d-wrapper relative" data-switch={closed ? "closed" : "open"}>
              <CircuitBulb3DStage
                closed={closed}
                switchIsActive={switchIsActive}
                onToggleSwitch={toggleDiagramSwitch}
                isLit={showObservation && closed}
              />
              {/* Preserved invisible semantic control for accessibility & Playwright testing */}
              <button
                className="sr-only"
                type="button"
                aria-label={`${closed ? t.switchClosed : t.switchOpen}. ${closed ? t.openSwitch : t.closeSwitch}.`}
                aria-pressed={closed}
                aria-disabled={!switchIsActive}
                disabled={!switchIsActive}
                onClick={toggleDiagramSwitch}
                data-testid="bulb-diagram-switch"
              >
                {closed ? t.closedShort : t.openShort}
              </button>
            </div>
          ) : (
            <div className="bulb-diagram" data-switch={closed ? "closed" : "open"}>
              <svg viewBox="0 0 760 360" aria-label={t.diagram} role="img" className="bulb-circuit-art">
                <title>{t.diagram}</title>
                <path className="bulb-wire bulb-wire-positive" d="M158 132 V76 H575 V120" />
                <path className="bulb-wire bulb-wire-return" d="M575 244 V282 H432 M328 282 H158 V238" />
                <g className="bulb-battery" aria-hidden="true">
                  <rect x="105" y="135" width="72" height="100" rx="17" />
                  <rect className="battery-cap" x="122" y="125" width="38" height="13" rx="5" />
                  <text x="141" y="176" textAnchor="middle">+</text>
                  <text x="141" y="211" textAnchor="middle">−</text>
                  <text className="part-label" x="196" y="203" textAnchor="start">{t.battery}</text>
                </g>
                <g className={`bulb-lamp ${showObservation && closed ? "is-lit" : ""}`} aria-hidden="true">
                  <path className="lamp-glass" d="M575 116 C540 116 522 143 527 173 C530 193 544 200 549 214 L601 214 C606 200 620 193 623 173 C628 143 610 116 575 116 Z" />
                  <path className="lamp-filament" d="M558 178 L570 166 L582 178 L594 166" />
                  <path className="lamp-neck" d="M550 214 H600 M553 224 H597 M557 234 H593" />
                  <path className="lamp-base" d="M558 244 H592 V255 H558 Z" />
                  <text className="part-label" x="575" y="312" textAnchor="middle">{t.bulb}</text>
                </g>
                <circle className="switch-contact" cx="328" cy="282" r="8" />
                <circle className="switch-contact" cx="432" cy="282" r="8" />
              </svg>
              <button
                className={`bulb-switch-control ${closed ? "is-closed" : "is-open"}`}
                type="button"
                aria-label={`${closed ? t.switchClosed : t.switchOpen}. ${closed ? t.openSwitch : t.closeSwitch}.`}
                aria-pressed={closed}
                aria-disabled={!switchIsActive}
                disabled={!switchIsActive}
                onClick={toggleDiagramSwitch}
                data-testid="bulb-diagram-switch"
              >
                <span className="switch-bridge" aria-hidden="true" />
                <span className="switch-caption">{closed ? t.closedShort : t.openShort}</span>
              </button>
            </div>
          )}
          <div className={`bulb-observation ${showObservation ? "is-visible" : ""}`} role="status" aria-live="polite" data-testid="bulb-observation">
            {showObservation ? (
              <>
                <span className={`bulb-observation-icon ${closed ? "is-on" : "is-off"}`}><Lightbulb size={23} aria-hidden="true" /></span>
                <span><b>{closed ? t.bulbOn : t.bulbOff}</b><small>{closed ? t.circuitClosed : t.circuitOpen}</small></span>
                <span className="bulb-observation-note">{closed ? t.closedObservation : t.openObservation}</span>
              </>
            ) : (
              <span className="bulb-observation-placeholder">{t.predictionHint}</span>
            )}
          </div>
          {checkpointIndex === 1 && !showObservation && observedClosedState && evidence.checkpoints[0].prediction !== null && (
            <p className="bulb-past-observation" data-testid="bulb-first-observation"><Check size={15} aria-hidden="true" /> {t.closedObservation}</p>
          )}
        </div>

        {phase === "explain" && (
          <fieldset className="bulb-explanation" data-testid="bulb-explanation">
            <legend>{t.explanation}</legend>
            {(["A", "B", "C"] as const).map((answer) => (
              <label key={answer} className={`bulb-explanation-choice ${evidence.explanation === answer ? "is-selected" : ""}`}>
                <input type="radio" name="bulb-explanation" value={answer} checked={evidence.explanation === answer} onChange={() => setExplanation(answer)} />
                <span className="bulb-explanation-letter">{answer}</span>
                <span>{t[answer.toLowerCase() as "a" | "b" | "c"]}</span>
              </label>
            ))}
          </fieldset>
        )}

        {phase === "ready" && (
          <p className="bulb-ready" role="status"><Check size={18} aria-hidden="true" /> {t.ready}</p>
        )}
      </div>

      <footer className="bulb-activity-footer">
        <p>{t.draft}</p>
        <p className="bulb-model-limit">{t.modelLimit}</p>
      </footer>
    </section>
  );
}
