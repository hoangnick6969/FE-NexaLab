import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { api } from "../../../lib/api";
import { Badge, ErrorBox, useAction } from "../../../components/ui";
import { defineText } from "../../../i18n";
import { VerdictExplanationPanel } from "./VerdictExplanationPanel";
import "./CheckpointHintPanel.css";

/** SAI-01A rules-only hint for a not-passed checkpoint Lab attempt (BE spec-student-ai-checkpoint-hints). */
type CheckpointHint = {
  id: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  label: string;
  escalated: boolean;
  repeatReason: "SAME_ANSWER" | "TOP_LEVEL" | null;
};

const text = defineText({
  vi: {
    title: "Gợi ý từng bước",
    collapse: "Thu gọn gợi ý",
    expand: "Gợi ý",
    expandPassed: "Giải thích",
    intro: "Chưa đạt? Nhận một gợi ý cho bước đầu tiên em còn sai. Gợi ý không cho đáp án.",
    getHint: "Nhận gợi ý",
    level: (n: number) => `Mức ${n}/4 · ${["Câu hỏi gợi mở", "Gợi ý khái niệm", "Gợi ý thao tác", "Giải thích"][n - 1]}`,
    about: (label: string) => `Về bước: ${label}`,
    sameAnswer: "Em giữ nguyên câu trả lời ở bước này nên gợi ý vẫn ở mức cũ. Hãy thử thay đổi rồi nộp lại để mở mức tiếp theo.",
    topLevel: "Đây đã là mức gợi ý cao nhất cho bước này.",
    rule: "Mức gợi ý chỉ tăng khi em đổi câu trả lời rồi nộp lại.",
  },
  en: {
    title: "Step-by-step hint",
    collapse: "Collapse the hint",
    expand: "Hint",
    expandPassed: "Explanation",
    intro: "Not there yet? Get a hint for the first step you still have wrong. Hints never give the answer.",
    getHint: "Get a hint",
    level: (n: number) => `Level ${n}/4 · ${["Guiding question", "Concept hint", "Action hint", "Explanation"][n - 1]}`,
    about: (label: string) => `About: ${label}`,
    sameAnswer: "You kept the same answer for this step, so the hint stays at this level. Change it and submit again to unlock the next level.",
    topLevel: "This is already the highest hint level for this step.",
    rule: "The hint level rises only after you change your answer and submit again.",
  },
});

export function CheckpointHintPanel({ attemptId }: { attemptId: string }) {
  const t = text();
  const [hint, setHint] = useState<CheckpointHint | null>(null);
  const ask = useAction(async () => {
    const result = await api<CheckpointHint>("/attempts/" + encodeURIComponent(attemptId) + "/hint", "POST");
    setHint(result);
    return result;
  });
  return (
    <section className="panel tutor-panel" aria-live="polite">
      <h3><Lightbulb size={19} aria-hidden /> {t.title}</h3>
      {hint ? (
        <div className="hint">
          <Badge>{t.level(hint.level)}</Badge>
          <p className="tiny muted">{t.about(hint.label)}</p>
          <p>{hint.content}</p>
          {hint.repeatReason === "SAME_ANSWER" && <p className="tiny muted">{t.sameAnswer}</p>}
          {hint.repeatReason === "TOP_LEVEL" && <p className="tiny muted">{t.topLevel}</p>}
        </div>
      ) : (
        <p>{t.intro}</p>
      )}
      <button type="button" className="secondary wide" disabled={ask.isPending || Boolean(hint)} onClick={() => ask.mutate(null)}>
        {t.getHint}
      </button>
      <ErrorBox error={ask.error} />
      <small>{t.rule}</small>
    </section>
  );
}

/**
 * Event-scored Labs draw their own full-screen layout: the B2 explanation (any verdict) and, when not passed,
 * the hint float beside it and can be collapsed to a pill.
 */
export function FloatingCheckpointHint({ attemptId, passed = false }: { attemptId: string; passed?: boolean }) {
  const t = text();
  const [open, setOpen] = useState(true);
  return (
    <div className="event-lab-hint" data-open={open}>
      {/* Kept mounted while collapsed so the hint already received is still there when reopened. */}
      <div hidden={!open}>
        <button type="button" className="event-lab-hint-close" aria-label={t.collapse} onClick={() => setOpen(false)}><X size={16} aria-hidden /></button>
        <VerdictExplanationPanel attemptId={attemptId} passed={passed} />
        {!passed && <CheckpointHintPanel attemptId={attemptId} />}
      </div>
      {!open && <button type="button" className="secondary event-lab-hint-pill" onClick={() => setOpen(true)}><Lightbulb size={15} aria-hidden /> {passed ? t.expandPassed : t.expand}</button>}
    </div>
  );
}
