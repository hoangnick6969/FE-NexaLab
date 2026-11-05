import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search, CheckCircle2, AlertCircle, Filter, FileSpreadsheet } from "lucide-react";
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
    modeDirect: "Tạo nội dung trực tiếp",
    modeImport: "Nhập từ file CSV",
    downloadTemplate: "Tải file mẫu CSV",
    csvTemplateTip: (kind: string) => `Tải file mẫu định dạng CSV chuẩn UTF-8 cho ${kind}`,
    requiredColumns: "Các cột bắt buộc trong CSV:",
    csvColumnsDeck: "front (Mặt trước), back (Mặt sau)",
    csvColumnsQuiz: "prompt (Câu hỏi), optionA, optionB (bắt buộc), optionC, optionD, explanation (tuỳ chọn)",
    csvColumnsTest: "prompt (Câu hỏi), optionA, optionB (bắt buộc), optionC, optionD, correctOption (A/B/C/D), explanation",
    previewReady: "Tệp hợp lệ · Đầy đủ điều kiện tạo tài nguyên",
    selectFileFirst: "Vui lòng chọn tệp CSV trước khi kiểm tra.",
    missingLessonOrTitle: "Vui lòng nhập tên tài nguyên và chọn bài học liên kết trước khi nhập bản nháp.",
    searchResourcePlaceholder: "Tìm kiếm tài nguyên theo tên…",
    allKinds: "Tất cả loại",
    allStatuses: "Tất cả trạng thái",
    showingResources: (n: number, total: number) => `Đang hiển thị ${n} / ${total} tài nguyên`,
    noMatchingResources: "Không có tài nguyên nào phù hợp với bộ lọc.",
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
    modeDirect: "Create directly",
    modeImport: "Import from CSV",
    downloadTemplate: "Download CSV template",
    csvTemplateTip: (kind: string) => `Download standard UTF-8 CSV template for ${kind}`,
    requiredColumns: "Required columns in CSV:",
    csvColumnsDeck: "front (Front side), back (Back side)",
    csvColumnsQuiz: "prompt (Question), optionA, optionB (required), optionC, optionD, explanation (optional)",
    csvColumnsTest: "prompt (Question), optionA, optionB (required), optionC, optionD, correctOption (A/B/C/D), explanation",
    previewReady: "Valid file · Ready to import resource",
    selectFileFirst: "Please select a CSV file first.",
    missingLessonOrTitle: "Please enter resource name and choose linked lesson before importing.",
    searchResourcePlaceholder: "Search resources by name…",
    allKinds: "All types",
    allStatuses: "All statuses",
    showingResources: (n: number, total: number) => `Showing ${n} / ${total} resources`,
    noMatchingResources: "No resources match the selected filters.",
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

