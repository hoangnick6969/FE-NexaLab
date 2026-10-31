import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Compass, Eye, EyeOff, Info, RotateCcw, X } from "lucide-react";
import { defineText } from "../../../../../i18n";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { ACTION_FOR, actionDuration, magnetRest, type EmAction, type EmCue } from "./choreography";
import { EmInduction2DView } from "./EmInduction2DView";
import { useReducedMotion } from "./apparatus/anim";
import { useManualDrive, type EmManualSigns } from "./manual";
import {
  EM_CHOICES, EM_STEP_COUNT, emEvidenceFrom, emPhaseOf, emStepNumber, previewObservation,
  type EmCheckpointId, type EmEvidence, type EmObservation, type EmPrediction, type EmState,
} from "./em-evidence";
import "./EmInductionActivity.css";

// The 3D scene loads only when it is shown.
const EmInduction3DStage = lazy(() => import("./EmInduction3DStage"));

const text = defineText({
  vi: {
    title: "Cảm ứng điện từ",
    discipline: "Vật lý 9, cảm ứng điện từ",
    step: (n: number) => `Bước ${n}/${EM_STEP_COUNT}`,
    questions: "Câu hỏi", closeQuestions: "Đóng câu hỏi",
    predictLegend: "Dự đoán của em",
    predictHint: "Chọn dự đoán trước, rồi mới thao tác.",
    question: {
      STILL: "Nam châm đứng yên ngay cạnh miệng cuộn dây, cực N hướng vào. Theo em, trong cuộn dây có dòng điện không?",
      PUSH: "Khi đẩy cực N vào trong lòng cuộn dây, theo em có dòng điện không?",
      PULL: "Khi kéo cực N ra khỏi cuộn dây, dòng điện (nếu có) sẽ thế nào so với lúc đẩy vào?",
      ROTATE: "Khi quay nam châm của máy phát đủ một vòng, theo em dòng điện trong cuộn dây sẽ thế nào?",
    } as Record<EmCheckpointId, string>,
    actPrompt: {
      STILL: "Giữ yên nam châm và quan sát điện kế, đèn LED.",
      PUSH: "Giờ hãy đẩy cực N vào trong cuộn dây.",
      PULL: "Giờ hãy kéo cực N ra khỏi cuộn dây.",
      ROTATE: "Giờ hãy quay tay quay của máy phát một vòng.",
    } as Record<EmCheckpointId, string>,
    action: {
      STILL: "Giữ yên và quan sát",
      PUSH: "Đẩy cực N vào",
      PULL: "Kéo cực N ra",
      ROTATE: "Quay một vòng",
    } as Record<EmCheckpointId, string>,
    running: "Đang thực hiện…",
    blocked: {
      predict: "Chọn dự đoán của em trước, rồi mới kéo.",
      still: "Ở bước này nam châm đứng yên: bấm nút “Giữ yên và quan sát”.",
      magnetNow: "Bước này dùng nam châm: bấm giữ nam châm rồi kéo dọc ray.",
      crankNow: "Bước này là quay máy phát: bấm giữ núm gỗ của tay quay rồi kéo vòng tròn.",
      done: "Em đã làm xong các bước. Mở “Khám phá thêm” để kéo thử tiếp.",
    },
    dragHint: {
      STILL: "",
      PUSH: "Kéo nam châm dọc ray vào trong cuộn dây, hoặc bấm nút ở góc dưới.",
      PULL: "Kéo nam châm dọc ray ra khỏi cuộn dây, hoặc bấm nút ở góc dưới.",
      ROTATE: "Kéo tay quay của máy phát đủ một vòng, hoặc bấm nút ở góc dưới.",
    } as Record<EmCheckpointId, string>,
    observing: "Nam châm đang được giữ yên.",
    choice: {
      CURRENT: "Có dòng điện",
      NO_CURRENT: "Không có dòng điện",
      SAME: "Cùng chiều với lúc đẩy vào",
      OPPOSITE: "Ngược chiều với lúc đẩy vào",
      NONE: "Không có dòng điện",
      ONE_DIRECTION: "Dòng điện chỉ chạy theo một chiều",
      ALTERNATING: "Dòng điện luân phiên đổi chiều",
    } as Record<EmPrediction, string>,
    explanation: "Vì sao trong cuộn dây xuất hiện dòng điện?",
    a: "Dòng điện cảm ứng xuất hiện khi số đường sức từ xuyên qua tiết diện cuộn dây dẫn kín biến thiên.",
    b: "Cứ đặt nam châm gần cuộn dây là luôn có dòng điện.",
    c: "Dòng điện xuất hiện vì nam châm chạm vào dây dẫn.",
    ready: "Em đã hoàn thành các dự đoán và phần giải thích.",
    observedNone: "Kim điện kế đứng yên ở vạch 0. Hai đèn LED đều tắt.",
    observedRight: "Kim điện kế lệch sang phải. Đèn LED A sáng.",
    observedLeft: "Kim điện kế lệch sang trái. Đèn LED B sáng.",
    observedAc: "Kim điện kế lệch qua lại hai phía; đèn LED A và B sáng luân phiên. Dòng điện đổi chiều hai lần mỗi vòng quay.",
    duringMotion: "Trong lúc nam châm chuyển động.",
    waveform: "Chiều dòng điện theo góc quay (dạng minh hoạ, không phải số đo)",
    fieldOn: "Hiện đường sức từ", fieldOff: "Ẩn đường sức từ",
    fieldNote: "Đường sức từ chỉ là hình minh hoạ.",
    resetView: "Đặt lại góc nhìn",
    sceneLabel: "Thí nghiệm cảm ứng điện từ: cuộn dây nối với điện kế và hai đèn LED mắc ngược chiều, một nam châm thẳng trên ray và một máy phát quay tay.",
    loading: "Đang tải không gian 3D…",
    modelLimit: "Mô hình định tính: chỉ cho biết có hay không có dòng điện cảm ứng và chiều của nó. Không tính độ lớn, tốc độ hay số vòng dây. Kim điện kế và đèn chỉ minh hoạ chiều dòng điện.",
    explore: {
      show: "Khám phá thêm", hide: "Đóng khám phá",
      title: "Khám phá tự do",
      intro: "Thử đổi cực nam châm, mở mạch hoặc quay ngược máy phát. Em có thể kéo nam châm và tay quay trực tiếp trong hình. Phần này không được chấm điểm và không được lưu.",
      pole: "Cực hướng vào cuộn dây", circuit: "Mạch điện", closed: "Kín", open: "Hở (công tắc mở)",
      push: "Đẩy nam châm vào", pull: "Kéo nam châm ra", hold: "Giữ yên", cw: "Quay thuận một vòng", ccw: "Quay ngược một vòng",
      openCircuit: "Mạch hở nên không có dòng điện chạy qua điện kế và đèn LED.",
      prompt: "Chọn một thao tác để xem kết quả.",
    },
  },
  en: {
    title: "Electromagnetic induction",
    discipline: "Physics 9, electromagnetic induction",
    step: (n: number) => `Step ${n}/${EM_STEP_COUNT}`,
    questions: "Questions", closeQuestions: "Close questions",
    predictLegend: "Your prediction",
    predictHint: "Choose your prediction first, then act.",
    question: {
      STILL: "The magnet is held still right at the mouth of the coil, N pole facing it. Is there a current in the coil?",
      PUSH: "When you push the N pole into the coil, is there a current?",
      PULL: "When you pull the N pole out, how does the current (if any) compare with pushing it in?",
      ROTATE: "When you turn the generator magnet one full turn, what happens to the current in the coil?",
    } as Record<EmCheckpointId, string>,
    actPrompt: {
      STILL: "Hold the magnet still and watch the meter and LEDs.",
      PUSH: "Now push the N pole into the coil.",
      PULL: "Now pull the N pole out of the coil.",
      ROTATE: "Now turn the generator crank one full turn.",
    } as Record<EmCheckpointId, string>,
    action: { STILL: "Hold still and observe", PUSH: "Push the N pole in", PULL: "Pull the N pole out", ROTATE: "Turn one full turn" } as Record<EmCheckpointId, string>,
    running: "Running…",
    blocked: {
      predict: "Choose your prediction first, then drag.",
      still: "In this step the magnet stays still: press “Hold still and observe”.",
      magnetNow: "This step uses the magnet: press and hold it, then drag along the rail.",
      crankNow: "This step turns the generator: press and hold the wooden knob, then drag in a circle.",
      done: "You have finished the steps. Open “Explore more” to keep experimenting.",
    },
    dragHint: {
      STILL: "",
      PUSH: "Drag the magnet along the rail into the coil, or use the button below.",
      PULL: "Drag the magnet along the rail out of the coil, or use the button below.",
      ROTATE: "Drag the generator crank one full turn, or use the button below.",
    } as Record<EmCheckpointId, string>,
    observing: "The magnet is being held still.",
    choice: {
      CURRENT: "There is a current", NO_CURRENT: "There is no current", SAME: "Same direction as pushing in",
      OPPOSITE: "Opposite to pushing in", NONE: "There is no current", ONE_DIRECTION: "The current flows one way only",
      ALTERNATING: "The current keeps changing direction",
    } as Record<EmPrediction, string>,
    explanation: "Why does a current appear in the coil?",
    a: "An induced current appears when the number of magnetic field lines through the closed coil changes.",
    b: "A magnet near a coil always produces a current.",
    c: "The current appears because the magnet touches the wire.",
    ready: "You have completed all predictions and your explanation.",
    observedNone: "The meter needle stays at 0. Both LEDs are off.",
    observedRight: "The meter needle swings right. LED A lights.",
    observedLeft: "The meter needle swings left. LED B lights.",
    observedAc: "The needle swings to both sides; LEDs A and B light in turn. The current reverses twice per turn.",
    duringMotion: "While the magnet is moving.",
    waveform: "Current direction against rotation angle (illustration, not a measurement)",
    fieldOn: "Show field lines", fieldOff: "Hide field lines",
    fieldNote: "Field lines are an illustration only.",
    resetView: "Reset view",
    sceneLabel: "Induction experiment: a coil connected to a meter and two inverse-parallel LEDs, a bar magnet on a rail and a hand-cranked generator.",
    loading: "Loading the 3D space…",
    modelLimit: "Qualitative model: it shows only whether an induced current exists and its direction. It does not compute size, speed or number of turns. The needle and LEDs only illustrate direction.",
    explore: {
      show: "Explore more", hide: "Close explore",
      title: "Free explore",
      intro: "Try flipping the magnet, opening the circuit or turning the generator backwards. You can also drag the magnet and the crank in the picture. This part is not scored or saved.",
      pole: "Pole facing the coil", circuit: "Circuit", closed: "Closed", open: "Open (switch off)",
      push: "Push the magnet in", pull: "Pull the magnet out", hold: "Hold still", cw: "Turn forward once", ccw: "Turn backwards once",
      openCircuit: "The circuit is open, so no current flows through the meter and LEDs.",
      prompt: "Choose an action to see what happens.",
    },
  },
});
const t = text();

