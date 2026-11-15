import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { openBuoyancyLab } from "./helpers/buoyancy";

/**
 * D1-0.1 baseline (lab-kit-delivery-tracking INC-0) for FL-03 density, FL-05 buoyancy and FL-10 Guided, taken before
 * step B (D1-2.x) swaps their beakers and balances for the shared items. Mocked API only, no database.
 *
 * - `BASELINE_UPDATE=1 npx playwright test tests/baseline-d1-fluid-wetbench.spec.ts` rewrites tests/baseline/d1-0.1/:
 *   one JSON of readings per Lab and reference screenshots (3D and 2D, 1440 and 390 px).
 * - Without it the spec compares the readings with the saved JSON (they must not change: "chỉ đổi hiển thị") and
 *   writes fresh screenshots to test-results/baseline-d1/ for a side-by-side look against the references (D1-2.4).
 */
const UPDATE = process.env.BASELINE_UPDATE === "1";
const BASE = resolve("tests/baseline/d1-0.1");
const SHOTS = UPDATE ? BASE : resolve("test-results/baseline-d1");
mkdirSync(SHOTS, { recursive: true });

function settle(lab: string, readings: Record<string, string>) {
  const file = resolve(BASE, `${lab}.json`);
  if (UPDATE) {
    writeFileSync(file, JSON.stringify({ lab, task: "D1-0.1", note: "Readings shown to the learner before step B; D1-2.4 compares against them.", readings }, null, 2) + "\n");
    return;
  }
  expect(existsSync(file), `missing baseline ${file}; run with BASELINE_UPDATE=1 first`).toBe(true);
  expect(readings).toEqual(JSON.parse(readFileSync(file, "utf8")).readings);
}

const sizes = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
async function shoot(page: Page, lab: string, view: "3d" | "2d") {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(view === "3d" ? 1800 : 600);
    await page.screenshot({ path: resolve(SHOTS, `${lab}-${view}-${size.width}.png`) });
  }
  await page.setViewportSize(sizes[0]);
}
const status = (page: Page) => page.getByRole("status", { name: "Số đọc trên dụng cụ" });
const text = async (page: Page) => (await status(page).innerText()).replace(/\s+/g, " ").trim();
const view = (page: Page, name: "2D" | "3D") => page.getByRole("button", { name, exact: true }).click();

// Each Lab takes eight screenshots, four of them waiting for WebGL; the default 60 s is too short.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); await page.setViewportSize(sizes[0]); });

