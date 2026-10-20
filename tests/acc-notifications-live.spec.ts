import { test } from "@playwright/test";
import { accounts, adultLogin, adultToken, assignTest, call, cleanupList, expect, memberId, PILOT_CLASS, publishedTest, studentLogin, studentToken } from "./fixtures/live";

// acc-3 on the real FE/API/database: a teacher's assignment notifies the student,
// the student's submission notifies the teacher, and reading clears the badge.
const prefix = "pw-acc3-" + Date.now().toString(36);
const cleanup = cleanupList();
test.afterAll(() => cleanup.run());
test.beforeAll(() => {
  test.skip(!accounts.owner.password || !accounts.student.password, "Set SEED_FIXTURE_PASSWORD");
});

test("assignment, submission and deadline revision reach the right people", async ({ browser }) => {
  test.setTimeout(150000);
  const token = await adultToken(accounts.owner);
  const learner = await memberId(PILOT_CLASS, token, accounts.student.username);
  const testId = await publishedTest(PILOT_CLASS, token, `${prefix} đề`, cleanup);
  const aid = await assignTest(PILOT_CLASS, token, testId, `${prefix} bài giao`, new Date(Date.now() + 3 * 86400000), [learner.id], cleanup);

  // Student: the assignment notice is in the list and opening it marks it read.
  const student = await studentLogin(browser);
  await student.goto("/notifications");
  const assigned = student.getByRole("button", { name: new RegExp(`Bài mới: ${prefix} bài giao`) });
  await expect(assigned).toContainText("Chưa đọc");
  await expect(student.getByRole("link", { name: /Thông báo, \d+ chưa đọc/ })).toBeVisible();
  await assigned.click();
  await expect(student).toHaveURL(new RegExp(`/assignments/${aid}`));

  // The student submits through the API; the owning teacher is notified.
  const { token: studentAuth } = await studentToken(accounts.student);
  const detail = await call(`/assignments/${aid}`, "GET", undefined, studentAuth);
  const answers = detail.data.content.questions.map((q: any) => ({ questionId: q.id, optionId: q.options[0].id }));
  expect((await call(`/assignments/${aid}/submissions`, "POST", { answers }, studentAuth)).status).toBe(201);
  const teacher = await adultLogin(browser, accounts.owner);
  await teacher.goto("/notifications");
  await expect(teacher.getByRole("button", { name: new RegExp(`đã nộp "${prefix} bài giao"`) })).toBeVisible();

  // A deadline revision notifies the recipient once; marking all read clears the badge.
  const revised = await call(`/classes/${PILOT_CLASS}/assignments/${aid}/deadline-revisions`, "POST", { dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), expectedRevision: 1 }, token);
  expect(revised.status).toBe(201);
  const list = await call("/me/notifications", "GET", undefined, studentAuth);
  expect(list.data.items.filter((n: any) => n.type === "DEADLINE_EXTENDED" && n.link === `/assignments/${aid}`)).toHaveLength(1);
  await student.goto("/notifications");
  await student.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
  await expect(student.getByRole("heading", { name: "Đã đọc hết" })).toBeVisible();
  await expect(student.getByRole("link", { name: "Thông báo", exact: true })).toBeVisible();

  // Nobody else reads these notices.
  const outsider = await call("/me/notifications", "GET", undefined, await adultToken(accounts.outsiderTeacher));
  expect(JSON.stringify(outsider.data)).not.toContain(prefix);
});
