import { expect as baseExpect, test, type APIRequestContext, type Page } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20000 });

// TAI6-T4 teacher lab-challenge journey against a real FE/API/database. WRITTEN, NOT RUN: it needs an isolated seeded
// database with the TAI-06 migration applied and an API started with AI_PROVIDER=fake AI_RUNNER_ENABLED=true (never in
// production); set TEST_AI_LAB=1. Identities: TEST_WEB, TEST_API, TEST_TEACHER_EMAIL/PASSWORD (default teacher.owner, owns
// class-pilot-a), TEST_OUTSIDER_EMAIL (default teacher.outsider), TEST_STUDENT_USERNAME (default nguyenan.8a, SEED_PASSWORD).
const enabled = process.env.TEST_AI_LAB === "1";
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const fixturePassword = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
const teacher = { email: process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local", password: process.env.TEST_TEACHER_PASSWORD ?? fixturePassword };
const student = { username: process.env.TEST_STUDENT_USERNAME ?? "nguyenan.8a", password: process.env.TEST_STUDENT_PASSWORD ?? process.env.SEED_PASSWORD };

test.skip(!enabled, "Set TEST_AI_LAB=1 with an API running AI_PROVIDER=fake AI_RUNNER_ENABLED=true on an isolated seeded database");

async function token(request: APIRequestContext, who: { email: string; password?: string }) {
  const res = await request.post(`${api}/auth/login`, { data: { email: who.email, password: who.password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

/** A draft private lesson for the signed-in teacher, created through the existing lesson route. */
async function draftLesson(request: APIRequestContext, title: string, status: "draft" | "published" = "draft") {
  const bearer = await token(request, teacher);
  const headers = { authorization: `Bearer ${bearer}` };
  const subjects = await (await request.get(`${api}/subjects`, { headers })).json();
  const res = await request.post(`${api}/lessons`, {
    headers,
    data: {
      title, subjectId: subjects[0].id, chapter: "Điện", grade: 8, topic: "Dòng điện", learningObjective: "Mô tả mạch điện đơn giản",
      prerequisites: "Không", curriculum: "KHTN 8", content: "<p>Dòng điện là dòng các hạt mang điện dịch chuyển có hướng.</p>", status,
      materials: [], questions: [], outcomeCodes: [],
      ...(status === "published" ? { review: { sources: "Tự biên soạn", license: "ORIGINAL", outcome: "Mô tả mạch điện", answerKeyChecked: true, safetyChecked: true, accessibilityChecked: true } } : {}),
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id as string;
}

async function loginTeacher(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(teacher.password!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function openEditor(page: Page, title: string) {
  await page.goto("/lessons");
  const card = page.locator("article, li, .lesson-card", { hasText: title }).first();
  await card.getByRole("button", { name: "Chỉnh sửa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("request, review engine results, apply, and the teacher preview shows the deterministic objective", async ({ page, request }) => {
  const title = `AI lab ${Date.now().toString(36)}`;
  await draftLesson(request, title);
  await loginTeacher(page);
  await openEditor(page, title);

  await page.getByRole("button", { name: "Gợi ý thử thách bằng AI" }).click();
  await expect(page.getByText("Chỉ ghi yêu cầu chuyên môn", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Nhờ AI gợi ý" }).click();
  await expect(page.getByText(/gợi ý hợp lệ/).first()).toBeVisible({ timeout: 30000 });

  // Every card shows the lab, the parameters with bounds, the deterministic objective, the engine result and the teacher-only rationale.
  const cards = page.locator(".lab-challenge-card");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  await expect(cards.first().getByTestId("lab-objective")).not.toBeEmpty();
  await expect(cards.first().getByText(/Đạt \d+\/\d+ trạng thái tham chiếu/)).toBeVisible();
  await expect(cards.first().getByText("chỉ giáo viên thấy")).toBeVisible();
  const objective = (await cards.first().getByTestId("lab-objective").innerText()).trim();
  const rationale = (await cards.first().getByTestId("lab-rationale").innerText()).trim();

  // Reject the last proposal when there is more than one, then apply the first.
  if ((await cards.count()) > 1) {
    await cards.last().getByRole("button", { name: "Bỏ gợi ý" }).click();
    await expect(cards.last().getByText("Đã bỏ")).toBeVisible();
  }
  await cards.first().getByRole("button", { name: "Áp dụng vào bài học" }).click();
  await expect(page.getByTestId("lab-challenge-applied")).toContainText(objective);

  // The editor holds the applied lab and parameters; the existing preview shows the deterministic objective.
  await page.getByRole("button", { name: "Xem trước bài học" }).click();
  await expect(page.getByRole("dialog", { name: /Xem trước/ })).toContainText(objective);

  // The AI rationale reaches no student-facing surface: sign in as the student and read the lesson hub.
  const studentLogin = await request.post(`${api}/auth/student/login`, { data: { username: student.username, password: student.password } });
  expect(studentLogin.ok()).toBeTruthy();
  const studentToken = (await studentLogin.json()).accessToken as string;
  for (const path of ["/lessons", "/assignments"]) {
    const res = await request.get(`${api}${path}`, { headers: { authorization: `Bearer ${studentToken}` } });
    expect(await res.text()).not.toContain(rationale);
  }
});

test("a published private lesson shows the disabled-state copy and no request form", async ({ page, request }) => {
  const title = `AI lab published ${Date.now().toString(36)}`;
  await draftLesson(request, title, "published");
  await loginTeacher(page);
  await openEditor(page, title);
  await expect(page.getByTestId("lab-challenge-disabled")).toContainText("Chỉ bản nháp riêng");
  await expect(page.getByRole("button", { name: "Gợi ý thử thách bằng AI" })).toHaveCount(0);
});
