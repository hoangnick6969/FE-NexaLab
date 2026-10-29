import { useEffect, useMemo, useRef, useState } from "react";
import { api, isApiError } from "../../lib/api";

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
  context: "ASSIGNMENT" | "FOUNDATIONAL";
  assignmentId: string | null;
  versionBinding: "ASSIGNMENT_PINNED" | "LEGACY_UNPINNED_LAUNCH" | "FOUNDATIONAL_LAUNCH";
};

const renderers = {
  circuit: { labId: "circuit", modelRefs: ["circuit@1.0.0"] },
  "circuit-bulb": { labId: "circuit", modelRefs: ["circuit-bulb@1.0.0"] },
  chemistry: { labId: "chemistry", modelRefs: ["chemistry@1.0.0"] },
  eye: { labId: "eye", modelRefs: ["eye@1.0.0"] },
} as const;

export type LabRendererKey = keyof typeof renderers;

export function resolveLabRenderer(launch: LabLaunch): LabRendererKey | null {
  const key = (launch.rendererKey ?? launch.labId) as LabRendererKey;
  const renderer = renderers[key];
  // shortcut: each deployed model version needs one explicit FE registry entry.
  return renderer?.labId === launch.labId && (renderer.modelRefs as readonly string[]).includes(launch.modelRef)
    ? key
    : null;
}

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
  state: unknown;
  initialState: unknown;
  onStateChange: (state: any) => void;
};

export function useLabRunHost(input: HostInput) {
  const [launch, setLaunch] = useState<LabLaunch | null>(null);
  const [rendererKey, setRendererKey] = useState<LabRendererKey | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<LabDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const startedAt = useRef(Date.now());
  const idempotencyKey = useRef(crypto.randomUUID());
  const contextKey = useMemo(
    () => `${input.userId}:${input.assignmentId ? `assignment:${input.assignmentId}` : "foundational"}:lab:${input.labId}:challenge:${input.challengeId ?? "missing"}`,
    [input.assignmentId, input.challengeId, input.labId, input.userId],
  );
  const draftKey = launch
    ? `${contextKey}:run:${launch.runId}:schema:${launch.stateSchemaVersion}`
    : null;

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

  const open = async () => {
    if (!input.enabled || !input.challengeId || pending) return;
    setPending(true);
    setError(null);
    try {
      const next = await api<LabLaunch>(`/labs/${encodeURIComponent(input.labId)}/runs`, "POST", {
        challengeId: input.challengeId,
        ...(input.releaseId ? { releaseId: input.releaseId } : {}),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
      });
      if (next.contract !== "lab-contract/1") throw new Error("Phiên thực hành dùng hợp đồng không được hỗ trợ.");
      const nextRenderer = resolveLabRenderer(next);
      if (!nextRenderer) throw new Error(`Chưa cài giao diện tương thích với ${next.modelRef}.`);
      setLaunch(next);
      setRendererKey(nextRenderer);
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
      const bulbEvidence = input.state as { checkpoints?: unknown; explanation?: unknown } | null;
      const response = await api<any>("/attempts", "POST", {
        contract: launch.contract,
        runId: launch.runId,
        idempotencyKey: idempotencyKey.current,
        stateSchemaVersion: launch.stateSchemaVersion,
        evidenceSchemaVersion: launch.evidenceSchemaVersion,
        ...(launch.rubricVersion === "circuit-bulb-checkpoints@1.0.0"
          ? { checkpoints: bulbEvidence?.checkpoints, explanation: bulbEvidence?.explanation }
          : { labState: input.state }),
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
