import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
const localRun = process.env.TEST_WEB === "http://127.0.0.1:5191" && Boolean(password);
const adminPassword = process.env.NEXALAB_ADMIN_PASSWORD ?? process.env.SEED_PASSWORD;

async function openCatalog(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh", { exact: true }).fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await page.goto("/labs");
}

function catalogCard(page: Page) {
  return page.locator("#lab-lab-safety");
}

for (const username of ["student.active", "student.outsider"]) {
  test(`${username} can open the pinned FL-15 Explore lab and use its local notebook`, async ({ page }) => {
    test.skip(!localRun, "Run against the seeded FL-15 isolated server with an isolated fixture password.");
    await openCatalog(page, username);
    const card = catalogCard(page);
    const cover = card.locator("img");
    const title = card.getByRole("heading", { name: "An toàn phòng thí nghiệm" });
    await expect(title).toBeVisible();
    await cover.scrollIntoViewIfNeeded();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && [image.naturalWidth, image.naturalHeight])).toEqual([1280, 720]);
    await expect(card.getByRole("link", { name: /Sử dụng một số hoá chất, thiết bị cơ bản/ })).toBeVisible();
    const goggles = page.getByTestId("kit-card").filter({ hasText: "Kính bảo hộ" });
    await expect(goggles.getByRole("link", { name: "FL-15" })).toBeVisible();

    const network = await page.context().newCDPSession(page);
    await network.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(title).toBeVisible();

    const apiWrites: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method()) && !path.startsWith("/api/auth/")) {
        apiWrites.push(`${request.method()} ${path}`);
      }
    });
    await card.locator('a[href="/labs/lab-safety"]').click();
    await expect(page).toHaveURL(/\/labs\/lab-safety$/);
    const bench = page.getByTestId("safety-bench");
    await expect(bench).toContainText("Bản nháp đang chờ duyệt an toàn");
    const kitToggle = bench.getByRole("button", { name: /Dụng cụ và thành phần/ });
    await kitToggle.click();
    const kitPanel = page.getByRole("complementary", { name: "Dụng cụ và thành phần" });
    await expect(kitPanel.getByRole("listitem")).toHaveCount(9);
    await expect(kitPanel).toContainText("Độc khi nuốt");
    await kitPanel.getByRole("button", { name: "Thu gọn" }).click();
    await expect(kitPanel).toBeHidden();
    await expect(bench.getByTestId("safety-scene-2d")).toContainText("Chai mất nhãn");
    const answer = bench.getByRole("button", { name: "Để nguyên chai và báo giáo viên" });
    await answer.click();
    if (username === "student.active") {
      const toggle = page.getByTestId("lab-renderer-toggle");
      await toggle.getByRole("button", { name: "3D", exact: true }).click();
      const stage = bench.getByTestId("safety-scene-3d");
      await expect(stage.locator("canvas")).toBeVisible();
      await expect(stage.getByText("Chai mất nhãn", { exact: true })).toBeVisible();
      const desktop = page.viewportSize()!;
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => stage.locator(".safety-bottle-label").evaluateAll(labels => {
        if (labels.length !== 2) return false;
        const [left, right] = labels.map(label => label.getBoundingClientRect());
        return left.right <= right.left || right.right <= left.left || left.bottom <= right.top || right.bottom <= left.top;
      })).toBe(true);
      await page.setViewportSize(desktop);
      await expect(bench.getByTestId("safety-feedback")).toContainText("giáo viên");
      await toggle.getByRole("button", { name: "2D", exact: true }).click();
      await expect(bench.getByTestId("safety-scene-2d")).toBeVisible();
    }
    await bench.getByRole("button", { name: "Đọc nhãn và chú ý cảnh báo" }).click();
    await expect(bench.getByRole("heading", { name: "Đã hoàn thành tình huống" })).toBeVisible();
    await expect(bench.getByTestId("safety-feedback")).toContainText("Độc khi nuốt");

    await bench.locator("summary").click();
    const entries = bench.getByTestId("safety-notebook").getByRole("listitem");
    await expect(entries).toHaveCount(2);
    const downloadReady = page.waitForEvent("download");
    await bench.getByRole("button", { name: "Tải nhật ký" }).click();
    expect((await downloadReady).suggestedFilename()).toBe("lab-safety-observations.json");

    await page.reload({ waitUntil: "domcontentloaded" });
    await bench.locator("summary").click();
    await expect(entries).toHaveCount(2);
    expect(apiWrites).toEqual([]);
  });
}

test("an admin can review the English draft through the local preview", async ({ page }) => {
  test.skip(!localRun || !adminPassword, "Run against the isolated FL-15 server with an admin fixture password.");
  await page.addInitScript(() => localStorage.setItem("nexalab.locale", "en"));
  await page.route("**/api/me/profile", async route => {
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const profile = await response.json();
    await route.fulfill({ response, json: { ...profile, preferences: { ...profile.preferences, locale: "en" } } });
  });
  await page.goto("/login?admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@nexalab.local");
  await page.getByLabel("Password", { exact: true }).fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await page.goto("/dev/lab-kits/safety-review");
  const bench = page.getByTestId("safety-bench");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(bench).toContainText("Draft awaiting safety review");
  await bench.getByRole("button", { name: "Heat a test tube" }).click();
  await bench.getByRole("button", { name: "Use a holder and point the opening away from people" }).click();
  await expect(bench.getByTestId("safety-feedback")).toContainText("reduces their risk of being splashed");
});
