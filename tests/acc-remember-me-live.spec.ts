import { test, type BrowserContext } from "@playwright/test";
import { accounts, expect, call } from "./fixtures/live";

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
  expect((await login.headerValue("set-cookie"))).toContain("HttpOnly");
  expect((await login.headerValue("set-cookie"))).toContain("Path=/api/auth");
  return page;
}
const refreshCookie = async (context: BrowserContext) => (await context.cookies()).find((cookie) => cookie.name === "refresh");

test.beforeAll(() => {
  const loopback = (name: string, protocols: string[]) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} must explicitly identify an isolated loopback target`);
    const url = new URL(value);
    if (!protocols.includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase())) {
      throw new Error(`${name} must use an allowed protocol and loopback host`);
    }
    return url;
  };
  const databases = ["NEXALAB_ISOLATED_DATABASE_URL", "DATABASE_URL", "DIRECT_URL"].map((name) => loopback(name, ["postgres:", "postgresql:"]));
  const target = databases[0];
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!database || ["postgres", "template0", "template1"].includes(database.toLowerCase()) || databases.some((url) => url.hostname !== target.hostname || (url.port || "5432") !== (target.port || "5432") || decodeURIComponent(url.pathname.slice(1)) !== database)) {
    throw new Error("All database URLs must identify the same dedicated isolated loopback database");
  }
  for (const name of ["TEST_API", "TEST_WEB"]) loopback(name, ["http:", "https:"]);
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
  await expect(page.locator("aside.sidebar")).toBeVisible();
  const cookies = (await context.cookies()).filter((cookie) => cookie.expires > Date.now() / 1000);
  await context.close();
  const reopened = await browser.newContext();
  await reopened.addCookies(cookies);
  const reopenedPage = await reopened.newPage();
  const restore = reopenedPage.waitForResponse((r) => r.url().endsWith("/api/auth/refresh"));
  await reopenedPage.goto("/progress");
  expect((await restore).status()).toBe(201);
  await expect(reopenedPage.locator("aside.sidebar")).toBeVisible();
  expect((await refreshCookie(reopened))?.value).not.toBe(second?.value);
  const logout = await reopenedPage.request.post("/api/auth/logout");
  expect(logout.status()).toBe(201);
  expect((await reopenedPage.request.post("/api/auth/refresh")).status()).toBe(401);
  await reopenedPage.reload();
  await expect(reopenedPage.locator("aside.sidebar")).toHaveCount(0);
  await reopened.close();
});

test("without remember-me the refresh cookie is a browser-session cookie, also after rotation", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await loginStudent(context, false);
  expect((await refreshCookie(context))?.expires).toBe(-1);
  const rotated = await page.request.post("/api/auth/refresh");
  expect(rotated.status()).toBe(201);
  expect((await refreshCookie(context))?.expires).toBe(-1);
  await page.reload();
  await expect(page.locator("aside.sidebar")).toBeVisible();
  expect((await refreshCookie(context))?.expires).toBe(-1);
  // A new browser session (no cookies carried over) is signed out.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/progress");
  // Signed out, the app shows the public landing page instead of the learning shell.
  await expect(other.getByText("Đăng nhập", { exact: true }).first()).toBeVisible();
  await expect(other.locator("aside.sidebar")).toHaveCount(0);
  await fresh.close();
  await context.close();
});


test("a provisioned temporary account changes its password in the real browser and retains remember", async ({ browser }) => {
  test.skip(!accounts.owner.password, "Set SEED_FIXTURE_PASSWORD or TEST_TEACHER_PASSWORD");
  const owner = await call("/auth/login", "POST", accounts.owner);
  expect(owner.status).toBe(201);
  const username = "login-gate-" + Date.now().toString(36);
  const created = await call("/classes/class-pilot-a/students", "POST", { username, fullName: "Login Gate Browser", grade: 8, consent: true }, owner.data.accessToken);
  expect(created.status).toBe(201);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Tên đăng nhập học sinh").fill(username);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(created.data.credentials.temporaryPassword);
    await page.getByLabel(/Ghi nhớ đăng nhập/).check();
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
    await page.goto("/lessons/lesson-circuit");
    await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
    const before = await refreshCookie(context);
    const password = "Login-Gate-Private-2026!";
    await page.getByLabel("Mật khẩu tạm", { exact: true }).fill(created.data.credentials.temporaryPassword);
    await page.getByLabel("Mật khẩu mới (ít nhất 12 ký tự)", { exact: true }).fill(password);
    await page.getByLabel("Nhập lại mật khẩu mới").fill(password);
    const changed = page.waitForResponse((r) => r.url().endsWith("/api/auth/password"));
    await page.getByRole("button", { name: "Lưu và bắt đầu học" }).click();
    const response = await changed;
    expect(response.status()).toBe(201);
    expect((await response.json()).user.mustChangePassword).toBe(false);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("aside.sidebar")).toBeVisible();
    const after = await refreshCookie(context);
    expect(after?.value).not.toBe(before?.value);
    expect((after!.expires - Date.now() / 1000) / DAY).toBeGreaterThan(29);
    await page.reload();
    await expect(page.locator("aside.sidebar")).toBeVisible();
    expect((await page.request.post("/api/auth/logout")).status()).toBe(201);
    await page.reload();
    await expect(page.locator("aside.sidebar")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
