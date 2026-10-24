import { test } from "@playwright/test";
import {
  accounts,
  adultLogin,
  adultToken,
  assignTest,
  call,
  cleanupList,
  expect,
  localInput,
  memberId,
  noHorizontalOverflow,
  PILOT_CLASS,
  PILOT_CLASS_NAME,
  publishedTest,
  studentAssignmentRow,
  studentLogin,
} from "./fixtures/live";

// I3 boundaries and edge cases on the real FE/API/database (complements
// i3-assigned-test-live.spec.ts). Test assignments and resources are archived
// afterwards; submissions stay as immutable evidence under the run prefix.
const prefix = "pw-i3e-" + Date.now().toString(36);
const cleanup = cleanupList();
const inDays = (days: number) => new Date(Date.now() + days * 86400000);
let ownerToken = "";

test.beforeAll(async () => {
  test.skip(!accounts.owner.password || !accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_TEACHER_PASSWORD/TEST_STUDENT_PASSWORD)");
  ownerToken = await adultToken(accounts.owner);
});
test.afterAll(async () => cleanup.run());

async function openPilotClass(page: import("@playwright/test").Page) {
  await page.goto("/classes");
  await page.getByRole("button", { name: PILOT_CLASS_NAME }).first().click();
}

test("assign form offers only published tests and requires a due date for a test", async ({ browser }) => {
  const published = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đã xuất bản`, cleanup);
  const draft = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} bản nháp`, cleanup, false);
  const teacher = await adultLogin(browser, accounts.owner);
  await openPilotClass(teacher);
  await teacher.getByRole("button", { name: "Giao bài", exact: true }).click();
  const dialog = teacher.getByRole("dialog", { name: "Giao bài" });
  await expect(dialog.getByLabel("Hạn nộp (không bắt buộc)")).not.toHaveAttribute("required", "");
  await dialog.getByLabel("Bài kiểm tra").check();
  const content = dialog.getByLabel("Nội dung đã xuất bản");
  await expect(content.locator(`option[value="${published}"]`)).toHaveCount(1);
  await expect(content.locator(`option[value="${draft}"]`)).toHaveCount(0);
  await expect(content.locator(`option[value="${published}"]`)).toContainText("2 câu");
  const due = dialog.getByLabel("Hạn nộp (bắt buộc)");
  await expect(due).toHaveAttribute("required", "");
  await content.selectOption(published);
  let posted = false;
  teacher.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(`/classes/${PILOT_CLASS}/assignments`)) posted = true;
  });
  await dialog.getByRole("button", { name: "Giao bài", exact: true }).click();
  await expect(due).toBeFocused();
  expect(posted, "browser validation blocks a test without a due date").toBe(false);
  await dialog.getByLabel("Bài học", { exact: true }).check();
  await expect(dialog.getByLabel("Hạn nộp (không bắt buộc)")).toBeVisible();
});

test("teacher renames an assigned test but its deadline and recipients stay locked", async ({ browser }) => {
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề sửa tên`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const due = inDays(2);
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} tên cũ`, due, [learner.id], cleanup);
  const teacher = await adultLogin(browser, accounts.owner);
  await openPilotClass(teacher);
  const row = teacher.locator(".assignment-row").filter({ hasText: `${prefix} tên cũ` });
  await row.getByRole("button", { name: "Sửa" }).click();
  const dialog = teacher.getByRole("dialog", { name: "Sửa bài đã giao" });
  await expect(dialog.getByText("Hạn nộp và danh sách học sinh của bài kiểm tra được chốt khi giao")).toBeVisible();
  await expect(dialog.getByLabel(/Hạn nộp/)).toHaveCount(0);
  await dialog.getByLabel("Tên nhiệm vụ").fill(`${prefix} tên mới`);
  const saved = teacher.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith(`/assignments/${aid}`));
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect((await saved).status()).toBe(200);
  await expect(teacher.locator(".assignment-row").filter({ hasText: `${prefix} tên mới` })).toContainText("Bài kiểm tra");
  const list = await call(`/classes/${PILOT_CLASS}/assignments`, "GET", undefined, ownerToken);
  const updated = list.data.find((a: any) => a.id === aid);
  expect(new Date(updated.dueDate).getTime()).toBe(due.getTime());
  expect(updated.recipientCount).toBe(1);
  const blocked = await call(`/classes/${PILOT_CLASS}/assignments/${aid}`, "PUT", { dueDate: inDays(5).toISOString() }, ownerToken);
  expect(blocked.data?.code).toBe("TEST_ASSIGNMENT_IMMUTABLE");
});

