import { expect, test, type Page } from "@playwright/test";
import { fl13Config } from "../src/features/labs/chemistry/wet-bench/labs/fl-13.config";

// The Class Lab page is the one place a teacher gives and manages lab work: an Explore lab or a Guided lab. Mocked API, no Supabase.
const teacher = { id: "teacher-1", username: null, email: "teacher@example.test", fullName: "Cô Lan", role: "TEACHER", grade: null, mustChangePassword: false };
const base = { joinCode: { enabled: false, issued: false, rotatedAt: null }, requiresApproval: false, members: { approved: 3, pending: 0, removed: 0 }, assignments: { active: 0, archived: 0 } };
const classroom = { ...base, id: "class-1", name: "8A", grade: 8, status: "ACTIVE" };
const otherClass = { ...base, id: "class-2", name: "8B", grade: 8, status: "ACTIVE" };
const activity = { id: "pav-fl13-v3", key: "acid-base-indicators-explore", version: 3, digest: "d" };
const labRow = { id: "acid-base-indicators", title: "Acid – base, chỉ thị và pH", mode: "explore", explore: { ok: true, kit: "k2-wet-bench@1", engine: "wet-bench@1.0.0", activity, config: fl13Config } };
const secondLabRow = { ...labRow, id: "acid-base-copy", title: "Acid – base (bản 2)", explore: {
  ...labRow.explore, config: { ...fl13Config, labId: "acid-base-copy" },
} };

const exploreWork = (over: Record<string, unknown> = {}) => ({
  id: "a1", title: "Đo pH hai mẫu", contentId: "acid-base-indicators", contentType: "explore_lab", dueDate: null, overdue: false, audience: "CLASS", status: "ACTIVE", recipientCount: 3,
  explore: { resourceId: "res-1", version: 1, templateId: "ph-compare-two-samples", requirementCount: 3 }, ...over,
});
const guidedWork = (over: Record<string, unknown> = {}) => ({
  id: "g1", title: "Mạch điện", contentId: "circuit", contentType: "lab", dueDate: null, overdue: false, audience: "CLASS", status: "ACTIVE", recipientCount: 3, ...over,
});

async function signIn(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: teacher, accessToken: "mock" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...teacher, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
}

/** Classes by status, and the assignments of each class from a list the test can change while the page is open. */
async function mockClasses(page: Page, classes: Array<typeof classroom>, assignments: Record<string, any[]>) {
  await page.route("**/api/classes?status=*", (route) => route.fulfill({ json: route.request().url().includes("status=ARCHIVED") ? [] : classes }));
  for (const item of classes) {
    await page.route(`**/api/classes/${item.id}/assignments`, (route) => route.request().method() === "GET" ? route.fulfill({ json: assignments[item.id] ?? [] }) : route.fallback());
    await page.route(`**/api/classes/${item.id}/assignable-content`, (route) => route.fulfill({ json: { lessons: [{ id: `lesson-${item.id}`, title: `Bài của lớp ${item.name}`, grade: 8, subject: { id: "khtn", name: "KHTN" }, labId: "acid-base-indicators" }], labs: [], classLabs: [] } }));
  }
}

