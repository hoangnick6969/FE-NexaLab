import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buoyancyLabEvaluator } from "../../../BE-NexaLab/src/modules/labs/application/evaluators/buoyancy-lab.evaluator";

/** Official renderer with a deterministic API boundary; never accesses a database. */
export async function openBuoyancyLab(page: Page, fluidDensityKgM3 = 1000) {
  const bundle = JSON.parse(readFileSync(resolve("../BE-NexaLab/content/fl05/release-candidate.json"), "utf8"));
  const config = { ...bundle.pack.template.buoyancy, fluidDensityKgM3 };
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
  return () => submitted;
}
