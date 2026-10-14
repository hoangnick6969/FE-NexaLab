import { expect, test, type Page } from "@playwright/test";

// Real FE/API/database check of Epic A5, launched by the backend
// scripts/a5-integration.mjs (RUN_A5_BROWSER_E2E=true) after its student has
// completed the assigned lesson with quiz and practical retries.
const assignmentId = process.env.TEST_ASSIGNMENT_ID;
const username = process.env.TEST_STUDENT_USERNAME;
const password = process.env.TEST_STUDENT_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill(username!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  const response = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

for (const width of [1280, 390]) {
  test(`real progress page drills from status to source evidence at ${width}px`, async ({ page }) => {
    expect(assignmentId && username && password).toBeTruthy();
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto("/progress");

    const card = page.locator("article.assignment-progress", { has: page.locator(`a[href^="/assignments/${assignmentId}"]`) });
    await expect(card).toContainText("4/4");
    await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await expect(card.getByRole("link", { name: "Xem lại bài" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const history = page.locator("#progress-history .activity-row");
    await expect(history.first()).toBeVisible();
    expect(await history.count()).toBeGreaterThan(3);
    await expect(page.locator("#progress-history")).not.toContainText("%");

    const quizRow = card.locator("tr", { hasText: "Bài kiểm tra" });
    const evidence = quizRow.getByRole("button", { name: "Xem bằng chứng" });
    await evidence.click();
    const sheet = page.getByRole("dialog", { name: "Bằng chứng" });
    await expect(sheet).toContainText("Dùng để tính trạng thái");
    await sheet.locator(".activity-row", { hasText: "Dùng để tính trạng thái" }).getByRole("button", { name: "Xem chi tiết" }).click();
    await expect(sheet).toContainText("câu đúng");
    await expect(sheet).toContainText("cần từ 50% để đạt");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(evidence).toBeFocused();

    await page.reload();
    await expect(card).toContainText("4/4");
    await card.getByRole("link", { name: "Xem lại bài" }).click();
    await expect(page).toHaveURL(new RegExp(`/assignments/${assignmentId}`));
    await expect(page.getByLabel("Lộ trình bài học")).toBeVisible();
  });
}
