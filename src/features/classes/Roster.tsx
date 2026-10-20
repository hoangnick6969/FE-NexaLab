import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { type ClassSummary, type Enrollment } from "./class-types";
import { Confirm, LoadError, statusLabel, useMutate } from "./class-ui";
import { Avatar } from "../../components/Avatar";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    members: "Thành viên lớp",
    enrolExisting: "Ghi danh tài khoản có sẵn",
    issueAccount: "Cấp tài khoản học sinh",
    memberStatus: "Trạng thái thành viên",
    memberList: "danh sách thành viên",
    loadingList: "Đang tải danh sách…",
    noPending: "Không có yêu cầu chờ duyệt.",
    noRemoved: "Chưa có học sinh rời lớp.",
    noApproved: "Lớp chưa có thành viên đã duyệt.",
    student: "Học sinh",
    status: "Trạng thái",
    actions: "Thao tác",
    account: "Tài khoản:",
    tempNotChanged: "Chưa đổi mật khẩu tạm",
    approve: "Duyệt",
    resetPassword: "Cấp lại mật khẩu",
    removeAvatar: "Gỡ ảnh",
    removeAvatarAction: "gỡ ảnh đại diện của",
    removeAvatarDetail: "Ảnh bị xóa vĩnh viễn và thao tác được ghi vào nhật ký. Học sinh có thể tải ảnh khác.",
    reject: "Từ chối",
    remove: "Xóa khỏi lớp",
    rejectAction: "từ chối yêu cầu của",
    removeAction: "xóa khỏi lớp",
    removeDetail: "Học sinh mất quyền vào bài của lớp ngay. Kết quả học tập đã có vẫn được giữ.",
    username: "Tên đăng nhập",
    fullName: "Họ tên",
    gradeLabel: "Khối lớp",
    grade: (g: number) => `Khối ${g}`,
    schoolConsent: "Nhà trường đã có chấp thuận xử lý dữ liệu học sinh.",
    issue: "Cấp tài khoản",
    studentUsername: "Tên đăng nhập học sinh",
    enrolNote: "Học sinh được duyệt vào lớp ngay. Bài đã giao trước đó không tự động thêm cho học sinh mới.",
    resetTitle: "Cấp lại mật khẩu học sinh",
    creatingTemp: "Đang tạo mật khẩu tạm mới…",
    credentials: "Thông tin đăng nhập",
    usernameLabel: "Tên đăng nhập:",
    tempPassword: "Mật khẩu tạm:",
    expires: "Hạn dùng:",
    shareOnce: "Hãy lưu và gửi riêng cho học sinh. Mật khẩu sẽ không hiển thị lại.",
    saved: "Đã lưu thông tin",
  },
  en: {
    members: "Class members",
    enrolExisting: "Enrol an existing account",
    issueAccount: "Issue a student account",
    memberStatus: "Member status",
    memberList: "the member list",
    loadingList: "Loading the list…",
    noPending: "No requests waiting.",
    noRemoved: "No students have left.",
    noApproved: "The class has no approved members yet.",
    student: "Student",
    status: "Status",
    actions: "Actions",
    account: "Account:",
    tempNotChanged: "Temporary password not changed",
    approve: "Approve",
    resetPassword: "Reset password",
    removeAvatar: "Remove picture",
    removeAvatarAction: "remove the profile picture of",
    removeAvatarDetail: "The picture is deleted permanently and the action is logged. The student can upload another one.",
    reject: "Reject",
    remove: "Remove from class",
    rejectAction: "reject the request from",
    removeAction: "remove from the class",
    removeDetail: "The student loses access to class work at once. Existing results are kept.",
    username: "Username",
    fullName: "Full name",
    gradeLabel: "Grade",
    grade: (g: number) => `Grade ${g}`,
    schoolConsent: "The school has consent to process student data.",
    issue: "Issue account",
    studentUsername: "Student username",
    enrolNote: "The student is approved at once. Work assigned earlier is not added for new students automatically.",
    resetTitle: "Reset the student's password",
    creatingTemp: "Creating a new temporary password…",
    credentials: "Sign-in details",
    usernameLabel: "Username:",
    tempPassword: "Temporary password:",
    expires: "Expires:",
    shareOnce: "Save it and give it to the student privately. The password will not be shown again.",
    saved: "I saved the details",
  },
});
const t = text();

