export type RelatedLesson = { lessonId: string; title: string; topicCode?: string | null };
export type LessonLab = { labId: string; title: string; objective?: string; releaseId: string; version: number };

// Presentation placement verified against this published content-pack version.
// A new lesson version must supply its own placement; never guess a section from its title.
const circuitB22Placement = {
  lessonId: "pack-structured-38f03d31878e58fc0d8a31b8c8aa9fab4af866f7-v1",
  labId: "circuit",
  sectionId: "section-sgk-khtn8-nxbgd-2026-p0093-b0011-c295fcf1",
};

export function lessonLabSection(lessonId: string, labId: string): string | undefined {
  return lessonId === circuitB22Placement.lessonId && labId === circuitB22Placement.labId ? circuitB22Placement.sectionId : undefined;
}

export function lessonLabHref(lab: LessonLab, lessonId: string, assignmentId?: string, sectionId?: string) {
  const query = new URLSearchParams({ releaseId: lab.releaseId, lessonId });
  if (assignmentId) query.set("lessonAssignmentId", assignmentId);
  if (sectionId) query.set("sectionId", sectionId);
  return `/labs/${encodeURIComponent(lab.labId)}?${query}`;
}

export function relatedLessonHref(lessonId: string, tab: "reading" | "labs" = "labs", assignmentId?: string, sectionId?: string) {
  const query = new URLSearchParams({ tab });
  if (assignmentId) query.set("assignmentId", assignmentId);
  return `/lessons/${encodeURIComponent(lessonId)}?${query}${sectionId ? `#${encodeURIComponent(sectionId)}` : ""}`;
}
import "./lesson-lab-navigation.css";

