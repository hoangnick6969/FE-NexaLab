import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { defineText } from "../../i18n";
import { fetchRecent, isPriority, RECENT_KEY, toneOf, useNoticeActions, type Notice } from "./notices";
import { NoticeIcon } from "./NoticeItem";

const text = defineText({
  vi: {
    region: "Thông báo mới",
    close: "Đóng",
    many: (n: number) => `Bạn có ${n} thông báo mới`,
    seeAll: "Xem tất cả thông báo",
  },
  en: {
    region: "New notifications",
    close: "Dismiss",
    many: (n: number) => `You have ${n} new notifications`,
    seeAll: "See all notifications",
  },
});

const DWELL_MS = 6000;
/** Overdue, rejected, due-soon and needs-review notices stay longer so they are not missed. */
const PRIORITY_DWELL_MS = 12000;
const EXIT_MS = 280;
const MAX_VISIBLE = 3;

type Toast = { key: string; notice?: Notice; many?: number };

/**
 * Corner toasts for notices that arrive while the app is open. Driven by the bell's unread-count poll:
 * a rise fetches the newest notices and shows the ones not toasted yet. Toasts never take focus,
 * auto-dismiss after 6 s (paused on hover/focus) and stay quiet while the dropdown or page is showing.
 */
export function NotificationToasts({ count, quiet }: { count: number | undefined; quiet: boolean }) {
  const queryClient = useQueryClient();
  const previous = useRef<number>();
  const toasted = useRef(new Set<string>());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (count === undefined) return;
    const before = previous.current;
    previous.current = count;
    if (before === undefined || count <= before) return;
    void queryClient.invalidateQueries({ queryKey: ["notifications"], exact: true });
    if (quiet) {
      void queryClient.invalidateQueries({ queryKey: RECENT_KEY });
      return;
    }
    void queryClient
      .fetchQuery({ queryKey: RECENT_KEY, queryFn: fetchRecent, staleTime: 0 })
      .then(({ items }) => {
        const fresh = items.filter((notice) => !notice.readAt && !toasted.current.has(notice.id)).slice(0, count - before);
        if (!fresh.length) return;
        fresh.forEach((notice) => toasted.current.add(notice.id));
        const next: Toast[] = fresh.length > MAX_VISIBLE ? [{ key: `many-${Date.now()}`, many: fresh.length }] : fresh.reverse().map((notice) => ({ key: notice.id, notice }));
        setToasts((current) => [...current, ...next].slice(-MAX_VISIBLE));
      })
      .catch(() => undefined);
  }, [count, quiet, queryClient]);

  // Opening the dropdown or page shows the same notices, so the toasts step aside.
  useEffect(() => {
    if (quiet) setToasts([]);
  }, [quiet]);

  const dismiss = (key: string) => setToasts((current) => current.filter((toast) => toast.key !== key));
  return (
    <section className="notification-toasts" aria-label={text().region} aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.key} toast={toast} onDone={() => dismiss(toast.key)} />
      ))}
    </section>
  );
}

function ToastCard({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const t = text();
  const actions = useNoticeActions();
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (leaving) {
      const timer = window.setTimeout(() => done.current(), EXIT_MS);
      return () => window.clearTimeout(timer);
    }
    if (paused) return;
    const timer = window.setTimeout(() => setLeaving(true), toast.notice && isPriority(toast.notice) ? PRIORITY_DWELL_MS : DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, paused, toast.notice]);

  const close = () => setLeaving(true);
  return (
    <div
      className={`notification-toast tone-${toast.notice ? toneOf(toast.notice) : "task"}${leaving ? " leaving" : ""}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false);
      }}
    >
      {toast.notice ? (
        <button
          type="button"
          className="notification-toast-body"
          onClick={() => {
            close();
            void actions.open(toast.notice!);
          }}
        >
          <NoticeIcon notice={toast.notice} />
          <span className="notification-toast-text">
            <b>{toast.notice.title}</b>
            {toast.notice.body && <span>{toast.notice.body}</span>}
          </span>
        </button>
      ) : (
        <Link to="/notifications" className="notification-toast-body" onClick={close}>
          <NoticeIcon notice={{ type: "ASSIGNMENT_CREATED" }} />
          <span className="notification-toast-text">
            <b>{t.many(toast.many ?? 0)}</b>
            <span>{t.seeAll}</span>
          </span>
        </Link>
      )}
      <button type="button" className="notification-toast-close" aria-label={t.close} onClick={close}>
        <X size={16} />
      </button>
    </div>
  );
}
