import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { idempotencyKey, isApiError } from "../../lib/api";
import { isQuotaFull, useAiQuota } from "../ai-usage/AiQuota";
import { ACTIVE_STATUSES, cancelAiJob, createAiJob, decideAiItem, getAiJob, listAiJobs, materializeAiJob, MAX_ITEMS, POLL_INTERVAL_MS, POLL_LIMIT_MS, type AiDifficulty, type AiJobView, type AiTargetKind } from "./teacher-ai-api";

export type CreditEstimateValue = { enabled: boolean; credits: number; available: number } | undefined;
export const CREDIT_ERROR_CODES = ["AI_ESTIMATE_CHANGED", "AI_CREDITS_INSUFFICIENT"];

/** jobs: Recent class requests and their query state. */
export function useAiJobs(classId: string): { jobs: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listAiJobs>>>> } {
  const jobs = useQuery({ queryKey: ["ai-jobs", classId], queryFn: () => listAiJobs(classId) });
  return { jobs };
}

/** request form: Inputs, quota/credit estimate, validation, create action, and retry prefill. */
function useAiRequestFormState(classId: string, onCreated: (jobId: string) => void, onRetry: () => void) {
  const qc = useQueryClient();
  const quota = useAiQuota("GENERATE_RESOURCE");
  const [targetKind, setTargetKind] = useState<AiTargetKind>("STUDY_QUIZ");
  const [lessonId, setLessonId] = useState("");
  const [itemCount, setItemCount] = useState(10);
  const [difficulty, setDifficulty] = useState<AiDifficulty | "">("");
  const [instruction, setInstruction] = useState("");
  const [credit, setCredit] = useState<CreditEstimateValue>();
  const creditBody = useMemo(() => lessonId ? { purpose: "GENERATE_RESOURCE" as const, targetKind, lessonId, itemCount, ...(difficulty ? { difficulty } : {}), ...(instruction.trim() ? { instruction: instruction.trim() } : {}) } : null, [targetKind, lessonId, itemCount, difficulty, instruction]);
  const creditShort = !!credit && credit.enabled && credit.available < credit.credits;
  const creditWait = !!lessonId && !credit;
  const create = useMutation({
    mutationFn: () => createAiJob(classId, { targetKind, lessonId, itemCount, ...(difficulty ? { difficulty } : {}), ...(instruction.trim() ? { instruction: instruction.trim() } : {}), ...(credit?.enabled ? { confirmedCredits: credit.credits } : {}) }, idempotencyKey()),
    onError: (error) => { if (isApiError(error, "AI_QUOTA_EXCEEDED")) void quota.refetch(); },
    onSuccess: (job) => { qc.invalidateQueries({ queryKey: ["my-credits"] }); qc.invalidateQueries({ queryKey: ["ai-quota"] }); qc.invalidateQueries({ queryKey: ["ai-jobs", classId] }); qc.setQueryData(["ai-job", classId, job.id], job); onCreated(job.id); },
  });
  const max = MAX_ITEMS[targetKind];
  const quotaFull = isQuotaFull(quota.data);
  const cannotGenerate = create.isPending || !lessonId || quotaFull || creditWait || creditShort;
  const retryFrom = (job: AiJobView) => { const kind: AiTargetKind = job.targetKind === "DECK" ? "STUDY_QUIZ" : job.targetKind; setTargetKind(kind); setLessonId(job.lessonId); setItemCount(Math.min(job.requestedCount, MAX_ITEMS[kind])); onRetry(); document.getElementById(`ai-form-${classId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return { quota, targetKind, setTargetKind, lessonId, setLessonId, itemCount, setItemCount, difficulty, setDifficulty, instruction, setInstruction, credit, setCredit, creditBody, creditShort, creditWait, create, max, quotaFull, cannotGenerate, retryFrom };
}


/** job: Current request, polling clock, refresh, and cancellation. */
function useAiJobState(classId: string, jobId: string) {
  const qc = useQueryClient();
  const [pollStartedAt, setPollStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const job = useQuery({ queryKey: ["ai-job", classId, jobId], queryFn: () => getAiJob(classId, jobId), refetchInterval: (query) => { const data = query.state.data as AiJobView | undefined; return data && ACTIVE_STATUSES.includes(data.status) && Date.now() - pollStartedAt < POLL_LIMIT_MS ? POLL_INTERVAL_MS : false; } });
  const data = job.data;
  const active = !!data && ACTIVE_STATUSES.includes(data.status);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  useEffect(() => { if (data && !ACTIVE_STATUSES.includes(data.status)) { qc.invalidateQueries({ queryKey: ["ai-jobs", classId] }); qc.invalidateQueries({ queryKey: ["ai-quota"] }); qc.invalidateQueries({ queryKey: ["my-credits"] }); } }, [data?.status]);
  const stillProcessing = active && now - pollStartedAt >= POLL_LIMIT_MS;
  const checkAgain = () => { setPollStartedAt(Date.now()); setNow(Date.now()); void job.refetch(); };
  const cancel = useMutation({ mutationFn: () => cancelAiJob(classId, jobId), onSuccess: (view) => { qc.setQueryData(["ai-job", classId, jobId], view); qc.invalidateQueries({ queryKey: ["ai-jobs", classId] }); qc.invalidateQueries({ queryKey: ["ai-quota"] }); qc.invalidateQueries({ queryKey: ["my-credits"] }); } });
  return { job, data, active, stillProcessing, checkAgain, cancel, pollStartedAt, now };
}


/** review: Decision progress, keep-all recovery, and draft materialization. */
function useAiReviewState(classId: string, job: AiJobView) {
  const items = job.items ?? [];
  const decided = items.filter((item) => item.decision).length;
  const kept = items.filter((item) => item.decision && item.decision.decision !== "REJECTED").length;
  const locked = !!job.materializedResourceId;
  const [dialog, setDialog] = useState(false);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  const qc = useQueryClient();
  const undecided = items.filter((item) => !item.decision);
  const [keepingAll, setKeepingAll] = useState<number | null>(null);
  const [keepAllFailure, setKeepAllFailure] = useState<{ failed: number; total: number; error: unknown } | null>(null);
  const keepAllUndecided = async () => {
    const ids = undecided.map((item) => item.id);
    if (!ids.length || keepingAll !== null) return;
    const key = ["ai-job", classId, job.id];
    setKeepingAll(ids.length); setKeepAllFailure(null);
    try {
      await qc.cancelQueries({ queryKey: key });
      const pending = new Set(ids); const at = new Date().toISOString();
      qc.setQueryData<AiJobView>(key, (current) => current && { ...current, items: (current.items ?? []).map((item) => pending.has(item.id) && !item.decision ? { ...item, decision: { decision: "ACCEPTED", editedPayload: null, reasonCode: null, at, flags: [] } } : item) });
      const results = await Promise.allSettled(ids.map((id) => decideAiItem(classId, job.id, id, { decision: "ACCEPTED" })));
      const failed = new Set(ids.filter((_, i) => results[i].status === "rejected"));
      if (failed.size) { qc.setQueryData<AiJobView>(key, (current) => current && { ...current, items: (current.items ?? []).map((item) => failed.has(item.id) ? { ...item, decision: null } : item) }); const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason; setKeepAllFailure({ failed: failed.size, total: ids.length, error: firstError }); }
    } catch (error) { setKeepAllFailure({ failed: ids.length, total: ids.length, error }); }
    finally { setKeepingAll(null); void qc.invalidateQueries({ queryKey: key }); }
  };
  const materialize = (title: string, key: string, onDone: (resource: { id: string; title: string }) => void) => materializeAiJob(classId, job.id, title.trim(), key).then((resource) => { qc.invalidateQueries({ queryKey: ["ai-job", classId, job.id] }); qc.invalidateQueries({ queryKey: ["ai-jobs", classId] }); qc.invalidateQueries({ queryKey: ["class-resources", classId] }); onDone({ id: resource.id, title: resource.title }); return resource; });
  const decideItem = async (itemId: string, body: Parameters<typeof decideAiItem>[3]) => {
    const view = await decideAiItem(classId, job.id, itemId, body);
    const fresh = view.items?.find((candidate) => candidate.id === itemId);
    qc.setQueryData<AiJobView>(["ai-job", classId, job.id], (current) => current && fresh ? { ...current, items: (current.items ?? []).map((candidate) => candidate.id === itemId ? fresh : candidate) } : view);
    qc.invalidateQueries({ queryKey: ["ai-job", classId, job.id] });
    return view;
  };
  return { items, decided, kept, locked, dialog, setDialog, created, setCreated, undecided, keepingAll, keepAllFailure, keepAllUndecided, materialize, decideItem };
}


/** quota: usage query; targetKind/lessonId/itemCount/difficulty/instruction: request inputs; set* fields: input setters. */
/** credit/setCredit/creditBody: current estimate and estimate request; creditShort/creditWait: credit gates. */
/** create: create mutation; max: kind limit; quotaFull/cannotGenerate: submit gates; retryFrom: prefill from a failed job. */
export type AiRequestFormState = ReturnType<typeof useAiRequestFormState>;
export function useAiRequestForm(classId: string, onCreated: (jobId: string) => void, onRetry: () => void): AiRequestFormState { return useAiRequestFormState(classId, onCreated, onRetry); }

/** job/data: selected job query and view; active/stillProcessing: polling state; checkAgain: restart the polling window. */
/** cancel: cancellation mutation; pollStartedAt/now: timestamps used by the progress display. */
export type AiJobState = ReturnType<typeof useAiJobState>;
export function useAiJob(classId: string, jobId: string): AiJobState { return useAiJobState(classId, jobId); }

/** items/decided/kept/undecided: review items and counts; locked: draft already exists. */
/** dialog/setDialog: confirmation visibility; created/setCreated: newly created draft notice. */
/** keepingAll/keepAllFailure/keepAllUndecided: bulk acceptance and partial failure state. */
/** decideItem: persist one decision; materialize: create the resource draft with a stable caller key. */
export type AiReviewState = ReturnType<typeof useAiReviewState>;
export function useAiReview(classId: string, job: AiJobView): AiReviewState { return useAiReviewState(classId, job); }
