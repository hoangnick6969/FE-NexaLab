import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// fl-04-liquid-pressure-explore-spec §9 (D1-3.2): FL-04 Explore opens through the bench registry from a mocked
// `GET /labs` row, follows the SGK Bài 16 stations, logs locally, exports unscored and never creates a run.
const activity = { id: "pav-fluid-fx", key: "liquid-pressure-explore", version: 1, digest: "d" };
// Same values as FL04_PRESSURE_EXPLORE_CONFIG in @nexalab/sim/fluid (the sim golden test validates that copy).
const config = {
  schema: "k3-fluid-config/1", labId: "liquid-pressure", catalogId: "FL-04", configVersion: 1,
  kit: "k3-fluid-bench@1", engine: "fluid-pressure@1.0.0",
  title: "Áp suất chất lỏng", contextLabel: "Vật lý 8 · Khám phá áp suất chất lỏng",
  outcomeSummary: ["Khảo sát tác dụng của chất lỏng lên vật đặt trong chất lỏng.", "Nhận biết áp suất tác dụng vào chất lỏng được chất lỏng truyền đi nguyên vẹn theo mọi hướng."],
  safetyBriefing: { simulation: ["Đây là mô hình lý tưởng: màng cao su và pit-tông không có khối lượng, không ma sát."], realLab: ["Lau khô nước tràn trên bàn để tránh trơn ngã; đặt quả nặng nhẹ tay lên đĩa."], acknowledgeRequired: false },
  limitations: ["Chỉ tính áp suất do cột nước gây ra, không cộng áp suất khí quyển."],
  modes: { explore: true },
  liquid: { id: "water", weightDensityNPerM3: 10000 },
  stations: ["depth-probe", "pistons"],
  depthProbe: { tankHeightMm: 300, waterLevelMm: 280, maxDepthMm: 250, depthStepMm: 10, sideHoleOffsetMm: 30, positionsMm: [-100, -50, 0, 50, 100] },
  pistons: { areasMm2: [2000, 1000], weightMilliNewtons: 1000, weightCount: 12, maxPerPan: 6 },
  display: { pressureReading: false, deformationLevels: 5 },
  enabledApparatus: [
    { id: "tank", kind: "tall_tank", slot: "bench", labelVi: "Bể nước trong suốt" },
    { id: "probe", kind: "membrane_probe", slot: "tank", labelVi: "Bình trụ có màng cao su" },
    { id: "pistons", kind: "piston_pair", slot: "bench", labelVi: "Hai xi lanh thông nhau" },
    { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng 1 N" },
  ],
  measurements: ["depth_ruler"],
  pedagogy: { observationPrompts: [{ id: "pascal", kind: "free_text", textVi: "Rút ra kết luận về sự truyền áp suất." }] },
  review: { status: "draft" },
};
const row = (id: string, value: unknown) => ({ id, title: "Áp suất chất lỏng", mode: "explore", explore: { ok: true, kit: "k3-fluid-bench@1", engine: "fluid-pressure@1.0.0", activity, config: value } });

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
const membrane = (page: Page, id: "A" | "B" | "C") => page.getByTestId("fluid-membranes").locator(`tr[data-membrane="${id}"] td`).nth(2);

test("FL-04 Explore opens through the registry, follows both SGK stations, logs locally and creates no run", async ({ page }) => {
  const requests = await signIn(page, [row("liquid-pressure", config)]);
  await page.goto("/labs/liquid-pressure");
  const dialog = page.getByRole("dialog");
  for (const item of ["Bể nước trong suốt", "Bình trụ có màng cao su", "Hai xi lanh thông nhau", "Bộ quả nặng 1 N"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/giả định kỹ thuật/)).toBeVisible();
  await enter(page);

  const bench = page.getByTestId("fluid-explore");
  await expect(bench).toHaveAttribute("data-kit", "k3-fluid-bench@1");
  const panel = page.getByRole("complementary", { name: "Bàn chất lỏng" });
  await expect(panel.getByTestId("fluid-kit-items").locator("li")).toHaveCount(4);
  // Q-2: pressures are not shown by default.
  await expect(panel.getByTestId("fluid-membranes")).not.toContainText("Pa");

  // Station 1: 20 mm (only C under water), then 100 mm (G-02), then the same depth elsewhere (G-03).
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: "Hạ thêm 10 mm" }).click();
  await expect(membrane(page, "C")).toHaveText("lõm mức 1/5");
  await expect(membrane(page, "A")).toHaveText("phẳng");
  await panel.getByRole("slider").fill("100");
  await expect(page.locator(".fl04-observation")).toContainText("độ sâu 100 mm");
  await expect(membrane(page, "C")).toHaveText("lõm mức 2/5");
  await expect(membrane(page, "A")).toHaveText("lõm mức 2/5");
  await expect(membrane(page, "B")).toHaveText("lõm mức 2/5");
  await panel.getByRole("group", { name: "Vị trí ngang trong bể" }).getByRole("button", { name: "−100 mm" }).click();
  await expect(membrane(page, "C")).toHaveText("lõm mức 2/5");
  await panel.getByRole("slider").fill("250");
  await expect(membrane(page, "C")).toHaveText("lõm mức 5/5");

  // Station 2: 4 on (1) and 2 on (2) balance (G-06); one more on (1) sends piston (1) down (G-08).
  await panel.getByRole("tab", { name: /Trạm 2/ }).click();
  for (let i = 0; i < 4; i++) await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (1)" }).click();
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (2)" }).click();
  await expect(panel.getByTestId("fluid-piston-outcome")).toHaveText("Hai pit-tông cân bằng");
  await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (1)" }).click();
  await expect(panel.getByTestId("fluid-piston-outcome")).toHaveText("Pit-tông (1) đi xuống, pit-tông (2) đi lên");
  await expect(page.locator(".fl04-observation")).toContainText("Pit-tông (1) đi xuống");

  // Out of range actions are blocked with a message and never logged.
  await panel.getByRole("button", { name: "Bỏ một quả nặng khỏi đĩa (1)" }).click();
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: "Bỏ một quả nặng khỏi đĩa (2)" }).click();
  await panel.getByRole("button", { name: "Bỏ một quả nặng khỏi đĩa (2)" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Đĩa này không còn quả nặng nào để bỏ.");

  const logButton = page.getByRole("button", { name: /Nhật ký \(\d+\)/ });
  const count = Number((await logButton.textContent())!.match(/\((\d+)\)/)![1]);
  // Station 1: two steps, a slider drag, a position, a second drag (5). Station 2: 4 + 2 + 1 placed, 1 + 2 removed (10). The blocked click adds none.
  expect(count).toBe(15);
  await logButton.click();
  const log = page.getByTestId("fluid-log");
  await expect(log).toContainText("Dời bình trụ sang lệch trái 100 mm, giữ độ sâu 100 mm");
  await expect(log).toContainText("Cùng độ sâu: các màng biến dạng như trước");
  await expect(log).toContainText("Đặt thêm một quả nặng 1,0 N lên đĩa (2): còn 2 quả");
  await expect(log).toContainText("Hai pit-tông cân bằng");

  await page.reload();
  await enter(page);
  await expect(page.getByRole("button", { name: `Nhật ký (${count})` })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất nhật ký" }).click();
  const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(exported).toMatchObject({ labId: "liquid-pressure", activityId: activity.id, engine: "fluid-pressure@1.0.0", scored: false });
  expect(exported.entries).toHaveLength(count);
  expect(requests).toEqual([]);
});

test("a pistons-only config lists two items, pressureReading shows pascals, and an invalid config stops the bench", async ({ page }) => {
  const pistonsOnly = { ...config, stations: ["pistons"], depthProbe: undefined, enabledApparatus: config.enabledApparatus.slice(2), display: { pressureReading: true, deformationLevels: 5 } };
  const broken = { ...config, labId: "fluid-broken", depthProbe: { ...config.depthProbe, maxDepthMm: 280 } };
  await signIn(page, [row("liquid-pressure", pistonsOnly), row("fluid-broken", broken)]);
  await page.goto("/labs/liquid-pressure");
  await expect(page.getByRole("dialog").getByText("Bể nước trong suốt", { exact: true })).toHaveCount(0);
  await enter(page);
  const panel = page.getByRole("complementary", { name: "Bàn chất lỏng" });
  await expect(panel.getByTestId("fluid-kit-items").locator("li")).toHaveCount(2);
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (2)" }).click();
  await expect(panel.getByTestId("fluid-piston-controls")).toContainText("1.000 Pa");
  await expect(panel.getByTestId("fluid-piston-outcome")).toHaveText("Pit-tông (2) đi xuống, pit-tông (1) đi lên");
  await page.goto("/labs/fluid-broken");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
});

test("2D shows the same state as 3D, and reduced motion keeps the bench usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, [row("liquid-pressure", config)]);
  await page.goto("/labs/liquid-pressure");
  await enter(page);
  const panel = page.getByRole("complementary", { name: "Bàn chất lỏng" });
  await panel.getByRole("slider").fill("150");
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const diagram = page.getByTestId("fluid-2d").getByRole("img");
  await expect(diagram).toHaveAttribute("aria-label", "Bình trụ ở độ sâu 150 mm, giữa bể");
  await expect(page.getByTestId("fluid-2d").locator('.fl04-arrow[data-level="3"]')).toHaveCount(3);
  await panel.getByRole("tab", { name: /Trạm 2/ }).click();
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (1)" }).click();
  await panel.getByRole("button", { name: "Đặt một quả nặng lên đĩa (2)" }).click();
  await expect(page.getByTestId("fluid-2d").getByRole("img")).toHaveAttribute("aria-label", "Hai pit-tông cân bằng. Đĩa (1) 2 quả, đĩa (2) 1 quả");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(panel.getByTestId("fluid-piston-outcome")).toHaveText("Hai pit-tông cân bằng");
});

test("phone 390 px: no horizontal scroll, panel and notebook dock reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, [row("liquid-pressure", config)]);
  await page.goto("/labs/liquid-pressure");
  await enter(page);
  await expect(page.getByRole("complementary", { name: "Bàn chất lỏng" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhật ký/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
