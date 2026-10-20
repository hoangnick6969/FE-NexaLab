import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AlertTriangle, Archive, Ban, CheckCircle2, CircleSlash, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";

const adminText = defineText({
  vi: {
    draft: "Bản nháp",
    published: "Đã xuất bản",
    archived: "Đã lưu trữ",
    quarantined: "Đang cách ly",
    teacherPrivate: "Riêng của giáo viên",
    sharedLibrary: "Thư viện chung",
    passed: "Đạt",
    partial: "Đạt một phần",
    needsPractice: "Cần luyện thêm",
    invalid: "Trạng thái không hợp lệ",
    original: "NexaLab tự biên soạn",
    schoolOwned: "Nhà trường sở hữu",
    active: "Đang hoạt động",
    disabled: "Đã vô hiệu hóa",
    ready: "Sẵn sàng",
    retired: "Đã thay thế",
    success: "Thành công",
    denied: "Bị từ chối",
    failure: "Thất bại",
    loading: "Đang tải…",
    retry: "Thử lại",
    refreshing: "Đang cập nhật dữ liệu mới nhất…",
    stale: "Không làm mới được; đang hiển thị dữ liệu trước đó.",
    noData: "Không có dữ liệu phù hợp.",
    reason: "Lý do (bắt buộc, được ghi vào nhật ký kiểm toán)",
    cancel: "Hủy",
    working: "Đang xử lý…",
    loadMore: "Tải thêm",
  },
  en: {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
    quarantined: "Quarantined",
    teacherPrivate: "Teacher's private",
    sharedLibrary: "Shared library",
    passed: "Passed",
    partial: "Partly passed",
    needsPractice: "Needs more practice",
    invalid: "Invalid state",
    original: "Written by NexaLab",
    schoolOwned: "School-owned",
    active: "Active",
    disabled: "Disabled",
    ready: "Ready",
    retired: "Superseded",
    success: "Succeeded",
    denied: "Denied",
    failure: "Failed",
    loading: "Loading…",
    retry: "Try again",
    refreshing: "Fetching the latest data…",
    stale: "Could not refresh; showing the previous data.",
    noData: "No matching data.",
    reason: "Reason (required, recorded in the audit log)",
    cancel: "Cancel",
    working: "Working…",
    loadMore: "Load more",
  },
});
const t = adminText();

export const ROLE_LABEL: Record<string, string> = commonText().roles;

export const LESSON_STATUS: Record<string, string> = {
  draft: t.draft,
  published: t.published,
  archived: t.archived,
  quarantined: t.quarantined,
};

export const SCOPE_LABEL: Record<string, string> = { TEACHER_PRIVATE: t.teacherPrivate, SHARED_LIBRARY: t.sharedLibrary };

export const VERDICT_LABEL: Record<string, string> = {
  passed: t.passed,
  partial: t.partial,
  needs_practice: t.needsPractice,
  invalid: t.invalid,
};

export const LICENSE_LABEL: Record<string, string> = {
  ORIGINAL: t.original,
  CC0: "CC0",
  CC_BY: "CC BY",
  CC_BY_SA: "CC BY-SA",
  SCHOOL_OWNED: t.schoolOwned,
};

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  const text = search.toString();
  return text ? "?" + text : "";
};

export const when = (value?: string | null) => (value ? formatDateTime(value) : "—");

/** Text + icon status; never colour alone. */
export function Status({ value }: { value: string }) {
  const map: Record<string, [string, string, JSX.Element]> = {
    active: [t.active, "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    disabled: [t.disabled, "not_passed", <Ban size={13} aria-hidden key="i" />],
    READY: [t.ready, "passed", <ShieldCheck size={13} aria-hidden key="i" />],
    ACTIVE: [t.active, "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    ARCHIVED: [t.archived, "outline", <Archive size={13} aria-hidden key="i" />],
    QUARANTINED: [t.quarantined, "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    quarantined: [t.quarantined, "not_passed", <ShieldAlert size={13} aria-hidden key="i" />],
    published: [t.published, "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    draft: [t.draft, "outline", <CircleSlash size={13} aria-hidden key="i" />],
    archived: [t.archived, "outline", <Archive size={13} aria-hidden key="i" />],
    retired: [t.retired, "outline", <Archive size={13} aria-hidden key="i" />],
    success: [t.success, "passed", <CheckCircle2 size={13} aria-hidden key="i" />],
    denied: [t.denied, "not_passed", <Ban size={13} aria-hidden key="i" />],
    failure: [t.failure, "partial", <AlertTriangle size={13} aria-hidden key="i" />],
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
        {t.loading}
      </p>
    );
  if (query.error && !query.data)
    return (
      <div className="load-error" role="alert">
        <ErrorBox error={query.error} />
        <button type="button" className="secondary" onClick={() => query.refetch()}>
          <RefreshCw size={14} aria-hidden /> {t.retry}
        </button>
      </div>
    );
  return (
    <>
      {query.isFetching && (
        <p className="tiny muted admin-stale" role="status">
          {t.refreshing}
        </p>
      )}
      {query.error && (
        <p className="tiny muted" role="alert">
          {t.stale}
        </p>
      )}
      {empty ? <p className="empty">{t.noData}</p> : children}
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
          <span>{t.reason}</span>
          <textarea required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <ErrorBox error={error} />
        <div className="button-row">
          <button type="button" className="secondary" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className={danger ? "danger" : "primary"} disabled={pending || reason.trim().length < 3}>
            {pending ? t.working : confirmLabel}
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
      {query.isFetchingNextPage ? t.loading : t.loadMore}
    </button>
  ) : null;
}
