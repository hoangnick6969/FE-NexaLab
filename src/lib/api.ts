import { create } from "zustand";
import { apiErrorMessage } from "../i18n/errors";
import { defineText } from "../i18n";

const text = defineText({
  vi: { materialFailed: "Không mở được học liệu", videoFailed: "Không tải được video", uploadFailed: "Tải tệp lên kho lưu trữ thất bại" },
  en: { materialFailed: "The learning material could not be opened", videoFailed: "The video could not be loaded", uploadFailed: "The file could not be uploaded to storage" },
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
    const body: unknown = await r.json();
    if (body && typeof body === "object") data = body as Partial<ApiErrorEnvelope>;
  } catch {
    // Non-JSON gateway errors still produce a typed error.
  }
  const status = r.status;
  const code = typeof data.code === "string" ? data.code : "HTTP_" + r.status;
  return new ApiError(status, code, apiErrorMessage(status, code, typeof data.message === "string" ? data.message : undefined, data.details), data.details);
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
      const startingToken = useAuth.getState().token;
      try {
        const r = await fetch(base + "/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!r.ok) return false;
        const data = await r.json();
        if (useAuth.getState().token !== startingToken) return false;
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
  const userId = useAuth.getState().user?.id;
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
  } catch {
    if (safeRead && retry) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return api(path, method, body, false, headers);
    }
    throw new ApiError(0, "NETWORK_ERROR", apiErrorMessage(0, "NETWORK_ERROR", undefined));
  }
  const authenticatedAuthEndpoint = Boolean(token) && ["/auth/password", "/auth/me"].includes(path);
  if (r.status === 401 && retry && useAuth.getState().token === token && (!path.startsWith("/auth/") || authenticatedAuthEndpoint)) {
    const restored = await restore();
    if (restored && (!userId || useAuth.getState().user?.id === userId)) return api(path, method, body, false, headers);
    if (!restored && useAuth.getState().token === token) useAuth.getState().set(null, null);
  }
  if (safeRead && retry && [502, 503, 504].includes(r.status)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return api(path, method, body, false, headers);
  }
  if (!r.ok) {
    const error = await readError(r);
    if (error.code === "PASSWORD_CHANGE_REQUIRED" && useAuth.getState().token === token) {
      const current = useAuth.getState();
      if (current.user) current.set({ ...current.user, mustChangePassword: true }, current.token);
      if (path !== "/auth/me" && current.token) {
        try {
          const user = await api<User>("/auth/me");
          if (useAuth.getState().token === current.token) current.set(user, current.token);
        } catch { /* Keep the gate active until authoritative reconciliation succeeds. */ }
      }
    }
    throw error;
  }
  try {
    return await r.json();
  } catch {
    throw new ApiError(502, "INVALID_RESPONSE", apiErrorMessage(502, "INVALID_RESPONSE", undefined));
  }
}
/** Retryable mutation: the same key is reused when the network call is retried. */
export function mutate<T = any>(path: string, method: string, body: unknown, key = idempotencyKey()) {
  return api<T>(path, method, body, true, { "Idempotency-Key": key });
}

