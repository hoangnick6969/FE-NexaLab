import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Play } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { CardSkeleton, ErrorBox } from "../../components/ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { buildStudentLessonCatalog, filterStudentLessonCatalog, flattenReleasedCurriculum, type StudentLessonAssignment, type StudentLessonCard } from "./lesson-catalog";
import { defineText, formatDate } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    assignedKind: "Bài được giao",
    sharedKind: "Bài học chung",
    grade: (grade: number | string) => `LỚP ${grade}`,
    assignedFor: (title: string) => `Bài giao cho ${title}`,
    classFallback: "Lớp học",
    study: "Học nội dung",
    doAssignment: "Làm bài tập",
    eyebrow: "THƯ VIỆN KIẾN THỨC",
    title: "Bài học",
    description: "Khám phá môn học, sách giáo khoa và bài được giao trong cùng một nơi.",
    filterLabel: "Lọc bài học",
    all: "Tất cả",
    assignedLessons: "Bài học được giao",
    sharedLessons: "Bài học chung",
    search: "Tìm bài học",
    searchPlaceholder: "Tìm tên bài, môn học hoặc chương…",
    filtering: "Đang lọc:",
    clearFilter: "Xóa bộ lọc",
    reload: "Thử tải lại",
    subjectIndex: "MỤC LỤC MÔN HỌC",
    openAndAssigned: "CHƯƠNG TRÌNH MỞ VÀ BÀI ĐƯỢC GIAO",
    lessonIndex: "Mục lục bài học",
    bySubject: "Học theo môn và khối",
    count: (n: number) => `${n} bài`,
    loadFailed: "Không tải được nội dung; hãy thử tải lại.",
    noAssigned: "Hiện chưa có bài học nào được giao có thể mở.",
    noShared: "Chưa có bài học chung được phát hành phù hợp với tìm kiếm này.",
    noMatch: "Chưa có nội dung phù hợp. Hãy thử lại sau.",
  },
  en: {
    assignedKind: "Assigned",
    sharedKind: "Shared lesson",
    grade: (grade: number | string) => `GRADE ${grade}`,
    assignedFor: (title: string) => `Assigned for ${title}`,
    classFallback: "Class",
    study: "Study",
    doAssignment: "Do the assignment",
    eyebrow: "KNOWLEDGE LIBRARY",
    title: "Lessons",
    description: "Explore subjects, textbooks and assigned work in one place.",
    filterLabel: "Filter lessons",
    all: "All",
    assignedLessons: "Assigned lessons",
    sharedLessons: "Shared lessons",
    search: "Search lessons",
    searchPlaceholder: "Search by lesson, subject or chapter…",
    filtering: "Filtering:",
    clearFilter: "Clear filter",
    reload: "Reload",
    subjectIndex: "SUBJECT INDEX",
    openAndAssigned: "OPEN CURRICULUM AND ASSIGNED WORK",
    lessonIndex: "Lesson index",
    bySubject: "Learn by subject and grade",
    count: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    loadFailed: "The content could not be loaded; please reload.",
    noAssigned: "No assigned lessons can be opened right now.",
    noShared: "No published shared lessons match this search.",
    noMatch: "Nothing matches yet. Please try again later.",
  },
});

type AssignmentRead = { lessons: any[]; assignments: StudentLessonAssignment[] };
type Filter = "all" | "assigned" | "shared";

async function readAssignments(): Promise<AssignmentRead> {
  const [lessons, assignments] = await Promise.all([
    api<any[]>("/lessons"),
    api<StudentLessonAssignment[]>("/assignments"),
  ]);
  return { lessons, assignments };
}

