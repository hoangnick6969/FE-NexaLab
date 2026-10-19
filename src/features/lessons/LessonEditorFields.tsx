import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Field } from "../../components/ui";

export const licenseOptions: Array<[string, string]> = [
  ["ORIGINAL", "Tự biên soạn"],
  ["CC0", "CC0"],
  ["CC_BY", "CC BY"],
  ["CC_BY_SA", "CC BY-SA"],
  ["SCHOOL_OWNED", "Tài liệu thuộc nhà trường"],
];

export function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return (
    <div className="rich-editor">
      <div className="editor-toolbar">
        <button type="button" aria-label="Tiêu đề cấp 2" aria-pressed={Boolean(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" aria-label="Tiêu đề cấp 3" aria-pressed={Boolean(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Danh sách
        </button>
        <span className="editor-toolbar-divider" aria-hidden="true" />
        {["₂", "₃", "⁺", "⁻", "→", "Δ", "°", "±", "×", "μ"].map((symbol) => (
          <button type="button" key={symbol} aria-label={`Chèn ký hiệu ${symbol}`} title={`Chèn ${symbol}`} onClick={() => editor?.chain().focus().insertContent(symbol).run()}>{symbol}</button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

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
      <legend>Phiếu tự kiểm duyệt (bắt buộc để xuất bản)</legend>
      <label className="field">
        <span>Nguồn căn cứ cho các nội dung khoa học</span>
        <textarea rows={2} value={review.sources} onChange={(e) => set({ sources: e.target.value })} />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Giấy phép sử dụng</span>
          <select value={review.license} onChange={(e) => set({ license: e.target.value })}>
            {licenseOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Yêu cầu cần đạt liên quan" value={review.outcome} onChange={(e) => set({ outcome: e.target.value })} />
      </div>
      <label className="check">
        <input type="checkbox" checked={review.answerKeyChecked} onChange={(e) => set({ answerKeyChecked: e.target.checked })} />
        Tôi đã kiểm tra đáp án của mọi câu hỏi
      </label>
      <label className="check">
        <input type="checkbox" checked={review.safetyChecked} onChange={(e) => set({ safetyChecked: e.target.checked })} />
        Nội dung không hướng dẫn thao tác nguy hiểm
      </label>
      <label className="check">
        <input type="checkbox" checked={review.accessibilityChecked} onChange={(e) => set({ accessibilityChecked: e.target.checked })} />
        Học liệu có văn bản thay thế hoặc bản chép lời
      </label>
    </fieldset>
  );
}
