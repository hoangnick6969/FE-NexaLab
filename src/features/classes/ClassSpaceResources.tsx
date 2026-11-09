import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download, Search, CheckCircle2, AlertCircle, Filter, FileSpreadsheet,
  Plus, X, Sparkles, FlaskConical, FileText, ExternalLink, Layers, HelpCircle, FileCheck, UploadCloud,
  Star, ArrowRight
} from "lucide-react";
import { api, idempotencyKey, isApiError, mutate, streamMaterial } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field } from "../../components/ui";
import { useActionToast } from "../../components/ActionToasts";
import { defineText } from "../../i18n";
import { labInfo } from "../labs/lab-info";
import "./flashcard-study.css";
import { TeacherClassLabAdditionalResponses } from "./ClassLabAdditionalResponses";

const text = defineText({
  vi: {
    names: { DECK: "Thẻ học", STUDY_QUIZ: "Quiz luyện tập không điểm", TEST: "Bài kiểm tra chờ giao", WRITTEN_TASK: "Bài tự luận" },
    writtenTask: "Bài tự luận (chấm theo biểu điểm)",
    writtenStudentNote: "Bài tự luận do giáo viên chấm. Thầy cô sẽ mở phần nộp bài khi giao bài.",
    writtenMax: (n: number) => `tối đa ${n} ký tự`,
    writtenCriteria: "Tiêu chí chấm",
    points: (n: number) => `${n} điểm`,
    rubricErrors: "Biểu điểm chưa hợp lệ:",
    sampleFront: "Khái niệm",
    sampleBack: "Giải thích",
    sampleQuestion: "Câu hỏi",
    sampleOption: (letter: string) => `Phương án ${letter}`,
    chooseCsv: "Chọn tệp CSV trước.",
    onlyThisClass: "CHỈ DÀNH CHO LỚP NÀY",
    resources: "Tài nguyên lớp",
    createResource: "Tạo tài nguyên",
    cancel: "Hủy",
    closeCreate: "Thu gọn",
    createDirect: "Tạo nội dung trực tiếp",
    contentType: "Loại nội dung",
    purpose: "Mục đích sử dụng",
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
    modeAi: "Soạn nháp bằng AI",
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
    similarTitle: "Câu tương tự đã có",
    similarHint: "Chỉ là cảnh báo; tài nguyên vẫn được lưu. Thầy cô tự quyết định giữ hay sửa.",
    similarItem: (n: number) => `Mục ${n}`,
    similarMatch: (title: string, exact: boolean) => `${exact ? "Trùng" : "Gần giống"} “${title}”`,
    similarClass: (name: string) => ` · lớp ${name}`,
    similarLibrary: " · thư viện bài học",
  },
  en: {
    names: { DECK: "Study cards", STUDY_QUIZ: "Ungraded practice quiz", TEST: "Test waiting to be assigned", WRITTEN_TASK: "Written task" },
    writtenTask: "Written task (rubric graded)",
    writtenStudentNote: "Written tasks are graded by your teacher. Submission opens when the task is assigned.",
    writtenMax: (n: number) => `up to ${n} characters`,
    writtenCriteria: "Grading criteria",
    points: (n: number) => `${n} pts`,
    rubricErrors: "The rubric is not valid:",
    sampleFront: "Concept",
    sampleBack: "Explanation",
    sampleQuestion: "Question",
    sampleOption: (letter: string) => `Option ${letter}`,
    chooseCsv: "Choose a CSV file first.",
    onlyThisClass: "FOR THIS CLASS ONLY",
    resources: "Class resources",
    createResource: "Create resource",
    cancel: "Cancel",
    closeCreate: "Collapse",
    createDirect: "Create content directly",
    contentType: "Content type",
    purpose: "Purpose",
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
    modeAi: "Draft with AI",
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
    similarTitle: "Similar questions already exist",
    similarHint: "This is only a warning; the resource is saved. You decide whether to keep or edit it.",
    similarItem: (n: number) => `Item ${n}`,
    similarMatch: (title: string, exact: boolean) => `${exact ? "Same as" : "Close to"} “${title}”`,
    similarClass: (name: string) => ` · class ${name}`,
    similarLibrary: " · lesson library",
  },
});
const t = text();
import { emptyWrittenPrompt, ResourceEditor, resourceInput, type ResourceContent } from "./ResourceEditor";
import { TeacherAiPanel } from "./TeacherAiPanel";
import type { QuestionDuplicateWarning } from "./teacher-ai-api";
import { richNames, richSamples, ResourcePreview, cleanFileName, type ResourceKind } from "./RichResourceEditor";

