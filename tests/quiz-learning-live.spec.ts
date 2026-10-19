import { expect, test, type Page } from "@playwright/test";

const assignmentId = process.env.TEST_ASSIGNMENT_ID;
const lessonId = process.env.TEST_LESSON_ID;
const username = process.env.TEST_STUDENT_USERNAME;
const password = process.env.TEST_STUDENT_PASSWORD;
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill(username!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  const response = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const loginResponse = await response;
  expect(loginResponse.ok()).toBeTruthy();
  return (await loginResponse.json()).accessToken as string;
}

test("real FE/API/database quiz retry and direct practical gate", async ({ page }) => {
  test.skip(!(assignmentId && lessonId && username && password), "Needs TEST_ASSIGNMENT_ID, TEST_LESSON_ID, TEST_STUDENT_USERNAME and TEST_STUDENT_PASSWORD from a backend launcher");
  await page.setViewportSize({ width: 390, height: 844 });
  const accessToken = await login(page);
  const circuit = {
    nodes: [
      { id: "b", type: "battery", value: 9 },
      { id: "r", type: "resistor", value: 350 },
      { id: "l", type: "led" },
      { id: "s", type: "switch", closed: true },
    ],
    edges: [
      { source: "b", target: "r" },
      { source: "r", target: "l" },
      { source: "l", target: "s" },
      { source: "s", target: "b" },
    ],
  };
  const beforePass = await page.request.post(`${api}/attempts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { challengeId: "circuit_001", labState: circuit, durationMs: 100 },
  });
  expect(beforePass.status()).toBe(404);
  const denied = await beforePass.json();
  expect(denied).toHaveProperty("message");
  expect(JSON.stringify(denied)).not.toMatch(/password|token|postgres:|answerOptionId/i);

  const quizRead = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "GET" && url.pathname === `/api/lessons/${lessonId}/quiz`;
  });
  await page.goto(`/assignments/${assignmentId}`);
  const quizResponse = await quizRead;
  expect(quizResponse.status(), `Quiz delivery returned ${quizResponse.status()}`).toBe(200);
  await expect(page.getByText("Câu 1 / 4")).toBeVisible({ timeout: 30000 });
  const quiz = page.getByRole("region", { name: "Bài kiểm tra kiến thức" });
  await quiz.getByRole("radio", { name: "Higher current" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Mass and volume" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Watt" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Current" }).check();
  const failedSubmit = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "POST" && url.pathname === `/api/lessons/${lessonId}/quiz-attempts`;
  });
  await quiz.getByRole("button", { name: "Nộp bài kiểm tra" }).click();
  const failedResponse = await failedSubmit;
  expect(failedResponse.status()).toBe(201);
  expect((await failedResponse.json()).attempt.passed).toBe(false);
  await expect(quiz.getByText("Chưa đạt lần này. Bạn có thể thử lại.")).toBeVisible({ timeout: 30000 });
  await expect(quiz.getByText(/Mới nhất/)).toBeVisible({ timeout: 30000 });

  await quiz.getByRole("button", { name: "Thử lại bài kiểm tra" }).click();
  await quiz.getByRole("radio", { name: "Lower current" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Mass and volume" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Ohm" }).check();
  await quiz.getByRole("button", { name: "Câu tiếp theo" }).click();
  await quiz.getByRole("radio", { name: "Current" }).check();
  const passingSubmit = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "POST" && url.pathname === `/api/lessons/${lessonId}/quiz-attempts`;
  });
  await quiz.getByRole("button", { name: "Nộp bài kiểm tra" }).click();
  const passingResponse = await passingSubmit;
  expect(passingResponse.status()).toBe(201);
  expect((await passingResponse.json()).attempt).toMatchObject({ passed: true, score: 50 });
  await expect(quiz.getByText("Bạn đã vượt qua bài kiểm tra")).toBeVisible({ timeout: 30000 });
  await expect(quiz.getByText(/2\/4 câu · 50 điểm/)).toBeVisible({ timeout: 30000 });
  await expect(quiz.getByText(/Mới nhất · Điểm cao nhất/)).toBeVisible({ timeout: 30000 });

  const refreshedLogin = await page.request.post(`${api}/auth/student/login`, {
    data: { username, password },
  });
  expect(refreshedLogin.ok()).toBeTruthy();
  const practicalToken = (await refreshedLogin.json()).accessToken as string;
  const afterPass = await page.request.post(`${api}/attempts`, {
    headers: { Authorization: `Bearer ${practicalToken}` },
    data: { challengeId: "circuit_001", labState: circuit, durationMs: 100 },
  });
  const practicalResult = await afterPass.json();
  expect(afterPass.status(), `Direct practical response: ${JSON.stringify(practicalResult)}`).toBe(201);

  const localData = await page.evaluate(() => Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));
  expect(JSON.stringify(localData)).not.toMatch(/password|token|postgres:|answerOptionId/i);
  const restoredHistory = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "GET" && url.pathname === `/api/lessons/${lessonId}/quiz-attempts`;
  });
  await page.reload();
  const historyResponse = await restoredHistory;
  expect(historyResponse.status(), `Attempt history returned ${historyResponse.status()}`).toBe(200);
  const reloadedQuiz = page.getByRole("region", { name: "Bài kiểm tra kiến thức" });
  await expect(reloadedQuiz.getByText("Bạn đã vượt qua bài kiểm tra")).toBeVisible({ timeout: 30000 });
  await expect(reloadedQuiz.getByText(/Mới nhất · Điểm cao nhất/)).toBeVisible({ timeout: 30000 });
  console.log("E2E_DEPENDENCIES local Vite UI; live Nest API; seeded development database; Microsoft Edge (Chromium)");
});
