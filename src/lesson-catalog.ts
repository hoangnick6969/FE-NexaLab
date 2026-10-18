export type StudentLessonAssignment = {
  id: string;
  title: string;
  contentId: string;
  contentType: string;
  dueDate: string | null;
  overdue: boolean;
  classroom: { id: string; name: string };
};

export type StudentLessonCard = {
  id: string;
  subjectId: string;
  grade: number;
  title: string;
  assignments: StudentLessonAssignment[];
  [key: string]: any;
};

export function buildStudentLessonCatalog(
  sharedLessons: StudentLessonCard[],
  assignedLessons: Array<{ lesson: StudentLessonCard; assignment: StudentLessonAssignment }>,
): StudentLessonCard[] {
  const lessons = new Map(sharedLessons.map((lesson) => [lesson.id, { ...lesson, assignments: [] as StudentLessonAssignment[] }]));

  for (const { lesson, assignment } of assignedLessons) {
    const card: StudentLessonCard = lessons.get(lesson.id) ?? {
      ...lesson,
      subjectId: lesson.subjectId ?? lesson.subject?.id,
      chapter: lesson.chapter ?? lesson.topic,
      assignments: [],
    };
    if (!card.assignments.some((item) => item.id === assignment.id)) card.assignments.push(assignment);
    lessons.set(lesson.id, card);
  }

  return [...lessons.values()];
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
    (!normalizedSearch || `${lesson.title} ${lesson.chapter ?? ""} ${lesson.topic ?? ""}`.toLocaleLowerCase("vi").includes(normalizedSearch)),
  );
}
