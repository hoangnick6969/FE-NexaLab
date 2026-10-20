import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, useAuth, type QuizAttemptHistoryResponse, type QuizAttemptRequest, type QuizAttemptResponse, type QuizAttemptSummary, type StudentQuiz } from "../../lib/api";
import { ErrorBox, InlineLoader } from "../../components/ui";
import { withAssignmentContext } from "../lessons/lesson-catalog";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    sendFailed: "Chưa gửi được bài kiểm tra",
    quiz: "Bài kiểm tra",
    loading: "Đang nạp bài kiểm tra trắc nghiệm…",
    unavailable: "Bài kiểm tra chưa khả dụng",
    reload: "Tải lại bài kiểm tra",
    knowledgeQuiz: "Bài kiểm tra kiến thức",
    passed: "Bạn đã vượt qua bài kiểm tra",
    passedBody: "Bước thực hành đã được mở sau khi máy chủ xác nhận kết quả.",
    notPassed: "Chưa đạt lần này. Bạn có thể thử lại.",
    notPassedBody: "Kết quả được lưu. Hãy xem lại câu hỏi rồi thử thêm một lượt.",
    instructions: "Chọn đáp án cho từng câu. Bạn có thể quay lại câu trước khi nộp.",
    reloadHistory: "Tải lại lịch sử",
    historyLabel: "Lịch sử làm bài",
    attempt: (n: number, correct: number, total: number, score: number) => `Lượt ${n} · ${correct}/${total} câu · ${score} điểm`,
    latest: " · Mới nhất",
    best: " · Điểm cao nhất",
    youChose: "Bạn chọn:",
    noAnswer: "Chưa có đáp án",
    right: "Đúng",
    wrong: "Chưa đúng",
    position: (n: number, total: number) => `Câu ${n} / ${total}`,
    previous: "Câu trước",
    next: "Câu tiếp theo",
    sending: "Đang gửi…",
    submitQuiz: "Nộp bài kiểm tra",
    waiting: "Đang chờ máy chủ xác nhận lượt làm bài…",
    unconfirmed: "Lượt làm bài chưa được xác nhận. Có thể gửi lại an toàn.",
    resend: "Gửi lại lượt này",
    retake: "Thử lại bài kiểm tra",
  },
  en: {
    sendFailed: "The quiz could not be sent",
    quiz: "Quiz",
    loading: "Loading the quiz…",
    unavailable: "The quiz is not available yet",
    reload: "Reload the quiz",
    knowledgeQuiz: "Knowledge quiz",
    passed: "You passed the quiz",
    passedBody: "The practice step opened once the server confirmed your result.",
    notPassed: "Not passed this time. You can try again.",
    notPassedBody: "Your result is saved. Review the questions and try once more.",
    instructions: "Choose an answer for each question. You can go back before submitting.",
    reloadHistory: "Reload history",
    historyLabel: "Attempt history",
    attempt: (n: number, correct: number, total: number, score: number) => `Attempt ${n} · ${correct}/${total} correct · ${score} points`,
    latest: " · Latest",
    best: " · Best score",
    youChose: "You chose:",
    noAnswer: "No answer",
    right: "Correct",
    wrong: "Not correct",
    position: (n: number, total: number) => `Question ${n} / ${total}`,
    previous: "Previous question",
    next: "Next question",
    sending: "Sending…",
    submitQuiz: "Submit the quiz",
    waiting: "Waiting for the server to confirm this attempt…",
    unconfirmed: "This attempt is not confirmed yet. It is safe to send it again.",
    resend: "Send this attempt again",
    retake: "Retake the quiz",
  },
});

type QuizDraft = {
  answers: Record<string, string>;
  pending: QuizAttemptRequest | null;
};

