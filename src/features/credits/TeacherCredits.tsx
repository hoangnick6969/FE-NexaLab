import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Coins, Gift, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { fetchMyCredits, type CreditTransaction } from "./credits-api";
import { historyAmount } from "./credits-view";
import "./credits.css";

const STARTER_BANNER_DISMISSED_KEY = "nexalab.starterBanner.dismissed";

function readBannerDismissed(): boolean {
  try {
    const value = localStorage.getItem(STARTER_BANNER_DISMISSED_KEY);
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

const text = defineText({
  vi: {
    eyebrow: "TRỢ LÝ AI · GIÁO VIÊN",
    title: "Tín dụng AI",
    description: "Tín dụng là ngân sách dùng cho các yêu cầu AI. Mỗi yêu cầu giữ trước một mức ước tính, dùng bao nhiêu thì tính bấy nhiêu và hoàn lại phần còn lại. Yêu cầu thất bại hoặc bị hủy được hoàn lại toàn bộ.",
    available: "Khả dụng",
    reserved: "Đang giữ cho yêu cầu chưa xong",
    unit: "tín dụng",
    starterTitle: (n: number) => `Quà khởi đầu: ${n} tín dụng miễn phí`,
    starterBody: (n: number) => `Thầy cô đã nhận ${n} tín dụng để dùng thử Trợ lý AI. Tín dụng này không hết hạn.`,
    starterDismiss: "Ẩn thông báo",
    historyTitle: "Lịch sử tín dụng AI",
    empty: "Chưa có giao dịch tín dụng nào.",
    disabled: "Tín dụng AI chưa được bật cho hệ thống này.",
    when: "Thời gian",
    what: "Nội dung",
    amount: "Số tín dụng",
    loadMore: "Xem thêm",
    loading: "Đang tải…",
    back: "Quay lại lớp học",
    origins: {
      STARTER: "Quà khởi đầu (miễn phí)",
      PAYMENT: "Nạp tín dụng",
    } as Record<string, string>,
    kinds: {
      GRANT: "Được cấp thêm",
      ADJUST: "Điều chỉnh bởi quản trị viên",
      RESERVE: "Giữ trước cho một yêu cầu AI",
      SETTLE: "Hoàn tất yêu cầu AI",
      REFUND: "Hoàn lại: yêu cầu AI không hoàn thành",
    } as Record<string, string>,
    charged: (n: number, returned: number) => (returned > 0 ? `đã dùng ${n}, hoàn lại ${returned}` : `đã dùng ${n}`),
  },
  en: {
    eyebrow: "AI ASSISTANT · TEACHERS",
    title: "AI credits",
    description: "Credits are the budget for AI requests. Each request holds an estimate first, is charged for what it used, and the rest is returned. A failed or cancelled request is refunded in full.",
    available: "Available",
    reserved: "Held for unfinished requests",
    unit: "credits",
    starterTitle: (n: number) => `Starter gift: ${n} free credits`,
    starterBody: (n: number) => `You received ${n} credits to try the AI Assistant. These credits do not expire.`,
    starterDismiss: "Dismiss notice",
    historyTitle: "AI credit history",
    empty: "No credit transactions yet.",
    disabled: "AI credits are not turned on for this system.",
    when: "When",
    what: "What",
    amount: "Credits",
    loadMore: "Show more",
    loading: "Loading…",
    back: "Back to classes",
    origins: {
      STARTER: "Starter gift (free)",
      PAYMENT: "Credit top-up",
    } as Record<string, string>,
    kinds: {
      GRANT: "Credits granted",
      ADJUST: "Adjusted by an administrator",
      RESERVE: "Held for an AI request",
      SETTLE: "AI request finished",
      REFUND: "Refunded: the AI request did not finish",
    } as Record<string, string>,
    charged: (n: number, returned: number) => (returned > 0 ? `used ${n}, ${returned} returned` : `used ${n}`),
  },
});

/** Teacher credit balance and history (TAI5-T5). Credits only; teacher route, loaded on demand. */
export default function TeacherCredits() {
  const t = text();
  const [bannerDismissed, setBannerDismissed] = useState(readBannerDismissed);
  const query = useInfiniteQuery({
    queryKey: ["my-credits", "history"],
    queryFn: ({ pageParam }) => fetchMyCredits(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const first = query.data?.pages[0];
  const rows: CreditTransaction[] = query.data?.pages.flatMap((p) => p.transactions) ?? [];

  function dismissStarterBanner() {
    setBannerDismissed(true);
    try {
      localStorage.setItem(STARTER_BANNER_DISMISSED_KEY, "1");
    } catch {
      // Page must keep working when storage is unavailable or blocked.
    }
  }

  return (
    <section className="credits-page" aria-labelledby="credits-title">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ErrorBox error={query.error} />
      {query.isLoading && <PageLoader message={t.loading} />}
      {first && !first.enabled && <Empty>{t.disabled}</Empty>}
      {first?.enabled && (
        <>
          {first.starterGrant && !bannerDismissed && (
            <div className="credits-starter-banner" data-testid="credits-starter-banner">
              <div className="credits-starter-icon" aria-hidden="true">
                <Gift size={18} />
              </div>
              <div className="credits-starter-body">
                <p className="credits-starter-title">{t.starterTitle(first.starterGrant.credits)}</p>
                <p className="credits-starter-text">{t.starterBody(first.starterGrant.credits)}</p>
              </div>
              <button
                type="button"
                className="credits-starter-close"
                aria-label={t.starterDismiss}
                title={t.starterDismiss}
                onClick={dismissStarterBanner}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="credits-balance" aria-label={t.title}>
            <div className="credits-balance-card" data-testid="credits-available">
              <Coins size={18} aria-hidden="true" />
              <div>
                <small>{t.available}</small>
                <b>{first.available} <span>{t.unit}</span></b>
              </div>
            </div>
            <div className="credits-balance-card" data-testid="credits-reserved">
              <div>
                <small>{t.reserved}</small>
                <b>{first.reserved} <span>{t.unit}</span></b>
              </div>
            </div>
          </div>
          <h2 id="credits-title" className="credits-history-title">{t.historyTitle}</h2>
          {rows.length === 0 ? (
            <Empty>{t.empty}</Empty>
          ) : (
            <table className="credit-history" aria-label={t.historyTitle}>
              <thead>
                <tr>
                  <th>{t.when}</th>
                  <th>{t.what}</th>
                  <th className="num">{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const shown = historyAmount(row);
                  const label = (row.origin && t.origins[row.origin]) || t.kinds[row.kind] || row.kind;
                  return (
                    <tr key={row.id} data-kind={row.kind}>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        {label}
                        {row.kind === "SETTLE" && <small className="muted"> · {t.charged(row.charged ?? 0, row.credits)}</small>}
                      </td>
                      <td className="num">
                        <Badge tone={row.kind === "REFUND" || row.kind === "GRANT" ? "passed" : "outline"}>{shown.text}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {query.hasNextPage && (
            <button type="button" className="secondary" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              {query.isFetchingNextPage ? t.loading : t.loadMore}
            </button>
          )}
        </>
      )}
      <p><Link className="tiny" to="/classes">{t.back}</Link></p>
    </section>
  );
}
