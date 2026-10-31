import { expect, test } from "@playwright/test";

// FL-25 private prototype against a real API and an isolated local database (no route mocks).
// Opt-in: FL25_REAL_STACK=1, FL25_STUDENT_USERNAME, FL25_STUDENT_PASSWORD and an `em-induction`
// fixture assigned as `FL25_ASSIGNMENT_ID` (default assignment-em). Never point this at shared data.
const enabled = process.env.FL25_REAL_STACK === "1";
const username = process.env.FL25_STUDENT_USERNAME ?? "student.active";
const password = process.env.FL25_STUDENT_PASSWORD ?? "";
const assignmentId = process.env.FL25_ASSIGNMENT_ID ?? "assignment-em";

test.skip(!enabled, "real-stack FL-25 run is opt-in");

test("FL-25 real stack: launch, checkpoints, server scoring and the persisted attempt", async ({ page }) => {
  const login = await page.request.post("/api/auth/student/login", { data: { username, password } });
  expect(login.ok()).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });

  const launched = page.waitForResponse((response) => response.url().includes("/api/labs/em-induction/runs") && response.request().method() === "POST");
  await page.goto(`/labs/em-induction?assignmentId=${assignmentId}`);
  await page.getByTestId("lab-session-start").click();
  const launch = await (await launched).json();
  expect(launch).toMatchObject({ modelRef: "em-induction@1.0.0", rubricVersion: "em-induction-checkpoints@1.0.0", rendererKey: "em-induction", assignmentId });

  await page.getByRole("group", { name: "Chế độ hiển thị mô phỏng" }).getByRole("button", { name: "2D" }).click();
  const act = page.getByTestId("em-act");
  const observation = page.getByTestId("em-observation");
  await page.getByTestId("em-prediction-still").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("đứng yên ở vạch 0", { timeout: 5000 });
  // A deliberately wrong prediction: the server must score it, not the browser.
  await page.getByTestId("em-prediction-push").getByRole("radio", { name: "Không có dòng điện", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("lệch sang phải", { timeout: 5000 });
  await page.getByTestId("em-prediction-pull").getByLabel("Ngược chiều với lúc đẩy vào").click();
  await act.click();
  await expect(observation).toContainText("lệch sang trái", { timeout: 5000 });
  await page.getByTestId("em-prediction-rotate").getByLabel("Dòng điện luân phiên đổi chiều").click();
  await act.click();
  await expect(observation).toContainText("đổi chiều hai lần", { timeout: 8000 });
  await page.getByRole("radio", { name: /số đường sức từ xuyên qua tiết diện/ }).click();

  const submitted = page.waitForResponse((response) => response.url().endsWith("/api/attempts") && response.request().method() === "POST");
  await page.getByTestId("lab-run-submit").click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  const { attempt } = await response.json();
  expect(attempt.simulationResult.assessment).toMatchObject({ score: 4, maximumScore: 5 });
  expect(attempt.verdict).not.toBe("passed");
  await expect(page.getByText("Đẩy cực N vào: có dòng điện, kim lệch phải, dự đoán chưa đúng")).toBeVisible();
  await expect(page.getByText("Quay máy phát một vòng: dòng điện đổi chiều luân phiên, dự đoán đúng")).toBeVisible();
});
