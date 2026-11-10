import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpRight, BookOpen, Save } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, idempotencyKey, isApiError, mutate, useAuth, uploadFile } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, Modal, useAction, CardSkeleton } from "../../components/ui";
import { buildStudentLessonCatalog, filterStudentLessonCatalog, type StudentLessonCard } from "./lesson-catalog";
// TAI-06: the AI lab-challenge panel is teacher-only code, loaded on demand so the student lesson hub never carries it.
const LabChallengeEntry = lazy(() => import("../lab-challenge/LabChallengePanel"));
import { CoverageTable, LibraryFiltersBar, PreviewModal, ReleaseReviews, TaxonomyFields, libraryQuery, type LibraryFilters } from "./library";
import { ReviewChecklist, RichEditor } from "./LessonEditorFields";
import { StudentLessonsHub } from "./StudentLessonsHub";
import { SubjectCover } from "../../components/SubjectGradeChapterBrowser";
import { defineText, formatDate } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    published: "Đã xuất bản",
    draft: "Bản nháp",
    archived: "Lưu trữ",
    assignedBadge: "Được giao",
    shared: "Bài học chung",
    sharedBase: "Bài nền dùng chung",
    privateCopy: "Bản riêng",
    sample: "Dữ liệu mẫu",
    inUse: "Đang được dùng",
    customChallenge: "Thử thách tùy chỉnh",
    naturalScience: "Khoa học tự nhiên",
    gradeCaps: (grade: number) => `LỚP ${grade}`,
    grade: (grade: number) => `Lớp ${grade}`,
    openLesson: "Mở bài học",
    enterLesson: "Vào bài học",
    edit: "Chỉnh sửa",
    preview: "Xem trước",
    makeCopy: "Tạo bản riêng",
    eyebrow: "THƯ VIỆN KIẾN THỨC",
    title: "Bài học",
    manageIntro: "Chọn bài học để tiếp tục.",
    studentIntro: "Khám phá các môn học, bài học chung đã phát hành và bài được giao.",
    createLesson: "Tạo bài học",
    referenceBooks: "Sách tham khảo theo môn",
    referenceTitle: "Sách tham khảo",
    referenceIntro: "Mở sách giáo khoa trực tuyến theo môn học.",
    subject: "Môn học",
    chooseSubject: "Chọn môn học",
    allSubjects: "Tất cả môn học",
    gradeLabel: "Khối lớp",
    chooseGrade: "Chọn khối lớp",
    allGrades: "Tất cả khối",
    all: "Tất cả",
    assigned: "Được giao",
    search: "Tìm bài học",
    searchPlaceholder: "Tìm tên bài học…",
    reload: "Thử tải lại",
    retry: "Thử lại",
    yourAssignments: "BÀI TẬP CỦA EM",
    assignedLessons: "Bài học được giao",
    count: (n: number) => `${n} bài`,
    noAssigned: "Chưa có bài học nào được giao. Bài học chung vẫn mở cho em.",
    noSharedMatch: "Không tìm thấy bài học chung phù hợp.",
    noSharedPublished: "Chưa có bài học chung được phát hành cho lựa chọn này.",
    subjectLibrary: "THƯ VIỆN MÔN HỌC",
    subjects: "Các môn học",
    subjectsIntro: "Môn học và tài liệu tham khảo đã cấu hình",
    hasLessons: "Có bài học trong danh sách phía trên.",
    noLessons: "Chưa có bài học được phát hành hoặc giao cho môn này.",
    exploreLabs: "Khám phá phòng Lab nền tảng",
    noFilterMatch: "Không có bài học khớp bộ lọc. Hãy bỏ bớt điều kiện lọc hoặc tạo bài riêng cho yêu cầu cần đạt này.",
    editLesson: "Chỉnh sửa bài học",
    copyNotice: "Bản riêng tạo từ một bài khác. Thay đổi ở đây không ảnh hưởng bài gốc hay các lớp khác.",
    lockedNotice: "Bài đang được giao hoặc đã có kết quả học tập: chỉ sửa được thông tin mô tả hoặc lưu trữ. Để đổi nội dung, câu hỏi hay phòng lab, hãy",
    makeCopyLower: "tạo bản riêng",
    fields: { title: "Tên bài", chapter: "Chương", topic: "Chủ đề", learningObjective: "Mục tiêu", prerequisites: "Kiến thức nền", curriculum: "Chuẩn chương trình" },
    physics: "Vật lý",
    biology: "Sinh học",
    chemistry: "Hóa học",
    attachedLab: "Lab đính kèm",
    noneOption: "Không có",
    circuit: "Mạch điện",
    eye: "Mắt người",
    reaction: "Phản ứng",
    scope: "Phạm vi",
    privateLesson: "Bài riêng",
    sharedLibrary: "Thư viện chung (cần duyệt có tên)",
    status: "Trạng thái",
    draftOption: "Bản nháp",
    publish: "Xuất bản",
    archive: "Lưu trữ",
    theory: "Nội dung lý thuyết",
    materials: "Học liệu",
    upload: "Tải PDF / ảnh (tối đa 20 MB) hoặc video MP4 (tối đa 300 MB)",
    materialName: "Tên học liệu",
    materialUrl: "URL video / PDF / ảnh",
    materialType: "Loại học liệu",
    image: "Ảnh",
    transcript: "Bản chép lời video (bắt buộc khi xuất bản)",
    removeMaterial: "Xóa học liệu",
    addMaterialUrl: "Thêm học liệu URL",
    question: (n: number) => `Câu ${n}`,
    option: (n: number) => `Đáp án ${n}`,
    correctAnswer: "Đáp án đúng",
    removeQuestion: "Xóa câu hỏi",
    addQuestion: "Thêm câu hỏi",
    copyToChange: "Tạo bản riêng để thay đổi",
    saveLesson: "Lưu bài học",
  },
  en: {
    published: "Published",
    draft: "Draft",
    archived: "Archived",
    assignedBadge: "Assigned",
    shared: "Shared lesson",
    sharedBase: "Shared base lesson",
    privateCopy: "Private copy",
    sample: "Sample data",
    inUse: "In use",
    customChallenge: "Custom challenge",
    naturalScience: "Natural science",
    gradeCaps: (grade: number) => `GRADE ${grade}`,
    grade: (grade: number) => `Grade ${grade}`,
    openLesson: "Open lesson",
    enterLesson: "Go to lesson",
    edit: "Edit",
    preview: "Preview",
    makeCopy: "Make a private copy",
    eyebrow: "KNOWLEDGE LIBRARY",
    title: "Lessons",
    manageIntro: "Choose a lesson to continue.",
    studentIntro: "Explore subjects, published shared lessons and assigned work.",
    createLesson: "Create lesson",
    referenceBooks: "Reference books by subject",
    referenceTitle: "Reference books",
    referenceIntro: "Open the online textbook for each subject.",
    subject: "Subject",
    chooseSubject: "Choose a subject",
    allSubjects: "All subjects",
    gradeLabel: "Grade",
    chooseGrade: "Choose a grade",
    allGrades: "All grades",
    all: "All",
    assigned: "Assigned",
    search: "Search lessons",
    searchPlaceholder: "Search lesson names…",
    reload: "Reload",
    retry: "Try again",
    yourAssignments: "YOUR ASSIGNMENTS",
    assignedLessons: "Assigned lessons",
    count: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    noAssigned: "No lessons are assigned yet. Shared lessons are still open to you.",
    noSharedMatch: "No shared lessons match.",
    noSharedPublished: "No shared lessons are published for this choice yet.",
    subjectLibrary: "SUBJECT LIBRARY",
    subjects: "Subjects",
    subjectsIntro: "Configured subjects and references",
    hasLessons: "Has lessons in the list above.",
    noLessons: "No lessons are published or assigned for this subject yet.",
    exploreLabs: "Explore the foundation labs",
    noFilterMatch: "No lessons match the filter. Remove some filters or create your own lesson for this outcome.",
    editLesson: "Edit lesson",
    copyNotice: "A private copy of another lesson. Changes here do not affect the original or other classes.",
    lockedNotice: "This lesson is assigned or has results: only its description can be edited, or it can be archived. To change content, questions or the lab,",
    makeCopyLower: "make a private copy",
    fields: { title: "Lesson name", chapter: "Chapter", topic: "Topic", learningObjective: "Objective", prerequisites: "Prerequisites", curriculum: "Curriculum standard" },
    physics: "Physics",
    biology: "Biology",
    chemistry: "Chemistry",
    attachedLab: "Attached lab",
    noneOption: "None",
    circuit: "Circuit",
    eye: "Human eye",
    reaction: "Reaction",
    scope: "Scope",
    privateLesson: "Private lesson",
    sharedLibrary: "Shared library (needs a named review)",
    status: "Status",
    draftOption: "Draft",
    publish: "Publish",
    archive: "Archive",
    theory: "Theory content",
    materials: "Learning materials",
    upload: "Upload PDF / image (up to 20 MB) or MP4 video (up to 300 MB)",
    materialName: "Material name",
    materialUrl: "Video / PDF / image URL",
    materialType: "Material type",
    image: "Image",
    transcript: "Video transcript (required to publish)",
    removeMaterial: "Remove material",
    addMaterialUrl: "Add a material URL",
    question: (n: number) => `Question ${n}`,
    option: (n: number) => `Answer ${n}`,
    correctAnswer: "Correct answer",
    removeQuestion: "Remove question",
    addQuestion: "Add a question",
    copyToChange: "Make a private copy to change it",
    saveLesson: "Save lesson",
  },
});

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
  if (user.role === "STUDENT") return <StudentLessonsHub />;
  return <LessonsLibrary user={user} />;
}

