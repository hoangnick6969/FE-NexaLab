import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-08-heat-transfer-explore-spec §9 (D1-3.2): FL-08 Explore opens through the bench registry from a mocked `GET /labs`
// row, follows the three SGK Bài 28 stations on simulated clocks, logs locally, exports unscored and never creates a run.
const activity = { id: "pav-thermal-fx", key: "heat-transfer-explore", version: 1, digest: "d" };
// Same values as FL08_HEAT_TRANSFER_EXPLORE_CONFIG in @nexalab/sim/thermal (the sim golden test validates that copy).
const config = {
  schema: "k4-thermal-config/1", labId: "heat-transfer", catalogId: "FL-08", configVersion: 1,
  kit: "k4-thermal-bench@1", engine: "heat-transfer@1.0.0",
  title: "Sự truyền nhiệt", contextLabel: "Vật lý 8 · Khám phá sự truyền nhiệt",
  outcomeSummary: ["Quan sát và mô tả sự truyền năng lượng trong dẫn nhiệt, đối lưu và bức xạ nhiệt.", "So sánh vật dẫn nhiệt tốt và vật cách nhiệt tốt theo Bảng 28.1."],
  safetyBriefing: { simulation: ["Thời gian trong mô phỏng là minh hoạ; mô hình bỏ qua mất nhiệt ra môi trường."], realLab: ["Đèn cồn: tắt bằng cách đậy nắp, không thổi."], acknowledgeRequired: false },
  limitations: ["Thời điểm đinh rơi tính theo khả năng dẫn nhiệt ở Bảng 28.1."],
  modes: { explore: true },
  stations: ["conduction", "convection", "radiation"],
  clock: { maxSeconds: 600, speeds: [1, 10, 30] },
  conduction: { rodLengthMm: 300, pinPositionsMm: [50, 100, 150, 200, 250], materials: ["copper", "aluminium", "steel", "glass", "wood"], maxRods: 3, timeConstant: 16 },
  convection: { tubes: [{ id: "1", wax: "bottom" }, { id: "2", wax: "top" }], meltSeconds: 40, dye: true },
  radiation: { startTenthsC: 250, riseTenthsC: 80, tauSeconds: 60, absorptance: { black: 100, silver: 25 } },
  enabledApparatus: [
    { id: "rack", kind: "rod_rack", slot: "bench", labelVi: "Giá ba thanh dẫn nhiệt" },
    { id: "lamp", kind: "spirit_lamp", slot: "bench", labelVi: "Đèn cồn" },
    { id: "tubes", kind: "test_tubes", slot: "stand", labelVi: "Hai ống nghiệm có sáp" },
    { id: "dye", kind: "dye_flask", slot: "stand", labelVi: "Bình nước và thuốc tím" },
    { id: "bulb", kind: "heat_lamp", slot: "bench", labelVi: "Đèn dây tóc" },
    { id: "flask", kind: "coated_flask", slot: "stand", labelVi: "Bình thuỷ tinh phủ màu" },
    { id: "screen", kind: "wood_screen", slot: "bench", labelVi: "Tấm gỗ dày" },
    { id: "thermometer", kind: "thermometer", slot: "flask", labelVi: "Nhiệt kế" },
    { id: "stopwatch", kind: "stopwatch", slot: "bench", labelVi: "Đồng hồ bấm giây" },
  ],
  measurements: ["stopwatch", "thermometer", "conductivity_table"],
  pedagogy: { observationPrompts: [{ id: "pins", kind: "free_text", textVi: "Các đinh rơi theo thứ tự nào?" }] },
  review: { status: "draft" },
};
const row = (id: string, value: unknown) => ({ id, title: "Sự truyền nhiệt", mode: "explore", explore: { ok: true, kit: "k4-thermal-bench@1", engine: "heat-transfer@1.0.0", activity, config: value } });

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
/** Skips one station's clock to the end of the 600 s window (the skip button locks there). */
async function skipToEnd(page: Page, clock: string) {
  const panel = page.getByRole("complementary", { name: "Bàn nhiệt" });
  const seconds = panel.getByTestId(`${clock}-seconds`);
  while ((await seconds.textContent()) !== "600 s") await panel.getByTestId(clock).getByRole("button", { name: /Tua thêm 60 s/ }).click();
}
const pinCells = (page: Page, material: string) => page.getByTestId("thermal-pins").locator(`tr[data-rod="${material}"] td[data-dropped="true"]`);