/** Largest file sent through `POST /files`; bigger media goes straight to object storage (backend FORM_LIMIT). */
const FORM_UPLOAD_LIMIT = 20 * 1024 * 1024;
const KIND_BY_EXTENSION: Record<string, string> = { mp4: "video", pdf: "pdf", png: "image", jpg: "image", jpeg: "image", vtt: "caption", glb: "model" };
const MIME_BY_EXTENSION: Record<string, string> = { mp4: "video/mp4", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", vtt: "text/vtt", glb: "model/gltf-binary" };

async function putObject(url: string, body: Blob, headers: Record<string, string> = {}) {
  const r = await fetch(url, { method: "PUT", headers, body });
  if (!r.ok) throw new Error(text().uploadFailed);
  return r;
}

/**
 * CF-T2 presigned upload: a single PUT, or multipart with presigned parts and their ETags (the bucket's CORS
 * policy must expose the ETag header). The server validates and checksums the object before it becomes READY.
 */
async function uploadToStorage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const init = await api<any>("/assets/uploads", "POST", {
    fileName: file.name,
    mime: file.type || MIME_BY_EXTENSION[extension] || "application/octet-stream",
    bytes: file.size,
    title: file.name,
  });
  try {
    let parts: Array<{ partNumber: number; etag: string }> | undefined;
    if (init.mode === "single") await putObject(init.upload.url, file, init.upload.headers);
    else {
      parts = [];
      const numbers = Array.from({ length: init.partCount }, (_, i) => i + 1);
      for (let i = 0; i < numbers.length; i += 100) {
        const { parts: urls } = await api<{ parts: Array<{ partNumber: number; url: string }> }>(
          `/assets/uploads/${init.versionId}/parts`,
          "POST",
          { partNumbers: numbers.slice(i, i + 100) },
        );
        for (const part of urls) {
          const start = (part.partNumber - 1) * init.partSize;
          const etag = (await putObject(part.url, file.slice(start, start + init.partSize))).headers.get("ETag");
          if (!etag) throw new Error(text().uploadFailed);
          parts.push({ partNumber: part.partNumber, etag });
        }
      }
    }
    const done = await api<any>(`/assets/uploads/${init.versionId}/complete`, "POST", parts ? { parts } : {});
    return { id: done.versionId, assetId: done.assetId, url: done.url, type: KIND_BY_EXTENSION[extension] ?? "pdf", title: file.name, sha256: done.sha256 };
  } catch (error) {
    // Leave no half-written upload behind; the original error is what the user needs to see.
    await api(`/assets/uploads/${init.versionId}/abort`, "POST").catch(() => undefined);
    throw error;
  }
}

export async function uploadFile(file: File) {
  if (file.size > FORM_UPLOAD_LIMIT) return uploadToStorage(file);
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

export type AssetAccess = {
  url: string;
  expiresAt: string;
  mime: string;
  fileName: string;
  bytes: number | null;
};

/** Returns ephemeral access metadata only; callers must never persist the signed URL. */
export function getAssetAccess(assetVersionId: string) {
  return api<AssetAccess>(`/assets/versions/${encodeURIComponent(assetVersionId)}/access`);
}

export async function fetchAssetVersionRange(assetVersionId: string, range: string, signal: AbortSignal) {
  const request = () => fetch(`${base}/assets/versions/${encodeURIComponent(assetVersionId)}/content`, {
    credentials: "include",
    headers: {
      Range: range,
      ...(useAuth.getState().token ? { Authorization: `Bearer ${useAuth.getState().token}` } : {}),
    },
    signal,
  });
  let response = await request();
  if (response.status === 401 && await restore()) response = await request();
  return response;
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

export type StreamMaterial = InlineMaterial & { signed: boolean };

/**
 * Media the player can stream. A pinned version (`assetv:`) gets a short-lived signed storage URL, so the
 * browser fetches only the ranges it plays; `signed` tells the caller to ask again once that URL expires.
 * Legacy disk files (`asset:`) need the bearer header and fall back to a full blob download.
 */
export async function streamMaterial(url: string): Promise<StreamMaterial> {
  const version = /^assetv:(.+)$/.exec(url)?.[1];
  if (!version) return { ...(await inlineMaterial(url)), signed: false };
  const access = await api<{ url: string }>(`/assets/versions/${encodeURIComponent(version)}/access`);
  return { src: access.url, revoke: () => undefined, signed: true };
}

/**
 * Authenticated file download (TAI7-T3 gradebook CSV): fetches with the bearer token, refreshes once on 401, and saves
 * the body under the server's UTF-8 file name (Content-Disposition filename*) or the fallback.
 */
export async function downloadFile(path: string, fallbackName: string, retry = true): Promise<void> {
  const token = useAuth.getState().token;
  const r = await fetch(base + path, { credentials: "include", headers: token ? { Authorization: "Bearer " + token } : {} });
  if (r.status === 401 && retry && (await restore())) return downloadFile(path, fallbackName, false);
  if (!r.ok) throw await readError(r);
  const disposition = r.headers.get("Content-Disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
  const name = encoded ? decodeURIComponent(encoded) : plain ?? fallbackName;
  const url = URL.createObjectURL(await r.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
