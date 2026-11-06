import { expect, test, type Page } from "@playwright/test";

// FL-20: route-mocked API only. Server scoring is covered by the BE suites.
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
  await page.route("**/api/assignments/assignment-eco", (route) => route.fulfill({ json: {
    id: "assignment-eco", title: "Giới hạn sinh thái", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: {
      id: "ecology-tolerance", title: "Nhân tố và giới hạn sinh thái", subject: { id: "biology", name: "KHTN" }, grade: 8,
      topic: "Sinh vật và môi trường", learningObjective: "Giới hạn sinh thái, đặc trưng quần thể", prerequisites: "", challengeId: "eco_001",
    },
  } }));
}

const launch = (runId: string) => ({
  contract: "lab-contract/1", runId, labId: "ecology-tolerance", challengeId: "eco_001",
  modelRef: "ecology-tolerance@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-eco", activityVersion: 1,
  rubricVersion: "ecology-tolerance-checkpoints@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey: "ecology-tolerance", expiresAt: null, context: "ASSIGNMENT",
  assignmentId: "assignment-eco", versionBinding: "ASSIGNMENT_PINNED",
});
const water = (valueDeciC: number) => ({ setup: "tolerance", speciesId: "ca-ro-phi", factor: "TEMPERATURE", valueDeciC });

