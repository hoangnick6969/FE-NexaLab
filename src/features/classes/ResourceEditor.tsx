import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../components/ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    card: (n: number) => `Thẻ ${n}`,
    front: (n: number) => `Mặt trước thẻ ${n}`,
    back: (n: number) => `Mặt sau thẻ ${n}`,
    removeCard: (n: number) => `Xóa thẻ ${n}`,
    addCard: "Thêm thẻ",
    question: (n: number) => `Câu hỏi ${n}`,
    prompt: (n: number) => `Nội dung câu hỏi ${n}`,
    option: (q: number, o: number) => `Câu ${q} · Phương án ${o}`,
    addOption: "Thêm phương án",
    removeLastOption: "Bớt phương án cuối",
    correct: (n: number) => `Đáp án đúng câu ${n}`,
    optionN: (n: number) => `Phương án ${n}`,
    removeQuestion: (n: number) => `Xóa câu hỏi ${n}`,
    addQuestion: "Thêm câu hỏi",
  },
  en: {
    card: (n: number) => `Card ${n}`,
    front: (n: number) => `Front of card ${n}`,
    back: (n: number) => `Back of card ${n}`,
    removeCard: (n: number) => `Remove card ${n}`,
    addCard: "Add a card",
    question: (n: number) => `Question ${n}`,
    prompt: (n: number) => `Question ${n} text`,
    option: (q: number, o: number) => `Question ${q} · Option ${o}`,
    addOption: "Add an option",
    removeLastOption: "Remove the last option",
    correct: (n: number) => `Correct answer for question ${n}`,
    optionN: (n: number) => `Option ${n}`,
    removeQuestion: (n: number) => `Remove question ${n}`,
    addQuestion: "Add a question",
  },
});

export type ResourceContent = { cards?: Array<{ id?: string; front: string; back: string }>; questions?: Array<{ id?: string; prompt: string; explanation?: string | null; options: Array<string | { id?: string; text: string }>; correctOption?: number }> };

export function resourceInput(kind: "DECK" | "STUDY_QUIZ" | "TEST", value: ResourceContent) {
  return kind === "DECK" ? { cards: value.cards?.map(({ front, back }) => ({ front, back })) } : {
    questions: value.questions?.map((question) => ({ prompt: question.prompt, options: question.options.map((option) => typeof option === "string" ? option : option.text),
      ...(question.explanation ? { explanation: question.explanation } : {}), ...(kind === "TEST" ? { correctOption: question.correctOption ?? 0 } : {}) })),
  };
}

export function ResourceEditor({ kind, value, onChange }: { kind: "DECK" | "STUDY_QUIZ" | "TEST"; value: ResourceContent; onChange: (value: ResourceContent) => void }) {
  const t = text();
  if (kind === "DECK") {
    const cards = value.cards ?? [];
    return (
      <div className="resource-practice-items">
        {cards.map((card, index) => (
          <fieldset key={index} className="resource-subcard">
            <div className="resource-subcard-header">
              <legend className="resource-subcard-title">{t.card(index + 1)}</legend>
              <button
                type="button"
                className="resource-delete-btn"
                disabled={cards.length <= 1}
                title={t.removeCard(index + 1)}
                onClick={() => onChange({ cards: cards.filter((_, i) => i !== index) })}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>{t.removeCard(index + 1)}</span>
              </button>
            </div>
            <div className="resource-card-fields">
              <Field label={t.front(index + 1)} required maxLength={500} value={card.front} onChange={(e) => onChange({ cards: cards.map((item, i) => i === index ? { ...item, front: e.target.value } : item) })} />
              <Field label={t.back(index + 1)} required maxLength={500} value={card.back} onChange={(e) => onChange({ cards: cards.map((item, i) => i === index ? { ...item, back: e.target.value } : item) })} />
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="resource-add-item-btn"
          disabled={cards.length >= 200}
          onClick={() => onChange({ cards: [...cards, { front: "", back: "" }] })}
        >
          <Plus size={15} aria-hidden="true" />
          <span>{t.addCard}</span>
        </button>
      </div>
    );
  }
  const questions = value.questions ?? [];
  const update = (index: number, change: Partial<NonNullable<ResourceContent["questions"]>[number]>) => onChange({ questions: questions.map((question, i) => i === index ? { ...question, ...change } : question) });
  return (
    <div className="resource-practice-items">
      {questions.map((question, index) => (
        <fieldset key={index} className="resource-subcard">
          <div className="resource-subcard-header">
            <legend className="resource-subcard-title">{t.question(index + 1)}</legend>
            <button
              type="button"
              className="resource-delete-btn"
              disabled={questions.length <= 1}
              title={t.removeQuestion(index + 1)}
              onClick={() => onChange({ questions: questions.filter((_, i) => i !== index) })}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>{t.removeQuestion(index + 1)}</span>
            </button>
          </div>
          <Field label={t.prompt(index + 1)} required maxLength={500} value={question.prompt} onChange={(e) => update(index, { prompt: e.target.value })} />
          <div className="resource-options-grid">
            {question.options.map((option, optionIndex) => (
              <Field key={optionIndex} label={t.option(index + 1, optionIndex + 1)} required maxLength={500} value={typeof option === "string" ? option : option.text} onChange={(e) => update(index, { options: question.options.map((item, i) => i === optionIndex ? typeof item === "string" ? e.target.value : { ...item, text: e.target.value } : item) })} />
            ))}
          </div>
          <div className="button-row resource-subcard-actions">
            <button type="button" className="secondary" disabled={question.options.length >= 6} onClick={() => update(index, { options: [...question.options, ""] })}>{t.addOption}</button>
            <button type="button" className="secondary" disabled={question.options.length <= 2} onClick={() => update(index, { options: question.options.slice(0, -1), ...(kind === "TEST" ? { correctOption: Math.min(question.correctOption ?? 0, question.options.length - 2) } : {}) })}>{t.removeLastOption}</button>
          </div>
          {kind === "TEST" && (
            <label className="field">
              <span>{t.correct(index + 1)}</span>
              <select value={question.correctOption ?? 0} onChange={(e) => update(index, { correctOption: Number(e.target.value) })}>
                {question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>{t.optionN(optionIndex + 1)}</option>)}
              </select>
            </label>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="resource-add-item-btn"
        disabled={questions.length >= 100}
        onClick={() => onChange({ questions: [...questions, { prompt: "", options: ["", ""], ...(kind === "TEST" ? { correctOption: 0 } : {}) }] })}
      >
        <Plus size={15} aria-hidden="true" />
        <span>{t.addQuestion}</span>
      </button>
    </div>
  );
}
