import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// tutor-chat-rules@5 (owner 2026-11-10): highlight a lesson passage, ask the AI tutor about it. Route-mocked; the
// passage-in-lesson check, injection check and prompt are covered by the BE suites.
const lessonId = "lesson-ohm";
const student = { id: "student-1", role: "STUDENT", grade: 8, fullName: "Nguyễn An" };
const reading = "Theo định luật Ôm, khi điện áp giữ nguyên mà điện trở lớn lên thì cường độ dòng điện giảm. Điện trở đo bằng đơn vị ôm.";
const lesson = {
  id: lessonId, title: "Định luật Ôm", grade: 8, subjectId: "khtn", subject: { id: "khtn", name: "KHTN" }, chapter: "Điện học",
  content: reading, materials: [], structuredContent: null,
  steps: [{ id: "step-reading", type: "READING", position: 10, state: "COMPLETED", progressValue: 100, resource: { html: `<p id="ohm">${reading}</p>` } }],
};

async function mockApp(page: Page, chatEnabled = true) {
  const sent: any[] = [];
  let turns = 0;
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let status = 200;
    let body: any = [];
    if (path === "/auth/refresh") body = { user: student, accessToken: "mock-token" };
    else if (path === "/me/profile") body = { ...student, preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/open-curriculum") body = { subjects: [] };
    else if (path === `/open-curriculum/lessons/${lessonId}`) body = lesson;
    else if (path === "/tutor/status") body = { provider: chatEnabled ? "fake" : "rules", llmEnabled: chatEnabled, ruleVersion: "tutor-rules@1" };
    else if (path === "/tutor/chat/status") body = { enabled: chatEnabled, promptVersion: "tutor-chat@1", maxMessage: 500 };
    else if (path === "/tutor/conversations") body = { id: "conv-1", contextKind: "LESSON", contextId: lessonId, messages: [] };
    else if (path === "/tutor/conversations/conv-1/messages") {
      const payload = req.postDataJSON();
      sent.push(payload);
      turns += 1;
      body = { conversationId: "conv-1", messages: [
        { id: `s${turns}`, role: "STUDENT", content: payload.message, outcome: null, ai: false, createdAt: new Date().toISOString(), ...(payload.passage ? { passage: payload.passage.text } : {}) },
        { id: `t${turns}`, role: "TUTOR", content: "Điện trở cản dòng điện, cản nhiều hơn thì dòng nhỏ hơn. Em thử nói lại bằng lời của em nhé?", outcome: "ANSWERED", ai: true, createdAt: new Date().toISOString() },
      ] };
    }
    await route.fulfill({ status, json: body });
  });
  return sent;
}

/** Highlights `phrase` inside the lesson paragraph, as a drag would. */
async function highlight(page: Page, phrase: string) {
  await page.evaluate((target) => {
    const node = document.getElementById("ohm")!.firstChild as Text;
    const start = node.data.indexOf(target);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + target.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }, phrase);
}

