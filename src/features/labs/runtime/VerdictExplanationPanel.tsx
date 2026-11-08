import { AiChip } from "../../student-ai/AiChip";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, HelpCircle } from "lucide-react";
import { api } from "../../../lib/api";
import { ErrorBox, InlineLoader } from "../../../components/ui";
import { defineText } from "../../../i18n";
import "./VerdictExplanationPanel.css";

/** B2: why the attempt passed or not, from the evaluator result only (BE verdict-explanations@1). */
type VerdictExplanation = {
  verdict: "passed" | "not_passed";
  summary: string;
  items: Array<{ criterion: string; label: string; met: boolean; why: string | null }>;
};

const text = defineText({
  vi: {
    askPassed: "Vì sao em đạt?",
    askNotPassed: "Vì sao em chưa đạt?",
    hide: "Ẩn giải thích",
    loading: "Đang đọc kết quả chấm…",
    met: "Đúng yêu cầu",
    unmet: "Chưa đúng yêu cầu",
    unmetNote: "Bước này chỉ ghi tên để em tự tìm lại. Dùng “Gợi ý từng bước” nếu cần.",
    note: "Giải thích dựa trên chính các tiêu chí đã chấm; không thay đổi kết quả.",
  },
  en: {
    askPassed: "Why did I pass?",
    askNotPassed: "Why didn't I pass?",
    hide: "Hide the explanation",
    loading: "Reading the scoring result…",
    met: "Meets the requirement",
    unmet: "Not there yet",
    unmetNote: "Only the step name is shown so you can work it out. Use the step-by-step hint if you need it.",
    note: "Based on the criteria that were scored; it never changes the result.",
  },
});

export function VerdictExplanationPanel({ attemptId, passed }: { attemptId: string; passed: boolean }) {
  const t = text();
  const [open, setOpen] = useState(false);
  const q = useQuery<VerdictExplanation>({
    queryKey: ["attempt-explanation", attemptId],
    queryFn: () => api("/attempts/" + encodeURIComponent(attemptId) + "/explanation"),
    enabled: open,
    staleTime: Infinity,
  });
  return (
    <section className="panel verdict-explanation" aria-live="polite" data-testid="verdict-explanation">
      <button type="button" className="secondary wide" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <HelpCircle size={16} aria-hidden /> {open ? t.hide : passed ? t.askPassed : t.askNotPassed}
      </button>
      {open && (
        <>
          {q.isLoading && <InlineLoader message={t.loading} />}
          <ErrorBox error={q.error} />
          {q.data && (
            <>
              <AiChip provider={(q.data as any).provider} />
              <p>{q.data.summary}</p>
              <ol className="verdict-explanation-steps">
                {q.data.items.map((item) => (
                  <li key={item.criterion} data-met={item.met}>
                    {item.met ? <CheckCircle2 size={16} aria-hidden /> : <CircleDashed size={16} aria-hidden />}
                    <div>
                      <b>{item.label}</b> <span className="tiny muted">· {item.met ? t.met : t.unmet}</span>
                      {item.why ? <p>{item.why}</p> : !item.met && <p className="tiny muted">{t.unmetNote}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <small>{t.note}</small>
            </>
          )}
        </>
      )}
    </section>
  );
}
