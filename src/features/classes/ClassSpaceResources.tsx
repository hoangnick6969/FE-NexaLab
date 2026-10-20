import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field } from "../../components/ui";
import { ResourceEditor, resourceInput, type ResourceContent } from "./ResourceEditor";

type Kind = "DECK" | "STUDY_QUIZ" | "TEST";
type Resource = { id: string; classId: string; kind: Kind; title: string; lessonId: string | null; version: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; content: any; practice?: { state: Record<string, any>; updatedAt: string; scored: false } | null };
const names: Record<Kind, string> = { DECK: "Thẻ học", STUDY_QUIZ: "Quiz luyện tập không điểm", TEST: "Bài kiểm tra chờ giao" };
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
    if (!file) return setError(new Error("Chọn tệp CSV trước."));
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
    <div className="section-heading"><div><p className="eyebrow">CHỈ DÀNH CHO LỚP NÀY</p><h2 id={`resources-${classId}`}>Tài nguyên lớp</h2></div></div>
    {!disabled && <div className="class-resource-create">
      <h3>Tạo nội dung trực tiếp</h3>
      <form onSubmit={create}>
        <label className="field"><span>Loại nội dung</span><select value={kind} onChange={(e) => { const next = e.target.value as Kind; setKind(next); setSource(sample[next]); setPreview(null); }}><option value="DECK">Thẻ học</option><option value="STUDY_QUIZ">Quiz luyện tập không điểm</option><option value="TEST">Bài kiểm tra (chưa được giao)</option></select></label>
        <Field label="Tên tài nguyên" value={title} onChange={(e: any) => setTitle(e.target.value)} required maxLength={160} />
        <label className="field"><span>Bài học liên kết</span><select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Chọn bài học</option>{lessons.data?.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>Khối {lesson.grade} · {lesson.subject.name} · {lesson.title}</option>)}</select></label>
        <ResourceEditor kind={kind} value={source} onChange={setSource} />
        <p className="tiny muted">Lưu bản nháp để rà soát trước khi xuất bản. Bài kiểm tra chỉ được chấm điểm sau khi giao cho học sinh.</p>
        <ErrorBox error={error} /><button className="primary" disabled={action.isPending}>{action.isPending ? "Đang lưu…" : "Lưu bản nháp"}</button>
      </form>
      <details className="class-resource-import"><summary>Nhập CSV có cấu trúc</summary>
        <p className="tiny muted">Hỗ trợ CSV UTF-8, tối đa 1 MB; thẻ học tối đa 200 dòng, quiz/test tối đa 100 dòng. Import tạo bản nháp và không chạy macro hay công thức.</p>
        <label className="field"><span>Tệp CSV</span><input type="file" accept=".csv,text/csv" onChange={async (e) => { const next = e.target.files?.[0]; setFile(next ? { name: next.name, csv: await next.text() } : null); setPreview(null); }} /></label>
        <button type="button" className="secondary" onClick={previewImport}>Kiểm tra và xem trước</button>
        {preview && <div role="status" className={preview.valid ? "notice" : "error"}>{preview.valid ? <><b>Hợp lệ · {preview.itemCount} mục</b><p>Nhấn “Nhập thành bản nháp” để tạo, sau đó rà soát và xuất bản.</p></> : <><b>Tệp có lỗi</b>{preview.errors?.map((item: any, i: number) => <p key={i}>Dòng {item.row}, {item.field}: {item.message}</p>)}</>}</div>}
        <ErrorBox error={error} /><button type="button" className="primary" disabled={!preview?.valid || action.isPending} onClick={importFile}>Nhập thành bản nháp</button>
      </details>
    </div>}
    {list.isLoading && <p className="muted">Đang tải tài nguyên…</p>}{list.error && <ErrorBox error={list.error} />}
    {list.data?.length === 0 && <Empty>Lớp chưa có tài nguyên. Chia sẻ tài nguyên không tự tạo bài giao.</Empty>}
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
  return <article className="class-resource-row"><div><b>{resource.title}</b><small>{names[resource.kind]} · Bản {resource.version} · {count ?? 0} mục</small></div><Badge tone={resource.status === "PUBLISHED" ? "" : "outline"}>{resource.status === "PUBLISHED" ? "Đã chia sẻ" : resource.status === "DRAFT" ? "Bản nháp" : "Đã lưu trữ"}</Badge>
    {!disabled && resource.status === "DRAFT" && <><details className="class-resource-edit"><summary>Chỉnh sửa bản nháp</summary><form onSubmit={(event) => { event.preventDefault(); update.mutate(); }}><label className="field"><span>Tên tài nguyên</span><input required value={titleDraft} maxLength={160} onChange={(event) => setTitleDraft(event.target.value)} /></label><ResourceEditor kind={resource.kind} value={contentDraft} onChange={setContentDraft} /><ErrorBox error={update.error} /><button className="secondary" disabled={update.isPending}>Lưu bản nháp</button></form></details><button className="secondary" disabled={action.isPending} onClick={() => action.mutate("publish")}>Xuất bản cho lớp</button></>}
    {!disabled && resource.status === "PUBLISHED" && <><button className="secondary" disabled={action.isPending} onClick={() => action.mutate("revise")}>Tạo bản mới</button><button className="danger-text" disabled={action.isPending} onClick={() => action.mutate("archive")}>Lưu trữ</button></>}
    <ErrorBox error={action.error} />
  </article>;
}

