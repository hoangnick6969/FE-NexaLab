import { type Page } from "@playwright/test";
import { test } from "@playwright/test";
import { accounts, expect, studentLogin } from "./fixtures/live";

// SAI-01 T5/T6: the SPEC success-signal journey on a real FE → API → database. Run it against an isolated API started
// with APP_ENV=development STUDENT_AI_PROVIDER=fake STUDENT_AI_LLM_ENABLED=true (TEST_WEB points to a Vite whose
// VITE_API_PROXY targets that API). Skips unless SAI01_LIVE=true, so it never writes to a shared database by accident.
test.beforeAll(() => {
  test.skip(process.env.SAI01_LIVE !== "true", "Set SAI01_LIVE=true with an isolated API using the fake tutor provider");
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_STUDENT_PASSWORD)");
});

async function submit(page: Page) {
  const response = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/attempts$/.test(r.url()));
  await page.getByRole("button", { name: "Chạy thí nghiệm" }).click();
  const body = await (await response).json();
  // The hint panel sits in the collapsible result column.
  const result = page.locator("summary", { hasText: "Kết quả mô phỏng" });
  if (!(await page.getByTestId("legacy-hint-panel").isVisible())) await result.click();
  return body.attempt as { id: string; verdict: string; simulationResult: { status: string } };
}

async function askHint(page: Page) {
  const panel = page.getByTestId("legacy-hint-panel");
  const response = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/attempts\/[^/]+\/hint$/.test(r.url()));
  await panel.getByRole("button", { name: "Nhận gợi ý" }).click();
  const hint = await (await response).json();
  await expect(panel).toContainText(`MỨC ${hint.level} / 4`);
  return { panel, hint };
}

const retry = (page: Page) => page.getByRole("button", { name: "Thử lại để hiểu rõ hơn" }).click();
async function setResistor(page: Page, ohms: number) {
  await page.getByRole("combobox", { name: "Linh kiện", exact: true }).selectOption({ label: "2. Điện trở" });
  await page.getByRole("spinbutton", { name: "Giá trị linh kiện" }).fill(String(ohms));
}

test("SAI-01 success signal: legacy circuit hints climb only after a changed run, an AI question at level 3, none after passing", async ({ browser }) => {
  test.setTimeout(120000);
  const page = await studentLogin(browser);
  await page.goto("/labs/circuit?assignmentId=pilot-a-circuit-assignment");
  await page.getByTestId("lab-session-start").click();
  const discard = page.getByRole("button", { name: "Bỏ bản nháp" });
  if (await discard.isVisible().catch(() => false)) await discard.click();

  // 1. The pack starts with a safe loop; removing a wire opens it → level 1 template, rules only.
  await page.getByRole("button", { name: "Xóa dây 3" }).click();
  const open = await submit(page);
  expect(open.simulationResult.status).toBe("OPEN_CIRCUIT");
  const h1 = await askHint(page);
  expect(h1.hint).toMatchObject({ level: 1, escalated: false, provider: "rules" });
  expect(Object.keys(h1.hint).sort()).toEqual(["attemptId", "content", "createdAt", "escalated", "id", "level", "provider"]);

  // 2. The identical run again → level 1, other wording, and the panel says why.
  await retry(page);
  await submit(page);
  const h1b = await askHint(page);
  expect(h1b.hint).toMatchObject({ level: 1, escalated: false });
  expect(h1b.hint.content).not.toBe(h1.hint.content);
  await expect(h1b.panel.getByTestId("hint-same-level")).toBeVisible();

  // 3. Close the loop with 300 Ω (overloads the LED on 9 V) → level 2.
  await retry(page);
  await page.getByRole("button", { name: "Nối nhanh một vòng theo thứ tự linh kiện" }).click();
  await setResistor(page, 300);
  expect((await submit(page)).simulationResult.status).toBe("LED_OVERLOAD");
  expect((await askHint(page)).hint).toMatchObject({ level: 2, escalated: true, provider: "rules" });

  // 4. Change the resistor (still overloaded) → level 3 with the fake provider's question and the AI chip.
  await retry(page);
  await setResistor(page, 250);
  await submit(page);
  const h3 = await askHint(page);
  expect(h3.hint).toMatchObject({ level: 3, escalated: true, provider: "fake" });
  await expect(h3.panel.getByText("AI", { exact: true })).toBeVisible();
  await h3.panel.screenshot({ path: "test-results/sai01-journey-level3.png" });

  // 5. Another real change → level 4, with the engine's minimum resistance.
  await retry(page);
  await setResistor(page, 200);
  await submit(page);
  const h4 = await askHint(page);
  expect(h4.hint).toMatchObject({ level: 4, escalated: true });
  expect(h4.hint.content).toContain("350 Ω");

  // 6. A safe resistor passes; no hint is offered.
  await retry(page);
  await setResistor(page, 470);
  expect((await submit(page)).verdict).toBe("passed");
  if (!(await page.getByTestId("legacy-hint-panel").isVisible())) await page.locator("summary", { hasText: "Kết quả mô phỏng" }).click();
  await expect(page.getByTestId("legacy-hint-panel")).toContainText("Em đã đạt thử thách này nên không cần gợi ý.");
  await expect(page.getByTestId("legacy-hint-panel").getByRole("button", { name: "Nhận gợi ý" })).toHaveCount(0);
});