for (const viewport of [{ name: "desktop", width: 1280, height: 860 }, { name: "phone", width: 390, height: 844 }]) {
  test(`${viewport.name}: highlight a lesson passage, ask about it, then ask a plain question`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const sent = await mockApp(page);
    await page.goto(`/lessons/${lessonId}`);
    await expect(page.locator("#ohm")).toBeVisible();
    await expect(page.getByTestId("passage-ask-button")).toHaveCount(0);

    await highlight(page, "điện trở lớn lên thì cường độ dòng điện giảm");
    const ask = page.getByTestId("passage-ask-button");
    await expect(ask).toBeVisible();
    await ask.click();
    await expect(ask).toHaveCount(0);

    const chat = page.getByTestId("tutor-chat");
    await expect(chat).toHaveAttribute("data-docked", "true");
    await expect(chat.getByTestId("tutor-chat-quote")).toContainText("điện trở lớn lên thì cường độ dòng điện giảm");
    const input = chat.getByRole("textbox", { name: "Em thắc mắc gì về đoạn này?" });
    await expect(input).toBeFocused();
    await input.fill("Vì sao dòng điện lại giảm ạ?");
    await chat.getByRole("button", { name: "Gửi" }).click();
    await expect(chat).toContainText("Em thử nói lại bằng lời của em nhé?");
    await expect(chat.getByTestId("tutor-chat-quote")).toHaveCount(0);
    await expect(chat.locator(".tutor-chat-quote-ref")).toContainText("điện trở lớn lên thì cường độ dòng điện giảm");
    expect(sent[0]).toEqual({
      message: "Vì sao dòng điện lại giảm ạ?",
      passage: { text: "điện trở lớn lên thì cường độ dòng điện giảm", prefix: "Theo định luật Ôm, khi điện áp giữ nguyên mà", suffix: ". Điện trở đo bằng đơn vị ôm." },
    });

    // The next question has no passage unless the student highlights again.
    await chat.getByRole("textbox", { name: "Em thắc mắc điều gì trong bài?" }).fill("Ôm là gì ạ?");
    await chat.getByRole("button", { name: "Gửi" }).click();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1]).toEqual({ message: "Ôm là gì ạ?" });

    // Removing the quote before sending drops it.
    await highlight(page, "Điện trở đo bằng đơn vị ôm");
    await page.getByTestId("passage-ask-button").click();
    await chat.getByRole("button", { name: "Bỏ đoạn đã chọn" }).click();
    await expect(chat.getByTestId("tutor-chat-quote")).toHaveCount(0);

    const axe = await new AxeBuilder({ page }).include('[data-testid="tutor-chat"]').analyze();
    expect(axe.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/lesson-passage-ask-${viewport.name}.png` });
  });
}

test("structured lesson: formulas are sent as their TeX source, source buttons and block joins are cleaned", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  const sent = await mockApp(page);
  const structured = {
    ...lesson, id: lessonId, steps: [{ ...lesson.steps[0], resource: { html: "" } }],
    structuredContent: {
      versionId: "v1", version: 1, digest: "d", book: { title: "KHTN 8" }, sourceBlocks: [{ id: "b1", physicalPageIndex: 37, printedPageLabel: null }],
      learningContent: { sections: [
        { id: "s1", heading: "Tìm hiểu khái niệm acid", content: "Tên một số acid thông dụng.\n| Hydrochloric acid | HCl | $H^{+}$ | $Cl^{-}$", sourceBlockIds: ["b1"] },
        { id: "s2", heading: "II - Tính chất hoá học", content: "Acid làm đổi màu giấy quỳ tím sang đỏ.", sourceBlockIds: ["b1"] },
      ] },
    },
  };
  await page.route(`**/api/open-curriculum/lessons/${lessonId}`, (route) => route.fulfill({ json: structured }));
  await page.goto(`/lessons/${lessonId}`);
  await expect(page.locator(".katex").first()).toBeVisible();
  // Drag from the first heading to the end of the second section's text, over formulas and the "SGK" button.
  await page.evaluate(() => {
    const headings = [...document.querySelectorAll(".lesson-structured-content h3")];
    const last = document.querySelectorAll(".lesson-structured-markdown")[1];
    const range = document.createRange();
    range.setStart(headings[0].firstChild!, 0);
    range.setEnd(last, last.childNodes.length);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await page.getByTestId("passage-ask-button").click();
  const chat = page.getByTestId("tutor-chat");
  await chat.getByRole("textbox", { name: "Em thắc mắc gì về đoạn này?" }).fill("Em chưa hiểu");
  await chat.getByRole("button", { name: "Gửi" }).click();
  await expect.poll(() => sent.length).toBe(1);
  const text: string = sent[0].passage.text;
  expect(text).toContain("$H^{+}$");
  expect(text).toContain("$Cl^{-}$");
  expect(text).not.toMatch(/H\+H|SGK|PDF trang/);
  expect(text).toMatch(/^Tìm hiểu khái niệm acid\nTên một số acid thông dụng\./);
  expect(text).toContain("II - Tính chất hoá học\nAcid làm đổi màu giấy quỳ tím sang đỏ.");
});

test("no ask button while the AI tutor is off", async ({ page }) => {
  await mockApp(page, false);
  await page.goto(`/lessons/${lessonId}`);
  await expect(page.locator("#ohm")).toBeVisible();
  await highlight(page, "điện trở lớn lên");
  await page.waitForTimeout(300);
  await expect(page.getByTestId("passage-ask-button")).toHaveCount(0);
});
