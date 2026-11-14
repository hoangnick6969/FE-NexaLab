import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Owner 2026-11-08: LLM-first Student AI (dev/test only). Route-mocked; guards, budget and refusals are covered by BE suites.
const lessonId = "lesson-ohm";
const student = { id: "student-1", role: "STUDENT", grade: 8, fullName: "Nguyễn An" };
const lesson = {
  id: lessonId, title: "Định luật Ôm", grade: 8, subjectId: "khtn", subject: { id: "khtn", name: "KHTN" }, chapter: "Điện học",
  content: "Định luật Ôm", materials: [], structuredContent: null,
  steps: [
    { id: "step-reading", type: "READING", position: 10, state: "COMPLETED", progressValue: 100, resource: { html: "<p>Định luật Ôm.</p>" } },
    { id: "step-exercise", type: "BASIC_EXERCISE", position: 30, state: "IN_PROGRESS", progressValue: 0, exercise: null,
      resource: { passThreshold: 100, questions: [{ id: "q1", prompt: "Khi tăng điện trở, dòng điện thay đổi thế nào?", options: [{ id: "a", text: "Giảm" }, { id: "b", text: "Tăng" }] }] } },
  ],
};

async function mockApp(page: Page, chatEnabled: boolean) {
  const sent: any[] = [];
  let turns = 0;
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let status = 200;
    let body: any = [];
    if (path === "/auth/refresh") body = { user: student, accessToken: "mock-token" };
    else if (path === "/me/profile") body = { ...student, preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/open-curriculum") body = { subjects: [] };
    else if (path === `/open-curriculum/lessons/${lessonId}`) body = lesson;
    else if (path === "/tutor/status") body = { provider: chatEnabled ? "fake" : "rules", llmEnabled: chatEnabled, ruleVersion: "tutor-rules@1" };
    else if (path === "/tutor/chat/status") body = { enabled: chatEnabled, promptVersion: "tutor-chat@1", maxMessage: 500 };
    else if (path === "/tutor/conversations") body = { id: "conv-1", contextKind: "LESSON", contextId: lessonId, messages: [] };
    else if (path === "/tutor/conversations/conv-1/messages") {
      const message = req.postDataJSON().message;
      sent.push(req.postDataJSON());
      turns += 1;
      if (turns === 2) { status = 429; body = { statusCode: 429, code: "TUTOR_RATE_LIMITED", message: "Em đã hỏi nhiều", details: { retryAfterSeconds: 2 } }; }
      else body = { conversationId: "conv-1", messages: [
        { id: `s${turns}`, role: "STUDENT", content: message, outcome: null, ai: false, createdAt: new Date().toISOString() },
        { id: `t${turns}`, role: "TUTOR", content: "Điện trở cản trở dòng điện. Em thử nghĩ: điện trở lớn hơn thì dòng điện ra sao?", outcome: "ANSWERED", ai: true, createdAt: new Date().toISOString() },
      ] };
    } else if (path === `/open-curriculum/lessons/${lessonId}/exercises/step-exercise/hints`) {
      status = 201;
      body = { id: "h1", questionId: "q1", level: 1, maxLevel: 2, content: "Câu hỏi nói về điện trở và dòng điện; em cần tìm điều gì?", escalated: false, repeatReason: null, provider: "fake", ruleVersion: "lesson-hints@1" };
    }
    await route.fulfill({ status, json: body });
  });
  return sent;
}

test("tutor chat: ask, see the AI reply, wait after 429; hint shows the AI chip; phone layout and axe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sent = await mockApp(page, true);
  await page.goto(`/lessons/${lessonId}`);
  const chat = page.getByTestId("tutor-chat");
  await chat.getByRole("button", { name: "Hỏi gia sư AI" }).click();
  const input = chat.getByRole("textbox", { name: "Em thắc mắc điều gì trong bài?" });
  await input.fill("Vì sao điện trở làm dòng điện nhỏ đi?");
  await chat.getByRole("button", { name: "Gửi" }).click();
  await expect(chat).toContainText("điện trở lớn hơn thì dòng điện ra sao?");
  await expect(chat.getByTestId("ai-chip")).toHaveCount(1);
  await expect(input).toHaveValue("");
  expect(sent).toEqual([{ message: "Vì sao điện trở làm dòng điện nhỏ đi?" }]);
  await input.fill("Còn LED thì sao?");
  await chat.getByRole("button", { name: "Gửi" }).click();
  await expect(chat).toContainText(/Em có thể hỏi tiếp sau [12] giây/);
  await expect(chat.getByRole("button", { name: "Gửi" })).toBeDisabled();
  await expect(chat.getByRole("button", { name: "Gửi" })).toBeEnabled({ timeout: 5000 });
  const axe = await new AxeBuilder({ page }).include('[data-testid="tutor-chat"]').analyze();
  expect(axe.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await chat.screenshot({ path: "test-results/tutor-chat-phone.png" });

  await page.goto(`/lessons/${lessonId}?tab=exercise`);
  const hint = page.locator("#lesson-panel-exercise").getByTestId("quiz-question-hint");
  await hint.getByRole("button", { name: "Gợi ý cho câu này" }).click();
  await expect(hint.getByTestId("ai-chip")).toBeVisible();
});

test("tutor chat stays hidden while the LLM is off", async ({ page }) => {
  await mockApp(page, false);
  await page.goto(`/lessons/${lessonId}`);
  await expect(page.getByRole("heading", { name: "Định luật Ôm" })).toBeVisible();
  await expect(page.getByTestId("tutor-chat")).toHaveCount(0);
});
