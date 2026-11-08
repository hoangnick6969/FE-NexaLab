import { HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { defineText } from "../../../../i18n";
import { api } from "../../../../lib/api";
import { AiChip, isAiProvider } from "../../../student-ai/AiChip";
import { useStudentAiStatus } from "../../../student-ai/useStudentAi";
import type { WhatIf, WhatIfAnswer } from "./what-if";
import "./WhatIfPanel.css";

const text = defineText({
  vi: { title: "Nếu… thì sao?", intro: "Chọn một câu hỏi: câu trả lời lấy từ chính mô hình của bài thí nghiệm.", model: "Xem kết quả gốc từ mô hình" },
  en: { title: "What if…?", intro: "Pick a question: the answer comes from this Lab's own model.", model: "See the model's own result" },
});

/** B3: preset what-if questions about the Lab scene; answers are built from the model (what-if@1), never invented. */
export function WhatIfPanel<A>({ items, selectedId, answer, onSelect }: {
  items: ReadonlyArray<WhatIf<A>>;
  selectedId: string | null;
  answer: WhatIfAnswer | null;
  onSelect: (item: WhatIf<A>) => void;
}) {
  const t = text();
  const status = useStudentAiStatus();
  const question = items.find((item) => item.id === selectedId)?.question ?? "";
  const modelText = answer ? answer.lines.join(" ") : "";
  // Owner 2026-11-08: the LLM rewords the model's answer when enabled; the model text stays the source and fallback.
  const phrased = useQuery({
    queryKey: ["what-if-phrase", question, modelText],
    queryFn: () => api<{ text: string; provider: string }>("/tutor/what-if/phrase", "POST", { kind: t.title, question, answer: modelText.slice(0, 800) }),
    enabled: status.llmEnabled && Boolean(answer && question),
    staleTime: Infinity,
    retry: false,
  });
  const ai = phrased.data && isAiProvider(phrased.data.provider) ? phrased.data : null;
  return (
    <section className="what-if" aria-labelledby="what-if-title" data-testid="what-if">
      <h5 id="what-if-title"><HelpCircle size={15} aria-hidden /> {t.title}</h5>
      <p className="what-if-intro">{t.intro}</p>
      <ul className="what-if-questions">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="what-if-question" aria-pressed={selectedId === item.id} onClick={() => onSelect(item)}>{item.question}</button>
          </li>
        ))}
      </ul>
      <div className="what-if-answer" aria-live="polite" data-testid="what-if-answer">
        {answer && (ai ? <>
          <AiChip provider={ai.provider} />
          <p>{ai.text}</p>
          <details><summary className="tiny">{t.model}</summary>{answer.lines.map((line) => <p key={line}>{line}</p>)}</details>
          {answer.note && <small>{answer.note}</small>}
        </> : <>
          {answer.lines.map((line) => <p key={line}>{line}</p>)}
          {answer.note && <small>{answer.note}</small>}
        </>)}
      </div>
    </section>
  );
}
