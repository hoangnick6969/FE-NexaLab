import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { ErrorBox, Field, useAction } from "../../components/ui";

export function SettingsPage() {
  const user = useAuth((s) => s.user)!;
  const change = useAction((b: any) => api("/auth/password", "POST", b));
  return (
    <>
      <PageHeading title="Cài đặt tài khoản" />
      <section className="panel narrow">
        <h2>{user.fullName}</h2>
        <p>{user.email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <Field
            label="Mật khẩu hiện tại"
            name="currentPassword"
            type="password"
            required
          />
          <Field
            label="Mật khẩu mới (ít nhất 12 ký tự)"
            name="password"
            type="password"
            minLength={12}
            required
          />
          <button className="primary" disabled={change.isPending}>
            Đổi mật khẩu
          </button>
          <ErrorBox error={change.error} />
          {change.isSuccess && (
            <p className="notice">
              Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.
            </p>
          )}
        </form>
      </section>
      {user.role === "STUDENT" && (
        <section className="panel narrow">
          <h3>Liên kết phụ huynh</h3>
          <p>
            Mã liên kết do giáo viên của em cấp sau khi nhà trường xác minh phụ huynh. Nếu phụ huynh cần theo dõi tiến độ, em hãy báo giáo viên.
          </p>
        </section>
      )}
    </>
  );
}
