import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";
import { dateTime, testStatusLabel, testStatusTone, type StudentTestStatus } from "../../lib/test-status";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import { LoadError } from "./class-ui";
import { WrittenSimilarity } from "./WrittenSimilarity";
import { defineText } from "../../i18n";
import { AiStateBadge, AiSuggestionBar, AiSuggestionRequest, AnswerWithEvidence, CriterionSuggestion, gradeKindLabel } from "./WrittenAiSuggestion";
import {
  evidenceSpans,
  gradeKindFor,
  isActiveJob,
  pointsKey,
  requestableSubmissions,
  suggestedPoints,
  type AiAssessmentFlags,
  type AiChoice,
  type AiJobState,
  type BoardAiState,
  type WrittenSuggestion,
} from "./written-suggestion";

const text = defineText({
  vi: {
    board: "Bài tự luận đã giao",
    student: "Học sinh",
    status: "Trạng thái",
    score: "Điểm (0–100)",
    actions: "Thao tác",
    grade: "Chấm bài",
    similarity: "Kiểm tra nội dung tương đồng",
    back: "← Quay lại danh sách",
    notCurrent: "Học sinh đã nộp bài mới hơn; chỉ chấm bài hiện tại.",
    notGradeable: "Bài này chưa thể chấm (đang chờ duyệt trễ hoặc đã bị từ chối).",
    responses: "Bài làm",
    rubric: "Biểu điểm",
    anchors: "Mốc chấm",
    reference: "Đáp án tham khảo (chỉ giáo viên thấy)",
    criterionPoints: (points: number, max: number) => `Điểm ${points} / tối đa ${max}`,
    total: (total: number, max: number, score: number) => `Tổng: ${total} / ${max} điểm → ${score}/100`,
    feedback: "Nhận xét cho học sinh (không bắt buộc, tối đa 2000 ký tự)",
    save: "Lưu điểm",
    saving: "Đang lưu…",
    history: "Lịch sử chấm (chỉ thêm, không sửa)",
    historyRow: (score: number, when: string) => `${score}/100 · ${when}`,
    pointsRequired: "Hãy nhập điểm cho mọi tiêu chí.",
    loading: "Đang tải…",
    aiColumn: "Gợi ý AI",
  },
  en: {
    board: "Written tasks assigned",
    student: "Student",
    status: "Status",
    score: "Score (0–100)",
    actions: "Actions",
    grade: "Grade",
    similarity: "Check similar content",
    back: "← Back to the list",
    notCurrent: "The student has submitted a newer answer; only the current submission can be graded.",
    notGradeable: "This submission cannot be graded yet (late review pending or rejected).",
    responses: "Answers",
    rubric: "Rubric",
    anchors: "Anchors",
    reference: "Reference answer (teacher only)",
    criterionPoints: (points: number, max: number) => `Points ${points} of ${max}`,
    total: (total: number, max: number, score: number) => `Total: ${total} / ${max} points → ${score}/100`,
    feedback: "Comment for the student (optional, at most 2000 characters)",
    save: "Save grade",
    saving: "Saving…",
    history: "Grade history (append only)",
    historyRow: (score: number, when: string) => `${score}/100 · ${when}`,
    pointsRequired: "Enter points for every criterion.",
    loading: "Loading…",
    aiColumn: "AI suggestion",
  },
});

type BoardStudent = {
  student: { id: string; fullName: string; username: string };
  status: StudentTestStatus;
  current: { id: string; score: number | null; submittedAt: string } | null;
  /** Assist mode only (TAI2-T6). */
  aiSuggestion?: BoardAiState | null;
};
type BoardData = { students: BoardStudent[]; assignment: { title: string }; aiAssessment?: AiAssessmentFlags };

type SubmissionData = {
  submission: { id: string; status: string; isCurrent: boolean; gradeable?: boolean; responses: Array<{ promptId: string; text: string }> };
  rubric: { prompts: Array<{ id: string; prompt: string; referenceAnswer?: string; criteria: Array<{ code: string; description: string; maxPoints: number; anchors: Array<{ points: number; description: string }> }> }> };
  grades: Array<{ id: string; kind?: string; score: number; feedback: string | null; createdAt: string }>;
  aiAssessment?: AiAssessmentFlags;
  /** Assist mode only (TAI2-T6): latest AI job state and the suggestion with evidence offsets. */
  aiJob?: AiJobState | null;
  suggestion?: WrittenSuggestion | null;
};
/** Poll the AI state every 2 s while a job runs (TAI-01 polling contract). */
const AI_POLL_MS = 2_000;

