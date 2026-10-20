import { Field } from "../../components/ui";

export type ResourceContent = { cards?: Array<{ id?: string; front: string; back: string }>; questions?: Array<{ id?: string; prompt: string; explanation?: string | null; options: Array<string | { id?: string; text: string }>; correctOption?: number }> };

export function resourceInput(kind: "DECK" | "STUDY_QUIZ" | "TEST", value: ResourceContent) {
  return kind === "DECK" ? { cards: value.cards?.map(({ front, back }) => ({ front, back })) } : {
    questions: value.questions?.map((question) => ({ prompt: question.prompt, options: question.options.map((option) => typeof option === "string" ? option : option.text),
      ...(question.explanation ? { explanation: question.explanation } : {}), ...(kind === "TEST" ? { correctOption: question.correctOption ?? 0 } : {}) })),
  };
}

export function ResourceEditor({ kind, value, onChange }: { kind: "DECK" | "STUDY_QUIZ" | "TEST"; value: ResourceContent; onChange: (value: ResourceContent) => void }) {
  if (kind === "DECK") {
    const cards = value.cards ?? [];
    return <div className="resource-practice-items">
      {cards.map((card, index) => <fieldset key={index}><legend>Thẻ {index + 1}</legend>
        <Field label={`Mặt trước thẻ ${index + 1}`} required maxLength={500} value={card.front} onChange={(e) => onChange({ cards: cards.map((item, i) => i === index ? { ...item, front: e.target.value } : item) })} />
        <Field label={`Mặt sau thẻ ${index + 1}`} required maxLength={500} value={card.back} onChange={(e) => onChange({ cards: cards.map((item, i) => i === index ? { ...item, back: e.target.value } : item) })} />
        <button type="button" className="danger-text" disabled={cards.length <= 1} onClick={() => onChange({ cards: cards.filter((_, i) => i !== index) })}>Xóa thẻ {index + 1}</button>
      </fieldset>)}
      <button type="button" className="secondary" disabled={cards.length >= 200} onClick={() => onChange({ cards: [...cards, { front: "", back: "" }] })}>Thêm thẻ</button>
    </div>;
  }
  const questions = value.questions ?? [];
  const update = (index: number, change: Partial<NonNullable<ResourceContent["questions"]>[number]>) => onChange({ questions: questions.map((question, i) => i === index ? { ...question, ...change } : question) });
  return <div className="resource-practice-items">
    {questions.map((question, index) => <fieldset key={index}><legend>Câu hỏi {index + 1}</legend>
      <Field label={`Nội dung câu hỏi ${index + 1}`} required maxLength={500} value={question.prompt} onChange={(e) => update(index, { prompt: e.target.value })} />
      {question.options.map((option, optionIndex) => <Field key={optionIndex} label={`Câu ${index + 1} · Phương án ${optionIndex + 1}`} required maxLength={500} value={typeof option === "string" ? option : option.text} onChange={(e) => update(index, { options: question.options.map((item, i) => i === optionIndex ? typeof item === "string" ? e.target.value : { ...item, text: e.target.value } : item) })} />)}
      <div className="button-row">
        <button type="button" className="secondary" disabled={question.options.length >= 6} onClick={() => update(index, { options: [...question.options, ""] })}>Thêm phương án</button>
        <button type="button" className="secondary" disabled={question.options.length <= 2} onClick={() => update(index, { options: question.options.slice(0, -1), ...(kind === "TEST" ? { correctOption: Math.min(question.correctOption ?? 0, question.options.length - 2) } : {}) })}>Bớt phương án cuối</button>
      </div>
      {kind === "TEST" && <label className="field"><span>Đáp án đúng câu {index + 1}</span><select value={question.correctOption ?? 0} onChange={(e) => update(index, { correctOption: Number(e.target.value) })}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Phương án {optionIndex + 1}</option>)}</select></label>}
      <button type="button" className="danger-text" disabled={questions.length <= 1} onClick={() => onChange({ questions: questions.filter((_, i) => i !== index) })}>Xóa câu hỏi {index + 1}</button>
    </fieldset>)}
    <button type="button" className="secondary" disabled={questions.length >= 100} onClick={() => onChange({ questions: [...questions, { prompt: "", options: ["", ""], ...(kind === "TEST" ? { correctOption: 0 } : {}) }] })}>Thêm câu hỏi</button>
  </div>;
}
