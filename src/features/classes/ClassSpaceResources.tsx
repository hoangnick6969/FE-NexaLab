import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field } from "../../components/ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    names: { DECK: "Thẻ học", STUDY_QUIZ: "Quiz luyện tập không điểm", TEST: "Bài kiểm tra chờ giao" },
    sampleFront: "Khái niệm",
    sampleBack: "Giải thích",
    sampleQuestion: "Câu hỏi",
    sampleOption: (letter: string) => `Phương án ${letter}`,
    chooseCsv: "Chọn tệp CSV trước.",
    onlyThisClass: "CHỈ DÀNH CHO LỚP NÀY",
    resources: "Tài nguyên lớp",
    createDirect: "Tạo nội dung trực tiếp",
    contentType: "Loại nội dung",
    deck: "Thẻ học",
    practiceQuiz: "Quiz luyện tập không điểm",
    testUnassigned: "Bài kiểm tra (chưa được giao)",
    resourceName: "Tên tài nguyên",
    linkedLesson: "Bài học liên kết",
    chooseLesson: "Chọn bài học",
    grade: (g: number) => `Khối ${g}`,
    json: "Nội dung JSON",
    jsonHint: "Test thêm correctOption (bắt đầu từ 0). Test chưa được giao và chưa chấm điểm.",
    draftHint: "Lưu bản nháp để rà soát trước khi xuất bản. Bài kiểm tra chỉ được chấm điểm sau khi giao cho học sinh.",
    saving: "Đang lưu…",
    saveDraft: "Lưu bản nháp",
    importCsv: "Nhập CSV có cấu trúc",
    csvRules: "Hỗ trợ CSV UTF-8, tối đa 1 MB; thẻ học tối đa 200 dòng, quiz/test tối đa 100 dòng. Import tạo bản nháp và không chạy macro hay công thức.",
    csvFile: "Tệp CSV",
    checkPreview: "Kiểm tra và xem trước",
    valid: (n: number) => `Hợp lệ · ${n} mục`,
    validHint: "Nhấn “Nhập thành bản nháp” để tạo, sau đó rà soát và xuất bản.",
    fileErrors: "Tệp có lỗi",
    row: (n: number) => `Dòng ${n}`,
    importDraft: "Nhập thành bản nháp",
    loading: "Đang tải tài nguyên…",
    none: "Lớp chưa có tài nguyên. Chia sẻ tài nguyên không tự tạo bài giao.",
    version: (n: number) => `Bản ${n}`,
    items: (n: number) => `${n} mục`,
    shared: "Đã chia sẻ",
    draft: "Bản nháp",
    archived: "Đã lưu trữ",
    editDraft: "Chỉnh sửa bản nháp",
    publish: "Xuất bản cho lớp",
    newVersion: "Tạo bản mới",
    archive: "Lưu trữ",
    classResources: "Tài nguyên của lớp",
    noneShared: "Thầy cô chưa chia sẻ tài nguyên.",
    testNotAssigned: "Bài kiểm tra này chưa được giao. Nội dung câu hỏi sẽ mở khi giáo viên tạo assignment.",
    seeFront: "Xem mặt trước",
    flip: "Lật thẻ",
    ungraded: "Luyện tập không chấm điểm.",
    practiceSaved: "Đã lưu lượt luyện tập",
  },
  en: {
    names: { DECK: "Study cards", STUDY_QUIZ: "Ungraded practice quiz", TEST: "Test waiting to be assigned" },
    sampleFront: "Concept",
    sampleBack: "Explanation",
    sampleQuestion: "Question",
    sampleOption: (letter: string) => `Option ${letter}`,
    chooseCsv: "Choose a CSV file first.",
    onlyThisClass: "FOR THIS CLASS ONLY",
    resources: "Class resources",
    createDirect: "Create content directly",
    contentType: "Content type",
    deck: "Study cards",
    practiceQuiz: "Ungraded practice quiz",
    testUnassigned: "Test (not assigned yet)",
    resourceName: "Resource name",
    linkedLesson: "Linked lesson",
    chooseLesson: "Choose a lesson",
    grade: (g: number) => `Grade ${g}`,
    json: "JSON content",
    jsonHint: "Tests also take correctOption (from 0). A test is not assigned or scored yet.",
    draftHint: "Save a draft to review it before publishing. A test is scored only after it is assigned to students.",
    saving: "Saving…",
    saveDraft: "Save draft",
    importCsv: "Import a structured CSV",
    csvRules: "UTF-8 CSV up to 1 MB; study cards up to 200 rows, quiz/test up to 100 rows. Import creates a draft and never runs macros or formulas.",
    csvFile: "CSV file",
    checkPreview: "Check and preview",
    valid: (n: number) => `Valid · ${n} ${n === 1 ? "item" : "items"}`,
    validHint: "Press “Import as draft” to create it, then review and publish.",
    fileErrors: "The file has errors",
    row: (n: number) => `Row ${n}`,
    importDraft: "Import as draft",
    loading: "Loading resources…",
    none: "The class has no resources. Sharing a resource does not assign it.",
    version: (n: number) => `Version ${n}`,
    items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
    shared: "Shared",
    draft: "Draft",
    archived: "Archived",
    editDraft: "Edit draft",
    publish: "Publish to the class",
    newVersion: "Create a new version",
    archive: "Archive",
    classResources: "Class resources",
    noneShared: "Your teacher has not shared any resources.",
    testNotAssigned: "This test is not assigned yet. The questions open when the teacher assigns it.",
    seeFront: "See the front",
    flip: "Flip card",
    ungraded: "Practice is not scored.",
    practiceSaved: "Practice saved",
  },
});
const t = text();
import { ResourceEditor, resourceInput, type ResourceContent } from "./ResourceEditor";

