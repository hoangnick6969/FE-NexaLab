import { test, type Page } from "@playwright/test";
import { accounts, adultLogin, adultToken, assignTest, call, cleanupList, expect, localInput, mailedToken, publishedTest as createPublishedTest, studentAssignmentRow, studentLogin as loginStudent } from "./fixtures/live";

// Real FE/API/database journey for I3 (Stories 3.1-3.6). Requires a running API
// and web app with a seeded database; identities come from the environment
// (defaults: seeded accounts with SEED_PASSWORD / SEED_FIXTURE_PASSWORD).
// Test assignments and resources are archived afterwards; submissions stay as
// immutable evidence under the run prefix.
const { owner, demoTeacher, parent: parentAccount, student } = accounts;
const seedPassword = process.env.SEED_PASSWORD;
const prefix = "pw-i3-" + Date.now().toString(36);
const cleanup = cleanupList();
const studentLogin = (browser: Parameters<typeof loginStudent>[0]) => loginStudent(browser, student);
const publishedTest = (classId: string, token: string, title: string) => createPublishedTest(classId, token, title, cleanup);
const assignByApi = (classId: string, token: string, testId: string, title: string, dueDate: Date, studentIds: string[] = []) =>
  assignTest(classId, token, testId, title, dueDate, studentIds, cleanup);

async function answerAll(page: Page, picks: string[]) {
  for (const text of picks) await page.getByRole("radio", { name: text, exact: true }).check();
}

test.afterAll(async () => cleanup.run());

