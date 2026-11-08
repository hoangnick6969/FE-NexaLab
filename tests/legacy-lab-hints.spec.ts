import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// SAI-01 T5: legacy Lab hint panel (tutor-rules@1), route-mocked. Escalation, cache and guard are covered by BE suites.
const student = { id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };

async function mockShell(page: Page, tutor = { provider: "rules", llmEnabled: false, ruleVersion: "tutor-rules@1" }) {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: {
    ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null,
    avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" },
  } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: tutor }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/assignment-lab", (route) => route.fulfill({ json: {
    id: "assignment-lab", title: "Lab mạch điện", contentType: "lab", dueDate: null, overdue: false,
    classroom: { id: "class-1", name: "8A" },
    content: { id: "circuit", title: "Mạch điện", subject: { id: "science", name: "KHTN" }, grade: 8, topic: "Điện", learningObjective: "Lắp mạch điện", prerequisites: "", challengeId: "circuit_001" },
  } }));
  await page.route("**/api/labs/circuit/runs", (route) => route.fulfill({ json: {
    contract: "lab-contract/1", runId: "run-1", labId: "circuit", challengeId: "circuit_001", modelRef: "circuit@1.0.0", engineVersion: "1.1.0",
    activityVersionId: "activity-1", activityVersion: 1, rubricVersion: "legacy-challenge@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1,
    constraints: {}, initialState: null, rendererKey: null, expiresAt: null, context: "ASSIGNMENT", assignmentId: "assignment-lab", versionBinding: "ASSIGNMENT_PINNED",
  } }));
}

const hint = (attemptId: string, level: number, escalated: boolean, provider = "rules", content = `Gợi ý mức ${level}`) =>
  ({ id: "h-" + attemptId, attemptId, level, content, escalated, provider, createdAt: new Date().toISOString() });

test("SAI-01: same-level copy, rate-limit wait, AI chip and no hint after passing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockShell(page, { provider: "fake", llmEnabled: true, ruleVersion: "tutor-rules@1" });
  const verdicts = ["partial", "partial", "partial", "partial", "passed"];
  let attempts = 0;
  await page.route("**/api/attempts", (route) => {
    const verdict = verdicts[attempts++];
    return route.fulfill({ status: 201, json: { attempt: {
      id: `attempt-${attempts}`, runId: "run-1", verdict, attemptNumber: attempts,
      simulationResult: verdict === "passed" ? { currentMa: 14.89, ledState: "ON", status: "SAFE" } : { currentMa: null, ledState: "OVERLOAD", status: "LED_OVERLOAD" },
    }, retryGuidance: null } });
  });
  const replies: Record<string, () => any> = {
    "attempt-1": () => ({ status: 201, json: hint("attempt-1", 1, false) }),
    "attempt-2": () => ({ status: 201, json: hint("attempt-2", 1, false, "rules", "Gợi ý mức 1, cách nói khác") }),
    "attempt-3": () => ({ status: 429, json: { statusCode: 429, code: "HINT_RATE_LIMITED", message: "Em đã xin nhiều gợi ý", details: { retryAfterSeconds: 2 } } }),
    "attempt-4": () => ({ status: 201, json: hint("attempt-4", 3, true, "fake", "Điều gì giới hạn dòng điện qua LED?\n\nThử tăng điện trở rồi chạy lại.") }),
  };
  const asked: string[] = [];
  await page.route("**/api/attempts/*/hint", (route) => {
    const id = route.request().url().split("/attempts/")[1].split("/")[0];
    asked.push(id);
    expect(route.request().postData() ?? "").toBe("");
    return route.fulfill(replies[id]());
  });

  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" }).click();
  const panel = page.getByTestId("legacy-hint-panel");
  const submitAndAsk = async () => {
    await page.getByTestId("lab-run-submit").click();
    await panel.getByRole("button", { name: "Nhận gợi ý" }).click();
  };
  const again = () => page.getByRole("button", { name: "Thử lại để hiểu rõ hơn" }).click();

  await expect(panel).toContainText("AI + hướng dẫn từ engine");
  await submitAndAsk();
  await expect(panel).toContainText("MỨC 1 / 4");
  await expect(panel.getByTestId("hint-same-level")).toHaveCount(0);
  await again();
  await submitAndAsk();
  await expect(panel).toContainText("Gợi ý mức 1, cách nói khác");
  await expect(panel.getByTestId("hint-same-level")).toContainText("Em chạy lại với cùng trạng thái");
  const axe = await new AxeBuilder({ page }).include('[data-testid="legacy-hint-panel"]').analyze();
  expect(axe.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);

  await again();
  await submitAndAsk();
  await expect(panel).toContainText(/Em có thể xin gợi ý tiếp sau [12] giây/);
  await expect(panel.getByRole("button", { name: "Nhận gợi ý" })).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Nhận gợi ý" })).toBeEnabled({ timeout: 5000 });

  await again();
  await submitAndAsk();
  await expect(panel).toContainText("MỨC 3 / 4");
  await expect(panel.getByText("AI", { exact: true })).toBeVisible();
  await expect(panel).toContainText("Câu hỏi đầu do AI gợi ý");
  await panel.screenshot({ path: "test-results/legacy-hint-ai.png" });

  await again();
  await page.getByTestId("lab-run-submit").click();
  await expect(panel).toContainText("Em đã đạt thử thách này nên không cần gợi ý.");
  await expect(panel.getByRole("button", { name: "Nhận gợi ý" })).toHaveCount(0);
  expect(asked).toEqual(["attempt-1", "attempt-2", "attempt-3", "attempt-4"]);
});

test("SAI-01: rules-only mode shows no AI chip", async ({ page }) => {
  await mockShell(page);
  await page.route("**/api/attempts", (route) => route.fulfill({ status: 201, json: { attempt: {
    id: "attempt-1", runId: "run-1", verdict: "not_passed", attemptNumber: 1, simulationResult: { currentMa: 0, ledState: "OFF", status: "OPEN_CIRCUIT" },
  }, retryGuidance: null } }));
  await page.route("**/api/attempts/*/hint", (route) => route.fulfill({ status: 201, json: hint("attempt-1", 4, true, "rules-fallback") }));
  await page.goto("/labs/circuit?assignmentId=assignment-lab");
  await page.getByTestId("lab-session-start").click();
  await page.getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" }).click();
  await page.getByTestId("lab-run-submit").click();
  const panel = page.getByTestId("legacy-hint-panel");
  await expect(panel).toContainText("Gợi ý theo luật");
  await panel.getByRole("button", { name: "Nhận gợi ý" }).click();
  await expect(panel).toContainText("MỨC 4 / 4");
  await expect(panel.getByText("AI", { exact: true })).toHaveCount(0);
});
