import { Sparkles } from "lucide-react";
import { defineText } from "../../i18n";

/** Owner 2026-11-08 (AD-18): show that a text was written by AI; rule texts carry no chip. */
const AI_PROVIDERS = new Set(["gemini", "anthropic", "fake", "cache", "ai"]);
const text = defineText({
  vi: { label: "AI", title: "Câu chữ do AI viết dựa trên gợi ý đã được duyệt; không cho đáp án và không đổi điểm." },
  en: { label: "AI", title: "Worded by AI from an approved hint; it never gives the answer or changes a score." },
});

export const isAiProvider = (provider: unknown) => typeof provider === "string" && AI_PROVIDERS.has(provider);

export function AiChip({ provider }: { provider: unknown }) {
  const t = text();
  if (!isAiProvider(provider)) return null;
  return <span className="badge ai-chip" title={t.title} data-testid="ai-chip"><Sparkles size={12} aria-hidden /> {t.label}</span>;
}
