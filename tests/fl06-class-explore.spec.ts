import { expect, test, type Page } from "@playwright/test";

// fl-06-class-explore-spec §7 (D1-3.1): a teacher picks inside the FL-06 class template and assigns, a student levels the
// bar with the load fixed and hands in both moments, the teacher reads them. Mocked API, no Supabase, no run.
const teacher = { id: "teacher-1", username: null, email: "teacher@example.test", fullName: "Cô Lan", role: "TEACHER", grade: null, mustChangePassword: false };
const student = { id: "student-1", username: "student.active", email: null, fullName: "An", role: "STUDENT", grade: 8, mustChangePassword: false };
const classroom = { id: "class-1", name: "8A", grade: 8, status: "ACTIVE", requiresApproval: false, joinCode: { enabled: false, issued: false, rotatedAt: null }, members: { approved: 3, pending: 0, removed: 0 }, assignments: { active: 0, archived: 0 } };
const activity = { id: "pav-lever-v2", key: "lever-equilibrium-explore", version: 2, digest: "d" };

// Same values as FL06_LEVER_EXPLORE_CONFIG (configVersion 2) in @nexalab/sim/mechanics; the sim tests validate that copy.
const prompts = [
  { id: "at-fulcrum", kind: "note", textVi: "Treo quả nặng ngay tại O. Thanh thay đổi thế nào?" },
  { id: "balance", kind: "free_text", textVi: "Tìm ít nhất hai cách để thanh nằm ngang. Ghi lại F và d mỗi bên.", challenge: true },
  { id: "explain-balance", kind: "free_text", textVi: "Vì sao thanh nằm ngang? Dùng moment hai bên để giải thích." },
];
const apparatus = [
  { id: "bar", kind: "lever_bar", slot: "bench", labelVi: "Thanh đòn" },
  { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng" },
  { id: "gauge", kind: "spring_gauge", slot: "hook", labelVi: "Lực kế" },
];
const base = {
  schema: "k5-lever-config/1", labId: "lever-equilibrium", catalogId: "FL-06", configVersion: 2,
  kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", fixtureId: "lever-bench-reference-v1",
  title: "Moment lực và đòn bẩy", contextLabel: "Vật lý 8 · Khám phá đòn bẩy",
  outcomeSummary: ["Nhận biết tác dụng làm quay của lực qua moment lực M = F × d.", "Tìm điều kiện để đòn bẩy nằm cân bằng."],
  safetyBriefing: { simulation: ["Đây là mô hình lý tưởng."], realLab: ["Treo quả nặng nhẹ tay."], acknowledgeRequired: false },
  limitations: ["Thanh cứng, khối lượng thanh được bỏ qua."],
  modes: { explore: true },
  enabledApparatus: apparatus,
  weights: { availableMilliNewtons: [500, 1000, 2000], maxCount: 4 },
  initialAttachments: [{ kind: "WEIGHT", positionMillimetres: -100, forceMilliNewtons: 1000 }],
  measurements: ["ruler", "force_labels", "moment_table"],
  pedagogy: { observationPrompts: prompts },
  review: { status: "draft" },
};
const config = {
  ...base,
  classTemplates: [{
    id: "balance-the-lever", titleVi: "Làm thanh đòn cân bằng",
    loadPresets: [
      { id: "load-1n-left-100", labelVi: "1 N ở bên trái, cách O 100 mm", attachments: [{ kind: "WEIGHT", positionMillimetres: -100, forceMilliNewtons: 1000 }] },
      { id: "load-2n-right-150", labelVi: "2 N ở bên phải, cách O 150 mm", attachments: [{ kind: "WEIGHT", positionMillimetres: 150, forceMilliNewtons: 2000 }] },
      { id: "load-05n-left-250", labelVi: "0,5 N ở bên trái, cách O 250 mm", attachments: [{ kind: "WEIGHT", positionMillimetres: -250, forceMilliNewtons: 500 }] },
      { id: "load-2n-left-200", labelVi: "2 N ở bên trái, cách O 200 mm", attachments: [{ kind: "WEIGHT", positionMillimetres: -200, forceMilliNewtons: 2000 }] },
    ],
    weightOptions: [[500, 1000, 2000], [1000]],
    gauge: "teacher_choice", momentTable: "teacher_choice",
    promptChoices: [{ promptId: "balance" }, { promptId: "explain-balance" }],
    requirements: { measure: "balance_moments", explain: true },
  }],
};
const labRow = { id: "lever-equilibrium", title: "Moment lực và đòn bẩy", mode: "explore", explore: { ok: true, kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", activity, config } };

/** What the server derives for 2 N at -200 mm, 1 N weights, no gauge, no moment table, the explain prompt. */
const effectiveConfig = {
  ...base,
  enabledApparatus: apparatus.filter((item) => item.kind !== "spring_gauge"),
  weights: { availableMilliNewtons: [1000], maxCount: 4 },
  initialAttachments: [{ kind: "WEIGHT", positionMillimetres: -200, forceMilliNewtons: 2000 }],
  lockInitialAttachments: true,
  measurements: ["ruler", "force_labels"],
  pedagogy: { observationPrompts: prompts.filter((prompt) => prompt.id === "explain-balance") },
};
const requirements = [
  { kind: "measure", itemId: "moment-left", measurement: "moment", unit: "milliNewtonMetres" },
  { kind: "measure", itemId: "moment-right", measurement: "moment", unit: "milliNewtonMetres" },
  { kind: "explain" },
];

async function signIn(page: Page, user: typeof teacher | typeof student) {
  const forbidden: string[] = [];
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) forbidden.push(request.url()); });
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...user, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  return forbidden;
}

