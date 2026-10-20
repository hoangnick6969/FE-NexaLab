import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type ActivityPage, type MyPracticalAttemptDetail, type MyProgressAssignment, type MyProgressStep, type MyQuizAttemptDetail } from "../../lib/api";
import { Badge, ErrorBox, verdictLabel } from "../../components/ui";
import { type SheetView, stateNames, stateTones, stepLink, stepNames, time, verdictTone } from "./progress-format";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    back: "← Quay lại",
    evidence: "Bằng chứng",
    close: "Đóng",
    completedAt: "Hoàn thành lúc",
    updatedAt: "Cập nhật gần nhất",
    startedAt: "Bắt đầu lúc",
    level: "Mức đã học",
    watchedTo: "Đã xem tới",
    seconds: (n: number) => `${n} giây`,
    cardsSeen: "Thẻ đã xem",
    latestAttempt: "Lần mới nhất",
    bestAttempt: "Lần cao nhất",
    latestResult: "Kết quả mới nhất",
    bestResult: "Kết quả tốt nhất",
    firstPassed: "Đạt lần đầu lúc",
    stepAttempts: "Các lần thử của bước này",
    loading: "Đang tải…",
    passed: "Đạt",
    notPassed: "Chưa đạt",
    unknown: "Không rõ",
    usedForState: "Dùng để tính trạng thái",
    details: "Xem chi tiết",
    openStep: "Mở bước học",
    notFound: "Không tìm thấy bản ghi",
    quizAttempt: (n: number, total: number) => `Bài kiểm tra · lần ${n}/${total}`,
    latest: "Mới nhất",
    best: "Cao nhất",
    time: "Thời gian",
    result: "Kết quả",
    scoringLabel: "Cách tính điểm",
    scoring: (correct: number, total: number, score: number, needed: number) => `${correct}/${total} câu đúng = ${score}% (cần từ ${needed}% để đạt)`,
    eachQuestion: "Từng câu hỏi",
    youChose: "Em chọn:",
    noAnswer: "Chưa có đáp án",
    right: "Đúng",
    wrong: "Chưa đúng",
    lessonGone: "Bài học gốc không còn khả dụng.",
    attempt: (n: number) => `lần thử ${n}`,
    officialResult: "Kết quả chính thức",
    objective: "Mục tiêu",
    current: "Dòng điện đo được",
    duration: "Thời lượng",
    hints: "Gợi ý đã dùng",
    levels: (list: string) => `Mức ${list}`,
    none: "Không",
    model: "Mô hình mô phỏng",
    version: (v: string | number) => `phiên bản ${v}`,
    legacy: "Bản ghi cũ: có thể thiếu liên kết tới bài được giao.",
    openPractice: "Mở bước thực hành",
    noStep: "Không có bước học gốc để mở.",
  },
  en: {
    back: "← Back",
    evidence: "Evidence",
    close: "Close",
    completedAt: "Completed at",
    updatedAt: "Last updated",
    startedAt: "Started at",
    level: "Progress",
    watchedTo: "Watched up to",
    seconds: (n: number) => `${n} s`,
    cardsSeen: "Cards seen",
    latestAttempt: "Latest attempt",
    bestAttempt: "Best attempt",
    latestResult: "Latest result",
    bestResult: "Best result",
    firstPassed: "First passed at",
    stepAttempts: "Attempts at this step",
    loading: "Loading…",
    passed: "Passed",
    notPassed: "Not passed",
    unknown: "Unknown",
    usedForState: "Used for the status",
    details: "See details",
    openStep: "Open the step",
    notFound: "Record not found",
    quizAttempt: (n: number, total: number) => `Quiz · attempt ${n}/${total}`,
    latest: "Latest",
    best: "Best",
    time: "Time",
    result: "Result",
    scoringLabel: "How it was scored",
    scoring: (correct: number, total: number, score: number, needed: number) => `${correct}/${total} correct = ${score}% (${needed}% needed to pass)`,
    eachQuestion: "Each question",
    youChose: "You chose:",
    noAnswer: "No answer",
    right: "Correct",
    wrong: "Not correct",
    lessonGone: "The original lesson is no longer available.",
    attempt: (n: number) => `attempt ${n}`,
    officialResult: "Official result",
    objective: "Objective",
    current: "Measured current",
    duration: "Duration",
    hints: "Hints used",
    levels: (list: string) => `Level ${list}`,
    none: "None",
    model: "Simulation model",
    version: (v: string | number) => `version ${v}`,
    legacy: "Older record: the link to the assignment may be missing.",
    openPractice: "Open the practice step",
    noStep: "There is no original step to open.",
  },
});
const t = text();

