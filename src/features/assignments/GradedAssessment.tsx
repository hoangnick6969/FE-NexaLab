import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { idempotencyKey, isApiError, mutate } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox } from "../../components/ui";
import { dateTime, type TestState } from "../../lib/test-status";
import { assessmentLabel, clockOffset, DRAFT_AUTOSAVE_MS, formatClock, remainingMs, score10Text, type AssessmentInfo } from "./assessment-timer";
import { writtenLength } from "./AssignedWritten";
import { ExamLab, type ExamLabItem } from "./ExamLab";
import "./assessment.css";

type Question = { points?: number; id: string; prompt: string; options: Array<{ id: string; text: string }> };
type Prompt = { points?: number; id: string; prompt: string; maxChars: number; criteria: Array<{ code: string; description: string; maxPoints: number }> };

const copy = {
  eyebrow: (type: string) => assessmentLabel[type as keyof typeof assessmentLabel]?.toUpperCase() ?? "BÀI KIỂM TRA",
  coefficient: (n: number | null) => (n ? `Hệ số ${n}` : ""),
  rules: (minutes: number | null, attempts: number | null) =>
    `Thời gian làm bài ${minutes ?? "?"} phút · ${attempts === 1 ? "chỉ được làm 1 lần" : `được làm ${attempts} lần`}. Khi bấm bắt đầu, đồng hồ chạy theo giờ máy chủ, bài được lưu nháp tự động và tự nộp khi hết giờ. Điểm chỉ hiện sau khi giáo viên công bố.`,
  start: "Bắt đầu làm bài",
  starting: "Đang mở đề…",
  closed: "Đã hết thời hạn làm bài. Nếu em gặp sự cố, hãy báo giáo viên để được cho phép làm lại.",
  used: "Em đã dùng hết lượt làm bài.",
  awaiting: "Đã nộp – chờ giáo viên công bố điểm.",
  published: "Điểm đã được công bố",
  score: (v: string) => `Điểm: ${v}/10`,
  correct: (n: number, total: number) => `${n}/${total} câu đúng`,
  timeLeft: "Thời gian còn lại",
  saved: (time: string) => `Đã lưu nháp lúc ${time}`,
  saving: "Đang lưu nháp…",
  saveFailed: "Chưa lưu được nháp; hệ thống sẽ thử lại.",
  submit: "Nộp bài",
  submitting: "Đang nộp…",
  confirmSubmit: "Nộp bài ngay? Sau khi nộp em không thể sửa.",
  autoSubmitting: "Hết giờ – đang nộp bài tự động…",
  question: (n: number) => `Câu ${n}.`,
  answered: (n: number, total: number) => `Đã làm ${n}/${total} câu`,
  counter: (n: number, max: number) => `${n}/${max} ký tự`,
  autoSubmitted: "Bài được nộp tự động khi hết giờ.",
  leaveWarning: "Bài kiểm tra đang làm dở. Rời trang vẫn giữ nháp, nhưng đồng hồ vẫn chạy.",
  criterion: (d: string, p: number, m: number | null) => `${d}: ${p}${m !== null ? `/${m}` : ""} điểm`,
  feedback: "Nhận xét:",
};

/**
 * TAI-07 (TAI7-T1): graded test or written task. Start screen → one server-timed session (countdown, autosave every
 * 20 s and 2 s after a change, auto-submit at 0) → "chờ công bố điểm" → the 10-point result after publication.
 */
