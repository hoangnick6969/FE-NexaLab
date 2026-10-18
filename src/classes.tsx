import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Copy, KeyRound, Archive } from "lucide-react";
import { api, idempotencyKey, isApiError, mutate, useAuth } from "./api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal, verdictLabel } from "./ui";
import { PageHeading } from "./App";

type ClassSummary = {
  id: string;
  name: string;
  grade: number;
  status: "ACTIVE" | "ARCHIVED";
  requiresApproval: boolean;
  joinCode: { enabled: boolean; issued: boolean; rotatedAt: string | null };
  members: { approved: number; pending: number; removed: number };
  assignments: { active: number; archived: number };
};
type Enrollment = {
  classId: string;
  studentId: string;
  status: "pending" | "approved" | "removed";
  joinedAt: string;
  student: { id: string; fullName: string; username: string; grade: number; mustChangePassword: boolean };
};
type TeacherAssignment = {
  id: string;
  title: string;
  contentId: string;
  contentType: "lesson" | "lab";
  dueDate: string | null;
  overdue: boolean;
  audience: "CLASS" | "SUBSET";
  status: "ACTIVE" | "ARCHIVED";
  recipientCount: number;
};

export const dueLabel = (dueDate: string | null | undefined) =>
  dueDate ? "Hạn " + new Date(dueDate).toLocaleString("vi-VN") : "Không có hạn nộp";

const statusLabel = { approved: "Đã duyệt", pending: "Chờ duyệt", removed: "Đã rời lớp" } as const;

/** Mutation that invalidates every query and keeps one Idempotency-Key per attempt. */
function useMutate<T = any>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = "POST", body, key }: { path: string; method?: string; body?: unknown; key?: string }) =>
      key ? mutate<T>(path, method, body, key) : api<T>(path, method, body),
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** A failed read is never a dead end: show why and offer a retry. */
function LoadError({ query, what }: { query: { error: unknown; refetch: () => unknown; isFetching: boolean }; what: string }) {
  if (!query.error) return null;
  return (
    <div role="alert" className="error load-error">
      <span>
        Không tải được {what}. {query.error instanceof Error ? query.error.message : ""}
      </span>
      <button type="button" className="secondary" disabled={query.isFetching} onClick={() => query.refetch()}>
        {query.isFetching ? "Đang thử lại…" : "Thử lại"}
      </button>
    </div>
  );
}

