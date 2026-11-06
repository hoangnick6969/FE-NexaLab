import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpDown, CheckCheck, KeyRound, ImageOff, QrCode, UserMinus, Check, Plus } from "lucide-react";
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
    enrol: "Ghi danh",
    parentCode: "Mã liên kết phụ huynh",
    parentCodeFor: (name: string) => `Mã cho phụ huynh của ${name}`,
    parentCodeExpires: (date: string) => `Hạn dùng: ${date}`,
    parentCodeOnce: "Mã chỉ hiển thị một lần và chỉ dùng được một lần. Hãy gửi riêng cho phụ huynh.",
    parentCodeSaved: "Đã lưu mã",
    parentCodeStudent: (name: string) => `Học sinh: ${name}`,
    guardianVerified: "Tôi đã xác minh người nhận là phụ huynh hoặc người giám hộ theo hồ sơ của nhà trường.",
    issueParentCode: "Tạo mã liên kết",
    resetTitle: "Cấp lại mật khẩu học sinh",
    creatingTemp: "Đang tạo mật khẩu tạm mới…",
    credentials: "Thông tin đăng nhập",
    usernameLabel: "Tên đăng nhập:",
    tempPassword: "Mật khẩu tạm:",
    expires: "Hạn dùng:",
    shareOnce: "Hãy lưu và gửi riêng cho học sinh. Mật khẩu sẽ không hiển thị lại.",
    saved: "Đã lưu thông tin",
    searchStudentPlaceholder: "Tìm học sinh theo họ tên hoặc tài khoản…",
    sortByNameAsc: "Tên (A → Z)",
    sortByNameDesc: "Tên (Z → A)",
    sortByUsername: "Tài khoản (A → Z)",
    showingStudents: (n: number, total: number) => `Hiển thị ${n} / ${total} học sinh`,
    noMatchingStudents: "Không tìm thấy học sinh nào phù hợp.",
    approveAll: (n: number) => `Duyệt tất cả (${n})`,
    approvingAll: "Đang duyệt tất cả…",
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
    enrol: "Enrol",
    parentCode: "Parent link code",
    parentCodeFor: (name: string) => `Code for ${name}'s parent`,
    parentCodeExpires: (date: string) => `Valid until: ${date}`,
    parentCodeOnce: "The code is shown once and works once. Send it privately to the parent.",
    parentCodeSaved: "Code saved",
    parentCodeStudent: (name: string) => `Student: ${name}`,
    guardianVerified: "I have verified the recipient as the parent or guardian against school records.",
    issueParentCode: "Create link code",
    resetTitle: "Reset the student's password",
    creatingTemp: "Creating a new temporary password…",
    credentials: "Sign-in details",
    usernameLabel: "Username:",
    tempPassword: "Temporary password:",
    expires: "Expires:",
    shareOnce: "Save it and give it to the student privately. The password will not be shown again.",
    saved: "I saved the details",
    searchStudentPlaceholder: "Search student by name or username…",
    sortByNameAsc: "Name (A → Z)",
    sortByNameDesc: "Name (Z → A)",
    sortByUsername: "Username (A → Z)",
    showingStudents: (n: number, total: number) => `Showing ${n} / ${total} students`,
    noMatchingStudents: "No students match your search.",
    approveAll: (n: number) => `Approve all (${n})`,
    approvingAll: "Approving all…",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "username">("name_asc");
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const rows = roster.data?.filter((e) => e.status === tab) ?? [];
  const filteredRows = rows
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        e.student.fullName.toLowerCase().includes(q) ||
        e.student.username.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.student.fullName.localeCompare(b.student.fullName, "vi");
      }
      if (sortBy === "name_desc") {
        return b.student.fullName.localeCompare(a.student.fullName, "vi");
      }
      return a.student.username.localeCompare(b.student.username);
    });

  const handleApproveAll = async () => {
    const pendingList = rows.filter((e) => e.status === "pending");
    if (!pendingList.length || isApprovingAll) return;
    setIsApprovingAll(true);
    try {
      for (const item of pendingList) {
        await api(`/classes/${classroom.id}/students/${item.studentId}`, "PUT", { status: "approved" });
      }
      await roster.refetch();
    } finally {
      setIsApprovingAll(false);
    }
  };

  const open = (next: typeof modal) => {
    formKey.current = idempotencyKey();
    act.reset();
    setCredentials(null);
    setModal(next);
  };
  return (
    <section className="panel roster-panel" aria-labelledby="roster-title">
      <div className="section-heading roster-section-heading">
        <div className="section-title-wrap">
          <h2 id="roster-title">{t.members}</h2>
          <span className="section-count-pill">{roster.data?.length ?? 0}</span>
        </div>
        {!archived && (
          <div className="button-row">
            <button type="button" className="secondary button-compact" onClick={() => open("enroll")}>
              {t.enrolExisting}
            </button>
            <button type="button" className="primary button-compact" onClick={() => open("provision")}>
              <Plus size={14} aria-hidden="true" />
              <span>{t.issueAccount}</span>
            </button>
          </div>
        )}
      </div>
      <div className="tabs roster-tabs" role="tablist" aria-label={t.memberStatus}>
        {(["approved", "pending", "removed"] as const).map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
            <span>{statusLabel[value]}</span>
            <span className="cat-count">{roster.data?.filter((e) => e.status === value).length ?? 0}</span>
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
        <div className="roster-toolbar">
          <div className="roster-search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder={t.searchStudentPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm học sinh"
            />
          </div>
          <div className="roster-actions-wrap">
            <label className="filter-select-wrap">
              <ArrowUpDown size={14} aria-hidden="true" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sắp xếp danh sách"
              >
                <option value="name_asc">{t.sortByNameAsc}</option>
                <option value="name_desc">{t.sortByNameDesc}</option>
                <option value="username">{t.sortByUsername}</option>
              </select>
            </label>
            {!archived && tab === "pending" && rows.length >= 2 && (
              <button
                type="button"
                className="primary button-compact"
                disabled={isApprovingAll || act.isPending}
                onClick={handleApproveAll}
              >
                <CheckCheck size={16} aria-hidden="true" />
                {isApprovingAll ? t.approvingAll : t.approveAll(rows.length)}
              </button>
            )}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <p className="tiny muted roster-count-badge">
          {t.showingStudents(filteredRows.length, rows.length)}
        </p>
      )}
      {rows.length > 0 && filteredRows.length === 0 && (
        <Empty>{t.noMatchingStudents}</Empty>
      )}
      {filteredRows.length > 0 && (
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
              {filteredRows.map((e) => (
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
                  <td className="roster-actions-cell-wrap">
                    <div className="roster-actions-cell">
                      {!archived && e.status === "pending" && (
                        <button
                          type="button"
                          className="button-compact primary"
                          disabled={act.isPending}
                          onClick={() => act.mutate({ path: `/classes/${classroom.id}/students/${e.studentId}`, method: "PUT", body: { status: "approved" } })}
                        >
                          <Check size={13} aria-hidden="true" />
                          <span>{t.approve}</span>
                        </button>
                      )}
                      {!archived && e.status !== "removed" && (
                        <>
                          {e.status === "approved" && (
                            <button
                              type="button"
                              className="button-compact secondary"
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
                              <KeyRound size={13} aria-hidden="true" />
                              <span>{t.resetPassword}</span>
                            </button>
                          )}
                          {e.status === "approved" && e.student.avatarUrl && (
                            <button type="button" className="button-compact secondary danger-hover" onClick={() => setAvatarTarget(e)}>
                              <ImageOff size={13} aria-hidden="true" />
                              <span>{t.removeAvatar}</span>
                            </button>
                          )}
                          {e.status === "approved" && (
                            <button
                              type="button"
                              className="button-compact secondary"
                              onClick={() => {
                                act.reset();
                                setParentCode(null);
                                setParentTarget(e);
                                setModal("parent-code");
                              }}
                            >
                              <QrCode size={13} aria-hidden="true" />
                              <span>{t.parentCode}</span>
                            </button>
                          )}
                          <button type="button" className="button-compact danger-text" onClick={() => setConfirm(e)}>
                            <UserMinus size={13} aria-hidden="true" />
                            <span>{e.status === "pending" ? t.reject : t.remove}</span>
                          </button>
                        </>
                      )}
                    </div>
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
              {t.enrol}
            </button>
          </form>
        </Modal>
      )}
      {modal === "parent-code" && parentTarget && (
        <Modal title={t.parentCode} onClose={() => setModal("")}>
          {parentCode ? (
            <div className="notice" role="status">
              <b>{t.parentCodeFor(parentTarget.student.fullName)}</b>
              <p>
                <code className="link-code">{parentCode.code}</code>
              </p>
              <p>{t.parentCodeExpires(formatDateTime(parentCode.expiresAt))}</p>
              <p className="tiny">{t.parentCodeOnce}</p>
              <button type="button" className="secondary" onClick={() => setModal("")}>
                {t.parentCodeSaved}
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
              <p>{t.parentCodeStudent(parentTarget.student.fullName)}</p>
              <label className="check">
                <input type="checkbox" required />
                {t.guardianVerified}
              </label>
              <ErrorBox error={act.error} />
              <button className="primary wide" disabled={act.isPending}>
                {t.issueParentCode}
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
