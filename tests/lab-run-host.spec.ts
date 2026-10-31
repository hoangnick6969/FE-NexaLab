import { expect, test, type Page } from "@playwright/test";

const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 8, mustChangePassword: false,
};

async function mockShell(page: Page, labId = "circuit") {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-lab", (route) => route.fulfill({ json: {
    id: "assignment-lab", title: "Lab mạch điện", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: {
      id: labId, title: labId === "chemistry" ? "Thí nghiệm hoá học" : "Mạch điện",
      subject: { id: "science", name: "KHTN" }, grade: 8,
      topic: labId === "chemistry" ? "Chất và sự biến đổi" : "Điện",
      learningObjective: labId === "chemistry" ? "Nhận biết các mẫu dung dịch" : "Lắp mạch điện",
      prerequisites: "", challengeId: labId === "chemistry" ? "chemistry_001" : "circuit_001",
    },
  } }));
}

const launch = (runId: string, modelRef = "circuit@1.0.0") => ({
  contract: "lab-contract/1", runId, labId: "circuit", challengeId: "circuit_001",
  modelRef, engineVersion: "1.1.0", activityVersionId: "activity-1", activityVersion: 1,
  rubricVersion: "legacy-challenge@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: null, expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-lab", versionBinding: "ASSIGNMENT_PINNED",
});

test("P3.2b assigned LabRun restores a compatible F5 draft and retries with the same key", async ({ page }) => {
  await mockShell(page);
  let launches = 0;
  const launchBodies: any[] = [];
  const submissions: any[] = [];
  await page.route("**/api/labs/circuit/runs", async (route) => {
    launchBodies.push(route.request().postDataJSON());
    launches += 1;
    await route.fulfill({ json: launch(`run-${launches}`) });
  });
  await page.route("**/api/attempts", async (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    if (submissions.length === 1) {
      await route.fulfill({ status: 503, json: { message: "Máy chủ bận" } });
      return;
    }
    await route.fulfill({ status: 201, json: {
      attempt: {
        id: "attempt-1", runId: body.runId, verdict: "passed", attemptNumber: 1,
        simulationResult: { currentMa: 14.89, ledState: "ON", status: "SAFE" },
      },
      retryGuidance: null,
    } });
  });

  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("lab-run-submit")).toBeVisible();
  await page.getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" }).click();
  await page.waitForTimeout(500);

  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("lab-draft-restore")).toBeVisible();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText("Máy chủ bận")).toBeVisible();
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();

  expect(launchBodies).toEqual([
    { challengeId: "circuit_001", assignmentId: "assignment-lab" },
    { challengeId: "circuit_001", assignmentId: "assignment-lab" },
  ]);
  expect(submissions).toHaveLength(2);
  expect(submissions[0].runId).toBe("run-2");
  expect(submissions[0].labState.edges).toHaveLength(4);
  expect(submissions[1].idempotencyKey).toBe(submissions[0].idempotencyKey);
});

test("P3.2b refuses a model without an explicitly compatible renderer", async ({ page }) => {
  await mockShell(page);
  await page.route("**/api/labs/circuit/runs", (route) => route.fulfill({ json: launch("run-unknown", "circuit@2.0.0") }));

  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();

  await expect(page.getByText("Chưa cài giao diện tương thích với circuit@2.0.0.")).toBeVisible();
  await expect(page.getByTestId("lab-run-submit")).toHaveCount(0);
});

