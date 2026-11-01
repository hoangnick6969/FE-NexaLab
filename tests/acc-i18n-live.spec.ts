import { test, type Page } from "@playwright/test";
import { accounts, call, expect, studentToken } from "./fixtures/live";

// acc-5 on the real FE/API: the language picked before sign-in is kept, the shell and server
// errors follow it, and the choice in Settings is saved on the profile for other devices.
const lang = (page: Page) => page.evaluate(() => document.documentElement.lang);

test.beforeAll(() => {
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD");
});

test("English from the landing page through the app, saved on the profile, then back to Vietnamese", async ({ browser }) => {
  test.setTimeout(120000);
  const { token } = await studentToken(accounts.student);
  try {
    const page = await (await browser.newContext()).newPage();
    // The sign-in page has no language switch; the choice is made on the public landing page.
    await page.goto("/");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect.poll(() => lang(page)).toBe("en");
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Student sign-in" })).toBeVisible();
    expect(await lang(page)).toBe("en");

    // A wrong password shows the English copy for the server code, not the Vietnamese message.
    await page.getByLabel("Student username").fill(accounts.student.username);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("The username, email or password is incorrect");

    await page.getByLabel("Password", { exact: true }).fill(accounts.student.password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(page.getByText("Ready to explore")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Notifications/ })).toBeVisible();
    // The language picked before sign-in is newer than the profile's, so it is saved there.
    await expect.poll(async () => (await call("/me/profile", "GET", undefined, token)).data.preferences.locale).toBe("en");

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Profile and settings" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "English" })).toBeChecked();
    const toVi = page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().endsWith("/api/me/preferences"));
    await page.getByRole("radio", { name: "Tiếng Việt" }).click(); // the page reloads, so no check() verification
    expect((await toVi).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Hồ sơ và cài đặt" })).toBeVisible();
    expect(await lang(page)).toBe("vi");
    const toEn = page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().endsWith("/api/me/preferences"));
    await page.getByRole("radio", { name: "English" }).click();
    expect((await toEn).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Profile and settings" })).toBeVisible();
    expect((await call("/me/profile", "GET", undefined, token)).data.preferences.locale).toBe("en");

    // Another browser starts in Vietnamese and switches once the profile loads.
    const other = await (await browser.newContext()).newPage();
    await other.goto("/login");
    await other.getByLabel("Tên đăng nhập học sinh").fill(accounts.student.username);
    await other.getByLabel("Mật khẩu", { exact: true }).fill(accounts.student.password!);
    await other.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(other.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    expect(await lang(other)).toBe("en");
  } finally {
    await call("/me/preferences", "PATCH", { locale: "vi" }, token);
  }
});
