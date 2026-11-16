import { Atom, LayoutDashboard, FlaskConical, BookOpen, Users, ChartNoAxesCombined, LogOut, Settings, GraduationCap, ClipboardList, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate, useLocation, Link } from "react-router-dom";
import { api, useAuth, restore } from "../lib/api";
import { PageLoader } from "../components/ui";
import { Login } from "../features/auth/Login";
import { EmailVerification } from "../features/auth/EmailVerification";
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

// Development-only K3 apparatus bench; the branch is removed from production builds.
const K3KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/fluid/kit/dev/K3KitPreview")) : null;
const ThermalFixturePreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/thermal/ThermalFixturePreview")) : null;
const DensityPilotPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/fluid/density/dev/DensityPilotPreview")) : null;
const K7KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/molecular/kit/dev/K7KitPreview")) : null;
const K8KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/ecology/kit/dev/K8KitPreview")) : null;
const GeneProteinPilotPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/molecular/gene-protein/dev/GeneProteinPilotPreview")) : null;
const EyeOpticsPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/anatomy/eye-optics/dev/EyeOpticsPreview")) : null;
const K2KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/chemistry/wet-bench/kit/dev/K2KitPreview")) : null;
const LeverExplorePreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/mechanics/explore/dev/LeverExplorePreview")) : null;
const FluidExplorePreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/fluid/pressure/dev/FluidExplorePreview")) : null;
const SharedItemsPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/shared/items/dev/SharedItemsPreview")) : null;

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

const EbookLibraryPage = lazy(() =>
  import("../features/ebook/EbookLibraryPage").then((m) => ({ default: m.EbookLibraryPage }))
);

const Classes = lazy(() =>
  import("../features/classes/Classes").then((m) => ({ default: m.Classes }))
);

const FlashcardStudy = lazy(() => import("../features/classes/FlashcardStudy"));

