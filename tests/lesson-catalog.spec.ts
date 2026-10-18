import { expect, test } from "@playwright/test";
import { buildStudentLessonCatalog, filterStudentLessonCatalog, type StudentLessonCard, type StudentLessonAssignment } from "../src/lesson-catalog";

const sharedLesson: StudentLessonCard = {
  id: "lesson-shared",
  subjectId: "khtn",
  grade: 8,
  title: "Bài 1. Năng lượng",
  chapter: "Chương 1",
  assignments: [],
};

const assignedLesson: StudentLessonCard = {
  id: "lesson-private",
  subjectId: "khtn",
  grade: 8,
  title: "Bài thực hành được giao",
  chapter: "Chương 2",
  assignments: [],
};

const assignmentFor = (lesson: StudentLessonCard, id = "assignment-1"): StudentLessonAssignment => ({
  id,
  title: "Bài thực hành",
  contentId: lesson.id,
  contentType: "lesson",
  dueDate: null,
  overdue: false,
  classroom: { id: "class-1", name: "Lớp 8A" },
});

test("merges shared and assigned lessons once and keeps the assignment association", () => {
  const assignment = assignmentFor(sharedLesson);
  const secondAssignment = assignmentFor(sharedLesson, "assignment-2");
  const overlap = buildStudentLessonCatalog([sharedLesson], [
    { lesson: sharedLesson, assignment },
    { lesson: sharedLesson, assignment: secondAssignment },
  ]);

  expect(overlap).toHaveLength(1);
  expect(overlap[0].assignments.map((item) => item.id)).toEqual([assignment.id, secondAssignment.id]);
  expect(filterStudentLessonCatalog(overlap, "assigned", "all", "all", "")).toHaveLength(1);
  expect(filterStudentLessonCatalog(overlap, "shared", "all", "all", "")).toHaveLength(0);
});

test("keeps unassigned shared lessons separate from assigned lessons", () => {
  const assignment = assignmentFor(assignedLesson);
  const assignmentApiLesson = {
    ...assignedLesson,
    subjectId: undefined,
    subject: { id: assignedLesson.subjectId, name: "Khoa học tự nhiên" },
    chapter: undefined,
    topic: "Tế bào",
  } as unknown as StudentLessonCard;
  const catalog = buildStudentLessonCatalog([sharedLesson], [{ lesson: assignmentApiLesson, assignment }]);

  expect(filterStudentLessonCatalog(catalog, "assigned", "all", "all", "").map((lesson) => lesson.id)).toEqual([assignedLesson.id]);
  expect(filterStudentLessonCatalog(catalog, "assigned", "khtn", "8", "Tế bào").map((lesson) => lesson.id)).toEqual([assignedLesson.id]);
  expect(catalog.find((lesson) => lesson.id === assignedLesson.id)?.chapter).toBe("Tế bào");
  expect(filterStudentLessonCatalog(catalog, "shared", "all", "all", "").map((lesson) => lesson.id)).toEqual([sharedLesson.id]);
});

test("supports an empty assigned list and an empty released catalog", () => {
  expect(filterStudentLessonCatalog(buildStudentLessonCatalog([sharedLesson], []), "assigned", "all", "all", "")).toEqual([]);
  expect(buildStudentLessonCatalog([], [])).toEqual([]);
});
