import { expect, test } from "@playwright/test";

// SAI-01A step 3: after a not-passed FL-06 run the after-submit hint panel floats beside the Lab.
test("FL-06 not passed: the after-submit hint panel asks for a hint and stays on screen", async ({ page }) => {
  if (process.env.FL06_PREVIEW === "1") test.setTimeout(0);
  const student = { id: "student-1", username: "student.active", fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  await page.route("**/api/auth/refresh", route => route.fulfill({ json: { user: student, accessToken: "mock" } }));
  await page.route("**/api/me/profile", route => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", route => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", route => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", route => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-fl06", route => route.fulfill({ json: { id: "assignment-fl06", contentType: "lab", content: { id: "lever-equilibrium", title: "Moment lực và đòn bẩy", simulationModelRef: "lever-bench@1.0.0", challengeId: "fl06_001" } } }));
  await page.route("**/api/labs/lever-equilibrium/runs", route => route.fulfill({ json: { contract: "lab-contract/1", runId: "run-fl06", labId: "lever-equilibrium", challengeId: "fl06_001", modelRef: "lever-bench@1.0.0", engineVersion: "1.0.0", activityVersionId: "activity-1", activityVersion: 1, rubricVersion: "lever-investigation@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1, constraints: {}, initialState: null, rendererKey: "lever-bench", expiresAt: null, context: "ASSIGNMENT", assignmentId: "assignment-fl06", versionBinding: "ASSIGNMENT_PINNED" } }));
  const events: any[] = [];
  await page.route("**/api/lab-runs/run-fl06/events", route => {
    if (route.request().method() === "POST") events.push(route.request().postDataJSON().event);
    route.fulfill({ json: { events, observation: null } });
  });
  const hintCalls: string[] = [];
  await page.route("**/api/attempts/attempt-fl06/hint", route => { hintCalls.push(route.request().method());
    route.fulfill({ status: 201, json: { id: "h1", level: 1, content: "Cánh tay đòn được đo từ đâu đến đâu?", label: "Đo moment lực", escalated: false, repeatReason: null } }); });
  const explained: string[] = [];
  await page.route("**/api/attempts/attempt-fl06/explanation", route => { explained.push(route.request().method());
    route.fulfill({ json: { attemptId: "attempt-fl06", verdict: "not_passed", summary: "Em chưa đạt vì còn 1 bước chưa đúng yêu cầu.", provider: "rules", items: [
      { criterion: "rotation", label: "Dự đoán chiều quay", met: true, why: "Moment lực bên nào lớn hơn thì đòn bẩy quay về phía đó." },
      { criterion: "moment", label: "Đo moment lực", met: false, why: null },
    ] } }); });
  let submitted: any;
  await page.route("**/api/attempts", route => { submitted = route.request().postDataJSON(); route.fulfill({ json: { attempt: { id: "attempt-fl06", verdict: "needs_practice", simulationResult: { criteria: { rotation: true, moment: false } } } } }); });
  await page.goto("/labs/lever-equilibrium?assignmentId=assignment-fl06");
  await page.getByRole("button", { name: "Bắt đầu thí nghiệm" }).click();
  await expect(page.locator(".physics-stage canvas")).toBeVisible();
  // SAI-01A while working: the floating step picker gives levels 1–2; nothing about the learner's state is sent.
  const stepAsks: any[] = [];
  await page.route("**/api/lab-runs/run-fl06/hints/steps", route => route.fulfill({ json: { reflections: false, maxLevel: 2, steps: [
    { criterion: "rotation", label: "Dự đoán chiều quay" }, { criterion: "moment", label: "Đo moment lực" },
  ] } }));
  await page.route("**/api/lab-runs/run-fl06/hints", route => { stepAsks.push(route.request().postDataJSON());
    route.fulfill({ status: 201, json: { id: "r1", level: 1, content: "Đòn bẩy quay về phía nào khi hai bên chưa cân?", label: "Dự đoán chiều quay", repeatReason: null } }); });
  await page.getByTestId("step-hint-toggle").click();
  const stepPanel = page.getByTestId("step-hint-panel");
  await stepPanel.getByRole("button", { name: "Gợi ý cho bước này" }).click();
  await expect(stepPanel).toContainText("Đòn bẩy quay về phía nào khi hai bên chưa cân?");
  expect(stepAsks).toEqual([{ criterion: "rotation", moment: "BEFORE_PREDICTION" }]);
  await page.screenshot({ path: "test-results/event-step-hint.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/event-step-hint-phone.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await stepPanel.getByRole("button", { name: "Đóng gợi ý" }).click();
  await expect(page.locator(".k5-3d-mark")).toHaveCount(11);
  await expect(page.locator(".k5-3d-mark-origin")).toHaveText("O · 0");
  await expect(page.getByText("Cánh tay đòn d là khoảng cách từ O đến lỗ móc", { exact: false })).toBeVisible();
  if (process.env.FL06_PREVIEW === "1") await page.pause();
  await expect(page.getByText("Ghi dự đoán để mở quan sát")).toBeVisible();
  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();
  await expect(page.locator(".k5-visual-2d svg circle")).toHaveCount(12); // 11 holes plus pivot
  await expect(page.getByRole("button", { name: "Ghi dự đoán" })).toBeDisabled();
  await page.getByRole("group", { name: "Dự đoán bên trái", exact: true }).getByRole("radio", { name: "Nghiêng trái", exact: true }).check();
  await page.getByRole("group", { name: "Dự đoán tại o", exact: true }).getByRole("radio", { name: "Nằm ngang", exact: true }).check();
  await page.getByRole("group", { name: "Dự đoán bên phải", exact: true }).getByRole("radio", { name: "Nghiêng phải", exact: true }).check();
  await page.getByRole("button", { name: "Ghi dự đoán" }).click();
  await expect(page.getByText(/Đầu trái nghiêng xuống/)).toBeVisible();
  const leftIsLower = await page.locator(".k5-visual-2d svg").evaluate(svg => {
    const circles = svg.querySelectorAll("circle");
    return circles[1].getBoundingClientRect().y > circles[6].getBoundingClientRect().y;
  });
  expect(leftIsLower).toBe(true);
  await page.getByRole("group", { name: "Trạng thái lần 1", exact: true }).getByRole("radio", { name: "Nghiêng trái", exact: true }).check();
  await page.getByRole("button", { name: "Tại O" }).click();
  await page.getByRole("group", { name: "Trạng thái lần 2", exact: true }).getByRole("radio", { name: "Nằm ngang", exact: true }).check();
  await page.getByRole("button", { name: "Bên phải" }).click();
  await page.getByRole("group", { name: "Trạng thái lần 3", exact: true }).getByRole("radio", { name: "Nghiêng phải", exact: true }).check();
  await page.getByRole("button", { name: "Ghi quan sát" }).click();
  await page.getByLabel("F (N)").fill("1,0");
  await page.getByLabel("d (m)").fill("0,10");
  await page.getByLabel("M (N·m)").fill("0,10");
  await page.getByRole("button", { name: "Ghi phép đo" }).click();
  await page.getByLabel("Lực kế dự đoán (N)").selectOption("500");
  await page.getByRole("button", { name: "Ghi dự đoán cân bằng" }).click();
  await page.getByLabel("Lực kế kiểm tra (N)").selectOption("500");
  await page.getByRole("button", { name: "Xác nhận bằng lực kế" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".k5-visual-2d")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator(".k5-case-diagram")).toBeVisible();
  await page.getByRole("group", { name: "Lợi về lực?", exact: true }).getByRole("radio", { name: "Có lợi", exact: true }).check();
  await page.getByRole("group", { name: "Đổi hướng lực?", exact: true }).getByRole("radio", { name: "Có", exact: true }).check();
  await page.getByRole("button", { name: "Ghi kết luận ứng dụng" }).click();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  const panel = page.locator(".event-lab-hint");
  await expect(panel).toContainText("Gợi ý từng bước");
  // Not passed: no what-if, so nothing can help the retry.
  await expect(panel.getByTestId("what-if")).toHaveCount(0);
  // B2: the explanation is fetched only when asked; an unmet step shows its name, never its answer.
  expect(explained).toEqual([]);
  await panel.getByRole("button", { name: "Vì sao em chưa đạt?" }).click();
  const why = panel.getByTestId("verdict-explanation");
  await expect(why).toContainText("Em chưa đạt vì còn 1 bước");
  await expect(why.locator('li[data-met="true"]')).toContainText("Moment lực bên nào lớn hơn");
  await expect(why.locator('li[data-met="false"]')).toContainText("Đo moment lực");
  await expect(why.locator('li[data-met="false"]')).toContainText("chỉ ghi tên để em tự tìm lại");
  expect(explained).toEqual(["GET"]);
  await why.getByRole("button", { name: "Ẩn giải thích" }).click();
  await panel.getByRole("button", { name: "Nhận gợi ý" }).click();
  await expect(panel).toContainText("Mức 1/4");
  await expect(panel).toContainText("Về bước: Đo moment lực");
  expect(hintCalls).toEqual(["POST"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/event-hint-phone.png" });
  // Layout A: the hint lives in the question panel; closing the panel keeps the hint already received.
  await expect(page.locator("#k5-questions").getByTestId("lab-panel-result")).toContainText("Gợi ý từng bước");
  await page.locator("#k5-questions").getByRole("button", { name: "Đóng câu hỏi" }).click();
  await expect(panel.getByText("Gợi ý từng bước")).toBeHidden();
  await page.locator(".k5-question-badge").click();
  await expect(panel).toContainText("Cánh tay đòn được đo từ đâu đến đâu?");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: "test-results/event-hint-desktop.png" });
});
