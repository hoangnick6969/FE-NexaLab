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
  // Owner 2026-11-16: the five configs are `review.status: "reviewed"`, so no draft badge.
  await expect(page.getByTestId("explore-draft-badge")).toHaveCount(0);
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
  // 3D garden where WebGL works (K8 stage), the 2D garden otherwise or on the toggle.
  if (await page.getByRole("button", { name: "2D" }).isVisible()) {
    await expect(page.getByTestId("mendel-garden-3d")).toBeVisible();
    await page.getByRole("button", { name: "2D" }).click();
  }
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
  await aside.getByRole("button", { name: "Rắn", exact: true }).click();
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
  await aside.getByRole("button", { name: "Đèn chiếu & điều tiết" }).click();
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

test("the /labs cards of the Explore benches show their related lesson links", async ({ page }) => {
  await signIn(page);
  // GET /labs as the server answers it: each Explore Lab is linked to a released lesson of its topicCode (BE PR #83).
  const lessons: Record<string, { lessonId: string; title: string; topicCode: string }> = {
    "fl-26-explore": { lessonId: "pack-khtn9-l41-dot-bien-gene-v1", title: "Đột biến gene", topicCode: "KHTN9-CH11-T01" },
    "fl-27-explore": { lessonId: "pack-khtn9-l41-dot-bien-gene-v1", title: "Đột biến gene", topicCode: "KHTN9-CH11-T01" },
    "fl-20-explore": { lessonId: "lesson-khtn8-l41", title: "Môi trường và các nhân tố sinh thái", topicCode: "KHTN8-L41" },
    "fl-21-explore": { lessonId: "lesson-khtn8-l44", title: "Hệ sinh thái", topicCode: "KHTN8-L44" },
    "fl-16-explore": { lessonId: "lesson-khtn8-l37", title: "Hệ thần kinh và các giác quan ở người", topicCode: "KHTN8-L37" },
  };
  await page.route("**/api/labs", (route) => route.fulfill({ json: configs.map((config) => ({ ...row(config), topicCode: lessons[config.labId].topicCode, lessonLinks: [lessons[config.labId]] })) }));
  await page.goto("/labs");
  for (const [id, lesson] of Object.entries(lessons)) {
    const card = page.locator(`#lab-${id}`);
    await expect(card.getByText("Bài học liên quan:")).toBeVisible();
    await expect(card.getByRole("link", { name: lesson.title })).toHaveAttribute("href", new RegExp(`/lessons/${lesson.lessonId}`));
  }
  await expect(page.locator("#lab-fl-26-explore img")).toHaveAttribute("src", /fl-26-explore|image\/svg\+xml/);
});

test("FL-16 studio: structure, label and free light stations", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-16-explore");
  await page.getByRole("button", { name: "2D" }).click();
  await expect(page.getByTestId("eye-parts-2d")).toBeVisible();
  await aside.getByTestId("eye-part-chips").getByRole("button", { name: "Võng mạc" }).click();
  await expect(aside.getByTestId("eye-part-info")).toContainText("cảm thụ ánh sáng");
  await aside.getByRole("button", { name: "Gắn thẻ tên" }).click();
  await aside.getByTestId("eye-label-chips").getByRole("button", { name: "Thủy dịch" }).click();
  await expect(aside.getByTestId("eye-label-feedback")).toContainText("Chưa đúng");
  await aside.getByTestId("eye-label-chips").getByRole("button", { name: "Giác mạc" }).click();
  await expect(aside.getByTestId("eye-label-feedback")).toContainText("Đúng: Giác mạc");
  await aside.getByRole("button", { name: "Đèn chiếu & điều tiết" }).click();
  await aside.getByLabel("Kịch bản").selectOption("free");
  await aside.getByRole("slider").first().fill("0");
  await expect(aside.getByTestId("eye-distance")).toHaveText("10 cm");
  await expect(aside.getByTestId("eye-reach")).toContainText("cần kính hội tụ");
  expect(requests).toEqual([]);
});

test("FL-27 editor: a free point mutation fills the comparison table", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-27-explore");
  await aside.getByRole("button", { name: "Tự tạo đột biến" }).click();
  await expect(aside.getByRole("button", { name: /^Vị trí 1: A/ })).toBeDisabled();
  await aside.getByRole("button", { name: /^Vị trí 6: C/ }).click();
  await aside.getByRole("button", { name: "T", exact: true }).click();
  await expect(aside.getByTestId("mutation-effect")).toContainText("im lặng");
  await aside.getByRole("button", { name: /^Vị trí 12: G/ }).click();
  await aside.getByRole("button", { name: "A", exact: true }).click();
  await expect(aside.getByTestId("mutation-effect")).toContainText("vô nghĩa");
  await expect(aside.getByTestId("mutation-trials").locator("tbody tr")).toHaveCount(2);
  expect(requests).toEqual([]);
});

