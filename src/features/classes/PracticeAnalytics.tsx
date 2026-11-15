import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, BarChart2, ArrowUpDown } from "lucide-react";
import { api } from "../../lib/api";
import { Empty, verdictLabel } from "../../components/ui";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import { TestTracking } from "./TestAssignments";
import { WrittenTracking } from "./WrittenGrading";
import { LoadError } from "./class-ui";
import { ClassHintInsight } from "./ClassHintInsight";
import { StudentInsightsSection } from "./ClassInsights";
import { insightBadge, type ClassInsightsResponse, type InsightItem, INSUFFICIENT_CODE } from "./insights-view";
import { defineText, formatDateTime, formatNumber } from "../../i18n";
import { testStatusLabel, type StudentTestStatus, type TestState } from "../../lib/test-status";
import "./practice-analytics.css";

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
    steps: (done: number, total: number) => `${done}/${total} bước`,
    passedLabel: "Đã đạt",
    noAttemptYet: "Chưa làm",
    inProgress: "Đang làm",
    completed: "Hoàn thành",
    trackSubmissions: "Theo dõi bài nộp",
    trackWritten: "Theo dõi và chấm bài",
    needsHelp: "Cần hỗ trợ:",
    flag: (_code: string, message: string) => message,
    learningEvidence: "bằng chứng học tập",
    insightsList: "gợi ý của lớp",
    submissionsList: "danh sách bài nộp",
    quiz: "Kiểm tra",
    passed: "Đạt",
    notPassed: "Chưa đạt",
    practice: "Thực hành",
    // Overview
    kpiSubmitted: (test: boolean) => (test ? "Đã nộp / Sĩ số" : "Hoàn thành / Sĩ số"),
    kpiMissing: (test: boolean) => (test ? "Chưa nộp / Quá hạn" : "Chưa hoàn thành / Quá hạn"),
    kpiAverage: (test: boolean) => (test ? "Điểm trung bình lớp" : "Tiến độ trung bình"),
    kpiReview: "Học sinh cần xem lại",
    kpiAverageHint: (n: number) => `trên ${n} bài có điểm`,
    distributionTitle: "Phổ điểm",
    distributionEmpty: "Chưa có bài nào có điểm.",
    bands: ["< 50 điểm", "50 – 69 điểm", "70 – 84 điểm", "≥ 85 điểm"],
    bandCount: (n: number) => `${n} học sinh`,
    // Table
    filterLabel: "Lọc nhanh",
    filters: { ALL: "Tất cả", MISSING: "Chưa nộp", LOW: "Điểm dưới 50", REVIEW: "Có gợi ý cần xem lại" } as Record<string, string>,
    sortLabel: "Sắp xếp",
    sorts: { NAME: "Tên học sinh", SCORE: "Điểm", SUBMISSIONS: "Số lần nộp" } as Record<string, string>,
    sortDirection: (desc: boolean) => (desc ? "Giảm dần" : "Tăng dần"),
    colStudent: "Học sinh",
    colStatus: "Trạng thái",
    colSubmissions: (test: boolean) => (test ? "Số lần nộp" : "Số lượt"),
    colScore: (test: boolean) => (test ? "Điểm" : "Tiến độ"),
    colInsights: "Gợi ý / Cảnh báo",
    colActions: "Hành động",
    noRowsForFilter: "Không có học sinh nào khớp bộ lọc.",
    acknowledgedTag: "đã ghi nhận",
    dismissedTag: "đã ẩn",
    details: "Chi tiết",
    hideDetails: "Thu gọn",
    timeline: "Các lần nộp",
    noSubmissions: "Chưa có lần nộp nào.",
    late: "nộp muộn",
    points: (n: string) => `${n} điểm`,
    stepsDetail: (steps: number, quizzes: number, practicals: number) => `${steps} tiến trình bước · ${quizzes} lần kiểm tra trong bài học · ${practicals} lần thực hành`,
  },
  en: {
    eyebrow: "EVIDENCE BY ASSIGNMENT",
    title: "Track and support students",
    assigned: "Assigned work",
    choose: "Choose work",
    archivedSuffix: " (archived)",
    assignedList: "the assignment list",
    board: "the progress board",
    noStudents: "No students are in this assignment's scope.",
    steps: (done: number, total: number) => `${done}/${total} steps`,
    passedLabel: "Passed",
    noAttemptYet: "Not started",
    inProgress: "In progress",
    completed: "Completed",
    trackSubmissions: "Track submissions",
    trackWritten: "Track and grade",
    needsHelp: "Needs support:",
    flag: (code: string, message: string) => ({ NO_ACTIVITY_7_DAYS: "No eligible learning activity in 7 days", OVERDUE_INCOMPLETE: "Overdue and not completed", PRACTICAL_NOT_PASSED: "At least three practice attempts without a pass", QUIZ_FAILED_TWICE: "At least two quiz attempts not passed" })[code] ?? message,
    learningEvidence: "learning evidence",
    insightsList: "class insights",
    submissionsList: "the submission list",
    quiz: "Quiz",
    passed: "Passed",
    notPassed: "Not passed",
    practice: "Practice",
    kpiSubmitted: (test: boolean) => (test ? "Submitted / Class size" : "Completed / Class size"),
    kpiMissing: (test: boolean) => (test ? "Not submitted / Overdue" : "Not completed / Overdue"),
    kpiAverage: (test: boolean) => (test ? "Class average" : "Average progress"),
    kpiReview: "Students to review",
    kpiAverageHint: (n: number) => `over ${n} scored ${n === 1 ? "result" : "results"}`,
    distributionTitle: "Score distribution",
    distributionEmpty: "No scored work yet.",
    bands: ["< 50 points", "50 – 69 points", "70 – 84 points", "≥ 85 points"],
    bandCount: (n: number) => `${n} ${n === 1 ? "student" : "students"}`,
    filterLabel: "Quick filter",
    filters: { ALL: "All", MISSING: "Not submitted", LOW: "Score below 50", REVIEW: "Has an insight to review" } as Record<string, string>,
    sortLabel: "Sort by",
    sorts: { NAME: "Student name", SCORE: "Score", SUBMISSIONS: "Submissions" } as Record<string, string>,
    sortDirection: (desc: boolean) => (desc ? "Descending" : "Ascending"),
    colStudent: "Student",
    colStatus: "Status",
    colSubmissions: (test: boolean) => (test ? "Submissions" : "Attempts"),
    colScore: (test: boolean) => (test ? "Score" : "Progress"),
    colInsights: "Insights / Alerts",
    colActions: "Actions",
    noRowsForFilter: "No students match this filter.",
    acknowledgedTag: "acknowledged",
    dismissedTag: "hidden",
    details: "Details",
    hideDetails: "Collapse",
    timeline: "Submissions",
    noSubmissions: "No submissions yet.",
    late: "late",
    points: (n: string) => `${n} points`,
    stepsDetail: (steps: number, quizzes: number, practicals: number) => `${steps} step records · ${quizzes} lesson quiz attempts · ${practicals} practice attempts`,
  },
});
const t = text();

