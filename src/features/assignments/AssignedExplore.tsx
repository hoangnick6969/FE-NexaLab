import { Link } from "react-router-dom";
import { defineText, formatDateTime } from "../../i18n";
import { formatTenthsPh, type ExploreAssignmentView } from "../labs/class-explore/class-explore";

const text = defineText({
  vi: {
    eyebrow: "BÀI THỰC HÀNH CỦA LỚP", due: "Hạn nộp", noDue: "Không có hạn nộp", note: "Lời dặn của giáo viên",
    asks: "Em cần làm", measure: "Đo pH của hai mẫu và ghi số đo", explain: "Viết lời giải thích",
    status: { none: "Chưa nộp", SUBMITTED: "Đã nộp, chờ giáo viên nhận xét", REVIEWED: "Giáo viên đã nhận xét" }, late: "Nộp trễ",
    open: "Mở bàn thí nghiệm", openAgain: "Xem lại bàn thí nghiệm", feedback: "Nhận xét của giáo viên", values: "Số đo em đã nộp",
    noScore: "Bài này không chấm điểm và không tính vào tiến độ.",
  },
  en: {
    eyebrow: "CLASS PRACTICAL", due: "Due", noDue: "No due date", note: "Teacher's note",
    asks: "What to do", measure: "Measure the pH of two samples and write the readings", explain: "Write an explanation",
    status: { none: "Not submitted", SUBMITTED: "Submitted, waiting for your teacher", REVIEWED: "Your teacher has commented" }, late: "Late",
    open: "Open the bench", openAgain: "Look at the bench again", feedback: "Teacher's comment", values: "Your submitted values",
    noScore: "This work is not graded and does not count towards progress.",
  },
});

/** Student detail of a Class Explore assignment (P0 C3.4): what is asked, the state of the submission, and the way into the bench. */
export function AssignedExplore({ assignment }: { assignment: ExploreAssignmentView & { content?: { title?: string } } }) {
  const t = text();
  const { snapshot, submission } = assignment.explore;
  const measures = snapshot.requirements.filter((item) => item.kind === "measure").length;
  const explains = snapshot.requirements.some((item) => item.kind === "explain");
  const status = (submission ? t.status[submission.status] : t.status.none) + (submission?.late ? ` · ${t.late}` : "");
  return <div className="student-assigned-learning">
    <section className="panel" aria-labelledby="explore-assignment-title" data-testid="assigned-explore">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 id="explore-assignment-title">{assignment.title}</h1>
      <p className="muted">{assignment.content?.title ? `${assignment.content.title} · ` : ""}{assignment.classroom.name} · {assignment.dueDate ? `${t.due}: ${formatDateTime(assignment.dueDate)}` : t.noDue}</p>
      {snapshot.instructions && <><h2>{t.note}</h2><p>{snapshot.instructions}</p></>}
      <h2>{t.asks}</h2>
      <ul>
        {measures > 0 && <li>{t.measure}</li>}
        {explains && <li>{t.explain}</li>}
      </ul>
      <p role="status" data-testid="explore-status"><strong>{status}</strong></p>
      {submission && <>
        <h2>{t.values}</h2>
        <ul>{submission.answers.measures.map((item) => <li key={item.itemId}>{item.itemId}: <b>{formatTenthsPh(item.tenthsPh)}</b></li>)}</ul>
        {submission.feedback && <><h2>{t.feedback}</h2><p data-testid="explore-feedback">{submission.feedback}</p></>}
      </>}
      <p className="tiny muted">{t.noScore}</p>
      <Link className="primary" to={`/labs/${encodeURIComponent(snapshot.labId)}?assignmentId=${encodeURIComponent(assignment.id)}&explore=1`}>{submission ? t.openAgain : t.open}</Link>
    </section>
  </div>;
}
