import { expect, test, type Page } from "@playwright/test";
import { fl13Config } from "../src/features/labs/chemistry/wet-bench/labs/fl-13.config";
import { fl14aConfig } from "../src/features/labs/chemistry/wet-bench/labs/fl-14a.config";
import { fl16Config } from "../src/features/labs/biology/anatomy/labs/fl-16.config";
import { fl20Config } from "../src/features/labs/biology/ecology/labs/fl-20.config";
import { fl26Config } from "../src/features/labs/biology/genetics/labs/fl-26.config";
import { fl27Config } from "../src/features/labs/biology/molecular/labs/fl-27.config";

// The "Dụng cụ theo bộ Kit" section of /labs: what each Kit has, read from the published Explore benches.
const student = { id: "student-1", username: "student.active", email: null, fullName: "An", role: "STUDENT", grade: 8, mustChangePassword: false };
const admin = { id: "admin-1", username: null, email: "admin@nexalab.local", fullName: "Quản trị", role: "ADMIN", grade: null, mustChangePassword: false };
const teacher = { ...admin, id: "teacher-1", email: "teacher@nexalab.local", fullName: "Giáo viên", role: "TEACHER" };
const activity = { id: "pav-1", key: "k", version: 2, digest: "d" };
const exploreRow = (id: string, title: string, config: unknown) => ({ id, title, mode: "explore", explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity, config } });
const rows = [exploreRow("acid-base-indicators", "Acid – base, chỉ thị và pH", fl13Config), exploreRow("metal-reactivity", "Kim loại tác dụng với acid và muối", fl14aConfig)];

// The Kits sit in a rail at the top of /labs; a click (or hover, or Enter) opens one Kit's list.
async function openKit(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("region", { name })).toBeVisible();
}

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
  // At the top of the page, above the Lab cards, and closed until a Kit is chosen.
  const railTop = await section.evaluate((node) => node.getBoundingClientRect().top);
  const firstCardTop = await page.locator(".lab-library-item").first().evaluate((node) => node.getBoundingClientRect().top);
  expect(railTop).toBeLessThan(firstCardTop);
  await expect(section.getByTestId("kit-group")).toHaveCount(0);
  await expect(section.getByRole("button", { name: /Kit Hóa học/ })).toContainText("19 dụng cụ");
  await openKit(page, "Kit Hóa học");
  const kit = section.getByTestId("kit-group");
  await expect(kit).toHaveCount(1);
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
  // Apparatus and reagent assets are lazy images and never open a 3D viewport.
  const tube = card("test_tube").locator("img");
  await expect(tube).toHaveAttribute("loading", "lazy");
  await expect.poll(() => tube.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);
  await expect(card("HCl_0_1M").locator("img")).toHaveAttribute("loading", "lazy");
  await expect(card("CuSO4_0_1M").locator("img")).toHaveCount(1);
  await expect(card("Zn_granule").locator("img")).toHaveCount(1);
  await expect(kit.locator("canvas")).toHaveCount(0);
  await expect(kit.getByTestId("kit-debug")).toHaveCount(0);

  // The Labs listed under an item open that Lab.
  await card("tongs").getByRole("link", { name: "FL-14a" }).click();
  await expect(page).toHaveURL(/\/labs\/metal-reactivity$/);
});

test("Physics previews cover pressure and lens models and keep each screen on a separate card", async ({ page }) => {
  const row = (catalogId: string, kit: string, items: [string, string][], id = catalogId) => ({
    id, title: catalogId, mode: "explore",
    explore: { ok: true, kit, activity, config: {
      catalogId, display: {}, enabledApparatus: items.map(([id, kind]) => ({ id, kind })),
    } },
  });
  await open(page, student, [
    row("FL-04", "k3-fluid-bench@1", [["tank", "tall_tank"], ["probe", "membrane_probe"], ["pistons", "piston_pair"], ["weights", "weight_set"]]),
    row("FL-08", "k4-thermal-bench@1", [["screen", "wood_screen"]]),
    row("FL-23", "k6-optics-bench@1", [["screen", "screen"], ["table", "measurement_table"], ["speed", "speed_card"]]),
    row("FL-23", "k6-lens-bench@1", [
      ["bench", "optical_bench"], ["lens", "lens"], ["lamp", "object_lamp"],
      ["screen", "screen"], ["loupe", "magnifier"], ["grid", "grid"],
    ], "thin-lens"),
  ]);
  await openKit(page, "Kit Vật lý");
  const physics = page.getByRole("region", { name: "Kit Vật lý" });
  await expect(physics.locator(".kit-card")).toHaveCount(14);
  await expect(physics.locator(".kit-card img")).toHaveCount(11);
  for (const [key, label, lab] of [["wood_screen", "Tấm gỗ dày", "FL-08"], ["screen", "Màn hứng", "FL-23"], ["lens_screen", "Màn hứng ảnh", "thin-lens"]]) {
    const card = physics.locator(`[data-key="${key}"]`);
    await expect(card).toContainText(label);
    await expect(card.getByRole("link")).toHaveAttribute("href", `/labs/${lab}`);
  }
  const tank = physics.locator('[data-key="tank"] img');
  await tank.scrollIntoViewIfNeeded();
  await expect.poll(() => tank.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);
  await expect(physics.locator('[data-key="table"] img')).toHaveCount(0);
  await expect(physics.locator('[data-key="lens_grid"] img')).toHaveCount(0);
  await expect(page.getByTestId("kit-components").locator("canvas")).toHaveCount(0);
});

