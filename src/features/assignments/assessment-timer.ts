/**
 * TAI-07 (TAI7-T1): pure helpers for the graded-assessment countdown. The server owns `expiresAt`; the client only
 * corrects its own clock by the offset seen when the response arrived (serverNow vs local receive time).
 */
export type AssessmentType = "PRACTICE" | "REGULAR_15M" | "MIDTERM_45M";

export type AssessmentInfo = {
  type: AssessmentType;
  graded: boolean;
  coefficient: number | null;
  durationMinutes: number | null;
  attemptsAllowed: number | null;
  attemptsUsed: number;
  resultPublished: boolean;
  openSession: null | { id: string; attemptNo: number; startedAt: string; expiresAt: string; status: string; draftAnswers: unknown; labAttempts?: Array<{ itemId: string; id: string }>; draftSavedAt: string | null };
};

/** Client autosave cadence agreed in AM-G1. */
export const DRAFT_AUTOSAVE_MS = 20_000;

/** Server clock minus local clock, measured when a response carrying `serverNow` arrived. */
export const clockOffset = (serverNow: string | Date, receivedAt: number) => new Date(serverNow).getTime() - receivedAt;

/** Milliseconds left on the server clock, never negative. */
export function remainingMs(expiresAt: string | Date, offsetMs: number, localNow = Date.now()) {
  return Math.max(0, new Date(expiresAt).getTime() - (localNow + offsetMs));
}

/** mm:ss, or h:mm:ss for an hour or more; rounded up so "00:00" only shows at the real end. */
export function formatClock(ms: number) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const assessmentLabel: Record<AssessmentType, string> = {
  PRACTICE: "Luyện tập",
  REGULAR_15M: "Kiểm tra thường xuyên",
  MIDTERM_45M: "Kiểm tra giữa kỳ",
};

/** Policy mirror for the assign form (the server re-validates): default and allowed minutes per graded type. */
export const ASSESSMENT_DURATION: Record<Exclude<AssessmentType, "PRACTICE">, { default: number; min: number; max: number; coefficient: number }> = {
  REGULAR_15M: { default: 15, min: 5, max: 60, coefficient: 1 },
  MIDTERM_45M: { default: 45, min: 15, max: 120, coefficient: 2 },
};

/** 10-point display with a Vietnamese decimal comma (8.8 → "8,8"). */
export const score10Text = (value: number | null | undefined) => (value === null || value === undefined ? "—" : value.toFixed(1).replace(".", ","));
