import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Archive, Ban, CheckCircle2, CircleSlash, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { api, isApiError } from "./api";
import { Badge, ErrorBox, Field, Modal, useAction } from "./ui";
import { PageHeading } from "./App";

/**
 * Epic C2 admin console. Every screen reads the real `/admin/*` API; every
 * destructive or privilege-sensitive action asks for a reason in a dialog that
 * names its effect on access and history. Status is always text + icon.
 */
type Tab = "overview" | "users" | "taxonomy" | "content" | "simulations" | "assets" | "audit";
const TABS: Array<[Tab, string]> = [
  ["overview", "Tổng quan"],
  ["users", "Người dùng"],
  ["taxonomy", "Phân loại"],
  ["content", "Nội dung"],
  ["simulations", "Mô phỏng"],
  ["assets", "Tệp"],
  ["audit", "Nhật ký"],
];
const ROLE_LABEL: Record<string, string> = { STUDENT: "Học sinh", TEACHER: "Giáo viên", PARENT: "Phụ huynh", ADMIN: "Quản trị viên" };
const LESSON_STATUS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
  quarantined: "Đang cách ly",
};
const SCOPE_LABEL: Record<string, string> = { TEACHER_PRIVATE: "Riêng của giáo viên", SHARED_LIBRARY: "Thư viện chung" };
const VERDICT_LABEL: Record<string, string> = {
  passed: "Đạt",
  partial: "Đạt một phần",
  needs_practice: "Cần luyện thêm",
  invalid: "Trạng thái không hợp lệ",
};
const LICENSE_LABEL: Record<string, string> = {
  ORIGINAL: "NexaLab tự biên soạn",
  CC0: "CC0",
  CC_BY: "CC BY",
  CC_BY_SA: "CC BY-SA",
  SCHOOL_OWNED: "Nhà trường sở hữu",
};
const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  const text = search.toString();
  return text ? "?" + text : "";
};
const when = (value?: string | null) => (value ? new Date(value).toLocaleString("vi-VN") : "—");