export function EvidenceSheet({ onClose, onBack, children }: { onClose: () => void; onBack?: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = ref.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="evidence-sheet-title" className="evidence-sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          {onBack && (
            <button type="button" className="secondary" onClick={onBack}>{t.back}</button>
          )}
          <h2 id="evidence-sheet-title">{t.evidence}</h2>
          <button type="button" className="icon-button" aria-label={t.close} onClick={onClose} data-autofocus>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function SheetContent({ view, push }: { view: SheetView; push: (view: SheetView) => void }) {
  if (view.kind === "quiz") return <QuizDetail id={view.id} />;
  if (view.kind === "practical") return <PracticalDetail id={view.id} />;
  return <StepDetail assignment={view.assignment} step={view.step} push={push} />;
}

function StepDetail({ assignment, step, push }: { assignment: MyProgressAssignment; step: MyProgressStep; push: (view: SheetView) => void }) {
  const kind = step.type === "QUIZ" ? "QUIZ" : step.type === "LAB" || step.type === "CHALLENGE" ? "PRACTICAL" : null;
  const attempts = useQuery<ActivityPage>({
    queryKey: ["me-activity-step", step.stepId],
    queryFn: () => api(`/me/activity?limit=50&kind=${kind}&stepId=${encodeURIComponent(step.stepId)}`),
    enabled: Boolean(kind),
  });
  const saved = step.stepProgress;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{assignment.title}</p>
      <h3>{stepNames[step.type]} · <Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge></h3>
      <dl className="evidence-facts">
        <dt>{t.completedAt}</dt><dd>{time(step.completedAt)}</dd>
        <dt>{t.updatedAt}</dt><dd>{time(step.updatedAt)}</dd>
        {saved && (
          <>
            <dt>{t.startedAt}</dt><dd>{time(saved.startedAt)}</dd>
            <dt>{t.level}</dt><dd>{saved.progressValue}%</dd>
            {step.type === "VIDEO" && saved.lastPosition !== null && (<><dt>{t.watchedTo}</dt><dd>{t.seconds(saved.lastPosition)}</dd></>)}
            {step.type === "STUDY_CARDS" && (<><dt>{t.cardsSeen}</dt><dd>{saved.visitedCards}</dd></>)}
          </>
        )}
        {step.quiz && (
          <>
            <dt>{t.latestAttempt}</dt><dd>{Math.round(step.quiz.latest.score)}% · {time(step.quiz.latest.createdAt)}</dd>
            <dt>{t.bestAttempt}</dt><dd>{Math.round(step.quiz.best.score)}% · {time(step.quiz.best.createdAt)}</dd>
          </>
        )}
        {step.practical && (
          <>
            <dt>{t.latestResult}</dt><dd>{verdictLabel(step.practical.latest.verdict)}</dd>
            <dt>{t.bestResult}</dt><dd>{verdictLabel(step.practical.best.verdict)}</dd>
            <dt>{t.firstPassed}</dt><dd>{time(step.practical.passedAt)}</dd>
          </>
        )}
      </dl>
      {kind && (
        <>
          <h4>{t.stepAttempts}</h4>
          <ErrorBox error={attempts.error} />
          {attempts.isPending ? (
            <p className="tiny muted">{t.loading}</p>
          ) : (
            <ul className="activity-list compact">
              {attempts.data?.items.map((item) => (
                <li className="activity-row" key={item.id}>
                  <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
                  {item.kind === "QUIZ" ? (
                    <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? t.passed : t.notPassed}</Badge>
                  ) : (
                    <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : t.unknown}</Badge>
                  )}
                  {item.id === step.evidenceId && <span className="tiny">{t.usedForState}</span>}
                  <button type="button" className="link-button" onClick={() => push(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id })}>
                    {t.details}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link className="secondary" to={stepLink(assignment.assignmentId, step.stepId)!}>{t.openStep}</Link>
    </div>
  );
}

function QuizDetail({ id }: { id: string }) {
  const q = useQuery<MyQuizAttemptDetail>({ queryKey: ["me-quiz-attempt", id], queryFn: () => api("/me/quiz-attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">{t.loading}</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? t.notFound} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle}</p>
      <h3>
        {t.quizAttempt(a.attemptNumber, a.totalAttempts)}{" "}
        {a.latest && <Badge tone="outline">{t.latest}</Badge>} {a.best && <Badge tone="gold">{t.best}</Badge>}
      </h3>
      <dl className="evidence-facts">
        <dt>{t.time}</dt><dd>{time(a.createdAt)}</dd>
        <dt>{t.result}</dt><dd><Badge tone={a.passed ? "passed" : "practice"}>{a.passed ? t.passed : t.notPassed}</Badge></dd>
        <dt>{t.scoringLabel}</dt><dd>{t.scoring(a.correctCount, a.questionCount, Math.round(a.score), a.passThreshold)}</dd>
      </dl>
      <h4>{t.eachQuestion}</h4>
      <ol className="question-results">
        {a.results.map((result) => (
          <li key={result.questionId}>
            <p>{result.prompt}</p>
            <p className="tiny">
              {t.youChose} {result.selectedOptionText || t.noAnswer} · <b>{result.correct ? t.right : t.wrong}</b>
            </p>
          </li>
        ))}
      </ol>
      {link ? <Link className="secondary" to={link}>{t.openStep}</Link> : <p className="tiny muted">{t.lessonGone}</p>}
    </div>
  );
}

function PracticalDetail({ id }: { id: string }) {
  const q = useQuery<MyPracticalAttemptDetail>({ queryKey: ["me-attempt", id], queryFn: () => api("/me/attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">{t.loading}</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? t.notFound} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle ?? a.labTitle}</p>
      <h3>{a.labTitle} · {t.attempt(a.attemptNumber)}</h3>
      <dl className="evidence-facts">
        <dt>{t.time}</dt><dd>{time(a.createdAt)}</dd>
        <dt>{t.officialResult}</dt><dd><Badge tone={verdictTone(a.verdict)}>{a.verdict ? verdictLabel(a.verdict) : t.unknown}</Badge></dd>
        <dt>{t.objective}</dt><dd>{a.challengeObjective}</dd>
        {a.outcome.currentMa !== null && (<><dt>{t.current}</dt><dd>{a.outcome.currentMa} mA</dd></>)}
        <dt>{t.duration}</dt><dd>{t.seconds(Math.round(a.durationMs / 1000))}</dd>
        <dt>{t.hints}</dt><dd>{a.hintLevels.length ? t.levels(a.hintLevels.join(", ")) : t.none}</dd>
        <dt>{t.model}</dt><dd>{t.version(a.simulationModelVersion)}</dd>
      </dl>
      {a.retryGuidance && <p className="notice">{a.retryGuidance}</p>}
      {a.legacy && <p className="tiny muted">{t.legacy}</p>}
      {link ? <Link className="secondary" to={link}>{t.openPractice}</Link> : <p className="tiny muted">{t.noStep}</p>}
    </div>
  );
}
