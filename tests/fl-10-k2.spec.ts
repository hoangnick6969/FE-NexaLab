import { expect, test } from "@playwright/test";

test("FL-10 K2 records prediction before readings and keeps one state across 2D/3D", async ({ page }) => {
  const student = { id: "student-1", username: "student.active", fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-fl10", (route) => route.fulfill({ json: {
    id: "assignment-fl10", contentType: "lab", content: { id: "mass-conservation", title: "Bảo toàn khối lượng",
      simulationModelRef: "mass-conservation@1.0.0", challengeId: "fl10_001" },
  } }));
  await page.route("**/api/labs/mass-conservation/runs", (route) => route.fulfill({ json: {
    contract: "lab-contract/1", runId: "run-fl10", labId: "mass-conservation", challengeId: "fl10_001",
    modelRef: "mass-conservation@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-1", activityVersion: 1,
    rubricVersion: "mass-conservation-poea@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    constraints: {}, initialState: null, rendererKey: "mass-conservation", expiresAt: null, context: "ASSIGNMENT",
    assignmentId: "assignment-fl10", versionBinding: "ASSIGNMENT_PINNED",
  } }));
  const events: Array<{ type: string; prediction?: string }> = [];
  let failedPrediction: { idempotencyKey: string; event: { type: string; prediction?: string } } | null = null;
  await page.route("**/api/lab-runs/run-fl10/events", (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      if (!failedPrediction && body.event.type === "PREDICTED") {
        failedPrediction = body;
        return route.fulfill({ status: 503, json: { message: "Temporary failure" } });
      }
      if (body.event.type === "PREDICTED") {
        expect(body).toEqual(failedPrediction);
      }
      events.push(body.event);
    }
    route.fulfill({ json: { events, readings: {
      beforeScaleMilligrams: events.some((event) => event.type === "READ_BEFORE") ? 435000 : null,
      afterScaleMilligrams: events.some((event) => event.type === "READ_AFTER") ? 435000 : null,
    } } });
  });
  let submission: any;
  await page.route("**/api/attempts", (route) => {
    submission = route.request().postDataJSON();
    route.fulfill({ json: { attempt: { id: "attempt-fl10", verdict: "passed", simulationResult: {
      assessment: { criteria: { C1: true, C2: true, C3: true, C4: true, C5: true, C6: true } },
    } } } });
  });

  await page.goto("/labs/mass-conservation?assignmentId=assignment-fl10");
  await page.getByRole("button", { name: "Bắt đầu thí nghiệm" }).click();
  await page.locator(".k2-stage canvas").waitFor();
  await expect(page.getByText("Đang khởi tạo không gian học tập...")).toBeHidden();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/fl10-k2-desktop-3d.png" });
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();
  await expect(page.getByText("435,0 g")).toHaveCount(0);
  await page.getByRole("button", { name: "Em đã đọc" }).click();
  await page.getByRole("button", { name: "Số chỉ sẽ nhỏ hơn" }).click();
  await expect(page.getByRole("button", { name: "Thử ghi lại bước" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Số chỉ sẽ lớn hơn" })).toBeDisabled();
  await page.getByRole("button", { name: "Thử ghi lại bước" }).click();
  await expect(page.getByText("435,0 g")).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt cốc 1 lên cân" }).click();
  await expect(page.getByText("Chưa đủ phạm vi cân")).toBeVisible();
  await page.getByRole("button", { name: "Đặt cốc 2 lên cân" }).click();
  await page.getByRole("button", { name: "Đọc cân trước" }).click();
  await expect(page.getByText("435,0 g").first()).toBeVisible();
  await page.getByRole("button", { name: "Rót, lắc và quan sát" }).click();
  await page.getByRole("button", { name: "Bỏ qua hoạt cảnh" }).click();
  await page.getByRole("button", { name: "Đặt lại cốc 1" }).click();
  await page.getByRole("button", { name: "Đặt lại cốc 2" }).click();
  await page.getByRole("button", { name: "Đọc cân sau" }).click();
  await page.getByLabel("So sánh hai số đo").selectOption("compare.same");
  await page.getByRole("button", { name: /Nguyên tử không mất đi/ }).click();
  await page.getByText("Ví dụ tính toán").click();
  await page.locator(".k2-panel details select").selectOption("35-and-35");
  await page.getByLabel("Khí thoát khỏi cốc hở trên cân thì số chỉ sẽ…").selectOption("decrease");
  await page.getByLabel("Khí ở lại trong bình kín, cả bình nằm trên cân thì số chỉ sẽ…").selectOption("same");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".k2-stage-2d")).toBeVisible();
  await page.screenshot({ path: "test-results/fl10-k2-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "Nộp kết quả" }).click();
  await expect(page.getByText("Em đã hoàn thành hoạt động.")).toBeVisible();
  expect(events.map((event) => event.type)).toEqual(["PREDICTED", "READ_BEFORE", "MIXED", "READ_AFTER"]);
  expect(submission.labState).not.toHaveProperty("beforeScaleMilligrams");
  expect(submission.labState.explanationAttempts).toEqual(["explain.rearrange"]);
  if (process.env.FL10_KEEP_OPEN === "1") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.pause();
  }
});
