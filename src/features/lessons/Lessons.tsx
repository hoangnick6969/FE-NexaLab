import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpRight, BookOpen, Save } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, idempotencyKey, isApiError, mutate, useAuth, uploadFile } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, Modal, useAction, CardSkeleton } from "../../components/ui";
import { buildStudentLessonCatalog, filterStudentLessonCatalog, type StudentLessonCard } from "./lesson-catalog";
import { CoverageTable, LibraryFiltersBar, PreviewModal, ReleaseReviews, TaxonomyFields, libraryQuery, type LibraryFilters } from "./library";
import { ReviewChecklist, RichEditor } from "./LessonEditorFields";

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

const lessonNumber = (title: string) => Number(title.match(/^\s*Bài\s+(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);

export function Lessons() {
  const user = useAuth((s) => s.user)!;
  const manage = ["TEACHER", "ADMIN"].includes(user.role);
  const q = useQuery({
    queryKey: [manage ? "lessons" : "open-curriculum"],
    queryFn: async () => {
      if (manage) return api<any[]>("/lessons");
      const catalog = await api<any>("/open-curriculum");
      return (catalog.subjects ?? []).flatMap((subject: any) =>
        subject.grades.flatMap((grade: any) =>
          grade.chapters.flatMap((chapter: any) => [
            ...chapter.lessons,
            ...chapter.topics.flatMap((topic: any) => topic.lessons),
          ].map((lesson: any) => ({
            ...lesson,
            chapterOrder: chapter.officialOrder,
            subject: { id: subject.id, name: subject.name, ebookUrl: subject.ebookUrl },
          }))),
        ),
      );
    },
  });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<any[]>("/subjects") });
  const assignedLessonDetails = useQuery({
    queryKey: ["lesson-hub-assigned", user.id],
    enabled: !manage,
    queryFn: async () => {
      const [assignments, lessons] = await Promise.all([api<any[]>("/assignments"), api<any[]>("/lessons")]);
      const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
      const eligibleAssignments = assignments.filter((assignment) => assignment.contentType === "lesson" && assignment.canOpen !== false);
      const missingLessons = await Promise.all(eligibleAssignments
        .filter((assignment) => !lessonsById.has(assignment.contentId))
        .map(async (assignment) => ({ assignment, lesson: (await api<any>(`/assignments/${encodeURIComponent(assignment.id)}`)).content })));
      for (const { assignment, lesson } of missingLessons) lessonsById.set(assignment.contentId, lesson);
      return eligibleAssignments.flatMap((assignment) => {
        const lesson = lessonsById.get(assignment.contentId);
        return lesson ? [{ assignment, lesson }] : [];
      });
    },
  });
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
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
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
  const studentCatalog = buildStudentLessonCatalog((q.data ?? []) as StudentLessonCard[], assignedLessonDetails.data ?? []);
  const lessonMatches = manage
    ? (q.data ?? []).filter((l: any) =>
      (filter === "all" || (filter === "khtn" && khtnSubjectIds.has(l.subjectId))) &&
      l.title.toLowerCase().includes(search.toLowerCase()) &&
      (!filtersActive || meta.has(l.id)),
    )
    : filterStudentLessonCatalog(studentCatalog, filter as "all" | "assigned" | "shared", selectedSubjectId, selectedGrade, search);
  const groups = new Map<string, { chapter: string; grade: number; lessons: any[]; order: number; subjectId: string; subjectName: string }>();
  for (const lesson of lessonMatches) {
    const chapter = lesson.chapter?.trim() || "Chưa phân chương";
    const key = `${lesson.subjectId}:${lesson.grade}:${chapter.toLocaleLowerCase("vi")}`;
    const group: { chapter: string; grade: number; lessons: any[]; order: number; subjectId: string; subjectName: string } = groups.get(key) ?? { chapter, grade: lesson.grade, lessons: [], order: Number.MAX_SAFE_INTEGER, subjectId: lesson.subjectId, subjectName: lesson.subject?.name ?? "Môn học" };
    group.lessons.push(lesson);
    group.order = Math.min(group.order, manage ? lessonNumber(lesson.title) : lesson.chapterOrder ?? Number.MAX_SAFE_INTEGER);
    groups.set(key, group);
  }
  const chapterGroups = [...groups.values()]
    .map((group) => ({ ...group, lessons: group.lessons.sort((a, b) => manage ? lessonNumber(a.title) - lessonNumber(b.title) || a.title.localeCompare(b.title, "vi") : (a.curriculumOrder ?? Number.MAX_SAFE_INTEGER) - (b.curriculumOrder ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.grade - b.grade || a.order - b.order || a.chapter.localeCompare(b.chapter, "vi"));
  const renderLessonCard = (l: any) => (
    <article className={`panel lesson-card${manage ? "" : " student-lesson-card"}`} key={l.id}>
      <div className="lesson-card-top">
        <span className={`subject-icon ${khtnSubjectIds.has(l.subjectId) ? "khtn" : l.subjectId}`}><BookOpen /></span>
        {manage ? <Badge>{l.status === "published" ? "Đã xuất bản" : l.status === "draft" ? "Bản nháp" : "Lưu trữ"}</Badge> : l.assignments?.length ? <Badge>Được giao</Badge> : <span className="student-lesson-kind"><BookOpen size={14} /> Bài học chung</span>}
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
        {manage ? <button className="text-button" onClick={() => navigate(`/lessons/${l.id}`)}>Mở bài học <ArrowUpRight size={16} /></button> : l.assignments?.length ? l.assignments.map((assignment: any) => <Link className="student-lesson-open" key={assignment.id} to={`/assignments/${assignment.id}`}>{assignment.title} · {assignment.classroom.name}{assignment.dueDate ? ` · Hạn ${new Date(assignment.dueDate).toLocaleDateString("vi-VN")}` : ""} <ArrowUpRight size={16} /></Link>) : <button className="student-lesson-open" onClick={() => navigate(`/lessons/${l.id}`)}>Vào bài học <ArrowUpRight size={16} /></button>}
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
        description={manage ? "Chọn bài học để tiếp tục." : "Khám phá các môn học, bài học chung đã phát hành và bài được giao."}
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
        {!manage && <>
          <label className="sr-only" htmlFor="open-curriculum-subject">Môn học</label>
          <select id="open-curriculum-subject" aria-label="Chọn môn học" value={selectedSubjectId} onChange={(event) => { setSelectedSubjectId(event.target.value); setSelectedGrade("all"); }}>
            <option value="all">Tất cả môn học</option>
            {subjects.data?.map((subject: any) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          {selectedSubjectId !== "all" && <>
            <label className="sr-only" htmlFor="open-curriculum-grade">Khối lớp</label>
            <select id="open-curriculum-grade" aria-label="Chọn khối lớp" value={selectedGrade} onChange={(event) => setSelectedGrade(event.target.value)}>
              <option value="all">Tất cả khối</option>
              {[...new Set(studentCatalog.filter((lesson) => lesson.subjectId === selectedSubjectId).map((lesson) => lesson.grade))].sort((a, b) => a - b).map((grade) => <option key={grade} value={grade}>Lớp {grade}</option>)}
            </select>
          </>}
        </>}
        <div className="tabs">
          {(manage ? [["all", "Tất cả"], ["khtn", "Khoa học tự nhiên"]] : [["all", "Tất cả"], ["assigned", "Được giao"], ["shared", "Bài học chung"]]).map(([id, name]) => (
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
      <ErrorBox error={q.error || assignedLessonDetails.error || subjects.error || clone.error} />
      {!manage && (q.error || assignedLessonDetails.error || subjects.error) && <button type="button" className="text-button" onClick={() => { void q.refetch(); void assignedLessonDetails.refetch(); void subjects.refetch(); }}>Thử tải lại</button>}
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
      </div> : <div className="student-lesson-sections">
        {(q.isLoading || assignedLessonDetails.isLoading) && <div className="lesson-grid"><CardSkeleton count={3} /></div>}
        {filter !== "shared" && <section className="student-lesson-section" aria-labelledby="assigned-lessons-title">
          <header className="lesson-chapter-heading"><div><span className="eyebrow">BÀI TẬP CỦA EM</span><h2 id="assigned-lessons-title">Bài học được giao</h2></div><span className="lesson-chapter-count">{lessonMatches.filter((lesson: any) => lesson.assignments.length).length} bài</span></header>
          {lessonMatches.filter((lesson: any) => lesson.assignments.length).length ? <div className="lesson-grid">{lessonMatches.filter((lesson: any) => lesson.assignments.length).map(renderLessonCard)}</div> : filter === "assigned" && !assignedLessonDetails.isLoading && !assignedLessonDetails.error && <Empty>Chưa có bài học nào được giao. Bài học chung vẫn mở cho em.</Empty>}
        </section>}
        {filter !== "assigned" && <section className="student-lesson-section" aria-labelledby="shared-lessons-title">
          <header className="lesson-chapter-heading"><div><span className="eyebrow">OPEN CURRICULUM</span><h2 id="shared-lessons-title">Bài học chung</h2></div></header>
          {chapterGroups.map((group) => {
            const lessons = lessonMatches.filter((lesson: any) => !lesson.assignments.length && lesson.subjectId === group.subjectId && lesson.grade === group.grade && lesson.chapter === group.chapter);
            return lessons.length ? <section className="lesson-chapter-group" key={`${group.subjectId}-${group.grade}-${group.chapter}`}><header className="lesson-chapter-heading"><div><span className="eyebrow">{group.subjectName} · LỚP {group.grade}</span><h3>{group.chapter}</h3></div><span className="lesson-chapter-count">{lessons.length} bài</span></header><div className="lesson-grid">{lessons.map(renderLessonCard)}</div></section> : null;
          })}
          {lessonMatches.filter((lesson: any) => !lesson.assignments.length).length === 0 && !q.isLoading && !q.error && <Empty>{studentCatalog.some((lesson: any) => !lesson.assignments.length) ? "Không tìm thấy bài học chung phù hợp." : "Chưa có bài học chung được phát hành cho lựa chọn này."}</Empty>}
        </section>}
      </div>}
      {!manage && <section className="student-subject-previews" aria-labelledby="subject-preview-title">
        <div className="student-subject-previews-heading"><div><span className="eyebrow">THƯ VIỆN MÔN HỌC</span><h2 id="subject-preview-title">Các môn học</h2></div><p>Môn học và tài liệu tham khảo đã cấu hình</p></div>
        <div className="subject-preview-grid">{subjects.data?.map((subject: any) => <article className="subject-preview-card" key={subject.id}><div className="subject-preview-title"><h3>{subject.name}</h3></div><p>{studentCatalog.some((lesson: any) => lesson.subjectId === subject.id) ? "Có bài học trong danh sách phía trên." : "Chưa có bài học được phát hành hoặc giao cho môn này."}</p></article>)}</div>
      </section>}
      {!manage && <p className="student-lab-catalog-link"><Link to="/labs">Khám phá phòng Lab nền tảng <ArrowUpRight size={16} /></Link></p>}
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