export function QuizLearningStep({
  lessonId,
  assignmentId,
  step,
  onReconciled,
}: {
  lessonId: string;
  assignmentId: string;
  step: any;
  onReconciled: (pathway: any) => void;
}) {
  const userId = useAuth((state) => state.user?.id ?? "student");
  const t = text();
  const queryClient = useQueryClient();
  const storageKey = `quiz-draft:${userId}:${lessonId}:${assignmentId}:${step.id}`;
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
    queryKey: ["student-quiz", lessonId, assignmentId],
    queryFn: () => api(withAssignmentContext(`/lessons/${lessonId}/quiz`, assignmentId)),
  });
  const historyQuery = useQuery<QuizAttemptHistoryResponse>({
    queryKey: ["student-quiz-attempts", lessonId, assignmentId],
    queryFn: () => api(withAssignmentContext(`/lessons/${lessonId}/quiz-attempts`, assignmentId)),
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
      const response = await api<QuizAttemptResponse>(withAssignmentContext(`/lessons/${lessonId}/quiz-attempts`, assignmentId), "POST", payload);
      setConfirmed(response.attempt);
      onReconciled(response.pathway);
      const cleared = { answers: {}, pending: null };
      persist(cleared);
      setIndex(0);
      await historyQuery.refetch();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t.sendFailed);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!draft.pending || !historyQuery.data?.attempts) return;
    const saved = historyQuery.data.attempts.find((attempt) => attempt.idempotencyKey === draft.pending?.idempotencyKey);
    if (!saved) return;
    persist({ answers: {}, pending: null });
    queryClient.invalidateQueries({ queryKey: ["lesson-pathway", lessonId, assignmentId] });
  }, [assignmentId, draft.pending, historyQuery.data, lessonId, queryClient]);

  if (quizQuery.isLoading) return <section className="quiz-learning" aria-label={t.quiz}><InlineLoader message={t.loading} /></section>;
  if (quizQuery.error || !quizQuery.data) return (
    <section className="quiz-learning" aria-label={t.quiz}>
      <ErrorBox error={quizQuery.error ?? new Error(t.unavailable)} />
      <button type="button" className="secondary" onClick={() => void quizQuery.refetch()}>{t.reload}</button>
    </section>
  );

  const attempts = historyQuery.data?.attempts ?? [];
  const latest = attempts.find((attempt) => attempt.latest);
  const passed = confirmed?.passed || attempts.some((attempt) => attempt.passed);
  return (
    <section className="quiz-learning" aria-label={t.knowledgeQuiz}>
      {passed ? (
        <div className="quiz-outcome" role="status">
          <h4>{t.passed}</h4>
          <p>{t.passedBody}</p>
        </div>
      ) : latest ? (
        <div className="quiz-outcome" role="status">
          <h4>{t.notPassed}</h4>
          <p>{t.notPassedBody}</p>
        </div>
      ) : (
        <p>{t.instructions}</p>
      )}

      {historyQuery.error && <div><ErrorBox error={historyQuery.error} /><button type="button" className="secondary" onClick={() => void historyQuery.refetch()}>{t.reloadHistory}</button></div>}
      {attempts.length > 0 && (
        <div className="quiz-history" aria-label={t.historyLabel}>
          <h5>{t.historyLabel}</h5>
          {attempts.map((attempt, attemptIndex) => (
            <details key={attempt.id} open={attempt.latest}>
              <summary>
                {t.attempt(attempts.length - attemptIndex, attempt.correctCount, attempt.questionCount, Math.round(attempt.score))}
                {attempt.latest && t.latest}{attempt.best && t.best}
              </summary>
              <ol>
                {attempt.results.map((result) => (
                  <li key={result.questionId}>
                    <b>{result.prompt}</b><br />
                    {t.youChose} {result.selectedOptionText || t.noAnswer} · {result.correct ? t.right : t.wrong}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}

      {!passed && question && !draft.pending && (
        <div className="quiz-question" aria-live="polite">
          <p className="quiz-position">{t.position(index + 1, questions.length)}</p>
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
            <button type="button" className="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>{t.previous}</button>
            {index < questions.length - 1 ? (
              <button type="button" className="primary" disabled={!draft.answers[question.id]} onClick={() => setIndex((value) => value + 1)}>{t.next}</button>
            ) : (
              <button type="button" className="primary" disabled={!allAnswered || submitting} onClick={() => void submit()}>{submitting ? t.sending : t.submitQuiz}</button>
            )}
          </div>
        </div>
      )}
      {draft.pending && !passed && (
        <div className="quiz-pending" role={submitError ? "alert" : "status"}>
          <span>{submitError || (submitting ? t.waiting : t.unconfirmed)}</span>
          <button type="button" className="secondary" disabled={submitting} onClick={() => void submit(true)}>{t.resend}</button>
        </div>
      )}
      {!passed && latest && !draft.pending && (
        <button type="button" className="primary" onClick={() => { persist({ answers: {}, pending: null }); setConfirmed(null); setIndex(0); }}>{t.retake}</button>
      )}
    </section>
  );
}
