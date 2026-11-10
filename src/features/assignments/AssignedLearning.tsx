import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, GraduationCap } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type StudentPathway } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader } from "../../components/ui";
import { PracticalPathwayStep } from "../labs/pathways/PracticalPathwayStep";
import { AttributionNote } from "../lessons/library";
import { AssignedTest } from "./AssignedTest";
import { AssignedWritten } from "./AssignedWritten";
import { QuizLearningStep } from "./QuizLearningStep";
import { defineText, formatDate, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";
import { labInfo } from "../labs/lab-info";

const text = defineText({
  vi: {
    loading: "Đang nạp bài tập…",
    caption: "NexaLab · Phòng thí nghiệm mô phỏng",
    retry: "Thử lại",
    loadingPathway: "Đang nạp lộ trình bài học…",
    pathwayCaption: "NexaLab · Khoa học tự nhiên",
    stepNames: { QUIZ: "Kiểm tra kiến thức", LAB: "Thực hành trong phòng lab", CHALLENGE: "Hoàn thành thử thách" } as Record<string, string>,
    stateNames: { COMPLETED: "Đã hoàn thành", IN_PROGRESS: "Đang học", LOCKED: "Đã khóa" } as Record<string, string>,
    continueNames: { QUIZ: "Bắt đầu kiểm tra", LAB: "Bắt đầu thực hành", CHALLENGE: "Hoàn thành thử thách" } as Record<string, string>,
    lockReasons: { PREREQUISITE_INCOMPLETE: "Hoàn thành bước trước để tiếp tục.", QUIZ_NOT_PASSED: "Vượt qua bài kiểm tra để mở khóa bước này.", PRACTICE_NOT_PASSED: "Hoàn thành phần thực hành để mở khóa thử thách." } as Record<string, string>,
    eyebrow: "BÀI TẬP",
    grade: (grade: number | string | undefined) => `LỚP ${grade ?? ""}`,
    objective: "Mục tiêu học tập:",
    prerequisites: "Kiến thức nền:",
    none: "Không yêu cầu",
    overdue: "Đã quá hạn nhưng vẫn có thể học",
    archivedNotice: "Nội dung này không còn được cập nhật. Em vẫn có thể học tiếp phần đã bắt đầu.",
    lessonSteps: "Các bước học tập",
    lessonUnfinishedBody: "Hãy đọc nội dung và xem video trong mục Bài học trước. Tiến độ được lưu theo từng bước. Thẻ ôn tập nằm trong Class Space.",
    reviewCards: "Ôn thẻ trong Class Space",
    backToLesson: "Quay lại Bài học",
    noActivities: "Bài tập này chưa có bài kiểm tra hoặc hoạt động thực hành.",
    pathwayLabel: "Bài tập và thực hành",
    step: (n: number) => `Bước ${n}`,
    stepUnavailable: "Bước học chưa khả dụng",
    openLab: "Mở phòng lab",
    teacher: "Giáo viên",
    assignedAt: (date: string) => `Giao lúc ${date}`,
  },
  en: {
    loading: "Loading the assignment…",
    caption: "NexaLab · Simulation lab",
    retry: "Try again",
    loadingPathway: "Loading the lesson pathway…",
    pathwayCaption: "NexaLab · Natural science",
    stepNames: { QUIZ: "Knowledge check", LAB: "Practice in the lab", CHALLENGE: "Complete the challenge" },
    stateNames: { COMPLETED: "Completed", IN_PROGRESS: "In progress", LOCKED: "Locked" },
    continueNames: { QUIZ: "Start the quiz", LAB: "Start the practice", CHALLENGE: "Complete the challenge" },
    lockReasons: { PREREQUISITE_INCOMPLETE: "Finish the previous step to continue.", QUIZ_NOT_PASSED: "Pass the quiz to unlock this step.", PRACTICE_NOT_PASSED: "Finish the practice to unlock the challenge." },
    eyebrow: "ASSIGNMENT",
    grade: (grade: number | string | undefined) => `GRADE ${grade ?? ""}`,
    objective: "Learning objective:",
    prerequisites: "Prerequisites:",
    none: "None",
    overdue: "Overdue but still open",
    archivedNotice: "This content is no longer updated. You can still continue what you started.",
    lessonSteps: "Learning steps",
    lessonUnfinishedBody: "Read the content and watch the video under Lessons first. Progress is saved step by step. Study cards are in Class Space.",
    reviewCards: "Review cards in Class Space",
    backToLesson: "Back to the lesson",
    noActivities: "This assignment has no quiz or practice yet.",
    pathwayLabel: "Assignments and practice",
    step: (n: number) => `Step ${n}`,
    stepUnavailable: "This step is not available yet",
    openLab: "Open the lab",
    teacher: "Teacher",
    assignedAt: (date: string) => `Assigned ${date}`,
  },
});

export function AssignedLearning() {
  const t = text();
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
    queryKey: ["lesson-pathway", lessonId, id],
    queryFn: () => api("/lessons/" + lessonId + "/pathway?assignmentId=" + encodeURIComponent(id!)),
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
  if (query.isLoading) return <PageLoader message={t.loading} caption={t.caption} />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>{t.retry}</button></div>;
  const assignment = query.data;
  const content = assignment.content;
  const teacherName = assignment.classroom.teacher?.fullName || (assignment.classroom.teacher?.username ? `@${assignment.classroom.teacher.username}` : t.teacher);
  const sourceLab = assignment.contentType === "lab" ? labInfo.find((lab) => lab.id === content.id) : undefined;
  if (assignment.contentType === "test") return <AssignedTest assignment={assignment} />;
  if (assignment.contentType === "written") return <AssignedWritten assignment={assignment} />;
  if (assignment.contentType === "lesson" && pathwayQuery.isLoading)
    return <PageLoader message={t.loadingPathway} caption={t.pathwayCaption} />;
  if (assignment.contentType === "lesson" && pathwayQuery.error)
    return <div><ErrorBox error={pathwayQuery.error} /><button onClick={() => pathwayQuery.refetch()}>{t.retry}</button></div>;
  const pathway = pathwayQuery.data;
  const lesson = pathway?.lesson ?? content;
  const stepNames: Record<string, string> = t.stepNames;
  const stateNames: Record<string, string> = t.stateNames;
  const continueNames: Record<string, string> = t.continueNames;
  const lockReasons: Record<string, string> = t.lockReasons;
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  return (
    <div className="student-assigned-learning">
      <PageHeading
        eyebrow={t.eyebrow}
        title={lesson.title}
        description={`${assignment.classroom.name} · ${assignment.dueDate ? commonText().due(formatDate(assignment.dueDate)) : commonText().noDueDate}`}
      />
      <section className="panel lesson-content">
        {sourceLab?.thumbnail && <img className="assigned-lab-thumbnail" src={sourceLab.thumbnail} alt={sourceLab.title} />}
        {assignment.contentType === "lab" && <div className="assigned-lab-meta">
          <span><GraduationCap size={15} aria-hidden="true" />{t.teacher}: {teacherName}</span>
          {assignment.createdAt && <span><Clock3 size={15} aria-hidden="true" />{t.assignedAt(formatDateTime(assignment.createdAt))}</span>}
          <span><Clock3 size={15} aria-hidden="true" />{assignment.dueDate ? commonText().due(formatDateTime(assignment.dueDate)) : commonText().noDueDate}</span>
        </div>}
        <p className="eyebrow">
          {lesson.subject?.name} · {t.grade(lesson.grade ?? lesson.subject?.grade)}
        </p>
        <h2>{lesson.topic}</h2>
        <div className="notice">
          <b>{t.objective}</b> {lesson.learningObjective}
          <br />
          <b>{t.prerequisites}</b> {lesson.prerequisites || t.none}
        </div>
        {assignment.overdue && <Badge tone="outline">{t.overdue}</Badge>}
        {pathway?.contentArchived && (
          <p className="notice" role="status">{t.archivedNotice}</p>
        )}
        <AttributionNote value={pathway?.attribution} />
        {assignment.contentType === "lesson" && pathway ? (
          <>
          {pathway.steps.some((step) => ["READING", "VIDEO", "STUDY_CARDS"].includes(step.type) && step.state !== "COMPLETED") && (
            <div className="notice"><b>{t.lessonSteps}</b><p>{t.lessonUnfinishedBody}</p><Link className="primary" to={`/lessons/${encodeURIComponent(lesson.id)}?assignmentId=${encodeURIComponent(assignment.id)}`}>{t.backToLesson} <ArrowUpRight size={15} /></Link>{pathway.steps.some((step) => step.type === "STUDY_CARDS" && step.state !== "COMPLETED") && <Link className="secondary" to={`/classes?tab=resources&assignmentId=${encodeURIComponent(assignment.id)}`}>{t.reviewCards}</Link>}</div>
          )}
          {!pathway.steps.some((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)) && <Empty>{t.noActivities}</Empty>}
          <div className="lesson-pathway" aria-label={t.pathwayLabel}>
            <ol className="pathway-steps">
              {pathway.steps.filter((step) => ["QUIZ", "LAB", "CHALLENGE"].includes(step.type)).map((step, index) => (
                <li
                  id={"step-" + step.id}
                  className={"pathway-step pathway-step--" + step.state.toLowerCase()}
                  key={step.id}
                >
                  <div className="pathway-step-heading">
                    <div>
                      <span className="pathway-position">{t.step(index + 1)}</span>
                      <h3>{stepNames[step.type]}</h3>
                    </div>
                    <Badge tone={step.state === "COMPLETED" ? "passed" : "outline"}>
                      {stateNames[step.state]}
                    </Badge>
                  </div>
                  {step.state === "LOCKED" && (
                    <p className="pathway-lock">{step.lockReasonCode ? lockReasons[step.lockReasonCode] : t.stepUnavailable}</p>
                  )}
                  {step.type === "QUIZ" && ["IN_PROGRESS", "COMPLETED"].includes(step.state) && (
                    <QuizLearningStep
                      lessonId={String(lessonId)}
                      assignmentId={String(id)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId, id], updatedPathway)
                      }
                    />
                  )}
                  {(step.type === "LAB" || step.type === "CHALLENGE") && step.state !== "LOCKED" && (
                    <PracticalPathwayStep
                      lessonId={String(lessonId)}
                      assignmentId={String(id)}
                      step={step}
                      onReconciled={(updatedPathway) =>
                        queryClient.setQueryData(["lesson-pathway", lessonId, id], updatedPathway)
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
          <Link className="primary" to={`/labs/${encodeURIComponent(content.id)}?assignmentId=${encodeURIComponent(assignment.id)}`}>
            {t.openLab} <ArrowUpRight size={16} />
          </Link>
        )}
      </section>
    </div>
  );
}
