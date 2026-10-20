import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ErrorBox, Field, useAction } from "../../components/ui";
import { QueryState, ReasonDialog, Status } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    title: "Phân loại chương trình",
    idRule: "Mã định danh không thể ghi đè: tạo trùng mã sẽ bị từ chối. Yêu cầu cần đạt đang được dùng chỉ có thể lưu trữ, không sửa nội dung.",
    subjects: "Môn học",
    subjectCounts: (lessons: number, labs: number) => `(${lessons} bài, ${labs} phòng)`,
    updateBook: (name: string) => `Cập nhật sách tham khảo môn ${name}`,
    saveLink: "Lưu liên kết",
    addSubject: "Thêm môn học",
    subjectCode: "Mã môn",
    subjectName: "Tên môn",
    ebookUrl: "URL ebook HTTPS (tùy chọn)",
    add: "Thêm",
    chapters: "Chương",
    grade: (g: number) => `Khối ${g}`,
    archive: "Lưu trữ",
    restore: "Khôi phục",
    addChapter: "Thêm chương",
    chapterCode: "Mã chương",
    subject: "Môn",
    gradeLabel: "Khối",
    strand: "Mạch nội dung",
    chapterName: "Tên chương",
    topics: "Chủ đề",
    chapterRef: (code: string) => `chương ${code}`,
    outcomeRef: (codes: string) => `YCCĐ: ${codes}`,
    addTopic: "Thêm chủ đề",
    topicCode: "Mã chủ đề",
    topicName: "Tên chủ đề",
    outcomeCodes: "Mã YCCĐ (phân cách bằng dấu phẩy)",
    outcomes: "Yêu cầu cần đạt",
    lessons: (n: number) => `${n} bài`,
    sampleSuffix: ", dữ liệu mẫu",
    addOutcome: "Thêm yêu cầu cần đạt",
    outcomeCode: "Mã YCCĐ",
    statement: "Nội dung yêu cầu",
    archiveItem: "Lưu trữ mục phân loại",
    restoreItem: "Khôi phục mục phân loại",
    archiveEffect: "Mục đã lưu trữ vẫn giữ trên các bài học, chủ đề đang tham chiếu nhưng không thể gắn mới.",
    restoreEffect: "Mục được dùng lại cho các bài học và chủ đề mới.",
  },
  en: {
    title: "Curriculum taxonomy",
    idRule: "Identifiers cannot be overwritten: a duplicate code is refused. A learning outcome in use can only be archived, not edited.",
    subjects: "Subjects",
    subjectCounts: (lessons: number, labs: number) => `(${lessons} lessons, ${labs} labs)`,
    updateBook: (name: string) => `Update the reference book for ${name}`,
    saveLink: "Save link",
    addSubject: "Add subject",
    subjectCode: "Subject code",
    subjectName: "Subject name",
    ebookUrl: "HTTPS ebook URL (optional)",
    add: "Add",
    chapters: "Chapters",
    grade: (g: number) => `Grade ${g}`,
    archive: "Archive",
    restore: "Restore",
    addChapter: "Add chapter",
    chapterCode: "Chapter code",
    subject: "Subject",
    gradeLabel: "Grade",
    strand: "Content strand",
    chapterName: "Chapter name",
    topics: "Topics",
    chapterRef: (code: string) => `chapter ${code}`,
    outcomeRef: (codes: string) => `Outcomes: ${codes}`,
    addTopic: "Add topic",
    topicCode: "Topic code",
    topicName: "Topic name",
    outcomeCodes: "Outcome codes (comma separated)",
    outcomes: "Learning outcomes",
    lessons: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    sampleSuffix: ", sample data",
    addOutcome: "Add learning outcome",
    outcomeCode: "Outcome code",
    statement: "Outcome statement",
    archiveItem: "Archive taxonomy item",
    restoreItem: "Restore taxonomy item",
    archiveEffect: "An archived item stays on lessons and topics that use it, but cannot be attached to new ones.",
    restoreEffect: "The item can be used again for new lessons and topics.",
  },
});
const tx = text();

