import { expect, test, type Page } from "@playwright/test";
import { fl13Config } from "../src/features/labs/chemistry/wet-bench/labs/fl-13.config";

// P0 C3 Class Explore (pilot K2 step C): teacher picks inside the template and assigns, a student measures and submits, the teacher comments.
const teacher = { id: "teacher-1", username: null, email: "teacher@example.test", fullName: "Cô Lan", role: "TEACHER", grade: null, mustChangePassword: false };
const student = { id: "student-1", username: "student.active", email: null, fullName: "An", role: "STUDENT", grade: 8, mustChangePassword: false };
const classroom = { id: "class-1", name: "8A", grade: 8, status: "ACTIVE", requiresApproval: false, joinCode: { enabled: false, issued: false, rotatedAt: null }, members: { approved: 3, pending: 0, removed: 0 }, assignments: { active: 0, archived: 0 } };
const activity = { id: "pav-fl13-v3", key: "acid-base-indicators-explore", version: 3, digest: "d" };
const labRow = { id: "acid-base-indicators", title: "Acid – base, chỉ thị và pH", mode: "explore", explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity, config: fl13Config } };
const labWithoutTemplates = { ...labRow, explore: { ...labRow.explore, config: { ...fl13Config, classTemplates: undefined } } };

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
  await page.getByRole("dialog", { name: "Giao lab cho 8A" }).getByRole("button", { name: "Khám phá tự do" }).click();
}

