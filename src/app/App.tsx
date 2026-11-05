import { Suspense, lazy, useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { api, useAuth, restore } from "../lib/api";
import { PageLoader } from "../components/ui";
import { Login } from "../features/auth/Login";
import { EmailVerification } from "../features/auth/EmailVerification";
import { Dashboard } from "../features/dashboard/Dashboard";
import { LabLibrary } from "../features/labs/LabLibrary";
import { queryClient } from "./query-client";
import { PROFILE_KEY, useProfile, type Profile } from "../lib/profile";
import { setThemePreference } from "../lib/theme";
import { defineText, getLocale, setLocale, takeLocaleChosenBeforeSignIn } from "../i18n";
import { PasswordGate } from "./PasswordGate";
import { TopbarBreadcrumb } from "./TopbarBreadcrumb";
import { AppHeader } from "./AppHeader";

// Development-only K3 apparatus bench; the branch is removed from production builds.
const K3KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/fluid/kit/dev/K3KitPreview")) : null;
const ThermalFixturePreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/thermal/ThermalFixturePreview")) : null;
const DensityPilotPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/physics/fluid/density/dev/DensityPilotPreview")) : null;
const K7KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/molecular/kit/dev/K7KitPreview")) : null;
const K8KitPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/ecology/kit/dev/K8KitPreview")) : null;
const GeneProteinPilotPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/molecular/gene-protein/dev/GeneProteinPilotPreview")) : null;
const EyeOpticsPreview = import.meta.env.DEV ? lazy(() => import("../features/labs/biology/anatomy/eye-optics/dev/EyeOpticsPreview")) : null;

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
    labsLabel: "Phòng thí nghiệm",
    ready: "Sẵn sàng khám phá",
    loadingSpace: "Đang nạp không gian học tập…",
    footerLeft: "NexaLab · Chạm vào khoa học",
    footerRight: "Quan sát. Thử nghiệm. Thấu hiểu.",
  },
  en: {
    starting: "Starting your learning space…",
    startingCaption: "NexaLab · Touch science",
    openingLanding: "Opening the welcome page…",
    landingCaption: "NexaLab · Simulation lab",
    labsLabel: "Labs",
    ready: "Ready to explore",
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
  if (user.mustChangePassword) return <PasswordGate />;
  if (/^\/labs\/[^/]+\/?$/.test(location.pathname)) return <Suspense fallback={<div className="lab-space"><Link className="secondary" to="/labs">{t.labsLabel}</Link><PageLoader fullScreen message={t.starting} /></div>}>
    <Routes><Route path="/labs/:id" element={["STUDENT", "TEACHER"].includes(user.role) ? <Lab /> : <Navigate to="/" />} /></Routes>
  </Suspense>;
  return (
    <div className={`app-shell app-shell-topnav${user.role === "STUDENT" ? " app-shell-student" : ""}`}>
      <AppHeader user={user} avatarUrl={profile.data?.avatarUrl} />
      <div className="main-wrap">
        <div className="topnav-context">
          <TopbarBreadcrumb pathname={location.pathname} user={user} />
          <span className="topnav-status">
            <span className="online-dot" /> {t.ready}
          </span>
        </div>
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
              <Route path="/classes/:classId" element={["STUDENT", "TEACHER"].includes(user.role) ? <Classes /> : <Navigate to="/" replace />} />
              <Route path="/classes/:classId/catalog/*" element={user.role === "STUDENT" ? <Classes /> : <Navigate to="/classes" />} />
              <Route path="/progress" element={["STUDENT", "PARENT"].includes(user.role) ? <ProgressPage /> : <Navigate to={user.role === "TEACHER" ? "/classes" : "/"} replace />} />
              <Route path="/saved" element={user.role === "STUDENT" ? <Saved /> : <Navigate to="/" replace />} />
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
