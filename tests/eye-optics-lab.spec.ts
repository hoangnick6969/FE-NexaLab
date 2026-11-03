import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * FL-16 end to end on the dev preview: phase 1 (8 names) → phase 2 (3 scenarios)
 * → submit → grade the exact submitted payload with the real server rubric
 * (`eye-anatomy-optics@1.0.0`, imported from the sibling BE checkout) → render
 * that stored result. No API mock decides the score. Also records render stats.
 */
const BE_EVALUATOR = fileURLToPath(new URL("../../BE-NexaLab/src/modules/labs/application/evaluators/eye-anatomy-optics.evaluator.ts", import.meta.url));
const BE_MODEL = fileURLToPath(new URL("../../BE-NexaLab/packages/sim/eye-optics.ts", import.meta.url));

// The retina is answered with its other textbook name, without diacritics, to exercise the alias rule.
const NAMES = ["Giác mạc", "Thủy dịch", "Đồng tử", "Thể thủy tinh", "Dịch kính", "mang luoi", "Dây thần kinh thị giác", "Củng mạc"];
const SCENARIOS = [
  { button: "Mắt bình thường, vật ở 25 cm", distance: "0.25", lens: "20", glasses: "0" },
  { button: "Mắt cận thị nhẹ, vật ở xa", distance: "inf", lens: "16", glasses: "-2" },
  { button: "Mắt viễn thị, vật ở 40 cm", distance: "0.4", lens: "18.75", glasses: "3" },
];

type Stats = { frames: number; calls: number; triangles: number; vertices: number; meshes: number; geometries: number; textures: number; programs: number; frameloop: string };
const stats = (page: Page) => page.evaluate(() => (window as unknown as { __anatomyStage: { read: () => Stats } }).__anatomyStage.read());

async function setRange(page: Page, label: RegExp, value: string) {
  const input = page.getByLabel(label);
  await input.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(element, next);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(value);
}

test("FL-16 eye Lab: 8 names, 3 optics scenarios, server rubric passes 11/11", async ({ page }) => {
  test.skip(!existsSync(BE_EVALUATOR), `Sibling BE checkout not found at ${BE_EVALUATOR}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/dev/lab-kits/eye-optics");
  await expect(page.getByRole("img", { name: /Mô hình 3D nhãn cầu/ })).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __anatomyStage?: unknown }).__anatomyStage));

  // Phase 2 stays locked until all 8 names are filled.
  const opticsTab = page.getByRole("tab", { name: "2. Điều tiết và kính" });
  await expect(opticsTab).toBeDisabled();
  await page.getByRole("button", { name: "Xem 4" }).click();
  for (const [index, name] of NAMES.entries()) await page.getByLabel(`Tên bộ phận ${index + 1}`).fill(name);
  await expect(opticsTab).toBeEnabled();
  await opticsTab.click();

  for (const scenario of SCENARIOS) {
    await page.getByRole("button", { name: scenario.button }).click();
    await expect(page.getByRole("button", { name: scenario.button })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Khoảng cách tới vật").selectOption(scenario.distance);
    await setRange(page, /Độ phồng thể thủy tinh/, scenario.lens);
    await setRange(page, /Kính đeo/, scenario.glasses);
    await expect(page.getByRole("status")).toContainText("Ảnh rơi đúng trên màng lưới");
  }

  await page.getByRole("button", { name: /Nộp bài/ }).click();
  const payload = JSON.parse(await page.getByTestId("eye-optics-evidence").textContent() ?? "null");

  const { eyeOpticsEvidenceSchema } = await import(pathToFileURL(BE_MODEL).href);
  const { evaluateEyeOpticsActivity } = await import(pathToFileURL(BE_EVALUATOR).href);
  const evidence = eyeOpticsEvidenceSchema.parse(payload);
  const graded = evaluateEyeOpticsActivity(evidence);
  expect(graded.verdict).toBe("passed");
  expect(graded.result.assessment).toMatchObject({ score: 11, maximumScore: 11, phase1Score: 8, phase2Score: 3, unmetCriteria: [] });

  await page.evaluate(({ result, verdict }) => (window as unknown as { __eyeOpticsPreview: { showResult: (r: unknown, v: string) => void } }).__eyeOpticsPreview.showResult(result, verdict), graded);
  await expect(page.getByText("Em đã đạt tất cả tiêu chí.")).toBeVisible();
  await expect(page.getByText("Gọi tên bộ phận: 8/8")).toBeVisible();
  await expect(page.getByText("Màng lưới (Võng mạc)")).toBeVisible();

  // Benchmark: render cost and whether the demand loop really stops when idle.
  await page.waitForTimeout(800);
  const idleStart = await stats(page);
  await page.waitForTimeout(1500);
  const idleEnd = await stats(page);
  await setRange(page, /Độ phồng thể thủy tinh/, "20.25");
  await page.waitForTimeout(400);
  const afterChange = await stats(page);
  test.info().annotations.push({ type: "benchmark", description: JSON.stringify({ idleStart, idleEnd, afterChange }) });
  console.log("EX-A benchmark", JSON.stringify({ idleStart, idleEnd, afterChange }));

  expect(idleStart.frameloop).toBe("demand");
  expect(idleEnd.frames - idleStart.frames).toBe(0);
  expect(afterChange.frames).toBeGreaterThan(idleEnd.frames);
  expect(errors).toEqual([]);
});
