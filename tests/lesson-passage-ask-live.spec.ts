import { test } from "@playwright/test";
import { accounts, call, expect, studentLogin } from "./fixtures/live";

// tutor-chat-rules@5 on the real stack (Vite → API :4000 → shared dev, provider from the API env). student.active
// opens the structured lesson "Acid", highlights the acid table with its KaTeX formulas and asks about it. Leaves
// tutor messages for student.active on shared dev.
const LESSON = "pack-structured-fa3fd242197e7b25c51c26a5fcabdb6720ddcd88-v1";

test.beforeAll(() => {
  test.skip(!accounts.student.password, "Set SEED_FIXTURE_PASSWORD (or TEST_STUDENT_PASSWORD)");
});

test("live: highlight the acid table in a structured lesson and get an AI answer about it", async ({ browser }) => {
  test.setTimeout(90_000);
  const page = await studentLogin(browser, accounts.student);
  let token = "";
  page.on("response", async (response) => {
    if (/\/auth\/(student\/login|refresh)$/.test(response.url()) && response.ok()) token = (await response.json().catch(() => ({})))?.accessToken ?? token;
  });
  await page.goto(`/lessons/${LESSON}`);
  const heading = page.locator(".lesson-structured-content h3", { hasText: "Tìm hiểu khái niệm acid" });
  await expect(heading).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  // Same selection as the owner's screenshot: from the heading through the table with formulas.
  await page.evaluate(() => {
    const h = [...document.querySelectorAll(".lesson-structured-content h3")].find((el) => el.textContent?.includes("Tìm hiểu khái niệm acid"))!;
    const section = h.closest("section")!;
    const body = section.querySelector(".lesson-structured-markdown")!;
    const range = document.createRange();
    range.setStart(h.firstChild!, 0);
    range.setEnd(body, body.childNodes.length);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await page.getByTestId("passage-ask-button").click();
  const chat = page.getByTestId("tutor-chat");
  await expect(chat.getByTestId("tutor-chat-quote")).toContainText("$H^{+}$");
  const sent = page.waitForResponse((response) => /\/tutor\/conversations\/[^/]+\/messages$/.test(response.url()) && response.request().method() === "POST");
  await chat.getByRole("textbox", { name: /Em thắc mắc gì về đoạn này\?|What are you wondering about this passage\?/ }).fill("Gốc acid là gì ạ? Em chưa hiểu cột này.");
  await chat.getByRole("button", { name: /^(Gửi|Send)$/ }).click();
  const response = await sent;
  const result = await response.json();
  console.log("status", response.status(), JSON.stringify(result.messages?.[1] ?? result));
  expect(response.status()).toBe(201);
  expect(result.messages[0].passage).toContain("Hydrochloric acid");
  expect(result.messages[1]).toMatchObject({ role: "TUTOR", outcome: "ANSWERED", ai: true });
  await expect(chat.getByTestId("ai-chip").last()).toBeVisible();
  await page.screenshot({ path: "test-results/lesson-passage-ask-live.png" });

  // Text that is not in this lesson is refused by the server, without a model call.
  const auth = response.request().headers()["authorization"]?.replace(/^Bearer /, "") || token;
  const conversation = await call("/tutor/conversations", "POST", { contextKind: "LESSON", contextId: LESSON }, auth);
  const foreign = await call(`/tutor/conversations/${conversation.data.id}/messages`, "POST", { message: "Giải thích giúp em", passage: { text: "Trái Đất quay quanh Mặt Trời mất một năm." } }, auth);
  expect(foreign.status).toBe(400);
  expect(foreign.data).toMatchObject({ code: "TUTOR_PASSAGE_NOT_IN_LESSON" });
});
