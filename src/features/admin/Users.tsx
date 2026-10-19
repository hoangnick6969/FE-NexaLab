import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { ErrorBox, Field, Modal, useAction } from "../../components/ui";
import { LoadMore, QueryState, ROLE_LABEL, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged, when } from "./admin-ui";

// ───────────────────────── users ─────────────────────────
export function Users() {
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
