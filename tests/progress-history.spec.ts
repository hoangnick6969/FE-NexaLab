import { expect, test, type Page } from "@playwright/test";

// Epic A5 UI contract with a mocked API: summary → completion → paginated
// history → accessible evidence sheet, at desktop and 390 px widths.
const student = { id: "st-1", username: "a5.student", fullName: "Học Sinh A5", role: "STUDENT", grade: 8, mustChangePassword: false };
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000).toISOString();
const steps = [
  { stepId: "s-read", type: "READING", position: 10, required: true, state: "COMPLETED", evidenceType: "STEP_PROGRESS", evidenceId: "s-read", completedAt: at(60), updatedAt: at(60), quiz: null, practical: null,
    stepProgress: { status: "COMPLETED", progressValue: 100, lastPosition: null, visitedCards: 0, startedAt: at(61), completedAt: at(60), updatedAt: at(60) } },
  { stepId: "s-quiz", type: "QUIZ", position: 40, required: true, state: "COMPLETED", evidenceType: "QUIZ_ATTEMPT", evidenceId: "q-2", completedAt: at(30), updatedAt: at(30), practical: null, stepProgress: null,
    quiz: { attempts: 2, latest: { attemptId: "q-2", score: 100, passed: true, createdAt: at(30) }, best: { attemptId: "q-2", score: 100, passed: true, createdAt: at(30) } } },
  { stepId: "s-lab", type: "LAB", position: 50, required: true, state: "IN_PROGRESS", evidenceType: "PRACTICAL_ATTEMPT", evidenceId: "p-1", completedAt: null, updatedAt: at(10), quiz: null, stepProgress: null,
    practical: { attempts: 1, latest: { attemptId: "p-1", verdict: "partial", createdAt: at(10) }, best: { attemptId: "p-1", verdict: "partial", createdAt: at(10) }, passedAt: null } },
];
const progress = {
  assignments: [
    { assignmentId: "as-1", lessonId: "l-1", title: "Mạch điện kín", lessonTitle: "Mạch điện", subject: { id: "physics", name: "Vật lý" }, chapter: "Điện học",
      dueDate: at(-60 * 24), overdue: false, completed: false, completedRequired: 2, totalRequired: 3, percent: 67, nextStepId: "s-lab",
      quiz: steps[1].quiz, practical: steps[2].practical, updatedAt: at(10), steps },
    { assignmentId: "as-2", lessonId: "l-2", title: "Bài đọc thêm", lessonTitle: "Đọc thêm", subject: { id: "physics", name: "Vật lý" }, chapter: "Điện học",
      dueDate: at(60), overdue: true, completed: false, completedRequired: 0, totalRequired: 0, percent: null, nextStepId: null, quiz: null, practical: null, updatedAt: null, steps: [] },
  ],
  summary: { activeAssignments: 2, completedAssignments: 0, remainingRequiredSteps: 1, quizAttempts: 2, practicalAttempts: 1, passedPracticals: 0, updatedAt: at(10) },
  generatedAt: at(0),
};
const history = [
  { id: "p-1", kind: "PRACTICAL", lessonId: "l-1", stepId: "s-lab", stepType: "LAB", assignmentId: "as-1", challengeId: "circuit_001", title: "Mạch điện", labTitle: "Mạch điện", occurredAt: at(10), score: null, passed: false, verdict: "partial", sourceAvailable: true, legacy: false },
  { id: "q-2", kind: "QUIZ", lessonId: "l-1", stepId: "s-quiz", stepType: "QUIZ", assignmentId: "as-1", title: "Mạch điện", occurredAt: at(30), score: 100, passed: true, verdict: null, sourceAvailable: true, legacy: false },
  { id: "q-1", kind: "QUIZ", lessonId: "l-1", stepId: "s-quiz", stepType: "QUIZ", assignmentId: "as-1", title: "Mạch điện", occurredAt: at(40), score: 0, passed: false, verdict: null, sourceAvailable: true, legacy: false },
  { id: "p-0", kind: "PRACTICAL", lessonId: null, stepId: null, stepType: null, assignmentId: null, challengeId: "circuit_001", title: "Mạch điện", labTitle: "Mạch điện", occurredAt: at(60 * 24 * 10), score: null, passed: false, verdict: "needs_practice", sourceAvailable: false, legacy: true },
];
const quizDetail = {
  id: "q-2", kind: "QUIZ", lessonId: "l-1", lessonTitle: "Mạch điện", stepId: "s-quiz", assignmentId: "as-1", sourceAvailable: true, createdAt: at(30),
  attemptNumber: 2, totalAttempts: 2, latest: true, best: true, score: 100, passed: true, passThreshold: 50, correctCount: 2, questionCount: 2,
  results: [
    { questionId: "a", prompt: "Tăng điện trở thì dòng điện?", selectedOptionText: "Giảm", correct: true },
    { questionId: "b", prompt: "LED cần mạch gì để sáng?", selectedOptionText: "Kín", correct: true },
  ],
};

