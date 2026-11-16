import { expect, test, type Page } from "@playwright/test";
import { fl14aConfig } from "../src/features/labs/chemistry/wet-bench/labs/fl-14a.config";
import { fl14bConfig } from "../src/features/labs/chemistry/wet-bench/labs/fl-14b.config";
import { fl14cConfig } from "../src/features/labs/chemistry/wet-bench/labs/fl-14c.config";

// K2-3.1: FL-14b (salts) and FL-14c (oxides) open as Explore benches next to FL-14a, which keeps working. No attempt is created.
const student = { id: "student-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
const row = (id: string, title: string, config: { engine: string }) => ({ id, title, mode: "explore", relatedLessons: [],
  explore: { ok: true, kit: "k2-wet-bench@1", engine: config.engine, activity: { id: `pav-${id}`, key: `${id}-explore`, version: 1, digest: "d" }, config } });
const rows = [row("metal-reactivity", "Kim loại tác dụng với acid và dung dịch muối", fl14aConfig), row("salt-reactions", "Phản ứng của muối", fl14bConfig), row("oxide-reactions", "Oxide và acid", fl14cConfig)];

async function openBench(page: Page, labId: string, submits: string[]) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) submits.push(request.url()); });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: rows }));
  await page.goto(`/labs/${labId}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("bản nháp");
  await dialog.getByRole("checkbox", { name: "Em đã đọc lưu ý an toàn" }).check();
  await dialog.getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
  await expect(dialog).toBeHidden();
}
const use = async (page: Page, ...names: string[]) => { for (const name of names) await page.getByRole("button", { name }).first().click(); };

test("the library shows the FL-14b and FL-14c cards with a cover image", async ({ page }) => {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user: student, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...student, emailVerifiedAt: null, createdAt: new Date().toISOString(), avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: rows }));
  await page.goto("/labs");
  for (const id of ["metal-reactivity", "salt-reactions", "oxide-reactions"]) {
    const card = page.locator(`a[href="/labs/${id}"]`).first();
    await expect(card).toBeVisible();
    await expect(card.locator("img").first()).toBeVisible();
  }
});

test("FL-14b: carbonate with acid and silver nitrate with salt, no attempt request", async ({ page }) => {
  const submits: string[] = [];
  await openBench(page, "salt-reactions", submits);
  await use(page, "Ống nhỏ giọt", "Na₂CO₃ 0,1 M", "Ống 1", "HCl 0,1 M", "Ống 1");
  await use(page, "AgNO₃ 0,1 M", "Ống 2", "NaCl 0,1 M", "Ống 2");
  await expect(page.getByText("Sủi bọt khí").first()).toBeVisible();
  await expect(page.getByText("Xuất hiện kết tủa màu trắng").first()).toBeVisible();
  expect(submits).toEqual([]);
});

test("FL-14b: an unreviewed pair is refused with the out-of-scope notice", async ({ page }) => {
  await openBench(page, "salt-reactions", []);
  await use(page, "Ống nhỏ giọt", "Na₂CO₃ 0,1 M", "Ống 1", "AgNO₃ 0,1 M", "Ống 1");
  await expect(page.getByText(/ngoài phạm vi mô hình của bài thực hành FL-14b/).first()).toBeVisible();
});

test("FL-14c: CuO dissolves in sulfuric acid and the solution turns blue, no attempt request", async ({ page }) => {
  const submits: string[] = [];
  await openBench(page, "oxide-reactions", submits);
  await use(page, "Ống nhỏ giọt", "H₂SO₄ loãng 0,1 M", "Ống 1");
  await page.keyboard.press("Escape");
  await use(page, "Thìa lấy hoá chất", "Đồng(II) oxide (CuO), bột đen", "Ống 1");
  await expect(page.getByText(/Chất rắn tan một phần.*dung dịch chuyển sang màu xanh lam/).first()).toBeVisible();
  expect(submits).toEqual([]);
});

test("FL-14a still opens and keeps its own reactions", async ({ page }) => {
  await openBench(page, "metal-reactivity", []);
  await use(page, "Ống nhỏ giọt", "HCl 0,1 M", "Ống 1");
  await page.keyboard.press("Escape");
  await use(page, "Kẹp gắp", "Kẽm (Zn) dạng hạt", "Ống 1");
  await expect(page.getByText("Sủi bọt khí").first()).toBeVisible();
});
