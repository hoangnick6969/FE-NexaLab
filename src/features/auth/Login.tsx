import { Atom, ArrowRight } from "lucide-react";
import { useState } from "react";
import { api, useAuth } from "../../lib/api";
import { Badge, ErrorBox, Field, useAction } from "../../components/ui";

export function Login() {
  const [mode, setMode] = useState(
    new URLSearchParams(location.search).has("reset")
      ? "reset"
      : "student-login",
  );
  const [message, setMessage] = useState("");
  const action = useAction(async (b: any) => {
    if (mode === "forgot") {
      const r = await api("/auth/forgot", "POST", b);
      setMessage(r.message);
      return;
    }
    if (mode === "reset") {
      await api("/auth/reset", "POST", {
        ...b,
        token: new URLSearchParams(location.search).get("reset"),
      });
      history.replaceState({}, "", "/login");
      setMode("login");
      setMessage("Đã đổi mật khẩu. Vui lòng đăng nhập.");
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
      mode === "register" ? { ...b, role: "PARENT", consent: true } : b,
    );
    useAuth.getState().set(r.user, r.accessToken);
  });
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <Atom /> NexaLab.
        </div>
        <Badge>KHOA HỌC TỰ NHIÊN · LỚP 8–9</Badge>
        <h1>
          Mỗi câu hỏi
          <br />
          mở ra một
          <br />
          <em>cách hiểu mới.</em>
        </h1>
        <p>
          Đọc, quan sát rồi tự mình thử nghiệm. Em sẽ hiểu khoa học qua từng bước
          nhỏ và những lần thử của chính mình.
        </p>
        <div className="orbit-art">
          <i />
          <i />
          <i />
          <span aria-hidden="true" />
        </div>
        <small>SINH HỌC · HÓA HỌC · VẬT LÝ</small>
      </section>
      <section className="login-form">
        <div>
          <Badge>CHÀO MỪNG ĐẾN NEXALAB</Badge>
          <h2>
            {mode === "admin-login"
              ? "CỔNG QUẢN TRỊ NEXALAB"
              : mode === "login"
                ? "Đăng nhập người lớn"
                : mode === "student-login"
                  ? "Đăng nhập học sinh"
                  : mode === "register"
                    ? "Tài khoản phụ huynh"
                    : mode === "forgot"
                      ? "Quên mật khẩu"
                      : "Đặt mật khẩu mới"}
          </h2>
          <p className="muted">
            {mode === "admin-login"
              ? "Đăng nhập dành riêng cho quản trị viên."
              : mode === "login"
                ? "Dành cho giáo viên và phụ huynh quản lý việc học."
                : mode === "student-login"
                  ? "Tài khoản học sinh được giáo viên hoặc nhà trường cấp."
                  : mode === "forgot"
                    ? "Nhập email giáo viên hoặc phụ huynh để nhận mật khẩu tạm thời."
                    : "Tài khoản phụ huynh dành cho người lớn."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.mutate(Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            {mode === "register" && (
              <Field label="Họ và tên" name="fullName" required />
            )}
            {mode === "student-login" && (
              <Field
                label="Tên đăng nhập học sinh"
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
                label="Mật khẩu"
                name="password"
                type="password"
                minLength={mode === "login" || mode === "student-login" || mode === "admin-login" ? 1 : 12}
                required
                autoComplete={
                  mode === "login" || mode === "student-login" ? "current-password" : "new-password"
                }
              />
            )}{" "}
            {mode === "register" && (
              <label className="check">
                <input type="checkbox" required />
                Tôi là người lớn và đồng ý xử lý dữ liệu tài khoản để sử dụng
                nền tảng.
              </label>
            )}
            <ErrorBox error={action.error} />
            {message && <p className="notice">{message}</p>}
            <button className="primary wide" disabled={action.isPending}>
              {action.isPending
                ? "Đang xử lý…"
                : mode === "login" || mode === "student-login" || mode === "admin-login"
                  ? "Đăng nhập"
                  : mode === "register"
                    ? "Tạo tài khoản"
                    : "Xác nhận"}
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
                ? "Đăng nhập người lớn"
                : "Học sinh đăng nhập bằng tên tài khoản"}
            </button>
            <button
              onClick={() => {
                setMode(mode === "admin-login" ? "student-login" : "admin-login");
                setMessage("");
              }}
            >
              {mode === "admin-login" ? "Đăng nhập người dùng" : "Cổng quản trị viên"}
            </button>
            <button
              onClick={() => {
                setMode(mode === "forgot" ? "login" : "forgot");
                setMessage("");
              }}
            >
              Quên mật khẩu?
            </button>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Đăng ký phụ huynh" : "Quay lại đăng nhập"}
            </button>
          </div>
          <p className="tiny muted">
            Không cần camera. Các thí nghiệm được thực hiện hoàn toàn trên trình
            duyệt.
          </p>
        </div>
      </section>
    </div>
  );
}