test("bulb activity restores its predictions and sends checkpoint evidence to the pinned run", async ({ page }) => {
  await mockShell(page);
  let launches = 0;
  const submissions: any[] = [];
  await page.route("**/api/labs/circuit/runs", (route) => route.fulfill({ json: {
    ...launch(`bulb-run-${++launches}`, "circuit-bulb@1.0.0"),
    rendererKey: "circuit-bulb", rubricVersion: "circuit-bulb-checkpoints@1.0.0",
  } }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "bulb-attempt", verdict: "passed", simulationResult: {
        observations: [
          { id: "CLOSED", scientificObservation: { bulbState: "ON" }, predictionCorrect: true },
          { id: "OPEN", scientificObservation: { bulbState: "OFF" }, predictionCorrect: true },
        ], assessment: { score: 3, maximumScore: 3, unmetCriteria: [] },
      },
    } } });
  });
  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  const rendererToggle = page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" });
  await expect(rendererToggle.getByRole("button", { name: "3D" })).toHaveAttribute("aria-pressed", "true");
  await rendererToggle.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("bulb-2d-stage")).toBeVisible();
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  await page.getByText("Sáng", { exact: true }).click();
  await page.getByTestId("bulb-diagram-switch").press("Space");
  await expect(page.getByTestId("bulb-observation")).toContainText("Bóng đèn sáng");
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(page.getByTestId("bulb-2d-stage")).toBeVisible();
  await rendererToggle.getByRole("button", { name: "3D" }).click();
  await expect(page.locator(".bulb-step-count")).toHaveText("3 / 6");
  await expect(page.getByTestId("bulb-observation")).toContainText("Bóng đèn sáng");
  await expect(page.getByTestId("bulb-diagram-switch")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bulb-prediction-open").locator("input:checked")).toHaveCount(0);
  await page.getByText("Tắt", { exact: true }).click();
  await page.getByTestId("bulb-diagram-switch").press("Space");
  await expect(page.getByTestId("bulb-observation")).toContainText("Bóng đèn tắt");
  await page.locator("label.bulb-explanation-choice").filter({ hasText: /Công tắc mở làm ngắt đường đi/ }).click();
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText("Công tắc đóng: Bóng đèn sáng", { exact: false })).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ runId: "bulb-run-2", explanation: "A", checkpoints: [
    { id: "CLOSED", prediction: "ON", state: { nodes: expect.arrayContaining([{ id: "switch", type: "switch", closed: true }]) } },
    { id: "OPEN", prediction: "OFF", state: { nodes: expect.arrayContaining([{ id: "switch", type: "switch", closed: false }]) } },
  ] });
  expect(submissions[0]).not.toHaveProperty("labState");
});

test("P3.5 chemistry model uses its own renderer and submits its distinct state contract", async ({ page }) => {
  await mockShell(page, "chemistry");
  const submissions: any[] = [];
  await page.route("**/api/labs/chemistry/runs", (route) => route.fulfill({ json: {
    ...launch("chemistry-run", "chemistry@1.0.0"), labId: "chemistry", challengeId: "chemistry_001",
    rendererKey: "chemistry", initialState: { samples: {} },
  } }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "chemistry-attempt", verdict: "passed", simulationResult: {
        experiment: "ph", verdict: "passed", samples: [
          { id: "jar1", type: "acid", correct: true },
          { id: "jar2", type: "neutral", correct: true },
          { id: "jar3", type: "base", correct: true },
        ],
      },
    } } });
  });

  await page.goto("/labs/chemistry?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByRole("button", { name: "Nhúng giấy quỳ tím vào lọ 1" })).toBeVisible();
  for (const jar of [1, 2, 3]) {
    await page.getByRole("button", { name: `Nhúng giấy quỳ tím vào lọ ${jar}` }).click();
    await page.getByRole("combobox").nth(jar - 1).selectOption(["acid", "neutral", "base"][jar - 1]);
  }
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText(/Lọ 1: Axit/)).toBeVisible();
  await page.screenshot({ path: "output/playwright/p35-chemistry-compatibility.png", fullPage: true });

  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    contract: "lab-contract/1", runId: "chemistry-run", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    labState: { samples: { jar1: "acid", jar2: "neutral", jar3: "base" } },
  });
  expect(submissions[0]).not.toHaveProperty("checkpoints");
});


for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Lab Space pilot fills viewport and questions preserve evidence at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockShell(page);
    await page.route("**/api/labs/circuit/runs", route => route.fulfill({ json: { ...launch("space-run", "circuit-bulb@1.0.0"), rendererKey: "circuit-bulb" } }));
    await page.goto("/labs/circuit?assignmentId=assignment-lab");
    const space = page.getByTestId("lab-space");
    await expect(space).toHaveCSS("position", "fixed");
    await expect(page.locator(".sidebar, .topbar, .footer")).toHaveCount(0);
    await page.getByTestId("lab-session-start").click();
    const stage = page.getByTestId("physics-stage");
    await expect(stage).toBeVisible();
    expect(await stage.boundingBox()).toMatchObject({ x: 0, y: 0, ...viewport });
    await page.screenshot({ path: `output/playwright/lab-space-initial-${viewport.width}.png` });
    await page.getByRole("button", { name: "Đóng câu hỏi", exact: true }).focus();
    await page.keyboard.press("Escape");
    const badge = page.getByRole("button", { name: "Câu hỏi · 1/6" });
    await expect(badge).toBeFocused();
    await expect(page.getByTestId("bulb-prediction-closed")).not.toBeVisible();
    await expect(page.getByTestId("bulb-diagram-switch")).toBeDisabled();
    await badge.click();
    await expect(page.getByRole("button", { name: "Đóng câu hỏi", exact: true })).toBeFocused();
    await expect(page.getByTestId("bulb-prediction-closed").locator("input:checked")).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `output/playwright/lab-space-pilot-${viewport.width}.png` });
    await page.getByRole("button", { name: "Đóng câu hỏi", exact: true }).click();
    await expect(stage.locator("canvas")).toBeVisible();
    expect(await page.evaluate(() => document.elementFromPoint(innerWidth/2, innerHeight*.35)?.tagName)).toBe("CANVAS");
    await page.screenshot({ path: `output/playwright/lab-space-pilot-${viewport.width}-closed.png` });
    await expect(page.getByRole("link", { name: "Thoát phòng thực hành" })).toHaveAttribute("href", "/assignments/assignment-lab");
  });
}

