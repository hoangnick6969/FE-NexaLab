import { expect, test } from "@playwright/test";

// SAI-03A: a hint per quiz question, route-mocked. The draft answer is never sent; hint rules are covered by the BE suites.
const student = { id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
const lesson = { id: "lesson-circuit", title: "Mạch điện", topic: "Định luật Ôm", learningObjective: "Tìm hiểu mạch điện", prerequisites: "", grade: 8, subject: { name: "Vật lý" } };
const questions = [
  { id: "q-current", prompt: "Khi tăng điện trở, dòng điện thay đổi thế nào?", options: [{ id: "o-low", text: "Giảm" }, { id: "o-high", text: "Tăng" }] },
  { id: "q-unit", prompt: "Đơn vị của điện trở là gì?", options: [{ id: "o-ohm", text: "Ôm" }, { id: "o-volt", text: "Vôn" }] },
];

test("SAI-03A: quiz question hints climb to level 2, say when level 3 opens, and never send the draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/assignments/assignment-ohm", (route) => route.fulfill({ json: { id: "assignment-ohm", contentType: "lesson", content: lesson, classroom: { name: "Lớp 8A" }, overdue: false } }));
  await page.route("**/api/lessons/*/pathway*", (route) => route.fulfill({ json: {
    lesson, nextStepId: "step-quiz",
    steps: [
      { id: "step-reading", type: "READING", position: 0, required: true, state: "COMPLETED", progressValue: 100, resource: null },
      { id: "step-quiz", type: "QUIZ", position: 1, required: true, state: "IN_PROGRESS", progressValue: 0, resource: null },
    ],
  } }));
  await page.route("**/api/lessons/*/quiz-attempts*", (route) => route.fulfill({ json: { attempts: [] } }));
  await page.route(/\/api\/lessons\/[^/]+\/quiz(\?|$)/, (route) => route.fulfill({ json: { lessonId: lesson.id, stepId: "step-quiz", questions } }));
  const asked: Array<{ url: string; body: any }> = [];
  const levels: Record<string, number> = {};
  await page.route("**/api/lessons/*/quiz/hints*", (route) => {
    const body = route.request().postDataJSON();
    asked.push({ url: route.request().url(), body });
    const before = levels[body.questionId] ?? 0;
    const level = Math.min(2, before + 1);
    levels[body.questionId] = level;
    return route.fulfill({ status: 201, json: {
      id: `h${asked.length}`, questionId: body.questionId, level, maxLevel: 2, escalated: level > before && before > 0,
      repeatReason: before === 2 ? "NEEDS_ATTEMPT" : null, content: `Gợi ý mẫu ${body.questionId} mức ${level}`,
    } });
  });

  await page.goto("/assignments/assignment-ohm");
  const quiz = page.getByRole("region", { name: "Bài kiểm tra kiến thức" });
  await expect(quiz.getByText("Câu 1 / 2")).toBeVisible();
  // Choose an answer first: it must not travel with the hint request.
  await quiz.getByRole("radio", { name: "Tăng" }).check();
  const hint = quiz.getByTestId("quiz-question-hint");
  await expect(hint).toContainText("Gợi ý không cho đáp án và không trừ điểm.");
  await hint.getByRole("button", { name: "Gợi ý cho câu này" }).click();
  await expect(hint).toContainText("Mức 1/3 · Câu hỏi gợi mở");
  await expect(hint).toContainText("Gợi ý mẫu q-current mức 1");
  await hint.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(hint).toContainText("Mức 2/3 · Chỗ cần xem lại");
  await hint.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(hint).toContainText("Mức 3 sẽ mở nếu em nộp bài mà câu này vẫn chưa đúng.");
  expect(asked.map((item) => item.body)).toEqual([{ questionId: "q-current" }, { questionId: "q-current" }, { questionId: "q-current" }]);
  expect(asked[0].url).toContain("assignmentId=assignment-ohm");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await quiz.screenshot({ path: "test-results/quiz-question-hint-phone.png" });

  // The next question starts with its own empty hint.
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(quiz.getByText("Câu 2 / 2")).toBeVisible();
  await expect(quiz.getByTestId("quiz-question-hint")).not.toContainText("Gợi ý mẫu");
  await quiz.getByTestId("quiz-question-hint").getByRole("button", { name: "Gợi ý cho câu này" }).click();
  await expect(quiz.getByTestId("quiz-question-hint")).toContainText("Gợi ý mẫu q-unit mức 1");
});
