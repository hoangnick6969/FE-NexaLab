import { Atom, LayoutDashboard, FlaskConical, BookOpen, Users, ChartNoAxesCombined, LogOut, ChevronRight, Settings, ArrowRight, GraduationCap, ClipboardList } from "lucide-react";
import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useLocation, Link } from "react-router-dom";
import { api, useAuth, restore, type User } from "../lib/api";
import { Badge, ErrorBox, Field, useAction, PageLoader } from "../components/ui";
import { Login } from "../features/auth/Login";
import { Dashboard } from "../features/dashboard/Dashboard";
import { LabLibrary } from "../features/labs/LabLibrary";
import { labInfo } from "../features/labs/lab-info";
import { queryClient } from "./query-client";

const PublicLanding = lazy(() =>
  import("../features/landing/PublicLanding").then((m) => ({ default: m.PublicLanding }))
);
const Lessons = lazy(() =>
  import("../features/lessons/Lessons").then((m) => ({ default: m.Lessons }))
);
const AssignedLearning = lazy(() =>
  import("../features/learning/AssignedLearning").then((m) => ({ default: m.AssignedLearning }))
);
const StudentAssignments = lazy(() =>
  import("../features/learning/StudentAssignments").then((m) => ({ default: m.StudentAssignments }))
);
const LessonDetail = lazy(() =>
  import("../features/ebook/ebook").then((m) => ({ default: m.LessonDetail }))
);
const EbookReader = lazy(() =>
  import("../features/ebook/ebook").then((m) => ({ default: m.EbookReader }))
);
const Classes = lazy(() =>
  import("../features/classes/classes").then((m) => ({ default: m.Classes }))
);
const ProgressPage = lazy(() =>
  import("../features/progress/ProgressPage").then((m) => ({ default: m.ProgressPage }))
);
const Saved = lazy(() =>
  import("../features/saved/Saved").then((m) => ({ default: m.Saved }))
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() => import("../features/admin/Admin"));
export const Lab = lazy(() => import("../features/labs/Lab"));
const names = {
  STUDENT: "Học sinh",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  ADMIN: "Quản trị viên",
};
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
    if (pathname.startsWith("/lessons/catalog")) {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Bài học" : "Thư viện bài học", to: "/lessons" },
        { label: "Mục lục môn học", isCurrent: true },
      ];
    }
    if (pathname.startsWith("/lessons/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Bài học" : "Thư viện bài học", to: "/lessons" },
        { label: isStudent ? "Chi tiết bài học" : "Chi tiết bài giảng", isCurrent: true },
      ];
    }
    if (pathname.startsWith("/ebooks/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: "Bài học", to: "/lessons" },
        { label: "Trình đọc ebook", isCurrent: true },
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
          label: isStudent ? "Bài tập" : "Lớp học",
          to: isStudent ? "/assignments" : "/classes",
        },
        { label: isStudent && pathname.startsWith("/assignments/catalog") ? "Mục lục bài tập" : isStudent ? "Chi tiết bài tập" : "Chi tiết bài học", isCurrent: true },
      ];
    }
    if (pathname === "/assignments") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Bài tập" : "Lớp học", isCurrent: true },
      ];
    }
    if (pathname === "/classes") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Class Space của em" : "Lớp học của tôi", isCurrent: true },
      ];
    }
    if (pathname.startsWith("/classes/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? "Class Space của em" : "Lớp học của tôi", to: "/classes" },
        { label: "Nội dung lớp", isCurrent: true },
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
              <NavLink to="/classes" aria-label="Class Space"><Users />Class Space</NavLink>
              <NavLink to="/labs" aria-label="Phòng thí nghiệm"><FlaskConical />Lab</NavLink>
              <NavLink to="/assignments" aria-label="Bài tập"><ClipboardList />Bài tập</NavLink>
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
              <Route path="/lessons/catalog/*" element={<Lessons />} />
              <Route path="/lessons/:id" element={<LessonDetail />} />
              <Route path="/ebooks/:subjectId" element={<EbookReader />} />
              <Route path="/assignments" element={user.role === "STUDENT" ? <StudentAssignments /> : <Navigate to="/classes" />} />
              <Route path="/assignments/catalog/*" element={user.role === "STUDENT" ? <StudentAssignments /> : <Navigate to="/classes" />} />
              <Route path="/assignments/:id" element={<AssignedLearning />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:classId/catalog/*" element={user.role === "STUDENT" ? <Classes /> : <Navigate to="/classes" />} />
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
