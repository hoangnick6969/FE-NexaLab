import { expect, test, type Page } from "@playwright/test";

const lessonId = "pack-structured-38f03d31878e58fc0d8a31b8c8aa9fab4af866f7-v1";
const sectionId = "section-sgk-khtn8-nxbgd-2026-p0093-b0011-c295fcf1";
const releaseId = "published-circuit-v2";
const lab = { labId: "circuit", title: "Circuit Bulb — Mạch kín và mạch hở", objective: "Dự đoán, quan sát và giải thích trạng thái bóng đèn.", releaseId, version: 2 };
const lesson = {
  id: lessonId, title: "Mạch điện đơn giản", grade: 8, subjectId: "khtn", subject: { id: "khtn", name: "KHTN" }, chapter: "Điện học",
  content: "Mạch điện", materials: [], steps: [{ id: "reading", type: "READING", state: "IN_PROGRESS", progressValue: 20 }],
  structuredContent: { learningContent: { sections: [
    { id: sectionId, heading: "I – Mạch điện và các bộ phận của mạch điện", content: "Công tắc đóng tạo mạch kín, bóng đèn sáng." },
    { id: "section-two", heading: "II – Các thiết bị bảo vệ", content: "Cầu chì và cầu dao." },
  ] } },
};

async function mockApp(page: Page, role = "STUDENT", missingSection = false, noLabs = false, publicGate?: Promise<void>) {
  const writes: Array<{ path: string; body: any }> = [];
  const currentLesson = missingSection ? { ...lesson, structuredContent: { learningContent: { sections: [lesson.structuredContent.learningContent.sections[1]] } } } : lesson;
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let body: any = [];
    if (path === "/auth/refresh") body = { user: { id: "nav-user", role, grade: 8, fullName: "Navigation user" }, accessToken: "mock-token" };
    else if (req.method() !== "GET") {
      writes.push({ path, body: req.postDataJSON() });
      if (path === "/labs/circuit/runs") body = {
        contract: "lab-contract/1", runId: "navigation-run", labId: "circuit", challengeId: "circuit_001", modelRef: "circuit-bulb@1.0.0",
        engineVersion: "1.0.0", activityVersionId: "activity", activityVersion: 1, rubricVersion: "circuit-bulb-checkpoints@1.0.0",
        stateSchemaVersion: 1, evidenceSchemaVersion: 1, rendererKey: "circuit-bulb", constraints: {}, initialState: {}, context: "FOUNDATIONAL", assignmentId: null,
      };
    } else if (path === "/me/profile") body = { id: "nav-user", role, grade: 8, fullName: "Navigation user", preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/open-curriculum") body = { subjects: [] };
    else if (path === "/tutor/status") body = { provider: "rules" };
    else if (path === `/open-curriculum/lessons/${lessonId}`) { await publicGate; body = currentLesson; }
    else if (path === `/lessons/${lessonId}/pathway`) body = { lesson: { ...currentLesson, structuredContent: undefined }, assignment: { id: "lesson-assignment" }, steps: currentLesson.steps };
    else if (path === "/lessons") body = [{ ...currentLesson, structuredContent: undefined }];
    else if (path === `/lessons/${lessonId}/foundational-labs`) body = noLabs ? [] : [lab];
    else if (path === "/labs") body = [{ id: "circuit", title: lab.title, learningObjective: lab.objective, simulationModelRef: "circuit-bulb@1.0.0", challenges: [{ id: "circuit_001" }], lessonLinks: [{ lessonId, title: lesson.title, topicCode: "KHTN8-L22" }] }];
    else if (path.startsWith("/teacher-content")) body = { items: [] };
    await route.fulfill({ json: body });
  });
  return writes;
}

