import { useEffect, useMemo, useRef, useState } from "react";
import { api, isApiError } from "../../../lib/api";
import { labRenderer, resolveLabRenderer, submissionPayload } from "./activity-renderers";

export type LabLaunch = {
  contract: "lab-contract/1";
  runId: string;
  labId: string;
  challengeId: string;
  modelRef: string;
  engineVersion: string;
  activityVersionId: string;
  activityVersion: number;
  rubricVersion: string;
  stateSchemaVersion: 1;
  evidenceSchemaVersion: 1;
  constraints: unknown;
  initialState: unknown;
  rendererKey: string | null;
  expiresAt: string | null;
  context: "ASSIGNMENT" | "FOUNDATIONAL" | "CLASS_PRACTICE";
  classLabSnapshot?: { title: string; learningObjective: string; instructions: string; reportPrompts: string[] } | null;
  assignmentId: string | null;
  versionBinding: "ASSIGNMENT_PINNED" | "LEGACY_UNPINNED_LAUNCH" | "FOUNDATIONAL_LAUNCH";
  /** Server-chosen run parameters, e.g. FL-03 specimen pins. Absent for runs that have none. */
  runtimeParams?: Record<string, string | number> | null;
  runtimeConfig?: unknown;
};

type LabDraft = {
  key: string;
  contextKey: string;
  runId: string;
  modelRef: string;
  engineVersion: string;
  activityVersionId: string;
  activityVersion: number;
  stateSchemaVersion: number;
  evidenceSchemaVersion: number;
  state: unknown;
  updatedAt: number;
};

const DB_NAME = "nexalab-lab-drafts";
const STORE = "drafts";

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("contextKey", "contextKey");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraft(draft: LabDraft) {
  const db = await openDraftDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(draft);
    const drafts = await requestResult(store.index("contextKey").getAll(draft.contextKey));
    drafts
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(5)
      .forEach((item) => store.delete(item.key));
  } finally {
    db.close();
  }
}

async function removeDraft(key: string) {
  const db = await openDraftDb();
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
  } finally {
    db.close();
  }
}

function compatible(draft: LabDraft, launch: LabLaunch) {
  return draft.modelRef === launch.modelRef &&
    draft.engineVersion === launch.engineVersion &&
    draft.activityVersionId === launch.activityVersionId &&
    draft.activityVersion === launch.activityVersion &&
    draft.stateSchemaVersion === launch.stateSchemaVersion &&
    draft.evidenceSchemaVersion === launch.evidenceSchemaVersion;
}

async function latestCompatibleDraft(contextKey: string, launch: LabLaunch) {
  const db = await openDraftDb();
  try {
    const drafts = await requestResult(
      db.transaction(STORE, "readonly").objectStore(STORE).index("contextKey").getAll(contextKey),
    );
    return drafts.filter((draft) => draft.runId !== launch.runId && compatible(draft, launch))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  } finally {
    db.close();
  }
}

type HostInput = {
  enabled: boolean;
  userId: string;
  labId: string;
  challengeId: string | null;
  assignmentId?: string;
  releaseId?: string;
  resourceId?: string;
  state: unknown;
  initialState: unknown;
  onStateChange: (state: any) => void;
};

