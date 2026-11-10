import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { idempotencyKey, mutate } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox } from "../../components/ui";
import { dateTime, submissionStatusLabel, testStatusLabel, testStatusTone, type StudentTestStatus, type TestState } from "../../lib/test-status";
import { defineText } from "../../i18n";

/** Same rule as the server: trim, NFC, then count Unicode code points (TAI2-T2 decision). */
export const writtenLength = (text: string) => [...text.trim().normalize("NFC")].length;

const text = defineText({
  vi: {
    eyebrow: "BÀI TỰ LUẬN",
    dueAt: (date: string) => `Hạn nộp ${date}`,
    statusLabel: "Trạng thái bài tự luận",
    promptCount: (n: number) => `${n} câu · giáo viên chấm theo biểu điểm. Hạn nộp do máy chủ xác định.`,
    extended: (date: string) => `Giáo viên đã dời hạn nộp cho cả nhóm. Hạn hiện tại: ${date}.`,
    awaiting: "Bài của em đã nộp và đang chờ giáo viên chấm. Chưa có điểm.",
    gradeTitle: "Kết quả chấm",
    scoreOf: (n: number) => `${n}/100 điểm`,
    criterionLine: (description: string, points: number, max: number | null) => `${description}: ${points}${max === null ? "" : `/${max}`} điểm`,
    feedbackTitle: "Nhận xét của giáo viên",
    rubric: "Biểu điểm (tiêu chí và điểm tối đa)",
    maxPoints: (n: number) => `tối đa ${n} điểm`,
    answerLabel: (n: number) => `Câu ${n}`,
    counter: (n: number, max: number) => `${n}/${max} ký tự`,
    overLimit: "Câu trả lời vượt quá số ký tự cho phép.",
    lateReason: "Lý do nộp trễ (bắt buộc)",
    submitting: "Đang nộp…",
    submit: "Nộp bài",
    resubmit: "Sửa và nộp lại",
    start: "Viết bài",
    cancel: "Hủy",
    timing: "Thời điểm nộp được tính theo giờ máy chủ khi nhận bài. Lần nộp mới nhất là bài hiện tại; các lần trước vẫn được lưu.",
    history: "Lịch sử nộp bài",
    currentSuffix: " · hiện tại",
    reason: "Lý do:",
    yourAnswer: "Câu trả lời của em",
    nextStep: { DUE_SOON: "Hạn nộp còn dưới 24 giờ. Hãy hoàn thành và nộp bài.", OVERDUE_UNSUBMITTED: "Đã quá hạn. Em vẫn có thể nộp bài kèm lý do nộp trễ; bài sẽ chờ giáo viên duyệt.", LATE_REVIEW_PENDING: "Bài nộp trễ đang chờ giáo viên duyệt. Chưa có điểm.", REJECTED: "Giáo viên đã từ chối bài nộp trễ; bài được tính 0 điểm." } as Partial<Record<string, string>>,
  },
  en: {
    eyebrow: "WRITTEN TASK",
    dueAt: (date: string) => `Due ${date}`,
    statusLabel: "Written task status",
    promptCount: (n: number) => `${n} ${n === 1 ? "question" : "questions"} · the teacher grades with a rubric. The server decides the due date.`,
    extended: (date: string) => `The teacher extended the due date for the group. Now due: ${date}.`,
    awaiting: "Your work is submitted and waiting for the teacher to grade it. No score yet.",
    gradeTitle: "Grade",
    scoreOf: (n: number) => `${n}/100 points`,
    criterionLine: (description: string, points: number, max: number | null) => `${description}: ${points}${max === null ? "" : `/${max}`} points`,
    feedbackTitle: "Teacher's comment",
    rubric: "Rubric (criteria and maximum points)",
    maxPoints: (n: number) => `up to ${n} points`,
    answerLabel: (n: number) => `Question ${n}`,
    counter: (n: number, max: number) => `${n}/${max} characters`,
    overLimit: "This answer is longer than the allowed length.",
    lateReason: "Reason for submitting late (required)",
    submitting: "Submitting…",
    submit: "Submit",
    resubmit: "Edit and resubmit",
    start: "Write answers",
    cancel: "Cancel",
    timing: "Submission time is taken from the server clock when it arrives. The latest submission is current; earlier ones are kept.",
    history: "Submission history",
    currentSuffix: " · current",
    reason: "Reason:",
    yourAnswer: "Your answers",
    nextStep: { DUE_SOON: "Less than 24 hours left. Finish and submit.", OVERDUE_UNSUBMITTED: "The due date has passed. You can still submit with a reason; the teacher will review it.", LATE_REVIEW_PENDING: "Your late submission is waiting for the teacher. No score yet.", REJECTED: "The teacher rejected the late submission; it counts as 0 points." } as Partial<Record<string, string>>,
  },
});

type Prompt = { id: string; prompt: string; maxChars: number; criteria: Array<{ code: string; description: string; maxPoints: number }> };

/**
 * Assigned written task (TAI2-T2): one answer per prompt, a character counter per prompt, the late-reason form,
 * and the server status. A written submission has no score until the teacher grades it (TAI2-T3).
 */