// ───────────────────────── taxonomy ─────────────────────────
export function Taxonomy() {
  const q = useQuery({ queryKey: ["admin", "taxonomy"], queryFn: () => api("/admin/taxonomy") });
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const [dialog, setDialog] = useState<any>(null);
  const d = q.data;
  const submit = (path: string, method = "POST") => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body: any = { ...f };
    if ("ebookUrl" in f) body.ebookUrl = f.ebookUrl.trim() || null;
    if (f.grade) body.grade = Number(f.grade);
    if ("outcomeCodes" in f)
      body.outcomeCodes = f.outcomeCodes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    act.mutate({ path, method, body }, { onSuccess: () => form.reset() });
  };
  const domains = Object.entries(d?.domains ?? {}) as Array<[string, string]>;
  return (
    <section className="panel">
      <h2>{tx.title}</h2>
      <p className="tiny muted">
        {tx.idRule}
      </p>
      <ErrorBox error={!dialog ? act.error : null} />
      <QueryState query={q}>
        {d && (
          <div className="admin-grid">
            <div>
              <h3>{tx.subjects}</h3>
              <ul className="admin-list">
                {d.subjects.map((s: any) => (
                  <li key={s.id}>
                    <b>{s.id}</b> {s.name}{" "}
                    <span className="tiny muted">
                      {tx.subjectCounts(s.lessons, s.labs)}
                    </span>
                    <form className="admin-inline" onSubmit={submit(`/admin/subjects/${encodeURIComponent(s.id)}`, "PUT")} aria-label={tx.updateBook(s.name)}>
                      <Field label="URL ebook HTTPS" name="ebookUrl" type="url" placeholder="https://…" defaultValue={s.ebookUrl ?? ""} />
                      <input type="hidden" name="name" value={s.name} />
                      <button className="text-button">{tx.saveLink}</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/subjects")} aria-label={tx.addSubject}>
                <Field label={tx.subjectCode} name="id" required />
                <Field label={tx.subjectName} name="name" required />
                <Field label={tx.ebookUrl} name="ebookUrl" type="url" placeholder="https://…" />
                <button className="secondary">{tx.add}</button>
              </form>
            </div>
            <div>
              <h3>{tx.chapters}</h3>
              <ul className="admin-list">
                {d.chapters.map((c: any) => (
                  <li key={c.code}>
                    <b>{c.code}</b> {c.title} · {tx.grade(c.grade)} · {d.domains[c.domain] ?? c.domain} <Status value={c.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "chapter", item: c })}>
                      {c.status === "active" ? tx.archive : tx.restore}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/chapters")} aria-label={tx.addChapter}>
                <Field label={tx.chapterCode} name="code" required />
                <label className="field">
                  <span>{tx.subject}</span>
                  <select name="subjectId" required>
                    {d.subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{tx.gradeLabel}</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>{tx.strand}</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label={tx.chapterName} name="title" required />
                <button className="secondary">{tx.add}</button>
              </form>
            </div>
            <div>
              <h3>{tx.topics}</h3>
              <ul className="admin-list">
                {d.topics.map((t: any) => (
                  <li key={t.code}>
                    <b>{t.code}</b> {t.title} · {tx.chapterRef(t.chapterCode)} · {tx.outcomeRef((t.outcomeCodes as string[]).join(", ") || "—")}{" "}
                    <Status value={t.status} />
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/topics")} aria-label={tx.addTopic}>
                <Field label={tx.topicCode} name="code" required />
                <label className="field">
                  <span>{tx.chapters}</span>
                  <select name="chapterCode" required>
                    {d.chapters
                      .filter((c: any) => c.status === "active")
                      .map((c: any) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                  </select>
                </label>
                <Field label={tx.topicName} name="title" required />
                <Field label={tx.outcomeCodes} name="outcomeCodes" />
                <button className="secondary">{tx.add}</button>
              </form>
            </div>
            <div>
              <h3>{tx.outcomes}</h3>
              <ul className="admin-list">
                {d.outcomes.map((o: any) => (
                  <li key={o.code}>
                    <b>{o.code}</b> {o.statement}{" "}
                    <span className="tiny muted">
                      ({tx.lessons(o.lessons)}{o.synthetic ? tx.sampleSuffix : ""})
                    </span>{" "}
                    <Status value={o.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "outcome", item: o })}>
                      {o.status === "active" ? tx.archive : tx.restore}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/outcomes")} aria-label={tx.addOutcome}>
                <Field label={tx.outcomeCode} name="code" required />
                <label className="field">
                  <span>{tx.gradeLabel}</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>{tx.strand}</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label={tx.chapters} name="chapter" required />
                <Field label={tx.statement} name="statement" required minLength={5} />
                <button className="secondary">{tx.add}</button>
              </form>
            </div>
          </div>
        )}
      </QueryState>
      {dialog && (
        <ReasonDialog
          title={dialog.item.status === "active" ? tx.archiveItem : tx.restoreItem}
          effect={
            dialog.item.status === "active"
              ? tx.archiveEffect
               : tx.restoreEffect
          }
          confirmLabel={dialog.item.status === "active" ? tx.archive : tx.restore}
          danger={dialog.item.status === "active"}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => {
            const status = dialog.item.status === "active" ? "archived" : "active";
            const body =
              dialog.kind === "chapter"
                ? { title: dialog.item.title, status, reason }
                : { statement: dialog.item.statement, status, reason };
            act.mutate(
              { path: `/admin/${dialog.kind === "chapter" ? "chapters" : "outcomes"}/${dialog.item.code}`, method: "PUT", body },
              { onSuccess: () => setDialog(null) },
            );
          }}
        />
      )}
    </section>
  );
}
