import { ArrowRight } from "lucide-react";
import { api, useAuth } from "../lib/api";
import { Badge, ErrorBox, Field, useAction } from "../components/ui";

export function PasswordGate() {
  const action = useAction(async (body: any) => {
    const result = await api("/auth/password", "POST", body);
    useAuth.getState().set(result.user, result.accessToken);
    return result;
  });
  return (
    <div className="login">
      <section className="login-form">
        <div>
          <Badge>THIẾT LẬP TÀI KHOẢN</Badge>
          <h2>Đổi mật khẩu tạm</h2>
          <p className="muted">Hãy tạo mật khẩu riêng trước khi bắt đầu học.</p>
          <form onSubmit={(e) => { e.preventDefault(); action.mutate(Object.fromEntries(new FormData(e.currentTarget))); }}>
            <Field label="Mật khẩu tạm" name="currentPassword" type="password" required autoComplete="current-password" />
            <Field label="Mật khẩu mới (ít nhất 12 ký tự)" name="password" type="password" minLength={12} required autoComplete="new-password" />
            <ErrorBox error={action.error} />
            {action.isSuccess && <p className="notice">Đã đổi mật khẩu. Đang mở không gian học tập…</p>}
            <button className="primary wide" disabled={action.isPending}>{action.isPending ? "Đang lưu…" : "Lưu và bắt đầu học"}<ArrowRight size={17} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}
