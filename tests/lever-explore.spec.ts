import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-06-mechanics-bench-explore-spec §9 (D1-1.5): FL-06 Explore opens through the bench registry from a mocked
// `GET /labs` row, logs locally, exports unscored and never creates a run. No API write, no Supabase.
const activity = { id: "pav-lever-fx", key: "lever-explore-fixture-explore", version: 1, digest: "d" };
// Same values as FL06_LEVER_EXPLORE_CONFIG in @nexalab/sim/mechanics (the sim golden test validates that copy);
// only the Lab ID is the fixture's, because lever-equilibrium keeps its Guided release until D-5.
const config = {
  schema: "k5-lever-config/1", labId: "lever-explore-fixture", catalogId: "FL-06", configVersion: 1,
  kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", fixtureId: "lever-bench-reference-v1",
  title: "Moment lực và đòn bẩy", contextLabel: "Vật lý 8 · Khám phá đòn bẩy",
  outcomeSummary: ["Nhận biết tác dụng làm quay của lực qua moment lực M = F × d.", "Tìm điều kiện để đòn bẩy nằm cân bằng."],
  safetyBriefing: { simulation: ["Đây là mô hình lý tưởng: bỏ qua khối lượng thanh và ma sát ở điểm tựa."], realLab: ["Treo quả nặng nhẹ tay, giữ tay và chân tránh xa phía dưới thanh."], acknowledgeRequired: false },
  limitations: ["Thanh cứng, khối lượng thanh được bỏ qua."],
  modes: { explore: true },
  enabledApparatus: [
    { id: "bar", kind: "lever_bar", slot: "bench", labelVi: "Thanh đòn" },
    { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng" },
    { id: "gauge", kind: "spring_gauge", slot: "hook", labelVi: "Lực kế" },
  ],
  weights: { availableMilliNewtons: [500, 1000, 2000], maxCount: 4 },
  initialAttachments: [{ kind: "WEIGHT", positionMillimetres: -100, forceMilliNewtons: 1000 }],
  measurements: ["ruler", "force_labels", "moment_table"],
  pedagogy: { observationPrompts: [{ id: "balance", kind: "free_text", textVi: "Tìm ít nhất hai cách để thanh nằm ngang.", challenge: true }] },
  review: { status: "draft" },
};
const row = (id: string, value: unknown) => ({ id, title: "Moment lực và đòn bẩy", mode: "explore", explore: { ok: true, kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", activity, config: value } });

async function signIn(page: Page, rows: unknown[]) {
  const user = { id: "u-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
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

test("FL-06 Explore opens through the registry, balances the bar, logs locally and creates no run", async ({ page }) => {
  const requests = await signIn(page, [row("lever-explore-fixture", config)]);
  await page.goto("/labs/lever-explore-fixture");
  const dialog = page.getByRole("dialog");
  for (const item of ["Thanh đòn", "Bộ quả nặng", "Lực kế"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);

  const bench = page.getByTestId("lever-explore");
  await expect(bench).toHaveAttribute("data-kit", "k5-lever-bench@1");
  const panel = page.getByRole("complementary", { name: "Bàn cơ" });
  await expect(panel.getByTestId("lever-kit-items").locator("li")).toHaveCount(3);
  await expect(page.locator(".k5-observation")).toContainText("Đầu trái nghiêng xuống");

  // G-02: a 0.5 N gauge at 200 mm balances 1 N at -100 mm.
  await panel.getByLabel("Loại dụng cụ").selectOption("GAUGE");
  await panel.getByLabel("Vị trí (mm)").selectOption("200");
  await panel.getByLabel("Lực (N)").selectOption("500");
  await panel.getByRole("button", { name: "Gắn vào thanh" }).click();
  await expect(page.locator(".k5-observation")).toContainText("Thanh nằm ngang");
  await expect(panel.getByTestId("lever-moment-table")).toContainText("0,1 N·m");
  await expect(panel).toContainText("Tổng bên trái: 0,1 N·m · Tổng bên phải: 0,1 N·m");

  // Out of range actions are blocked with a message and never logged.
  await panel.getByRole("button", { name: "Gắn vào thanh" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Chỉ dùng một lực kế.");

  await page.getByRole("button", { name: /Nhật ký \(1\)/ }).click();
  const log = page.getByTestId("lever-log");
  await expect(log).toContainText("Treo lực kế 0,5 N ở lỗ 200 mm");
  await expect(log).toContainText("Thanh chuyển từ nghiêng trái sang nằm ngang");

  await page.reload();
  await enter(page);
  await page.getByRole("button", { name: /Nhật ký \(1\)/ }).click();
  await expect(page.getByTestId("lever-log")).toContainText("Treo lực kế 0,5 N ở lỗ 200 mm");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "lever-explore-fixture", activityId: activity.id, engine: "lever-bench@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(1);
  expect(requests).toEqual([]);
});

test("a config without the spring gauge hides it, and an invalid config stops the bench", async ({ page }) => {
  const noGauge = { ...config, enabledApparatus: config.enabledApparatus.slice(0, 2) };
  await signIn(page, [row("lever-explore-fixture", noGauge), row("lever-broken", { ...config, labId: "lever-broken", weights: { availableMilliNewtons: [750], maxCount: 4 } })]);
  await page.goto("/labs/lever-explore-fixture");
  await expect(page.getByRole("dialog").getByText("Lực kế", { exact: true })).toHaveCount(0);
  await enter(page);
  const panel = page.getByRole("complementary", { name: "Bàn cơ" });
  await expect(panel.getByTestId("lever-kit-items").locator("li")).toHaveCount(2);
  await expect(panel.getByLabel("Loại dụng cụ")).toHaveCount(0);
  await page.goto("/labs/lever-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("lever-explore-fixture", config)]);
  await page.goto("/labs/lever-explore-fixture");
  await enter(page);
  await expect(page.getByRole("complementary", { name: "Bàn cơ" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
