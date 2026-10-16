import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowUpRight,
  BookOpen,
  Users,
  Trash2,
  Save,
  ExternalLink,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api, idempotencyKey, isApiError, mutate, useAuth, uploadFile, type QuizAttemptHistoryResponse, type QuizAttemptRequest, type QuizAttemptResponse, type QuizAttemptSummary, type StudentPathway, type StudentQuiz } from "./api";
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  Modal,
  useAction,
  verdictLabel,
  PageLoader,
  InlineLoader,
  Skeleton,
  CardSkeleton,
} from "./ui";
import { PageHeading } from "./App";
import { PracticalPathwayStep } from "./labs/PracticalPathwayStep";
import { StudentProgress } from "./progress";
import {
  AttributionNote,
  CoverageTable,
  LibraryFiltersBar,
  PreviewModal,
  ReleaseReviews,
  TaxonomyFields,
  libraryQuery,
  type LibraryFilters,
} from "./library";
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
  return (
    <>
      <PageHeading
        eyebrow="THƯ VIỆN KIẾN THỨC"
        title="Bài học cho những trí tò mò"
        description="Hiểu khái niệm, khám phá mô hình, rồi tự tay kiểm chứng."
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
          <p>Liên kết tới nguồn bên ngoài; nội dung và quyền sử dụng do đơn vị phát hành quản lý.</p>
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
            ["physics", "Vật lý"],
            ["biology", "Sinh học"],
            ["chemistry", "Hóa học"],
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
      <div className="lesson-grid">
        {q.isLoading && <CardSkeleton count={6} />}
        {q.data
          ?.filter(
            (l: any) =>
              (filter === "all" || l.subjectId === filter) &&
              l.title.toLowerCase().includes(search.toLowerCase()) &&
              (!filtersActive || meta.has(l.id)),
          )
          .map((l: any) => (
            <article className="panel lesson-card" key={l.id}>
              <div className="lesson-card-top">
                <span className={"subject-icon " + l.subjectId}>
                  <BookOpen />
                </span>
                <Badge>
                  {l.status === "published"
                    ? "Đã xuất bản"
                    : l.status === "draft"
                      ? "Bản nháp"
                      : "Lưu trữ"}
                </Badge>
              </div>
              {manage && (
                <div className="badge-row">
                  <Badge tone="outline">{l.scope === "SHARED_LIBRARY" ? "Bài nền dùng chung" : "Bản riêng"}</Badge>
                  {l.synthetic && <Badge tone="outline">Dữ liệu mẫu</Badge>}
                  {meta.get(l.id)?.structureLocked && <Badge tone="outline">Đang được dùng</Badge>}
                  {meta.get(l.id)?.hasChallengeVariant && <Badge tone="outline">Thử thách tùy chỉnh</Badge>}
                </div>
              )}
              <small className="eyebrow">
                {l.subject.name} · LỚP {l.grade}
              </small>
              <h3>{l.title}</h3>
              <p>{l.learningObjective}</p>
              <div className="card-footer">
                <button
                  className="text-button"
                  onClick={() => {
                    navigate(`/lessons/${l.id}`);
                  }}
                >
                  Mở bài học <ArrowUpRight size={16} />
                </button>
                {manage &&
                  ((l.authorId === user.id && l.scope !== "SHARED_LIBRARY") || user.role === "ADMIN") && (
                    <button className="text-button" onClick={() => setEdit(l)}>
                      Chỉnh sửa
                    </button>
                  )}
                {manage && (
                  <button className="text-button" onClick={() => setPreviewId(l.id)}>
                    Xem trước
                  </button>
                )}
                {manage && (
                  <button className="text-button" disabled={clone.isPending} onClick={() => startClone(l.id)}>
                    Tạo bản riêng
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
      {q.data && q.data.length === 0 && <Empty>Chưa có bài học.</Empty>}
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
    </>
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

type QuizDraft = {
  answers: Record<string, string>;
  pending: QuizAttemptRequest | null;
};

function QuizLearningStep({
  lessonId,
  step,
  onReconciled,
}: {
  lessonId: string;
  step: any;
  onReconciled: (pathway: any) => void;
}) {
  const userId = useAuth((state) => state.user?.id ?? "student");
  const queryClient = useQueryClient();
  const storageKey = `quiz-draft:${userId}:${lessonId}:${step.id}`;
  const [draft, setDraft] = useState<QuizDraft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      return { answers: saved?.answers ?? {}, pending: saved?.pending ?? null };
    } catch {
      return { answers: {}, pending: null };
    }
  });
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<QuizAttemptSummary | null>(null);
  const quizQuery = useQuery<StudentQuiz>({
    queryKey: ["student-quiz", lessonId],
    queryFn: () => api(`/lessons/${lessonId}/quiz`),
  });
  const historyQuery = useQuery<QuizAttemptHistoryResponse>({
    queryKey: ["student-quiz-attempts", lessonId],
    queryFn: () => api(`/lessons/${lessonId}/quiz-attempts`),
  });
  const questions = quizQuery.data?.questions ?? [];
  const question = questions[index];
  const allAnswered = questions.length > 0 && questions.every((item) => draft.answers[item.id]);
  const persist = (next: QuizDraft) => {
    setDraft(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep this session usable when storage is unavailable. */ }
  };
  const submit = async (retry = false) => {
    if (submitting || (!retry && !allAnswered)) return;
    const payload = retry && draft.pending
      ? draft.pending
      : draft.pending ?? {
          idempotencyKey: crypto.randomUUID(),
          answers: questions.map((item) => ({ questionId: item.id, optionId: draft.answers[item.id] })),
        };
    if (!draft.pending) persist({ ...draft, pending: payload });
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await api<QuizAttemptResponse>(`/lessons/${lessonId}/quiz-attempts`, "POST", payload);
      setConfirmed(response.attempt);
      onReconciled(response.pathway);
      const cleared = { answers: {}, pending: null };
      persist(cleared);
      setIndex(0);
      await historyQuery.refetch();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Chưa gửi được bài kiểm tra");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!draft.pending || !historyQuery.data?.attempts) return;
    const saved = historyQuery.data.attempts.find((attempt) => attempt.idempotencyKey === draft.pending?.idempotencyKey);
    if (!saved) return;
    persist({ answers: {}, pending: null });
    queryClient.invalidateQueries({ queryKey: ["lesson-pathway", lessonId] });
  }, [draft.pending, historyQuery.data, lessonId, queryClient]);

  if (quizQuery.isLoading) return <section className="quiz-learning" aria-label="Bài kiểm tra"><InlineLoader message="Đang nạp bài kiểm tra trắc nghiệm…" /></section>;
  if (quizQuery.error || !quizQuery.data) return (
    <section className="quiz-learning" aria-label="Bài kiểm tra">
      <ErrorBox error={quizQuery.error ?? new Error("Bài kiểm tra chưa khả dụng")} />
      <button type="button" className="secondary" onClick={() => void quizQuery.refetch()}>Tải lại bài kiểm tra</button>
    </section>
  );

  const attempts = historyQuery.data?.attempts ?? [];
  const latest = attempts.find((attempt) => attempt.latest);
  const passed = confirmed?.passed || attempts.some((attempt) => attempt.passed);
  return (
    <section className="quiz-learning" aria-label="Bài kiểm tra kiến thức">
      {passed ? (
        <div className="quiz-outcome" role="status">
          <h4>Bạn đã vượt qua bài kiểm tra</h4>
          <p>Bước thực hành đã được mở sau khi máy chủ xác nhận kết quả.</p>
        </div>
      ) : latest ? (
        <div className="quiz-outcome" role="status">
          <h4>Chưa đạt lần này. Bạn có thể thử lại.</h4>
          <p>Kết quả được lưu. Hãy xem lại câu hỏi rồi thử thêm một lượt.</p>
        </div>
      ) : (
        <p>Chọn đáp án cho từng câu. Bạn có thể quay lại câu trước khi nộp.</p>
      )}

      {historyQuery.error && <div><ErrorBox error={historyQuery.error} /><button type="button" className="secondary" onClick={() => void historyQuery.refetch()}>Tải lại lịch sử</button></div>}
      {attempts.length > 0 && (
        <div className="quiz-history" aria-label="Lịch sử làm bài">
          <h5>Lịch sử làm bài</h5>
          {attempts.map((attempt, attemptIndex) => (
            <details key={attempt.id} open={attempt.latest}>
              <summary>
                Lượt {attempts.length - attemptIndex} · {attempt.correctCount}/{attempt.questionCount} câu · {Math.round(attempt.score)} điểm
                {attempt.latest && " · Mới nhất"}{attempt.best && " · Điểm cao nhất"}
              </summary>
              <ol>
                {attempt.results.map((result) => (
                  <li key={result.questionId}>
                    <b>{result.prompt}</b><br />
                    Bạn chọn: {result.selectedOptionText || "Chưa có đáp án"} · {result.correct ? "Đúng" : "Chưa đúng"}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}

      {!passed && question && !draft.pending && (
        <div className="quiz-question" aria-live="polite">
          <p className="quiz-position">Câu {index + 1} / {questions.length}</p>
          <fieldset>
            <legend>{question.prompt}</legend>
            {question.options.map((option) => (
              <label className="quiz-option" key={option.id}>
                <input
                  type="radio"
                  name={`quiz-${step.id}-${question.id}`}
                  value={option.id}
                  checked={draft.answers[question.id] === option.id}
                  onChange={() => persist({ ...draft, answers: { ...draft.answers, [question.id]: option.id } })}
                />
                {option.text}
              </label>
            ))}
          </fieldset>
          <div className="quiz-actions">
            <button type="button" className="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Câu trước</button>
            {index < questions.length - 1 ? (
              <button type="button" className="primary" disabled={!draft.answers[question.id]} onClick={() => setIndex((value) => value + 1)}>Câu tiếp theo</button>
            ) : (
              <button type="button" className="primary" disabled={!allAnswered || submitting} onClick={() => void submit()}>{submitting ? "Đang gửi…" : "Nộp bài kiểm tra"}</button>
            )}
          </div>
        </div>
      )}
      {draft.pending && !passed && (
        <div className="quiz-pending" role={submitError ? "alert" : "status"}>
          <span>{submitError || (submitting ? "Đang chờ máy chủ xác nhận lượt làm bài…" : "Lượt làm bài chưa được xác nhận. Có thể gửi lại an toàn.")}</span>
          <button type="button" className="secondary" disabled={submitting} onClick={() => void submit(true)}>Gửi lại lượt này</button>
        </div>
      )}
      {!passed && latest && !draft.pending && (
        <button type="button" className="primary" onClick={() => { persist({ answers: {}, pending: null }); setConfirmed(null); setIndex(0); }}>Thử lại bài kiểm tra</button>
      )}
    </section>
  );
}

export function StudentAssignments() {
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments") });
  if (query.isLoading) return <PageLoader message="Đang tải bài tập…" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  return (
    <>
      <PageHeading eyebrow="LUYỆN TẬP VÀ THỰC HÀNH" title="Bài tập" description="Hoàn thành bài học trước, sau đó làm bài kiểm tra và mở các hoạt động thực hành." />
      {query.data?.length ? <div className="student-list student-assignment-list">
        {query.data.map((item: any) => item.canOpen === false ? (
          <article key={item.id} className="student-assignment-row" aria-disabled="true">
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice}</small></span>
          </article>
        ) : (
          <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể làm bài</small>}</span><ArrowUpRight size={17} />
          </Link>
        ))}
      </div> : <Empty>Chưa có bài tập được giao. Bài học của em vẫn có trong mục Bài học.</Empty>}
    </>
  );
}

export function AssignedLearning() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => api("/assignments/" + id),
    enabled: Boolean(id),
  });
  const lessonId = query.data?.contentType === "lesson" ? query.data.content.id : null;
  const pathwayQuery = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", lessonId],
    queryFn: () => api("/lessons/" + lessonId + "/pathway"),
    enabled: Boolean(lessonId),
  });
  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, query.data, pathwayQuery.data]);
  if (query.isLoading) return <PageLoader message="Đang nạp bài tập…" caption="NexaLab · Phòng thí nghiệm mô phỏng" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  const assignment = query.data;
  const content = assignment.content;
  if (assignment.contentType === "lesson" && pathwayQuery.isLoading)
    return <PageLoader message="Đang nạp lộ trình bài học…" caption="NexaLab · Khoa học tự nhiên" />;
  if (assignment.contentType === "lesson" && pathwayQuery.error)
    return <div><ErrorBox error={pathwayQuery.error} /><button onClick={() => pathwayQuery.refetch()}>Thử lại</button></div>;
  const pathway = pathwayQuery.data;
  const lesson = pathway?.lesson ?? content;
  const stepNames: Record<string, string> = {
    QUIZ: "Kiểm tra kiến thức",
    LAB: "Thực hành trong phòng lab",
    CHALLENGE: "Hoàn thành thử thách",
  };
  const stateNames: Record<string, string> = {
    COMPLETED: "Đã hoàn thành",
    IN_PROGRESS: "Đang học",
    LOCKED: "Đã khóa",
  };
  const continueNames: Record<string, string> = {
    QUIZ: "Bắt đầu kiểm tra",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Hoàn thành thử thách",
  };
  const lockReasons: Record<string, string> = {
    PREREQUISITE_INCOMPLETE: "Hoàn thành bước trước để tiếp tục.",
    QUIZ_NOT_PASSED: "Vượt qua bài kiểm tra để mở khóa bước này.",
    PRACTICE_NOT_PASSED: "Hoàn thành phần thực hành để mở khóa thử thách.",
  };
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  return (
    <>
      <PageHeading
        eyebrow="BÀI TẬP"
        title={lesson.title}
        description={`${assignment.classroom.name} · ${assignment.dueDate ? `Hạn ${new Date(assignment.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}`}
      />
      <section className="panel lesson-content">
        <p className="eyebrow">
          {lesson.subject?.name} · LỚP {lesson.grade ?? lesson.subject?.grade}
        </p>
        <h2>{lesson.topic}</h2>
        <div className="notice">
          <b>Mục tiêu học tập:</b> {lesson.learningObjective}
          <br />
          <b>Kiến thức nền:</b> {lesson.prerequisites || "Không yêu cầu"}
        </div>
        {assignment.overdue && <Badge tone="outline">Đã quá hạn nhưng vẫn có thể học</Badge>}
        {pathway?.contentArchived && (
          <p className="notice" role="status">Nội dung này không còn được cập nhật. Em vẫn có thể học tiếp phần đã bắt đầu.</p>
        )}
        <AttributionNote value={pathway?.attribution} />
        {assignment.contentType === "lesson" && pathway ? (
          <>
          {pathway.steps.some((step) => ["READING", "VIDEO", "STUDY_CARDS"].includes(step.type) && step.state !== "COMPLETED") && (
            <div className="notice"><b>Bài học chưa hoàn tất</b><p>Hãy đọc nội dung và xem video trong mục Bài học trước. Bài kiểm tra và phần thực hành sẽ mở theo tiến độ đã được lưu.</p><Link className="primary" to={`/lessons/${lesson.id}`}>Quay lại Bài học <ArrowUpRight size={15} /></Link></div>
          )}
          {!pathway.steps.some((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)) && <Empty>Bài tập này chưa có bài kiểm tra hoặc hoạt động thực hành.</Empty>}
          <div className="lesson-pathway" aria-label="Bài tập và thực hành">
            <ol className="pathway-steps">
              {pathway.steps.filter((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)).map((step, index) => (
                <li
                  id={"step-" + step.id}
                  className={"pathway-step pathway-step--" + step.state.toLowerCase()}
                  key={step.id}
                >
                  <div className="pathway-step-heading">
                    <div>
                      <span className="pathway-position">Bước {index + 1}</span>
                      <h3>{stepNames[step.type]}</h3>
                    </div>
                    <Badge tone={step.state === "COMPLETED" ? "passed" : "outline"}>
                      {stateNames[step.state]}
                    </Badge>
                  </div>
                  {step.state === "LOCKED" && (
                    <p className="pathway-lock">{step.lockReasonCode ? lockReasons[step.lockReasonCode] : "Bước học chưa khả dụng"}</p>
                  )}
                  {step.type === "QUIZ" && ["IN_PROGRESS", "COMPLETED"].includes(step.state) && (
                    <QuizLearningStep
                      lessonId={String(lessonId)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId], updatedPathway)
                      }
                    />
                  )}
                  {(step.type === "LAB" || step.type === "CHALLENGE") && step.state !== "LOCKED" && (
                    <PracticalPathwayStep
                      lessonId={String(lessonId)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId], updatedPathway)
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
            {nextStep && ["QUIZ", "LAB", "CHALLENGE"].includes(nextStep.type) && (
              <a className="primary pathway-continue" href={"#step-" + nextStep.id}>
                {continueNames[nextStep.type]}
              </a>
            )}
          </div>
          </>
        ) : (
          <Link className="primary" to={"/labs/" + content.id}>
            Mở phòng lab <ArrowUpRight size={16} />
          </Link>
        )}
      </section>
    </>
  );
}
export function ProgressPage() {
  const user = useAuth((s) => s.user)!;
  const [student, setStudent] = useState(
    user.role === "STUDENT" ? user.id : "",
  );
  const children = useQuery({
    queryKey: ["children"],
    queryFn: () => api("/children"),
    enabled: user.role === "PARENT",
  });
  const q = useQuery({
    queryKey: ["progress", student],
    queryFn: () => api(user.role === "PARENT" ? "/children/" + student + "/progress" : "/progress/" + student),
    enabled: !!student && user.role !== "STUDENT",
  });
  const link = useAction((code: string) =>
    api("/children/link", "POST", { code }),
  );
  const verifyEmail = useAction(() => api("/auth/email/verify", "POST"));
  const consent = useAction(() => api("/auth/consents", "POST", { purpose: "PARENT_CHILD_PROGRESS", version: "2026-10-v1", contentHash: "dev" }));
  const unlink = useAction((id: string) => api("/children/" + id + "/link", "DELETE"));
  return (
    <>
      <PageHeading
        eyebrow="TỪNG BƯỚC TIẾN BỘ"
        title={
          user.role === "PARENT" ? "Đồng hành cùng con" : "Tiến độ học tập"
        }
        description="Mỗi lần thử đều là một bước tiến trong hành trình hiểu biết."
      />
      {user.role === "PARENT" && (
        <section className="panel">
          <h3>Học sinh đã liên kết</h3>
          <div className="button-row">
            <button className="secondary" onClick={() => verifyEmail.mutate()}>Xác minh email</button>
            <button className="secondary" onClick={() => consent.mutate()}>Chấp thuận theo dõi tiến độ</button>
          </div>
          <div className="button-row">
            {children.data?.map((c: any) => (
              <span key={c.student.id}>
                <button className="secondary" onClick={() => setStudent(c.student.id)}>{c.student.fullName}</button>
                <button className="icon-button" aria-label="Hủy liên kết" onClick={() => unlink.mutate(c.student.id)}>×</button>
              </span>
            ))}
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              link.mutate(String(new FormData(e.currentTarget).get("code")));
            }}
          >
            <Field label="Mã liên kết do con cung cấp" name="code" required />
            <button className="primary" disabled={link.isPending}>
              Liên kết
            </button>
          </form>
          <p className="tiny muted">
            Liên kết chỉ hiển thị tiến độ tổng hợp và hoạt động an toàn của con; không hiển thị đáp án, gợi ý hoặc trạng thái lab thô.
          </p>
          <ErrorBox error={link.error || children.error} />
        </section>
      )}
      {user.role === "STUDENT" ? (
        <StudentProgress />
      ) : ["TEACHER", "ADMIN"].includes(user.role) ? (
        <Empty>
          {user.role === "TEACHER" ? (
            <Link to="/classes">
              Mở lớp học để xem phân tích từng học sinh →
            </Link>
          ) : (
            <Link to="/admin">Mở quản trị để xem người dùng →</Link>
          )}
        </Empty>
      ) : (
        <>
          <ErrorBox error={q.error} />
          {q.data ? (
            <>
              <div className="progress-cards">
                {q.data.progress.map((p: any) => (
                  <div className="panel" key={p.contentId}>
                    <Badge>
                      {p.status === "completed" ? "Hoàn thành" : "Đang học"}
                    </Badge>
                    <h3>
                      {{
                        circuit: "Mạch điện",
                        eye: "Mắt người",
                        chemistry: "Phản ứng hóa học",
                      }[p.contentId as string] ?? p.contentId}
                    </h3>
                    <div className="progress-track">
                      <i style={{ width: p.score + "%" }} />
                    </div>
                    <p>
                      {Math.round(p.score)} điểm · {p.attemptsCount} lần thử
                    </p>
                    <small>Mức trợ giúp cao nhất: {p.lastHintLevel}/4</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>Lịch sử thực hành</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Thử thách</th>
                        <th>Kết quả</th>
                        <th>Thời lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.data.attempts.map((a: any) => (
                        <tr key={a.id}>
                          <td>
                            {new Date(a.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td>{a.challengeId}</td>
                          <td>
                            <Badge tone={a.verdict}>
                              {verdictLabel(a.verdict)}
                            </Badge>
                          </td>
                          <td>{Math.round(a.durationMs / 1000)} giây</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {q.data.attempts.length === 0 && (
                  <Empty>Chưa có lượt thực hành.</Empty>
                )}
              </section>
            </>
          ) : q.isLoading && student ? (
            <InlineLoader message="Đang phân tích tiến độ học tập…" />
          ) : (
            <Empty>
              {student ? "Chưa có dữ liệu tiến độ." : "Chọn học sinh để xem tiến độ."}
            </Empty>
          )}
        </>
      )}
    </>
  );
}
export function Saved() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => api("/saved") });
  const del = useAction((id: string) => api("/saved/" + id, "DELETE"));
  return (
    <>
      <PageHeading
        title="Thí nghiệm đã lưu"
        description="Mở lại cấu hình, tiếp tục thử và khám phá điều mới."
      />
      <ErrorBox error={q.error || del.error} />
      <div className="lesson-grid">
        {q.isLoading && <CardSkeleton count={3} />}
        {q.data?.map((s: any) => (
          <article className="panel" key={s.id}>
            <Badge>{s.labId}</Badge>
            <h3>{s.note}</h3>
            <p>{new Date(s.createdAt).toLocaleString("vi-VN")}</p>
            <Badge tone={s.simulationResult.verdict}>
              {verdictLabel(s.simulationResult.verdict)}
            </Badge>
            <div className="card-footer">
              <Link to={"/labs/" + s.labId} state={{ labState: s.labState }}>
                Mở lại thí nghiệm →
              </Link>
              <button
                className="icon-button"
                aria-label="Xóa bản lưu"
                onClick={() => del.mutate(s.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {q.data && q.data.length === 0 && (
        <Empty>
          Chạy một thí nghiệm rồi chọn “Lưu thí nghiệm” để bắt đầu hồ sơ.
        </Empty>
      )}
    </>
  );
}
export function SettingsPage() {
  const user = useAuth((s) => s.user)!;
  const [code, setCode] = useState("");
  const change = useAction((b: any) => api("/auth/password", "POST", b));
  const link = useAction(async () => {
    const r = await api("/parent-code", "POST");
    setCode(r.code);
  });
  return (
    <>
      <PageHeading title="Cài đặt tài khoản" />
      <section className="panel narrow">
        <h2>{user.fullName}</h2>
        <p>{user.email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <Field
            label="Mật khẩu hiện tại"
            name="currentPassword"
            type="password"
            required
          />
          <Field
            label="Mật khẩu mới (ít nhất 12 ký tự)"
            name="password"
            type="password"
            minLength={12}
            required
          />
          <button className="primary" disabled={change.isPending}>
            Đổi mật khẩu
          </button>
          <ErrorBox error={change.error} />
          {change.isSuccess && (
            <p className="notice">
              Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.
            </p>
          )}
        </form>
      </section>
      {user.role === "STUDENT" && (
        <section className="panel narrow">
          <h3>Liên kết phụ huynh</h3>
          <p>
            Tạo mã và gửi riêng cho phụ huynh của em. Mã chỉ dùng được một lần.
          </p>
          <button className="secondary" onClick={() => link.mutate(null)}>
            Tạo mã liên kết
          </button>
          {code && <code className="link-code">{code}</code>}
          <ErrorBox error={link.error} />
        </section>
      )}
    </>
  );
}
export { default as AdminPage } from "./Admin";