// FL-03: same mocks and steps as density-lab.spec.ts "bench apparatus shows the configured readings".
test("FL-03 density baseline", async ({ page }) => {
  const student = { id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-lab", (route) => route.fulfill({ json: { id: "assignment-lab", title: "Xác định khối lượng riêng", contentType: "lab", dueDate: null, overdue: false, classroom: { id: "class-1", name: "8A" },
    content: { id: "density", title: "Xác định khối lượng riêng", subject: { id: "science", name: "KHTN" }, grade: 8, topic: "Khối lượng riêng", learningObjective: "Xác định khối lượng riêng", prerequisites: "", challengeId: "density_001" } } }));
  await page.route("**/api/labs/density/runs", (route) => route.fulfill({ json: { contract: "lab-contract/1", runId: "density-run", labId: "density", challengeId: "density_001",
    modelRef: "density-bench@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-density", activityVersion: 1, rubricVersion: "density-stations@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    constraints: {}, initialState: null, rendererKey: "density-bench", expiresAt: null, context: "ASSIGNMENT", assignmentId: "assignment-lab", versionBinding: "ASSIGNMENT_PINNED" } }));
  await page.addInitScript(() => window.localStorage.setItem("nexalab:lab-view:density-bench", "2d"));
  await page.goto("/labs/density?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("density-activity")).toBeVisible();

  const readings: Record<string, string> = {};
  await expect(status(page)).toContainText("Cân: 0,0 g");
  readings["1 empty balance"] = await text(page);
  await page.getByTestId("density-balance-toggle").click();
  await expect(status(page)).toContainText("Cân: 78,0 g");
  readings["2 iron on balance"] = await text(page);
  await page.getByTestId("density-specimen").selectOption("copper-1v");
  await page.getByTestId("density-balance-toggle").click();
  await expect(status(page)).toContainText("Cân: 89,0 g");
  readings["3 copper on balance"] = await text(page);
  await shoot(page, "fl03-density-balance", "2d");
  await view(page, "3D");
  await page.locator(".physics-stage canvas").first().waitFor();
  await shoot(page, "fl03-density-balance", "3d");
  await view(page, "2D");

  await page.getByRole("tab", { name: /^Nước/ }).click();
  await expect(status(page)).toContainText("ống đong: 50 mL");
  readings["4 water cylinder"] = await text(page);
  await page.getByRole("button", { name: "Rót thêm 5 mL" }).click();
  await expect(status(page)).toContainText("ống đong: 55 mL");
  readings["5 water +5 mL"] = await text(page);
  await page.getByTestId("density-transfer").click();
  await page.getByRole("button", { name: "Đặt cốc lên cân" }).click();
  await expect(status(page)).toContainText("Cân: 103,6 g");
  readings["6 beaker with water on balance"] = await text(page);
  await shoot(page, "fl03-density-beaker", "2d");
  await view(page, "3D");
  await shoot(page, "fl03-density-beaker", "3d");
  await view(page, "2D");

  await page.getByRole("tab", { name: /^Sỏi/ }).click();
  await page.getByTestId("density-drop").click();
  await expect(status(page)).toContainText("ống đong: 62 mL");
  readings["7 pebble displacement"] = await text(page);
  settle("fl03-density", readings);
});

// FL-05: same steps as buoyancy-state-sync.spec.ts, plus the 2D table row.
test("FL-05 buoyancy baseline", async ({ page }) => {
  await openBuoyancyLab(page);
  // Not the FL-05 heading: `.first()` can land on a hidden heading and flake (buoyancy-* specs share that issue).
  await expect(status(page)).toBeVisible({ timeout: 20_000 });
  const readings: Record<string, string> = {};
  await page.getByRole("combobox", { name: "Mẫu vật" }).selectOption("iron-1v");
  await expect(status(page)).toContainText("0.765 N");
  readings["1 iron in air"] = await text(page);
  await page.locator(".physics-stage canvas").first().waitFor();
  await shoot(page, "fl05-buoyancy-air", "3d");
  await page.getByRole("button", { name: "Nhúng vào bình tràn" }).click();
  await expect(status(page)).toContainText("0.716 N");
  readings["2 iron immersed"] = await text(page);
  await shoot(page, "fl05-buoyancy-immersed", "3d");
  await view(page, "2D");
  await expect(page.locator(".buoyancy-table")).toBeVisible();
  readings["3 2D table"] = (await page.locator(".buoyancy-table tbody").innerText()).replace(/\s+/g, " ").trim();
  await shoot(page, "fl05-buoyancy-immersed", "2d");
  settle("fl05-buoyancy", readings);
});

// FL-10 Guided: the scale reading comes from the server (mg); the bench only shows it.
test("FL-10 Guided wet bench baseline", async ({ page }) => {
  // Same motion setting as fl-10-k2.spec.ts: the reaction plays and is skipped with its own button.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const student = { id: "student-1", username: "student.active", fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-fl10", (route) => route.fulfill({ json: { id: "assignment-fl10", contentType: "lab", content: { id: "mass-conservation", title: "Bảo toàn khối lượng", simulationModelRef: "mass-conservation@1.0.0", challengeId: "fl10_001" } } }));
  await page.route("**/api/labs/mass-conservation/runs", (route) => route.fulfill({ json: { contract: "lab-contract/1", runId: "run-fl10", labId: "mass-conservation", challengeId: "fl10_001",
    modelRef: "mass-conservation@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-1", activityVersion: 1, rubricVersion: "mass-conservation-poea@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    constraints: {}, initialState: null, rendererKey: "mass-conservation", expiresAt: null, context: "ASSIGNMENT", assignmentId: "assignment-fl10", versionBinding: "ASSIGNMENT_PINNED" } }));
  const events: Array<{ type: string }> = [];
  await page.route("**/api/lab-runs/run-fl10/events", (route) => {
    if (route.request().method() === "POST") events.push(route.request().postDataJSON().event);
    route.fulfill({ json: { events, readings: {
      beforeScaleMilligrams: events.some((event) => event.type === "READ_BEFORE") ? 435000 : null,
      afterScaleMilligrams: events.some((event) => event.type === "READ_AFTER") ? 435000 : null,
    } } });
  });

  await page.goto("/labs/mass-conservation?assignmentId=assignment-fl10");
  await page.getByRole("button", { name: "Bắt đầu thí nghiệm" }).click();
  await page.locator(".k2-stage canvas").waitFor();
  await expect(page.getByText("Đang khởi tạo không gian học tập...")).toBeHidden();
  const readings: Record<string, string> = { "0 event order": "" };
  await page.getByRole("button", { name: "Em đã đọc" }).click();
  await page.getByRole("button", { name: "Số chỉ sẽ nhỏ hơn" }).click();
  await page.getByRole("button", { name: "Đọc cân trước" }).click();
  await expect(page.getByText("435,0 g").first()).toBeVisible();
  readings["1 scale before"] = "435,0 g";
  await shoot(page, "fl10-guided-before", "3d");
  const toggle = page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" });
  await toggle.getByRole("button", { name: "2D" }).click();
  readings["2 2D stage label before"] = (await page.locator(".k2-stage-2d").getAttribute("aria-label")) ?? "";
  await shoot(page, "fl10-guided-before", "2d");
  await page.getByRole("button", { name: "Rót, lắc và quan sát" }).click();
  await page.getByRole("button", { name: "Bỏ qua hoạt cảnh" }).click();
  await page.getByRole("button", { name: "Đọc cân sau" }).click();
  await expect(page.getByText("435,0 g").first()).toBeVisible();
  readings["3 scale after"] = "435,0 g";
  readings["4 2D stage label after"] = (await page.locator(".k2-stage-2d").getAttribute("aria-label")) ?? "";
  await shoot(page, "fl10-guided-after", "2d");
  await toggle.getByRole("button", { name: "3D" }).click();
  await shoot(page, "fl10-guided-after", "3d");
  readings["0 event order"] = events.map((event) => event.type).join(" → ");
  settle("fl10-guided", readings);
});
