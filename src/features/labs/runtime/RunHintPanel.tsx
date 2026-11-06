import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, MessageCircleQuestion, X } from "lucide-react";
import "./RunHintPanel.css";
import { api, ApiError } from "../../../lib/api";
import { Badge, ErrorBox, useAction } from "../../../components/ui";
import { defineText } from "../../../i18n";
import type { HintStep } from "./checkpoint-views";

/** SAI-01A moments A and B: rules-only hints while a checkpoint LabRun is in progress. */
type RunHint = {
  id: string;
  level: 0 | 1 | 2;
  content: string;
  label: string;
  moment: "BEFORE_PREDICTION" | "AFTER_OBSERVATION";
  repeatReason: "TOP_LEVEL" | null;
};

const text = defineText({
  vi: {
    title: "Cần gợi ý?",
    toggle: "Gợi ý",
    close: "Đóng gợi ý",
    intro: "Gợi ý giúp em tự suy nghĩ, không cho đáp án và không ảnh hưởng tới điểm.",
    ask: (label: string) => `Gợi ý cho câu “${label}”`,
    askExplanation: "Gợi ý cho câu giải thích",
    askNext: "Gợi ý thêm",
    reflect: "Vì sao kết quả khác dự đoán của em?",
    level: (n: number) => n === 0 ? "Suy ngẫm sau quan sát" : `Mức ${n}/2 · ${n === 1 ? "Câu hỏi gợi mở" : "Gợi ý khái niệm"}`,
    topLevel: "Trong lúc làm, gợi ý dừng ở mức này. Muốn gợi ý sâu hơn, em hãy ghi câu trả lời, làm hết bài rồi nộp.",
    matched: "Dự đoán của em ở bước vừa rồi đã khớp với kết quả, không cần suy ngẫm thêm.",
  },
  en: {
    title: "Need a hint?",
    toggle: "Hint",
    close: "Close hint",
    intro: "Hints help you think for yourself. They never give the answer and do not affect your score.",
    ask: (label: string) => `Hint for “${label}”`,
    askExplanation: "Hint for the explanation",
    askNext: "Another hint",
    reflect: "Why did the result differ from my prediction?",
    level: (n: number) => n === 0 ? "Reflection after observing" : `Level ${n}/2 · ${n === 1 ? "Guiding question" : "Concept hint"}`,
    topLevel: "While working, hints stop at this level. For deeper help, record your answer, finish and submit.",
    matched: "Your prediction for the last step matched the result, so there is nothing to reflect on.",
  },
});

export function RunHintPanel({ runId, step, labelOf }: { runId: string; step: HintStep; labelOf: (criterion: string) => string }) {
  const t = text();
  const [hint, setHint] = useState<RunHint | null>(null);
  const [matched, setMatched] = useState(false);
  const [askedCriterion, setAskedCriterion] = useState<string | null>(null);
  const request = useAction(async (body: Record<string, unknown>) => {
    setMatched(false);
    if (body.moment === "BEFORE_PREDICTION") setAskedCriterion(String(body.criterion));
    try {
      const result = await api<RunHint>("/lab-runs/" + encodeURIComponent(runId) + "/hints", "POST", body);
      setHint(result);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.code === "HINT_NOT_NEEDED") { setMatched(true); return null; }
      throw error;
    }
  });
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  // "Vì sao…" is offered only when the observed step contradicts the prediction (server evaluator, no write).
  const reflect = step.reflect;
  const check = useQuery({
    queryKey: ["run-hint-check", runId, reflect?.criterion, JSON.stringify(reflect?.prediction ?? null)],
    queryFn: () => api<{ mismatch: boolean }>("/lab-runs/" + encodeURIComponent(runId) + "/hints/check", "POST",
      { criterion: reflect!.criterion, state: reflect!.state, prediction: reflect!.prediction }),
    enabled: Boolean(reflect),
    staleTime: Infinity,
    retry: false,
  });
  const offerReflection = Boolean(reflect && check.data?.mismatch);
  if (!step.ask && !offerReflection) return null;
  const askedThis = Boolean(step.ask && askedCriterion === step.ask.criterion);
  return (
    <>
      <button type="button" className="secondary run-hint-toggle" aria-expanded={open} aria-controls={popoverId}
        data-testid="run-hint-toggle" data-has-reflection={offerReflection} onClick={() => setOpen((value) => !value)}>
        <Lightbulb size={15} aria-hidden /> {t.toggle}
      </button>
      {open && (
        <section id={popoverId} className="run-hint-popover" aria-live="polite" data-testid="run-hint-panel">
          <header>
            <h3><Lightbulb size={17} aria-hidden /> {t.title}</h3>
            <button type="button" className="run-hint-close" aria-label={t.close} onClick={() => setOpen(false)}><X size={16} aria-hidden /></button>
          </header>
          {hint ? (
            <div className="hint">
              <Badge>{t.level(hint.level)}</Badge>
              <p>{hint.content}</p>
              {hint.repeatReason === "TOP_LEVEL" && <p className="tiny muted">{t.topLevel}</p>}
            </div>
          ) : matched ? <p className="tiny muted">{t.matched}</p> : <p className="tiny muted">{t.intro}</p>}
          <div className="run-hint-actions">
            {step.ask && (
              <button type="button" className="secondary" disabled={request.isPending}
                onClick={() => request.mutate({ criterion: step.ask!.criterion, moment: "BEFORE_PREDICTION" })}>
                <Lightbulb size={15} aria-hidden /> {askedThis ? t.askNext : step.ask.criterion === "explanation" ? t.askExplanation : t.ask(labelOf(step.ask.criterion))}
              </button>
            )}
            {offerReflection && reflect && (
              <button type="button" className="secondary" disabled={request.isPending}
                onClick={() => request.mutate({ criterion: reflect.criterion, moment: "AFTER_OBSERVATION", state: reflect.state, prediction: reflect.prediction })}>
                <MessageCircleQuestion size={15} aria-hidden /> {t.reflect}
              </button>
            )}
          </div>
          <ErrorBox error={request.error} />
        </section>
      )}
    </>
  );
}
