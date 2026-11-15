import { api } from "../../lib/api";

/**
 * Teacher AI credits client contract (TAI-05), mirroring BE `implementation-contract.md`. Credits only: the API never
 * returns tokens, provider names or provider prices to a teacher. The backend enforces ownership and balance; hiding
 * UI is never the authorization. This module is loaded by teacher screens only (dynamic import), never by the entry,
 * student or parent bundles (`npm run test:credits-bundle`).
 */
export type CreditEstimateBody =
  | { purpose: "GENERATE_RESOURCE"; targetKind: "DECK" | "STUDY_QUIZ" | "TEST"; lessonId: string; itemCount: number; difficulty?: string; instruction?: string }
  | { purpose: "ASSESS_SUBMISSION"; submissionCount: number }
  | { purpose: "DRAFT_LAB_CHALLENGE"; lessonId: string; proposalCount: number; instruction?: string }
  /** TAI7-T5: priced by its slots (questions + Lab), so the body carries the same sections as the create route. */
  | { purpose: "GENERATE_ASSESSMENT"; lessonId: string; assessmentType: "REGULAR_15M" | "MIDTERM_45M"; matrix: Record<"RECALL" | "UNDERSTAND" | "APPLY", number>; sections: { mcqCount: number; writtenCount: number; lab: { labId: string; releaseId: string; challengeId: string } | null }; instruction?: string };

/** `enabled: false` means the feature is off: no estimate is shown and no `confirmedCredits` is sent. */
export type CreditEstimate = { enabled: boolean; credits: number; pricingVersion: number | null; available: number };

export type CreditTransactionKind = "GRANT" | "ADJUST" | "RESERVE" | "SETTLE" | "REFUND";
export type CreditTransaction = {
  id: string;
  kind: CreditTransactionKind;
  /** Signed effect on the available balance. */
  credits: number;
  /** SETTLE only: what the job actually cost. */
  charged: number | null;
  jobId: string | null;
  createdAt: string;
};
export type MyCredits = { enabled: boolean; available: number; reserved: number; transactions: CreditTransaction[]; nextCursor: string | null };

/** Per-job credit state returned with an AI job (credits on only). */
export type JobCredits = { estimated: number; state: "reserved" | "settled" | "refunded"; charged: number | null; refunded: number | null };

export const estimateCredits = (classId: string, body: CreditEstimateBody) => api<CreditEstimate>(`/classes/${classId}/ai-jobs/estimate`, "POST", body);
export const fetchMyCredits = (cursor?: string | null) => api<MyCredits>(`/me/credits?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);

/** Debounce for the estimate-on-change call. */
export const ESTIMATE_DEBOUNCE_MS = 400;
