import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Empty, ErrorBox, InlineLoader } from "../../components/ui";
import { UNREAD_KEY } from "./NotificationBell";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    title: "Thông báo",
    description: "Bài được giao, bài nộp, hạn nộp và hoạt động lớp học.",
    list: "Danh sách thông báo",
    unreadCount: (n: number) => `${n} chưa đọc`,
    allRead: "Đã đọc hết",
    markAll: "Đánh dấu tất cả đã đọc",
    loading: "Đang tải thông báo…",
    empty: "Chưa có thông báo nào.",
    unreadSuffix: " · Chưa đọc",
  },
  en: {
    title: "Notifications",
    description: "Assigned work, submissions, due dates and class activity.",
    list: "Notification list",
    unreadCount: (n: number) => `${n} unread`,
    allRead: "All caught up",
    markAll: "Mark all as read",
    loading: "Loading notifications…",
    empty: "No notifications yet.",
    unreadSuffix: " · Unread",
  },
});

type Notice = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

/** Notification list (acc-3): newest first; opening one marks it read and follows its link. */
export function NotificationsPage() {
  const t = text();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const list = useQuery<{ items: Notice[]; unreadCount: number }>({ queryKey: ["notifications"], queryFn: () => api("/me/notifications"), refetchInterval: 30_000 });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
  };
  const read = useMutation({ mutationFn: (id: string) => api(`/me/notifications/${id}/read`, "POST"), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api("/me/notifications/read-all", "POST"), onSuccess: refresh });
  const open = async (notice: Notice) => {
    if (!notice.readAt) await read.mutateAsync(notice.id).catch(() => undefined);
    if (notice.link) navigate(notice.link);
  };
  return (
    <>
      <PageHeading title={t.title} description={t.description} />
      <section className="panel" aria-label={t.list}>
        <div className="section-heading">
          <h2>{list.data?.unreadCount ? t.unreadCount(list.data.unreadCount) : t.allRead}</h2>
          {Boolean(list.data?.unreadCount) && (
            <button type="button" className="secondary" disabled={readAll.isPending} onClick={() => readAll.mutate()}>
              {t.markAll}
            </button>
          )}
        </div>
        {list.isLoading && <InlineLoader message={t.loading} />}
        <ErrorBox error={list.error || read.error || readAll.error} />
        {list.data && !list.data.items.length && <Empty>{t.empty}</Empty>}
        <ul className="notification-list">
          {list.data?.items.map((notice) => (
            <li key={notice.id}>
              <button type="button" className={`notification-item${notice.readAt ? "" : " unread"}`} onClick={() => void open(notice)}>
                <b>{notice.title}</b>
                {notice.body && <span>{notice.body}</span>}
                <small>
                  {formatDateTime(notice.createdAt)}
                  {notice.readAt ? "" : t.unreadSuffix}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