/** The teacher's way in: the Class Lab page, "Giao lab" on the class, then the kind of lab work. */
async function openExploreAssign(page: Page) {
  await page.goto("/class-labs");
  await page.getByRole("button", { name: "Giao lab", exact: true }).click();
  await page.getByRole("dialog", { name: "Giao lab cho 8A" }).getByRole("button", { name: /Thí nghiệm tự do có đề/ }).click();
}

test("teacher picks a load, weights and switches inside the FL-06 template, sees a load that cannot be levelled refused, previews and assigns", async ({ page }) => {
  await signIn(page, teacher);
  const writes: Array<{ path: string; body: any }> = [];
  await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
  await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { lessons: [{ id: "lesson-lever", title: "Đòn bẩy và moment lực", grade: 8, subject: { id: "khtn", name: "KHTN" }, labId: "lever-equilibrium" }], labs: [], classLabs: [] } }));
  await page.route("**/api/classes/class-1/assignments", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [] });
    writes.push({ path: "assignments", body: route.request().postDataJSON() });
    return route.fulfill({ json: { message: "Đã giao cho 3 học sinh." } });
  });
  await page.route("**/api/classes/class-1/resources", (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: [] });
    writes.push({ path: "resources", body: route.request().postDataJSON() });
    return route.fulfill({ json: { id: "res-1" } });
  });
  await page.route("**/api/classes/class-1/resources/res-1/publish", (route) => { writes.push({ path: "publish", body: null }); return route.fulfill({ json: { id: "res-1" } }); });

  await openExploreAssign(page);
  const dialog = page.getByRole("dialog", { name: "Giao bài Explore" });
  await expect(dialog.getByText("Làm thanh đòn cân bằng")).toBeVisible();
  const weights = dialog.getByRole("group", { name: "Bộ quả nặng cho học sinh" });
  await expect(weights.locator("img")).toHaveCount(2);
  await expect(weights).toContainText("0,5 N · 1,0 N · 2,0 N");
  const assign = dialog.getByRole("button", { name: "Lưu và giao bài" });

  // 0.5 N at 250 mm cannot be levelled with 1 N weights alone: the sim refuses it, the same check the server runs.
  await dialog.getByRole("radio", { name: "0,5 N ở bên trái, cách O 250 mm" }).check();
  await dialog.getByRole("radio", { name: "1,0 N", exact: true }).check();
  await dialog.getByRole("radio", { name: /Vì sao thanh nằm ngang/ }).check();
  await expect(dialog.getByRole("alert")).toContainText("cannot be levelled");
  await expect(assign).toBeDisabled();
  // With the gauge it can.
  await dialog.getByRole("checkbox", { name: "Cho dùng lực kế" }).check();
  await expect(dialog.getByTestId("explore-preview")).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Cho dùng lực kế" }).uncheck();

  await dialog.getByRole("radio", { name: "2 N ở bên trái, cách O 200 mm" }).check();
  await dialog.getByRole("checkbox", { name: "Hiện bảng moment" }).uncheck();
  const preview = dialog.getByTestId("explore-preview");
  await expect(preview).toContainText("Moment bên trái khi thanh cân bằng");
  await expect(preview).toContainText("Moment bên phải khi thanh cân bằng");
  await expect(preview).toContainText("Một lời giải thích");
  const items = await dialog.getByTestId("explore-preview-items").innerText();
  expect(items).toContain("Thanh đòn");
  expect(items).not.toContain("Lực kế");

  // The preview opens the real bench: the load is fixed, there is no moment table.
  await preview.getByRole("button", { name: "Mở bàn xem trước" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Vào bàn thí nghiệm/ }).click();
  const panel = page.getByRole("complementary", { name: "Bàn cơ" });
  await expect(panel.locator("[data-locked=true]")).toContainText("-200 mm · 2,0 N · cố định");
  await expect(panel.getByTestId("lever-moment-table")).toHaveCount(0);
  await page.getByRole("button", { name: /Quay về/ }).click();
  await expect(dialog).toBeVisible();

  await assign.click();
  await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 3 học sinh." })).toBeVisible();
  expect(writes.map((item) => item.path)).toEqual(["resources", "publish", "assignments"]);
  expect(writes[0].body.content.selection).toEqual({ templateId: "balance-the-lever", loadPresetId: "load-2n-left-200", weightOptionIndex: 1, gauge: false, momentTable: false, promptId: "explain-balance" });
  expect(writes[2].body).toMatchObject({ contentType: "explore_lab", contentId: "lever-equilibrium", exploreResourceId: "res-1" });
});