/** Written-status board: per recipient status and current score, then the grading sheet for one submission (TAI2-T3). */
export function WrittenTracking({ classroom, assignment, onClose, initialView }: { classroom: ClassSummary; assignment: TeacherAssignment; onClose: () => void; initialView?: "similarity" }) {
  const t = text();
  const [openSubmission, setOpenSubmission] = useState<string | null>(null);
  const [similarityOpen, setSimilarityOpen] = useState(initialView === "similarity");
  const board = useQuery<BoardData>({
    queryKey: ["written-status", classroom.id, assignment.id],
    queryFn: () => api(`/classes/${classroom.id}/assignments/${assignment.id}/written-status`),
    refetchInterval: (query) => (query.state.data?.students.some((s) => isActiveJob(s.aiSuggestion)) ? AI_POLL_MS : false),
  });
  const ai = board.data?.aiAssessment;
  const names = Object.fromEntries((board.data?.students ?? []).filter((s) => s.current).map((s) => [s.current!.id, s.student.fullName]));
  return (
    <Modal title={assignment.title} onClose={onClose}>
      <LoadError query={board} what={t.board} />
      {similarityOpen ? (
        <WrittenSimilarity classId={classroom.id} assignmentId={assignment.id} onBack={() => setSimilarityOpen(false)} />
      ) : openSubmission ? (
        <>
          <button type="button" className="text-button" onClick={() => setOpenSubmission(null)}>{t.back}</button>
          <WrittenGradeSheet classId={classroom.id} assignmentId={assignment.id} submissionId={openSubmission} onSaved={() => setOpenSubmission(null)} />
        </>
      ) : (
        board.data && (
          <>
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => setSimilarityOpen(true)}>{t.similarity}</button>
          </div>
          {ai?.available && (
            <AiSuggestionRequest
              classId={classroom.id}
              assignmentId={assignment.id}
              submissionIds={requestableSubmissions(board.data.students)}
              names={names}
              onDone={() => void board.refetch()}
            />
          )}
          <table className="data-table" aria-label={t.board}>
            <thead>
              <tr><th>{t.student}</th><th>{t.status}</th><th>{t.score}</th>{ai?.assist && <th>{t.aiColumn}</th>}<th>{t.actions}</th></tr>
            </thead>
            <tbody>
              {board.data.students.map((row) => {
                const gradeable = !!row.current && (row.status === "AWAITING_GRADE" || row.status === "GRADED");
                return (
                  <tr key={row.student.id}>
                    <td>{row.student.fullName} <small className="muted">{row.student.username}</small></td>
                    <td><Badge tone={testStatusTone[row.status]}>{testStatusLabel[row.status]}</Badge></td>
                    <td>{row.status === "GRADED" && row.current?.score != null ? row.current.score : "—"}</td>
                    {ai?.assist && <td><AiStateBadge state={row.aiSuggestion} /></td>}
                    <td>
                      {gradeable && (
                        <button type="button" className="text-button" onClick={() => setOpenSubmission(row.current!.id)}>{t.grade}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )
      )}
    </Modal>
  );
}

/** Teacher grading sheet: answers beside the rubric with anchors; one points value per criterion; append-only save. */
export function WrittenGradeSheet({ classId, assignmentId, submissionId, onSaved }: { classId: string; assignmentId: string; submissionId: string; onSaved: () => void }) {
  const t = text();
  const queryClient = useQueryClient();
  const data = useQuery<SubmissionData>({
    queryKey: ["written-submission", classId, submissionId],
    queryFn: () => api(`/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}`),
    refetchInterval: (query) => {
      const job = query.state.data?.aiJob;
      return job && (job.status === "PENDING" || job.status === "RUNNING") ? AI_POLL_MS : false;
    },
  });
  const [points, setPoints] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [aiChoice, setAiChoice] = useState<AiChoice>(null);
  const suggestion = data.data?.suggestion ?? null;
  const kind = gradeKindFor(aiChoice, suggestion, points);
  const key = useRef<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      const criterionPoints = (data.data?.rubric.prompts ?? []).flatMap((p) => p.criteria.map((c) => ({
        promptId: p.id,
        criterionCode: c.code,
        points: Number(points[pointsKey(p.id, c.code)]),
      })));
      // The points are always the teacher's; the kind only records how the AI suggestion was used (TAI2-T6).
      return mutate(`/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}/grades`, "POST", {
        kind,
        criterionPoints,
        ...(kind !== "MANUAL" && suggestion ? { basedOnSuggestionId: suggestion.id } : {}),
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      }, key.current);
    },
    onSuccess: () => {
      key.current = null;
      void queryClient.invalidateQueries({ queryKey: ["written-status", classId, assignmentId] });
      void queryClient.invalidateQueries({ queryKey: ["written-submission", classId, submissionId] });
      onSaved();
    },
  });
  if (data.isLoading) return <p>{t.loading}</p>;
  if (!data.data) return <LoadError query={data} what={t.rubric} />;
  const { submission, rubric, grades } = data.data;
  const sheetOpen = submission.isCurrent && (submission.status === "AWAITING_GRADE" || submission.status === "GRADED");
  const criteria = rubric.prompts.flatMap((p) => p.criteria.map((c) => ({ promptId: p.id, ...c })));
  const values = criteria.map((c) => points[`${c.promptId}|${c.code}`]);
  const complete = values.every((v) => v !== undefined && v !== "" && !Number.isNaN(Number(v)));
  const total = complete ? values.reduce((sum, v) => sum + Number(v), 0) : 0;
  const max = criteria.reduce((sum, c) => sum + c.maxPoints, 0);
  const score = max ? Math.round((total / max) * 100) : 0;
  const assist = !!data.data.aiAssessment?.assist;
  /** accept and edit prefill the valid suggested points; reject keeps what the teacher typed. */
  const choose = (choice: AiChoice) => {
    if (suggestion && (choice === "accept" || choice === "edit")) setPoints({ ...(choice === "edit" ? points : {}), ...suggestedPoints(suggestion) });
    setAiChoice(choice);
  };
  return (
    <div className="written-grade-sheet">
      {!submission.isCurrent && <p className="notice" role="status">{t.notCurrent}</p>}
      {!sheetOpen && submission.isCurrent && <p className="notice" role="status">{t.notGradeable}</p>}
      {assist && sheetOpen && <AiSuggestionBar job={data.data.aiJob ?? null} suggestion={suggestion} choice={aiChoice} kind={kind} onChoose={choose} />}
      {rubric.prompts.map((p, index) => {
        const answer = submission.responses.find((r) => r.promptId === p.id)?.text ?? "";
        return (
          <section key={p.id} className="written-prompt">
            <h3>{index + 1}. {p.prompt}</h3>
            {assist && suggestion ? <AnswerWithEvidence answer={answer} spans={evidenceSpans(suggestion, p.id)} /> : <blockquote className="written-answer">{answer}</blockquote>}
            {p.referenceAnswer && <p className="tiny muted"><b>{t.reference}:</b> {p.referenceAnswer}</p>}
            {p.criteria.map((c) => (
              <fieldset key={c.code} className="written-criterion">
                <legend>{c.code} · {c.description} (≤ {c.maxPoints})</legend>
                <ul className="tiny">
                  {c.anchors.map((a) => <li key={a.points}>{a.points}: {a.description}</li>)}
                </ul>
                {assist && suggestion && <CriterionSuggestion criterion={suggestion.criteria.find((s) => s.promptId === p.id && s.criterionCode === c.code)} maxPoints={c.maxPoints} />}
                <label className="field">
                  <span>{t.criterionPoints(Number(points[`${p.id}|${c.code}`] ?? 0), c.maxPoints)}</span>
                  <input
                    type="number"
                    min={0}
                    max={c.maxPoints}
                    step={0.5}
                    disabled={!sheetOpen}
                    value={points[`${p.id}|${c.code}`] ?? ""}
                    onChange={(event) => setPoints({ ...points, [`${p.id}|${c.code}`]: event.target.value })}
                  />
                </label>
              </fieldset>
            ))}
          </section>
        );
      })}
      <p><b>{complete ? t.total(total, max, score) : t.pointsRequired}</b></p>
      <label className="field">
        <span>{t.feedback}</span>
        <textarea rows={3} maxLength={2000} disabled={!sheetOpen} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
      </label>
      <ErrorBox error={save.error} />
      <button type="button" className="primary" disabled={!sheetOpen || !complete || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? t.saving : t.save}
      </button>
      {grades.length > 0 && (
        <section aria-label={t.history}>
          <h3>{t.history}</h3>
          <ol>
            {grades.map((g) => <li key={g.id}>{t.historyRow(g.score, dateTime(g.createdAt))}{g.kind && g.kind !== "MANUAL" ? ` · ${gradeKindLabel(g.kind)}` : ""}{g.feedback ? ` · ${g.feedback}` : ""}</li>)}
          </ol>
        </section>
      )}
    </div>
  );
}