test("FL-08 Explore opens through the registry, runs the three SGK stations, logs locally and creates no run", async ({ page }) => {
  // Three stations and more than twenty clock skips with the 3D bench rendering: longer than the default 60 s.
  test.setTimeout(180_000);
  const requests = await signIn(page, [row("heat-transfer", config)]);
  await page.goto("/labs/heat-transfer");
  const dialog = page.getByRole("dialog");
  for (const item of ["Giá ba thanh dẫn nhiệt", "Hai ống nghiệm có sáp", "Đèn dây tóc", "Nhiệt kế"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);

  await expect(page.getByTestId("thermal-explore")).toHaveAttribute("data-kit", "k4-thermal-bench@1");
  const panel = page.getByRole("complementary", { name: "Bàn nhiệt" });
  await expect(panel.getByTestId("thermal-kit-items").locator("li")).toHaveCount(9);

  // Station 1, G-02: copper, aluminium and steel lit together; 120 s later steel has dropped a and b only.
  await expect(panel.getByRole("button", { name: /Tua thêm 60 s/ })).toBeDisabled();
  await panel.getByRole("button", { name: "Đốt đầu A" }).click();
  await panel.getByRole("button", { name: "Dừng" }).click();
  await panel.getByTestId("clock-conduction").getByRole("button", { name: "×1", exact: true }).click();
  // Stop the clock at the next 60 s boundary: reset and skip twice, so the time is exact.
  await panel.getByLabel("Giá 1").selectOption("copper");
  await panel.getByLabel("Giá 3").selectOption("glass");
  await panel.getByLabel("Giá 3").selectOption("steel");
  await expect(panel.getByTestId("clock-conduction-seconds")).toHaveText("0 s");
  await panel.getByRole("button", { name: "Đốt đầu A" }).click();
  await panel.getByRole("button", { name: "Dừng" }).click();
  const start = Number((await panel.getByTestId("clock-conduction-seconds").textContent())!.replace(" s", ""));
  expect(start).toBeLessThan(3);
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await expect(pinCells(page, "copper")).toHaveCount(5);
  await expect(pinCells(page, "aluminium")).toHaveCount(5);
  await expect(pinCells(page, "steel")).toHaveCount(2);
  await expect(page.getByTestId("thermal-pins").locator('tr[data-rod="copper"] td').first()).toHaveText("2 s");
  await panel.getByText("Bảng 28.1 · Khả năng dẫn nhiệt so với không khí").click();
  await expect(panel.getByTestId("thermal-k-table")).toContainText("17.370");

  // G-03: a glass rod drops nothing in the whole 600 s window.
  await panel.getByLabel("Giá 3").selectOption("glass");
  await panel.getByRole("button", { name: "Đốt đầu A" }).click();
  await panel.getByRole("button", { name: "Dừng" }).click();
  await skipToEnd(page, "clock-conduction");
  await expect(pinCells(page, "glass")).toHaveCount(0);

  // Station 2, G-05 and G-06.
  await panel.getByRole("tab", { name: "Đối lưu" }).click();
  await panel.getByRole("group", { name: /Ống \(1\)/ }).getByRole("button", { name: "Đun gần miệng" }).click();
  await panel.getByRole("group", { name: /Ống \(2\)/ }).getByRole("button", { name: "Đun dưới đáy" }).click();
  await panel.getByTestId("clock-convection").getByRole("button", { name: "×1", exact: true }).click();
  await panel.getByRole("button", { name: "Bắt đầu đun" }).click();
  await panel.getByRole("button", { name: "Dừng" }).click();
  await expect(panel.getByTestId("thermal-tubes").locator('li[data-tube="2"]')).toHaveAttribute("data-melted", "false");
  await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await expect(panel.getByTestId("thermal-tubes").locator('li[data-tube="2"]')).toHaveAttribute("data-melted", "true");
  await skipToEnd(page, "clock-convection");
  await expect(panel.getByTestId("thermal-tubes").locator('li[data-tube="1"]')).toHaveAttribute("data-melted", "false");

  // Station 3, G-07 to G-09: black flask lit 60 s, then the wood screen brings it down.
  await panel.getByRole("tab", { name: "Bức xạ nhiệt" }).click();
  await expect(panel.getByTestId("thermal-thermometer")).toHaveText("25,0 °C");
  await panel.getByRole("button", { name: "Bật đèn" }).click();
  await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await expect(panel.getByTestId("thermal-thermometer")).toHaveText("30,1 °C");
  await panel.getByRole("button", { name: "Đặt tấm gỗ chắn" }).click();
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await expect(panel.getByTestId("thermal-thermometer")).toHaveText("25,7 °C");
  await panel.getByRole("button", { name: "Làm lại trạm bức xạ" }).click();
  await panel.getByRole("button", { name: "Tráng bạc" }).click();
  await panel.getByRole("button", { name: "Bật đèn" }).click();
  await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await expect(panel.getByTestId("thermal-thermometer")).toHaveText("26,3 °C");

  const logButton = page.getByRole("button", { name: /Nhật ký \(\d+\)/ });
  await logButton.click();
  const log = page.getByTestId("thermal-log");
  await expect(log).toContainText("Đốt đầu A của thanh Đồng, Nhôm, Thép");
  await expect(log).toContainText("Đinh e của thanh Nhôm rơi lúc 114 s");
  await expect(log).toContainText("Thanh Thuỷ tinh: chưa đinh nào rơi");
  await expect(log).toContainText("Ống (2): đun dưới đáy, viên sáp ở miệng chảy lúc 40 s");
  await expect(log).toContainText("Ống (1): sau 600 s viên sáp ở đáy vẫn chưa chảy");
  await expect(log).toContainText("Đặt tấm gỗ chắn");
  const count = Number((await logButton.textContent())!.match(/\((\d+)\)/)![1]);

  await page.reload();
  await enter(page);
  await expect(page.getByRole("button", { name: `Nhật ký (${count})` })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "heat-transfer", activityId: activity.id, engine: "heat-transfer@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(count);
  expect(requests).toEqual([]);
});

test("a conduction-only config lists three items and has no tabs, and an invalid config stops the bench", async ({ page }) => {
  const conductionOnly = { ...config, stations: ["conduction"], convection: undefined, radiation: undefined, enabledApparatus: config.enabledApparatus.filter((item) => ["rod_rack", "spirit_lamp", "stopwatch"].includes(item.kind)) };
  const broken = { ...config, labId: "thermal-broken", radiation: { ...config.radiation, absorptance: { black: 20, silver: 60 } } };
  await signIn(page, [row("heat-transfer", conductionOnly), row("thermal-broken", broken)]);
  await page.goto("/labs/heat-transfer");
  await enter(page);
  const panel = page.getByRole("complementary", { name: "Bàn nhiệt" });
  await expect(panel.getByTestId("thermal-kit-items").locator("li")).toHaveCount(3);
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await page.goto("/labs/thermal-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("2D shows the same state as 3D, and reduced motion keeps the bench usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, [row("heat-transfer", config)]);
  await page.goto("/labs/heat-transfer");
  await enter(page);
  const panel = page.getByRole("complementary", { name: "Bàn nhiệt" });
  await panel.getByTestId("clock-conduction").getByRole("button", { name: "×1", exact: true }).click();
  await panel.getByRole("button", { name: "Đốt đầu A" }).click();
  await panel.getByRole("button", { name: "Dừng" }).click();
  await panel.getByRole("button", { name: /Tua thêm 60 s/ }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const diagram = page.getByTestId("thermal-2d").getByRole("img");
  await expect(diagram).toHaveAttribute("aria-label", /Đồng 5 đinh rơi, Nhôm 3 đinh rơi, Thép 2 đinh rơi/);
  await panel.getByRole("tab", { name: "Bức xạ nhiệt" }).click();
  await panel.getByRole("button", { name: "Bật đèn" }).click();
  await expect(page.getByTestId("thermal-2d").getByRole("img")).toHaveAttribute("aria-label", /đèn bật, không chắn, bình phủ đen, nhiệt kế 25,0 °C/);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(panel.getByTestId("thermal-thermometer")).toHaveText("25,0 °C");
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("heat-transfer", config)]);
  await page.goto("/labs/heat-transfer");
  await enter(page);
  await expect(page.getByRole("complementary", { name: "Bàn nhiệt" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
