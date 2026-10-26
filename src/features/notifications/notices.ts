import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export type Notice = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };
export type NoticeList = { items: Notice[]; unreadCount: number };

export const UNREAD_KEY = ["notifications-unread"] as const;
/** The dropdown shows the newest few; it shares the ["notifications"] prefix so every invalidation reaches it. */
export const RECENT_KEY = ["notifications", "recent"] as const;
export const RECENT_LIMIT = 8;
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
