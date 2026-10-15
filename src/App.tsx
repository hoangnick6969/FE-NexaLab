import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
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
  Check,
  Lock,
  ClipboardList,
  Clock3,
  Zap,
  Eye,
} from "lucide-react";
import { api, useAuth, restore, type StudentPathway, type User } from "./api";
import { queryClient } from "./main";
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  useAction,
  verdictLabel,
  PageLoader,
  InlineLoader,
} from "./ui";
const PublicLanding = lazy(() =>
  import("./PublicLanding").then((m) => ({ default: m.PublicLanding }))
);
const Lessons = lazy(() =>
  import("./pages").then((m) => ({ default: m.Lessons }))
);
const AssignedLearning = lazy(() =>
  import("./pages").then((m) => ({ default: m.AssignedLearning }))
);
const Classes = lazy(() =>
  import("./classes").then((m) => ({ default: m.Classes }))
);
const ProgressPage = lazy(() =>
  import("./pages").then((m) => ({ default: m.ProgressPage }))
);
const Saved = lazy(() =>
  import("./pages").then((m) => ({ default: m.Saved }))
);
const SettingsPage = lazy(() =>
  import("./pages").then((m) => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() => import("./Admin"));
const Lab = lazy(() => import("./labs/Lab"));
const names = {
  STUDENT: "Học sinh",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  ADMIN: "Quản trị viên",
};

const labInfo = [
  {
    id: "circuit",
    subject: "VẬT LÝ",
    tag: "THỬ THÁCH",
    title: "Thắp sáng ý tưởng",
    description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn.",
    className: "physics",
    number: "01",
  },
  {
    id: "eye",
    subject: "SINH HỌC",
    tag: "MÔ HÌNH 3D",
    title: "Thế giới qua đôi mắt",
    description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng.",
    className: "biology",
    number: "02",
  },
  {
    id: "chemistry",
    subject: "HÓA HỌC",
    tag: "THÍ NGHIỆM",
    title: "Những biến đổi kỳ diệu",
    description: "Khám phá phản ứng, quan sát hiện tượng và chất dư.",
    className: "chemistry",
    number: "03",
  },
];

function TopbarBreadcrumb({
  pathname,
  user,
}: {
  pathname: string;
  user: User;
}) {
  const isStudent = user.role === "STUDENT";
  const homeLabel = isStudent ? "Trang chủ" : "Tổng quan";

  const getBreadcrumbs = () => {
    if (pathname === "/") {
      return [{ label: homeLabel, isCurrent: true }];
    }
    if (pathname === "/lessons") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Bài học" : "Thư viện bài học", isCurrent: true },
      ];
    }
    if (pathname === "/labs") {
      return [
        { label: homeLabel, to: "/" },
        { label: "Phòng thí nghiệm", isCurrent: true },
      ];
    }
    if (pathname.startsWith("/labs/")) {
      const labId = pathname.replace("/labs/", "");
      const lab = labInfo.find((l) => l.id === labId);
      return [
        { label: homeLabel, to: "/" },
        { label: "Phòng thí nghiệm", to: "/labs" },
        { label: lab ? lab.title : "Thực hành", isCurrent: true },
      ];
    }
    if (pathname.startsWith("/assignments/")) {
      return [
        { label: homeLabel, to: "/" },
        {
          label: isStudent ? "Bài được giao" : "Lớp học",
          to: isStudent ? "/#student-assignments" : "/classes",
        },
        { label: "Chi tiết bài học", isCurrent: true },
      ];
    }
    if (pathname === "/classes") {
      return [
        { label: homeLabel, to: "/" },
        { label: "Lớp học của tôi", isCurrent: true },
      ];
    }
    if (pathname === "/progress") {
      return [
        { label: homeLabel, to: "/" },
        {
          label: user.role === "PARENT" ? "Tiến độ của con" : "Tiến độ học tập",
          isCurrent: true,
        },
      ];
    }
    if (pathname === "/saved") {
      return [
        { label: homeLabel, to: "/" },
        { label: "Thí nghiệm đã lưu", isCurrent: true },
      ];
    }
    if (pathname === "/settings") {
      return [
        { label: homeLabel, to: "/" },
        { label: "Cài đặt tài khoản", isCurrent: true },
      ];
    }
    if (pathname === "/admin") {
      return [
        { label: homeLabel, to: "/" },
        { label: "Quản trị hệ thống", isCurrent: true },
      ];
    }
    return [
      { label: homeLabel, to: "/" },
      { label: "Khám phá", isCurrent: true },
    ];
  };

  const crumbs = getBreadcrumbs();

  return (
    <nav aria-label="Đường dẫn trang" className="topbar-breadcrumb">
      <Link to="/" className="breadcrumb-root">
        Không gian học tập
      </Link>
      {crumbs.map((crumb, idx) => (
        <span
          key={idx}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ChevronRight size={13} className="breadcrumb-sep" aria-hidden="true" />
          {crumb.isCurrent ? (
            <b aria-current="page">{crumb.label}</b>
          ) : (
            <Link to={crumb.to || "/"}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  useEffect(() => {
    restore().finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <PageLoader
        fullScreen
        message="Đang khởi tạo không gian học tập…"
        caption="NexaLab · Chạm vào khoa học"
      />
    );
  if (!user) {
    const isPasswordReset = new URLSearchParams(location.search).has("reset");
    return location.pathname === "/login" || isPasswordReset ? (
      <Login />
    ) : (
      <Suspense
        fallback={
          <PageLoader
            fullScreen
            message="Đang mở trang giới thiệu…"
            caption="NexaLab · Phòng thí nghiệm mô phỏng"
          />
        }
      >
        <PublicLanding />
      </Suspense>
    );
  }
  if (user.mustChangePassword) return <PasswordGate />;
  return (
    <div className={`app-shell${user.role === "STUDENT" ? " app-shell-student" : ""}`}>
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
          {user.role === "STUDENT" ? (
            <>
              <NavLink end to="/" aria-label="Trang chủ"><LayoutDashboard />Trang chủ</NavLink>
              <NavLink to="/lessons" aria-label="Bài học"><BookOpen />Bài học</NavLink>
              <NavLink to="/labs" aria-label="Phòng thí nghiệm"><FlaskConical />Lab</NavLink>
              <Link
                to="/#student-assignments"
                aria-label="Bài được giao"
                className={location.hash === "#student-assignments" || location.pathname.startsWith("/assignments/") ? "active" : ""}
              ><Bookmark />Bài giao</Link>
              <NavLink to="/progress" aria-label="Tiến độ"><ChartNoAxesCombined />Tiến độ</NavLink>
            </>
          ) : (
            <>
              <NavLink end to="/"><LayoutDashboard />Tổng quan</NavLink>
              {user.role === "TEACHER" && <NavLink to="/labs"><FlaskConical />Phòng thí nghiệm</NavLink>}
              <NavLink to="/lessons"><BookOpen />Thư viện bài học</NavLink>
              {["TEACHER", "ADMIN"].includes(user.role) && <NavLink to="/classes"><Users />Lớp học của tôi</NavLink>}
              <NavLink to="/progress"><ChartNoAxesCombined />{user.role === "PARENT" ? "Tiến độ của con" : "Tiến độ học tập"}</NavLink>
              {user.role === "ADMIN" && <NavLink to="/admin"><Settings />Quản trị</NavLink>}
            </>
          )}
        </nav>
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
              try {
                await api("/auth/logout", "POST");
              } finally {
                useAuth.getState().set(null, null);
                queryClient.clear();
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <TopbarBreadcrumb pathname={location.pathname} user={user} />
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
          <Suspense fallback={<PageLoader message="Đang nạp không gian học tập…" />}>
            <Routes>
              <Route
                path="/"
                element={user.role === "ADMIN" ? <AdminPage /> : <Dashboard />}
              />
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
              <Route path="/assignments/:id" element={<AssignedLearning />} />
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
function PasswordGate() {
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
function Login() {
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
  const isStudent = user.role === "STUDENT";
  const stats = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => api("/progress/" + user.id),
    enabled: isStudent,
  });
  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api("/assignments"),
    enabled: isStudent,
  });
  if (isStudent) {
    return <StudentDashboard user={user} stats={stats} assignments={assignments} />;
  }
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
            to={user.role === "TEACHER" ? "/labs/circuit" : "/progress"}
          >
            Mở không gian khám phá <ArrowUpRight size={19} />
          </Link>
          <div className="hero-foot">
            <span>HỌC → QUAN SÁT → THỬ</span>
            <i />
            <span>Mỗi bước đều đáng khám phá</span>
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
      <div className="role-note">
        <GraduationCap />
        <p>
          {user.role === "TEACHER"
            ? "Quản lý lớp, giao thử thách và theo dõi cách học sinh tiến bộ qua mỗi lần thử."
            : "Đồng hành cùng con qua tiến độ học tập và mức độ cần trợ giúp."}
        </p>
        <Link to={user.role === "TEACHER" ? "/classes" : "/progress"}>
          Mở không gian quản lý →
        </Link>
      </div>
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
    </>
  );
}
function StudentDashboard({
  user,
  stats,
  assignments,
}: {
  user: User;
  stats: any;
  assignments: any;
}) {
  const reduceMotion = useReducedMotion();
  const assignment = assignments.data?.[0];
  const assignmentDetail = useQuery<any>({
    queryKey: ["assignment", assignment?.id],
    queryFn: () => api("/assignments/" + assignment.id),
    enabled: Boolean(assignment?.id),
  });
  const lessonId = assignmentDetail.data?.contentType === "lesson"
    ? assignmentDetail.data.content.id
    : null;
  const pathwayQuery = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", lessonId],
    queryFn: () => api("/lessons/" + lessonId + "/pathway"),
    enabled: Boolean(lessonId),
  });
  const progress = stats.data?.progress ?? [];
  const attempts = stats.data?.attempts ?? [];
  const pathway = pathwayQuery.data;
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  const stepNames: Record<string, string> = {
    READING: "Đọc nội dung",
    VIDEO: "Xem video",
    STUDY_CARDS: "Ôn thẻ ghi nhớ",
    QUIZ: "Làm bài kiểm tra nhỏ",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Mở thử thách",
  };
  const continueNames: Record<string, string> = {
    READING: "Bắt đầu đọc bài",
    VIDEO: "Xem nội dung video",
    STUDY_CARDS: "Bắt đầu ôn thẻ",
    QUIZ: "Làm bài kiểm tra nhỏ",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Bắt đầu thử thách",
  };
  const subjectName = pathway?.lesson.subject.name;
  const subjectTone = subjectName?.includes("Vật lý")
    ? "physics"
    : subjectName?.includes("Hóa học")
      ? "chemistry"
      : subjectName?.includes("Sinh học")
        ? "biology"
        : "neutral";
  const recentAttempts = attempts.slice(0, 4);
  const lessonCount = progress.filter((item: any) => item.status === "completed").length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date, label: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index], count: 0 };
  });
  const addActivityDate = (value: string) => {
    const date = new Date(value);
    const day = Math.floor((date.setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    if (!Number.isNaN(day) && day >= 0 && day < weeklyActivity.length) weeklyActivity[day].count += 1;
  };
  progress.forEach((item: any) => item.updatedAt && addActivityDate(item.updatedAt));
  attempts.forEach((attempt: any) => attempt.createdAt && addActivityDate(attempt.createdAt));
  const activeDays = weeklyActivity.filter((day) => day.count > 0).length;
  const maxActivity = Math.max(1, ...weeklyActivity.map((day) => day.count));

  return (
    <div className="student-dashboard">
      <header className="student-dashboard-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN HỌC TẬP · LỚP {user.grade}</p>
          <h1>Chào {user.fullName.split(" ").at(-1)}</h1>
          <p className="student-heading-copy">Bài học, bài được giao và những lần em tự thử.</p>
        </div>
        <Badge tone="outline">KHOA HỌC TỰ NHIÊN</Badge>
      </header>

      <section className="student-stats" aria-label="Tóm tắt hoạt động học tập">
        <StudentStat
          label="Bài học hoàn thành"
          value={stats.isLoading || stats.error || !progress.length ? "—" : lessonCount}
          detail={stats.isLoading ? "Đang tải tiến độ" : stats.error ? "Chưa tải được dữ liệu" : progress.length ? lessonCount ? "Xem tiến độ của em" : "Chưa hoàn thành bài nào" : "Chưa có dữ liệu học"}
          icon={<BookOpen />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={0}
        />
        <StudentStat
          label="Bài được giao"
          value={assignments.isLoading || assignments.error || !assignments.data?.length ? "—" : assignments.data.length}
          detail={assignments.isLoading ? "Đang tải bài giao" : assignments.error ? "Chưa tải được dữ liệu" : assignments.data?.length ? "Sắp đến hạn trước" : "Chưa có bài được giao"}
          icon={<ClipboardList />}
          to={assignments.data?.[0] ? `/assignments/${assignments.data[0].id}` : "/lessons"}
          reduceMotion={reduceMotion}
          index={1}
        />
        <StudentStat
          label="Lượt thử mô phỏng"
          value={stats.isLoading || stats.error || !attempts.length ? "—" : attempts.length}
          detail={stats.isLoading ? "Đang tải lịch sử" : stats.error ? "Chưa tải được dữ liệu" : attempts.length ? "Xem lịch sử thực hành" : "Chưa có lần thử nào"}
          icon={<FlaskConical />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={2}
        />
      </section>

      {(stats.error || assignments.error) && (
        <div className="student-dashboard-error" role="alert">
          <ErrorBox error={stats.error || assignments.error} />
        </div>
      )}

      <div className="student-dashboard-columns">
        <div className="student-dashboard-main">
          <section className={`student-continue-card subject-${subjectTone}`}>
            <div className="student-continue-copy">
              <span className="student-card-kicker">
                {assignment ? subjectName || "BÀI ĐƯỢC GIAO" : "BẮT ĐẦU TỪ KIẾN THỨC NỀN"}
              </span>
              <h2>
                {assignment
                  ? pathway?.lesson.title || assignmentDetail.data?.content?.title || assignment.title
                  : assignments.isLoading
                    ? "Đang tìm bài học tiếp theo"
                    : "Bài học tiếp theo của em"}
              </h2>
              <p>
                {assignment
                  ? pathway?.lesson.learningObjective || assignmentDetail.data?.content?.learningObjective || assignment.classroom.name
                  : assignments.isLoading
                    ? "Đang kiểm tra bài được giao của em."
                    : "Đọc, xem nội dung và làm bài kiểm tra nhỏ trước khi mở phần thực hành."}
              </p>
              {pathway && nextStep && (
                <p className="student-step-position">
                  Bước {pathway.steps.findIndex((step) => step.id === nextStep.id) + 1}/{pathway.steps.length}
                  {" · "}{stepNames[nextStep.type]}
                </p>
              )}
              {pathway && !nextStep && <p className="student-step-position">Em đã xem hết các bước trong bài này.</p>}
              <Link
                className="student-continue-action"
                to={assignment ? "/assignments/" + assignment.id : "/lessons"}
              >
                {assignment
                  ? nextStep
                    ? continueNames[nextStep.type]
                    : pathway
                      ? "Xem lại lộ trình bài học"
                      : "Mở bài được giao"
                  : "Chọn bài học để bắt đầu"}
                <ArrowRight size={18} />
              </Link>
              {assignmentDetail.error && <ErrorBox error={assignmentDetail.error} />}
              {pathwayQuery.error && <ErrorBox error={pathwayQuery.error} />}
            </div>
            {assignment && (
              <div className="student-continue-art" aria-hidden="true">
                <svg viewBox="0 0 240 210" fill="none">
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(-28 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(34 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(90 120 105)" />
                  <circle cx="120" cy="105" r="22" className="illustration-core" />
                  <circle cx="43" cy="128" r="6" className="illustration-dot" />
                  <circle cx="166" cy="29" r="5" className="illustration-dot" />
                  <circle cx="195" cy="157" r="7" className="illustration-dot" />
                </svg>
              </div>
            )}
          </section>

          {pathway && (
            <section className="student-pathway-card" aria-label="Lộ trình bài học">
              <div className="student-pathway-heading">
                <div><span className="eyebrow">LỘ TRÌNH BÀI HỌC</span><h3>{pathway.lesson.title}</h3></div>
                <span>{pathway.steps.filter((step) => step.state === "COMPLETED").length}/{pathway.steps.length} bước</span>
              </div>
              <ol className="student-pathway-steps">
                {pathway.steps.map((step) => {
                  const isLocked = step.state === "LOCKED";
                  return (
                    <li key={step.id} className={`student-pathway-step ${step.state.toLowerCase()}`}>
                      {isLocked ? (
                        <button disabled title={step.lockReasonCode === "QUIZ_NOT_PASSED" ? "Hoàn thành bài kiểm tra để mở khóa." : "Hoàn thành bước trước để mở khóa."}>
                          <Lock size={15} strokeWidth={1.75} /><span>{stepNames[step.type]}</span>
                        </button>
                      ) : (
                        <Link to={`/assignments/${assignment.id}#step-${step.id}`}>
                          {step.state === "COMPLETED" ? <Check size={15} strokeWidth={2} /> : <Clock3 size={15} strokeWidth={1.75} />}
                          <span>{stepNames[step.type]}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <section className="student-weekly-card" aria-labelledby="student-weekly-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">HOẠT ĐỘNG CỦA EM</p><h2 id="student-weekly-title">Tuần này</h2></div>
              <span className="student-weekly-summary">
                {stats.isLoading ? "Đang tải…" : activeDays ? `${activeDays} ngày có hoạt động` : "Chưa có hoạt động tuần này"}
              </span>
            </div>
            {stats.isLoading ? (
              <InlineLoader message="Đang tải dữ liệu hoạt động…" size="sm" />
            ) : stats.error ? (
              <Empty>Chưa thể tải hoạt động tuần này.</Empty>
            ) : activeDays ? (
              <div className="student-weekly-chart" role="img" aria-label={`Hoạt động từ thứ Hai đến Chủ nhật: ${weeklyActivity.map((day) => `${day.label} ${day.count} lượt`).join(", ")}`}>
                {weeklyActivity.map((day) => (
                  <div className="student-weekly-day" key={day.label} title={`${day.date.toLocaleDateString("vi-VN")}: ${day.count} lượt ghi nhận`}>
                    <span className="student-weekly-count">{day.count || ""}</span>
                    <span className="student-weekly-track"><i style={{ height: day.count ? `${Math.max(12, (day.count / maxActivity) * 100)}%` : "4px" }} /></span>
                    <span className="student-weekly-label">{day.label}</span>
                  </div>
                ))}
              </div>
            ) : <div className="student-weekly-empty">Chưa có hoạt động tuần này.</div>}
          </section>

          <section className="student-related-work">
            <div className="student-section-heading">
              <div><p className="eyebrow">SAU KHI ĐÃ HỌC</p><h2>Mô phỏng và thực hành</h2></div>
              <Link to="/lessons">Xem bài học <ArrowRight size={15} /></Link>
            </div>
            <p className="student-related-intro">Mỗi mô phỏng gắn với kiến thức em vừa học. Hoàn thành các bước nền tảng để mở phần thực hành phù hợp.</p>
            <LabCards guided />
          </section>
        </div>

        <aside className="student-dashboard-aside">
          <section id="student-assignments" className="student-side-card" aria-labelledby="student-assignments-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">THEO HẠN HOÀN THÀNH</p><h2 id="student-assignments-title">Bài được giao</h2></div>
              <span className="student-side-count">{assignments.data?.length || "—"}</span>
            </div>
            {assignments.isLoading ? <InlineLoader message="Đang nạp bài được giao…" size="sm" /> : assignments.error ? (
              <div role="alert"><ErrorBox error={assignments.error} /><button onClick={() => assignments.refetch()}>Thử lại</button></div>
            ) : assignments.data?.length ? (
              <div className="student-list">
                {assignments.data.map((item: any) =>
                  item.canOpen === false ? (
                    <div key={item.id} className="student-assignment-row" aria-disabled="true">
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.notice}</small></span>
                    </div>
                  ) : (
                    <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? "Hạn " + new Date(item.dueDate).toLocaleDateString("vi-VN") : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể học</small>}{item.notice && <small>{item.notice}</small>}</span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div className="student-empty"><ClipboardList size={22} /><p>Chưa có bài được giao.</p></div>
            )}
          </section>

          <section className="student-side-card" aria-labelledby="student-attempts-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">NHỮNG LẦN EM ĐÃ THỬ</p><h2 id="student-attempts-title">Gần đây</h2></div>
              <Link to="/progress" aria-label="Xem toàn bộ lịch sử thực hành"><ArrowRight size={17} /></Link>
            </div>
            {stats.isLoading ? <InlineLoader message="Đang nạp lịch sử thực hành…" size="sm" /> : stats.error ? (
              <div role="alert"><ErrorBox error={stats.error} /><button onClick={() => stats.refetch()}>Thử lại</button></div>
            ) : recentAttempts.length ? (
              <div className="student-list">
                {recentAttempts.map((attempt: any) => {
                  const lab = labInfo.find((item) => item.id === attempt.challengeId);
                  return (
                    <Link className="student-attempt-row" key={attempt.id} to="/progress">
                      <span><FlaskConical size={18} /></span>
                      <span className="student-attempt-copy"><b>{lab?.title || "Lượt thực hành"}</b><small>{new Date(attempt.createdAt).toLocaleDateString("vi-VN")}</small></span>
                      <Badge tone={attempt.verdict}>{verdictLabel(attempt.verdict)}</Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="student-empty"><FlaskConical size={22} /><p>Chưa có lần thử nào được ghi lại.</p></div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
function StudentStat({
  label,
  value,
  detail,
  icon,
  to,
  reduceMotion,
  index,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
  to: string;
  reduceMotion: boolean | null;
  index: number;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.06 }}
    >
      <Link className="student-stat" to={to}>
        <span className="student-stat-icon">{icon}</span>
        <span className="student-stat-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span>
        <ArrowRight className="student-stat-arrow" size={17} />
      </Link>
    </motion.div>
  );
}
function LabCards({ guided = false }: { guided?: boolean } = {}) {
  const role = useAuth((s) => s.user!.role);
  return (
    <div className="lab-grid">
      {labInfo.map((l) => (
        <Link
          to={guided && role === "STUDENT" ? "/lessons" : ["STUDENT", "TEACHER"].includes(role) ? "/labs/" + l.id : "/lessons"}
          className="lab-card"
          key={l.id}
        >
          <div className={"lab-art " + l.className}>
            <span className="lab-subject">{l.subject}</span>
            <span className="art-number">{l.number}</span>
            <div className="art-symbol">
              {l.id === "circuit" ? <Zap size={44} strokeWidth={1.5} /> : l.id === "eye" ? <Eye size={44} strokeWidth={1.5} /> : <FlaskConical size={44} strokeWidth={1.5} />}
            </div>
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
              <span>{guided && role === "STUDENT" ? "Học kiến thức nền trước" : "Khám phá phòng lab"}</span>
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
