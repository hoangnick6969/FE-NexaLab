import { Link } from "react-router-dom";
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
    noRequired: "— Bài này chưa có bước bắt buộc nên không tính phần trăm.",
    ratio: "Tỉ lệ bước bắt buộc đã hoàn thành",
    step: "Bước",
    stepN: (n: number) => `Bước ${n}`,
    content: "Nội dung",
    status: "Trạng thái",
    updated: "Cập nhật",
    evidence: "Bằng chứng",
    optional: " (không bắt buộc)",
    seeEvidence: "Xem bằng chứng",
    none: "Chưa có",
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
    noRequired: "— This work has no required steps, so no percentage.",
    ratio: "Share of required steps completed",
    step: "Step",
    stepN: (n: number) => `Step ${n}`,
    content: "Content",
    status: "Status",
    updated: "Updated",
    evidence: "Evidence",
    optional: " (optional)",
    seeEvidence: "See evidence",
    none: "None yet",
  },
});
const t = text();

export function AssignmentProgress({
  assignment,
  onOpen,
}: {
  assignment: MyProgressAssignment;
  onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void;
}) {
  const next = assignment.steps.find((step) => step.stepId === assignment.nextStepId);
  return (
    <article className="panel assignment-progress">
      <header>
        <div>
          <p className="eyebrow">{assignment.subject.name} · {assignment.chapter}</p>
          <h3>{assignment.title}</h3>
          <p className="tiny muted">
            {assignment.dueDate ? t.due(formatDate(assignment.dueDate)) : commonText().noDueDate}{" "}
            {assignment.kind === "LAB" && <Badge tone="outline">{t.practice}</Badge>}{" "}
            {assignment.contentArchived && <Badge tone="outline">{t.archived}</Badge>}{" "}
            {assignment.overdue && !assignment.completed && <Badge tone="outline">{t.overdue}</Badge>}
          </p>
        </div>
        <Link className="primary" to={stepLink(assignment.assignmentId, assignment.nextStepId)!}>
          {assignment.completed ? t.review : next ? t.continue(stepNames[next.type]) : t.open}
        </Link>
      </header>
      <div className="completion-meter">
        <span>
          <b>{assignment.completedRequired}/{assignment.totalRequired}</b> {t.requiredSteps}
        </span>
        {assignment.percent === null ? (
          <span className="tiny muted">{t.noRequired}</span>
        ) : (
          <div
            className="progress-track"
            role="progressbar"
            aria-label={t.ratio}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={assignment.percent}
          >
            <i style={{ width: assignment.percent + "%" }} />
          </div>
        )}
      </div>
      {assignment.steps.length > 0 && (
      <div className="table-wrap">
        <table className="steps-table">
          <thead>
            <tr>
              <th scope="col">{t.step}</th>
              <th scope="col">{t.content}</th>
              <th scope="col">{t.status}</th>
              <th scope="col">{t.updated}</th>
              <th scope="col"><span className="visually-hidden">{t.evidence}</span></th>
            </tr>
          </thead>
          <tbody>
            {assignment.steps.map((step, index) => (
              <tr key={step.stepId}>
                <td data-label={t.step}>{t.stepN(index + 1)}</td>
                <td data-label={t.content}>{stepNames[step.type] ?? step.type}{!step.required && <span className="tiny muted">{t.optional}</span>}</td>
                <td data-label={t.status}><Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge></td>
                <td data-label={t.updated}>{time(step.updatedAt)}</td>
                <td>
                  {step.evidenceId ? (
                    <button type="button" className="link-button" onClick={(event) => onOpen({ kind: "step", assignment, step }, event)}>
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
