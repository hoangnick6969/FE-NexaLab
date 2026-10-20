import { ArrowRight } from "lucide-react";
import { api, useAuth } from "../lib/api";
import { Badge, ErrorBox, Field, useAction } from "../components/ui";
import { defineText } from "../i18n";

const text = defineText({
  vi: {
    badge: "THIẾT LẬP TÀI KHOẢN",
    title: "Đổi mật khẩu tạm",
    intro: "Hãy tạo mật khẩu riêng trước khi bắt đầu học.",
    current: "Mật khẩu tạm",
    next: "Mật khẩu mới (ít nhất 12 ký tự)",
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
    done: "Password changed. Opening your learning space…",
    saving: "Saving…",
    save: "Save and start learning",
  },
});

export function PasswordGate() {
  const t = text();
  const action = useAction(async (body: any) => {
    const result = await api("/auth/password", "POST", body);
    useAuth.getState().set(result.user, result.accessToken);
    return result;
  });
  return (
    <div className="login">
      <section className="login-form">
        <div>
          <Badge>{t.badge}</Badge>
          <h2>{t.title}</h2>
          <p className="muted">{t.intro}</p>
          <form onSubmit={(e) => { e.preventDefault(); action.mutate(Object.fromEntries(new FormData(e.currentTarget))); }}>
            <Field label={t.current} name="currentPassword" type="password" required autoComplete="current-password" />
            <Field label={t.next} name="password" type="password" minLength={12} required autoComplete="new-password" />
            <ErrorBox error={action.error} />
            {action.isSuccess && <p className="notice">{t.done}</p>}
            <button className="primary wide" disabled={action.isPending}>{action.isPending ? t.saving : t.save}<ArrowRight size={17} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}