/** At most one decimal in the page language (33.3333 -> "33,3"). */
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 1 });

type Filter = "ALL" | "MISSING" | "LOW" | "REVIEW";
type Sort = "NAME" | "SCORE" | "SUBMISSIONS";
const DONE_TEST_STATUSES = new Set(["SUBMITTED", "AWAITING_GRADE", "GRADED", "LATE_REVIEW_PENDING", "REJECTED"]);
const BAND_LIMITS = [50, 70, 85];

/** One table row, the same shape for every kind of assigned work. */
type Row = {
  student: { id: string; fullName: string };
  status: string;
  done: boolean;
  overdue: boolean;
  submissions: number;
  /** Test/written: current score 0-100. Lesson: percent of required steps. Lab: null. */
  value: number | null;
  /** Open review insights: counted in the KPI and the "Có gợi ý cần xem lại" filter. */
  insights: InsightItem[];
  /** Review insights the teacher already acknowledged or hid: shown muted, not counted. */
  handled: InsightItem[];
  flags: Array<{ code: string; message: string }>;
  raw: any;
};

function toRow(raw: any, review: InsightItem[], flags: Array<{ code: string; message: string }>): Row {
  const insights = review.filter((i) => !i.latestAcknowledgement);
  const handled = review.filter((i) => i.latestAcknowledgement);
  const overdueFlag = flags.some((f) => f.code === "OVERDUE_INCOMPLETE");
  if ("testStatus" in raw) {
    const status = raw.testStatus as StudentTestStatus | null;
    return {
      student: raw.student, raw, insights, handled, flags,
      status: (status && testStatusLabel[status]) ?? t.noAttemptYet,
      done: !!status && DONE_TEST_STATUSES.has(status),
      overdue: status === "OVERDUE_UNSUBMITTED",
      submissions: raw.attempts ?? 0,
      value: typeof raw.score === "number" ? raw.score : null,
    };
  }
  if (typeof raw.percent === "number") {
    return {
      student: raw.student, raw, insights, handled, flags,
      status: raw.percent >= 100 ? t.completed : raw.completedRequired > 0 ? `${t.inProgress} · ${t.steps(raw.completedRequired, raw.totalRequired)}` : t.noAttemptYet,
      done: raw.percent >= 100,
      overdue: overdueFlag,
      submissions: raw.completedRequired ?? 0,
      value: raw.percent,
    };
  }
  return {
    student: raw.student, raw, insights, handled, flags,
    status: raw.passed ? t.passedLabel : raw.attempts ? verdictLabel(raw.latestVerdict) ?? t.inProgress : t.noAttemptYet,
    done: !!raw.passed,
    overdue: overdueFlag,
    submissions: raw.attempts ?? 0,
    value: null,
  };
}

