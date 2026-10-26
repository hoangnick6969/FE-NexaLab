import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export type Notice = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };
export type NoticeList = { items: Notice[]; unreadCount: number };

export const UNREAD_KEY = ["notifications-unread"] as const;
/** The dropdown shows the newest few; it shares the ["notifications"] prefix so every invalidation reaches it. */
export const RECENT_KEY = ["notifications", "recent"] as const;
/** Fetched deep enough that an unread urgent notice behind newer ones still reaches "Needs attention". */
export const RECENT_LIMIT = 30;
export const RECENT_SHOWN = 8;
export const fetchRecent = () => api<NoticeList>(`/me/notifications?limit=${RECENT_LIMIT}`);

/** Mark-read, mark-all-read and open (mark read, then follow the link), shared by the page, dropdown and toasts. */
export function useNoticeActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
  };
  const read = useMutation({ mutationFn: (id: string) => api(`/me/notifications/${id}/read`, "POST"), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api("/me/notifications/read-all", "POST"), onSuccess: refresh });
  const open = async (notice: Pick<Notice, "id" | "link" | "readAt">) => {
    if (!notice.readAt) await read.mutateAsync(notice.id).catch(() => undefined);
    if (notice.link) navigate(notice.link);
  };
  return { read, readAll, open, refresh };
}

/**
 * How loudly a notice type speaks. urgent = something already went wrong (overdue, rejected);
 * attention = action needed soon (due soon, approve a late submission or a join request);
 * task = new work or a change to it; info = nothing to do.
 */
export type Tone = "urgent" | "attention" | "task" | "info";
export const TONES: Record<string, Tone> = {
  ASSIGNMENT_OVERDUE: "urgent",
  LATE_REJECTED: "urgent",
  ASSIGNMENT_DUE_SOON: "attention",
  LATE_SUBMISSION_PENDING: "attention",
  ENROLLMENT_REQUESTED: "attention",
  ASSIGNMENT_CREATED: "task",
  DEADLINE_EXTENDED: "task",
  SUBMISSION_RECEIVED: "task",
  RESOURCE_PUBLISHED: "info",
  ENROLLMENT_APPROVED: "info",
};
export const toneOf = (notice: Pick<Notice, "type">): Tone => TONES[notice.type] ?? "info";
export const isPriority = (notice: Notice) => !notice.readAt && (toneOf(notice) === "urgent" || toneOf(notice) === "attention");

/** Unread urgent/attention notices first (newest first within), then the rest in time order. */
export function splitByPriority(items: Notice[]) {
  const priority = items.filter(isPriority).sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  return { priority, rest: items.filter((notice) => !isPriority(notice)) };
}
const rank = (notice: Notice) => (toneOf(notice) === "urgent" ? 0 : 1);
