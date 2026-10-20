import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const api = process.env.TEST_API ?? "http://127.0.0.1:4100/api";
const teacherEmail = process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local";
const teacherPassword = process.env.TEST_TEACHER_PASSWORD ?? process.env.SEED_FIXTURE_PASSWORD;
const studentUsername = process.env.TEST_STUDENT_USERNAME ?? "student.active";
const studentPassword = process.env.TEST_STUDENT_PASSWORD ?? process.env.SEED_FIXTURE_PASSWORD;
const outsiderUsername = process.env.TEST_OUTSIDER_USERNAME ?? "student.outsider";
let cleanupResources: (() => Promise<void>) | null = null;

test.afterEach(async () => {
  await cleanupResources?.();
  cleanupResources = null;
});

async function call(path: string, method = "GET", body?: unknown, token?: string, key?: string) {
  const response = await fetch(api + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { "Idempotency-Key": key } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test("I2: author, import, publish, share, practice unscored and protect test answers", async () => {
  test.skip(!teacherPassword || !studentPassword, "Set TEST_TEACHER_PASSWORD/TEST_STUDENT_PASSWORD or SEED_FIXTURE_PASSWORD");
  const teacherLogin = await call("/auth/login", "POST", { email: teacherEmail, password: teacherPassword });
  expect(teacherLogin.status).toBe(201);
  const studentLogin = await call("/auth/student/login", "POST", { username: studentUsername, password: studentPassword });
  expect(studentLogin.status).toBe(201);
  const outsiderLogin = await call("/auth/student/login", "POST", { username: outsiderUsername, password: studentPassword });
  expect(outsiderLogin.status).toBe(201);
  const teacherToken = teacherLogin.body.accessToken as string;
  const studentToken = studentLogin.body.accessToken as string;
  const outsiderToken = outsiderLogin.body.accessToken as string;
  const prefix = `pw-i2-${Date.now().toString(36)}`;
  const teacherClasses = await call("/classes?status=ACTIVE", "GET", undefined, teacherToken);
  const classroom = teacherClasses.body.find((item: any) => item.id === "class-pilot-a");
  expect(classroom, "seed class-pilot-a for teacher.owner").toBeTruthy();
  const classId = classroom.id as string;
  cleanupResources = async () => {
    const resources = await call(`/classes/${classId}/resources`, "GET", undefined, teacherToken);
    for (const resource of resources.body ?? []) {
      if (resource.title.startsWith(prefix) && resource.status !== "ARCHIVED") {
        await call(`/classes/${classId}/resources/${resource.id}/archive`, "POST", {}, teacherToken);
      }
    }
  };

  const deck = await call(`/classes/${classId}/resources`, "POST", { kind: "DECK", title: `${prefix} deck`, lessonId: "lesson-circuit", content: { cards: [{ front: "Mặt trước", back: "Mặt sau" }] } }, teacherToken, randomUUID());
  expect(deck.status).toBe(201);
  expect(deck.body.status).toBe("DRAFT");
  expect((await call(`/classes/${classId}/resources/${deck.body.id}/publish`, "POST", {}, teacherToken)).status).toBe(201);

  const quiz = await call(`/classes/${classId}/resources`, "POST", { kind: "STUDY_QUIZ", title: `${prefix} quiz`, lessonId: "lesson-circuit", content: { questions: [{ prompt: "Câu luyện tập?", options: ["A", "B"] }] } }, teacherToken, randomUUID());
  expect(quiz.status).toBe(201);
  expect((await call(`/classes/${classId}/resources/${quiz.body.id}/publish`, "POST", {}, teacherToken)).status).toBe(201);

  const authoredTest = await call(`/classes/${classId}/resources`, "POST", { kind: "TEST", title: `${prefix} test`, lessonId: "lesson-circuit", content: { questions: [{ prompt: "Câu kiểm tra?", options: ["A", "B"], correctOption: 1 }] } }, teacherToken, randomUUID());
  expect(authoredTest.status).toBe(201);
  expect((await call(`/classes/${classId}/resources/${authoredTest.body.id}/publish`, "POST", {}, teacherToken)).status).toBe(201);
  expect(authoredTest.body.status).toBe("DRAFT"); // Publishing to Class Space does not create an assignment.

  const studentList = await call(`/classes/${classId}/resources`, "GET", undefined, studentToken);
  expect(studentList.status).toBe(200);
  expect(studentList.body.map((item: any) => item.id)).toEqual(expect.arrayContaining([deck.body.id, quiz.body.id, authoredTest.body.id]));
  const studentTest = await call(`/classes/${classId}/resources/${authoredTest.body.id}`, "GET", undefined, studentToken);
  expect(studentTest.status).toBe(200);
  expect(studentTest.body.content).toBeNull();
  expect(JSON.stringify(studentTest.body)).not.toContain("correctOption");
  const studentQuiz = await call(`/classes/${classId}/resources/${quiz.body.id}`, "GET", undefined, studentToken);
  expect(studentQuiz.body.content.questions[0]).not.toHaveProperty("correctOption");
  const practice = await call(`/classes/${classId}/resources/${deck.body.id}/practice`, "PUT", { state: { revealed: { card1: true } } }, studentToken);
  expect(practice.status).toBe(200);
  expect(practice.body.scored).toBe(false);
  expect((await call(`/classes/${classId}/resources/${authoredTest.body.id}/practice`, "PUT", { state: { answers: {} } }, studentToken)).status).toBe(403);
  expect((await call(`/classes/${classId}/resources`, "GET", undefined, outsiderToken)).status).toBe(403);
  expect((await call(`/classes/${classId}/resources/${deck.body.id}`, "GET", undefined, outsiderToken)).status).toBe(403);

  const preview = await call(`/classes/${classId}/resources/import/preview`, "POST", { kind: "DECK", filename: "cards.csv", csv: "front,back\nFront,Back" }, teacherToken);
  expect(preview.status).toBe(201);
  expect(preview.body).toMatchObject({ valid: true, itemCount: 1 });
  const imported = await call(`/classes/${classId}/resources/import`, "POST", { kind: "DECK", title: `${prefix} imported`, lessonId: "lesson-circuit", filename: "cards.csv", csv: "front,back\nFront,Back" }, teacherToken, randomUUID());
  expect(imported.status).toBe(201);
  expect(imported.body).toMatchObject({ imported: true, published: false, resource: { status: "DRAFT" } });
  const badPreview = await call(`/classes/${classId}/resources/import/preview`, "POST", { kind: "DECK", filename: "cards.csv", csv: "front,back\nFront,Back\nMissing," }, teacherToken);
  expect(badPreview.status).toBe(201);
  expect(badPreview.body).toMatchObject({ valid: false, itemCount: 0 });
  const rejectedImport = await call(`/classes/${classId}/resources/import`, "POST", { kind: "DECK", title: `${prefix} invalid`, lessonId: "lesson-circuit", filename: "cards.csv", csv: "front,back\nFront,Back\nMissing," }, teacherToken, randomUUID());
  expect(rejectedImport.status).toBe(400);
  const afterInvalid = await call(`/classes/${classId}/resources`, "GET", undefined, teacherToken);
  expect(afterInvalid.body.some((item: any) => item.title === `${prefix} invalid`)).toBe(false);
  const assignments = await call(`/classes/${classId}/assignments`, "GET", undefined, teacherToken);
  expect(assignments.body.some((item: any) => item.title === `${prefix} test`)).toBe(false);
});
