import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type ActivityPage, type MyPracticalAttemptDetail, type MyProgressAssignment, type MyProgressStep, type MyQuizAttemptDetail } from "../../lib/api";
import { Badge, ErrorBox, verdictLabel } from "../../components/ui";
import { type SheetView, stateNames, stateTones, stepLink, stepNames, time, verdictTone } from "./progress-format";

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
            <button type="button" className="secondary" onClick={onBack}>← Quay lại</button>
          )}
          <h2 id="evidence-sheet-title">Bằng chứng</h2>
          <button type="button" className="icon-button" aria-label="Đóng" onClick={onClose} data-autofocus>×</button>
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
        <dt>Hoàn thành lúc</dt><dd>{time(step.completedAt)}</dd>
        <dt>Cập nhật gần nhất</dt><dd>{time(step.updatedAt)}</dd>
        {saved && (
          <>
            <dt>Bắt đầu lúc</dt><dd>{time(saved.startedAt)}</dd>
            <dt>Mức đã học</dt><dd>{saved.progressValue}%</dd>
            {step.type === "VIDEO" && saved.lastPosition !== null && (<><dt>Đã xem tới</dt><dd>{saved.lastPosition} giây</dd></>)}
            {step.type === "STUDY_CARDS" && (<><dt>Thẻ đã xem</dt><dd>{saved.visitedCards}</dd></>)}
          </>
        )}
        {step.quiz && (
          <>
            <dt>Lần mới nhất</dt><dd>{Math.round(step.quiz.latest.score)}% · {time(step.quiz.latest.createdAt)}</dd>
            <dt>Lần cao nhất</dt><dd>{Math.round(step.quiz.best.score)}% · {time(step.quiz.best.createdAt)}</dd>
          </>
        )}
        {step.practical && (
          <>
            <dt>Kết quả mới nhất</dt><dd>{verdictLabel(step.practical.latest.verdict)}</dd>
            <dt>Kết quả tốt nhất</dt><dd>{verdictLabel(step.practical.best.verdict)}</dd>
            <dt>Đạt lần đầu lúc</dt><dd>{time(step.practical.passedAt)}</dd>
          </>
        )}
      </dl>
      {kind && (
        <>
          <h4>Các lần thử của bước này</h4>
          <ErrorBox error={attempts.error} />
          {attempts.isPending ? (
            <p className="tiny muted">Đang tải…</p>
          ) : (
            <ul className="activity-list compact">
              {attempts.data?.items.map((item) => (
                <li className="activity-row" key={item.id}>
                  <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
                  {item.kind === "QUIZ" ? (
                    <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? "Đạt" : "Chưa đạt"}</Badge>
                  ) : (
                    <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : "Không rõ"}</Badge>
                  )}
                  {item.id === step.evidenceId && <span className="tiny">Dùng để tính trạng thái</span>}
                  <button type="button" className="link-button" onClick={() => push(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id })}>
                    Xem chi tiết
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link className="secondary" to={stepLink(assignment.assignmentId, step.stepId)!}>Mở bước học</Link>
    </div>
  );
}

function QuizDetail({ id }: { id: string }) {
  const q = useQuery<MyQuizAttemptDetail>({ queryKey: ["me-quiz-attempt", id], queryFn: () => api("/me/quiz-attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">Đang tải…</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Không tìm thấy bản ghi"} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle}</p>
      <h3>
        Bài kiểm tra · lần {a.attemptNumber}/{a.totalAttempts}{" "}
        {a.latest && <Badge tone="outline">Mới nhất</Badge>} {a.best && <Badge tone="gold">Cao nhất</Badge>}
      </h3>
      <dl className="evidence-facts">
        <dt>Thời gian</dt><dd>{time(a.createdAt)}</dd>
        <dt>Kết quả</dt><dd><Badge tone={a.passed ? "passed" : "practice"}>{a.passed ? "Đạt" : "Chưa đạt"}</Badge></dd>
        <dt>Cách tính điểm</dt><dd>{a.correctCount}/{a.questionCount} câu đúng = {Math.round(a.score)}% (cần từ {a.passThreshold}% để đạt)</dd>
      </dl>
      <h4>Từng câu hỏi</h4>
      <ol className="question-results">
        {a.results.map((result) => (
          <li key={result.questionId}>
            <p>{result.prompt}</p>
            <p className="tiny">
              Em chọn: {result.selectedOptionText || "Chưa có đáp án"} · <b>{result.correct ? "Đúng" : "Chưa đúng"}</b>
            </p>
          </li>
        ))}
      </ol>
      {link ? <Link className="secondary" to={link}>Mở bước học</Link> : <p className="tiny muted">Bài học gốc không còn khả dụng.</p>}
    </div>
  );
}

function PracticalDetail({ id }: { id: string }) {
  const q = useQuery<MyPracticalAttemptDetail>({ queryKey: ["me-attempt", id], queryFn: () => api("/me/attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">Đang tải…</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Không tìm thấy bản ghi"} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle ?? a.labTitle}</p>
      <h3>{a.labTitle} · lần thử {a.attemptNumber}</h3>
      <dl className="evidence-facts">
        <dt>Thời gian</dt><dd>{time(a.createdAt)}</dd>
        <dt>Kết quả chính thức</dt><dd><Badge tone={verdictTone(a.verdict)}>{a.verdict ? verdictLabel(a.verdict) : "Không rõ"}</Badge></dd>
        <dt>Mục tiêu</dt><dd>{a.challengeObjective}</dd>
        {a.outcome.currentMa !== null && (<><dt>Dòng điện đo được</dt><dd>{a.outcome.currentMa} mA</dd></>)}
        <dt>Thời lượng</dt><dd>{Math.round(a.durationMs / 1000)} giây</dd>
        <dt>Gợi ý đã dùng</dt><dd>{a.hintLevels.length ? "Mức " + a.hintLevels.join(", ") : "Không"}</dd>
        <dt>Mô hình mô phỏng</dt><dd>phiên bản {a.simulationModelVersion}</dd>
      </dl>
      {a.retryGuidance && <p className="notice">{a.retryGuidance}</p>}
      {a.legacy && <p className="tiny muted">Bản ghi cũ: có thể thiếu liên kết tới bài được giao.</p>}
      {link ? <Link className="secondary" to={link}>Mở bước thực hành</Link> : <p className="tiny muted">Không có bước học gốc để mở.</p>}
    </div>
  );
}