function LessonCard({ lesson }: { lesson: StudentLessonCard }) {
  const t = text();
  return (
    <article className="panel lesson-card student-lesson-card">
      <div className="lesson-card-top">
        <span className={`subject-icon ${lesson.subjectId}`}><BookOpen /></span>
        <span className="student-lesson-kind"><BookOpen size={14} /> {lesson.assignments.length ? t.assignedKind : t.sharedKind}</span>
      </div>
      <small className="eyebrow">{lesson.subject.name} · {t.grade(lesson.grade || "—")}</small>
      <h3>{lesson.title}</h3>
      {lesson.learningObjective && <p>{lesson.learningObjective}</p>}
      <div className="student-lesson-context"><span>{lesson.chapter}</span>{lesson.topic && <span>{lesson.topic}</span>}</div>
      {lesson.assignments.length ? (
        <div className="student-assignment-links" aria-label={t.assignedFor(lesson.title)}>
          {lesson.assignments.map((assignment) => (
            <div className="student-assignment-actions" key={assignment.id}>
              <span className="student-assignment-label">{assignment.title} · {assignment.classroom?.name ?? t.classFallback}
                {assignment.dueDate && <small>{commonText().due(formatDate(assignment.dueDate))}</small>}
              </span>
              <Link className="student-lesson-open" to={`/lessons/${encodeURIComponent(lesson.id)}?assignmentId=${encodeURIComponent(assignment.id)}`}>
                <Play size={15} aria-hidden="true" /> {t.study}
              </Link>
              <Link className="student-assignment-open" to={`/assignments/${encodeURIComponent(assignment.id)}`}>
                {t.doAssignment} <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-footer">
          <Link className="student-lesson-open" to={`/lessons/${encodeURIComponent(lesson.id)}`}>
            <BookOpen size={16} /> {t.study} <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </article>
  );
}

function LessonGroups({ lessons, emptyCopy }: { lessons: StudentLessonCard[]; emptyCopy: string }) {
  const items: Array<StudentLessonCard & HierarchyItem> = lessons.map((lesson) => ({
    ...lesson,
    subjectName: lesson.subject.name,
    chapterOrder: lesson.chapterOrder,
    itemOrder: lesson.curriculumOrder,
  }));
  return (
    <SubjectGradeChapterBrowser
      items={items}
      basePath="/lessons/catalog"
      rootPath="/lessons"
      emptyCopy={emptyCopy}
      renderItem={(lesson) => <LessonCard lesson={lesson} />}
    />
  );
}

export function StudentLessonsHub() {
  const t = text();
  const { pathname } = useLocation();
  const catalogRoute = pathname.startsWith("/lessons/catalog");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const curriculum = useQuery({ queryKey: ["student-open-curriculum"], queryFn: () => api<{ subjects?: any[] }>("/open-curriculum") });
  const assigned = useQuery<AssignmentRead>({ queryKey: ["student-assigned-lessons"], queryFn: readAssignments });

  const catalog = useMemo(() => buildStudentLessonCatalog(
    flattenReleasedCurriculum(curriculum.data),
    assigned.data?.lessons ?? [],
    assigned.data?.assignments ?? [],
  ), [curriculum.data, assigned.data]);
  const matching = filterStudentLessonCatalog(catalog, filter, "all", "all", search);
  const orderedMatching = [...matching].sort((left, right) => Number(right.assignments.length > 0) - Number(left.assignments.length > 0));
  const retry = () => { void curriculum.refetch(); void assigned.refetch(); };
  const hasError = curriculum.isError || assigned.isError;
  const loading = curriculum.isLoading || assigned.isLoading;

  return (
    <div className="student-lessons-page">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

      {!catalogRoute && <div className="filter-bar student-lesson-filters">
        <div className="tabs" role="group" aria-label={t.filterLabel}>
          {([ ["all", t.all], ["assigned", t.assignedLessons], ["shared", t.sharedLessons] ] as const).map(([id, label]) => (
            <button type="button" key={id} className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <input aria-label={t.search} placeholder={t.searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>}
      {catalogRoute && (filter !== "all" || search.trim()) && (
        <div className="student-catalog-filter-state" role="status">
          <span>{t.filtering} {filter === "assigned" ? t.assignedLessons : filter === "shared" ? t.sharedLessons : t.all}{search.trim() ? ` · ${search.trim()}` : ""}</span>
          <button type="button" onClick={() => { setFilter("all"); setSearch(""); }}>{t.clearFilter}</button>
        </div>
      )}

      {hasError && <div className="load-error student-hub-error">
        <ErrorBox error={curriculum.error || assigned.error} />
        <button type="button" onClick={retry}>{t.reload}</button>
      </div>}
      {loading && <div className="lesson-grid"><CardSkeleton count={3} /></div>}
      {!loading && (
        <>
          <section aria-labelledby="catalog-lessons-title" className="student-lesson-section">
            <header className="lesson-chapter-heading"><div><span className="eyebrow">{catalogRoute ? t.subjectIndex : t.openAndAssigned}</span><h2 id="catalog-lessons-title">{catalogRoute ? t.lessonIndex : t.bySubject}</h2></div><span className="lesson-chapter-count">{t.count(orderedMatching.length)}</span></header>
            <LessonGroups lessons={catalogRoute ? matching : orderedMatching} emptyCopy={assigned.isError || curriculum.isError ? t.loadFailed : filter === "assigned" ? t.noAssigned : filter === "shared" ? t.noShared : t.noMatch} />
          </section>
        </>
      )}
    </div>
  );
}
