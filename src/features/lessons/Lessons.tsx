import { useQuery } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plus, ArrowUpRight, BookOpen, Save, Calculator, PenLine, Languages, Landmark, Compass, Monitor, Wrench, Palette, Dumbbell, Telescope } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, idempotencyKey, isApiError, mutate, useAuth, uploadFile } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, Modal, useAction, CardSkeleton } from "../../components/ui";
import { CoverageTable, LibraryFiltersBar, PreviewModal, ReleaseReviews, TaxonomyFields, libraryQuery, type LibraryFilters } from "./library";

function RichEditor({
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
const blankLesson = {
  title: "",
  subjectId: "physics",
  chapter: "",
  grade: 8,
  topic: "",
  learningObjective: "",
  prerequisites: "",
  curriculum: "GDPT 2018 – Khoa học tự nhiên THCS",
  content: "",
  status: "draft",
  labId: "circuit",
  materials: [],
  questions: [],
  domain: null,
  outcomeCodes: [],
  challengeParams: null,
};
const khtnSubjectIds = new Set(["khtn", "physics", "biology", "chemistry"]);
const subjectPreviews = [
  { name: "Toán", icon: Calculator, topics: "Đại số · Hình học · Thống kê" },
  { name: "Ngữ văn", icon: PenLine, topics: "Đọc · Viết · Nói và nghe" },
  { name: "Ngoại ngữ 1", icon: Languages, topics: "Từ vựng · Ngữ pháp · Giao tiếp" },
  { name: "Lịch sử và Địa lí", icon: Landmark, topics: "Lịch sử · Địa lí" },
  { name: "Giáo dục công dân", icon: Compass, topics: "Công dân · Pháp luật · Đạo đức" },
  { name: "Tin học", icon: Monitor, topics: "Máy tính · Dữ liệu · Lập trình" },
  { name: "Công nghệ", icon: Wrench, topics: "Thiết kế · Kỹ thuật · Đời sống" },
  { name: "Nghệ thuật", icon: Palette, topics: "Âm nhạc · Mĩ thuật" },
  { name: "Giáo dục thể chất", icon: Dumbbell, topics: "Vận động · Thể thao" },
  { name: "Hoạt động trải nghiệm", icon: Telescope, topics: "Trải nghiệm · Hướng nghiệp" },
];
const lessonNumber = (title: string) => Number(title.match(/^\s*Bài\s+(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
export function Lessons() {
  const user = useAuth((s) => s.user)!;
  const manage = ["TEACHER", "ADMIN"].includes(user.role);
  const q = useQuery({ queryKey: ["lessons"], queryFn: () => api("/lessons") });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api("/subjects") });
  const safeEbookUrl = (value: unknown) => {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [edit, setEdit] = useState<any>(null);
  const upload = useAction(async (file: File) => {
    const m = await uploadFile(file);
    setEdit((s: any) => ({ ...s, materials: [...s.materials, m] }));
  });
  const save = useAction((b: any) =>
    api("/lessons" + (b.id ? "/" + b.id : ""), b.id ? "PUT" : "POST", b),
  );
  // B1-T4: library metadata (scope, editability, readiness, coverage) and filters.
  const [libraryFilters, setLibraryFilters] = useState<LibraryFilters>({ grade: "", domain: "", outcome: "", scope: "ALL" });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const library = useQuery({
    queryKey: ["teacher-content", libraryFilters],
    queryFn: () => api(libraryQuery(libraryFilters)),
    enabled: manage,
    placeholderData: (previous) => previous,
  });
  const meta = new Map<string, any>((library.data?.items ?? []).map((item: any) => [item.id, item]));
  const filtersActive = manage && Object.entries(libraryFilters).some(([key, value]) => (key === "scope" ? value !== "ALL" : Boolean(value)));
  const clone = useAction((id: string) => mutate("/lessons/" + id + "/clone", "POST", undefined, idempotencyKey()));
  const startClone = (id: string) =>
    clone.mutate(id, {
      onSuccess: (copy: any) => setEdit({ ...copy, review: copy.review ?? null }),
    });
  const lessonMatches = (q.data ?? []).filter((l: any) =>
    (filter === "all" || (filter === "khtn" && khtnSubjectIds.has(l.subjectId))) &&
    l.title.toLowerCase().includes(search.toLowerCase()) &&
    (!filtersActive || meta.has(l.id)),
  );
  const groups = new Map<string, { chapter: string; grade: number; lessons: any[]; order: number }>();
  for (const lesson of lessonMatches) {
    const chapter = lesson.chapter?.trim() || "Chưa phân chương";
    const key = `${khtnSubjectIds.has(lesson.subjectId) ? "khtn" : lesson.subjectId}:${lesson.grade}:${chapter.toLocaleLowerCase("vi")}`;
    const group: { chapter: string; grade: number; lessons: any[]; order: number } = groups.get(key) ?? { chapter, grade: lesson.grade, lessons: [], order: Number.MAX_SAFE_INTEGER };
    group.lessons.push(lesson);
    group.order = Math.min(group.order, lessonNumber(lesson.title));
    groups.set(key, group);
  }
  const chapterGroups = [...groups.values()]
    .map((group) => ({ ...group, lessons: group.lessons.sort((a, b) => lessonNumber(a.title) - lessonNumber(b.title) || a.title.localeCompare(b.title, "vi")) }))
    .sort((a, b) => a.grade - b.grade || a.order - b.order || a.chapter.localeCompare(b.chapter, "vi"));
  const renderLessonCard = (l: any) => (
    <article className={`panel lesson-card${manage ? "" : " student-lesson-card"}`} key={l.id}>
      <div className="lesson-card-top">
        <span className={`subject-icon ${khtnSubjectIds.has(l.subjectId) ? "khtn" : l.subjectId}`}><BookOpen /></span>
        {manage ? <Badge>{l.status === "published" ? "Đã xuất bản" : l.status === "draft" ? "Bản nháp" : "Lưu trữ"}</Badge> : <span className="student-lesson-kind"><BookOpen size={14} /> Bài học</span>}
      </div>
      {manage && <div className="badge-row">
        <Badge tone="outline">{l.scope === "SHARED_LIBRARY" ? "Bài nền dùng chung" : "Bản riêng"}</Badge>
        {l.synthetic && <Badge tone="outline">Dữ liệu mẫu</Badge>}
        {meta.get(l.id)?.structureLocked && <Badge tone="outline">Đang được dùng</Badge>}
        {meta.get(l.id)?.hasChallengeVariant && <Badge tone="outline">Thử thách tùy chỉnh</Badge>}
      </div>}
      <small className="eyebrow">{khtnSubjectIds.has(l.subjectId) ? "Khoa học tự nhiên" : l.subject.name} · LỚP {l.grade}</small>
      <h3>{l.title}</h3>
      {l.learningObjective && (manage || !/dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(l.learningObjective)) && <p>{l.learningObjective}</p>}
      {!manage && <div className="student-lesson-context"><span>{l.chapter || "Chưa phân chương"}</span>{l.topic && <span>{l.topic}</span>}</div>}
      <div className="card-footer">
        <button className={manage ? "text-button" : "student-lesson-open"} onClick={() => navigate(`/lessons/${l.id}`)}>{manage ? "Mở bài học" : "Vào bài học"} <ArrowUpRight size={16} /></button>
        {manage && ((l.authorId === user.id && l.scope !== "SHARED_LIBRARY") || user.role === "ADMIN") && <button className="text-button" onClick={() => setEdit(l)}>Chỉnh sửa</button>}
        {manage && <button className="text-button" onClick={() => setPreviewId(l.id)}>Xem trước</button>}
        {manage && <button className="text-button" disabled={clone.isPending} onClick={() => startClone(l.id)}>Tạo bản riêng</button>}
      </div>
    </article>
  );
  return (
    <div className="student-lessons-page">
      <PageHeading
        eyebrow="THƯ VIỆN KIẾN THỨC"
        title="Bài học"
        description="Chọn bài học để tiếp tục."
        action={
          manage ? (
            <button
              className="primary"
              onClick={() => setEdit({ ...blankLesson })}
            >
              <Plus size={16} />
              Tạo bài học
            </button>
          ) : null
        }
      />
      {subjects.data?.some((subject: any) => safeEbookUrl(subject.ebookUrl)) && (
        <section className="subject-ebook-links" aria-label="Sách tham khảo theo môn">
          <h2>Sách tham khảo</h2>
          <p>Mở sách giáo khoa trực tuyến theo môn học.</p>
          <div>
            {subjects.data.filter((subject: any) => safeEbookUrl(subject.ebookUrl)).map((subject: any) => (
              <Link key={subject.id} to={`/ebooks/${subject.id}`}>
                <BookOpen size={18} /> {subject.name} <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="filter-bar">
        <div className="tabs">
          {[
            ["all", "Tất cả"],
            ["khtn", "Khoa học tự nhiên"],
          ].map(([id, name]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          aria-label="Tìm bài học"
          placeholder="Tìm tên bài học…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ErrorBox error={q.error || clone.error} />
      {manage && (
        <LibraryFiltersBar
          filters={libraryFilters}
          onChange={setLibraryFilters}
          taxonomy={library.data?.taxonomy}
          outcomes={library.data?.outcomes ?? []}
        />
      )}
      {manage && library.error && (
        <div className="load-error">
          <ErrorBox error={library.error} />
          <button type="button" onClick={() => library.refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {manage && library.data && (
        <CoverageTable rows={library.data.coverage} note={library.data.coverageNote} outcomes={library.data.outcomes} />
      )}
      {manage ? <div className="lesson-grid">
        {q.isLoading && <CardSkeleton count={6} />}
        {lessonMatches.map(renderLessonCard)}
      </div> : <div className="student-chapter-list">
        {q.isLoading && <div className="lesson-grid"><CardSkeleton count={3} /></div>}
        {chapterGroups.map((group) => <section className="lesson-chapter-group" key={`${group.grade}-${group.chapter}`}>
          <header className="lesson-chapter-heading">
            <div><span className="eyebrow">KHOA HỌC TỰ NHIÊN · LỚP {group.grade}</span><h2>{group.chapter}</h2></div>
            <span className="lesson-chapter-count">{group.lessons.length} bài</span>
          </header>
          <div className="lesson-grid">{group.lessons.map(renderLessonCard)}</div>
        </section>)}
      </div>}
      {!manage && <section className="student-subject-previews" aria-labelledby="subject-preview-title">
        <div className="student-subject-previews-heading">
          <div><span className="eyebrow">LỘ TRÌNH THCS</span><h2 id="subject-preview-title">Các môn học khác</h2></div>
          <p>Bản xem trước · nội dung sẽ được bổ sung sau</p>
        </div>
        <div className="subject-preview-grid">
          {subjectPreviews.map(({ name, icon: Icon, topics }) => <article className="subject-preview-card" key={name}>
            <span className="subject-preview-icon"><Icon size={19} aria-hidden="true" /></span>
            <div><div className="subject-preview-title"><h3>{name}</h3><span>Sắp có</span></div><p>{topics}</p></div>
          </article>)}
        </div>
      </section>}
      {q.data && q.data.length === 0 && <Empty>Chưa có bài học.</Empty>}
      {!manage && q.data?.length > 0 && lessonMatches.length === 0 && <Empty>Không tìm thấy bài học phù hợp.</Empty>}
      {filtersActive && library.data && library.data.items.length === 0 && (
        <Empty>Không có bài học khớp bộ lọc. Hãy bỏ bớt điều kiện lọc hoặc tạo bài riêng cho yêu cầu cần đạt này.</Empty>
      )}
      {previewId && <PreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
      {edit && (
        <Modal
          title={edit.id ? "Chỉnh sửa bài học" : "Tạo bài học"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(edit, { onSuccess: () => setEdit(null) });
            }}
          >
            {edit.clonedFromId && (
              <p className="notice">Bản riêng tạo từ một bài khác. Thay đổi ở đây không ảnh hưởng bài gốc hay các lớp khác.</p>
            )}
            {meta.get(edit.id)?.structureLocked && (
              <p className="notice">
                Bài đang được giao hoặc đã có kết quả học tập: chỉ sửa được thông tin mô tả hoặc lưu trữ. Để đổi nội dung,
                câu hỏi hay phòng lab, hãy{" "}
                <button type="button" className="text-button" onClick={() => startClone(edit.id)}>
                  tạo bản riêng
                </button>
                .
              </p>
            )}
            <div className="form-grid">
              {[
                ["title", "Tên bài"],
                ["chapter", "Chương"],
                ["topic", "Chủ đề"],
                ["learningObjective", "Mục tiêu"],
                ["prerequisites", "Kiến thức nền"],
                ["curriculum", "Chuẩn chương trình"],
              ].map(([key, label]) => (
                <Field
                  required
                  key={key}
                  label={label}
                  value={edit[key]}
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                />
              ))}
              <label className="field">
                <span>Môn học</span>
                <select
                  value={edit.subjectId}
                  onChange={(e) =>
                    setEdit({ ...edit, subjectId: e.target.value })
                  }
                >
                  <option value="physics">Vật lý</option>
                  <option value="biology">Sinh học</option>
                  <option value="chemistry">Hóa học</option>
                </select>
              </label>
              <Field
                label="Khối lớp"
                type="number"
                min={6}
                max={9}
                value={edit.grade}
                onChange={(e) =>
                  setEdit({ ...edit, grade: Number(e.target.value) })
                }
              />
              <label className="field">
                <span>Lab đính kèm</span>
                <select
                  value={edit.labId ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, labId: e.target.value || null, challengeParams: null })
                  }
                >
                  <option value="">Không có</option>
                  <option value="circuit">Mạch điện</option>
                  <option value="eye">Mắt người</option>
                  <option value="chemistry">Phản ứng</option>
                </select>
              </label>
              {user.role === "ADMIN" && !edit.id && (
                <label className="field">
                  <span>Phạm vi</span>
                  <select value={edit.scope ?? "TEACHER_PRIVATE"} onChange={(e) => setEdit({ ...edit, scope: e.target.value })}>
                    <option value="TEACHER_PRIVATE">Bài riêng</option>
                    <option value="SHARED_LIBRARY">Thư viện chung (cần duyệt có tên)</option>
                  </select>
                </label>
              )}
              <label className="field">
                <span>Trạng thái</span>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Nội dung lý thuyết</span>
              <RichEditor
                value={edit.content}
                onChange={(v) => setEdit((s: any) => ({ ...s, content: v }))}
              />
            </label>
            <h3>Học liệu</h3>
            <label className="field">
              <span>Tải PDF / ảnh / video (tối đa 20 MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.mp4"
                disabled={upload.isPending}
                onChange={(e) => {
                  if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
                }}
              />
            </label>
            <ErrorBox error={upload.error} />
            {edit.materials.map((m: any, i: number) => (
              <div className="form-grid" key={i}>
                <Field
                  label="Tên học liệu"
                  value={m.title}
                  required
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Field
                  label="URL video / PDF / ảnh"
                  type="text"
                  value={m.url}
                  required
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, url: e.target.value } : x,
                      ),
                    })
                  }
                />
                <select
                  aria-label="Loại học liệu"
                  value={m.type}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, type: e.target.value } : x,
                      ),
                    })
                  }
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Ảnh</option>
                </select>
                {m.type === "video" && (
                  <label className="field wide-field">
                    <span>Bản chép lời video (bắt buộc khi xuất bản)</span>
                    <textarea
                      value={m.transcript ?? ""}
                      rows={3}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          materials: edit.materials.map((x: any, j: number) =>
                            j === i ? { ...x, transcript: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.filter(
                        (_: any, j: number) => i !== j,
                      ),
                    })
                  }
                >
                  Xóa học liệu
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setEdit({
                  ...edit,
                  materials: [
                    ...edit.materials,
                    { type: "pdf", title: "", url: "" },
                  ],
                })
              }
            >
              + Thêm học liệu URL
            </button>
            <h3>Quiz</h3>
            {edit.questions.map((q: any, i: number) => (
              <div className="quiz-editor" key={i}>
                <Field
                  label={"Câu " + (i + 1)}
                  required
                  value={q.prompt}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      questions: edit.questions.map((x: any, j: number) =>
                        j === i ? { ...x, prompt: e.target.value } : x,
                      ),
                    })
                  }
                />
                {q.options.map((o: string, k: number) => (
                  <Field
                    key={k}
                    label={"Đáp án " + (k + 1)}
                    required
                    value={o}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        questions: edit.questions.map((x: any, j: number) =>
                          j === i
                            ? {
                                ...x,
                                options: x.options.map(
                                  (v: string, n: number) =>
                                    n === k ? e.target.value : v,
                                ),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                ))}
                <label className="field">
                  <span>Đáp án đúng</span>
                  <select
                    value={q.answer}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        questions: edit.questions.map((x: any, j: number) =>
                          j === i
                            ? { ...x, answer: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  >
                    {q.options.map((_: any, k: number) => (
                      <option value={k} key={k}>
                        Đáp án {k + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      questions: edit.questions.filter(
                        (_: any, j: number) => j !== i,
                      ),
                    })
                  }
                >
                  Xóa câu hỏi
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setEdit({
                  ...edit,
                  questions: [
                    ...edit.questions,
                    { prompt: "", options: ["", "", "", ""], answer: 0 },
                  ],
                })
              }
            >
              + Thêm câu hỏi
            </button>
            <TaxonomyFields edit={edit} setEdit={setEdit} taxonomy={library.data?.taxonomy} outcomes={library.data?.outcomes ?? []} />
            <ReviewChecklist value={edit.review} onChange={(review) => setEdit((s: any) => ({ ...s, review }))} />
            {user.role === "ADMIN" && edit.id && edit.scope === "SHARED_LIBRARY" && meta.get(edit.id)?.releaseReview && (
              <ReleaseReviews lessonId={edit.id} reviews={meta.get(edit.id).releaseReview} />
            )}
            <ErrorBox error={save.error} />
            {isApiError(save.error, "PUBLISH_BLOCKED") && Array.isArray((save.error.details as any)?.missing) && (
              <ul className="publish-blockers">
                {(save.error.details as any).missing.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {isApiError(save.error, "LESSON_STRUCTURE_LOCKED") && edit.id && (
              <button type="button" className="secondary" onClick={() => startClone(edit.id)}>
                Tạo bản riêng để thay đổi
              </button>
            )}
            <button
              className="primary wide form-submit"
              disabled={save.isPending}
            >
              <Save size={16} />
              Lưu bài học
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
const licenseOptions: Array<[string, string]> = [
  ["ORIGINAL", "Tự biên soạn"],
  ["CC0", "CC0"],
  ["CC_BY", "CC BY"],
  ["CC_BY_SA", "CC BY-SA"],
  ["SCHOOL_OWNED", "Tài liệu thuộc nhà trường"],
];
/** D1 self-review checklist required to publish teacher-private content. */
function ReviewChecklist({ value, onChange }: { value: any; onChange: (value: any) => void }) {
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
