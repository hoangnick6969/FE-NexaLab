import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-23-refraction-explore-spec §6–9 (D1-3.2): FL-23 Explore opens through the bench registry from a mocked `GET /labs` row,
// shows Snell law on the protractor disk (G-02..G-05), total internal reflection and the critical angle (G-07, G-08),
// logs locally, exports unscored and never creates a run.
const activity = { id: "pav-optics-fx", key: "light-refraction-explore", version: 1, digest: "d" };
// Same values as FL23_REFRACTION_EXPLORE_CONFIG in @nexalab/sim/optics (the sim golden test validates that copy).
const config = {
  schema: "k6-optics-config/1", labId: "light-refraction", catalogId: "FL-23", configVersion: 1,
  kit: "k6-optics-bench@1", engine: "refraction@1.0.0",
  title: "Khúc xạ ánh sáng và phản xạ toàn phần", contextLabel: "Vật lý 9 · Khám phá khúc xạ ánh sáng",
  outcomeSummary: ["Thực hiện thí nghiệm để rút ra và phát biểu được định luật khúc xạ ánh sáng.", "Rút ra điều kiện xảy ra phản xạ toàn phần và xác định được góc tới hạn."],
  safetyBriefing: { simulation: ["Đây là mô hình tia sáng lý tưởng."], realLab: ["Không nhìn thẳng vào tia laser."], acknowledgeRequired: false },
  limitations: ["Chiết suất của không khí lấy bằng 1, như chân không."],
  modes: { explore: true },
  lightSpeedKmS: 300000,
  media: [{ id: "glass", labelVi: "Thuỷ tinh", indexMilli: 1500 }, { id: "water", labelVi: "Nước", indexMilli: 1333 }],
  stations: ["into-block", "out-of-block"],
  intoBlock: { maxIncidenceDeg: 80, maxReadings: 6 },
  outOfBlock: { maxIncidenceDeg: 89, criticalToleranceDeg: 1 },
  display: { sineColumns: false },
  enabledApparatus: [
    { id: "laser", kind: "light_source", slot: "disk", labelVi: "Đèn laser" },
    { id: "disk", kind: "protractor_disk", slot: "bench", labelVi: "Đĩa chia độ" },
    { id: "block", kind: "half_cylinder", slot: "disk", labelVi: "Khối bán trụ" },
    { id: "table", kind: "measurement_table", slot: "panel", labelVi: "Bảng đo góc" },
    { id: "speed", kind: "speed_card", slot: "panel", labelVi: "Thẻ tốc độ ánh sáng" },
  ],
  measurements: ["protractor", "critical_angle"],
  pedagogy: { observationPrompts: [{ id: "law", kind: "free_text", textVi: "Khi tăng góc tới, góc khúc xạ thay đổi thế nào?" }] },
  review: { status: "draft" },
};
// Config v2 (engine 1.1.0): the published v1 above plus the prism station (spec §13).
const v2 = {
  ...config, configVersion: 2, engine: "refraction@1.1.0", stations: ["into-block", "out-of-block", "prism"],
  prism: { apexDeg: 60, mediumId: "glass", minIncidenceDeg: 35, maxIncidenceDeg: 80, whiteLight: true, spectrum: [
    { id: "red", labelVi: "Đỏ", indexMilli: 1513 }, { id: "orange", labelVi: "Cam", indexMilli: 1517 }, { id: "yellow", labelVi: "Vàng", indexMilli: 1519 },
    { id: "green", labelVi: "Lục", indexMilli: 1523 }, { id: "blue", labelVi: "Lam", indexMilli: 1528 }, { id: "indigo", labelVi: "Chàm", indexMilli: 1532 }, { id: "violet", labelVi: "Tím", indexMilli: 1538 },
  ] },
  enabledApparatus: [...config.enabledApparatus, { id: "prism", kind: "prism", slot: "disk", labelVi: "Lăng kính" }, { id: "screen", kind: "screen", slot: "bench", labelVi: "Màn hứng" }],
  measurements: ["protractor", "critical_angle", "deviation"],
};
// The row declares the engine of its config, as the server does (FE refuses a mismatch with EXPLORE_IDENTITY_MISMATCH).
const row = (id: string, value: { engine: string }) => ({ id, title: "Khúc xạ ánh sáng", mode: "explore", explore: { ok: true, kit: "k6-optics-bench@1", engine: value.engine, activity, config: value } });

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
const panelOf = (page: Page) => page.getByRole("complementary", { name: "Bàn quang học" });
const angle = (page: Page, deg: number) => panelOf(page).getByRole("slider", { name: "Góc tới" }).fill(String(deg));
const reading = (page: Page) => panelOf(page).getByTestId("optics-reading");

