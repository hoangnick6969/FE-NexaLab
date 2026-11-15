import { expect, test } from "@playwright/test";

// P0 C2.2 / pilot K2 step A: the bench panel "Dụng cụ và thành phần" lists the running config's items via listKitItems.
const CASES = [
  { lab: "fl-13", apparatus: ["Bút đo pH", "Cốc 100 mL", "Giấy quỳ tím"], material: "HCl 0,1 M", hazard: /Nguy hiểm · Ăn mòn/ },
  { lab: "fl-14a", apparatus: ["Kẹp gắp", "Ống nhỏ giọt"], material: "CuSO₄ 0,1 M", hazard: /Độc khi nuốt/ },
  { lab: "fl-10", apparatus: ["Cân điện tử", "Nút cao su", "Bình tam giác"], material: "BaCl₂ 0,1 M", hazard: /Rất nguy hiểm/ },
];

for (const { lab, apparatus, material, hazard } of CASES) {
  test(`${lab}: bench panel lists the same items as the intro`, async ({ page }) => {
    await page.goto(`/dev/lab-kits/k2?lab=${lab}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Vào bàn thí nghiệm" })).toBeVisible();
    const introItems = await dialog.locator(".lab-intro-apparatus b, .lab-intro-materials li > span:first-child").allInnerTexts();
    const ack = dialog.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" });
    if (await ack.count()) await ack.check();
    await dialog.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();

    const toggle = page.getByRole("button", { name: /^Dụng cụ và thành phần/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const panel = page.getByRole("complementary", { name: "Dụng cụ và thành phần" });
    await expect(panel).toBeVisible();
    for (const name of apparatus) await expect(panel.getByText(name, { exact: true }).first()).toBeVisible();
    const row = panel.getByRole("listitem").filter({ hasText: material });
    await expect(row).toContainText(hazard);
    await expect(row).toContainText("Khi làm thật:");

    const panelItems = await panel.locator("li > b").allInnerTexts();
    expect(panelItems.sort()).toEqual(introItems.sort());
    await expect(toggle).toContainText(`(${panelItems.length})`);

    await panel.getByRole("button", { name: "Thu gọn" }).click();
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
  });
}
