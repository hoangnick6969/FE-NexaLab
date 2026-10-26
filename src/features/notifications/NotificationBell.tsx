import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { ErrorBox, InlineLoader } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { fetchRecent, RECENT_KEY, UNREAD_KEY, useNoticeActions, type NoticeList } from "./notices";
import { NotificationToasts } from "./NotificationToasts";

export { UNREAD_KEY } from "./notices";

const text = defineText({
  vi: {
    label: "Thông báo",
    unread: (count: number) => `Thông báo, ${count} chưa đọc`,
    markAll: "Đánh dấu tất cả đã đọc",
    loading: "Đang tải thông báo…",
    empty: "Chưa có thông báo nào.",
    emptyHint: "Bài được giao, bài nộp và hạn nộp sẽ hiện ở đây.",
    unreadSuffix: "Chưa đọc",
    seeAll: "Xem tất cả thông báo",
  },
  en: {
    label: "Notifications",
    unread: (count: number) => `Notifications, ${count} unread`,
    markAll: "Mark all as read",
    loading: "Loading notifications…",
    empty: "No notifications yet.",
    emptyHint: "Assigned work, submissions and due dates will show up here.",
    unreadSuffix: "Unread",
    seeAll: "See all notifications",
  },
});

/**
 * Topbar bell (acc-3): polls the unread count every 30 s (D-ACC-02) and opens a dropdown of the newest
 * notices in place, so checking them never leaves the current page. New arrivals surface as toasts.
 */
export function NotificationBell() {
  const t = text();
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const unread = useQuery<{ count: number }>({ queryKey: UNREAD_KEY, queryFn: () => api("/me/notifications/unread-count"), refetchInterval: 30_000, refetchIntervalInBackground: false });
  const recent = useQuery<NoticeList>({ queryKey: RECENT_KEY, queryFn: fetchRecent, enabled: open });
  const actions = useNoticeActions();
  const count = unread.data?.count ?? 0;

  // Close on route change, outside press and Escape; Escape hands focus back to the bell.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadInList = recent.data?.unreadCount ?? count;
  return (
    <div className="notification-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell"
        aria-label={count ? t.unread(count) : t.label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {count > 0 && <span className="notification-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <section id={panelId} className="notification-panel" aria-label={t.label}>
          <header className="notification-panel-head">
            <h2>{t.label}</h2>
            {unreadInList > 0 && (
              <button type="button" className="notification-panel-action" disabled={actions.readAll.isPending} onClick={() => actions.readAll.mutate()}>
                {t.markAll}
              </button>
            )}
          </header>
          {recent.isLoading && <InlineLoader size="sm" message={t.loading} />}
          <ErrorBox error={recent.error || actions.read.error || actions.readAll.error} />
          {recent.data && !recent.data.items.length && (
            <div className="notification-panel-empty">
              <b>{t.empty}</b>
              <span>{t.emptyHint}</span>
            </div>
          )}
          {Boolean(recent.data?.items.length) && (
            <ul className="notification-panel-list">
              {recent.data!.items.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    className={`notification-panel-item${notice.readAt ? "" : " unread"}`}
                    onClick={() => {
                      setOpen(false);
                      void actions.open(notice);
                    }}
                  >
                    <b>{notice.title}</b>
                    {notice.body && <span>{notice.body}</span>}
                    <small>
                      {formatDateTime(notice.createdAt)}
                      {!notice.readAt && <em>{t.unreadSuffix}</em>}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/notifications" className="notification-panel-all">
            {t.seeAll}
          </Link>
        </section>
      )}
      <NotificationToasts count={unread.data?.count} quiet={open || location.pathname === "/notifications"} />
    </div>
  );
}
