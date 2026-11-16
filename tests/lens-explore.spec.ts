import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-23-thin-lens-explore-spec §6–9 (D1-3.2): the thin lens Lab opens through the bench registry from a mocked `GET /labs` row,
// shows the special rays after a prediction, the image on a scale grid (L-01, L-04, L-05, L-06), the focal length (L-07)
// and the magnifier (L-08), logs locally, exports unscored and never creates a run.
const activity = { id: "pav-lens-fx", key: "thin-lens-explore", version: 1, digest: "d" };
// Same values as FL23_LENS_EXPLORE_CONFIG in @nexalab/sim/optics/lens (the sim golden test validates that copy).
const config = {
  schema: "k6-lens-config/1", labId: "thin-lens", catalogId: "FL-23", configVersion: 1, kit: "k6-lens-bench@1", engine: "thin-lens@1.0.0",
  title: "Thấu kính và kính lúp", contextLabel: "Vật lý 9 · Khám phá thấu kính",
  outcomeSummary: ["Vẽ được ảnh qua thấu kính.", "Đo được tiêu cự của thấu kính hội tụ."],
  safetyBriefing: { simulation: ["Mô hình thấu kính mỏng."], realLab: ["Không hội tụ ánh sáng Mặt Trời vào mắt."], acknowledgeRequired: false },
  limitations: ["Thấu kính mỏng, tia sáng gần trục chính."],
  modes: { explore: true },
  lenses: [
    { id: "converging-100", labelVi: "Thấu kính hội tụ f = 100 mm", focalMm: 100 },
    { id: "converging-150", labelVi: "Thấu kính hội tụ f = 150 mm", focalMm: 150 },
    { id: "diverging-100", labelVi: "Thấu kính phân kì f = 100 mm", focalMm: -100 },
    { id: "loupe-50", labelVi: "Kính lúp f = 50 mm", focalMm: 50 },
  ],
  stations: ["rays", "image", "focal", "magnifier"],
  rays: { lensIds: ["converging-100", "diverging-100"] },
  image: { lensIds: ["converging-100", "converging-150", "diverging-100"], minDistanceMm: 20, maxDistanceMm: 400, stepMm: 10, objectHeightMm: 20, toleranceMm: 5 },
  focal: { lensIds: ["converging-100", "converging-150"], minDistanceMm: 50, maxDistanceMm: 400, stepMm: 10, toleranceMm: 5 },
  magnifier: { lensIds: ["loupe-50", "converging-100"], minDistanceMm: 10, maxDistanceMm: 150, stepMm: 5 },
  display: { lensFormula: false },
  enabledApparatus: [
    { id: "bench", kind: "optical_bench", slot: "bench", labelVi: "Giá quang học có thước" },
    { id: "lens", kind: "lens", slot: "bench", labelVi: "Thấu kính" },
    { id: "lamp", kind: "object_lamp", slot: "bench", labelVi: "Vật sáng (đèn chữ F)" },
    { id: "screen", kind: "screen", slot: "bench", labelVi: "Màn hứng ảnh" },
    { id: "loupe", kind: "magnifier", slot: "tray", labelVi: "Kính lúp" },
    { id: "grid", kind: "grid", slot: "board", labelVi: "Lưới tỉ lệ" },
  ],
  measurements: ["ruler", "scale_grid", "focal_length"],
  pedagogy: { observationPrompts: [{ id: "image", kind: "free_text", textVi: "Dịch vật lại gần thấu kính hội tụ: ảnh thay đổi thế nào?" }] },
  review: { status: "draft" },
};
const row = (id: string, value: { engine: string }) => ({ id, title: "Thấu kính", mode: "explore", explore: { ok: true, kit: "k6-lens-bench@1", engine: value.engine, activity, config: value } });

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
const panelOf = (page: Page) => page.getByRole("complementary", { name: "Bàn thấu kính" });

