import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD ?? "acceptance-pilot-2026";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.active");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const response = page.waitForResponse((item) =>
    item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

test("Epic A4: Circuit Lab workspace renders, verifies server verdicts, preserves state on retry, and unlocks challenge", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  let failOnce = true;
  let passed = false;
  let attemptCount = 0;
  const submissions: any[] = [];
  const capturedKeys: string[] = [];

  const lesson = {
    id: "lesson-circuit",
    title: "Mạch điện",
    topic: "Định luật Ôm",
    learningObjective: "Tìm hiểu mạch điện và định luật Ôm",
    prerequisites: "",
    grade: 8,
    subject: { name: "Vật lý" },
  };

  const initialCircuit = {
    nodes: [
      { id: "b", type: "battery", value: 9 },
      { id: "l", type: "led" },
      { id: "r", type: "resistor", value: 330 },
      { id: "s", type: "switch", closed: true },
    ],
    edges: [
      { source: "b", target: "l" },
      { source: "l", target: "r" },
      { source: "r", target: "s" },
      { source: "s", target: "b" },
    ],
  };

  await page.route("**/api/assignments/pilot-a-lesson-assignment", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contentType: "lesson",
        content: lesson,
        classroom: { name: "Lớp 8A" },
        overdue: false,
      }),
    }),
  );

  await page.route("**/api/lessons/*/pathway", async (route) => {
    const steps = [
      { id: "step-reading", type: "READING", position: 10, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-video", type: "VIDEO", position: 20, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-study-cards", type: "STUDY_CARDS", position: 30, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-quiz", type: "QUIZ", position: 40, required: true, state: "COMPLETED", progressValue: 100 },
      {
        id: "step-lab",
        type: "LAB",
        position: 50,
        required: true,
        state: passed ? "COMPLETED" : "IN_PROGRESS",
        progressValue: passed ? 100 : 0,
        resource: {
          challengeId: "circuit_001",
          labId: "circuit",
          title: "Thử thách: Mạch điện thắp sáng đèn LED",
          defaultState: initialCircuit,
        },
      },
      {
        id: "step-challenge",
        type: "CHALLENGE",
        position: 60,
        required: true,
        state: passed ? "IN_PROGRESS" : "LOCKED",
        progressValue: 0,
        lockReasonCode: passed ? null : "PRACTICE_NOT_PASSED",
        resource: passed ? { challengeId: "circuit_001" } : null,
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lesson,
        steps,
        nextStepId: passed ? "step-challenge" : "step-lab",
      }),
    });
  });

  await page.route("**/api/attempts", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    submissions.push(body);
    capturedKeys.push(body.idempotencyKey);

    // Test resilience: fail once with 503 to verify retry with same idempotency key
    if (failOnce) {
      failOnce = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Máy chủ bận, hãy thử gửi lại" }),
      });
      return;
    }

    attemptCount++;
    const isPassingAttempt = attemptCount >= 2;
    if (isPassingAttempt) {
      passed = true;
    }

    const verdict = isPassingAttempt ? "passed" : "partial";
    const simulationResult = isPassingAttempt
      ? { status: "SAFE", currentMa: 14.89, ledState: "ON", message: "Đèn LED sáng đúng định mức. Em đã hoàn thành phần thực hành!" }
      : { status: "LED_OVERLOAD", currentMa: 21.21, ledState: "OVERLOAD", message: "Dòng điện vượt quá giới hạn an toàn của đèn LED." };
    const retryGuidance = isPassingAttempt
      ? null
      : "Dòng điện qua LED vượt mức an toàn (> 20 mA). Hãy tăng giá trị điện trở (R ≥ 350Ω) để bảo vệ linh kiện.";

    const steps = [
      { id: "step-reading", type: "READING", position: 10, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-video", type: "VIDEO", position: 20, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-study-cards", type: "STUDY_CARDS", position: 30, required: true, state: "COMPLETED", progressValue: 100 },
      { id: "step-quiz", type: "QUIZ", position: 40, required: true, state: "COMPLETED", progressValue: 100 },
      {
        id: "step-lab",
        type: "LAB",
        position: 50,
        required: true,
        state: passed ? "COMPLETED" : "IN_PROGRESS",
        progressValue: passed ? 100 : 50,
      },
      {
        id: "step-challenge",
        type: "CHALLENGE",
        position: 60,
        required: true,
        state: passed ? "IN_PROGRESS" : "LOCKED",
        progressValue: 0,
        lockReasonCode: passed ? null : "PRACTICE_NOT_PASSED",
      },
    ];

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        attempt: {
          id: `attempt-${attemptCount}`,
          assignmentId: "pilot-a-lesson-assignment",
          lessonStepId: body.lessonStepId,
          challengeId: body.challengeId,
          labState: body.labState,
          simulationResult,
          verdict,
          durationMs: body.durationMs,
          attemptNumber: attemptCount,
          simulationModelVersion: "1.0.0",
          createdAt: new Date().toISOString(),
        },
        pathway: {
          lesson,
          steps,
          nextStepId: passed ? "step-challenge" : "step-lab",
        },
        retryGuidance,
      }),
    });
  });

  // 1. Log in
  await login(page);

  // 2. Navigate to assigned lesson pathway
  await page.goto("/assignments/pilot-a-lesson-assignment");

  // 3. Verify Circuit Workspace is mounted
  const workspace = page.locator('[data-testid="circuit-workspace"]');
  await expect(workspace).toBeVisible();

  // Verify challenge title
  await expect(page.getByText("Thử thách: Mạch điện thắp sáng đèn LED")).toBeVisible();

  // Verify CHALLENGE step is locked initially
  await expect(page.getByText("Hoàn thành phần thực hành để mở khóa thử thách.")).toBeVisible();

  // 4. Initial attempt triggers simulated network failure (503)
  const submitBtn = page.locator('[data-testid="circuit-submit-button"]');
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // Verify error box is displayed without wiping circuit state
  await expect(page.getByText("Máy chủ bận, hãy thử gửi lại")).toBeVisible();
  expect(submissions.length).toBe(1);

  // 5. Retry immediately after failure -> SAME idempotency key must be reused
  await submitBtn.click();
  expect(submissions.length).toBe(2);
  expect(capturedKeys[1]).toBe(capturedKeys[0]); // Idempotency key preserved across network failure recovery

  // 6. First successful attempt returns "partial" (LED_OVERLOAD)
  const verdictBanner = page.locator('[data-testid="circuit-verdict-banner"]');
  await expect(verdictBanner).toBeVisible();
  await expect(verdictBanner.getByText("Mạch điện cần điều chỉnh thêm")).toBeVisible();
  await expect(verdictBanner.getByText(/Dòng điện qua LED vượt mức an toàn/)).toBeVisible();
  await expect(verdictBanner.getByText("Lượt #1")).toBeVisible();

  // 7. Click Retry (Thử lại) -> Zero State Loss & Fresh idempotency key
  const retryBtn = page.locator('[data-testid="circuit-retry-button"]');
  await expect(retryBtn).toBeVisible();
  await retryBtn.click();

  // Verdict banner dismissed, workspace remains intact
  await expect(verdictBanner).not.toBeVisible();
  await expect(workspace).toBeVisible();
  await expect(submitBtn).toBeVisible();

  // 8. Submit again (second attempt passes)
  await submitBtn.click();
  expect(submissions.length).toBe(3);
  expect(capturedKeys[2]).not.toBe(capturedKeys[0]); // Fresh idempotency key generated on deliberate retry

  // 9. Passed verdict banner appears
  await expect(verdictBanner).toBeVisible();
  await expect(verdictBanner.getByText("Xuất sắc! Mạch điện đã hoạt động an toàn")).toBeVisible();
  await expect(verdictBanner.getByText("Lượt #2")).toBeVisible();
  await expect(verdictBanner.getByText("Bước thực hành đã được lưu vào tiến độ học tập.")).toBeVisible();

  // 10. Step completes and next CHALLENGE step is unlocked!
  await expect(page.getByText("Hoàn thành phần thực hành để mở khóa thử thách.")).not.toBeVisible();
});
