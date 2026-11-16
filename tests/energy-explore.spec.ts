import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-24-mechanical-energy-explore-spec §9 (D1-3.2): FL-24 Explore opens through the bench registry from a mocked `GET /labs`
// row, shows the pendulum energy bars (G-02, G-03) and the hoist work and power (G-07), logs locally, exports unscored and never creates a run.
const activity = { id: "pav-energy-fx", key: "mechanical-energy-explore", version: 1, digest: "d" };
// Same values as FL24_ENERGY_EXPLORE_CONFIG in @nexalab/sim/mechanics/energy (the sim golden test validates that copy).
const config = {
  schema: "k5-energy-config/1", labId: "mechanical-energy", catalogId: "FL-24", configVersion: 1,
  kit: "k5-energy-bench@1", engine: "mechanical-energy@1.0.0",
  title: "Cơ năng, công và công suất", contextLabel: "Vật lý 9 · Khám phá năng lượng cơ học",
  outcomeSummary: ["Viết được biểu thức động năng, thế năng gần mặt đất; cơ năng là tổng động năng và thế năng.", "Tính được công A = F·s và công suất P = A/t trong trường hợp đơn giản."],
  safetyBriefing: { simulation: ["Đây là mô hình lý tưởng: không có ma sát và lực cản không khí, nên cơ năng không đổi."], realLab: ["Không đứng dưới vật đang được kéo lên."], acknowledgeRequired: false },
  limitations: ["Bỏ qua ma sát và lực cản không khí: cơ năng của con lắc được bảo toàn."],
  modes: { explore: true },
  weight: { milliNewtonsPerGram: 10 },
  stations: ["pendulum", "hoist"],
  pendulum: { massesG: [100, 200, 300, 400, 500], lengthMm: 600, maxDropHeightMm: 300, heightStepMm: 10 },
  hoist: {
    massesG: [200, 500, 1000, 2000], minDistanceMm: 100, maxDistanceMm: 1000, distanceStepMm: 100,
    motors: [{ id: "slow", labelVi: "Động cơ chậm", speedMmPerS: 125 }, { id: "fast", labelVi: "Động cơ nhanh", speedMmPerS: 250 }],
  },
  display: { energyReadings: false },
  enabledApparatus: [
    { id: "pendulum", kind: "pendulum", slot: "bench", labelVi: "Con lắc đơn" },
    { id: "bars", kind: "energy_bars", slot: "board", labelVi: "Thanh năng lượng" },
    { id: "hoist", kind: "hoist", slot: "bench", labelVi: "Tời kéo vật" },
    { id: "gauge", kind: "spring_gauge", slot: "hoist", labelVi: "Lực kế" },
    { id: "ruler", kind: "ruler", slot: "hoist", labelVi: "Thước đo độ cao" },
    { id: "clock", kind: "stopwatch", slot: "tray", labelVi: "Đồng hồ bấm giây" },
  ],
  measurements: ["height_ruler", "force_gauge", "stopwatch"],
  pedagogy: { observationPrompts: [{ id: "transform", kind: "free_text", textVi: "Động năng và thế năng thay đổi thế nào?" }] },
  review: { status: "draft" },
};
const row = (id: string, value: unknown) => ({ id, title: "Cơ năng, công và công suất", mode: "explore", explore: { ok: true, kit: "k5-energy-bench@1", engine: "mechanical-energy@1.0.0", activity, config: value } });

async function signIn(page: Page, rows: unknown[]) {
  const user = { id: "u-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 9, mustChangePassword: false };
  const requests: string[] = [];
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) requests.push(request.url()); });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...user, emailVerifiedAt: null, createdAt: new Date().toISOString(),
    avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: rows }));
  return requests;
}
const enter = (page: Page) => page.getByRole("dialog").getByRole("button", { name: /Vào bàn thí nghiệm|Quay lại bàn thí nghiệm/ }).click();
const panelOf = (page: Page) => page.getByRole("complementary", { name: "Bàn năng lượng cơ học" });
const bar = (page: Page, kind: string) => panelOf(page).getByTestId("energy-bars").locator(`[data-kind="${kind}"]`);