function LessonsLibrary({ user }: { user: any }) {
  const t = text();
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
  const studentCatalog = buildStudentLessonCatalog((q.data ?? []) as StudentLessonCard[], assignedLessonDetails.data ?? [], []);
  const lessonMatches = manage
    ? (q.data ?? []).filter((l: any) =>
      (filter === "all" || (filter === "khtn" && khtnSubjectIds.has(l.subjectId))) &&
      l.title.toLowerCase().includes(search.toLowerCase()) &&
      (!filtersActive || meta.has(l.id)),
    )
    : filterStudentLessonCatalog(studentCatalog, filter as "all" | "assigned" | "shared", selectedSubjectId, selectedGrade, search);
  const groups = new Map<string, { chapter: string; grade: number; lessons: any[]; order: number; subjectId: string; subjectName: string }>();
  for (const lesson of lessonMatches) {
    const chapter = lesson.chapter?.trim() || commonText().noChapter;
    const key = `${lesson.subjectId}:${lesson.grade}:${chapter.toLocaleLowerCase("vi")}`;
    const group: { chapter: string; grade: number; lessons: any[]; order: number; subjectId: string; subjectName: string } = groups.get(key) ?? { chapter, grade: lesson.grade, lessons: [], order: Number.MAX_SAFE_INTEGER, subjectId: lesson.subjectId, subjectName: lesson.subject?.name ?? commonText().subject };
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
        {manage ? <Badge>{l.status === "published" ? t.published : l.status === "draft" ? t.draft : t.archived}</Badge> : l.assignments?.length ? <Badge>{t.assignedBadge}</Badge> : <span className="student-lesson-kind"><BookOpen size={14} /> {t.shared}</span>}
      </div>
      {manage && <div className="badge-row">
        <Badge tone="outline">{l.scope === "SHARED_LIBRARY" ? t.sharedBase : t.privateCopy}</Badge>
        {l.synthetic && <Badge tone="outline">{t.sample}</Badge>}
        {meta.get(l.id)?.structureLocked && <Badge tone="outline">{t.inUse}</Badge>}
        {meta.get(l.id)?.hasChallengeVariant && <Badge tone="outline">{t.customChallenge}</Badge>}
      </div>}
      <small className="eyebrow">{khtnSubjectIds.has(l.subjectId) ? t.naturalScience : l.subject.name} · {t.gradeCaps(l.grade)}</small>
      <h3>{l.title}</h3>
      {l.learningObjective && (manage || !/dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(l.learningObjective)) && <p>{l.learningObjective}</p>}
      {!manage && <div className="student-lesson-context"><span>{l.chapter || commonText().noChapter}</span>{l.topic && <span>{l.topic}</span>}</div>}
      <div className="card-footer">
        {manage ? <button className="text-button" onClick={() => navigate(`/lessons/${l.id}`)}>{t.openLesson} <ArrowUpRight size={16} /></button> : l.assignments?.length ? l.assignments.map((assignment: any) => <Link className="student-lesson-open" key={assignment.id} to={`/assignments/${assignment.id}`}>{assignment.title} · {assignment.classroom.name}{assignment.dueDate ? ` · ${commonText().due(formatDate(assignment.dueDate))}` : ""} <ArrowUpRight size={16} /></Link>) : <button className="student-lesson-open" onClick={() => navigate(`/lessons/${l.id}`)}>{t.enterLesson} <ArrowUpRight size={16} /></button>}
        {manage && ((l.authorId === user.id && l.scope !== "SHARED_LIBRARY") || user.role === "ADMIN") && <button className="text-button" onClick={() => setEdit(l)}>{t.edit}</button>}
        {manage && <button className="text-button" onClick={() => setPreviewId(l.id)}>{t.preview}</button>}
        {manage && <button className="text-button" disabled={clone.isPending} onClick={() => startClone(l.id)}>{t.makeCopy}</button>}
      </div>
    </article>
  );
  return (
    <div className="student-lessons-page">
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={manage ? t.manageIntro : t.studentIntro}
        action={
          manage ? (
            <button
              className="primary"
              onClick={() => setEdit({ ...blankLesson })}
            >
              <Plus size={16} />
              {t.createLesson}
            </button>
          ) : null
        }
      />
      {subjects.data?.some((subject: any) => safeEbookUrl(subject.ebookUrl) || subject.ebookEditions?.some((edition: any) => safeEbookUrl(edition.url))) && (
        <section className="subject-ebook-links" aria-label={t.referenceBooks}>
          <h2>{t.referenceTitle}</h2>
          <p>{t.referenceIntro}</p>
          <div>
            {subjects.data.filter((subject: any) => safeEbookUrl(subject.ebookUrl) || subject.ebookEditions?.some((edition: any) => safeEbookUrl(edition.url))).flatMap((subject: any) => {
              const editions = subject.ebookEditions?.length ? subject.ebookEditions : [{ id: subject.id, version: "", coverAssetVersionId: null }];
              const current = editions.find((edition: any) => edition.isCurrent) ?? editions[editions.length - 1];
              const editionGrade = /(?:khtn|grade)[-_ ]?(\d{1,2})/i.exec(`${current.version ?? ""} ${current.url ?? ""}`)?.[1];
              return <Link className="subject-ebook-card" key={`${subject.id}:${current.id}`} to={`/ebooks/${subject.id}`}>
                <SubjectCover subjectId={subject.id} subjectName={subject.name} versionId={current.coverAssetVersionId} />
                <span><b>{subject.name}</b><small>{editionGrade ? t.grade(Number(editionGrade)) : t.referenceTitle}</small></span>
              </Link>;
            })}
          </div>
        </section>
      )}
      <div className="filter-bar">
        {!manage && <>
          <label className="sr-only" htmlFor="open-curriculum-subject">{t.subject}</label>
          <select id="open-curriculum-subject" aria-label={t.chooseSubject} value={selectedSubjectId} onChange={(event) => { setSelectedSubjectId(event.target.value); setSelectedGrade("all"); }}>
            <option value="all">{t.allSubjects}</option>
            {subjects.data?.map((subject: any) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          {selectedSubjectId !== "all" && <>
            <label className="sr-only" htmlFor="open-curriculum-grade">{t.gradeLabel}</label>
            <select id="open-curriculum-grade" aria-label={t.chooseGrade} value={selectedGrade} onChange={(event) => setSelectedGrade(event.target.value)}>
              <option value="all">{t.allGrades}</option>
              {[...new Set(studentCatalog.filter((lesson) => lesson.subjectId === selectedSubjectId).map((lesson) => lesson.grade))].sort((a, b) => a - b).map((grade) => <option key={grade} value={grade}>{t.grade(grade)}</option>)}
            </select>
          </>}
        </>}
        <div className="tabs">
          {(manage ? [["all", t.all], ["khtn", t.naturalScience]] : [["all", t.all], ["assigned", t.assigned], ["shared", t.shared]]).map(([id, name]) => (
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
          aria-label={t.search}
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ErrorBox error={q.error || assignedLessonDetails.error || subjects.error || clone.error} />
      {!manage && (q.error || assignedLessonDetails.error || subjects.error) && <button type="button" className="text-button" onClick={() => { void q.refetch(); void assignedLessonDetails.refetch(); void subjects.refetch(); }}>{t.reload}</button>}
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
            {t.retry}
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
          <header className="lesson-chapter-heading"><div><span className="eyebrow">{t.yourAssignments}</span><h2 id="assigned-lessons-title">{t.assignedLessons}</h2></div><span className="lesson-chapter-count">{t.count(lessonMatches.filter((lesson: any) => lesson.assignments.length).length)}</span></header>
          {lessonMatches.filter((lesson: any) => lesson.assignments.length).length ? <div className="lesson-grid">{lessonMatches.filter((lesson: any) => lesson.assignments.length).map(renderLessonCard)}</div> : filter === "assigned" && !assignedLessonDetails.isLoading && !assignedLessonDetails.error && <Empty>{t.noAssigned}</Empty>}
        </section>}
        {filter !== "assigned" && <section className="student-lesson-section" aria-labelledby="shared-lessons-title">
          <header className="lesson-chapter-heading"><div><span className="eyebrow">OPEN CURRICULUM</span><h2 id="shared-lessons-title">{t.shared}</h2></div></header>
          {chapterGroups.map((group) => {
            const lessons = lessonMatches.filter((lesson: any) => !lesson.assignments.length && lesson.subjectId === group.subjectId && lesson.grade === group.grade && lesson.chapter === group.chapter);
            return lessons.length ? <section className="lesson-chapter-group" key={`${group.subjectId}-${group.grade}-${group.chapter}`}><header className="lesson-chapter-heading"><div><span className="eyebrow">{group.subjectName} · {t.gradeCaps(group.grade)}</span><h3>{group.chapter}</h3></div><span className="lesson-chapter-count">{t.count(lessons.length)}</span></header><div className="lesson-grid">{lessons.map(renderLessonCard)}</div></section> : null;
          })}
          {lessonMatches.filter((lesson: any) => !lesson.assignments.length).length === 0 && !q.isLoading && !q.error && <Empty>{studentCatalog.some((lesson: any) => !lesson.assignments.length) ? t.noSharedMatch : t.noSharedPublished}</Empty>}
        </section>}
      </div>}
      {!manage && <section className="student-subject-previews" aria-labelledby="subject-preview-title">
        <div className="student-subject-previews-heading"><div><span className="eyebrow">{t.subjectLibrary}</span><h2 id="subject-preview-title">{t.subjects}</h2></div><p>{t.subjectsIntro}</p></div>
        <div className="subject-preview-grid">{subjects.data?.map((subject: any) => <article className="subject-preview-card" key={subject.id}><div className="subject-preview-title"><h3>{subject.name}</h3></div><p>{studentCatalog.some((lesson: any) => lesson.subjectId === subject.id) ? t.hasLessons : t.noLessons}</p></article>)}</div>
      </section>}
      {!manage && <p className="student-lab-catalog-link"><Link to="/labs">{t.exploreLabs} <ArrowUpRight size={16} /></Link></p>}
      {filtersActive && library.data && library.data.items.length === 0 && (
        <Empty>{t.noFilterMatch}</Empty>
      )}
      {edit && (
        <Modal
          title={edit.id ? t.editLesson : t.createLesson}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(edit, { onSuccess: () => setEdit(null) });
            }}
          >
            {edit.clonedFromId && (
              <p className="notice">{t.copyNotice}</p>
            )}
            {meta.get(edit.id)?.structureLocked && (
              <p className="notice">
                {t.lockedNotice}{" "}
                <button type="button" className="text-button" onClick={() => startClone(edit.id)}>
                  {t.makeCopyLower}
                </button>
                .
              </p>
            )}
            <div className="form-grid">
              {[
                ["title", t.fields.title],
                ["chapter", t.fields.chapter],
                ["topic", t.fields.topic],
                ["learningObjective", t.fields.learningObjective],
                ["prerequisites", t.fields.prerequisites],
                ["curriculum", t.fields.curriculum],
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
                <span>{t.subject}</span>
                <select
                  value={edit.subjectId}
                  onChange={(e) =>
                    setEdit({ ...edit, subjectId: e.target.value })
                  }
                >
                  <option value="physics">{t.physics}</option>
                  <option value="biology">{t.biology}</option>
                  <option value="chemistry">{t.chemistry}</option>
                </select>
              </label>
              <Field
                label={t.gradeLabel}
                type="number"
                min={6}
                max={9}
                value={edit.grade}
                onChange={(e) =>
                  setEdit({ ...edit, grade: Number(e.target.value) })
                }
              />
              <label className="field">
                <span>{t.attachedLab}</span>
                <select
                  value={edit.labId ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, labId: e.target.value || null, challengeParams: null })
                  }
                >
                  <option value="">{t.noneOption}</option>
                  <option value="circuit">{t.circuit}</option>
                  <option value="eye">{t.eye}</option>
                  <option value="chemistry">{t.reaction}</option>
                </select>
              </label>
              {user.role === "ADMIN" && !edit.id && (
                <label className="field">
                  <span>{t.scope}</span>
                  <select value={edit.scope ?? "TEACHER_PRIVATE"} onChange={(e) => setEdit({ ...edit, scope: e.target.value })}>
                    <option value="TEACHER_PRIVATE">{t.privateLesson}</option>
                    <option value="SHARED_LIBRARY">{t.sharedLibrary}</option>
                  </select>
                </label>
              )}
              <label className="field">
                <span>{t.status}</span>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  <option value="draft">{t.draftOption}</option>
                  <option value="published">{t.publish}</option>
                  <option value="archived">{t.archive}</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>{t.theory}</span>
              <RichEditor
                value={edit.content}
                onChange={(v) => setEdit((s: any) => ({ ...s, content: v }))}
              />
            </label>
            <h3>{t.materials}</h3>
            <label className="field">
              <span>{t.upload}</span>
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
                  label={t.materialName}
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
                  label={t.materialUrl}
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
                  aria-label={t.materialType}
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
                  <option value="image">{t.image}</option>
                </select>
                {m.type === "video" && (
                  <label className="field wide-field">
                    <span>{t.transcript}</span>
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
                  {t.removeMaterial}
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
              + {t.addMaterialUrl}
            </button>
            <h3>Quiz</h3>
            {edit.questions.map((q: any, i: number) => (
              <div className="quiz-editor" key={i}>
                <Field
                  label={t.question(i + 1)}
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
                    label={t.option(k + 1)}
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
                  <span>{t.correctAnswer}</span>
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
                        {t.option(k + 1)}
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
                  {t.removeQuestion}
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
              + {t.addQuestion}
            </button>
            <TaxonomyFields edit={edit} setEdit={setEdit} taxonomy={library.data?.taxonomy} outcomes={library.data?.outcomes ?? []} />
            {user.role === "TEACHER" && (
              <Suspense fallback={null}>
                <LabChallengeEntry
                  lesson={edit}
                  meta={meta.get(edit.id)}
                  parameters={library.data?.taxonomy?.challengeParameters}
                  onApplied={(applied) => setEdit((s: any) => ({ ...s, labId: applied.labId, challengeParams: applied.challengeParams }))}
                  onPreview={(id) => setPreviewId(id)}
                />
              </Suspense>
            )}
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
                {t.copyToChange}
              </button>
            )}
            <button
              className="primary wide form-submit"
              disabled={save.isPending}
            >
              <Save size={16} />
              {t.saveLesson}
            </button>
          </form>
        </Modal>
      )}
      {previewId && <PreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}
