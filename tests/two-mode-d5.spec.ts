import { expect, test, type Page } from "@playwright/test";

// lab-two-mode-d5-spec.md (D-5): a Guided Lab with Explore attached on the same Lab ID. The `GET /labs` row declares
// `mode: "guided"` and `modes: ["guided", "explore"]`; Guided opens by default, `?mode=explore` and the header switch open Explore,
// /labs shows one card with a "2 chế độ" badge. Uses FL-06 on `lever-equilibrium` (D1-3.3).
const activity = { id: "pav-lever-d5", key: "lever-equilibrium-explore", version: 1, digest: "d" };
const config = {
  schema: "k5-lever-config/1", labId: "lever-equilibrium", catalogId: "FL-06", configVersion: 1,
  kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", fixtureId: "lever-bench-reference-v1",
  title: "Moment lực và đòn bẩy", contextLabel: "Vật lý 8 · Khám phá đòn bẩy",
  outcomeSummary: ["Nhận biết tác dụng làm quay của lực qua moment lực M = F × d.", "Tìm điều kiện để đòn bẩy nằm cân bằng."],
  safetyBriefing: { simulation: ["Đây là mô hình lý tưởng."], realLab: ["Treo quả nặng nhẹ tay."], acknowledgeRequired: false },
  limitations: ["Thanh cứng, khối lượng thanh được bỏ qua."],
  modes: { explore: true },
  enabledApparatus: [
    { id: "bar", kind: "lever_bar", slot: "bench", labelVi: "Thanh đòn" },
    { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng" },
    { id: "gauge", kind: "spring_gauge", slot: "hook", labelVi: "Lực kế" },
  ],
  weights: { availableMilliNewtons: [500, 1000, 2000], maxCount: 4 },
  initialAttachments: [{ kind: "WEIGHT", positionMillimetres: -100, forceMilliNewtons: 1000 }],
  measurements: ["ruler", "force_labels", "moment_table"],
  pedagogy: { observationPrompts: [{ id: "balance", kind: "free_text", textVi: "Tìm ít nhất hai cách để thanh nằm ngang.", challenge: true }] },
  review: { status: "draft" },
};
const twoModeRow = { id: "lever-equilibrium", title: "Moment lực và đòn bẩy", grade: 8, mode: "guided", modes: ["guided", "explore"],
  explore: { ok: true, kit: "k5-lever-bench@1", engine: "lever-bench@1.0.0", activity, config } };

async function signIn(page: Page, rows: unknown[]) {
  const user = { id: "u-1", username: "student.active", email: null, fullName: "Nguyễn An", role: "STUDENT", grade: 8, mustChangePassword: false };
  const requests: string[] = [];
  page.on("request", (request) => { if (/\/api\/(attempts|lab-runs|labs\/[^/]+\/runs)/.test(request.url())) requests.push(request.url()); });
  // Anything the Guided page asks for that this test does not mock answers 404 instead of reaching a real server.
  await page.route("**/api/**", (route) => route.fulfill({ status: 404, json: { code: "NOT_MOCKED" } }));
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ json: { user, accessToken: "test-token" } }));
  await page.route("**/api/me/profile", (route) => route.fulfill({ json: { ...user, emailVerifiedAt: null, createdAt: new Date().toISOString(),
    avatarUpdatedAt: null, avatarUrl: null, canEditName: false, preferences: { theme: "system", locale: "vi" } } }));
  await page.route("**/api/me/notifications/unread-count", (route) => route.fulfill({ json: { count: 0 } }));
  await page.route("**/api/tutor/**", (route) => route.fulfill({ json: { provider: "rules", enabled: false } }));
  await page.route("**/api/labs", (route) => route.fulfill({ json: rows }));
  return requests;
}
const enter = (page: Page) => page.getByRole("dialog").getByRole("button", { name: /Vào bàn thí nghiệm|Quay lại bàn thí nghiệm/ }).click();

test("D-5: ?mode=explore opens the Explore bench on the Guided Lab ID with the header switch; default stays Guided", async ({ page }) => {
  const requests = await signIn(page, [twoModeRow]);
  await page.goto("/labs/lever-equilibrium?mode=explore");
  await enter(page);
  await expect(page.getByTestId("lever-explore")).toHaveAttribute("data-kit", "k5-lever-bench@1");
  const toggle = page.getByTestId("lab-mode-switch");
  await expect(toggle.getByRole("link", { name: "Khám phá tự do" })).toHaveAttribute("aria-current", "page");
  await expect(toggle.getByRole("link", { name: "Có hướng dẫn" })).toHaveAttribute("href", "/labs/lever-equilibrium");
  await toggle.getByRole("link", { name: "Có hướng dẫn" }).click();
  await expect(page).toHaveURL(/\/labs\/lever-equilibrium$/);
  await expect(page.getByTestId("lever-explore")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("D-5: an Explore error on a two-mode row falls back to Guided for students (the server already drops the Explore part)", async ({ page }) => {
  await signIn(page, [{ ...twoModeRow, modes: ["guided"], explore: undefined }]);
  await page.goto("/labs/lever-equilibrium?mode=explore");
  await expect(page.getByTestId("lever-explore")).toHaveCount(0);
  await expect(page.getByTestId("lab-mode-switch")).toHaveCount(0);
});

test("D-5: /labs shows one card with the 2-mode badge and an Explore chip on the same Lab ID", async ({ page }) => {
  await signIn(page, [twoModeRow]);
  await page.goto("/labs");
  const chip = page.locator('a.lab-mode-chip[href="/labs/lever-equilibrium?mode=explore"]');
  await expect(chip).toHaveCount(1);
  await expect(page.locator(".lab-modes-badge").first()).toBeVisible();
});
