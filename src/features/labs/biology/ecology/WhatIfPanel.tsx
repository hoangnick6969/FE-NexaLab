import { HelpCircle } from "lucide-react";
import { defineText } from "../../../../i18n";
import type { WhatIf, WhatIfAnswer } from "./what-if";
import "./WhatIfPanel.css";

const text = defineText({
  vi: { title: "Nếu… thì sao?", intro: "Chọn một câu hỏi: câu trả lời lấy từ chính mô hình của bài thí nghiệm." },
  en: { title: "What if…?", intro: "Pick a question: the answer comes from this Lab's own model." },
});

/** B3: preset what-if questions about the Lab scene; answers are built from the model (what-if@1), never invented. */
export function WhatIfPanel<A>({ items, selectedId, answer, onSelect }: {
  items: ReadonlyArray<WhatIf<A>>;
  selectedId: string | null;
  answer: WhatIfAnswer | null;
  onSelect: (item: WhatIf<A>) => void;
}) {
  const t = text();
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
        {answer && <>
          {answer.lines.map((line) => <p key={line}>{line}</p>)}
          {answer.note && <small>{answer.note}</small>}
        </>}
      </div>
    </section>
  );
}