const practicalDetail = {
  id: "p-1", kind: "PRACTICAL", challengeId: "circuit_001", challengeObjective: "Lắp mạch điện kín và làm LED sáng an toàn", labId: "circuit", labTitle: "Mạch điện",
  lessonId: "l-1", lessonTitle: "Mạch điện", stepId: "s-lab", stepType: "LAB", assignmentId: "as-1", sourceAvailable: true, legacy: false, createdAt: at(10),
  attemptNumber: 1, verdict: "partial", durationMs: 4200, simulationModelVersion: "1.0.0",
  outcome: { status: "LED_OVERLOAD", currentMa: 69, ledState: "OVERLOAD" }, retryGuidance: "Hãy tăng giá trị điện trở.", hintLevels: [],
};

async function mockApi(page: Page, options: { failSecondPageOnce?: boolean } = {}) {
  let failures = 0;
  const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/**", (route) => route.fulfill(json([])));
  await page.route("**/api/auth/refresh", (route) => route.fulfill(json({ user: student, accessToken: "token" })));
  await page.route("**/api/auth/me", (route) => route.fulfill(json(student)));
  await page.route("**/api/me/progress", (route) => route.fulfill(json(progress)));
  await page.route("**/api/me/activity**", (route) => {
    const url = new URL(route.request().url());
    const stepId = url.searchParams.get("stepId");
    if (stepId) return route.fulfill(json({ items: history.filter((item) => item.stepId === stepId), nextCursor: null }));
    if (!url.searchParams.get("cursor")) return route.fulfill(json({ items: history.slice(0, 2), nextCursor: "c1" }));
    // Fails both the request and React Query's single automatic retry.
    if (options.failSecondPageOnce && failures < 2) {
      failures++;
      return route.fulfill(json({ message: "Lỗi tạm thời" }, 500));
    }
    return route.fulfill(json({ items: history.slice(2), nextCursor: null }));
  });
  await page.route("**/api/me/quiz-attempts/q-2", (route) => route.fulfill(json(quizDetail)));
  await page.route("**/api/me/attempts/p-1", (route) => route.fulfill(json(practicalDetail)));
}

test("Epic A5: progress summary, completion, paginated history and evidence drill-down", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockApi(page, { failSecondPageOnce: true });
  await page.goto("/progress");

  await expect(page.getByRole("button", { name: /Bài tập đã hoàn thành/ })).toContainText("0/2");
  await expect(page.getByRole("button", { name: /Bước bắt buộc còn lại/ })).toContainText("1");
  const first = page.locator("article.assignment-progress").first();
  await expect(first.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "67");
  await expect(first.getByRole("link", { name: "Tiếp tục: Thực hành" })).toHaveAttribute("href", "/assignments/as-1#step-s-lab");
  const second = page.locator("article.assignment-progress").nth(1);
  await expect(second).toContainText("không tính phần trăm");
  await expect(second.getByRole("progressbar")).toHaveCount(0);

  const historySection = page.locator("#progress-history");
  await expect(historySection.locator(".activity-row")).toHaveCount(2);
  await expect(historySection).not.toContainText("100%");
  await historySection.getByRole("button", { name: "Xem thêm lần thử cũ hơn" }).click();
  await expect(historySection.getByRole("alert")).toContainText("Lỗi tạm thời");
  await expect(historySection.locator(".activity-row")).toHaveCount(2);
  await historySection.getByRole("button", { name: "Thử tải lại trang tiếp" }).click();
  await expect(historySection.locator(".activity-row")).toHaveCount(4);
  await expect(historySection).toContainText("Bản ghi cũ");
  await expect(historySection.getByRole("button", { name: "Xem thêm lần thử cũ hơn" })).toHaveCount(0);

  // Metric → step evidence → attempt detail, with focus trapped and restored.
  const evidenceButton = first.getByRole("row", { name: /Bài kiểm tra/ }).getByRole("button", { name: "Xem bằng chứng" });
  await evidenceButton.click();
  const sheet = page.getByRole("dialog", { name: "Bằng chứng" });
  await expect(sheet).toContainText("Lần cao nhất");
  await expect(sheet.locator(".activity-row")).toHaveCount(2);
  await expect(sheet).toContainText("Dùng để tính trạng thái");
  await expect(page.getByRole("button", { name: "Đóng" })).toBeFocused();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
  expect(await sheet.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await sheet.locator(".activity-row").first().getByRole("button", { name: "Xem chi tiết" }).click();
  await expect(sheet).toContainText("2/2 câu đúng = 100% (cần từ 50% để đạt)");
  await expect(sheet).toContainText("Mới nhất");
  await sheet.getByRole("button", { name: "← Quay lại" }).click();
  await expect(sheet).toContainText("Lần cao nhất");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(evidenceButton).toBeFocused();
  await expect(historySection.locator(".activity-row")).toHaveCount(4);
});

test("Epic A5: progress page fits a 390 px phone without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/progress");
  await expect(page.locator("article.assignment-progress")).toHaveCount(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator("#progress-history .activity-row").first().getByRole("button", { name: "Xem chi tiết" }).click();
  const sheet = page.getByRole("dialog", { name: "Bằng chứng" });
  await expect(sheet).toContainText("Đạt một phần");
  await expect(sheet).toContainText("69 mA");
  const box = await sheet.boundingBox();
  expect(box && box.width).toBeLessThanOrEqual(390);
  expect(box && box.y).toBeGreaterThan(0);
});
