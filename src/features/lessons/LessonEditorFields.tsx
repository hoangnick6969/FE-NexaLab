import { Field } from "../../components/ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    original: "Tự biên soạn",
    schoolOwned: "Tài liệu thuộc nhà trường",
    selfReview: "Phiếu tự kiểm duyệt (bắt buộc để xuất bản)",
    sources: "Nguồn căn cứ cho các nội dung khoa học",
    licence: "Giấy phép sử dụng",
    outcome: "Yêu cầu cần đạt liên quan",
    answersChecked: "Tôi đã kiểm tra đáp án của mọi câu hỏi",
    safe: "Nội dung không hướng dẫn thao tác nguy hiểm",
    accessible: "Học liệu có văn bản thay thế hoặc bản chép lời",
  },
  en: {
    original: "Written myself",
    schoolOwned: "School-owned material",
    selfReview: "Self-review checklist (required to publish)",
    sources: "Sources for the scientific content",
    licence: "Licence",
    outcome: "Related learning outcome",
    answersChecked: "I have checked the answer to every question",
    safe: "The content gives no dangerous instructions",
    accessible: "Materials have alt text or a transcript",
  },
});
const t = text();

export const licenseOptions: Array<[string, string]> = [
  ["ORIGINAL", t.original],
  ["CC0", "CC0"],
  ["CC_BY", "CC BY"],
  ["CC_BY_SA", "CC BY-SA"],
  ["SCHOOL_OWNED", t.schoolOwned],
];

/** D1 self-review checklist required to publish teacher-private content. */
export function ReviewChecklist({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const review = value ?? {
    sources: "",
    license: "ORIGINAL",
    outcome: "",
    answerKeyChecked: false,
    safetyChecked: false,
    accessibilityChecked: false,
  };
  const set = (patch: any) => onChange({ ...review, ...patch });
  return (
    <fieldset className="review-checklist">
      <legend>{t.selfReview}</legend>
      <label className="field">
        <span>{t.sources}</span>
        <textarea rows={2} value={review.sources} onChange={(e) => set({ sources: e.target.value })} />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>{t.licence}</span>
          <select value={review.license} onChange={(e) => set({ license: e.target.value })}>
            {licenseOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field label={t.outcome} value={review.outcome} onChange={(e) => set({ outcome: e.target.value })} />
      </div>
      <label className="check">
        <input type="checkbox" checked={review.answerKeyChecked} onChange={(e) => set({ answerKeyChecked: e.target.checked })} />
        {t.answersChecked}
      </label>
      <label className="check">
        <input type="checkbox" checked={review.safetyChecked} onChange={(e) => set({ safetyChecked: e.target.checked })} />
        {t.safe}
      </label>
      <label className="check">
        <input type="checkbox" checked={review.accessibilityChecked} onChange={(e) => set({ accessibilityChecked: e.target.checked })} />
        {t.accessible}
      </label>
    </fieldset>
  );
}
