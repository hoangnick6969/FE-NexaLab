import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "../../lib/api";
import { defineText, formatDateTime } from "../../i18n";
import "./ai-usage.css";

type Quota = {
  dailyLimit: number;
  usedLast24h: number;
  activeJobs: number;
  concurrencyLimit: number | null;
  resetsAt: string | null;
};

const text = defineText({
  vi: {
    usage: (used: number, limit: number) => `Đã dùng ${used}/${limit} lượt trong 24 giờ qua`,
    remaining: (n: number) => `Còn ${n} lượt`,
    next: (at: string) => `Lượt tiếp theo có lại lúc ${at}`,
    running: (active: number, limit: number) => `Đang xử lý ${active}/${limit} yêu cầu`,
    exhausted: "Đã hết lượt.",
    busy: "Hãy đợi một yêu cầu đang xử lý hoàn tất.",
    loading: "Đang tải hạn mức AI…",
    failed: "Chưa tải được hạn mức AI.",
    retry: "Tải lại",
  },
  en: {
    usage: (used: number, limit: number) => `Used ${used}/${limit} requests in the last 24 hours`,
    remaining: (n: number) => `${n} requests left`,
    next: (at: string) => `Next request frees up at ${at}`,
    running: (active: number, limit: number) => `${active}/${limit} requests in progress`,
    exhausted: "No requests left.",
    busy: "Wait for a request in progress to finish.",
    loading: "Loading AI usage…",
    failed: "Could not load AI usage.",
    retry: "Retry",
  },
});

export function useAiQuota(purpose: string) {
  return useQuery({
    queryKey: ["ai-quota", purpose],
    queryFn: () => api<Quota>(`/me/ai-quota?purpose=${purpose}`),
    refetchInterval: ({ state }) => state.data?.activeJobs ? 5_000 : 30_000,
  });
}

export function isQuotaFull(quota: Quota | undefined) {
  return !!quota && (quota.usedLast24h >= quota.dailyLimit ||
    (quota.concurrencyLimit !== null && quota.activeJobs >= quota.concurrencyLimit));
}

export function AiQuotaMeter({ title, query, footer }: { title: string; query: ReturnType<typeof useAiQuota>; footer?: ReactNode }) {
  const t = text();
  const quota = query.data;
  const usage = quota && t.usage(quota.usedLast24h, quota.dailyLimit);
  const exhausted = !!quota && quota.usedLast24h >= quota.dailyLimit;
  return (
    <div className="ai-quota-meter">
      <div className="ai-quota-line">
        <strong>{title}</strong>
        {quota && <b className={exhausted ? "warning-text" : undefined}>{t.remaining(Math.max(0, quota.dailyLimit - quota.usedLast24h))}</b>}
      </div>
      {query.isError && (
        <div className="ai-quota-line tiny">
          <span role="status">{t.failed}</span>
          <button type="button" className="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{t.retry}</button>
        </div>
      )}
      {query.isPending && <small className="muted" role="status">{t.loading}</small>}
      {quota && (
        <>
          <meter aria-label={usage} min={0} max={Math.max(1, quota.dailyLimit)} value={Math.min(quota.usedLast24h, quota.dailyLimit)} />
          <div className="ai-quota-details tiny muted">
            <span>{usage}</span>
            {quota.resetsAt && <span>{t.next(formatDateTime(quota.resetsAt))}</span>}
            {quota.concurrencyLimit !== null && <span>{t.running(quota.activeJobs, quota.concurrencyLimit)}</span>}
          </div>
          {isQuotaFull(quota) && <small className="warning-text" role="status">{exhausted ? t.exhausted : t.busy}</small>}
        </>
      )}
      {footer && <div className="ai-quota-footer">{footer}</div>}
    </div>
  );
}

export function AiQuotaRow({ purpose, title }: { purpose: string; title: string }) {
  const query = useAiQuota(purpose);
  return <AiQuotaMeter title={title} query={query} />;
}
