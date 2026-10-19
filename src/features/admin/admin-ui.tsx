import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AlertTriangle, Archive, Ban, CheckCircle2, CircleSlash, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";

export const ROLE_LABEL: Record<string, string> = { STUDENT: "Học sinh", TEACHER: "Giáo viên", PARENT: "Phụ huynh", ADMIN: "Quản trị viên" };

export const LESSON_STATUS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
  quarantined: "Đang cách ly",
};

export const SCOPE_LABEL: Record<string, string> = { TEACHER_PRIVATE: "Riêng của giáo viên", SHARED_LIBRARY: "Thư viện chung" };

export const VERDICT_LABEL: Record<string, string> = {
  passed: "Đạt",
  partial: "Đạt một phần",
  needs_practice: "Cần luyện thêm",
  invalid: "Trạng thái không hợp lệ",
};

export const LICENSE_LABEL: Record<string, string> = {
  ORIGINAL: "NexaLab tự biên soạn",
  CC0: "CC0",
  CC_BY: "CC BY",
  CC_BY_SA: "CC BY-SA",
  SCHOOL_OWNED: "Nhà trường sở hữu",
};

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  const text = search.toString();
  return text ? "?" + text : "";
};

export const when = (value?: string | null) => (value ? new Date(value).toLocaleString("vi-VN") : "—");

/** Text + icon status; never colour alone. */
export function Status({ value }: { value: string }) {
  const map: Record<string, [string, string, JSX.Element]> = {
    active: ["Đang hoạt động", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    disabled: ["Đã vô hiệu hóa", "not_passed", <Ban size={13} aria-hidden key="i" />],
    READY: ["Sẵn sàng", "passed", <ShieldCheck size={13} aria-hidden key="i" />],
    QUARANTINED: ["Đang cách ly", "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    quarantined: ["Đang cách ly", "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    published: ["Đã xuất bản", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    draft: ["Bản nháp", "outline", <CircleSlash size={13} aria-hidden key="i" />],
    archived: ["Đã lưu trữ", "outline", <Archive size={13} aria-hidden key="i" />],
    retired: ["Đã thay thế", "outline", <Archive size={13} aria-hidden key="i" />],
    success: ["Thành công", "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    denied: ["Bị từ chối", "not_passed", <Ban size={13} aria-hidden key="i" />],
    failure: ["Thất bại", "partial", <AlertTriangle size={13} aria-hidden key="i" />],
  };
  const [label, tone, icon] = map[value] ?? [value, "outline", null];
  return (
    <Badge tone={tone}>
      <span className="admin-status">
        {icon}
        {label}
      </span>
    </Badge>
  );
}

/** Loading, error (with retry), stale and empty states for one query. */
export function QueryState({ query, empty, children }: { query: any; empty?: boolean; children: React.ReactNode }) {
  if (query.isLoading)
    return (
      <p className="muted" role="status">
        Đang tải…
      </p>
    );
  if (query.error && !query.data)
    return (
      <div className="load-error" role="alert">
        <ErrorBox error={query.error} />
        <button type="button" className="secondary" onClick={() => query.refetch()}>
          <RefreshCw size={14} aria-hidden /> Thử lại
        </button>
      </div>
    );
  return (
    <>
      {query.isFetching && (
        <p className="tiny muted admin-stale" role="status">
          Đang cập nhật dữ liệu mới nhất…
        </p>
      )}
      {query.error && (
        <p className="tiny muted" role="alert">
          Không làm mới được; đang hiển thị dữ liệu trước đó.
        </p>
      )}
      {empty ? <p className="empty">Không có dữ liệu phù hợp.</p> : children}
    </>
  );
}

/** Reason dialog for every destructive or privilege-sensitive action (C2-T6). */
export function ReasonDialog({
  title,
  effect,
  confirmLabel,
  onSubmit,
  onClose,
  pending,
  error,
  children,
  danger = true,
}: {
  title: string;
  effect: React.ReactNode;
  confirmLabel: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
  pending?: boolean;
  error?: unknown;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="admin-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason.trim());
        }}
      >
        <div className="notice admin-effect">{effect}</div>
        {children}
        <label className="field">
          <span>Lý do (bắt buộc, được ghi vào nhật ký kiểm toán)</span>
          <textarea required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <ErrorBox error={error} />
        <div className="button-row">
          <button type="button" className="secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={danger ? "danger" : "primary"} disabled={pending || reason.trim().length < 3}>
            {pending ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function usePaged(key: unknown[], path: string, params: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: [...key, params],
    queryFn: ({ pageParam }) => api(path + qs({ ...params, cursor: pageParam })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: any) => last.nextCursor ?? undefined,
  });
}

export const rowsOf = (query: any) => (query.data?.pages ?? []).flatMap((p: any) => p.items);

export function LoadMore({ query }: { query: any }) {
  return query.hasNextPage ? (
    <button type="button" className="secondary admin-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
      {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
    </button>
  ) : null;
}