export function GradedAssessment({ assignment, kind }: { assignment: any; kind: "test" | "written" | "exam" }) {
  const queryClient = useQueryClient();
  const info: AssessmentInfo = assignment.assessment;
  const state: TestState & { resultHidden?: boolean } = assignment.state;
  const session = info.openSession;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["assignment", assignment.id] });
    void queryClient.invalidateQueries({ queryKey: ["assignments"] });
  };
  const start = useMutation({
    mutationFn: () => mutate(`/assignments/${assignment.id}/sessions`, "POST", {}),
    onSuccess: refresh,
  });
  const attemptsLeft = (info.attemptsAllowed ?? 1) - info.attemptsUsed;
  // Server view of the window: the status says overdue, or the due time is not after the server clock of this response.
  const pastDue = state.status === "OVERDUE_UNSUBMITTED" || new Date(state.dueAt).getTime() <= new Date(assignment.serverNow).getTime();
  const current: any = state.current;

  return (
    <div className="student-assigned-learning">
      <PageHeading
        eyebrow={copy.eyebrow(info.type)}
        title={assignment.title}
        description={`${assignment.classroom.name} · ${copy.coefficient(info.coefficient)} · Hạn ${dateTime(state.dueAt)}`}
      />
      {session ? (
        <TimedPaper key={session.id} assignment={assignment} kind={kind} session={session} onDone={refresh} />
      ) : (
        <section className="panel lesson-content" aria-label="Thông tin bài kiểm tra">
          <div className="section-heading">
            <h2>{assignment.content.title}</h2>
            <Badge tone={info.resultPublished && current ? "passed" : "gold"}>{assessmentLabel[info.type]}</Badge>
          </div>
          <p>{copy.rules(info.durationMinutes, info.attemptsAllowed)}</p>
          {current && !info.resultPublished && <p className="notice" role="status">{copy.awaiting}</p>}
          {current?.autoSubmitted && <p className="tiny muted">{copy.autoSubmitted}</p>}
          {current && info.resultPublished && <PublishedResult current={current} kind={kind} />}
          {attemptsLeft > 0 && !pastDue && (
            <>
              <ErrorBox error={start.error} />
              <button type="button" className="primary" disabled={start.isPending} onClick={() => start.mutate()}>
                {start.isPending ? copy.starting : copy.start}
              </button>
            </>
          )}
          {attemptsLeft > 0 && pastDue && !current && <p className="notice" role="status">{copy.closed}</p>}
          {attemptsLeft <= 0 && !current && <p className="notice" role="status">{copy.used}</p>}
        </section>
      )}
    </div>
  );
}

function PublishedResult({ current, kind }: { current: any; kind: "test" | "written" | "exam" }) {
  return (
    <section className="written-grade" aria-label={copy.published}>
      <h3>{copy.published}</h3>
      <p><b>{copy.score(score10Text(current.score10))}</b>{kind === "test" && current.correctCount !== null ? ` · ${copy.correct(current.correctCount, current.questionCount)}` : ""}</p>
      {kind !== "test" && current.grade && (
        <>
          <ul>
            {(current.grade.criteria ?? []).map((c: any) => <li key={`${c.promptId}-${c.code}`}>{copy.criterion(c.description, c.points, c.maxPoints)}</li>)}
          </ul>
          {current.grade.feedback && <p><b>{copy.feedback}</b> {current.grade.feedback}</p>}
        </>
      )}
    </section>
  );
}