/** Text + icon status; never colour alone. */
function Status({ value }: { value: string }) {
  const map: Record<string, [string, string, JSX.Element]> = {
    active: ["Đang hoạt động", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    disabled: ["Đã vô hiệu hóa", "not_passed", <Ban size={13} aria-hidden key="i" />],
    READY: ["Sẵn sàng", "passed", <ShieldCheck size={13} aria-hidden key="i" />],
    QUARANTINED: ["Đang cách ly", "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    quarantined: ["Đang cách ly", "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    published: ["Đã xuất bản", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    draft: ["Bản nháp", "outline", <CircleSlash size={13} aria-hidden key="i" />],
    archived: ["Đã lưu trữ", "outline", <Archive size={13} aria-hidden key="i" />],
    retired: ["Đã thay thế", "outline", <Archive size={13} aria-hidden key="i" />],
    success: ["Thành công", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    denied: ["Bị từ chối", "not_passed", <Ban size={13} aria-hidden key="i" />],
    failure: ["Thất bại", "partial", <AlertTriangle size={13} aria-hidden key="i" />],
  };
  const [label, tone, icon] = map[value] ?? [value, "outline", null];
  return (
    <Badge tone={tone}>
      <span className="admin-status">
        {icon}
        {label}
      </span>
    </Badge>
  );
}

/** Loading, error (with retry), stale and empty states for one query. */
function QueryState({ query, empty, children }: { query: any; empty?: boolean; children: React.ReactNode }) {
  if (query.isLoading)
    return (
      <p className="muted" role="status">
        Đang tải…
      </p>
    );
  if (query.error && !query.data)
    return (
      <div className="load-error" role="alert">
        <ErrorBox error={query.error} />
        <button type="button" className="secondary" onClick={() => query.refetch()}>
          <RefreshCw size={14} aria-hidden /> Thử lại
        </button>
      </div>
    );
  return (
    <>
      {query.isFetching && (
        <p className="tiny muted admin-stale" role="status">
          Đang cập nhật dữ liệu mới nhất…
        </p>
      )}
      {query.error && (
        <p className="tiny muted" role="alert">
          Không làm mới được; đang hiển thị dữ liệu trước đó.
        </p>
      )}
      {empty ? <p className="empty">Không có dữ liệu phù hợp.</p> : children}
    </>
  );
}

/** Reason dialog for every destructive or privilege-sensitive action (C2-T6). */
function ReasonDialog({
  title,
  effect,
  confirmLabel,
  onSubmit,
  onClose,
  pending,
  error,
  children,
  danger = true,
}: {
  title: string;
  effect: React.ReactNode;
  confirmLabel: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
  pending?: boolean;
  error?: unknown;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="admin-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason.trim());
        }}
      >
        <div className="notice admin-effect">{effect}</div>
        {children}
        <label className="field">
          <span>Lý do (bắt buộc, được ghi vào nhật ký kiểm toán)</span>
          <textarea required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <ErrorBox error={error} />
        <div className="button-row">
          <button type="button" className="secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={danger ? "danger" : "primary"} disabled={pending || reason.trim().length < 3}>
            {pending ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function usePaged(key: unknown[], path: string, params: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: [...key, params],
    queryFn: ({ pageParam }) => api(path + qs({ ...params, cursor: pageParam })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextCursor ?? undefined,
  });
}
const rowsOf = (query: any) => (query.data?.pages ?? []).flatMap((p: any) => p.items);
function LoadMore({ query }: { query: any }) {
  return query.hasNextPage ? (
    <button type="button" className="secondary admin-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
      {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
    </button>
  ) : null;
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <>
      <PageHeading eyebrow="VẬN HÀNH NEXALAB" title="Quản trị hệ thống" />
      <div className="tabs admin-tabs" role="tablist" aria-label="Khu vực quản trị">
        {TABS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <Users />}
      {tab === "taxonomy" && <Taxonomy />}
      {tab === "content" && <Content />}
      {tab === "simulations" && <Simulations />}
      {tab === "assets" && <Assets />}
      {tab === "audit" && <AuditExplorer />}
    </>
  );
}

// ───────────────────────── overview ─────────────────────────
function Overview() {
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api("/admin/overview") });
  const sum = (rows: any[] = [], pick: (r: any) => boolean) => rows.filter(pick).reduce((n, r) => n + r.count, 0);
  const d = q.data;
  const cards = d
    ? [
        ["Tài khoản đang hoạt động", sum(d.users, (r) => r.status === "active")],
        ["Tài khoản bị vô hiệu hóa", sum(d.users, (r) => r.status === "disabled")],
        ["Bài học đang cách ly", sum(d.lessons, (r) => r.status === "quarantined")],
        ["Tệp đang cách ly", sum(d.assets, (r) => r.status === "QUARANTINED")],
        ["Cấu hình mô phỏng đang dùng", sum(d.simulationVersions, (r) => r.status === "active")],
        ["Sự kiện kiểm toán 24 giờ", d.audit.last24h],
        ["Bị từ chối 24 giờ", d.audit.denied24h],
      ]
    : [];
  return (
    <section className="panel">
      <h2>Tổng quan</h2>
      <QueryState query={q}>
        <div className="admin-cards">
          {cards.map(([label, value]) => (
            <div className="admin-card" key={label as string}>
              <strong>{value as number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="tiny muted">Quyền quản trị không thay thế duyệt chuyên môn, bản quyền hay khoa học.</p>
      </QueryState>
    </section>
  );
}

// ───────────────────────── users ─────────────────────────
function Users() {
  const [filters, setFilters] = useState({ q: "", role: "", status: "" });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const q = usePaged(["admin", "users"], "/admin/users", filters);
  const rows = rowsOf(q);
  return (
    <section className="panel table-wrap">
      <div className="admin-head">
        <h2>Người dùng</h2>
        <button type="button" className="primary" onClick={() => setCreating(true)}>
          + Tạo tài khoản
        </button>
      </div>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc người dùng">
        <Field
          label="Tìm theo tên, email, tên đăng nhập"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <label className="field">
          <span>Vai trò</span>
          <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Đã vô hiệu hóa</option>
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Đăng nhập</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u: any) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email ?? u.username}</td>
                <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                <td>
                  <Status value={u.status} />
                </td>
                <td>
                  <button type="button" className="text-button" onClick={() => setSelected(u.id)}>
                    Quản lý
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {creating && <CreateUser onClose={() => setCreating(false)} />}
      {selected && <UserDetail id={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CreateUser({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState<any>(null);
  const create = useAction((data: any) => api("/admin/users", "POST", data));
  return (
    <Modal title="Tạo tài khoản" onClose={onClose}>
      {done ? (
        <div className="notice" role="status">
          <p>
            Đã tạo tài khoản <b>{done.email}</b>.{" "}
            {done.setupLinkSent
              ? "Liên kết thiết lập mật khẩu (dùng một lần, 60 phút) đã được gửi qua email."
              : "Chưa gửi được email thiết lập; hãy dùng “Gửi liên kết đặt lại mật khẩu” sau."}
          </p>
          <button type="button" className="primary" onClick={onClose}>
            Xong
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            create.mutate({ role: f.role, email: f.email, fullName: f.fullName, grade: 8, consent: true }, { onSuccess: setDone });
          }}
        >
          <label className="field">
            <span>Vai trò</span>
            <select name="role" defaultValue="TEACHER">
              <option value="TEACHER">Giáo viên</option>
              <option value="PARENT">Phụ huynh</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>
          <Field label="Email" name="email" type="email" required />
          <Field label="Họ tên" name="fullName" required maxLength={200} />
          <p className="tiny muted">
            Quản trị viên không đặt mật khẩu. Người dùng nhận liên kết một lần qua email. Học sinh do giáo viên cấp tài khoản trong lớp.
          </p>
          <ErrorBox error={create.error} />
          <div className="button-row">
            <button type="button" className="secondary" onClick={onClose}>
              Hủy
            </button>
            <button className="primary" disabled={create.isPending}>
              {create.isPending ? "Đang tạo…" : "Tạo và gửi liên kết"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "user", id], queryFn: () => api(`/admin/users/${id}`) });
  const [dialog, setDialog] = useState<null | "disable" | "reactivate" | "delete" | "edit">(null);
  const [notice, setNotice] = useState("");
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const user = q.data?.user;
  const run = (path: string, body: any, method = "POST", message = "Đã cập nhật.") =>
    act.mutate(
      { path, method, body },
      {
        onSuccess: () => {
          setDialog(null);
          setNotice(message);
          if (method === "DELETE") onClose();
        },
      },
    );
  return (
    <Modal title="Quản lý tài khoản" onClose={onClose}>
      <QueryState query={q}>
        {user && (
          <div className="admin-detail">
            <p>
              <b>{user.fullName}</b> · {user.email ?? user.username} · {ROLE_LABEL[user.role]} <Status value={user.status} />
            </p>
            <p className="tiny muted">
              Tạo lúc {when(user.createdAt)}
              {user.disabledAt ? ` · Vô hiệu hóa lúc ${when(user.disabledAt)}` : ""}
            </p>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <h3>Đang sở hữu</h3>
            <p className="tiny">
              {q.data.ownership.classes.length} lớp đang hoạt động · {q.data.ownership.lessons.length} bài học ·{" "}
              {q.data.ownership.assets.length} tệp
            </p>
            <h3>Điều kiện xóa vĩnh viễn</h3>
            {q.data.deletion.eligible ? (
              <p className="tiny">Không còn dữ liệu tham chiếu; có thể xóa vĩnh viễn.</p>
            ) : (
              <ul className="tiny admin-blockers" aria-label="Lý do không thể xóa">
                {q.data.deletion.blocking.map((b: any) => (
                  <li key={b.key}>
                    {b.count} {b.label}
                  </li>
                ))}
              </ul>
            )}
            <ErrorBox error={!dialog ? act.error : null} />
            <div className="button-row admin-actions">
              <button type="button" className="secondary" onClick={() => setDialog("edit")}>
                Sửa thông tin
              </button>
              {user.role !== "STUDENT" && user.status === "active" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={act.isPending}
                  onClick={() =>
                    run(`/admin/users/${id}/reset-link`, undefined, "POST", "Đã gửi liên kết đặt lại mật khẩu (một lần, 60 phút).")
                  }
                >
                  Gửi liên kết đặt lại mật khẩu
                </button>
              )}
              {user.status === "active" ? (
                <button type="button" className="danger-text" onClick={() => setDialog("disable")}>
                  Vô hiệu hóa
                </button>
              ) : (
                <button type="button" className="secondary" onClick={() => setDialog("reactivate")}>
                  Kích hoạt lại
                </button>
              )}
              <button
                type="button"
                className="danger-text"
                disabled={!q.data.deletion.eligible}
                title={q.data.deletion.eligible ? "" : "Tài khoản còn dữ liệu; hãy vô hiệu hóa"}
                onClick={() => setDialog("delete")}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        )}
      </QueryState>
      {dialog === "edit" && user && (
        <Modal title="Sửa thông tin" onClose={() => setDialog(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(`/admin/users/${id}`, { fullName: f.fullName, grade: Number(f.grade) }, "PUT");
            }}
          >
            <Field label="Họ tên" name="fullName" defaultValue={user.fullName} required />
            <Field label="Khối" name="grade" type="number" min={6} max={9} defaultValue={user.grade} required />
            <ErrorBox error={act.error} />
            <div className="button-row">
              <button type="button" className="secondary" onClick={() => setDialog(null)}>
                Hủy
              </button>
              <button className="primary" disabled={act.isPending}>
                Lưu
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "disable" && user && (
        <DisableDialog
          user={user}
          ownership={q.data.ownership}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(body) => run(`/admin/users/${id}/disable`, body, "POST", "Đã vô hiệu hóa và thu hồi mọi phiên đăng nhập.")}
        />
      )}
      {dialog === "reactivate" && (
        <ReasonDialog
          title="Kích hoạt lại tài khoản"
          effect="Người dùng đăng nhập lại được. Lớp, bài học và tệp đã chuyển cho người khác không tự quay về."
          confirmLabel="Kích hoạt lại"
          danger={false}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => run(`/admin/users/${id}/reactivate`, { reason })}
        />
      )}
      {dialog === "delete" && (
        <ReasonDialog
          title="Xóa vĩnh viễn tài khoản"
          effect="Tài khoản và mọi phiên đăng nhập bị xóa vĩnh viễn, không thể khôi phục. Máy chủ kiểm tra lại: nếu có bất kỳ dữ liệu học tập, liên kết hay nhật ký nào, thao tác bị từ chối."
          confirmLabel="Xóa vĩnh viễn"
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => run(`/admin/users/${id}`, { reason, confirm: true }, "DELETE", "Đã xóa.")}
        />
      )}
    </Modal>
  );
}

function DisableDialog({
  user,
  ownership,
  onSubmit,
  onClose,
  pending,
  error,
}: {
  user: any;
  ownership: any;
  onSubmit: (body: any) => void;
  onClose: () => void;
  pending?: boolean;
  error?: unknown;
}) {
  const staff = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => {
      const [teachers, admins] = await Promise.all([
        api("/admin/users?role=TEACHER&status=active&limit=100"),
        api("/admin/users?role=ADMIN&status=active&limit=100"),
      ]);
      return [...teachers.items, ...admins.items].filter((u: any) => u.id !== user.id);
    },
  });
  const [choice, setChoice] = useState<Record<string, { action: string; newOwnerId?: string }>>({});
  const items = [
    ...ownership.classes.map((c: any) => ({
      kind: "classes",
      id: c.id,
      label: `Lớp ${c.name}`,
      actions: ["reassign", "archive"],
      shared: false,
    })),
    ...ownership.lessons.map((l: any) => ({
      kind: "lessons",
      id: l.id,
      label: `Bài học “${l.title}” (${SCOPE_LABEL[l.scope] ?? l.scope})`,
      actions: l.scope === "SHARED_LIBRARY" ? ["reassign", "quarantine"] : ["reassign", "archive"],
      shared: l.scope === "SHARED_LIBRARY",
    })),
    ...ownership.assets.map((a: any) => ({
      kind: "assets",
      id: a.id,
      label: `Tệp ${a.name}`,
      actions: ["reassign", "quarantine"],
      shared: a.scope === "SHARED_LIBRARY",
    })),
  ];
  const actionLabel: Record<string, string> = { reassign: "Chuyển cho người khác", archive: "Lưu trữ", quarantine: "Cách ly" };
  const ready = items.every((item) => choice[item.id]?.action && (choice[item.id].action !== "reassign" || choice[item.id].newOwnerId));
  const body = (reason: string) => {
    const resolutions: any = { classes: [], lessons: [], assets: [] };
    for (const item of items) resolutions[item.kind].push({ id: item.id, ...choice[item.id] });
    return { reason, resolutions };
  };
  const problems = isApiError(error, "OWNERSHIP_RESOLUTION_REQUIRED") ? ((error.details as any)?.problems ?? []) : [];
  return (
    <ReasonDialog
      title="Vô hiệu hóa tài khoản"
      effect={
        <>
          <b>{user.fullName}</b> bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập được nữa. Kết quả học tập, liên kết và nhật
          ký được giữ nguyên; có thể kích hoạt lại sau.
        </>
      }
      confirmLabel="Vô hiệu hóa"
      pending={pending || !ready}
      error={problems.length ? "Còn mục sở hữu chưa được xử lý hợp lệ." : error}
      onClose={onClose}
      onSubmit={(reason) => onSubmit(body(reason))}
    >
      {items.length > 0 && (
        <fieldset className="admin-resolutions">
          <legend>Chọn cách xử lý mọi thứ tài khoản này đang sở hữu</legend>
          {items.map((item) => (
            <div key={item.id} className="admin-resolution">
              <span>{item.label}</span>
              <select
                aria-label={`Cách xử lý ${item.label}`}
                value={choice[item.id]?.action ?? ""}
                onChange={(e) => setChoice({ ...choice, [item.id]: { action: e.target.value } })}
              >
                <option value="">— Chọn —</option>
                {item.actions.map((a: string) => (
                  <option key={a} value={a}>
                    {actionLabel[a]}
                  </option>
                ))}
              </select>
              {choice[item.id]?.action === "reassign" && (
                <select
                  aria-label={`Người nhận ${item.label}`}
                  value={choice[item.id]?.newOwnerId ?? ""}
                  onChange={(e) => setChoice({ ...choice, [item.id]: { action: "reassign", newOwnerId: e.target.value } })}
                >
                  <option value="">— Người nhận —</option>
                  {(staff.data ?? [])
                    .filter((u: any) => u.role === "TEACHER" || (item.shared && u.role === "ADMIN"))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({ROLE_LABEL[u.role]})
                      </option>
                    ))}
                </select>
              )}
            </div>
          ))}
        </fieldset>
      )}
    </ReasonDialog>
  );
}

// ───────────────────────── taxonomy ─────────────────────────
function Taxonomy() {
  const q = useQuery({ queryKey: ["admin", "taxonomy"], queryFn: () => api("/admin/taxonomy") });
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const [dialog, setDialog] = useState<any>(null);
  const d = q.data;
  const submit = (path: string, method = "POST") => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body: any = { ...f };
    if ("ebookUrl" in f) body.ebookUrl = f.ebookUrl.trim() || null;
    if (f.grade) body.grade = Number(f.grade);
    if ("outcomeCodes" in f)
      body.outcomeCodes = f.outcomeCodes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    act.mutate({ path, method, body }, { onSuccess: () => form.reset() });
  };
  const domains = Object.entries(d?.domains ?? {}) as Array<[string, string]>;
  return (
    <section className="panel">
      <h2>Phân loại chương trình</h2>
      <p className="tiny muted">
        Mã định danh không thể ghi đè: tạo trùng mã sẽ bị từ chối. Yêu cầu cần đạt đang được dùng chỉ có thể lưu trữ, không sửa nội dung.
      </p>
      <ErrorBox error={!dialog ? act.error : null} />
      <QueryState query={q}>
        {d && (
          <div className="admin-grid">
            <div>
              <h3>Môn học</h3>
              <ul className="admin-list">
                {d.subjects.map((s: any) => (
                  <li key={s.id}>
                    <b>{s.id}</b> {s.name}{" "}
                    <span className="tiny muted">
                      ({s.lessons} bài, {s.labs} phòng)
                    </span>
                    <form className="admin-inline" onSubmit={submit(`/admin/subjects/${encodeURIComponent(s.id)}`, "PUT")} aria-label={`Cập nhật sách tham khảo môn ${s.name}`}>
                      <Field label="URL ebook HTTPS" name="ebookUrl" type="url" placeholder="https://…" defaultValue={s.ebookUrl ?? ""} />
                      <input type="hidden" name="name" value={s.name} />
                      <button className="text-button">Lưu liên kết</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/subjects")} aria-label="Thêm môn học">
                <Field label="Mã môn" name="id" required />
                <Field label="Tên môn" name="name" required />
                <Field label="URL ebook HTTPS (tùy chọn)" name="ebookUrl" type="url" placeholder="https://…" />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Chương</h3>
              <ul className="admin-list">
                {d.chapters.map((c: any) => (
                  <li key={c.code}>
                    <b>{c.code}</b> {c.title} · Khối {c.grade} · {d.domains[c.domain] ?? c.domain} <Status value={c.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "chapter", item: c })}>
                      {c.status === "active" ? "Lưu trữ" : "Khôi phục"}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/chapters")} aria-label="Thêm chương">
                <Field label="Mã chương" name="code" required />
                <label className="field">
                  <span>Môn</span>
                  <select name="subjectId" required>
                    {d.subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Khối</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mạch nội dung</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Tên chương" name="title" required />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Chủ đề</h3>
              <ul className="admin-list">
                {d.topics.map((t: any) => (
                  <li key={t.code}>
                    <b>{t.code}</b> {t.title} · chương {t.chapterCode} · YCCĐ: {(t.outcomeCodes as string[]).join(", ") || "—"}{" "}
                    <Status value={t.status} />
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/topics")} aria-label="Thêm chủ đề">
                <Field label="Mã chủ đề" name="code" required />
                <label className="field">
                  <span>Chương</span>
                  <select name="chapterCode" required>
                    {d.chapters
                      .filter((c: any) => c.status === "active")
                      .map((c: any) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                  </select>
                </label>
                <Field label="Tên chủ đề" name="title" required />
                <Field label="Mã YCCĐ (phân cách bằng dấu phẩy)" name="outcomeCodes" />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Yêu cầu cần đạt</h3>
              <ul className="admin-list">
                {d.outcomes.map((o: any) => (
                  <li key={o.code}>
                    <b>{o.code}</b> {o.statement}{" "}
                    <span className="tiny muted">
                      ({o.lessons} bài{o.synthetic ? ", dữ liệu mẫu" : ""})
                    </span>{" "}
                    <Status value={o.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "outcome", item: o })}>
                      {o.status === "active" ? "Lưu trữ" : "Khôi phục"}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/outcomes")} aria-label="Thêm yêu cầu cần đạt">
                <Field label="Mã YCCĐ" name="code" required />
                <label className="field">
                  <span>Khối</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mạch nội dung</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Chương" name="chapter" required />
                <Field label="Nội dung yêu cầu" name="statement" required minLength={5} />
                <button className="secondary">Thêm</button>
              </form>
            </div>
          </div>
        )}
      </QueryState>
      {dialog && (
        <ReasonDialog
          title={dialog.item.status === "active" ? "Lưu trữ mục phân loại" : "Khôi phục mục phân loại"}
          effect={
            dialog.item.status === "active"
              ? "Mục đã lưu trữ vẫn giữ trên các bài học, chủ đề đang tham chiếu nhưng không thể gắn mới."
              : "Mục được dùng lại cho các bài học và chủ đề mới."
          }
          confirmLabel={dialog.item.status === "active" ? "Lưu trữ" : "Khôi phục"}
          danger={dialog.item.status === "active"}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => {
            const status = dialog.item.status === "active" ? "archived" : "active";
            const body =
              dialog.kind === "chapter"
                ? { title: dialog.item.title, status, reason }
                : { statement: dialog.item.statement, status, reason };
            act.mutate(
              { path: `/admin/${dialog.kind === "chapter" ? "chapters" : "outcomes"}/${dialog.item.code}`, method: "PUT", body },
              { onSuccess: () => setDialog(null) },
            );
          }}
        />
      )}
    </section>
  );
}

// ───────────────────────── content ─────────────────────────
function Content() {
  const [filters, setFilters] = useState({ q: "", scope: "", status: "" });
  const q = usePaged(["admin", "content"], "/admin/content", filters);
  const rows = rowsOf(q);
  const [op, setOp] = useState<any>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const act = useAction(({ id, body }: any) => api(`/admin/content/${id}/operations`, "POST", body));
  const staff = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: () => api("/admin/users?role=TEACHER&status=active&limit=100"),
    enabled: op?.action === "reassign",
  });
  const [newOwnerId, setNewOwnerId] = useState("");
  const effects: Record<string, string> = {
    quarantine:
      "Học sinh mất quyền mở bài ngay, kể cả bài đã bắt đầu; giáo viên không thể sửa hay giao lại cho tới khi gỡ cách ly. Kết quả học tập được giữ nguyên.",
    release: "Bài học trở lại trạng thái trước khi bị cách ly.",
    archive: "Bài không thể giao mới; học sinh đã bắt đầu vẫn tiếp tục được. Kết quả học tập được giữ nguyên.",
    reassign: "Quyền sửa và quản lý bài chuyển cho người nhận. Lịch sử học tập và bài giao không đổi.",
  };
  const labels: Record<string, string> = {
    quarantine: "Cách ly",
    release: "Gỡ cách ly",
    archive: "Lưu trữ",
    reassign: "Chuyển chủ sở hữu",
  };
  const warning = isApiError(act.error, "ACTIVE_ASSIGNMENTS_WARNING");
  return (
    <section className="panel table-wrap">
      <h2>Nội dung</h2>
      <p className="tiny muted">
        Quản trị viên kiểm tra, cách ly, lưu trữ hoặc chuyển chủ sở hữu, nhưng không sửa nội dung bài riêng và không tự duyệt chuyên môn.
        Bài dùng chung chỉ xuất bản khi đủ các lượt duyệt có tên.
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc nội dung">
        <Field label="Tìm theo tiêu đề" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <label className="field">
          <span>Phạm vi</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="TEACHER_PRIVATE">Riêng của giáo viên</option>
            <option value="SHARED_LIBRARY">Thư viện chung</option>
          </select>
        </label>
        <label className="field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(LESSON_STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Bài học</th>
              <th>Chủ sở hữu</th>
              <th>Phạm vi</th>
              <th>Trạng thái</th>
              <th>Bài giao đang mở</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l: any) => (
              <tr key={l.id}>
                <td>
                  {l.title}
                  {l.releaseBlockers.length > 0 && (
                    <details className="tiny">
                      <summary>Còn thiếu {l.releaseBlockers.length} điều kiện phát hành</summary>
                      <ul>
                        {l.releaseBlockers.map((b: string) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {l.quarantineReason && <p className="tiny muted">Lý do cách ly: {l.quarantineReason}</p>}
                </td>
                <td>{l.author?.fullName ?? "—"}</td>
                <td>{SCOPE_LABEL[l.scope] ?? l.scope}</td>
                <td>
                  <Status value={l.status} />
                </td>
                <td>{l.activeAssignments}</td>
                <td className="admin-row-actions">
                  {(l.status === "quarantined"
                    ? ["release", "archive", "reassign"]
                    : l.status === "archived"
                      ? ["quarantine", "reassign"]
                      : ["quarantine", "archive", "reassign"]
                  ).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={action === "release" || action === "reassign" ? "text-button" : "danger-text"}
                      onClick={() => {
                        act.reset();
                        setAcknowledge(false);
                        setNewOwnerId("");
                        setOp({ lesson: l, action });
                      }}
                    >
                      {labels[action]}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {op && (
        <ReasonDialog
          title={`${labels[op.action]}: ${op.lesson.title}`}
          effect={effects[op.action]}
          confirmLabel={labels[op.action]}
          danger={op.action === "quarantine" || op.action === "archive"}
          pending={act.isPending || (op.action === "reassign" && !newOwnerId) || (warning && !acknowledge)}
          error={act.error}
          onClose={() => setOp(null)}
          onSubmit={(reason) =>
            act.mutate(
              {
                id: op.lesson.id,
                body: {
                  action: op.action,
                  reason,
                  ...(op.action === "reassign" ? { newOwnerId } : {}),
                  ...(acknowledge ? { acknowledgeActiveAssignments: true } : {}),
                },
              },
              { onSuccess: () => setOp(null) },
            )
          }
        >
          {op.action === "reassign" && (
            <label className="field">
              <span>Người nhận</span>
              <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} required>
                <option value="">— Chọn giáo viên —</option>
                {(staff.data?.items ?? [])
                  .filter((u: any) => u.id !== op.lesson.author?.id)
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {warning && (
            <label className="admin-ack">
              <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} /> Tôi hiểu ảnh hưởng tới{" "}
              {(act.error as any).details?.activeAssignments} bài giao đang mở
            </label>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}

// ───────────────────────── simulations ─────────────────────────
function Simulations() {
  const labs = useQuery({ queryKey: ["admin", "labs"], queryFn: () => api("/admin/labs") });
  const [labId, setLabId] = useState<string | null>(null);
  return (
    <section className="panel table-wrap">
      <h2>Phòng thực hành và cấu hình mô phỏng</h2>
      <p className="tiny muted">
        Cấu hình là bất biến: mỗi thay đổi tạo một phiên bản mới, chỉ áp dụng cho lần thực hành sau khi kích hoạt. Lần thực hành cũ giữ
        nguyên phiên bản đã dùng. Khoảng tham số vẫn chờ duyệt khoa học (Q-C2-04).
      </p>
      <QueryState query={labs} empty={labs.data?.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Trạng thái</th>
              <th>Mô hình</th>
              <th>Cấu hình đang dùng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {(labs.data ?? []).map((lab: any) => (
              <tr key={lab.id}>
                <td>{lab.title}</td>
                <td>
                  <Status value={lab.status} />
                </td>
                <td>
                  {lab.model?.modelRef ?? lab.simulationModelRef} · engine {lab.engineVersion}
                </td>
                <td>{lab.activeVersion ? `Phiên bản ${lab.activeVersion.version}` : "Mặc định của mô hình"}</td>
                <td>
                  <button type="button" className="text-button" onClick={() => setLabId(lab.id)}>
                    Quản lý phiên bản
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueryState>
      {labId && <LabVersions labId={labId} onClose={() => setLabId(null)} />}
    </section>
  );
}

function LabVersions({ labId, onClose }: { labId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "versions", labId], queryFn: () => api(`/admin/labs/${labId}/versions`) });
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});
  const [golden, setGolden] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [activating, setActivating] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  const d = q.data;
  const model = d?.model;
  const challenge = d?.lab.challenges[0];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: Record<string, number | string> = {};
    for (const [name, raw] of Object.entries(params[challenge.id] ?? {})) {
      if (raw === "") continue;
      values[name] = model.params[name].kind === "number" ? Number(raw) : raw;
    }
    const goldenCases = d.templates
      .map((t: any, i: number) =>
        golden[i] ? { challengeId: challenge.id, label: t.label, labState: t.labState, expectedVerdict: golden[i] } : null,
      )
      .filter(Boolean);
    act.mutate(
      { path: `/admin/labs/${labId}/versions`, body: { challengeParams: { [challenge.id]: values }, goldenCases, reason } },
      { onSuccess: setCreated },
    );
  };
  const goldenErrors = isApiError(act.error, "GOLDEN_CASE_MISMATCH") ? ((act.error.details as any)?.golden ?? []) : [];
  return (
    <Modal title="Phiên bản cấu hình mô phỏng" onClose={onClose}>
      <QueryState query={q}>
        {d && (
          <div className="admin-detail">
            <h3>{d.lab.title}</h3>
            <table>
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Trạng thái</th>
                  <th>Tham số</th>
                  <th>Lần thực hành dùng</th>
                  <th>Lý do</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.versions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Chưa có phiên bản; đang dùng mặc định của mô hình.
                    </td>
                  </tr>
                )}
                {d.versions.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.version}</td>
                    <td>
                      <Status value={v.status} />
                    </td>
                    <td className="tiny">{JSON.stringify(v.challengeParams)}</td>
                    <td>{v.attempts}</td>
                    <td className="tiny">{v.reason}</td>
                    <td>
                      {v.status === "draft" && (
                        <button type="button" className="text-button" onClick={() => setActivating(v)}>
                          Kích hoạt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {model && challenge ? (
              <form onSubmit={submit} className="admin-version-form" aria-label="Tạo phiên bản mới">
                <h3>Tạo phiên bản nháp cho {challenge.id}</h3>
                {Object.entries(model.params).map(([name, spec]: [string, any]) =>
                  spec.kind === "number" ? (
                    <Field
                      key={name}
                      label={`${spec.label} (${spec.min}–${spec.max} ${spec.unit})`}
                      type="number"
                      min={spec.min}
                      max={spec.max}
                      step={spec.step}
                      value={params[challenge.id]?.[name] ?? ""}
                      onChange={(e) =>
                        setParams({ ...params, [challenge.id]: { ...(params[challenge.id] ?? {}), [name]: e.target.value } })
                      }
                    />
                  ) : (
                    <label className="field" key={name}>
                      <span>{spec.label}</span>
                      <select
                        value={params[challenge.id]?.[name] ?? ""}
                        onChange={(e) =>
                          setParams({ ...params, [challenge.id]: { ...(params[challenge.id] ?? {}), [name]: e.target.value } })
                        }
                      >
                        <option value="">— Mặc định —</option>
                        {spec.options.map((o: any) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
                <fieldset>
                  <legend>Ca mẫu: kết quả mong đợi do người duyệt chuyên môn nêu</legend>
                  {d.templates.map((t: any, i: number) => (
                    <label className="admin-resolution" key={t.label}>
                      <span>{t.label}</span>
                      <select
                        aria-label={`Kết quả mong đợi: ${t.label}`}
                        value={golden[i] ?? ""}
                        onChange={(e) => setGolden({ ...golden, [i]: e.target.value })}
                      >
                        <option value="">Không dùng</option>
                        <option value="passed">Đạt</option>
                        <option value="partial">Đạt một phần</option>
                        <option value="needs_practice">Cần luyện thêm</option>
                      </select>
                    </label>
                  ))}
                </fieldset>
                <label className="field">
                  <span>Lý do thay đổi</span>
                  <textarea required minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                {goldenErrors.length > 0 && (
                  <ul className="error" role="alert">
                    {goldenErrors
                      .filter((g: any) => !g.ok)
                      .map((g: any) => (
                        <li key={g.label}>
                          {g.label}: mong đợi {VERDICT_LABEL[g.expected]}, máy chủ cho {VERDICT_LABEL[g.actual] ?? g.actual}
                        </li>
                      ))}
                  </ul>
                )}
                {!goldenErrors.length && <ErrorBox error={!activating ? act.error : null} />}
                {created && (
                  <p className="notice" role="status">
                    Đã lưu phiên bản nháp {created.version}; mọi ca mẫu khớp. Kích hoạt để áp dụng cho lần thực hành sau.
                  </p>
                )}
                <button className="primary" disabled={act.isPending}>
                  Kiểm tra ca mẫu và lưu nháp
                </button>
              </form>
            ) : (
              <p className="muted">Mô hình này chưa có tham số được phép điều chỉnh.</p>
            )}
          </div>
        )}
      </QueryState>
      {activating && (
        <ReasonDialog
          title={`Kích hoạt phiên bản ${activating.version}`}
          effect="Từ bây giờ mọi lần thực hành mới của phòng này dùng phiên bản này. Phiên bản đang dùng chuyển sang “đã thay thế”; lần thực hành cũ vẫn giữ cách chấm ban đầu."
          confirmLabel="Kích hoạt"
          pending={act.isPending}
          error={act.error}
          onClose={() => setActivating(null)}
          onSubmit={(why) =>
            act.mutate(
              { path: `/admin/labs/${labId}/versions/${activating.version}/activate`, body: { reason: why } },
              { onSuccess: () => setActivating(null) },
            )
          }
        />
      )}
    </Modal>
  );
}

// ───────────────────────── assets ─────────────────────────
function Assets() {
  const [filters, setFilters] = useState({ status: "", scope: "" });
  const q = usePaged(["admin", "assets"], "/admin/assets", filters);
  const rows = rowsOf(q);
  const [op, setOp] = useState<any>(null);
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const staff = useQuery({
    queryKey: ["admin", "staff-assets"],
    queryFn: async () => [
      ...(await api("/admin/users?role=TEACHER&status=active&limit=100")).items,
      ...(await api("/admin/users?role=ADMIN&status=active&limit=100")).items,
    ],
    enabled: op?.action === "reassign",
  });
  const [extra, setExtra] = useState<any>({});
  const labels: Record<string, string> = {
    quarantine: "Cách ly",
    release: "Gỡ cách ly",
    reassign: "Chuyển chủ sở hữu",
    share: "Đưa vào thư viện chung",
    delete: "Xóa",
  };
  const effects: Record<string, string> = {
    quarantine: "Không ai ngoài quản trị viên mở được tệp, kể cả trong bài đã xuất bản, cho tới khi gỡ cách ly.",
    release: "Tệp được phục vụ lại như trước.",
    reassign: "Quyền quản lý tệp chuyển cho người nhận; các bài đang tham chiếu không đổi.",
    share: "Mọi giáo viên dùng được tệp. Phải ghi rõ giấy phép và nguồn; đây không phải duyệt chuyên môn.",
    delete: "Tệp bị xóa vĩnh viễn. Máy chủ từ chối nếu còn bài học hay phòng thực hành tham chiếu.",
  };
  const refs = (a: any) => a.references.lessons.length + a.references.labs.length;
  return (
    <section className="panel table-wrap">
      <h2>Tệp và nguồn</h2>
      <p className="tiny muted">
        Kiểm tra theo cấu hình: chữ ký tệp, đuôi, MIME, kích thước và SHA-256. Hạn mức production chờ Q-DATA-01/Q-C2-03. Lưu trữ R2 và danh
        mục nguồn (SourceRegistry) chờ Content Foundation.
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc tệp">
        <label className="field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="READY">Sẵn sàng</option>
            <option value="QUARANTINED">Đang cách ly</option>
          </select>
        </label>
        <label className="field">
          <span>Phạm vi</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="TEACHER_PRIVATE">Riêng của giáo viên</option>
            <option value="SHARED_LIBRARY">Thư viện chung</option>
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Tệp</th>
              <th>Chủ sở hữu</th>
              <th>Phạm vi / giấy phép</th>
              <th>Trạng thái</th>
              <th>Tham chiếu</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.id}>
                <td>
                  {a.name}
                  <p className="tiny muted">
                    {a.mime} · {Math.ceil(a.size / 1024)} KB · {a.sha256 ? `SHA-256 ${a.sha256.slice(0, 12)}…` : "chưa có checksum"}
                  </p>
                </td>
                <td>{a.owner?.fullName ?? a.ownerId}</td>
                <td>
                  {SCOPE_LABEL[a.scope] ?? a.scope}
                  {a.license && (
                    <p className="tiny muted">
                      {LICENSE_LABEL[a.license] ?? a.license} · {a.source}
                    </p>
                  )}
                </td>
                <td>
                  <Status value={a.status} />
                </td>
                <td>{refs(a) ? `${a.references.lessons.length} bài, ${a.references.labs.length} phòng` : "Không"}</td>
                <td className="admin-row-actions">
                  {(a.status === "QUARANTINED"
                    ? ["release", "reassign"]
                    : ["quarantine", "reassign", ...(a.scope === "SHARED_LIBRARY" ? [] : ["share"])]
                  ).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={action === "quarantine" ? "danger-text" : "text-button"}
                      onClick={() => {
                        act.reset();
                        setExtra({});
                        setOp({ asset: a, action });
                      }}
                    >
                      {labels[action]}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="danger-text"
                    disabled={refs(a) > 0}
                    title={refs(a) ? "Đang được tham chiếu; không thể xóa" : ""}
                    onClick={() => {
                      act.reset();
                      setOp({ asset: a, action: "delete" });
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {op && (
        <ReasonDialog
          title={`${labels[op.action]}: ${op.asset.name}`}
          effect={effects[op.action]}
          confirmLabel={labels[op.action]}
          danger={op.action === "quarantine" || op.action === "delete"}
          pending={
            act.isPending || (op.action === "reassign" && !extra.newOwnerId) || (op.action === "share" && (!extra.license || !extra.source))
          }
          error={act.error}
          onClose={() => setOp(null)}
          onSubmit={(reason) =>
            act.mutate(
              op.action === "delete"
                ? { path: `/admin/assets/${op.asset.id}`, method: "DELETE", body: { reason, confirm: true } }
                : { path: `/admin/assets/${op.asset.id}/operations`, body: { action: op.action, reason, ...extra } },
              { onSuccess: () => setOp(null) },
            )
          }
        >
          {op.action === "reassign" && (
            <label className="field">
              <span>Người nhận</span>
              <select value={extra.newOwnerId ?? ""} onChange={(e) => setExtra({ newOwnerId: e.target.value })}>
                <option value="">— Chọn —</option>
                {(staff.data ?? [])
                  .filter((u: any) => u.id !== op.asset.ownerId)
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({ROLE_LABEL[u.role]})
                    </option>
                  ))}
              </select>
            </label>
          )}
          {op.action === "share" && (
            <>
              <label className="field">
                <span>Giấy phép</span>
                <select value={extra.license ?? ""} onChange={(e) => setExtra({ ...extra, license: e.target.value })}>
                  <option value="">— Chọn —</option>
                  {Object.entries(LICENSE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Nguồn / ghi công" value={extra.source ?? ""} onChange={(e) => setExtra({ ...extra, source: e.target.value })} />
            </>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}

// ───────────────────────── audit ─────────────────────────
function AuditExplorer() {
  const [draft, setDraft] = useState({ action: "", targetType: "", targetId: "", actorId: "", outcome: "", from: "", to: "" });
  const [filters, setFilters] = useState(draft);
  const q = usePaged(["admin", "audit"], "/admin/audit", {
    ...filters,
    from: filters.from ? new Date(filters.from).toISOString() : "",
    to: filters.to ? new Date(filters.to).toISOString() : "",
  });
  const rows = rowsOf(q);
  const diff = (before: any, after: any) =>
    [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].map(
      (k) => `${k}: ${JSON.stringify(before?.[k] ?? null)} → ${JSON.stringify(after?.[k] ?? null)}`,
    );
  return (
    <section className="panel table-wrap">
      <h2>Nhật ký kiểm toán</h2>
      <p className="tiny muted">
        Mỗi lần xem nhật ký cũng được ghi lại. Mật khẩu, mã, đáp án và nội dung gợi ý không bao giờ được lưu hay hiển thị.
      </p>
      <form
        className="admin-filters"
        aria-label="Lọc nhật ký"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
      >
        <Field
          label="Hành động (tiền tố)"
          placeholder="user."
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
        />
        <Field
          label="Loại đối tượng"
          placeholder="User"
          value={draft.targetType}
          onChange={(e) => setDraft({ ...draft, targetType: e.target.value })}
        />
        <Field label="Mã đối tượng" value={draft.targetId} onChange={(e) => setDraft({ ...draft, targetId: e.target.value })} />
        <Field label="Mã người thực hiện" value={draft.actorId} onChange={(e) => setDraft({ ...draft, actorId: e.target.value })} />
        <label className="field">
          <span>Kết quả</span>
          <select value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="denied">Bị từ chối</option>
            <option value="failure">Thất bại</option>
          </select>
        </label>
        <Field label="Từ" type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <Field label="Đến" type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <button className="secondary">Lọc</button>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Kết quả</th>
              <th>Lý do</th>
              <th>Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="tiny">{when(r.createdAt)}</td>
                <td>{r.actor ? `${r.actor.fullName} (${ROLE_LABEL[r.actor.role] ?? r.actor.role})` : (r.actorRole ?? "Hệ thống")}</td>
                <td>
                  <code>{r.action}</code>
                </td>
                <td className="tiny">
                  {r.targetType}
                  {r.targetId ? ` · ${r.targetId}` : ""}
                </td>
                <td>
                  <Status value={r.outcome} />
                </td>
                <td className="tiny">{r.reason ?? "—"}</td>
                <td className="tiny">
                  {diff(r.before, r.after).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
    </section>
  );
}
