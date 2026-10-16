import { create } from "zustand";
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
  type: "READING" | "VIDEO" | "STUDY_CARDS" | "QUIZ" | "LAB" | "CHALLENGE";
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
  } | null;
};
export type StudentPathway = {
  lesson: {
    id: string;
    title: string;
    subject: { id: string; name: string };
    grade: number;
    chapter: string;
    topic: string;
    learningObjective: string;
    prerequisites: string;
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
/** Thrown for every non-2xx API response; branch on `code`, show `message`. */
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
  return new ApiError(
    data.statusCode ?? r.status,
    typeof data.code === "string" ? data.code : "HTTP_" + r.status,
    data.message ?? "Không thể kết nối máy chủ",
    data.details,
  );
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

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  vtt: "text/vtt",
  glb: "model/gltf-binary",
};
/**
 * CF-T2 upload: the API issues a presigned PUT (or multipart part URLs) to a
 * private staging key; the browser sends bytes straight to storage, then the
 * API validates (size, signature, SHA-256) and returns an immutable
 * `assetv:<versionId>` reference. No storage credential reaches the browser.
 */
export async function uploadFile(file: File, onProgress?: (fraction: number) => void) {
  const mime = MIME_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? file.type;
  const started = await api<any>("/assets/uploads", "POST", { fileName: file.name, mime, bytes: file.size, title: file.name });
  try {
    let parts: Array<{ partNumber: number; etag: string }> | undefined;
    if (started.mode === "single") {
      const r = await fetch(started.upload.url, { method: "PUT", headers: started.upload.headers, body: file });
      if (!r.ok) throw new Error("Tải tệp lên kho lưu trữ thất bại");
      onProgress?.(1);
    } else {
      parts = [];
      for (let first = 1; first <= started.partCount; first += 10) {
        const numbers = Array.from({ length: Math.min(10, started.partCount - first + 1) }, (_, i) => first + i);
        const signed = await api<any>(`/assets/uploads/${started.versionId}/parts`, "POST", { partNumbers: numbers });
        for (const { partNumber, url } of signed.parts) {
          const chunk = file.slice((partNumber - 1) * started.partSize, partNumber * started.partSize);
          const r = await fetch(url, { method: "PUT", body: chunk });
          const etag = r.headers.get("ETag");
          if (!r.ok || !etag) throw new Error("Tải phần " + partNumber + " thất bại");
          parts.push({ partNumber, etag });
          onProgress?.(parts.length / started.partCount);
        }
      }
    }
    const done = await api<any>(`/assets/uploads/${started.versionId}/complete`, "POST", parts ? { parts } : {});
    const kind = mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : mime === "video/mp4" ? "video" : mime === "text/vtt" ? "caption" : "model";
    return { id: done.versionId, assetId: done.assetId, url: done.url as string, type: kind, title: file.name };
  } catch (error) {
    if (!(error instanceof ApiError)) await api(`/assets/uploads/${started.versionId}/abort`, "POST").catch(() => undefined);
    throw error;
  }
}
/** Short-lived read URL for an immutable asset version (`assetv:<id>`). */
async function versionUrl(url: string) {
  const access = await api<{ url: string }>("/assets/versions/" + url.slice("assetv:".length) + "/access");
  return access.url;
}
export async function openMaterial(url: string) {
  if (url.startsWith("assetv:")) {
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    try {
      const signed = await versionUrl(url);
      if (win) win.location.href = signed;
    } catch (e) {
      win?.close();
      throw e;
    }
    return;
  }
  if (!url.startsWith("asset:")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const win = window.open("about:blank", "_blank");
  if (win) win.opener = null;
  try {
    const r = await fetch(base + "/files/" + url.slice(6), {
      headers: { Authorization: "Bearer " + useAuth.getState().token },
    });
    if (!r.ok) throw new Error("Không mở được học liệu");
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
  // Signed storage URLs stream directly (range requests for video) and expire on their own.
  if (url.startsWith("assetv:")) return { src: await versionUrl(url), revoke: () => undefined };
  if (!url.startsWith("asset:")) return { src: url, revoke: () => undefined };

  const request = () => fetch(base + "/files/" + url.slice(6), {
    credentials: "include",
    headers: { Authorization: "Bearer " + useAuth.getState().token },
  });
  let response = await request();
  if (response.status === 401 && await restore()) response = await request();
  if (!response.ok) throw new Error("Không tải được video");

  const src = URL.createObjectURL(await response.blob());
  return { src, revoke: () => URL.revokeObjectURL(src) };
}
