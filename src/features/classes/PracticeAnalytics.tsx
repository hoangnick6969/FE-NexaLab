import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Empty, verdictLabel } from "../../components/ui";
import { type TeacherAssignment } from "./class-types";
import { LoadError } from "./class-ui";
import { ClassHintInsight } from "./ClassHintInsight";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    eyebrow: "BẰNG CHỨNG THEO BÀI GIAO",
    title: "Theo dõi và hỗ trợ học sinh",
    assigned: "Bài đã giao",
    choose: "Chọn bài",
    archivedSuffix: " (đã lưu trữ)",
    assignedList: "danh sách bài giao",
    board: "bảng tiến độ",
    noStudents: "Chưa có học sinh trong phạm vi bài giao.",
    steps: (done: number, total: number, pct: number) => `${done}/${total} bước · ${pct}%`,
    practicals: (n: number, result: string) => `${n} lượt thực hành · ${result}`,
    passedLabel: "Đã đạt",
    seeEvidence: "Xem bằng chứng",
    needsHelp: "Cần hỗ trợ:",
    flag: (_code: string, message: string) => message,
    evidence: (n: number) => `${n} bằng chứng`,
    learningEvidence: "bằng chứng học tập",
    evidenceSummary: (steps: number, quizzes: number, practicals: number) => `${steps} tiến trình bước · ${quizzes} lần kiểm tra · ${practicals} lần thực hành`,
    quiz: "Kiểm tra",
    passed: "Đạt",
    notPassed: "Chưa đạt",
    practice: "Thực hành",
  },
  en: {
    eyebrow: "EVIDENCE BY ASSIGNMENT",
    title: "Follow and support students",
    assigned: "Assigned work",
    choose: "Choose work",
    archivedSuffix: " (archived)",
    assignedList: "the assigned work list",
    board: "the progress board",
    noStudents: "No students are in scope for this work.",
    steps: (done: number, total: number, pct: number) => `${done}/${total} steps · ${pct}%`,
    practicals: (n: number, result: string) => `${n} practice ${n === 1 ? "attempt" : "attempts"} · ${result}`,
    passedLabel: "Passed",
    seeEvidence: "See evidence",
    needsHelp: "Needs support:",
    flag: (code: string, message: string) => ({ NO_ACTIVITY_7_DAYS: "No eligible learning activity in 7 days", OVERDUE_INCOMPLETE: "Overdue and not completed", PRACTICAL_NOT_PASSED: "At least three practice attempts without a pass", QUIZ_FAILED_TWICE: "At least two quiz attempts not passed" })[code] ?? message,
    evidence: (n: number) => `${n} evidence ${n === 1 ? "item" : "items"}`,
    learningEvidence: "learning evidence",
    evidenceSummary: (steps: number, quizzes: number, practicals: number) => `${steps} step records · ${quizzes} quiz attempts · ${practicals} practice attempts`,
    quiz: "Quiz",
    passed: "Passed",
    notPassed: "Not passed",
    practice: "Practice",
  },
});
const t = text();

export function PracticeAnalytics({ classId }: { classId: string }) {
  const assignments = useQuery<TeacherAssignment[]>({ queryKey: ["class-assignments", classId], queryFn: () => api(`/classes/${classId}/assignments`) });
  const [assignmentId, setAssignmentId] = useState("");
  const selectedId = assignmentId || assignments.data?.find((item) => item.status === "ACTIVE")?.id || "";
  const board = useQuery<any[]>({
    queryKey: ["assignment-progress", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/progress`),
    enabled: Boolean(selectedId),
  });
  const support = useQuery<any[]>({
    queryKey: ["assignment-support", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/support`),
    enabled: Boolean(selectedId),
  });
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const evidence = useQuery<any>({
    queryKey: ["student-evidence", classId, selectedId, openStudent],
    queryFn: () => api(`/classes/${classId}/students/${openStudent}/evidence?assignmentId=${encodeURIComponent(selectedId)}`),
    enabled: Boolean(selectedId && openStudent),
  });
  const selected = assignments.data?.find((item) => item.id === selectedId);
  const flags = new Map((support.data ?? []).map((row: any) => [row.student.id, row.flags]));
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2></div></div>
      <label className="field"><span>{t.assigned}</span><select value={selectedId} onChange={(event) => { setAssignmentId(event.target.value); setOpenStudent(null); }}>
        <option value="">{t.choose}</option>
        {assignments.data?.map((item) => <option key={item.id} value={item.id}>{item.title}{item.status === "ARCHIVED" ? t.archivedSuffix : ""}</option>)}
      </select></label>
      <LoadError query={assignments} what={t.assignedList} />
      <LoadError query={board} what={t.board} />
      {selected?.contentType === "lab" && <ClassHintInsight key={selectedId} classId={classId} assignmentId={selectedId} />}
      {selectedId && board.data?.length === 0 && <Empty>{t.noStudents}</Empty>}
      {board.data?.map((row: any) => (
        <div className="analytics-student" key={row.student.id}>
          <div className="section-heading"><div><h3>{row.student.fullName}</h3><p>{typeof row.percent === "number" ? t.steps(row.completedRequired, row.totalRequired, row.percent) : t.practicals(row.attempts, row.passed ? t.passedLabel : verdictLabel(row.latestVerdict))}</p></div>
          <button className="secondary" onClick={() => setOpenStudent(openStudent === row.student.id ? null : row.student.id)}>{t.seeEvidence}</button></div>
          {(flags.get(row.student.id) as any[] | undefined)?.map((flag: any) => <div className="notice" key={flag.code}><b>{t.needsHelp}</b> {t.flag(flag.code, flag.message)}<small>{flag.evidenceIds?.length ? ` · ${t.evidence(flag.evidenceIds.length)}` : ""}</small></div>)}
          {openStudent === row.student.id && <div className="attempt-evidence"><LoadError query={evidence} what={t.learningEvidence} />{evidence.data && <>
            <p>{t.evidenceSummary(evidence.data.stepProgress.length, evidence.data.quizAttempts.length, evidence.data.practicalAttempts.length)}</p>
            {evidence.data.quizAttempts.map((item: any) => <p key={item.id}>{t.quiz} {item.score}% · {item.passed ? t.passed : t.notPassed} · {formatDateTime(item.createdAt)}</p>)}
            {evidence.data.practicalAttempts.map((item: any) => <p key={item.id}>{t.practice} · {verdictLabel(item.verdict)} · {formatDateTime(item.createdAt)}</p>)}
          </>}</div>}
        </div>
      ))}
    </section>
  );
}