function downloadSampleCsv(kind: Kind) {
  let content = "";
  let filename = "";
  if (kind === "DECK") {
    content = "front,back\r\nKhái niệm 1,Giải thích khái niệm 1\r\nKhái niệm 2,Giải thích khái niệm 2\r\n";
    filename = "mau_the_hoc.csv";
  } else if (kind === "STUDY_QUIZ") {
    content = "prompt,optionA,optionB,optionC,optionD,explanation\r\nCâu hỏi luyện tập 1?,Lựa chọn A,Lựa chọn B,Lựa chọn C,Lựa chọn D,Giải thích đáp án câu 1\r\n";
    filename = "mau_quiz_luyen_tap.csv";
  } else {
    content = "prompt,optionA,optionB,optionC,optionD,correctOption,explanation\r\nCâu hỏi kiểm tra 1?,Lựa chọn A,Lựa chọn B,Lựa chọn C,Lựa chọn D,A,Giải thích đáp án câu 1\r\n";
    filename = "mau_bai_kiem_tra.csv";
  }
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TeacherClassResources({ classId, disabled }: { classId: string; disabled: boolean }) {
  const qc = useQueryClient();
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  const lessons = useQuery<{ lessons: Array<{ id: string; title: string; grade: number; subject: { name: string } }> }>({ queryKey: ["class-resource-lessons", classId], queryFn: () => api(`/classes/${classId}/assignable-content`) });
  
  // Creation Mode
  const [creationMode, setCreationMode] = useState<"direct" | "import">("direct");
  
  // Direct creation state
  const [kind, setKind] = useState<Kind>("DECK");
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [source, setSource] = useState<ResourceContent>(sample.DECK);
  const [error, setError] = useState<unknown>(null);

  // Dedicated Import state
  const [importKind, setImportKind] = useState<Kind>("DECK");
  const [importTitle, setImportTitle] = useState("");
  const [importLessonId, setImportLessonId] = useState("");
  const [importFile, setImportFile] = useState<{ name: string; csv: string } | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importError, setImportError] = useState<unknown>(null);

  // List Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const action = useMutation({
    mutationFn: ({ path, body, method, key }: any) => key ? mutate(path, method ?? "POST", body, key) : api(path, method ?? "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["class-resources", classId] }),
  });

  const resourceBody = () => ({ kind, title: title.trim(), lessonId, content: resourceInput(kind, source) });
  
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      const body = resourceBody();
      await action.mutateAsync({ path: `/classes/${classId}/resources`, body, key: idempotencyKey() });
      setTitle("");
      setSource(sample[kind]);
    } catch (e) {
      setError(e);
    }
  };

  const previewImport = async () => {
    setImportError(null);
    setImportPreview(null);
    if (!importFile) return setImportError(new Error(t.selectFileFirst));
    try {
      setImportPreview(await api(`/classes/${classId}/resources/import/preview`, "POST", { kind: importKind, filename: importFile.name, csv: importFile.csv }));
    } catch (e) {
      setImportError(e);
    }
  };

  const submitImport = async () => {
    if (!importFile) return;
    if (!importTitle.trim() || !importLessonId) {
      setImportError(new Error(t.missingLessonOrTitle));
      return;
    }
    setImportError(null);
    try {
      await action.mutateAsync({
        path: `/classes/${classId}/resources/import`,
        body: { kind: importKind, title: importTitle.trim(), lessonId: importLessonId, filename: importFile.name, csv: importFile.csv },
        key: idempotencyKey(),
      });
      setImportFile(null);
      setImportPreview(null);
      setImportTitle("");
      setImportLessonId("");
    } catch (e) {
      setImportError(e);
    }
  };

  const filteredResources = (list.data ?? []).filter((r) => {
    if (searchQuery.trim() && !r.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
      return false;
    }
    if (kindFilter !== "ALL" && r.kind !== kindFilter) {
      return false;
    }
    if (statusFilter !== "ALL" && r.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <section className="panel" aria-labelledby={`resources-${classId}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.onlyThisClass}</p>
          <h2 id={`resources-${classId}`}>{t.resources}</h2>
        </div>
      </div>

      {!disabled && (
        <div className="class-resource-create">
          <div className="resource-mode-tabs" role="tablist" aria-label="Phương thức tạo tài nguyên">
            <button
              type="button"
              role="tab"
              aria-selected={creationMode === "direct"}
              className={creationMode === "direct" ? "active" : ""}
              onClick={() => setCreationMode("direct")}
            >
              {t.modeDirect}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={creationMode === "import"}
              className={creationMode === "import" ? "active" : ""}
              onClick={() => setCreationMode("import")}
            >
              <FileSpreadsheet size={15} aria-hidden="true" />
              {t.modeImport}
            </button>
          </div>

          {creationMode === "direct" ? (
            <form onSubmit={create}>
              <fieldset className="form-lock" disabled={action.isPending}>
                <label className="field">
                  <span>{t.contentType}</span>
                  <select value={kind} onChange={(e) => { const next = e.target.value as Kind; setKind(next); setSource(sample[next]); }}>
                    <option value="DECK">{t.deck}</option>
                    <option value="STUDY_QUIZ">{t.practiceQuiz}</option>
                    <option value="TEST">{t.testUnassigned}</option>
                  </select>
                </label>
                <Field label={t.resourceName} value={title} onChange={(e: any) => setTitle(e.target.value)} required maxLength={160} />
                <label className="field">
                  <span>{t.linkedLesson}</span>
                  <select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                    <option value="">{t.chooseLesson}</option>
                    {lessons.data?.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {t.grade(lesson.grade)} · {lesson.subject.name} · {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
                <ResourceEditor kind={kind} value={source} onChange={setSource} />
                <p className="tiny muted">{t.draftHint}</p>
                <ErrorBox error={error} />
                <button className="primary" disabled={action.isPending}>{action.isPending ? t.saving : t.saveDraft}</button>
              </fieldset>
            </form>
          ) : (
            <div className="class-resource-import-flow">
              <div className="import-step-header">
                <div>
                  <h4>{t.importCsv}</h4>
                  <p className="tiny muted">{t.csvRules}</p>
                </div>
                <button
                  type="button"
                  className="secondary button-compact"
                  onClick={() => downloadSampleCsv(importKind)}
                  title={t.csvTemplateTip(names[importKind])}
                >
                  <Download size={15} aria-hidden="true" />
                  {t.downloadTemplate} ({names[importKind]})
                </button>
              </div>

              <div className="import-meta-grid">
                <label className="field">
                  <span>{t.contentType}</span>
                  <select
                    value={importKind}
                    onChange={(e) => {
                      const next = e.target.value as Kind;
                      setImportKind(next);
                      setImportPreview(null);
                    }}
                  >
                    <option value="DECK">{t.deck}</option>
                    <option value="STUDY_QUIZ">{t.practiceQuiz}</option>
                    <option value="TEST">{t.testUnassigned}</option>
                  </select>
                </label>

                <label className="field">
                  <span>{t.linkedLesson} *</span>
                  <select required value={importLessonId} onChange={(e) => setImportLessonId(e.target.value)}>
                    <option value="">{t.chooseLesson}</option>
                    {lessons.data?.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {t.grade(lesson.grade)} · {lesson.subject.name} · {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Field
                label={t.resourceName}
                value={importTitle}
                onChange={(e: any) => setImportTitle(e.target.value)}
                placeholder={importFile ? importFile.name.replace(/\.csv$/i, "") : ""}
                required
                maxLength={160}
              />

              <div className="import-columns-hint">
                <small>
                  <strong>{t.requiredColumns} </strong>
                  <code>
                    {importKind === "DECK"
                      ? t.csvColumnsDeck
                      : importKind === "STUDY_QUIZ"
                      ? t.csvColumnsQuiz
                      : t.csvColumnsTest}
                  </code>
                </small>
              </div>

              <div className="import-file-row">
                <label className="field file-field">
                  <span>{t.csvFile}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const next = e.target.files?.[0];
                      setImportFile(next ? { name: next.name, csv: await next.text() } : null);
                      setImportPreview(null);
                      if (next && !importTitle) {
                        setImportTitle(next.name.replace(/\.csv$/i, ""));
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  disabled={!importFile}
                  onClick={previewImport}
                >
                  {t.checkPreview}
                </button>
              </div>

              {importPreview && (
                <div role="status" className={`import-preview-box ${importPreview.valid ? "notice" : "error"}`}>
                  {importPreview.valid ? (
                    <div className="preview-valid-row">
                      <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
                      <div>
                        <b>{t.valid(importPreview.itemCount)}</b>
                        <p className="tiny">{t.previewReady}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="preview-error-list">
                      <div className="preview-error-header">
                        <AlertCircle size={18} aria-hidden="true" />
                        <b>{t.fileErrors}</b>
                      </div>
                      {importPreview.errors?.map((item: any, i: number) => (
                        <p key={i} className="tiny">
                          {t.row(item.row)}, cột <code>{item.field}</code>: {item.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importFile && importPreview?.valid && (!importTitle.trim() || !importLessonId) && (
                <p className="tiny muted warning-text">{t.missingLessonOrTitle}</p>
              )}

              <ErrorBox error={importError} />

              <div className="button-row">
                <button
                  type="button"
                  className="primary"
                  disabled={!importPreview?.valid || !importLessonId || !importTitle.trim() || action.isPending}
                  onClick={submitImport}
                >
                  {action.isPending ? t.saving : t.importDraft}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource list controls */}
      <div className="resource-list-toolbar">
        <div className="resource-search-input">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder={t.searchResourcePlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm tài nguyên"
          />
        </div>
        <div className="resource-filters">
          <label className="filter-select-wrap">
            <Filter size={14} aria-hidden="true" />
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Lọc theo loại">
              <option value="ALL">{t.allKinds}</option>
              <option value="DECK">{t.deck}</option>
              <option value="STUDY_QUIZ">{t.practiceQuiz}</option>
              <option value="TEST">{t.testUnassigned}</option>
            </select>
          </label>
          <label className="filter-select-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc theo trạng thái">
              <option value="ALL">{t.allStatuses}</option>
              <option value="PUBLISHED">{t.shared}</option>
              <option value="DRAFT">{t.draft}</option>
              <option value="ARCHIVED">{t.archived}</option>
            </select>
          </label>
        </div>
      </div>

      {list.data && list.data.length > 0 && (
        <p className="tiny muted resource-count-badge">
          {t.showingResources(filteredResources.length, list.data.length)}
        </p>
      )}

      {list.isLoading && <p className="muted">{t.loading}</p>}
      {list.error && <ErrorBox error={list.error} />}
      {list.data?.length === 0 && <Empty>{t.none}</Empty>}
      {list.data && list.data.length > 0 && filteredResources.length === 0 && (
        <Empty>{t.noMatchingResources}</Empty>
      )}
      {filteredResources.map((r) => (
        <TeacherResourceRow key={r.id} resource={r} classId={classId} disabled={disabled} />
      ))}
    </section>
  );
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
