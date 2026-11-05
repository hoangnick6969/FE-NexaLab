import { Atom, BookOpen, ChartNoAxesCombined, ChevronDown, ClipboardList, FlaskConical, GraduationCap, LayoutDashboard, LogOut, Settings, Users, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api, useAuth, type User } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { commonText } from "../i18n/common";
import { defineText } from "../i18n";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { queryClient } from "./query-client";

const text = defineText({
  vi: {
    mainNav: "Điều hướng chính",
    mobileNav: "Điều hướng nhanh",
    workspace: "Không gian học tập",
    workspaceScope: "Khoa học tự nhiên · THCS",
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
    admin: "Quản trị",
    settings: "Cài đặt tài khoản",
    signOut: "Đăng xuất",
    accountMenu: "Mở menu tài khoản",
  },
  en: {
    mainNav: "Main navigation",
    mobileNav: "Quick navigation",
    workspace: "Learning space",
    workspaceScope: "Natural science · Lower secondary",
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
    admin: "Administration",
    settings: "Account settings",
    signOut: "Sign out",
    accountMenu: "Open account menu",
  },
});

type NavItem = { to: string; label: string; short?: string; icon: LucideIcon; end?: boolean };

/** One list drives both the header links and the student's phone tab bar, so they never drift. */
function navItems(role: User["role"], t: ReturnType<typeof text>): NavItem[] {
  if (role === "STUDENT")
    return [
      { to: "/", label: t.home, icon: LayoutDashboard, end: true },
      { to: "/lessons", label: t.lessons, icon: BookOpen },
      { to: "/labs", label: t.labsLabel, short: t.labsShort, icon: FlaskConical },
      { to: "/assignments", label: t.assignments, icon: ClipboardList },
      { to: "/classes", label: t.classSpace, icon: Users },
      { to: "/progress", label: t.progress, icon: ChartNoAxesCombined },
    ];
  const items: NavItem[] = [{ to: "/", label: t.overview, icon: LayoutDashboard, end: true }];
  if (role === "TEACHER") items.push({ to: "/labs", label: t.labsLabel, icon: FlaskConical });
  if (role !== "PARENT") items.push({ to: "/lessons", label: t.lessonLibrary, icon: BookOpen });
  if (role === "TEACHER") items.push({ to: "/classes", label: t.myClasses, icon: Users });
  if (role === "PARENT") items.push({ to: "/progress", label: t.childProgress, icon: ChartNoAxesCombined });
  if (role === "ADMIN") items.push({ to: "/admin", label: t.admin, icon: Settings });
  return items;
}

async function signOut() {
  try {
    await api("/auth/logout", "POST");
  } finally {
    useAuth.getState().set(null, null);
    queryClient.clear();
  }
}

function UserMenu({ user, avatarUrl, t }: { user: User; avatarUrl?: string | null; t: ReturnType<typeof text> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="topnav-user" ref={rootRef}>
      <button
        type="button"
        className="topnav-user-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.accountMenu}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.fullName} url={avatarUrl} className="avatar topnav-avatar" />
        <span className="topnav-user-name">{user.fullName}</span>
        <ChevronDown size={15} aria-hidden="true" className="topnav-user-caret" />
      </button>
      {open && (
        <div className="topnav-user-menu" id={menuId} role="menu">
          <div className="topnav-user-head">
            <Avatar name={user.fullName} url={avatarUrl} />
            <div>
              <b>{user.fullName}</b>
              <small>{commonText().roles[user.role]}</small>
            </div>
          </div>
          <div className="topnav-user-workspace">
            <GraduationCap size={16} aria-hidden="true" />
            <span>
              {t.workspace}
              <small>{t.workspaceScope}</small>
            </span>
          </div>
          <Link role="menuitem" to="/settings" className="topnav-user-item">
            <Settings size={16} aria-hidden="true" /> {t.settings}
          </Link>
          <button role="menuitem" type="button" className="topnav-user-item is-danger" onClick={() => void signOut()}>
            <LogOut size={16} aria-hidden="true" /> {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ user, avatarUrl }: { user: User; avatarUrl?: string | null }) {
  const t = text();
  const items = navItems(user.role, t);
  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="brand topnav-brand" title="NexaLab">
            <span className="brand-icon">
              <Atom size={21} />
            </span>
            <span className="brand-text">
              NexaLab<span className="brand-dot">.</span>
            </span>
          </Link>
          <nav className="topnav-links" aria-label={t.mainNav}>
            {items.map(({ to, label, short, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={label}>
                <Icon aria-hidden="true" />
                <span className="nav-text nav-text-full">{label}</span>
                {short && <span className="nav-text nav-text-short" aria-hidden="true">{short}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="topnav-actions">
            <NotificationBell />
            <UserMenu user={user} avatarUrl={avatarUrl} t={t} />
          </div>
        </div>
      </header>
      {user.role === "STUDENT" && (
        <nav className="bottom-tabs" aria-label={t.mobileNav}>
          {items
            .filter((item) => item.to !== "/labs")
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
      )}
    </>
  );
}