test("thin lens Explore: rays after a prediction, image on the grid, focal length, magnifier; logs locally and creates no run", async ({ page }) => {
  test.setTimeout(120_000);
  const requests = await signIn(page, [row("thin-lens", config)]);
  await page.goto("/labs/thin-lens");
  for (const item of ["Giá quang học có thước", "Thấu kính", "Màn hứng ảnh", "Lưới tỉ lệ"]) await expect(page.getByRole("dialog").getByText(item, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);
  await expect(page.getByTestId("lens-explore")).toHaveAttribute("data-kit", "k6-lens-bench@1");
  await expect(page.getByTestId("lens-2d")).toBeVisible();
  const panel = panelOf(page);
  await expect(panel.getByTestId("lens-kit-items").locator("li")).toHaveCount(6);

  // Station 1: outgoing rays hidden until the prediction.
  await expect(page.locator('[data-ray="parallel"] [data-part="out"]')).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Hiện tia ló" })).toBeDisabled();
  await panel.getByRole("group", { name: "Dự đoán tia ló" }).getByRole("button", { name: /Truyền thẳng/ }).click();
  await panel.getByRole("button", { name: "Hiện tia ló" }).click();
  await expect(page.locator('[data-ray="parallel"] [data-part="out"]')).toHaveCount(1);
  await expect(panel.getByTestId("lens-rays-result")).toHaveAttribute("data-match", "false");

  // Station 2: L-01, L-05, L-04 and L-06.
  await panel.getByRole("tab", { name: /Trạm 2/ }).click();
  await expect(panel.getByTestId("lens-image-kind")).toHaveText("Tính chất: ảnh thật, ngược chiều, nhỏ hơn vật");
  await panel.getByLabel("Khoảng cách ảnh – thấu kính d′ em đọc trên lưới (mm)").fill("150");
  await panel.getByLabel("Chiều cao ảnh h′ (mm)").fill("10");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("lens-image-check")).toHaveAttribute("data-ok", "true");
  await panel.getByRole("slider", { name: "Khoảng cách vật" }).fill("50");
  await expect(panel.getByTestId("lens-image-kind")).toHaveText("Tính chất: ảnh ảo, cùng chiều, lớn hơn vật");
  await panel.getByLabel("Khoảng cách ảnh – thấu kính d′ em đọc trên lưới (mm)").fill("90");
  await panel.getByLabel("Chiều cao ảnh h′ (mm)").fill("40");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("lens-image-check")).toHaveAttribute("data-ok", "false");
  await expect(panel.getByTestId("lens-image-check")).toContainText("d′ = 100 mm (ảnh ảo, cùng phía với vật), h′ = 40 mm");
  await panel.getByRole("slider", { name: "Khoảng cách vật" }).fill("100");
  await expect(panel.getByTestId("lens-image-kind")).toHaveText("Tính chất: không có ảnh: các tia ló song song với nhau");
  await panel.getByRole("button", { name: "Thấu kính phân kì f = 100 mm" }).click();
  await expect(panel.getByTestId("lens-image-kind")).toHaveText("Tính chất: ảnh ảo, cùng chiều, nhỏ hơn vật");
  await panel.getByRole("group", { name: "Tia dùng để dựng ảnh" }).getByRole("button", { name: "Tia qua quang tâm O" }).click();
  await expect(panel.getByText("Chọn ít nhất hai tia để dựng ảnh B′.")).toBeVisible();

  // Station 3, L-07: lens A (f 100 mm hidden) is sharp and equal at 200 mm each side, L = 400 mm.
  await panel.getByRole("tab", { name: /Trạm 3/ }).click();
  await expect(panel.getByTestId("lens-focal-state")).toHaveAttribute("data-sharp", "false");
  await panel.getByRole("slider", { name: "Khoảng cách vật và màn" }).fill("200");
  await expect(panel.getByTestId("lens-focal-state")).toHaveText("L = 400 mm · ảnh rõ nét và bằng vật");
  await panel.getByLabel("Tiêu cự em tính được (mm)").fill("100");
  await panel.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(panel.getByTestId("lens-focal-check")).toHaveAttribute("data-ok", "true");
  await panel.getByRole("group", { name: "Thấu kính cần đo" }).getByRole("button", { name: "Thấu kính B" }).click();
  await expect(panel.getByTestId("lens-focal-check")).toHaveCount(0);
  await expect(panel.getByTestId("lens-focal-state")).toHaveAttribute("data-sharp", "false");

  // Station 4, L-08.
  await panel.getByRole("tab", { name: /Trạm 4/ }).click();
  await expect(panel.getByTestId("lens-magnifier-state")).toHaveAttribute("data-usable", "true");
  await expect(panel.getByText("Số bội giác ghi trên kính: G = 25/f (f tính bằng cm) = 5×.")).toBeVisible();
  await panel.getByRole("slider", { name: "Khoảng cách kính lúp" }).fill("80");
  await expect(panel.getByTestId("lens-magnifier-state")).toHaveText("Vật ngoài khoảng tiêu cự: không dùng được như kính lúp");

  const logButton = page.getByRole("button", { name: /Nhật ký \(\d+\)/ });
  await logButton.click();
  const log = page.getByTestId("lens-log");
  await expect(log).toContainText("Dự đoán của em chưa khớp với mô hình");
  await expect(log).toContainText("Mô hình: d′ = 150 mm");
  await expect(log).toContainText("Thấu kính A có tiêu cự 100 mm; em tính 100 mm: khớp");
  await expect(log).toContainText("Vật ngoài khoảng tiêu cự");
  const count = Number((await logButton.textContent())!.match(/\((\d+)\)/)![1]);
  await page.reload();
  await enter(page);
  await expect(page.getByRole("button", { name: `Nhật ký (${count})` })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "thin-lens", activityId: activity.id, engine: "thin-lens@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(count);
  expect(requests).toEqual([]);
});