export function AssignedWritten({ assignment }: { assignment: any }) {
  const t = text();
  const queryClient = useQueryClient();
  const state: TestState = assignment.state;
  const prompts: Prompt[] = assignment.content.prompts;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lateReason, setLateReason] = useState("");
  const [attempting, setAttempting] = useState(!state.current);
  const key = useRef<string | null>(null);
  const submit = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate(`/assignments/${assignment.id}/submissions`, "POST", {
        responses: prompts.map((p) => ({ promptId: p.id, text: answers[p.id] ?? "" })),
        ...(state.lateReasonRequired || lateReason.trim() ? { lateReason: lateReason.trim() } : {}),
      }, key.current);
    },
    onSuccess: () => {
      key.current = null;
      setAnswers({});
      setLateReason("");
      setAttempting(false);
      void queryClient.invalidateQueries({ queryKey: ["assignment", assignment.id] });
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
  const allFilled = prompts.every((p) => writtenLength(answers[p.id] ?? "") >= 1 && writtenLength(answers[p.id] ?? "") <= p.maxChars);
  const nextStep: Partial<Record<StudentTestStatus, string>> = t.nextStep;
  const status = state.status as StudentTestStatus;
  return (
    <div className="student-assigned-learning">
      <PageHeading eyebrow={t.eyebrow} title={assignment.title} description={`${assignment.classroom.name} · ${t.dueAt(dateTime(state.dueAt))}`} />
      <section className="panel lesson-content" aria-label={t.statusLabel}>
        <div className="section-heading">
          <h2>{assignment.content.title}</h2>
          <Badge tone={testStatusTone[status] ?? "outline"}>{testStatusLabel[status] ?? status}</Badge>
        </div>
        <p>{t.promptCount(prompts.length)}</p>
        {state.extended && <p className="notice" role="status">{t.extended(dateTime(state.dueAt))}</p>}
        {nextStep[status] && <p className="notice" role="status">{nextStep[status]}</p>}
        {state.current?.status === "AWAITING_GRADE" && <p className="notice" role="status">{t.awaiting}</p>}
        {state.current?.grade && (
          <section className="written-grade" aria-label={t.gradeTitle}>
            <h3>{t.gradeTitle}</h3>
            <p><b>{t.scoreOf(state.current.grade.score)}</b></p>
            <ul>
              {state.current.grade.criteria.map((c) => (
                <li key={`${c.promptId}-${c.code}`}>{t.criterionLine(c.description, c.points, c.maxPoints)}</li>
              ))}
            </ul>
            {state.current.grade.feedback && (
              <p><b>{t.feedbackTitle}</b> {state.current.grade.feedback}</p>
            )}
          </section>
        )}
        <details>
          <summary>{t.rubric}</summary>
          <ul className="written-task-view">
            {prompts.map((p, index) => (
              <li key={p.id}>
                <b>{t.answerLabel(index + 1)}.</b> {p.prompt}
                <ul>
                  {p.criteria.map((c) => (
                    <li key={c.code}>{c.description} · {t.maxPoints(c.maxPoints)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
        {!attempting && (
          <button type="button" className="primary" onClick={() => { submit.reset(); setAttempting(true); }}>
            {state.current ? t.resubmit : t.start}
          </button>
        )}
      </section>
      {attempting && (
        <section className="panel quiz-learning" aria-label={t.yourAnswer}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (allFilled && !submit.isPending && (!state.lateReasonRequired || lateReason.trim())) submit.mutate();
            }}
          >
            {prompts.map((p, index) => {
              const length = writtenLength(answers[p.id] ?? "");
              const over = length > p.maxChars;
              return (
                <div key={p.id} className="quiz-question">
                  <label className="field">
                    <span><b>{t.answerLabel(index + 1)}.</b> {p.prompt}</span>
                    <textarea
                      rows={5}
                      value={answers[p.id] ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [p.id]: event.target.value })}
                      aria-invalid={over || undefined}
                    />
                  </label>
                  <small className={over ? "field-error" : "tiny muted"} aria-live="polite">
                    {t.counter(length, p.maxChars)}{over ? ` · ${t.overLimit}` : ""}
                  </small>
                </div>
              );
            })}
            {state.lateReasonRequired && (
              <label className="field">
                <span>{t.lateReason}</span>
                <textarea required maxLength={1000} value={lateReason} onChange={(event) => setLateReason(event.target.value)} />
              </label>
            )}
            <ErrorBox error={submit.error} />
            <div className="button-row">
              <button className="primary" disabled={!allFilled || submit.isPending || (state.lateReasonRequired && !lateReason.trim())}>
                {submit.isPending ? t.submitting : t.submit}
              </button>
              {state.current && <button type="button" className="secondary" onClick={() => setAttempting(false)}>{t.cancel}</button>}
            </div>
            <p className="tiny muted">{t.timing}</p>
          </form>
        </section>
      )}
      {state.history.length > 0 && (
        <section className="panel" aria-label={t.history}>
          <h3>{t.history}</h3>
          <ol className="student-list">
            {state.history.map((item, index) => (
              <li key={item.id}>
                <b>{dateTime(item.submittedAt)}</b>
                {index === 0 && t.currentSuffix} · {submissionStatusLabel[item.status]}
                {item.lateReason && <small> · {t.reason} {item.lateReason}</small>}
                {(item as any).responses && (
                  <ul>
                    {(item as any).responses.map((r: { promptId: string; text: string }) => (
                      <li key={r.promptId}><small>{r.text}</small></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
