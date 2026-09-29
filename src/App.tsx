import { Suspense, lazy, useEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Atom,
  LayoutDashboard,
  FlaskConical,
  BookOpen,
  Users,
  ChartNoAxesCombined,
  Bookmark,
  LogOut,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Settings,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { api, useAuth, restore } from "./api";
import { queryClient } from "./main";
import { Badge, Empty, ErrorBox, Field, useAction } from "./ui";
import {
  Lessons,
  Classes,
  ProgressPage,
  Saved,
  SettingsPage,
  AdminPage,
} from "./pages";
const Lab = lazy(() => import("./labs/Lab"));
const names = {
  STUDENT: "Học sinh",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  ADMIN: "Quản trị viên",
};
export default function App() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    restore().finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="boot">
        <Atom size={42} />
        <p>Đang mở phòng khám phá…</p>
      </div>
    );
  if (!user) return <Login />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Atom size={25} />
          </span>
          NexaLab<span className="brand-dot">.</span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <b>Không gian học tập</b>
            <small>Khoa học tự nhiên · THCS</small>
          </div>
        </div>
        <p className="nav-caption">KHÁM PHÁ & HỌC TẬP</p>
        <nav>
          <NavLink end to="/">
            <LayoutDashboard />
            Tổng quan
          </NavLink>
          {["STUDENT", "TEACHER"].includes(user.role) && (
            <NavLink to="/labs">
              <FlaskConical />
              Phòng thí nghiệm <span className="nav-count">3</span>
            </NavLink>
          )}
          <NavLink to="/lessons">
            <BookOpen />
            Thư viện bài học
          </NavLink>
          {["STUDENT", "TEACHER", "ADMIN"].includes(user.role) && (
            <NavLink to="/classes">
              <Users />
              Lớp học của tôi
            </NavLink>
          )}
          <NavLink to="/progress">
            <ChartNoAxesCombined />
            {user.role === "PARENT" ? "Tiến độ của con" : "Tiến độ học tập"}
          </NavLink>
          {user.role === "STUDENT" && (
            <NavLink to="/saved">
              <Bookmark />
              Thí nghiệm đã lưu
            </NavLink>
          )}
          {user.role === "ADMIN" && (
            <NavLink to="/admin">
              <Settings />
              Quản trị
            </NavLink>
          )}
        </nav>
        <div className="sidebar-tip">
          <Sparkles size={22} />
          <b>Mỗi câu hỏi là một khởi đầu.</b>
          <p>Thử nghiệm, quan sát và tìm ra câu trả lời của riêng em.</p>
          <Link to="/lessons">
            Khám phá hôm nay <ArrowUpRight size={15} />
          </Link>
        </div>
        <NavLink className="settings-link" to="/settings">
          <Settings size={18} />
          Cài đặt tài khoản
        </NavLink>
        <div className="user-card">
          <span className="avatar">
            {user.fullName.split(" ").at(-1)?.slice(0, 1)}
          </span>
          <div>
            <b>{user.fullName}</b>
            <small>{names[user.role]}</small>
          </div>
          <button
            title="Đăng xuất"
            className="icon-button"
            onClick={async () => {
              await api("/auth/logout", "POST");
              useAuth.getState().set(null, null);
              queryClient.clear();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div>
            <span>Không gian học tập</span>
            <ChevronRight size={14} />
            <b>NexaLab</b>
          </div>
          <div>
            <span className="online-dot" /> Sẵn sàng khám phá{" "}
            <Link
              to="/settings"
              aria-label="Tài khoản"
              className="avatar small"
            >
              {user.fullName.charAt(0)}
            </Link>
          </div>
        </header>
        <main className="main">
          <Suspense fallback={<Empty>Đang tải phòng thí nghiệm…</Empty>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/labs" element={<LabLibrary />} />
              <Route
                path="/labs/:id"
                element={
                  ["STUDENT", "TEACHER"].includes(user.role) ? (
                    <Lab />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/admin"
                element={
                  user.role === "ADMIN" ? <AdminPage /> : <Navigate to="/" />
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="footer">
          <span>NexaLab · Chạm vào khoa học</span>
          <span>Quan sát. Thử nghiệm. Thấu hiểu.</span>
        </footer>
      </div>
    </div>
  );
}
function Login() {
  const [mode, setMode] = useState(
    new URLSearchParams(location.search).has("reset") ? "reset" : "login",
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
      history.replaceState({}, "", "/");
      setMode("login");
      setMessage("Đã đổi mật khẩu. Vui lòng đăng nhập.");
      return;
    }
    const r = await api(
      "/auth/" + (mode === "register" ? "register" : "login"),
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
        <Badge>PHÒNG THỰC HÀNH CỦA THẾ HỆ MỚI</Badge>
        <h1>
          Khoa học
          <br />
          bắt đầu từ
          <br />
          <em>“Tại sao?”</em>
        </h1>
        <p>
          Biến những điều em tò mò thành những điều em hiểu. Khám phá, thực hành
          và học qua từng lần thử.
        </p>
        <div className="orbit-art">
          <i />
          <i />
          <i />
          <span>✦</span>
        </div>
        <small>Sinh học · Hóa học · Vật lý</small>
      </section>
      <section className="login-form">
        <div>
          <Badge>CHÀO MỪNG ĐẾN NEXALAB</Badge>
          <h2>
            {mode === "login"
              ? "Bắt đầu khám phá"
              : mode === "register"
                ? "Tài khoản phụ huynh"
                : mode === "forgot"
                  ? "Quên mật khẩu"
                  : "Đặt mật khẩu mới"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Đăng nhập để tiếp tục hành trình học tập."
              : "Tài khoản học sinh được giáo viên hoặc nhà trường cấp."}
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
            {mode !== "reset" && (
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
                minLength={mode === "login" ? 1 : 12}
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
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
                : mode === "login"
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
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const student = user.role === "STUDENT";
  const stats = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => api("/progress/" + user.id),
    enabled: student,
  });
  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api("/assignments"),
    enabled: student,
  });
  const p = stats.data?.progress ?? [];
  const attempts = stats.data?.attempts ?? [];
  return (
    <>
      <PageHeading
        eyebrow="MỖI NGÀY, MỘT ĐIỀU MỚI"
        title={
          "Chào " + user.fullName.split(" ").at(-1) + ", cùng khám phá nhé!"
        }
        description="Một câu hỏi nhỏ hôm nay có thể mở ra cả một thế giới."
        action={
          <Badge tone="outline">KHOA HỌC TỰ NHIÊN · LỚP {user.grade}</Badge>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> HỌC BẰNG CÁCH TỰ TAY LÀM
          </span>
          <h2>
            Đừng chỉ đọc về khoa học.
            <br />
            <em>Hãy chạm vào nó.</em>
          </h2>
          <p>
            Lắp một mạch điện. Khám phá đôi mắt.
            <br />
            Nhìn thấy những phản ứng kỳ diệu.
          </p>
          <Link
            className="cream-button"
            to={
              ["STUDENT", "TEACHER"].includes(user.role)
                ? "/labs/circuit"
                : "/progress"
            }
          >
            Bắt đầu khám phá <ArrowUpRight size={19} />
          </Link>
          <div className="hero-foot">
            <span>01 — 03</span>
            <i />
            <span>Phòng lab luôn rộng mở</span>
          </div>
        </div>
        <div className="hero-graphic">
          <svg viewBox="0 0 450 300" aria-label="Minh họa quỹ đạo nguyên tử">
            <defs>
              <radialGradient id="glow">
                <stop stopColor="#edbd71" />
                <stop offset="1" stopColor="#c4a460" />
              </radialGradient>
            </defs>
            <circle
              cx="230"
              cy="145"
              r="115"
              fill="none"
              stroke="#57776b"
              strokeDasharray="3 6"
            />
            <g fill="none" stroke="#9dbeac" strokeWidth="1.3">
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(-30 230 145)"
              />
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(35 230 145)"
              />
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(90 230 145)"
              />
            </g>
            <circle cx="230" cy="145" r="34" fill="url(#glow)" />
            <circle cx="111" cy="213" r="10" fill="#d7e4c2" />
            <circle cx="283" cy="38" r="7" fill="#dac8a4" />
            <circle cx="350" cy="224" r="10" fill="#a0cbb4" />
            <text
              x="31"
              y="67"
              fill="#c8d7ca"
              fontSize="17"
              fontFamily="monospace"
            >
              E = curiosity²
            </text>
            <text x="325" y="86" fill="#abc6b6" fontSize="13">
              ✦ EXPLORE
            </text>
            <text
              x="163"
              y="283"
              fill="#9dbeac"
              fontSize="11"
              letterSpacing="4"
            >
              A WORLD OF POSSIBILITIES
            </text>
          </svg>
          <div className="floating-note">
            <span>✧</span> Sai cũng là một cách học.
          </div>
        </div>
      </section>
      {student ? (
        <>
          <div className="stats">
            <Stat
              label="Bài học hoàn thành"
              value={p.filter((x: any) => x.status === "completed").length}
              icon={<BookOpen />}
            />
            <Stat
              label="Lần thử nghiệm"
              value={attempts.length}
              icon={<FlaskConical />}
            />
            <Stat
              label="Thử thách đạt"
              value={attempts.filter((a: any) => a.verdict === "passed").length}
              icon={<Sparkles />}
            />
            <Stat
              label="Bài được giao"
              value={assignments.data?.length ?? 0}
              icon={<Bookmark />}
            />
          </div>
          <ErrorBox error={stats.error || assignments.error} />
        </>
      ) : (
        <div className="role-note">
          <GraduationCap />
          <p>
            {user.role === "TEACHER"
              ? "Quản lý lớp, giao thử thách và theo dõi cách học sinh tiến bộ qua mỗi lần thử."
              : user.role === "PARENT"
                ? "Đồng hành cùng con qua tiến độ học tập và mức độ cần trợ giúp."
                : "Quản lý người dùng và nội dung khoa học của NexaLab."}
          </p>
          <Link
            to={
              user.role === "TEACHER"
                ? "/classes"
                : user.role === "PARENT"
                  ? "/progress"
                  : "/admin"
            }
          >
            Mở không gian quản lý →
          </Link>
        </div>
      )}
      <div className="section-heading">
        <div>
          <h2>Hôm nay, em muốn khám phá gì?</h2>
          <p className="muted">Ba môn học. Vô vàn điều đáng tò mò.</p>
        </div>
        <Link to="/labs">
          Tất cả phòng lab <ArrowRight size={15} />
        </Link>
      </div>
      <LabCards />
      {student && (
        <section className="panel assignments-panel">
          <div className="section-heading">
            <h2>Nhiệm vụ tiếp theo</h2>
            <Badge>{assignments.data?.length ?? 0} bài được giao</Badge>
          </div>
          {assignments.data?.length ? (
            assignments.data.map((a: any) => (
              <Link
                key={a.id}
                className="assignment-row"
                to={
                  a.contentType === "lab" ? "/labs/" + a.contentId : "/lessons"
                }
              >
                <span className="assignment-icon">
                  <BookOpen />
                </span>
                <div>
                  <b>{a.title}</b>
                  <small>
                    {a.classroom.name} · Hạn{" "}
                    {new Date(a.dueDate).toLocaleDateString("vi-VN")}
                  </small>
                </div>
                <ArrowUpRight size={19} />
              </Link>
            ))
          ) : (
            <Empty>Chưa có bài được giao. Em có thể tự khám phá các lab.</Empty>
          )}
        </section>
      )}
    </>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <div>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}
const labInfo = [
  {
    id: "circuit",
    subject: "VẬT LÝ",
    tag: "THỬ THÁCH",
    title: "Thắp sáng ý tưởng",
    description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn.",
    className: "physics",
    number: "01",
    symbol: "⌁",
  },
  {
    id: "eye",
    subject: "SINH HỌC",
    tag: "MÔ HÌNH 3D",
    title: "Thế giới qua đôi mắt",
    description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng.",
    className: "biology",
    number: "02",
    symbol: "◉",
  },
  {
    id: "chemistry",
    subject: "HÓA HỌC",
    tag: "THÍ NGHIỆM",
    title: "Những biến đổi kỳ diệu",
    description: "Khám phá phản ứng, quan sát hiện tượng và chất dư.",
    className: "chemistry",
    number: "03",
    symbol: "⚗",
  },
];
function LabCards() {
  const role = useAuth((s) => s.user!.role);
  return (
    <div className="lab-grid">
      {labInfo.map((l) => (
        <Link
          to={
            ["STUDENT", "TEACHER"].includes(role) ? "/labs/" + l.id : "/lessons"
          }
          className="lab-card"
          key={l.id}
        >
          <div className={"lab-art " + l.className}>
            <span className="lab-subject">{l.subject}</span>
            <span className="art-number">{l.number}</span>
            <div className="art-symbol">{l.symbol}</div>
            <span className="art-caption">NEXALAB / EXPERIMENT {l.number}</span>
          </div>
          <div className="lab-copy">
            <div className="lab-meta">
              <span>{l.tag}</span>
              <span>Lớp 8–9</span>
            </div>
            <h3>{l.title}</h3>
            <p>{l.description}</p>
            <div className="card-footer">
              <span>Khám phá phòng lab</span>
              <span className="round-arrow">
                <ArrowUpRight size={17} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
function LabLibrary() {
  return (
    <>
      <PageHeading
        eyebrow="HỌC QUA TRẢI NGHIỆM"
        title="Phòng thí nghiệm"
        description="Tự đặt câu hỏi, tự thử nghiệm và kiểm chứng bằng kết quả."
      />
      <LabCards />
      <div className="notice">
        Mọi thí nghiệm đều là mô phỏng giáo dục. Không thực hiện với điện hoặc
        hóa chất thật theo mô hình này.
      </div>
    </>
  );
}
