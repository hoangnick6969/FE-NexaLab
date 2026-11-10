import { expect as baseExpect, test, type Page } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20000 });

// TAI-T5 Teacher AI workspace journey against a real FE/API/database. The API must run with AI_PROVIDER=fake
// (never in production) on an isolated, seeded database; set TEST_AI_FAKE=1 to opt in. Identities:
//   TEST_WEB, TEST_API, TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD (default teacher.owner with SEED_FIXTURE_PASSWORD),
//   TEST_STUDENT_USERNAME/TEST_STUDENT_PASSWORD (default student.active with SEED_FIXTURE_PASSWORD), TEST_AI_CLASS (class-pilot-a).
const enabled = process.env.TEST_AI_FAKE === "1";
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const classId = process.env.TEST_AI_CLASS ?? "class-pilot-a";
const teacherEmail = process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local";
const teacherPassword = process.env.TEST_TEACHER_PASSWORD ?? process.env.SEED_FIXTURE_PASSWORD;
const studentUsername = process.env.TEST_STUDENT_USERNAME ?? "student.active";
const studentPassword = process.env.TEST_STUDENT_PASSWORD ?? process.env.SEED_FIXTURE_PASSWORD;

test.skip(!enabled, "Set TEST_AI_FAKE=1 with an API running AI_PROVIDER=fake on an isolated seeded database");

async function teacherLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(teacherPassword!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function openAiTab(page: Page) {
  await page.goto(`/classes/${classId}?tab=resources`);
  await page.getByRole("tab", { name: "Soạn nháp bằng AI" }).click();
  await expect(page.getByRole("heading", { name: "Soạn nháp bằng AI" })).toBeVisible();
}

async function generate(page: Page, count: number) {
  await page.getByLabel("Loại nội dung").last().selectOption("TEST");
  const lesson = page.getByLabel("Bài học làm căn cứ");
  const circuit = await lesson.locator("option", { hasText: /mạch|circuit/i }).first().getAttribute("value");
  await lesson.selectOption(circuit ?? { index: 1 });
  await page.getByLabel(/Số mục/).fill(String(count));
  await expect(page.getByText(/Đã dùng \d+\/\d+ lượt/)).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp bằng AI" }).click();
  await expect(page.getByText("Sẵn sàng duyệt").first()).toBeVisible({ timeout: 30000 });
}

test("teacher generates, reviews with a reload, and materializes a draft students cannot see", async ({ page, browser }) => {
  await teacherLogin(page);
  await openAiTab(page);
  await generate(page, 3);

  const items = page.locator(".teacher-ai-item");
  await expect(items).toHaveCount(3);
  await expect(page.getByText("Đã quyết định 0/3 mục")).toBeVisible();

  await items.nth(0).getByRole("button", { name: "Giữ" }).click();
  await expect(page.getByText("Đã quyết định 1/3 mục")).toBeVisible();

  // Decisions are server state: a reload keeps the open job and its decisions.
  await page.reload();
  await expect(page.getByText("Đã quyết định 1/3 mục")).toBeVisible();

  await items.nth(1).getByRole("button", { name: "Sửa" }).click();
  await items.nth(1).getByLabel("Câu hỏi").fill("Dụng cụ nào dùng để đo cường độ dòng điện?");
  await items.nth(1).getByRole("button", { name: "Lưu bản sửa" }).click();
  await expect(items.nth(1).getByText("Đã sửa")).toBeVisible();

  await items.nth(2).getByRole("button", { name: "Bỏ" }).click();
  await items.nth(2).getByRole("button", { name: "Xác nhận bỏ" }).click();
  await expect(page.getByText("Đã quyết định 3/3 mục")).toBeVisible();

  await page.getByRole("button", { name: "Tạo bản nháp tài nguyên" }).click();
  const title = "AI draft " + Date.now().toString(36);
  await page.getByLabel("Tên tài nguyên").last().fill(title);
  await page.getByRole("button", { name: "Tạo bản nháp", exact: true }).click();
  await expect(page.getByText(`Đã tạo bản nháp “${title}”`)).toBeVisible();
  const row = page.locator(".class-resource-row", { hasText: title });
  await expect(row.getByText("Bản nháp")).toBeVisible();

  // No student route renders AI data, and the DRAFT is invisible before publishing.
  const student = await browser.newPage();
  await student.goto("/login");
  await student.getByLabel("Tên đăng nhập học sinh", { exact: true }).fill(studentUsername);
  await student.getByLabel("Mật khẩu", { exact: true }).fill(studentPassword!);
  await student.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(student).not.toHaveURL(/\/login/);
  await student.goto(`/classes/${classId}`);
  await expect(student.getByText(title)).toHaveCount(0);
  await expect(student.getByText("Soạn nháp bằng AI")).toHaveCount(0);
  const tokenCheck = await fetch(`${api}/classes/${classId}/ai-jobs`);
  expect(tokenCheck.status).toBe(401);
  await student.close();
});

test("duplicate warnings stay accept-able", async ({ page }) => {
  await teacherLogin(page);
  await openAiTab(page);
  await generate(page, 2);
  const flagged = page.locator(".teacher-ai-item", { has: page.locator(".badge", { hasText: /Trùng|Gần giống/ }) }).first();
  test.skip((await flagged.count()) === 0, "The fake provider produced no duplicate in this database");
  await expect(flagged.getByText("Đây chỉ là cảnh báo; thầy cô vẫn có thể giữ mục này.")).toBeVisible();
  await flagged.getByRole("button", { name: "Giữ" }).click();
  await expect(flagged.locator(".badge", { hasText: "Giữ" })).toBeVisible();
});
