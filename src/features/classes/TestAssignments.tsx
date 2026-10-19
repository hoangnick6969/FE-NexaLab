import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, ErrorBox, Field, Modal } from "../../components/ui";
import { dateTime, submissionStatusLabel, testStatusLabel, testStatusTone, type TestState } from "../../lib/test-status";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import { LoadError, toLocalInput, useMutate } from "./class-ui";

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
      <h2 id="late-queue-title">Bài nộp trễ chờ duyệt</h2>
      <LoadError query={queue} what="danh sách bài nộp trễ" />
      {queue.data?.map((item) => (
        <div className="assignment-row" key={item.submissionId}>
          <div>
            <b>{item.student.fullName}</b> · {item.assignmentTitle}
            <small>
              Nộp lúc {dateTime(item.submittedAt)} · Hạn hiện tại {dateTime(item.dueAt)}
            </small>
            <small>Lý do: {item.lateReason}</small>
          </div>
          <div className="button-row">
            {item.permittedDecisions.includes("REVISE_DEADLINE_FOR_CLASS") && (
              <button className="text-button" onClick={() => setExtending(item)}>
                Dời hạn cho cả nhóm
              </button>
            )}
            <button className="danger-text" onClick={() => setRejecting(item)}>
              Từ chối (0 điểm)
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
    <Modal title="Từ chối bài nộp trễ" onClose={onClose}>
      <p>
        Bài nộp trễ của <b>{item.student.fullName}</b> sẽ nhận 0 điểm và được ghi là chưa đạt. Bài nộp và lý do vẫn được lưu.
      </p>
      <label className="field">
        <span>Ghi chú cho học sinh (không bắt buộc)</span>
        <textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <ErrorBox error={act.error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>Hủy</button>
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
          {act.isPending ? "Đang xử lý…" : "Từ chối, ghi 0 điểm"}
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
    <Modal title="Dời hạn nộp cho cả nhóm" onClose={onClose}>
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
        <p className="tiny muted">Hạn hiện tại: {dateTime(dueAt)}. Hạn mới áp dụng cho toàn bộ học sinh đã được giao bài này, kể cả em đã nộp; mọi bài nộp trễ đang chờ duyệt sẽ được chấp nhận. Lịch sử hạn nộp và bài nộp trước vẫn được giữ.</p>
        <Field label="Hạn nộp mới" name="dueAt" type="datetime-local" required min={toLocalInput(new Date().toISOString())} />
        <label className="field">
          <span>Ghi chú (không bắt buộc)</span>
          <textarea name="note" maxLength={1000} />
        </label>
        <ErrorBox error={act.error} />
        <button className="primary wide" disabled={act.isPending}>
          {act.isPending ? "Đang lưu…" : "Dời hạn"}
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
      <LoadError query={data} what="trạng thái bài kiểm tra" />
      {data.data && latest && (
        <>
          <p>
            Hạn hiện tại: <b>{dateTime(latest.dueAt)}</b>
            {data.data.deadlines.length > 1 && ` · đã dời ${data.data.deadlines.length - 1} lần`}
          </p>
          {data.data.deadlines.length > 1 && (
            <details>
              <summary>Lịch sử hạn nộp</summary>
              <ol>
                {data.data.deadlines.map((d) => (
                  <li key={d.revision}>
                    {dateTime(d.dueAt)} (đặt lúc {dateTime(d.createdAt)}){d.note ? ` · ${d.note}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {data.data.permittedDecisions.includes("REVISE_DEADLINE_FOR_CLASS") && (
            <button className="secondary" onClick={() => setExtending(true)}>
              Dời hạn cho cả nhóm
            </button>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Trạng thái</th>
                  <th>Bài nộp hiện tại</th>
                  <th>Thao tác</th>
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
                          {row.current.score !== null && ` · ${row.current.score} điểm`}
                          {row.current.lateReason && <small> · Lý do: {row.current.lateReason}</small>}
                          {row.history.length > 1 && <small> · {row.history.length} lần nộp</small>}
                        </>
                      ) : (
                        "Chưa nộp"
                      )}
                    </td>
                    <td>
                      {row.status === "LATE_REVIEW_PENDING" && row.current && (
                        <button className="danger-text" onClick={() => setRejecting({ submissionId: row.current!.id, student: row.student })}>
                          Từ chối (0 điểm)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted">Quá hạn mà chưa nộp không tự bị chấm 0 điểm.</p>
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