/** Insights shown on a row: those that ask the teacher to look, not the "too few scores" note. */
const reviewInsights = (items: InsightItem[] | undefined) =>
  (items ?? []).filter((i) => i.ruleCode !== INSUFFICIENT_CODE && i.status === "TEACHER_REVIEW_RECOMMENDED");

export function PracticeAnalytics({ classId, classroom }: { classId: string; classroom?: ClassSummary }) {
  const assignments = useQuery<TeacherAssignment[]>({ queryKey: ["class-assignments", classId], queryFn: () => api(`/classes/${classId}/assignments`) });
  const [assignmentId, setAssignmentId] = useState("");
  const selectedId = assignmentId || assignments.data?.find((item) => item.status === "ACTIVE")?.id || "";
  const selected = assignments.data?.find((item) => item.id === selectedId);
  const isTestLike = selected?.contentType === "test" || selected?.contentType === "written";
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
  // One class-wide read gives every student's insights, so badges show on the rows without opening anything.
  const insights = useQuery<ClassInsightsResponse>({
    queryKey: ["class-insights", classId, "all"],
    queryFn: () => api(`/classes/${classId}/insights?status=all`),
  });
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("NAME");
  const [desc, setDesc] = useState(false);
  const [tracking, setTracking] = useState<TeacherAssignment | null>(null);

  const rows = useMemo(() => {
    const flagsBy = new Map<string, any[]>((support.data ?? []).map((row: any) => [row.student.id, row.flags ?? []]));
    const insightsBy = new Map<string, InsightItem[]>((insights.data?.students ?? []).map((s) => [s.studentId, reviewInsights(s.insights)]));
    return (board.data ?? []).map((raw) => toRow(raw, insightsBy.get(raw.student.id) ?? [], flagsBy.get(raw.student.id) ?? []));
  }, [board.data, support.data, insights.data]);

  const scored = rows.filter((r) => r.value !== null);
  const average = scored.length ? scored.reduce((sum, r) => sum + r.value!, 0) / scored.length : null;
  const reviewCount = rows.filter((r) => r.insights.length > 0).length;
  const bands = [0, 0, 0, 0];
  if (isTestLike) for (const r of scored) bands[BAND_LIMITS.filter((limit) => r.value! >= limit).length]++;

  const visible = useMemo(() => {
    const kept = rows.filter((r) =>
      filter === "MISSING" ? !r.done : filter === "LOW" ? r.value !== null && r.value < 50 : filter === "REVIEW" ? r.insights.length > 0 : true);
    if (sort === "NAME") return kept;
    const key = (r: Row) => (sort === "SCORE" ? r.value : r.submissions);
    // Rows without a value stay at the bottom in both directions.
    return [...kept].sort((a, b) => {
      const av = key(a), bv = key(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return desc ? bv - av : av - bv;
    });
  }, [rows, filter, sort, desc]);

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
          <select value={selectedId} onChange={(event) => { setAssignmentId(event.target.value); setOpenStudent(null); setFilter("ALL"); }}>
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
      <LoadError query={insights} what={t.insightsList} />
      {selected?.contentType === "lab" && <ClassHintInsight key={selectedId} classId={classId} assignmentId={selectedId} />}
      {selectedId && board.data?.length === 0 && <Empty>{t.noStudents}</Empty>}

      {rows.length > 0 && (
        <>
          <div className="pa-kpis">
            <div className="pa-kpi">
              <span className="pa-kpi-value">{rows.filter((r) => r.done).length}<small>/{rows.length}</small></span>
              <span className="pa-kpi-label">{t.kpiSubmitted(isTestLike)}</span>
            </div>
            <div className="pa-kpi">
              <span className="pa-kpi-value">{rows.filter((r) => !r.done).length}<small> · {rows.filter((r) => r.overdue).length}</small></span>
              <span className="pa-kpi-label">{t.kpiMissing(isTestLike)}</span>
            </div>
            <div className="pa-kpi">
              <span className="pa-kpi-value">{average === null ? "—" : isTestLike ? fmt(average) : `${fmt(average)}%`}</span>
              <span className="pa-kpi-label">{t.kpiAverage(isTestLike)}{average !== null && isTestLike ? ` · ${t.kpiAverageHint(scored.length)}` : ""}</span>
            </div>
            <div className={`pa-kpi${reviewCount ? " is-attention" : ""}`}>
              <span className="pa-kpi-value">{reviewCount}</span>
              <span className="pa-kpi-label">{t.kpiReview}</span>
            </div>
          </div>

          {isTestLike && (
            <div className="pa-distribution">
              <p className="pa-section-label">{t.distributionTitle}</p>
              {scored.length === 0 ? (
                <p className="tiny muted">{t.distributionEmpty}</p>
              ) : (
                <div className="pa-bars" role="list">
                  {bands.map((count, i) => (
                    <div className={`pa-bar pa-band-${i}`} role="listitem" key={i} aria-label={`${t.bands[i]}: ${t.bandCount(count)}`}>
                      <span className="pa-bar-count">{count}</span>
                      <span className="pa-bar-track"><span className="pa-bar-fill" style={{ height: `${(count / Math.max(...bands, 1)) * 100}%` }} /></span>
                      <span className="pa-bar-label">{t.bands[i]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pa-toolbar">
            <div className="pa-chips" role="radiogroup" aria-label={t.filterLabel}>
              {(Object.keys(t.filters) as Filter[]).filter((f) => isTestLike || f !== "LOW").map((f) => (
                <button key={f} type="button" role="radio" aria-checked={filter === f} className={`pa-chip${filter === f ? " is-active" : ""}`} onClick={() => setFilter(f)}>
                  {t.filters[f]}
                </button>
              ))}
            </div>
            <label className="pa-sort">
              <span>{t.sortLabel}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {(Object.keys(t.sorts) as Sort[]).filter((s) => s !== "SCORE" || selected?.contentType !== "lab").map((s) => <option key={s} value={s}>{t.sorts[s]}</option>)}
              </select>
              {sort !== "NAME" && (
                <button type="button" className="pa-sort-dir" onClick={() => setDesc(!desc)} title={t.sortDirection(desc)} aria-label={t.sortDirection(desc)}>
                  <ArrowUpDown size={13} aria-hidden="true" /> {t.sortDirection(desc)}
                </button>
              )}
            </label>
          </div>

          <div className="table-wrap pa-table-wrap">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>{t.colStudent}</th>
                  <th>{t.colStatus}</th>
                  <th className="pa-num">{t.colSubmissions(isTestLike)}</th>
                  {selected?.contentType !== "lab" && <th className="pa-num">{t.colScore(isTestLike)}</th>}
                  <th>{t.colInsights}</th>
                  <th>{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="tiny muted">{t.noRowsForFilter}</td></tr>
                )}
                {visible.map((row) => {
                  const isOpen = openStudent === row.student.id;
                  return (
                    <RowView
                      key={row.student.id}
                      row={row}
                      isOpen={isOpen}
                      isTestLike={isTestLike}
                      showValue={selected?.contentType !== "lab"}
                      onToggle={() => setOpenStudent(isOpen ? null : row.student.id)}
                      onTrack={classroom && isTestLike && selected ? () => setTracking(selected) : undefined}
                      trackLabel={selected?.contentType === "written" ? t.trackWritten : t.trackSubmissions}
                      classId={classId}
                      assignmentId={selectedId}
                      testLike={isTestLike}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {classroom && tracking?.contentType === "test" && <TestTracking classroom={classroom} assignment={tracking} onClose={() => setTracking(null)} />}
      {classroom && tracking?.contentType === "written" && <WrittenTracking classroom={classroom} assignment={tracking} onClose={() => setTracking(null)} />}
    </section>
  );
}

function RowView({ row, isOpen, isTestLike, showValue, onToggle, onTrack, trackLabel, classId, assignmentId, testLike }: {
  row: Row; isOpen: boolean; isTestLike: boolean; showValue: boolean; onToggle: () => void; onTrack?: () => void; trackLabel: string;
  classId: string; assignmentId: string; testLike: boolean;
}) {
  return (
    <>
      <tr className={isOpen ? "is-open" : undefined}>
        <td className="pa-name">{row.student.fullName}</td>
        <td>
          <span className={`pa-status${row.overdue ? " is-overdue" : row.done ? " is-done" : ""}`}>{row.status}</span>
        </td>
        <td className="pa-num">{row.submissions}</td>
        {showValue && (
          <td className="pa-num">
            {row.value === null ? "—" : isTestLike ? <b className={row.value < 50 ? "pa-low" : undefined}>{fmt(row.value)}</b> : `${fmt(row.value)}%`}
          </td>
        )}
        <td>
          <div className="pa-badges">
            {row.insights.map((insight) => (
              <span key={insight.fingerprint} className="pa-badge is-review" title={insight.message}>{insightBadge(insight)}</span>
            ))}
            {row.handled.map((insight) => (
              <span key={insight.fingerprint} className="pa-badge is-handled" title={insight.message}>
                {insightBadge(insight)} · {insight.latestAcknowledgement?.action === "DISMISSED" ? t.dismissedTag : t.acknowledgedTag}
              </span>
            ))}
            {row.flags.map((flag) => (
              <span key={flag.code} className="pa-badge is-flag" title={`${t.needsHelp} ${t.flag(flag.code, flag.message)}`}>
                <AlertTriangle size={11} aria-hidden="true" /> {t.flag(flag.code, flag.message)}
              </span>
            ))}
          </div>
        </td>
        <td>
          <div className="pa-actions">
            {onTrack && (
              <button type="button" className="secondary button-compact" onClick={onTrack}>
                <BarChart2 size={13} aria-hidden="true" /> {trackLabel}
              </button>
            )}
            <button type="button" className="text-button pa-toggle" aria-expanded={isOpen} onClick={onToggle}>
              {isOpen ? t.hideDetails : t.details} {isOpen ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="pa-detail-row">
          <td colSpan={6}>
            {testLike ? <SubmissionTimeline classId={classId} assignmentId={assignmentId} studentId={row.student.id} /> : <LessonEvidence classId={classId} assignmentId={assignmentId} studentId={row.student.id} />}
            <StudentInsightsSection classId={classId} studentId={row.student.id} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Test/written: every submission of this student with its time and score (from the class-wide test status read). */
function SubmissionTimeline({ classId, assignmentId, studentId }: { classId: string; assignmentId: string; studentId: string }) {
  const status = useQuery<{ students: Array<TestState & { student: { id: string } }> }>({
    queryKey: ["test-status", classId, assignmentId],
    queryFn: () => api(`/classes/${classId}/assignments/${assignmentId}/test-status`),
  });
  const mine = status.data?.students.find((s) => s.student.id === studentId);
  const submissions = mine ? [...mine.history].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)) : [];
  return (
    <div className="pa-timeline">
      <LoadError query={status} what={t.submissionsList} />
      <p className="pa-section-label">{t.timeline}</p>
      {status.data && (submissions.length === 0 ? (
        <p className="tiny muted">{t.noSubmissions}</p>
      ) : (
        <ol>
          {submissions.map((s, i) => (
            <li key={s.id}>
              <span className="pa-timeline-index">#{i + 1}</span>
              <span>{formatDateTime(s.submittedAt)}</span>
              {s.score !== null && <b>{t.points(fmt(s.score))}</b>}
              {s.timing === "LATE" && <span className="pa-badge is-flag">{t.late}</span>}
            </li>
          ))}
        </ol>
      ))}
    </div>
  );
}

/** Lesson/lab: the step, lesson-quiz and practice evidence for this assignment. */
function LessonEvidence({ classId, assignmentId, studentId }: { classId: string; assignmentId: string; studentId: string }) {
  const evidence = useQuery<any>({
    queryKey: ["student-evidence", classId, assignmentId, studentId],
    queryFn: () => api(`/classes/${classId}/students/${studentId}/evidence?assignmentId=${encodeURIComponent(assignmentId)}`),
  });
  return (
    <div className="attempt-evidence">
      <LoadError query={evidence} what={t.learningEvidence} />
      {evidence.data && (
        <>
          <p className="evidence-summary-line">
            {t.stepsDetail(evidence.data.stepProgress.length, evidence.data.quizAttempts.length, evidence.data.practicalAttempts.length)}
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
    </div>
  );
}
