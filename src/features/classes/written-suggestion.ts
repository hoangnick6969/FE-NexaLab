/**
 * TAI2-T6 assisted grading, pure helpers (no React). Mirrors the BE contract (implementation-contract.md, TAI2-T6 notes):
 * suggestions are teacher-only and shown in assist mode only; the grade is always the teacher's points, and the kind
 * only records how the teacher used the suggestion. Imported by the teacher grading screens only (import-isolation test).
 */
export type SuggestionStatus = "VALID" | "PARTIAL" | "SUPPRESSED";
export type SuggestionCriterion = {
  promptId: string;
  criterionCode: string;
  valid: boolean;
  reasonCode: string | null;
  suggestedPoints: number | null;
  rationale: string | null;
  uncertainty: string | null;
  /** [start, end) offsets into the student's original answer of the same prompt. */
  evidence: Array<{ start: number; end: number }>;
};
export type WrittenSuggestion = {
  id: string;
  status: SuggestionStatus;
  promptVersion: string;
  resourceVersion: number;
  flags: string[];
  createdAt: string;
  criteria: SuggestionCriterion[];
};
export type AiJobState = { id: string; status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; failureCode: string | null };
export type AiAssessmentFlags = { available: boolean; assist: boolean };
export type BoardAiState = { jobId: string; jobStatus: AiJobState["status"]; failureCode: string | null; suggestionId: string | null; status: SuggestionStatus | null };
export type GradeKind = "MANUAL" | "ACCEPTED_AI" | "EDITED_AI" | "REJECTED_AI";
export type AiChoice = "accept" | "edit" | "reject" | null;
export type SkipReason = "NOT_GRADEABLE" | "NOT_CURRENT" | "AI_POLICY_INELIGIBLE" | "CONSENT_REQUIRED" | "ALREADY_SUGGESTED" | "LESSON_UNAVAILABLE";
export type AssessmentRequestResult = {
  mode: "shadow" | "assist";
  created: Array<{ id: string; submissionId: string; status: AiJobState["status"] }>;
  skipped: Array<{ submissionId: string; reason: SkipReason; detail?: string }>;
};

/** Same limit as the BE request body. */
export const MAX_SUGGESTION_REQUEST = 50;
export const pointsKey = (promptId: string, code: string) => `${promptId}|${code}`;

/** Points of the valid criteria, as form values. Invalid criteria stay empty: the teacher fills them in. */
export function suggestedPoints(suggestion: WrittenSuggestion): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of suggestion.criteria) if (c.valid && c.suggestedPoints !== null) out[pointsKey(c.promptId, c.criterionCode)] = String(c.suggestedPoints);
  return out;
}

export const canUseSuggestion = (suggestion: WrittenSuggestion | null) => !!suggestion && suggestion.status !== "SUPPRESSED";
export const canAcceptAsIs = (suggestion: WrittenSuggestion | null) => !!suggestion && suggestion.status === "VALID";

/**
 * Kind sent with the grade: MANUAL without a usable suggestion or choice; REJECTED_AI after "reject"; after "accept"
 * or "edit", ACCEPTED_AI only when the suggestion is VALID and every criterion still has exactly the suggested points,
 * otherwise EDITED_AI. The BE re-checks all of this (SUGGESTION_MISMATCH).
 */
export function gradeKindFor(choice: AiChoice, suggestion: WrittenSuggestion | null, points: Record<string, string>): GradeKind {
  if (!choice || !suggestion || !canUseSuggestion(suggestion)) return "MANUAL";
  if (choice === "reject") return "REJECTED_AI";
  const unchanged = suggestion.criteria.every((c) => c.valid && c.suggestedPoints !== null && Number(points[pointsKey(c.promptId, c.criterionCode)]) === c.suggestedPoints);
  return canAcceptAsIs(suggestion) && unchanged ? "ACCEPTED_AI" : "EDITED_AI";
}

/** Evidence ranges of the valid criteria for one prompt (rendered as <mark> over the original answer). */
export function evidenceSpans(suggestion: WrittenSuggestion | null, promptId: string) {
  if (!suggestion) return [];
  return suggestion.criteria.filter((c) => c.valid && c.promptId === promptId).flatMap((c) => c.evidence);
}

/** Splits a rationale into plain text and inline $...$ math (KaTeX renders math only, trust off). */
export function rationaleSegments(text: string): Array<{ math: boolean; text: string }> {
  const out: Array<{ math: boolean; text: string }> = [];
  let last = 0;
  for (const match of text.matchAll(/\$([^$\n]{1,300})\$/g)) {
    if (match.index! > last) out.push({ math: false, text: text.slice(last, match.index) });
    out.push({ math: true, text: match[1] });
    last = match.index! + match[0].length;
  }
  if (last < text.length) out.push({ math: false, text: text.slice(last) });
  return out;
}

/** What the grading sheet says about the AI side. Every state leaves manual grading available. */
export function aiNotice(job: AiJobState | null, suggestion: WrittenSuggestion | null): "none" | "pending" | "provider_down" | "failed" | "suppressed" | "partial" | "ready" {
  if (suggestion) return suggestion.status === "SUPPRESSED" ? "suppressed" : suggestion.status === "PARTIAL" ? "partial" : "ready";
  if (!job) return "none";
  if (job.status === "PENDING" || job.status === "RUNNING") return "pending";
  if (job.status === "FAILED" && (job.failureCode === "PROVIDER_UNAVAILABLE" || job.failureCode === "PROVIDER_TIMEOUT")) return "provider_down";
  return job.status === "FAILED" ? "failed" : "none";
}

/** Current submissions the teacher may ask suggestions for: awaiting a grade, at most MAX_SUGGESTION_REQUEST. */
export function requestableSubmissions(students: Array<{ status: string; current: { id: string } | null; aiSuggestion?: BoardAiState | null }>) {
  return students
    .filter((s) => s.current && s.status === "AWAITING_GRADE" && !(s.aiSuggestion && ["PENDING", "RUNNING", "SUCCEEDED"].includes(s.aiSuggestion.jobStatus)))
    .map((s) => s.current!.id)
    .slice(0, MAX_SUGGESTION_REQUEST);
}

export const isActiveJob = (state: BoardAiState | null | undefined) => !!state && (state.jobStatus === "PENDING" || state.jobStatus === "RUNNING");