/** Model current sign for a state: +1 for D1, -1 for D2, 0 when no current (generator: its first half-turn). */
function currentSign(state: EmState) {
  const observation = previewObservation(state);
  if (!observation || observation.inducedCurrent !== "PRESENT") return 0;
  const direction = observation.setup === "magnet-coil" ? observation.direction : observation.phaseDirections[2];
  return direction === "D1" ? 1 : direction === "D2" ? -1 : 0;
}

function describe(observation: EmObservation | null) {
  if (!observation || observation.inducedCurrent !== "PRESENT") return t.observedNone;
  if (observation.setup === "generator") return t.observedAc;
  return observation.direction === "D1" ? t.observedRight : t.observedLeft;
}

/** Signs of the current over one turn, drawn as an illustrative curve from the model's phase samples. */
function Waveform({ observation }: { observation: EmObservation }) {
  if (observation.setup !== "generator" || observation.inducedCurrent !== "PRESENT") return null;
  const sign = observation.phaseDirections[2] === "D1" ? 1 : -1;
  const points = Array.from({ length: 49 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2;
    return `${8 + (i / 48) * 224},${40 - sign * Math.sin(angle) * 28}`;
  }).join(" ");
  return <figure className="em-waveform">
    <svg viewBox="0 0 240 80" aria-hidden="true">
      <line x1="8" y1="40" x2="232" y2="40" className="em-waveform-axis" />
      <polyline points={points} className="em-waveform-line" />
      {observation.phaseDirections.map((direction, i) => <circle key={i} cx={8 + (i / 8) * 224} cy={direction === "NONE" ? 40 : 40 - sign * 28 * Math.sin(i * Math.PI / 4)} r="2.6" className="em-waveform-sample" />)}
    </svg>
    <figcaption>{t.waveform}</figcaption>
  </figure>;
}

