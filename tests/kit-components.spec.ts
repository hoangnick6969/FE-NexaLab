import { expect, test, type Page } from "@playwright/test";
import { fl13Config } from "../src/features/labs/chemistry/wet-bench/labs/fl-13.config";
import { fl14aConfig } from "../src/features/labs/chemistry/wet-bench/labs/fl-14a.config";

// The "Dụng cụ theo bộ Kit" section of /labs: what each Kit has, read from the published Explore benches.
const student = { id: "student-1", username: "student.active", email: null, fullName: "An", role: "STUDENT", grade: 8, mustChangePassword: false };
const admin = { id: "admin-1", username: null, email: "admin@nexalab.local", fullName: "Quản trị", role: "ADMIN", grade: null, mustChangePassword: false };
const teacher = { ...admin, id: "teacher-1", email: "teacher@nexalab.local", fullName: "Giáo viên", role: "TEACHER" };
const activity = { id: "pav-1", key: "k", version: 2, digest: "d" };
const exploreRow = (id: string, title: string, config: unknown) => ({ id, title, mode: "explore", explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity, config } });
const rows = [exploreRow("acid-base-indicators", "Acid – base, chỉ thị và pH", fl13Config), exploreRow("metal-reactivity", "Kim loại tác dụng với acid và muối", fl14aConfig)];

async function open(page: Page, user: typeof student | typeof admin, labs: unknown[], path = "/labs") {
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...user, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: labs }));
  await page.goto(path);
}

test("a student sees each Kit's apparatus and reagents, which Labs use them, and no internal ids", async ({ page }) => {
  await open(page, student, rows);
  const section = page.getByTestId("kit-components");
  await expect(section.getByRole("heading", { name: "Dụng cụ theo bộ Kit" })).toBeVisible();
  const kit = section.getByTestId("kit-group");
  await expect(kit).toHaveCount(1);
  await expect(kit.getByRole("heading", { name: "Kit Hóa học" })).toBeVisible();
  await expect(kit).toContainText("2 bài");
  await expect(kit.getByRole("heading", { name: /^Dụng cụ đo/ })).toBeVisible();

  // One card per kind, named after the kind, not after one Lab's instance ("Ống nghiệm", not "Ống nghiệm × 6").
  const card = (key: string) => kit.locator(`[data-testid="kit-card"][data-key="${key}"]`);
  await expect(card("test_tube")).toContainText("Ống nghiệm");
  await expect(card("test_tube")).not.toContainText("×");
  await expect(card("dropper_pipette")).toContainText("Dùng ở: FL-13 · FL-14a");
  await expect(card("litmus_strip_dispenser")).toContainText("Dùng ở: FL-13");
  await expect(card("litmus_strip_dispenser")).not.toContainText("FL-14a");
  await expect(card("tongs")).toContainText("Dùng ở: FL-14a");
  await expect(card("digital_ph_meter")).toBeVisible();
  // Not used by any published Explore lab yet.
  await expect(card("electronic_scale")).toHaveCount(0);

  await expect(card("beaker_100ml")).toContainText("Dùng chung giữa các bàn");
  await expect(card("dropper_pipette")).toContainText("Dùng chung trong Kit");
  await expect(card("tongs")).not.toContainText("Dùng chung");
  // Reagents carry their hazard and the same list as the bench.
  await expect(card("HCl_0_1M")).toContainText("Dùng ở: FL-13 · FL-14a");
  await expect(card("HCl_0_1M")).toContainText("Ăn mòn");
  // Apparatus assets are lazy images. Reagents retain their icon and do not open a 3D viewport.
  const tube = card("test_tube").locator("img");
  await expect(tube).toHaveAttribute("loading", "lazy");
  await expect.poll(() => tube.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);
  await expect(card("HCl_0_1M").locator("svg")).toHaveCount(1);
  await expect(kit.locator("canvas")).toHaveCount(0);
  await expect(kit.getByTestId("kit-debug")).toHaveCount(0);

  // The Labs listed under an item open that Lab.
  await card("tongs").getByRole("link", { name: "FL-14a" }).click();
  await expect(page).toHaveURL(/\/labs\/metal-reactivity$/);
});

test("a teacher can open the apparatus catalog from Class Lab", async ({ page }) => {
  await open(page, teacher, rows);
  await expect(page).toHaveURL(/\/class-labs$/);
  await page.getByText("Dụng cụ theo Kit", { exact: true }).click();
  const catalog = page.getByTestId("kit-components");
  await expect(catalog.getByRole("heading", { name: "Kit Hóa học" })).toBeVisible();
  await expect(catalog.getByText("Dùng chung giữa các bàn").first()).toBeVisible();
  await expect(catalog.getByText("Dùng chung trong Kit").first()).toBeVisible();
});

test("?debug=1 shows the renderer and shared item behind each entry", async ({ page }) => {
  await open(page, student, rows, "/labs?debug=1");
  const kit = page.getByTestId("kit-group");
  await expect(kit.locator('[data-key="beaker_100ml"] [data-testid="kit-debug"]')).toContainText("renderer: beaker_100ml · item chung: beaker");
  await expect(kit.locator('[data-key="test_tube"] [data-testid="kit-debug"]')).toContainText("renderer: test_tube · riêng của bàn");
  await expect(kit).toContainText("bàn: k2-wet-bench@1");
});

test("an admin sees the ids without asking", async ({ page }) => {
  await open(page, admin, rows);
  await expect(page.getByTestId("kit-debug").first()).toBeVisible();
});

test("nothing is shown while no Explore lab is published", async ({ page }) => {
  await open(page, student, [{ id: "circuit", title: "Mạch điện", mode: "guided" }]);
  await expect(page.getByRole("heading", { name: "Phòng thí nghiệm" }).first()).toBeVisible();
  await expect(page.getByTestId("kit-components")).toHaveCount(0);
});