test("Lab is a dedicated lesson tab and is placed only in the related reading section", async ({ page }) => {
  await mockApp(page);
  await page.goto(`/lessons/${lessonId}`);
  await expect(page.getByRole("tab", { name: "Thực hành Lab", exact: true })).toBeVisible();
  await expect(page.locator(`[id="${sectionId}"] .lesson-lab-card`)).toHaveCount(1);
  await expect(page.locator("#section-two .lesson-lab-card")).toHaveCount(0);
  await page.getByRole("tab", { name: "Thực hành Lab", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Thực hành Lab" })).toContainText(lesson.structuredContent.learningContent.sections[0].heading);
  await expect(page).toHaveURL(/tab=labs/);
  expect((await page.locator("#lesson-panel-labs").boundingBox())!.width).toBeGreaterThan(500);
  await page.screenshot({ path: "test-results/lesson-lab-tab.png", fullPage: true });
  await page.getByRole("link", { name: "Xem phần kiến thức", exact: true }).click();
  await expect(page.locator(`[id="${sectionId}"]`)).toBeFocused();
});

test("assigned lesson keeps its return context without assigning the LabRun to the lesson assignment", async ({ page }) => {
  const writes = await mockApp(page);
  await page.goto(`/lessons/${lessonId}?assignmentId=lesson-assignment&tab=labs`);
  await page.getByRole("link", { name: "Mở hoạt động Lab", exact: true }).click();
  const url = new URL(page.url());
  expect(url.searchParams.get("lessonAssignmentId")).toBe("lesson-assignment");
  expect(url.searchParams.has("assignmentId")).toBe(false);
  await page.getByTestId("lab-session-start").click();
  await expect(page.getByTestId("bulb-prediction-closed")).toBeVisible();
  expect(writes.find((request) => request.path.endsWith("/runs"))?.body).toEqual({ challengeId: "circuit_001", releaseId });
  await page.getByRole("link", { name: "Quay lại phần bài học", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`assignmentId=lesson-assignment#${sectionId}$`));
  await expect(page.locator(`[id="${sectionId}"]`)).toBeFocused();
  expect(writes.filter((request) => request.path.includes("/progress"))).toHaveLength(0);
});

test("a slow public section read cannot launch an assigned lesson Lab without its section context", async ({ page }) => {
  let releasePublic!: () => void;
  const gate = new Promise<void>((resolve) => { releasePublic = resolve; });
  await mockApp(page, "STUDENT", false, false, gate);
  try {
    await page.goto(`/lessons/${lessonId}?assignmentId=lesson-assignment&tab=labs`);
    await expect(page.getByRole("button", { name: "Đang tải nội dung và tiến độ bài học…", exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Mở hoạt động Lab", exact: true })).toHaveCount(0);
    releasePublic();
    await page.getByRole("link", { name: "Mở hoạt động Lab", exact: true }).click();
    expect(new URL(page.url()).searchParams.get("sectionId")).toBe(sectionId);
  } finally { releasePublic(); }
});

test("Lab library exposes a related lesson link without nesting links", async ({ page }) => {
  await mockApp(page);
  await page.goto("/labs");
  await expect(page.locator("#lab-circuit .lab-subject")).toHaveText("KHTN");
  await expect(page.locator("#lab-circuit .lab-meta")).toContainText("LỚP 8");
  await page.getByRole("link", { name: `Bài học liên quan: ${lesson.title}` }).click();
  await expect(page.getByRole("tab", { name: "Thực hành Lab", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(page.locator(".lab-grid a a")).toHaveCount(0);
});

test("unbound lesson query cannot manufacture a return link", async ({ page }) => {
  await mockApp(page);
  await page.goto("/labs/circuit?lessonId=not-a-bound-lesson&sectionId=arbitrary&lessonAssignmentId=other");
  await expect(page.getByTestId("lab-session-start")).toBeVisible();
  await expect(page.locator(".lab-heading .badge").first()).toHaveText("KHTN · LỚP 8");
  await expect(page.getByRole("link", { name: "Quay lại phần bài học", exact: true })).toHaveCount(0);
});

test("missing section placement retains the Lab tab without attaching it to another section", async ({ page }) => {
  await mockApp(page, "STUDENT", true);
  await page.goto(`/lessons/${lessonId}`);
  await expect(page.getByRole("tab", { name: "Thực hành Lab", exact: true })).toBeVisible();
  await expect(page.locator(".lesson-detail-reading .lesson-lab-card")).toHaveCount(0);
  await page.getByRole("tab", { name: "Thực hành Lab", exact: true }).click();
  await expect(page.getByRole("link", { name: "Mở hoạt động Lab", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem phần kiến thức", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Mở hoạt động Lab", exact: true }).click();
  const back = page.getByRole("link", { name: "Quay lại phần bài học", exact: true }).first();
  await expect(back).toHaveAttribute("href", `/lessons/${lessonId}?tab=labs`);
});

test("lesson Lab activity remains reachable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApp(page);
  await page.goto(`/lessons/${lessonId}?tab=labs`);
  const open = page.getByRole("link", { name: "Mở hoạt động Lab", exact: true });
  await expect(open).toBeVisible();
  expect(await page.locator(".lesson-detail-page").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/lesson-lab-mobile.png", fullPage: true });
  await open.click();
  await expect(page.getByRole("link", { name: "Quay lại phần bài học", exact: true }).first()).toBeVisible();
});

for (const role of ["TEACHER", "ADMIN"]) {
  test(`${role} sees the lesson Lab tab with role-appropriate navigation`, async ({ page }) => {
    await mockApp(page, role);
    await page.goto(`/lessons/${lessonId}?tab=labs`);
    await expect(page.getByRole("tab", { name: "Thực hành Lab", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Xem phần kiến thức", exact: true }).click();
    await expect(page.locator(`[id="${sectionId}"] .lesson-lab-card`)).toBeVisible();
    await page.getByRole("tab", { name: "Thực hành Lab", exact: true }).click();
    if (role === "ADMIN") {
      await page.getByRole("link", { name: "Xem Lab trong thư viện", exact: true }).click();
      await expect(page.locator("#lab-circuit")).toBeVisible();
    } else {
      await page.getByRole("link", { name: "Mở hoạt động Lab", exact: true }).click();
      await expect(page.getByTestId("bulb-prediction-closed")).toBeVisible();
      await expect(page.getByTestId("lab-run-submit")).toHaveCount(0);
    }
  });
}

for (const tab of ["labs", "video", "exercise", "materials"]) {
  test(`unavailable ${tab} deep link falls back to the accessible reading tab`, async ({ page }) => {
    await mockApp(page, "STUDENT", false, true);
    await page.goto(`/lessons/${lessonId}?tab=${tab}`);
    await expect(page.getByRole("tab", { name: "Nội dung bài", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Nội dung bài", exact: true })).toBeVisible();
    await expect(page.getByRole("tab").and(page.locator('[tabindex="0"]'))).toHaveCount(1);
    await expect(page.locator(`#lesson-panel-${tab}`)).toHaveCount(0);
  });
}
