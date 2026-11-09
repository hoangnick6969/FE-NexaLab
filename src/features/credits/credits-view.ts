/**
 * Pure presentation rules for the credit screens (no React, no copy): which sign to show, how a job's credit state
 * reads, and whether a request can be confirmed. Node-testable (`credits-view.test.ts`).
 */
import type { CreditEstimate, CreditTransaction, JobCredits } from "./credits-api";

/** "+12", "-7", "0": always signed so a reservation and a refund read at a glance. */
export function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `-${Math.abs(value)}` : "0";
}

/** True when the teacher has fewer available credits than the estimate; the server stays the authority (402). */
export function isShort(estimate: Pick<CreditEstimate, "enabled" | "credits" | "available"> | undefined) {
  return !!estimate && estimate.enabled && estimate.available < estimate.credits;
}

/**
 * State of the confirm control: `off` (credits disabled, send nothing), `loading` (estimate not known yet, do not
 * submit), `ready` (send `confirmedCredits`), `short` (known to be insufficient).
 */
export type ConfirmState = "off" | "loading" | "ready" | "short";
export function confirmState(estimate: CreditEstimate | undefined): ConfirmState {
  if (!estimate) return "loading";
  if (!estimate.enabled) return "off";
  return isShort(estimate) ? "short" : "ready";
}

/** The value to send with a create request, or undefined when credits are off. */
export function confirmedCreditsOf(estimate: CreditEstimate | undefined): number | undefined {
  return estimate?.enabled ? estimate.credits : undefined;
}

/** One-line meaning of a job's credits, as parts the copy layer turns into text. */
export function jobCreditSummary(credits: JobCredits | null | undefined) {
  if (!credits) return null;
  if (credits.state === "reserved") return { kind: "reserved" as const, amount: credits.estimated };
  if (credits.state === "refunded") return { kind: "refunded" as const, amount: credits.refunded ?? credits.estimated };
  return { kind: "settled" as const, charged: credits.charged ?? 0, returned: credits.refunded ?? 0 };
}

/** What a history row shows as its main amount: the charge for a SETTLE, otherwise the signed effect. */
export function historyAmount(row: Pick<CreditTransaction, "kind" | "credits" | "charged">) {
  return row.kind === "SETTLE" ? { label: "charge" as const, text: String(row.charged ?? 0) } : { label: "delta" as const, text: signed(row.credits) };
}
