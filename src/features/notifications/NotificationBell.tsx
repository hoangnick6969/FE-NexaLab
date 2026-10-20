import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export const UNREAD_KEY = ["notifications-unread"] as const;

/** Topbar bell; polls the unread count every 30 s (D-ACC-02). */
export function NotificationBell() {
  const unread = useQuery<{ count: number }>({ queryKey: UNREAD_KEY, queryFn: () => api("/me/notifications/unread-count"), refetchInterval: 30_000, refetchIntervalInBackground: false });
  const count = unread.data?.count ?? 0;
  return (
    <Link to="/notifications" className="notification-bell" aria-label={count ? `Thông báo, ${count} chưa đọc` : "Thông báo"}>
      <Bell size={18} />
      {count > 0 && <span className="notification-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