test("FL-24 Explore opens through the registry, shows the pendulum energy and hoist power, logs locally and creates no run", async ({ page }) => {
  test.setTimeout(120_000);
  const requests = await signIn(page, [row("mechanical-energy", config)]);
  await page.goto("/labs/mechanical-energy");
  const dialog = page.getByRole("dialog");
  for (const item of ["Con lắc đơn", "Thanh năng lượng", "Tời kéo vật", "Lực kế"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);

  await expect(page.getByTestId("energy-explore")).toHaveAttribute("data-kit", "k5-energy-bench@1");
  const panel = panelOf(page);
  await expect(panel.getByTestId("energy-kit-items").locator("li")).toHaveCount(6);

  // G-01: m 200 g from h₀ 300 mm, at the release point. Scale is 500 g · 300 mm = 1 500 mJ, so 600 mJ fills 40 %.
  await expect(panel.getByTestId("energy-height")).toHaveText("300 mm");
  await expect(bar(page, "potential")).toHaveAttribute("data-percent", "40");
  await expect(bar(page, "kinetic")).toHaveAttribute("data-percent", "0");
  // Numbers stay hidden by default (Q-2).
  await expect(panel.getByTestId("energy-bars")).not.toContainText("J");

  // G-02: halfway down, Wt = Wđ = 300 mJ, W unchanged.
  await panel.getByRole("group", { name: "Mốc của con lắc" }).getByRole("button", { name: "Giữa (xuống)" }).click();
  await expect(panel.getByTestId("energy-height")).toHaveText("150 mm");
  await expect(bar(page, "potential")).toHaveAttribute("data-percent", "20");
  await expect(bar(page, "kinetic")).toHaveAttribute("data-percent", "20");
  await expect(bar(page, "mechanical")).toHaveAttribute("data-percent", "40");
  // G-03: the lowest point, all kinetic.
  await panel.getByRole("group", { name: "Mốc của con lắc" }).getByRole("button", { name: "Thấp nhất" }).click();
  await expect(panel.getByTestId("energy-height")).toHaveText("0 mm");
  await expect(bar(page, "potential")).toHaveAttribute("data-percent", "0");
  await expect(bar(page, "kinetic")).toHaveAttribute("data-percent", "40");
  // G-04: back up to exactly h₀ on the far side.
  await panel.getByRole("group", { name: "Mốc của con lắc" }).getByRole("button", { name: "Bên kia" }).click();
  await expect(panel.getByTestId("energy-height")).toHaveText("300 mm");
  // G-05 shape: doubling the mass doubles W.
  await panel.getByRole("group", { name: "Quả nặng" }).getByRole("button", { name: "400 g" }).click();
  await expect(bar(page, "mechanical")).toHaveAttribute("data-percent", "80");

  // Station 2, G-06 and G-07: 1 kg lifted 500 mm by each motor.
  await panel.getByRole("tab", { name: /Tời kéo vật/ }).click();
  await expect(page.getByTestId("energy-explore")).toHaveAttribute("data-station", "hoist");
  const readings = panel.getByTestId("energy-hoist-readings");
  await expect(readings.locator('[data-reading="force"] td')).toHaveText("—");
  await panel.getByRole("button", { name: "Kéo vật" }).click();
  await expect(readings.locator('[data-reading="force"] td')).toHaveText("10 N");
  await expect(readings.locator('[data-reading="distance"] td')).toHaveText("500 mm (0,5 m)");
  await expect(readings.locator('[data-reading="time"] td')).toHaveText("4 s");
  await expect(panel.getByTestId("energy-hoist-result")).toHaveCount(0);
  await panel.getByLabel("Công A em tính (J)").fill("5");
  await panel.getByLabel("Công suất P em tính (W)").fill("1,25");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("energy-hoist-result")).toHaveText("A = 5 J · P = 1,25 W");

  await panel.getByRole("group", { name: "Động cơ" }).getByRole("button", { name: "Động cơ nhanh" }).click();
  await panel.getByRole("button", { name: "Kéo vật" }).click();
  await expect(readings.locator('[data-reading="time"] td')).toHaveText("2 s");
  await panel.getByLabel("Công suất P em tính (W)").fill("1,25");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("energy-hoist-result")).toHaveText("A = 5 J · P = 2,5 W");
  await expect(panel.getByTestId("energy-power-compare")).toHaveAttribute("data-compare", "second");
  await expect(panel.getByTestId("energy-power-compare")).toContainText("cùng công 5 J; Động cơ nhanh có công suất lớn hơn");

  const logButton = page.getByRole("button", { name: /Nhật ký \(\d+\)/ });
  await logButton.click();
  const log = page.getByTestId("energy-log");
  await expect(log).toContainText("Xem con lắc ở giữa đường đi xuống (độ cao 150 mm)");
  await expect(log).toContainText("Ở điểm thấp nhất động năng lớn nhất, thế năng bằng 0");
  await expect(log).toContainText("Con lắc lên tới đúng 300 mm, bằng độ cao thả");
  await expect(log).toContainText("Tời kéo vật 1000 g lên 500 mm bằng động cơ chậm");
  await expect(log).toContainText("Công em tính khớp mô hình; công suất em tính khớp mô hình");
  await expect(log).toContainText("công suất em tính chưa khớp mô hình");
  const count = Number((await logButton.textContent())!.match(/\((\d+)\)/)![1]);

  await page.reload();
  await enter(page);
  await expect(page.getByRole("button", { name: `Nhật ký (${count})` })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "mechanical-energy", activityId: activity.id, engine: "mechanical-energy@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(count);
  expect(requests).toEqual([]);
});

