import { commonText } from "../../i18n/common";
export type StudentLessonAssignment = {
  id: string;
  title: string;
  contentId: string;
  contentTitle?: string;
  contentType: string;
  dueDate: string | null;
  overdue: boolean;
  canOpen: boolean;
  classroom: { id: string; name: string };
  subject?: { id: string; name: string };
  grade?: number;
  chapter?: string | null;
  topic?: string | null;
  curriculumOrder?: number | null;
  chapterOrder?: number | null;
  topicOrder?: number | null;
};

export type StudentLessonCard = {
  id: string;
  title: string;
  subjectId: string;
  subject: { id: string; name: string; ebookUrl?: string | null };
  grade: number;
  chapter: string;
  topic: string;
  learningObjective?: string | null;
  chapterOrder?: number | null;
  topicOrder?: number | null;
  curriculumOrder?: number | null;
  shared: boolean;
  assignments: StudentLessonAssignment[];
};

type CatalogSubject = {
  id: string;
  name: string;
  ebookUrl?: string | null;
  grades?: Array<{
    grade: number;
    chapters?: Array<{
      title: string;
      officialOrder?: number;
      displayOrder?: number;
      lessons?: any[];
      topics?: Array<{ title: string; officialOrder?: number; lessons?: any[] }>;
    }>;
  }>;
};

export function flattenReleasedCurriculum(catalog: { subjects?: CatalogSubject[] } | null | undefined): StudentLessonCard[] {
  const lessons = new Map<string, StudentLessonCard>();
  for (const subject of catalog?.subjects ?? []) {
    for (const grade of subject.grades ?? []) {
      for (const chapter of grade.chapters ?? []) {
        const add = (lesson: any, topicTitle = "") => {
          if (!lesson?.id || lessons.has(lesson.id)) return;
          lessons.set(lesson.id, {
            ...lesson,
            subjectId: subject.id,
            subject: { id: subject.id, name: subject.name, ebookUrl: subject.ebookUrl },
            grade: grade.grade,
            // The official chapter/topic from the catalog wins over the lesson's free-text label.
            chapter: chapter.title || lesson.chapter,
            topic: topicTitle || lesson.topic,
            chapterOrder: chapter.officialOrder ?? chapter.displayOrder,
            topicOrder: lesson.topicOrder,
            curriculumOrder: lesson.curriculumOrder,
            shared: true,
            assignments: [],
          });
        };
        for (const lesson of chapter.lessons ?? []) add(lesson);
        for (const topic of chapter.topics ?? [])
          for (const lesson of topic.lessons ?? []) add(lesson, topic.title);
      }
    }
  }
  return [...lessons.values()];
}

export function buildStudentLessonCatalog(
  releasedLessons: StudentLessonCard[],
  assignedLessons: any[],
  assignments: StudentLessonAssignment[],
  archivedLessonDetails: any[] = [],
): StudentLessonCard[] {
  const eligibleAssignments = assignments.filter(
    (assignment) => assignment.contentType === "lesson" && assignment.canOpen,
  );
  const assignmentsByLesson = new Map<string, StudentLessonAssignment[]>();
  for (const assignment of eligibleAssignments) {
    const rows = assignmentsByLesson.get(assignment.contentId) ?? [];
    rows.push(assignment);
    assignmentsByLesson.set(assignment.contentId, rows);
  }

  const lessons = new Map<string, StudentLessonCard>();
  for (const lesson of releasedLessons) lessons.set(lesson.id, { ...lesson, assignments: [] });

  const attachAssignedLesson = (lesson: any) => {
    if (!lesson?.id) return;
    const associations = assignmentsByLesson.get(lesson.id);
    if (!associations?.length) return;
    const existing = lessons.get(lesson.id);
    if (existing) {
      existing.assignments = associations;
      return;
    }
    const subject = lesson.subject ?? { id: lesson.subjectId, name: commonText().subject };
    lessons.set(lesson.id, {
      ...lesson,
      subjectId: lesson.subjectId ?? subject.id,
      subject,
      grade: lesson.grade ?? 0,
      chapter: lesson.chapter ?? commonText().noChapter,
      topic: lesson.topic ?? "",
      shared: false,
      assignments: associations,
    });
  };

  for (const lesson of assignedLessons) attachAssignedLesson(lesson);
  for (const detail of archivedLessonDetails) attachAssignedLesson(detail?.content ?? detail);
  for (const assignment of eligibleAssignments) {
    if (lessons.has(assignment.contentId) || !assignment.subject || !assignment.grade) continue;
    lessons.set(assignment.contentId, {
      id: assignment.contentId,
      title: assignment.contentTitle ?? assignment.title,
      subjectId: assignment.subject.id,
      subject: assignment.subject,
      grade: assignment.grade,
      chapter: assignment.chapter ?? commonText().noChapter,
      topic: assignment.topic ?? "",
      curriculumOrder: assignment.curriculumOrder ?? assignment.topicOrder,
      chapterOrder: assignment.chapterOrder,
      topicOrder: assignment.topicOrder,
      shared: false,
      assignments: assignmentsByLesson.get(assignment.contentId) ?? [],
    });
  }
  return [...lessons.values()].sort((left, right) =>
    left.subject.name.localeCompare(right.subject.name, "vi") ||
    left.grade - right.grade ||
    (left.curriculumOrder ?? Number.MAX_SAFE_INTEGER) - (right.curriculumOrder ?? Number.MAX_SAFE_INTEGER) ||
    left.chapter.localeCompare(right.chapter, "vi") ||
    left.title.localeCompare(right.title, "vi"),
  );
}

export function filterStudentLessonCatalog(
  lessons: StudentLessonCard[],
  filter: "all" | "assigned" | "shared",
  subjectId: string,
  grade: string,
  search: string,
): StudentLessonCard[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  return lessons.filter((lesson) =>
    (filter === "all" || (filter === "assigned" ? lesson.assignments.length > 0 : lesson.assignments.length === 0)) &&
    (subjectId === "all" || lesson.subjectId === subjectId) &&
    (grade === "all" || String(lesson.grade) === grade) &&
    (!normalizedSearch || `${lesson.title} ${lesson.subject.name} ${lesson.chapter} ${lesson.topic}`.toLocaleLowerCase("vi").includes(normalizedSearch)),
  );
}

export function withAssignmentContext(path: string, assignmentId?: string) {
  return assignmentId ? `${path}${path.includes("?") ? "&" : "?"}assignmentId=${encodeURIComponent(assignmentId)}` : path;
}

export function safeEbookUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
