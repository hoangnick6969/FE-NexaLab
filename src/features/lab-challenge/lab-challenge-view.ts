/**
 * Pure presentation rules for the lab-challenge panel (no React, no copy): whether the editor may offer the action and
 * why not, how a proposal's parameters and engine results read, and which decisions are still open. Node-testable
 * (`lab-challenge-view.test.ts`). The server stays the authority for every rule here.
 */
import type { EngineResult, LabJobView, LabParamValue, LabProposalCard } from "./lab-challenge-api";

type NumberParam = { kind: "number"; label: string; unit: string; min: number; max: number; step: number };
type ChoiceParam = { kind: "choice"; label: string; options: Array<{ value: string; label: string }> };
export type ChallengeParameters = Record<string, { modelRef: string; rangeReview: string; params: Record<string, NumberParam | ChoiceParam> }>;

/** Range reviews the server offers to Teacher AI (BE `AI_OFFERED_RANGE_REVIEWS`). */
export const OFFERED_REVIEWS = ["approved", "team-lead-default"];

/** Labs whose parameter ranges may be proposed: a reviewed (or team-lead default) range and at least one parameter. */
export function offeredLabIds(parameters: ChallengeParameters | undefined): string[] {
  return Object.entries(parameters ?? {})
    .filter(([, spec]) => OFFERED_REVIEWS.includes(spec.rangeReview) && Object.keys(spec.params).length > 0)
    .map(([labId]) => labId);
}

export type Unavailable = "no_model" | "not_saved" | "not_draft" | "not_private" | "locked";
/**
 * Why the action is disabled, or null when it is offered. Order matters: a lesson that is not saved yet cannot be
 * judged on its other fields. The API repeats every one of these checks (409 LESSON_NOT_EDITABLE, AI_NO_APPROVED_MODELS).
 */
export function unavailableReason(
  edit: { id?: string | null; status?: string; scope?: string } | null | undefined,
  meta: { structureLocked?: boolean } | undefined,
  parameters: ChallengeParameters | undefined,
): Unavailable | null {
  if (!edit?.id) return "not_saved";
  if (offeredLabIds(parameters).length === 0) return "no_model";
  if (edit.scope && edit.scope !== "TEACHER_PRIVATE") return "not_private";
  if (edit.status !== "draft") return "not_draft";
  if (meta?.structureLocked) return "locked";
  return null;
}

export type ParamRow = { name: string; label: string; value: string; unit: string; bounds: string };
/** Parameters of a proposal with the label, unit and the allowed bounds of the validated range. */
export function paramRows(labId: string, params: Record<string, LabParamValue>, parameters: ChallengeParameters | undefined): ParamRow[] {
  const spec = parameters?.[labId]?.params ?? {};
  return Object.entries(params).map(([name, value]) => {
    const param = spec[name];
    if (!param) return { name, label: name, value: String(value), unit: "", bounds: "" };
    if (param.kind === "number") return { name, label: param.label, value: String(value), unit: param.unit, bounds: `${param.min}–${param.max}` };
    return { name, label: param.label, value: param.options.find((option) => option.value === value)?.label ?? String(value), unit: "", bounds: "" };
  });
}

/** "2/4": how many reference states the proposal passes, out of those the engine ran. */
export function engineSummary(results: EngineResult[]) {
  const passed = results.filter((result) => result.verdict === "passed").length;
  return { passed, total: results.length, failing: results.length - passed };
}

/** Proposals still open for a decision: not rejected, and nothing applied yet. */
export function openProposals(job: Pick<LabJobView, "appliedItemId" | "proposals">): LabProposalCard[] {
  if (job.appliedItemId) return [];
  return (job.proposals ?? []).filter((proposal) => proposal.decision?.decision !== "REJECTED");
}

export type JobPhase = "active" | "review" | "applied" | "failed" | "cancelled";
export function jobPhase(job: Pick<LabJobView, "status" | "appliedItemId">): JobPhase {
  if (job.status === "PENDING" || job.status === "RUNNING") return "active";
  if (job.status === "FAILED") return "failed";
  if (job.status === "CANCELLED") return "cancelled";
  return job.appliedItemId ? "applied" : "review";
}

/** Distinct drop reason codes of a job in first-seen order, with how many proposals each dropped. */
export function droppedSummary(dropped: Array<{ position: number; reasonCodes: string[] }>): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of dropped) for (const code of entry.reasonCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return [...counts].map(([code, count]) => ({ code, count }));
}

/** The latest proposal-job of a lesson, newest first. */
export const jobsForLesson = (jobs: LabJobView[], lessonId: string) => jobs.filter((job) => job.lessonId === lessonId);
