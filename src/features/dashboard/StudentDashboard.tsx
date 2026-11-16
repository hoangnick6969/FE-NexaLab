import { useQuery } from "@tanstack/react-query";
import { FlaskConical, BookOpen, ArrowUpRight, ArrowRight, Check, Lock, ClipboardList, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { api, type MyProgressResponse, type StudentPathway, type StudentLearningStep, type User } from "../../lib/api";
import { Badge, Empty, ErrorBox, verdictLabel, InlineLoader } from "../../components/ui";
import { LabCards } from "../labs/LabLibrary";
import { labInfo } from "../labs/lab-info";
import { defineText, formatDate } from "../../i18n";
import { lessonActivityHref, lessonReviewHref } from "../lessons/lesson-navigation";
import { commonText } from "../../i18n/common";
import { openResumeAction, selectAssignedWork, selectOpenResume, type OpenCurriculumSubject } from "./dashboard-continue";

const text = defineText({
  vi: {
    stepNames: { READING: "Đọc nội dung", VIDEO: "Xem video", BASIC_EXERCISE: "Làm bài luyện tập", STUDY_CARDS: "Ôn thẻ ghi nhớ", QUIZ: "Làm bài kiểm tra nhỏ", LAB: "Bắt đầu thực hành", CHALLENGE: "Mở thử thách" } as Record<string, string>,
    weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    eyebrow: (grade: number) => `KHÔNG GIAN HỌC TẬP · LỚP ${grade}`,
    hello: (name: string) => `Chào ${name}`,
    intro: "Bài học, bài tập và những lần em tự thử.",
    science: "KHOA HỌC TỰ NHIÊN",
    summary: "Tóm tắt hoạt động học tập",
    lessonsDone: "Bài học hoàn thành",
    loadingProgress: "Đang tải tiến độ",
    loadFailed: "Chưa tải được dữ liệu",
    seeProgress: "Xem tiến độ của em",
    noneCompleted: "Chưa hoàn thành bài nào",
    noLearningData: "Chưa có dữ liệu học",
    assignmentsLabel: "Bài tập",
    loadingAssigned: "Đang tải bài giao",
    dueSoonFirst: "Sắp đến hạn trước",
    noAssigned: "Chưa có bài được giao",
    simAttempts: "Lượt thử mô phỏng",
    loadingHistory: "Đang tải lịch sử",
    seePracticeHistory: "Xem lịch sử thực hành",
    noAttempts: "Chưa có lần thử nào",
    lessonsAndAssignments: "BÀI HỌC & BÀI TẬP",
    startFromBasics: "BẮT ĐẦU TỪ KIẾN THỨC NỀN",
    findingNext: "Đang tìm bài học tiếp theo",
    yourNext: "Bài học tiếp theo của em",
    checking: "Đang kiểm tra bài tập của em.",
    howTo: "Chọn một bài để đọc, xem video hoặc thực hành theo nhịp của em.",
    resumeLabel: "TIẾP TỤC HỌC",
    reviewLabel: "XEM LẠI BÀI HỌC",
    reviewCopy: "Mở lại bài học để xem nội dung và tiến độ đã lưu.",
    reviewLesson: "Xem lại bài học",
    assignmentProgressUnavailable: "Chưa kiểm tra được tiến độ bài được giao. Em vẫn có thể học tiếp nội dung mở hoặc xem danh sách bài tập.",
    continueLearning: "Tiếp tục",
    resumeCopy: "Tiếp tục từ hoạt động đang học dở. Tiến độ đã lưu của em được giữ lại.",
    stepOf: (n: number, total: number) => `Bước ${n}/${total}`,
    allSeen: "Em đã xem hết các bước trong bài này.",
    lessonGroup: "Bài học",
    assignmentGroup: "Bài tập",
    reviewPathway: "Xem lại lộ trình bài học",
    openAssignment: "Mở bài tập",
    chooseLesson: "Chọn bài học để bắt đầu",
    pathwayLabel: "Lộ trình học tập và bài tập",
    stepsDone: (done: number, total: number) => `${done}/${total} bước`,
    unlockQuiz: "Hoàn thành bài kiểm tra để mở khóa.",
    unlockPrevious: "Hoàn thành bước trước để mở khóa.",
    yourActivity: "HOẠT ĐỘNG CỦA EM",
    thisWeek: "Tuần này",
    loadingShort: "Đang tải…",
    activeDays: (n: number) => `${n} ngày có hoạt động`,
    noActivity: "Chưa có hoạt động tuần này",
    loadingActivity: "Đang tải dữ liệu hoạt động…",
    activityFailed: "Chưa thể tải hoạt động tuần này.",
    weeklyAria: (list: string) => `Hoạt động từ thứ Hai đến Chủ nhật: ${list}`,
    dayCount: (day: string, n: number) => `${day} ${n} lượt`,
    dayTitle: (date: string, n: number) => `${date}: ${n} lượt ghi nhận`,
    noActivityDot: "Chưa có hoạt động tuần này.",
    afterLearning: "SAU KHI ĐÃ HỌC",
    simAndPractice: "Mô phỏng và thực hành",
    seeAssignments: "Xem bài tập",
    relatedIntro: "Mỗi mô phỏng gắn với kiến thức em vừa học. Em có thể mở phần thực hành phù hợp để khám phá thêm.",
    byDueDate: "THEO HẠN HOÀN THÀNH",
    loadingAssignedLong: "Đang nạp bài được giao…",
    retry: "Thử lại",
    overdueStillOpen: "Đã quá hạn · vẫn có thể học",
    noAssignments: "Chưa có bài tập được giao.",
    openAssignmentList: "Mở danh sách bài tập",
    yourAttempts: "NHỮNG LẦN EM ĐÃ THỬ",
    recent: "Gần đây",
    allPracticeHistory: "Xem toàn bộ lịch sử thực hành",
    loadingPracticeHistory: "Đang nạp lịch sử thực hành…",
    practiceAttempt: "Lượt thực hành",
    noRecordedAttempts: "Chưa có lần thử nào được ghi lại.",
  },
  en: {
    stepNames: { READING: "Read the content", VIDEO: "Watch the video", BASIC_EXERCISE: "Practice exercises", STUDY_CARDS: "Review study cards", QUIZ: "Take the short quiz", LAB: "Start the practice", CHALLENGE: "Open the challenge" },
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    eyebrow: (grade: number) => `LEARNING SPACE · GRADE ${grade}`,
    hello: (name: string) => `Hi ${name}`,
    intro: "Lessons, assignments and your own attempts.",
    science: "NATURAL SCIENCE",
    summary: "Learning activity summary",
    lessonsDone: "Lessons completed",
    loadingProgress: "Loading progress",
    loadFailed: "Could not load data",
    seeProgress: "See your progress",
    noneCompleted: "No lessons completed yet",
    noLearningData: "No learning data yet",
    assignmentsLabel: "Assignments",
    loadingAssigned: "Loading assigned work",
    dueSoonFirst: "Soonest due first",
    noAssigned: "Nothing assigned yet",
    simAttempts: "Simulation attempts",
    loadingHistory: "Loading history",
    seePracticeHistory: "See practice history",
    noAttempts: "No attempts yet",
    lessonsAndAssignments: "LESSONS & ASSIGNMENTS",
    startFromBasics: "START FROM THE BASICS",
    findingNext: "Finding your next lesson",
    yourNext: "Your next lesson",
    checking: "Checking your assignments.",
    howTo: "Choose a lesson to read, watch or practice at your own pace.",
    resumeLabel: "CONTINUE LEARNING",
    reviewLabel: "REVIEW THE LESSON",
    reviewCopy: "Reopen the lesson to review its content and saved progress.",
    reviewLesson: "Review the lesson",
    assignmentProgressUnavailable: "Assigned progress could not be checked. You can still open your lessons or view the assignment list.",
    continueLearning: "Continue",
    resumeCopy: "Continue the unfinished activity with your saved progress.",
    stepOf: (n: number, total: number) => `Step ${n}/${total}`,
    allSeen: "You have seen every step of this lesson.",
    lessonGroup: "Lesson",
    assignmentGroup: "Assignment",
    reviewPathway: "Review the lesson pathway",
    openAssignment: "Open the assignment",
    chooseLesson: "Choose a lesson to start",
    pathwayLabel: "Learning and assignment pathway",
    stepsDone: (done: number, total: number) => `${done}/${total} steps`,
    unlockQuiz: "Pass the quiz to unlock.",
    unlockPrevious: "Finish the previous step to unlock.",
    yourActivity: "YOUR ACTIVITY",
    thisWeek: "This week",
    loadingShort: "Loading…",
    activeDays: (n: number) => `${n} active ${n === 1 ? "day" : "days"}`,
    noActivity: "No activity this week",
    loadingActivity: "Loading activity…",
    activityFailed: "This week's activity could not be loaded.",
    weeklyAria: (list: string) => `Activity from Monday to Sunday: ${list}`,
    dayCount: (day: string, n: number) => `${day} ${n}`,
    dayTitle: (date: string, n: number) => `${date}: ${n} recorded`,
    noActivityDot: "No activity this week.",
    afterLearning: "AFTER LEARNING",
    simAndPractice: "Simulations and practice",
    seeAssignments: "See assignments",
    relatedIntro: "Each simulation builds on what you just learned. Open the matching practice to explore further.",
    byDueDate: "BY DUE DATE",
    loadingAssignedLong: "Loading assigned work…",
    retry: "Try again",
    overdueStillOpen: "Overdue · still open",
    noAssignments: "No assignments yet.",
    openAssignmentList: "Open the assignment list",
    yourAttempts: "YOUR ATTEMPTS",
    recent: "Recent",
    allPracticeHistory: "See all practice history",
    loadingPracticeHistory: "Loading practice history…",
    practiceAttempt: "Practice attempt",
    noRecordedAttempts: "No attempts recorded yet.",
  },
});

export function StudentDashboard({
  user,
  stats,
  assignments,
}: {
  user: User;
  stats: any;
  assignments: any;
}) {
  const reduceMotion = useReducedMotion();
  const t = text();
  const officialProgress = useQuery<MyProgressResponse>({
    queryKey: ["me-progress"], queryFn: () => api("/me/progress"),
  });
  const assignment = officialProgress.data
    ? selectAssignedWork<any>(assignments.data ?? [], officialProgress.data.assignments)
    : undefined;
  const assignmentDetail = useQuery<any>({
    queryKey: ["assignment", assignment?.id],
    queryFn: () => api("/assignments/" + assignment.id),
    enabled: Boolean(assignment?.id),
  });
  const lessonId = assignmentDetail.data?.contentType === "lesson"
    ? assignmentDetail.data.content.id
    : null;
  const pathwayQuery = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", lessonId, assignment?.id],
    queryFn: () => api("/lessons/" + lessonId + "/pathway?assignmentId=" + encodeURIComponent(assignment.id)),
    enabled: Boolean(lessonId),
  });
  const progress = stats.data?.progress ?? [];
  const openCurriculum = useQuery<{ subjects?: OpenCurriculumSubject[] }>({
    queryKey: ["student-open-curriculum"],
    queryFn: () => api("/open-curriculum"),
    enabled: !assignment && progress.some((item: any) => item.status === "in_progress"),
  });
  const resume = selectOpenResume(progress, openCurriculum.data?.subjects ?? []);
  const resumeLesson = useQuery<{ steps: Array<Omit<StudentLearningStep, "state"> & { state: string }> }>({
    queryKey: ["open-curriculum-lesson", resume?.id],
    queryFn: () => api(`/open-curriculum/lessons/${encodeURIComponent(resume!.id)}`),
    enabled: !assignment && Boolean(resume),
  });
  const resumeAction = resume ? openResumeAction(resume.id, resumeLesson.data?.steps ?? []) : undefined;
  const resumeStep = resumeAction?.step;
  const attempts = stats.data?.attempts ?? [];
  const pathway = pathwayQuery.data;
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  const stepNames: Record<string, string> = t.stepNames;
  const continueIsLoading = (!assignment && !resume && ((assignments.isPending && !assignments.data) || (officialProgress.isPending && !officialProgress.data))) || (assignment
    ? (assignmentDetail.isPending && !assignmentDetail.data) || (Boolean(lessonId) && pathwayQuery.isPending && !pathwayQuery.data)
    : (stats.isPending && !stats.data) || (openCurriculum.isPending && openCurriculum.isFetching && !openCurriculum.data) || (Boolean(resume) && resumeLesson.isPending && !resumeLesson.data));
  const continueError = assignments.error || (assignment
    ? assignmentDetail.error || pathwayQuery.error
    : stats.error || openCurriculum.error || resumeLesson.error);
  const continueHref = assignment
    ? nextStep?.type === "STUDY_CARDS" ? `/classes?tab=resources&assignmentId=${encodeURIComponent(assignment.id)}`
      : nextStep && ["READING", "VIDEO"].includes(nextStep.type) && lessonId
        ? lessonActivityHref(lessonId, nextStep.type, assignment.id) ?? lessonReviewHref(lessonId)
        : `/assignments/${encodeURIComponent(assignment.id)}${nextStep ? `#step-${encodeURIComponent(nextStep.id)}` : ""}`
    : resumeAction?.href ?? "/lessons";
  const subjectName = pathway?.lesson.subject.name ?? resume?.subjectName;
  const subjectTone = subjectName?.includes("Vật lý")
    ? "physics"
    : subjectName?.includes("Hóa học")
      ? "chemistry"
      : subjectName?.includes("Sinh học")
        ? "biology"
        : "neutral";
  const recentAttempts = attempts.slice(0, 4);
  const lessonCount = progress.filter((item: any) => item.status === "completed").length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date, label: t.weekdays[index], count: 0 };
  });
  const addActivityDate = (value: string) => {
    const date = new Date(value);
    const day = Math.floor((date.setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    if (!Number.isNaN(day) && day >= 0 && day < weeklyActivity.length) weeklyActivity[day].count += 1;
  };
  progress.forEach((item: any) => item.updatedAt && addActivityDate(item.updatedAt));
  attempts.forEach((attempt: any) => attempt.createdAt && addActivityDate(attempt.createdAt));
  const activeDays = weeklyActivity.filter((day) => day.count > 0).length;
  const maxActivity = Math.max(1, ...weeklyActivity.map((day) => day.count));

  return (
    <div className="student-dashboard">
      <header className="student-dashboard-heading">
        <div>
          <p className="eyebrow">{t.eyebrow(user.grade)}</p>
          <h1>{t.hello(user.fullName.split(" ").at(-1) ?? "")}</h1>
          <p className="student-heading-copy">{t.intro}</p>
        </div>
        <Badge tone="outline">{t.science}</Badge>
      </header>

      <section className="student-stats" aria-label={t.summary}>
        <StudentStat
          label={t.lessonsDone}
          value={stats.isLoading || stats.error || !progress.length ? "—" : lessonCount}
          detail={stats.isLoading ? t.loadingProgress : stats.error ? t.loadFailed : progress.length ? lessonCount ? t.seeProgress : t.noneCompleted : t.noLearningData}
          icon={<BookOpen />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={0}
        />
        <StudentStat
          label={t.assignmentsLabel}
          value={assignments.isLoading || assignments.error || !assignments.data?.length ? "—" : assignments.data.length}
          detail={assignments.isLoading ? t.loadingAssigned : assignments.error ? t.loadFailed : assignments.data?.length ? t.dueSoonFirst : t.noAssigned}
          icon={<ClipboardList />}
          to="/assignments"
          reduceMotion={reduceMotion}
          index={1}
        />
        <StudentStat
          label={t.simAttempts}
          value={stats.isLoading || stats.error || !attempts.length ? "—" : attempts.length}
          detail={stats.isLoading ? t.loadingHistory : stats.error ? t.loadFailed : attempts.length ? t.seePracticeHistory : t.noAttempts}
          icon={<FlaskConical />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={2}
        />
      </section>

      {(stats.error || assignments.error) && (
        <div className="student-dashboard-error" role="alert">
          <ErrorBox error={stats.error || assignments.error} />
        </div>
      )}

      <div className="student-dashboard-columns">
        <div className="student-dashboard-main">
          <section className={`student-continue-card subject-${subjectTone}`}>
            <div className="student-continue-copy">
              <span className="student-card-kicker">
                {assignment ? subjectName || t.lessonsAndAssignments : resume ? resumeAction?.review ? t.reviewLabel : t.resumeLabel : t.startFromBasics}
              </span>
              <h2>
                {assignment
                  ? pathway?.lesson.title || assignmentDetail.data?.content?.title || assignment.title
                  : continueIsLoading
                    ? t.findingNext
                    : resume?.title || t.yourNext}
              </h2>
              <p>
                {assignment
                  ? pathway?.lesson.learningObjective || assignmentDetail.data?.content?.learningObjective || assignment.classroom.name
                  : continueIsLoading
                    ? t.checking
                    : resume ? resumeAction?.review ? t.reviewCopy : t.resumeCopy : t.howTo}
              </p>
              {pathway && nextStep && (
                <p className="student-step-position">
                  {t.stepOf(pathway.steps.findIndex((step) => step.id === nextStep.id) + 1, pathway.steps.length)}
                  {" · "}{stepNames[nextStep.type]}
                </p>
              )}
              {pathway && !nextStep && <p className="student-step-position">{t.allSeen}</p>}
              {continueError && (
                <div role="alert">
                  <ErrorBox error={continueError} />
                  <button type="button" className="secondary" onClick={() => {
                    if (assignments.error) assignments.refetch();
                    if (stats.error) stats.refetch();
                    if (openCurriculum.error) openCurriculum.refetch();
                    if (resumeLesson.error) resumeLesson.refetch();
                    if (assignmentDetail.error) assignmentDetail.refetch();
                    if (pathwayQuery.error) pathwayQuery.refetch();
                  }}>{t.retry}</button>
                </div>
              )}
              {officialProgress.error && <div role="alert">
                <p>{t.assignmentProgressUnavailable}</p>
                <ErrorBox error={officialProgress.error} />
                <div className="button-row">
                  <button type="button" className="secondary" onClick={() => officialProgress.refetch()}>{t.retry}</button>
                  <Link className="secondary" to="/assignments">{t.openAssignmentList}</Link>
                </div>
              </div>}
              {continueIsLoading ? <InlineLoader message={t.findingNext} size="sm" /> : <Link className="student-continue-action" to={continueHref}>
                {assignment ? nextStep
                  ? `${t.continueLearning} · ${stepNames[nextStep.type]}`
                  : t.openAssignment
                  : resume ? resumeAction?.review ? t.reviewLesson : `${t.continueLearning} · ${stepNames[resumeStep!.type] ?? t.lessonGroup}` : t.chooseLesson}
                <ArrowRight size={18} />
              </Link>}

            </div>
            {assignment && (
              <div className="student-continue-art" aria-hidden="true">
                <svg viewBox="0 0 240 210" fill="none">
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(-28 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(34 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(90 120 105)" />
                  <circle cx="120" cy="105" r="22" className="illustration-core" />
                  <circle cx="43" cy="128" r="6" className="illustration-dot" />
                  <circle cx="166" cy="29" r="5" className="illustration-dot" />
                  <circle cx="195" cy="157" r="7" className="illustration-dot" />
                </svg>
              </div>
            )}
          </section>

          {pathway && (
            <section className="student-pathway-card" aria-label={t.pathwayLabel}>
              <div className="student-pathway-heading">
                <div><span className="eyebrow">{t.lessonsAndAssignments}</span><h3>{pathway.lesson.title}</h3></div>
                <span>{t.stepsDone(pathway.steps.filter((step) => step.state === "COMPLETED").length, pathway.steps.length)}</span>
              </div>
              {([[t.lessonGroup, ["READING", "VIDEO"]], ["Class Space", ["STUDY_CARDS"]], [t.assignmentGroup, ["QUIZ", "LAB", "CHALLENGE"]]] as const).map(([groupName, types]) => <div className="student-pathway-group" key={groupName}>
              <h4>{groupName}</h4>
              <ol className="student-pathway-steps">
                {pathway.steps.filter((step) => (types as readonly string[]).includes(step.type)).map((step) => {
                  const isLocked = step.state === "LOCKED";
                  return (
                    <li key={step.id} className={`student-pathway-step ${step.state.toLowerCase()}`}>
                      {isLocked ? (
                        <button disabled title={step.lockReasonCode === "QUIZ_NOT_PASSED" ? t.unlockQuiz : t.unlockPrevious}>
                          <Lock size={15} strokeWidth={1.75} /><span>{stepNames[step.type]}</span>
                        </button>
                      ) : (
                        <Link to={step.type === "STUDY_CARDS" ? `/classes?tab=resources&assignmentId=${encodeURIComponent(assignment.id)}` : lessonId && ["READING", "VIDEO"].includes(step.type) ? (lessonActivityHref(lessonId, step.type, assignment.id) ?? lessonReviewHref(lessonId)) : `/assignments/${assignment.id}#step-${step.id}`}>
                          {step.state === "COMPLETED" ? <Check size={15} strokeWidth={2} /> : <Clock3 size={15} strokeWidth={1.75} />}
                          <span>{stepNames[step.type]}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
              </div>)}
            </section>
          )}

          <section className="student-weekly-card" aria-labelledby="student-weekly-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">{t.yourActivity}</p><h2 id="student-weekly-title">{t.thisWeek}</h2></div>
              <span className="student-weekly-summary">
                {stats.isLoading ? t.loadingShort : activeDays ? t.activeDays(activeDays) : t.noActivity}
              </span>
            </div>
            {stats.isLoading ? (
              <InlineLoader message={t.loadingActivity} size="sm" />
            ) : stats.error ? (
              <Empty>{t.activityFailed}</Empty>
            ) : activeDays ? (
              <div className="student-weekly-chart" role="img" aria-label={t.weeklyAria(weeklyActivity.map((day) => t.dayCount(day.label, day.count)).join(", "))}>
                {weeklyActivity.map((day) => (
                  <div className="student-weekly-day" key={day.label} title={t.dayTitle(formatDate(day.date), day.count)}>
                    <span className="student-weekly-count">{day.count || ""}</span>
                    <span className="student-weekly-track"><i style={{ height: day.count ? `${Math.max(12, (day.count / maxActivity) * 100)}%` : "4px" }} /></span>
                    <span className="student-weekly-label">{day.label}</span>
                  </div>
                ))}
              </div>
            ) : <div className="student-weekly-empty">{t.noActivityDot}</div>}
          </section>

          <section className="student-related-work">
            <div className="student-section-heading">
              <div><p className="eyebrow">{t.afterLearning}</p><h2>{t.simAndPractice}</h2></div>
            <Link to="/assignments">{t.seeAssignments} <ArrowRight size={15} /></Link>
            </div>
            <p className="student-related-intro">{t.relatedIntro}</p>
            <LabCards guided />
          </section>
        </div>

        <aside className="student-dashboard-aside">
          <section id="student-exercises" className="student-side-card" aria-labelledby="student-assignments-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">{t.byDueDate}</p><h2 id="student-assignments-title">{t.assignmentsLabel}</h2></div>
              <span className="student-side-count">{assignments.data?.length || "—"}</span>
            </div>
            {assignments.isLoading ? <InlineLoader message={t.loadingAssignedLong} size="sm" /> : assignments.error ? (
              <div role="alert"><ErrorBox error={assignments.error} /><button onClick={() => assignments.refetch()}>{t.retry}</button></div>
            ) : assignments.data?.length ? (
              <div className="student-list">
                {assignments.data.map((item: any) =>
                  item.canOpen === false ? (
                    <div key={item.id} className="student-assignment-row" aria-disabled="true">
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.notice}</small></span>
                    </div>
                  ) : (
                    <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? commonText().due(formatDate(item.dueDate)) : commonText().noDueDate}</small>{item.overdue && <small className="student-overdue">{t.overdueStillOpen}</small>}{item.notice && <small>{item.notice}</small>}</span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div className="student-empty"><ClipboardList size={22} /><p>{t.noAssignments}</p><Link to="/assignments">{t.openAssignmentList}</Link></div>
            )}
          </section>

          <section className="student-side-card" aria-labelledby="student-attempts-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">{t.yourAttempts}</p><h2 id="student-attempts-title">{t.recent}</h2></div>
              <Link to="/progress" aria-label={t.allPracticeHistory}><ArrowRight size={17} /></Link>
            </div>
            {stats.isLoading ? <InlineLoader message={t.loadingPracticeHistory} size="sm" /> : stats.error ? (
              <div role="alert"><ErrorBox error={stats.error} /><button onClick={() => stats.refetch()}>{t.retry}</button></div>
            ) : recentAttempts.length ? (
              <div className="student-list">
                {recentAttempts.map((attempt: any) => {
                  const lab = labInfo.find((item) => item.id === attempt.challengeId);
                  return (
                    <Link className="student-attempt-row" key={attempt.id} to={`/progress?tab=history&attemptId=${encodeURIComponent(attempt.id)}#progress-history`}>
                      <span><FlaskConical size={18} /></span>
                      <span className="student-attempt-copy"><b>{lab?.title || t.practiceAttempt}</b><small>{formatDate(attempt.createdAt)}</small></span>
                      <Badge tone={attempt.verdict}>{verdictLabel(attempt.verdict)}</Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="student-empty"><FlaskConical size={22} /><p>{t.noRecordedAttempts}</p></div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StudentStat({
  label,
  value,
  detail,
  icon,
  to,
  reduceMotion,
  index,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
  to: string;
  reduceMotion: boolean | null;
  index: number;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.06 }}
    >
      <Link className="student-stat" to={to}>
        <span className="student-stat-icon">{icon}</span>
        <span className="student-stat-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span>
        <ArrowRight className="student-stat-arrow" size={17} />
      </Link>
    </motion.div>
  );
}
