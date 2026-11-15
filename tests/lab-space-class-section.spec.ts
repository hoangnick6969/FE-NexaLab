import { expect, test, type Page } from "@playwright/test";

// SPEC-lab-space-shared-ui (layout A): Class Lab teacher content is the last section of the activity's question
// panel, lists each prompt once and never covers the activity's own questions. Route-mocked API only.
const student = {
  id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An",
  role: "STUDENT", grade: 8, mustChangePassword: false,
};
const prompt = "Vì sao bóng đèn tắt khi mở khoá?";
const instructions = "Dự đoán trước khi mở khoá, rồi giải thích bằng bằng chứng.";

async function mockShell(page: Page, labId: string, posts: any[]) {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/tutor/chat/status", (route) => route.fulfill({ json: { enabled: false } }));
  await page.route("**/api/lab-runs/*/hints/check", (route) => route.fulfill({ status: 201, json: { mismatch: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  const content = { source: { labId, releaseId: "source-release", challengeId: "private-challenge" }, learningObjective: "Lần theo đường đi của dòng điện", instructions, reportPrompts: [prompt] };
  await page.route("**/api/classes/class-private/resources/resource-v2", (route) => route.fulfill({ json: { id: "resource-v2", kind: "LAB", title: "Hoạt động của lớp", content } }));
  await page.route("**/api/classes/class-private/resources/resource-v2/additional-responses**", (route) => {
    if (route.request().method() === "POST") {
      posts.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { id: "response-1" } });
    }
    return route.fulfill({ json: [] });
  });
  return content;
}

const launch = (labId: string, modelRef: string, rendererKey: string | null, snapshot: object) => ({
  contract: "lab-contract/1", runId: `${labId}-private-run`, labId, challengeId: "private-challenge",
  modelRef, engineVersion: "1.1.0", activityVersionId: "activity-1", activityVersion: 1,
  rubricVersion: "legacy-challenge@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
  constraints: {}, initialState: null, rendererKey, expiresAt: null, context: "CLASS_PRACTICE",
  assignmentId: null, versionBinding: "ASSIGNMENT_PINNED", classLabSnapshot: { title: "Hoạt động của lớp", ...snapshot },
});

test("circuit bulb: teacher questions join its question panel, list the prompt once, keep the draft and post the answer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  const posts: any[] = [];
  const content = await mockShell(page, "circuit", posts);
  await page.route("**/api/labs/circuit/runs", (route) => route.fulfill({ json: launch("circuit", "circuit-bulb@1.0.0", "circuit-bulb", content) }));
  await page.goto("/labs/circuit?classId=class-private&resourceId=resource-v2");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("lab-run-submit")).toBeVisible();

  // Layout A: one place on the right, one copy of the prompt, no separate drawer.
  const panel = page.locator("#bulb-questions");
  const section = panel.getByTestId("lab-class-section");
  await expect(section.getByText(instructions, { exact: true })).toBeVisible();
  await expect(page.locator("#lab-class-drawer")).toHaveCount(0);
  await expect(page.getByText(prompt, { exact: true })).toHaveCount(1);

  // Closing and reopening the panel keeps the draft; Esc inside it returns focus to its badge.
  const answer = section.getByRole("textbox", { name: prompt });
  await answer.fill("Mạch hở nên không có dòng điện.");
  await answer.press("Escape");
  const badge = page.locator(".bulb-question-badge");
  await expect(badge).toBeFocused();
  await badge.click();
  await expect(answer).toHaveValue("Mạch hở nên không có dòng điện.");

  await section.getByRole("button", { name: "Nộp câu trả lời cho giáo viên" }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({ answers: [{ promptId: "prompt-1", answer: "Mạch hở nên không có dòng điện." }] });
});

test("activity with the shared panel: teacher questions are the last section of that panel, with no extra drawer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  const posts: any[] = [];
  const content = await mockShell(page, "food-web", posts);
  await page.route("**/api/labs/food-web/runs", (route) => route.fulfill({ json: { ...launch("food-web", "food-web@1.0.0", "food-web", content), rubricVersion: "food-web-checkpoints@1.0.0", engineVersion: "1.0.0" } }));
  await page.goto("/labs/food-web?classId=class-private&resourceId=resource-v2");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("fw-stage")).toBeVisible();

  const panel = page.locator("#fw-questions");
  const section = panel.getByTestId("lab-class-section");
  await expect(section.getByText(instructions, { exact: true })).toBeVisible();
  await expect(page.locator("#lab-class-drawer")).toHaveCount(0);
  await expect(page.getByText(prompt, { exact: true })).toHaveCount(1);
  // The activity's own step and answers stay first.
  await expect(panel.locator(".fw-step")).toHaveText("Bước 1/13");

  // Closing and reopening the panel keeps the draft.
  const answer = section.getByRole("textbox", { name: prompt });
  await answer.fill("Vì chuỗi thức ăn bị đứt.");
  await answer.press("Escape");
  const badge = page.locator(".fw-question-badge");
  await expect(badge).toBeFocused();
  await badge.click();
  await expect(page.getByRole("button", { name: "Đóng câu hỏi" })).toBeFocused();
  await expect(answer).toHaveValue("Vì chuỗi thức ăn bị đứt.");
});
