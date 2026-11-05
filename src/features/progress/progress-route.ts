export type ProgressTab = "all" | "courses" | "assignments" | "history";

export function progressTab(search: URLSearchParams): ProgressTab {
  if (search.get("attemptId")) return "history";
  const tab = search.get("tab");
  return tab === "courses" || tab === "assignments" || tab === "history" ? tab : "all";
}

export function withoutAttempt(search: URLSearchParams) {
  const next = new URLSearchParams(search);
  if (search.get("attemptId")) next.set("tab", "history");
  next.delete("attemptId");
  next.delete("attemptKind");
  return next;
}

export function withProgressTab(search: URLSearchParams, tab: ProgressTab) {
  const next = withoutAttempt(search);
  if (tab === "all") next.delete("tab");
  else next.set("tab", tab);
  return next;
}

export function withAttempt(search: URLSearchParams, id: string, kind: "quiz" | "practical") {
  const next = new URLSearchParams(search);
  next.set("tab", "history");
  next.set("attemptId", id);
  if (kind === "quiz") next.set("attemptKind", kind);
  else next.delete("attemptKind");
  return next;
}
