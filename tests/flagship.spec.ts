import { test, expect } from "@playwright/test";
const testPassword = process.env.SEED_PASSWORD;
if (!testPassword) throw new Error("Set SEED_PASSWORD to the password configured by the backend seed.");
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("student@nexalab.local");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(testPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chào An, cùng khám phá nhé!" }),
  ).toBeVisible();
});
test("circuit: open → overload → safe, hint and saved experiment", async ({
  page,
}) => {
  await page
    .getByRole("link", { name: "Bắt đầu khám phá", exact: true })
    .click();
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
  await page.goto("/labs/chemistry");
  await page
    .getByRole("button", { name: "Chạy thí nghiệm", exact: true })
    .click();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
  await expect(page.getByText("Sản phẩm: 0.1 mol")).toBeVisible();
});
test("eye: interact and name eight parts without camera", async ({ page }) => {
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
test("mobile dashboard has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Chào An, cùng khám phá nhé!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