export function StudentClassResources({ classId }: { classId: string }) {
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  return <div className="class-resource-list"><h3>Tài nguyên của lớp</h3>{list.isLoading && <p className="muted">Đang tải tài nguyên…</p>}{list.error && <ErrorBox error={list.error} />}{list.data?.length === 0 && <p className="muted">Thầy cô chưa chia sẻ tài nguyên.</p>}{list.data?.map((r) => <StudentResource key={r.id} resource={r} classId={classId} />)}</div>;
}

function StudentResource({ resource, classId }: { resource: Resource; classId: string }) {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>(resource.practice?.state?.revealed ?? {});
  const [answers, setAnswers] = useState<Record<string, number>>(resource.practice?.state?.answers ?? {});
  const save = useMutation({ mutationFn: (state: Record<string, unknown>) => api(`/classes/${classId}/resources/${resource.id}/practice`, "PUT", { state }), onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }) });
  return <article className="class-resource-row student-resource"><div><b>{resource.title}</b><small>{names[resource.kind]}{resource.version > 1 ? ` · Bản ${resource.version}` : ""}</small></div>
    {resource.kind === "TEST" ? <p className="notice">Bài kiểm tra này chưa được giao. Nội dung câu hỏi sẽ mở khi giáo viên tạo assignment.</p> : resource.kind === "DECK" ? <div className="resource-practice-items">{resource.content.cards?.map((card: any) => <div className="study-card" key={card.id}><b>{revealed[card.id] ? card.back : card.front}</b><button className="secondary" onClick={() => { const next = { ...revealed, [card.id]: !revealed[card.id] }; setRevealed(next); save.mutate({ revealed: next }); }}>{revealed[card.id] ? "Xem mặt trước" : "Lật thẻ"}</button></div>)}</div> : <div className="resource-practice-items">{resource.content.questions?.map((q: any) => <fieldset key={q.id}><legend>{q.prompt}</legend>{q.options.map((option: any, index: number) => <label className="check" key={option.id}><input type="radio" name={`${resource.id}-${q.id}`} checked={answers[q.id] === index} onChange={() => { const next = { ...answers, [q.id]: index }; setAnswers(next); save.mutate({ answers: next }); }} />{option.text}</label>)}</fieldset>)}<p className="tiny muted">Luyện tập không chấm điểm.</p></div>}
    {save.error && <ErrorBox error={save.error} />}{save.isSuccess && <small role="status">Đã lưu lượt luyện tập</small>}
  </article>;
}