type Kind = "DECK" | "STUDY_QUIZ" | "TEST";
type Resource = { id: string; classId: string; kind: Kind; title: string; lessonId: string | null; version: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; content: any; practice?: { state: Record<string, any>; updatedAt: string; scored: false } | null };
const names: Record<Kind, string> = t.names;
const sample: Record<Kind, object> = {
  DECK: { cards: [{ front: "", back: "" }] },
  STUDY_QUIZ: { questions: [{ prompt: "", options: ["", ""] }] },
  TEST: { questions: [{ prompt: "", options: ["", ""], correctOption: 0 }] },
};

export function TeacherClassResources({ classId, disabled }: { classId: string; disabled: boolean }) {
  const qc = useQueryClient();
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  const lessons = useQuery<{ lessons: Array<{ id: string; title: string; grade: number; subject: { name: string } }> }>({ queryKey: ["class-resource-lessons", classId], queryFn: () => api(`/classes/${classId}/assignable-content`) });
  const [kind, setKind] = useState<Kind>("DECK");
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [source, setSource] = useState<ResourceContent>(sample.DECK);
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const action = useMutation({ mutationFn: ({ path, body, method, key }: any) => key ? mutate(path, method ?? "POST", body, key) : api(path, method ?? "POST", body), onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }) });
  const resourceBody = () => ({ kind, title: title.trim(), lessonId, content: resourceInput(kind, source) });
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    try { const body = resourceBody(); await action.mutateAsync({ path: `/classes/${classId}/resources`, body, key: idempotencyKey() }); setTitle(""); setSource(sample[kind]); }
    catch (e) { setError(e); }
  };
  const previewImport = async () => {
    setError(null); setPreview(null);
    if (!file) return setError(new Error(t.chooseCsv));
    try { setPreview(await api(`/classes/${classId}/resources/import/preview`, "POST", { kind, filename: file.name, csv: file.csv })); }
    catch (e) { setError(e); }
  };
  const importFile = async () => {
    if (!file) return;
    setError(null);
    try { await action.mutateAsync({ path: `/classes/${classId}/resources/import`, body: { kind, title: title.trim() || file.name.replace(/\.csv$/i, ""), lessonId, filename: file.name, csv: file.csv }, key: idempotencyKey() }); setFile(null); setPreview(null); setTitle(""); }
    catch (e) { setError(e); }
  };
  return <section className="panel" aria-labelledby={`resources-${classId}`}>
    <div className="section-heading"><div><p className="eyebrow">{t.onlyThisClass}</p><h2 id={`resources-${classId}`}>{t.resources}</h2></div></div>
    {!disabled && <div className="class-resource-create">
      <h3>{t.createDirect}</h3>
      <form onSubmit={create}>
        <label className="field"><span>{t.contentType}</span><select value={kind} onChange={(e) => { const next = e.target.value as Kind; setKind(next); setSource(sample[next]); setPreview(null); }}><option value="DECK">{t.deck}</option><option value="STUDY_QUIZ">{t.practiceQuiz}</option><option value="TEST">{t.testUnassigned}</option></select></label>
        <Field label={t.resourceName} value={title} onChange={(e: any) => setTitle(e.target.value)} required maxLength={160} />
        <label className="field"><span>{t.linkedLesson}</span><select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">{t.chooseLesson}</option>{lessons.data?.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{t.grade(lesson.grade)} · {lesson.subject.name} · {lesson.title}</option>)}</select></label>
        <ResourceEditor kind={kind} value={source} onChange={setSource} />
        <p className="tiny muted">{t.draftHint}</p>
        <ErrorBox error={error} /><button className="primary" disabled={action.isPending}>{action.isPending ? t.saving : t.saveDraft}</button>
      </form>
      <details className="class-resource-import"><summary>{t.importCsv}</summary>
        <p className="tiny muted">{t.csvRules}</p>
        <label className="field"><span>{t.csvFile}</span><input type="file" accept=".csv,text/csv" onChange={async (e) => { const next = e.target.files?.[0]; setFile(next ? { name: next.name, csv: await next.text() } : null); setPreview(null); }} /></label>
        <button type="button" className="secondary" onClick={previewImport}>{t.checkPreview}</button>
        {preview && <div role="status" className={preview.valid ? "notice" : "error"}>{preview.valid ? <><b>{t.valid(preview.itemCount)}</b><p>{t.validHint}</p></> : <><b>{t.fileErrors}</b>{preview.errors?.map((item: any, i: number) => <p key={i}>{t.row(item.row)}, {item.field}: {item.message}</p>)}</>}</div>}
        <ErrorBox error={error} /><button type="button" className="primary" disabled={!preview?.valid || action.isPending} onClick={importFile}>{t.importDraft}</button>
      </details>
    </div>}
    {list.isLoading && <p className="muted">{t.loading}</p>}{list.error && <ErrorBox error={list.error} />}
    {list.data?.length === 0 && <Empty>{t.none}</Empty>}
    {list.data?.map((r) => <TeacherResourceRow key={r.id} resource={r} classId={classId} disabled={disabled} />)}
  </section>;
}

