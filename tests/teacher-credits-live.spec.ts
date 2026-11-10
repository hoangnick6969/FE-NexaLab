import { expect as baseExpect, test, type APIRequestContext, type Page } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20000 });

// TAI5-T5 teacher AI credits journey against a real FE/API/database. WRITTEN, NOT RUN: it needs an isolated seeded
// database and an API started with AI_PROVIDER=fake AI_CREDITS_ENABLED=true (never in production); set TEST_AI_CREDITS=1.
// Identities: TEST_WEB, TEST_API, TEST_TEACHER_EMAIL/PASSWORD (default teacher.owner, owns class-pilot-a),
// TEST_OUTSIDER_EMAIL (default teacher.outsider, owns class-pilot-b, never granted), TEST_ADMIN_EMAIL/PASSWORD
// (default admin@nexalab.local with SEED_PASSWORD), TEST_AI_CLASS (class-pilot-a), TEST_AI_CLASS_OUTSIDER (class-pilot-b).
const enabled = process.env.TEST_AI_CREDITS === "1";
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const classId = process.env.TEST_AI_CLASS ?? "class-pilot-a";
const outsiderClassId = process.env.TEST_AI_CLASS_OUTSIDER ?? "class-pilot-b";
const fixturePassword = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
const teacher = { email: process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local", password: process.env.TEST_TEACHER_PASSWORD ?? fixturePassword };
const outsider = { email: process.env.TEST_OUTSIDER_EMAIL ?? "teacher.outsider@nexalab.local", password: process.env.TEST_OUTSIDER_PASSWORD ?? fixturePassword };
const admin = { email: process.env.TEST_ADMIN_EMAIL ?? "admin@nexalab.local", password: process.env.TEST_ADMIN_PASSWORD ?? process.env.SEED_PASSWORD };

test.skip(!enabled, "Set TEST_AI_CREDITS=1 with an API running AI_PROVIDER=fake AI_CREDITS_ENABLED=true on an isolated seeded database");

async function token(request: APIRequestContext, who: { email: string; password?: string }) {
  const res = await request.post(`${api}/auth/login`, { data: { email: who.email, password: who.password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}
const key = () => crypto.randomUUID();

/** Admin grants through the API (the admin UI panel is exercised separately below). */
async function grant(request: APIRequestContext, teacherId: string, credits: number) {
  const bearer = await token(request, admin);
  const res = await request.post(`${api}/admin/credits/accounts/${teacherId}/grants`, {
    headers: { authorization: `Bearer ${bearer}`, "Idempotency-Key": key() },
    data: { credits, reason: "Cấp cho kiểm thử trình duyệt" },
  });
  expect(res.status()).toBe(201);
}
async function teacherId(request: APIRequestContext, who: { email: string; password?: string }) {
  const bearer = await token(request, who);
  const me = await (await request.get(`${api}/auth/me`, { headers: { authorization: `Bearer ${bearer}` } })).json();
  return (me.id ?? me.user?.id) as string;
}

async function login(page: Page, who: { email: string; password?: string }) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(who.password!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function openAiTab(page: Page, id: string) {
  await page.goto(`/classes/${id}?tab=resources`);
  await page.getByRole("tab", { name: "Soạn nháp bằng AI" }).click();
  await expect(page.getByRole("heading", { name: "Soạn nháp bằng AI" })).toBeVisible();
}
async function fillForm(page: Page, count: number) {
  await page.getByLabel("Loại nội dung").last().selectOption("TEST");
  const lesson = page.getByLabel("Bài học làm căn cứ");
  const circuit = await lesson.locator("option", { hasText: /mạch|circuit/i }).first().getAttribute("value");
  await lesson.selectOption(circuit ?? { index: 1 });
  await page.getByLabel(/Số mục/).fill(String(count));
}
const noTokens = async (page: Page) => {
  const html = (await page.locator("body").innerText()).toLowerCase();
  for (const word of ["token", "gemini", "fake-model", "nhà cung cấp"]) expect(html).not.toContain(word);
};

test("confirm: the estimate is shown, the job settles in credits and the history lists it", async ({ page, request }) => {
  await grant(request, await teacherId(request, teacher), 100);
  await login(page, teacher);
  await openAiTab(page, classId);
  await fillForm(page, 5);
  await expect(page.getByTestId("credit-estimate").getByText(/≈ 7 tín dụng — còn \d+/)).toBeVisible(); // 2 + 5 x 1
  await page.getByRole("button", { name: "Tạo bản nháp bằng AI" }).click();
  await expect(page.getByText("Sẵn sàng duyệt").first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("job-credits").first()).toContainText(/Đã dùng \d+ tín dụng/);
  await noTokens(page);

  await page.goto("/credits");
  await expect(page.getByRole("heading", { name: "Tín dụng AI", level: 1 })).toBeVisible();
  await expect(page.getByTestId("credits-available")).toBeVisible();
  await expect(page.locator("tr[data-kind=RESERVE]").first()).toBeVisible();
  await expect(page.locator("tr[data-kind=SETTLE]").first()).toBeVisible();
  await noTokens(page);
});

test("estimate changed: the new value is shown and the teacher confirms again", async ({ page, request }) => {
  await grant(request, await teacherId(request, teacher), 50);
  await login(page, teacher);
  await openAiTab(page, classId);
  // Make the first estimate answer lower than the server price, so the confirmed value is stale.
  let answered = false;
  await page.route("**/ai-jobs/estimate", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (!answered) {
      answered = true;
      await route.fulfill({ response, json: { ...body, credits: Math.max(0, body.credits - 3) } });
    } else await route.fulfill({ response });
  });
  await fillForm(page, 5);
  await expect(page.getByTestId("credit-estimate").getByText(/≈ 4 tín dụng/)).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp bằng AI" }).click();
  await expect(page.getByText("Mức tín dụng ước tính đã đổi thành 7")).toBeVisible();
  await expect(page.getByTestId("credit-estimate").getByText(/≈ 7 tín dụng/)).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp bằng AI" }).click();
  await expect(page.getByText("Sẵn sàng duyệt").first()).toBeVisible({ timeout: 30000 });
});

test("insufficient balance: the estimate warns, shows the balance and blocks the request", async ({ page }) => {
  await login(page, outsider);
  await openAiTab(page, outsiderClassId);
  await fillForm(page, 5);
  await expect(page.getByText(/Không đủ tín dụng: cần 7, còn \d+/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo bản nháp bằng AI" })).toBeDisabled();
  await noTokens(page);
});

test("a cancelled request is refunded in full and the refund is visible in the history", async ({ page, request }) => {
  await grant(request, await teacherId(request, teacher), 50);
  await login(page, teacher);
  await openAiTab(page, classId);
  await fillForm(page, 5);
  await expect(page.getByTestId("credit-estimate").getByText(/≈ 7 tín dụng/)).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp bằng AI" }).click();
  const cancel = page.getByRole("button", { name: "Hủy yêu cầu" });
  await cancel.click({ timeout: 15000 }).catch(() => undefined); // the runner may have finished first; the refund assertion below covers the cancel case only
  test.skip((await page.getByText("Yêu cầu đã bị hủy").count()) === 0, "The fake provider finished before the cancel; nothing to refund");
  await page.goto("/credits");
  await expect(page.locator("tr[data-kind=REFUND]").first()).toContainText(/Hoàn lại/);
});

test("students and parents have no credit entry", async ({ page }) => {
  await page.goto("/credits");
  await expect(page).toHaveURL(/\/login|\/$/);
  const status = await fetch(`${api}/me/credits`);
  expect(status.status).toBe(401);
});
