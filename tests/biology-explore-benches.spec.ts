import { expect, test, type Page } from "@playwright/test";
import { fl26Config } from "../src/features/labs/biology/genetics/labs/fl-26.config";
import { fl20Config } from "../src/features/labs/biology/ecology/labs/fl-20.config";
import { fl21Config } from "../src/features/labs/biology/ecology/labs/fl-21.config";
import { fl27Config } from "../src/features/labs/biology/molecular/labs/fl-27.config";
import { fl16Config } from "../src/features/labs/biology/anatomy/labs/fl-16.config";

// The five Sinh học Explore benches (FL-26 k8-garden, FL-20/FL-21 k8-diorama, FL-27 k7-molecular, FL-16 anatomy):
// each opens from its pinned config with a visual bench, a right column with controls and the journal, reacts to
// the controls, saves a journal line and never creates a run or attempt. Screenshots go to test-results/biology-explore.
const SHOTS = "test-results/biology-explore";
const configs = [fl26Config, fl20Config, fl21Config, fl27Config, fl16Config] as Array<{ labId: string; kit: string; engine: string; title: string }>;
const row = (config: (typeof configs)[number]) => ({
  id: config.labId, title: config.title, mode: "explore",
  explore: { ok: true, kit: config.kit, engine: config.engine, activity: { id: `pav-${config.labId}`, key: `${config.labId}-a`, version: 1, digest: "d" }, config },
});

async function signIn(page: Page) {
  const user = { id: "u-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 9, mustChangePassword: false };
  const requests: string[] = [];
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) requests.push(request.url()); });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...user, emailVerifiedAt: null, createdAt: new Date().toISOString(),
    avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "light", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: configs.map(row) }));
  return requests;
}

async function open(page: Page, labId: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const requests = await signIn(page);
  await page.goto(`/labs/${labId}`);
  await page.getByRole("dialog").getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
  const aside = page.getByRole("complementary", { name: /^Bảng điều khiển/ });
  await expect(aside).toBeVisible();
  await expect(page.getByTestId("explore-draft-badge")).toHaveText("Bản nháp · chờ duyệt");
  return { aside, requests, journal: page.getByTestId("explore-journal") };
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function saveJournal(page: Page, note: string) {
  const journal = page.getByTestId("explore-journal");
  await journal.getByLabel("Ghi chú quan sát").fill(note);
  await journal.getByRole("button", { name: "Lưu trạng thái này vào nhật ký" }).click();
  await expect(journal.locator(".explore-journal-list li").first()).toContainText(note);
}

test("FL-26 k8-garden: garden P → G → F1, flip the Punnett board, ratios 1:2:1 and 3:1", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-26-explore");
  await expect(page.getByTestId("mendel-garden")).toBeVisible();
  const board = page.getByTestId("punnett-board");
  await expect(board.getByRole("button")).toHaveCount(4);
  await shot(page, "fl-26-before");
  await expect(page.getByRole("button", { name: "Lưu trạng thái này vào nhật ký" })).toBeDisabled();
  for (const cell of await board.getByRole("button").all()) await cell.click();
  await expect(page.getByTestId("mendel-ratio")).toContainText("1 : 2 : 1");
  await expect(page.getByTestId("mendel-ratio")).toContainText("3 : 1");
  await expect(board.getByRole("button", { name: /Aa, hoa tím/ })).toHaveCount(2);
  await shot(page, "fl-26-revealed");
  await saveJournal(page, "Aa × Aa cho 3 tím : 1 trắng");
  await aside.getByLabel("Cặp lai").selectOption({ label: "AA × aa" });
  await expect(page.getByTestId("mendel-progress")).toHaveText("Đã lật 0/4 ô");
  expect(requests).toEqual([]);
});

test("FL-20 k8-diorama: the pond and graph follow the temperature", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-20-explore");
  await expect(page.getByTestId("diorama-page")).toBeVisible();
  await expect(aside.getByTestId("tolerance-zone")).toContainText("trong vùng sống");
  await shot(page, "fl-20-3d");
  await aside.getByRole("slider").fill("480");
  await expect(aside.getByTestId("tolerance-zone")).toContainText("trên giới hạn trên");
  await aside.getByLabel("Hiện giới hạn chịu đựng trên đồ thị").check();
  await page.getByRole("button", { name: "2D" }).click();
  await expect(page.locator(".eco-pond[data-fish='gone']").first()).toBeVisible();
  await shot(page, "fl-20-2d");
  await saveJournal(page, "Nóng quá cá không sống được");
  expect(requests).toEqual([]);
});

test("FL-21 k8-diorama: removing a species marks the effects on the web", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-21-explore");
  await aside.getByRole("button", { name: "Rắn" }).click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Chuỗi thức ăn bị đứt");
  await shot(page, "fl-21-3d");
  await page.getByRole("button", { name: "2D" }).click();
  await expect(page.locator(".fw-node[data-species='ran'][data-removed='true']")).toBeVisible();
  await expect(page.locator(".fw-node[data-effect='INCREASE']").first()).toBeVisible();
  await shot(page, "fl-21-2d");
  await saveJournal(page, "Bỏ rắn thì ếch tăng");
  expect(requests).toEqual([]);
});

test("FL-27 k7-molecular: DNA → mRNA → polypeptide follows the chosen variant", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-27-explore");
  await expect(page.locator(".molecular-codons li[data-mutated='true']")).toHaveCount(1);
  await shot(page, "fl-27-3d");
  await aside.getByLabel("Biến thể gene").selectOption({ index: 1 });
  await expect(aside.getByTestId("mutation-effect")).toContainText("vô nghĩa");
  await page.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("k7-diagram-2d")).toBeVisible();
  await shot(page, "fl-27-2d");
  await saveJournal(page, "Codon dừng sớm");
  expect(requests).toEqual([]);
});

test("FL-16 anatomy: the eye shows where the image forms as the lens power changes", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-16-explore");
  await expect(aside.getByTestId("eye-power")).toContainText("D");
  await expect(aside.getByTestId("eye-image-status")).toContainText("sau võng mạc");
  await shot(page, "fl-16-3d");
  await aside.getByRole("slider").first().fill("20");
  await expect(aside.getByTestId("eye-image-status")).toContainText("trên võng mạc");
  await page.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("eye-diagram-2d")).toBeVisible();
  await shot(page, "fl-16-2d");
  await saveJournal(page, "Điều tiết tới 20 D thì ảnh rõ");
  expect(requests).toEqual([]);
});
