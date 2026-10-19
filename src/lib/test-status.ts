/** Labels for the server-derived assigned-test status shared by student, teacher and parent views (I3). */
export type StudentTestStatus = "UPCOMING" | "DUE_SOON" | "OVERDUE_UNSUBMITTED" | "SUBMITTED" | "LATE_REVIEW_PENDING" | "REJECTED";
export type SubmissionStatus = "SCORED" | "LATE_REVIEW_PENDING" | "REJECTED_ZERO" | "ACCEPTED_BY_EXTENSION";

export type TestSubmission = {
  id: string;
  submittedAt: string;
  timing: "ON_TIME" | "LATE";
  lateReason: string | null;
  status: SubmissionStatus;
  score: number | null;
  correctCount: number | null;
  questionCount: number;
  deadlineRevision: number | null;
  decision: { decision: string; note: string | null; decidedAt: string } | null;
};

export type TestState = {
  status: StudentTestStatus;
  dueAt: string;
  revision: number;
  extended: boolean;
  dueSoon: boolean;
  lateReasonRequired: boolean;
  current: TestSubmission | null;
  history: TestSubmission[];
};

export const testStatusLabel: Record<StudentTestStatus, string> = {
  UPCOMING: "Chưa đến hạn",
  DUE_SOON: "Sắp đến hạn",
  OVERDUE_UNSUBMITTED: "Quá hạn, chưa nộp",
  SUBMITTED: "Đã nộp",
  LATE_REVIEW_PENDING: "Nộp trễ, chờ giáo viên duyệt",
  REJECTED: "Bài trễ bị từ chối",
};

export const testStatusTone: Record<StudentTestStatus, string> = {
  UPCOMING: "outline",
  DUE_SOON: "gold",
  OVERDUE_UNSUBMITTED: "not_passed",
  SUBMITTED: "passed",
  LATE_REVIEW_PENDING: "partial",
  REJECTED: "not_passed",
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  SCORED: "Đúng hạn",
  LATE_REVIEW_PENDING: "Trễ hạn · chờ duyệt",
  REJECTED_ZERO: "Trễ hạn · bị từ chối (0 điểm)",
  ACCEPTED_BY_EXTENSION: "Trễ hạn · được chấp nhận khi dời hạn",
};

export const dateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN");
