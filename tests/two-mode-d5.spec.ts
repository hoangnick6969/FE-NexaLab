import { expect, test, type Page } from "@playwright/test";
import { fl20Config } from "../src/features/labs/biology/ecology/labs/fl-20.config";

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
  challenges: [{ id: "fl06_001" }],
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

test("D-5: switching away from a Guided run preserves its recorded progress", async ({ page }) => {
  const requests = await signIn(page, [twoModeRow]);
  await page.route("**/api/labs/lever-equilibrium/runs", (route) => route.fulfill({ json: {
    contract: "lab-contract/1", runId: "d5-guided-run", labId: "lever-equilibrium", challengeId: "fl06_001",
    modelRef: "lever-bench@1.0.0", engineVersion: "1.0.0", rendererKey: "lever-bench",
    activityVersionId: "lever-guided-v1", activityVersion: 1, rubricVersion: "lever-investigation@1.0.0",
    stateSchemaVersion: 1, evidenceSchemaVersion: 1, constraints: {}, initialState: null, expiresAt: null,
    context: "FOUNDATIONAL", assignmentId: null, versionBinding: "RELEASE_ACTIVE",
  } }));
  const events: unknown[] = [];
  await page.route("**/api/lab-runs/d5-guided-run/events", (route) => {
    if (route.request().method() === "POST") events.push(route.request().postDataJSON().event);
    return route.fulfill({ json: { events, observation: null } });
  });
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

  await page.getByRole("button", { name: "Bắt đầu thí nghiệm" }).click();
  for (const [position, answer] of [["bên trái", "Nghiêng trái"], ["tại o", "Nằm ngang"], ["bên phải", "Nghiêng phải"]]) {
    await page.getByRole("group", { name: `Dự đoán ${position}`, exact: true }).getByRole("radio", { name: answer }).check();
  }
  await page.getByRole("button", { name: "Ghi dự đoán" }).click();
  await expect(page.getByRole("heading", { name: "A · Quan sát ba vị trí" })).toBeVisible();
  await toggle.getByRole("link", { name: "Khám phá tự do" }).click();
  await enter(page);
  await expect(page.getByTestId("lever-explore")).toBeVisible();
  await toggle.getByRole("link", { name: "Có hướng dẫn" }).click();
  await expect(page.getByRole("heading", { name: "A · Quan sát ba vị trí" })).toBeVisible();
  expect(events).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/labs/lever-equilibrium/runs"))).toHaveLength(1);
});

test("D-5: an Explore error does not advertise a second mode or stop Guided", async ({ page }) => {
  await signIn(page, [{ ...twoModeRow, explore: { ok: false, code: "EXPLORE_VERSION_MISSING" } }]);
  await page.goto("/labs/lever-equilibrium?mode=explore");
  await expect(page.getByTestId("lever-explore")).toHaveCount(0);
  await expect(page.getByTestId("lab-mode-switch")).toHaveCount(0);
});

test("The library exposes every published lab and offers working links for each available mode", async ({ page }) => {
  const physicsExplore = ["liquid-pressure", "heat-transfer", "light-refraction", "thin-lens", "mechanical-energy"];
  await signIn(page, [
    twoModeRow,
    { id: "buoyancy", title: "Lực đẩy Ác-si-mét", grade: 8, mode: "guided", modes: ["guided"] },
    { id: "ecology-tolerance", title: "Giới hạn sinh thái", grade: 8, mode: "guided", modes: ["guided"] },
    { id: fl20Config.labId, title: fl20Config.title, grade: 8, mode: "explore", modes: ["explore"], explore: { ok: true, kit: fl20Config.kit, engine: fl20Config.engine, activity, config: fl20Config } },
    ...physicsExplore.map((id) => ({ id, title: id, mode: "explore" })),
    { id: "new-published-lab", title: "Bài mới đã phát hành", grade: 9, mode: "guided" },
  ]);
  await page.goto("/labs");
  await expect(page.locator(".lab-library-item")).toHaveCount(9);
  for (const id of physicsExplore) {
    await expect(page.locator(`#lab-${id} a.lab-card`)).toHaveAttribute("href", `/labs/${id}`);
  }
  await expect(page.locator("#lab-new-published-lab")).toContainText("Bài mới đã phát hành");
  const lever = page.locator("#lab-lever-equilibrium").getByTestId("lab-mode-row");
  await expect(lever.getByRole("link", { name: "Có hướng dẫn" })).toHaveAttribute("href", "/labs/lever-equilibrium");
  await expect(lever.getByRole("link", { name: /Khám phá tự do/ })).toHaveAttribute("href", "/labs/lever-equilibrium?mode=explore");
  const ecology = page.locator("#lab-ecology-tolerance").getByTestId("lab-mode-row");
  await expect(ecology.getByRole("link", { name: "Có hướng dẫn" })).toHaveAttribute("href", "/labs/ecology-tolerance");
  await expect(ecology.getByRole("link", { name: /Khám phá tự do/ })).toHaveAttribute("href", "/labs/fl-20-explore");
  const buoyancy = page.locator("#lab-buoyancy");
  await expect(buoyancy).toContainText("Mở bài thực hành");
  await expect(buoyancy.getByTestId("lab-mode-row")).toHaveCount(0);
});
