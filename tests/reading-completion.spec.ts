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
  await page.goto("/assignments/pilot-a-lesson-assignment");

  const reading = page.getByRole("region", { name: "Nội dung đọc" });
  const complete = page.getByRole("button", { name: "Đánh dấu đã đọc" });
  await expect(reading).toBeVisible();
  await expect(page.locator(".pathway-continue")).toHaveCount(1);
  if (await complete.count()) {
    await complete.focus();
    await complete.press("Enter");
    await expect(page.getByRole("alert")).toContainText("Lỗi tạm thời");
    await expect(page.getByRole("button", { name: "Thử lưu lại" })).toBeEnabled();
    await page.getByRole("button", { name: "Thử lưu lại" }).click();
  }
  await expect(page.getByText("Đã hoàn thành", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Đã hoàn thành", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đánh dấu đã đọc" })).toHaveCount(0);
});
