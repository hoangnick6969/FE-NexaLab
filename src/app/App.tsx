import { Atom, LayoutDashboard, FlaskConical, BookOpen, Users, ChartNoAxesCombined, LogOut, Settings, GraduationCap, ClipboardList } from "lucide-react";
import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useLocation, Link } from "react-router-dom";
import { api, useAuth, restore } from "../lib/api";
import { PageLoader } from "../components/ui";
import { Login } from "../features/auth/Login";
import { Dashboard } from "../features/dashboard/Dashboard";
import { LabLibrary } from "../features/labs/LabLibrary";
import { queryClient } from "./query-client";
import { PasswordGate } from "./PasswordGate";
import { TopbarBreadcrumb } from "./TopbarBreadcrumb";

const PublicLanding = lazy(() =>
  import("../features/landing/PublicLanding").then((m) => ({ default: m.PublicLanding }))
);

const Lessons = lazy(() =>
  import("../features/lessons/Lessons").then((m) => ({ default: m.Lessons }))
);

const AssignedLearning = lazy(() =>
  import("../features/assignments/AssignedLearning").then((m) => ({ default: m.AssignedLearning }))
);

const StudentAssignments = lazy(() =>
  import("../features/assignments/StudentAssignments").then((m) => ({ default: m.StudentAssignments }))
);

const LessonDetail = lazy(() =>
  import("../features/lessons/LessonDetail").then((m) => ({ default: m.LessonDetail }))
);

const EbookReader = lazy(() =>
  import("../features/ebook/EbookReader").then((m) => ({ default: m.EbookReader }))
);

const Classes = lazy(() =>
  import("../features/classes/Classes").then((m) => ({ default: m.Classes }))
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
              <NavLink to="/assignments" aria-label="Bài tập"><ClipboardList />Bài tập</NavLink>
              <NavLink to="/classes" aria-label="Class Space"><Users />Lớp học</NavLink>
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
              <Route path="/lessons/:id" element={<LessonDetail />} />
              <Route path="/ebooks/:subjectId" element={<EbookReader />} />
              <Route path="/assignments" element={user.role === "STUDENT" ? <StudentAssignments /> : <Navigate to="/classes" />} />
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