test.describe("teacher assigns a Class Explore lab", () => {
  test("picks two samples and a question inside the template, previews the bench, saves and assigns", async ({ page }) => {
    await signIn(page, teacher);
    const writes: Array<{ path: string; body: any; key: string | undefined }> = [];
    await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { classGrade: 8, lessons: [
      { id: "lesson-9", title: "Bài khác", grade: 8, subject: { id: "khtn", name: "KHTN" }, labId: null }, { id: "lesson-ph", title: "Acid, base và thang pH", grade: 8, subject: { id: "khtn", name: "KHTN" }, labId: "acid-base-indicators" }], labs: [], classLabs: [] } }));
    await page.route("**/api/classes/class-1/assignments", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: [] });
      writes.push({ path: "assignments", body: route.request().postDataJSON(), key: route.request().headers()["idempotency-key"] });
      return route.fulfill({ json: { assignment: { id: "a1" }, recipientCount: 3, message: "Đã giao cho 3 học sinh." } });
    });
    await page.route("**/api/classes/class-1/resources", (route) => {
      if (route.request().method() !== "POST") return route.fulfill({ json: [] });
      writes.push({ path: "resources", body: route.request().postDataJSON(), key: route.request().headers()["idempotency-key"] });
      return route.fulfill({ json: { id: "res-1", duplicateWarnings: [] } });
    });
    await page.route("**/api/classes/class-1/resources/res-1/publish", (route) => { writes.push({ path: "publish", body: route.request().postDataJSON(), key: route.request().headers()["idempotency-key"] }); return route.fulfill({ json: { id: "res-1", status: "PUBLISHED" } }); });

    await openExploreAssign(page);
    const dialog = page.getByRole("dialog", { name: "Giao bài Explore" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("explore-lab-picker").getByRole("radio")).toBeChecked();
    await expect(dialog.getByRole("region", { name: "Tùy chọn trong mẫu" }).getByRole("checkbox")).toHaveCount(6);
    await expect(dialog.getByLabel("Bài học liên quan")).toHaveValue("lesson-ph");
    const assign = dialog.getByRole("button", { name: "Lưu và giao bài" });
    await expect(assign).toBeDisabled();

    // Exactly two samples: a third cannot be ticked.
    await dialog.getByRole("checkbox", { name: /HCl 0,1 M/ }).check();
    await expect(dialog.getByText("Chọn đúng 2 (đã chọn 1)")).toBeVisible();
    // The question that names HCl and CH₃COOH is closed until exactly those two are picked.
    const strongVsWeak = dialog.getByRole("radio", { name: /so sánh HCl 0,1 M/ });
    await dialog.getByRole("checkbox", { name: /NaOH 0,1 M/ }).check();
    await expect(strongVsWeak).toBeDisabled();
    await dialog.getByRole("checkbox", { name: /NaOH 0,1 M/ }).uncheck();
    await dialog.getByRole("checkbox", { name: /CH₃COOH 0,1 M/ }).check();
    await expect(strongVsWeak).toBeEnabled();
    await expect(dialog.getByRole("checkbox", { name: /H₂SO₄/ })).toBeDisabled();
    await strongVsWeak.check();

    const preview = dialog.getByTestId("explore-preview");
    await expect(preview).toContainText("Số đo pH của Dung dịch HCl 0,1 M");
    await expect(preview).toContainText("Một lời giải thích");
    const items = await dialog.getByTestId("explore-preview-items").innerText();
    expect(items).toContain("Bút đo pH");
    expect(items).toContain("HCl 0,1 M");
    expect(items).toContain("CH₃COOH 0,1 M");
    for (const left of ["NaOH", "H₂SO₄", "Giấy quỳ tím", "Cốc 100 mL"]) expect(items, left).not.toContain(left);

    // The preview opens the real bench with the derived config; leaving it returns to the form.
    await preview.getByRole("button", { name: "Mở bàn xem trước" }).click();
    await expect(page.getByTestId("lab-space")).toBeVisible();
    await page.getByRole("button", { name: /Quay về/ }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Lời dặn cho học sinh (không bắt buộc)").fill("Làm theo nhóm hai bạn.");
    await expect(assign).toBeEnabled();
    await assign.click();
    await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 3 học sinh." })).toBeVisible();

    expect(writes.map((item) => item.path)).toEqual(["resources", "publish", "assignments"]);
    const [resource, , assignment] = writes;
    expect(resource.body).toMatchObject({
      kind: "EXPLORE_LAB", lessonId: "lesson-ph",
      content: { source: { labId: "acid-base-indicators" }, instructions: "Làm theo nhóm hai bạn.",
        selection: { templateId: "ph-compare-two-samples", reagents: { samples: ["HCl_0_1M", "CH3COOH_0_1M"] }, promptId: "strong-vs-weak" } },
    });
    expect(assignment.body).toMatchObject({ contentType: "explore_lab", contentId: "acid-base-indicators", exploreResourceId: "res-1", audience: "CLASS", studentIds: [], dueDate: null });
    // The server derives again; the client sends ids only, never the effective config.
    expect(JSON.stringify(resource.body)).not.toContain("enabledApparatus");
    expect(new Set(writes.map((item) => item.key)).size).toBe(3);
  });

  test("a retry after a failed assignment reuses the saved resource instead of creating another", async ({ page }) => {
    await signIn(page, teacher);
    let resources = 0, publishes = 0, assigns = 0;
    await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { lessons: [{ id: "lesson-ph", title: "Acid", grade: 8, subject: { id: "khtn", name: "KHTN" }, labId: "acid-base-indicators" }], labs: [], classLabs: [] } }));
    await page.route("**/api/classes/class-1/assignments", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: [] });
      assigns++;
      return assigns === 1 ? route.fulfill({ status: 409, json: { statusCode: 409, code: "EXPLORE_SOURCE_CHANGED", message: "Lab nguồn đã có phiên bản mới" } }) : route.fulfill({ json: { message: "Đã giao cho 3 học sinh." } });
    });
    await page.route("**/api/classes/class-1/resources", (route) => { if (route.request().method() !== "POST") return route.fulfill({ json: [] }); resources++; return route.fulfill({ json: { id: "res-1" } }); });
    await page.route("**/api/classes/class-1/resources/res-1/publish", (route) => { publishes++; return route.fulfill({ json: { id: "res-1" } }); });
    await openExploreAssign(page);
    const dialog = page.getByRole("dialog", { name: "Giao bài Explore" });
    await dialog.getByRole("checkbox", { name: /HCl 0,1 M/ }).check();
    await dialog.getByRole("checkbox", { name: /NaOH 0,1 M/ }).check();
    await dialog.getByRole("radio", { name: /đo hai mẫu/ }).check();
    await dialog.getByRole("button", { name: "Lưu và giao bài" }).click();
    await expect(dialog.getByRole("alert")).toContainText("EXPLORE_SOURCE_CHANGED");
    await expect(dialog.getByRole("alert")).toContainText("không tạo bản mới");
    await dialog.getByRole("button", { name: "Lưu và giao bài" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 3 học sinh." })).toBeVisible();
    expect({ resources, publishes, assigns }).toEqual({ resources: 1, publishes: 1, assigns: 2 });
  });

  test("says so when no Explore lab has a class template yet", async ({ page }) => {
    await signIn(page, teacher);
    await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labWithoutTemplates] }));
    await page.route("**/api/classes/class-1/assignments", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { lessons: [], labs: [], classLabs: [] } }));
    await openExploreAssign(page);
    await expect(page.getByTestId("explore-none")).toContainText("Chưa có Lab Explore nào có mẫu cho lớp");
  });
});

