import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../lib/api";
import { Empty, verdictLabel } from "../../components/ui";
import { type TeacherAssignment } from "./class-types";
import { LoadError } from "./class-ui";
import { ClassHintInsight } from "./ClassHintInsight";
import { StudentInsightsSection } from "./ClassInsights";
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
    <section className="panel teacher-analytics-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
        </div>
      </div>
      
      <div className="analytics-filter-bar">
        <label className="field analytics-field">
          <span>{t.assigned}</span>
          <select value={selectedId} onChange={(event) => { setAssignmentId(event.target.value); setOpenStudent(null); }}>
            <option value="">{t.choose}</option>
            {assignments.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}{item.status === "ARCHIVED" ? t.archivedSuffix : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <LoadError query={assignments} what={t.assignedList} />
      <LoadError query={board} what={t.board} />
      {selected?.contentType === "lab" && <ClassHintInsight key={selectedId} classId={classId} assignmentId={selectedId} />}
      {selectedId && board.data?.length === 0 && <Empty>{t.noStudents}</Empty>}

      <div className="analytics-student-list">
        {board.data?.map((row: any) => {
          const studentFlags = (flags.get(row.student.id) as any[] | undefined) ?? [];
          const isOpen = openStudent === row.student.id;
          return (
            <div className="analytics-student-card" key={row.student.id}>
              <div className="analytics-student-header">
                <div className="analytics-student-meta">
                  <h3>{row.student.fullName}</h3>
                  <div className="analytics-student-stats">
                    {typeof row.percent === "number"
                      ? t.steps(row.completedRequired, row.totalRequired, row.percent)
                      : t.practicals(row.attempts, row.passed ? t.passedLabel : verdictLabel(row.latestVerdict))}
                  </div>
                </div>
                <button
                  type="button"
                  className={`evidence-action-btn${isOpen ? " open" : ""}`}
                  onClick={() => setOpenStudent(isOpen ? null : row.student.id)}
                >
                  <FileText size={14} aria-hidden="true" />
                  <span>{t.seeEvidence}</span>
                  {isOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                </button>
              </div>

              {studentFlags.map((flag: any) => (
                <div className="analytics-notice-box" key={flag.code}>
                  <AlertTriangle size={15} className="notice-icon" aria-hidden="true" />
                  <div className="notice-content">
                    <b>{t.needsHelp}</b> {t.flag(flag.code, flag.message)}
                    {flag.evidenceIds?.length ? <small> · {t.evidence(flag.evidenceIds.length)}</small> : null}
                  </div>
                </div>
              ))}

              {isOpen && (
                <div className="attempt-evidence">
                  <LoadError query={evidence} what={t.learningEvidence} />
                  {evidence.data && (
                    <>
                      <p className="evidence-summary-line">
                        {t.evidenceSummary(evidence.data.stepProgress.length, evidence.data.quizAttempts.length, evidence.data.practicalAttempts.length)}
                      </p>
                      <div className="evidence-attempts-grid">
                        {evidence.data.quizAttempts.map((item: any) => (
                          <div key={item.id} className="evidence-attempt-chip">
                            <span>{t.quiz} {item.score}%</span>
                            <span className={item.passed ? "chip-pass" : "chip-fail"}>{item.passed ? t.passed : t.notPassed}</span>
                            <small>{formatDateTime(item.createdAt)}</small>
                          </div>
                        ))}
                        {evidence.data.practicalAttempts.map((item: any) => (
                          <div key={item.id} className="evidence-attempt-chip">
                            <span>{t.practice}</span>
                            <span className="chip-verdict">{verdictLabel(item.verdict)}</span>
                            <small>{formatDateTime(item.createdAt)}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <StudentInsightsSection classId={classId} studentId={row.student.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