test.describe("Class Lab is the one place to assign and manage lab work", () => {
  test("an Explore lab assigned here shows in the list at once; its board opens and takes a comment", async ({ page }) => {
    await signIn(page);
    const assignments: Record<string, any[]> = { "class-1": [] };
    await mockClasses(page, [classroom], assignments);
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    await page.route("**/api/classes/class-1/resources", (route) => route.request().method() === "POST" ? route.fulfill({ json: { id: "res-1" } }) : route.fulfill({ json: [] }));
    await page.route("**/api/classes/class-1/resources/res-1/publish", (route) => route.fulfill({ json: { id: "res-1" } }));
    await page.route("**/api/classes/class-1/assignments", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: assignments["class-1"] });
      const body = route.request().postDataJSON();
      assignments["class-1"] = [exploreWork({ title: body.title })];
      return route.fulfill({ json: { message: "Đã giao cho 3 học sinh." } });
    });

    await page.goto("/class-labs");
    await expect(page.getByText("Chưa có bài lab nào được giao.")).toBeVisible();
    await page.getByRole("button", { name: "Giao lab", exact: true }).click();
    await page.getByRole("dialog", { name: "Giao lab cho 8A" }).getByRole("button", { name: "Khám phá tự do" }).click();
    const dialog = page.getByRole("dialog", { name: "Giao bài Explore" });
    await expect(dialog.locator("label").filter({ has: page.getByRole("checkbox", { name: /HCl 0,1 M/ }) }).locator("img"))
      .toHaveAttribute("src", /reagent-HCl_0_1M/);
    await dialog.getByRole("checkbox", { name: /HCl 0,1 M/ }).check();
    await dialog.getByRole("checkbox", { name: /NaOH 0,1 M/ }).check();
    await dialog.getByRole("radio", { name: /đo hai mẫu/ }).check();
    await dialog.getByLabel("Tên bài giao").fill("Đo pH hai mẫu");
    await dialog.getByRole("button", { name: "Lưu và giao bài" }).click();

    // No reload: the notice and the new row are both on the page, and the empty state is gone.
    await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 3 học sinh." })).toBeVisible();
    const row = page.locator(".teacher-class-lab-row", { hasText: "Đo pH hai mẫu" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Thí nghiệm tự do");
    await expect(page.getByText("Chưa có bài lab nào được giao.")).toHaveCount(0);

    // The same row opens its submissions board and a comment becomes the review.
    let status: "SUBMITTED" | "REVIEWED" = "SUBMITTED";
    const puts: any[] = [];
    await page.route("**/api/classes/class-1/assignments/a1/explore-submissions", (route) => route.fulfill({ json: {
      assignment: { id: "a1", title: "Đo pH hai mẫu", dueDate: null, requirements: [{ kind: "measure", itemId: "HCl_0_1M", measurement: "ph_meter", unit: "tenthsPh" }, { kind: "explain" }], instructions: "" },
      submissions: [{ id: "sub-1", assignmentId: "a1", answers: { measures: [{ itemId: "HCl_0_1M", tenthsPh: 10 }], explanation: "HCl phân li hoàn toàn." }, status, submittedAt: "2026-11-15T09:00:00.000Z", feedback: null, reviewedAt: null, late: false, canResubmit: false, student: { id: "student-1", fullName: "An", username: "an" } }],
      pending: [],
    } }));
    await page.route("**/api/classes/class-1/assignments/a1/explore-submissions/sub-1/review", (route) => {
      puts.push(route.request().postDataJSON());
      status = "REVIEWED";
      return route.fulfill({ json: { submission: { id: "sub-1", status, feedback: puts[0].feedback } } });
    });
    await row.getByRole("button", { name: "Xem bài nộp" }).click();
    const board = page.getByTestId("explore-board");
    const card = board.getByTestId("explore-submission");
    await expect(card).toContainText("HCl phân li hoàn toàn.");
    await card.getByLabel("Nhận xét").fill("Đúng hướng.");
    await card.getByRole("button", { name: "Gửi nhận xét" }).click();
    await expect(card.getByTestId("explore-submission-status")).toHaveText("Đã nhận xét");
    expect(puts).toEqual([{ feedback: "Đúng hướng." }]);
  });

  test("the due date can still be edited and the lab archived from the Class Lab page", async ({ page }) => {
    await signIn(page);
    let work = exploreWork();
    const calls: Array<{ method: string; url: string; body: any }> = [];
    await mockClasses(page, [classroom], {});
    await page.route("**/api/classes/class-1/assignments", (route) => route.request().method() === "GET" ? route.fulfill({ json: [work] }) : route.fallback());
    await page.route("**/api/classes/class-1/assignments/a1", (route) => {
      calls.push({ method: route.request().method(), url: route.request().url(), body: route.request().postDataJSON() });
      work = { ...work, ...route.request().postDataJSON() };
      return route.fulfill({ json: work });
    });
    await page.route("**/api/classes/class-1/assignments/a1/archive", (route) => {
      calls.push({ method: route.request().method(), url: route.request().url(), body: route.request().postDataJSON() });
      work = { ...work, status: "ARCHIVED" };
      return route.fulfill({ json: work });
    });

    await page.goto("/class-labs");
    const row = page.locator(".teacher-class-lab-row", { hasText: "Đo pH hai mẫu" });
    await row.getByRole("button", { name: "Sửa", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Sửa bài đã giao" });
    await edit.getByLabel("Hạn nộp (có thể để trống)").fill("2030-01-15T08:30");
    await edit.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(edit).toHaveCount(0);
    const put = calls.find((call) => call.method === "PUT")!;
    expect(put.url).toContain("/classes/class-1/assignments/a1");
    expect(put.body.title).toBe("Đo pH hai mẫu");
    expect(new Date(put.body.dueDate).getFullYear()).toBe(2030);
    await expect(row).toContainText("2030");

    await row.getByRole("button", { name: "Lưu trữ", exact: true }).click();
    await page.getByRole("dialog", { name: "Xác nhận thao tác" }).getByRole("button", { name: "Xác nhận" }).click();
    await expect(page.locator(".teacher-class-lab-row")).toHaveCount(0);
    expect(calls.at(-1)).toMatchObject({ method: "POST", body: { confirm: true } });
    expect(calls.at(-1)!.url).toContain("/classes/class-1/assignments/a1/archive");
  });

  test("a Guided lab is assigned without leaving Class Lab, and the old link lands in the same flow with the lab kept", async ({ page }) => {
    await signIn(page);
    await mockClasses(page, [classroom], { "class-1": [guidedWork()] });
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    const subject = { id: "khtn", name: "KHTN" };
    const lesson = { id: "lesson-circuit", title: "Mạch điện", grade: 8, subject };
    let work = [guidedWork()];
    await page.route("**/api/classes/class-1/resources", (route) => route.fulfill({ json: route.request().method() === "POST" ? { id: "guided-resource" } : [] }));
    await page.route("**/api/classes/class-1/resources/guided-resource/publish", (route) => route.fulfill({ json: { id: "guided-resource" } }));
    await page.route("**/api/classes/class-1/assignments", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: work });
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ contentType: "lab", contentId: "circuit", classLabResourceId: "guided-resource" });
      work = [...work, guidedWork({ id: "g2", title: body.title })];
      return route.fulfill({ json: { message: "Đã giao cho 3 học sinh." } });
    });
    await page.route("**/api/classes/class-1/assignable-content", (route) => route.fulfill({ json: { lessons: [lesson], classLabs: [], labs: [
      { id: "circuit", title: "Mạch điện", grade: 8, subject, lessonIds: [lesson.id], release: { id: "rel-1", version: 1, digest: "d".repeat(64) }, challenges: [{ id: "ch-1", objective: "Thắp sáng bóng đèn" }] },
    ] } }));
    await page.goto("/class-labs");
    const row = page.locator(".teacher-class-lab-row", { hasText: "Mạch điện" });
    await expect(row).not.toContainText("Thí nghiệm tự do");
    await expect(row.getByRole("link", { name: "Xem Lab nguồn" })).toHaveAttribute("href", "/labs/circuit");
    // Edit and archive are there for a Guided lab too.
    await expect(row.getByRole("button", { name: "Sửa", exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Lưu trữ", exact: true })).toBeVisible();

    // Chooser -> Guided form, still on the Class Lab page, lab-only (no lesson or test types).
    await page.getByRole("button", { name: "Giao lab", exact: true }).click();
    await page.getByRole("dialog", { name: "Giao lab cho 8A" }).getByRole("button", { name: "Có hướng dẫn" }).click();
    const dialog = page.getByRole("dialog", { name: "Giao lab theo bước" });
    await expect(page).toHaveURL(/\/class-labs$/);
    await expect(dialog.getByRole("radio", { name: "Bài kiểm tra" })).toHaveCount(0);
    await dialog.getByLabel("Nội dung đã xuất bản").selectOption("circuit");
    await dialog.getByRole("button", { name: "Mở phòng thí nghiệm để giao bài" }).click();
    await expect(page).toHaveURL(/\/labs\/circuit\?classId=class-1&customize=1/);
    await page.getByLabel("Tên đề bài", { exact: true }).fill("Mạch điện lớp 8A");
    await page.getByLabel("Bài học liên kết").selectOption(lesson.id);
    await page.getByRole("button", { name: "Lưu và giao bài cho lớp" }).click();
    await expect(page).toHaveURL(/\/class-labs$/);
    await expect(page.getByRole("region", { name: "8A" }).getByRole("heading", { name: "Mạch điện lớp 8A" })).toBeVisible();

    // "Tạo đề bài riêng" on a row opens the same form with that lab already chosen.
    const link = row.filter({ has: page.getByRole("heading", { name: "Mạch điện", exact: true }) }).getByRole("link", { name: "Tạo đề bài riêng" });
    await expect(link).toHaveAttribute("href", "/class-labs?classId=class-1&assign=guided&labId=circuit");
    await link.click();
    await expect(page.getByRole("dialog", { name: "Giao lab theo bước" }).getByLabel("Nội dung đã xuất bản")).toHaveValue("circuit");

    // The old Assign-tab link goes to the same place and keeps the lab.
    await page.goto("/classes/class-1?tab=work&assign=lab&labId=circuit");
    await expect(page).toHaveURL(/\/class-labs$/);
    await expect(page.getByRole("dialog", { name: "Giao lab theo bước" }).getByLabel("Nội dung đã xuất bản")).toHaveValue("circuit");
  });

  test("the Archived tab lists archived Explore labs, and says so only when there are none", async ({ page }) => {
    await signIn(page);
    const assignments: Record<string, any[]> = { "class-1": [exploreWork({ status: "ARCHIVED", title: "Bài Explore cũ" }), exploreWork({ id: "a2", title: "Bài đang giao" })] };
    await mockClasses(page, [classroom], assignments);
    await page.goto("/class-labs?view=archived");
    await expect(page.locator(".teacher-class-lab-row", { hasText: "Bài Explore cũ" })).toBeVisible();
    await expect(page.locator(".teacher-class-lab-row", { hasText: "Bài đang giao" })).toHaveCount(0);
    await expect(page.getByText("Chưa có bài lab lưu trữ.")).toHaveCount(0);
    // Archived work is only read here: no edit, no archive.
    await expect(page.getByRole("button", { name: "Sửa", exact: true })).toHaveCount(0);

    assignments["class-1"] = [exploreWork({ id: "a2", title: "Bài đang giao" })];
    await page.goto("/class-labs?view=archived");
    await expect(page.getByText("Chưa có bài lab lưu trữ.")).toBeVisible();
  });

  test("the class's Assign tab sends the teacher to Class Lab for that same class", async ({ page }) => {
    await signIn(page);
    await mockClasses(page, [classroom, otherClass], {});
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    await page.goto("/classes/class-2?tab=work");
    await page.getByRole("link", { name: "Giao lab ở Class Lab" }).click();
    await expect(page).toHaveURL(/\/class-labs$/);
    await expect(page.getByRole("dialog", { name: "Giao lab cho 8B" })).toBeVisible();
  });

  test("a deep link names the class: ?assign=explore opens the Explore flow for that class only", async ({ page }) => {
    await signIn(page);
    await mockClasses(page, [classroom, otherClass], {});
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow] }));
    await page.goto("/class-labs?classId=class-2&assign=explore");
    const dialog = page.getByRole("dialog", { name: "Giao bài Explore" });
    await expect(dialog).toBeVisible();
    // The lessons it offers are the ones of class 8B, so the flow is bound to the class the link names.
    const lessons = dialog.getByLabel("Bài học liên quan");
    await expect(lessons).toContainText("Bài của lớp 8B");
    await expect(lessons).not.toContainText("Bài của lớp 8A");
    await expect(page).toHaveURL(/\/class-labs$/);
  });

  test("with several Explore labs the teacher picks by card; every card shows its name, with a picture when there is one", async ({ page }) => {
    await signIn(page);
    await mockClasses(page, [classroom], {});
    await page.route("**/api/labs", (route) => route.fulfill({ json: [labRow, secondLabRow] }));
    await page.goto("/class-labs?classId=class-1&assign=explore");
    const picker = page.getByTestId("explore-lab-picker");
    await expect(picker.getByRole("radio", { name: labRow.title })).toBeChecked();
    await expect(picker.getByRole("radio", { name: secondLabRow.title })).not.toBeChecked();
    // The lab with a thumbnail shows it; the one without still shows its name and a fallback picture.
    await expect(picker.locator("label", { hasText: labRow.title }).locator("img")).toHaveCount(1);
    await expect(picker.locator("label", { hasText: secondLabRow.title }).locator("img")).toHaveCount(0);
    await picker.getByRole("radio", { name: secondLabRow.title }).check();
    await expect(picker.getByRole("radio", { name: secondLabRow.title })).toBeChecked();
    await expect(page.getByLabel("Bài học liên quan")).toHaveValue("");
    await expect(page.getByLabel("Bài học liên quan").locator('optgroup[label="Bài học cùng khối"]')).toContainText("Bài của lớp 8A");
  });
});
