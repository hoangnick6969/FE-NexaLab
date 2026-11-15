import { insightText } from "./insights-copy.ts";

/** Shapes returned by the TAI-04 teacher routes (BE implementation-contract.md). Teacher screens only. */
export type InsightEvidenceKind = "QUIZ" | "TEST" | "PRACTICAL" | "WRITTEN" | "SIMILARITY_MATCH" | "WRITTEN_GRADE" | "ASSIGNMENT";
/** insights@4 entries also carry the assignment title, its type, the 10-point score and (ASSIGNMENT) a status. */
export type InsightEvidenceRef = { kind: InsightEvidenceKind; id: string; at: string; label?: string; assessmentType?: string; score10?: number | null; status?: string };
export type InsightAckAction = "ACKNOWLEDGED" | "DISMISSED";
export type InsightItem = {
  fingerprint: string;
  ruleVersion: string;
  ruleCode: string;
  pattern?: string;
  status: string;
  studentId: string;
  message: string;
  thresholds: Record<string, number>;
  values: Record<string, number | string>;
  evidence: InsightEvidenceRef[];
  computedAt: string;
  latestAcknowledgement?: { action: InsightAckAction; createdAt: string } | null;
};
export type StudentInsights = { studentId: string; displayName: string; insights: InsightItem[] };
export type ClassInsightsResponse = { classId: string; status: "open" | "all"; classArchived: boolean; students: StudentInsights[] };
export type AckEntry = { id: string; fingerprint: string; ruleVersion: string; ruleCode: string; action: InsightAckAction; note: string | null; createdAt: string };
export type StudentInsightsResponse = {
  classId: string;
  studentId: string;
  displayName: string;
  status: "open" | "all";
  classArchived: boolean;
  insights: InsightItem[];
  acknowledgements: AckEntry[];
};

export const NOTE_MAX = 500;
export const INSUFFICIENT_CODE = "INSUFFICIENT_EVIDENCE";

/**
 * Splits the class list for display. Student order is exactly the order the API returned (by display name): nothing is
 * re-sorted and no per-student count is produced. Students whose only insight is "too few scored items" go to a
 * collapsed group; students with no insight at all are left out of the main list.
 */
export function partitionStudents(students: StudentInsights[]) {
  const main: StudentInsights[] = [];
  const insufficient: Array<{ studentId: string; displayName: string }> = [];
  for (const student of students) {
    const rest = student.insights.filter((i) => i.ruleCode !== INSUFFICIENT_CODE);
    if (student.insights.length > rest.length) insufficient.push({ studentId: student.studentId, displayName: student.displayName });
    if (rest.length) main.push({ ...student, insights: rest });
  }
  return { main, insufficient };
}

/** Neutral tones only: the warm and red/green badge tones are never used for insights. */
export const STATUS_TONES: Record<string, string> = {
  INFORMATIONAL: "outline",
  NEEDS_MORE_EVIDENCE: "outline",
  TEACHER_REVIEW_RECOMMENDED: "",
};
export const statusTone = (status: string) => STATUS_TONES[status] ?? "outline";

export const isHandled = (insight: InsightItem) => Boolean(insight.latestAcknowledgement);

/** Code points, like the server rule. */
export const noteLength = (note: string) => [...note.trim().normalize("NFC")].length;
export const noteTooLong = (note: string) => noteLength(note) > NOTE_MAX;

/** QUIZ and PRACTICAL open the existing B2 detail routes; TEST has no detail route yet and is not clickable. */
export function evidencePath(classId: string, studentId: string, ref: InsightEvidenceRef): string | null {
  const base = `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`;
  if (ref.kind === "QUIZ") return `${base}/quiz-attempts/${encodeURIComponent(ref.id)}`;
  if (ref.kind === "PRACTICAL") return `${base}/attempts/${encodeURIComponent(ref.id)}`;
  return null;
}

