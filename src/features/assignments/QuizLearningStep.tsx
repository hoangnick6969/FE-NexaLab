import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, useAuth, type QuizAttemptHistoryResponse, type QuizAttemptRequest, type QuizAttemptResponse, type QuizAttemptSummary, type StudentQuiz } from "../../lib/api";
import { ErrorBox, InlineLoader } from "../../components/ui";

type QuizDraft = {
  answers: Record<string, string>;
  pending: QuizAttemptRequest | null;
};

export function QuizLearningStep({
  lessonId,
  step,
  onReconciled,
}: {
  lessonId: string;
  step: any;
  onReconciled: (pathway: any) => void;
}) {
  const userId = useAuth((state) => state.user?.id ?? "student");
  const queryClient = useQueryClient();
  const storageKey = `quiz-draft:${userId}:${lessonId}:${step.id}`;
  const [draft, setDraft] = useState<QuizDraft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      return { answers: saved?.answers ?? {}, pending: saved?.pending ?? null };
    } catch {
      return { answers: {}, pending: null };
    }
  });
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<QuizAttemptSummary | null>(null);
  const quizQuery = useQuery<StudentQuiz>({
    queryKey: ["student-quiz", lessonId],
    queryFn: () => api(`/lessons/${lessonId}/quiz`),
  });
  const historyQuery = useQuery<QuizAttemptHistoryResponse>({
    queryKey: ["student-quiz-attempts", lessonId],
    queryFn: () => api(`/lessons/${lessonId}/quiz-attempts`),
  });
  const questions = quizQuery.data?.questions ?? [];
  const question = questions[index];
  const allAnswered = questions.length > 0 && questions.every((item) => draft.answers[item.id]);
  const persist = (next: QuizDraft) => {
    setDraft(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep this session usable when storage is unavailable. */ }
  };
  const submit = async (retry = false) => {
    if (submitting || (!retry && !allAnswered)) return;
    const payload = retry && draft.pending
      ? draft.pending
      : draft.pending ?? {
          idempotencyKey: crypto.randomUUID(),
          answers: questions.map((item) => ({ questionId: item.id, optionId: draft.answers[item.id] })),
        };
    if (!draft.pending) persist({ ...draft, pending: payload });
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await api<QuizAttemptResponse>(`/lessons/${lessonId}/quiz-attempts`, "POST", payload);
      setConfirmed(response.attempt);
      onReconciled(response.pathway);
      const cleared = { answers: {}, pending: null };
      persist(cleared);
      setIndex(0);
      await historyQuery.refetch();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Chưa gửi được bài kiểm tra");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!draft.pending || !historyQuery.data?.attempts) return;
    const saved = historyQuery.data.attempts.find((attempt) => attempt.idempotencyKey === draft.pending?.idempotencyKey);
    if (!saved) return;
    persist({ answers: {}, pending: null });
    queryClient.invalidateQueries({ queryKey: ["lesson-pathway", lessonId] });
  }, [draft.pending, historyQuery.data, lessonId, queryClient]);

  if (quizQuery.isLoading) return <section className="quiz-learning" aria-label="Bài kiểm tra"><InlineLoader message="Đang nạp bài kiểm tra trắc nghiệm…" /></section>;
  if (quizQuery.error || !quizQuery.data) return (
    <section className="quiz-learning" aria-label="Bài kiểm tra">
      <ErrorBox error={quizQuery.error ?? new Error("Bài kiểm tra chưa khả dụng")} />
      <button type="button" className="secondary" onClick={() => void quizQuery.refetch()}>Tải lại bài kiểm tra</button>
    </section>
  );

  const attempts = historyQuery.data?.attempts ?? [];
  const latest = attempts.find((attempt) => attempt.latest);
  const passed = confirmed?.passed || attempts.some((attempt) => attempt.passed);
  return (
    <section className="quiz-learning" aria-label="Bài kiểm tra kiến thức">
      {passed ? (
        <div className="quiz-outcome" role="status">
          <h4>Bạn đã vượt qua bài kiểm tra</h4>
          <p>Bước thực hành đã được mở sau khi máy chủ xác nhận kết quả.</p>
        </div>
      ) : latest ? (
        <div className="quiz-outcome" role="status">
          <h4>Chưa đạt lần này. Bạn có thể thử lại.</h4>
          <p>Kết quả được lưu. Hãy xem lại câu hỏi rồi thử thêm một lượt.</p>
        </div>
      ) : (
        <p>Chọn đáp án cho từng câu. Bạn có thể quay lại câu trước khi nộp.</p>
      )}

      {historyQuery.error && <div><ErrorBox error={historyQuery.error} /><button type="button" className="secondary" onClick={() => void historyQuery.refetch()}>Tải lại lịch sử</button></div>}
      {attempts.length > 0 && (
        <div className="quiz-history" aria-label="Lịch sử làm bài">
          <h5>Lịch sử làm bài</h5>
          {attempts.map((attempt, attemptIndex) => (
            <details key={attempt.id} open={attempt.latest}>
              <summary>
                Lượt {attempts.length - attemptIndex} · {attempt.correctCount}/{attempt.questionCount} câu · {Math.round(attempt.score)} điểm
                {attempt.latest && " · Mới nhất"}{attempt.best && " · Điểm cao nhất"}
              </summary>
              <ol>
                {attempt.results.map((result) => (
                  <li key={result.questionId}>
                    <b>{result.prompt}</b><br />
                    Bạn chọn: {result.selectedOptionText || "Chưa có đáp án"} · {result.correct ? "Đúng" : "Chưa đúng"}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}

      {!passed && question && !draft.pending && (
        <div className="quiz-question" aria-live="polite">
          <p className="quiz-position">Câu {index + 1} / {questions.length}</p>
          <fieldset>
            <legend>{question.prompt}</legend>
            {question.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input
                  type="radio"
                  name={`quiz-${step.id}-${question.id}`}
                  value={option.id}
                  checked={draft.answers[question.id] === option.id}
                  onChange={() => persist({ ...draft, answers: { ...draft.answers, [question.id]: option.id } })}
                />
                {option.text}
              </label>
            ))}
          </fieldset>
          <div className="quiz-actions">
            <button type="button" className="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Câu trước</button>
            {index < questions.length - 1 ? (
              <button type="button" className="primary" disabled={!draft.answers[question.id]} onClick={() => setIndex((value) => value + 1)}>Câu tiếp theo</button>
            ) : (
              <button type="button" className="primary" disabled={!allAnswered || submitting} onClick={() => void submit()}>{submitting ? "Đang gửi…" : "Nộp bài kiểm tra"}</button>
            )}
          </div>
        </div>
      )}
      {draft.pending && !passed && (
        <div className="quiz-pending" role={submitError ? "alert" : "status"}>
          <span>{submitError || (submitting ? "Đang chờ máy chủ xác nhận lượt làm bài…" : "Lượt làm bài chưa được xác nhận. Có thể gửi lại an toàn.")}</span>
          <button type="button" className="secondary" disabled={submitting} onClick={() => void submit(true)}>Gửi lại lượt này</button>
        </div>
      )}
      {!passed && latest && !draft.pending && (
        <button type="button" className="primary" onClick={() => { persist({ answers: {}, pending: null }); setConfirmed(null); setIndex(0); }}>Thử lại bài kiểm tra</button>
      )}
    </section>
  );
}
