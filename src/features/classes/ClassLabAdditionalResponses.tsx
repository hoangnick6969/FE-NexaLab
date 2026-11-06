import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, ChevronDown, ChevronUp, CheckCircle2, Clock, Award, Check } from "lucide-react";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import "./ClassLabAdditionalResponses.css";

type Prompt = { promptId: string; prompt: string };
type ResponseRow = {
  id: string;
  assignmentId?: string | null;
  attempt: number;
  submittedAt: string;
  promptSnapshot: Prompt[];
  answers: Array<{ promptId: string; prompt: string; answer: string }>;
  student?: { id: string; fullName: string; username?: string | null };
  grade: null | { score: number; feedback: string | null; gradedAt: string };
};

const responsePath = (classId: string, resourceId: string) =>
  `/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(resourceId)}/additional-responses`;

export function StudentClassLabAdditionalResponses({ classId, resourceId, assignmentId, prompts }: {
  classId: string; resourceId: string; assignmentId?: string; prompts: string[];
}) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState("");
  const key = useRef(idempotencyKey());
  const queryKey = ["class-lab-additional-responses", classId, resourceId, assignmentId ?? "practice", "mine"];
  const history = useQuery<ResponseRow[] | { responses: ResponseRow[] }>({
    queryKey,
    queryFn: () => api(`${responsePath(classId, resourceId)}/mine${assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : ""}`),
  });
  const submit = useMutation({
    mutationFn: () => mutate(responsePath(classId, resourceId), "POST", {
      ...(assignmentId ? { assignmentId } : {}),
      answers: prompts.map((prompt, index) => ({ promptId: `prompt-${index + 1}`, answer: answers[`prompt-${index + 1}`]?.trim() ?? "" })),
    }, key.current),
    onSuccess: async () => {
      setAnswers({});
      setValidation("");
      key.current = idempotencyKey();
      await qc.invalidateQueries({ queryKey });
    },
  });
  const rows = Array.isArray(history.data) ? history.data : history.data?.responses ?? [];
  const submitAnswers = () => {
    if (prompts.some((_, index) => !answers[`prompt-${index + 1}`]?.trim())) {
      setValidation("Em hãy trả lời đủ các câu hỏi trước khi nộp.");
      return;
    }
    setValidation("");
    submit.mutate();
  };

  return <section className="panel class-lab-additional-response" aria-labelledby={`additional-answers-${resourceId}`}>
    <h2 id={`additional-answers-${resourceId}`}>Câu hỏi bổ sung của giáo viên</h2>
    <p className="tiny muted">Phần trả lời này được gửi riêng cho giáo viên; không làm thay đổi kết quả chấm mô phỏng.</p>
    {prompts.map((prompt, index) => <label className="field" key={`${resourceId}-${index}`}>
      <span>{prompt}</span>
      <textarea maxLength={10000} rows={3} value={answers[`prompt-${index + 1}`] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [`prompt-${index + 1}`]: event.target.value }))} />
    </label>)}
    {validation && <p role="alert" className="form-error">{validation}</p>}
    <ErrorBox error={submit.error} />
    <button type="button" className="primary" disabled={submit.isPending || prompts.length === 0} onClick={submitAnswers}>{submit.isPending ? "Đang nộp…" : "Nộp câu trả lời cho giáo viên"}</button>
    {history.error && <ErrorBox error={history.error} />}
    {history.isLoading && <p role="status" className="tiny muted">Đang tải lịch sử nộp…</p>}
    {rows.length > 0 && <div className="class-lab-response-history"><h3>Lịch sử câu trả lời</h3>{rows.map((row) => <article key={row.id}>
      <b>Lần nộp {row.attempt} · {new Date(row.submittedAt).toLocaleString("vi-VN")}</b>
      {row.answers.map((answer) => <p key={answer.promptId}><span>{answer.prompt}</span><br />{answer.answer}</p>)}
      {row.grade && <p className="notice">Giáo viên chấm: <b>{row.grade.score}/100</b>{row.grade.feedback ? ` · ${row.grade.feedback}` : ""}</p>}
      {!row.grade && <small className="muted">Đang chờ giáo viên xem</small>}
    </article>)}</div>}
  </section>;
}

