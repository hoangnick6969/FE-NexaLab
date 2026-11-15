import { expect, test } from "@playwright/test";

// FL-07 on the dev fixture (no API, no learning evidence): the shared question panel with native radio choices
// carries the whole notebook, and the view toggle sits in the Lab Space header (SPEC-lab-space-shared-ui).
const student = { id: "student-1", username: "student.active", fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };

test("FL-07 thermal notebook runs end to end in the shared question panel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.goto("/dev/lab-kits/thermal-energy");

  const panel = page.locator("#thermal-questions");
  await expect(panel.getByRole("heading", { name: "Năng lượng nhiệt" })).toBeVisible();
  await expect(page.locator(".lab-space-header").getByRole("group", { name: "Chế độ hiển thị mô phỏng" })).toBeVisible();
  const group = (name: string) => panel.getByRole("group", { name, exact: true });
  const record = panel.getByRole("button", { name: "Ghi dự đoán" });
  await expect(record).toBeDisabled();
  await group("Dự đoán chiều đổi nhiệt độ").getByRole("radio", { name: "Tăng" }).check();
  await record.click();
  await panel.getByRole("button", { name: "Đun đến 50 s" }).click();
  const fill = async (values: [string, string, string]) => {
    await panel.getByLabel("Điện năng E (J)").fill(values[0]);
    await panel.getByLabel("Nhiệt độ T (°C)").fill(values[1]);
    await panel.getByLabel("Độ tăng ΔT (°C)").fill(values[2]);
    await panel.getByRole("button", { name: "Ghi số đo" }).click();
  };
  await fill(["2100", "30,0", "5,0"]);
  await group("Dự đoán quan hệ hai độ tăng nhiệt độ").getByRole("radio", { name: "Gấp đôi", exact: true }).check();
  await record.click();
  await fill(["4200", "35,0", "10,0"]);
  await group("Theo bảng, ΔT ở 100 s so với ở 50 s").getByRole("radio", { name: "Gấp đôi", exact: true }).check();
  await group("Khi nào nhiệt lượng mẫu bằng điện năng joulemeter?").getByRole("radio", { name: "Trong nhiệt lượng kế lý tưởng của mô hình" }).check();
  await panel.getByRole("button", { name: "Ghi kết luận" }).click();
  await page.screenshot({ path: "test-results/fl07-thermal-panel.png" });
  await panel.getByRole("button", { name: "Nộp bài" }).click();
  await expect(panel.getByText("Hoàn thành fixture UI")).toBeVisible();

  // Esc inside the panel collapses it and returns focus to its badge.
  await panel.getByRole("button", { name: "Lượt mới" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".thermal-question-badge")).toBeFocused();
});
