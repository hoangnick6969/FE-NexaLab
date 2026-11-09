import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { ErrorBox, Field, Modal, useAction } from "../../components/ui";
import { LoadMore, QueryState, ROLE_LABEL, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged, when } from "./admin-ui";
import { defineText } from "../../i18n";
import { Avatar } from "../../components/Avatar";
import { AdminCreditsPanel } from "./AdminCreditsPanel";

const text = defineText({
  vi: {
    users: "Người dùng",
    createAccount: "Tạo tài khoản",
    filter: "Lọc người dùng",
    search: "Tìm theo tên, email, tên đăng nhập",
    role: "Vai trò",
    all: "Tất cả",
    status: "Trạng thái",
    active: "Đang hoạt động",
    disabled: "Đã vô hiệu hóa",
    fullName: "Họ tên",
    signIn: "Đăng nhập",
    actionsHead: "Thao tác",
    manage: "Quản lý",
    createTitle: "Tạo tài khoản",
    created: "Đã tạo tài khoản",
    linkSent: "Liên kết thiết lập mật khẩu (dùng một lần, 60 phút) đã được gửi qua email.",
    linkNotSent: "Chưa gửi được email thiết lập; hãy dùng “Gửi liên kết đặt lại mật khẩu” sau.",
    teacher: "Giáo viên",
    parent: "Phụ huynh",
    admin: "Quản trị viên",
    noPasswords: "Quản trị viên không đặt mật khẩu. Người dùng nhận liên kết một lần qua email. Học sinh do giáo viên cấp tài khoản trong lớp.",
    cancel: "Hủy",
    creating: "Đang tạo…",
    createSend: "Tạo và gửi liên kết",
    updated: "Đã cập nhật.",
    manageTitle: "Quản lý tài khoản",
    createdAt: (at: string) => `Tạo lúc ${at}`,
    disabledAt: (at: string) => `Vô hiệu hóa lúc ${at}`,
    owns: "Đang sở hữu",
    owned: (classes: number, lessons: number, files: number) => `${classes} lớp đang hoạt động · ${lessons} bài học · ${files} tệp`,
    deleteRules: "Điều kiện xóa vĩnh viễn",
    canDelete: "Không còn dữ liệu tham chiếu; có thể xóa vĩnh viễn.",
    whyNot: "Lý do không thể xóa",
    editInfo: "Sửa thông tin",
    resetSent: "Đã gửi liên kết đặt lại mật khẩu (một lần, 60 phút).",
    sendReset: "Gửi liên kết đặt lại mật khẩu",
    disable: "Vô hiệu hóa",
    reactivate: "Kích hoạt lại",
    hasData: "Tài khoản còn dữ liệu; hãy vô hiệu hóa",
    deleteForever: "Xóa vĩnh viễn",
    grade: "Khối",
    save: "Lưu",
    disabledDone: "Đã vô hiệu hóa và thu hồi mọi phiên đăng nhập.",
    reactivateTitle: "Kích hoạt lại tài khoản",
    reactivateEffect: "Người dùng đăng nhập lại được. Lớp, bài học và tệp đã chuyển cho người khác không tự quay về.",
    deleteTitle: "Xóa vĩnh viễn tài khoản",
    deleteEffect: "Tài khoản và mọi phiên đăng nhập bị xóa vĩnh viễn, không thể khôi phục. Máy chủ kiểm tra lại: nếu có bất kỳ dữ liệu học tập, liên kết hay nhật ký nào, thao tác bị từ chối.",
    deleted: "Đã xóa.",
    classItem: (name: string) => `Lớp ${name}`,
    lessonItem: (title: string, scope: string) => `Bài học “${title}” (${scope})`,
    fileItem: (name: string) => `Tệp ${name}`,
    actions: { reassign: "Chuyển cho người khác", archive: "Lưu trữ", quarantine: "Cách ly" } as Record<string, string>,
    disableTitle: "Vô hiệu hóa tài khoản",
    disableEffect: "bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập được nữa. Kết quả học tập, liên kết và nhật ký được giữ nguyên; có thể kích hoạt lại sau.",
    unresolved: "Còn mục sở hữu chưa được xử lý hợp lệ.",
    chooseHandling: "Chọn cách xử lý mọi thứ tài khoản này đang sở hữu",
    howTo: (label: string) => `Cách xử lý ${label}`,
    choose: "— Chọn —",
    recipientFor: (label: string) => `Người nhận ${label}`,
    recipient: "— Người nhận —",
    removeAvatar: "Gỡ ảnh đại diện",
    avatarRemoved: "Đã gỡ ảnh đại diện.",
  },
  en: {
    users: "Users",
    createAccount: "Create account",
    filter: "Filter users",
    search: "Search by name, email or username",
    role: "Role",
    all: "All",
    status: "Status",
    active: "Active",
    disabled: "Disabled",
    fullName: "Full name",
    signIn: "Sign-in",
    actionsHead: "Actions",
    manage: "Manage",
    createTitle: "Create account",
    created: "Account created for",
    linkSent: "A one-time password set-up link (60 minutes) was emailed.",
    linkNotSent: "The set-up email could not be sent; use “Send a password reset link” later.",
    teacher: "Teacher",
    parent: "Parent",
    admin: "Administrator",
    noPasswords: "Administrators never set passwords. Users get a one-time link by email. Teachers issue student accounts in their class.",
    cancel: "Cancel",
    creating: "Creating…",
    createSend: "Create and send link",
    updated: "Updated.",
    manageTitle: "Manage account",
    createdAt: (at: string) => `Created ${at}`,
    disabledAt: (at: string) => `Disabled ${at}`,
    owns: "Owns",
    owned: (classes: number, lessons: number, files: number) => `${classes} active classes · ${lessons} lessons · ${files} files`,
    deleteRules: "Permanent deletion",
    canDelete: "Nothing refers to it any more; it can be deleted permanently.",
    whyNot: "Why it cannot be deleted",
    editInfo: "Edit details",
    resetSent: "Password reset link sent (one-time, 60 minutes).",
    sendReset: "Send a password reset link",
    disable: "Disable",
    reactivate: "Reactivate",
    hasData: "The account still has data; disable it instead",
    deleteForever: "Delete permanently",
    grade: "Grade",
    save: "Save",
    disabledDone: "Disabled and every session signed out.",
    reactivateTitle: "Reactivate account",
    reactivateEffect: "The user can sign in again. Classes, lessons and files moved to someone else do not come back automatically.",
    deleteTitle: "Delete account permanently",
    deleteEffect: "The account and every session are deleted permanently and cannot be restored. The server checks again: if any learning data, links or logs exist, it refuses.",
    deleted: "Deleted.",
    classItem: (name: string) => `Class ${name}`,
    lessonItem: (title: string, scope: string) => `Lesson “${title}” (${scope})`,
    fileItem: (name: string) => `File ${name}`,
    actions: { reassign: "Give to someone else", archive: "Archive", quarantine: "Quarantine" },
    disableTitle: "Disable account",
    disableEffect: "is signed out on every device at once and can no longer sign in. Results, links and logs are kept; the account can be reactivated later.",
    unresolved: "Some owned items are not resolved yet.",
    chooseHandling: "Choose what happens to everything this account owns",
    howTo: (label: string) => `How to handle ${label}`,
    choose: "— Choose —",
    recipientFor: (label: string) => `Recipient for ${label}`,
    recipient: "— Recipient —",
    removeAvatar: "Remove profile picture",
    avatarRemoved: "Profile picture removed.",
  },
});
const t = text();

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
        <h2>{t.users}</h2>
        <button type="button" className="primary" onClick={() => setCreating(true)}>
          + {t.createAccount}
        </button>
      </div>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label={t.filter}>
        <Field
          label={t.search}
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <label className="field">
          <span>{t.role}</span>
          <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">{t.all}</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t.status}</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t.all}</option>
            <option value="active">{t.active}</option>
            <option value="disabled">{t.disabled}</option>
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>{t.fullName}</th>
              <th>{t.signIn}</th>
              <th>{t.role}</th>
              <th>{t.status}</th>
              <th>{t.actionsHead}</th>
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
                    {t.manage}
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
    <Modal title={t.createTitle} onClose={onClose}>
      {done ? (
        <div className="notice" role="status">
          <p>
            {t.created} <b>{done.email}</b>.{" "}
            {done.setupLinkSent
              ? t.linkSent
              : t.linkNotSent}
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
            <span>{t.role}</span>
            <select name="role" defaultValue="TEACHER">
              <option value="TEACHER">{t.teacher}</option>
              <option value="PARENT">{t.parent}</option>
              <option value="ADMIN">{t.admin}</option>
            </select>
          </label>
          <Field label="Email" name="email" type="email" required />
          <Field label={t.fullName} name="fullName" required maxLength={200} />
          <p className="tiny muted">
            {t.noPasswords}
          </p>
          <ErrorBox error={create.error} />
          <div className="button-row">
            <button type="button" className="secondary" onClick={onClose}>
              {t.cancel}
            </button>
            <button className="primary" disabled={create.isPending}>
              {create.isPending ? t.creating : t.createSend}
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
  const run = (path: string, body: any, method = "POST", message = t.updated) =>
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
    <Modal title={t.manageTitle} onClose={onClose}>
      <QueryState query={q}>
        {user && (
          <div className="admin-detail">
            <p className="admin-user-identity">
              <Avatar name={user.fullName} url={user.avatarUrl} className="avatar small" />
              <span>
                <b>{user.fullName}</b> · {user.email ?? user.username} · {ROLE_LABEL[user.role]} <Status value={user.status} />
              </span>
            </p>
            <p className="tiny muted">
              {t.createdAt(when(user.createdAt))}
              {user.disabledAt ? ` · ${t.disabledAt(when(user.disabledAt))}` : ""}
            </p>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <h3>{t.owns}</h3>
            <p className="tiny">
              {t.owned(q.data.ownership.classes.length, q.data.ownership.lessons.length, q.data.ownership.assets.length)}
            </p>
            {user.role === "TEACHER" && <AdminCreditsPanel teacherId={user.id} />}
            <h3>{t.deleteRules}</h3>
            {q.data.deletion.eligible ? (
              <p className="tiny">{t.canDelete}</p>
            ) : (
              <ul className="tiny admin-blockers" aria-label={t.whyNot}>
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
                {t.editInfo}
              </button>
              {user.role !== "STUDENT" && user.status === "active" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={act.isPending}
                  onClick={() =>
                    run(`/admin/users/${id}/reset-link`, undefined, "POST", t.resetSent)
                  }
                >
                  {t.sendReset}
                </button>
              )}
              {user.avatarUrl && (
                <button type="button" className="danger-text" disabled={act.isPending} onClick={() => run(`/admin/users/${id}/avatar`, undefined, "DELETE", t.avatarRemoved)}>
                  {t.removeAvatar}
                </button>
              )}
              {user.status === "active" ? (
                <button type="button" className="danger-text" onClick={() => setDialog("disable")}>
                  {t.disable}
                </button>
              ) : (
                <button type="button" className="secondary" onClick={() => setDialog("reactivate")}>
                  {t.reactivate}
                </button>
              )}
              <button
                type="button"
                className="danger-text"
                disabled={!q.data.deletion.eligible}
                title={q.data.deletion.eligible ? "" : t.hasData}
                onClick={() => setDialog("delete")}
              >
                {t.deleteForever}
              </button>
            </div>
          </div>
        )}
      </QueryState>
      {dialog === "edit" && user && (
        <Modal title={t.editInfo} onClose={() => setDialog(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(`/admin/users/${id}`, { fullName: f.fullName, grade: Number(f.grade) }, "PUT");
            }}
          >
            <Field label={t.fullName} name="fullName" defaultValue={user.fullName} required />
            <Field label={t.grade} name="grade" type="number" min={6} max={9} defaultValue={user.grade} required />
            <ErrorBox error={act.error} />
            <div className="button-row">
              <button type="button" className="secondary" onClick={() => setDialog(null)}>
                {t.cancel}
              </button>
              <button className="primary" disabled={act.isPending}>
                {t.save}
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
          onSubmit={(body) => run(`/admin/users/${id}/disable`, body, "POST", t.disabledDone)}
        />
      )}
      {dialog === "reactivate" && (
        <ReasonDialog
          title={t.reactivateTitle}
          effect={t.reactivateEffect}
          confirmLabel={t.reactivate}
          danger={false}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => run(`/admin/users/${id}/reactivate`, { reason })}
        />
      )}
      {dialog === "delete" && (
        <ReasonDialog
          title={t.deleteTitle}
          effect={t.deleteEffect}
          confirmLabel={t.deleteForever}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => run(`/admin/users/${id}`, { reason, confirm: true }, "DELETE", t.deleted)}
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
      label: t.classItem(c.name),
      actions: ["reassign", "archive"],
      shared: false,
    })),
    ...ownership.lessons.map((l: any) => ({
      kind: "lessons",
      id: l.id,
      label: t.lessonItem(l.title, SCOPE_LABEL[l.scope] ?? l.scope),
      actions: l.scope === "SHARED_LIBRARY" ? ["reassign", "quarantine"] : ["reassign", "archive"],
      shared: l.scope === "SHARED_LIBRARY",
    })),
    ...ownership.assets.map((a: any) => ({
      kind: "assets",
      id: a.id,
      label: t.fileItem(a.name),
      actions: ["reassign", "quarantine"],
      shared: a.scope === "SHARED_LIBRARY",
    })),
  ];
  const actionLabel: Record<string, string> = t.actions;
  const ready = items.every((item) => choice[item.id]?.action && (choice[item.id].action !== "reassign" || choice[item.id].newOwnerId));
  const body = (reason: string) => {
    const resolutions: any = { classes: [], lessons: [], assets: [] };
    for (const item of items) resolutions[item.kind].push({ id: item.id, ...choice[item.id] });
    return { reason, resolutions };
  };
  const problems = isApiError(error, "OWNERSHIP_RESOLUTION_REQUIRED") ? ((error.details as any)?.problems ?? []) : [];
  return (
    <ReasonDialog
      title={t.disableTitle}
      effect={
        <>
          <b>{user.fullName}</b> {t.disableEffect}
        </>
      }
      confirmLabel={t.disable}
      pending={pending || !ready}
      error={problems.length ? t.unresolved : error}
      onClose={onClose}
      onSubmit={(reason) => onSubmit(body(reason))}
    >
      {items.length > 0 && (
        <fieldset className="admin-resolutions">
          <legend>{t.chooseHandling}</legend>
          {items.map((item) => (
            <div key={item.id} className="admin-resolution">
              <span>{item.label}</span>
              <select
                aria-label={t.howTo(item.label)}
                value={choice[item.id]?.action ?? ""}
                onChange={(e) => setChoice({ ...choice, [item.id]: { action: e.target.value } })}
              >
                <option value="">{t.choose}</option>
                {item.actions.map((a: string) => (
                  <option key={a} value={a}>
                    {actionLabel[a]}
                  </option>
                ))}
              </select>
              {choice[item.id]?.action === "reassign" && (
                <select
                  aria-label={t.recipientFor(item.label)}
                  value={choice[item.id]?.newOwnerId ?? ""}
                  onChange={(e) => setChoice({ ...choice, [item.id]: { action: "reassign", newOwnerId: e.target.value } })}
                >
                  <option value="">{t.recipient}</option>
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
