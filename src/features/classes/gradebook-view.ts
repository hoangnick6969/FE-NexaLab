/** TAI-07 (TAI7-T3): types and pure filter/sort helpers of the class gradebook (teacher only). */
export type GradebookStatus = "NOT_STARTED" | "IN_PROGRESS" | "AWAITING_GRADE" | "LATE_REVIEW_PENDING" | "GRADED" | "ZERO_REJECTED" | "ABSENT";
export type GradebookRow = {
  index: number;
  student: { id: string; fullName: string; username: string | null };
  status: GradebookStatus;
  submissionId: string | null;
  submittedAt: string | null;
  autoSubmitted: boolean;
  timeUsedSeconds: number | null;
  attempts: { used: number; open: boolean } | null;
  lab10?: number | null;
  mcq10: number | null;
  written10: number | null;
  total10: number | null;
  grade: { id: string; kind: string; gradedAt: string } | null;
  ai: { suggestionId: string; status: "VALID" | "PARTIAL" | "SUPPRESSED"; suggested10: number | null; canQuickApprove: boolean } | null;
  similarity: { level: "HIGH" | "ELEVATED"; matchId: string; reviewed: boolean; otherStudentId: string } | null;
};
export type GradebookSummary = {
  students: number;
  submitted: number;
  absent: number;
  inProgress: number;
  notStarted: number;
  graded: number;
  awaitingGrade: number;
  aiReady: number;
  similarityFlags: number;
  similarityUnreviewed: number;
  average10: number | null;
  min10: number | null;
  max10: number | null;
};
export type GradebookData = {
  assignment: {
    id: string;
    title: string;
    contentType: "test" | "written" | "exam";
    hasWritten?: boolean;
    dueAt: string | null;
    assessment: { type: string; graded: boolean; coefficient: number | null; durationMinutes: number | null; scoresPublishedAt: string | null };
    gradebook: { lockedAt: string | null; lockVersion: number };
  };
  aiAssist: boolean;
  summary: GradebookSummary;
  blockers: Array<{ studentId: string; fullName: string; status: GradebookStatus }>;
  rows: GradebookRow[];
};

export const STATUS_LABEL: Record<GradebookStatus, string> = {
  NOT_STARTED: "Chưa làm",
  IN_PROGRESS: "Đang làm",
  AWAITING_GRADE: "Đã nộp · chờ chấm",
  LATE_REVIEW_PENDING: "Nộp trễ · chờ duyệt",
  GRADED: "Đã chấm",
  ZERO_REJECTED: "Bị từ chối (0)",
  ABSENT: "Vắng",
};
/** Badge tones already defined in styles.css. */
export const STATUS_TONE: Record<GradebookStatus, string> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "gold",
  AWAITING_GRADE: "partial",
  LATE_REVIEW_PENDING: "partial",
  GRADED: "passed",
  ZERO_REJECTED: "not_passed",
  ABSENT: "not_passed",
};

export type StatusFilter = "ALL" | "TO_GRADE" | "AI_READY" | "FLAGGED" | GradebookStatus;
export type SortKey = "CLASS" | "SCORE_DESC" | "SCORE_ASC" | "STATUS";

const STATUS_ORDER: GradebookStatus[] = ["IN_PROGRESS", "LATE_REVIEW_PENDING", "AWAITING_GRADE", "NOT_STARTED", "ABSENT", "ZERO_REJECTED", "GRADED"];
const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Filter by status group and a diacritic-insensitive name/username search, then sort. Class order is the API order. */
export function visibleRows(rows: GradebookRow[], filter: StatusFilter, sort: SortKey, search = ""): GradebookRow[] {
  const q = fold(search.trim());
  const kept = rows.filter((r) => {
    if (q && !fold(`${r.student.fullName} ${r.student.username ?? ""}`).includes(q)) return false;
    if (filter === "ALL") return true;
    if (filter === "TO_GRADE") return r.status === "AWAITING_GRADE" || r.status === "LATE_REVIEW_PENDING";
    if (filter === "AI_READY") return !!r.ai?.canQuickApprove;
    if (filter === "FLAGGED") return !!r.similarity;
    return r.status === filter;
  });
  if (sort === "CLASS") return kept;
  const score = (r: GradebookRow) => r.total10;
  return [...kept].sort((a, b) => {
    if (sort === "STATUS") return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.index - b.index;
    // Rows without a score always go last, whatever the direction.
    const x = score(a), y = score(b);
    if (x === null && y === null) return a.index - b.index;
    if (x === null) return 1;
    if (y === null) return -1;
    return (sort === "SCORE_DESC" ? y - x : x - y) || a.index - b.index;
  });
}

/** "8,8" (one decimal, decimal comma) or "—". */
export const score10Text = (value: number | null | undefined) => (value === null || value === undefined ? "—" : value.toFixed(1).replace(".", ","));
/** "12:05" for a time used in seconds, or "—". */
export function durationText(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
