import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FlaskConical,
  CheckCircle2,
  Play,
  ArrowRight,
  FileText,
  Search,
  X,
} from "lucide-react";
import { api, type ActivityPage, type MyProgressResponse } from "../../lib/api";
import { Badge, Empty, ErrorBox } from "../../components/ui";
import { type SheetView, time } from "./progress-format";
import { AssignmentProgress } from "./AssignmentProgress";
import { ActivityGroups } from "./ActivityList";
import { EvidenceSheet, SheetContent } from "./EvidenceSheet";
import { defineText } from "../../i18n";
import { progressTab, withAttempt, withProgressTab, withoutAttempt, type ProgressTab } from "./progress-route";
import { SubjectCover } from "../../components/SubjectGradeChapterBrowser";
import { flattenReleasedCurriculum } from "../lessons/lesson-catalog";
import { AssignmentsSkeleton, CoursesSkeleton, HistorySkeleton, SummarySkeleton } from "./ProgressSkeletons";
import "./progress.css";

const text = defineText({
  vi: {
    reload: "Tải lại tiến độ",
    loading: "Đang tải tiến độ…",
    assignmentsDone: "Bài tập đã hoàn thành",
    stepsLeft: "Bước bắt buộc còn lại",
    practicals: "Lượt thực hành",
    computed: (when: string) => `Cập nhật lúc ${when}`,
    activeWorkDetail: (done: number, total: number) => `Hoàn thành ${done}/${total} nhiệm vụ`,
    stepsRemainingDetail: "Cần hoàn thành để đạt chuẩn",
    practicalsDetail: (passed: number, total: number) => `${passed} lượt đạt, tỉ lệ đạt ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
    noAssignedNote: "Chưa có bài tập được giao",
    clearSearch: "Xóa tìm kiếm",
    viewsLabel: "Phân loại tiến độ",
    assignments: "Bài tập",
    noAssigned: "Em chưa có bài được giao nào.",
    assignedUnavailable: "Chưa tải được tiến độ bài được giao. Em có thể thử tải lại phía trên.",
    home: "Về trang chủ",
    foundational: "Chương trình nền tảng",
    foundationalIntro: "Tiến độ theo phiên bản chương trình chính thức, độc lập với bài tập được giao.",
    loadingCurriculum: "Đang tải tiến độ chương trình…",
    courseLine: (grade: number, version: string) => `LỚP ${grade} · PHIÊN BẢN ${version}`,
    steps: (done: number, total: number) => `${done}/${total} bước`,
    stateDone: "hoàn thành",
    stateDoing: "đang học",
    stateTodo: "chưa bắt đầu",
    sourceUpdated: (source: string, when: string) => `Nguồn ${source} · cập nhật ${when}`,
    noCurriculum: "Chương trình chính thức chưa được cấu hình; tiến độ nền tảng chưa được tính.",
    curriculumEmpty: "Chưa có môn học trong chương trình chính thức.",
    history: "Lịch sử lần thử",
    loadingHistory: "Đang tải lịch sử…",
    retry: "Thử lại",
    noAttempts: "Chưa có lần thử nào được ghi lại.",
    retryNext: "Thử tải lại trang tiếp",
    loadingShort: "Đang tải…",
    older: "Xem thêm lần thử cũ hơn",
    lessonNum: (n: number) => `Bài ${n}`,
    startLesson: "Vào học",
    continueLesson: "Học tiếp",
    reviewLesson: "Xem lại",
    theory: "Lý thuyết",
    video: "Bài giảng",
    exercise: "Luyện tập",
    lab: "Thực hành",
    tabAll: "Tất cả",
    tabCourses: "Môn học",
    tabAssignments: "Nhiệm vụ được giao",
    tabHistory: "Nhật ký & Lần thử",
    filterGrade: "Khối lớp",
    filterStatus: "Trạng thái",
    filterAllGrades: "Tất cả khối",
    gradePill: (g: number) => `Khối ${g}`,
    filterAllStatus: "Tất cả trạng thái",
    statusDoing: "Đang học",
    statusDone: "Đã hoàn thành",
    sortLabel: "Sắp xếp",
    sortProgressDesc: "Tiến độ cao nhất",
    sortProgressAsc: "Tiến độ thấp nhất",
    sortTitle: "Tên môn A–Z",
    searchPlaceholder: "Tìm kiếm môn học, bài học, chủ đề…",
    noFilteredCourses: "Không tìm thấy môn học nào phù hợp với bộ lọc hiện tại.",
    resetFilter: "Xóa bộ lọc",
    courseDetails: "Chi tiết môn học",
    courseSyllabus: "Khung chương trình & tiến độ bài học",
    close: "Đóng",
    lessonBreakdown: (done: number, total: number) => `${done}/${total} bước hoàn thành`,
    lessonsCount: (n: number) => `${n} bài học`,
    videosCount: (n: number) => `${n} video`,
    labsCount: (n: number) => `${n} thực hành`,
    overallProgress: "Tiến độ tổng thể",
    progressUnavailable: "Chưa có dữ liệu để tính tiến độ",
  },
  en: {
    reload: "Reload progress",
    loading: "Loading progress…",
    assignmentsDone: "Assignments completed",
    stepsLeft: "Required steps left",
    practicals: "Practice attempts",
    computed: (when: string) => `Updated ${when}`,
    activeWorkDetail: (done: number, total: number) => `Completed ${done}/${total} tasks`,
    stepsRemainingDetail: "Required for milestone completion",
    practicalsDetail: (passed: number, total: number) => `${passed} passed, pass rate ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
    noAssignedNote: "No assigned work yet",
    clearSearch: "Clear search",
    viewsLabel: "Progress views",
    assignments: "Assignments",
    noAssigned: "You have no assigned work yet.",
    assignedUnavailable: "Assigned progress is unavailable. Use the reload button above to try again.",
    home: "Go home",
    foundational: "Foundation curriculum",
    foundationalIntro: "Progress against the official curriculum version, separate from assigned work.",
    loadingCurriculum: "Loading curriculum progress…",
    courseLine: (grade: number, version: string) => `GRADE ${grade} · VERSION ${version}`,
    steps: (done: number, total: number) => `${done}/${total} steps`,
    stateDone: "completed",
    stateDoing: "in progress",
    stateTodo: "not started",
    sourceUpdated: (source: string, when: string) => `Source ${source} · updated ${when}`,
    noCurriculum: "The official curriculum is not configured; foundation progress is not computed.",
    curriculumEmpty: "There are no courses in the official curriculum yet.",
    history: "Attempt history",
    loadingHistory: "Loading history…",
    retry: "Try again",
    noAttempts: "No attempts recorded yet.",
    retryNext: "Try loading the next page again",
    loadingShort: "Loading…",
    older: "Show older attempts",
    lessonNum: (n: number) => `Lesson ${n}`,
    startLesson: "Start",
    continueLesson: "Continue",
    reviewLesson: "Review",
    theory: "Theory",
    video: "Video",
    exercise: "Exercise",
    lab: "Lab",
    tabAll: "All",
    tabCourses: "Courses",
    tabAssignments: "Assigned Work",
    tabHistory: "Learning Log",
    filterGrade: "Grade",
    filterStatus: "Status",
    filterAllGrades: "All grades",
    gradePill: (g: number) => `Grade ${g}`,
    filterAllStatus: "All statuses",
    statusDoing: "In progress",
    statusDone: "Completed",
    sortLabel: "Sort",
    sortProgressDesc: "Highest progress",
    sortProgressAsc: "Lowest progress",
    sortTitle: "Title A–Z",
    searchPlaceholder: "Search courses, lessons, topics…",
    noFilteredCourses: "No courses found matching the current filters.",
    resetFilter: "Reset filters",
    courseDetails: "Course details",
    courseSyllabus: "Course syllabus & lesson progress",
    close: "Close",
    lessonBreakdown: (done: number, total: number) => `${done}/${total} steps completed`,
    lessonsCount: (n: number) => `${n} lessons`,
    videosCount: (n: number) => `${n} videos`,
    labsCount: (n: number) => `${n} practical labs`,
    overallProgress: "Overall progress",
    progressUnavailable: "Progress is not available yet",
  },
});
const t = text();

