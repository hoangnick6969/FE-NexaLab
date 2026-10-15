import { expect, test } from "@playwright/test";

const email = process.env.B2_TEACHER_EMAIL ?? "b2-browser@teacher.local";
const password = process.env.B2_TEACHER_PASSWORD ?? "B2-Local-Test-2026!";

test("B2 teacher board reaches neutral flags and exact evidence on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await login).status()).toBe(201);
  await page.waitForURL(/\/(dashboard|classes|$)/);
  await page.goto("/classes");
  await page.getByRole("button", { name: /B2 b2-browser/ }).click();
  await expect(page.getByRole("heading", { name: "Theo dõi và hỗ trợ học sinh" })).toBeVisible();
  await expect(page.getByText("Học sinh B2", { exact: true })).toBeVisible();
  await expect(page.getByText(/Bài đã quá hạn và chưa hoàn thành/)).toBeVisible();
  await expect(page.getByText(/ít nhất hai lần làm bài kiểm tra chưa đạt/)).toBeVisible();
  await page.getByRole("button", { name: "Xem bằng chứng" }).click();
  await expect(page.getByText(/2 lần kiểm tra/)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