export function useLabRunHost(input: HostInput) {
  const [launch, setLaunch] = useState<LabLaunch | null>(null);
  const [rendererKey, setRendererKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<LabDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const startedAt = useRef(Date.now());
  const idempotencyKey = useRef(crypto.randomUUID());
  const contextKey = useMemo(
    () => `${input.userId}:${input.resourceId ? `resource:${input.resourceId}` : input.assignmentId ? `assignment:${input.assignmentId}` : "foundational"}:lab:${input.labId}:challenge:${input.challengeId ?? "missing"}`,
    [input.resourceId, input.assignmentId, input.challengeId, input.labId, input.userId],
  );
  const draftKey = launch
    ? `${contextKey}:run:${launch.runId}:schema:${launch.stateSchemaVersion}`
    : null;
  // FL-07 evidence lives on the server; retain the launch identity across F5.
  const serverSessionKey = `nexalab:server-event-run:${contextKey}`;
  const restoresServerEvents = input.labId === "thermal-energy";

  const draftFor = (currentLaunch: LabLaunch, state: unknown): LabDraft => ({
    key: `${contextKey}:run:${currentLaunch.runId}:schema:${currentLaunch.stateSchemaVersion}`,
    contextKey,
    runId: currentLaunch.runId,
    modelRef: currentLaunch.modelRef,
    engineVersion: currentLaunch.engineVersion,
    activityVersionId: currentLaunch.activityVersionId,
    activityVersion: currentLaunch.activityVersion,
    stateSchemaVersion: currentLaunch.stateSchemaVersion,
    evidenceSchemaVersion: currentLaunch.evidenceSchemaVersion,
    state,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (!input.enabled || !launch || !draftKey || attempt) return;
    const initialState = launch.initialState ?? input.initialState;
    if (JSON.stringify(input.state) === JSON.stringify(initialState)) return;
    const timer = window.setTimeout(() => {
      void saveDraft(draftFor(launch, input.state)).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [attempt, draftKey, input.enabled, input.initialState, input.state, launch]);

  useEffect(() => {
    setLaunch(null);
    setRendererKey(null);
    setAttempt(null);
    setRestoreCandidate(null);
    setError(null);
    idempotencyKey.current = crypto.randomUUID();
  }, [contextKey]);

  useEffect(() => {
    if (!input.enabled || !restoresServerEvents || !input.challengeId) return;
    try {
      const cached = JSON.parse(sessionStorage.getItem(serverSessionKey) ?? "null");
      const renderer = cached?.launch ? resolveLabRenderer(cached.launch) : null;
      if (!renderer || cached.launch.labId !== input.labId || cached.launch.challengeId !== input.challengeId ||
          cached.launch.assignmentId !== (input.assignmentId ?? null) || typeof cached.submissionKey !== "string" ||
          (cached.launch.expiresAt && new Date(cached.launch.expiresAt).getTime() <= Date.now())) return;
      setLaunch(cached.launch); setRendererKey(renderer.key); setAttempt(cached.attempt ?? null);
      idempotencyKey.current = cached.submissionKey;
      startedAt.current = Number.isSafeInteger(cached.startedAt) ? cached.startedAt : Date.now();
    } catch { /* Server access and tuple checks still gate every event and submission. */ }
  }, [contextKey, input.enabled, input.challengeId]);

  useEffect(() => {
    if (!restoresServerEvents || !launch) return;
    try { sessionStorage.setItem(serverSessionKey, JSON.stringify({ launch, attempt, submissionKey: idempotencyKey.current, startedAt: startedAt.current })); }
    catch { /* A browser storage failure never changes server evidence. */ }
  }, [launch, attempt, serverSessionKey, restoresServerEvents]);

  const open = async () => {
    if (!input.enabled || !input.challengeId || pending) return;
    setPending(true);
    setError(null);
    try {
      const next = await api<LabLaunch>(`/labs/${encodeURIComponent(input.labId)}/runs`, "POST", {
        challengeId: input.challengeId,
        ...(input.releaseId ? { releaseId: input.releaseId } : {}),
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
      });
      if (next.contract !== "lab-contract/1") throw new Error("Phiên thực hành dùng hợp đồng không được hỗ trợ.");
      const nextRenderer = resolveLabRenderer(next);
      if (!nextRenderer) throw new Error(`Chưa cài giao diện tương thích với ${next.modelRef}.`);
      setLaunch(next);
      setRendererKey(nextRenderer.key);
      setAttempt(null);
      input.onStateChange(next.initialState ?? input.initialState);
      startedAt.current = Date.now();
      idempotencyKey.current = crypto.randomUUID();
      try {
        setRestoreCandidate(await latestCompatibleDraft(contextKey, next));
      } catch {
        setRestoreCandidate(null);
      }
    } catch (nextError) {
      setError(nextError);
    } finally {
      setPending(false);
    }
  };

  const change = (next: unknown) => {
    input.onStateChange(next);
    if (attempt) {
      setAttempt(null);
      idempotencyKey.current = crypto.randomUUID();
      startedAt.current = Date.now();
    }
  };

  const submit = async () => {
    if (!launch || pending) return null;
    setPending(true);
    setError(null);
    const currentDraft = draftFor(launch, input.state);
    try {
      await saveDraft(currentDraft).catch(() => undefined);
      const renderer = labRenderer(rendererKey);
      if (!renderer) throw new Error("Lab renderer is unavailable for this run");
      const response = await api<any>("/attempts", "POST", {
        contract: launch.contract,
        runId: launch.runId,
        idempotencyKey: idempotencyKey.current,
        stateSchemaVersion: launch.stateSchemaVersion,
        evidenceSchemaVersion: launch.evidenceSchemaVersion,
        ...submissionPayload(renderer, input.state),
        durationMs: Math.max(0, Date.now() - startedAt.current),
      });
      const saved = response.attempt
        ? { ...response.attempt, retryGuidance: response.retryGuidance ?? response.attempt.retryGuidance ?? null }
        : response;
      setAttempt(saved);
      await removeDraft(currentDraft.key).catch(() => undefined);
      return response;
    } catch (nextError) {
      setError(nextError);
      if (isApiError(nextError, "RUN_EXPIRED") || isApiError(nextError, "RUN_REVOKED")) {
        setLaunch(null);
        setRendererKey(null);
      }
      return null;
    } finally {
      setPending(false);
    }
  };

  const retry = () => {
    setAttempt(null);
    setError(null);
    idempotencyKey.current = crypto.randomUUID();
    startedAt.current = Date.now();
  };

  const reset = (next: unknown) => {
    retry();
    change(next);
  };

  const restoreDraft = () => {
    if (!restoreCandidate) return;
    input.onStateChange(restoreCandidate.state);
    void removeDraft(restoreCandidate.key).catch(() => undefined);
    setRestoreCandidate(null);
  };

  const discardDraft = () => {
    if (restoreCandidate) void removeDraft(restoreCandidate.key).catch(() => undefined);
    setRestoreCandidate(null);
  };

  return {
    launch,
    rendererKey,
    attempt,
    restoreCandidate,
    pending,
    error,
    open,
    change,
    submit,
    retry,
    reset,
    restoreDraft,
    discardDraft,
  };
}
