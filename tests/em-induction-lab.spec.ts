import { expect, test, type Page } from "@playwright/test";

// FL-25 private prototype: route-mocked API only. Server scoring is covered by the BE suites.
const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 9, mustChangePassword: false,
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
  await page.route("**/api/assignments/assignment-em", (route) => route.fulfill({ json: {
    id: "assignment-em", title: "Cảm ứng điện từ", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "9A" },
    content: {
      id: "em-induction", title: "Cảm ứng điện từ", subject: { id: "science", name: "KHTN" }, grade: 9,
      topic: "Điện từ", learningObjective: "Điều kiện xuất hiện dòng điện cảm ứng", prerequisites: "", challengeId: "em_001",
    },
  } }));
}

const launch = (runId: string) => ({
  contract: "lab-contract/1", runId, labId: "em-induction", challengeId: "em_001",
  modelRef: "em-induction@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-em", activityVersion: 1,
  rubricVersion: "em-induction-checkpoints@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: "em-induction", expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-em", versionBinding: "ASSIGNMENT_PINNED",
});

const coil = (magnetPosition: string, motion: string) =>
  ({ setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "N", magnetPosition, motion });

test("FL-25 induction activity runs in 2D, restores after F5 and submits only checkpoint evidence", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  let launches = 0;
  const submissions: any[] = [];
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch(`em-run-${++launches}`) }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "em-attempt", verdict: "passed", simulationResult: {
        observations: [
          { id: "STILL", scientificObservation: { setup: "magnet-coil", inducedCurrent: "ABSENT", direction: "NONE" }, predictionCorrect: true },
          { id: "PUSH", scientificObservation: { setup: "magnet-coil", inducedCurrent: "PRESENT", direction: "D1" }, predictionCorrect: true },
          { id: "PULL", scientificObservation: { setup: "magnet-coil", inducedCurrent: "PRESENT", direction: "D2" }, predictionCorrect: true },
          { id: "ROTATE", scientificObservation: { setup: "generator", inducedCurrent: "PRESENT", currentKind: "ALTERNATING" }, predictionCorrect: true },
        ], assessment: { score: 5, maximumScore: 5, unmetCriteria: [] },
      },
    } } });
  });

  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  const toggle = page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" });
  await expect(toggle.getByRole("button", { name: "3D" })).toHaveAttribute("aria-pressed", "true");
  await toggle.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("em-2d-stage")).toBeVisible();
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();

  const act = page.getByTestId("em-act");
  const observation = page.getByTestId("em-observation");
  // A prediction is required before the action unlocks.
  await expect(act).toBeDisabled();
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await act.focus();
  await page.keyboard.press("Enter");
  await expect(observation).toContainText("đứng yên ở vạch 0", { timeout: 5000 });

  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await act.press("Enter");
  await expect(observation).toContainText("lệch sang phải", { timeout: 5000 });
  await expect(page.locator(".em-step")).toHaveText("Bước 5/9");
  await page.waitForTimeout(500);

  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(page.locator(".em-step")).toHaveText("Bước 5/9");
  await expect(observation).toContainText("lệch sang phải");

  await page.getByTestId("em-prediction-pull").getByLabel("Ngược chiều với lúc đẩy vào").click();
  await act.press("Enter");
  await expect(observation).toContainText("lệch sang trái", { timeout: 5000 });

  await page.getByTestId("em-prediction-rotate").getByLabel("Dòng điện luân phiên đổi chiều").click();
  await act.press("Enter");
  await expect(observation).toContainText("đổi chiều hai lần", { timeout: 8000 });

  await page.getByRole("radio", { name: /số đường sức từ xuyên qua tiết diện/ }).click();
  await expect(page.getByTestId("lab-run-submit")).toBeEnabled();
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText("Đẩy cực N vào: có dòng điện, kim lệch phải, dự đoán đúng")).toBeVisible();

  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toEqual(expect.objectContaining({
    runId: "em-run-2", explanation: "A", checkpoints: [
      { id: "STILL", state: coil("OUTSIDE", "STILL"), prediction: "NO_CURRENT" },
      { id: "PUSH", state: coil("INSIDE", "TOWARD"), prediction: "CURRENT" },
      { id: "PULL", state: coil("OUTSIDE", "AWAY"), prediction: "OPPOSITE" },
      { id: "ROTATE", state: { setup: "generator", circuit: "CLOSED", rotation: "CW", turns: 1 }, prediction: "ALTERNATING" },
    ],
  }));
  expect(submissions[0]).not.toHaveProperty("labState");
  expect(submissions[0]).not.toHaveProperty("observed");
});

