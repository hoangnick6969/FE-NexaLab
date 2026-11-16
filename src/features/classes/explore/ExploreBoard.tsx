/**
 * Teacher board of one Class Explore assignment (P0 C3.4): what was asked, what each student handed in, who has not, and a
 * comment per submission. A comment moves it to "reviewed"; there is no score, verdict or progress.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError } from "../../../lib/api";
import { Modal } from "../../../components/ui";
import { defineText, formatDateTime } from "../../../i18n";
import { answerValue, formatMeasure, measureText, unitOf, type ExploreRequirement, type ExploreSubmission } from "../../labs/class-explore/class-explore";
import { classItemLabels } from "../../labs/runtime/explore-registry";
import type { ClassSummary, TeacherAssignment } from "../class-types";
import { LoadError } from "../class-ui";

const text = defineText({
  vi: {
    title: (name: string) => `Bài nộp: ${name}`, asked: "Yêu cầu", explain: "Lời giải thích",
    note: "Lời dặn", submitted: (n: number) => `Đã nộp (${n})`, pending: (n: number) => `Chưa nộp (${n})`, none: "Chưa có bài nộp nào.",
    status: { SUBMITTED: "Đã nộp", REVIEWED: "Đã nhận xét" }, late: "Nộp trễ", at: (when: string) => `Nộp lúc ${when}`,
    feedback: "Nhận xét", send: "Gửi nhận xét", sending: "Đang gửi…", sent: "Đã gửi nhận xét", failed: "Chưa gửi được nhận xét.",
    noScore: "Bài Explore không chấm điểm và không tính vào tiến độ.", close: "Đóng",
  },
  en: {
    title: (name: string) => `Submissions: ${name}`, asked: "What was asked", explain: "Explanation",
    note: "Note", submitted: (n: number) => `Submitted (${n})`, pending: (n: number) => `Not submitted (${n})`, none: "No submissions yet.",
    status: { SUBMITTED: "Submitted", REVIEWED: "Commented" }, late: "Late", at: (when: string) => `Submitted ${when}`,
    feedback: "Comment", send: "Send comment", sending: "Sending…", sent: "Comment sent", failed: "Could not send the comment.",
    noScore: "Explore work is not graded and does not count towards progress.", close: "Close",
  },
});

type Board = {
  assignment: { id: string; title: string; dueDate: string | null; requirements: ExploreRequirement[]; instructions: string; effectiveConfig?: Record<string, unknown> };
  submissions: Array<ExploreSubmission & { student: { id: string; fullName: string | null; username: string | null } }>;
  pending: Array<{ id: string; fullName: string | null; username: string | null }>;
};

/** What a requirement asks, in words; item names come from the bench of the pinned config. */
const askedOf = (labels: Record<string, string>, explain: string) => (item: ExploreRequirement) =>
  item.kind === "measure" ? measureText()[item.measurement].asked(labels[item.itemId] ?? item.itemId) : explain;
const who = (student: { fullName: string | null; username: string | null }) => student.fullName || (student.username ? `@${student.username}` : "—");

export function ExploreBoard({ classroom, assignment, onClose }: { classroom: ClassSummary; assignment: TeacherAssignment; onClose: () => void }) {
  const t = text();
  const key = ["explore-submissions", classroom.id, assignment.id];
  const board = useQuery<Board>({ queryKey: key, queryFn: () => api(`/classes/${classroom.id}/assignments/${assignment.id}/explore-submissions`) });
  const data = board.data;
  const labels = classItemLabels(data?.assignment.effectiveConfig ?? { kit: "k2-wet-bench@1" });
  const asked = askedOf(labels, t.explain);
  return <Modal title={t.title(assignment.title)} onClose={onClose}>
    <LoadError query={board} what={assignment.title} />
    {data && <div data-testid="explore-board">
      <section aria-label={t.asked}>
        <h3>{t.asked}</h3>
        <ul>{data.assignment.requirements.map((item, index) => <li key={index}>{asked(item)}</li>)}</ul>
        {data.assignment.instructions && <p className="tiny muted">{t.note}: {data.assignment.instructions}</p>}
      </section>
      <h3>{t.submitted(data.submissions.length)}</h3>
      {data.submissions.length === 0 && <p className="muted">{t.none}</p>}
      {data.submissions.map((row) => <SubmissionCard key={row.id} classId={classroom.id} assignmentId={assignment.id} row={row} queryKey={key} requirements={data.assignment.requirements} labels={labels} />)}
      {data.pending.length > 0 && <>
        <h3>{t.pending(data.pending.length)}</h3>
        <p data-testid="explore-pending">{data.pending.map(who).join(" · ")}</p>
      </>}
      <p className="tiny muted">{t.noScore}</p>
    </div>}
    <div className="button-row"><button type="button" className="secondary" onClick={onClose}>{t.close}</button></div>
  </Modal>;
}

function SubmissionCard({ classId, assignmentId, row, queryKey, requirements, labels }: { classId: string; assignmentId: string; row: Board["submissions"][number]; queryKey: unknown[]; requirements: ExploreRequirement[]; labels: Record<string, string> }) {
  const t = text();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [saved, setSaved] = useState(false);
  const send = useMutation({
    mutationFn: () => api(`/classes/${classId}/assignments/${assignmentId}/explore-submissions/${row.id}/review`, "PUT", { feedback: feedback.trim() }, true, { "Idempotency-Key": idempotencyKey() }),
    onSuccess: () => { setSaved(true); void queryClient.invalidateQueries({ queryKey }); },
  });
  return <article className="panel" aria-label={who(row.student)} data-testid="explore-submission">
    <header><strong>{who(row.student)}</strong> · <span data-testid="explore-submission-status">{t.status[row.status]}</span>{row.late && <> · <strong data-testid="explore-late">{t.late}</strong></>} · <span className="tiny muted">{t.at(formatDateTime(row.submittedAt))}</span></header>
    <ul>{row.answers.measures.map((item) => { const requirement = requirements.find((other) => other.kind === "measure" && other.itemId === item.itemId); return <li key={item.itemId}>{requirement ? askedOf(labels, t.explain)(requirement) : item.itemId}: <b>{formatMeasure(unitOf(requirements, item.itemId), answerValue(item))}</b></li>; })}</ul>
    {row.answers.explanation && <p>{row.answers.explanation}</p>}
    <label className="field"><span>{t.feedback}</span>
      <textarea rows={3} maxLength={2000} value={feedback} onChange={(event) => { setFeedback(event.target.value); setSaved(false); }} />
    </label>
    {send.error && <p className="error" role="alert">{isApiError(send.error) ? send.error.message : t.failed}</p>}
    {saved && !send.isPending && <p role="status" className="tiny">{t.sent}</p>}
    <button type="button" className="primary button-compact" disabled={!feedback.trim() || send.isPending} onClick={() => send.mutate()}>{send.isPending ? t.sending : t.send}</button>
  </article>;
}
