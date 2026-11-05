import { expect, test, type Page } from "@playwright/test";

// FL-21: route-mocked API only. Server scoring is covered by the BE suites.
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
  // SAI-01A: the in-run hint toggle asks whether the last observed step was mispredicted.
  await page.route("**/api/lab-runs/*/hints/check", (route) => route.fulfill({ status: 201, json: { mismatch: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-fw", (route) => route.fulfill({ json: {
    id: "assignment-fw", title: "Lưới thức ăn", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: {
      id: "food-web", title: "Lưới thức ăn và cân bằng tự nhiên", subject: { id: "biology", name: "KHTN" }, grade: 8,
      topic: "Hệ sinh thái", learningObjective: "Chuỗi, lưới thức ăn và cân bằng tự nhiên", prerequisites: "", challengeId: "fw_001",
    },
  } }));
}

const launch = (runId: string) => ({
  contract: "lab-contract/1", runId, labId: "food-web", challengeId: "fw_001",
  modelRef: "food-web@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-fw", activityVersion: 1,
  rubricVersion: "food-web-checkpoints@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: "food-web", expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-fw", versionBinding: "ASSIGNMENT_PINNED",
});
const W = { webId: "W1" };

test("FL-21 food web: answers before checks, a broken chain is shown, F5 restore and checkpoint-only payload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  let launches = 0;
  const submissions: any[] = [];
  await page.route("**/api/labs/food-web/runs", (route) => route.fulfill({ json: launch(`fw-run-${++launches}`) }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: { id: "fw-attempt", verdict: "passed", simulationResult: {
      observations: [
        { id: "ROLES", scientificObservation: { setup: "roles" }, predictionCorrect: true },
        { id: "CHAIN", scientificObservation: { setup: "chain", valid: true, startsWithProducer: true, length: 4 }, predictionCorrect: true },
        { id: "ENERGY", scientificObservation: { setup: "energy", levelsKJ: [10000, 1000, 100, 10] }, predictionCorrect: true },
        { id: "HUNT", scientificObservation: { setup: "remove", effects: { ech: { effect: "INCREASE" } } }, predictionCorrect: true },
        { id: "DEFOREST", scientificObservation: { setup: "remove", effects: { sau: { effect: "DECREASE" } } }, predictionCorrect: true },
        { id: "CAUSES", scientificObservation: { setup: "causes" }, predictionCorrect: true },
      ], assessment: { score: 7, maximumScore: 7, unmetCriteria: [] },
    } } } });
  });

  await page.goto("/labs/food-web?assignmentId=assignment-fw");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("fw-stage")).toBeVisible();
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  const act = page.getByTestId("fw-act");
  const observation = page.getByTestId("fw-observation");
  const step = page.locator(".fw-step");
  const node = (id: string) => page.locator(`.fw-node[data-species="${id}"]`);

  // ROLES: roles stay hidden until the answer is saved and checked.
  await expect(node("co")).not.toHaveAttribute("data-role", /.+/);
  const roles = page.getByTestId("fw-answer-roles");
  await roles.getByRole("group", { name: "Cỏ" }).getByLabel("Sản xuất").check();
  await roles.getByRole("group", { name: "Ếch" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Nấm, vi khuẩn" }).getByLabel("Phân giải").check();
  await roles.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.press("Enter");
  await expect(node("co")).toHaveAttribute("data-role", "PRODUCER");
  await expect(observation).toContainText("Cỏ là sinh vật sản xuất");

  // CHAIN: a broken chain is reported with the missing link, built from the keyboard.
  await node("co").focus();
  await page.keyboard.press("Enter");
  await node("chau-chau").click();
  await node("ech").click();
  await node("ran").click();
  await expect(page.getByTestId("fw-chain-text")).toContainText("Cỏ → Châu chấu → Ếch → Rắn");
  await expect(step).toHaveText("Bước 3/13");
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(page.getByTestId("fw-chain-text")).toContainText("Cỏ → Châu chấu → Ếch → Rắn");
  await page.getByTestId("fw-check-chain").click();
  await expect(observation).toContainText("Chuỗi hợp lệ: 4 mắt xích");
  // The board keeps the checked chain until the learner moves on.
  await expect(page.locator('.fw-node[data-in-chain="true"]')).toHaveCount(4);
  await page.getByTestId("fw-next").click();

  // ENERGY: values stay hidden until checked; a word is refused.
  const pyramid = page.getByTestId("fw-pyramid");
  await expect(pyramid).toContainText("? kJ");
  const energy = page.getByTestId("fw-answer-energy");
  await energy.getByLabel("Năng lượng (kJ)").fill("mười");
  await energy.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await expect(energy.getByRole("alert")).toBeVisible();
  await energy.getByLabel("Năng lượng (kJ)").fill("10");
  await energy.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await expect(pyramid).toContainText("10 kJ");
  await expect(observation).toContainText("Rắn nhận được 10 kJ");

  // HUNT: no removal is drawn before the prediction.
  await expect(node("ran")).toHaveAttribute("data-removed", "false");
  await page.getByTestId("fw-answer-hunt").getByLabel("Tăng lên").click();
  await expect(node("ran")).toHaveAttribute("data-removed", "false");
  await act.click();
  await expect(node("ran")).toHaveAttribute("data-removed", "true");
  await expect(node("ech")).toHaveAttribute("data-effect", "INCREASE");
  await expect(observation).toContainText("4 chuỗi thức ăn bị đứt");

  await page.getByTestId("fw-answer-deforest").getByLabel("Giảm đi").click();
  await act.click();
  await expect(node("sau")).toHaveAttribute("data-effect", "DECREASE");

  const causes = page.getByTestId("fw-answer-causes");
  for (const name of ["Phá rừng", "Săn bắt động vật hoang dã", "Khai thác tài nguyên quá mức", "Xả chất thải gây ô nhiễm"]) await causes.getByLabel(name).check();
  await causes.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await expect(page.getByTestId("fw-causes")).toContainText("Giúp bảo vệ, duy trì cân bằng tự nhiên");

  await page.getByRole("radio", { name: /mất rắn thì con mồi/ }).click();
  await page.getByTestId("lab-run-submit").click();
  const line = page.getByText("Mất rắn, ếch: tăng lên, trả lời đúng");
  await expect(line).toBeVisible();
  const box = (await line.boundingBox())!;
  expect(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest(".lab-aside")), [box.x + 8, box.y + box.height / 2])).toBe(true);

  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toEqual(expect.objectContaining({
    runId: "fw-run-2", explanation: "A", checkpoints: [
      { id: "ROLES", state: { setup: "roles", ...W }, prediction: { co: "PRODUCER", ech: "CONSUMER", "nam-vi-khuan": "DECOMPOSER" } },
      { id: "CHAIN", state: { setup: "chain", ...W, nodes: ["co", "chau-chau", "ech", "ran"] }, prediction: "CHAIN" },
      { id: "ENERGY", state: { setup: "energy", ...W, chain: ["co", "chau-chau", "ech", "ran"] }, prediction: { value: "10" } },
      { id: "HUNT", state: { setup: "remove", ...W, speciesId: "ran" }, prediction: "INCREASE" },
      { id: "DEFOREST", state: { setup: "remove", ...W, speciesId: "cay-xanh" }, prediction: "DECREASE" },
      { id: "CAUSES", state: { setup: "causes", ...W }, prediction: ["khai-thac", "o-nhiem", "pha-rung", "san-bat"] },
    ],
  }));
  expect(submissions[0]).not.toHaveProperty("observed");
});