function CourseProgressCard({ course, onSelect }: { course: any; onSelect: (c: any) => void }) {
  const percent = course.summary?.percent ?? 0;
  const isCompleted = percent === 100;
  const subjectId = course.subject.id;
  const lessonsCount = course.stats?.lessonsCount ?? course.lessons?.length ?? 0;
  const videosCount = course.stats?.videosCount ?? course.lessons?.reduce((acc: number, l: any) => acc + (l.evidence?.filter((e: any) => e.kind === "video").length || 0), 0) ?? 0;
  const labsCount = course.stats?.labsCount ?? course.lessons?.filter((l: any) => Boolean(l.requiredLabId)).length ?? 0;
  const known = course.summary?.percent != null;
  const state = !known ? t.progressUnavailable : isCompleted ? t.stateDone : percent > 0 ? t.stateDoing : t.stateTodo;

  return (
    <article
      className="pg-course"
      tabIndex={0}
      role="button"
      aria-label={`${course.subject.name}, ${t.gradePill(course.grade)}, ${known ? `${percent}% ${t.stateDone}` : t.progressUnavailable}`}
      onClick={() => onSelect(course)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(course);
        }
      }}
    >
      <div className="pg-course-cover">
        <SubjectCover subjectId={subjectId} subjectName={course.subject.name} versionId={course.coverAssetVersionId} />
      </div>
      <div className="pg-course-body">
        <div className="pg-course-title">
          <h3>{course.subject.name}</h3>
          <span className="pg-course-grade">{t.gradePill(course.grade)}</span>
        </div>
        <ul className="pg-course-counts">
          <li><BookOpen size={13} aria-hidden="true" />{t.lessonsCount(lessonsCount)}</li>
          {videosCount > 0 && <li><Play size={13} aria-hidden="true" />{t.videosCount(videosCount)}</li>}
          {labsCount > 0 && <li><FlaskConical size={13} aria-hidden="true" />{t.labsCount(labsCount)}</li>}
        </ul>
        {known && <progress className="pg-bar" value={percent} max={100} aria-label={t.overallProgress} />}
        <div className="pg-course-foot">
          <span>
            <strong className="pg-course-percent">{known ? `${percent}%` : "—"}</strong>
            <span className={`pg-course-state ${isCompleted ? "is-done" : percent > 0 ? "is-doing" : ""}`}>{state}</span>
          </span>
          <span className="pg-course-open">{t.courseDetails}</span>
        </div>
      </div>
    </article>
  );
}

function wrapCourseDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const controls = [...dialog.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function CourseDetailModal({ course, onClose }: { course: any; onClose: () => void }) {
  const percent = course.summary?.percent ?? 0;
  const lessons: any[] = course.lessons || [];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="course-detail-backdrop"
      onKeyDown={wrapCourseDialogFocus}
      onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
      aria-labelledby="course-detail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="course-detail-modal">
        <header className="course-modal-header">
          <div className="course-modal-title-row">
            <div>
              <div className="course-modal-badge-row">
                <span className="progress-course-grade-pill course-modal-pill">
                  {t.gradePill(course.grade)}
                </span>
                <span className="tiny muted">{course.version ? `Phiên bản ${course.version}` : ""}</span>
              </div>
              <h3 id="course-detail-modal-title">{course.subject.name}</h3>
              {course.subtitle && <p className="tiny muted course-modal-subtitle">{course.subtitle}</p>}
            </div>
            <button
              type="button"
              className="course-modal-close-btn"
              autoFocus
              onClick={onClose}
              aria-label={t.close}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="course-modal-progress-wrap">
            <div className="course-modal-progress-row">
              <span className="tiny muted course-modal-progress-label">{t.overallProgress}</span>
              <strong className="course-modal-progress-value">
                {course.summary?.percent == null ? t.progressUnavailable : `${percent}% (${t.steps(course.summary?.completedEvidenceItems ?? 0, course.summary?.totalEvidenceItems ?? 0)})`}
              </strong>
            </div>
            {course.summary?.percent != null && <progress className="progress-course-track" value={percent} max={100} aria-label={t.overallProgress} />}
          </div>
        </header>

        <div className="course-modal-body">
          <div className="course-modal-syllabus-header">
            <h4 className="course-modal-syllabus-title">{t.courseSyllabus}</h4>
            <span className="tiny muted">{t.lessonsCount(lessons.length)}</span>
          </div>

          <div className="course-modal-lesson-list">
            {lessons.map((lesson: any, index: number) => {
              const evidence: any[] = lesson.evidence || [];
              const hasLab = Boolean(lesson.requiredLabId);
              const totalSteps = evidence.length + (hasLab ? 1 : 0);
              const completedSteps =
                evidence.filter((e) => e.state === "COMPLETED").length +
                (hasLab && (lesson.labEvidence || []).some((l: any) => l.verdict === "passed") ? 1 : 0);
              const lessonPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
              const lessonDone = totalSteps > 0 && completedSteps === totalSteps;

              return (
                <div key={lesson.id} className="syllabus-lesson-item">
                  <div className="syllabus-lesson-top">
                    <h5 className="syllabus-lesson-title">
                      {lesson.officialOrder ? `${t.lessonNum(lesson.officialOrder)}: ` : `${t.lessonNum(index + 1)}: `}
                      {lesson.title}
                    </h5>
                    <Badge tone={lessonDone ? "passed" : lessonPercent > 0 ? "neutral" : "outline"}>
                      {lessonDone ? t.stateDone : lessonPercent > 0 ? `${lessonPercent}%` : t.stateTodo}
                    </Badge>
                  </div>

                  <div className="syllabus-steps-row">
                    {evidence.map((item: any) => (
                      <span
                        key={item.stepId}
                        className={`step-chip ${item.state === "COMPLETED" ? "chip-done" : item.state === "IN_PROGRESS" ? "chip-doing" : "chip-todo"}`}
                      >
                        {item.kind === "video" ? <Play size={10} /> : item.kind === "basicExercise" ? <CheckCircle2 size={10} /> : <FileText size={10} />}
                        <span>
                          {item.kind === "video" ? t.video : item.kind === "basicExercise" ? `${t.exercise}${item.score !== null ? ` (${item.score}%)` : ""}` : t.theory}
                        </span>
                      </span>
                    ))}
                    {hasLab && (
                      <span className={`step-chip ${(lesson.labEvidence || []).some((l: any) => l.verdict === "passed") ? "chip-done" : "chip-todo"}`}>
                        <FlaskConical size={10} />
                        <span>{t.lab}</span>
                      </span>
                    )}
                  </div>

                  <div className="syllabus-action-row">
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className="lesson-action-link"
                      onClick={onClose}
                    >
                      <span>{lessonDone ? t.reviewLesson : lessonPercent > 0 ? t.continueLesson : t.startLesson}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function StudentProgress() {
  const [searchParams, setSearchParams] = useSearchParams();
  const progress = useQuery<MyProgressResponse>({ queryKey: ["me-progress"], queryFn: () => api("/me/progress") });
  const foundational = useQuery<any>({ queryKey: ["me-foundational-progress"], queryFn: () => api("/me/foundational-progress") });
  const curriculum = useQuery({
    queryKey: ["student-open-curriculum"],
    queryFn: () => api<Parameters<typeof flattenReleasedCurriculum>[0]>("/open-curriculum"),
    enabled: Boolean(foundational.data?.courses?.length),
    staleTime: 60_000,
  });
  const activity = useInfiniteQuery<ActivityPage>({
    queryKey: ["me-activity"],
    queryFn: ({ pageParam }) => api("/me/activity?limit=20" + (pageParam ? "&cursor=" + encodeURIComponent(String(pageParam)) : "")),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const [sheet, setSheet] = useState<SheetView[]>([]);
  const stepBackRoute = useRef<string | null>(null);
  const activeTab = progressTab(searchParams);
  const setActiveTab = (value: ProgressTab) => {
    stepBackRoute.current = null;
    setSheet([]);
    setSearchParams(withProgressTab(searchParams, value));
  };
  useEffect(() => {
    const restoringStep = stepBackRoute.current === searchParams.toString();
    stepBackRoute.current = null;
    if (restoringStep) return;
    const id = searchParams.get("attemptId");
    const kind = searchParams.get("attemptKind") === "quiz" ? "quiz" : "practical";
    setSheet((views) => {
      if (!id) return [];
      const current = views.at(-1);
      return current && current.kind !== "step" && current.kind === kind && current.id === id ? views : [{ kind, id }];
    });
  }, [searchParams]);
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [sortBy, setSortBy] = useState<"progress_desc" | "progress_asc" | "title">("progress_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  const opener = useRef<HTMLElement | null>(null);
  const open = (view: SheetView, event: React.MouseEvent<HTMLElement>) => {
    opener.current = event.currentTarget;
    if (view.kind !== "step") {
      setSearchParams(withAttempt(searchParams, view.id, view.kind));
    }
    setSheet([view]);
  };
  const push = (view: SheetView) => {
    setSheet((views) => [...views, view]);
    if (view.kind !== "step") setSearchParams(withAttempt(searchParams, view.id, view.kind));
  };
  const back = () => {
    const views = sheet.slice(0, -1);
    const previous = views.at(-1);
    const next = previous && previous.kind !== "step"
      ? withAttempt(searchParams, previous.id, previous.kind)
      : withoutAttempt(searchParams);
    stepBackRoute.current = previous?.kind === "step" ? next.toString() : null;
    setSheet(views);
    setSearchParams(next, { replace: true });
  };
  const close = () => {
    stepBackRoute.current = null;
    setSheet([]);
    if (searchParams.has("attemptId")) {
      setSearchParams(withoutAttempt(searchParams), { replace: true });
    }
    (opener.current?.isConnected ? opener.current : document.getElementById("progress-history-title"))?.focus();
  };
  const scrollTo = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  }));

  const assignments = progress.data?.assignments ?? [];
  const summary = progress.data?.summary;
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const coverLessons = flattenReleasedCurriculum(curriculum.data);
  const activeCourses = foundational.data?.courseVersionConfigured === false ? [] : (foundational.data?.courses ?? []).map((course: any) => ({
    ...course,
    coverAssetVersionId: coverLessons.find((lesson) => lesson.subjectId === course.subject.id && lesson.grade === course.grade && lesson.coverAssetVersionId)?.coverAssetVersionId,
  }));

  const filteredCourses = activeCourses
    .filter((course: any) => {
      if (gradeFilter !== "all" && course.grade !== gradeFilter) return false;
      const pct = course.summary?.percent ?? 0;
      if (statusFilter === "completed" && pct < 100) return false;
      if (statusFilter === "in_progress" && (pct === 0 || pct === 100)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (course.subject?.name || "").toLowerCase().includes(q);
        const matchSub = (course.subtitle || "").toLowerCase().includes(q);
        const matchLessons = (course.lessons || []).some((l: any) => l.title?.toLowerCase().includes(q));
        if (!matchTitle && !matchSub && !matchLessons) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "progress_desc") return (b.summary?.percent ?? 0) - (a.summary?.percent ?? 0);
      if (sortBy === "progress_asc") return (a.summary?.percent ?? 0) - (b.summary?.percent ?? 0);
      if (sortBy === "title") return (a.subject?.name || "").localeCompare(b.subject?.name || "");
      return 0;
    });

  const gradeChoices: Array<[number | "all", string]> = [["all", t.filterAllGrades], [8, t.gradePill(8)], [9, t.gradePill(9)]];
  const tabs: Array<{ id: ProgressTab; label: string; count?: number }> = [
    { id: "all", label: t.tabAll },
    { id: "courses", label: t.tabCourses, count: foundational.isSuccess ? activeCourses.length : undefined },
    { id: "assignments", label: t.tabAssignments, count: progress.isSuccess ? assignments.length : undefined },
    { id: "history", label: t.tabHistory, count: activity.isSuccess ? items.length : undefined },
  ];
  const showSection = (id: ProgressTab) => activeTab === "all" || activeTab === id;

  return (
    <div className="my-progress">
      <ErrorBox error={progress.error} />
      {progress.isError && (
        <button className="secondary" type="button" onClick={() => progress.refetch()}>
          {t.reload}
        </button>
      )}

      {progress.isPending ? (
        <SummarySkeleton label={t.loading} />
      ) : summary ? (
        <section className="pg-summary" aria-label={t.overallProgress}>
          <div className="pg-stats">
            <button type="button" className="pg-stat" onClick={() => { setActiveTab("assignments"); scrollTo("progress-completion"); }}>
              <span className="pg-stat-label">{t.assignmentsDone}</span>
              <strong className="pg-stat-value">
                {summary.activeAssignments ? <>{summary.completedAssignments}<span className="pg-stat-of">/{summary.activeAssignments}</span></> : "—"}
              </strong>
              <span className="pg-stat-note">{summary.activeAssignments ? t.activeWorkDetail(summary.completedAssignments, summary.activeAssignments) : t.noAssignedNote}</span>
            </button>
            <button type="button" className="pg-stat" onClick={() => { setActiveTab("assignments"); scrollTo("progress-completion"); }}>
              <span className="pg-stat-label">{t.stepsLeft}</span>
              <strong className="pg-stat-value">{summary.activeAssignments ? summary.remainingRequiredSteps : "—"}</strong>
              <span className="pg-stat-note">{t.stepsRemainingDetail}</span>
            </button>
            <button type="button" className="pg-stat" onClick={() => { setActiveTab("history"); scrollTo("progress-history"); }}>
              <span className="pg-stat-label">{t.practicals}</span>
              <strong className="pg-stat-value">{summary.practicalAttempts}</strong>
              <span className="pg-stat-note">{t.practicalsDetail(summary.passedPracticals, summary.practicalAttempts)}</span>
            </button>
          </div>
          <p className="pg-updated">{t.computed(time(summary.updatedAt))}</p>
        </section>
      ) : null}

      {/* URL-backed progress views. */}
      <nav className="pg-tabs" aria-label={t.viewsLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            className={`pg-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="pg-tab-count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {/* Official curriculum only; assigned progress is shown separately. */}
      {showSection("courses") && (
        <section className="pg-section" aria-labelledby="foundational-progress-title">
          <header className="pg-section-head">
            <h2 id="foundational-progress-title">{t.foundational}</h2>
            <p className="muted">{t.foundationalIntro}</p>
          </header>
          {activeCourses.length > 0 && (
            <div className="pg-filters">
              <div className="pg-filters-group" role="group" aria-label={t.filterGrade}>
                {gradeChoices.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`pg-chip${gradeFilter === value ? " is-active" : ""}`}
                    aria-pressed={gradeFilter === value}
                    onClick={() => setGradeFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="pg-filters-group">
                <select className="pg-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label={t.filterStatus}>
                  <option value="all">{t.filterAllStatus}</option>
                  <option value="in_progress">{t.statusDoing}</option>
                  <option value="completed">{t.statusDone}</option>
                </select>
                <select className="pg-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} aria-label={t.sortLabel}>
                  <option value="progress_desc">{t.sortProgressDesc}</option>
                  <option value="progress_asc">{t.sortProgressAsc}</option>
                  <option value="title">{t.sortTitle}</option>
                </select>
                <div className="pg-search">
                  <Search size={14} aria-hidden="true" />
                  <input type="text" placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchQuery && (
                    <button type="button" className="pg-search-clear" onClick={() => setSearchQuery("")} aria-label={t.clearSearch}>
                      <X size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <ErrorBox error={foundational.error} />
          {foundational.isPending ? (
            <CoursesSkeleton label={t.loadingCurriculum} />
          ) : foundational.isError ? (
            <button type="button" className="secondary pg-more" onClick={() => foundational.refetch()}>{t.retry}</button>
          ) : !activeCourses.length ? (
            <Empty>{foundational.data?.courseVersionConfigured === false ? t.noCurriculum : t.curriculumEmpty}</Empty>
          ) : filteredCourses.length ? (
            <div className="pg-courses">
              {filteredCourses.map((course: any) => (
                <CourseProgressCard key={course.id} course={course} onSelect={(c) => setSelectedCourse(c)} />
              ))}
            </div>
          ) : (
            <Empty>
              <p>{t.noFilteredCourses}</p>
              <button type="button" className="secondary" onClick={() => { setGradeFilter("all"); setStatusFilter("all"); setSearchQuery(""); }}>
                {t.resetFilter}
              </button>
            </Empty>
          )}
        </section>
      )}

      {/* Assigned work, separate from the curriculum. */}
      {showSection("assignments") && (
        <section id="progress-completion" className="pg-section" aria-labelledby="progress-completion-title">
          <header className="pg-section-head">
            <h2 id="progress-completion-title">{t.assignments}</h2>
          </header>
          {progress.isPending ? (
            <AssignmentsSkeleton label={t.loading} />
          ) : progress.isError ? (
            <p className="pg-note" role="status">{t.assignedUnavailable}</p>
          ) : assignments.length === 0 ? (
            <Empty>
              {t.noAssigned} <Link to="/">{t.home}</Link>
            </Empty>
          ) : (
            <div className="pg-work">
              {assignments.map((assignment) => (
                <AssignmentProgress key={assignment.assignmentId} assignment={assignment} onOpen={open} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Attempt history */}
      {showSection("history") && (
        <section id="progress-history" className="pg-section" aria-labelledby="progress-history-title">
          <header className="pg-section-head">
            <h2 id="progress-history-title" tabIndex={-1}>{t.history}</h2>
          </header>
          {activity.isPending ? (
            <HistorySkeleton label={t.loadingHistory} />
          ) : activity.isError && !items.length ? (
            <>
              <ErrorBox error={activity.error} />
              <button className="secondary pg-more" type="button" onClick={() => activity.refetch()}>{t.retry}</button>
            </>
          ) : items.length === 0 ? (
            <Empty>{t.noAttempts}</Empty>
          ) : (
            <>
              <div className="pg-history">
                <ActivityGroups items={items} onOpen={open} />
              </div>
              {activity.isFetchNextPageError && (
                <>
                  <ErrorBox error={activity.error} />
                  <button className="secondary pg-more" type="button" onClick={() => activity.fetchNextPage()}>{t.retryNext}</button>
                </>
              )}
              {activity.hasNextPage && !activity.isFetchNextPageError && (
                <button className="secondary pg-more" type="button" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                  {activity.isFetchingNextPage ? t.loadingShort : t.older}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Course Detail Modal (Drilldown) */}
      {selectedCourse && <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />}
      {sheet.length > 0 && (
        <EvidenceSheet onClose={close} onBack={sheet.length > 1 ? back : undefined}>
          <SheetContent view={sheet.at(-1)!} push={push} />
        </EvidenceSheet>
      )}
    </div>
  );
}
