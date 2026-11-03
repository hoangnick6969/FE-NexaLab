import { expect, test } from "@playwright/test";

test("K3 development preview exposes shared kit apparatus, camera presets and telemetry", async ({ page }) => {
  await page.goto("/dev/lab-kits/k3");
  await expect(page.getByRole("heading", { name: "Bàn chất lỏng K3, xem trước" })).toBeVisible();
  await page.locator(".k3-hud").evaluate((hud) => { hud.scrollTop = hud.scrollHeight; });
  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eye-level Meniscus" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dynamometer Close-up" })).toBeVisible();
  await expect(page.getByText(/Lực kế minh họa/)).toBeVisible();
  await expect(page.locator(".k3-formula .katex")).toBeVisible();

  await page.getByRole("tab", { name: "Sỏi" }).click();
  await page.getByRole("button", { name: "Thả sỏi vào ống đong" }).click();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("ống đong: 62 mL");
  await expect(page.getByRole("button", { name: "Lấy sỏi ra" })).toBeVisible();
});

test("K3 keeps the same live WebGL canvas and simulation values across 2D/3D and responsive widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/lab-kits/k3");
  await expect(page.getByRole("heading", { name: "Bàn chất lỏng K3, xem trước" })).toBeVisible();
  await page.locator(".k3-hud").evaluate((hud) => { hud.scrollTop = hud.scrollHeight; });
  await page.getByRole("button", { name: "Nhúng mẫu vào bình" }).click();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("Cân: 0,0 g");

  const canvas = page.locator(".physics-stage canvas");
  await expect(canvas).toHaveCount(1);
  await page.evaluate(() => {
    (window as typeof window & { __k3CanvasBefore?: HTMLCanvasElement }).__k3CanvasBefore = document.querySelector(".physics-stage canvas") as HTMLCanvasElement;
  });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".k3-preview-2d")).toBeVisible();
  await expect(canvas).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __k3CanvasBefore?: HTMLCanvasElement }).__k3CanvasBefore === document.querySelector(".physics-stage canvas"))).toBe(true);
  await expect(page.getByRole("button", { name: "Nhúng mẫu vào bình" })).toHaveCount(0);
  await expect(page.locator(".k3-telemetry")).toContainText(/V chìm: [1-9]/);

  for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.locator(".k3-hud").evaluate((hud) => {
      const tabs = hud.querySelector(".k3-stations")!;
      const hudRect = hud.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        hudRight: hudRect.right,
        tabsClientWidth: tabs.clientWidth,
        tabsScrollWidth: tabs.scrollWidth,
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.hudRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.tabsScrollWidth).toBeLessThanOrEqual(layout.tabsClientWidth + 1);
  }

  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".k3-preview-2d")).toBeHidden();
  await expect(canvas).toHaveCount(1);
  await expect(page.locator(".physics-stage")).toHaveCSS("visibility", "visible");
  await expect(page.locator(".k3-telemetry")).toContainText(/V chìm: [1-9]/);
});