test("a teacher can open the apparatus catalog from Class Lab", async ({ page }) => {
  const biology = [fl16Config, fl20Config, fl26Config, fl27Config].map((config) => ({
    id: config.labId, title: config.title, mode: "explore",
    explore: { ok: true, kit: config.kit, engine: config.engine, activity, config },
  }));
  await open(page, teacher, [...rows, ...biology]);
  await expect(page).toHaveURL(/\/class-labs$/);
  await page.getByText("Dụng cụ theo Kit", { exact: true }).click();
  const catalog = page.getByTestId("kit-components");
  await expect(catalog.getByRole("heading", { name: "Kit Hóa học" })).toBeVisible();
  await expect(catalog.getByText("Dùng chung giữa các bàn").first()).toBeVisible();
  await expect(catalog.getByText("Dùng chung trong Kit").first()).toBeVisible();
  const bioKit = catalog.getByRole("region", { name: "Kit Sinh học" });
  await expect(bioKit.locator(".kit-card img")).toHaveCount(3);
  const eye = catalog.getByRole("region", { name: "Kit Bổ trợ Explore" }).locator('[data-key="eye-model"] img');
  await expect(eye).toHaveCount(1);
  await expect(bioKit.locator('[data-key="punnett-board"] svg')).toHaveCount(1);
  await expect(bioKit.locator("canvas")).toHaveCount(0);
});

test("?debug=1 shows the renderer and shared item behind each entry", async ({ page }) => {
  await open(page, student, rows, "/labs?debug=1");
  await openKit(page, "Kit Hóa học");
  const kit = page.getByTestId("kit-group");
  await expect(kit.locator('[data-key="beaker_100ml"] [data-testid="kit-debug"]')).toContainText("renderer: beaker_100ml · item chung: beaker");
  await expect(kit.locator('[data-key="test_tube"] [data-testid="kit-debug"]')).toContainText("renderer: test_tube · riêng của bàn");
  await expect(kit).toContainText("bàn: k2-wet-bench@1");
});

test("an admin sees the ids without asking", async ({ page }) => {
  await open(page, admin, rows);
  await openKit(page, "Kit Hóa học");
  await expect(page.getByTestId("kit-debug").first()).toBeVisible();
});

test("nothing is shown while no Explore lab is published", async ({ page }) => {
  await open(page, student, [{ id: "circuit", title: "Mạch điện", mode: "guided" }]);
  await expect(page.getByRole("heading", { name: "Phòng thí nghiệm" }).first()).toBeVisible();
  await expect(page.getByTestId("kit-components")).toHaveCount(0);
});

test("the Kit rail opens on hover and keyboard, and closes on Escape or a click outside", async ({ page }) => {
  await open(page, student, rows);
  const button = page.getByRole("button", { name: /Kit Hóa học/ });
  const panel = page.getByRole("region", { name: "Kit Hóa học" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  // Hover previews, and leaving closes it again.
  await button.hover();
  await expect(panel).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("heading", { name: "Phòng thí nghiệm" }).first().hover();
  await expect(panel).toBeHidden();
  // Keyboard: Enter opens, Escape closes and keeps focus on the button.
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  // Click pins it open (the pointer can leave); a click elsewhere closes it.
  await button.click();
  await page.getByRole("heading", { name: "Phòng thí nghiệm" }).first().hover();
  await expect(panel).toBeVisible();
  await page.getByRole("heading", { name: "Phòng thí nghiệm" }).first().click();
  await expect(panel).toBeHidden();
});