test("student levels the bar with the load fixed and hands in both moments in N·m", async ({ page }) => {
  const forbidden = await signIn(page, student);
  let submission: any = null;
  const posts: any[] = [];
  const view = () => ({
    id: "a1", title: "Làm thanh đòn cân bằng", contentType: "explore_lab", dueDate: null, createdAt: "2026-11-16T08:00:00.000Z", overdue: false,
    classroom: { id: "class-1", name: "8A", grade: 8, teacher: { fullName: "Cô Lan", username: null } },
    content: { id: "lever-equilibrium", title: "Moment lực và đòn bẩy", subject: { id: "khtn", name: "KHTN" }, grade: 8, topic: "Đòn bẩy" },
    explore: { snapshot: { title: "Làm thanh đòn cân bằng", labId: "lever-equilibrium", activity, instructions: "", requirements, effectiveConfig, effectiveConfigDigest: "e".repeat(64) }, submission },
  });
  await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: view() }));
  await page.route("**/api/assignments/a1/explore-submissions", (route) => {
    posts.push(route.request().postDataJSON());
    submission = { id: "sub-1", answers: route.request().postDataJSON(), status: "SUBMITTED", submittedAt: "2026-11-16T09:00:00.000Z", feedback: null, reviewedAt: null, late: false, canResubmit: true };
    return route.fulfill({ json: { submission, replayed: false } });
  });

  await page.goto("/assignments/a1");
  const detail = page.getByTestId("assigned-explore");
  await expect(detail).toContainText("Moment bên trái khi thanh cân bằng");
  await page.getByRole("link", { name: "Mở bàn thí nghiệm" }).click();
  await expect(page).toHaveURL(/\/labs\/lever-equilibrium\?assignmentId=a1&explore=1/);
  await page.getByRole("dialog").getByRole("button", { name: /Vào bàn thí nghiệm/ }).click();

  const panel = page.getByRole("complementary", { name: "Bàn cơ" });
  await expect(panel.locator("[data-locked=true]")).toHaveCount(1);
  await expect(panel.getByLabel("Loại dụng cụ")).toHaveCount(0);
  // 2 N at -200 mm is levelled by 1 N at 250 mm and 1 N at 150 mm.
  await panel.getByLabel("Vị trí (mm)").selectOption("250");
  await panel.getByRole("button", { name: "Gắn vào thanh" }).click();
  await panel.getByLabel("Vị trí (mm)").selectOption("150");
  await panel.getByRole("button", { name: "Gắn vào thanh" }).click();
  await expect(page.locator(".k5-observation")).toContainText("ngang");
  await expect(panel.getByTestId("lever-moment-table")).toHaveCount(0);

  const task = page.getByTestId("explore-task");
  await task.getByLabel(/Moment bên trái/).fill("0,4");
  await task.getByLabel(/Moment bên phải/).fill("0,4005");
  await task.getByLabel("Lời giải thích của em").fill("Moment hai bên bằng nhau nên thanh nằm ngang.");
  await task.getByRole("button", { name: "Nộp bài" }).click();
  await expect(task.getByText("Nhập số N·m từ 0 đến 100", { exact: false })).toHaveCount(1);
  await task.getByLabel(/Moment bên phải/).fill("0.400");
  await task.getByRole("button", { name: "Nộp bài" }).click();
  await expect(task.getByTestId("explore-submitted")).toContainText("0,400");
  expect(posts).toEqual([{ measures: [{ itemId: "moment-left", value: 400 }, { itemId: "moment-right", value: 400 }], explanation: "Moment hai bên bằng nhau nên thanh nằm ngang." }]);
  expect(forbidden).toEqual([]);
});