test("FL-21 chain builder: the model checks each link and gives the energy per level", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-21-explore");
  await aside.getByRole("button", { name: "Săn bắt rắn" }).click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Ếch");
  await aside.getByRole("button", { name: "Dựng chuỗi & năng lượng" }).click();
  await page.getByRole("button", { name: "2D" }).click();
  for (const id of ["co", "chau-chau", "ech", "ran"]) await page.locator(`.fw-node[data-species='${id}']`).click();
  await expect(aside.getByTestId("fw-chain-status")).toContainText("Chuỗi hợp lệ · 4 bậc");
  await expect(aside.getByTestId("fw-energy")).toContainText("10 kJ");
  expect(requests).toEqual([]);
});

test("FL-20 data table and import comparison", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-20-explore");
  for (const value of ["30", "250", "450"]) {
    await aside.getByRole("slider").fill(value);
    await aside.getByTestId("tolerance-record").click();
  }
  await expect(aside.getByTestId("tolerance-readings").locator("tbody tr")).toHaveCount(3);
  await expect(aside.getByTestId("tolerance-bracket")).toContainText("giữa 3,0 °C và 25,0 °C");
  await aside.getByRole("button", { name: "Chọn cá nhập nội" }).click();
  await aside.getByRole("button", { name: "Cá B" }).click();
  await aside.getByTestId("import-check").click();
  await expect(aside.getByTestId("import-verdict")).toContainText("khớp");
  expect(requests).toEqual([]);
});

test("/labs folds an Explore mode into its Guided card, and the Lab page switches mode", async ({ page }) => {
  await signIn(page);
  const guided = (id: string, title: string) => ({ id, title, mode: "guided", learningObjective: title });
  await page.route("**/api/labs", (route) => route.fulfill({ json: [...configs.map(row), guided("food-web", "Lưới thức ăn"), guided("eye-optics", "Mắt và điều tiết")] }));
  await page.goto("/labs");
  await expect(page.locator("#lab-food-web")).toBeVisible();
  await expect(page.locator("#lab-fl-21-explore")).toHaveCount(0);
  await expect(page.locator("#lab-fl-16-explore")).toHaveCount(0);
  // FL-20/FL-27 have no Guided row here, so their Explore cards stay; FL-26 is Explore only.
  await expect(page.locator("#lab-fl-20-explore")).toBeVisible();
  await expect(page.locator("#lab-fl-26-explore")).toBeVisible();
  const modes = page.locator("#lab-food-web").getByTestId("lab-mode-row");
  await expect(modes.getByRole("link", { name: "Có hướng dẫn" })).toHaveAttribute("href", "/labs/food-web");
  await modes.getByRole("link", { name: /Khám phá tự do/ }).click();
  await expect(page).toHaveURL(/\/labs\/fl-21-explore$/);
  const switcher = page.getByTestId("lab-mode-switch");
  await expect(switcher.getByRole("link", { name: "Khám phá tự do" })).toHaveAttribute("aria-current", "page");
  await expect(switcher.getByRole("link", { name: "Có hướng dẫn" })).toHaveAttribute("href", "/labs/food-web");
});

// Direct manipulation on the stage (2D views: deterministic pointer geometry). Each drag uses real mouse events.
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}
const centre = async (locator: import("@playwright/test").Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test("direct manipulation · FL-16: drag the object along the axis", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-16-explore");
  await aside.getByRole("button", { name: "Đèn chiếu & điều tiết" }).click();
  await page.getByRole("button", { name: "2D" }).click();
  const handle = page.locator("[data-testid=eye-object-rail] .eye-rail-handle");
  const start = await centre(handle);
  await drag(page, start, { x: start.x - 400, y: start.y });
  await expect(aside.getByLabel("Kịch bản")).toHaveValue("free");
  await expect(aside.getByTestId("eye-distance")).toHaveText("rất xa (vô cực)");
  await drag(page, await centre(handle), { x: start.x + 400, y: start.y });
  await expect(aside.getByTestId("eye-distance")).toHaveText("10 cm");
  expect(requests).toEqual([]);
});

test("direct manipulation · FL-20: drag the thermometer and the limit guesses", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-20-explore");
  await page.getByRole("button", { name: "2D" }).click();
  const grip = page.getByTestId("pond-thermo-drag");
  const box = (await grip.boundingBox())!;
  await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: box.x + box.width / 2, y: box.y - 40 });
  await expect(aside.getByTestId("tolerance-value")).toHaveText("50,0 °C");
  await expect(aside.getByTestId("tolerance-zone")).toContainText("trên giới hạn trên");
  const guessMin = page.getByTestId("eco-guess-min").locator(".eco-guess-grip");
  const from = await centre(guessMin);
  await drag(page, from, { x: from.x - 400, y: from.y });
  await expect(aside.getByTestId("tolerance-guess")).toContainText("0,0 °C – 40,0 °C");
  expect(requests).toEqual([]);
});

