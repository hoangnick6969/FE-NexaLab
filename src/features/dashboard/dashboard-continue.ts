import { lessonActivityHref, lessonReviewHref } from "../lessons/lesson-navigation.ts";

type AssignmentCandidate = {
  id: string;
  canOpen?: boolean;
  contentType?: string;
  testStatus?: { status: string } | null;
};
type AssignmentCompletion = { assignmentId: string; completed: boolean };
type LessonSummary = { id: string; title: string; subjectName: string };
type ProgressRow = { contentId: string; status: string; updatedAt: string };
export type OpenCurriculumSubject = {
  name: string;
  grades?: Array<{ chapters?: Array<{
    lessons?: Array<{ id: string; title: string }>;
    topics?: Array<{ lessons?: Array<{ id: string; title: string }> }>;
  }> }>;
};

export function selectAssignedWork<T extends AssignmentCandidate>(queue: T[], completion: AssignmentCompletion[]): T | undefined {
  const completed = new Set(completion.filter((item) => item.completed).map((item) => item.assignmentId));
  return queue.find((item) => item.canOpen !== false && !completed.has(item.id)
    && !(item.contentType === "test" && ["SUBMITTED", "LATE_REVIEW_PENDING"].includes(item.testStatus?.status ?? "")));
}

export function selectOpenResume(progress: ProgressRow[], subjects: OpenCurriculumSubject[]) {
  const lessons = new Map<string, LessonSummary>();
  for (const subject of subjects) for (const grade of subject.grades ?? []) for (const chapter of grade.chapters ?? []) {
    for (const lesson of [...(chapter.lessons ?? []), ...(chapter.topics ?? []).flatMap((topic) => topic.lessons ?? [])]) {
      lessons.set(lesson.id, { ...lesson, subjectName: subject.name });
    }
  }
  let latest: { lesson: LessonSummary; updatedAt: number } | undefined;
  for (const row of progress) {
    const lesson = lessons.get(row.contentId);
    const updatedAt = Date.parse(row.updatedAt);
    if (row.status === "in_progress" && lesson && Number.isFinite(updatedAt) && (!latest || updatedAt > latest.updatedAt)) {
      latest = { lesson, updatedAt };
    }
  }
  return latest?.lesson;
}


export function nextOpenActivity<T extends { position: number; state: string; type: string }>(steps: T[]): T | undefined {
  const ordered = steps.filter((step) => ["READING", "VIDEO", "BASIC_EXERCISE"].includes(step.type))
    .sort((a, b) => a.position - b.position);
  return ordered.find((step) => step.state === "IN_PROGRESS")
    ?? ordered.find((step) => step.state !== "COMPLETED" && step.state !== "LOCKED");
}

export function openResumeAction<T extends { position: number; state: string; type: string }>(lessonId: string, steps: T[]) {
  const step = nextOpenActivity(steps);
  const activityHref = step ? lessonActivityHref(lessonId, step.type) : null;
  return activityHref ? { href: activityHref, step, review: false } : { href: lessonReviewHref(lessonId), step: undefined, review: true };
}
