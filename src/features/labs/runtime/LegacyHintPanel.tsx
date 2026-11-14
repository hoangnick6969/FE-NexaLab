import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, ApiError } from "../../../lib/api";
import { Badge, ErrorBox, useAction } from "../../../components/ui";
import { defineText } from "../../../i18n";
import { AiChip, isAiProvider } from "../../student-ai/AiChip";

/**
 * SAI-01 hint for legacy Labs (circuit, chemistry, eye): tutor-rules@1, 4 levels that rise only after a changed
 * run (BR-06). Shows why a level stayed, a wait time after HINT_RATE_LIMITED, and an "AI" chip only when an
 * observation from a provider (or its cache) was added.
 */
export type LegacyHint = {
  id: string;
  attemptId: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  escalated: boolean | null;
  provider: "rules" | "rules-fallback" | "gemini" | "anthropic" | "fake" | "cache";
  createdAt: string;
};

const text = defineText({
  vi: {
    guide: "Người bạn hướng dẫn",
    aiGuide: "AI + hướng dẫn từ engine",
    ruleGuide: "Gợi ý theo luật",
    level: (n: number) => `MỨC ${n} / 4`,
    ai: "AI",
    aiNote: "Câu hỏi đầu do AI gợi ý; phần còn lại theo luật của bài.",
    stuck: "Chưa tìm ra câu trả lời? Bắt đầu từ một câu hỏi nhỏ.",
    getHint: "Nhận gợi ý",
    sameLevel: "Em chạy lại với cùng trạng thái nên gợi ý vẫn ở mức này — thử thay đổi rồi chạy lại.",
    notNeeded: "Em đã đạt thử thách này nên không cần gợi ý.",
    wait: (s: number) => `Em có thể xin gợi ý tiếp sau ${s} giây.`,
    rule: "Chỉ mở mức gợi ý tiếp theo sau khi em thực sự thử lại.",
  },
  en: {
    guide: "Your guide",
    aiGuide: "AI + engine guidance",
    ruleGuide: "Rule-based hints",
    level: (n: number) => `LEVEL ${n} / 4`,
    ai: "AI",
    aiNote: "The first question was suggested by AI; the rest follows the lab's rules.",
    stuck: "Not there yet? Start with a small question.",
    getHint: "Get a hint",
    sameLevel: "You ran the same setup again, so the hint stays at this level — change something and run again.",
    notNeeded: "You have completed this challenge, so no hint is needed.",
    wait: (s: number) => `You can ask for another hint in ${s} seconds.`,
    rule: "The next hint level opens only after you really try again.",
  },
});

export function LegacyHintPanel({ attempt, llmEnabled, previousLevel, onHint }: {
  attempt: { id: string; verdict?: string } | null;
  llmEnabled: boolean;
  /** Level of the hint the student got on the previous attempt in this session, to explain a level that stayed. */
  previousLevel: number | null;
  onHint: (hint: LegacyHint) => void;
}) {
  const t = text();
  const [hint, setHint] = useState<LegacyHint | null>(null);
  const [stayed, setStayed] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const ask = useAction(async () => {
    try {
      const before = previousLevel;
      const result = await api<LegacyHint>("/attempts/" + encodeURIComponent(attempt!.id) + "/hint", "POST");
      setHint(result);
      setStayed(result.escalated === false && before === result.level);
      onHint(result);
      return result;
    } catch (error) {
      const seconds = error instanceof ApiError && error.code === "HINT_RATE_LIMITED" ? Number((error.details as any)?.retryAfterSeconds) : NaN;
      if (Number.isFinite(seconds) && seconds > 0) setWaitUntil(Date.now() + seconds * 1000);
      throw error;
    }
  });
  useEffect(() => {
    if (!waitUntil) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= waitUntil) setWaitUntil(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const waiting = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;
  const passed = attempt?.verdict === "passed";
  return (
    <section className="panel tutor-panel" aria-live="polite" data-testid="legacy-hint-panel">
      <h3><Sparkles size={19} aria-hidden /> {t.guide}</h3>
      <span className="tiny muted">{llmEnabled ? t.aiGuide : t.ruleGuide}</span>
      {hint ? (
        <div className="hint">
          <Badge>{t.level(hint.level)}</Badge>
          {isAiProvider(hint.provider) && <> <AiChip provider={hint.provider} /><p className="tiny muted">{t.aiNote}</p></>}
          <p style={{ whiteSpace: "pre-line" }}>{hint.content}</p>
          {stayed && <p className="tiny muted" data-testid="hint-same-level">{t.sameLevel}</p>}
        </div>
      ) : passed ? (
        <p>{t.notNeeded}</p>
      ) : (
        <p>{t.stuck}</p>
      )}
      {!passed && (
        <button className="secondary wide" type="button" disabled={!attempt || ask.isPending || Boolean(hint) || waiting > 0} onClick={() => ask.mutate(null)}>
          {t.getHint}
        </button>
      )}
      {waiting > 0 ? <p className="tiny muted" role="status">{t.wait(waiting)}</p> : <ErrorBox error={ask.error} />}
      <small>{t.rule}</small>
    </section>
  );
}
