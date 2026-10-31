import { expect, test, type Page } from "@playwright/test";

// FL-03 density 2D pilot through the shared run host. The API is mocked: no density Lab is seeded or released.
const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 8, mustChangePassword: false,
};

async function mockShell(page: Page) {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-lab", (route) => route.fulfill({ json: {
    id: "assignment-lab", title: "Xác định khối lượng riêng", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: {
      id: "density", title: "Xác định khối lượng riêng", subject: { id: "science", name: "KHTN" }, grade: 8,
      topic: "Khối lượng riêng", learningObjective: "Xác định khối lượng riêng", prerequisites: "", challengeId: "density_001",
    },
  } }));
}

const launch = (runId: string) => ({
  contract: "lab-contract/1", runId, labId: "density", challengeId: "density_001",
  modelRef: "density-bench@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-density", activityVersion: 1,
  rubricVersion: "density-stations@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: "density-bench", expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-lab", versionBinding: "ASSIGNMENT_PINNED",
});

// Logic tests run on the 2D view: headless WebGL is slow and the 2D view is the low-end fallback.
// The toggle test opts into 3D explicitly.
async function open(page: Page, view: "2d" | "3d" = "2d", runId = "density-run") {
  await page.addInitScript((mode) => window.localStorage.setItem("nexalab:lab-view:density-bench", mode), view);
  await mockShell(page);
  await page.route("**/api/labs/density/runs", (route) => route.fulfill({ json: launch(runId) }));
  await page.goto("/labs/density?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("density-activity")).toBeVisible();
}

const fill = (page: Page, testId: string, value: string) => page.getByTestId(testId).fill(value);
const station = (page: Page, name: RegExp) => page.getByRole("tab", { name }).click();
const reading = (page: Page) => page.getByRole("status", { name: "Số đọc trên dụng cụ" });

test("bench apparatus shows the configured readings and water levels", async ({ page }) => {
  await open(page);
  await expect(reading(page)).toContainText("Cân: 0,0 g");
  await page.getByTestId("density-balance-toggle").click();
  await expect(reading(page)).toContainText("Cân: 78,0 g");
  await page.getByTestId("density-specimen").selectOption("copper-1v");
  await page.getByTestId("density-balance-toggle").click();
  await expect(reading(page)).toContainText("Cân: 89,0 g");

  await station(page, /^Nước/);
  await expect(reading(page)).toContainText("ống đong: 50 mL");
  await page.getByRole("button", { name: "Rót thêm 5 mL" }).click();
  await expect(reading(page)).toContainText("ống đong: 55 mL");
  await page.getByTestId("density-transfer").click();
  await page.getByRole("button", { name: "Đặt cốc lên cân" }).click();
  await expect(reading(page)).toContainText("Cân: 103,6 g");
  await expect(reading(page)).toContainText("ống đong: 0 mL");

  await station(page, /^Sỏi/);
  await page.getByTestId("density-drop").click();
  await expect(reading(page)).toContainText("ống đong: 62 mL");
});

test("number fields accept a decimal comma and flag text that is not a number", async ({ page }) => {
  await open(page);
  await fill(page, "explore-mass-iron-1v", "78,5");
  await expect(page.getByTestId("density-notebook-explore")).toContainText("7,85");
  await fill(page, "explore-mass-iron-2v", "abc");
  await expect(page.getByRole("alert")).toContainText("Nhập một số");
  await fill(page, "explore-mass-iron-2v", "156");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("submit stays disabled until every station is complete, then sends the evidence envelope", async ({ page }) => {
  const submissions: any[] = [];
  await open(page);
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "density-attempt", verdict: "passed", simulationResult: {
        version: "1.0.0",
        observations: {
          block: { ownDensityGcm3: 0.6, referenceDensityGcm3: 0.6, withinReferenceBand: true },
          water: { ownDensityGcm3: 1, referenceDensityGcm3: 1, withinReferenceBand: true },
          pebble: { ownDensityGcm3: 2.6, referenceDensityGcm3: 2.6, withinReferenceBand: true },
        },
        assessment: { score: 6, maximumScore: 6, unmetCriteria: [], passed: true },
      },
    } } });
  });
  const submit = page.getByTestId("lab-run-submit");
  await expect(submit).toBeDisabled();

  const masses: Record<string, string> = { "iron-1v": "78", "iron-2v": "156", "iron-3v": "234", "aluminium-1v": "27", "copper-1v": "89" };
  for (const [id, mass] of Object.entries(masses)) await fill(page, `explore-mass-${id}`, mass);
  await page.getByRole("radio", { name: /Cùng một chất thì m\/V không đổi/ }).click();

  await station(page, /^Khối gỗ/);
  for (const [field, value] of [["a", "100"], ["b", "60"], ["c", "40"], ["mass", "144"]]) await fill(page, `block-0-${field}`, value);
  await fill(page, "block-density-value", "0,6");

  await station(page, /^Nước/);
  await fill(page, "water-volume", "50");
  await fill(page, "water-m1", "48,6");
  await fill(page, "water-m2", "98,6");
  await fill(page, "water-density-value", "1");
  await page.getByTestId("water-density-unit").selectOption("g/ml");

  await station(page, /^Sỏi/);
  await fill(page, "pebble-mass", "31,2");
  await fill(page, "pebble-v1", "50");
  await fill(page, "pebble-v2", "62");
  await fill(page, "pebble-density-value", "2,6");

  await station(page, /^Kết luận/);
  await expect(submit).toBeDisabled();
  await expect(page.getByTestId("density-ready")).toContainText("đổi sang kg/m³");
  await fill(page, "units-wood", "600");
  await page.getByRole("radio", { name: /thể tích sỏi bằng thể tích nước dâng lên/ }).click();
  await expect(page.getByTestId("density-ready")).toContainText("Em đã hoàn thành các bảng ghi số liệu");
  await expect(submit).toBeEnabled();

  await submit.click();
  await expect(page.getByTestId("density-result")).toContainText("6 / 6");
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ contract: "lab-contract/1", runId: "density-run", stateSchemaVersion: 1, evidenceSchemaVersion: 1 });
  expect(submissions[0].evidence).toEqual({
    explore: {
      masses: [
        { specimenId: "iron-1v", massG: 78 }, { specimenId: "iron-2v", massG: 156 }, { specimenId: "iron-3v", massG: 234 },
        { specimenId: "aluminium-1v", massG: 27 }, { specimenId: "copper-1v", massG: 89 },
      ],
      conclusion: "A",
    },
    block: { specimenId: "wood-block-a", trials: [{ aMm: 100, bMm: 60, cMm: 40, massG: 144 }], density: { value: 0.6, unit: "g/cm3" } },
    water: { pouredMl: 50, volumeMl: 50, m1G: 48.6, m2G: 98.6, density: { value: 1, unit: "g/ml" } },
    pebble: { specimenId: "pebble-a", initialMl: 50, massG: 31.2, v1Ml: 50, v2Ml: 62, density: { value: 2.6, unit: "g/cm3" } },
    units: { woodKgm3: 600, irregularReason: "A" },
  });
  expect(submissions[0]).not.toHaveProperty("labState");
  expect(submissions[0]).not.toHaveProperty("checkpoints");
});

test("2D and 3D views share the same station state and the toggle remembers the choice", async ({ page }) => {
  await open(page, "3d");
  const toggle = page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" });
  await expect(toggle.getByRole("button", { name: "3D" })).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("density-balance-toggle").click();
  await expect(reading(page)).toContainText("Cân: 78,0 g");
  await toggle.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("density-2d-stage")).toBeVisible();
  await expect(reading(page)).toContainText("Cân: 78,0 g");
  await toggle.getByRole("button", { name: "3D" }).click();
  await expect(page.getByTestId("physics-stage")).toBeAttached();
  await expect(reading(page)).toContainText("Cân: 78,0 g");
});