test("FL-25 direct manipulation: drag the magnet and turn the crank in 2D; the payload is unchanged", async ({ page }) => {
  await mockShell(page);
  const submissions: any[] = [];
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch("em-run-drag") }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: { id: "em-attempt", verdict: "passed", simulationResult: { observations: [], assessment: { score: 5, maximumScore: 5, unmetCriteria: [] } } } } });
  });
  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();
  const observation = page.getByTestId("em-observation");
  const step = page.locator(".em-step");
  const svgBox = (await page.getByTestId("em-2d-stage").locator("svg").boundingBox())!;
  const unit = svgBox.width / 900; // screen pixels per SVG unit
  const dragMagnet = async (svgUnits: number) => {
    const box = (await page.getByTestId("em-2d-magnet").boundingBox())!;
    const x = box.x + box.width * .3, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 16; i++) { await page.mouse.move(x + (svgUnits * unit * i) / 16, y); await page.waitForTimeout(16); }
    await page.mouse.up();
  };

  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await expect(observation).toContainText("đứng yên ở vạch 0", { timeout: 5000 });

  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await expect(page.getByTestId("em-drag-hint")).toContainText("Kéo nam châm");
  // Half a stroke and release: nothing is recorded and the magnet slides back.
  await dragMagnet(60);
  await page.waitForTimeout(600);
  await expect(step).toHaveText("Bước 4/9");
  await dragMagnet(160);
  await expect(observation).toContainText("lệch sang phải", { timeout: 3000 });
  await expect(step).toHaveText("Bước 5/9");

  await page.getByTestId("em-prediction-pull").getByLabel("Ngược chiều với lúc đẩy vào").click();
  await page.waitForTimeout(300);
  await dragMagnet(-160);
  await expect(observation).toContainText("lệch sang trái", { timeout: 3000 });

  await page.getByTestId("em-prediction-rotate").getByLabel("Dòng điện luân phiên đổi chiều").click();
  const rotor = (await page.getByTestId("em-2d-rotor").boundingBox())!;
  const cx = rotor.x + rotor.width / 2, cy = rotor.y + rotor.height / 2, r = 40 * unit;
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) { const a = (i / 36) * Math.PI * 2; await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); await page.waitForTimeout(16); }
  await page.mouse.up();
  await expect(observation).toContainText("đổi chiều hai lần", { timeout: 3000 });

  await page.getByRole("radio", { name: /số đường sức từ xuyên qua tiết diện/ }).click();
  await page.getByTestId("lab-run-submit").click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].checkpoints.map((checkpoint: any) => checkpoint.state)).toEqual([
    coil("OUTSIDE", "STILL"), coil("INSIDE", "TOWARD"), coil("OUTSIDE", "AWAY"),
    { setup: "generator", circuit: "CLOSED", rotation: "CW", turns: 1 },
  ]);
  expect(submissions[0]).not.toHaveProperty("observed");
});

test("FL-25 3D scene mounts, acts from the DOM control and fits a phone viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShell(page);
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch("em-run-3d") }));
  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  await expect(page.locator("[data-testid=physics-stage] canvas")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await expect(page.getByTestId("em-observation")).toContainText("đứng yên ở vạch 0", { timeout: 5000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const button of await page.locator(".em-activity button:visible").all())
    expect((await button.getAttribute("aria-label")) ?? (await button.innerText()).trim()).not.toBe("");
  await page.screenshot({ path: "test-results/em-induction-3d-390.png" });
  expect(errors.filter((message) => !/favicon|DevTools/.test(message))).toEqual([]);
});

test("FL-25 3D desktop: the needle, LED and current arrows respond during a push", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await mockShell(page);
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch("em-run-desktop") }));
  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  await expect(page.locator("[data-testid=physics-stage] canvas")).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/em-induction-3d-desktop-rest.png" });
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await expect(page.getByTestId("em-observation")).toContainText("đứng yên ở vạch 0", { timeout: 5000 });
  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await page.waitForTimeout(430);
  await page.screenshot({ path: "test-results/em-induction-3d-desktop-push.png" });
  await expect(page.getByTestId("em-observation")).toContainText("lệch sang phải", { timeout: 5000 });
});