test("FL-20 ecology activity: predictions before observations, F5 restore, keyboard sweep and checkpoint-only payload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  let launches = 0;
  const submissions: any[] = [];
  await page.route("**/api/labs/ecology-tolerance/runs", (route) => route.fulfill({ json: launch(`eco-run-${++launches}`) }));
  await page.route("**/api/attempts", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { attempt: {
      id: "eco-attempt", verdict: "passed", simulationResult: {
        observations: [
          { id: "T_INSIDE", scientificObservation: { setup: "tolerance", zone: "WITHIN", canPersist: true }, predictionCorrect: true },
          { id: "T_ABOVE", scientificObservation: { setup: "tolerance", zone: "ABOVE_MAX", canPersist: false }, predictionCorrect: true },
          { id: "LIMITS", scientificObservation: { setup: "tolerance-sweep" }, predictionCorrect: true },
          { id: "IMPORT", scientificObservation: { setup: "import-comparison", candidates: [{ speciesId: "fish-b", suitable: true }] }, predictionCorrect: true },
          { id: "DENSITY", scientificObservation: { setup: "density", density: { num: 4, den: 1 } }, predictionCorrect: true },
          { id: "AGE", scientificObservation: { setup: "age-structure", pyramid: "DECLINING" }, predictionCorrect: true },
        ], assessment: { score: 7, maximumScore: 7, unmetCriteria: [] },
      },
    } } });
  });

  await page.goto("/labs/ecology-tolerance?assignmentId=assignment-eco");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("eco-stage")).toBeVisible();
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  const act = page.getByTestId("eco-act");
  const observation = page.getByTestId("eco-observation");
  const step = page.locator(".eco-step");
  const next = page.getByTestId("eco-next");
  const review = page.getByTestId("eco-review");

  // The fish state and the limit markers stay hidden until the prediction is made and observed.
  await expect(act).toBeDisabled();
  await expect(page.locator(".eco-pond")).toHaveAttribute("data-fish", "hidden");
  await expect(page.getByTestId("eco-limit-markers")).toHaveCount(0);
  await page.getByTestId("eco-answer-t_inside").getByRole("radio", { name: "Tồn tại được", exact: true }).click();
  // The chosen answer stays in view until it is checked.
  await expect(page.getByTestId("eco-chosen")).toContainText("Tồn tại được");
  await act.press("Enter");
  await expect(observation).toContainText("bơi bình thường");
  await expect(page.locator(".eco-pond")).toHaveAttribute("data-fish", "persists");
  // Each checkpoint shows its verdict and waits for the learner before the next question.
  await expect(review).toHaveAttribute("data-correct", "true");
  await expect(review).toContainText("Đúng rồi.");
  await expect(act).toBeDisabled();
  await next.click();

  await page.getByTestId("eco-answer-t_above").getByRole("radio", { name: "Không tồn tại được", exact: true }).click();
  await expect(page.locator(".eco-pond")).toHaveAttribute("data-fish", "hidden");
  await act.click();
  await expect(observation).toContainText("không tồn tại được");
  await expect(step).toHaveText("Bước 5/13");
  await expect(review).toHaveAttribute("data-correct", "true");
  await page.waitForTimeout(500);

  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(step).toHaveText("Bước 5/13");

  // LIMITS: sweep with the keyboard across both edges, then read the range.
  const slider = page.getByTestId("eco-slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("eco-temperature")).toHaveText("0,0 °C");
  await expect(page.locator(".eco-pond")).toHaveAttribute("data-fish", "gone");
  await page.keyboard.press("End");
  await expect(page.getByTestId("eco-temperature")).toHaveText("50,0 °C");
  await expect(step).toHaveText("Bước 6/13");
  await page.getByTestId("eco-answer-limits").getByLabel("Từ 5,6 °C đến 42 °C").click();
  await expect(review).toHaveAttribute("data-correct", "true");
  await next.click();
  await expect(page.getByTestId("eco-limit-markers")).toHaveCount(0); // the scene moved on to the comparison
  await expect(page.getByTestId("eco-comparison")).toBeVisible();

  await page.getByTestId("eco-answer-import").getByLabel("Cá B").click();
  await act.click();
  await expect(observation).toContainText("Cá B chịu được toàn bộ khoảng nhiệt độ");
  await next.click();

  const density = page.getByTestId("eco-answer-density");
  await density.getByLabel("Mật độ").fill("bốn");
  await density.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await expect(density.getByRole("alert")).toBeVisible();
  await density.getByLabel("Mật độ").fill("4,0");
  await density.getByLabel("Đơn vị").selectOption("PER_M2");
  await density.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await expect(observation).toContainText("3.000 : 750 = 4 cây/m²");
  await expect(review).toHaveAttribute("data-correct", "true");
  await next.click();

  await page.getByTestId("eco-answer-age").getByLabel("Dạng suy giảm").click();
  await act.click();
  await expect(observation).toContainText("tháp dạng suy giảm");
  await expect(next).toHaveText("Sang câu giải thích");
  await next.click();

  await page.getByRole("radio", { name: /nằm ngoài giới hạn sinh thái/ }).click();
  // B3: "Nếu… thì sao?" in free explore, answered from the model; the scene follows the question.
  await page.getByTestId("eco-explore").getByRole("button", { name: "Khám phá thêm" }).click();
  const whatIf = page.getByTestId("what-if");
  const whatIfAnswer = page.getByTestId("what-if-answer");
  await whatIf.getByRole("button", { name: "Nếu nước ao ở 43 °C thì cá rô phi sao?" }).click();
  await expect(whatIfAnswer).toContainText("43 °C cao hơn giới hạn trên 42 °C nên cá rô phi không tồn tại được.");
  await expect(page.getByTestId("eco-temperature")).toHaveText("43,0 °C");
  await whatIf.getByRole("button", { name: "Nếu thả cá C vào nơi nước 8 °C–36 °C?" }).click();
  await expect(whatIfAnswer).toContainText("Cá C không nuôi được quanh năm vì lúc nóng nhất 36 °C cao hơn giới hạn trên 30 °C.");
  await whatIf.getByRole("button", { name: "Nếu quần thể có tháp tuổi như mẫu P1?" }).click();
  await expect(whatIfAnswer).toContainText("tháp phát triển");
  await expect(page.getByRole("radio", { name: "P1", exact: true })).toBeChecked();
  // Changing the scene by hand clears the answer, so it never disagrees with what is shown.
  await page.getByRole("radio", { name: "Ao cá", exact: true }).check();
  await expect(whatIfAnswer).toBeEmpty();
  await page.getByTestId("eco-explore").getByRole("button", { name: "Đóng khám phá" }).click();
  await expect(page.getByTestId("lab-run-submit")).toBeEnabled();
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByText("Nước 44,0 °C: cá rô phi không tồn tại được, trả lời đúng")).toBeVisible();
  // The result drawer must sit above the question panel, not behind it.
  const line = (await page.getByText("Nước 44,0 °C: cá rô phi không tồn tại được, trả lời đúng").boundingBox())!;
  expect(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest(".lab-aside")), [line.x + 8, line.y + line.height / 2])).toBe(true);

  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toEqual(expect.objectContaining({
    runId: "eco-run-2", explanation: "A", checkpoints: [
      { id: "T_INSIDE", state: water(300), prediction: "PERSISTS" },
      { id: "T_ABOVE", state: water(440), prediction: "NOT_PERSIST" },
      { id: "LIMITS", state: { setup: "tolerance-sweep", speciesId: "ca-ro-phi", factor: "TEMPERATURE" }, prediction: "L1" },
      { id: "IMPORT", state: { setup: "import-comparison", siteId: "site-demo", factor: "TEMPERATURE" }, prediction: "FISH_B" },
      { id: "DENSITY", state: { setup: "density", populationId: "bap-cai" }, prediction: { value: "4,0", unit: "PER_M2" } },
      { id: "AGE", state: { setup: "age-structure", sampleId: "P3" }, prediction: "DECLINING" },
    ],
  }));
  expect(submissions[0]).not.toHaveProperty("labState");
  expect(submissions[0]).not.toHaveProperty("observed");
});