test("teacher reads both moments on the board", async ({ page }) => {
  await signIn(page, teacher);
  await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
  await page.route("**/api/classes/class-1/assignments", (route) => route.fulfill({ json: [
    { id: "a1", title: "Làm thanh đòn cân bằng", contentId: "lever-equilibrium", contentType: "explore_lab", dueDate: null, overdue: false, audience: "CLASS", status: "ACTIVE", recipientCount: 1, explore: { resourceId: "res-1", version: 1, templateId: "balance-the-lever" } },
  ] }));
  await page.route("**/api/classes/class-1/assignments/a1/explore-submissions", (route) => route.fulfill({ json: {
    assignment: { id: "a1", title: "Làm thanh đòn cân bằng", dueDate: null, requirements, instructions: "", effectiveConfig },
    submissions: [{ id: "sub-1", assignmentId: "a1", answers: { measures: [{ itemId: "moment-left", value: 400 }, { itemId: "moment-right", value: 400 }], explanation: "Hai bên bằng nhau." }, status: "SUBMITTED", submittedAt: "2026-11-16T09:00:00.000Z", feedback: null, reviewedAt: null, late: false, canResubmit: true, student: { id: "student-1", fullName: "An", username: "an" } }],
    pending: [],
  } }));
  await page.goto("/classes/class-1?tab=work");
  await page.getByRole("button", { name: "Xem bài nộp" }).click();
  const board = page.getByTestId("explore-board");
  await expect(board).toContainText("Moment bên trái khi thanh cân bằng");
  const card = board.getByTestId("explore-submission");
  await expect(card).toContainText("Moment bên trái khi thanh cân bằng: 0,400");
  await expect(card).toContainText("Moment bên phải khi thanh cân bằng: 0,400");
});