const ClassLabs = lazy(() =>
  import("../features/classes/ClassLabs").then((m) => ({ default: m.ClassLabs }))
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

// TAI-05 teacher AI credits: loaded on demand for teachers only, so the entry, student and parent bundles never carry it.
const TeacherCredits = lazy(() => import("../features/credits/TeacherCredits"));
const TeacherCreditsNav = lazy(() => import("../features/credits/TeacherCreditsNav"));

export const Lab = lazy(() => import("../features/labs/Lab"));

const text = defineText({
  vi: {
    starting: "Đang khởi tạo không gian học tập…",
    startingCaption: "NexaLab · Chạm vào khoa học",
    openingLanding: "Đang mở trang giới thiệu…",
    landingCaption: "NexaLab · Phòng thí nghiệm mô phỏng",
    workspace: "Không gian học tập",
    teacherWorkspace: "Không gian giáo viên",
    workspaceScope: "Khoa học tự nhiên · THCS",
    navCaption: "KHÁM PHÁ & HỌC TẬP",
    teacherNavCaption: "Quản lý lớp học",
    home: "Trang chủ",
    lessons: "Bài học",
    labsLabel: "Phòng thí nghiệm",
    labsShort: "Lab",
    classLab: "Class Lab",
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
    teacherReady: "Không gian giáo viên sẵn sàng",
    account: "Tài khoản",
    collapseSidebar: "Thu gọn menu",
    expandSidebar: "Mở rộng menu",
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
    teacherWorkspace: "Teacher workspace",
    workspaceScope: "Natural science · Lower secondary",
    navCaption: "EXPLORE & LEARN",
    teacherNavCaption: "Class management",
    home: "Home",
    lessons: "Lessons",
    labsLabel: "Labs",
    labsShort: "Lab",
    classLab: "Class Lab",
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
    teacherReady: "Teacher workspace ready",
    account: "Account",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    loadingSpace: "Loading your learning space…",
    footerLeft: "NexaLab · Touch science",
    footerRight: "Observe. Experiment. Understand.",
  },
});

// Module-level flag: survives HMR component remounts so the auth restore does
// not flash the full-screen PageLoader on every hot-reload in development.
let _restoreSettled = false;

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
  const [ready, setReady] = useState(_restoreSettled);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("nexalab:sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nexalab:sidebar-collapsed", String(next));
      } catch {
        // Safe fallback when storage is inaccessible
      }
      return next;
    });
  };
  useEffect(() => {
    if (!/^\/lessons\/[^/]+/.test(location.pathname)) return;
    setSidebarCollapsed((collapsed) => {
      if (collapsed) return collapsed;
      try { localStorage.setItem("nexalab:sidebar-collapsed", "true"); } catch { /* Storage is optional. */ }
      return true;
    });
  }, [location.pathname]);
  useLayoutEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  useEffect(() => {
    if (_restoreSettled) return; // Already ran — skip HMR re-runs
    restore().finally(() => {
      _restoreSettled = true;
      setReady(true);
    });
  }, []);
  if (!ready)
    return (
      <PageLoader
        fullScreen
        message={t.starting}
        caption={t.startingCaption}
      />
    );
  if (K3KitPreview && location.pathname === "/dev/lab-kits/k3")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><K3KitPreview /></Suspense>;
  if (ThermalFixturePreview && location.pathname === "/dev/lab-kits/thermal-energy")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><ThermalFixturePreview /></Suspense>;
  if (DensityPilotPreview && location.pathname === "/dev/lab-kits/density")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><DensityPilotPreview /></Suspense>;
  if (K7KitPreview && location.pathname === "/dev/lab-kits/k7")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><K7KitPreview /></Suspense>;
  if (K8KitPreview && location.pathname === "/dev/lab-kits/k8")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><K8KitPreview /></Suspense>;
  if (GeneProteinPilotPreview && location.pathname === "/dev/lab-kits/gene-protein")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><GeneProteinPilotPreview /></Suspense>;
  if (EyeOpticsPreview && location.pathname === "/dev/lab-kits/eye-optics")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><EyeOpticsPreview /></Suspense>;
  if (K2KitPreview && location.pathname === "/dev/lab-kits/k2")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><K2KitPreview /></Suspense>;
  if (LeverExplorePreview && location.pathname === "/dev/lab-kits/lever-explore")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><LeverExplorePreview /></Suspense>;
  if (FluidExplorePreview && location.pathname === "/dev/lab-kits/fluid-explore")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><FluidExplorePreview /></Suspense>;
  if (SharedItemsPreview && location.pathname === "/dev/lab-kits/shared-items")
    return <Suspense fallback={<PageLoader fullScreen message={t.starting} />}><SharedItemsPreview /></Suspense>;
  if (user?.mustChangePassword) return <PasswordGate />;
  const verifyEmailToken = new URLSearchParams(location.search).get("verifyEmail");
  if (verifyEmailToken) return <EmailVerification token={verifyEmailToken} />;
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
  if (/^\/labs\/[^/]+\/?$/.test(location.pathname)) return <Suspense fallback={<div className="lab-space"><Link className="secondary" to={user.role === "TEACHER" ? "/class-labs" : "/labs"}>{user.role === "TEACHER" ? t.classLab : t.labsLabel}</Link><PageLoader fullScreen message={t.starting} /></div>}>
    <Routes><Route path="/labs/:id" element={["STUDENT", "TEACHER"].includes(user.role) ? <Lab /> : <Navigate to="/" />} /></Routes>
  </Suspense>;
  return (
    <div className={`app-shell${user.role === "STUDENT" ? " app-shell-student" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}${/^\/lessons\/[^/]+/.test(location.pathname) ? " lesson-focus-mode" : ""}`}>
      <aside className={`sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar-header">
          <Link to="/" className="brand" title="NexaLab">
            <span className="brand-icon">
              <Atom size={25} />
            </span>
            <span className="brand-text">
              NexaLab<span className="brand-dot">.</span>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
            aria-label={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">
            <GraduationCap size={20} />
          </span>
          <div className="workspace-info">
            <b>{user.role === "TEACHER" ? t.teacherWorkspace : t.workspace}</b>
            <small>{t.workspaceScope}</small>
          </div>
        </div>
        <p className="nav-caption">{user.role === "TEACHER" ? t.teacherNavCaption : t.navCaption}</p>
        <nav>
          {user.role === "STUDENT" ? (
            <>
              <NavLink end to="/" aria-label={t.home} title={t.home}><LayoutDashboard /><span className="nav-text">{t.home}</span></NavLink>
              <NavLink to="/lessons" aria-label={t.lessons} title={t.lessons}><BookOpen /><span className="nav-text">{t.lessons}</span></NavLink>
              <NavLink to="/labs" aria-label={t.labsLabel} title={t.labsLabel}><FlaskConical /><span className="nav-text">{t.labsShort}</span></NavLink>
              <NavLink to="/assignments" aria-label={t.assignments} title={t.assignments}><ClipboardList /><span className="nav-text">{t.assignments}</span></NavLink>
              <NavLink to="/classes" aria-label={t.classSpace} title={t.classSpace}><Users /><span className="nav-text">{t.classSpace}</span></NavLink>
              <NavLink to="/progress" aria-label={t.progress} title={t.progress}><ChartNoAxesCombined /><span className="nav-text">{t.progress}</span></NavLink>
            </>
          ) : (
            <>
              <NavLink end to="/" title={t.overview}><LayoutDashboard /><span className="nav-text">{t.overview}</span></NavLink>
              {user.role === "TEACHER" && <NavLink to="/class-labs" title={t.classLab}><FlaskConical /><span className="nav-text">{t.classLab}</span></NavLink>}
              {user.role === "TEACHER" && <NavLink to="/classes" title={t.myClasses}><Users /><span className="nav-text">{t.myClasses}</span></NavLink>}
              {user.role === "TEACHER" && <Suspense fallback={null}><TeacherCreditsNav /></Suspense>}
              {user.role !== "PARENT" && <NavLink to="/lessons" title={t.lessonLibrary}><BookOpen /><span className="nav-text">{t.lessonLibrary}</span></NavLink>}
              {user.role === "PARENT" && <NavLink to="/progress" title={t.childProgress}><ChartNoAxesCombined /><span className="nav-text">{t.childProgress}</span></NavLink>}
              {user.role === "ADMIN" && <NavLink to="/admin" title={t.admin}><Settings /><span className="nav-text">{t.admin}</span></NavLink>}
            </>
          )}
        </nav>
        <NavLink className="settings-link" to="/settings" title={t.settings}>
          <Settings size={18} />
          <span className="nav-text">{t.settings}</span>
        </NavLink>
        <div className="user-card">
          <Avatar name={user.fullName} url={profile.data?.avatarUrl} />
          <div className="user-card-info">
            <b>{user.fullName}</b>
            <small>{commonText().roles[user.role]}</small>
          </div>
          <button
            title={t.signOut}
            aria-label={t.signOut}
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
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-sidebar-toggle"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
              aria-label={sidebarCollapsed ? t.expandSidebar : t.collapseSidebar}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <TopbarBreadcrumb pathname={location.pathname} user={user} />
          </div>
          <div>
            <span className="online-dot" /> {user.role === "TEACHER" ? t.teacherReady : t.ready}{" "}
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
              <Route path="/class-labs" element={user.role === "TEACHER" ? <ClassLabs /> : <Navigate to={user.role === "STUDENT" ? "/labs" : "/"} replace />} />
              <Route path="/labs" element={user.role === "TEACHER" ? <Navigate to="/class-labs" replace /> : <LabLibrary />} />
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
              {/* Parents read linked-child progress only; lessons are not theirs to browse (QR-03). */}
              <Route path="/lessons" element={user.role === "PARENT" ? <Navigate to="/" replace /> : <Lessons />} />
              <Route path="/lessons/catalog/*" element={user.role === "PARENT" ? <Navigate to="/" replace /> : <Lessons />} />
              <Route path="/lessons/:id" element={user.role === "PARENT" ? <Navigate to="/" replace /> : <LessonDetail />} />
              <Route path="/ebooks" element={<EbookLibraryPage />} />
              <Route path="/ebooks/:subjectId" element={<EbookReader />} />
              <Route path="/assignments" element={user.role === "STUDENT" ? <StudentAssignments /> : <Navigate to="/classes" />} />
              <Route path="/assignments/catalog/*" element={user.role === "STUDENT" ? <StudentAssignments /> : <Navigate to="/classes" />} />
              <Route path="/assignments/:id" element={user.role === "STUDENT" ? <AssignedLearning /> : <Navigate to={user.role === "TEACHER" ? "/classes" : "/"} replace />} />
              <Route path="/classes" element={["STUDENT", "TEACHER"].includes(user.role) ? <Classes /> : <Navigate to="/" replace />} />
              <Route path="/classes/:classId/resources/:resourceId/study" element={user.role === "STUDENT" ? <FlashcardStudy /> : <Navigate to="/classes" replace />} />
              <Route path="/classes/:classId" element={["STUDENT", "TEACHER"].includes(user.role) ? <Classes /> : <Navigate to="/" replace />} />
              <Route path="/classes/:classId/catalog/*" element={user.role === "STUDENT" ? <Classes /> : <Navigate to="/classes" />} />
              <Route path="/progress" element={["STUDENT", "PARENT"].includes(user.role) ? <ProgressPage /> : <Navigate to={user.role === "TEACHER" ? "/classes" : "/"} replace />} />
              <Route path="/saved" element={user.role === "STUDENT" ? <Saved /> : <Navigate to="/" replace />} />
              <Route path="/credits" element={user.role === "TEACHER" ? <TeacherCredits /> : <Navigate to="/" replace />} />
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