/** Free explore settings: local view state only, never part of the draft or the submission. */
type Explore = { pole: "N" | "S"; circuit: "CLOSED" | "OPEN"; position: "OUTSIDE" | "INSIDE" };
type ExploreMove = "magnet" | "hold" | "cw" | "ccw";

function exploreStep(explore: Explore, move: ExploreMove): { action: EmAction; state: EmState; reverse?: boolean } {
  const coil = { setup: "magnet-coil" as const, circuit: explore.circuit, poleFacingCoil: explore.pole };
  if (move === "hold") return { action: "still", state: { ...coil, magnetPosition: explore.position, motion: "STILL" } };
  if (move === "magnet") return explore.position === "OUTSIDE"
    ? { action: "push", state: { ...coil, magnetPosition: "INSIDE", motion: "TOWARD" } }
    : { action: "pull", state: { ...coil, magnetPosition: "OUTSIDE", motion: "AWAY" } };
  return { action: "rotate", reverse: move === "ccw", state: { setup: "generator", circuit: explore.circuit, rotation: move === "cw" ? "CW" : "CCW", turns: 1 } };
}

export function EmInductionActivity({ state, onChange }: { state: unknown; onChange: (value: EmEvidence) => void }) {
  const [viewMode, setViewMode] = useLabRendererMode("nexalab:lab-view:em-induction");
  const reduced = useReducedMotion();
  const [questionOpen, setQuestionOpen] = useState(true);
  const [showField, setShowField] = useState(true);
  const [viewReset, setViewReset] = useState(0);
  const [cue, setCue] = useState<EmCue & { startedAt: number }>({ action: null, nonce: 0, startedAt: 0 });
  const [explore, setExplore] = useState<Explore | null>(null);
  const [exploreShown, setExploreShown] = useState<EmState | null>(null);
  const evidence = emEvidenceFrom(state);
  const latest = useRef(evidence);
  latest.current = evidence;
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const phase = emPhaseOf(evidence);
  const [dragging, setDragging] = useState(false);
  // Why a pressed part did not move; cleared after a few seconds.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  useEffect(() => () => { if (noticeTimer.current) window.clearTimeout(noticeTimer.current); }, []);
  const animating = cue.action !== null;
  const running = animating || dragging;
  const step = emStepNumber(phase);
  const current = phase.kind === "predict" || phase.kind === "act" ? evidence.checkpoints[phase.index] : null;
  const lastObserved = [...evidence.checkpoints].reverse().find((checkpoint) => evidence.observed[checkpoint.id]) ?? null;
  // During an action the scene shows the checkpoint being acted on; otherwise the last observed one.
  const shown = running && current ? current : lastObserved;
  // Explore unlocks only after every checkpoint was observed, so it cannot reveal an answer before a prediction.
  const exploreUnlocked = phase.kind === "explain" || phase.kind === "ready";
  const active = exploreUnlocked ? explore : null;
  const exploring = active !== null;
  const checkpointObservation = shown ? previewObservation(shown.state) : null;
  const observation = active ? (exploreShown ? previewObservation(exploreShown) : null) : checkpointObservation;
  const restTravel = (active ? active.position : magnetRest(evidence)) === "INSIDE" ? 1 : 0;
  const activeTarget = phase.kind === "act" && !running ? (phase.id === "ROTATE" ? "generator" : "magnet") : null;

  // Direct manipulation: signs come from the pinned model for the current setup (checkpoint or explore).
  const setupState = shown?.state.setup === "magnet-coil" ? shown.state : null;
  const circuit = active?.circuit ?? setupState?.circuit ?? "CLOSED";
  const facing = active?.pole ?? setupState?.poleFacingCoil ?? "N";
  const signs = useMemo<EmManualSigns>(() => ({
    toward: currentSign({ setup: "magnet-coil", circuit, poleFacingCoil: facing, magnetPosition: "INSIDE", motion: "TOWARD" }),
    away: currentSign({ setup: "magnet-coil", circuit, poleFacingCoil: facing, magnetPosition: "OUTSIDE", motion: "AWAY" }),
    cw: currentSign({ setup: "generator", circuit, rotation: "CW", turns: 1 }),
    ccw: currentSign({ setup: "generator", circuit, rotation: "CCW", turns: 1 }),
  }), [circuit, facing]);
  const actId = phase.kind === "act" ? phase.id : null;
  const manual = useManualDrive({
    restTravel,
    signs,
    can: {
      magnet: !animating && (exploring || actId === "PUSH" || actId === "PULL"),
      crank: !animating && (exploring || actId === "ROTATE"),
    },
    onDragChange: (value) => { setDragging(value); if (value) setNotice(null); },
    onBlocked: (kind) => {
      if (running) return;
      const reason = phase.kind === "predict" ? t.blocked.predict
        : actId === "STILL" ? t.blocked.still
        : actId === "ROTATE" && kind === "magnet" ? t.blocked.crankNow
        : actId && kind === "crank" ? t.blocked.magnetNow
        : t.blocked.done;
      setNotice(reason);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setNotice(null), 4500);
    },
    onCommit: (move) => {
      if (active) {
        if (move === "push" || move === "pull") {
          const position = move === "push" ? "INSIDE" : "OUTSIDE";
          setExplore({ ...active, position });
          setExploreShown({ setup: "magnet-coil", circuit: active.circuit, poleFacingCoil: active.pole, magnetPosition: position, motion: move === "push" ? "TOWARD" : "AWAY" });
        } else setExploreShown({ setup: "generator", circuit: active.circuit, rotation: move === "cw" ? "CW" : "CCW", turns: 1 });
        return;
      }
      const id = move === "push" ? "PUSH" : move === "pull" ? "PULL" : "ROTATE";
      if (actId !== id) return;
      const next = latest.current;
      onChange({ ...next, observed: { ...next.observed, [id]: true } });
    },
  });

  const act = () => {
    if (phase.kind !== "act" || running) return;
    const id = phase.id;
    const action = ACTION_FOR[id];
    manual.state.current.rotor = 0;
    setCue((previous) => ({ action, nonce: previous.nonce + 1, startedAt: performance.now() }));
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const next = latest.current;
      onChange({ ...next, observed: { ...next.observed, [id]: true } });
      setCue((previous) => ({ ...previous, action: null }));
    }, actionDuration(action, reduced));
  };
  const exploreMove = (move: ExploreMove) => {
    if (!active || running) return;
    const step = exploreStep(active, move);
    setExploreShown(step.state);
    manual.state.current.rotor = 0;
    setCue((previous) => ({ action: step.action, reverse: step.reverse, nonce: previous.nonce + 1, startedAt: performance.now() }));
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (step.state.setup === "magnet-coil") {
        const position = step.state.magnetPosition;
        setExplore((value) => value && { ...value, position });
      }
      setCue((previous) => ({ ...previous, action: null, reverse: false }));
    }, actionDuration(step.action, reduced));
  };
  const toggleExplore = () => {
    if (running) return;
    setExplore((value) => value ? null : { pole: "N", circuit: "CLOSED", position: "OUTSIDE" });
    setExploreShown(null);
  };
  const exploreText = () => {
    if (!exploreShown) return t.explore.prompt;
    if (exploreShown.circuit === "OPEN") return t.explore.openCircuit;
    return describe(observation);
  };
  const predict = (prediction: EmPrediction) => {
    if (phase.kind !== "predict") return;
    const checkpoints = [...evidence.checkpoints] as EmEvidence["checkpoints"];
    checkpoints[phase.index] = { ...checkpoints[phase.index], prediction };
    onChange({ ...evidence, checkpoints });
  };
  const explain = (explanation: "A" | "B" | "C") => onChange({ ...evidence, explanation });

  const heading = phase.kind === "predict" ? t.question[phase.id] : phase.kind === "act" ? t.actPrompt[phase.id] : phase.kind === "explain" ? t.explanation : t.ready;
  const stageProps = { cue, observation, restTravel, reduced, showField, pole: active?.pole ?? "N", circuit: active?.circuit ?? "CLOSED" };
  const exploreTarget = exploring && !running ? "magnet" : null;
  const activate = () => exploring ? exploreMove("magnet") : act();

  return <section className="em-activity" data-testid="em-activity" aria-label={t.title}>
    {viewMode === "3d"
      ? <Suspense fallback={<p className="em-loading" role="status">{t.loading}</p>}>
          <EmInduction3DStage {...stageProps} activeTarget={activeTarget ?? exploreTarget} onActivate={activate} viewResetSignal={viewReset} manual={manual} />
        </Suspense>
      : <EmInduction2DView {...stageProps} manual={manual} label={`${t.sceneLabel} ${describe(observation)}`} />}
    <span className="sr-only">{t.sceneLabel}</span>

    <p className="em-notice" role="status" data-testid="em-notice">{notice}</p>
    <div className="em-dock" role="group" aria-label={t.title}>
      <button type="button" className="em-act" data-testid="em-act" disabled={phase.kind !== "act" || running} onClick={act}>
        <span className="em-act-dot" aria-hidden="true" data-active={phase.kind === "act" && !running} />
        <span>{running ? t.running : phase.kind === "act" ? t.action[phase.id] : current ? t.action[current.id] : t.action.ROTATE}</span>
      </button>
      <button type="button" className="em-tool" aria-pressed={showField} title={showField ? t.fieldOff : t.fieldOn} onClick={() => setShowField((value) => !value)}>
        {showField ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        <span>{showField ? t.fieldOff : t.fieldOn}</span>
      </button>
      {viewMode === "3d" && <button type="button" className="em-tool" title={t.resetView} onClick={() => setViewReset((value) => value + 1)}>
        <RotateCcw size={16} aria-hidden="true" /><span>{t.resetView}</span>
      </button>}
      <LabRendererToggle mode={viewMode} onChange={setViewMode} />
    </div>

    <button type="button" className="em-question-badge" aria-expanded={questionOpen} aria-controls="em-questions" onClick={() => setQuestionOpen((open) => !open)}>
      <CircleHelp size={16} aria-hidden="true" /><span>{t.questions}, {t.step(step).toLowerCase()}</span>
    </button>
    <div id="em-questions" className="em-panel" data-open={questionOpen} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setQuestionOpen(false); } }}>
      <div className="em-panel-header">
        <div>
          <p className="em-discipline">{t.discipline}</p>
          <p className="em-step">{t.step(step)}</p>
        </div>
        <button type="button" className="em-close" aria-label={t.closeQuestions} title={t.closeQuestions} onClick={() => setQuestionOpen(false)}><X size={15} aria-hidden="true" /></button>
      </div>
      <div className="em-progress" aria-hidden="true">
        {Array.from({ length: EM_STEP_COUNT }, (_, i) => <span key={i} data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "todo"} />)}
      </div>
      <h3 className="em-heading" aria-live="polite">{heading}</h3>
      {actId && t.dragHint[actId] && <p className="em-note" data-testid="em-drag-hint">{t.dragHint[actId]}</p>}

      {phase.kind === "predict" && <fieldset className="em-choices" data-testid={`em-prediction-${phase.id.toLowerCase()}`}>
        <legend>{t.predictLegend}</legend>
        {EM_CHOICES[phase.id].map((choice) => <label key={choice} className="em-choice">
          <input type="radio" name={`em-prediction-${phase.id}`} value={choice} checked={current?.prediction === choice} onChange={() => predict(choice)} />
          <span>{t.choice[choice]}</span>
        </label>)}
      </fieldset>}

      <div className="em-observation" role="status" aria-live="polite" data-testid="em-observation">
        {running && !exploring ? <p>{describe(checkpointObservation)} <small>{current?.id === "STILL" ? t.observing : t.duringMotion}</small></p>
          : lastObserved && checkpointObservation ? <>
              <p><Check size={15} aria-hidden="true" /> {describe(checkpointObservation)}</p>
              <Waveform observation={checkpointObservation} />
            </>
          : <p className="em-hint"><Info size={15} aria-hidden="true" /> {t.predictHint}</p>}
      </div>

      {phase.kind === "explain" || phase.kind === "ready" ? <fieldset className="em-choices" data-testid="em-explanation">
        <legend>{t.explanation}</legend>
        {(["A", "B", "C"] as const).map((answer) => <label key={answer} className="em-choice em-choice-explain">
          <input type="radio" name="em-explanation" value={answer} checked={evidence.explanation === answer} onChange={() => explain(answer)} />
          <span className="em-letter">{answer}</span>
          <span>{t[answer.toLowerCase() as "a" | "b" | "c"]}</span>
        </label>)}
      </fieldset> : null}
      {phase.kind === "ready" && <p className="em-ready" role="status"><Check size={16} aria-hidden="true" /> {t.ready}</p>}
      {exploreUnlocked && <div className="em-explore" data-testid="em-explore">
        <button type="button" className="em-tool em-explore-toggle" aria-expanded={exploring} aria-controls="em-explore-controls" disabled={running} onClick={toggleExplore}>
          <Compass size={16} aria-hidden="true" /><span>{exploring ? t.explore.hide : t.explore.show}</span>
        </button>
        {active && <div id="em-explore-controls" className="em-explore-controls">
          <h4 className="em-explore-title">{t.explore.title}</h4>
          <p className="em-note">{t.explore.intro}</p>
          <fieldset className="em-segment" disabled={running}>
            <legend>{t.explore.pole}</legend>
            {(["N", "S"] as const).map((pole) => <label key={pole} className="em-segment-option">
              <input type="radio" name="em-explore-pole" checked={active.pole === pole} onChange={() => setExplore({ ...active, pole })} />
              <span>{pole}</span>
            </label>)}
          </fieldset>
          <fieldset className="em-segment" disabled={running}>
            <legend>{t.explore.circuit}</legend>
            {(["CLOSED", "OPEN"] as const).map((circuit) => <label key={circuit} className="em-segment-option">
              <input type="radio" name="em-explore-circuit" checked={active.circuit === circuit} onChange={() => setExplore({ ...active, circuit })} />
              <span>{circuit === "CLOSED" ? t.explore.closed : t.explore.open}</span>
            </label>)}
          </fieldset>
          <div className="em-explore-moves">
            <button type="button" className="em-tool" data-testid="em-explore-magnet" disabled={running} onClick={() => exploreMove("magnet")}>{active.position === "OUTSIDE" ? t.explore.push : t.explore.pull}</button>
            <button type="button" className="em-tool" data-testid="em-explore-hold" disabled={running} onClick={() => exploreMove("hold")}>{t.explore.hold}</button>
            <button type="button" className="em-tool" data-testid="em-explore-cw" disabled={running} onClick={() => exploreMove("cw")}>{t.explore.cw}</button>
            <button type="button" className="em-tool" data-testid="em-explore-ccw" disabled={running} onClick={() => exploreMove("ccw")}>{t.explore.ccw}</button>
          </div>
          <div className="em-observation" role="status" aria-live="polite" data-testid="em-explore-observation">
            <p>{exploreText()}</p>
            {!running && observation && exploreShown?.circuit === "CLOSED" && <Waveform observation={observation} />}
          </div>
        </div>}
      </div>}
      {showField && <p className="em-note">{t.fieldNote}</p>}
      <p className="em-note">{t.modelLimit}</p>
    </div>
  </section>;
}
