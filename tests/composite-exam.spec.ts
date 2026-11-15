import { expect, test, type Page, type Response } from "@playwright/test";

const enabled = process.env.TEST_TAI74 === "1";
const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
const classPath = "/classes/class-pilot-a";
const answer = "Electron va chạm với các ion. Điện năng chuyển hóa thành nhiệt năng nên dây tóc phát ra ánh sáng.";

async function login(page: Page, role: "teacher" | "student") {
  await page.goto("/login");
  if (role === "teacher") {
    await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
    await page.getByLabel("Email", { exact: true }).fill("teacher.owner@nexalab.local");
  } else {
    await page.getByLabel("Tên đăng nhập học sinh", { exact: true }).fill("student.active");
  }
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

function response(page: Page, suffix: string, method = "POST") {
  return page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method);
}

async function ok(pending: Promise<Response>) {
  const result = await pending;
  const body = await result.json();
  expect(result.ok(), JSON.stringify(body)).toBe(true);
  return body;
}

test("TAI7-T4 teacher publishes a three-part exam, student submits, teacher quick-approves and locks", async ({ page, browser, baseURL }) => {
  test.skip(!enabled, "Requires isolated Postgres, a released circuit Lab, and AI fake provider in assist mode");
  expect(password).toBeTruthy();
  test.setTimeout(90_000);
  const title = "EXAM ba phần " + Date.now();
  await login(page, "teacher");
  await page.goto(classPath + "?tab=resources");
  page.setDefaultTimeout(10_000);
  await page.getByRole("tab", { name: "Tạo nội dung trực tiếp" }).click();
  await page.getByLabel("Mục đích sử dụng").selectOption("EXAM");
  await page.getByLabel("Bài học liên kết").selectOption("lesson-circuit");
  await page.getByLabel("Tên tài nguyên", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Thêm câu hỏi", exact: true }).click();
  const mcq = page.getByRole("group", { name: "Trắc nghiệm", exact: true });
  await mcq.getByLabel("Điểm tối đa của câu").fill("4");
  await mcq.getByLabel("Nội dung câu hỏi 1").fill("Dòng điện chạy trong mạch nào?");
  await mcq.getByLabel("Câu 1 · Phương án 1").fill("Mạch kín");
  await mcq.getByLabel("Câu 1 · Phương án 2").fill("Mạch hở");
  await page.getByRole("button", { name: "Thêm câu tự luận" }).click();
  const written = page.getByRole("group", { name: "Tự luận", exact: true });
  await written.getByLabel("Đề bài câu 1").fill("Giải thích vì sao dây tóc nóng sáng.");
  await written.getByLabel("Đáp án tham khảo", { exact: false }).fill("Điện năng chuyển hóa thành nhiệt năng.");
  await written.getByLabel("Mã tiêu chí", { exact: false }).fill("NGUYEN_NHAN");
  await written.getByLabel("Mô tả tiêu chí").fill("Giải thích tác dụng nhiệt");
  await written.getByLabel("Điểm tối đa", { exact: false }).fill("4");
  await written.getByLabel("Mốc 1 · Mô tả mốc").fill("Chưa giải thích.");
  await written.getByLabel("Mốc 2 · Điểm", { exact: true }).fill("4");
  await written.getByLabel("Mốc 2 · Mô tả mốc").fill("Nêu «electron va chạm» và «chuyển hóa thành nhiệt năng».");
  await page.getByRole("button", { name: "Thêm câu Lab" }).click();
  const lab = page.getByRole("group", { name: "Lab 1", exact: true });
  await lab.getByLabel("Điểm tối đa của câu").fill("2");
  await lab.getByRole("combobox", { name: "Phòng Lab", exact: true }).selectOption("circuit");
  await lab.getByRole("combobox", { name: "Thử thách", exact: true }).selectOption("circuit_001");
  await lab.getByLabel("Yêu cầu thực hành").fill("Lắp mạch LED kín và an toàn.");
  await expect(page.getByText("10,0/10 điểm")).toBeVisible();

  const created = response(page, classPath + "/resources");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  const resource = await ok(created);
  const published = response(page, `/resources/${resource.id}/publish`);
  await page.locator("article").filter({ hasText: title }).getByRole("button", { name: "Xuất bản cho lớp" }).click();
  await ok(published);

  await page.goto(classPath + "?tab=work");
  await page.getByRole("button", { name: "Giao bài", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Đề kiểm tra tổng hợp" }).check();
  await dialog.getByLabel("Nội dung đã xuất bản").selectOption(resource.id);
  const due = new Date(Date.now() + 4 * 3_600_000);
  due.setMinutes(due.getMinutes() - due.getTimezoneOffset());
  await dialog.getByLabel("Hạn nộp (bắt buộc)").fill(due.toISOString().slice(0, 16));
  await dialog.getByRole("radio", { name: "Một nhóm học sinh" }).check();
  await dialog.getByRole("checkbox", { name: "Student Active" }).check();
  const assigned = response(page, classPath + "/assignments");
  await dialog.getByRole("button", { name: "Giao bài", exact: true }).click();
  const { assignment } = await ok(assigned);

  const studentContext = await browser.newContext({ baseURL });
  try {
    const student = await studentContext.newPage();
    await login(student, "student");
    await student.goto("/assignments/" + assignment.id);
    await expect(student.getByText("Dòng điện chạy trong mạch nào?")).toHaveCount(0);
    await student.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(student.getByRole("timer")).toBeVisible();
    await student.getByRole("radio", { name: "Mạch kín" }).check();
    await student.getByRole("textbox", { name: /Giải thích vì sao dây tóc nóng sáng/ }).fill(answer);
    await expect(student.getByText(/Đã lưu nháp lúc/)).toBeVisible();
    await student.getByRole("button", { name: "Mở Lab trong bài thi" }).click();
    await student.getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" }).click();
    const closeSwitch = student.getByRole("button", { name: "Đóng công tắc" });
    if (await closeSwitch.isVisible()) await closeSwitch.click();
    const labResult = response(student, "/attempts");
    await student.getByRole("button", { name: "Chạy mô phỏng và lưu kết quả" }).click();
    const receipt = await ok(labResult);
    expect(receipt.attempt.id).toBeTruthy();
    expect(receipt.attempt).not.toHaveProperty("verdict");
    await expect(student.getByText("Đã lưu lần chạy Lab trong phiên thi.")).toBeVisible();

    await student.reload();
    await expect(student.getByRole("radio", { name: "Mạch kín" })).toBeChecked();
    await expect(student.getByRole("textbox", { name: /Giải thích vì sao dây tóc nóng sáng/ })).toHaveValue(answer);
    await expect(student.getByText("Đã lưu lần chạy Lab trong phiên thi.")).toBeVisible();
    student.once("dialog", (confirm) => void confirm.accept());
    const submitted = response(student, `/assignments/${assignment.id}/submissions`);
    await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
    expect((await ok(submitted)).submission).toMatchObject({ resultHidden: true, score10: null });
    await expect(student.getByText("Đã nộp – chờ giáo viên công bố điểm.")).toBeVisible();
  } finally {
    await studentContext.close();
  }

  const card = page.locator(".teacher-assignment-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Bảng điểm" }).click();
  await expect(page.getByRole("columnheader", { name: "Trắc nghiệm" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Lab", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Tự luận" })).toBeVisible();
  const submittedRow = page.getByRole("row").filter({ hasText: "student.active" });
  await expect(submittedRow.getByRole("cell", { name: "4,0", exact: true })).toBeVisible();
  await expect(submittedRow.getByRole("cell", { name: "2,0", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chốt sổ điểm", exact: true }).click();
  const blocked = response(page, "/gradebook/lock");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  expect((await blocked).status()).toBe(409);
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();

  await card.getByRole("button", { name: "Theo dõi và chấm bài" }).click();
  const ai = response(page, "/ai-assessments");
  await page.getByRole("button", { name: /Gợi ý AI cho bài chưa chấm/ }).click();
  await ok(ai);
  await expect(page.getByText("Có gợi ý", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();

  await card.getByRole("button", { name: "Bảng điểm" }).click();
  const approved = response(page, "/gradebook/quick-approve");
  await submittedRow.getByRole("button", { name: "Duyệt AI", exact: true }).click();
  expect((await ok(approved)).approved).toHaveLength(1);
  await expect(submittedRow.getByRole("cell", { name: "10,0", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chốt sổ điểm", exact: true }).click();
  const locked = response(page, "/gradebook/lock");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await ok(locked);
  await expect(page.getByText(/Đã chốt sổ \(lần 1\)/)).toBeVisible();
});



