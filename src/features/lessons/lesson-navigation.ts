export function lessonActivityHref(lessonId: string, stepType: string, assignmentId?: string) {
  const tab = stepType === "READING" ? "reading" : stepType === "VIDEO" ? "video" : stepType === "BASIC_EXERCISE" ? "exercise" : null;
  if (!tab) return null;
  const query = new URLSearchParams({ tab });
  if (assignmentId) query.set("assignmentId", assignmentId);
  return `/lessons/${encodeURIComponent(lessonId)}?${query}`;
}

export function lessonReviewHref(lessonId: string) {
  return `/lessons/${encodeURIComponent(lessonId)}`;
}

export function chapterLessonHref(targetId: string, currentId: string, assignmentId?: string) {
  return lessonActivityHref(targetId, "READING", targetId === currentId ? assignmentId : undefined) ?? lessonReviewHref(targetId);
}
