import { expect, test, type Page } from "@playwright/test";

async function mockApp(page: Page, role: "STUDENT" | "TEACHER" = "STUDENT") {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    let data: any = [];

    if (path === "/auth/refresh") {
      data = {
        user: { id: "test-user", fullName: "Học sinh thử nghiệm", role, grade: 8 },
        accessToken: "mock-session",
      };
    } else if (path === "/labs") {
      data = [
        { id: "circuit", title: "Thắp sáng ý tưởng", learningObjective: "Tự lắp mạch điện", topicCode: "KHTN8-PHYS-01", grade: 8 },
        { id: "eye", title: "Thế giới qua đôi mắt", learningObjective: "Cấu tạo mắt", topicCode: "KHTN8-BIO-01", grade: 8 },
        { id: "chemistry", title: "Những biến đổi kỳ diệu", learningObjective: "Khám phá phản ứng", topicCode: "KHTN8-CHEM-01", grade: 8 },
        { id: "density", title: "Xác định khối lượng riêng", learningObjective: "Cân và đo thể tích", topicCode: "KHTN8-PHYS-02", grade: 8 },
        { id: "em-induction", title: "Cảm ứng điện từ", learningObjective: "Đẩy kéo nam châm", topicCode: "KHTN9-PHYS-01", grade: 9 },
        { id: "mass-conservation", title: "Bảo toàn khối lượng", learningObjective: "Quan sát tạo kết tủa", topicCode: "KHTN8-CHEM-02", grade: 8 },
      ];
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
}

test("top navigation marks the current section and opens the account menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockApp(page, "STUDENT");
  await page.goto("/labs");

  await expect(page.locator(".sidebar")).toHaveCount(0);
  const mainNav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(mainNav).toBeVisible();
  await expect(mainNav.locator("a.active")).toHaveAttribute("href", "/labs");

  await mainNav.getByRole("link", { name: /Bài học/ }).click();
  await expect(page).toHaveURL(/\/lessons$/);
  await expect(mainNav.locator("a.active")).toHaveAttribute("href", "/lessons");

  const trigger = page.getByRole("button", { name: "Mở menu tài khoản" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem", { name: /Đăng xuất/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("students get a bottom tab bar on phones instead of the top links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApp(page, "STUDENT");
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Điều hướng nhanh" })).toBeVisible();
});
test("lab library filters by grade and subject, searches, and resets", async ({ page }) => {
  await mockApp(page, "STUDENT");
  await page.goto("/labs");

  // Initial state should show all 6 labs
  const items = page.locator(".lab-library-item");
  await expect(items).toHaveCount(6);

  // Filter by Grade 9
  await page.getByRole("button", { name: /Lớp 9/ }).click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("Cảm ứng điện từ");

  // Filter by Grade 8
  await page.getByRole("button", { name: /Lớp 8/ }).click();
  await expect(items).toHaveCount(5);
  await expect(page.locator("#lab-circuit")).toBeVisible();
  await expect(page.locator("#lab-mass-conservation")).toBeVisible();

  // Switch back to All grades
  await page.getByRole("button", { name: /Tất cả lớp/ }).click();
  await expect(items).toHaveCount(6);

  // Filter by Chemistry subject
  await page.getByRole("button", { name: /Hóa học/ }).click();
  await expect(items).toHaveCount(2);
  await expect(page.locator("#lab-chemistry")).toBeVisible();
  await expect(page.locator("#lab-mass-conservation")).toBeVisible();

  // Search input: filter for specific term
  const searchInput = page.locator(".lab-search-input");
  await searchInput.fill("Bảo toàn");
  await expect(items).toHaveCount(1);
  await expect(page.locator("#lab-mass-conservation")).toBeVisible();

  // Reset filters
  await page.getByRole("button", { name: /Đặt lại bộ lọc/ }).click();
  await expect(items).toHaveCount(6);
  await expect(searchInput).toHaveValue("");
});
