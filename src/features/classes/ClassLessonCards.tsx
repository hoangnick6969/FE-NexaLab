import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type StudentPathway } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { StudyCardsStep } from "../lessons/StudyCardsStep";

/** Keep existing assigned decks and their saved progress accessible in Class Space. */
export function ClassLessonCards({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const assignment = useQuery({ queryKey: ["assignment", assignmentId], queryFn: () => api(`/assignments/${encodeURIComponent(assignmentId)}`) });
  const lessonId = assignment.data?.contentType === "lesson" ? assignment.data.content.id : undefined;
  const pathway = useQuery<StudentPathway>({ queryKey: ["lesson-pathway", lessonId, assignmentId], queryFn: () => api(`/lessons/${encodeURIComponent(lessonId!)}/pathway?assignmentId=${encodeURIComponent(assignmentId)}`), enabled: Boolean(lessonId) });
  const step = pathway.data?.steps.find((item) => item.type === "STUDY_CARDS");
  return <section className="panel">
    <h3>{assignment.data?.title ?? "Thẻ ôn tập của bài được giao"}</h3>
    {(assignment.isPending || (lessonId && pathway.isPending)) && <p role="status">Đang tải thẻ ôn tập…</p>}
    <ErrorBox error={assignment.error || pathway.error} />
    {(assignment.isError || pathway.isError) && <button className="secondary" onClick={() => assignment.isError ? assignment.refetch() : pathway.refetch()}>Thử lại</button>}
    {step && lessonId && (step.state === "LOCKED" ? <p className="notice">Hoàn thành nội dung và video trước để tiếp tục ôn thẻ. <Link to={`/lessons/${encodeURIComponent(lessonId)}?assignmentId=${encodeURIComponent(assignmentId)}`}>Mở nội dung bài</Link></p> : <StudyCardsStep lessonId={lessonId} assignmentId={assignmentId} step={step} onReconciled={(updated) => qc.setQueryData(["lesson-pathway", lessonId, assignmentId], updated)} />)}
    {pathway.data && !step && <p className="muted">Bài này chưa có thẻ ôn tập.</p>}
  </section>;
}
