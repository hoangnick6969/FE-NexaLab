import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { defineText } from "../../i18n";

// Perf review 2026-11-16 item 2: tiptap/prosemirror (~400 kB) lives in its own chunk, loaded only when a teacher opens the lesson editor.
const text = defineText({
  vi: {
    h2: "Tiêu đề cấp 2",
    h3: "Tiêu đề cấp 3",
    list: "Danh sách",
    insertSymbol: (s: string) => `Chèn ký hiệu ${s}`,
    insert: (s: string) => `Chèn ${s}`,
  },
  en: {
    h2: "Heading level 2",
    h3: "Heading level 3",
    list: "List",
    insertSymbol: (s: string) => `Insert symbol ${s}`,
    insert: (s: string) => `Insert ${s}`,
  },
});
const t = text();

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
        <button type="button" aria-label={t.h2} aria-pressed={Boolean(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" aria-label={t.h3} aria-pressed={Boolean(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
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
          {t.list}
        </button>
        <span className="editor-toolbar-divider" aria-hidden="true" />
        {["₂", "₃", "⁺", "⁻", "→", "Δ", "°", "±", "×", "μ"].map((symbol) => (
          <button type="button" key={symbol} aria-label={t.insertSymbol(symbol)} title={t.insert(symbol)} onClick={() => editor?.chain().focus().insertContent(symbol).run()}>{symbol}</button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
