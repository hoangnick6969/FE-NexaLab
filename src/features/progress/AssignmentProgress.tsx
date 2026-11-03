import { Link } from "react-router-dom";
import { Calendar, ArrowRight, BookOpen, PlayCircle, HelpCircle, FlaskConical, FileText, ExternalLink, Play, CheckCircle2, Atom } from "lucide-react";
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
    completed: "Completed",
  },
});
const t = text();

function getStepIcon(type: string) {
  switch (type) {
    case "READING":
      return <BookOpen size={14} className="step-type-icon" aria-hidden="true" />;
    case "VIDEO":
      return <PlayCircle size={14} className="step-type-icon" aria-hidden="true" />;
    case "QUIZ":
      return <HelpCircle size={14} className="step-type-icon" aria-hidden="true" />;
    case "LAB":
      return <FlaskConical size={14} className="step-type-icon" aria-hidden="true" />;
    default:
      return <FileText size={14} className="step-type-icon" aria-hidden="true" />;
  }
}

  export function SubjectIcon({ subjectId, size = 30, className }: { subjectId: string; size?: number; className?: string }) {
    if (subjectId.includes("chem")) return <FlaskConical size={size} strokeWidth={1.8} className={className} />;
    if (subjectId.includes("bio")) return <Atom size={size} strokeWidth={1.8} className={className} />;
    return <BookOpen size={size} strokeWidth={1.8} className={className} />;
  }

  export function WatchProgressBar({ percent }: { percent: number | null }) {
    if (percent === null) return null;
    return (
      <div className="youtube-watch-progress" aria-hidden="true">
        <div className="youtube-watch-bar" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    );
  }

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
    const subjectId = (assignment.subject?.id || "physics").toLowerCase();
    const targetLink = stepLink(assignment.assignmentId, assignment.nextStepId)!;

    return (
      <article className="panel assignment-progress">
        <div className="assignment-progress-card-inner">
          {/* Lesson Thumbnail with YouTube Watch Progression Line */}
          <Link
            to={targetLink}
            className="assignment-thumb-link"
            tabIndex={-1}
            aria-hidden="true"
          >
            <div className={`assignment-progression-thumb subject-thumb-${subjectId}`}>
              <div className="thumb-top-badges">
                <span className="lesson-order-pill">
                  {assignment.subject.name}
                </span>
                {isCompleted ? (
                  <span className="thumb-status-badge status-completed">
                    <CheckCircle2 size={12} /> {t.completed}
                  </span>
                ) : percent !== null && percent > 0 ? (
                  <span className="thumb-status-badge status-doing">
                    <Play size={10} fill="currentColor" /> {percent}%
                  </span>
                ) : null}
              </div>

                <div className="thumb-graphic-pattern" aria-hidden="true">
                  <SubjectIcon subjectId={subjectId} size={52} className="thumb-watermark-icon" />
                </div>

                <WatchProgressBar percent={percent} />
              </div>
          </Link>

          {/* Info & Completion Section */}
          <div className="assignment-progress-info">
            <header>
              <div className="assignment-progress-meta">
                <p className="eyebrow">{assignment.subject.name} · {assignment.chapter}</p>
                <h3>{assignment.title}</h3>
                <div className="assignment-meta-row tiny muted">
                  {assignment.dueDate ? (
                    <span className="due-date-tag">
                      <Calendar size={13} aria-hidden="true" />
                      <span>{t.due(formatDate(assignment.dueDate))}</span>
                    </span>
                  ) : (
                    <span>{commonText().noDueDate}</span>
                  )}{" "}
                  {assignment.kind === "LAB" && <Badge tone="outline">{t.practice}</Badge>}{" "}
                  {assignment.contentArchived && <Badge tone="outline">{t.archived}</Badge>}{" "}
                  {assignment.overdue && !assignment.completed && <Badge tone="not_passed">{t.overdue}</Badge>}
                </div>
              </div>
              <Link className="primary assignment-action-link" to={targetLink}>
                <span>{assignment.completed ? t.review : next ? t.continue(stepNames[next.type]) : t.open}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </header>

            <div className="completion-meter">
              <span className="completion-ratio">
                <b>{assignment.completedRequired}/{assignment.totalRequired}</b> {t.requiredSteps}
              </span>
              {assignment.percent === null ? (
                <span className="tiny muted">{t.noRequired}</span>
              ) : (
                <div
                  className="progress-track assignment-progress-track"
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
          </div>
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
                    <td data-label={t.step} className="step-cell-number">
                      <span className="step-num-pill">{t.stepN(index + 1)}</span>
                    </td>
                    <td data-label={t.content} className="step-cell-content">
                      <div className="step-content-item">
                        {getStepIcon(step.type)}
                        <span>
                          {stepNames[step.type] ?? step.type}
                          {!step.required && <span className="tiny muted">{t.optional}</span>}
                        </span>
                      </div>
                    </td>
                    <td data-label={t.status} className="step-cell-status">
                      <Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge>
                    </td>
                    <td data-label={t.updated} className="step-cell-updated">{time(step.updatedAt)}</td>
                    <td className="step-cell-evidence">
                      {step.evidenceId ? (
                        <button type="button" className="link-button step-evidence-btn" onClick={(event) => onOpen({ kind: "step", assignment, step }, event)}>
                          <span>{t.seeEvidence}</span>
                          <ExternalLink size={12} aria-hidden="true" />
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
