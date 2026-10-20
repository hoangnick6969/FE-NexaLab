import { Atom, LayoutDashboard, FlaskConical, BookOpen, Users, ChartNoAxesCombined, LogOut, Settings, GraduationCap, ClipboardList } from "lucide-react";
import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useLocation, Link } from "react-router-dom";
import { api, useAuth, restore } from "../lib/api";
import { PageLoader } from "../components/ui";
import { Login } from "../features/auth/Login";
import { Dashboard } from "../features/dashboard/Dashboard";
import { LabLibrary } from "../features/labs/LabLibrary";
import { queryClient } from "./query-client";
import { Avatar } from "../components/Avatar";
import { PROFILE_KEY, useProfile, type Profile } from "../lib/profile";
import { setThemePreference } from "../lib/theme";
import { defineText, getLocale, setLocale, takeLocaleChosenBeforeSignIn } from "../i18n";
import { commonText } from "../i18n/common";
import { NotificationBell } from "../features/notifications/NotificationBell";
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

const NotificationsPage = lazy(() =>
  import("../features/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage }))
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

const AdminPage = lazy(() => import("../features/admin/Admin"));

export const Lab = lazy(() => import("../features/labs/Lab"));

const text = defineText({
  vi: {
    starting: "Đang khởi tạo không gian học tập…",
    startingCaption: "NexaLab · Chạm vào khoa học",
    openingLanding: "Đang mở trang giới thiệu…",
    landingCaption: "NexaLab · Phòng thí nghiệm mô phỏng",
    workspace: "Không gian học tập",
    workspaceScope: "Khoa học tự nhiên · THCS",
    navCaption: "KHÁM PHÁ & HỌC TẬP",
    home: "Trang chủ",
    lessons: "Bài học",
    labsLabel: "Phòng thí nghiệm",
    labsShort: "Lab",
    assignments: "Bài tập",
    classSpace: "Class Space",
    progress: "Tiến độ",
    overview: "Tổng quan",
    lessonLibrary: "Thư viện bài học",
    myClasses: "Lớp học của tôi",
    childProgress: "Tiến độ của con",
    learningProgress: "Tiến độ học tập",
    admin: "Quản trị",
    settings: "Cài đặt tài khoản",
    signOut: "Đăng xuất",
    ready: "Sẵn sàng khám phá",
    account: "Tài khoản",
    loadingSpace: "Đang nạp không gian học tập…",
    footerLeft: "NexaLab · Chạm vào khoa học",
    footerRight: "Quan sát. Thử nghiệm. Thấu hiểu.",
  },
  en: {
    starting: "Starting your learning space…",
    startingCaption: "NexaLab · Touch science",
    openingLanding: "Opening the welcome page…",
    landingCaption: "NexaLab · Simulation lab",
    workspace: "Learning space",
    workspaceScope: "Natural science · Lower secondary",
    navCaption: "EXPLORE & LEARN",
    home: "Home",
    lessons: "Lessons",
    labsLabel: "Labs",
    labsShort: "Lab",
    assignments: "Assignments",
    classSpace: "Class Space",
    progress: "Progress",
    overview: "Overview",
    lessonLibrary: "Lesson library",
    myClasses: "My classes",
    childProgress: "My child's progress",
    learningProgress: "Learning progress",
    admin: "Administration",
    settings: "Account settings",
    signOut: "Sign out",
    ready: "Ready to explore",
    account: "Account",
    loadingSpace: "Loading your learning space…",
    footerLeft: "NexaLab · Touch science",
    footerRight: "Observe. Experiment. Understand.",
  },
});

export default function App() {
  const { user } = useAuth();
  const profile = useProfile();
  const location = useLocation();
  // The saved profile preference wins over this device's copy once the profile loads.
  const savedTheme = profile.data?.preferences?.theme;
  const savedLocale = profile.data?.preferences?.locale;
  useEffect(() => {
    if (savedTheme) setThemePreference(savedTheme);
  }, [savedTheme]);
  const profileLoaded = Boolean(profile.data);
  useEffect(() => {
    if (!profileLoaded) return;
    if (takeLocaleChosenBeforeSignIn() && savedLocale !== getLocale()) {
      // Picked on the sign-in page: newer than the profile's value, so save it rather than adopt.
      void api<{ preferences: Profile["preferences"] }>("/me/preferences", "PATCH", { locale: getLocale() }).then(({ preferences }) =>
        queryClient.setQueryData<Profile>(PROFILE_KEY, (old) => (old ? { ...old, preferences } : old)),
      );
      return;
    }
    if (savedLocale) setLocale(savedLocale);
  }, [profileLoaded, savedLocale]);
  const t = text();
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
        message={t.starting}
        caption={t.startingCaption}
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
            message={t.openingLanding}
            caption={t.landingCaption}
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
            <b>{t.workspace}</b>
            <small>{t.workspaceScope}</small>
          </div>
        </div>
        <p className="nav-caption">{t.navCaption}</p>
        <nav>
          {user.role === "STUDENT" ? (
            <>
              <NavLink end to="/" aria-label={t.home}><LayoutDashboard />{t.home}</NavLink>
              <NavLink to="/lessons" aria-label={t.lessons}><BookOpen />{t.lessons}</NavLink>
              <NavLink to="/labs" aria-label={t.labsLabel}><FlaskConical />{t.labsShort}</NavLink>
              <NavLink to="/assignments" aria-label={t.assignments}><ClipboardList />{t.assignments}</NavLink>
              <NavLink to="/classes" aria-label={t.classSpace}><Users />{t.classSpace}</NavLink>
              <NavLink to="/progress" aria-label={t.progress}><ChartNoAxesCombined />{t.progress}</NavLink>
            </>
          ) : (
            <>
              <NavLink end to="/"><LayoutDashboard />{t.overview}</NavLink>
              {user.role === "TEACHER" && <NavLink to="/labs"><FlaskConical />{t.labsLabel}</NavLink>}
              <NavLink to="/lessons"><BookOpen />{t.lessonLibrary}</NavLink>
              {user.role === "TEACHER" && <NavLink to="/classes"><Users />{t.myClasses}</NavLink>}
              {user.role === "PARENT" && <NavLink to="/progress"><ChartNoAxesCombined />{t.childProgress}</NavLink>}
              {user.role === "ADMIN" && <NavLink to="/admin"><Settings />{t.admin}</NavLink>}
            </>
          )}
        </nav>
        <NavLink className="settings-link" to="/settings">
          <Settings size={18} />
          {t.settings}
        </NavLink>
        <div className="user-card">
          <Avatar name={user.fullName} url={profile.data?.avatarUrl} />
          <div>
            <b>{user.fullName}</b>
            <small>{commonText().roles[user.role]}</small>
          </div>
          <button
            title={t.signOut}
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
            <span className="online-dot" /> {t.ready}{" "}
            <NotificationBell />
            <Link
              to="/settings"
              aria-label={t.account}
              className="avatar-link"
            >
              <Avatar name={user.fullName} url={profile.data?.avatarUrl} className="avatar small" />
            </Link>
          </div>
        </header>
        <main className="main">
          <Suspense fallback={<PageLoader message={t.loadingSpace} />}>
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
              <Route path="/assignments/:id" element={user.role === "STUDENT" ? <AssignedLearning /> : <Navigate to={user.role === "TEACHER" ? "/classes" : "/"} replace />} />
              <Route path="/classes" element={["STUDENT", "TEACHER"].includes(user.role) ? <Classes /> : <Navigate to="/" replace />} />
              <Route path="/classes/:classId" element={["STUDENT", "TEACHER"].includes(user.role) ? <Classes /> : <Navigate to="/" replace />} />
              <Route path="/classes/:classId/catalog/*" element={user.role === "STUDENT" ? <Classes /> : <Navigate to="/classes" />} />
              <Route path="/progress" element={["STUDENT", "PARENT"].includes(user.role) ? <ProgressPage /> : <Navigate to={user.role === "TEACHER" ? "/classes" : "/"} replace />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
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
          <span>{t.footerLeft}</span>
          <span>{t.footerRight}</span>
        </footer>
      </div>
    </div>
  );
}