function TimedPaper({ assignment, kind, session, onDone }: { assignment: any; kind: "test" | "written" | "exam"; session: NonNullable<AssessmentInfo["openSession"]>; onDone: () => void }) {
  const isExam = kind === "exam";
  const questions: Question[] = kind !== "written" ? assignment.content.questions : [];
  const prompts: Prompt[] = kind !== "test" ? assignment.content.prompts : [];
  const labs: ExamLabItem[] = isExam ? assignment.content.labs : [];
  const examDraft = isExam && !Array.isArray(session.draftAnswers) ? session.draftAnswers as {
    choices?: Array<{ questionId: string; optionId: string }>;
    responses?: Array<{ promptId: string; text: string }>;
  } : null;
  const legacyDraft = Array.isArray(session.draftAnswers) ? session.draftAnswers : [];
  const offset = useMemo(() => clockOffset(assignment.serverNow, Date.now()), [assignment.serverNow]);
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries((isExam ? examDraft?.choices ?? [] : kind === "test" ? legacyDraft : []).map((a) => [a.questionId, a.optionId])),
  );
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries((isExam ? examDraft?.responses ?? [] : kind === "written" ? legacyDraft : []).map((a) => [a.promptId, a.text])),
  );
  const [left, setLeft] = useState(() => remainingMs(session.expiresAt, offset));
  const [savedAt, setSavedAt] = useState<string | null>(session.draftSavedAt);
  const dirty = useRef(false);
  const submittedOnce = useRef(false);
  const submitKey = useRef(idempotencyKey());

  const selected = Object.entries(choices).map(([questionId, optionId]) => ({ questionId, optionId }));
  const responses = prompts.map((p) => ({ promptId: p.id, text: texts[p.id] ?? "" }));
  const exam = { choices: selected, responses };
  const draft = isExam ? exam : kind === "test" ? selected : responses;
  const latest = useRef({ draft, submitted: {} as object });
  latest.current = {
    draft,
    submitted: { sessionId: session.id, ...(isExam ? { exam } : kind === "test" ? { answers: selected } : { responses }) },
  };

  const save = useMutation({
    mutationFn: (answers: typeof draft) => mutate(`/assignments/${assignment.id}/sessions/${session.id}/draft`, "PUT", { answers }),
    onSuccess: (result: any, answers) => {
      dirty.current = JSON.stringify(answers) !== JSON.stringify(latest.current.draft);
      setSavedAt(result.savedAt);
    },
  });
  const submit = useMutation({
    mutationFn: (body: object) => mutate(`/assignments/${assignment.id}/submissions`, "POST", body, submitKey.current),
    onSuccess: onDone,
    onError: (error) => {
      if (isApiError(error, "ASSESSMENT_SESSION_CLOSED")) onDone();
      else submittedOnce.current = false;
    },
  });
  const doSubmit = () => {
    if (submittedOnce.current) return;
    submittedOnce.current = true;
    submit.mutate(latest.current.submitted);
  };

  // Countdown; auto-submit once at 0 (the server also auto-submits after the grace period).
  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = remainingMs(session.expiresAt, offset);
      setLeft(ms);
      if (ms <= 0) doSubmit();
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.expiresAt, offset]);

  const saving = useRef(false);
  saving.current = save.isPending;
  // Autosave every 20 s when something changed, and 2 s after the last change.
  useEffect(() => {
    const id = window.setInterval(() => { if (dirty.current && !saving.current && !submittedOnce.current) save.mutate(latest.current.draft); }, DRAFT_AUTOSAVE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty.current) return;
    const id = window.setTimeout(() => { if (!saving.current && !submittedOnce.current) save.mutate(latest.current.draft); }, 2_000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choices, texts]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = copy.leaveWarning; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  const answered = Object.keys(choices).length + prompts.filter((p) => writtenLength(texts[p.id] ?? "") > 0).length;
  const savedLabItems = new Set(session.labAttempts?.map((attempt) => attempt.itemId));
  const total = questions.length + prompts.length;
  const overLimit = prompts.some((p) => writtenLength(texts[p.id] ?? "") > p.maxChars);
  const urgent = left <= 60_000;

  return (
    <section className="panel quiz-learning assessment-paper" aria-label="Bài làm">
      <div className="assessment-timer" role="timer" aria-live={urgent ? "assertive" : "off"} data-urgent={urgent || undefined}>
        <span>{copy.timeLeft}</span>
        <b>{formatClock(left)}</b>
        <small>{copy.answered(answered, total)} · {save.isPending ? copy.saving : save.isError ? copy.saveFailed : savedAt ? copy.saved(dateTime(savedAt)) : ""}</small>
      </div>
      {left <= 0 && <p className="notice" role="status">{copy.autoSubmitting}</p>}
      <div>
        {isExam && questions.length > 0 && <h2>Trắc nghiệm</h2>}
        {questions.map((question, index) => (
          <div key={question.id} className="quiz-question">
            <fieldset>
              <legend>{copy.question(index + 1)} {question.prompt}{isExam && ` · ${question.points?.toLocaleString("vi-VN")} điểm`}</legend>
              {question.options.map((option) => (
                <label key={option.id} className="check">
                  <input
                    type="radio"
                    name={question.id}
                    checked={choices[question.id] === option.id}
                    disabled={left <= 0 || submit.isPending}
                    onChange={() => { dirty.current = true; setChoices({ ...choices, [question.id]: option.id }); }}
                  />
                  {option.text}
                </label>
              ))}
            </fieldset>
          </div>
        ))}
        {isExam && prompts.length > 0 && <h2>Tự luận</h2>}
        {prompts.map((p, index) => {
          const length = writtenLength(texts[p.id] ?? "");
          const over = length > p.maxChars;
          return (
            <div key={p.id} className="quiz-question">
              <label className="field">
                <span><b>{copy.question(index + 1)}</b> {p.prompt}{isExam && ` · ${p.points?.toLocaleString("vi-VN")} điểm`}</span>
                <textarea
                  rows={6}
                  value={texts[p.id] ?? ""}
                  disabled={left <= 0 || submit.isPending}
                  aria-invalid={over || undefined}
                  onChange={(event) => { dirty.current = true; setTexts({ ...texts, [p.id]: event.target.value }); }}
                />
              </label>
              <small className={over ? "field-error" : "tiny muted"} aria-live="polite">{copy.counter(length, p.maxChars)}</small>
            </div>
          );
        })}
      </div>
      {labs.map((item) => <ExamLab key={item.id} item={item} assignmentId={assignment.id} sessionId={session.id}
        saved={savedLabItems.has(item.id)} disabled={left <= 0 || submit.isPending} />)}
      <ErrorBox error={submit.error} />
      <div className="button-row">
        <button type="button" className="primary" disabled={submit.isPending || overLimit || left <= 0}
          onClick={() => { if (window.confirm(copy.confirmSubmit)) doSubmit(); }}>
          {submit.isPending ? copy.submitting : copy.submit}
        </button>
      </div>
    </section>
  );
}
