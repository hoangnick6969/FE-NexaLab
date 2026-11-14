import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../components/ui";
import { defineText } from "../../i18n";
import { RichResourceEditor, type ResourceKind } from "./RichResourceEditor";

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
    writtenPrompt: (n: number) => `Câu tự luận ${n}`,
    writtenText: (n: number) => `Đề bài câu ${n}`,
    maxChars: "Số ký tự tối đa của bài làm (100–5000)",
    referenceAnswer: "Đáp án tham khảo (chỉ giáo viên thấy)",
    commonPhrases: "Cụm từ chung được phép trùng (mỗi dòng một cụm, chỉ giáo viên thấy)",
    criterion: (p: number, c: number) => `Câu ${p} · Tiêu chí ${c}`,
    criterionCode: "Mã tiêu chí (VD: GIAI_THICH)",
    criterionDescription: "Mô tả tiêu chí",
    maxPoints: "Điểm tối đa (1–10, bước 0,5)",
    anchor: (n: number) => `Mốc ${n}`,
    anchorPoints: "Điểm",
    anchorDescription: "Mô tả mốc",
    addAnchor: "Thêm mốc",
    removeLastAnchor: "Bớt mốc cuối",
    anchorsHint: "Mốc đầu là 0 điểm, mốc cuối bằng điểm tối đa, điểm tăng dần theo bước 0,5.",
    addCriterion: "Thêm tiêu chí",
    removeCriterion: (n: number) => `Xóa tiêu chí ${n}`,
    addPrompt: "Thêm câu tự luận",
    removePrompt: (n: number) => `Xóa câu tự luận ${n}`,
    totalPoints: (n: number) => `Tổng điểm tối đa: ${n}`,
    thumbnailUrl: "URL ảnh bìa bài kiểm tra (HTTPS, tùy chọn)",
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
    writtenPrompt: (n: number) => `Written question ${n}`,
    writtenText: (n: number) => `Question ${n} text`,
    maxChars: "Maximum answer length (100–5000 characters)",
    referenceAnswer: "Reference answer (teachers only)",
    commonPhrases: "Allowed common phrases (one per line, teachers only)",
    criterion: (p: number, c: number) => `Question ${p} · Criterion ${c}`,
    criterionCode: "Criterion code (e.g. EXPLANATION)",
    criterionDescription: "Criterion description",
    maxPoints: "Maximum points (1–10, step 0.5)",
    anchor: (n: number) => `Level ${n}`,
    anchorPoints: "Points",
    anchorDescription: "Level description",
    addAnchor: "Add a level",
    removeLastAnchor: "Remove the last level",
    anchorsHint: "The first level is 0 points, the last equals the maximum, points rise in steps of 0.5.",
    addCriterion: "Add a criterion",
    removeCriterion: (n: number) => `Remove criterion ${n}`,
    addPrompt: "Add a written question",
    removePrompt: (n: number) => `Remove written question ${n}`,
    totalPoints: (n: number) => `Total maximum points: ${n}`,
    thumbnailUrl: "Test cover image URL (HTTPS, optional)",
  },
});

export type WrittenCriterion = { code: string; description: string; maxPoints: number; anchors: Array<{ points: number; description: string }> };
export type WrittenPrompt = { id?: string; prompt: string; maxChars: number; referenceAnswer?: string; commonPhrases?: string[]; criteria: WrittenCriterion[] };
export type ResourceContent = { prompts?: WrittenPrompt[]; customParams?: Record<string, number>; source?: any; learningObjective?: string; instructions?: string; reportPrompts?: string[]; description?: string; url?: string; thumbnailUrl?: string; cards?: Array<{ id?: string; front: string; back: string }>; questions?: Array<{ id?: string; prompt: string; explanation?: string | null; options: Array<string | { id?: string; text: string }>; correctOption?: number }> };

export const emptyCriterion = (): WrittenCriterion => ({ code: "", description: "", maxPoints: 2, anchors: [{ points: 0, description: "" }, { points: 2, description: "" }] });
export const emptyWrittenPrompt = (): WrittenPrompt => ({ prompt: "", maxChars: 1000, referenceAnswer: "", commonPhrases: [], criteria: [emptyCriterion()] });

