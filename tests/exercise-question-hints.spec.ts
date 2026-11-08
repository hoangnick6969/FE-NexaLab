import { expect, test, type Page } from "@playwright/test";

// SAI-03-T3: a hint per Open Curriculum basic exercise question, route-mocked. The chosen option never travels with
// the hint request; hint rules are covered by the BE suites.
const lessonId = "lesson-ohm";
const stepId = "step-exercise";
const student = { id: "student-1", role: "STUDENT", grade: 8, fullName: "Nguyễn An" };
const questions = [
  { id: "q-current", prompt: "Khi tăng điện trở, dòng điện thay đổi thế nào?", options: [{ id: "o-low", text: "Giảm" }, { id: "o-high", text: "Tăng" }] },
  { id: "q-unit", prompt: "Đơn vị của điện trở là gì?", options: [{ id: "o-ohm", text: "Ôm" }, { id: "o-volt", text: "Vôn" }] },
];
const lessonWith = (state: string, exercise: any = null) => ({
  id: lessonId, title: "Định luật Ôm", grade: 8, subjectId: "khtn", subject: { id: "khtn", name: "KHTN" }, chapter: "Điện học",
  content: "Định luật Ôm", materials: [], structuredContent: null,
  steps: [
    { id: "step-reading", type: "READING", position: 10, state: "COMPLETED", progressValue: 100, resource: { html: "<p>Định luật Ôm.</p>" } },
    { id: stepId, type: "BASIC_EXERCISE", position: 30, state, progressValue: 0, resource: { passThreshold: 100, questions }, exercise },
  ],
});

async function mockApp(page: Page, lesson: any) {
  const asked: Array<{ path: string; body: any }> = [];
  const levels: Record<string, number> = {};
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let body: any = [];
    let status = 200;
    if (path === "/auth/refresh") body = { user: student, accessToken: "mock-token" };
    else if (path === "/me/profile") body = { ...student, preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/open-curriculum") body = { subjects: [] };
    else if (path === `/open-curriculum/lessons/${lessonId}`) body = lesson;
    else if (path === `/open-curriculum/lessons/${lessonId}/exercises/${stepId}/hints`) {
      const request = req.postDataJSON();
      asked.push({ path, body: request });
      const before = levels[request.questionId] ?? 0;
      const level = Math.min(2, before + 1);
      levels[request.questionId] = level;
      status = 201;
      body = {
        id: `h${asked.length}`, questionId: request.questionId, level, maxLevel: 2, escalated: level > before && before > 0,
        repeatReason: before === 2 ? "NEEDS_ATTEMPT" : null, content: `Gợi ý mẫu ${request.questionId} mức ${level}`,
        provider: "rules", ruleVersion: "lesson-hints@1",
      };
    }
    await route.fulfill({ status, json: body });
  });
  return asked;
}

test("SAI-03-T3: basic exercise hints climb per question, say when level 3 opens, and never send the chosen option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const asked = await mockApp(page, lessonWith("IN_PROGRESS", { score: 50, passThreshold: 100, passed: false, createdAt: "2026-11-08T06:00:00.000Z" }));
  await page.goto(`/lessons/${lessonId}?tab=exercise`);
  const panel = page.locator("#lesson-panel-exercise");
  const first = panel.locator("fieldset").filter({ hasText: "Khi tăng điện trở" });
  await first.getByRole("radio", { name: "Tăng" }).check();
  const hint = first.getByTestId("quiz-question-hint");
  await expect(hint).toContainText("Gợi ý không cho đáp án và không trừ điểm.");
  await hint.getByRole("button", { name: "Gợi ý cho câu này" }).click();
  await expect(hint).toContainText("Mức 1/3 · Câu hỏi gợi mở");
  await expect(hint).toContainText("Gợi ý mẫu q-current mức 1");
  await hint.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(hint).toContainText("Mức 2/3 · Chỗ cần xem lại");
  await hint.getByRole("button", { name: "Gợi ý thêm" }).click();
  await expect(hint).toContainText("Mức 3 sẽ mở nếu em nộp bài mà câu này vẫn chưa đúng.");
  // The hint button is type=button: it never submits the exercise.
  expect(asked.map((item) => item.body)).toEqual([{ questionId: "q-current" }, { questionId: "q-current" }, { questionId: "q-current" }]);

  // The other question keeps its own ladder.
  const second = panel.locator("fieldset").filter({ hasText: "Đơn vị của điện trở" });
  await expect(second.getByTestId("quiz-question-hint")).not.toContainText("Gợi ý mẫu");
  await second.getByRole("button", { name: "Gợi ý cho câu này" }).click();
  await expect(second.getByTestId("quiz-question-hint")).toContainText("Gợi ý mẫu q-unit mức 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.screenshot({ path: "test-results/exercise-question-hint-phone.png" });
});

test("SAI-03-T3: a passed basic exercise shows no hint button", async ({ page }) => {
  await mockApp(page, lessonWith("COMPLETED", { score: 100, passThreshold: 100, passed: true, createdAt: "2026-11-08T06:00:00.000Z" }));
  await page.goto(`/lessons/${lessonId}?tab=exercise`);
  const panel = page.locator("#lesson-panel-exercise");
  await expect(panel.locator("fieldset")).toHaveCount(2);
  await expect(panel.getByTestId("quiz-question-hint")).toHaveCount(0);
});