test("FL-23 Explore opens through the registry, shows Snell law and total internal reflection, logs locally and creates no run", async ({ page }) => {
  test.setTimeout(120_000);
  const requests = await signIn(page, [row("light-refraction", config)]);
  await page.goto("/labs/light-refraction");
  const dialog = page.getByRole("dialog");
  for (const item of ["Đèn laser", "Đĩa chia độ", "Khối bán trụ", "Bảng đo góc"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);

  await expect(page.getByTestId("optics-explore")).toHaveAttribute("data-kit", "k6-optics-bench@1");
  // 2D-first bench (Q-6): the disk opens without picking a view.
  await expect(page.getByTestId("optics-2d")).toBeVisible();
  const panel = panelOf(page);
  await expect(panel.getByTestId("optics-kit-items").locator("li")).toHaveCount(5);

  // G-02: air to glass at 30°, 45°, 60°.
  await expect(reading(page)).toHaveText("Góc khúc xạ đọc trên đĩa: 19,5°");
  await panel.getByRole("button", { name: "Ghi vào bảng" }).click();
  await angle(page, 45);
  await expect(reading(page)).toContainText("28,1°");
  await panel.getByRole("button", { name: "Ghi vào bảng" }).click();
  await panel.getByRole("group", { name: "Xoay đèn" }).getByRole("button", { name: "+5°" }).click();
  await panel.getByRole("group", { name: "Xoay đèn" }).getByRole("button", { name: "+5°" }).click();
  await panel.getByRole("group", { name: "Xoay đèn" }).getByRole("button", { name: "+5°" }).click();
  await expect(reading(page)).toContainText("35,3°");
  await panel.getByRole("button", { name: "Ghi vào bảng" }).click();
  const table = panel.getByTestId("optics-table");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(table.locator('tr[data-row="45"] td').nth(2)).toHaveText("28,1°");
  // Sines are left for the student by default (Q-5).
  await expect(table.locator('tr[data-row="45"] td[data-ratio]')).toHaveText("?");
  await panel.getByRole("button", { name: "Ghi vào bảng" }).click();
  await expect(page.getByRole("alert")).toHaveText("Góc tới này đã có trong bảng.");

  // G-09 speed card, then G-04: water bends less at the same angle; its table is separate.
  await expect(panel.getByTestId("optics-speed")).toContainText("n = 1,50 · tốc độ ánh sáng v = c/n = 200.000 km/s");
  await angle(page, 30);
  await panel.getByRole("group", { name: "Khối bán trụ" }).getByRole("button", { name: "Nước" }).click();
  await expect(reading(page)).toContainText("22°");
  await expect(panel.getByTestId("optics-speed")).toContainText("≈ 225.000 km/s");
  await expect(table).toHaveAttribute("data-medium", "water");
  await expect(table.locator("tbody tr[data-row]")).toHaveCount(0);
  // G-05: even at 80° there is a refracted ray going into the block.
  await panel.getByRole("group", { name: "Khối bán trụ" }).getByRole("button", { name: "Thuỷ tinh" }).click();
  await angle(page, 80);
  await expect(reading(page)).toHaveAttribute("data-total", "false");
  await expect(reading(page)).toContainText("41°");

  // Station 2, G-06..G-08.
  await panel.getByRole("tab", { name: /Trạm 2/ }).click();
  await expect(page.getByTestId("optics-explore")).toHaveAttribute("data-station", "out-of-block");
  await expect(reading(page)).toContainText("48,6°");
  await angle(page, 41);
  await expect(reading(page)).toContainText("79,8°");
  await panel.getByRole("group", { name: "Xoay đèn" }).getByRole("button", { name: "+1°" }).click();
  await expect(reading(page)).toHaveText("Không có tia khúc xạ: phản xạ toàn phần");
  await expect(page.getByTestId("optics-2d").getByRole("img")).toHaveAttribute("data-total", "true");
  await expect(panel.getByTestId("optics-search")).toHaveText("Góc tới lớn nhất còn tia khúc xạ: 41°. Góc tới nhỏ nhất đã thấy phản xạ toàn phần: 42°.");
  await panel.getByLabel("Góc tới hạn em đo được (độ)").fill("42");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("optics-critical-result")).toHaveAttribute("data-ok", "true");
  await expect(panel.getByTestId("optics-critical-result")).toContainText("Góc tới hạn của khối thuỷ tinh: 41,8° · em đo 42°: khớp");
  await panel.getByRole("group", { name: "Khối bán trụ" }).getByRole("button", { name: "Nước" }).click();
  await expect(reading(page)).toContainText("Góc khúc xạ");
  await angle(page, 49);
  await expect(reading(page)).toHaveAttribute("data-total", "true");
  await panel.getByLabel("Góc tới hạn em đo được (độ)").fill("45");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("optics-critical-result")).toHaveAttribute("data-ok", "false");
  await expect(panel.getByTestId("optics-critical-result")).toContainText("48,6°");

  const logButton = page.getByRole("button", { name: /Nhật ký \(\d+\)/ });
  await logButton.click();
  const log = page.getByTestId("optics-log");
  await expect(log).toContainText("Ghi vào bảng: Thuỷ tinh, i = 45°, r = 28,1°");
  await expect(log).toContainText("Đổi khối thành nước (n = 1,333)");
  await expect(log).toContainText("Lần đầu thấy phản xạ toàn phần với khối thuỷ tinh ở góc tới 42°");
  await expect(log).toContainText("Mô hình: góc tới hạn 41,8°; em đo khớp");
  await expect(log).toContainText("Mô hình: góc tới hạn 48,6°; em đo chưa khớp");
  const count = Number((await logButton.textContent())!.match(/\((\d+)\)/)![1]);

  await page.reload();
  await enter(page);
  await expect(page.getByRole("button", { name: `Nhật ký (${count})` })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "light-refraction", activityId: activity.id, engine: "refraction@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(count);
  expect(requests).toEqual([]);
});

