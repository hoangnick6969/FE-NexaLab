import { expect, test } from "@playwright/test";

// SPEC-lab-space-shared-ui: FL-13 Explore keeps its flow (safety first, no attempt) and Esc acts by focus.
const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 8, mustChangePassword: false,
};

test("FL-13 Explore: keyboard safety gate, Esc collapses the hint drawer only from inside it, no attempt request", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  const submits: string[] = [];
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) submits.push(request.url()); });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [{ id: "acid-base-indicators", title: "Acid – base, chỉ thị và pH" }] }));

  await page.goto("/labs/acid-base-indicators");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const enter = dialog.getByRole("button", { name: "Vào bàn thí nghiệm" });
  await expect(enter).toBeDisabled();
  // The bench stays out of reach until the student confirms, with the keyboard alone.
  await dialog.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).focus();
  await page.keyboard.press("Space");
  await enter.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();

  const toggle = page.locator(".observation-drawer-toggle");
  const drawer = page.locator("#observation-drawer");
  await toggle.click();
  await expect(drawer).toBeVisible();
  // Focus on the bench: Esc is the bench's (release a held tool), the drawer stays open.
  await page.locator("body").focus();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeVisible();
  // Focus inside the drawer: Esc collapses it and returns focus to its toggle.
  await drawer.getByRole("button", { name: "Thu gọn" }).focus();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();

  expect(submits).toEqual([]);
});
