import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, ErrorBox, Field, Modal } from "../../components/ui";
import { dateTime, submissionStatusLabel, testStatusLabel, testStatusTone, type TestState } from "../../lib/test-status";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import { LoadError, toLocalInput, useMutate } from "./class-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    lateQueue: "Bài nộp trễ chờ duyệt",
    lateList: "danh sách bài nộp trễ",
    submittedAt: (at: string, due: string) => `Nộp lúc ${at} · Hạn hiện tại ${due}`,
    reason: "Lý do:",
    extendGroup: "Dời hạn cho cả nhóm",
    reject: "Từ chối (0 điểm)",
    rejectTitle: "Từ chối bài nộp trễ",
    rejectLead: "Bài nộp trễ của",
    rejectTail: "sẽ nhận 0 điểm và được ghi là chưa đạt. Bài nộp và lý do vẫn được lưu.",
    noteForStudent: "Ghi chú cho học sinh (không bắt buộc)",
    cancel: "Hủy",
    working: "Đang xử lý…",
    rejectZero: "Từ chối, ghi 0 điểm",
    extendTitle: "Dời hạn nộp cho cả nhóm",
    extendNote: (due: string) => `Hạn hiện tại: ${due}. Hạn mới áp dụng cho toàn bộ học sinh đã được giao bài này, kể cả em đã nộp; mọi bài nộp trễ đang chờ duyệt sẽ được chấp nhận. Lịch sử hạn nộp và bài nộp trước vẫn được giữ.`,
    newDue: "Hạn nộp mới",
    noteOptional: "Ghi chú (không bắt buộc)",
    saving: "Đang lưu…",
    extend: "Dời hạn",
    testStatus: "trạng thái bài kiểm tra",
    currentDue: "Hạn hiện tại:",
    extendedTimes: (n: number) => `đã dời ${n} lần`,
    dueHistory: "Lịch sử hạn nộp",
    setAt: (at: string) => `đặt lúc ${at}`,
    student: "Học sinh",
    status: "Trạng thái",
    currentSubmission: "Bài nộp hiện tại",
    actions: "Thao tác",
    points: (n: number) => `${n} điểm`,
    submissions: (n: number) => `${n} lần nộp`,
    notSubmitted: "Chưa nộp",
    noAutoZero: "Quá hạn mà chưa nộp không tự bị chấm 0 điểm.",
  },
  en: {
    lateQueue: "Late submissions to review",
    lateList: "the late submission list",
    submittedAt: (at: string, due: string) => `Submitted ${at} · Now due ${due}`,
    reason: "Reason:",
    extendGroup: "Extend for the group",
    reject: "Reject (0 points)",
    rejectTitle: "Reject the late submission",
    rejectLead: "The late submission from",
    rejectTail: "will get 0 points and be recorded as not passed. The submission and reason are kept.",
    noteForStudent: "Note for the student (optional)",
    cancel: "Cancel",
    working: "Working…",
    rejectZero: "Reject with 0 points",
    extendTitle: "Extend the due date for the group",
    extendNote: (due: string) => `Now due: ${due}. The new date applies to every student assigned this work, including those who submitted; every late submission waiting for review is accepted. Earlier due dates and submissions are kept.`,
    newDue: "New due date",
    noteOptional: "Note (optional)",
    saving: "Saving…",
    extend: "Extend",
    testStatus: "the test status",
    currentDue: "Now due:",
    extendedTimes: (n: number) => `extended ${n}×`,
    dueHistory: "Due date history",
    setAt: (at: string) => `set ${at}`,
    student: "Student",
    status: "Status",
    currentSubmission: "Current submission",
    actions: "Actions",
    points: (n: number) => `${n} points`,
    submissions: (n: number) => `${n} submissions`,
    notSubmitted: "Not submitted",
    noAutoZero: "Overdue work that was not submitted is not scored 0 automatically.",
  },
});
const t = text();

