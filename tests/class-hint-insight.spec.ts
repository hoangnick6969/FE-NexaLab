import { expect, test } from "@playwright/test";

// SAI-02A: the class teacher sees where the class is stuck on a Lab assignment and can disagree with a hypothesis.
const teacher = { id: "teacher-1", username: null, email: "teacher@example.test", fullName: "Cô Lan", role: "TEACHER", grade: null, mustChangePassword: false };
const classroom = { id: "class-1", name: "8A", grade: 8, status: "ACTIVE", requiresApproval: false, joinCode: { enabled: false, issued: false, rotatedAt: null }, members: { approved: 3, pending: 0, removed: 0 }, assignments: { active: 1, archived: 0 } };

test("SAI-02A: teacher sees stuck steps, hint counts and hypotheses, and can disagree", async ({ page }) => {
  // Fallback for anything this page loads that the test does not care about; specific routes below win.
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: teacher, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...teacher, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
  await page.route("**/api/classes/class-1/assignments", (route) => route.fulfill({ json: [
    { id: "assignment-fw", title: "Lưới thức ăn", contentId: "food-web", contentType: "lab", dueDate: null, overdue: false, audience: "CLASS", status: "ACTIVE", recipientCount: 3 },
  ] }));
  await page.route("**/api/classes/class-1/assignments/assignment-fw/progress", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/classes/class-1/assignments/assignment-fw/support", (route) => route.fulfill({ json: [] }));
  let disagreement: { note: string | null; at: string } | null = null;
  const writes: any[] = [];
  const insight = () => ({
    assignmentId: "assignment-fw", ruleVersion: "hint-insights@1", hintRules: "checkpoint-hints@4", misconceptionRules: "checkpoint-misconceptions@1", provider: "rules",
    totals: { targeted: 3, submitted: 2, passed: 0, notPassed: 2, notStarted: 1 },
    rubrics: [{ rubricRef: "food-web-checkpoints@1.0.0", submitted: 2, steps: [
      { criterion: "prediction:ROLES", label: "Vai trò sinh vật", studentsUnmet: 0, evidence: [], hints: { total: 0, students: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 }, reflections: 0 }, misconceptions: [] },
      { criterion: "prediction:HUNT", label: "Khi mất rắn", studentsUnmet: 2, evidence: ["a1", "a2"], hints: { total: 3, students: 2, byLevel: { 1: 1, 2: 1, 3: 0, 4: 0 }, reflections: 1 },
        misconceptions: [{ id: "FW_ALL_DECREASE", label: "Cho rằng mất một loài thì mọi loài khác đều giảm", students: 2, evidence: ["a1", "a2"], disagreement }] },
    ] }],
  });
  await page.route("**/api/classes/class-1/assignments/assignment-fw/hint-insight", (route) => route.fulfill({ json: insight() }));
  await page.route("**/api/classes/class-1/assignments/assignment-fw/hint-insight/disagreements*", (route) => {
    const method = route.request().method();
    writes.push({ method, body: method === "PUT" ? route.request().postDataJSON() : new URL(route.request().url()).searchParams.toString() });
    disagreement = method === "PUT" ? { note: route.request().postDataJSON().note ?? null, at: "2026-11-05T10:00:00.000Z" } : null;
    return route.fulfill({ json: method === "PUT" ? { ok: true } : { withdrawn: true } });
  });

  await page.goto("/classes/class-1?tab=progress");
  const panel = page.getByTestId("class-hint-insight");
  await expect(panel).toContainText("Lớp đang vướng ở đâu");
  await expect(panel).toContainText("2/3 học sinh đã nộp · 0 đạt · 2 chưa đạt · 1 chưa nộp");
  // Steps nobody is stuck on and nobody asked about are left out.
  await expect(panel.locator("[data-criterion]")).toHaveCount(1);
  const hunt = panel.locator('[data-criterion="prediction:HUNT"]');
  await expect(hunt).toContainText("2/2 học sinh chưa đạt bước này");
  await expect(hunt).toContainText("3 lần xin gợi ý · 2 học sinh");
  await expect(hunt).toContainText("Mức 1: 1 · Mức 2: 1 · Mức 3: 0 · Mức 4: 0 · Suy ngẫm: 1");
  const hypothesis = hunt.locator('[data-misconception="FW_ALL_DECREASE"]');
  await expect(hypothesis).toContainText("Cho rằng mất một loài thì mọi loài khác đều giảm · 2 học sinh");

  await hypothesis.getByRole("button", { name: "Không đồng ý" }).click();
  await hypothesis.getByLabel("Lý do (không bắt buộc)").fill("Các em hiểu đúng, chỉ chọn nhầm ô");
  await hypothesis.getByRole("button", { name: "Ghi nhận" }).click();
  await expect(hypothesis).toHaveAttribute("data-disagreed", "true");
  await expect(hypothesis).toContainText("Bạn đã đánh dấu không đồng ý: “Các em hiểu đúng, chỉ chọn nhầm ô”");
  await hypothesis.getByRole("button", { name: "Rút lại" }).click();
  await expect(hypothesis).toHaveAttribute("data-disagreed", "false");
  expect(writes).toEqual([
    { method: "PUT", body: { rubricRef: "food-web-checkpoints@1.0.0", criterion: "prediction:HUNT", misconception: "FW_ALL_DECREASE", note: "Các em hiểu đúng, chỉ chọn nhầm ô" } },
    { method: "DELETE", body: "rubricRef=food-web-checkpoints%401.0.0&criterion=prediction%3AHUNT&misconception=FW_ALL_DECREASE" },
  ]);
  await page.setViewportSize({ width: 360, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.screenshot({ path: "test-results/class-hint-insight-phone.png" });
});