test("FL-21 broken chain shows the missing link; phone layout has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await mockShell(page);
  await page.route("**/api/labs/food-web/runs", (route) => route.fulfill({ json: launch("fw-run-phone") }));
  await page.goto("/labs/food-web?assignmentId=assignment-fw");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("fw-stage")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const roles = page.getByTestId("fw-answer-roles");
  await roles.getByRole("group", { name: "Cỏ" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Ếch" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Nấm, vi khuẩn" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await page.getByTestId("fw-act").click();
  for (const id of ["co", "ech", "ran", "dai-bang"]) await page.locator(`.fw-node[data-species="${id}"]`).click();
  await page.getByTestId("fw-check-chain").click();
  await expect(page.getByTestId("fw-missing-link")).toHaveCount(1);
  await expect(page.getByTestId("fw-observation")).toContainText("Chuỗi bị đứt: Ếch không ăn cỏ");
  await page.screenshot({ path: "test-results/fw-phone.png" });
});

test("FL-21 K8 meadow: 3D by default on desktop, labels keep the node contract, 2D on request and remembered", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  await page.route("**/api/labs/food-web/runs", (route) => route.fulfill({ json: launch("fw-run-3d") }));
  await page.goto("/labs/food-web?assignmentId=assignment-fw");
  await page.getByTestId("lab-session-start").click();

  const stage = page.getByTestId("fw-stage");
  await expect(stage).toHaveAttribute("data-view", "3d");
  await expect(page.getByTestId("eco-3d").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("eco-3d")).toHaveAttribute("aria-hidden", "true");
  // The labels are real buttons outside the decorative canvas, one per organism.
  await expect(page.locator(".fw-meadow-labels .fw-node")).toHaveCount(11);
  await expect(page.locator('.fw-node[data-species="co"]')).toHaveAttribute("aria-label", "Cỏ");
  // Reading aid: hovering an organism brings its links forward and names them; the others dim.
  await page.locator('.fw-node[data-species="ech"]').hover();
  await expect(page.getByTestId("fw-relation")).toHaveText("Ếch ăn: Châu chấu, Sâu ăn lá. Ếch là thức ăn của: Rắn.");
  await expect(page.locator('.fw-node[data-species="tho"]')).toHaveAttribute("data-dim", "true");
  await expect(page.locator('.fw-node[data-species="ran"]')).toHaveAttribute("data-dim", "false");
  await page.mouse.move(4, 600);
  await expect(page.getByTestId("fw-relation")).toContainText("Mũi tên đi từ thức ăn tới loài ăn nó");

  const roles = page.getByTestId("fw-answer-roles");
  await roles.getByRole("group", { name: "Cỏ" }).getByLabel("Sản xuất").check();
  await roles.getByRole("group", { name: "Ếch" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Nấm, vi khuẩn" }).getByLabel("Phân giải").check();
  await roles.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await page.getByTestId("fw-act").click();
  await expect(page.locator('.fw-node[data-species="ech"]')).toHaveAttribute("data-role", "CONSUMER");
  for (const id of ["co", "chau-chau", "ech", "ran"]) await page.locator(`.fw-node[data-species="${id}"]`).click();
  await expect(page.getByTestId("fw-chain-text")).toContainText("Cỏ → Châu chấu → Ếch → Rắn");
  await expect(page.locator('.fw-node[data-in-chain="true"]')).toHaveCount(4);

  await page.getByTestId("fw-view-toggle").click();
  await expect(stage).toHaveAttribute("data-view", "2d");
  await expect(page.locator(".fw-board .fw-node[data-in-chain=\"true\"]")).toHaveCount(4);
  await page.reload();
  await page.getByTestId("lab-session-start").click();
  const restore = page.getByRole("button", { name: "Khôi phục", exact: true });
  if (await restore.isVisible().catch(() => false)) await restore.click();
  await expect(page.getByTestId("fw-stage")).toHaveAttribute("data-view", "2d");
  await page.getByTestId("fw-view-toggle").click();
  await expect(page.getByTestId("fw-stage")).toHaveAttribute("data-view", "3d");
});
