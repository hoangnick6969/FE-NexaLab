import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, idempotencyKey, useAuth, type QuizAttemptHistoryResponse, type QuizAttemptRequest, type QuizAttemptResponse, type QuizAttemptSummary, type StudentPathway, type StudentQuiz } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader, InlineLoader } from "../../components/ui";
import { PracticalPathwayStep } from "../labs/PracticalPathwayStep";
import { AttributionNote } from "../lessons/library";

type QuizDraft = {
  answers: Record<string, string>;
  pending: QuizAttemptRequest | null;
};
function QuizLearningStep({
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
export function AssignedLearning() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => api("/assignments/" + id),
    enabled: Boolean(id),
  });
  const lessonId = query.data?.contentType === "lesson" ? query.data.content.id : null;
  const pathwayQuery = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", lessonId],
    queryFn: () => api("/lessons/" + lessonId + "/pathway"),
    enabled: Boolean(lessonId),
  });
  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, query.data, pathwayQuery.data]);
  if (query.isLoading) return <PageLoader message="Đang nạp bài tập…" caption="NexaLab · Phòng thí nghiệm mô phỏng" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  const assignment = query.data;
  const content = assignment.content;
  if (assignment.contentType === "lesson" && pathwayQuery.isLoading)
    return <PageLoader message="Đang nạp lộ trình bài học…" caption="NexaLab · Khoa học tự nhiên" />;
  if (assignment.contentType === "lesson" && pathwayQuery.error)
    return <div><ErrorBox error={pathwayQuery.error} /><button onClick={() => pathwayQuery.refetch()}>Thử lại</button></div>;
  const pathway = pathwayQuery.data;
  const lesson = pathway?.lesson ?? content;
  const stepNames: Record<string, string> = {
    QUIZ: "Kiểm tra kiến thức",
    LAB: "Thực hành trong phòng lab",
    CHALLENGE: "Hoàn thành thử thách",
  };
  const stateNames: Record<string, string> = {
    COMPLETED: "Đã hoàn thành",
    IN_PROGRESS: "Đang học",
    LOCKED: "Đã khóa",
  };
  const continueNames: Record<string, string> = {
    QUIZ: "Bắt đầu kiểm tra",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Hoàn thành thử thách",
  };
  const lockReasons: Record<string, string> = {
    PREREQUISITE_INCOMPLETE: "Hoàn thành bước trước để tiếp tục.",
    QUIZ_NOT_PASSED: "Vượt qua bài kiểm tra để mở khóa bước này.",
    PRACTICE_NOT_PASSED: "Hoàn thành phần thực hành để mở khóa thử thách.",
  };
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  return (
    <div className="student-assigned-learning">
      <PageHeading
        eyebrow="BÀI TẬP"
        title={lesson.title}
        description={`${assignment.classroom.name} · ${assignment.dueDate ? `Hạn ${new Date(assignment.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}`}
      />
      <section className="panel lesson-content">
        <p className="eyebrow">
          {lesson.subject?.name} · LỚP {lesson.grade ?? lesson.subject?.grade}
        </p>
        <h2>{lesson.topic}</h2>
        <div className="notice">
          <b>Mục tiêu học tập:</b> {lesson.learningObjective}
          <br />
          <b>Kiến thức nền:</b> {lesson.prerequisites || "Không yêu cầu"}
        </div>
        {assignment.overdue && <Badge tone="outline">Đã quá hạn nhưng vẫn có thể học</Badge>}
        {pathway?.contentArchived && (
          <p className="notice" role="status">Nội dung này không còn được cập nhật. Em vẫn có thể học tiếp phần đã bắt đầu.</p>
        )}
        <AttributionNote value={pathway?.attribution} />
        {assignment.contentType === "lesson" && pathway ? (
          <>
          {pathway.steps.some((step) => ["READING", "VIDEO", "STUDY_CARDS"].includes(step.type) && step.state !== "COMPLETED") && (
            <div className="notice"><b>Bài học chưa hoàn tất</b><p>Hãy đọc nội dung và xem video trong mục Bài học trước. Bài kiểm tra và phần thực hành sẽ mở theo tiến độ đã được lưu.</p><Link className="primary" to={`/lessons/${lesson.id}`}>Quay lại Bài học <ArrowUpRight size={15} /></Link></div>
          )}
          {!pathway.steps.some((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)) && <Empty>Bài tập này chưa có bài kiểm tra hoặc hoạt động thực hành.</Empty>}
          <div className="lesson-pathway" aria-label="Bài tập và thực hành">
            <ol className="pathway-steps">
              {pathway.steps.filter((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)).map((step, index) => (
                <li
                  id={"step-" + step.id}
                  className={"pathway-step pathway-step--" + step.state.toLowerCase()}
                  key={step.id}
                >
                  <div className="pathway-step-heading">
                    <div>
                      <span className="pathway-position">Bước {index + 1}</span>
                      <h3>{stepNames[step.type]}</h3>
                    </div>
                    <Badge tone={step.state === "COMPLETED" ? "passed" : "outline"}>
                      {stateNames[step.state]}
                    </Badge>
                  </div>
                  {step.state === "LOCKED" && (
                    <p className="pathway-lock">{step.lockReasonCode ? lockReasons[step.lockReasonCode] : "Bước học chưa khả dụng"}</p>
                  )}
                  {step.type === "QUIZ" && ["IN_PROGRESS", "COMPLETED"].includes(step.state) && (
                    <QuizLearningStep
                      lessonId={String(lessonId)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId], updatedPathway)
                      }
                    />
                  )}
                  {(step.type === "LAB" || step.type === "CHALLENGE") && step.state !== "LOCKED" && (
                    <PracticalPathwayStep
                      lessonId={String(lessonId)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId], updatedPathway)
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
            {nextStep && ["QUIZ", "LAB", "CHALLENGE"].includes(nextStep.type) && (
              <a className="primary pathway-continue" href={"#step-" + nextStep.id}>
                {continueNames[nextStep.type]}
              </a>
            )}
          </div>
          </>
        ) : (
          <Link className="primary" to={"/labs/" + content.id}>
            Mở phòng lab <ArrowUpRight size={16} />
          </Link>
        )}
      </section>
    </div>
  );
}
