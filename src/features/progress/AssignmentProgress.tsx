import { Link } from "react-router-dom";
import { type MyProgressAssignment } from "../../lib/api";
import { Badge } from "../../components/ui";
import { type SheetView, stateNames, stateTones, stepLink, stepNames, time } from "./progress-format";

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
            {assignment.dueDate ? "Hạn: " + new Date(assignment.dueDate).toLocaleDateString("vi-VN") : "Không có hạn nộp"}{" "}
            {assignment.kind === "LAB" && <Badge tone="outline">Bài thực hành</Badge>}{" "}
            {assignment.contentArchived && <Badge tone="outline">Nội dung đã lưu trữ</Badge>}{" "}
            {assignment.overdue && !assignment.completed && <Badge tone="outline">Đã quá hạn</Badge>}
          </p>
        </div>
        <Link className="primary" to={stepLink(assignment.assignmentId, assignment.nextStepId)!}>
          {assignment.completed ? "Xem lại bài" : next ? `Tiếp tục: ${stepNames[next.type]}` : "Mở bài"}
        </Link>
      </header>
      <div className="completion-meter">
        <span>
          <b>{assignment.completedRequired}/{assignment.totalRequired}</b> bước bắt buộc
        </span>
        {assignment.percent === null ? (
          <span className="tiny muted">— Bài này chưa có bước bắt buộc nên không tính phần trăm.</span>
        ) : (
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Tỉ lệ bước bắt buộc đã hoàn thành"
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
              <th scope="col">Bước</th>
              <th scope="col">Nội dung</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Cập nhật</th>
              <th scope="col"><span className="visually-hidden">Bằng chứng</span></th>
            </tr>
          </thead>
          <tbody>
            {assignment.steps.map((step, index) => (
              <tr key={step.stepId}>
                <td data-label="Bước">Bước {index + 1}</td>
                <td data-label="Nội dung">{stepNames[step.type] ?? step.type}{!step.required && <span className="tiny muted"> (không bắt buộc)</span>}</td>
                <td data-label="Trạng thái"><Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge></td>
                <td data-label="Cập nhật">{time(step.updatedAt)}</td>
                <td>
                  {step.evidenceId ? (
                    <button type="button" className="link-button" onClick={(event) => onOpen({ kind: "step", assignment, step }, event)}>
                      Xem bằng chứng
                    </button>
                  ) : (
                    <span className="tiny muted">Chưa có</span>
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
