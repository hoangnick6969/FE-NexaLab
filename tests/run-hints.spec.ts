import { expect, test, type Page } from "@playwright/test";

// SAI-01A in-run hints on FL-21: route-mocked API only. Hint rules are covered by the BE suites.
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
  await page.route("**/api/assignments/assignment-fw", (route) => route.fulfill({ json: {
    id: "assignment-fw", title: "Lưới thức ăn", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: {
      id: "food-web", title: "Lưới thức ăn và cân bằng tự nhiên", subject: { id: "biology", name: "KHTN" }, grade: 8,
      topic: "Hệ sinh thái", learningObjective: "Chuỗi, lưới thức ăn và cân bằng tự nhiên", prerequisites: "", challengeId: "fw_001",
    },
  } }));
  await page.route("**/api/labs/food-web/runs", (route) => route.fulfill({ json: {
    contract: "lab-contract/1", runId: "fw-run-1", labId: "food-web", challengeId: "fw_001",
    modelRef: "food-web@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-fw", activityVersion: 1,
    rubricVersion: "food-web-checkpoints@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    constraints: {}, initialState: null, rendererKey: "food-web", expiresAt: null, context: "ASSIGNMENT",
    assignmentId: "assignment-fw", versionBinding: "ASSIGNMENT_PINNED",
  } }));
}

test("SAI-01A: hints before predicting stop at level 2; a reflection only after a mismatch", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockShell(page);
  const asked: any[] = [];
  let level = 0;
  const checks: any[] = [];
  await page.route("**/api/lab-runs/fw-run-1/hints/check", async (route) => {
    const body = route.request().postDataJSON();
    checks.push(body);
    // ROLES answered right; HUNT answered "Giảm đi" (wrong).
    await route.fulfill({ status: 201, json: { criterion: body.criterion, mismatch: body.criterion === "prediction:HUNT" && body.prediction === "DECREASE" } });
  });
  await page.route("**/api/lab-runs/fw-run-1/hints", async (route) => {
    const body = route.request().postDataJSON();
    asked.push(body);
    if (body.moment === "BEFORE_PREDICTION") {
      level = Math.min(2, level + 1);
      return route.fulfill({ status: 201, json: { id: `h${asked.length}`, level, content: `Gợi ý mẫu mức ${level}`, label: "Vai trò sinh vật", moment: body.moment, repeatReason: null } });
    }
    if (body.prediction === "INCREASE" || body.criterion === "prediction:ROLES")
      return route.fulfill({ status: 409, json: { statusCode: 409, code: "HINT_NOT_NEEDED", message: "Dự đoán của em ở bước này đã khớp với kết quả" } });
    return route.fulfill({ status: 201, json: { id: `h${asked.length}`, level: 0, content: "Rắn không phải thức ăn của ếch.", label: "Khi mất rắn", moment: body.moment, repeatReason: null } });
  });

  await page.goto("/labs/food-web?assignmentId=assignment-fw");
  await page.getByTestId("lab-session-start").click();
  const panel = page.getByTestId("run-hint-panel");
  const toggle = page.getByTestId("run-hint-toggle");
  // Collapsed by default: the stage stays clear until the learner asks.
  await expect(panel).toHaveCount(0);
  await toggle.click();
  await expect(panel).toBeVisible();

  // Moment A on ROLES: level 1, then 2. The draft is never sent.
  await panel.getByRole("button", { name: "Gợi ý cho câu “Vai trò sinh vật”" }).click();
  await expect(panel).toContainText("Mức 1/2 · Câu hỏi gợi mở");
  await expect(panel).toContainText("Gợi ý mẫu mức 1");
  await panel.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(panel).toContainText("Mức 2/2 · Gợi ý khái niệm");
  expect(asked).toEqual([
    { criterion: "prediction:ROLES", moment: "BEFORE_PREDICTION" },
    { criterion: "prediction:ROLES", moment: "BEFORE_PREDICTION" },
  ]);

  // Answer and check ROLES: the panel moves on to CHAIN and offers a reflection on ROLES.
  const roles = page.getByTestId("fw-answer-roles");
  await roles.getByRole("group", { name: "Cỏ" }).getByLabel("Sản xuất").check();
  await roles.getByRole("group", { name: "Ếch" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Nấm, vi khuẩn" }).getByLabel("Phân giải").check();
  await roles.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await page.getByTestId("fw-act").press("Enter");
  // A right prediction: the step is checked, but no "Vì sao…" and no dot.
  await expect.poll(() => checks.some((body) => body.criterion === "prediction:ROLES")).toBe(true);
  expect(checks[0]).toMatchObject({ criterion: "prediction:ROLES", state: { setup: "roles", webId: "W1" } });
  await expect(toggle).toHaveAttribute("data-has-reflection", "false");
  await toggle.click();
  await expect(panel).not.toContainText("Gợi ý mẫu mức");
  await expect(panel.getByRole("button", { name: "Vì sao kết quả khác dự đoán của em?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng gợi ý" }).click();

  // Chain and energy, then a wrong HUNT prediction gets a reflection after the removal is shown.
  const node = (id: string) => page.locator(`.fw-node[data-species="${id}"]`);
  for (const id of ["co", "chau-chau", "ech", "ran"]) await node(id).click();
  await page.getByTestId("fw-check-chain").click();
  await page.getByTestId("fw-next").click();
  const energy = page.getByTestId("fw-answer-energy");
  await energy.getByLabel("Năng lượng (kJ)").fill("10");
  await energy.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await page.getByTestId("fw-act").click();
  await toggle.click();
  await expect(panel.getByRole("button", { name: "Gợi ý cho câu “Mất rắn, ếch”" })).toBeVisible();
  await page.getByRole("button", { name: "Đóng gợi ý" }).click();
  await page.getByTestId("fw-answer-hunt").getByLabel("Giảm đi").click();
  await page.getByTestId("fw-act").click();
  await expect(node("ech")).toHaveAttribute("data-effect", "INCREASE");
  // A wrong prediction: the dot appears and the reflection is offered.
  await expect(toggle).toHaveAttribute("data-has-reflection", "true");
  await toggle.click();
  await panel.getByRole("button", { name: "Vì sao kết quả khác dự đoán của em?" }).click();
  await expect(panel).toContainText("Suy ngẫm sau quan sát");
  await expect(panel).toContainText("Rắn không phải thức ăn của ếch.");
  expect(asked.at(-1)).toMatchObject({ criterion: "prediction:HUNT", moment: "AFTER_OBSERVATION", prediction: "DECREASE" });
  await page.screenshot({ path: "test-results/run-hint-desktop.png" });
  await page.setViewportSize({ width: 360, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/run-hint-phone.png" });
});