test("FL-25 free explore unlocks after the checkpoints, follows the model and stays out of the submission", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  const submissions: any[] = [];
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch("em-run-explore") }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: { id: "em-attempt", verdict: "passed", simulationResult: { observations: [], assessment: { score: 5, maximumScore: 5, unmetCriteria: [] } } } } });
  });
  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();

  const act = page.getByTestId("em-act");
  const observation = page.getByTestId("em-observation");
  await expect(page.getByTestId("em-explore")).toHaveCount(0);
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("đứng yên ở vạch 0", { timeout: 5000 });
  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("lệch sang phải", { timeout: 5000 });
  await page.getByTestId("em-prediction-pull").getByLabel("Ngược chiều với lúc đẩy vào").click();
  await act.click();
  await expect(observation).toContainText("lệch sang trái", { timeout: 5000 });
  await page.getByTestId("em-prediction-rotate").getByLabel("Dòng điện luân phiên đổi chiều").click();
  // Explore stays locked until the last checkpoint has been observed.
  await expect(page.getByTestId("em-explore")).toHaveCount(0);
  await act.click();
  await expect(observation).toContainText("đổi chiều hai lần", { timeout: 8000 });

  await page.getByRole("button", { name: "Khám phá thêm" }).click();
  const explored = page.getByTestId("em-explore-observation");
  await expect(explored).toContainText("Chọn một thao tác");
  // S pole toward the coil reverses the current of the N-pole push.
  await page.getByRole("group", { name: "Cực hướng vào cuộn dây" }).getByLabel("S", { exact: true }).check();
  await page.getByTestId("em-explore-magnet").click();
  await expect(explored).toContainText("lệch sang trái", { timeout: 5000 });
  await expect(page.locator(".em-2d-stage .em-2d-pole").last()).toHaveText("S");
  // The magnet is now inside: holding still gives no current.
  await page.getByTestId("em-explore-hold").click();
  await expect(explored).toContainText("đứng yên ở vạch 0", { timeout: 5000 });
  // An open circuit carries no current even while the magnet moves.
  await page.getByRole("group", { name: "Mạch điện" }).getByLabel("Hở (công tắc mở)").check();
  await expect(page.getByTestId("em-2d-open-switch")).toBeVisible();
  await expect(page.getByTestId("em-explore-magnet")).toHaveText("Kéo nam châm ra");
  await page.getByTestId("em-explore-magnet").click();
  await expect(explored).toContainText("Mạch hở", { timeout: 5000 });
  await page.getByRole("group", { name: "Mạch điện" }).getByLabel("Kín").check();
  await page.getByTestId("em-explore-ccw").click();
  await expect(explored).toContainText("đổi chiều hai lần", { timeout: 8000 });
  // The checkpoint result is unchanged by exploring.
  await expect(observation).toContainText("đổi chiều hai lần");

  await page.getByRole("button", { name: "Đóng khám phá" }).click();
  await expect(page.getByTestId("em-2d-open-switch")).toHaveCount(0);
  await page.getByRole("radio", { name: /số đường sức từ xuyên qua tiết diện/ }).click();
  await page.getByTestId("lab-run-submit").click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].checkpoints.map((item: any) => item.state)).toEqual([
    coil("OUTSIDE", "STILL"), coil("INSIDE", "TOWARD"), coil("OUTSIDE", "AWAY"),
    { setup: "generator", circuit: "CLOSED", rotation: "CW", turns: 1 },
  ]);
  expect(JSON.stringify(submissions[0])).not.toMatch(/CCW|OPEN|"S"/);
});

test("FL-25 WebGL context loss falls back honestly, keeps evidence and the 2D view still works", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  await page.route("**/api/labs/em-induction/runs", (route) => route.fulfill({ json: launch("em-run-lost") }));
  await page.goto("/labs/em-induction?assignmentId=assignment-em");
  await page.getByTestId("lab-session-start").click();
  const canvas = page.locator("[data-testid=physics-stage] canvas");
  await expect(canvas).toBeVisible({ timeout: 20000 });
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await expect(page.getByTestId("em-observation")).toContainText("đứng yên ở vạch 0", { timeout: 5000 });

  await canvas.evaluate((element: HTMLCanvasElement) => element.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
  await expect(page.getByText(/Không thể hiển thị không gian 3D/)).toBeVisible();
  // The question panel and evidence are unaffected by the lost scene.
  await expect(page.locator(".em-step")).toHaveText("Bước 3/9");
  await page.getByRole("button", { name: "Thử tải lại 3D" }).click();
  await expect(canvas).toBeVisible({ timeout: 20000 });
  await canvas.evaluate((element: HTMLCanvasElement) => element.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
  await expect(page.getByText(/Không thể hiển thị không gian 3D/)).toBeVisible();
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("em-2d-stage")).toBeVisible();
  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Có dòng điện", exact: true }).click();
  await page.getByTestId("em-act").click();
  await expect(page.getByTestId("em-observation")).toContainText("lệch sang phải", { timeout: 5000 });
  // Coming back to 3D mounts a fresh canvas and context.
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "3D" }).click();
  await expect(canvas).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".em-step")).toHaveText("Bước 5/9");
});
