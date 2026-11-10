import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorBox } from "../../components/ui";
import { isApiError } from "../../lib/api";
import { defineText } from "../../i18n";
import { ESTIMATE_DEBOUNCE_MS, estimateCredits, type CreditEstimate, type CreditEstimateBody } from "./credits-api";
import { isShort } from "./credits-view";
import "./credits.css";

const text = defineText({
  vi: {
    calculating: "Đang tính tín dụng…",
    forRequest: (credits: number, available: number) => `≈ ${credits} tín dụng — còn ${available}`,
    forSubmissions: (credits: number, count: number, available: number) => `≈ ${credits} tín dụng cho ${count} bài — còn ${available}`,
    ceiling: "Đây là mức tối đa. Bài không đủ điều kiện sẽ không bị tính, và phần chưa dùng được hoàn lại khi hoàn tất.",
    refundNote: "Phần chưa dùng được hoàn lại; yêu cầu thất bại hoặc bị hủy được hoàn lại toàn bộ.",
    short: (credits: number, available: number) => `Không đủ tín dụng: cần ${credits}, còn ${available}. Nhờ quản trị viên cấp thêm.`,
    changed: (credits: number) => `Mức tín dụng ước tính đã đổi thành ${credits}. Thầy cô kiểm tra rồi bấm lại để xác nhận.`,
    insufficient: (required: number, available: number) => `Không đủ tín dụng: cần ${required}, còn ${available}.`,
    history: "Xem lịch sử tín dụng",
  },
  en: {
    calculating: "Working out the credits…",
    forRequest: (credits: number, available: number) => `≈ ${credits} credits — ${available} left`,
    forSubmissions: (credits: number, count: number, available: number) => `≈ ${credits} credits for ${count} submissions — ${available} left`,
    ceiling: "This is the most it can cost. Submissions that are skipped are not charged, and the unused part is returned when it finishes.",
    refundNote: "The unused part is returned; a failed or cancelled request is refunded in full.",
    short: (credits: number, available: number) => `Not enough credits: ${credits} needed, ${available} left. Ask an administrator for more.`,
    changed: (credits: number) => `The estimated credits changed to ${credits}. Check it and press the button again to confirm.`,
    insufficient: (required: number, available: number) => `Not enough credits: ${required} needed, ${available} left.`,
    history: "View credit history",
  },
});

/**
 * Estimate-before-run (TAI5-T5). Calls the estimate route on change (debounced) and shows "≈ N credits — M left". The
 * parent submits `confirmedCredits = N`; an AI_ESTIMATE_CHANGED answer shows the new value and asks again (it never
 * resubmits by itself), and a 402 shows the balance. `onChange` reports the estimate for the CURRENT inputs, or
 * undefined while it is still being worked out, so a stale number is never confirmed. Loaded on demand (teacher only).
 */
export default function AiCreditEstimate({
  classId,
  body,
  error,
  onChange,
}: {
  classId: string;
  body: CreditEstimateBody | null;
  error?: unknown;
  onChange: (estimate: CreditEstimate | undefined) => void;
}) {
  const bodyKey = useMemo(() => (body ? JSON.stringify(body) : ""), [body]);
  const [settled, setSettled] = useState(bodyKey);
  useEffect(() => {
    if (!bodyKey) return;
    const timer = setTimeout(() => setSettled(bodyKey), ESTIMATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bodyKey]);

  const query = useQuery({
    queryKey: ["credit-estimate", classId, settled],
    queryFn: () => estimateCredits(classId, JSON.parse(settled)),
    enabled: !!settled && !!bodyKey,
    staleTime: 0,
    gcTime: 0,
  });
  const current = !!bodyKey && settled === bodyKey && !query.isFetching && !query.error ? query.data : undefined;
  useEffect(() => onChange(current), [current?.credits, current?.available, current?.enabled, bodyKey, query.isFetching]);

  // The server priced the request differently from what was shown: take its new value and let the teacher re-confirm.
  const changed = isApiError(error, "AI_ESTIMATE_CHANGED") ? (error.details as { credits?: number } | undefined)?.credits : undefined;
  const refusal = isApiError(error, "AI_CREDITS_INSUFFICIENT") ? (error.details as { available?: number; required?: number } | undefined) : undefined;
  useEffect(() => {
    if (changed !== undefined) void query.refetch();
  }, [changed]);

  if (current && !current.enabled) return null;
  const t = text();
  return (
    <div className="credit-estimate" data-testid="credit-estimate">
      <p className={`credit-estimate-line${current && isShort(current) ? " is-short" : ""}`} role="status">
        <Coins size={15} aria-hidden="true" />{" "}
        {current && body
          ? body.purpose === "ASSESS_SUBMISSION"
            ? t.forSubmissions(current.credits, body.submissionCount, current.available)
            : t.forRequest(current.credits, current.available)
          : t.calculating}
      </p>
      {current && <p className="tiny muted">{body?.purpose === "ASSESS_SUBMISSION" ? t.ceiling : t.refundNote}</p>}
      {current && isShort(current) && <p className="tiny warning-text" role="alert">{t.short(current.credits, current.available)}</p>}
      {changed !== undefined && <p className="notice warning-text" role="alert">{t.changed(changed)}</p>}
      {refusal && <p className="notice warning-text" role="alert">{t.insufficient(refusal.required ?? 0, refusal.available ?? 0)}</p>}
      <ErrorBox error={query.error} />
      <Link className="tiny" to="/credits">{t.history}</Link>
    </div>
  );
}
