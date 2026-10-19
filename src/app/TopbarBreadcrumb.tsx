import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { type User } from "../lib/api";
import { labInfo } from "../features/labs/lab-info";

export function TopbarBreadcrumb({
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
        { label: isStudent ? "Chi tiết bài tập" : "Chi tiết bài học", isCurrent: true },
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
        { label: isStudent ? "Class Space" : "Lớp học của tôi", isCurrent: true },
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
