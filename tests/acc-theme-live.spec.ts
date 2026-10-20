import { test } from "@playwright/test";
import { accounts, call, expect, studentLogin, studentToken } from "./fixtures/live";

// acc-4 on the real FE/API: the System/Light/Dark preference applies before first paint,
// survives a reload, and follows the user to a fresh browser through the profile.
const theme = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.dataset.theme);
const pageBackground = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

test.beforeAll(() => {
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD");
});

test("signed out, the system colour scheme decides before the app renders", async ({ browser }) => {
  const dark = await (await browser.newContext({ colorScheme: "dark" })).newPage();
  await dark.goto("/login");
  expect(await theme(dark)).toBe("dark");
  expect(await pageBackground(dark)).toBe("rgb(17, 24, 22)");
  const light = await (await browser.newContext({ colorScheme: "light" })).newPage();
  await light.goto("/login");
  expect(await theme(light)).toBe("light");
  expect(await pageBackground(light)).toBe("rgb(246, 247, 243)");
});

test("a student picks dark, keeps it on reload and on another browser, then returns to system", async ({ browser }) => {
  const { token } = await studentToken(accounts.student);
  try {
    const page = await studentLogin(browser);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/settings");
    const appearance = page.getByRole("region", { name: "Giao diện" });
    const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().endsWith("/api/me/preferences"));
    await appearance.getByLabel("Tối").check();
    expect((await saved).status()).toBe(200);
    expect(await theme(page)).toBe("dark");
    await page.reload();
    await expect(page.getByRole("region", { name: "Giao diện" }).getByLabel("Tối")).toBeChecked();
    expect(await theme(page)).toBe("dark");
    expect((await call("/me/profile", "GET", undefined, token)).data.preferences).toEqual({ theme: "dark" });

    // A fresh browser has no local copy; the profile brings the choice along after sign-in.
    const other = await studentLogin(browser);
    await other.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => theme(other)).toBe("dark");

    await page.getByRole("region", { name: "Giao diện" }).getByLabel("Theo hệ thống").check();
    await expect.poll(() => theme(page)).toBe("light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => theme(page)).toBe("dark");
  } finally {
    await call("/me/preferences", "PATCH", { theme: "system" }, token);
  }
});
