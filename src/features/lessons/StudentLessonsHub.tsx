import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Play } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { CardSkeleton, ErrorBox } from "../../components/ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { buildStudentLessonCatalog, filterStudentLessonCatalog, flattenReleasedCurriculum, type StudentLessonAssignment, type StudentLessonCard } from "./lesson-catalog";

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
  return (
    <article className="panel lesson-card student-lesson-card">
      <div className="lesson-card-top">
        <span className={`subject-icon ${lesson.subjectId}`}><BookOpen /></span>
        <span className="student-lesson-kind"><BookOpen size={14} /> {lesson.assignments.length ? "Bài được giao" : "Bài học chung"}</span>
      </div>
      <small className="eyebrow">{lesson.subject.name} · LỚP {lesson.grade || "—"}</small>
      <h3>{lesson.title}</h3>
      {lesson.learningObjective && <p>{lesson.learningObjective}</p>}
      <div className="student-lesson-context"><span>{lesson.chapter}</span>{lesson.topic && <span>{lesson.topic}</span>}</div>
      {lesson.assignments.length ? (
        <div className="student-assignment-links" aria-label={`Bài giao cho ${lesson.title}`}>
          {lesson.assignments.map((assignment) => (
            <div className="student-assignment-actions" key={assignment.id}>
              <span className="student-assignment-label">{assignment.title} · {assignment.classroom?.name ?? "Lớp học"}
                {assignment.dueDate && <small>Hạn {new Date(assignment.dueDate).toLocaleDateString("vi-VN")}</small>}
              </span>
              <Link className="student-lesson-open" to={`/lessons/${encodeURIComponent(lesson.id)}?assignmentId=${encodeURIComponent(assignment.id)}`}>
                <Play size={15} aria-hidden="true" /> Học nội dung
              </Link>
              <Link className="student-assignment-open" to={`/assignments/${encodeURIComponent(assignment.id)}`}>
                Làm bài tập <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-footer">
          <Link className="student-lesson-open" to={`/lessons/${encodeURIComponent(lesson.id)}`}>
            <BookOpen size={16} /> Học nội dung <ArrowUpRight size={16} />
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
      <PageHeading eyebrow="THƯ VIỆN KIẾN THỨC" title="Bài học" description="Khám phá môn học, sách giáo khoa và bài được giao trong cùng một nơi." />

      {!catalogRoute && <div className="filter-bar student-lesson-filters">
        <div className="tabs" role="group" aria-label="Lọc bài học">
          {([ ["all", "Tất cả"], ["assigned", "Bài học được giao"], ["shared", "Bài học chung"] ] as const).map(([id, label]) => (
            <button type="button" key={id} className={filter === id ? "active" : ""} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <input aria-label="Tìm bài học" placeholder="Tìm tên bài, môn học hoặc chương…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>}

      {hasError && <div className="load-error student-hub-error">
        <ErrorBox error={curriculum.error || assigned.error} />
        <button type="button" onClick={retry}>Thử tải lại</button>
      </div>}
      {loading && <div className="lesson-grid"><CardSkeleton count={3} /></div>}
      {!loading && (
        <>
          <section aria-labelledby="catalog-lessons-title" className="student-lesson-section">
            <header className="lesson-chapter-heading"><div><span className="eyebrow">{catalogRoute ? "MỤC LỤC MÔN HỌC" : "CHƯƠNG TRÌNH MỞ VÀ BÀI ĐƯỢC GIAO"}</span><h2 id="catalog-lessons-title">{catalogRoute ? "Mục lục bài học" : "Học theo môn và khối"}</h2></div><span className="lesson-chapter-count">{orderedMatching.length} bài</span></header>
            <LessonGroups lessons={catalogRoute ? catalog : orderedMatching} emptyCopy={assigned.isError || curriculum.isError ? "Không tải được nội dung; hãy thử tải lại." : filter === "assigned" ? "Hiện chưa có bài học nào được giao có thể mở." : filter === "shared" ? "Chưa có bài học chung được phát hành phù hợp với tìm kiếm này." : "Chưa có nội dung phù hợp. Hãy thử lại sau."} />
          </section>
        </>
      )}
    </div>
  );
}