/** What the server's derive gives for HCl + CH₃COOH with the strong-vs-weak question, built by hand for the student page. */
function effectiveConfig() {
  const { classTemplates: _gone, ...rest } = fl13Config as any;
  const keep = ["rack", "T1", "T2", "dropper", "waste", "meter"];
  return {
    ...rest,
    enabledApparatus: fl13Config.enabledApparatus.filter((item) => keep.includes(item.id)),
    availableReagents: [{ reagentId: "HCl_0_1M", shelfPosition: 1 }, { reagentId: "CH3COOH_0_1M", shelfPosition: 2 }],
    measurements: ["ph_meter"],
    pedagogy: { ...fl13Config.pedagogy, observationPrompts: fl13Config.pedagogy.observationPrompts!.filter((prompt) => prompt.id === "strong-vs-weak") },
  };
}
const requirements = [
  { kind: "measure", itemId: "HCl_0_1M", measurement: "ph_meter", unit: "tenthsPh" },
  { kind: "measure", itemId: "CH3COOH_0_1M", measurement: "ph_meter", unit: "tenthsPh" },
  { kind: "explain" },
];
const assignmentView = (submission: any = null, over: Record<string, unknown> = {}) => ({
  id: "a1", title: "Đo pH hai mẫu", contentType: "explore_lab", dueDate: null, createdAt: "2026-11-15T08:00:00.000Z", overdue: false, ...over,
  classroom: { id: "class-1", name: "8A", grade: 8, teacher: { fullName: "Cô Lan", username: null } },
  content: { id: "acid-base-indicators", title: "Acid – base, chỉ thị và pH", subject: { id: "khtn", name: "KHTN" }, grade: 8, topic: "Thang pH" },
  explore: { snapshot: { title: "Đo pH hai mẫu", labId: "acid-base-indicators", activity, instructions: "Làm theo nhóm hai bạn.", requirements, effectiveConfig: effectiveConfig(), effectiveConfigDigest: "e".repeat(64) }, submission },
});

