import { expect, test } from "@playwright/test";

// SAI-05: a linked parent sees hint counts by level per Lab, never hint text. Route-mocked API only.
const parent = { id: "parent-1", username: null, email: "parent@example.test", fullName: "Phụ huynh An", role: "PARENT", grade: null, mustChangePassword: false };

test("SAI-05: parent sees help-seeking counts per Lab and no hint content", async ({ page }) => {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: parent, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...parent, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/children/link-status", (route) => route.fulfill({ json: { emailVerified: true, consent: true, pending: [] } }));
  await page.route("**/api/children", (route) => route.fulfill({ json: [{ student: { id: "student-1", fullName: "Nguyễn An", grade: 8, progress: [] } }] }));
  await page.route("**/api/children/student-1/progress", (route) => route.fulfill({ json: { progress: [], summary: {} } }));
  await page.route("**/api/children/student-1/assignment-notices", (route) => route.fulfill({ json: [] }));
  const asked: string[] = [];
  await page.route("**/api/children/student-1/help-seeking", (route) => { asked.push(route.request().method()); route.fulfill({ json: { labs: [
    { labId: "food-web", labTitle: "Lưới thức ăn và cân bằng tự nhiên", total: 5, byLevel: { 1: 2, 2: 1, 3: 1, 4: 0 }, reflections: 1, lastAt: "2026-11-05T08:10:00.000Z" },
  ] } }); });

  await page.goto("/progress");
  await page.getByRole("button", { name: "Nguyễn An" }).click();
  const panel = page.getByTestId("help-seeking");
  await expect(panel).toContainText("Con đã xin gợi ý bao nhiêu lần");
  const lab = panel.locator('[data-lab="food-web"]');
  await expect(lab).toContainText("Lưới thức ăn và cân bằng tự nhiên");
  await expect(lab).toContainText("5 lần");
  await expect(lab.locator("[data-level] dd")).toHaveText(["2", "1", "1", "0", "1"]);
  await expect(panel).toContainText("không hiển thị nội dung gợi ý");
  expect(asked).toEqual(["GET"]);
  await page.setViewportSize({ width: 360, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/parent-help-seeking-phone.png", fullPage: true });
});