test("I3: teacher assigns a test, student submits on time and late, teacher extends and rejects", async ({ browser }) => {
  test.skip(!owner.password || !student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_TEACHER_PASSWORD/TEST_STUDENT_PASSWORD)");
  test.setTimeout(240000);
  const classId = "class-pilot-a";
  const token = await adultToken(owner);
  const testId = await publishedTest(classId, token, `${prefix} đề`);
  const studentRow = (await call(`/classes/${classId}/students`, "GET", undefined, token)).data.find((e: any) => e.student.username === student.username);
  expect(studentRow, "student.active is an approved member of class-pilot-a").toBeTruthy();

  // Two short deadlines expire while the on-time flow runs: one for the extension, one for the rejection.
  const shortDue = new Date(Date.now() + 60000);
  const extendId = await assignByApi(classId, token, testId, `${prefix} trễ-dời-hạn`, shortDue, [studentRow.studentId]);
  // A different instant keeps the active-duplicate rule (same test, targets and due date) from firing.
  const rejectId = await assignByApi(classId, token, testId, `${prefix} trễ-từ-chối`, new Date(shortDue.getTime() + 1000), [studentRow.studentId]);

  // ---------- 3.1 teacher assigns through the UI ----------
  const teacher = await adultLogin(browser, owner);
  await teacher.goto("/classes");
  await teacher.getByRole("button", { name: /Pilot Science 8A/ }).first().click();
  await teacher.getByRole("button", { name: "Giao bài", exact: true }).click();
  const assignDialog = teacher.getByRole("dialog", { name: "Giao bài" });
  await assignDialog.getByLabel("Bài kiểm tra").check();
  await assignDialog.getByLabel("Nội dung đã xuất bản").selectOption(testId);
  await expect(assignDialog.getByText("Chia sẻ bài kiểm tra trong Class Space không tạo bài giao")).toBeVisible();
  await assignDialog.getByLabel("Tên nhiệm vụ (để trống sẽ dùng tên nội dung)").fill(`${prefix} đúng-hạn`);
  await assignDialog.getByLabel("Hạn nộp (bắt buộc)").fill(localInput(new Date(Date.now() + 2 * 86400000)));
  const assigned = teacher.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith(`/classes/${classId}/assignments`));
  await assignDialog.getByRole("button", { name: "Giao bài", exact: true }).click();
  const assignedResponse = await assigned;
  expect(assignedResponse.status()).toBe(201);
  const onTimeId = (await assignedResponse.json()).assignment.id as string;
  cleanup.add(() => call(`/classes/${classId}/assignments/${onTimeId}/archive`, "POST", { reason: "Dọn dữ liệu kiểm thử I3", confirm: true }, token));
  await expect(teacher.getByRole("status").filter({ hasText: /Đã giao cho \d+ học sinh/ })).toBeVisible();

  // ---------- 3.2 / 3.4 student submits on time ----------
  const learner = await studentLogin(browser);
  await learner.goto("/assignments");
  await expect(learner.getByRole("status").filter({ hasText: "sắp đến hạn trong 24 giờ" })).toContainText(`${prefix} trễ-dời-hạn`);
  const onTimeRow = await studentAssignmentRow(learner, `${prefix} đúng-hạn`);
  await expect(onTimeRow).toContainText("Chưa đến hạn");
  await onTimeRow.click();
  await expect(learner.getByRole("heading", { name: `${prefix} đúng-hạn` })).toBeVisible();
  // With no submission yet the form is already open.
  await expect(learner.getByRole("button", { name: "Làm bài" })).toHaveCount(0);
  await answerAll(learner, ["Ôm", "Ampe kế"]);
  await expect(learner.getByLabel("Lý do nộp trễ (bắt buộc)")).toHaveCount(0);
  await learner.getByRole("button", { name: "Nộp bài" }).click();
  await expect(learner.locator("p", { hasText: "Kết quả hiện tại:" })).toContainText("100 điểm");
  await expect(learner.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Đã nộp");
  await expect(learner.getByRole("region", { name: "Lịch sử nộp bài" })).toContainText("Đúng hạn");

  // ---------- 3.2 late submissions need a reason and stay pending ----------
  const wait = shortDue.getTime() - Date.now() + 3000;
  if (wait > 0) await learner.waitForTimeout(wait);
  for (const [id, picks, reason] of [
    [extendId, ["Ôm", "Vôn kế"], "Em bị mất mạng lúc làm bài"],
    [rejectId, ["Vôn", "Vôn kế"], "Em quên hạn nộp"],
  ] as const) {
    await learner.goto(`/assignments/${id}`);
    await expect(learner.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Quá hạn, chưa nộp");
    await expect(learner.getByText("Đã quá hạn. Em vẫn có thể nộp bài kèm lý do nộp trễ")).toBeVisible();
    await answerAll(learner, [...picks]);
    await expect(learner.getByRole("button", { name: "Nộp bài" })).toBeDisabled();
    await learner.getByLabel("Lý do nộp trễ (bắt buộc)").fill(reason);
    await learner.getByRole("button", { name: "Nộp bài" }).click();
    await expect(learner.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Nộp trễ, chờ giáo viên duyệt");
    await expect(learner.getByText("Điểm chưa được chốt")).toBeVisible();
    await expect(learner.locator("p", { hasText: "Kết quả hiện tại:" })).toHaveCount(0);
  }

  // ---------- 3.5 / 3.3 teacher queue: extend one, reject the other ----------
  await teacher.reload();
  await teacher.getByRole("button", { name: /Pilot Science 8A/ }).first().click();
  const queue = teacher.getByRole("region", { name: "Bài nộp trễ chờ duyệt" });
  const extendItem = queue.locator(".assignment-row").filter({ hasText: `${prefix} trễ-dời-hạn` });
  const rejectItem = queue.locator(".assignment-row").filter({ hasText: `${prefix} trễ-từ-chối` });
  await expect(extendItem).toContainText("Lý do: Em bị mất mạng lúc làm bài");
  await expect(rejectItem).toContainText("Lý do: Em quên hạn nộp");

  await rejectItem.getByRole("button", { name: "Từ chối (0 điểm)" }).click();
  const rejectDialog = teacher.getByRole("dialog", { name: "Từ chối bài nộp trễ" });
  await rejectDialog.getByLabel("Ghi chú cho học sinh (không bắt buộc)").fill("Lý do chưa phù hợp");
  await rejectDialog.getByRole("button", { name: "Từ chối, ghi 0 điểm" }).click();
  await expect(rejectItem).toHaveCount(0);

  const newDue = new Date(Date.now() + 3 * 86400000);
  await extendItem.getByRole("button", { name: "Dời hạn cho cả nhóm" }).click();
  const reviseDialog = teacher.getByRole("dialog", { name: "Dời hạn nộp cho cả nhóm" });
  await reviseDialog.getByLabel("Hạn nộp mới").fill(localInput(newDue));
  await reviseDialog.getByRole("button", { name: "Dời hạn" }).click();
  await expect(extendItem).toHaveCount(0);

  const assignmentRow = teacher.locator(".assignment-row").filter({ hasText: `${prefix} trễ-dời-hạn` });
  await expect(assignmentRow).toContainText("Đã dời hạn (lần 1)");
  await assignmentRow.getByRole("button", { name: "Theo dõi bài nộp" }).click();
  const tracking = teacher.getByRole("dialog", { name: `${prefix} trễ-dời-hạn` });
  await expect(tracking).toContainText("đã dời 1 lần");
  await expect(tracking.getByRole("row").filter({ hasText: studentRow.student.fullName })).toContainText("Trễ hạn · được chấp nhận khi dời hạn");
  await tracking.getByRole("button", { name: "Đóng" }).click();

  // ---------- 3.4 student sees the outcomes ----------
  await learner.goto(`/assignments/${extendId}`);
  await expect(learner.getByText("Giáo viên đã dời hạn nộp cho cả nhóm")).toBeVisible();
  await expect(learner.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Đã nộp");
  await expect(learner.locator("p", { hasText: "Kết quả hiện tại:" })).toContainText("50 điểm");
  await expect(learner.getByRole("region", { name: "Lịch sử nộp bài" })).toContainText("được chấp nhận khi dời hạn");

  await learner.goto(`/assignments/${rejectId}`);
  await expect(learner.getByRole("region", { name: "Trạng thái bài kiểm tra" })).toContainText("Bài trễ bị từ chối");
  await expect(learner.getByText("kết quả hiện tại là 0 điểm")).toBeVisible();
  await expect(learner.getByRole("region", { name: "Lịch sử nộp bài" })).toContainText("bị từ chối (0 điểm)");
});

test("I3: linked parent sees a read-only overdue notice that an extension clears", async ({ browser }) => {
  test.skip(!seedPassword, "Set SEED_PASSWORD for teacher@ and parent@");
  test.setTimeout(180000);
  const classId = "demo-class";
  const token = await adultToken(demoTeacher);
  const parentToken = await adultToken(parentAccount);
  // The seeded link is pending until the parent verifies email (mailed one-time link, needs `npm run mailbox`)
  // and accepts consent — the same calls as the UI.
  let children = (await call("/children", "GET", undefined, parentToken)).data ?? [];
  if (!children.some((c: any) => c.student.id === "student")) {
    const since = Date.now();
    const request = await call("/auth/email/verify/request", "POST", undefined, parentToken);
    if (request.data?.sent) {
      const verifyToken = await mailedToken(parentAccount.email, "verifyEmail", since);
      expect(verifyToken, "verification mail reached the dev mailbox").toBeTruthy();
      await call("/auth/email/verify", "POST", { token: verifyToken });
    }
    await call("/auth/consents", "POST", { purpose: "PARENT_CHILD_PROGRESS", version: "2026-10-v1", contentHash: "dev" }, parentToken);
    children = (await call("/children", "GET", undefined, parentToken)).data ?? [];
  }
  const child = children.find((c: any) => c.student.id === "student");
  expect(child, "parent@ is linked and approved for nguyenan.8a").toBeTruthy();

  const testId = await publishedTest(classId, token, `${prefix} đề phụ huynh`);
  const due = new Date(Date.now() + 15000);
  const aid = await assignByApi(classId, token, testId, `${prefix} quá-hạn`, due, ["student"]);
  await new Promise((resolve) => setTimeout(resolve, due.getTime() - Date.now() + 2000));

  const parent = await adultLogin(browser, parentAccount);
  await parent.goto("/progress");
  await parent.getByRole("button", { name: child.student.fullName }).click();
  const notices = parent.getByRole("region", { name: "Thông báo bài quá hạn" });
  const notice = notices.locator(".assignment-row").filter({ hasText: `${prefix} quá-hạn` });
  await expect(notice).toContainText("Con chưa nộp bài");
  await expect(notices).toContainText("quá hạn không tự bị chấm 0 điểm");
  // Read-only for the work itself: the only control marks the stored notification seen (acc-3).
  await expect(notice.getByRole("link")).toHaveCount(0);
  await expect(notice.getByRole("button")).toHaveText(["Đã xem"]);
  await notice.getByRole("button", { name: "Đã xem" }).click();
  await expect(notice.getByRole("button")).toHaveCount(0);
  await expect(notice).toContainText("Con chưa nộp bài");

  const revised = await call(`/classes/${classId}/assignments/${aid}/deadline-revisions`, "POST", { dueAt: new Date(Date.now() + 86400000).toISOString(), expectedRevision: 1 }, token);
  expect(revised.status, JSON.stringify(revised.data)).toBe(201);
  await parent.reload();
  await parent.getByRole("button", { name: child.student.fullName }).click();
  await expect(parent.getByRole("region", { name: "Thông báo bài quá hạn" })).toBeVisible();
  await expect(notice).toHaveCount(0);
});