test("a non-target class member and an outsider student cannot see or open the test", async ({ browser }) => {
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề nhóm`, cleanup);
  const roster = await call(`/classes/${PILOT_CLASS}/students`, "GET", undefined, ownerToken);
  const other = roster.data.find((e: any) => e.status === "approved" && e.student.username !== accounts.student.username);
  test.skip(!other, "class-pilot-a needs a second approved member (seeded student.temp)");
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} chỉ nhóm khác`, inDays(2), [other.studentId], cleanup);

  const member = await studentLogin(browser);
  await member.goto("/assignments");
  await expect(member.getByRole("heading", { name: "Bài tập" })).toBeVisible();
  await expect(member.getByRole("link", { name: new RegExp(`${prefix} chỉ nhóm khác`) })).toHaveCount(0);
  await member.goto(`/assignments/${aid}`);
  await expect(member.getByRole("alert")).toContainText("Không tìm thấy bài được giao");
  await expect(member.getByText("Đơn vị đo điện trở là gì?")).toHaveCount(0);

  test.skip(!accounts.outsiderStudent.password, "Set SEED_FIXTURE_PASSWORD for student.outsider");
  const outsider = await studentLogin(browser, accounts.outsiderStudent);
  await outsider.goto(`/assignments/${aid}`);
  await expect(outsider.getByRole("alert")).toContainText("Không tìm thấy bài được giao");
  await expect(outsider.getByText("Đơn vị đo điện trở là gì?")).toHaveCount(0);
});

test("an outsider teacher sees no foreign class and every I3 teacher endpoint denies them", async ({ browser }) => {
  test.skip(!accounts.outsiderTeacher.password, "Set SEED_FIXTURE_PASSWORD for teacher.outsider");
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề riêng`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} của chủ lớp`, inDays(2), [learner.id], cleanup);
  const outsider = await adultLogin(browser, accounts.outsiderTeacher);
  await outsider.goto("/classes");
  await expect(outsider.getByRole("heading", { name: "Lớp học của tôi" })).toBeVisible();
  await expect(outsider.getByRole("button", { name: PILOT_CLASS_NAME })).toHaveCount(0);
  const token = await adultToken(accounts.outsiderTeacher);
  for (const [path, method, body] of [
    [`/classes/${PILOT_CLASS}/late-queue`, "GET", undefined],
    [`/classes/${PILOT_CLASS}/assignments/${aid}/test-status`, "GET", undefined],
    [`/classes/${PILOT_CLASS}/assignments/${aid}/deadline-revisions`, "POST", { dueAt: inDays(4).toISOString(), expectedRevision: 1 }],
  ] as const) {
    const res = await call(path, method, body, token);
    expect(res.status, path).toBe(403);
    expect(res.data?.code, path).toBe("CLASS_ACCESS_DENIED");
    expect(JSON.stringify(res.data)).not.toContain(learner.fullName);
  }
});

test("student resubmits after an extension: the latest attempt is current and history is kept", async ({ browser }) => {
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề nộp lại`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} nộp lại`, inDays(2), [learner.id], cleanup);
  const page = await studentLogin(browser);
  await page.goto(`/assignments/${aid}`);
  await page.getByRole("radio", { name: "Vôn", exact: true }).check();
  await page.getByRole("radio", { name: "Ampe kế", exact: true }).check();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  const result = page.locator("p", { hasText: "Kết quả hiện tại:" });
  await expect(result).toContainText("50 điểm");

  const revised = await call(`/classes/${PILOT_CLASS}/assignments/${aid}/deadline-revisions`, "POST", { dueAt: inDays(4).toISOString(), expectedRevision: 1, note: "Cho cả lớp thêm thời gian" }, ownerToken);
  expect(revised.status, JSON.stringify(revised.data)).toBe(201);
  await page.reload();
  await expect(page.getByText("Giáo viên đã dời hạn nộp cho cả nhóm")).toBeVisible();
  await page.getByRole("button", { name: "Làm và nộp lại" }).click();
  await page.getByRole("radio", { name: "Ôm", exact: true }).check();
  await page.getByRole("radio", { name: "Ampe kế", exact: true }).check();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(result).toContainText("100 điểm");
  const history = page.getByRole("region", { name: "Lịch sử nộp bài" }).locator("li");
  await expect(history).toHaveCount(2);
  await expect(history.first()).toContainText("hiện tại");
  await expect(history.first()).toContainText("100 điểm");
  await expect(history.nth(1)).toContainText("50 điểm");
});