type Kind = ResourceKind;
type CsvKind = "DECK" | "STUDY_QUIZ" | "TEST";
export type Resource = { id: string; classId: string; kind: Kind; title: string; lessonId: string | null; version: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; content: any; attachment?: any; practice?: { state: Record<string, any>; updatedAt: string; scored: false } | null };
const names: Record<Kind, string> = { ...t.names, ...richNames };
const sample: Record<Kind, object> = {
  DECK: { cards: [{ front: "", back: "" }] },
  STUDY_QUIZ: { questions: [{ prompt: "", options: ["", ""] }] },
  TEST: { questions: [{ prompt: "", options: ["", ""], correctOption: 0 }] },
  WRITTEN_TASK: { prompts: [emptyWrittenPrompt()] },
  ...richSamples,
};

function invalidateResourceChoices(qc: ReturnType<typeof useQueryClient>, classId: string) {
  return Promise.all(["class-resources", "assignable", "class-resource-lessons"].map((key) => qc.invalidateQueries({ queryKey: [key, classId] })));
}

/** RUBRIC_INVALID details from the server, listed by field path (TAI2-T1). */
function RubricErrors({ error }: { error: unknown }) {
  if (!isApiError(error, "RUBRIC_INVALID") || !Array.isArray(error.details)) return null;
  return (
    <div className="error" role="alert">
      <b>{t.rubricErrors}</b>
      <ul>{(error.details as Array<{ path: string; message: string }>).map((d, i) => <li key={i}><code>{d.path || "-"}</code>: {d.message}</li>)}</ul>
    </div>
  );
}

function downloadSampleCsv(kind: CsvKind) {
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

/** "Câu tương tự đã có" (TAI3-T2): qdup@1 warnings with the source title and class; never blocks saving. */
function DuplicateWarnings({ warnings }: { warnings?: QuestionDuplicateWarning[] }) {
  if (!warnings?.length) return null;
  return (
    <div className="notice warning-text duplicate-warnings" role="status">
      <b><AlertCircle size={14} aria-hidden="true" /> {t.similarTitle}</b>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.index}>
            {t.similarItem(warning.index + 1)}:{" "}
            {warning.matches
              .map((m) => t.similarMatch(m.source.title, m.level === "EXACT") + (m.source.kind === "LIBRARY_LESSON" ? t.similarLibrary : m.source.className ? t.similarClass(m.source.className) : ""))
              .join("; ")}
          </li>
        ))}
      </ul>
      <p className="tiny muted">{t.similarHint}</p>
    </div>
  );
}

