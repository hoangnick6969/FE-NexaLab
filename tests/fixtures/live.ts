import { expect as baseExpect, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Shared helpers for live FE/API/database specs. Identities come from the
// environment (defaults: seeded accounts with SEED_PASSWORD / SEED_FIXTURE_PASSWORD).
export const expect = baseExpect.configure({ timeout: 20000 });
export const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const fixturePassword = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
const seedPassword = process.env.SEED_PASSWORD;

export type Adult = { email: string; password?: string };
export type Student = { username: string; password?: string };
export const accounts = {
  owner: { email: process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local", password: process.env.TEST_TEACHER_PASSWORD ?? fixturePassword } as Adult,
  outsiderTeacher: { email: "teacher.outsider@nexalab.local", password: fixturePassword } as Adult,
  demoTeacher: { email: "teacher@nexalab.local", password: seedPassword } as Adult,
  parent: { email: "parent@nexalab.local", password: seedPassword } as Adult,
  student: { username: process.env.TEST_STUDENT_USERNAME ?? "student.active", password: process.env.TEST_STUDENT_PASSWORD ?? fixturePassword } as Student,
  outsiderStudent: { username: "student.outsider", password: fixturePassword } as Student,
};
export const PILOT_CLASS = "class-pilot-a";
export const PILOT_CLASS_NAME = /Pilot Science 8A/;

export async function call(path: string, method = "GET", body?: unknown, token?: string) {
  const response = await fetch(api + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(method === "GET" ? {} : { "Idempotency-Key": randomUUID() }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

/** The API allows 10 logins per minute per IP; live suites log in more often than that. */
async function withLoginWindow<T extends { status: number }>(attempt: () => Promise<T>) {
  let result = await attempt();
  if (result.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 61000));
    result = await attempt();
  }
  return result;
}

export async function adultToken(account: Adult) {
  const login = await withLoginWindow(() => call("/auth/login", "POST", { email: account.email, password: account.password }));
  expect(login.status, `${account.email} login`).toBe(201);
  return login.data.accessToken as string;
}

export async function studentToken(account: Student) {
  const login = await withLoginWindow(() => call("/auth/student/login", "POST", { username: account.username, password: account.password }));
  expect(login.status, `${account.username} login`).toBe(201);
  return { token: login.data.accessToken as string, id: login.data.user?.id as string | undefined };
}

async function submitLogin(page: Page, endpoint: string) {
  const response = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith(endpoint));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  return (await response).status();
}

export async function adultLogin(browser: Browser, account: Adult, viewport?: { width: number; height: number }) {
  const page = await (await browser.newContext(viewport ? { viewport } : {})).newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password!);
  const status = await withLoginWindow(async () => ({ status: await submitLogin(page, "/api/auth/login") }));
  expect(status.status, `${account.email} UI login`).toBe(201);
  return page;
}

export async function studentLogin(browser: Browser, account: Student = accounts.student, viewport?: { width: number; height: number }) {
  const page = await (await browser.newContext(viewport ? { viewport } : {})).newPage();
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill(account.username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password!);
  const status = await withLoginWindow(async () => ({ status: await submitLogin(page, "/api/auth/student/login") }));
  expect(status.status, `${account.username} UI login`).toBe(201);
  return page;
}

/** datetime-local value in the browser's timezone. */
export const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const sampleTest = {
  questions: [
    { prompt: "Đơn vị đo điện trở là gì?", options: ["Vôn", "Ôm"], correctOption: 1, explanation: "Điện trở đo bằng ôm (Ω)" },
    { prompt: "Dụng cụ đo cường độ dòng điện?", options: ["Ampe kế", "Vôn kế"], correctOption: 0 },
  ],
};

/** Collects cleanup calls; run them in reverse from `afterAll`. */
export function cleanupList() {
  const items: Array<() => Promise<unknown>> = [];
  return {
    add: (fn: () => Promise<unknown>) => items.push(fn),
    run: async () => {
      for (const fn of items.reverse()) await fn().catch(() => undefined);
    },
  };
}

export async function publishedTest(classId: string, token: string, title: string, cleanup: ReturnType<typeof cleanupList>, publish = true) {
  const created = await call(`/classes/${classId}/resources`, "POST", { kind: "TEST", title, lessonId: "lesson-circuit", content: sampleTest }, token);
  expect(created.status, JSON.stringify(created.data)).toBe(201);
  cleanup.add(() => call(`/classes/${classId}/resources/${created.data.id}/archive`, "POST", undefined, token));
  if (publish) expect((await call(`/classes/${classId}/resources/${created.data.id}/publish`, "POST", undefined, token)).status).toBe(201);
  return created.data.id as string;
}

export async function assignTest(classId: string, token: string, testId: string, title: string, dueDate: Date, studentIds: string[], cleanup: ReturnType<typeof cleanupList>) {
  const res = await call(`/classes/${classId}/assignments`, "POST", { contentType: "test", contentId: testId, title, dueDate: dueDate.toISOString(), studentIds }, token);
  expect(res.status, JSON.stringify(res.data)).toBe(201);
  const id = res.data.assignment.id as string;
  cleanup.add(() => call(`/classes/${classId}/assignments/${id}/archive`, "POST", { reason: "Dọn dữ liệu kiểm thử", confirm: true }, token));
  return id;
}

export async function memberId(classId: string, token: string, username: string) {
  const roster = await call(`/classes/${classId}/students`, "GET", undefined, token);
  const row = roster.data?.find((e: any) => e.student.username === username && e.status === "approved");
  expect(row, `${username} is an approved member of ${classId}`).toBeTruthy();
  return { id: row.studentId as string, fullName: row.student.fullName as string };
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page has no horizontal scroll").toBeLessThanOrEqual(1);
}
