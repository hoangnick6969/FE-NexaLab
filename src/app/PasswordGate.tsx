import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api, useAuth } from "../lib/api";
import { Badge, ErrorBox, PasswordField, useAction } from "../components/ui";
import { defineText } from "../i18n";

const text = defineText({
  vi: {
    badge: "THIẾT LẬP TÀI KHOẢN",
    title: "Đổi mật khẩu tạm",
    intro: "Hãy tạo mật khẩu riêng trước khi bắt đầu học.",
    current: "Mật khẩu tạm",
    next: "Mật khẩu mới (ít nhất 12 ký tự)",
    confirm: "Nhập lại mật khẩu mới",
    mismatch: "Mật khẩu nhập lại chưa khớp. Hãy kiểm tra lại.",
    signOut: "Đăng xuất và quay lại đăng nhập",
    done: "Đã đổi mật khẩu. Đang mở không gian học tập…",
    saving: "Đang lưu…",
    save: "Lưu và bắt đầu học",
  },
  en: {
    badge: "ACCOUNT SET-UP",
    title: "Change your temporary password",
    intro: "Create your own password before you start learning.",
    current: "Temporary password",
    next: "New password (at least 12 characters)",
    confirm: "Confirm new password",
    mismatch: "The passwords do not match. Please check and try again.",
    signOut: "Sign out and return to sign-in",
    done: "Password changed. Opening your learning space…",
    saving: "Saving…",
    save: "Save and start learning",
  },
});

export function PasswordGate() {
  const t = text();
  const navigate = useNavigate();
  const action = useAction(async (body: any) => {
    if (body.password !== body.confirmPassword) throw new Error(t.mismatch);
    const result = await api("/auth/password", "POST", { currentPassword: body.currentPassword, password: body.password });
    navigate(result.user.role === "ADMIN" ? "/admin" : result.user.role === "TEACHER" ? "/classes" : result.user.role === "PARENT" ? "/progress" : "/", { replace: true });
    useAuth.getState().set(result.user, result.accessToken);
    return result;
  });
  const signOut = useAction(async () => {
    await api("/auth/logout", "POST");
    useAuth.getState().set(null, null);
    navigate("/login", { replace: true });
  });
  return (
    <div className="login">
      <section className="login-form">
        <div>
          <Badge>{t.badge}</Badge>
          <h2>{t.title}</h2>
          <p className="muted">{t.intro}</p>
          <form onChange={() => { if (action.isError) action.reset(); }} onSubmit={(e) => { e.preventDefault(); action.mutate(Object.fromEntries(new FormData(e.currentTarget))); }}>
            <PasswordField label={t.current} name="currentPassword" maxLength={128} required autoComplete="current-password" />
            <PasswordField label={t.next} name="password" minLength={12} maxLength={128} required autoComplete="new-password" />
            <PasswordField label={t.confirm} name="confirmPassword" minLength={12} maxLength={128} required autoComplete="new-password" />
            <ErrorBox error={action.error ?? signOut.error} />
            {action.isSuccess && <p className="notice">{t.done}</p>}
            <button className="primary wide" disabled={action.isPending || signOut.isPending}>{action.isPending ? t.saving : t.save}<ArrowRight size={17} /></button>
          </form>
          <button className="secondary wide" disabled={action.isPending || signOut.isPending} onClick={() => signOut.mutate(undefined)}>{t.signOut}</button>
        </div>
      </section>
    </div>
  );
}
