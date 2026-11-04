import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BookOpen, ClipboardList, Clock3, Play } from "lucide-react";
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
    study: "Học nội dung bài",
    doAssignment: "Làm bài tập",
    eyebrow: "THƯ VIỆN KIẾN THỨC",
    title: "Bài học",
    description: "Khám phá thư viện bài học mở hoặc xem nội dung được giao từ lớp học.",
    filterLabel: "Lọc bài học",
    all: "Tất cả",
    assignedLessons: "Bài học được giao",
    sharedLessons: "Thư viện mở",
    assignedSection: "Bài tập theo bài học",
    assignedSectionDesc: "Hoàn thành nội dung đọc và bài tập theo yêu cầu của giáo viên bộ môn.",
    tasksCount: (n: number) => `${n} bài tập cần làm`,
    overdue: "Quá hạn",
    due: "Hạn nộp",
    noDueDate: "Không có hạn chót",
    assignedTask: "Bài tập",
    assignmentCount: (n: number) => `${n} bài tập`,
    assignedLessonTitle: "Bài học",
    assignedCalloutTitle: "Bài tập từ lớp học",
    assignedNoticeHeadline: (n: number) => `Bạn có ${n} bài tập cần hoàn thành`,
    assignedNoticeSubtext: "Nhấn để mở trang Bài tập và hoàn thành theo yêu cầu của giáo viên.",
    goToAssignments: "Vào trang Bài tập",
    viewAssignedLessons: "Xem bài học",
    overdueTasks: (n: number) => `${n} bài quá hạn`,
    search: "Tìm bài học",
    searchPlaceholder: "Tìm tên bài, môn học hoặc chương…",
    filtering: "Đang lọc:",
    clearFilter: "Xóa bộ lọc",
    reload: "Thử tải lại",
    subjectIndex: "MỤC LỤC MÔN HỌC",
    lessonIndex: "Mục lục bài học",
    bySubject: "Học theo môn và khối",
    count: (n: number) => `${n} bài học`,
    loadFailed: "Không tải được nội dung; hãy thử tải lại.",
    noAssigned: "Hiện chưa có bài học nào được giao có thể mở.",
    noShared: "Chưa có bài học chung được phát hành phù hợp với tìm kiếm này.",
    noMatch: "Chưa có nội dung phù hợp. Hãy thử lại sau.",
    ebookEyebrow: "SÁCH GIÁO KHOA SỐ",
    ebookLibrary: "Thư viện SGK điện tử",
    ebookBadge: "Trực tuyến",
    ebookSub: "Đọc & tra cứu SGK chuẩn chương trình",
    allGrades: "Tất cả khối",
    allSubjects: "Tất cả môn",
    gradeShort: (g: number) => `Khối ${g}`,
    allSubjectsFilter: "Tất cả các môn",
    groupTaskDesc: (n: number, sub: string) => `${n} bài tập theo yêu cầu của giáo viên bộ môn ${sub}`,
  },
  en: {
    assignedKind: "Assigned",
    sharedKind: "Shared lesson",
    grade: (grade: number | string) => `GRADE ${grade}`,
    assignedFor: (title: string) => `Assigned for ${title}`,
    classFallback: "Class",
    study: "Study lesson",
    doAssignment: "Take assignment",
    eyebrow: "KNOWLEDGE LIBRARY",
    title: "Lessons",
    description: "Explore the open lesson library or lessons assigned by your classes.",
    filterLabel: "Filter lessons",
    all: "All",
    assignedLessons: "Assigned lessons",
    sharedLessons: "Open library",
    assignedSection: "Assignments by lesson",
    assignedSectionDesc: "Complete assigned readings and exercises requested by your teacher.",
    tasksCount: (n: number) => `${n} ${n === 1 ? "assignment" : "assignments"} to complete`,
    overdue: "Overdue",
    due: "Due",
    noDueDate: "No deadline",
    assignedTask: "Assignment",
    assignmentCount: (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`,
    assignedLessonTitle: "Lesson",
    assignedCalloutTitle: "Class assignments",
    assignedNoticeHeadline: (n: number) => `You have ${n} assigned ${n === 1 ? "task" : "tasks"}`,
    assignedNoticeSubtext: "Click to open Assignments and submit work requested by your teacher.",
    goToAssignments: "Open Assignments",
    viewAssignedLessons: "View lessons",
    overdueTasks: (n: number) => `${n} overdue`,
    search: "Search lessons",
    searchPlaceholder: "Search by lesson, subject or chapter…",
    filtering: "Filtering:",
    clearFilter: "Clear filter",
    reload: "Reload",
    subjectIndex: "SUBJECT INDEX",
    lessonIndex: "Lesson index",
    bySubject: "Learn by subject and grade",
    count: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    loadFailed: "The content could not be loaded; please reload.",
    noAssigned: "No assigned lessons can be opened right now.",
    noShared: "No published shared lessons match this search.",
    noMatch: "Nothing matches yet. Please try again later.",
    ebookEyebrow: "DIGITAL TEXTBOOKS",
    ebookLibrary: "Ebook library",
    ebookBadge: "Online",
    ebookSub: "Access official digital textbooks",
    allGrades: "All grades",
    allSubjects: "All subjects",
    gradeShort: (g: number) => `Grade ${g}`,
    allSubjectsFilter: "All subjects",
    groupTaskDesc: (n: number, sub: string) => `${n} ${n === 1 ? "task" : "tasks"} requested by your ${sub} teacher`,
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

/**
 * Strips subject name from classroom name to avoid duplicate badges.
 * E.g. classroom "Khoa học tự nhiên 8A" with subject "Khoa học tự nhiên" -> "8A".
 */
function cleanClassroomName(classroomName?: string | null, subjectName?: string): string {
  if (!classroomName) return "";
  let name = classroomName.trim();
  if (subjectName) {
    const escapedSubject = subjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(`^${escapedSubject}[\\s:–—\\-_]*`, "i"), "").trim();
  }
  return name;
}

function getAssignmentMeta(subjectName: string, grade: number, classroomName?: string | null): string {
  const cls = (classroomName || "").trim();
  if (!cls) return `${subjectName} · Khối ${grade}`;
  if (cls.toLowerCase().startsWith(subjectName.toLowerCase())) return cls;

  const hasGrade = new RegExp(`(?:^|\\D)${grade}(?:\\D|$)`).test(cls);
  const formattedClass = cls.startsWith("Lớp") || cls.startsWith("lớp") || cls.includes(" ") ? cls : `Lớp ${cls}`;
  return hasGrade ? `${subjectName} · ${formattedClass}` : `${subjectName} · Khối ${grade} · ${formattedClass}`;
}

function AssignedTaskRow({ lesson, assignment }: { lesson: StudentLessonCard; assignment: StudentLessonAssignment }) {
  const t = text();
  const lessonUrl = `/lessons/${encodeURIComponent(lesson.id)}?assignmentId=${encodeURIComponent(assignment.id)}`;
  const assignmentUrl = `/assignments/${encodeURIComponent(assignment.id)}`;
  const cleanedClass = cleanClassroomName(assignment.classroom?.name, lesson.subject.name);
  const classLabel = cleanedClass
    ? (cleanedClass.toLowerCase().startsWith("lớp") || cleanedClass.includes(" ") ? cleanedClass : `Lớp ${cleanedClass}`)
    : assignment.classroom?.name || t.classFallback;

  return (
    <article className="student-assigned-task-row">
      <div className="assigned-task-copy">
        <h4 className="assigned-task-title">
          {assignment.title.trim().toLocaleLowerCase() === lesson.title.trim().toLocaleLowerCase() ? t.assignedTask : assignment.title}
        </h4>
        <div className="assigned-task-meta">
          <span>{classLabel}</span>
          <span aria-hidden="true">·</span>
          {assignment.overdue ? (
            <span className="assigned-task-due is-overdue">
              <AlertTriangle size={13} aria-hidden="true" />
              {t.overdue}{assignment.dueDate ? ` · ${formatDate(assignment.dueDate)}` : ""}
            </span>
          ) : assignment.dueDate ? (
            <span className="assigned-task-due"><Clock3 size={13} aria-hidden="true" />{t.due}: {formatDate(assignment.dueDate)}</span>
          ) : (
            <span>{t.noDueDate}</span>
          )}
        </div>
      </div>
      <div className="assigned-task-actions">
        <Link to={assignmentUrl} className="assigned-task-open" title={t.doAssignment}>
          <ClipboardList size={14} aria-hidden="true" /> <span>{t.doAssignment}</span>
        </Link>
      </div>
    </article>
  );
}

function LessonRow({ lesson }: { lesson: StudentLessonCard }) {
  const t = text();
  const hasAssignment = lesson.assignments.length > 0;
  const primaryAssignment = lesson.assignments[0];
  const targetUrl = hasAssignment
    ? `/lessons/${encodeURIComponent(lesson.id)}?assignmentId=${encodeURIComponent(primaryAssignment.id)}`
    : `/lessons/${encodeURIComponent(lesson.id)}`;

  const cleanedClass = primaryAssignment
    ? cleanClassroomName(primaryAssignment.classroom?.name, lesson.subject.name)
    : "";
  const classLabel = cleanedClass
    ? (cleanedClass.toLowerCase().startsWith("lớp") || cleanedClass.includes(" ") ? cleanedClass : `Lớp ${cleanedClass}`)
    : primaryAssignment?.classroom?.name || t.assignedKind;

  return (
    <article className="student-lesson-row">
      <Link className="lesson-row-main-link" to={targetUrl}>
        <div className="lesson-row-icon">
          <BookOpen size={16} />
        </div>
        <div className="lesson-row-body">
          <div className="lesson-row-meta">
            <span className="lesson-row-hierarchy">
              <strong className="lesson-meta-subject">{lesson.subject.name}</strong>
              {lesson.chapter && (
                <>
                  <span className="lesson-meta-sep" aria-hidden="true">·</span>
                  <span className="lesson-meta-chapter">{lesson.chapter}</span>
                </>
              )}
            </span>
            {hasAssignment && (
              <span className="lesson-assigned-inline-badge" title={`${t.assignedKind}: ${classLabel}`}>
                <ClipboardList size={11} aria-hidden="true" />
                <span>{classLabel}</span>
              </span>
            )}
          </div>
          <h4 className="lesson-row-title">{lesson.title}</h4>
          {lesson.topic && lesson.topic !== lesson.title && (
            <p className="lesson-row-topic">{lesson.topic}</p>
          )}
        </div>
      </Link>
      <div className="lesson-row-actions">
        <Link className="btn-solid-teal" to={targetUrl} title={t.study}>
          <Play size={13} fill="currentColor" aria-hidden="true" /> {t.study}
        </Link>
        {hasAssignment && (
          <Link
            className="btn-outline-subtle"
            to={`/assignments/${encodeURIComponent(primaryAssignment.id)}`}
            title={t.doAssignment}
          >
            <ClipboardList size={13} aria-hidden="true" /> {t.doAssignment}
          </Link>
        )}
      </div>
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
      renderItem={(lesson) => <LessonRow lesson={lesson} />}
    />
  );
}

function handleRadioKeys(event: React.KeyboardEvent<HTMLDivElement>) { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return; const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length; event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click();
}

export function StudentLessonsHub() {
  const t = text();
  const { pathname } = useLocation();
  const catalogRoute = pathname.startsWith("/lessons/catalog");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const curriculum = useQuery({ queryKey: ["student-open-curriculum"], queryFn: () => api<{ subjects?: Array<{ id: string; name: string; grades?: any[] }> }>("/open-curriculum") });
  const assigned = useQuery<AssignmentRead>({ queryKey: ["student-assigned-lessons"], queryFn: readAssignments });

  const catalog = useMemo(() => buildStudentLessonCatalog(
    flattenReleasedCurriculum(curriculum.data),
    assigned.data?.lessons ?? [],
    assigned.data?.assignments ?? [],
  ), [curriculum.data, assigned.data]);

  const allGrades = [6, 7, 8, 9];
  const gradesWithData = useMemo(() => new Set(catalog.map((l) => l.grade)), [catalog]);
  const availableSubjects = useMemo(() => {
    const list = selectedGrade === "all" ? catalog : catalog.filter((l) => String(l.grade) === selectedGrade);
    const map = new Map<string, string>();
    for (const l of list) {
      if (l.subjectId && l.subject?.name) {
        map.set(l.subjectId, l.subject.name);
      }
    }
    return Array.from(map.entries());
  }, [catalog, selectedGrade]);

  const matching = filterStudentLessonCatalog(catalog, filter, selectedSubjectId, selectedGrade, search);
  const openLessons = matching.filter((lesson) => lesson.assignments.length === 0);
  const assignedLessons = matching.filter((lesson) => lesson.assignments.length > 0);
  const allAssignments = useMemo(() =>
    assignedLessons.flatMap((l) => l.assignments),
    [assignedLessons]
  );
  const totalAssignedTasks = allAssignments.length;
  const overdueCount = useMemo(() => allAssignments.filter((a) => a.overdue).length, [allAssignments]);
  const earliestDue = useMemo(() => {
    if (!allAssignments.length) return null;
    return [...allAssignments].sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })[0];
  }, [allAssignments]);

  const earliestDueMeta = useMemo(() => {
    if (!earliestDue) return "";
    return getAssignmentMeta(
      earliestDue.subject?.name || "",
      earliestDue.grade || 0,
      earliestDue.classroom?.name,
    );
  }, [earliestDue]);

  type AssignedGroup = {
    key: string;
    lesson: StudentLessonCard;
    items: StudentLessonAssignment[];
  };

  const assignedGroups = useMemo(() => {
    return assignedLessons.map((lesson): AssignedGroup => ({
      key: lesson.id,
      lesson,
      items: [...lesson.assignments].sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }),
    })).sort((a, b) =>
      a.lesson.grade - b.lesson.grade ||
      a.lesson.subject.name.localeCompare(b.lesson.subject.name, "vi") ||
      a.lesson.title.localeCompare(b.lesson.title, "vi", { numeric: true }),
    );
  }, [assignedLessons]);

  const retry = () => { void curriculum.refetch(); void assigned.refetch(); };
  const hasError = curriculum.isError || assigned.isError;
  const loading = curriculum.isLoading || assigned.isLoading;

  return (
    <div className="student-lessons-page">
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        action={
          <Link
            className="apple-ebook-priority-card"
            to="/ebooks"
            title={t.ebookLibrary}
            data-testid="student-ebooks-cta"
          >
            <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="ebook-priority-text-frame">
              <strong className="ebook-priority-heading">{t.ebookLibrary}</strong>
              <span className="ebook-priority-subtext">{t.ebookSub}</span>
            </span>
          </Link>
        }
      />

      {/* Keep class work visible without turning the notice into a second hero. */}
      {!catalogRoute && filter !== "assigned" && totalAssignedTasks > 0 && (
        <div
          className="student-assigned-apple-callout"
          role="region"
          aria-label={t.assignedNoticeHeadline(totalAssignedTasks)}
        >
          <div className="callout-body-col">
            <div className="callout-badge-line">
              <ClipboardList size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="callout-title">{t.assignedCalloutTitle}</span>
            </div>
            <p className="callout-subline">
              {overdueCount > 0 ? (
                <span className="callout-attention" role="status">
                  <AlertTriangle size={14} strokeWidth={1.8} aria-hidden="true" />
                  {t.overdueTasks(overdueCount)}
                </span>
              ) : (
                <span>{t.tasksCount(totalAssignedTasks)}</span>
              )}
              {earliestDue && (
                <>
                  {overdueCount === 0 && <span className="callout-meta-sep" aria-hidden="true">·</span>}
                  <strong className="callout-task-name">{earliestDue.title}</strong>
                  {earliestDueMeta && <><span className="callout-meta-sep" aria-hidden="true">·</span><span>{earliestDueMeta}</span></>}
                  {earliestDue.dueDate && <><span className="callout-meta-sep" aria-hidden="true">·</span><span>{t.due}: {formatDate(earliestDue.dueDate)}</span></>}
                </>
              )}
            </p>
          </div>
          <Link to="/assignments" className="callout-btn-primary" title={t.goToAssignments}>
            <span>{t.goToAssignments}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Unified filter panel at the top: Grade chips -> Subject chips -> search */}
      <div className="student-lesson-filter-panel" role="search" aria-label={t.filterLabel}>
        <div className="filter-chip-row">
          <span className="filter-label-group">Khối:</span>
          <div className="chip-group" role="radiogroup" onKeyDown={handleRadioKeys} aria-label="Lọc theo khối">
            <button
              type="button"
              role="radio" aria-checked={selectedGrade === "all"} tabIndex={selectedGrade === "all" ? 0 : -1}
                className={`chip${selectedGrade === "all" ? " is-active" : ""}`}
              onClick={() => setSelectedGrade("all")}
            >
              {t.allGrades}
            </button>
            {allGrades.map((g) => {
              const hasData = gradesWithData.has(g);
              const isActive = selectedGrade === String(g);
              return (
                <button
                  type="button"
                  key={g}
                  role="radio" aria-checked={isActive} tabIndex={isActive ? 0 : -1}
                  className={`chip${isActive ? " is-active" : ""}${!hasData ? " is-disabled" : ""}`}
                  disabled={!hasData}
                  onClick={() => {
                    setSelectedGrade(String(g));
                    setSelectedSubjectId("all");
                  }}
                  title={!hasData ? "Chưa có bài học phát hành" : undefined}
                >
                  {t.gradeShort(g)}
                </button>
              );
            })}
          </div>
        </div>

        {availableSubjects.length > 1 && (
          <div className="filter-chip-row">
            <span className="filter-label-group">Môn:</span>
            <div className="chip-group" role="radiogroup" onKeyDown={handleRadioKeys} aria-label="Lọc theo môn học">
              <button
                type="button"
                role="radio" aria-checked={selectedSubjectId === "all"} tabIndex={selectedSubjectId === "all" ? 0 : -1}
                className={`chip${selectedSubjectId === "all" ? " is-active" : ""}`}
                onClick={() => setSelectedSubjectId("all")}
              >
                {t.allSubjects}
              </button>
              {availableSubjects.map(([sId, sName]) => (
                <button
                  type="button"
                  key={sId}
                  role="radio" aria-checked={selectedSubjectId === sId} tabIndex={selectedSubjectId === sId ? 0 : -1}
                  className={`chip${selectedSubjectId === sId ? " is-active" : ""}`}
                  onClick={() => setSelectedSubjectId(sId)}
                >
                  {sName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="filter-secondary-row">
          <div className="tabs" role="group" aria-label={t.filterLabel}>
            {([
              ["all", t.all],
              ["assigned", totalAssignedTasks > 0 ? `${t.assignedLessons} (${totalAssignedTasks})` : t.assignedLessons],
              ["shared", t.sharedLessons],
            ] as const).map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={filter === id ? "active" : ""}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="filter-search-box">
            <input
              aria-label={t.search}
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {catalogRoute && (filter !== "all" || search.trim() || selectedGrade !== "all" || selectedSubjectId !== "all") && (
        <div className="student-catalog-filter-state" role="status">
          <span>{t.filtering} {filter === "assigned" ? t.assignedLessons : filter === "shared" ? t.sharedLessons : t.all}{selectedGrade !== "all" ? ` · Khối ${selectedGrade}` : ""}{search.trim() ? ` · ${search.trim()}` : ""}</span>
          <button type="button" onClick={() => { setFilter("all"); setSearch(""); setSelectedGrade("all"); setSelectedSubjectId("all"); }}>{t.clearFilter}</button>
        </div>
      )}

      {hasError && (
        <div className="load-error student-hub-error">
          <ErrorBox error={curriculum.error || assigned.error} />
          <button type="button" onClick={retry}>{t.reload}</button>
        </div>
      )}

      {loading && <div className="lesson-grid"><CardSkeleton count={3} /></div>}

      {!loading && (
        <>
          {/* Section: Bài học được giao — Phân nhóm rõ ràng theo từng Môn học và Lớp học */}
          {!catalogRoute && filter === "assigned" && (
            <section aria-labelledby="assigned-top-heading" className="student-assigned-apple-section">
              <header className="assigned-apple-heading">
                <div>
                  <span className="eyebrow">{t.assignedSection}</span>
                  <h2 id="assigned-top-heading">{t.assignedLessons}</h2>
                </div>
                <div className="assigned-apple-heading-stats">
                  {overdueCount > 0 && (
                    <span className="apple-status-pill is-overdue">
                      <span className="apple-pulse-dot" aria-hidden="true" />
                      <AlertTriangle size={11} aria-hidden="true" />
                      <span>{t.overdueTasks(overdueCount)}</span>
                    </span>
                  )}
                  <span className="assigned-apple-count">
                    {t.tasksCount(totalAssignedTasks)}
                  </span>
                </div>
              </header>

              {assignedGroups.length > 0 ? (
                <div className="student-assigned-groups-container">
                  {assignedGroups.map((group) => (
                    <div key={group.key} className="student-assigned-group-box">
                      <div className="assigned-group-header">
                        <div className="assigned-lesson-heading">
                          <span className="assigned-lesson-label">{t.assignedLessonTitle}</span>
                          <h3 className="assigned-group-subject-title">{group.lesson.title}</h3>
                          <p className="assigned-group-subtext">
                            {[group.lesson.subject.name, t.gradeShort(group.lesson.grade), group.lesson.chapter].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="assigned-group-stat-col">
                          <span className="assigned-group-count-label">
                            {t.assignmentCount(group.items.length)}
                          </span>
                          <Link
                            className="assigned-lesson-study"
                            to={`/lessons/${encodeURIComponent(group.lesson.id)}?assignmentId=${encodeURIComponent(group.items[0].id)}`}
                          >
                            <Play size={13} aria-hidden="true" /> {t.study}
                          </Link>
                        </div>
                      </div>

                      <div className="student-assigned-apple-list">
                        {group.items.map((assignment) => (
                          <AssignedTaskRow
                            key={`${group.lesson.id}-${assignment.id}`}
                            lesson={group.lesson}
                            assignment={assignment}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="hierarchy-empty">{t.noAssigned}</p>
              )}
            </section>
          )}

          {/* Section: Thư viện mở / Danh mục chính */}
          {(!catalogRoute ? filter !== "assigned" : true) && (
            <section aria-labelledby="catalog-lessons-title" className="student-lesson-section">
              <header className="lesson-chapter-heading">
                <div>
                  <span className="eyebrow">{catalogRoute ? t.subjectIndex : t.sharedLessons}</span>
                  <h2 id="catalog-lessons-title">{catalogRoute ? t.lessonIndex : t.bySubject}</h2>
                </div>
                <span className="lesson-chapter-count">
                  {t.count((catalogRoute ? matching : openLessons).length)}
                </span>
              </header>
              <LessonGroups
                lessons={catalogRoute ? matching : openLessons}
                emptyCopy={
                  assigned.isError || curriculum.isError
                    ? t.loadFailed
                    : filter === "assigned"
                    ? t.noAssigned
                    : filter === "shared"
                    ? t.noShared
                    : t.noMatch
                }
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
