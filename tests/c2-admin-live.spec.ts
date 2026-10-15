import { expect, test, type APIRequestContext } from "@playwright/test";

// Real API + database + browser. Needs the seeded admin (or C2_ADMIN_EMAIL /
// C2_ADMIN_PASSWORD) and TEST_API pointing at the same API the web app uses.
// Each run creates a uniquely named teacher; disabled accounts keep their audit
// history by design, so this spec is meant for local/development databases.
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const adminEmail = process.env.C2_ADMIN_EMAIL ?? "admin@nexalab.local";
const adminPassword = process.env.C2_ADMIN_PASSWORD ?? process.env.SEED_PASSWORD ?? "";
const tag = "c2ui" + Date.now().toString(36);

async function token(request: APIRequestContext, path: string, email: string, password: string) {
  const res = await request.post(`${api}${path}`, { data: { email, password } });
  expect(res.status(), `${path} sign-in`).toBe(201);
  return (await res.json()).accessToken as string;
}

test("C2 admin disables an owner with explicit resolution and finds it in the audit log", async ({ page, request }) => {
  test.skip(!adminPassword, "C2_ADMIN_PASSWORD or SEED_PASSWORD is required");
  expect.configure({ timeout: 20000 });
  const adminToken = await token(request, "/auth/admin/login", adminEmail, adminPassword);
  const teacherEmail = `${tag}@example.test`;
  const teacherPassword = "C2-UI-Teacher-2026!";
  const made = await request.post(`${api}/admin/users`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: { role: "TEACHER", email: teacherEmail, fullName: `Giáo viên ${tag}`, consent: true, password: teacherPassword },
  });
  expect(made.status()).toBe(201);
  const teacherToken = await token(request, "/auth/login", teacherEmail, teacherPassword);
  const klass = await request.post(`${api}/classes`, {
    headers: { authorization: `Bearer ${teacherToken}`, "Idempotency-Key": crypto.randomUUID() },
    data: { name: `Lớp ${tag}`, grade: 8 },
  });
  expect(klass.status()).toBe(201);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Cổng quản trị viên" }).click();
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();

  await page.getByRole("tab", { name: "Người dùng" }).click();
  await page.getByLabel("Tìm theo tên, email, tên đăng nhập").fill(tag);
  const row = page.getByRole("row", { name: new RegExp(tag) });
  await expect(row.getByText("Đang hoạt động")).toBeVisible();
  await row.getByRole("button", { name: "Quản lý" }).click();
  await expect(page.getByText("1 lớp đang hoạt động")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa vĩnh viễn" })).toBeDisabled();

  await page.getByRole("button", { name: "Vô hiệu hóa" }).click();
  const dialog = page.getByRole("dialog", { name: "Vô hiệu hóa tài khoản" });
  await expect(dialog.getByText(/đăng xuất khỏi mọi thiết bị/)).toBeVisible();
  await dialog.getByLabel(new RegExp(`Cách xử lý Lớp Lớp ${tag}`)).selectOption("archive");
  await dialog.getByLabel(/Lý do/).fill("Giáo viên chuyển trường");
  await dialog.getByRole("button", { name: "Vô hiệu hóa" }).click();
  await expect(page.getByText("Đã vô hiệu hóa và thu hồi mọi phiên đăng nhập.")).toBeVisible();
  expect((await request.get(`${api}/classes`, { headers: { authorization: `Bearer ${teacherToken}` } })).status()).toBe(401);
  await page.getByRole("button", { name: "Đóng" }).first().click();

  await page.getByRole("tab", { name: "Nhật ký" }).click();
  await page.getByLabel("Hành động (tiền tố)").fill("user.disable");
  await page.getByLabel("Mã đối tượng").fill((await made.json()).id);
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page.getByRole("cell", { name: "Giáo viên chuyển trường" })).toBeVisible();
  await expect(page.getByText(/status: "active" → "disabled"/)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
