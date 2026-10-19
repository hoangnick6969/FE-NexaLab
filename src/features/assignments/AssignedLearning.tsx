import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type StudentPathway } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader } from "../../components/ui";
import { PracticalPathwayStep } from "../labs/PracticalPathwayStep";
import { AttributionNote } from "../lessons/library";
import { AssignedTest } from "./AssignedTest";
import { QuizLearningStep } from "./QuizLearningStep";

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
  if (query.isLoading) return <PageLoader message="Đang nạp bài tập…" caption="NexaLab · Phòng thí nghiệm mô phỏng" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  const assignment = query.data;
  const content = assignment.content;
  if (assignment.contentType === "test") return <AssignedTest assignment={assignment} />;
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
    <div className="student-assigned-learning">
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
          <Link className="primary" to={"/labs/" + content.id}>
            Mở phòng lab <ArrowUpRight size={16} />
          </Link>
        )}
      </section>
    </div>
  );
}
