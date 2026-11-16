import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FlaskConical,
  ListChecks,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  FileText,
  GraduationCap,
  LayoutGrid,
  Filter,
  Search,
  X,
  ChevronRight,
  Sparkles,
  Layers,
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

const text = defineText({
  vi: {
    reload: "Tải lại tiến độ",
    loading: "Đang tải tiến độ…",
    assignmentsDone: "Bài tập đã hoàn thành",
    stepsLeft: "Bước bắt buộc còn lại",
    practicals: (passed: number) => `Lượt thực hành · ${passed} lượt đạt`,
    computed: (when: string) => `Đồng bộ trực tiếp · Cập nhật ${when}`,
    overviewEyebrow: "TỔNG QUAN TIẾN ĐỘ HỌC TẬP",
    activeWorkDetail: (done: number, total: number) => `Hoàn thành ${done}/${total} nhiệm vụ`,
    stepsRemainingDetail: "Cần hoàn thành để đạt chuẩn",
    practicalsDetail: (passed: number, total: number) => `Tỉ lệ đạt: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
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
    assignedEyebrow: "NHIỆM VỤ ĐƯỢC GIAO",
    curriculumEyebrow: "CHƯƠNG TRÌNH CHUẨN",
    historyEyebrow: "NHẬT KÝ HỌC TẬP",
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
    practicals: (passed: number) => `Practice attempts · ${passed} passed`,
    computed: (when: string) => `Live sync · Updated ${when}`,
    overviewEyebrow: "LEARNING PROGRESS OVERVIEW",
    activeWorkDetail: (done: number, total: number) => `Completed ${done}/${total} tasks`,
    stepsRemainingDetail: "Required for milestone completion",
    practicalsDetail: (passed: number, total: number) => `Pass rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
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
    assignedEyebrow: "ASSIGNED WORK",
    curriculumEyebrow: "OFFICIAL CURRICULUM",
    historyEyebrow: "LEARNING LOG",
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

  return (
    <article
      className="progress-course-card"
      tabIndex={0}
      role="button"
      aria-label={`${course.subject.name}, ${t.gradePill(course.grade)}, ${course.summary?.percent == null ? t.progressUnavailable : `${percent}% ${t.stateDone}`}`}
      onClick={() => onSelect(course)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(course);
        }
      }}
    >
      <div className="progress-course-cover">
        <SubjectCover subjectId={subjectId} subjectName={course.subject.name} versionId={course.coverAssetVersionId} />
        <span className="progress-course-grade-pill">{t.gradePill(course.grade)}</span>
      </div>
      <div className="progress-course-body">
        <h3 className="progress-course-heading">{course.subject.name}</h3>

        <div className="progress-course-stats">
          <span><BookOpen size={13} aria-hidden="true" /> {t.lessonsCount(lessonsCount)}</span>
          {videosCount > 0 && <span><Play size={13} aria-hidden="true" /> {t.videosCount(videosCount)}</span>}
          {labsCount > 0 && <span><FlaskConical size={13} aria-hidden="true" /> {t.labsCount(labsCount)}</span>}
        </div>

        {course.summary?.percent != null && <progress className="progress-course-track" value={percent} max={100} aria-label={t.overallProgress} />}
        <div className="progress-course-footer">
          <div className="progress-course-percent">
            <strong>{course.summary?.percent == null ? "—" : `${percent}%`}</strong>
            <span className={`progress-course-status ${isCompleted ? "is-completed" : percent > 0 ? "is-in-progress" : "is-todo"}`}>
              {course.summary?.percent == null ? t.progressUnavailable : isCompleted ? t.stateDone : percent > 0 ? t.stateDoing : t.stateTodo}
            </span>
          </div>
          <span className="progress-course-action">
            <span>{t.courseDetails}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </span>
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

  return (
    <div className="my-progress">
      <ErrorBox error={progress.error} />
      {progress.isError && (
        <button className="secondary" type="button" onClick={() => progress.refetch()}>
          {t.reload}
        </button>
      )}
      {progress.isPending ? (
        <Empty>{t.loading}</Empty>
      ) : summary ? (
        <>
                {/* Learning Progress Summary Ribbon */}
                <div className="progress-metric-ribbon">
                  <div className="progress-ribbon-header">
                    <span className="progress-ribbon-eyebrow">{t.overviewEyebrow}</span>
                    <div className="progress-ribbon-sync">
                      <Clock size={13} aria-hidden="true" />
                      <span>{t.computed(time(summary.updatedAt))}</span>
                    </div>
                  </div>

                <div className="stats progress-stats progress-ribbon-grid">
                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("assignments");
                      scrollTo("progress-completion");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.assignmentsDone}</span>
                      <BookOpen size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.activeAssignments ? `${summary.completedAssignments}/${summary.activeAssignments}` : "—"}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {summary.activeAssignments ? t.activeWorkDetail(summary.completedAssignments, summary.activeAssignments) : "Chưa có bài tập giao"}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("assignments");
                      scrollTo("progress-completion");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.stepsLeft}</span>
                      <ListChecks size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.activeAssignments ? summary.remainingRequiredSteps : "—"}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {t.stepsRemainingDetail}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("history");
                      scrollTo("progress-history");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.practicals(summary.passedPracticals)}</span>
                      <FlaskConical size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.practicalAttempts}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {t.practicalsDetail(summary.passedPracticals, summary.practicalAttempts)}
                    </p>
                  </button>
                </div>
              </div>

        </>
      ) : null}

              {/* URL-backed progress views. */}
              <nav className="progress-tabs-nav" aria-label="Phân loại tiến độ">
                <button
                  type="button"
                  aria-pressed={activeTab === "all"}
                  className={`progress-tab-btn ${activeTab === "all" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  <span>{t.tabAll}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "courses"}
                  className={`progress-tab-btn ${activeTab === "courses" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("courses")}
                >
                  <GraduationCap size={14} aria-hidden="true" />
                  <span>{t.tabCourses}</span>
                  <span className="progress-tab-badge tab-count">{activeCourses.length}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "assignments"}
                  className={`progress-tab-btn ${activeTab === "assignments" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("assignments")}
                >
                  <BookOpen size={14} aria-hidden="true" />
                  <span>{t.tabAssignments}</span>
                  <span className="progress-tab-badge tab-count">{assignments.length}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "history"}
                  className={`progress-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  <Clock size={14} aria-hidden="true" />
                  <span>{t.tabHistory}</span>
                  <span className="progress-tab-badge tab-count">{items.length}</span>
                </button>
              </nav>

              {/* Official curriculum only; assigned progress is shown separately. */}
              {(activeTab === "all" || activeTab === "courses") && (
                <section className="panel progress-section foundational-curriculum-section" aria-labelledby="foundational-progress-title">
                  <div className="progress-section-header">
                    <span className="eyebrow">{t.curriculumEyebrow}</span>
                    <h2 id="foundational-progress-title">{t.foundational}</h2>
                    <p className="muted">{t.foundationalIntro}</p>
                  </div>

                  {/* Filter, Search & Sort Bar */}
                  {activeCourses.length > 0 && <div className="progress-filter-bar">
                    <div className="progress-filter-group">
                      <span className="filter-label tiny muted">{t.filterGrade}:</span>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === "all" ? "is-active" : ""}`}
                        onClick={() => setGradeFilter("all")}
                      >
                        {t.filterAllGrades}
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === 8 ? "is-active" : ""}`}
                        onClick={() => setGradeFilter(8)}
                      >
                        {t.gradePill(8)}
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === 9 ? "is-active" : ""}`}
                        onClick={() => setGradeFilter(9)}
                      >
                        {t.gradePill(9)}
                      </button>
                    </div>

                    <div className="progress-filter-group">
                      <select
                        className="progress-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        aria-label={t.filterStatus}
                      >
                        <option value="all">{t.filterAllStatus}</option>
                        <option value="in_progress">{t.statusDoing}</option>
                        <option value="completed">{t.statusDone}</option>
                      </select>

                      <select
                        className="progress-filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        aria-label={t.sortLabel}
                      >
                        <option value="progress_desc">{t.sortProgressDesc}</option>
                        <option value="progress_asc">{t.sortProgressAsc}</option>
                        <option value="title">{t.sortTitle}</option>
                      </select>

                      <div className="progress-search-box">
                        <Search size={14} className="muted" aria-hidden="true" />
                        <input
                          type="text"
                          className="progress-search-input"
                          placeholder={t.searchPlaceholder}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Xóa tìm kiếm"
                            style={{ minHeight: "22px", width: "22px", padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>}

                  <ErrorBox error={foundational.error} />
                  {foundational.isPending ? (
                    <Empty>{t.loadingCurriculum}</Empty>
                  ) : foundational.isError ? (
                    <button type="button" className="secondary" onClick={() => foundational.refetch()}>{t.retry}</button>
                  ) : !activeCourses.length ? (
                    <Empty>{foundational.data?.courseVersionConfigured === false ? t.noCurriculum : t.curriculumEmpty}</Empty>
                  ) : filteredCourses.length ? (
                    <div className="progress-courses-grid">
                      {filteredCourses.map((course: any) => (
                        <CourseProgressCard
                          key={course.id}
                          course={course}
                          onSelect={(c) => setSelectedCourse(c)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty>
                      <p>{t.noFilteredCourses}</p>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setGradeFilter("all");
                          setStatusFilter("all");
                          setSearchQuery("");
                        }}
                      >
                        {t.resetFilter}
                      </button>
                    </Empty>
                  )}
                </section>
              )}

              {/* Section 2: Nhiệm vụ được giao (Assignments) */}
              {(activeTab === "all" || activeTab === "assignments") && (
                <section id="progress-completion" className="progress-section" aria-labelledby="progress-completion-title">
                  <div className="progress-section-header">
                    <span className="eyebrow">{t.assignedEyebrow}</span>
                    <h2 id="progress-completion-title">{t.assignments}</h2>
                  </div>
                  {progress.isPending ? (
                    <Empty>{t.loading}</Empty>
                  ) : progress.isError ? (
                    <p role="status">{t.assignedUnavailable}</p>
                  ) : assignments.length === 0 ? (
                    <Empty>
                      {t.noAssigned} <Link to="/">{t.home} →</Link>
                    </Empty>
                  ) : (
                    assignments.map((assignment) => (
                      <AssignmentProgress key={assignment.assignmentId} assignment={assignment} onOpen={open} />
                    ))
                  )}
                </section>
              )}

            {/* Section 3: Nhật ký học tập (Attempt History) */}
            {(activeTab === "all" || activeTab === "history") && (
              <section id="progress-history" className="panel progress-section" aria-labelledby="progress-history-title">
                <div className="progress-section-header">
                  <span className="eyebrow">{t.historyEyebrow}</span>
                  <h2 id="progress-history-title" tabIndex={-1}>{t.history}</h2>
                </div>
                {activity.isPending ? (
                  <Empty>{t.loadingHistory}</Empty>
                ) : activity.isError && !items.length ? (
                  <>
                    <ErrorBox error={activity.error} />
                    <button className="secondary" type="button" onClick={() => activity.refetch()}>{t.retry}</button>
                  </>
                ) : items.length === 0 ? (
                  <Empty>{t.noAttempts}</Empty>
                ) : (
                  <>
                    <ActivityGroups items={items} onOpen={open} />
                    {activity.isFetchNextPageError && (
                      <>
                        <ErrorBox error={activity.error} />
                        <button className="secondary" type="button" onClick={() => activity.fetchNextPage()}>{t.retryNext}</button>
                      </>
                    )}
                    {activity.hasNextPage && !activity.isFetchNextPageError && (
                      <button className="secondary load-more" type="button" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                        {activity.isFetchingNextPage ? t.loadingShort : t.older}
                      </button>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Course Detail Modal (Drilldown) */}
            {selectedCourse && (
              <CourseDetailModal
                course={selectedCourse}
                onClose={() => setSelectedCourse(null)}
              />
            )}

            {sheet.length > 0 && (
              <EvidenceSheet onClose={close} onBack={sheet.length > 1 ? back : undefined}>
                <SheetContent view={sheet.at(-1)!} push={push} />
              </EvidenceSheet>
            )}
          </div>
          );
}
