import { expect, test } from "@playwright/test";
import { openBuoyancyLab } from "./helpers/buoyancy";

test("2D apparatus diagram supports selection and dragging while preserving the 3D canvas", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBuoyancyLab(page);
  await expect(page.locator(".physics-stage canvas")).toHaveCount(1);
  const canvas = await page.locator(".physics-stage canvas").elementHandle();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.getByTestId("buoyancy-2d-stage")).toBeVisible();
  await page.getByRole("button", { name: "Chọn Sỏi trên sơ đồ", exact: true }).click();
  await page.getByTestId("buoyancy-hoist-slider").fill("52.5");
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.247 N", { timeout: 15000 });
  await page.screenshot({ path: "test-results/buoyancy-2d-apparatus.png" });
  const specimen = await page.locator(".buoyancy-2d-draggable").last().boundingBox();
  if (!specimen) throw new Error("2D specimen is not visible");
  await page.mouse.move(specimen.x + specimen.width / 2, specimen.y + specimen.height / 2); await page.mouse.down();
  await page.mouse.move(specimen.x + specimen.width / 2, specimen.y + specimen.height / 2 + 65, { steps: 3 }); await page.mouse.up();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.188 N", { timeout: 15000 });
  await page.getByRole("button", { name: "3D", exact: true }).click();
  expect(await canvas!.evaluate(node => node === document.querySelector(".physics-stage canvas"))).toBe(true);
});

test("blue water is visible and Eureka stream runs during displacement then stops", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await openBuoyancyLab(page);
  await expect(page.getByTestId("buoyancy-hoist-slider")).toBeVisible();
  await page.getByTestId("buoyancy-hoist-slider").fill("80");
  await expect(page.getByText("Nước đang tràn", { exact: true })).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: "test-results/buoyancy-blue-water-flowing.png" });
  await expect(page.getByText("Nước đang tràn", { exact: true })).toHaveCount(0, { timeout: 45000 });
  await page.screenshot({ path: "test-results/buoyancy-blue-water-settled.png" });
});

test("FL-05 supports orbit, specimen drag, continuous hoist, depth plateau and recorded rows", async ({ page }) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBuoyancyLab(page);
  const inspect = () => page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map(entry => entry.name).find(name => name.includes("/@react-three_fiber.js?")) ?? "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = await import(url);
    const root = _roots.get(document.querySelector("canvas"))?.store.getState();
    const specimen = root?.scene.getObjectByName("buoyancy-active-specimen");
    if (!root || !specimen) return null;
    const point = specimen.getWorldPosition(specimen.position.clone()); point.y += .04; point.project(root.camera);
    return { camera: root.camera.position.toArray(), specimenX: (point.x + 1) * innerWidth / 2, specimenY: (1 - point.y) * innerHeight / 2, controls: root.controls?.enabled };
  });
  await expect.poll(inspect, { timeout: 20000 }).not.toBeNull();
  await page.screenshot({ path: "test-results/buoyancy-overhaul-initial.png" });
  const before = (await inspect())!;
  await page.mouse.move(180, 650); await page.mouse.down(); await page.mouse.move(240, 650, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => JSON.stringify((await inspect())?.camera)).not.toBe(JSON.stringify(before.camera));
  const point = (await inspect())!;
  await page.mouse.move(point.specimenX, point.specimenY);
  await page.mouse.down(); await page.mouse.move(point.specimenX, point.specimenY + 90, { steps: 4 }); await page.mouse.up();
  const slider = page.getByTestId("buoyancy-hoist-slider");
  await expect.poll(() => slider.inputValue()).not.toBe("0");
  await expect.poll(async () => (await inspect())?.controls).toBe(true);
  await slider.fill("52.5");
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.716 N");
  await slider.fill("80");
  const reading = page.getByRole("status", { name: "Số đọc trên dụng cụ" });
  await expect(reading).toContainText("0.667 N");
  await slider.fill("100");
  await expect(reading).toContainText("0.667 N");
  await page.getByRole("button", { name: /Ghi số liệu vào bảng/ }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".buoyancy-table tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.screenshot({ path: "test-results/buoyancy-overhaul.png" });
});