test("archiving an assigned test removes it from the student queue", async ({ browser }) => {
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề lưu trữ`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const title = `${prefix} sẽ lưu trữ`;
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, title, inDays(2), [learner.id], cleanup);
  const student = await studentLogin(browser);
  await expect(await studentAssignmentRow(student, title)).toBeVisible();

  const teacher = await adultLogin(browser, accounts.owner);
  await openPilotClass(teacher);
  await teacher.locator(".assignment-row").filter({ hasText: title }).getByRole("button", { name: "Lưu trữ" }).click();
  await teacher.getByRole("dialog", { name: "Xác nhận thao tác" }).getByRole("button", { name: "Xác nhận" }).click();
  await expect(teacher.getByRole("dialog", { name: "Xác nhận thao tác" })).toHaveCount(0);

  const reloaded = student.waitForResponse((r) => r.request().method() === "GET" && new URL(r.url()).pathname === "/api/assignments");
  await student.goto("/assignments");
  expect(((await (await reloaded).json()) as any[]).some((row) => row.title === title)).toBe(false);
  await expect(student.getByRole("heading", { name: "Bài tập" })).toBeVisible();
  await student.goto(`/assignments/${aid}`);
  await expect(student.getByRole("alert")).toContainText("Không tìm thấy bài được giao");
});

test("the student never receives the answer key before or after submitting", async ({ browser }) => {
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề bảo mật`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} không lộ đáp án`, inDays(2), [learner.id], cleanup);
  const page = await studentLogin(browser);
  const bodies: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes(`/api/assignments/${aid}`)) bodies.push(await response.text().catch(() => ""));
  });
  await page.goto(`/assignments/${aid}`);
  await expect(page.getByText("Đơn vị đo điện trở là gì?")).toBeVisible();
  await page.getByRole("radio", { name: "Vôn", exact: true }).check();
  await page.getByRole("radio", { name: "Vôn kế", exact: true }).check();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.locator("p", { hasText: "Kết quả hiện tại:" })).toContainText("0 điểm");
  await expect.poll(() => bodies.length).toBeGreaterThanOrEqual(2);
  for (const body of bodies) {
    expect(body).not.toContain("correctOption");
    expect(body).not.toContain("Điện trở đo bằng ôm");
  }
  await expect(page.getByText("Điện trở đo bằng ôm")).toHaveCount(0);
});

test("on a 390 px phone the test page, late-reason form and teacher queue have no horizontal scroll", async ({ browser }) => {
  test.setTimeout(150000);
  const phone = { width: 390, height: 844 };
  const testId = await publishedTest(PILOT_CLASS, ownerToken, `${prefix} đề di động`, cleanup);
  const learner = await memberId(PILOT_CLASS, ownerToken, accounts.student.username);
  const due = new Date(Date.now() + 20000);
  const aid = await assignTest(PILOT_CLASS, ownerToken, testId, `${prefix} di động`, due, [learner.id], cleanup);
  const page = await studentLogin(browser, accounts.student, phone);
  await page.goto(`/assignments/${aid}`);
  await expect(page.getByText("Đơn vị đo điện trở là gì?")).toBeVisible();
  await noHorizontalOverflow(page);
  await page.waitForTimeout(Math.max(0, due.getTime() - Date.now() + 2000));
  await page.reload();
  await page.getByRole("radio", { name: "Ôm", exact: true }).check();
  await page.getByRole("radio", { name: "Ampe kế", exact: true }).check();
  const reason = page.getByLabel("Lý do nộp trễ (bắt buộc)");
  await reason.fill("Em nộp muộn vì mất điện");
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Nộp trễ, chờ giáo viên duyệt");
  await noHorizontalOverflow(page);

  const teacher = await adultLogin(browser, accounts.owner, phone);
  await openPilotClass(teacher);
  const queueItem = teacher.getByRole("region", { name: "Bài nộp trễ chờ duyệt" }).locator(".assignment-row").filter({ hasText: `${prefix} di động` });
  await expect(queueItem).toContainText("Em nộp muộn vì mất điện");
  await noHorizontalOverflow(teacher);
  await queueItem.getByRole("button", { name: "Dời hạn cho cả nhóm" }).click();
  const dialog = teacher.getByRole("dialog", { name: "Dời hạn nộp cho cả nhóm" });
  await dialog.getByLabel("Hạn nộp mới").fill(localInput(inDays(1)));
  await noHorizontalOverflow(teacher);
  await dialog.getByRole("button", { name: "Dời hạn" }).click();
  await expect(queueItem).toHaveCount(0);
});
