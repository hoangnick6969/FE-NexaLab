import { expect, test } from "@playwright/test";

test("FL-05 immersion lowers spring reading and 2D table keeps the same result", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/lab-kits/k3/buoyancy");
  await expect(page.getByRole("heading", { name: /FL-05/ }).first()).toBeVisible();
  await page.getByRole("combobox", { name: "Mẫu vật" }).selectOption("iron-1v");
  const reading = page.getByRole("status", { name: "Số đọc trên dụng cụ" });
  await expect(reading).toContainText("0.765 N");
  await page.getByRole("button", { name: "Nhúng vào bình tràn" }).click();
  await expect(reading).toContainText("0.716 N");
  await page.evaluate(() => { (window as typeof window & { __buoyancyCanvas?: Element | null }).__buoyancyCanvas = document.querySelector(".physics-stage canvas"); });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".buoyancy-table")).toBeVisible();
  await expect(page.locator(".buoyancy-table tbody")).toContainText("0.716");
  expect(await page.evaluate(() => (window as typeof window & { __buoyancyCanvas?: Element | null }).__buoyancyCanvas === document.querySelector(".physics-stage canvas"))).toBe(true);
});
