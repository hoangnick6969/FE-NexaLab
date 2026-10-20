import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { idempotencyKey, mutate } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox } from "../../components/ui";
import { dateTime, submissionStatusLabel, testStatusLabel, testStatusTone, type StudentTestStatus, type TestState } from "../../lib/test-status";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    nextStep: { DUE_SOON: "Hạn nộp còn dưới 24 giờ. Hãy hoàn thành và nộp bài.", OVERDUE_UNSUBMITTED: "Đã quá hạn. Em vẫn có thể nộp bài kèm lý do nộp trễ; bài sẽ chờ giáo viên duyệt.", LATE_REVIEW_PENDING: "Bài nộp trễ đang chờ giáo viên duyệt. Điểm chưa được chốt.", REJECTED: "Giáo viên đã từ chối bài nộp trễ, kết quả hiện tại là 0 điểm." } as Partial<Record<string, string>>,
    eyebrow: "BÀI KIỂM TRA",
    dueAt: (date: string) => `Hạn nộp ${date}`,
    statusLabel: "Trạng thái bài kiểm tra",
    questionCount: (n: number) => `${n} câu trắc nghiệm · hạn nộp và kết quả do máy chủ xác định.`,
    extended: (date: string) => `Giáo viên đã dời hạn nộp cho cả nhóm. Hạn hiện tại: ${date}. Em có thể nộp lại trước hạn mới.`,
    currentResult: "Kết quả hiện tại:",
    points: (n: number) => `${n} điểm`,
    correct: (n: number, total: number) => `(${n}/${total} câu đúng)`,
    resubmit: "Làm và nộp lại",
    start: "Làm bài",
    takeTest: "Làm bài kiểm tra",
    question: (n: number) => `Câu ${n}.`,
    lateReason: "Lý do nộp trễ (bắt buộc)",
    submitting: "Đang nộp…",
    submit: "Nộp bài",
    cancel: "Hủy",
    timing: "Thời điểm nộp được tính theo giờ máy chủ khi nhận bài. Lần nộp mới nhất là kết quả hiện tại; các lần trước vẫn được lưu.",
    history: "Lịch sử nộp bài",
    currentSuffix: " · hiện tại",
    reason: "Lý do:",
  },
  en: {
    nextStep: { DUE_SOON: "Less than 24 hours left. Finish and submit.", OVERDUE_UNSUBMITTED: "The due date has passed. You can still submit with a reason; the teacher will review it.", LATE_REVIEW_PENDING: "Your late submission is waiting for the teacher. The score is not final yet.", REJECTED: "The teacher rejected the late submission; the current result is 0 points." },
    eyebrow: "TEST",
    dueAt: (date: string) => `Due ${date}`,
    statusLabel: "Test status",
    questionCount: (n: number) => `${n} multiple-choice ${n === 1 ? "question" : "questions"} · the server decides the due date and result.`,
    extended: (date: string) => `The teacher extended the due date for the group. Now due: ${date}. You can resubmit before then.`,
    currentResult: "Current result:",
    points: (n: number) => `${n} points`,
    correct: (n: number, total: number) => `(${n}/${total} correct)`,
    resubmit: "Retake and resubmit",
    start: "Start",
    takeTest: "Take the test",
    question: (n: number) => `Question ${n}.`,
    lateReason: "Reason for submitting late (required)",
    submitting: "Submitting…",
    submit: "Submit",
    cancel: "Cancel",
    timing: "Submission time is taken from the server clock when it arrives. The latest submission is the current result; earlier ones are kept.",
    history: "Submission history",
    currentSuffix: " · current",
    reason: "Reason:",
  },
});

/** Assigned class test (I3 / 3.2, 3.4): server deadline and status, submission, late reason and attempt history. */
export function AssignedTest({ assignment }: { assignment: any }) {
  const t = text();
  const queryClient = useQueryClient();
  const state: TestState = assignment.state;
  const questions: Array<{ id: string; prompt: string; options: Array<{ id: string; text: string }> }> = assignment.content.questions;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lateReason, setLateReason] = useState("");
  const [attempting, setAttempting] = useState(!state.current);
  const key = useRef<string | null>(null);
  const submit = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate(`/assignments/${assignment.id}/submissions`, "POST", {
        answers: questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] })),
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
  const allAnswered = questions.every((q) => answers[q.id]);
  const nextStep: Partial<Record<StudentTestStatus, string>> = t.nextStep;
  return (
    <div className="student-assigned-learning">
      <PageHeading eyebrow={t.eyebrow} title={assignment.title} description={`${assignment.classroom.name} · ${t.dueAt(dateTime(state.dueAt))}`} />
      <section className="panel lesson-content" aria-label={t.statusLabel}>
        <div className="section-heading">
          <h2>{assignment.content.title}</h2>
          <Badge tone={testStatusTone[state.status]}>{testStatusLabel[state.status]}</Badge>
        </div>
        <p>{t.questionCount(assignment.content.questionCount)}</p>
        {state.extended && <p className="notice" role="status">{t.extended(dateTime(state.dueAt))}</p>}
        {nextStep[state.status] && <p className="notice" role="status">{nextStep[state.status]}</p>}
        {state.current && state.current.score !== null && (
          <p><b>{t.currentResult}</b> {t.points(state.current.score)}{state.current.correctCount !== null ? ` ${t.correct(state.current.correctCount, state.current.questionCount)}` : ""}</p>
        )}
        {!attempting && (
          <button type="button" className="primary" onClick={() => { submit.reset(); setAttempting(true); }}>
            {state.current ? t.resubmit : t.start}
          </button>
        )}
      </section>
      {attempting && (
        <section className="panel quiz-learning" aria-label={t.takeTest}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (allAnswered && !submit.isPending) submit.mutate();
            }}
          >
            {questions.map((question, index) => (
              <div key={question.id} className="quiz-question">
                <fieldset>
                  <legend>{t.question(index + 1)} {question.prompt}</legend>
                  {question.options.map((option) => (
                    <label key={option.id} className="check">
                      <input type="radio" name={question.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} />
                      {option.text}
                    </label>
                  ))}
                </fieldset>
              </div>
            ))}
            {state.lateReasonRequired && (
              <label className="field">
                <span>{t.lateReason}</span>
                <textarea required maxLength={1000} value={lateReason} onChange={(event) => setLateReason(event.target.value)} />
              </label>
            )}
            <ErrorBox error={submit.error} />
            <div className="button-row">
              <button className="primary" disabled={!allAnswered || submit.isPending || (state.lateReasonRequired && !lateReason.trim())}>
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
                {item.score !== null && ` · ${t.points(item.score)}`}
                {item.lateReason && <small> · {t.reason} {item.lateReason}</small>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
