import { expect, test, type Browser, type Page } from "@playwright/test";

// Real FE/API/database journey for Epic B1 (B1-T6). Requires a running API
// and web app with a seeded database; identities come from the environment:
//   TEST_WEB, TEST_API, TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD
// (defaults: teacher.owner@nexalab.local with SEED_FIXTURE_PASSWORD).
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const teacherEmail = process.env.TEST_TEACHER_EMAIL ?? "teacher.owner@nexalab.local";
const teacherPassword = process.env.TEST_TEACHER_PASSWORD ?? process.env.SEED_FIXTURE_PASSWORD;
const prefix = "pw-b1-" + Date.now().toString(36);
const studentPassword = "PwB1-Student-Password-2026!";

async function call(path: string, method = "GET", body?: unknown, token?: string) {
  const response = await fetch(api + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

async function teacherLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập người lớn" }).click();
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(teacherPassword!);
  const response = page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

async function studentLogin(browser: Browser, username: string, password: string, temporary = false) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  if (temporary) {
    await page.getByLabel("Mật khẩu tạm").fill(password);
    await page.getByLabel("Mật khẩu mới (ít nhất 12 ký tự)").fill(studentPassword);
    await page.getByRole("button", { name: /Lưu và bắt đầu học/ }).click();
    await expect(page.getByText("Đổi mật khẩu tạm")).toHaveCount(0);
  }
  return page;
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe.serial("B1 teacher operations (real dependencies)", () => {
  let classId = "";
  let className = "";

  test("owner creates a class, provisions, approves a join request and assigns work", async ({ page, browser }) => {
    expect(teacherPassword, "TEST_TEACHER_PASSWORD or SEED_FIXTURE_PASSWORD must be set").toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 900 });
    await teacherLogin(page);
    await page.goto("/classes");

    // Create: the join code is shown exactly once.
    className = `${prefix} Lớp 8A`;
    await page.getByRole("button", { name: "+ Tạo lớp" }).click();
    const create = page.getByRole("dialog", { name: "Tạo lớp mới" });
    await create.getByLabel("Tên lớp").fill(className);
    await create.getByLabel("Học sinh vào bằng mã cần giáo viên duyệt").check();
    await create.getByRole("button", { name: "Tạo lớp" }).click();
    const codeText = (await create.locator(".join-code-value code").textContent())!.trim();
    expect(codeText).toMatch(/^NL-[0-9A-Z]{6}-[0-9A-Z]{10}$/);
    await create.getByRole("button", { name: "Đã lưu mã" }).click();
    await expect(page.getByRole("heading", { name: className, level: 2 })).toBeVisible();

    // Provision a student; the temporary password is shown once.
    await page.getByRole("button", { name: "Cấp tài khoản học sinh" }).click();
    const provision = page.getByRole("dialog", { name: "Cấp tài khoản học sinh" });
    await provision.getByLabel("Tên đăng nhập").fill(`${prefix}-a`);
    await provision.getByLabel("Họ tên").fill("Học sinh Playwright A");
    await provision.getByLabel("Nhà trường đã có chấp thuận xử lý dữ liệu học sinh.").check();
    await provision.getByRole("button", { name: "Cấp tài khoản" }).click();
    const tempA = (await provision.locator("code").nth(1).textContent())!.trim();
    await provision.getByRole("button", { name: "Đã lưu thông tin" }).click();

    // A second student, enrolled elsewhere, joins this class by code.
    const login = await call("/auth/login", "POST", { email: teacherEmail, password: teacherPassword });
    const token = login.data.accessToken;
    const classes = await call("/classes?status=ACTIVE", "GET", undefined, token);
    classId = classes.data.find((c: any) => c.name === className).id;
    const other = await call("/classes", "POST", { name: `${prefix} Lớp phụ`, grade: 8 }, token);
    const made = await call(`/classes/${other.data.class.id}/students`, "POST", { username: `${prefix}-b`, fullName: "Học sinh Playwright B", grade: 8, consent: true }, token);
    const studentB = await studentLogin(browser, `${prefix}-b`, made.data.credentials.temporaryPassword, true);
    await studentB.goto("/classes");
    await studentB.getByRole("button", { name: "Tham gia bằng mã" }).click();
    await studentB.getByLabel("Mã tham gia lớp").fill(codeText.toLowerCase());
    await studentB.getByRole("button", { name: "Tham gia", exact: true }).click();
    await expect(studentB.getByRole("status")).toContainText("đang chờ giáo viên duyệt");
    await expect(studentB.getByText("Chờ giáo viên duyệt", { exact: true })).toBeVisible();

    // Teacher approves from the pending tab.
    await page.reload();
    await page.getByRole("button", { name: new RegExp(className) }).click();
    await page.getByRole("tab", { name: /Chờ duyệt/ }).click();
    const pendingRow = page.locator("tr", { hasText: "Học sinh Playwright B" });
    await pendingRow.getByRole("button", { name: "Duyệt" }).click();
    await page.getByRole("tab", { name: /Đã duyệt/ }).click();
    await expect(page.locator("tr", { hasText: "Học sinh Playwright B" })).toContainText("Đã duyệt");

    // Assign the shared lesson to the whole class (MSG-31).
    await page.getByRole("button", { name: "Giao bài" }).click();
    const assign = page.getByRole("dialog", { name: "Giao bài" });
    await assign.getByLabel("Nội dung đã xuất bản").selectOption("lesson-circuit");
    await assign.getByLabel("Tên nhiệm vụ (để trống sẽ dùng tên nội dung)").fill(`${prefix} Mạch điện`);
    await assign.getByRole("button", { name: "Giao bài" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 2 học sinh." })).toBeVisible();
    await expect(page.locator(".assignment-row", { hasText: `${prefix} Mạch điện` })).toContainText("2 học sinh");

    // Students see only their applicable work and can open it.
    await studentB.goto("/classes");
    const row = studentB.locator(".assignment-row", { hasText: `${prefix} Mạch điện` });
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: "Mở bài →" }).click();
    await expect(studentB).toHaveURL(/\/assignments\//);
    await expect(studentB.getByLabel("Lộ trình bài học")).toBeVisible();
    const studentA = await studentLogin(browser, `${prefix}-a`, tempA, true);
    await studentA.goto("/classes");
    await expect(studentA.locator(".assignment-row", { hasText: `${prefix} Mạch điện` })).toBeVisible();
    await studentA.context().close();
    await studentB.context().close();

    // Remove with confirmation (MSG-41): B loses access, the row moves to "Đã rời lớp".
    await page.locator("tr", { hasText: "Học sinh Playwright B" }).getByRole("button", { name: "Xóa khỏi lớp" }).click();
    const confirm = page.getByRole("dialog", { name: "Xác nhận thao tác" });
    await expect(confirm).toContainText("Bạn có chắc muốn xóa khỏi lớp");
    await confirm.getByRole("button", { name: "Xác nhận" }).click();
    await page.getByRole("tab", { name: /Đã rời lớp/ }).click();
    await expect(page.locator("tr", { hasText: "Học sinh Playwright B" })).toContainText("Đã rời lớp");
    await call(`/classes/${other.data.class.id}/archive`, "POST", { confirm: true }, token);
  });

  for (const width of [390, 768, 1024, 1440]) {
    test(`teacher class workspace is usable by keyboard without overflow at ${width}px`, async ({ page }) => {
      test.skip(!classId, "requires the journey above");
      await page.setViewportSize({ width, height: 900 });
      await teacherLogin(page);
      await page.goto("/classes");
      const card = page.getByRole("button", { name: new RegExp(className) });
      await card.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: className, level: 2 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Thành viên lớp" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Bài đã giao" })).toBeVisible();
      await noHorizontalOverflow(page);
      const assign = page.getByRole("button", { name: "Giao bài" });
      await assign.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Giao bài" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Nội dung đã xuất bản")).toBeVisible();
      await noHorizontalOverflow(page);
      await dialog.getByRole("button", { name: "Đóng" }).click();
      await expect(dialog).toHaveCount(0);
    });
  }

  test("class workspace shows loading, empty and retryable error states", async ({ page }) => {
    test.skip(!classId, "requires the journey above");
    await page.setViewportSize({ width: 1024, height: 900 });
    await teacherLogin(page);
    const classList = /\/api\/classes\?status=ACTIVE$/;

    // Loading: skeleton cards while the list is in flight.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(classList, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/classes");
    await expect(page.locator(".skeleton-card").first()).toBeAttached();
    release();
    await expect(page.getByRole("button", { name: new RegExp(className) })).toBeVisible();
    await page.unroute(classList);

    // Empty: a teacher without classes is pointed at the next action.
    await page.route(classList, (route) => route.fulfill({ json: [] }));
    await page.reload();
    await expect(page.getByText("Chưa có lớp nào. Hãy tạo lớp đầu tiên.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Tạo lớp" })).toBeEnabled();
    await page.unroute(classList);

    // Error: the stable envelope is shown with a retry, never a dead end.
    let failing = true;
    await page.route(classList, (route) =>
      failing
        ? route.fulfill({ status: 503, json: { statusCode: 503, code: "DEPENDENCY_FAILURE", message: "Dịch vụ tạm thời gián đoạn" } })
        : route.continue(),
    );
    await page.reload();
    const alert = page.getByRole("alert").filter({ hasText: "Không tải được danh sách lớp" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Dịch vụ tạm thời gián đoạn");
    failing = false;
    await alert.getByRole("button", { name: "Thử lại" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("button", { name: new RegExp(className) })).toBeVisible();
    await page.unroute(classList);

    // Roster read failure inside a class also recovers in place.
    const roster = /\/api\/classes\/[^/?]+\/students$/;
    let rosterFailing = true;
    await page.route(roster, (route) =>
      rosterFailing ? route.fulfill({ status: 500, json: { statusCode: 500, code: "INTERNAL_ERROR", message: "Đã có lỗi xảy ra" } }) : route.continue(),
    );
    await page.getByRole("button", { name: new RegExp(className) }).click();
    const rosterAlert = page.getByRole("alert").filter({ hasText: "Không tải được danh sách thành viên" });
    await expect(rosterAlert).toBeVisible();
    rosterFailing = false;
    await rosterAlert.getByRole("button", { name: "Thử lại" }).click();
    await expect(rosterAlert).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Thành viên lớp" })).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test.afterAll(async () => {
    if (!classId) return;
    const login = await call("/auth/login", "POST", { email: teacherEmail, password: teacherPassword });
    await call(`/classes/${classId}/archive`, "POST", { confirm: true }, login.data.accessToken);
  });
});