type LateQueueItem = {
  assignmentId: string;
  assignmentTitle: string;
  student: { id: string; fullName: string; username: string };
  submissionId: string;
  submittedAt: string;
  lateReason: string;
  dueAt: string;
  revision: number;
  permittedDecisions: Array<"REJECT_ZERO" | "REVISE_DEADLINE_FOR_CLASS">;
};

/** I3 / 3.5: late submissions awaiting this teacher's decision, oldest first. */
export function LateQueue({ classroom }: { classroom: ClassSummary }) {
  const queue = useQuery<LateQueueItem[]>({ queryKey: ["late-queue", classroom.id], queryFn: () => api(`/classes/${classroom.id}/late-queue`) });
  const [rejecting, setRejecting] = useState<LateQueueItem | null>(null);
  const [extending, setExtending] = useState<LateQueueItem | null>(null);
  if (!queue.error && !queue.data?.length) return null;
  return (
    <section className="panel" aria-labelledby="late-queue-title">
      <h2 id="late-queue-title">{t.lateQueue}</h2>
      <LoadError query={queue} what={t.lateList} />
      {queue.data?.map((item) => (
        <div className="assignment-row" key={item.submissionId}>
          <div>
            <b>{item.student.fullName}</b> · {item.assignmentTitle}
            <small>
              {t.submittedAt(dateTime(item.submittedAt), dateTime(item.dueAt))}
            </small>
            <small>{t.reason} {item.lateReason}</small>
          </div>
          <div className="button-row">
            {item.permittedDecisions.includes("REVISE_DEADLINE_FOR_CLASS") && (
              <button className="text-button" onClick={() => setExtending(item)}>
                {t.extendGroup}
              </button>
            )}
            <button className="danger-text" onClick={() => setRejecting(item)}>
              {t.reject}
            </button>
          </div>
        </div>
      ))}
      {rejecting && <RejectLate classId={classroom.id} item={rejecting} onClose={() => setRejecting(null)} />}
      {extending && (
        <ReviseDeadline
          classId={classroom.id}
          assignmentId={extending.assignmentId}
          revision={extending.revision}
          dueAt={extending.dueAt}
          submissionId={extending.submissionId}
          onClose={() => setExtending(null)}
        />
      )}
    </section>
  );
}

