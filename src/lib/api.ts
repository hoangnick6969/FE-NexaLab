import { create } from "zustand";
import { apiErrorMessage } from "../i18n/errors";
import { defineText } from "../i18n";

const text = defineText({
  vi: { materialFailed: "Không mở được học liệu", videoFailed: "Không tải được video" },
  en: { materialFailed: "The learning material could not be opened", videoFailed: "The video could not be loaded" },
});
export type User = {
  id: string;
  username?: string | null;
  email?: string | null;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  grade: number;
  mustChangePassword?: boolean;
};
export type StudentQuiz = {
  lessonId: string;
  stepId: string;
  questions: Array<{ id: string; prompt: string; options: Array<{ id: string; text: string }> }>;
};
export type QuizAnswer = { questionId: string; optionId: string };
export type QuizAttemptRequest = { answers: QuizAnswer[]; idempotencyKey: string };
export type QuizAttemptResult = { questionId: string; correct: boolean };
export type QuizAttemptSummary = {
  id: string;
  score: number;
  passed: boolean;
  correctCount: number;
  questionCount: number;
  createdAt: string;
  results: QuizAttemptResult[];
};
export type StudentQuizAttemptHistory = Omit<QuizAttemptSummary, "results"> & {
  idempotencyKey: string;
  latest: boolean;
  best: boolean;
  results: Array<{
    questionId: string;
    prompt: string;
    selectedOptionText: string;
    correct: boolean;
  }>;
};
export type QuizAttemptHistoryResponse = { attempts: StudentQuizAttemptHistory[] };
export type StudentLearningStep = {
  id: string;
  type: "READING" | "VIDEO" | "STUDY_CARDS" | "QUIZ" | "BASIC_EXERCISE" | "LAB" | "CHALLENGE";
  position: number;
  required: boolean;
  state: "COMPLETED" | "IN_PROGRESS" | "LOCKED";
  progressValue: number;
  lastPosition: number | null;
  visitedCardIds?: string[];
  lockReasonCode: string | null;
  resource: {
    html?: string;
    title?: string;
    url?: string;
    type?: string;
    equivalentText?: string;
    transcript?: string;
    cards?: Array<{ id: string; front: string; back: string }>;
    questions?: StudentQuiz["questions"];
    passThreshold?: number;
    labId?: string;
    challengeId?: string;
    sameAsLab?: boolean;
  } | null;
};
export type StudentPathway = {
  lesson: {
    id: string;
    title: string;
    subject: { id: string; name: string; ebookUrl?: string | null };
    grade: number;
    chapter: string;
    topic: string;
    learningObjective: string;
    prerequisites: string;
    curriculum?: string;
    content?: string;
    materials?: Array<{ type: string; url?: string; title?: string }>;
  };
  assignment: { id: string; dueDate: string | null; overdue: boolean };
  /** Sources/license of the lesson (B1-T4); synthetic fixtures carry a note instead. */
  attribution?: { sources: string | null; license: string | null; licenseLabel: string | null; synthetic: boolean; note: string | null };
  /** Archived content a student already started may be continued (B1, MSG-36). */
  contentArchived?: boolean;
  steps: StudentLearningStep[];
  nextStepId: string | null;
  updatedAt: string;
};
export type ApiErrorEnvelope = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};
/** Thrown for every non-2xx API response; branch on `code`, show `message` (already in the UI language). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const isApiError = (error: unknown, code?: string): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code);
export const idempotencyKey = (): string => crypto.randomUUID();
async function readError(r: Response): Promise<ApiError> {
  let data: Partial<ApiErrorEnvelope> = {};
  try {
    data = await r.json();
  } catch {
    // Non-JSON gateway errors still produce a typed error.
  }
  const status = data.statusCode ?? r.status;
  const code = typeof data.code === "string" ? data.code : "HTTP_" + r.status;
  return new ApiError(status, code, apiErrorMessage(status, code, data.message), data.details);
}
export type QuizAttemptResponse = {
  attempt: QuizAttemptSummary;
  pathway: StudentPathway;
};
export type PracticalVerdict = "passed" | "partial" | "needs_practice";
export type ProgressStepState = "COMPLETED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED";
export type QuizEvidenceSummary = {
  attempts: number;
  latest: { attemptId: string; score: number; passed: boolean; createdAt: string };
  best: { attemptId: string; score: number; passed: boolean; createdAt: string };
};
export type PracticalEvidenceSummary = {
  attempts: number;
  latest: { attemptId: string; verdict: PracticalVerdict; createdAt: string };
  best: { attemptId: string; verdict: PracticalVerdict; createdAt: string };
  passedAt: string | null;
};
export type MyProgressStep = {
  stepId: string;
  type: StudentLearningStep["type"];
  position: number;
  required: boolean;
  state: ProgressStepState;
  evidenceType: "STEP_PROGRESS" | "QUIZ_ATTEMPT" | "PRACTICAL_ATTEMPT" | null;
  evidenceId: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  quiz: QuizEvidenceSummary | null;
  practical: PracticalEvidenceSummary | null;
  stepProgress: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    progressValue: number;
    lastPosition: number | null;
    visitedCards: number;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
  } | null;
};
export type MyProgressAssignment = {
  /** LESSON pathway, or a standalone LAB assignment (B1, D3). */
  kind: "LESSON" | "LAB";
  assignmentId: string;
  lessonId: string | null;
  labId: string | null;
  title: string;
  lessonTitle: string;
  subject: { id: string; name: string };
  chapter: string;
  contentArchived: boolean;
  dueDate: string | null;
  overdue: boolean;
  completed: boolean;
  completedRequired: number;
  totalRequired: number;
  percent: number | null;
  nextStepId: string | null;
  quiz: QuizEvidenceSummary | null;
  practical: PracticalEvidenceSummary | null;
  updatedAt: string | null;
  steps: MyProgressStep[];
};
export type MyProgressResponse = {
  assignments: MyProgressAssignment[];
  summary: {
    activeAssignments: number;
    completedAssignments: number;
    remainingRequiredSteps: number;
    quizAttempts: number;
    practicalAttempts: number;
    passedPracticals: number;
    updatedAt: string | null;
  };
  generatedAt: string;
};
export type ActivityItem = {
  id: string;
  kind: "QUIZ" | "PRACTICAL";
  lessonId: string | null;
  stepId: string | null;
  stepType: StudentLearningStep["type"] | null;
  assignmentId: string | null;
  challengeId?: string;
  title: string;
  labTitle?: string;
  occurredAt: string;
  score: number | null;
  passed: boolean | null;
  verdict: PracticalVerdict | null;
  sourceAvailable: boolean;
  legacy: boolean;
};
export type ActivityPage = { items: ActivityItem[]; nextCursor: string | null };
export type MyQuizAttemptDetail = {
  id: string;
  kind: "QUIZ";
  lessonId: string;
  lessonTitle: string;
  stepId: string;
  assignmentId: string | null;
  sourceAvailable: boolean;
  createdAt: string;
  attemptNumber: number;
  totalAttempts: number;
  latest: boolean;
  best: boolean;
  score: number;
  passed: boolean;
  passThreshold: number;
  correctCount: number;
  questionCount: number;
  results: Array<{ questionId: string; prompt: string; selectedOptionText: string; correct: boolean }>;
};
export type MyPracticalAttemptDetail = {
  id: string;
  kind: "PRACTICAL";
  challengeId: string;
  challengeObjective: string;
  labId: string;
  labTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  stepId: string | null;
  stepType: string | null;
  assignmentId: string | null;
  sourceAvailable: boolean;
  legacy: boolean;
  createdAt: string;
  attemptNumber: number;
  verdict: PracticalVerdict | null;
  durationMs: number;
  simulationModelVersion: string;
  outcome: { status: string | null; currentMa: number | null; ledState: string | null };
  retryGuidance: string | null;
  hintLevels: number[];
};
export const useAuth = create<{
  user: User | null;
  token: string | null;
  set: (user: User | null, token: string | null) => void;
}>((set) => ({
  user: null,
  token: null,
  set: (user, token) => set({ user, token }),
}));
const base = import.meta.env.VITE_API_URL ?? "/api";
let refreshPromise: Promise<boolean> | null = null;
export async function restore() {
  if (!refreshPromise)
    refreshPromise = (async () => {
      try {
        const r = await fetch(base + "/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!r.ok) return false;
        const data = await r.json();
        useAuth.getState().set(data.user, data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  return refreshPromise;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
  headers: Record<string, string> = {},
): Promise<T> {
  const token = useAuth.getState().token;
  const safeRead = method === "GET";
  let r: Response;
  try {
    r = await fetch(base + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (safeRead && retry) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return api(path, method, body, false, headers);
    }
    throw error;
  }
  if (r.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await restore()) return api(path, method, body, false, headers);
    useAuth.getState().set(null, null);
  }
  if (safeRead && retry && [502, 503, 504].includes(r.status)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return api(path, method, body, false, headers);
  }
  if (!r.ok) throw await readError(r);
  return r.json();
}
/** Retryable mutation: the same key is reused when the network call is retried. */
export function mutate<T = any>(path: string, method: string, body: unknown, key = idempotencyKey()) {
  return api<T>(path, method, body, true, { "Idempotency-Key": key });
}

export async function uploadFile(file: File) {
  const data = new FormData();
  data.append("file", file);
  const r = await fetch(base + "/files", {
    method: "POST",
    credentials: "include",
    headers: { Authorization: "Bearer " + useAuth.getState().token },
    body: data,
  });
  if (!r.ok) throw await readError(r);
  return r.json();
}
// Uploaded files are referenced as `asset:<assetId>` or, for a pinned version, `assetv:<versionId>`.
// The backend serves both from /files/:id.
function assetFileId(url: string): string | null {
  const match = /^assetv?:(.+)$/.exec(url);
  return match ? match[1] : null;
}

export function isAssetUrl(url: string | null | undefined): boolean {
  return Boolean(url && assetFileId(url));
}

// No credentials: version ids redirect to a signed object-storage URL on another origin.
function fetchAssetFile(id: string) {
  return fetch(base + "/files/" + encodeURIComponent(id), {
    headers: { Authorization: "Bearer " + useAuth.getState().token },
  });
}

export async function openMaterial(url: string) {
  const id = assetFileId(url);
  if (!id) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const win = window.open("about:blank", "_blank");
  if (win) win.opener = null;
  try {
    let r = await fetchAssetFile(id);
    if (r.status === 401 && await restore()) r = await fetchAssetFile(id);
    if (!r.ok) throw new Error(text().materialFailed);
    const blob = URL.createObjectURL(await r.blob());
    if (win) win.location.href = blob;
    setTimeout(() => URL.revokeObjectURL(blob), 60000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

export type InlineMaterial = { src: string; revoke: () => void };

export async function inlineMaterial(url: string): Promise<InlineMaterial> {
  const id = assetFileId(url);
  if (!id) return { src: url, revoke: () => undefined };

  let response = await fetchAssetFile(id);
  if (response.status === 401 && await restore()) response = await fetchAssetFile(id);
  if (!response.ok) throw new Error(text().videoFailed);

  const src = URL.createObjectURL(await response.blob());
  return { src, revoke: () => URL.revokeObjectURL(src) };
}