function TeacherResourceRow({ resource, classId, disabled }: { resource: Resource; classId: string; disabled: boolean }) {
  const qc = useQueryClient();
  const action = useMutation({ mutationFn: (path: string) => api(`/classes/${classId}/resources/${resource.id}/${path}`, "POST", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }) });
  const [contentDraft, setContentDraft] = useState<ResourceContent>(resource.content);
  const [titleDraft, setTitleDraft] = useState(resource.title);
  const update = useMutation({ mutationFn: () => api(`/classes/${classId}/resources/${resource.id}`, "PUT", { kind: resource.kind, title: titleDraft, lessonId: resource.lessonId, content: resourceInput(resource.kind, contentDraft) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }) });
  const count = resource.kind === "DECK" ? resource.content.cards?.length : resource.content.questions?.length;
  return <article className="class-resource-row"><div><b>{resource.title}</b><small>{names[resource.kind]} · {t.version(resource.version)} · {t.items(count ?? 0)}</small></div><Badge tone={resource.status === "PUBLISHED" ? "" : "outline"}>{resource.status === "PUBLISHED" ? t.shared : resource.status === "DRAFT" ? t.draft : t.archived}</Badge>
    {!disabled && resource.status === "DRAFT" && <><details className="class-resource-edit"><summary>{t.editDraft}</summary><form onSubmit={(event) => { event.preventDefault(); update.mutate(); }}><label className="field"><span>{t.resourceName}</span><input required value={titleDraft} maxLength={160} onChange={(event) => setTitleDraft(event.target.value)} /></label><ResourceEditor kind={resource.kind} value={contentDraft} onChange={setContentDraft} /><ErrorBox error={update.error} /><button className="secondary" disabled={update.isPending}>{t.saveDraft}</button></form></details><button className="secondary" disabled={action.isPending} onClick={() => action.mutate("publish")}>{t.publish}</button></>}
    {!disabled && resource.status === "PUBLISHED" && <><button className="secondary" disabled={action.isPending} onClick={() => action.mutate("revise")}>{t.newVersion}</button><button className="danger-text" disabled={action.isPending} onClick={() => action.mutate("archive")}>{t.archive}</button></>}
    <ErrorBox error={action.error} />
  </article>;
}

export function StudentClassResources({ classId }: { classId: string }) {
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  return <div className="class-resource-list"><h3>{t.classResources}</h3>{list.isLoading && <p className="muted">{t.loading}</p>}{list.error && <ErrorBox error={list.error} />}{list.data?.length === 0 && <p className="muted">{t.noneShared}</p>}{list.data?.map((r) => <StudentResource key={r.id} resource={r} classId={classId} />)}</div>;
}

function StudentResource({ resource, classId }: { resource: Resource; classId: string }) {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>(resource.practice?.state?.revealed ?? {});
  const [answers, setAnswers] = useState<Record<string, number>>(resource.practice?.state?.answers ?? {});
  const save = useMutation({ mutationFn: (state: Record<string, unknown>) => api(`/classes/${classId}/resources/${resource.id}/practice`, "PUT", { state }), onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }) });
  return <article className="class-resource-row student-resource"><div><b>{resource.title}</b><small>{names[resource.kind]}{resource.version > 1 ? ` · ${t.version(resource.version)}` : ""}</small></div>
    {resource.kind === "TEST" ? <p className="notice">{t.testNotAssigned}</p> : resource.kind === "DECK" ? <div className="resource-practice-items">{resource.content.cards?.map((card: any) => <div className="study-card" key={card.id}><b>{revealed[card.id] ? card.back : card.front}</b><button className="secondary" onClick={() => { const next = { ...revealed, [card.id]: !revealed[card.id] }; setRevealed(next); save.mutate({ revealed: next }); }}>{revealed[card.id] ? t.seeFront : t.flip}</button></div>)}</div> : <div className="resource-practice-items">{resource.content.questions?.map((q: any) => <fieldset key={q.id}><legend>{q.prompt}</legend>{q.options.map((option: any, index: number) => <label className="check" key={option.id}><input type="radio" name={`${resource.id}-${q.id}`} checked={answers[q.id] === index} onChange={() => { const next = { ...answers, [q.id]: index }; setAnswers(next); save.mutate({ answers: next }); }} />{option.text}</label>)}</fieldset>)}<p className="tiny muted">{t.ungraded}</p></div>}
    {save.error && <ErrorBox error={save.error} />}{save.isSuccess && <small role="status">{t.practiceSaved}</small>}
  </article>;
}