export function Roster({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [tab, setTab] = useState<"approved" | "pending" | "removed">(classroom.members.pending ? "pending" : "approved");
  const [modal, setModal] = useState<"" | "provision" | "enroll" | "credentials" | "parent-code">("");
  const [credentials, setCredentials] = useState<any>(null);
  const [parentTarget, setParentTarget] = useState<Enrollment | null>(null);
  const [parentCode, setParentCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [confirm, setConfirm] = useState<Enrollment | null>(null);
  const [avatarTarget, setAvatarTarget] = useState<Enrollment | null>(null);
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
        <h2 id="roster-title">{t.members}</h2>
        {!archived && (
          <div className="button-row">
            <button className="secondary" onClick={() => open("enroll")}>
              {t.enrolExisting}
            </button>
            <button className="primary" onClick={() => open("provision")}>
              {t.issueAccount}
            </button>
          </div>
        )}
      </div>
      <div className="tabs" role="tablist" aria-label={t.memberStatus}>
        {(["approved", "pending", "removed"] as const).map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
            {statusLabel[value]} ({roster.data?.filter((e) => e.status === value).length ?? 0})
          </button>
        ))}
      </div>
      <LoadError query={roster} what={t.memberList} />
      <ErrorBox error={!modal && !confirm ? act.error : null} />
      {roster.isLoading && <p className="muted">{t.loadingList}</p>}
      {roster.data && rows.length === 0 && (
        <Empty>
          {tab === "pending" ? t.noPending : tab === "removed" ? t.noRemoved : t.noApproved}
        </Empty>
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.student}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.studentId}>
                  <td className="roster-student">
                    <Avatar name={e.student.fullName} url={e.student.avatarUrl} className="avatar small" />
                    <span>
                      {e.student.fullName}
                      <small>{t.account} {e.student.username}</small>
                    </span>
                  </td>
                  <td>
                    <Badge tone={e.status === "approved" ? "" : "outline"}>{statusLabel[e.status]}</Badge>
                    {e.student.mustChangePassword && <small>{t.tempNotChanged}</small>}
                  </td>
                  <td>
                    {!archived && e.status === "pending" && (
                      <button
                        className="text-button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ path: `/classes/${classroom.id}/students/${e.studentId}`, method: "PUT", body: { status: "approved" } })}
                      >
                        {t.approve}
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
                            {t.resetPassword}
                          </button>
                        )}
                        {e.status === "approved" && e.student.avatarUrl && (
                          <button className="danger-text" onClick={() => setAvatarTarget(e)}>
                            {t.removeAvatar}
                          </button>
                        )}
                        {e.status === "approved" && (
                          <button
                            className="text-button"
                            onClick={() => {
                              act.reset();
                              setParentCode(null);
                              setParentTarget(e);
                              setModal("parent-code");
                            }}
                          >
                            Mã liên kết phụ huynh
                          </button>
                        )}
                        <button className="danger-text" onClick={() => setConfirm(e)}>
                          {e.status === "pending" ? t.reject : t.remove}
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
          action={confirm.status === "pending" ? t.rejectAction : t.removeAction}
          item={confirm.student.fullName}
          detail={t.removeDetail}
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
      {avatarTarget && (
        <Confirm
          action={t.removeAvatarAction}
          item={avatarTarget.student.fullName}
          detail={t.removeAvatarDetail}
          pending={act.isPending}
          error={act.error}
          onClose={() => {
            act.reset();
            setAvatarTarget(null);
          }}
          onConfirm={() =>
            act.mutate({ path: `/classes/${classroom.id}/students/${avatarTarget.studentId}/avatar`, method: "DELETE" }, { onSuccess: () => setAvatarTarget(null) })
          }
        />
      )}
      {modal === "provision" && (
        <Modal title={t.issueAccount} onClose={() => setModal("")}>
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
              <Field label={t.username} name="username" required autoComplete="off" minLength={3} maxLength={32} />
              <Field label={t.fullName} name="fullName" required maxLength={200} />
              <label className="field">
                <span>{t.gradeLabel}</span>
                <select name="grade" defaultValue={classroom.grade}>
                  {[6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>
                      {t.grade(g)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" required />
                {t.schoolConsent}
              </label>
              <ErrorBox error={act.error} />
              <button className="primary wide" disabled={act.isPending}>
                {t.issue}
              </button>
            </form>
          )}
        </Modal>
      )}
      {modal === "enroll" && (
        <Modal title={t.enrolExisting} onClose={() => setModal("")}>
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
            <Field label={t.studentUsername} name="username" required autoComplete="off" />
            <p className="tiny muted">{t.enrolNote}</p>
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Ghi danh
            </button>
          </form>
        </Modal>
      )}
      {modal === "parent-code" && parentTarget && (
        <Modal title="Mã liên kết phụ huynh" onClose={() => setModal("")}>
          {parentCode ? (
            <div className="notice" role="status">
              <b>Mã cho phụ huynh của {parentTarget.student.fullName}</b>
              <p>
                <code className="link-code">{parentCode.code}</code>
              </p>
              <p>Hạn dùng: {new Date(parentCode.expiresAt).toLocaleString("vi-VN")}</p>
              <p className="tiny">Mã chỉ hiển thị một lần và chỉ dùng được một lần. Hãy gửi riêng cho phụ huynh.</p>
              <button type="button" className="secondary" onClick={() => setModal("")}>
                Đã lưu mã
              </button>
            </div>
          ) : (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                act.mutate(
                  { path: `/classes/${classroom.id}/students/${parentTarget.studentId}/parent-link-codes`, body: { guardianVerified: true } },
                  { onSuccess: (data: any) => setParentCode(data) },
                );
              }}
            >
              <p>Học sinh: {parentTarget.student.fullName}</p>
              <label className="check">
                <input type="checkbox" required />
                Tôi đã xác minh người nhận là phụ huynh hoặc người giám hộ theo hồ sơ của nhà trường.
              </label>
              <ErrorBox error={act.error} />
              <button className="primary wide" disabled={act.isPending}>
                Tạo mã liên kết
              </button>
            </form>
          )}
        </Modal>
      )}
      {modal === "credentials" && (
        <Modal title={t.resetTitle} onClose={() => setModal("")}>
          <ErrorBox error={act.error} />
          {credentials ? <CredentialNotice credentials={credentials} onDone={() => setModal("")} /> : !act.error && <div className="notice">{t.creatingTemp}</div>}
        </Modal>
      )}
    </section>
  );
}

function CredentialNotice({ credentials, onDone }: { credentials: { username: string; temporaryPassword: string; expiresAt: string }; onDone: () => void }) {
  return (
    <div className="notice" role="status">
      <b>{t.credentials}</b>
      <p>
        {t.usernameLabel} <code>{credentials.username}</code>
      </p>
      <p>
        {t.tempPassword} <code>{credentials.temporaryPassword}</code>
      </p>
      <p>{t.expires} {formatDateTime(credentials.expiresAt)}</p>
      <p className="tiny">{t.shareOnce}</p>
      <button type="button" className="secondary" onClick={onDone}>
        {t.saved}
      </button>
    </div>
  );
}
