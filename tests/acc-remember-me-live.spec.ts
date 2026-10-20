import { test, type BrowserContext } from "@playwright/test";
import { accounts, expect } from "./fixtures/live";

// D-ACC-01 on the real FE/API/database: remember-me keeps a persistent 30-day refresh
// cookie that survives rotation; otherwise the cookie lives only for the browser session.
const DAY = 86400;

async function loginStudent(context: BrowserContext, remember: boolean) {
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill(accounts.student.username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(accounts.student.password!);
  const box = page.getByLabel(/Ghi nhớ đăng nhập/);
  await expect(box).not.toBeChecked();
  if (remember) await box.check();
  const response = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/auth/student/login"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const login = await response;
  expect(login.status()).toBe(201);
  expect(login.request().postDataJSON().remember).toBe(remember);
  return page;
}
const refreshCookie = async (context: BrowserContext) => (await context.cookies()).find((cookie) => cookie.name === "refresh");

test.beforeAll(() => {
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_STUDENT_PASSWORD)");
});

test("remember-me keeps a persistent 30-day cookie that survives rotation and reload", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await loginStudent(context, true);
  const first = await refreshCookie(context);
  expect(first?.httpOnly).toBe(true);
  const days = (first!.expires - Date.now() / 1000) / DAY;
  expect(days).toBeGreaterThan(29);
  expect(days).toBeLessThanOrEqual(30);

  // Rotation keeps the choice.
  const rotated = await page.request.post("/api/auth/refresh");
  expect(rotated.status()).toBe(201);
  const second = await refreshCookie(context);
  expect(second?.value).not.toBe(first?.value);
  expect((second!.expires - Date.now() / 1000) / DAY).toBeGreaterThan(29);

  await page.reload();
  await expect(page.getByRole("complementary").getByText("Không gian học tập")).toBeVisible();
  await context.close();
});

test("without remember-me the refresh cookie is a browser-session cookie, also after rotation", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await loginStudent(context, false);
  expect((await refreshCookie(context))?.expires).toBe(-1);
  const rotated = await page.request.post("/api/auth/refresh");
  expect(rotated.status()).toBe(201);
  expect((await refreshCookie(context))?.expires).toBe(-1);
  // A new browser session (no cookies carried over) is signed out.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/progress");
  // Signed out, the app shows the public landing page instead of the learning shell.
  await expect(other.getByText("Đăng nhập", { exact: true }).first()).toBeVisible();
  await expect(other.getByRole("complementary").getByText("Không gian học tập")).toHaveCount(0);
  await fresh.close();
  await context.close();
});