export function TeacherClassResources({ classId, disabled, labOnly = false }: { classId: string; disabled: boolean; labOnly?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  const lessons = useQuery<{ lessons: Array<{ id: string; title: string; grade: number; subject: { name: string } }> }>({ queryKey: ["class-resource-lessons", classId], queryFn: () => api(`/classes/${classId}/assignable-content`) });
  
  // Creation Mode (the Teacher AI tab reopens when the URL names an AI job, so a reload keeps the review in view)
  const [searchParams] = useSearchParams();
  const [creationMode, setCreationMode] = useState<"direct" | "import" | "ai">(searchParams.has("aiJob") ? "ai" : "direct");
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [focusedResourceId, setFocusedResourceId] = useState<string | null>(null);
  
  // Direct creation state
  const [kind, setKind] = useState<Kind>(labOnly ? "LAB" : "DECK");
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [source, setSource] = useState<ResourceContent>(sample[labOnly ? "LAB" : "DECK"]);
  const [error, setError] = useState<unknown>(null);
  const [createdWarnings, setCreatedWarnings] = useState<QuestionDuplicateWarning[]>([]);

  // Dedicated Import state
  const [importKind, setImportKind] = useState<CsvKind>("DECK");
  const [importTitle, setImportTitle] = useState("");
  const [importLessonId, setImportLessonId] = useState("");
  const [importFile, setImportFile] = useState<{ name: string; csv: string } | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importError, setImportError] = useState<unknown>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const toast = useActionToast();

  // List Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const action = useMutation({
    mutationFn: ({ path, body, method, key }: any) => key ? mutate(path, method ?? "POST", body, key) : api(path, method ?? "POST", body),
    onSuccess: () => invalidateResourceChoices(qc, classId),
  });

  const resourceBody = () => ({ kind, title: title.trim(), lessonId, content: resourceInput(kind, source) });
  
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      const body = resourceBody();
      setCreatedWarnings([]);
      const created = await action.mutateAsync({ path: `/classes/${classId}/resources`, body, key: idempotencyKey() });
      setCreatedWarnings(created?.duplicateWarnings ?? []);
      toast({
        title: "Đã tạo bản nháp",
        description: `Tài nguyên "${title.trim()}" đã được lưu thành công.`,
        tone: "success",
      });
      setTitle("");
      setSource(sample[kind]);
    } catch (e: any) {
      setError(e);
      toast({
        title: "Lưu bản nháp thất bại",
        description: e?.message ?? "Có lỗi xảy ra khi tạo tài nguyên.",
        tone: "error",
      });
    }
  };

  const previewImport = async () => {
    setImportError(null);
    setImportPreview(null);
    if (!importFile) {
      const err = new Error(t.selectFileFirst);
      setImportError(err);
      toast({ title: t.selectFileFirst, tone: "error" });
      return;
    }
    try {
      const preview = await api(`/classes/${classId}/resources/import/preview`, "POST", { kind: importKind, filename: importFile.name, csv: importFile.csv });
      setImportPreview(preview);
      if (preview.valid) {
        toast({
          title: "Tệp CSV hợp lệ",
          description: `Tìm thấy ${preview.items?.length ?? 0} mục sẵn sàng nhập.`,
          tone: "success",
        });
      } else {
        toast({
          title: "Tệp CSV có lỗi",
          description: "Vui lòng xem chi tiết lỗi bên dưới.",
          tone: "error",
        });
      }
    } catch (e: any) {
      setImportError(e);
      toast({
        title: "Kiểm tra tệp thất bại",
        description: e?.message ?? "Không thể phân tích cú pháp tệp CSV.",
        tone: "error",
      });
    }
  };

  const submitImport = async () => {
    if (!importFile) return;
    if (!importTitle.trim() || !importLessonId) {
      const err = new Error(t.missingLessonOrTitle);
      setImportError(err);
      toast({ title: t.missingLessonOrTitle, tone: "error" });
      return;
    }
    setImportError(null);
    try {
      await action.mutateAsync({
        path: `/classes/${classId}/resources/import`,
        body: { kind: importKind, title: importTitle.trim(), lessonId: importLessonId, filename: importFile.name, csv: importFile.csv },
        key: idempotencyKey(),
      });
      toast({
        title: "Nhập tài nguyên thành công",
        description: `Đã tạo bản nháp "${importTitle.trim()}".`,
        tone: "success",
      });
      setImportFile(null);
      setImportPreview(null);
      setImportTitle("");
      setImportLessonId("");
    } catch (e: any) {
      setImportError(e);
      toast({
        title: "Nhập tài nguyên thất bại",
        description: e?.message ?? "Không thể lưu bản nháp từ CSV.",
        tone: "error",
      });
    }
  };

  const filteredResources = (list.data ?? []).filter((r) => {
    if (labOnly && r.kind !== "LAB") return false;
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
    <section className="panel class-resources-panel" aria-labelledby={`resources-${classId}`}>
      <div className="class-resource-top-bar">
        <div className="resource-list-toolbar">
          <div className="resource-search-input">
            <Search size={15} aria-hidden="true" />
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
              <Filter size={13} aria-hidden="true" />
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Lọc theo loại">
                <option value="ALL">{t.allKinds}</option>
                {Object.entries(richNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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

      {!disabled && !labOnly && (
          <button
            type="button"
            className={isFormOpen ? "secondary button-compact" : "primary button-compact"}
            onClick={() => setIsFormOpen((prev) => !prev)}
            aria-expanded={isFormOpen}
          >
            {isFormOpen ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
            <span>{isFormOpen ? t.closeCreate : t.createResource}</span>
          </button>
        )}
      </div>

      {!disabled && isFormOpen && (
        <div className="class-resource-create class-resource-create-card">
          <div className="resource-create-header">
            <h4 className="resource-create-title">
              <Sparkles size={16} aria-hidden="true" />
              <span>{creationMode === "direct" ? t.createDirect : creationMode === "import" ? t.importCsv : t.modeAi}</span>
            </h4>
            {!labOnly && <div className="resource-mode-tabs" role="tablist" aria-label="Phương thức tạo tài nguyên">
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
              <button
                type="button"
                role="tab"
                aria-selected={creationMode === "ai"}
                className={creationMode === "ai" ? "active" : ""}
                onClick={() => setCreationMode("ai")}
              >
                <Sparkles size={15} aria-hidden="true" />
                {t.modeAi}
              </button>
            </div>}
          </div>

          {creationMode === "ai" ? (
            <TeacherAiPanel
              classId={classId}
              lessons={lessons.data?.lessons ?? []}
              onMaterialized={(resourceId) => {
                setSearchQuery("");
                setKindFilter("ALL");
                setStatusFilter("ALL");
                setFocusedResourceId(resourceId);
              }}
            />
          ) : creationMode === "direct" ? (
            <form onSubmit={create}>
              <fieldset className="form-lock" disabled={action.isPending}>
                <div className="form-grid-2col">
                  <label className="field">
                    <span>{t.purpose}</span>
                    <select disabled={labOnly} value={kind} onChange={(e) => { const next = e.target.value as Kind; setKind(next); setSource(sample[next]); }}>
                      <option value="DECK">{t.deck}</option>
                      <option value="STUDY_QUIZ">{t.practiceQuiz}</option>
                      <option value="TEST">{t.testUnassigned}</option>
                      <option value="WRITTEN_TASK">{t.writtenTask}</option>
                      {Object.entries(richNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
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
                </div>
                <Field label={t.resourceName} value={title} onChange={(e: any) => setTitle(e.target.value)} required maxLength={160} />
                <ResourceEditor kind={kind} value={source} onChange={setSource} classId={classId} />
                {kind === "LAB" && source.source?.labId && source.source?.challengeId && (
                  <button type="button" className="secondary button-compact" onClick={() => navigate(`/labs/${encodeURIComponent(source.source!.labId)}?classId=${encodeURIComponent(classId)}&customize=1`, { state: { labDraft: { kind, title, lessonId, content: resourceInput(kind, source) } } })}>
                    <FlaskConical size={14} aria-hidden="true" />
                    <span>Mở phòng thí nghiệm để tùy biến thông số</span>
                  </button>
                )}
                <p className="tiny muted">{t.draftHint}</p>
                {isApiError(error, "RUBRIC_INVALID") ? <RubricErrors error={error} /> : <ErrorBox error={error} />}
                <DuplicateWarnings warnings={createdWarnings} />
                <div className="button-row resource-create-actions">
                  <button type="button" className="secondary button-compact" onClick={() => setIsFormOpen(false)}>
                    {t.cancel}
                  </button>
                  <button className="primary button-compact" disabled={action.isPending}>
                    {action.isPending ? t.saving : t.saveDraft}
                  </button>
                </div>
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
                      const next = e.target.value as CsvKind;
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

              <div
                className={`file-dropzone csv-dropzone${isCsvDragging ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsCsvDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsCsvDragging(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsCsvDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && !action.isPending) {
                    setImportFile({ name: file.name, csv: await file.text() });
                    setImportPreview(null);
                    if (!importTitle) {
                      setImportTitle(file.name.replace(/\.csv$/i, ""));
                    }
                  }
                }}
              >
                <label className="field file-field dropzone-label">
                  <span>{t.csvFile}</span>
                  <div className="dropzone-box">
                    <UploadCloud size={24} className="dropzone-icon" aria-hidden="true" />
                    <div className="dropzone-text">
                      <span className="dropzone-title">
                        {importFile ? importFile.name : "Kéo thả file CSV vào đây hoặc nhấn để duyệt file"}
                      </span>
                      <span className="dropzone-hint">
                        {importFile ? "Đã sẵn sàng kiểm tra nội dung" : "Định dạng CSV UTF-8 (tối đa 1 MB)"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      disabled={action.isPending}
                      onChange={async (e) => {
                        const next = e.target.files?.[0];
                        setImportFile(next ? { name: next.name, csv: await next.text() } : null);
                        setImportPreview(null);
                        if (next && !importTitle) {
                          setImportTitle(next.name.replace(/\.csv$/i, ""));
                        }
                      }}
                    />
                  </div>
                </label>
              </div>

              <div className="import-action-row">
                <button
                  type="button"
                  className="secondary button-compact"
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

              {importPreview && <DuplicateWarnings warnings={importPreview.duplicateWarnings} />}

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

      {/* Resource list section */}
      <div className="class-resource-library-section">
        <div className="resource-library-header">
          <div>
            <h3>{t.classResources}</h3>
            {list.data && list.data.length > 0 && (
              <span className="resource-count-badge">
                {t.showingResources(filteredResources.length, list.data.length)}
              </span>
            )}
          </div>
        </div>

      {list.isLoading && <p className="muted">{t.loading}</p>}
      {list.error && <ErrorBox error={list.error} />}
      {list.data?.length === 0 && <Empty>{t.none}</Empty>}
      {list.data && list.data.length > 0 && filteredResources.length === 0 && (
        <Empty>{t.noMatchingResources}</Empty>
      )}
      {filteredResources.map((r) => (
        <TeacherResourceRow key={r.id} resource={r} classId={classId} disabled={disabled} focused={r.id === focusedResourceId} />
      ))}
      </div>
    </section>
  );
}

function getResourceIcon(kind: Kind) {
  switch (kind) {
    case "LAB": return FlaskConical;
    case "DOCUMENT": return FileText;
    case "REPORT_TEMPLATE": return FileSpreadsheet;
    case "LINK": return ExternalLink;
    case "DECK": return Layers;
    case "STUDY_QUIZ": return HelpCircle;
    case "TEST": return FileCheck;
    default: return FileText;
  }
}

function TeacherResourceRow({ resource, classId, disabled, focused = false }: { resource: Resource; classId: string; disabled: boolean; focused?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  // A draft just created from Teacher AI opens in the existing draft editor and scrolls into view.
  const rowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);
  const action = useMutation({ mutationFn: (path: string) => api(`/classes/${classId}/resources/${resource.id}/${path}`, "POST", {}), onSuccess: (created: any, path) => { void invalidateResourceChoices(qc, classId); if (path === "revise" && resource.kind === "LAB") navigate(`/labs/${encodeURIComponent(created.content.source.labId)}?classId=${encodeURIComponent(classId)}&customize=1`, { state: { labDraft: { kind: "LAB", title: created.title, lessonId: created.lessonId, resourceId: created.id, content: resourceInput("LAB", created.content) } } }); } });
  const removeDraft = useMutation({ mutationFn: () => api(`/classes/${classId}/resources/${resource.id}`, "DELETE"), onSuccess: () => invalidateResourceChoices(qc, classId) });
  const [contentDraft, setContentDraft] = useState<ResourceContent>(resource.content);
  const [titleDraft, setTitleDraft] = useState(resource.title);
  const update = useMutation({ mutationFn: () => api(`/classes/${classId}/resources/${resource.id}`, "PUT", { kind: resource.kind, title: titleDraft, lessonId: resource.lessonId, content: resourceInput(resource.kind, contentDraft) }), onSuccess: () => invalidateResourceChoices(qc, classId) });
  const updateWarnings: QuestionDuplicateWarning[] = update.data?.duplicateWarnings ?? [];
  const count = resource.kind === "DECK" ? resource.content.cards?.length : resource.kind === "WRITTEN_TASK" ? resource.content.prompts?.length : resource.content.questions?.length;
  const Icon = getResourceIcon(resource.kind);
  return (
    <article ref={rowRef} id={`resource-${resource.id}`} className={`class-resource-row apple-resource-row${focused ? " focused" : ""}`}>
      <div className="resource-row-header">
        <div className="resource-row-lead">
          <div className="resource-kind-icon" aria-hidden="true"><Icon size={18} /></div>
          <div className="resource-row-title-wrap">
            <b>{resource.title}</b>
            <small>{names[resource.kind]} · {t.version(resource.version)}{count !== undefined ? ` · ${t.items(count)}` : ""}</small>
          </div>
        </div>
        <div className="resource-row-controls">
          <Badge tone={resource.status === "PUBLISHED" ? "" : "outline"}>{resource.status === "PUBLISHED" ? t.shared : resource.status === "DRAFT" ? t.draft : t.archived}</Badge>
          {!disabled && resource.status === "DRAFT" && (
            <>
              <details className="class-resource-edit" open={focused || undefined}>
                <summary>{t.editDraft}</summary>
                <form onSubmit={(event) => { event.preventDefault(); update.mutate(); }}>
                  <label className="field"><span>{t.resourceName}</span><input required value={titleDraft} maxLength={160} onChange={(event) => setTitleDraft(event.target.value)} /></label>
                  <ResourceEditor kind={resource.kind} value={contentDraft} onChange={setContentDraft} classId={classId} />
                  {isApiError(update.error, "RUBRIC_INVALID") ? <RubricErrors error={update.error} /> : <ErrorBox error={update.error} />}
                  <DuplicateWarnings warnings={updateWarnings} />
                  <button className="secondary" disabled={update.isPending}>{t.saveDraft}</button>
                </form>
              </details>
              {resource.kind === "LAB" && (
                <button type="button" className="secondary button-compact" onClick={() => navigate(`/labs/${encodeURIComponent(contentDraft.source!.labId)}?classId=${encodeURIComponent(classId)}&customize=1`, { state: { labDraft: { kind: "LAB", title: titleDraft, lessonId: resource.lessonId, resourceId: resource.id, content: resourceInput("LAB", contentDraft) } } })}>
                  Mở Lab Space để sửa đề bài
                </button>
              )}
              <button className="secondary button-compact" disabled={action.isPending} onClick={() => action.mutate("publish")}>{t.publish}</button>
              <button type="button" className="danger-text button-compact" disabled={removeDraft.isPending} onClick={() => { if (window.confirm("Xóa vĩnh viễn bản nháp này khỏi lớp?")) removeDraft.mutate(); }}>Xóa bản nháp</button>
              <ErrorBox error={removeDraft.error} />
            </>
          )}
          {!disabled && resource.status === "PUBLISHED" && (
            <>
              <button className="secondary button-compact" disabled={action.isPending} onClick={() => action.mutate("revise")}>{resource.kind === "LAB" ? "Tạo bản sửa trong Lab Space" : t.newVersion}</button>
              <button className="danger-text button-compact" disabled={action.isPending} onClick={() => { if (window.confirm("Ẩn đề bài này khỏi lớp? Bài đã giao vẫn giữ bản ghim.")) action.mutate("archive"); }}>{t.archive}</button>
            </>
          )}
        </div>
      </div>
      {["LAB", "DOCUMENT", "REPORT_TEMPLATE", "LINK"].includes(resource.kind) && <ResourcePreview kind={resource.kind} content={resource.content} attachment={resource.attachment} resourceId={resource.id} classId={classId} />}
      {!disabled && resource.kind === "LAB" && resource.status === "PUBLISHED" && <TeacherClassLabAdditionalResponses classId={classId} resourceId={resource.id} />}
      <ErrorBox error={action.error} />
    </article>
  );
}

export function StudentClassResources({ classId }: { classId: string }) {
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  const [category, setCategory] = useState<"ALL" | "DOCS" | "LABS" | "PRACTICE">("ALL");

  const allItems = list.data ?? [];
  const docs = allItems.filter((r) => ["DOCUMENT", "REPORT_TEMPLATE", "LINK"].includes(r.kind));
  const labs = allItems.filter((r) => r.kind === "LAB");
  const practice = allItems.filter((r) => ["DECK", "STUDY_QUIZ", "TEST", "WRITTEN_TASK"].includes(r.kind));

  const displayItems = category === "DOCS" ? docs : category === "LABS" ? labs : category === "PRACTICE" ? practice : allItems;

  return (
    <div className="class-resource-list student-resource-section">
      <div className="student-resource-toolbar">
        <div className="student-resource-categories" role="tablist" aria-label="Phân loại tài nguyên">
          <button
            type="button"
            role="tab"
            aria-selected={category === "ALL"}
            className={category === "ALL" ? "active" : ""}
            onClick={() => setCategory("ALL")}
          >
            <span>Tất cả</span>
            <span className="cat-count">{allItems.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === "DOCS"}
            className={category === "DOCS" ? "active" : ""}
            onClick={() => setCategory("DOCS")}
          >
            <FileText size={14} aria-hidden="true" />
            <span>Tài liệu & Báo cáo</span>
            <span className="cat-count">{docs.length}</span>
          </button>
          {labs.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={category === "LABS"}
              className={category === "LABS" ? "active" : ""}
              onClick={() => setCategory("LABS")}
            >
              <FlaskConical size={14} aria-hidden="true" />
              <span>Lab được chia sẻ</span>
              <span className="cat-count">{labs.length}</span>
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={category === "PRACTICE"}
            className={category === "PRACTICE" ? "active" : ""}
            onClick={() => setCategory("PRACTICE")}
          >
            <Layers size={14} aria-hidden="true" />
            <span>Thẻ học & Quiz</span>
            <span className="cat-count">{practice.length}</span>
          </button>
        </div>
      </div>

      {list.isLoading && <p className="muted">{t.loading}</p>}
      {list.error && <ErrorBox error={list.error} />}
      {allItems.length === 0 && <Empty>{t.noneShared}</Empty>}
      {allItems.length > 0 && displayItems.length === 0 && (
        <Empty>Chưa có tài nguyên nào thuộc danh mục này.</Empty>
      )}

      <div className="student-resource-cards-list">
        {displayItems.map((r) => (
          <StudentResource key={r.id} resource={r} classId={classId} />
        ))}
      </div>
    </div>
  );
}

function StudentResource({ resource, classId }: { resource: Resource; classId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>(resource.practice?.state?.answers ?? {});
  const save = useMutation({ mutationFn: (state: Record<string, unknown>) => api(`/classes/${classId}/resources/${resource.id}/practice`, "PUT", { state }), onSuccess: () => invalidateResourceChoices(qc, classId) });
  const count = resource.kind === "DECK" ? resource.content.cards?.length : resource.kind === "WRITTEN_TASK" ? resource.content.prompts?.length : resource.content.questions?.length;
  const isWritten = resource.kind === "WRITTEN_TASK";

  const isDeck = resource.kind === "DECK";
  const isLab = resource.kind === "LAB";
  const isDoc = ["DOCUMENT", "REPORT_TEMPLATE", "LINK"].includes(resource.kind);
  const isQuiz = resource.kind === "STUDY_QUIZ";
  const isTest = resource.kind === "TEST";

  const studyUrl = `/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(resource.id)}/study`;
  const labEntry = isLab ? labInfo.find((entry) => entry.id === resource.content.source?.labId) : null;
  const labQuery = isLab ? new URLSearchParams({ resourceId: resource.id, classId, challengeId: resource.content.source?.challengeId ?? "" }).toString() : "";
  const labUrl = isLab ? `/labs/${encodeURIComponent(resource.content.source?.labId || "")}?${labQuery}` : "";

  const storageKey = `nexa_fc_state_${resource.id}`;
  const legacyStorageKey = `nexa_fc_starred_${resource.id}`;
  const localSaved = useMemo(() => {
    if (!isDeck) return null;
    try {
      const stateRaw = localStorage.getItem(storageKey);
      if (stateRaw) return JSON.parse(stateRaw);
      const legacyRaw = localStorage.getItem(legacyStorageKey);
      if (legacyRaw) return { starredCards: JSON.parse(legacyRaw) };
      return null;
    } catch {
      return null;
    }
  }, [isDeck, storageKey, legacyStorageKey]);

  const apiStarred = resource.practice?.state?.starredCards;
  const starredList: string[] = useMemo(() => {
    if (Array.isArray(apiStarred) && apiStarred.length > 0) return apiStarred;
    if (Array.isArray(localSaved?.starredCards) && localSaved.starredCards.length > 0) return localSaved.starredCards;
    return Array.isArray(apiStarred) ? apiStarred : [];
  }, [apiStarred, localSaved?.starredCards]);

  const starredCount = starredList.length;

  const revealedCount = useMemo(() => {
    const apiRev = resource.practice?.state?.revealed;
    if (apiRev && typeof apiRev === "object" && Object.keys(apiRev).length > 0) return Object.keys(apiRev).length;
    if (localSaved?.revealed && typeof localSaved.revealed === "object") return Object.keys(localSaved.revealed).length;
    return 0;
  }, [resource.practice?.state?.revealed, localSaved?.revealed]);

  const hasStudied = isDeck && (starredCount > 0 || revealedCount > 0 || (typeof localSaved?.lastIndex === "number" && localSaved.lastIndex > 0));

  const promptCount = isLab ? (resource.content.reportPrompts?.length || 0) : 0;
  const attachment = resource.attachment;
  const friendlySize = attachment?.bytes
    ? attachment.bytes >= 1024 * 1024
      ? `${(attachment.bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(attachment.bytes / 1024)} KB`
    : "";

  const handleCardClick = () => {
    if (isDeck) {
      navigate(studyUrl);
    } else if (isLab && labUrl) {
      navigate(labUrl);
    } else if (isDoc) {
      if (resource.kind === "LINK") {
        let url = resource.content.url || resource.content.source?.url;
        if (url && /^https:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
      } else if (resource.content.source?.assetVersionId) {
        void streamMaterial(`assetv:${resource.content.source.assetVersionId}`).then((access) => {
          window.open(access.src, "_blank", "noopener,noreferrer");
        });
      }
    }
  };

  const isInteractive = isDeck || isLab || isDoc;

  return (
    <article
      className={`student-resource-item${isInteractive ? " is-interactive" : ""}`}
      onClick={isInteractive ? handleCardClick : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      } : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? "link" : undefined}
      aria-label={isDeck ? `${hasStudied ? "Tiếp tục học" : "Học thẻ"}: ${resource.title}` : isLab ? `Mở Lab: ${resource.title}` : resource.title}
    >
      <div className="resource-lead-visual" aria-hidden="true">
        {isDeck ? (
          <div className="resource-visual-emblem emblem-deck">
            <Layers size={20} />
            <span className="emblem-sub-badge">{count ?? 0} thẻ</span>
          </div>
        ) : isLab ? (
          labEntry?.thumbnail ? (
            <img className="resource-visual-thumb" src={labEntry.thumbnail} alt="" />
          ) : (
            <div className="resource-visual-emblem emblem-lab">
              <FlaskConical size={20} />
            </div>
          )
        ) : isDoc ? (
          <div className="resource-visual-emblem emblem-doc">
            <FileText size={20} />
            <span className="emblem-sub-badge">
              {attachment?.mime?.includes("pdf") ? "PDF" : resource.kind === "LINK" ? "LINK" : "TỆP"}
            </span>
          </div>
        ) : (
          <div className="resource-visual-emblem emblem-quiz">
            <HelpCircle size={20} />
          </div>
        )}
      </div>

      <div className="resource-body-content">
        <div className="resource-headline-row">
          <h4 className="resource-item-title">{resource.title}</h4>
          <span className="resource-kind-pill">
            {isDeck ? "Thẻ học" : isLab ? "Lab mô phỏng" : isDoc ? (resource.kind === "LINK" ? "Liên kết" : "Tài liệu") : isTest ? "Bài kiểm tra" : isWritten ? t.names.WRITTEN_TASK : "Luyện tập"}
          </span>
        </div>

        <div className="resource-meta-line">
          {isDeck ? (
            <>
              <span>{count ?? 0} thẻ hai mặt</span>
              {starredCount > 0 && (
                <span
                  className="meta-starred-tag"
                  title="Nhấn để ôn lại thẻ đã lưu"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`${studyUrl}?mode=starred`);
                  }}
                >
                  <Star size={11} className="fill-current" />
                  <span>{starredCount} đã lưu</span>
                </span>
              )}
              {revealedCount > 0 && <span>· Đã ôn {revealedCount}/{count}</span>}
            </>
          ) : isLab ? (
            <>
              <span>{labEntry?.title ?? resource.content.source?.labId ?? "Phòng thí nghiệm"}</span>
              {promptCount > 0 && <span>· {promptCount} câu hỏi báo cáo</span>}
            </>
          ) : isDoc ? (
            <>
              <span>{cleanFileName(attachment?.fileName) || (resource.kind === "LINK" ? "Liên kết ngoài" : "Tệp học liệu")}</span>
              {friendlySize && <span>· {friendlySize}</span>}
            </>
          ) : (
            <span>{count !== undefined ? `${count} câu hỏi` : names[resource.kind]}</span>
          )}
        </div>

        <p className="resource-description-line">
          {isDeck
            ? (resource.content.cards?.[0]?.front
                ? `Khái niệm mở đầu: “${resource.content.cards[0].front}”`
                : "Ôn tập từng khái niệm với phương pháp thẻ lật hai mặt ghi nhớ chủ động.")
            : isLab
            ? (resource.content.learningObjective || resource.content.instructions || "Thực hành tương tác trực quan với phòng thí nghiệm ảo.")
            : isDoc
            ? (resource.content.description || "Tài liệu đính kèm phục vụ học tập và làm bài báo cáo.")
            : isTest
            ? t.testNotAssigned
            : "Luyện tập trả lời câu hỏi để củng cố kiến thức."}
        </p>

        {isQuiz && (
          <div className="resource-practice-inline" onClick={(e) => e.stopPropagation()}>
            {resource.content.questions?.map((q: any) => (
              <fieldset key={q.id}>
                <legend>{q.prompt}</legend>
                {q.options.map((option: any, index: number) => (
                  <label className="check" key={option.id}>
                    <input type="radio" name={`${resource.id}-${q.id}`} checked={answers[q.id] === index} onChange={() => { const next = { ...answers, [q.id]: index }; setAnswers(next); save.mutate({ answers: next }); }} />
                    {option.text}
                  </label>
                ))}
              </fieldset>
            ))}
            {save.isSuccess && <small className="text-success" role="status">Đã lưu bài làm</small>}
          </div>
        )}
      </div>

      <div className="resource-action-area">
        {isInteractive && (
          <span className="resource-action-link">
            <span>{isDeck ? (hasStudied ? "Tiếp tục học" : "Bắt đầu học") : isLab ? "Mở Lab" : "Mở tài liệu"}</span>
            <ArrowRight size={14} className="resource-action-arrow" aria-hidden="true" />
          </span>
        )}
      </div>
      {isWritten && <WrittenTaskView content={resource.content} />}
    </article>
  );
}

/** Student view of a WRITTEN_TASK: only what studentWrittenTaskContent returns (prompt, length limit, criteria). */
function WrittenTaskView({ content }: { content: any }) {
  return (
    <div className="resource-practice-items written-task-view">
      {(content?.prompts ?? []).map((p: any, i: number) => (
        <fieldset key={p.id ?? i}>
          <legend>{t.names.WRITTEN_TASK} · {i + 1}</legend>
          <p>{p.prompt}</p>
          <p className="tiny muted">{t.writtenMax(p.maxChars)}</p>
          <p className="tiny"><b>{t.writtenCriteria}</b></p>
          <ul className="tiny">{(p.criteria ?? []).map((c: any) => <li key={c.code}>{c.description} · {t.points(c.maxPoints)}</li>)}</ul>
        </fieldset>
      ))}
      <p className="notice tiny">{t.writtenStudentNote}</p>
    </div>
  );
}