test.describe("student does a Class Explore assignment", () => {
  test("opens the pinned bench, checks the readings, submits, can edit and submit again, each with its own idempotency key", async ({ page }) => {
    const forbidden = await signIn(page, student);
    let submission: any = null;
    const posts: Array<{ body: any; key: string | undefined }> = [];
    await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: assignmentView(submission) }));
    await page.route("**/api/assignments/a1/explore-submissions", (route) => {
      posts.push({ body: route.request().postDataJSON(), key: route.request().headers()["idempotency-key"] });
      submission = { id: "sub-1", answers: route.request().postDataJSON(), status: "SUBMITTED", submittedAt: "2026-11-15T09:00:00.000Z", feedback: null, reviewedAt: null, late: false, canResubmit: true };
      return route.fulfill({ json: { submission, replayed: false } });
    });

    await page.goto("/assignments/a1");
    await expect(page.getByTestId("assigned-explore")).toContainText("Đo pH hai mẫu");
    await expect(page.getByTestId("explore-status")).toHaveText("Chưa nộp");
    await page.getByRole("link", { name: "Mở bàn thí nghiệm" }).click();
    await expect(page).toHaveURL(/\/labs\/acid-base-indicators\?assignmentId=a1&explore=1/);

    const intro = page.getByRole("dialog");
    // Only the derived items are on this bench.
    await expect(intro).toContainText("Bút đo pH");
    await expect(intro).toContainText("HCl 0,1 M");
    await expect(intro).not.toContainText("NaOH 0,1 M");
    await expect(intro).not.toContainText("Giấy quỳ tím");
    await intro.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
    await intro.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();

    const task = page.getByTestId("explore-task");
    await expect(task).toBeVisible();
    await expect(task).toContainText("Làm theo nhóm hai bạn.");
    await task.getByRole("button", { name: "Nộp bài" }).click();
    await expect(task.getByRole("alert")).toHaveCount(3);
    await task.getByLabel(/pH của .*HCl/).fill("15");
    await task.getByLabel(/pH của .*CH₃COOH/).fill("2,95");
    await task.getByLabel("Lời giải thích của em").fill("HCl phân li hoàn toàn nên pH nhỏ hơn.");
    await task.getByRole("button", { name: "Nộp bài" }).click();
    await expect(task.getByText("Nhập số từ 0 đến 14, tối đa một chữ số thập phân", { exact: false })).toHaveCount(2);
    expect(posts).toHaveLength(0);

    await task.getByLabel(/pH của .*HCl/).fill("1,0");
    await task.getByLabel(/pH của .*CH₃COOH/).fill("2.9");
    await task.getByRole("button", { name: "Nộp bài" }).click();
    await expect(task.getByTestId("explore-submitted")).toContainText("Em đã nộp bài");
    await expect(task.getByTestId("explore-submitted")).toContainText("1,0");
    await expect(task.getByTestId("explore-submitted")).toContainText("2,9");
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ measures: [{ itemId: "HCl_0_1M", value: 10 }, { itemId: "CH3COOH_0_1M", value: 29 }], explanation: "HCl phân li hoàn toàn nên pH nhỏ hơn." });
    expect(posts[0].key).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    await expect(task.getByRole("button", { name: "Nộp bài" })).toHaveCount(0);

    // Until the due date (here there is none) and before any comment, the student can correct and submit again.
    await expect(task).toContainText("Em có thể sửa và nộp lại");
    await task.getByRole("button", { name: "Sửa và nộp lại" }).click();
    await expect(task.getByLabel(/pH của .*HCl/)).toHaveValue("1,0");
    await expect(task.getByLabel(/pH của .*CH₃COOH/)).toHaveValue("2,9");
    await task.getByLabel("Lời giải thích của em").fill("HCl là acid mạnh, CH₃COOH là acid yếu.");
    await task.getByRole("button", { name: "Nộp lại" }).click();
    await expect(task.getByTestId("explore-submitted")).toContainText("CH₃COOH là acid yếu");
    expect(posts).toHaveLength(2);
    expect(posts[1].body.explanation).toBe("HCl là acid mạnh, CH₃COOH là acid yếu.");
    expect(posts[1].key).not.toBe(posts[0].key);
    expect(forbidden).toEqual([]);
  });

  test("shows the teacher's comment after review", async ({ page }) => {
    await signIn(page, student);
    const reviewed = { id: "sub-1", answers: { measures: [{ itemId: "HCl_0_1M", tenthsPh: 10 }, { itemId: "CH3COOH_0_1M", tenthsPh: 29 }], explanation: "Vì HCl là acid mạnh." }, status: "REVIEWED", submittedAt: "2026-11-15T09:00:00.000Z", feedback: "Đúng hướng. Hãy nêu cả hai số đo.", reviewedAt: "2026-11-15T10:00:00.000Z", late: false, canResubmit: false };
    await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: assignmentView(reviewed) }));
    await page.goto("/assignments/a1");
    await expect(page.getByTestId("explore-status")).toHaveText("Giáo viên đã nhận xét");
    await expect(page.getByTestId("explore-feedback")).toHaveText("Đúng hướng. Hãy nêu cả hai số đo.");
    await expect(page.getByRole("link", { name: "Xem lại bàn thí nghiệm" })).toBeVisible();
    // Work the teacher commented on is not for rewriting.
    await page.goto("/labs/acid-base-indicators?assignmentId=a1&explore=1");
    const intro = page.getByRole("dialog");
    await intro.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
    await intro.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
    await expect(page.getByTestId("explore-task").getByTestId("explore-feedback")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sửa và nộp lại|Nộp lại|Nộp bài/ })).toHaveCount(0);
  });

  test("a refused resubmission shows the reason the server gives", async ({ page }) => {
    await signIn(page, student);
    await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: assignmentView() }));
    await page.route("**/api/assignments/a1/explore-submissions", (route) => route.fulfill({ status: 409, json: { statusCode: 409, code: "EXPLORE_RESUBMIT_CLOSED", message: "Đã quá hạn nộp; em không nộp lại được." } }));
    await page.goto("/labs/acid-base-indicators?assignmentId=a1&explore=1");
    const intro = page.getByRole("dialog");
    await intro.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
    await intro.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
    const task = page.getByTestId("explore-task");
    await task.getByLabel(/pH của .*HCl/).fill("1,0");
    await task.getByLabel(/pH của .*CH₃COOH/).fill("2,9");
    await task.getByLabel("Lời giải thích của em").fill("Khác.");
    await task.getByRole("button", { name: "Nộp bài" }).click();
    await expect(task.getByRole("alert")).toContainText("Đã quá hạn nộp; em không nộp lại được.");
  });

  test("after the due date a first submission is still possible, shows as late, and cannot be resubmitted", async ({ page }) => {
    await signIn(page, student);
    const due = new Date(Date.now() - 3_600_000).toISOString();
    let submission: any = null;
    await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: assignmentView(submission, { dueDate: due, overdue: true }) }));
    await page.route("**/api/assignments/a1/explore-submissions", (route) => {
      submission = { id: "sub-1", answers: route.request().postDataJSON(), status: "SUBMITTED", submittedAt: new Date().toISOString(), feedback: null, reviewedAt: null, late: true, canResubmit: false };
      return route.fulfill({ json: { submission, replayed: false } });
    });
    await page.goto("/labs/acid-base-indicators?assignmentId=a1&explore=1");
    const intro = page.getByRole("dialog");
    await intro.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
    await intro.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
    const task = page.getByTestId("explore-task");
    await expect(task.getByTestId("explore-late-note")).toContainText("sẽ được đánh dấu là nộp trễ");
    await task.getByLabel(/pH của .*HCl/).fill("1,0");
    await task.getByLabel(/pH của .*CH₃COOH/).fill("2,9");
    await task.getByLabel("Lời giải thích của em").fill("Nộp muộn.");
    await task.getByRole("button", { name: "Nộp bài" }).click();
    await expect(task.getByTestId("explore-late")).toHaveText("Nộp trễ");
    await expect(task.getByRole("button", { name: /Sửa và nộp lại|Nộp lại/ })).toHaveCount(0);
  });

  test("a config that fails the bench schema stops the bench and shows the error code", async ({ page }) => {
    await signIn(page, student);
    const broken = assignmentView();
    (broken.explore.snapshot.effectiveConfig as any).kit = "k2-wet-bench@1";
    (broken.explore.snapshot.effectiveConfig as any).enabledApparatus = [];
    await page.route("**/api/assignments/a1", (route) => route.fulfill({ json: broken }));
    await page.goto("/labs/acid-base-indicators?assignmentId=a1&explore=1");
    await expect(page.getByTestId("explore-error")).toContainText("EXPLORE_CONFIG_INVALID");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("teacher reviews Class Explore submissions", () => {
  test("sees what each student handed in and who has not, and sends a comment that becomes the review", async ({ page }) => {
    await signIn(page, teacher);
    let status: "SUBMITTED" | "REVIEWED" = "SUBMITTED";
    let feedback: string | null = null;
    const puts: any[] = [];
    await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: [classroom] }));
    await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { lessons: [], labs: [], classLabs: [] } }));
    await page.route("**/api/classes/class-1/assignments", (route) => route.fulfill({ json: [
      { id: "a1", title: "Đo pH hai mẫu", contentId: "acid-base-indicators", contentType: "explore_lab", dueDate: null, overdue: false, audience: "CLASS", status: "ACTIVE", recipientCount: 2, explore: { resourceId: "res-1", version: 1, templateId: "ph-compare-two-samples", requirementCount: 3 } },
    ] }));
    await page.route("**/api/classes/class-1/assignments/a1/explore-submissions", (route) => route.fulfill({ json: {
      assignment: { id: "a1", title: "Đo pH hai mẫu", dueDate: null, requirements, instructions: "Làm theo nhóm hai bạn." },
      submissions: [{ id: "sub-1", assignmentId: "a1", answers: { measures: [{ itemId: "HCl_0_1M", tenthsPh: 10 }, { itemId: "CH3COOH_0_1M", tenthsPh: 29 }], explanation: "HCl phân li hoàn toàn." }, status, submittedAt: "2026-11-15T09:00:00.000Z", feedback, reviewedAt: null, late: true, canResubmit: false,
        student: { id: "student-1", fullName: "An", username: "an" } }],
      pending: [{ id: "student-2", fullName: "Bình", username: "binh" }],
    } }));
    await page.route("**/api/classes/class-1/assignments/a1/explore-submissions/sub-1/review", (route) => {
      puts.push({ method: route.request().method(), body: route.request().postDataJSON() });
      status = "REVIEWED"; feedback = route.request().postDataJSON().feedback;
      return route.fulfill({ json: { submission: { id: "sub-1", status, feedback } } });
    });

    await page.goto("/class-labs");
    await expect(page.getByText("Thí nghiệm tự do", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Xem bài nộp" }).click();
    const board = page.getByTestId("explore-board");
    await expect(board).toContainText("Số đo pH của Dung dịch HCl 0,1 M");
    const card = board.getByTestId("explore-submission");
    await expect(card).toContainText("An");
    await expect(card).toContainText("1,0");
    await expect(card).toContainText("2,9");
    await expect(card).toContainText("HCl phân li hoàn toàn.");
    await expect(card.getByTestId("explore-submission-status")).toHaveText("Đã nộp");
    await expect(card.getByTestId("explore-late")).toHaveText("Nộp trễ");
    await expect(board.getByTestId("explore-pending")).toHaveText("Bình");
    await expect(card.getByRole("button", { name: "Gửi nhận xét" })).toBeDisabled();

    await card.getByLabel("Nhận xét").fill("Đúng hướng. Hãy nêu cả hai số đo.");
    await card.getByRole("button", { name: "Gửi nhận xét" }).click();
    await expect(card.getByTestId("explore-submission-status")).toHaveText("Đã nhận xét");
    expect(puts).toEqual([{ method: "PUT", body: { feedback: "Đúng hướng. Hãy nêu cả hai số đo." } }]);
    await expect(board).toContainText("Bài Explore không chấm điểm");
  });
});