/** Request body content; server-generated ids are never sent back (strict server schemas). */
export function resourceInput(kind: ResourceKind, value: ResourceContent) {
  if (kind === "WRITTEN_TASK")
    return {
      prompts: (value.prompts ?? []).map((p) => ({
        prompt: p.prompt,
        maxChars: Number(p.maxChars),
        ...(p.referenceAnswer?.trim() ? { referenceAnswer: p.referenceAnswer } : {}),
        ...(p.commonPhrases?.filter((phrase) => phrase.trim()).length ? { commonPhrases: p.commonPhrases.filter((phrase) => phrase.trim()) } : {}),
        criteria: p.criteria.map((c) => ({ code: c.code.trim().toUpperCase(), description: c.description, maxPoints: Number(c.maxPoints), anchors: c.anchors.map((a) => ({ points: Number(a.points), description: a.description })) })),
      })),
    };
  if (kind === "LAB") return { source: value.source, learningObjective: value.learningObjective, instructions: value.instructions, reportPrompts: value.reportPrompts?.filter((prompt) => prompt.trim()) ?? [], ...(value.thumbnailUrl?.trim() ? { thumbnailUrl: value.thumbnailUrl.trim() } : {}), ...(value.customParams ? { customParams: value.customParams } : {}) };
  if (kind === "DOCUMENT" || kind === "REPORT_TEMPLATE") return { description: value.description ?? "", source: value.source };
  if (kind === "LINK") return { url: value.url, description: value.description ?? "" };
  return kind === "DECK" ? { cards: value.cards?.map(({ front, back }) => ({ front, back })) } : {
    ...(kind === "TEST" && value.thumbnailUrl?.trim() ? { thumbnailUrl: value.thumbnailUrl.trim() } : {}),
    questions: value.questions?.map((question) => ({ prompt: question.prompt, options: question.options.map((option) => typeof option === "string" ? option : option.text),
      ...(question.explanation ? { explanation: question.explanation } : {}), ...(kind === "TEST" ? { correctOption: question.correctOption ?? 0 } : {}) })),
  };
}