test("a station-1 config with sines lists four items and no tabs, a reviewed config has no notice, and an invalid config stops the bench", async ({ page }) => {
  const station1 = { ...config, labId: "optics-one", stations: ["into-block"], outOfBlock: undefined, display: { sineColumns: true }, review: { status: "reviewed", notes: "Owner duyệt" },
    enabledApparatus: config.enabledApparatus.filter((item) => item.kind !== "speed_card") };
  const broken = { ...config, labId: "optics-broken", outOfBlock: { maxIncidenceDeg: 40, criticalToleranceDeg: 1 } };
  await signIn(page, [row("optics-one", station1), row("optics-broken", broken)]);
  await page.goto("/labs/optics-one");
  await expect(page.getByRole("dialog").getByText("Đèn laser", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/giả định kỹ thuật/)).toHaveCount(0);
  await enter(page);
  const panel = panelOf(page);
  await expect(panel.getByTestId("optics-kit-items").locator("li")).toHaveCount(4);
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await expect(panel.getByTestId("optics-speed")).toHaveCount(0);
  await panel.getByRole("button", { name: "Ghi vào bảng" }).click();
  await expect(panel.getByTestId("optics-table").locator('tr[data-row="30"] td[data-ratio]')).toHaveText("1,50");
  await page.goto("/labs/optics-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("config v2: the prism hides the path until a prediction, then shows two refractions, D and the spectrum; v1 configs keep two stations", async ({ page }) => {
  const requests = await signIn(page, [row("light-refraction", v2), row("optics-v1", { ...config, labId: "optics-v1" }), row("optics-v1-prism", { ...v2, labId: "optics-v1-prism", engine: "refraction@1.0.0" })]);
  await page.goto("/labs/light-refraction");
  await enter(page);
  const panel = panelOf(page);
  await expect(panel.getByTestId("optics-kit-items").locator("li")).toHaveCount(7);
  await panel.getByRole("tab", { name: /Trạm 3/ }).click();
  await expect(page.getByTestId("optics-explore")).toHaveAttribute("data-station", "prism");
  const diagram = page.getByTestId("optics-2d").getByRole("img");
  await expect(diagram).toHaveAttribute("data-revealed", "false");
  await expect(panel.getByTestId("optics-prism-readings")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Hiện đường truyền" })).toBeDisabled();
  // P-01 at 40°.
  await panel.getByRole("slider", { name: "Góc tới lăng kính" }).fill("40");
  await panel.getByRole("group", { name: "Dự đoán tia ló" }).getByRole("button", { name: "Lệch về phía đỉnh" }).click();
  await panel.getByRole("button", { name: "Hiện đường truyền" }).click();
  await expect(diagram).toHaveAttribute("data-revealed", "true");
  const readings = panel.getByTestId("optics-prism-readings");
  await expect(readings.locator('[data-reading="r1"] td')).toHaveText("25,4°");
  await expect(readings.locator('[data-reading="r2"] td')).toHaveText("34,6°");
  await expect(readings.locator('[data-reading="i2"] td')).toHaveText("58,5°");
  await expect(readings.locator('[data-reading="deviation"] td')).toHaveText("38,5°");
  await expect(panel.getByTestId("optics-prediction")).toHaveAttribute("data-match", "false");
  await expect(panel.getByTestId("optics-prediction")).toContainText("chưa khớp: tia ló lệch về phía đáy");
  // P-02: the symmetric path near 48.6° gives the smallest deviation, 37.2°.
  await panel.getByRole("slider", { name: "Góc tới lăng kính" }).fill("49");
  await expect(readings.locator('[data-reading="deviation"] td')).toHaveText("37,2°");
  // P-06: white light splits red to violet; laser numbers are not shown for colours (Q-11).
  await panel.getByRole("group", { name: "Nguồn sáng" }).getByRole("button", { name: "Ánh sáng trắng" }).click();
  await expect(diagram).toHaveAttribute("data-light", "white");
  await expect(panel.getByTestId("optics-prism-readings")).toHaveCount(0);
  await expect(panel.getByTestId("optics-spectrum")).toHaveText("Trên màn từ trên xuống: đỏ, cam, vàng, lục, lam, chàm, tím.");
  await expect(page.getByTestId("optics-spectrum-inset").locator("rect[data-colour]")).toHaveCount(7);
  await page.getByRole("button", { name: /Nhật ký \(\d+\)/ }).click();
  const log = page.getByTestId("optics-log");
  await expect(log).toContainText("Dự đoán tia ló: lệch về phía đỉnh; hiện đường truyền");
  await expect(log).toContainText("Dự đoán của em chưa khớp với mô hình");
  await expect(log).toContainText("Tia ló lệch về phía đáy lăng kính, góc lệch D = 38,5°");
  await expect(log).toContainText("tím lệch nhiều nhất, đỏ lệch ít nhất");

  // The published v1 config (engine 1.0.0) still opens with its two stations; a prism on 1.0.0 is refused.
  await page.goto("/labs/optics-v1");
  await enter(page);
  await expect(panelOf(page).getByRole("tab")).toHaveCount(2);
  await page.goto("/labs/optics-v1-prism");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
  expect(requests).toEqual([]);
});

test("3D shows the same state as 2D, and reduced motion keeps the bench usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, [row("light-refraction", config)]);
  await page.goto("/labs/light-refraction");
  await enter(page);
  const panel = panelOf(page);
  await panel.getByRole("tab", { name: /Trạm 2/ }).click();
  await angle(page, 60);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.getByTestId("optics-2d")).toHaveCount(0);
  await expect(page.locator(".fl23-observation")).toContainText("góc tới 60°: phản xạ toàn phần");
  await angle(page, 20);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.getByTestId("optics-2d").getByRole("img")).toHaveAttribute("aria-label", /Tia sáng từ thuỷ tinh sang không khí, góc tới 20°, góc khúc xạ 30,9°/);
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("light-refraction", config)]);
  await page.goto("/labs/light-refraction");
  await enter(page);
  await expect(panelOf(page)).toBeVisible();
  await expect(page.getByTestId("optics-2d").getByRole("img")).toBeInViewport();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
