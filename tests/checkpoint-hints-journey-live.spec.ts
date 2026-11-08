import { type Page } from "@playwright/test";
import { test } from "@playwright/test";
import { accounts, expect, studentLogin } from "./fixtures/live";

// SAI-01A T4: the SPEC success-signal journey on the real FE → API → database (FL-21 released to the shared
// library). student.active submits FL-21 five times in one LabRun; the hint ladder must follow BR-06 and the
// verdicts must not depend on hints (FR-22).
test.beforeAll(() => {
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_STUDENT_PASSWORD)");
});

type Hunt = "Tăng lên" | "Giảm đi" | "Không bị ảnh hưởng trực tiếp";
const RIGHT_EXPLANATION = /mất rắn thì con mồi/;
const WRONG_EXPLANATION = /rắn là sinh vật sản xuất/;

async function playAndSubmit(page: Page, hunt: Hunt, explanation: RegExp) {
  const act = page.getByTestId("fw-act");
  const node = (id: string) => page.locator(`.fw-node[data-species="${id}"]`);
  const roles = page.getByTestId("fw-answer-roles");
  await roles.getByRole("group", { name: "Cỏ" }).getByLabel("Sản xuất").check();
  await roles.getByRole("group", { name: "Ếch" }).getByLabel("Tiêu thụ").check();
  await roles.getByRole("group", { name: "Nấm, vi khuẩn" }).getByLabel("Phân giải").check();
  await roles.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  for (const id of ["co", "chau-chau", "ech", "ran"]) await node(id).click();
  await page.getByTestId("fw-check-chain").click();
  await page.getByTestId("fw-next").click();
  const energy = page.getByTestId("fw-answer-energy");
  await energy.getByLabel("Năng lượng (kJ)").fill("10");
  await energy.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await page.getByTestId("fw-answer-hunt").getByLabel(hunt, { exact: true }).click();
  await act.click();
  await page.getByTestId("fw-answer-deforest").getByLabel("Giảm đi", { exact: true }).click();
  await act.click();
  const causes = page.getByTestId("fw-answer-causes");
  for (const name of ["Phá rừng", "Săn bắt động vật hoang dã", "Khai thác tài nguyên quá mức", "Xả chất thải gây ô nhiễm"]) await causes.getByLabel(name).check();
  await causes.getByRole("button", { name: "Ghi câu trả lời" }).click();
  await act.click();
  await page.getByRole("radio", { name: explanation }).click();
  const submitted = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/attempts$/.test(r.url()));
  await page.getByTestId("lab-run-submit").click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  const { attempt } = await response.json();
  return attempt as { id: string; verdict: string; simulationResult: { assessment: { score: number; unmetCriteria: string[] } } };
}

async function askHint(page: Page) {
  const panel = page.locator("section.tutor-panel");
  const answered = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/attempts\/[^/]+\/hint$/.test(r.url()));
  await panel.getByRole("button", { name: "Nhận gợi ý" }).click();
  const response = await answered;
  expect(response.status()).toBe(201);
  const hint = await response.json();
  await expect(panel).toContainText(hint.content);
  return { panel, hint };
}

async function tryAgain(page: Page) {
  await page.getByRole("button", { name: "Thử lại để hiểu rõ hơn" }).click();
  await expect(page.getByTestId("fw-answer-roles")).toBeVisible();
}

test("SAI-01A success signal: FL-21 hint ladder climbs only on a changed answer and never changes the verdict", async ({ browser }) => {
  test.setTimeout(240000);
  const page = await studentLogin(browser);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/labs/food-web");
  await page.getByTestId("lab-session-start").click();
  const discard = page.getByRole("button", { name: "Bỏ bản nháp" });
  if (await discard.isVisible().catch(() => false)) await discard.click();
  await expect(page.getByTestId("fw-stage")).toBeVisible();

  // 1. HUNT = DECREASE and the wrong explanation → level 1 about HUNT, worded for FW_ALL_DECREASE.
  const first = await playAndSubmit(page, "Giảm đi", WRONG_EXPLANATION);
  expect(first.verdict).not.toBe("passed");
  expect(first.simulationResult.assessment.unmetCriteria).toEqual(expect.arrayContaining(["prediction:HUNT", "explanation"]));
  const h1 = await askHint(page);
  expect(h1.hint).toMatchObject({ level: 1, criterion: "prediction:HUNT", escalated: false, provider: "rules" });
  await expect(h1.panel).toContainText("Mức 1/4 · Câu hỏi gợi mở");
  await expect(h1.panel).toContainText("Mất rắn có làm ếch thiếu thức ăn không, hay chỉ làm ếch bớt bị ăn?");
  await expect(h1.panel).not.toContainText(/ếch (sẽ )?tăng/i);
  await h1.panel.screenshot({ path: "test-results/sai01a-journey-1.png" });

  // 2. The same answers again → still level 1, the other wording, escalated false.
  await tryAgain(page);
  const second = await playAndSubmit(page, "Giảm đi", WRONG_EXPLANATION);
  expect(second.simulationResult.assessment.score).toBe(first.simulationResult.assessment.score);
  const h2 = await askHint(page);
  expect(h2.hint).toMatchObject({ level: 1, criterion: "prediction:HUNT", escalated: false, repeatReason: "SAME_ANSWER" });
  expect(h2.hint.content).not.toBe(h1.hint.content);
  await expect(h2.panel).toContainText("Em giữ nguyên câu trả lời ở bước này");

  // 3. A changed but still wrong HUNT → level 2.
  await tryAgain(page);
  await playAndSubmit(page, "Không bị ảnh hưởng trực tiếp", WRONG_EXPLANATION);
  const h3 = await askHint(page);
  expect(h3.hint).toMatchObject({ level: 2, criterion: "prediction:HUNT", escalated: true });
  await expect(h3.panel).toContainText("Mức 2/4 · Gợi ý khái niệm");

  // 4. HUNT right → the next hint is about the explanation, level 1.
  await tryAgain(page);
  const fourth = await playAndSubmit(page, "Tăng lên", WRONG_EXPLANATION);
  expect(fourth.simulationResult.assessment.unmetCriteria).toEqual(["explanation"]);
  const h4 = await askHint(page);
  expect(h4.hint).toMatchObject({ level: 1, criterion: "explanation" });

  // 5. Passing hides the hint panel.
  await tryAgain(page);
  const fifth = await playAndSubmit(page, "Tăng lên", RIGHT_EXPLANATION);
  expect(fifth.verdict).toBe("passed");
  expect(fifth.simulationResult.assessment.unmetCriteria).toEqual([]);
  await expect(page.locator("section.tutor-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nhận gợi ý" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/sai01a-journey-passed.png" });
});
