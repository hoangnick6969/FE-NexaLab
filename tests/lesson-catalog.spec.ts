import { expect, test } from "@playwright/test";
import {
  buildStudentLessonCatalog,
  filterStudentLessonCatalog,
  flattenReleasedCurriculum,
  safeEbookUrl,
  withAssignmentContext,
  type StudentLessonAssignment,
  type StudentLessonCard,
} from "../src/features/lessons/lesson-catalog";

const sharedLesson: StudentLessonCard = {
  id: "lesson-shared",
  title: "Bài 1. Năng lượng",
  subjectId: "khtn",
  subject: { id: "khtn", name: "Khoa học tự nhiên", ebookUrl: "https://books.example.test/khtn" },
  grade: 8,
  chapter: "Chương 1",
  topic: "Năng lượng",
  shared: true,
  assignments: [],
};

const assignedLesson: StudentLessonCard = {
  ...sharedLesson,
  id: "lesson-private",
  title: "Bài thực hành được giao",
  chapter: "Chương 2",
  topic: "Tế bào",
  shared: false,
};

const assignmentFor = (lesson: StudentLessonCard, id = "assignment-1"): StudentLessonAssignment => ({
  id,
  title: "Bài thực hành",
  contentId: lesson.id,
  contentType: "lesson",
  dueDate: null,
  overdue: false,
  canOpen: true,
  classroom: { id: "class-1", name: "Lớp 8A" },
});

test("merges released and assigned lessons once and keeps every assignment association", () => {
  const assignment = assignmentFor(sharedLesson);
  const secondAssignment = assignmentFor(sharedLesson, "assignment-2");
  const overlap = buildStudentLessonCatalog([sharedLesson], [sharedLesson], [assignment, secondAssignment]);

  expect(overlap).toHaveLength(1);
  expect(overlap[0].assignments.map((item) => item.id)).toEqual([assignment.id, secondAssignment.id]);
  expect(overlap[0].shared).toBe(true);
  expect(filterStudentLessonCatalog(overlap, "assigned", "all", "all", "")).toHaveLength(1);
  expect(filterStudentLessonCatalog(overlap, "shared", "all", "all", "")).toHaveLength(0);
});

test("keeps unassigned shared lessons separate and filters by subject, grade, and text", () => {
  const assignment = assignmentFor(assignedLesson);
  const catalog = buildStudentLessonCatalog([sharedLesson], [assignedLesson], [assignment]);

  expect(filterStudentLessonCatalog(catalog, "assigned", "all", "all", "").map((lesson) => lesson.id)).toEqual([assignedLesson.id]);
  expect(filterStudentLessonCatalog(catalog, "assigned", "khtn", "8", "Tế bào").map((lesson) => lesson.id)).toEqual([assignedLesson.id]);
  expect(filterStudentLessonCatalog(catalog, "shared", "all", "all", "khoa học").map((lesson) => lesson.id)).toEqual([sharedLesson.id]);
});

test("flattens released chapter and topic lessons and supplies their official subject context", () => {
  const lessons = flattenReleasedCurriculum({ subjects: [{
    id: "khtn",
    name: "Khoa học tự nhiên",
    grades: [{ grade: 8, chapters: [{ title: "Chương 1", officialOrder: 1, lessons: [{ id: sharedLesson.id, title: sharedLesson.title }], topics: [{ title: "Năng lượng", lessons: [{ id: "lesson-topic", title: "Bài theo chủ đề", chapter: "Nhãn tự do", topic: "Chủ đề tự do" }] }] }] }],
  }] });

  expect(lessons.map((lesson) => lesson.id)).toEqual([sharedLesson.id, "lesson-topic"]);
  expect(lessons[1]).toMatchObject({ subjectId: "khtn", grade: 8, chapter: "Chương 1", topic: "Năng lượng", shared: true });
});

test("ignores assignments that cannot open and handles an empty released catalog", () => {
  const closed = { ...assignmentFor(assignedLesson), canOpen: false };
  expect(buildStudentLessonCatalog([], [assignedLesson], [closed])).toEqual([]);
  expect(buildStudentLessonCatalog([], [], [])).toEqual([]);
});

test("builds assigned-only catalog cards from the enriched assignment list without detail payloads", () => {
  const assignment = {
    ...assignmentFor(assignedLesson),
    title: "Bài giao trong lớp",
    contentTitle: assignedLesson.title,
    subject: assignedLesson.subject,
    grade: assignedLesson.grade,
    chapter: assignedLesson.chapter,
    chapterOrder: 2,
    curriculumOrder: 4,
  };
  const catalog = buildStudentLessonCatalog([], [], [assignment]);

  expect(catalog).toHaveLength(1);
  expect(catalog[0]).toMatchObject({
    id: assignedLesson.id,
    title: assignedLesson.title,
    grade: 8,
    chapter: "Chương 2",
    chapterOrder: 2,
    shared: false,
    assignments: [{ id: "assignment-1" }],
  });
});

test("shares safe ebook URL and assignment context helpers", () => {
  expect(safeEbookUrl("https://books.example.test/book.pdf")).toBe("https://books.example.test/book.pdf");
  expect(safeEbookUrl("javascript:alert(1)")).toBeNull();
  expect(withAssignmentContext("/lessons/lesson-1/pathway", "assignment 1")).toBe("/lessons/lesson-1/pathway?assignmentId=assignment%201");
});