test("an image-only config with the lens formula has no tabs, a reviewed config has no notice, and an invalid config stops the bench", async ({ page }) => {
  const imageOnly = { ...config, labId: "lens-image", stations: ["image"], rays: undefined, focal: undefined, magnifier: undefined, display: { lensFormula: true },
    review: { status: "reviewed", notes: "Owner duyệt" }, enabledApparatus: config.enabledApparatus.filter((item) => ["optical_bench", "lens", "object_lamp", "grid"].includes(item.kind)) };
  const broken = { ...config, labId: "lens-broken", focal: { ...config.focal, lensIds: ["diverging-100"] } };
  await signIn(page, [row("lens-image", imageOnly), row("lens-broken", broken)]);
  await page.goto("/labs/lens-image");
  await expect(page.getByRole("dialog").getByText(/giả định kỹ thuật/)).toHaveCount(0);
  await enter(page);
  await expect(panelOf(page).getByRole("tab")).toHaveCount(0);
  await expect(panelOf(page).getByTestId("lens-kit-items").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("lens-image-diagram")).toContainText("1/f = 1/d + 1/d′");
  await page.goto("/labs/lens-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("3D shows the bench for every station and 2D comes back with the same state", async ({ page }) => {
  await signIn(page, [row("thin-lens", config)]);
  await page.goto("/labs/thin-lens");
  await enter(page);
  const panel = panelOf(page);
  await panel.getByRole("tab", { name: /Trạm 3/ }).click();
  await panel.getByRole("slider", { name: "Khoảng cách vật và màn" }).fill("200");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.getByTestId("lens-2d")).toHaveCount(0);
  await expect(page.locator(".fl23l-observation")).toContainText("L = 400 mm, ảnh rõ nét và bằng vật");
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.getByTestId("lens-focal-diagram")).toHaveAttribute("aria-label", /khoảng cách vật – màn 400 mm; ảnh trên màn rõ nét/);
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("thin-lens", config)]);
  await page.goto("/labs/thin-lens");
  await enter(page);
  await expect(panelOf(page)).toBeVisible();
  await expect(page.getByTestId("lens-2d").getByRole("img")).toBeInViewport();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
