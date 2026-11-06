export type ClassSummary = {
  id: string;
  name: string;
  grade: number;
  status: "ACTIVE" | "ARCHIVED";
  requiresApproval: boolean;
  joinCode: { enabled: boolean; issued: boolean; rotatedAt: string | null };
  members: { approved: number; pending: number; removed: number };
  assignments: { active: number; archived: number };
};

export type Enrollment = {
  classId: string;
  studentId: string;
  status: "pending" | "approved" | "removed";
  joinedAt: string;
  student: { id: string; fullName: string; username: string; grade: number; mustChangePassword: boolean; avatarUrl?: string | null };
};

export type TeacherAssignment = {
  id: string;
  title: string;
  contentId: string;
  contentType: AssignableType;
  classLabSnapshot?: { resourceId: string; version: number; title: string; learningObjective: string; instructions: string; reportPrompts: string[]; contentDigest: string } | null;
  dueDate: string | null;
  overdue: boolean;
  audience: "CLASS" | "SUBSET";
  status: "ACTIVE" | "ARCHIVED";
  recipientCount: number;
  testSummary?: { revision: number; extended: boolean; counts: Record<"SUBMITTED" | "LATE_REVIEW_PENDING" | "REJECTED" | "OVERDUE_UNSUBMITTED" | "NOT_SUBMITTED", number> };
};

export type AssignableType = "lesson" | "lab" | "test";

// ---------------- Student ----------------

export type StudentClass = {
  id: string;
  name: string;
  grade: number;
  status: "ACTIVE" | "ARCHIVED";
  enrollmentStatus: "approved" | "pending";
  teacher?: { id: string; fullName: string; username: string } | null;
  subject?: string | null;
  assignments: Array<{ id: string; title: string; contentType: string; dueDate: string | null; overdue: boolean }>;
};
