import type { AiJobItem, AiJobStatus, AiJobView } from "./teacher-ai-api";

export type AiItemFilter = "ALL" | "PENDING" | "KEPT" | "EDITED" | "REJECTED";

export function decisionCounts(items: AiJobItem[]) {
  return {
    ALL: items.length,
    PENDING: items.filter((item) => !item.decision).length,
    KEPT: items.filter((item) => item.decision?.decision === "ACCEPTED").length,
    EDITED: items.filter((item) => item.decision?.decision === "EDITED").length,
    REJECTED: items.filter((item) => item.decision?.decision === "REJECTED").length,
  };
}

export function filterItems(items: AiJobItem[], filter: AiItemFilter): AiJobItem[] {
  if (filter === "ALL") return items;
  return items.filter((item) => filter === "PENDING" ? !item.decision : item.decision?.decision === (filter === "KEPT" ? "ACCEPTED" : filter));
}

export function canMaterialize(job: AiJobView, items: AiJobItem[] = job.items ?? []): boolean {
  return !job.materializedResourceId && items.every((item) => !!item.decision) && items.some((item) => item.decision?.decision !== "REJECTED" && !!item.decision);
}

export function jobStatusTone(status: AiJobStatus): "neutral" | "running" | "ready" | "done" | "failed" {
  switch (status) {
    case "PENDING": return "neutral";
    case "RUNNING": return "running";
    case "SUCCEEDED": return "ready";
    case "CANCELLED": return "done";
    case "FAILED": return "failed";
  }
}
