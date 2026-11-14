import { AiChip } from "../../student-ai/AiChip";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, X } from "lucide-react";
import "./RunHintPanel.css";
import { api } from "../../../lib/api";
import { Badge, ErrorBox, useAction } from "../../../components/ui";
import { defineText } from "../../../i18n";

/**
 * SAI-01A moment A for station and event Labs: the learner picks the step they are stuck on and gets levels 1–2
 * (question, concept). Their state and draft answers are never sent, so the wording cannot reveal whether they are right.
 */
type Step = { criterion: string; label: string };
type RunHint = { id: string; level: 1 | 2; content: string; label: string; repeatReason: "TOP_LEVEL" | null };

const text = defineText({
  vi: {
    title: "Cần gợi ý?",
    toggle: "Gợi ý",
    close: "Đóng gợi ý",
    intro: "Chọn bước em đang vướng. Gợi ý giúp em tự suy nghĩ, không cho đáp án và không ảnh hưởng tới điểm.",
    pick: "Em đang vướng ở bước nào?",
    ask: "Gợi ý cho bước này",
    askNext: "Gợi ý thêm",
    level: (n: number) => `Mức ${n}/2 · ${n === 1 ? "Câu hỏi gợi mở" : "Gợi ý khái niệm"}`,
    about: (label: string) => `Về bước: ${label}`,
    topLevel: "Trong lúc làm, gợi ý dừng ở mức này. Muốn gợi ý sâu hơn, em hãy làm hết bài rồi nộp.",
    loading: "Đang tải các bước…",
  },
  en: {
    title: "Need a hint?",
    toggle: "Hint",
    close: "Close hint",
    intro: "Pick the step you are stuck on. Hints help you think; they never give the answer and do not affect your score.",
    pick: "Which step are you stuck on?",
    ask: "Hint for this step",
    askNext: "Another hint",
    level: (n: number) => `Level ${n}/2 · ${n === 1 ? "Guiding question" : "Concept hint"}`,
    about: (label: string) => `About: ${label}`,
    topLevel: "While working, hints stop at this level. For deeper help, finish and submit.",
    loading: "Loading the steps…",
  },
});

export function StepPickerHint({ runId, placement = "dock" }: { runId: string; placement?: "dock" | "floating" }) {
  const t = text();
  const [open, setOpen] = useState(false);
  const [criterion, setCriterion] = useState("");
  const [hint, setHint] = useState<(RunHint & { criterion: string }) | null>(null);
  const popoverId = useId();
  const selectId = useId();
  const steps = useQuery<{ steps: Step[] }>({
    queryKey: ["run-hint-steps", runId],
    queryFn: () => api("/lab-runs/" + encodeURIComponent(runId) + "/hints/steps"),
    enabled: open,
    staleTime: Infinity,
  });
  const chosen = criterion || steps.data?.steps[0]?.criterion || "";
  const ask = useAction(async () => {
    const result = await api<RunHint>("/lab-runs/" + encodeURIComponent(runId) + "/hints", "POST", { criterion: chosen, moment: "BEFORE_PREDICTION" });
    setHint({ ...result, criterion: chosen });
    return result;
  });
  const shown = hint && hint.criterion === chosen ? hint : null;
  const body = (
    <>
      <button type="button" className="secondary run-hint-toggle" aria-expanded={open} aria-controls={popoverId}
        data-testid="step-hint-toggle" onClick={() => setOpen((value) => !value)}>
        <Lightbulb size={15} aria-hidden /> {t.toggle}
      </button>
      {open && (
        <section id={popoverId} className="run-hint-popover" aria-live="polite" data-testid="step-hint-panel">
          <header>
            <h3><Lightbulb size={17} aria-hidden /> {t.title}</h3>
            <button type="button" className="run-hint-close" aria-label={t.close} onClick={() => setOpen(false)}><X size={16} aria-hidden /></button>
          </header>
          {steps.isLoading && <p className="tiny muted">{t.loading}</p>}
          <ErrorBox error={steps.error} />
          {steps.data && <>
            <label className="field" htmlFor={selectId}>
              <span>{t.pick}</span>
              <select id={selectId} value={chosen} onChange={(event) => setCriterion(event.target.value)}>
                {steps.data.steps.map((step) => <option key={step.criterion} value={step.criterion}>{step.label}</option>)}
              </select>
            </label>
            {shown ? (
              <div className="hint">
                <Badge>{t.level(shown.level)}</Badge>
                <p className="tiny muted">{t.about(shown.label)}</p>
                <AiChip provider={(shown as any).provider} />
                <p>{shown.content}</p>
                {shown.repeatReason === "TOP_LEVEL" && <p className="tiny muted">{t.topLevel}</p>}
              </div>
            ) : <p className="tiny muted">{t.intro}</p>}
            <div className="run-hint-actions">
              <button type="button" className="secondary" disabled={ask.isPending || !chosen} onClick={() => ask.mutate(null)}>
                <Lightbulb size={15} aria-hidden /> {shown ? t.askNext : t.ask}
              </button>
            </div>
          </>}
          <ErrorBox error={ask.error} />
        </section>
      )}
    </>
  );
  return placement === "floating" ? <div className="event-lab-run-hint">{body}</div> : body;
}