export function TeacherClassLabAdditionalResponses({ classId, resourceId, assignmentId }: { classId: string; resourceId: string; assignmentId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const queryKey = ["class-lab-additional-responses", classId, resourceId, assignmentId ?? "all"];
  const inbox = useQuery<ResponseRow[] | { responses: ResponseRow[] }>({
    queryKey,
    queryFn: () => api(`${responsePath(classId, resourceId)}${assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : ""}`),
    enabled: open,
  });
  const rows = Array.isArray(inbox.data) ? inbox.data : inbox.data?.responses ?? [];
  return (
    <section className="class-lab-teacher-inbox">
      <div className="class-lab-toggle-wrap">
        <button
          type="button"
          className="secondary button-compact class-lab-toggle-btn"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <MessageSquareText size={15} aria-hidden="true" />
          <span>{open ? "Thu gọn câu trả lời" : "Xem câu trả lời học sinh"}</span>
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <div className="class-lab-response-inbox">
          <div className="response-inbox-header">
            <div className="response-inbox-title-wrap">
              <MessageSquareText size={16} aria-hidden="true" className="response-inbox-icon" />
              <h3>Câu trả lời bổ sung của học sinh</h3>
              <span className="response-count-pill">{rows.length} bài nộp</span>
            </div>
          </div>
          {inbox.isLoading && <p role="status" className="tiny muted">Đang tải bài nộp…</p>}
          {inbox.error && <ErrorBox error={inbox.error} />}
          {!inbox.isLoading && !inbox.error && rows.length === 0 && (
            <p className="tiny muted response-empty-note">Chưa có học sinh nộp câu trả lời cho bài lab này.</p>
          )}
          <div className="class-lab-response-cards-list">
            {rows.map((row) => (
              <TeacherResponse
                key={row.id}
                row={row}
                classId={classId}
                resourceId={resourceId}
                onSaved={() => qc.invalidateQueries({ queryKey })}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TeacherResponse({ row, classId, resourceId, onSaved }: { row: ResponseRow; classId: string; resourceId: string; onSaved: () => void }) {
  const [score, setScore] = useState(row.grade ? String(row.grade.score) : "");
  const [feedback, setFeedback] = useState(row.grade?.feedback ?? "");
  const grade = useMutation({
    mutationFn: () => api(`${responsePath(classId, resourceId)}/${encodeURIComponent(row.id)}/grade`, "PUT", { score: Number(score), ...(feedback.trim() ? { feedback: feedback.trim() } : {}) }),
    onSuccess: onSaved,
  });
  const studentName = row.student?.fullName ?? row.student?.username ?? "Học sinh";
  return (
    <article className="class-lab-response-card">
      <header className="response-card-header">
        <div className="response-student-lead">
          <div className="response-avatar-badge" aria-hidden="true">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="response-student-meta">
            <strong className="response-student-name">{studentName}</strong>
            {row.assignmentId && <span className="response-assignment-tag">Bài tập được giao</span>}
          </div>
        </div>
        <div className="response-submission-meta">
          <span className="response-timestamp-chip">
            <Clock size={12} aria-hidden="true" />
            <span>Lần nộp {row.attempt} · {new Date(row.submittedAt).toLocaleString("vi-VN")}</span>
          </span>
          {row.grade && (
            <span className="response-grade-chip">
              <Award size={13} aria-hidden="true" />
              <span>Đã chấm: <b>{row.grade.score}/100</b></span>
            </span>
          )}
        </div>
      </header>
      <div className="response-qa-container">
        {row.answers.map((answer, index) => (
          <div className="response-qa-card" key={answer.promptId}>
            <div className="response-qa-prompt">
              <span className="qa-badge">Câu {index + 1}</span>
              <span className="qa-prompt-text">{answer.prompt}</span>
            </div>
            <div className="response-qa-answer">
              <span className="qa-answer-label">Học sinh trả lời:</span>
              <p className="qa-answer-content">{answer.answer || <em className="muted">(Chưa có câu trả lời)</em>}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="class-lab-response-grade">
        <div className="grade-form-layout">
          <div className="grade-score-box">
            <label className="field">
              <span>Điểm bổ sung (0–100)</span>
              <div className="score-input-wrap">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                />
                <span className="score-addon">/ 100</span>
              </div>
            </label>
          </div>
          <div className="grade-feedback-box">
            <label className="field">
              <span>Nhận xét cho học sinh</span>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Nhập nhận xét, hướng dẫn bài làm hoặc lời khen cho học sinh…"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
            </label>
          </div>
        </div>
        <ErrorBox error={grade.error} />
        <div className="grade-submit-footer">
          {grade.isSuccess && (
            <span className="grade-success-status" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Đã lưu điểm và nhận xét thành công</span>
            </span>
          )}
          <button
            type="button"
            className="primary button-compact grade-save-btn"
            disabled={grade.isPending || score === "" || !Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 100}
            onClick={() => grade.mutate()}
          >
            <Check size={14} aria-hidden="true" />
            <span>{grade.isPending ? "Đang lưu…" : row.grade ? "Cập nhật điểm & nhận xét" : "Lưu điểm và nhận xét"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
