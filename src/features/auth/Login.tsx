import { Atom, ArrowRight } from "lucide-react";
import { useState } from "react";
import { api, useAuth } from "../../lib/api";
import { Badge, ErrorBox, Field, useAction } from "../../components/ui";
import { chooseLocaleBeforeSignIn, defineText, getLocale, LOCALE_OPTIONS } from "../../i18n";

const text = defineText({
  vi: {
    forgotSent: "Nếu email tồn tại, hướng dẫn đã được gửi.",
    resetDone: "Đã đổi mật khẩu. Vui lòng đăng nhập.",
    scope: "KHOA HỌC TỰ NHIÊN · LỚP 8–9",
    heroLine1: "Mỗi câu hỏi",
    heroLine2: "mở ra một",
    heroEmphasis: "cách hiểu mới.",
    heroBody: "Đọc, quan sát rồi tự mình thử nghiệm. Em sẽ hiểu khoa học qua từng bước nhỏ và những lần thử của chính mình.",
    subjects: "SINH HỌC · HÓA HỌC · VẬT LÝ",
    welcome: "CHÀO MỪNG ĐẾN NEXALAB",
    adminPortal: "CỔNG QUẢN TRỊ NEXALAB",
    adultLogin: "Đăng nhập người lớn",
    studentLogin: "Đăng nhập học sinh",
    parentAccount: "Tài khoản phụ huynh",
    forgotTitle: "Quên mật khẩu",
    resetTitle: "Đặt mật khẩu mới",
    adminIntro: "Đăng nhập dành riêng cho quản trị viên.",
    adultIntro: "Dành cho giáo viên và phụ huynh quản lý việc học.",
    studentIntro: "Tài khoản học sinh được giáo viên hoặc nhà trường cấp.",
    forgotIntro: "Nhập email giáo viên hoặc phụ huynh để nhận mật khẩu tạm thời.",
    parentIntro: "Tài khoản phụ huynh dành cho người lớn.",
    fullName: "Họ và tên",
    studentUsername: "Tên đăng nhập học sinh",
    password: "Mật khẩu",
    remember: "Ghi nhớ đăng nhập trên thiết bị này",
    rememberHint: "Chỉ bật trên máy riêng. Khi tắt, phiên kết thúc lúc đóng trình duyệt.",
    consent: "Tôi là người lớn và đồng ý xử lý dữ liệu tài khoản để sử dụng nền tảng.",
    working: "Đang xử lý…",
    signIn: "Đăng nhập",
    createAccount: "Tạo tài khoản",
    confirm: "Xác nhận",
    studentByUsername: "Học sinh đăng nhập bằng tên tài khoản",
    userLogin: "Đăng nhập người dùng",
    adminLink: "Cổng quản trị viên",
    forgotLink: "Quên mật khẩu?",
    registerParent: "Đăng ký phụ huynh",
    backToLogin: "Quay lại đăng nhập",
    noCamera: "Không cần camera. Các thí nghiệm được thực hiện hoàn toàn trên trình duyệt.",
  },
  en: {
    forgotSent: "If the email exists, instructions have been sent.",
    resetDone: "Password changed. Please sign in.",
    scope: "NATURAL SCIENCE · GRADES 8–9",
    heroLine1: "Every question",
    heroLine2: "opens up a",
    heroEmphasis: "new way of understanding.",
    heroBody: "Read, observe, then experiment yourself. You will understand science one small step and one attempt at a time.",
    subjects: "BIOLOGY · CHEMISTRY · PHYSICS",
    welcome: "WELCOME TO NEXALAB",
    adminPortal: "NEXALAB ADMIN PORTAL",
    adultLogin: "Adult sign-in",
    studentLogin: "Student sign-in",
    parentAccount: "Parent account",
    forgotTitle: "Forgot password",
    resetTitle: "Set a new password",
    adminIntro: "Sign-in for administrators only.",
    adultIntro: "For teachers and parents who manage learning.",
    studentIntro: "Student accounts are issued by the teacher or school.",
    forgotIntro: "Enter a teacher or parent email to receive a temporary password.",
    parentIntro: "Parent accounts are for adults.",
    fullName: "Full name",
    studentUsername: "Student username",
    password: "Password",
    remember: "Keep me signed in on this device",
    rememberHint: "Only on your own device. When off, the session ends when the browser closes.",
    consent: "I am an adult and agree to the processing of account data to use the platform.",
    working: "Working…",
    signIn: "Sign in",
    createAccount: "Create account",
    confirm: "Confirm",
    studentByUsername: "Students sign in with a username",
    userLogin: "User sign-in",
    adminLink: "Administrator portal",
    forgotLink: "Forgot password?",
    registerParent: "Parent sign-up",
    backToLogin: "Back to sign-in",
    noCamera: "No camera needed. Experiments run entirely in the browser.",
  },
});