test("FL-20 phone layout: no horizontal scroll, panel and dock reachable; free explore unlocks only at the end", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await mockShell(page);
  await page.route("**/api/labs/ecology-tolerance/runs", (route) => route.fulfill({ json: launch("eco-run-phone") }));
  await page.goto("/labs/ecology-tolerance?assignmentId=assignment-eco");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("eco-stage")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByTestId("eco-explore")).toHaveCount(0);
  await page.getByTestId("eco-answer-t_inside").getByRole("radio", { name: "Tồn tại được", exact: true }).click();
  await expect(page.getByTestId("eco-act")).toBeEnabled();
  // Phone order from the bottom: submit bar, action dock, question sheet; none overlap.
  const act = (await page.getByTestId("eco-act").boundingBox())!;
  const panel = (await page.locator(".eco-panel").boundingBox())!;
  const submit = (await page.getByTestId("lab-run-submit").boundingBox())!;
  expect(act.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  expect(act.y + act.height).toBeLessThanOrEqual(submit.y);
  await page.screenshot({ path: "test-results/eco-phone.png" });
});

test("FL-20 K8 pond: 3D diorama by default, 2D diagram on request, same fish contract, choice remembered", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  await page.route("**/api/labs/ecology-tolerance/runs", (route) => route.fulfill({ json: launch("eco-run-3d") }));
  await page.goto("/labs/ecology-tolerance?assignmentId=assignment-eco");
  await page.getByTestId("lab-session-start").click();

  const stage = page.getByTestId("eco-stage");
  await expect(stage).toHaveAttribute("data-view", "3d");
  await expect(page.getByTestId("eco-3d").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("eco-3d")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".eco-pond")).toHaveAttribute("data-fish", "hidden");
  await expect(page.locator(".eco-pond")).toHaveAttribute("aria-label", /30,0 °C/);
  // The graph card stays clear of the question panel.
  const card = (await page.locator(".eco-stage-inner").boundingBox())!;
  const panel = (await page.locator(".eco-panel").boundingBox())!;
  expect(card.x + card.width).toBeLessThanOrEqual(panel.x);

  await page.getByTestId("eco-view-toggle").click();
  await expect(stage).toHaveAttribute("data-view", "2d");
  await expect(page.locator("svg.eco-pond")).toHaveAttribute("data-fish", "hidden");
  await page.reload();
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("eco-stage")).toHaveAttribute("data-view", "2d");
  await page.getByTestId("eco-view-toggle").click();
  await expect(page.getByTestId("eco-stage")).toHaveAttribute("data-view", "3d");
});