/** CR-05 / MSG-41: destructive actions ask before they run. */
function Confirm({
  action,
  item,
  detail,
  onConfirm,
  onClose,
  pending,
  error,
}: {
  action: string;
  item: string;
  detail?: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  error?: unknown;
}) {
  return (
    <Modal title="Xác nhận thao tác" onClose={onClose}>
      <p>
        Bạn có chắc muốn {action} <b>{item}</b>?
      </p>
      {detail && <p className="tiny muted">{detail}</p>}
      <ErrorBox error={error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="danger" disabled={pending} onClick={onConfirm}>
          {pending ? "Đang xử lý…" : "Xác nhận"}
        </button>
      </div>
    </Modal>
  );
}

function ShownOnce({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="notice join-code-once" role="status">
      <b>Mã tham gia lớp</b>
      <p className="join-code-value">
        <code>{code}</code>
        <button
          type="button"
          className="icon-button"
          aria-label="Sao chép mã"
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        >
          <Copy size={16} />
        </button>
      </p>
      <p className="tiny">
        {copied ? "Đã sao chép. " : ""}Mã chỉ hiển thị một lần. Nếu làm mất, hãy tạo mã mới; mã cũ sẽ ngừng hoạt động ngay.
      </p>
      <button type="button" className="secondary" onClick={onDone}>
        Đã lưu mã
      </button>
    </div>
  );
}

export function Classes() {
  const user = useAuth((s) => s.user)!;
  return user.role === "STUDENT" ? <StudentClasses /> : <TeacherClasses />;
}

// ---------------- Teacher ----------------

function TeacherClasses() {
  const user = useAuth((s) => s.user)!;
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const createKey = useRef(idempotencyKey());
  const list = useQuery<ClassSummary[]>({
    queryKey: ["classes", status],
    queryFn: () => api("/classes?status=" + status),
  });
  const create = useMutate<{ class: ClassSummary; joinCode: string | null }>();
  const teacher = user.role === "TEACHER";
  return (
    <>
      <PageHeading
        eyebrow="CÙNG NHAU KHÁM PHÁ"
        title="Lớp học của tôi"
        description="Quản lý thành viên, mã tham gia và bài được giao cho từng lớp."
        action={
          teacher ? (
            <button
              className="primary"
              onClick={() => {
                createKey.current = idempotencyKey();
                create.reset();
                setIssuedCode(null);
                setCreating(true);
              }}
            >
              + Tạo lớp
            </button>
          ) : null
        }
      />
      <div className="tabs" role="tablist" aria-label="Trạng thái lớp">
        {(["ACTIVE", "ARCHIVED"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={status === value}
            className={status === value ? "active" : ""}
            onClick={() => {
              setStatus(value);
              setSelected(null);
            }}
          >
            {value === "ACTIVE" ? "Đang hoạt động" : "Đã lưu trữ"}
          </button>
        ))}
      </div>
      <LoadError query={list} what="danh sách lớp" />
      <div className="class-grid">
        {list.isLoading && <CardSkeleton count={3} />}
        {list.data?.map((c) => (
          <button
            key={c.id}
            className={"panel class-card " + (selected === c.id ? "selected" : "")}
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            <Users size={24} />
            <h3>{c.name}</h3>
            <p>
              Khối {c.grade} · {c.members.approved} thành viên
              {c.members.pending > 0 && ` · ${c.members.pending} chờ duyệt`}
            </p>
            <p>{c.assignments.active} bài đang giao</p>
            <div className="badge-row">
              {c.status === "ARCHIVED" ? (
                <Badge tone="outline">Đã lưu trữ</Badge>
              ) : (
                <Badge>{!c.joinCode.issued ? "Chưa có mã" : c.joinCode.enabled ? "Mã đang bật" : "Mã đã tắt"}</Badge>
              )}
              {c.requiresApproval && <Badge tone="outline">Cần duyệt</Badge>}
            </div>
          </button>
        ))}
      </div>
      {list.data && list.data.length === 0 && (
        <Empty>{status === "ACTIVE" ? "Chưa có lớp nào. Hãy tạo lớp đầu tiên." : "Chưa có lớp đã lưu trữ."}</Empty>
      )}
      {selected && teacher && list.data?.some((c) => c.id === selected) && (
        <ClassDetail classroom={list.data.find((c) => c.id === selected)!} />
      )}
      {creating && (
        <Modal title="Tạo lớp mới" onClose={() => setCreating(false)}>
          {issuedCode ? (
            <ShownOnce code={issuedCode} onDone={() => setCreating(false)} />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                create.mutate(
                  {
                    path: "/classes",
                    key: createKey.current,
                    body: {
                      name: String(form.get("name")),
                      grade: Number(form.get("grade")),
                      requiresApproval: form.get("requiresApproval") === "on",
                    },
                  },
                  {
                    onSuccess: (data) => {
                      setSelected(data.class.id);
                      setStatus("ACTIVE");
                      if (data.joinCode) setIssuedCode(data.joinCode);
                      else setCreating(false);
                    },
                  },
                );
              }}
            >
              <Field label="Tên lớp" name="name" required maxLength={200} />
              <label className="field">
                <span>Khối lớp</span>
                <select name="grade" defaultValue={8}>
                  {[6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" name="requiresApproval" />
                Học sinh vào bằng mã cần giáo viên duyệt
              </label>
              <ErrorBox error={create.error} />
              <button className="primary wide" disabled={create.isPending}>
                {create.isPending ? "Đang tạo…" : "Tạo lớp"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function ClassDetail({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [modal, setModal] = useState<"" | "edit" | "rotate" | "archive" | "code">("");
  const [code, setCode] = useState<string | null>(null);
  const act = useMutate();
  const close = () => {
    act.reset();
    setModal("");
  };
  return (
    <>
      <section className="panel" aria-labelledby="class-detail-title">
        <div className="section-heading">
          <div>
            <h2 id="class-detail-title">{classroom.name}</h2>
            <p className="tiny muted">
              Khối {classroom.grade} · {classroom.requiresApproval ? "Vào lớp bằng mã cần duyệt" : "Vào lớp bằng mã được duyệt ngay"}
            </p>
          </div>
          {!archived && (
            <div className="button-row">
              <button className="secondary" onClick={() => setModal("edit")}>
                Sửa lớp
              </button>
              <button className="secondary" onClick={() => setModal("rotate")}>
                <KeyRound size={16} /> {classroom.joinCode.issued ? "Tạo mã mới" : "Tạo mã tham gia"}
              </button>
              {classroom.joinCode.issued && (
                <button
                  className="secondary"
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate({ path: `/classes/${classroom.id}`, method: "PUT", body: { joinCodeEnabled: !classroom.joinCode.enabled } })
                  }
                >
                  {classroom.joinCode.enabled ? "Tắt mã" : "Bật mã"}
                </button>
              )}
              <button className="danger-text" onClick={() => setModal("archive")}>
                <Archive size={16} /> Lưu trữ lớp
              </button>
            </div>
          )}
        </div>
        {archived && (
          <p className="notice">
            Lớp đã lưu trữ: học sinh không còn mở được bài của lớp. Thành viên, bài đã giao và kết quả học tập vẫn được giữ.
          </p>
        )}
        {code && <ShownOnce code={code} onDone={() => setCode(null)} />}
        <ErrorBox error={!modal ? act.error : null} />
      </section>
      <Roster classroom={classroom} />
      <Assignments classroom={classroom} />
      {!archived && <PracticeAnalytics classId={classroom.id} />}
      {modal === "edit" && (
        <Modal title="Sửa lớp" onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              act.mutate(
                {
                  path: `/classes/${classroom.id}`,
                  method: "PUT",
                  body: {
                    name: String(form.get("name")),
                    grade: Number(form.get("grade")),
                    requiresApproval: form.get("requiresApproval") === "on",
                  },
                },
                { onSuccess: close },
              );
            }}
          >
            <Field label="Tên lớp" name="name" required defaultValue={classroom.name} maxLength={200} />
            <label className="field">
              <span>Khối lớp</span>
              <select name="grade" defaultValue={classroom.grade}>
                {[6, 7, 8, 9].map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" name="requiresApproval" defaultChecked={classroom.requiresApproval} />
              Học sinh vào bằng mã cần giáo viên duyệt
            </label>
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Lưu thay đổi
            </button>
          </form>
        </Modal>
      )}
      {modal === "rotate" && (
        <Confirm
          action="tạo mã tham gia mới cho"
          item={classroom.name}
          detail="Mã cũ sẽ ngừng hoạt động ngay. Học sinh đã trong lớp không bị ảnh hưởng."
          pending={act.isPending}
          error={act.error}
          onClose={close}
          onConfirm={() =>
            act.mutate(
              { path: `/classes/${classroom.id}/join-code/rotate` },
              {
                onSuccess: (data: any) => {
                  setCode(data.joinCode);
                  close();
                },
              },
            )
          }
        />
      )}
      {modal === "archive" && (
        <Confirm
          action="lưu trữ lớp"
          item={classroom.name}
          detail="Học sinh mất quyền vào mọi bài của lớp ngay lập tức. Lớp không nhận thêm thành viên hay bài giao. Dữ liệu và kết quả học tập được giữ nguyên."
          pending={act.isPending}
          error={act.error}
          onClose={close}
          onConfirm={() => act.mutate({ path: `/classes/${classroom.id}/archive`, body: { confirm: true } }, { onSuccess: close })}
        />
      )}
    </>
  );
}

function Roster({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [tab, setTab] = useState<"approved" | "pending" | "removed">(classroom.members.pending ? "pending" : "approved");
  const [modal, setModal] = useState<"" | "provision" | "enroll" | "credentials">("");
  const [credentials, setCredentials] = useState<any>(null);
  const [confirm, setConfirm] = useState<Enrollment | null>(null);
  const formKey = useRef(idempotencyKey());
  const roster = useQuery<Enrollment[]>({
    queryKey: ["roster", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/students`),
  });
  const act = useMutate();
  const rows = roster.data?.filter((e) => e.status === tab) ?? [];
  const open = (next: typeof modal) => {
    formKey.current = idempotencyKey();
    act.reset();
    setCredentials(null);
    setModal(next);
  };
  return (
    <section className="panel" aria-labelledby="roster-title">
      <div className="section-heading">
        <h2 id="roster-title">Thành viên lớp</h2>
        {!archived && (
          <div className="button-row">
            <button className="secondary" onClick={() => open("enroll")}>
              Ghi danh tài khoản có sẵn
            </button>
            <button className="primary" onClick={() => open("provision")}>
              Cấp tài khoản học sinh
            </button>
          </div>
        )}
      </div>
      <div className="tabs" role="tablist" aria-label="Trạng thái thành viên">
        {(["approved", "pending", "removed"] as const).map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
            {statusLabel[value]} ({roster.data?.filter((e) => e.status === value).length ?? 0})
          </button>
        ))}
      </div>
      <LoadError query={roster} what="danh sách thành viên" />
      <ErrorBox error={!modal && !confirm ? act.error : null} />
      {roster.isLoading && <p className="muted">Đang tải danh sách…</p>}
      {roster.data && rows.length === 0 && (
        <Empty>
          {tab === "pending" ? "Không có yêu cầu chờ duyệt." : tab === "removed" ? "Chưa có học sinh rời lớp." : "Lớp chưa có thành viên đã duyệt."}
        </Empty>
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.studentId}>
                  <td>
                    {e.student.fullName}
                    <small>Tài khoản: {e.student.username}</small>
                  </td>
                  <td>
                    <Badge tone={e.status === "approved" ? "" : "outline"}>{statusLabel[e.status]}</Badge>
                    {e.student.mustChangePassword && <small>Chưa đổi mật khẩu tạm</small>}
                  </td>
                  <td>
                    {!archived && e.status === "pending" && (
                      <button
                        className="text-button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ path: `/classes/${classroom.id}/students/${e.studentId}`, method: "PUT", body: { status: "approved" } })}
                      >
                        Duyệt
                      </button>
                    )}
                    {!archived && e.status !== "removed" && (
                      <>
                        {e.status === "approved" && (
                          <button
                            className="text-button"
                            onClick={() => {
                              act.reset();
                              setCredentials(null);
                              setModal("credentials");
                              act.mutate(
                                { path: `/classes/${classroom.id}/students/${e.studentId}/reset-password` },
                                { onSuccess: (data: any) => setCredentials(data.credentials) },
                              );
                            }}
                          >
                            Cấp lại mật khẩu
                          </button>
                        )}
                        <button className="danger-text" onClick={() => setConfirm(e)}>
                          {e.status === "pending" ? "Từ chối" : "Xóa khỏi lớp"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm && (
        <Confirm
          action={confirm.status === "pending" ? "từ chối yêu cầu của" : "xóa khỏi lớp"}
          item={confirm.student.fullName}
          detail="Học sinh mất quyền vào bài của lớp ngay. Kết quả học tập đã có vẫn được giữ."
          pending={act.isPending}
          error={act.error}
          onClose={() => {
            act.reset();
            setConfirm(null);
          }}
          onConfirm={() =>
            act.mutate(
              { path: `/classes/${classroom.id}/students/${confirm.studentId}`, method: "PUT", body: { status: "removed", confirm: true } },
              { onSuccess: () => setConfirm(null) },
            )
          }
        />
      )}
      {modal === "provision" && (
        <Modal title="Cấp tài khoản học sinh" onClose={() => setModal("")}>
          {credentials ? (
            <CredentialNotice credentials={credentials} onDone={() => setModal("")} />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                act.mutate(
                  {
                    path: `/classes/${classroom.id}/students`,
                    key: formKey.current,
                    body: { username: String(form.get("username")), fullName: String(form.get("fullName")), grade: Number(form.get("grade")), consent: true },
                  },
                  { onSuccess: (data: any) => (data.credentials ? setCredentials(data.credentials) : setModal("")) },
                );
              }}
            >
              <Field label="Tên đăng nhập" name="username" required autoComplete="off" minLength={3} maxLength={32} />
              <Field label="Họ tên" name="fullName" required maxLength={200} />
              <label className="field">
                <span>Khối lớp</span>
                <select name="grade" defaultValue={classroom.grade}>
                  {[6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" required />
                Nhà trường đã có chấp thuận xử lý dữ liệu học sinh.
              </label>
              <ErrorBox error={act.error} />
              <button className="primary wide" disabled={act.isPending}>
                Cấp tài khoản
              </button>
            </form>
          )}
        </Modal>
      )}
      {modal === "enroll" && (
        <Modal title="Ghi danh tài khoản có sẵn" onClose={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              act.mutate(
                { path: `/classes/${classroom.id}/enrollments`, key: formKey.current, body: { username: String(form.get("username")) } },
                { onSuccess: () => setModal("") },
              );
            }}
          >
            <Field label="Tên đăng nhập học sinh" name="username" required autoComplete="off" />
            <p className="tiny muted">Học sinh được duyệt vào lớp ngay. Bài đã giao trước đó không tự động thêm cho học sinh mới.</p>
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Ghi danh
            </button>
          </form>
        </Modal>
      )}
      {modal === "credentials" && (
        <Modal title="Cấp lại mật khẩu học sinh" onClose={() => setModal("")}>
          <ErrorBox error={act.error} />
          {credentials ? <CredentialNotice credentials={credentials} onDone={() => setModal("")} /> : !act.error && <div className="notice">Đang tạo mật khẩu tạm mới…</div>}
        </Modal>
      )}
    </section>
  );
}

function CredentialNotice({ credentials, onDone }: { credentials: { username: string; temporaryPassword: string; expiresAt: string }; onDone: () => void }) {
  return (
    <div className="notice" role="status">
      <b>Thông tin đăng nhập</b>
      <p>
        Tên đăng nhập: <code>{credentials.username}</code>
      </p>
      <p>
        Mật khẩu tạm: <code>{credentials.temporaryPassword}</code>
      </p>
      <p>Hạn dùng: {new Date(credentials.expiresAt).toLocaleString("vi-VN")}</p>
      <p className="tiny">Hãy lưu và gửi riêng cho học sinh. Mật khẩu sẽ không hiển thị lại.</p>
      <button type="button" className="secondary" onClick={onDone}>
        Đã lưu thông tin
      </button>
    </div>
  );
}

function Assignments({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<TeacherAssignment | null>(null);
  const [archiving, setArchiving] = useState<TeacherAssignment | null>(null);
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
          {a.contentType === "lab" ? "Phòng lab" : "Bài học"} · {dueLabel(a.dueDate)} · {a.recipientCount} học sinh
          {a.audience === "SUBSET" ? " (nhóm)" : " (cả lớp)"}
        </small>
        {a.overdue && a.status === "ACTIVE" && <Badge tone="outline">Quá hạn</Badge>}
      </div>
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
              act.mutate(
                {
                  path: `/classes/${classroom.id}/assignments/${editing.id}`,
                  method: "PUT",
                  body: { title: String(form.get("title")), dueDate: due ? new Date(due).toISOString() : null },
                },
                { onSuccess: () => setEditing(null) },
              );
            }}
          >
            <Field label="Tên nhiệm vụ" name="title" required defaultValue={editing.title} />
            <Field label="Hạn nộp (có thể để trống)" name="dueDate" type="datetime-local" defaultValue={editing.dueDate ? toLocalInput(editing.dueDate) : ""} />
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Lưu thay đổi
            </button>
          </form>
        </Modal>
      )}
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

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function AssignModal({ classroom, onClose, onAssigned }: { classroom: ClassSummary; onClose: () => void; onAssigned: (message: string) => void }) {
  const [contentType, setContentType] = useState<"lesson" | "lab">("lesson");
  const [scope, setScope] = useState<"CLASS" | "SUBSET">("CLASS");
  const key = useRef(idempotencyKey());
  const content = useQuery<{ lessons: any[]; labs: any[] }>({
    queryKey: ["assignable", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/assignable-content`),
  });
  const roster = useQuery<Enrollment[]>({
    queryKey: ["roster", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/students`),
  });
  const approved = roster.data?.filter((e) => e.status === "approved") ?? [];
  const act = useMutate<{ recipientCount: number; message: string }>();
  const options = contentType === "lesson" ? content.data?.lessons ?? [] : content.data?.labs ?? [];
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
        </fieldset>
        <label className="field">
          <span>Nội dung đã xuất bản</span>
          <select name="contentId" required key={contentType}>
            {options.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.title} · Khối {item.grade}
                {item.synthetic ? " · dữ liệu mẫu" : ""}
                {item.scope === "TEACHER_PRIVATE" ? " · bản riêng" : ""}
              </option>
            ))}
          </select>
        </label>
        <LoadError query={content} what="nội dung có thể giao" />
        {content.data && options.length === 0 && <p className="notice">Chưa có nội dung đã xuất bản. Hãy xuất bản nội dung trước khi giao.</p>}
        <Field label="Tên nhiệm vụ (để trống sẽ dùng tên nội dung)" name="title" maxLength={200} />
        <Field label="Hạn nộp (không bắt buộc)" name="dueDate" type="datetime-local" />
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

// ---------------- Student ----------------

type StudentClass = {
  id: string;
  name: string;
  grade: number;
  status: "ACTIVE" | "ARCHIVED";
  enrollmentStatus: "approved" | "pending";
  assignments: Array<{ id: string; title: string; contentType: string; dueDate: string | null; overdue: boolean }>;
};

function StudentClasses() {
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<{ message: string; pending: boolean } | null>(null);
  const key = useRef(idempotencyKey());
  const list = useQuery<StudentClass[]>({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const join = useMutate<{ enrollmentStatus: string; message: string; class: { name: string } }>();
  const joinError = join.error
    ? isApiError(join.error, "JOIN_RATE_LIMITED")
      ? "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút."
      : isApiError(join.error, "JOIN_CODE_INVALID")
        ? "Mã lớp không hợp lệ. Hãy kiểm tra lại với giáo viên."
        : join.error
    : null;
  return (
    <>
      <PageHeading
        eyebrow="CLASS SPACE"
        title="Class Space của em"
        description="Xem các lớp em tham gia, trạng thái thành viên và bài được giao."
        action={
          <button
            className="primary"
            onClick={() => {
              key.current = idempotencyKey();
              join.reset();
              setResult(null);
              setJoining(true);
            }}
          >
            Tham gia bằng mã
          </button>
        }
      />
      {result && (
        <p className="notice" role="status">
          {result.message}
        </p>
      )}
      <LoadError query={list} what="danh sách lớp" />
      {list.isLoading && <CardSkeleton count={2} />}
      {list.data && list.data.length === 0 && <Empty>Em chưa tham gia lớp nào. Hãy nhập mã lớp thầy cô gửi.</Empty>}
      {list.data?.map((c) => (
        <section className="panel" key={c.id}>
          <div className="section-heading">
            <h2>{c.name}</h2>
            <Badge tone={c.enrollmentStatus === "approved" ? "" : "outline"}>
              {c.status === "ARCHIVED" ? "Lớp đã lưu trữ" : c.enrollmentStatus === "approved" ? "Đã vào lớp" : "Chờ giáo viên duyệt"}
            </Badge>
          </div>
          {c.enrollmentStatus === "pending" && <p className="muted">Yêu cầu của em đang chờ giáo viên duyệt.</p>}
          {c.enrollmentStatus === "approved" && c.assignments.length === 0 && <p className="muted">Hiện chưa có bài được giao.</p>}
          {c.assignments.map((a) => (
            <div className="assignment-row" key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>
                  {dueLabel(a.dueDate)}
                  {a.overdue && " · Đã quá hạn, vẫn có thể học"}
                </small>
              </div>
              <Link to={"/assignments/" + a.id}>Mở bài →</Link>
            </div>
          ))}
        </section>
      ))}
      {joining && (
        <Modal title="Tham gia lớp" onClose={() => setJoining(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              join.mutate(
                { path: "/classes/join", key: key.current, body: { code } },
                {
                  onSuccess: (data) => {
                    setResult({ message: `${data.class.name}: ${data.message}`, pending: data.enrollmentStatus === "pending" });
                    setJoining(false);
                  },
                },
              );
            }}
          >
            <Field
              label="Mã tham gia lớp"
              name="code"
              required
              autoComplete="off"
              placeholder="NL-XXXXXX-XXXXXXXXXX"
              maxLength={40}
              onChange={() => {
                // A new code is a new request; retries of the same code keep the key.
                key.current = idempotencyKey();
              }}
            />
            <ErrorBox error={joinError} />
            <button className="primary wide" disabled={join.isPending}>
              {join.isPending ? "Đang gửi…" : "Tham gia"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function PracticeAnalytics({ classId }: { classId: string }) {
  const assignments = useQuery<TeacherAssignment[]>({ queryKey: ["class-assignments", classId], queryFn: () => api(`/classes/${classId}/assignments`) });
  const [assignmentId, setAssignmentId] = useState("");
  const selectedId = assignmentId || assignments.data?.find((item) => item.status === "ACTIVE")?.id || "";
  const board = useQuery<any[]>({
    queryKey: ["assignment-progress", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/progress`),
    enabled: Boolean(selectedId),
  });
  const support = useQuery<any[]>({
    queryKey: ["assignment-support", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/support`),
    enabled: Boolean(selectedId),
  });
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const evidence = useQuery<any>({
    queryKey: ["student-evidence", classId, selectedId, openStudent],
    queryFn: () => api(`/classes/${classId}/students/${openStudent}/evidence?assignmentId=${encodeURIComponent(selectedId)}`),
    enabled: Boolean(selectedId && openStudent),
  });
  const flags = new Map((support.data ?? []).map((row: any) => [row.student.id, row.flags]));
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">BẰNG CHỨNG THEO BÀI GIAO</p><h2>Theo dõi và hỗ trợ học sinh</h2></div></div>
      <label className="field"><span>Bài đã giao</span><select value={selectedId} onChange={(event) => { setAssignmentId(event.target.value); setOpenStudent(null); }}>
        <option value="">Chọn bài</option>
        {assignments.data?.map((item) => <option key={item.id} value={item.id}>{item.title}{item.status === "ARCHIVED" ? " (đã lưu trữ)" : ""}</option>)}
      </select></label>
      <LoadError query={assignments} what="danh sách bài giao" />
      <LoadError query={board} what="bảng tiến độ" />
      {selectedId && board.data?.length === 0 && <Empty>Chưa có học sinh trong phạm vi bài giao.</Empty>}
      {board.data?.map((row: any) => (
        <div className="analytics-student" key={row.student.id}>
          <div className="section-heading"><div><h3>{row.student.fullName}</h3><p>{typeof row.percent === "number" ? `${row.completedRequired}/${row.totalRequired} bước · ${row.percent}%` : `${row.attempts} lượt thực hành · ${row.passed ? "Đã đạt" : verdictLabel(row.latestVerdict)}`}</p></div>
          <button className="secondary" onClick={() => setOpenStudent(openStudent === row.student.id ? null : row.student.id)}>Xem bằng chứng</button></div>
          {(flags.get(row.student.id) as any[] | undefined)?.map((flag: any) => <div className="notice" key={flag.code}><b>Cần hỗ trợ:</b> {flag.message}<small>{flag.evidenceIds?.length ? ` · ${flag.evidenceIds.length} bằng chứng` : ""}</small></div>)}
          {openStudent === row.student.id && <div className="attempt-evidence"><LoadError query={evidence} what="bằng chứng học tập" />{evidence.data && <>
            <p>{evidence.data.stepProgress.length} tiến trình bước · {evidence.data.quizAttempts.length} lần kiểm tra · {evidence.data.practicalAttempts.length} lần thực hành</p>
            {evidence.data.quizAttempts.map((item: any) => <p key={item.id}>Kiểm tra {item.score}% · {item.passed ? "Đạt" : "Chưa đạt"} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>)}
            {evidence.data.practicalAttempts.map((item: any) => <p key={item.id}>Thực hành · {verdictLabel(item.verdict)} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>)}
          </>}</div>}
        </div>
      ))}
    </section>
  );
}