function RejectLate({ classId, item, onClose }: { classId: string; item: { assignmentId: string; submissionId: string; student: { fullName: string } }; onClose: () => void }) {
  const act = useMutate();
  const key = useRef(idempotencyKey());
  const [note, setNote] = useState("");
  return (
    <Modal title={t.rejectTitle} onClose={onClose}>
      <p>
        {t.rejectLead} <b>{item.student.fullName}</b> {t.rejectTail}
      </p>
      <label className="field">
        <span>{t.noteForStudent}</span>
        <textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <ErrorBox error={act.error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
        <button
          type="button"
          className="danger"
          disabled={act.isPending}
          onClick={() =>
            act.mutate(
              { path: `/classes/${classId}/assignments/${item.assignmentId}/late-submissions/${item.submissionId}/reject`, key: key.current, body: note.trim() ? { note: note.trim() } : {} },
              { onSuccess: onClose },
            )
          }
        >
          {act.isPending ? t.working : t.rejectZero}
        </button>
      </div>
    </Modal>
  );
}

/** I3 / 3.3: one class-wide revision of the same assignment; pending late work is accepted (D-I3-01). */
function ReviseDeadline({ classId, assignmentId, revision, dueAt, submissionId, onClose }: { classId: string; assignmentId: string; revision: number; dueAt: string; submissionId?: string; onClose: () => void }) {
  const act = useMutate<{ message: string; acceptedSubmissions: number }>();
  const key = useRef(idempotencyKey());
  return (
    <Modal title={t.extendTitle} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const note = String(form.get("note") ?? "").trim();
          act.mutate(
            {
              path: `/classes/${classId}/assignments/${assignmentId}/deadline-revisions`,
              key: key.current,
              body: { dueAt: new Date(String(form.get("dueAt"))).toISOString(), expectedRevision: revision, ...(note ? { note } : {}), ...(submissionId ? { submissionId } : {}) },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <p className="tiny muted">{t.extendNote(dateTime(dueAt))}</p>
        <Field label={t.newDue} name="dueAt" type="datetime-local" required min={toLocalInput(new Date().toISOString())} />
        <label className="field">
          <span>{t.noteOptional}</span>
          <textarea name="note" maxLength={1000} />
        </label>
        <ErrorBox error={act.error} />
        <button className="primary wide" disabled={act.isPending}>
          {act.isPending ? t.saving : t.extend}
        </button>
      </form>
    </Modal>
  );
}

type TestTrackingData = {
  deadlines: Array<{ revision: number; dueAt: string; note: string | null; createdAt: string }>;
  permittedDecisions: Array<"REJECT_ZERO" | "REVISE_DEADLINE_FOR_CLASS">;
  students: Array<TestState & { student: { id: string; fullName: string; username: string } }>;
};

/** I3 / 3.5: server-derived status of every original recipient of one assigned test. */
export function TestTracking({ classroom, assignment, onClose }: { classroom: ClassSummary; assignment: TeacherAssignment; onClose: () => void }) {
  const data = useQuery<TestTrackingData>({
    queryKey: ["test-status", classroom.id, assignment.id],
    queryFn: () => api(`/classes/${classroom.id}/assignments/${assignment.id}/test-status`),
  });
  const [rejecting, setRejecting] = useState<{ submissionId: string; student: { fullName: string } } | null>(null);
  const [extending, setExtending] = useState(false);
  const latest = data.data?.deadlines.at(-1);
  return (
    <>
    <Modal title={assignment.title} onClose={onClose}>
      <LoadError query={data} what={t.testStatus} />
      {data.data && latest && (
        <>
          <p>
            {t.currentDue} <b>{dateTime(latest.dueAt)}</b>
            {data.data.deadlines.length > 1 && ` · ${t.extendedTimes(data.data.deadlines.length - 1)}`}
          </p>
          {data.data.deadlines.length > 1 && (
            <details>
              <summary>{t.dueHistory}</summary>
              <ol>
                {data.data.deadlines.map((d) => (
                  <li key={d.revision}>
                    {dateTime(d.dueAt)} ({t.setAt(dateTime(d.createdAt))}){d.note ? ` · ${d.note}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {data.data.permittedDecisions.includes("REVISE_DEADLINE_FOR_CLASS") && (
            <button className="secondary" onClick={() => setExtending(true)}>
              {t.extendGroup}
            </button>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.student}</th>
                  <th>{t.status}</th>
                  <th>{t.currentSubmission}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data.data.students.map((row) => (
                  <tr key={row.student.id}>
                    <td>{row.student.fullName}</td>
                    <td>
                      <Badge tone={testStatusTone[row.status]}>{testStatusLabel[row.status]}</Badge>
                    </td>
                    <td>
                      {row.current ? (
                        <>
                          {dateTime(row.current.submittedAt)} · {submissionStatusLabel[row.current.status]}
                          {row.current.score !== null && ` · ${t.points(row.current.score)}`}
                          {row.current.lateReason && <small> · {t.reason} {row.current.lateReason}</small>}
                          {row.history.length > 1 && <small> · {t.submissions(row.history.length)}</small>}
                        </>
                      ) : (
                        t.notSubmitted
                      )}
                    </td>
                    <td>
                      {row.status === "LATE_REVIEW_PENDING" && row.current && (
                        <button className="danger-text" onClick={() => setRejecting({ submissionId: row.current!.id, student: row.student })}>
                          {t.reject}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted">{t.noAutoZero}</p>
        </>
      )}
    </Modal>
      {rejecting && <RejectLate classId={classroom.id} item={{ assignmentId: assignment.id, ...rejecting }} onClose={() => setRejecting(null)} />}
      {extending && latest && (
        <ReviseDeadline classId={classroom.id} assignmentId={assignment.id} revision={latest.revision} dueAt={latest.dueAt} onClose={() => setExtending(false)} />
      )}
    </>
  );
}
