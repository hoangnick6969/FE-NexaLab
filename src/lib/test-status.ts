import { defineText, formatDateTime } from "../i18n";

const text = defineText({
  vi: {
    status: {
      UPCOMING: "Chưa đến hạn",
      DUE_SOON: "Sắp đến hạn",
      OVERDUE_UNSUBMITTED: "Quá hạn, chưa nộp",
      SUBMITTED: "Đã nộp",
      AWAITING_GRADE: "Đã nộp, chờ giáo viên chấm",
      GRADED: "Đã chấm",
      LATE_REVIEW_PENDING: "Nộp trễ, chờ giáo viên duyệt",
      REJECTED: "Bài trễ bị từ chối",
    },
    submission: {
      SCORED: "Đúng hạn",
      AWAITING_GRADE: "Đúng hạn · chờ chấm",
      GRADED: "Đã chấm",
      LATE_REVIEW_PENDING: "Trễ hạn · chờ duyệt",
      REJECTED_ZERO: "Trễ hạn · bị từ chối (0 điểm)",
      ACCEPTED_BY_EXTENSION: "Trễ hạn · được chấp nhận khi dời hạn",
    },
  },
  en: {
    status: {
      UPCOMING: "Not due yet",
      DUE_SOON: "Due soon",
      OVERDUE_UNSUBMITTED: "Overdue, not submitted",
      SUBMITTED: "Submitted",
      AWAITING_GRADE: "Submitted, waiting for the grade",
      GRADED: "Graded",
      LATE_REVIEW_PENDING: "Late, waiting for the teacher",
      REJECTED: "Late submission rejected",
    },
    submission: {
      SCORED: "On time",
      AWAITING_GRADE: "On time · waiting for the grade",
      GRADED: "Graded",
      LATE_REVIEW_PENDING: "Late · waiting for review",
      REJECTED_ZERO: "Late · rejected (0 points)",
      ACCEPTED_BY_EXTENSION: "Late · accepted after an extension",
    },
  },
});
/** Labels for the server-derived assigned-test status shared by student, teacher and parent views (I3). */
export type StudentTestStatus = "UPCOMING" | "DUE_SOON" | "OVERDUE_UNSUBMITTED" | "SUBMITTED" | "AWAITING_GRADE" | "GRADED" | "LATE_REVIEW_PENDING" | "REJECTED";
export type SubmissionStatus = "SCORED" | "AWAITING_GRADE" | "GRADED" | "LATE_REVIEW_PENDING" | "REJECTED_ZERO" | "ACCEPTED_BY_EXTENSION";

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
  /** TAI2-T3: the latest teacher grade of the current submission only (never on history rows). */
  grade?: WrittenGrade | null;
};

export type WrittenGrade = {
  score: number;
  totalPoints: number;
  maxPoints: number;
  feedback: string | null;
  criteria: Array<{ promptId: string; code: string; description: string; points: number; maxPoints: number | null }>;
  decidedAt: string;
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

export const testStatusLabel: Record<StudentTestStatus, string> = text().status;

export const testStatusTone: Record<StudentTestStatus, string> = {
  UPCOMING: "outline",
  DUE_SOON: "gold",
  OVERDUE_UNSUBMITTED: "not_passed",
  SUBMITTED: "passed",
  AWAITING_GRADE: "partial",
  GRADED: "passed",
  LATE_REVIEW_PENDING: "partial",
  REJECTED: "not_passed",
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = text().submission;

export const dateTime = (iso: string) => formatDateTime(iso);