test("Lab Space no WebGL shows honest recovery and retains visible experiment controls", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: any[]) {
      if (String(args[0]).includes("webgl") && !(window as any).allowLabWebgl) return null;
      return original.apply(this, args as any);
    } as any;
  });
  await mockShell(page);
  await page.route("**/api/labs/circuit/runs", route => route.fulfill({ json: { ...launch("no-webgl", "circuit-bulb@1.0.0"), rendererKey: "circuit-bulb" } }));
  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByText(/Không thể hiển thị không gian 3D/)).toBeVisible();
  await page.getByText("Sáng", { exact: true }).click();
  await page.getByTestId("bulb-diagram-switch").click();
  await expect(page.getByTestId("bulb-observation")).toContainText("Bóng đèn sáng");
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  await page.evaluate(() => { (window as any).allowLabWebgl = true; });
  await page.getByRole("button", { name: "Thử tải lại 3D" }).click();
  await expect(page.getByTestId("physics-stage").locator("canvas")).toBeVisible();
  await expect(page.getByRole("link", { name: "Thoát phòng thực hành" })).toBeVisible();
});

test("assigned lesson explicit Lab Space entry preserves arbitrary topology, values and attempt context", async ({ page }) => {
  await mockShell(page);
  const lesson = { id: "lesson-circuit", title: "Mạch điện", grade: 8, topic: "Điện", subject: { name: "KHTN" } };
  const steps = [{ id: "step-lab", type: "LAB", state: "IN_PROGRESS", resource: { labId: "circuit", challengeId: "circuit_001" } }];
  await page.route("**/api/assignments/lesson-assignment", route => route.fulfill({ json: { id: "lesson-assignment", contentType: "lesson", content: lesson, classroom: { name: "8A" } } }));
  await page.route("**/api/lessons/lesson-circuit/pathway*", route => route.fulfill({ json: { lesson, steps, nextStepId: "step-lab" } }));
  const submissions: any[] = [];
  await page.route("**/api/attempts", async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ json: { attempt: { id: "step-attempt", verdict: "passed", simulationResult: {} }, pathway: { lesson, steps: [{ ...steps[0], state: "COMPLETED" }], nextStepId: null } } });
  });
  await page.goto("/assignments/lesson-assignment");
  await expect(page.getByTestId("lab-space")).toHaveCount(0);
  await page.getByTestId("lab-space-enter").click();
  const circuitViews = page.getByTestId("lab-renderer-toggle");
  await circuitViews.getByRole("button", { name: "2D" }).click();
  await expect(page.locator(".react-flow")).toBeVisible();
  await circuitViews.getByRole("button", { name: "3D" }).click();
  await page.getByLabel("Linh kiện", { exact: true }).selectOption("r1");
  await page.getByLabel("Giá trị linh kiện").fill("470");
  await page.getByLabel("Đầu dây nguồn").selectOption("b1");
  await page.getByLabel("Đầu dây đích").selectOption("l1");
  await page.getByRole("button", { name: "Nối dây", exact: true }).click();
  await page.getByRole("button", { name: "Thoát phòng thực hành" }).click();
  await expect(page.getByTestId("lab-space-enter")).toBeFocused();
  await page.getByTestId("lab-space-enter").click();
  await expect(page.getByLabel("Giá trị linh kiện")).toHaveValue("470");
  await expect(page.getByRole("list", { name: "Dây nối", exact: true })).toContainText("1 → 3");
  await page.getByTestId("circuit-submit-button").click();
  await expect(page.getByTestId("circuit-verdict-banner")).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ assignmentId: "lesson-assignment", lessonStepId: "step-lab", challengeId: "circuit_001", labState: { nodes: expect.arrayContaining([{ id: "r1", type: "resistor", value: 470 }]), edges: [{ source: "b1", target: "l1" }] } });
  expect(submissions[0]).not.toHaveProperty("runId");
  await page.getByRole("button", { name: "Thoát phòng thực hành" }).click();
  await expect(page.locator("#step-step-lab")).toHaveClass(/completed/);
});
