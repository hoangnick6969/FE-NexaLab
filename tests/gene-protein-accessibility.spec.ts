import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function renderedFrames(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = await import(moduleUrl);
    const root = _roots.get(document.querySelector("canvas"));
    return root?.store.getState().gl.info.render.frame as number | undefined;
  });
}

async function expectIdle(page: Page) {
  await expect
    .poll(
      async () => {
        const before = await renderedFrames(page);
        await page.waitForTimeout(150); // Sample renderer work, not animation completion.
        const after = await renderedFrames(page);
        return before !== undefined && before === after;
      },
      { timeout: 15000 },
    )
    .toBe(true);
}

test("six FL27 stations have no critical/serious axe violations in 2D and 3D", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("nexalab:lab-view:gene-expression", "2d"),
  );
  await page.goto("/dev/lab-kits/gene-protein");
  await expect(page.locator(".k7-hud")).toBeVisible();
  for (const mode of ["2D", "3D"]) {
    await page
      .locator(".lab-space-header")
      .getByRole("button", { name: mode, exact: true })
      .click();
    if (mode === "3D") await page.getByTestId("gene-open-microscope").click();
    for (const name of [
      "Cấu trúc DNA",
      "Tái bản",
      "Phiên mã",
      "Dịch mã",
      "Đột biến",
      "Kết luận",
    ]) {
      await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
      const report = await new AxeBuilder({ page }).analyze();
      expect(
        report.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact ?? ""),
        ),
        `${mode}: ${name}`,
      ).toEqual([]);
    }
  }
});

test("molecular drift pauses for static stations, reduced motion, hidden tab and 2D", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    localStorage.setItem("nexalab:lab-view:gene-expression", "3d");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/lab-kits/gene-protein");
  await page.getByTestId("gene-open-microscope").click();
  const stage = page.getByTestId("molecular-stage");
  await expect(stage).toHaveAttribute("data-frameloop", "demand");
  await expectIdle(page);
  await page.getByRole("tab", { name: /^Tái bản/ }).click();
  await page.getByTestId("gene-unwind").click();
  await expect(stage).toHaveAttribute("data-frameloop", "demand");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stage).toHaveAttribute("data-frameloop", "always");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(stage).toHaveAttribute("data-frameloop", "never");
  await expectIdle(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(stage).toHaveAttribute("data-frameloop", "always");
  await page.getByRole("tab", { name: /^Kết luận/ }).click();
  await expect(stage).toHaveAttribute("data-frameloop", "demand");
  await expectIdle(page);
  await page
    .locator(".lab-space-header")
    .getByRole("button", { name: "2D", exact: true })
    .click();
  await expect(stage).toHaveCount(0);
});
