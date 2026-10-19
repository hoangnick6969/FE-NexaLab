import { test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { accounts, adultLogin, adultToken, call, expect } from "./fixtures/live";

// B2 support board on real dependencies. The run builds its own evidence through
// the API (isolated class, provisioned student, lesson with a known quiz key,
// two failed quiz attempts and an expired due date) and archives the class afterwards.
const prefix = "pw-b2-" + Date.now().toString(36);
const studentPassword = "PwB2-Student-Password-2026!";
let cleanup: (() => Promise<unknown>) | null = null;

test.afterAll(async () => {
  await cleanup?.().catch(() => undefined);
});

test("B2 teacher board reaches neutral flags and exact evidence on mobile", async ({ browser }) => {
  test.skip(!accounts.owner.password, "Set SEED_FIXTURE_PASSWORD (or TEST_TEACHER_PASSWORD)");
  test.setTimeout(150000);
  const token = await adultToken(accounts.owner);
  const lesson = await call("/lessons", "POST", {
    title: `${prefix} Mạch điện`,
    subjectId: "physics",
    chapter: "Điện học",
    grade: 8,
    topic: "Mạch điện kín",
    learningObjective: "Lắp mạch kín an toàn cho LED",
    prerequisites: "Không",
    curriculum: "KHTN 8",
    content: "<p>Dòng điện chạy trong mạch kín.</p>",
    labId: "circuit",
    status: "published",
    materials: [],
    review: { sources: "Tài liệu kiểm thử B2 tự biên soạn", license: "ORIGINAL", outcome: "KHTN8 – Điện: mạch kín", answerKeyChecked: true, safetyChecked: true, accessibilityChecked: true },
    questions: [
      { prompt: `${prefix} Tăng điện trở thì dòng điện?`, options: ["Giảm", "Tăng"], answer: 0 },
      { prompt: `${prefix} LED cần mạch gì để sáng?`, options: ["Hở", "Kín"], answer: 1 },
    ],
  }, token);
  expect(lesson.status, JSON.stringify(lesson.data)).toBe(201);
  const className = `${prefix} B2`;
  const klass = await call("/classes", "POST", { name: className, grade: 8 }, token);
  expect(klass.status).toBe(201);
  const classId = klass.data.class.id as string;
  cleanup = () => call(`/classes/${classId}/archive`, "POST", { confirm: true }, token);

  const made = await call(`/classes/${classId}/students`, "POST", { username: `${prefix}-hs`, fullName: "Học sinh B2", grade: 8, consent: true }, token);
  expect(made.status, JSON.stringify(made.data)).toBe(201);
  const temporary = made.data.credentials.temporaryPassword as string;
  const first = await call("/auth/student/login", "POST", { username: `${prefix}-hs`, password: temporary });
  await call("/auth/password", "POST", { currentPassword: temporary, password: studentPassword }, first.data.accessToken);
  const studentLogin = await call("/auth/student/login", "POST", { username: `${prefix}-hs`, password: studentPassword });
  expect(studentLogin.status).toBe(201);
  const studentToken = studentLogin.data.accessToken as string;

  const due = new Date(Date.now() + 20000);
  const assigned = await call(`/classes/${classId}/assignments`, "POST", { contentType: "lesson", contentId: lesson.data.id, dueDate: due.toISOString(), studentIds: [made.data.user.id] }, token);
  expect(assigned.status, JSON.stringify(assigned.data)).toBe(201);

  // Reading and video unlock the quiz; two wrong answers sets are the evidence for the flag.
  const pathway = await call(`/lessons/${lesson.data.id}/pathway`, "GET", undefined, studentToken);
  for (const step of pathway.data.steps) {
    if (step.type === "READING") await call(`/lessons/${lesson.data.id}/steps/${step.id}/progress`, "PUT", { action: "complete" }, studentToken);
    if (step.type === "VIDEO") await call(`/lessons/${lesson.data.id}/steps/${step.id}/progress`, "PUT", { action: "complete-fallback" }, studentToken);
  }
  const quiz = await call(`/lessons/${lesson.data.id}/quiz`, "GET", undefined, studentToken);
  expect(quiz.status, JSON.stringify(quiz.data)).toBe(200);
  const wrongText: Record<string, string> = { "Tăng điện trở": "Tăng", "LED cần mạch": "Hở" };
  const wrong = quiz.data.questions.map((question: any) => {
    const text = Object.entries(wrongText).find(([prompt]) => question.prompt.includes(prompt))![1];
    return { questionId: question.id, optionId: question.options.find((option: any) => option.text === text).id };
  });
  for (let i = 0; i < 2; i++) {
    const attempt = await call(`/lessons/${lesson.data.id}/quiz-attempts`, "POST", { answers: wrong, idempotencyKey: randomUUID() }, studentToken);
    expect(attempt.status, JSON.stringify(attempt.data)).toBe(201);
    expect(attempt.data.attempt.passed).toBe(false);
  }
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, due.getTime() - Date.now() + 2000)));

  const page = await adultLogin(browser, accounts.owner, { width: 390, height: 844 });
  await page.goto("/classes");
  await page.getByRole("button", { name: new RegExp(className) }).click();
  await expect(page.getByRole("heading", { name: "Theo dõi và hỗ trợ học sinh" })).toBeVisible();
  await expect(page.getByText("Học sinh B2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Bài đã quá hạn và chưa hoàn thành/)).toBeVisible();
  await expect(page.getByText(/ít nhất hai lần làm bài kiểm tra chưa đạt/)).toBeVisible();
  await page.getByRole("button", { name: "Xem bằng chứng" }).click();
  await expect(page.getByText(/2 lần kiểm tra/)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
