import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { type ClassSummary, type Enrollment } from "./class-types";
import { Confirm, LoadError, statusLabel, useMutate } from "./class-ui";

export function Roster({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [tab, setTab] = useState<"approved" | "pending" | "removed">(classroom.members.pending ? "pending" : "approved");
  const [modal, setModal] = useState<"" | "provision" | "enroll" | "credentials" | "parent-code">("");
  const [credentials, setCredentials] = useState<any>(null);
  const [parentTarget, setParentTarget] = useState<Enrollment | null>(null);
  const [parentCode, setParentCode] = useState<{ code: string; expiresAt: string } | null>(null);
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
