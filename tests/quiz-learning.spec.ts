import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_FIXTURE_PASSWORD or SEED_PASSWORD from the backend seed.");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.active");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  const response = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

test("assignment quiz preserves retry keys, retains history, passes at 50%, and unlocks LAB accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let pathway: any;
  let quizStepId = "";
  let passed = false;
  let failOnce = true;
  const submissions: any[] = [];
  const attempts: any[] = [];
  const questions = [
    { id: "q-current", prompt: "Khi tăng điện trở, dòng điện thay đổi thế nào?", options: [{ id: "o-current-low", text: "Giảm" }, { id: "o-current-high", text: "Tăng" }] },
    { id: "q-voltage", prompt: "Định luật Ôm liên hệ các đại lượng nào?", options: [{ id: "o-mass", text: "Khối lượng và thể tích" }, { id: "o-ohm", text: "Hiệu điện thế và điện trở" }] },
  ];
  const lesson = { id: "lesson-circuit", title: "Mạch điện", topic: "Định luật Ôm", learningObjective: "Tìm hiểu mạch điện", prerequisites: "", grade: 8, subject: { name: "Vật lý" } };

  await page.route("**/api/assignments/pilot-a-lesson-assignment", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ contentType: "lesson", content: lesson, classroom: { name: "Lớp 8A" }, overdue: false }) }));
  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const steps = ["READING", "VIDEO", "STUDY_CARDS", "QUIZ", "LAB"].map((type, index) => ({
      id: `step-${type.toLowerCase()}`,
      type,
      position: index,
      required: true,
      state: index < 3 ? "COMPLETED" : type === "QUIZ" ? (passed ? "COMPLETED" : "IN_PROGRESS") : (passed ? "IN_PROGRESS" : "LOCKED"),
      progressValue: index < 3 || (type === "QUIZ" && passed) ? 100 : 0,
      resource: null,
    }));
    quizStepId = steps.find((step) => step.type === "QUIZ")!.id;
    pathway = { lesson, steps, nextStepId: passed ? steps.find((step) => step.type === "LAB")!.id : quizStepId };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pathway) });
  });
  await page.route("**/api/lessons/*/quiz-attempts", async (route) => {
    const latestId = attempts.at(-1)?.id;
    const bestId = [...attempts].sort((a, b) => b.score - a.score)[0]?.id;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ attempts: [...attempts].reverse().map((attempt) => ({ ...attempt, latest: attempt.id === latestId, best: attempt.id === bestId })) }) });
  });
  await page.route("**/api/lessons/*/quiz", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lessonId: "lesson-circuit", stepId: quizStepId, questions }) });
  });
  await page.route("**/api/lessons/*/quiz-attempts", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    submissions.push(body);
    if (failOnce) {
      failOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Lưu tạm thời chưa được xác nhận" }) });
      return;
    }
    const correctCount = body.answers.filter((answer: any) =>
      (answer.questionId === "q-current" && answer.optionId === "o-current-low") ||
      (answer.questionId === "q-voltage" && answer.optionId === "o-ohm"),
    ).length;
    const attempt = {
      id: `quiz-attempt-${attempts.length + 1}`,
      idempotencyKey: body.idempotencyKey,
      score: (correctCount / questions.length) * 100,
      passed: correctCount >= 1,
      correctCount,
      questionCount: questions.length,
      createdAt: new Date(Date.now() + attempts.length).toISOString(),
      results: questions.map((question, index) => ({ questionId: question.id, prompt: question.prompt, selectedOptionText: question.options.find((option) => option.id === body.answers[index].optionId)?.text, correct: (question.id === "q-current" && body.answers[index].optionId === "o-current-low") || (question.id === "q-voltage" && body.answers[index].optionId === "o-ohm") })),
    };
    attempts.push(attempt);
    passed = attempt.passed;
    const steps = pathway.steps.map((step: any) => step.type === "QUIZ"
      ? { ...step, state: passed ? "COMPLETED" : "IN_PROGRESS", progressValue: passed ? 100 : 0 }
      : step.type === "LAB" ? { ...step, state: passed ? "IN_PROGRESS" : "LOCKED" } : { ...step, state: "COMPLETED", progressValue: 100 });
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ attempt, pathway: { ...pathway, steps, nextStepId: passed ? steps.find((step: any) => step.type === "LAB")?.id : quizStepId } }) });
  });

  await login(page);
  await page.goto("/assignments/pilot-a-lesson-assignment");
  const quiz = page.getByRole("region", { name: "Bài kiểm tra kiến thức" });
  await expect(quiz.getByText("Câu 1 / 2")).toBeVisible();
  const next = quiz.getByRole("button", { name: "Câu tiếp theo" });
  await expect(next).toBeDisabled();
  const firstWrong = quiz.getByRole("radio", { name: "Tăng" });
  await firstWrong.focus();
  await page.keyboard.press("Space");
  await next.click();
  await expect(quiz.getByText("Câu 2 / 2")).toBeVisible();
  await quiz.getByRole("radio", { name: "Khối lượng và thể tích" }).check();
  await quiz.getByRole("button", { name: "Câu trước" }).click();
  await expect(firstWrong).toBeChecked();
  await next.click();
  await quiz.getByRole("button", { name: "Nộp bài kiểm tra" }).click();
  await expect(quiz.getByRole("alert")).toContainText("Lưu tạm thời chưa được xác nhận");
  await quiz.getByRole("button", { name: "Gửi lại lượt này" }).click();
  await expect(quiz.getByText("Chưa đạt lần này. Bạn có thể thử lại.")).toBeVisible();
  expect(submissions[0]).toEqual(submissions[1]);
  expect(attempts[0].score).toBe(0);
  await expect(quiz.getByText("Bạn chọn: Tăng · Chưa đúng")).toBeVisible();
  await quiz.getByRole("button", { name: "Thử lại bài kiểm tra" }).click();
  await quiz.getByRole("radio", { name: "Giảm" }).check();
  await next.click();
  await quiz.getByRole("radio", { name: "Khối lượng và thể tích" }).check();
  await quiz.getByRole("button", { name: "Nộp bài kiểm tra" }).click();
  await expect(quiz.getByText("Bạn đã vượt qua bài kiểm tra")).toBeVisible();
  await expect(quiz.getByText(/1\/2 câu · 50 điểm/)).toBeVisible();
  await expect(page.locator(".pathway-step--in_progress").filter({ hasText: "Thực hành trong phòng lab" })).toBeVisible();
  await page.reload();
  const reloadedQuiz = page.getByRole("region", { name: "Bài kiểm tra kiến thức" });
  await expect(reloadedQuiz.getByText("Bạn đã vượt qua bài kiểm tra")).toBeVisible();
  await expect(reloadedQuiz.getByText(/Mới nhất · Điểm cao nhất/)).toBeVisible();
  expect(submissions[1].idempotencyKey).not.toBe(submissions[2].idempotencyKey);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `no horizontal overflow at ${width}px`).toBe(true);
  }
});
