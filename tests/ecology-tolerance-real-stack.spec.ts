import { expect, test } from "@playwright/test";

// FL-20 against a real API and an isolated local database (no route mocks).
// Opt-in: FL20_REAL_STACK=1, FL20_STUDENT_USERNAME, FL20_STUDENT_PASSWORD and an `ecology-tolerance`
// fixture assigned as `FL20_ASSIGNMENT_ID` (default assignment-eco). Never point this at shared data.
const enabled = process.env.FL20_REAL_STACK === "1";
const username = process.env.FL20_STUDENT_USERNAME ?? "student.active";
const password = process.env.FL20_STUDENT_PASSWORD ?? "";
const assignmentId = process.env.FL20_ASSIGNMENT_ID ?? "assignment-eco";

test.skip(!enabled, "real-stack FL-20 run is opt-in");

test("FL-20 real stack: launch, checkpoints, server scoring and the persisted attempt", async ({ page }) => {
  const login = await page.request.post("/api/auth/student/login", { data: { username, password } });
  expect(login.ok()).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });

  const launched = page.waitForResponse((response) => response.url().includes("/api/labs/ecology-tolerance/runs") && response.request().method() === "POST");
  await page.goto(`/labs/ecology-tolerance?assignmentId=${assignmentId}`);
  await page.getByTestId("lab-session-start").click();
  const launch = await (await launched).json();
  expect(launch).toMatchObject({ modelRef: "ecology-tolerance@1.0.0", rubricVersion: "ecology-tolerance-checkpoints@1.0.0", rendererKey: "ecology-tolerance", assignmentId });

  const act = page.getByTestId("eco-act");
  const observation = page.getByTestId("eco-observation");
  await page.getByTestId("eco-answer-t_inside").getByRole("radio", { name: "Tồn tại được", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("bơi bình thường");
  // A deliberately wrong answer: the server must score it, not the browser.
  await page.getByTestId("eco-answer-t_above").getByRole("radio", { name: "Tồn tại được", exact: true }).click();
  await act.click();
  await expect(observation).toContainText("không tồn tại được");
  await act.click(); // auto sweep (instant under reduced motion)
  await page.getByTestId("eco-answer-limits").getByLabel("Từ 5,6 °C đến 42 °C").click();
  await page.getByTestId("eco-answer-import").getByLabel("Cá B").click();
  await act.click();
  const density = page.getByTestId("eco-answer-density");
  await density.getByLabel("Mật độ").fill("4");
  await density.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await page.getByTestId("eco-answer-age").getByLabel("Dạng suy giảm").click();
  await act.click();
  await page.getByRole("radio", { name: /nằm ngoài giới hạn sinh thái/ }).click();

  const submitted = page.waitForResponse((response) => response.url().endsWith("/api/attempts") && response.request().method() === "POST");
  await page.getByTestId("lab-run-submit").click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  const { attempt } = await response.json();
  expect(attempt.simulationResult.assessment).toMatchObject({ score: 6, maximumScore: 7, unmetCriteria: ["prediction:T_ABOVE"] });
  expect(attempt.verdict).not.toBe("passed");
  await expect(page.getByText("Nước 44,0 °C: cá rô phi không tồn tại được, trả lời chưa đúng")).toBeVisible();
  await expect(page.getByText("Mật độ bắp cải: 4 cây/m², trả lời đúng")).toBeVisible();
  console.log("FL-20 real-stack attempt", JSON.stringify({ id: attempt.id, runId: launch.runId, verdict: attempt.verdict }));
});
