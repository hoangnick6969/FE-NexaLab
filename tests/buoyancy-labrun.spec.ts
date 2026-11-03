import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buoyancyLabEvaluator } from "../../BE-NexaLab/src/modules/labs/application/evaluators/buoyancy-lab.evaluator";

// The HTTP boundary is mocked; grading calls the real server evaluator. No database is accessed.
test("official FL-05 LabRun mounts pinned pack, preserves canvas, submits evidence and renders server grade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bundle = JSON.parse(readFileSync(resolve("../BE-NexaLab/content/fl05/release-candidate.json"), "utf8"));
  const config = { ...bundle.pack.template.buoyancy, fluidDensityKgM3: 1200 };
  const student = { id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/status", (route) => route.fulfill({ json: { provider: "rules" } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/assignments/fl05-assignment", (route) => route.fulfill({ json: { id: "fl05-assignment", title: "Lực đẩy Ác-si-mét", contentType: "lab", dueDate: null, overdue: false, classroom: { id: "class-1", name: "8A" }, content: { id: "buoyancy", title: "Lực đẩy Ác-si-mét", subject: { id: "khtn", name: "KHTN" }, grade: 8, topic: "Lực đẩy Ác-si-mét", learningObjective: "Kiểm chứng lực đẩy", prerequisites: "", challengeId: "buoyancy-001" } } }));
  await page.route("**/api/labs/buoyancy/runs", (route) => route.fulfill({ json: { contract: "lab-contract/1", runId: "fl05-run", labId: "buoyancy", challengeId: "buoyancy-001", modelRef: "buoyancy@1.0.0", engineVersion: "1.0.0", activityVersionId: "fl05-activity-v1", activityVersion: 1, rubricVersion: "buoyancy-archimedes@1.0.0", stateSchemaVersion: 1, evidenceSchemaVersion: 1, constraints: {}, initialState: bundle.pack.template.initialState, rendererKey: "buoyancy-bench", expiresAt: null, context: "ASSIGNMENT", assignmentId: "fl05-assignment", versionBinding: "ASSIGNMENT_PINNED", runtimeParams: {}, runtimeConfig: config } }));
  let submitted: any;
  await page.route("**/api/attempts", async (route) => {
    submitted = route.request().postDataJSON();
    const evidence = buoyancyLabEvaluator.evidenceSchema.parse(submitted.evidence);
    const evaluation = buoyancyLabEvaluator.evaluate("fl05-run", evidence, { labId: "buoyancy", modelRef: "buoyancy@1.0.0", engineVersion: "1.0.0", params: {}, template: { ...bundle.pack.template, buoyancy: config } });
    await route.fulfill({ status: 201, json: { attempt: { id: "fl05-attempt", verdict: evaluation.verdict, simulationResult: evaluation.result } } });
  });
  await page.goto("/labs/buoyancy?assignmentId=fl05-assignment");
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByRole("heading", { name: "FL-05 · Lực đẩy Ác-si-mét", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Mẫu vật" }).selectOption("pebble-a");
  await page.getByRole("button", { name: "Nhúng chìm hoàn toàn", exact: true }).click();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.165 N");
  await page.evaluate(() => { (window as typeof window & { __fl05Canvas?: Element | null }).__fl05Canvas = document.querySelector(".physics-stage canvas"); });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".buoyancy-table tbody")).toContainText("0.165");
  await expect(page.getByTestId("lab-run-submit")).toBeDisabled();
  await page.getByTestId("buoyancy-overflow-input").fill("12");
  await page.getByTestId("buoyancy-force-input").fill("0.141");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  expect(await page.evaluate(() => (window as typeof window & { __fl05Canvas?: Element | null }).__fl05Canvas === document.querySelector(".physics-stage canvas"))).toBe(true);
  await page.getByTestId("lab-run-submit").click();
  await expect(page.getByTestId("buoyancy-result")).toContainText("2 / 2");
  expect(submitted).toMatchObject({ contract: "lab-contract/1", runId: "fl05-run", evidence: { specimenId: "pebble-a", submergedVolumeMl: 12, overflowMl: 12, measuredBuoyantForceN: 0.141 } });
  expect(submitted).not.toHaveProperty("labState");
});
