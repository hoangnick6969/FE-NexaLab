import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Empty, ErrorBox, InlineLoader } from "../../components/ui";
import { splitByPriority, useNoticeActions, type NoticeList } from "./notices";
import { NoticeGroup } from "./NoticeItem";
import { defineText } from "../../i18n";

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
    priority: "Cần chú ý",
    latest: "Mới nhất",
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
    priority: "Needs attention",
    latest: "Latest",
  },
});

/** Notification list (acc-3): newest first; opening one marks it read and follows its link. */
export function NotificationsPage() {
  const t = text();
  const list = useQuery<NoticeList>({ queryKey: ["notifications"], queryFn: () => api("/me/notifications"), refetchInterval: 30_000 });
  const { read, readAll, open } = useNoticeActions();
  const { priority, rest } = splitByPriority(list.data?.items ?? []);
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
        {priority.length > 0 && <NoticeGroup title={t.priority} notices={priority} onOpen={(notice) => void open(notice)} />}
        {rest.length > 0 && <NoticeGroup title={priority.length ? t.latest : undefined} notices={rest} onOpen={(notice) => void open(notice)} />}
      </section>
    </>
  );
}
