import { test, type Page } from "@playwright/test";
import { accounts, adultLogin, adultToken, call, expect, PILOT_CLASS, PILOT_CLASS_NAME, studentLogin, studentToken } from "./fixtures/live";

// acc-2 on the real FE/API/R2: private avatar upload and removal, adult display name,
// student name lock, and avatar moderation by the owning teacher only.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function uploadOn(page: Page) {
  await page.goto("/settings");
  const profile = page.getByRole("region", { name: "Hồ sơ" });
  await expect(profile.getByText("Vai trò")).toBeVisible();
  const confirmed = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/me/avatar"));
  await page.getByLabel("Chọn ảnh đại diện").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  expect((await confirmed).status()).toBe(201);
  await expect(profile.locator("img.avatar-image")).toHaveAttribute("src", /^https?:\/\//);
  // Confirmation moves the upload out of the staging prefix that the bucket lifecycle rule expires.
  const src = (await profile.locator("img.avatar-image").getAttribute("src")) ?? "";
  expect(decodeURIComponent(new URL(src).pathname)).toMatch(/\/avatars\/[^/]+\/[0-9a-f-]{36}\.png$/);
  expect(src).not.toContain("/staging/");
  return profile;
}

test.beforeAll(() => {
  test.skip(!accounts.owner.password || !accounts.student.password, "Set SEED_FIXTURE_PASSWORD");
});

test("an adult uploads a private avatar, renames, and removes the avatar", async ({ browser }) => {
  const page = await adultLogin(browser, accounts.owner);
  const profile = await uploadOn(page);
  // The sidebar uses the same private image.
  await expect(page.getByRole("complementary").locator("img.avatar-image")).toBeVisible();
  const src = await profile.locator("img.avatar-image").getAttribute("src");
  const image = await page.request.get(src!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");

  const original = await profile.getByLabel("Tên hiển thị").inputValue();
  await profile.getByLabel("Tên hiển thị").fill(original + " (thử)");
  await profile.getByRole("button", { name: "Lưu tên" }).click();
  await expect(profile.getByRole("status")).toContainText("Đã lưu tên hiển thị");
  await expect(page.getByRole("complementary")).toContainText(original + " (thử)");
  await profile.getByLabel("Tên hiển thị").fill(original);
  await profile.getByRole("button", { name: "Lưu tên" }).click();
  await expect(page.getByRole("complementary")).not.toContainText("(thử)");

  await profile.getByRole("button", { name: "Gỡ ảnh" }).click();
  await expect(profile.locator("img.avatar-image")).toHaveCount(0);
  const refused = await call("/me/avatar", "POST", { key: "development/staging/avatars/someone-else/00000000-0000-0000-0000-000000000000.png" }, await adultToken(accounts.owner));
  expect(refused.data?.code).toBe("AVATAR_KEY_INVALID");
});

test("a student cannot rename, and only the owning teacher can remove the student's avatar", async ({ browser }) => {
  const page = await studentLogin(browser);
  const profile = await uploadOn(page);
  await expect(profile.getByLabel("Tên hiển thị")).toHaveCount(0);
  await expect(profile).toContainText("Họ tên của học sinh do giáo viên quản lý");
  await expect(page.getByRole("region", { name: "Liên kết phụ huynh" })).toContainText("do giáo viên cấp");
  const { token, id } = await studentToken(accounts.student);
  expect((await call("/me/profile", "PATCH", { fullName: "Đổi tên" }, token)).data?.code).toBe("PROFILE_NAME_LOCKED");
  const studentId = id ?? (await call("/me/profile", "GET", undefined, token)).data.id;

  test.skip(!accounts.outsiderTeacher.password, "Set SEED_FIXTURE_PASSWORD for teacher.outsider");
  const outsider = await call(`/classes/${PILOT_CLASS}/students/${studentId}/avatar`, "DELETE", undefined, await adultToken(accounts.outsiderTeacher));
  expect(outsider.status).toBe(403);
  // The owning teacher removes it from the class roster (acc-2 moderation UI).
  const teacher = await adultLogin(browser, accounts.owner);
  await teacher.goto("/classes");
  await teacher.getByRole("button", { name: PILOT_CLASS_NAME }).first().click();
  const row = teacher.getByRole("row").filter({ hasText: accounts.student.username });
  await expect(row.locator("img.avatar-image")).toBeVisible();
  const removed = teacher.waitForResponse((r) => r.request().method() === "DELETE" && r.url().endsWith(`/students/${studentId}/avatar`));
  await row.getByRole("button", { name: "Gỡ ảnh" }).click();
  await teacher.getByRole("dialog", { name: "Xác nhận thao tác" }).getByRole("button", { name: "Xác nhận" }).click();
  expect((await removed).status()).toBe(200);
  await expect(row.getByRole("button", { name: "Gỡ ảnh" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Hồ sơ" }).locator("img.avatar-image")).toHaveCount(0);
});
