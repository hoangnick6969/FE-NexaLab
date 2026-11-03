import { expect, test } from "@playwright/test";
import { openBuoyancyLab } from "./helpers/buoyancy";

// The HTTP boundary is mocked; grading calls the real server evaluator. No database is accessed.
test("official FL-05 LabRun mounts pinned pack, preserves canvas, submits evidence and renders server grade", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const submitted = await openBuoyancyLab(page, 1200);
  await expect(page.getByRole("heading", { name: "FL-05 · Lực đẩy Ác-si-mét", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Mẫu vật" }).selectOption("pebble-a");
  await page.getByRole("button", { name: "Nhúng chìm hoàn toàn", exact: true }).click();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.165 N");
  await page.evaluate(() => { (window as typeof window & { __fl05Canvas?: Element | null }).__fl05Canvas = document.querySelector(".physics-stage canvas"); });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".buoyancy-table tbody")).toContainText("0.165");
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  await page.getByTestId("buoyancy-overflow-input").fill("12");
  await page.getByTestId("buoyancy-force-input").fill("0.141");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  expect(await page.evaluate(() => (window as typeof window & { __fl05Canvas?: Element | null }).__fl05Canvas === document.querySelector(".physics-stage canvas"))).toBe(true);
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByTestId("buoyancy-result")).toContainText("2 / 2");
  expect(submitted()).toMatchObject({ contract: "lab-contract/1", runId: "fl05-run", evidence: { specimenId: "pebble-a", submergedVolumeMl: 12, overflowMl: 12, measuredBuoyantForceN: 0.141 } });
  expect(submitted()).not.toHaveProperty("labState");
});
