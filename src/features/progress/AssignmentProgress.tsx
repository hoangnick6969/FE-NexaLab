import { Link } from "react-router-dom";
import { Calendar, BookOpen, PlayCircle, HelpCircle, FlaskConical, FileText, CheckCircle2 } from "lucide-react";
import { type MyProgressAssignment } from "../../lib/api";
import { Badge } from "../../components/ui";
import { type SheetView, stateNames, stateTones, stepLink, stepNames, time } from "./progress-format";
import { defineText, formatDate } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    due: (date: string) => `Hạn: ${date}`,
    practice: "Bài thực hành",
    archived: "Nội dung đã lưu trữ",
    overdue: "Đã quá hạn",
    review: "Xem lại bài",
    continue: (step: string) => `Tiếp tục: ${step}`,
    open: "Mở bài",
    requiredSteps: "bước bắt buộc",
    noRequired: "Bài này chưa có bước bắt buộc nên không tính phần trăm.",
    ratio: "Tỉ lệ bước bắt buộc đã hoàn thành",
    stepN: (n: number) => `Bước ${n}`,
    content: "Nội dung",
    status: "Trạng thái",
    updated: "Cập nhật",
    evidence: "Bằng chứng",
    optional: " (không bắt buộc)",
    seeEvidence: "Xem bằng chứng",
    none: "Chưa có",
    completed: "Hoàn thành",
  },
  en: {
    due: (date: string) => `Due: ${date}`,
    practice: "Practice",
    archived: "Archived content",
    overdue: "Overdue",
    review: "Review",
    continue: (step: string) => `Continue: ${step}`,
    open: "Open",
    requiredSteps: "required steps",
    noRequired: "This work has no required steps, so no percentage.",
    ratio: "Share of required steps completed",
    stepN: (n: number) => `Step ${n}`,
    content: "Content",
    status: "Status",
    updated: "Updated",
    evidence: "Evidence",
    optional: " (optional)",
    seeEvidence: "See evidence",
    none: "None yet",
    completed: "Completed",
  },
});
const t = text();

const STEP_ICONS: Record<string, typeof BookOpen> = { READING: BookOpen, VIDEO: PlayCircle, QUIZ: HelpCircle, LAB: FlaskConical };

/** A round mark for the step's state: a tick when done, the step's own icon otherwise. */
function StepMark({ type, state }: { type: string; state: string }) {
  const Icon = state === "COMPLETED" ? CheckCircle2 : STEP_ICONS[type] ?? FileText;
  return (
    <span className={`pg-step-mark${state === "COMPLETED" ? " is-done" : state === "IN_PROGRESS" ? " is-doing" : ""}`} aria-hidden="true">
      <Icon size={14} />
    </span>
  );
}

const stateClass = (state: string) => (state === "COMPLETED" ? " is-done" : state === "IN_PROGRESS" ? " is-doing" : "");

export function AssignmentProgress({
  assignment,
  onOpen,
}: {
  assignment: MyProgressAssignment;
  onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void;
}) {
  const next = assignment.steps.find((step) => step.stepId === assignment.nextStepId);
  const percent = assignment.percent;
  const isCompleted = assignment.completed;
  const targetLink = stepLink(assignment.assignmentId, assignment.nextStepId)!;
  const where = [assignment.subject.name, assignment.chapter].filter(Boolean).join(", ");

  return (
    <article className="pg-assignment assignment-progress">
      <header className="pg-assignment-head">
        <div>
          <p className="pg-assignment-where">{where}</p>
          <h3>{assignment.title}</h3>
          <p className="pg-assignment-meta">
            {assignment.dueDate ? (
              <span className="pg-due">
                <Calendar size={13} aria-hidden="true" />
                <span>{t.due(formatDate(assignment.dueDate))}</span>
              </span>
            ) : (
              <span>{commonText().noDueDate}</span>
            )}
            {isCompleted && <Badge tone="passed">{t.completed}</Badge>}
            {assignment.kind === "LAB" && <Badge tone="outline">{t.practice}</Badge>}
            {assignment.contentArchived && <Badge tone="outline">{t.archived}</Badge>}
            {assignment.overdue && !assignment.completed && <Badge tone="not_passed">{t.overdue}</Badge>}
          </p>
        </div>
        <Link className="primary pg-assignment-cta" to={targetLink}>
          {assignment.completed ? t.review : next ? t.continue(stepNames[next.type]) : t.open}
        </Link>
      </header>

      <div className="pg-meter">
        <p>
          <b>{assignment.completedRequired}/{assignment.totalRequired}</b> {t.requiredSteps}
          {percent !== null && ` (${percent}%)`}
        </p>
        {percent === null ? (
          <span className="tiny muted">{t.noRequired}</span>
        ) : (
          <div className="progress-track" role="progressbar" aria-label={t.ratio} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <i style={{ width: percent + "%" }} />
          </div>
        )}
      </div>

      {assignment.steps.length > 0 && (
        <div className="pg-steps-wrap">
          <table className="pg-steps">
            <thead>
              <tr>
                <th scope="col">{t.content}</th>
                <th scope="col">{t.status}</th>
                <th scope="col">{t.updated}</th>
                <th scope="col"><span className="visually-hidden">{t.evidence}</span></th>
              </tr>
            </thead>
            <tbody>
              {assignment.steps.map((step, index) => (
                <tr key={step.stepId}>
                  <td data-label={t.stepN(index + 1)}>
                    <span className="pg-step-name">
                      <StepMark type={step.type} state={step.state} />
                      <span>
                        {stepNames[step.type] ?? step.type}
                        {!step.required && <span className="pg-step-optional">{t.optional}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="pg-cell-state">
                    <span className={`pg-state${stateClass(step.state)}`}>{stateNames[step.state]}</span>
                  </td>
                  <td className="pg-cell-time"><span className="pg-time">{time(step.updatedAt)}</span></td>
                  <td>
                    {step.evidenceId ? (
                      <button type="button" className="pg-link" onClick={(event) => onOpen({ kind: "step", assignment, step }, event)}>
                        {t.seeEvidence}
                      </button>
                    ) : (
                      <span className="tiny muted">{t.none}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
