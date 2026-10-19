import { test, type Page } from "@playwright/test";
import { accounts, adultLogin, adultToken, call, expect, PILOT_CLASS, PILOT_CLASS_NAME, studentLogin } from "./fixtures/live";

// I2 Class Space through the browser (complements the API-level i2-class-space-api.spec.ts):
// the owner authors, imports and publishes class resources; an approved member
// practises unscored and never sees test questions. Resources are archived afterwards.
const prefix = "pw-i2ui-" + Date.now().toString(36);

test.beforeAll(() => {
  test.skip(!accounts.owner.password || !accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_TEACHER_PASSWORD/TEST_STUDENT_PASSWORD)");
});
test.afterAll(async () => {
  if (!accounts.owner.password) return;
  const token = await adultToken(accounts.owner);
  const resources = await call(`/classes/${PILOT_CLASS}/resources`, "GET", undefined, token);
  for (const resource of resources.data ?? [])
    if (resource.title.startsWith(prefix) && resource.status !== "ARCHIVED") await call(`/classes/${PILOT_CLASS}/resources/${resource.id}/archive`, "POST", {}, token);
});

async function teacherResources(page: Page) {
  await page.goto("/classes");
  await page.getByRole("button", { name: PILOT_CLASS_NAME }).first().click();
  const panel = page.getByRole("region", { name: "Tài nguyên lớp" });
  await expect(panel).toBeVisible();
  return panel;
}

async function createDraft(panel: ReturnType<Page["getByRole"]>, kind: string, title: string, content: unknown) {
  const form = panel.locator(".class-resource-create form");
  await form.getByLabel("Loại nội dung").selectOption(kind);
  await form.getByLabel("Tên tài nguyên").fill(title);
  await form.getByLabel("Bài học liên kết").selectOption("lesson-circuit");
  await form.getByLabel("Nội dung JSON").fill(JSON.stringify(content));
  await form.getByRole("button", { name: "Lưu bản nháp" }).click();
  const row = panel.locator(".class-resource-row").filter({ hasText: title });
  await expect(row).toContainText("Bản nháp");
  return row;
}

test("owner authors and publishes a deck; a member flips cards and practice is saved unscored", async ({ browser }) => {
  const teacher = await adultLogin(browser, accounts.owner);
  const panel = await teacherResources(teacher);
  const title = `${prefix} thẻ học`;
  const row = await createDraft(panel, "DECK", title, { cards: [{ front: "Điện trở", back: "Đại lượng cản trở dòng điện" }, { front: "Ampe kế", back: "Đo cường độ dòng điện" }] });
  await expect(row).toContainText("Thẻ học · Bản 1 · 2 mục");
  await row.getByRole("button", { name: "Xuất bản cho lớp" }).click();
  await expect(row).toContainText("Đã chia sẻ");
  await expect(row.getByRole("button", { name: "Tạo bản mới" })).toBeVisible();

  const student = await studentLogin(browser);
  await student.goto("/classes");
  const card = student.locator(".student-resource").filter({ hasText: title });
  await expect(card).toContainText("Điện trở");
  const save = student.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith("/practice"));
  await card.getByRole("button", { name: "Lật thẻ" }).first().click();
  const saved = await save;
  expect(saved.status()).toBe(200);
  expect((await saved.json()).scored).toBe(false);
  await expect(card).toContainText("Đại lượng cản trở dòng điện");
  await expect(card.getByRole("status")).toContainText("Đã lưu lượt luyện tập");
  await student.reload();
  await expect(student.locator(".student-resource").filter({ hasText: title })).toContainText("Đại lượng cản trở dòng điện");
});

test("a shared test shows members no questions and a study quiz stays unscored", async ({ browser }) => {
  const teacher = await adultLogin(browser, accounts.owner);
  const panel = await teacherResources(teacher);
  const testTitle = `${prefix} kiểm tra`;
  const quizTitle = `${prefix} luyện tập`;
  const testRow = await createDraft(panel, "TEST", testTitle, { questions: [{ prompt: "Câu hỏi bí mật về điện trở?", options: ["A", "B"], correctOption: 1 }] });
  await testRow.getByRole("button", { name: "Xuất bản cho lớp" }).click();
  await expect(testRow).toContainText("Đã chia sẻ");
  const quizRow = await createDraft(panel, "STUDY_QUIZ", quizTitle, { questions: [{ prompt: "Ampe kế mắc thế nào?", options: ["Nối tiếp", "Song song"] }] });
  await quizRow.getByRole("button", { name: "Xuất bản cho lớp" }).click();
  await expect(quizRow).toContainText("Đã chia sẻ");

  const student = await studentLogin(browser);
  await student.goto("/classes");
  const test = student.locator(".student-resource").filter({ hasText: testTitle });
  await expect(test).toContainText("Bài kiểm tra này chưa được giao");
  await expect(student.getByText("Câu hỏi bí mật về điện trở?")).toHaveCount(0);
  const quiz = student.locator(".student-resource").filter({ hasText: quizTitle });
  await quiz.getByRole("radio", { name: "Nối tiếp" }).check();
  await expect(quiz.getByRole("status")).toContainText("Đã lưu lượt luyện tập");
  await expect(quiz).toContainText("Luyện tập không chấm điểm.");
});

test("CSV import shows row errors without creating anything, then imports a valid file as a draft", async ({ browser }) => {
  const teacher = await adultLogin(browser, accounts.owner);
  const panel = await teacherResources(teacher);
  const form = panel.locator(".class-resource-create form");
  const title = `${prefix} nhập csv`;
  await form.getByLabel("Loại nội dung").selectOption("DECK");
  await form.getByLabel("Tên tài nguyên").fill(title);
  await form.getByLabel("Bài học liên kết").selectOption("lesson-circuit");
  const importer = panel.locator(".class-resource-import");
  await importer.getByText("Nhập CSV có cấu trúc").click();
  const file = importer.getByLabel("Tệp CSV");
  await file.setInputFiles({ name: "loi.csv", mimeType: "text/csv", buffer: Buffer.from("front,back\nĐiện trở,\nÔm,Đơn vị điện trở\n", "utf8") });
  await importer.getByRole("button", { name: "Kiểm tra và xem trước" }).click();
  await expect(importer.getByRole("status")).toContainText("Tệp có lỗi");
  await expect(importer.getByRole("status")).toContainText("Dòng 2, back");
  await expect(importer.getByRole("button", { name: "Nhập thành bản nháp" })).toBeDisabled();
  await expect(panel.locator(".class-resource-row").filter({ hasText: title })).toHaveCount(0);

  await file.setInputFiles({ name: "the-hoc.csv", mimeType: "text/csv", buffer: Buffer.from("front,back\nĐiện trở,Cản trở dòng điện\nÔm,Đơn vị điện trở\n", "utf8") });
  await importer.getByRole("button", { name: "Kiểm tra và xem trước" }).click();
  await expect(importer.getByRole("status")).toContainText("Hợp lệ · 2 mục");
  await importer.getByRole("button", { name: "Nhập thành bản nháp" }).click();
  const row = panel.locator(".class-resource-row").filter({ hasText: title });
  await expect(row).toContainText("Bản nháp");
  await expect(row).toContainText("2 mục");
});