export function ResourceEditor({ kind, value, onChange, classId }: { kind: ResourceKind; value: ResourceContent; onChange: (value: ResourceContent) => void; classId?: string }) {
  const t = text();
  if (["LAB", "DOCUMENT", "REPORT_TEMPLATE", "LINK"].includes(kind)) return <RichResourceEditor kind={kind} value={value} onChange={onChange} classId={classId} />;
  if (kind === "WRITTEN_TASK") return <WrittenTaskEditor value={value} onChange={onChange} />;
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
  const update = (index: number, change: Partial<NonNullable<ResourceContent["questions"]>[number]>) => onChange({ ...value, questions: questions.map((question, i) => i === index ? { ...question, ...change } : question) });
  return (
    <div className="resource-practice-items">
      {kind === "TEST" && <Field label={t.thumbnailUrl} type="url" maxLength={2048} value={value.thumbnailUrl ?? ""} onChange={(event) => onChange({ ...value, thumbnailUrl: event.target.value })} />}
      {questions.map((question, index) => (
        <fieldset key={index} className="resource-subcard">
          <div className="resource-subcard-header">
            <legend className="resource-subcard-title">{t.question(index + 1)}</legend>
            <button
              type="button"
              className="resource-delete-btn"
              disabled={questions.length <= 1}
              title={t.removeQuestion(index + 1)}
              onClick={() => onChange({ ...value, questions: questions.filter((_, i) => i !== index) })}
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
        onClick={() => onChange({ ...value, questions: [...questions, { prompt: "", options: ["", ""], ...(kind === "TEST" ? { correctOption: 0 } : {}) }] })}
      >
        <Plus size={15} aria-hidden="true" />
        <span>{t.addQuestion}</span>
      </button>
    </div>
  );
}

/** TAI2-T1 rubric editor: prompts, criteria and anchors with a live maximum-points total. The server validates (RUBRIC_INVALID). */
function WrittenTaskEditor({ value, onChange }: { value: ResourceContent; onChange: (value: ResourceContent) => void }) {
  const t = text();
  const prompts = value.prompts ?? [];
  const setPrompt = (index: number, change: Partial<WrittenPrompt>) => onChange({ prompts: prompts.map((p, i) => (i === index ? { ...p, ...change } : p)) });
  const setCriterion = (pi: number, ci: number, change: Partial<WrittenCriterion>) =>
    setPrompt(pi, { criteria: prompts[pi].criteria.map((c, i) => (i === ci ? { ...c, ...change } : c)) });
  const total = prompts.reduce((sum, p) => sum + p.criteria.reduce((s, c) => s + (Number(c.maxPoints) || 0), 0), 0);
  return (
    <div className="resource-practice-items written-task-editor">
      {prompts.map((p, pi) => (
        <fieldset key={pi}>
          <legend>{t.writtenPrompt(pi + 1)}</legend>
          <label className="field"><span>{t.writtenText(pi + 1)}</span><textarea required rows={3} maxLength={2000} value={p.prompt} onChange={(e) => setPrompt(pi, { prompt: e.target.value })} /></label>
          <Field label={t.maxChars} type="number" required min={100} max={5000} step={1} value={p.maxChars} onChange={(e) => setPrompt(pi, { maxChars: Number(e.target.value) })} />
          <label className="field"><span>{t.referenceAnswer}</span><textarea rows={2} maxLength={2000} value={p.referenceAnswer ?? ""} onChange={(e) => setPrompt(pi, { referenceAnswer: e.target.value })} /></label>
          <label className="field"><span>{t.commonPhrases}</span><textarea rows={2} value={(p.commonPhrases ?? []).join("\n")} onChange={(e) => setPrompt(pi, { commonPhrases: e.target.value.split("\n") })} /></label>
          {p.criteria.map((c, ci) => (
            <fieldset key={ci} className="written-criterion">
              <legend>{t.criterion(pi + 1, ci + 1)}</legend>
              <Field label={t.criterionCode} required maxLength={32} value={c.code} onChange={(e) => setCriterion(pi, ci, { code: e.target.value.toUpperCase() })} />
              <Field label={t.criterionDescription} required maxLength={500} value={c.description} onChange={(e) => setCriterion(pi, ci, { description: e.target.value })} />
              <Field label={t.maxPoints} type="number" required min={1} max={10} step={0.5} value={c.maxPoints} onChange={(e) => setCriterion(pi, ci, { maxPoints: Number(e.target.value) })} />
              {c.anchors.map((a, ai) => (
                <div className="written-anchor" key={ai}>
                  <Field label={`${t.anchor(ai + 1)} · ${t.anchorPoints}`} type="number" required min={0} max={10} step={0.5} value={a.points}
                    onChange={(e) => setCriterion(pi, ci, { anchors: c.anchors.map((x, i) => (i === ai ? { ...x, points: Number(e.target.value) } : x)) })} />
                  <Field label={`${t.anchor(ai + 1)} · ${t.anchorDescription}`} required maxLength={300} value={a.description}
                    onChange={(e) => setCriterion(pi, ci, { anchors: c.anchors.map((x, i) => (i === ai ? { ...x, description: e.target.value } : x)) })} />
                </div>
              ))}
              <p className="tiny muted">{t.anchorsHint}</p>
              <div className="button-row">
                <button type="button" className="secondary" disabled={c.anchors.length >= 5} onClick={() => setCriterion(pi, ci, { anchors: [...c.anchors, { points: c.maxPoints, description: "" }] })}>{t.addAnchor}</button>
                <button type="button" className="secondary" disabled={c.anchors.length <= 2} onClick={() => setCriterion(pi, ci, { anchors: c.anchors.slice(0, -1) })}>{t.removeLastAnchor}</button>
                <button type="button" className="danger-text" disabled={p.criteria.length <= 1} onClick={() => setPrompt(pi, { criteria: p.criteria.filter((_, i) => i !== ci) })}>{t.removeCriterion(ci + 1)}</button>
              </div>
            </fieldset>
          ))}
          <div className="button-row">
            <button type="button" className="secondary" disabled={p.criteria.length >= 6} onClick={() => setPrompt(pi, { criteria: [...p.criteria, emptyCriterion()] })}>{t.addCriterion}</button>
            <button type="button" className="danger-text" disabled={prompts.length <= 1} onClick={() => onChange({ prompts: prompts.filter((_, i) => i !== pi) })}>{t.removePrompt(pi + 1)}</button>
          </div>
        </fieldset>
      ))}
      <p className="tiny" role="status"><b>{t.totalPoints(total)}</b></p>
      <button type="button" className="secondary" disabled={prompts.length >= 5} onClick={() => onChange({ prompts: [...prompts, emptyWrittenPrompt()] })}>{t.addPrompt}</button>
    </div>
  );
}