test("a pendulum-only config lists two items and has no tabs, readings show numbers and feed the motor comparison, and an invalid config stops the bench", async ({ page }) => {
  const pendulumOnly = { ...config, stations: ["pendulum"], hoist: undefined, display: { energyReadings: true },
    enabledApparatus: config.enabledApparatus.filter((item) => ["pendulum", "energy_bars"].includes(item.kind)) };
  const hoistOnly = { ...config, labId: "energy-hoist", stations: ["hoist"], pendulum: undefined, display: { energyReadings: true },
    enabledApparatus: config.enabledApparatus.filter((item) => ["hoist", "spring_gauge", "ruler", "stopwatch"].includes(item.kind)) };
  const broken = { ...config, labId: "energy-broken", modes: { explore: true, guided: true } };
  await signIn(page, [row("mechanical-energy", pendulumOnly), row("energy-hoist", hoistOnly), row("energy-broken", broken)]);
  await page.goto("/labs/mechanical-energy");
  await enter(page);
  const panel = panelOf(page);
  await expect(panel.getByTestId("energy-kit-items").locator("li")).toHaveCount(2);
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await expect(bar(page, "potential")).toContainText("0,6 J");

  // With readings on, the result shows right after the pull (no "Kiểm tra") and both pulls feed the comparison.
  await page.goto("/labs/energy-hoist");
  await enter(page);
  await expect(panel.getByRole("button", { name: "Kiểm tra" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Kéo vật" }).click();
  await expect(panel.getByTestId("energy-hoist-result")).toHaveText("A = 5 J · P = 1,25 W");
  await panel.getByRole("group", { name: "Động cơ" }).getByRole("button", { name: "Động cơ nhanh" }).click();
  await panel.getByRole("button", { name: "Kéo vật" }).click();
  await expect(panel.getByTestId("energy-power-compare")).toHaveAttribute("data-compare", "second");
  // An owner-reviewed config opens without the technical-assumption notice.
  const reviewed = { ...config, labId: "energy-reviewed", review: { status: "reviewed", notes: "Owner duyệt" } };
  await page.route("**/api/labs", (route) => route.fulfill({ json: [row("energy-reviewed", reviewed)] }));
  await page.goto("/labs/energy-reviewed");
  await expect(page.getByRole("dialog").getByText("Con lắc đơn", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/giả định kỹ thuật/)).toHaveCount(0);
  await page.route("**/api/labs", (route) => route.fulfill({ json: [row("energy-broken", broken)] }));
  await page.goto("/labs/energy-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("2D shows the same state as 3D, and reduced motion keeps the bench usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, [row("mechanical-energy", config)]);
  await page.goto("/labs/mechanical-energy");
  await enter(page);
  const panel = panelOf(page);
  await panel.getByRole("button", { name: "Thả con lắc" }).click();
  // Reduced motion walks the five checkpoints quickly and stops on the far side.
  await expect(panel.getByTestId("energy-height")).toHaveText("300 mm");
  await expect(panel.getByRole("group", { name: "Mốc của con lắc" }).getByRole("button", { name: "Bên kia" })).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await panel.getByRole("group", { name: "Mốc của con lắc" }).getByRole("button", { name: "Thấp nhất" }).click();
  await expect(page.getByTestId("energy-2d").getByRole("img")).toHaveAttribute("aria-label", /Con lắc ở điểm thấp nhất, độ cao 0 mm, quả nặng 200 g/);
  await panel.getByRole("tab", { name: /Tời kéo vật/ }).click();
  await panel.getByRole("button", { name: "Kéo vật" }).click();
  await expect(page.getByTestId("energy-2d").getByRole("img")).toHaveAttribute("aria-label", /Tời đã kéo vật 1000 g lên 500 mm bằng động cơ chậm/);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(panel.getByTestId("energy-hoist-readings").locator('[data-reading="force"] td')).toHaveText("10 N");
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("mechanical-energy", config)]);
  await page.goto("/labs/mechanical-energy");
  await enter(page);
  await expect(panelOf(page)).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
