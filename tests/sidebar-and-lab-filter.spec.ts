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

test("sidebar collapses and expands with toggle button and persists in localStorage", async ({ page }) => {
  await mockApp(page, "STUDENT");
  await page.goto("/labs");

  const appShell = page.locator(".app-shell");
  const sidebar = page.locator(".sidebar");
  const sidebarToggle = page.locator(".sidebar-toggle-btn");
  const topbarToggle = page.locator(".topbar-sidebar-toggle");

  await expect(sidebar).toBeVisible();
  await expect(appShell).not.toHaveClass(/sidebar-collapsed/);
  await expect(sidebar).not.toHaveClass(/is-collapsed/);

  // Click collapse button on sidebar
  await sidebarToggle.click();
  await expect(appShell).toHaveClass(/sidebar-collapsed/);
  await expect(sidebar).toHaveClass(/is-collapsed/);

  // Verify localStorage updated
  const storedValue = await page.evaluate(() => localStorage.getItem("nexalab:sidebar-collapsed"));
  expect(storedValue).toBe("true");

  // Click expand button on topbar
  await topbarToggle.click();
  await expect(appShell).not.toHaveClass(/sidebar-collapsed/);
  await expect(sidebar).not.toHaveClass(/is-collapsed/);

  const storedValueExpanded = await page.evaluate(() => localStorage.getItem("nexalab:sidebar-collapsed"));
  expect(storedValueExpanded).toBe("false");
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
