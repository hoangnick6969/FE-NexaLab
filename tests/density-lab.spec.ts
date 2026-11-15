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
  // B3 after a pass: what-if answered from the density model.
  await page.getByTestId("what-if").getByRole("button", { name: "Nếu dùng khối sắt to gấp đôi?" }).click();
  await expect(page.getByTestId("what-if-answer")).toContainText("Khối sắt gấp đôi: 156 g, 20 cm³ → 7,8 g/cm³.");
  await expect(page.getByTestId("what-if-answer")).toContainText("khối lượng riêng không đổi");
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

test("the server-pinned specimen pair replaces the local choice when a run launches", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("nexalab:lab-view:density-bench", "2d"));
  await mockShell(page);
  await page.route("**/api/labs/density/runs", (route) => route.fulfill({ json: { ...launch("pinned-run"), runtimeParams: { blockId: "wood-block-b", pebbleId: "pebble-b" } } }));
  await page.goto("/labs/density?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("density-activity")).toBeVisible();
  await station(page, /^Khối gỗ/);
  await expect(page.getByTestId("density-specimen")).toHaveValue("wood-block-b");
  await station(page, /^Sỏi/);
  await expect(page.getByTestId("density-specimen")).toHaveValue("pebble-b");
});

for (const width of [1280, 375]) {
  test(`preview keeps the view toggle in the header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("nexalab:lab-view:density-bench", "3d"));
    await page.goto("/dev/lab-kits/density");
    const header = page.locator(".lab-space-header");
    const toggle = header.getByTestId("lab-renderer-toggle");
    for (const mode of ["3D", "2D", "3D"]) {
      const button = toggle.getByRole("button", { name: mode, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toBeVisible();
      await expect(page.getByTestId(mode === "2D" ? "density-2d-stage" : "physics-stage")).toBeVisible();
      const box = (await toggle.boundingBox())!;
      const headerBox = (await header.boundingBox())!;
      // Layout A: the toggle sits inside the compact header, top left, never past the screen edge.
      expect(box.x + box.width).toBeLessThanOrEqual(Math.min(width, headerBox.x + headerBox.width));
      expect(box.x).toBeGreaterThanOrEqual(headerBox.x);
      expect(box.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
      for (const target of await toggle.getByRole("button").all()) {
        const targetBox = (await target.boundingBox())!;
        expect(targetBox.width).toBeGreaterThanOrEqual(44);
        expect(targetBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}

// Inspect the actual R3F scene: these checks catch invisible streams, early level
// jumps and geometry intersections that DOM-only instrument assertions miss.
async function waterScene(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = await import(moduleUrl);
    const root = _roots.get(document.querySelector("canvas"));
    if (!root) return null;
    const scene = root.store.getState().scene;
    const cylinder = scene.getObjectByName("pour-cylinder");
    const cup = scene.getObjectByName("pour-cup");
    const supply = scene.getObjectByName("pour-supply");
    const stream = scene.getObjectByName("pour-stream");
    if (!cylinder || !cup || !supply || !stream) return null;
    const volume = (group: any, name: string, radius: number) => { const mesh = group.getObjectByName(name); return mesh.visible ? mesh.scale.y * Math.PI * radius ** 2 / 1000 : 0; };
    return {
      cylinder: volume(cylinder, "cylinder-water-column", 13.5),
      cup: volume(cup, "beaker-water-column", 25),
      supply: volume(supply, "beaker-water-column", 25),
      stream: stream.visible,
      tilt: 2 * Math.acos(Math.min(1, Math.abs(cylinder.quaternion.w))),
      cylinderPosition: cylinder.position.toArray(),
      cupPosition: cup.position.toArray(),
    };
  });
}

// Advance the presentation clock without spending wall time rendering every
// intermediate software-WebGL frame; render before/after each phase boundary.
async function advancePour(page: Page, milliseconds: number) {
  await page.clock.runFor(32);
  await page.clock.fastForward(milliseconds);
  await page.clock.runFor(32);
}

async function waterPreview(page: Page, reduced = false) {
  await page.setViewportSize({ width: 960, height: 640 });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.addInitScript(() => localStorage.setItem("nexalab:lab-view:density-bench", "3d"));
  await page.goto("/dev/lab-kits/density");
  await page.getByRole("tab", { name: "Nước", exact: true }).click({ force: true });
  await page.clock.runFor(300);
  await expect.poll(() => waterScene(page)).not.toBeNull();
}

test("3D pouring lifts, tilts, streams, conserves water and returns; reverse and refill work", async ({ page }) => {
  test.setTimeout(120000);
  await waterPreview(page);
  await page.getByTestId("density-balance-toggle").click({ force: true });
  await advancePour(page, 1000);
  await page.getByTestId("density-transfer").click({ force: true });
  await advancePour(page, 1400);
  await expect.poll(async () => (await waterScene(page))?.stream, { timeout: 30000, intervals: [50] }).toBe(true);
  const during = (await waterScene(page))!;
  expect(during.tilt).toBeGreaterThan(0.95);
  expect(during.cylinderPosition[1]).toBeGreaterThan(20);
  expect(during.cylinder).toBeGreaterThan(0);
  expect(during.cup).toBeGreaterThan(0);
  expect(during.cylinder + during.cup + during.supply).toBeCloseTo(100, 4);
  await page.screenshot({ path: "test-results/density-water-pour.png" });
  await advancePour(page, 3000);
  await expect.poll(async () => (await waterScene(page))?.cylinderPosition, { timeout: 30000 }).toEqual([225, 0, 0]);
  const after = (await waterScene(page))!;
  expect(after.stream).toBe(false);
  expect(after.tilt).toBe(0);
  expect(after.cup).toBeCloseTo(50, 4);
  expect(after.cylinder).toBeCloseTo(0, 4);
  await expect(reading(page)).toContainText("98,6 g");
  await page.getByTestId("density-transfer").click({ force: true });
  await advancePour(page, 1400);
  await expect.poll(async () => (await waterScene(page))?.stream, { timeout: 30000, intervals: [50] }).toBe(true);
  await advancePour(page, 2200);
  await expect.poll(async () => (await waterScene(page))?.cylinder, { timeout: 30000 }).toBeCloseTo(50, 4);
  // Coalesce rapid consecutive edits into the next pour.
  await page.getByRole("button", { name: "Rót thêm 5 mL" }).click({ force: true });
  await expect(reading(page)).toContainText("ống đong: 55 mL");
  await page.getByRole("button", { name: "Rót thêm 5 mL" }).click({ force: true });
  await expect(reading(page)).toContainText("ống đong: 60 mL");
  await advancePour(page, 1400);
  await expect.poll(async () => (await waterScene(page))?.stream, { timeout: 30000, intervals: [50] }).toBe(true);
  await advancePour(page, 3000);
  await advancePour(page, 3000);
  await expect.poll(async () => (await waterScene(page))?.cylinder, { timeout: 30000 }).toBeCloseTo(60, 4);
  const refilled = (await waterScene(page))!;
  expect(refilled.cup + refilled.cylinder + refilled.supply).toBeCloseTo(100, 4);
});

test("reduced motion snaps 3D water and balance state without a stream", async ({ page }) => {
  await waterPreview(page, true);
  await page.getByTestId("density-balance-toggle").click({ force: true });
  await page.getByTestId("density-transfer").click({ force: true });
  // The page clock is paused: wall-time polling cannot flush an R3F invalidate.
  // Advance RAF on each poll so slower grouped runs can commit the snapped scene.
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return (await waterScene(page))?.cup;
  }, { timeout: 15000 }).toBeCloseTo(50, 4);
  const sample = (await waterScene(page))!;
  expect(sample.stream).toBe(false);
  expect(sample.tilt).toBe(0);
  expect(sample.cylinderPosition).toEqual([225, 0, 0]);
  await page.getByTestId("density-transfer").click({ force: true });
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return (await waterScene(page))?.cylinder;
  }, { timeout: 15000 }).toBeCloseTo(50, 4);
});

test("both 3D pebbles stay within the bore throughout the drop and rest on the inner floor", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 960, height: 640 });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript(() => localStorage.setItem("nexalab:lab-view:density-bench", "3d"));
  await page.goto("/dev/lab-kits/density");
  await page.getByRole("tab", { name: "Sỏi", exact: true }).click({ force: true });
  for (const id of ["pebble-a", "pebble-b"]) {
    await page.getByTestId("density-specimen").selectOption(id);
    await expect(page.getByTestId("density-specimen")).toHaveValue(id);
    await expect(page.getByTestId("density-drop")).toHaveText("Thả sỏi vào ống đong");
    await page.getByTestId("density-drop").click({ force: true });
    await page.clock.runFor(100);
    const inspect = () => page.evaluate(async (specimenId) => {
      const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
      const { _roots } = await import(moduleUrl);
      const scene = _roots.get(document.querySelector("canvas"))?.store.getState().scene;
      const mesh = scene?.getObjectByName(`specimen-${specimenId}`);
      if (!mesh) return null;
      const positions = mesh.geometry.getAttribute("position");
      let radius = 0, bottom = Infinity;
      for (let i = 0; i < positions.count; i++) {
        radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
        bottom = Math.min(bottom, positions.getY(i) + mesh.position.y + mesh.parent.position.y);
      }
      return { radius, bottom };
    }, id);
    await expect.poll(inspect, { timeout: 30000 }).not.toBeNull();
    const dropping = (await inspect())!;
    expect(dropping.radius).toBeLessThanOrEqual(0.78 * 13.5 + 0.00001);
    expect(dropping.bottom).toBeGreaterThanOrEqual(8);
    await page.clock.runFor(2000);
    await expect.poll(async () => (await inspect())?.bottom, { timeout: 30000 }).toBeCloseTo(8, 1);
    await page.screenshot({ path: `test-results/density-${id}-inside-cylinder.png` });
    await page.getByTestId("density-drop").click({ force: true });
    await expect(page.getByTestId("density-drop")).toHaveText("Thả sỏi vào ống đong");
  }
});

test("SAI-01A: while working, the learner picks a step and gets levels 1–2 without sending any state", async ({ page }) => {
  await open(page);
  const asked: any[] = [];
  await page.route("**/api/lab-runs/density-run/hints/steps", (route) => route.fulfill({ json: { reflections: false, maxLevel: 2, steps: [
    { criterion: "mass", label: "Đo khối lượng" }, { criterion: "volume", label: "Đo thể tích" },
  ] } }));
  await page.route("**/api/lab-runs/density-run/hints", (route) => {
    const body = route.request().postDataJSON();
    asked.push(body);
    const level = Math.min(2, asked.filter((item) => item.criterion === body.criterion).length);
    return route.fulfill({ status: 201, json: { id: `h${asked.length}`, level, content: `Gợi ý ${body.criterion} mức ${level}`,
      label: body.criterion === "mass" ? "Đo khối lượng" : "Đo thể tích", repeatReason: asked.length > 2 && level === 2 ? "TOP_LEVEL" : null } });
  });
  await page.getByTestId("step-hint-toggle").click();
  const panel = page.getByTestId("step-hint-panel");
  await panel.getByLabel("Em đang vướng ở bước nào?").selectOption({ label: "Đo thể tích" });
  await panel.getByRole("button", { name: "Gợi ý cho bước này" }).click();
  await expect(panel).toContainText("Mức 1/2 · Câu hỏi gợi mở");
  await expect(panel).toContainText("Về bước: Đo thể tích");
  await panel.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(panel).toContainText("Mức 2/2 · Gợi ý khái niệm");
  await panel.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(panel).toContainText("Trong lúc làm, gợi ý dừng ở mức này");
  // Another step starts fresh in the panel.
  await panel.getByLabel("Em đang vướng ở bước nào?").selectOption({ label: "Đo khối lượng" });
  await expect(panel.getByRole("button", { name: "Gợi ý cho bước này" })).toBeVisible();
  expect(asked).toEqual([
    { criterion: "volume", moment: "BEFORE_PREDICTION" }, { criterion: "volume", moment: "BEFORE_PREDICTION" }, { criterion: "volume", moment: "BEFORE_PREDICTION" },
  ]);
  await page.setViewportSize({ width: 360, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
