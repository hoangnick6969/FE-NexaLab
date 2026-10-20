import { test, expect } from "@playwright/test";
const testPassword = process.env.SEED_PASSWORD;
if (!testPassword) throw new Error("Set SEED_PASSWORD to the password configured by the backend seed.");
// Since I1 a student opens only labs released in the foundational curriculum; the
// lab journeys below run once the content release (CF-T5) publishes that lab.
let releasedLabs: string[] = [];
test.beforeAll(async () => {
  const api = process.env.TEST_API ?? "http://127.0.0.1:4100/api";
  const login = await fetch(api + "/auth/student/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "nguyenan.8a", password: testPassword }) });
  const token = (await login.json()).accessToken;
  const labs = await fetch(api + "/labs", { headers: { authorization: "Bearer " + token } });
  releasedLabs = ((await labs.json()) as any[]).map((lab) => lab.id);
});
const requireReleased = (id: string) => test.skip(!releasedLabs.includes(id), `Lab "${id}" is not released to students in this database (content release CF-T5)`);
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel("Tên đăng nhập học sinh", { exact: true })
    .fill("nguyenan.8a");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(testPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chào An", exact: true }),
  ).toBeVisible();
});
test("circuit: open → overload → safe, hint and saved experiment", async ({
  page,
}) => {
  requireReleased("circuit");
  await page.goto("/labs/circuit");
  await page
    .getByRole("button", { name: "Chạy thí nghiệm", exact: true })
    .click();
  await expect(page.getByText("Chưa đạt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nhận gợi ý", exact: true }).click();
  await expect(page.getByText(/MỨC [1-4] \/ 4/)).toBeVisible();
  await page
    .getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" })
    .click();
  await page
    .getByRole("button", { name: "Chạy thí nghiệm", exact: true })
    .click();
  await expect(page.getByText("Đạt một phần", { exact: true })).toBeVisible();
  await page.getByText("Điện trở", { exact: true }).click();
  await page.getByLabel("Giá trị linh kiện").fill("350");
  await page
    .getByRole("button", { name: "Chạy thí nghiệm", exact: true })
    .click();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Lưu thí nghiệm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Đã lưu vào hồ sơ" }),
  ).toBeVisible();
});
test("chemistry: stoichiometric reaction has no excess", async ({ page }) => {
  requireReleased("chemistry");
  await page.goto("/labs/chemistry");
  await page
    .getByRole("button", { name: "Chạy thí nghiệm", exact: true })
    .click();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
  await expect(page.getByText("Sản phẩm: 0.1 mol")).toBeVisible();
});
test("eye: interact and name eight parts without camera", async ({ page }) => {
  requireReleased("eye");
  await page.goto("/labs/eye");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Kiểm tra tên gọi", exact: true })
    .click();
  const names = [
    "Giác mạc",
    "Thủy dịch",
    "Đồng tử",
    "Thể thủy tinh",
    "Dịch kính",
    "Võng mạc",
    "Dây thần kinh thị giác",
    "Củng mạc",
  ];
  for (let i = 0; i < names.length; i++) {
    await page
      .getByRole("button", { name: "#" + (i + 1), exact: true })
      .click();
    await page
      .getByPlaceholder("Nhập tên bộ phận bằng tiếng Việt")
      .fill(names[i]);
  }
  await page.getByRole("button", { name: "Chấm tên bộ phận" }).click();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
  await expect(page.getByText("/ 100 điểm")).toBeVisible();
});
test("an unreleased lab shows the release notice instead of the workspace", async ({ page }) => {
  const unreleased = ["circuit", "chemistry", "eye"].find((id) => !releasedLabs.includes(id));
  test.skip(!unreleased, "Every flagship lab is released in this database");
  await page.goto("/labs/" + unreleased);
  await expect(page.getByRole("heading", { name: "Phòng thực hành chưa được phát hành" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chạy thí nghiệm", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Quay lại danh sách" }).click();
  await expect(page).toHaveURL(/\/labs$/);
});
test("mobile dashboard has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Chào An", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
