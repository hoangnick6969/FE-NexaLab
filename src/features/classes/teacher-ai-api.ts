import { api, mutate } from "../../lib/api";

/**
 * Teacher AI (TAI-01) client contract, mirroring BE `implementation-contract.md` (frozen 2026-11-06).
 * Owner-only Class Space routes; the backend enforces ownership, so hiding UI is never the authorization.
 */
export type AiTargetKind = "DECK" | "STUDY_QUIZ" | "TEST";
export type AiDifficulty = "FOUNDATION" | "STANDARD" | "ADVANCED";
export type AiJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type AiDecisionKind = "ACCEPTED" | "EDITED" | "REJECTED";

export type AiQuestionItem = {
  type: "SINGLE_CHOICE";
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: AiDifficulty;
  outcomeCodes: string[];
  sourceRefs: string[];
};
export type AiCardItem = { type: "CARD"; front: string; back: string; sourceRefs: string[] };
export type AiItemPayload = AiQuestionItem | AiCardItem;

/** duplicateOf entry (qdup@1, TAI3-T2): a class resource of this or another own class, or a shared-library lesson. */
export type AiDuplicateMatch = {
  sourceKind: "CLASS_RESOURCE" | "LIBRARY_LESSON";
  resourceId?: string;
  lessonId?: string;
  resourceTitle: string;
  className?: string;
  match: "EXACT" | "NEAR";
  similarity: number;
  flag: string;
};

/** duplicateWarnings on class resource create/update/import preview and the duplicate-check route (qdup@1). */
export type QuestionDuplicateWarning = {
  index: number;
  matches: Array<{
    level: "EXACT" | "NEAR";
    score: number;
    flag: string;
    source: { kind: "CLASS_RESOURCE" | "LIBRARY_LESSON"; title: string; classId?: string; className?: string; itemId: string };
  }>;
};

export type AiJobItem = {
  id: string;
  position: number;
  payload: AiItemPayload;
  flags: string[];
  duplicateOf: AiDuplicateMatch[];
  decision: null | { decision: AiDecisionKind; editedPayload: AiItemPayload | null; reasonCode: string | null; at: string; flags: string[] };
};

export type AiJobView = {
  id: string;
  classId: string;
  lessonId: string;
  targetKind: AiTargetKind;
  status: AiJobStatus;
  failureCode: string | null;
  promptVersion: string;
  outputSchemaVersion: string;
  model: string;
  requestedCount: number;
  validCount: number | null;
  droppedCount: number | null;
  /** Omitted by the API while AI credits are on: a teacher sees credits, never provider tokens. */
  usage?: { inputTokens: number | null; outputTokens: number | null };
  /** Present while AI credits are on: what was held, charged or returned for this job. */
  credits?: { estimated: number; state: "reserved" | "settled" | "refunded"; charged: number | null; refunded: number | null } | null;
  lessonChangedSinceGeneration: boolean;
  materializedResourceId: string | null;
  createdAt: string;
  completedAt: string | null;
  items?: AiJobItem[];
};

export type CreateAiJobInput = {
  targetKind: AiTargetKind;
  lessonId: string;
  itemCount: number;
  difficulty?: AiDifficulty;
  instruction?: string;
  /** The credit estimate the teacher confirmed; sent only while credits are on (the API requires it then). */
  confirmedCredits?: number;
};

export const MAX_ITEMS: Record<AiTargetKind, number> = { DECK: 30, STUDY_QUIZ: 20, TEST: 20 };
export const ACTIVE_STATUSES: AiJobStatus[] = ["PENDING", "RUNNING"];
/** Polling contract: every 2 s while PENDING/RUNNING, then a recoverable "still processing" state after 120 s. */
export const POLL_INTERVAL_MS = 2_000;
export const POLL_LIMIT_MS = 120_000;

export const listAiJobs = (classId: string) => api<{ items: AiJobView[]; nextCursor: string | null }>(`/classes/${classId}/ai-jobs?limit=10`);
export const getAiJob = (classId: string, jobId: string) => api<AiJobView>(`/classes/${classId}/ai-jobs/${jobId}`);
export const createAiJob = (classId: string, input: CreateAiJobInput, key: string) =>
  mutate<AiJobView>(`/classes/${classId}/ai-jobs`, "POST", { purpose: "GENERATE_RESOURCE", ...input }, key);
export const cancelAiJob = (classId: string, jobId: string) => api<AiJobView>(`/classes/${classId}/ai-jobs/${jobId}/cancel`, "POST", {});
export const decideAiItem = (
  classId: string,
  jobId: string,
  itemId: string,
  body: { decision: AiDecisionKind; editedPayload?: AiItemPayload; reasonCode?: string },
) => api<AiJobView>(`/classes/${classId}/ai-jobs/${jobId}/items/${itemId}/decisions`, "POST", body);
export const materializeAiJob = (classId: string, jobId: string, title: string, key: string) =>
  mutate<{ id: string; title: string; kind: AiTargetKind; status: string; lessonChangedSinceGeneration: boolean }>(
    `/classes/${classId}/ai-jobs/${jobId}/materialize`, "POST", { title }, key);

/** The item the teacher is keeping: the edited payload when edited, otherwise the generated one. */
export const effectivePayload = (item: AiJobItem): AiItemPayload =>
  item.decision?.decision === "EDITED" && item.decision.editedPayload ? item.decision.editedPayload : item.payload;
