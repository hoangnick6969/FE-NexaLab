import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { type User } from "../lib/api";
import { labInfo } from "../features/labs/lab-info";
import { defineText } from "../i18n";

const text = defineText({
  vi: {
    home: "Trang chủ",
    overview: "Tổng quan",
    lessons: "Bài học",
    lessonLibrary: "Thư viện bài học",
    subjectIndex: "Mục lục môn học",
    lessonDetail: "Chi tiết bài học",
    teachingDetail: "Chi tiết bài giảng",
    ebookLibrary: "Thư viện Ebook",
    ebookReader: "Trình đọc ebook",
    labs: "Phòng thí nghiệm",
    practice: "Thực hành",
    assignments: "Bài tập",
    classes: "Lớp học",
    assignmentDetail: "Chi tiết bài tập",
    assignmentIndex: "Mục lục bài tập",
    classSpace: "Class Space",
    myClasses: "Lớp học của tôi",
    subjectSpace: "Không gian môn học",
    childProgress: "Tiến độ của con",
    learningProgress: "Tiến độ học tập",
    savedLabs: "Thí nghiệm đã lưu",
    settings: "Cài đặt tài khoản",
    notifications: "Thông báo",
    admin: "Quản trị hệ thống",
    explore: "Khám phá",
    pagePath: "Đường dẫn trang",
    workspace: "Không gian học tập",
  },
  en: {
    home: "Home",
    overview: "Overview",
    lessons: "Lessons",
    lessonLibrary: "Lesson library",
    subjectIndex: "Subject index",
    lessonDetail: "Lesson details",
    teachingDetail: "Lesson details",
    ebookLibrary: "Ebook library",
    ebookReader: "Ebook reader",
    labs: "Labs",
    practice: "Practice",
    assignments: "Assignments",
    classes: "Classes",
    assignmentDetail: "Assignment details",
    assignmentIndex: "Assignment index",
    classSpace: "Class Space",
    myClasses: "My classes",
    subjectSpace: "Subject space",
    childProgress: "My child's progress",
    learningProgress: "Learning progress",
    savedLabs: "Saved experiments",
    settings: "Account settings",
    notifications: "Notifications",
    admin: "System administration",
    explore: "Explore",
    pagePath: "Page path",
    workspace: "Learning space",
  },
});

export function TopbarBreadcrumb({
  pathname,
  user,
}: {
  pathname: string;
  user: User;
}) {
  const isStudent = user.role === "STUDENT";
  const t = text();
  const homeLabel = isStudent ? t.home : t.overview;

  const getBreadcrumbs = () => {
    if (pathname === "/") {
      return [{ label: homeLabel, isCurrent: true }];
    }
    if (pathname === "/lessons") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? t.lessons : t.lessonLibrary, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/lessons/catalog")) {
      return [
        { label: homeLabel, to: "/" },
        { label: t.lessons, to: "/lessons" },
        { label: t.subjectIndex, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/lessons/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? t.lessons : t.lessonLibrary, to: "/lessons" },
        { label: isStudent ? t.lessonDetail : t.teachingDetail, isCurrent: true },
      ];
    }
    if (pathname === "/ebooks") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.lessons, to: "/lessons" },
        { label: t.ebookLibrary, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/ebooks/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: t.ebookLibrary, to: "/ebooks" },
        { label: t.ebookReader, isCurrent: true },
      ];
    }
    if (pathname === "/labs") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.labs, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/labs/")) {
      const labId = pathname.replace("/labs/", "");
      const lab = labInfo.find((l) => l.id === labId);
      return [
        { label: homeLabel, to: "/" },
        { label: t.labs, to: "/labs" },
        { label: lab ? lab.title : t.practice, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/assignments/") && !pathname.startsWith("/assignments/catalog")) {
      return [
        { label: homeLabel, to: "/" },
        {
          label: isStudent ? t.assignments : t.classes,
          to: isStudent ? "/assignments" : "/classes",
        },
        { label: isStudent ? t.assignmentDetail : t.lessonDetail, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/assignments/catalog")) {
      return [
        { label: homeLabel, to: "/" },
        { label: t.assignments, to: "/assignments" },
        { label: t.assignmentIndex, isCurrent: true },
      ];
    }
    if (pathname === "/assignments") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? t.assignments : t.classes, isCurrent: true },
      ];
    }
    if (pathname === "/classes") {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? t.classSpace : t.myClasses, isCurrent: true },
      ];
    }
    if (pathname.startsWith("/classes/")) {
      return [
        { label: homeLabel, to: "/" },
        { label: isStudent ? t.classSpace : t.myClasses, to: "/classes" },
        { label: t.subjectSpace, isCurrent: true },
      ];
    }
    if (pathname === "/progress") {
      return [
        { label: homeLabel, to: "/" },
        {
          label: user.role === "PARENT" ? t.childProgress : t.learningProgress,
          isCurrent: true,
        },
      ];
    }
    if (pathname === "/saved") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.savedLabs, isCurrent: true },
      ];
    }
    if (pathname === "/settings") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.settings, isCurrent: true },
      ];
    }
    if (pathname === "/notifications") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.notifications, isCurrent: true },
      ];
    }
    if (pathname === "/admin") {
      return [
        { label: homeLabel, to: "/" },
        { label: t.admin, isCurrent: true },
      ];
    }
    return [
      { label: homeLabel, to: "/" },
      { label: t.explore, isCurrent: true },
    ];
  };

  const crumbs = getBreadcrumbs();

  return (
    <nav aria-label={t.pagePath} className="topbar-breadcrumb">
      <Link to="/" className="breadcrumb-root">
        {t.workspace}
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