export function Login() {
  const t = text();
  const [mode, setMode] = useState(
    new URLSearchParams(location.search).has("reset")
      ? "reset"
      : "student-login",
  );
  const [message, setMessage] = useState("");
  const action = useAction(async (b: any) => {
    if (mode === "forgot") {
      const r = await api("/auth/forgot", "POST", b);
      setMessage(t.forgotSent);
      return;
    }
    if (mode === "reset") {
      await api("/auth/reset", "POST", {
        ...b,
        token: new URLSearchParams(location.search).get("reset"),
      });
      history.replaceState({}, "", "/login");
      setMode("login");
      setMessage(t.resetDone);
      return;
    }
    const r = await api(
      "/auth/" +
      (mode === "student-login"
        ? "student/login"
        : mode === "admin-login"
          ? "admin/login"
          : mode === "register"
            ? "register"
            : "login"),
      "POST",
      mode === "register" ? { ...b, role: "PARENT", consent: true } : { ...b, remember: b.remember === "on" },
    );
    useAuth.getState().set(r.user, r.accessToken);
  });
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <Atom /> NexaLab.
        </div>
        <Badge>{t.scope}</Badge>
        <h1>
          {t.heroLine1}
          <br />
          {t.heroLine2}
          <br />
          <em>{t.heroEmphasis}</em>
        </h1>
        <p>
          {t.heroBody}
        </p>
        <div className="orbit-art">
          <i />
          <i />
          <i />
          <span aria-hidden="true" />
        </div>
        <small>{t.subjects}</small>
      </section>
      <section className="login-form">
        <div>
          <div className="login-language" role="group" aria-label="Ngôn ngữ / Language">
            {LOCALE_OPTIONS.map((option) => (
              <button type="button" key={option.value} lang={option.value} aria-pressed={getLocale() === option.value} onClick={() => chooseLocaleBeforeSignIn(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <Badge>{t.welcome}</Badge>
          <h2>
            {mode === "admin-login"
              ? t.adminPortal
              : mode === "login"
                ? t.adultLogin
                : mode === "student-login"
                  ? t.studentLogin
                  : mode === "register"
                    ? t.parentAccount
                    : mode === "forgot"
                      ? t.forgotTitle
                      : t.resetTitle}
          </h2>
          <p className="muted">
            {mode === "admin-login"
              ? t.adminIntro
              : mode === "login"
                ? t.adultIntro
                : mode === "student-login"
                  ? t.studentIntro
                  : mode === "forgot"
                    ? t.forgotIntro
                    : t.parentIntro}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.mutate(Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            {mode === "register" && (
              <Field label={t.fullName} name="fullName" required />
            )}
            {mode === "student-login" && (
              <Field
                label={t.studentUsername}
                name="username"
                required
                autoComplete="username"
              />
            )}
            {mode !== "reset" && mode !== "student-login" && (
              <Field
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            )}
            {mode !== "forgot" && (
              <Field
                label={t.password}
                name="password"
                type="password"
                minLength={mode === "login" || mode === "student-login" || mode === "admin-login" ? 1 : 12}
                required
                autoComplete={
                  mode === "login" || mode === "student-login" ? "current-password" : "new-password"
                }
              />
            )}{" "}
            {(mode === "login" || mode === "student-login" || mode === "admin-login") && (
              <label className="check login-remember">
                <input type="checkbox" name="remember" />
                {t.remember}
                <small className="muted">{t.rememberHint}</small>
              </label>
            )}
            {mode === "register" && (
              <label className="check">
                <input type="checkbox" required />
                {t.consent}
              </label>
            )}
            <ErrorBox error={action.error} />
            {message && <p className="notice">{message}</p>}
            <button className="primary wide" disabled={action.isPending}>
              {action.isPending
                ? t.working
                : mode === "login" || mode === "student-login" || mode === "admin-login"
                  ? t.signIn
                  : mode === "register"
                    ? t.createAccount
                    : t.confirm}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-links">
            <button
              onClick={() => {
                setMode(mode === "student-login" ? "login" : "student-login");
                setMessage("");
              }}
            >
              {mode === "student-login"
                ? t.adultLogin
                : t.studentByUsername}
            </button>
            <button
              onClick={() => {
                setMode(mode === "admin-login" ? "student-login" : "admin-login");
                setMessage("");
              }}
            >
              {mode === "admin-login" ? t.userLogin : t.adminLink}
            </button>
            <button
              onClick={() => {
                setMode(mode === "forgot" ? "login" : "forgot");
                setMessage("");
              }}
            >
              {t.forgotLink}
            </button>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? t.registerParent : t.backToLogin}
            </button>
          </div>
          <p className="tiny muted">
            {t.noCamera}
          </p>
        </div>
      </section>
    </div>
  );
}
