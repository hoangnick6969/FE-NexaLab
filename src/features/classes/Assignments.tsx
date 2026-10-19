import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { type AssignableType, type ClassSummary, type Enrollment, type TeacherAssignment } from "./class-types";
import { Confirm, LoadError, dueLabel, toLocalInput, useMutate } from "./class-ui";
import { TestTracking } from "./TestAssignments";

const contentTypeLabel: Record<AssignableType, string> = { lesson: "Bài học", lab: "Phòng lab", test: "Bài kiểm tra" };

export function Assignments({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<TeacherAssignment | null>(null);
  const [archiving, setArchiving] = useState<TeacherAssignment | null>(null);
  const [tracking, setTracking] = useState<TeacherAssignment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useQuery<TeacherAssignment[]>({
    queryKey: ["class-assignments", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/assignments`),
  });
  const act = useMutate();
  const active = list.data?.filter((a) => a.status === "ACTIVE") ?? [];
  const past = list.data?.filter((a) => a.status === "ARCHIVED") ?? [];
  const row = (a: TeacherAssignment) => (
    <div className="assignment-row" key={a.id}>
      <div>
        <b>{a.title}</b>
        <small>
          {contentTypeLabel[a.contentType]} · {dueLabel(a.dueDate)} · {a.recipientCount} học sinh
          {a.audience === "SUBSET" ? " (nhóm)" : " (cả lớp)"}
        </small>
        {a.testSummary && (
          <small>
            Đã nộp {a.testSummary.counts.SUBMITTED} · Chờ duyệt {a.testSummary.counts.LATE_REVIEW_PENDING} · Bị từ chối {a.testSummary.counts.REJECTED} · Quá hạn chưa nộp {a.testSummary.counts.OVERDUE_UNSUBMITTED}
          </small>
        )}
        {a.testSummary?.extended && <Badge tone="gold">Đã dời hạn (lần {a.testSummary.revision - 1})</Badge>}
        {a.overdue && a.status === "ACTIVE" && <Badge tone="outline">Quá hạn</Badge>}
      </div>
      {a.contentType === "test" && (
        <button className="text-button" onClick={() => setTracking(a)}>
          Theo dõi bài nộp
        </button>
      )}
      {a.status === "ACTIVE" && !archived && (
        <div className="button-row">
          <button className="text-button" onClick={() => { act.reset(); setEditing(a); }}>
            Sửa
          </button>
          <button className="danger-text" onClick={() => { act.reset(); setArchiving(a); }}>
            Lưu trữ
          </button>
        </div>
      )}
    </div>
  );
  return (
    <section className="panel" aria-labelledby="assignments-title">
      <div className="section-heading">
        <h2 id="assignments-title">Bài đã giao</h2>
        {!archived && (
          <button className="primary" onClick={() => { setNotice(null); setAssigning(true); }}>
            Giao bài
          </button>
        )}
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      <LoadError query={list} what="danh sách bài đã giao" />
      {list.data && active.length === 0 && <Empty>Chưa có bài đang giao.</Empty>}
      {active.map(row)}
      {past.length > 0 && (
        <details>
          <summary>Bài đã lưu trữ ({past.length})</summary>
          {past.map(row)}
        </details>
      )}
      {assigning && (
        <AssignModal
          classroom={classroom}
          onClose={() => setAssigning(false)}
          onAssigned={(message) => {
            setNotice(message);
            setAssigning(false);
          }}
        />
      )}
      {editing && (
        <Modal title="Sửa bài đã giao" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const due = String(form.get("dueDate") ?? "");
              const title = String(form.get("title"));
              act.mutate(
                {
                  path: `/classes/${classroom.id}/assignments/${editing.id}`,
                  method: "PUT",
                  // A test's deadline only moves through a class-wide deadline revision.
                  body: editing.contentType === "test" ? { title } : { title, dueDate: due ? new Date(due).toISOString() : null },
                },
                { onSuccess: () => setEditing(null) },
              );
            }}
          >
            <Field label="Tên nhiệm vụ" name="title" required defaultValue={editing.title} />
            {editing.contentType === "test" ? (
              <p className="tiny muted">{dueLabel(editing.dueDate)}. Hạn nộp và danh sách học sinh của bài kiểm tra được chốt khi giao.</p>
            ) : (
              <Field label="Hạn nộp (có thể để trống)" name="dueDate" type="datetime-local" defaultValue={editing.dueDate ? toLocalInput(editing.dueDate) : ""} />
            )}
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Lưu thay đổi
            </button>
          </form>
        </Modal>
      )}
      {tracking && <TestTracking classroom={classroom} assignment={tracking} onClose={() => setTracking(null)} />}
      {archiving && (
        <Confirm
          action="lưu trữ bài"
          item={archiving.title}
          detail="Bài rời khỏi danh sách của học sinh. Kết quả học tập đã có vẫn còn trong lịch sử."
          pending={act.isPending}
          error={act.error}
          onClose={() => setArchiving(null)}
          onConfirm={() =>
            act.mutate({ path: `/classes/${classroom.id}/assignments/${archiving.id}/archive`, body: { confirm: true } }, { onSuccess: () => setArchiving(null) })
          }
        />
      )}
    </section>
  );
}

function AssignModal({ classroom, onClose, onAssigned }: { classroom: ClassSummary; onClose: () => void; onAssigned: (message: string) => void }) {
  const [contentType, setContentType] = useState<AssignableType>("lesson");
  const [scope, setScope] = useState<"CLASS" | "SUBSET">("CLASS");
  const key = useRef(idempotencyKey());
  const content = useQuery<{ lessons: any[]; labs: any[]; tests?: any[] }>({
    queryKey: ["assignable", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/assignable-content`),
  });
  const roster = useQuery<Enrollment[]>({
    queryKey: ["roster", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/students`),
  });
  const approved = roster.data?.filter((e) => e.status === "approved") ?? [];
  const act = useMutate<{ recipientCount: number; message: string }>();
  const options = contentType === "lesson" ? content.data?.lessons ?? [] : contentType === "lab" ? content.data?.labs ?? [] : content.data?.tests ?? [];
  const isTest = contentType === "test";
  return (
    <Modal title="Giao bài" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const due = String(form.get("dueDate") ?? "");
          const title = String(form.get("title") ?? "").trim();
          act.mutate(
            {
              path: `/classes/${classroom.id}/assignments`,
              key: key.current,
              body: {
                contentType,
                contentId: String(form.get("contentId")),
                ...(title ? { title } : {}),
                dueDate: due ? new Date(due).toISOString() : null,
                studentIds: scope === "SUBSET" ? form.getAll("studentIds").map(String) : [],
              },
            },
            { onSuccess: (data) => onAssigned(data.message) },
          );
        }}
      >
        <fieldset className="segmented">
          <legend>Loại nội dung</legend>
          <label className="check">
            <input type="radio" name="contentType" checked={contentType === "lesson"} onChange={() => setContentType("lesson")} />
            Bài học
          </label>
          <label className="check">
            <input type="radio" name="contentType" checked={contentType === "lab"} onChange={() => setContentType("lab")} />
            Bài thực hành (lab)
          </label>
          <label className="check">
            <input type="radio" name="contentType" checked={isTest} onChange={() => setContentType("test")} />
            Bài kiểm tra
          </label>
        </fieldset>
        <label className="field">
          <span>Nội dung đã xuất bản</span>
          <select name="contentId" required key={contentType}>
            {options.map((item: any) => (
              <option key={item.id} value={item.id}>
                {isTest ? `${item.title} · phiên bản ${item.version} · ${item.questionCount} câu` : `${item.title} · Khối ${item.grade}`}
                {item.synthetic ? " · dữ liệu mẫu" : ""}
                {item.scope === "TEACHER_PRIVATE" ? " · bản riêng" : ""}
              </option>
            ))}
          </select>
        </label>
        <LoadError query={content} what="nội dung có thể giao" />
        {content.data && options.length === 0 && (
          <p className="notice">
            {isTest ? "Chưa có bài kiểm tra đã xuất bản trong Class Space. Hãy xuất bản bài kiểm tra trước khi giao." : "Chưa có nội dung đã xuất bản. Hãy xuất bản nội dung trước khi giao."}
          </p>
        )}
        {isTest && <p className="tiny muted">Chia sẻ bài kiểm tra trong Class Space không tạo bài giao. Chỉ học sinh được giao mới làm và nộp bài.</p>}
        <Field label="Tên nhiệm vụ (để trống sẽ dùng tên nội dung)" name="title" maxLength={200} />
        <Field label={isTest ? "Hạn nộp (bắt buộc)" : "Hạn nộp (không bắt buộc)"} name="dueDate" type="datetime-local" required={isTest} key={contentType} />
        <fieldset className="segmented">
          <legend>Giao cho</legend>
          <label className="check">
            <input type="radio" name="scope" checked={scope === "CLASS"} onChange={() => setScope("CLASS")} />
            Cả lớp ({approved.length} học sinh đã duyệt)
          </label>
          <label className="check">
            <input type="radio" name="scope" checked={scope === "SUBSET"} onChange={() => setScope("SUBSET")} />
            Một nhóm học sinh
          </label>
        </fieldset>
        {scope === "SUBSET" &&
          approved.map((e) => (
            <label className="check" key={e.studentId}>
              <input type="checkbox" name="studentIds" value={e.studentId} />
              {e.student.fullName}
            </label>
          ))}
        <p className="tiny muted">Danh sách người nhận được chốt khi giao; học sinh vào lớp sau sẽ không tự nhận bài này.</p>
        <ErrorBox error={act.error} />
        <button className="primary wide" disabled={act.isPending || !options.length}>
          {act.isPending ? "Đang giao…" : "Giao bài"}
        </button>
      </form>
    </Modal>
  );
}
