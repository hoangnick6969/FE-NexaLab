import { Coins } from "lucide-react";
import { defineText } from "../../i18n";
import type { JobCredits } from "./credits-api";
import { jobCreditSummary } from "./credits-view";
import "./credits.css";

const text = defineText({
  vi: {
    reserved: (n: number) => `Đã giữ ${n} tín dụng cho yêu cầu này. Phần chưa dùng sẽ được hoàn lại khi hoàn tất.`,
    settled: (charged: number, returned: number) => (returned > 0 ? `Đã dùng ${charged} tín dụng, hoàn lại ${returned}.` : `Đã dùng ${charged} tín dụng.`),
    refunded: (n: number) => `Yêu cầu không hoàn thành nên đã hoàn lại đủ ${n} tín dụng.`,
  },
  en: {
    reserved: (n: number) => `${n} credits are held for this request. The unused part is returned when it finishes.`,
    settled: (charged: number, returned: number) => (returned > 0 ? `${charged} credits used, ${returned} returned.` : `${charged} credits used.`),
    refunded: (n: number) => `The request did not finish, so all ${n} credits were returned.`,
  },
});

/** One neutral line about the credits of one AI job (credits only). Loaded on demand by the teacher AI workspace. */
export default function AiJobCredits({ credits }: { credits: JobCredits | null | undefined }) {
  const summary = jobCreditSummary(credits);
  if (!summary) return null;
  const t = text();
  return (
    <p className="tiny credit-job-line" role="status" data-testid="job-credits">
      <Coins size={14} aria-hidden="true" />{" "}
      {summary.kind === "reserved" ? t.reserved(summary.amount) : summary.kind === "refunded" ? t.refunded(summary.amount) : t.settled(summary.charged, summary.returned)}
    </p>
  );
}