/** What the card says about one insight, in the page language. Unknown rule codes fall back to the API message. */
export function insightCopy(insight: Pick<InsightItem, "ruleCode" | "message" | "values" | "thresholds">) {
  const t = insightText();
  // A score change between resubmissions of one assigned test reads as a retake, not as progress across work.
  const key = insight.ruleCode === "SCORE_CHANGE_UNUSUAL" && insight.values?.context === "RETAKE_SAME_ASSIGNMENT" ? "SCORE_CHANGE_RETAKE" : insight.ruleCode;
  const rule = (t.rules as Record<string, { title: string; summary: (...args: any[]) => string; threshold: (...args: any[]) => string } | undefined>)[key];
  if (!rule) {
    return {
      title: t.unknownTitle,
      summary: insight.message,
      threshold: Object.entries(insight.thresholds).map(([key, value]) => `${key}: ${value}`).join(" · "),
    };
  }
  return { title: rule.title, summary: rule.summary(insight.values, t.evidenceKind), threshold: rule.threshold(insight.thresholds) };
}

/** One-line badge for a table row: the score change with its sign, or the insight title for every other rule. */
export function insightBadge(insight: Pick<InsightItem, "ruleCode" | "message" | "values" | "thresholds">): string {
  const t = insightText();
  if (insight.ruleCode === "ASSESSMENT_TREND") return Number(insight.values.delta10) >= 0 ? t.badge.trendUp(insight.values.delta10) : t.badge.trendDown(insight.values.delta10);
  if (insight.ruleCode === "READINESS_BEFORE_MIDTERM") return t.badge.readiness(insight.values.daysLeft);
  if (insight.ruleCode === "SCORE_CHANGE_UNUSUAL") {
    const delta = insight.values.delta;
    if (insight.values.context === "RETAKE_SAME_ASSIGNMENT") return t.badge.retake(delta);
    return Number(delta) >= 0 ? t.badge.up(delta) : t.badge.down(delta);
  }
  return insightCopy(insight).title;
}

/** The written assignment a similarity insight points to, or null for every other insight. */
export function similarityAssignmentId(insight: Pick<InsightItem, "ruleCode" | "values">): string | null {
  const id = insight.values.assignmentId;
  return insight.ruleCode === "SUBMISSION_SIMILARITY_HIGH" && typeof id === "string" && id !== "" ? id : null;
}

/** Query string that opens the written tracking modal of an assignment in its similarity view, keeping other params. */
export function withSimilarityTarget(params: URLSearchParams, assignmentId: string): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set("tab", "work");
  next.set("similarity", assignmentId);
  return next;
}

export const ackLabel = (action: InsightAckAction) => (action === "DISMISSED" ? insightText().dismissed : insightText().acknowledged);

/** Maps an API error to what the card does about it, without importing the API client. */
export function ackErrorKind(error: unknown): "stale" | "archived" | "other" {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "INSIGHT_STALE") return "stale";
  if (code === "CLASS_ARCHIVED") return "archived";
  return "other";
}

/** The body of the acknowledgement request; an empty note is left out. */
export function ackBody(action: InsightAckAction, note: string) {
  const trimmed = note.trim();
  return { action, ...(trimmed ? { note: trimmed } : {}) };
}

/**
 * TAI7-T2: the text of one evidence entry, without the date: kind, then for insights@4 the assignment title, its type,
 * the 10-point score ("6,7/10") or the status ("chưa làm"). Older entries read exactly as before (kind only).
 */
export function evidenceText(item: InsightEvidenceRef): string {
  const t = insightText();
  const parts = [t.evidenceKind[item.kind] ?? item.kind];
  if (item.label) parts.push(item.label);
  if (item.assessmentType && t.assessmentType[item.assessmentType]) parts.push(t.assessmentType[item.assessmentType]!);
  if (typeof item.score10 === "number") parts.push(t.score10(item.score10));
  if (item.status && t.evidenceStatus[item.status]) parts.push(t.evidenceStatus[item.status]!);
  return parts.join(" · ");
}
