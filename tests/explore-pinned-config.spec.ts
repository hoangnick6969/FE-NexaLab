import { expect, test, type Page } from "@playwright/test";
import { fl13Config } from "../src/features/labs/chemistry/wet-bench/labs/fl-13.config";

// SPEC-lab-mode-foundation-p0 C1.1/C1.2: `/labs/:id` runs Explore only from the server-pinned config in `GET /labs`.
const activity = { id: "pav-fl13-v2", key: "acid-base-indicators-explore", version: 2, digest: "d" };
const exploreRow = (id: string, config: unknown, title = "Acid – base, chỉ thị và pH") =>
  ({ id, title, mode: "explore", explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity, config } });

async function signIn(page: Page, role: "STUDENT" | "TEACHER", rows: unknown[]) {
  const user = { id: "u-1", username: role === "STUDENT" ? "student.active" : null, email: role === "TEACHER" ? "teacher@nexalab.local" : null,
    fullName: "Nguyễn An", role, grade: 8, mustChangePassword: false };
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

test("FL-13 opens from the pinned config with the draft label, apparatus list and a pH reading, and creates no run", async ({ page }) => {
  const requests = await signIn(page, "STUDENT", [exploreRow("acid-base-indicators", fl13Config)]);
  await page.goto("/labs/acid-base-indicators");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const item of ["Cốc 100 mL", "Bút đo pH", "Giấy quỳ tím"]) await expect(dialog.getByText(item, { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText(/Dữ liệu hoá học của bài này là bản nháp/)).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
  await dialog.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();

  await page.getByRole("group", { name: "Kệ hoá chất" }).getByRole("button").first().click();
  await page.getByRole("group", { name: "Vật chứa" }).getByRole("button", { name: /^Cốc 100 mL/ }).click();
  await page.getByRole("group", { name: "Dụng cụ" }).getByRole("button", { name: "Bút đo pH" }).click();
  await page.getByRole("group", { name: "Vật chứa" }).getByRole("button", { name: /^Cốc 100 mL/ }).click();
  await expect(page.getByRole("complementary", { name: "Thông tin Cốc 100 mL" })).toContainText(/pH \d/);
  expect(requests).toEqual([]);
});

test("an Explore Lab that is not in the app bundle still opens from the server config", async ({ page }) => {
  const config = { ...fl13Config, labId: "explore-fixture", title: "Fixture" };
  await signIn(page, "STUDENT", [{ ...exploreRow("explore-fixture", config, "Bàn fixture"), explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity: { ...activity, id: "pav-fx" }, config } }]);
  await page.goto("/labs/explore-fixture");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vào bàn thí nghiệm" })).toBeVisible();
});

for (const code of ["EXPLORE_VERSION_MISSING", "EXPLORE_IDENTITY_MISMATCH", "EXPLORE_DIGEST_MISMATCH", "EXPLORE_KIT_UNSUPPORTED", "EXPLORE_CONFIG_INVALID"]) {
  test(`teacher sees ${code} and neither the bench, GuidedLab nor the bundled config`, async ({ page }) => {
    await signIn(page, "TEACHER", [{ id: "acid-base-indicators", title: "FL-13", mode: "explore", explore: { ok: false, code } }]);
    await page.goto("/labs/acid-base-indicators");
    await expect(page.getByTestId("explore-error")).toContainText(code);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Phòng thực hành chưa được phát hành")).toHaveCount(0);
  });
}

test("FE re-validation failure and a config of another Lab stop the bench", async ({ page }) => {
  await signIn(page, "TEACHER", [
    exploreRow("acid-base-indicators", { ...fl13Config, availableReagents: [] }),
    exploreRow("metal-reactivity", fl13Config),
  ]);
  await page.goto("/labs/acid-base-indicators");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
  await page.goto("/labs/metal-reactivity");
  await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_IDENTITY_MISMATCH");
});

test("a student without the row gets the not-released screen; a guided row still opens GuidedLab", async ({ page }) => {
  await signIn(page, "STUDENT", [{ id: "mass-conservation", title: "Bảo toàn khối lượng", mode: "guided", challenges: [] }]);
  await page.goto("/labs/acid-base-indicators");
  // GuidedLab's existing screen for a Lab missing from the student's list.
  await expect(page.getByText(/Không tìm thấy phòng lab|chưa được phát hành/).first()).toBeVisible();
  await expect(page.getByTestId("explore-error")).toHaveCount(0);
  await page.goto("/labs/mass-conservation");
  await expect(page.getByRole("dialog", { name: /an toàn/i })).toHaveCount(0);
  await expect(page.getByTestId("explore-error")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Vào bàn thí nghiệm" })).toHaveCount(0);
});

test("F0-2: /labs/:id opens a second bench chosen by explore.kit (dev fixture bench)", async ({ page }) => {
  const config = { labId: "fixture-lab", kit: "explore-fixture@1", engine: "fixture@1", title: "Fixture",
    items: [{ id: "ruler", labelVi: "Thước", purposeVi: "Đo độ dài." }, { id: "timer", labelVi: "Đồng hồ bấm giờ", purposeVi: "Đo thời gian." }] };
  await signIn(page, "STUDENT", [
    { id: "fixture-lab", title: "Bàn fixture", mode: "explore", explore: { ok: true, kit: "explore-fixture@1", engine: "fixture@1", activity: { ...activity, id: "pav-fixture" }, config } },
    exploreRow("acid-base-indicators", fl13Config),
  ]);
  await page.goto("/labs/fixture-lab");
  const bench = page.getByTestId("fixture-bench");
  await expect(bench).toHaveAttribute("data-activity", "pav-fixture");
  await expect(bench).toContainText("Thước");
  await expect(bench).toContainText("Đồng hồ bấm giờ");
  await page.goto("/labs/acid-base-indicators");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("fixture-bench")).toHaveCount(0);
});