test("direct manipulation · FL-21: click to remove, drag arrows to build a chain", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-21-explore");
  await page.getByRole("button", { name: "2D" }).click();
  await page.locator(".fw-node[data-species='ran']").click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Ếch");
  await aside.getByRole("button", { name: "Dựng chuỗi & năng lượng" }).click();
  const node = (id: string) => centre(page.locator(`.fw-node[data-species='${id}']`));
  await drag(page, await node("co"), await node("chau-chau"));
  await drag(page, await node("chau-chau"), await node("ech"));
  await expect(aside.getByTestId("fw-chain-status")).toContainText("Chuỗi hợp lệ · 3 bậc");
  await drag(page, await node("ech"), await node("cao"));
  await expect(aside.getByTestId("fw-chain-status")).toContainText("Đứt ở mắt xích 4");
  expect(requests).toEqual([]);
});

test("direct manipulation · FL-26: click a parent, drop gametes into an F1 pot, click a pot", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-26-explore");
  if (await page.getByRole("button", { name: "2D" }).isVisible()) await page.getByRole("button", { name: "2D" }).click();
  await page.getByTestId("parent-2d-1").click();
  await expect(aside.getByLabel("Cặp lai")).toHaveValue("2");
  await expect(page.getByTestId("garden-note")).toContainText("Aa × aa");
  // Aa × aa: father gametes A, a; mother a, a. Pot 0:0 needs A (father) + a (mother).
  await drag(page, await centre(page.getByTestId("gamete-2d-1-a").first()), await centre(page.getByTestId("pot-2d-0:0")));
  await expect(page.getByTestId("garden-note")).toContainText("Thả tiếp giao tử của bố");
  await drag(page, await centre(page.getByTestId("gamete-2d-0-a")), await centre(page.getByTestId("pot-2d-0:0")));
  await expect(page.getByTestId("garden-note")).toContainText("nhận giao tử A của bố");
  await drag(page, await centre(page.getByTestId("gamete-2d-0-A")), await centre(page.getByTestId("pot-2d-0:0")));
  await expect(page.getByTestId("mendel-progress")).toHaveText("Đã lật 1/4 ô");
  await page.getByTestId("pot-2d-1:1").click();
  await expect(page.getByTestId("mendel-progress")).toHaveText("Đã lật 2/4 ô");
  expect(requests).toEqual([]);
});

test("direct manipulation · FL-27: click a base on the strand, drag a base from the tray", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-27-explore");
  await page.getByRole("button", { name: "2D" }).click();
  await page.getByTestId("k7-slot-coding-8").click();
  await expect(aside.getByRole("button", { name: "Tự tạo đột biến" })).toHaveAttribute("aria-pressed", "true");
  await expect(aside.getByRole("button", { name: /^Vị trí 9: A/ })).toHaveAttribute("aria-pressed", "true");
  await drag(page, await centre(page.getByTestId("tray-T")), await centre(page.getByTestId("k7-slot-coding-5")));
  await expect(aside.getByTestId("mutation-effect")).toContainText("Vị trí 6: C → T");
  await expect(aside.getByTestId("mutation-effect")).toContainText("im lặng");
  await expect(aside.getByTestId("mutation-trials").locator("tbody tr")).toHaveCount(1);
  expect(requests).toEqual([]);
});

test("/labs keeps its filters in the URL and after '← Quay về' from a Lab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/labs");
  await page.getByRole("group", { name: "Môn:" }).getByRole("button", { name: "Sinh học" }).click();
  await expect(page).toHaveURL(/\/labs\?subject=biology$/);
  await page.locator("#lab-fl-26-explore .lab-card").click();
  await page.getByRole("dialog").getByRole("button", { name: "Vào bàn thí nghiệm" }).click();
  await page.getByRole("link", { name: "← Quay về" }).click();
  await expect(page).toHaveURL(/\/labs\?subject=biology$/);
  await expect(page.getByRole("group", { name: "Môn:" }).getByRole("button", { name: "Sinh học" })).toHaveClass(/is-active/);
  await expect(page.locator("#lab-fl-26-explore")).toBeVisible();
});

test("FL-21 Explore: any species but the decomposers can be removed on the board", async ({ page }) => {
  const { aside, requests } = await open(page, "fl-21-explore");
  await page.getByRole("button", { name: "2D" }).click();
  await page.locator(".fw-node[data-species='co']").click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Châu chấu");
  await page.locator(".fw-node[data-species='dai-bang']").click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Rắn");
  await page.locator(".fw-node[data-species='nam-vi-khuan']").click();
  await expect(aside.getByTestId("fw-decomposer-note")).toContainText("sinh vật phân giải");
  await aside.getByRole("button", { name: "Phá rừng" }).click();
  await expect(aside.getByTestId("food-web-effects")).toContainText("Sâu");
  expect(requests).toEqual([]);
});
