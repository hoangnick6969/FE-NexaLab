import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { defineText } from "../../i18n";
import { AiQuotaRow } from "./AiQuota";

const text = defineText({
  vi: {
    title: "Mức sử dụng Teacher AI",
    description: "Mỗi tính năng có hạn mức riêng. Từng lượt được mở lại sau 24 giờ kể từ lúc gửi yêu cầu.",
    drafts: "Tạo bản nháp học liệu",
    lab: "Gợi ý thử thách thí nghiệm",
    assessment: "Hỗ trợ chấm bài tự luận",
    credits: (available: number) => `Còn ${available} tín dụng AI khả dụng`,
    history: "Xem số dư và lịch sử tín dụng",
  },
  en: {
    title: "Teacher AI usage",
    description: "Each feature has its own limit. Each request frees up 24 hours after it was submitted.",
    drafts: "Learning resource drafts",
    lab: "Lab challenge suggestions",
    assessment: "Written assessment suggestions",
    credits: (available: number) => `${available} AI credits available`,
    history: "View credit balance and history",
  },
});

export default function TeacherAiUsageSettings() {
  const t = text();
  const { hash } = useLocation();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hash === "#teacher-ai-usage") section.current?.scrollIntoView({ block: "start" });
  }, [hash]);
  const { data: credits } = useQuery({
    queryKey: ["my-credits", "summary"],
    queryFn: async () => (await import("../credits/credits-api")).fetchMyCredits(),
  });
  return (
    <section ref={section} id="teacher-ai-usage" className="panel settings-card" aria-labelledby="teacher-ai-usage-title">
      <div className="settings-card-header">
        <h2 id="teacher-ai-usage-title">{t.title}</h2>
        <p className="settings-subtitle">{t.description}</p>
      </div>
      <div className="teacher-ai-usage-rows">
        <AiQuotaRow purpose="GENERATE_RESOURCE" title={t.drafts} />
        <AiQuotaRow purpose="DRAFT_LAB_CHALLENGE" title={t.lab} />
        <AiQuotaRow purpose="ASSESS_SUBMISSION" title={t.assessment} />
        {credits?.enabled && <strong>{t.credits(credits.available)}</strong>}
        {credits?.enabled !== false && <Link className="tiny" to="/credits">{t.history}</Link>}
      </div>
    </section>
  );
}
