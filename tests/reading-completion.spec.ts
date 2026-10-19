import { expect, test } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_FIXTURE_PASSWORD or SEED_PASSWORD from the backend seed.");

test("assigned reading completion retries and resumes from server evidence", async ({ page }) => {
  let failedOnce = false;
  await page.route("**/api/lessons/*/steps/*/progress", async (route) => {
    if (!failedOnce && route.request().method() === "PUT") {
      failedOnce = true;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Lỗi tạm thời" }) });
      return;
    }
    await route.continue();
  });
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.active");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/auth/student/login"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await loginResponse).ok()).toBeTruthy();
  await expect(
    page.getByRole("complementary").getByText("Không gian học tập"),
  ).toBeVisible();
  // I1 moved reading, video and study cards from the assignment page to the lesson page.
  await page.goto("/lessons/lesson-circuit");

  const reading = page.getByRole("region", { name: "Nội dung bài đọc có thể cuộn" });
  const complete = page.getByRole("button", { name: "Hoàn thành phần đọc" });
  const done = page.getByRole("status").filter({ hasText: "Đã hoàn thành phần đọc" });
  await expect(reading).toBeVisible();
  await expect(complete.or(done)).toBeVisible();
  if (await complete.count()) {
    await complete.focus();
    await complete.press("Enter");
    await expect(page.getByRole("alert")).toContainText("Lỗi tạm thời");
    await expect(page.getByRole("button", { name: "Thử lưu lại" })).toBeEnabled();
    await page.getByRole("button", { name: "Thử lưu lại" }).click();
  }
  await expect(done).toBeVisible();
  await expect(page.getByRole("tab", { name: /Bài đọc/ }).getByLabel("Đã hoàn thành")).toBeVisible();

  await page.reload();
  await expect(done).toBeVisible();
  await expect(page.getByRole("button", { name: "Hoàn thành phần đọc" })).toHaveCount(0);
});
