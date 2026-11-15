import { expect, test, type Page } from "@playwright/test";

/**
 * Baseline for K2 pilot step A (lab-kit-delivery-tracking K2-0.1, pilot spec §6 A).
 * Records, on the dev route `/dev/lab-kits/k2`, what step A must keep identical:
 * the intro and bench item lists (FL-13, FL-14a, FL-10 Explore), pH readings on FL-13,
 * scale readings on FL-10 Explore, and one screenshot per bench.
 * Re-run after step A: any text diff is a regression; screenshot diffs need a human look.
 * Update only on purpose: `npx playwright test tests/k2-baseline.spec.ts --update-snapshots`.
 */
const LABS = ["fl-13", "fl-14a", "fl-10"] as const;

async function openBench(page: Page, lab: string) {
  await page.goto(`/dev/lab-kits/k2?lab=${lab}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const intro = await dialog.innerText();
  const checkbox = dialog.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" });
  if (await checkbox.count()) await checkbox.check();
  await dialog.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
  await expect(dialog).toBeHidden();
  return intro;
}

const names = async (page: Page, group: string) =>
  (await page.getByRole("group", { name: group }).getByRole("button").allInnerTexts()).map((text) => text.split("\n")[0].trim());

for (const lab of LABS) {
  test(`${lab}: intro and bench item lists`, async ({ page }) => {
    const intro = await openBench(page, lab);
    expect(intro.replace(/\s+\n/g, "\n").trim()).toMatchSnapshot(`${lab}-intro.txt`);
    const bench = { shelf: await names(page, "Kệ hoá chất"), tools: await names(page, "Dụng cụ"), vessels: await names(page, "Vật chứa") };
    expect(JSON.stringify(bench, null, 1)).toMatchSnapshot(`${lab}-bench-items.json`);
  });

  test(`${lab}: bench screenshot`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openBench(page, lab);
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot(`${lab}-bench.png`, { maxDiffPixelRatio: 0.03, animations: "disabled" });
  });
}

test("fl-13: pH reading of every shelf reagent", async ({ page }) => {
  test.setTimeout(180_000);
  await openBench(page, "fl-13");
  const shelf = page.getByRole("group", { name: "Kệ hoá chất" }).getByRole("button");
  const vessels = page.getByRole("group", { name: "Vật chứa" });
  const readings: Record<string, string> = {};
  const count = await shelf.count();
  for (let i = 0; i < count; i++) {
    const reagent = (await shelf.nth(i).innerText()).split("\n")[0].trim();
    if (/phenolphthalein|quỳ/i.test(reagent)) continue;
    const tube = `Ống ${Object.keys(readings).length + 1}`;
    await shelf.nth(i).click();
    await vessels.getByRole("button", { name: new RegExp(`^${tube}\\b`) }).click();
    const tools = page.getByRole("group", { name: "Dụng cụ" });
    const retract = tools.getByRole("button", { name: "Rút bút đo pH" });
    if (await retract.count()) await retract.click();
    await tools.getByRole("button", { name: "Bút đo pH", exact: true }).click();
    await vessels.getByRole("button", { name: new RegExp(`^${tube}\\b`) }).click();
    const info = page.getByRole("complementary", { name: `Thông tin ${tube}` });
    await expect(info).toContainText(/pH \d/);
    readings[reagent] = (await info.innerText()).match(/pH [\d,.]+/)![0];
  }
  expect(Object.keys(readings).length).toBeGreaterThan(0);
  expect(JSON.stringify(readings, null, 1)).toMatchSnapshot("fl-13-ph-readings.json");
});

test("fl-10: scale reading before and after adding HCl to cup 1", async ({ page }) => {
  await openBench(page, "fl-10");
  const reading = () => page.getByText(/^\d+,\d{2} g$/).first().innerText();
  const before = await reading();
  await page.getByRole("group", { name: "Kệ hoá chất" }).getByRole("button", { name: /^HCl/ }).click();
  await page.getByRole("group", { name: "Vật chứa" }).getByRole("button", { name: /^Cốc 1\b/ }).click();
  await expect.poll(reading).not.toBe(before);
  const after = await reading();
  expect(JSON.stringify({ before, afterHclInCup1: after }, null, 1)).toMatchSnapshot("fl-10-scale-readings.json");
});
