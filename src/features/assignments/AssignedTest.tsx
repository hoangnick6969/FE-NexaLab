import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { idempotencyKey, mutate } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox } from "../../components/ui";
import { dateTime, submissionStatusLabel, testStatusLabel, testStatusTone, type StudentTestStatus, type TestState } from "../../lib/test-status";

/** Assigned class test (I3 / 3.2, 3.4): server deadline and status, submission, late reason and attempt history. */
export function AssignedTest({ assignment }: { assignment: any }) {
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
  const nextStep: Partial<Record<StudentTestStatus, string>> = {
    DUE_SOON: "Hạn nộp còn dưới 24 giờ. Hãy hoàn thành và nộp bài.",
    OVERDUE_UNSUBMITTED: "Đã quá hạn. Em vẫn có thể nộp bài kèm lý do nộp trễ; bài sẽ chờ giáo viên duyệt.",
    LATE_REVIEW_PENDING: "Bài nộp trễ đang chờ giáo viên duyệt. Điểm chưa được chốt.",
    REJECTED: "Giáo viên đã từ chối bài nộp trễ, kết quả hiện tại là 0 điểm.",
  };
  return (
    <div className="student-assigned-learning">
      <PageHeading eyebrow="BÀI KIỂM TRA" title={assignment.title} description={`${assignment.classroom.name} · Hạn nộp ${dateTime(state.dueAt)}`} />
      <section className="panel lesson-content" aria-label="Trạng thái bài kiểm tra">
        <div className="section-heading">
          <h2>{assignment.content.title}</h2>
          <Badge tone={testStatusTone[state.status]}>{testStatusLabel[state.status]}</Badge>
        </div>
        <p>{assignment.content.questionCount} câu trắc nghiệm · hạn nộp và kết quả do máy chủ xác định.</p>
        {state.extended && <p className="notice" role="status">Giáo viên đã dời hạn nộp cho cả nhóm. Hạn hiện tại: {dateTime(state.dueAt)}. Em có thể nộp lại trước hạn mới.</p>}
        {nextStep[state.status] && <p className="notice" role="status">{nextStep[state.status]}</p>}
        {state.current && state.current.score !== null && (
          <p><b>Kết quả hiện tại:</b> {state.current.score} điểm{state.current.correctCount !== null ? ` (${state.current.correctCount}/${state.current.questionCount} câu đúng)` : ""}</p>
        )}
        {!attempting && (
          <button type="button" className="primary" onClick={() => { submit.reset(); setAttempting(true); }}>
            {state.current ? "Làm và nộp lại" : "Làm bài"}
          </button>
        )}
      </section>
      {attempting && (
        <section className="panel quiz-learning" aria-label="Làm bài kiểm tra">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (allAnswered && !submit.isPending) submit.mutate();
            }}
          >
            {questions.map((question, index) => (
              <div key={question.id} className="quiz-question">
                <fieldset>
                  <legend>Câu {index + 1}. {question.prompt}</legend>
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
                <span>Lý do nộp trễ (bắt buộc)</span>
                <textarea required maxLength={1000} value={lateReason} onChange={(event) => setLateReason(event.target.value)} />
              </label>
            )}
            <ErrorBox error={submit.error} />
            <div className="button-row">
              <button className="primary" disabled={!allAnswered || submit.isPending || (state.lateReasonRequired && !lateReason.trim())}>
                {submit.isPending ? "Đang nộp…" : "Nộp bài"}
              </button>
              {state.current && <button type="button" className="secondary" onClick={() => setAttempting(false)}>Hủy</button>}
            </div>
            <p className="tiny muted">Thời điểm nộp được tính theo giờ máy chủ khi nhận bài. Lần nộp mới nhất là kết quả hiện tại; các lần trước vẫn được lưu.</p>
          </form>
        </section>
      )}
      {state.history.length > 0 && (
        <section className="panel" aria-label="Lịch sử nộp bài">
          <h3>Lịch sử nộp bài</h3>
          <ol className="student-list">
            {state.history.map((item, index) => (
              <li key={item.id}>
                <b>{dateTime(item.submittedAt)}</b>
                {index === 0 && " · hiện tại"} · {submissionStatusLabel[item.status]}
                {item.score !== null && ` · ${item.score} điểm`}
                {item.lateReason && <small> · Lý do: {item.lateReason}</small>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
