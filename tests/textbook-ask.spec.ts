import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// B5: ask AI about a highlighted textbook passage. Route-mocked API and a generated one-page PDF with a text layer;
// prefilter, guard and grounding are covered by the BE suites.
const student = { id: "student-1", role: "STUDENT", grade: 8, fullName: "Nguyen An" };
const PASSAGE = "Khi dong cong tac, mach dien kin va bong den sang.";
const ebookUrl = "https://books.example.test/khtn8.pdf";

/** A minimal valid PDF with one line of Helvetica text (ASCII, so the text layer has no font subsetting). */
function pdf(line: string) {
  const content = `BT /F1 14 Tf 40 760 Td (${line}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => String(offset).padStart(10, "0") + " 00000 n \n").join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

async function mockApp(page: Page, chatEnabled: boolean) {
  const asked: any[] = [];
  await page.route(ebookUrl, (route) => route.fulfill({ status: 200, body: pdf(PASSAGE), headers: { "content-type": "application/pdf", "access-control-allow-origin": "*" } }));
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let body: any = [];
    let status = 200;
    if (path === "/auth/refresh") body = { user: student, accessToken: "mock-token" };
    else if (path === "/me/profile") body = { ...student, preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/subjects") body = [{ id: "khtn", name: "KHTN", ebookUrl }];
    else if (path === "/tutor/status") body = { provider: "fake", llmEnabled: chatEnabled, ruleVersion: "tutor-rules@1" };
    else if (path === "/tutor/chat/status") body = { enabled: chatEnabled, promptVersion: "tutor-chat@1", maxMessage: 500 };
    else if (path === "/tutor/conversations") body = { id: "conv-ebook", contextKind: "EBOOK", contextId: "khtn", messages: [] };
    else if (path === "/tutor/conversations/conv-ebook/messages") {
      const request = req.postDataJSON();
      asked.push(request);
      body = { conversationId: "conv-ebook", messages: [
        { id: "s1", role: "STUDENT", content: request.message, outcome: null, ai: false, passage: request.passage.text, pageNumber: request.passage.pageNumber },
        { id: "t1", role: "TUTOR", content: "Doan nay noi: mach kin thi co dong dien nen den sang. Em thu nghi xem mach ho thi sao?", outcome: "ANSWERED", ai: true },
      ] };
    }
    await route.fulfill({ status, json: body });
  });
  return asked;
}

async function selectPassage(page: Page) {
  const layer = page.locator(".ebook-text-layer");
  await expect(layer).toContainText("bong den sang");
  await page.evaluate(() => {
    const layer = document.querySelector(".ebook-text-layer")!;
    const range = document.createRange();
    range.selectNodeContents(layer);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    layer.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });
}

test("B5: highlight a passage in Hỏi AI mode, ask, and see the AI explanation with the page and quote", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const asked = await mockApp(page, true);
  await page.goto("/ebooks/khtn");
  await page.getByRole("button", { name: "Hỏi AI" }).click();
  const panel = page.getByTestId("textbook-ask");
  await expect(panel).toContainText("Bôi đen một đoạn trong trang sách");
  await selectPassage(page);
  await expect(panel.locator("blockquote")).toContainText("bong den sang");
  await panel.getByRole("textbox", { name: "Em muốn hỏi gì về đoạn này?" }).fill("Doan nay nghia la gi a?");
  await panel.getByRole("button", { name: "Hỏi", exact: true }).click();
  await expect(panel).toContainText("mach ho thi sao?");
  await expect(panel.getByTestId("ai-chip")).toHaveCount(1);
  await expect(panel).toContainText("Trang 1");
  expect(asked).toHaveLength(1);
  expect(asked[0]).toMatchObject({ message: "Doan nay nghia la gi a?", passage: { pageNumber: 1 } });
  expect(asked[0].passage.text).toContain("bong den sang");
  expect(Object.keys(asked[0].passage).sort()).toEqual(["pageNumber", "prefix", "suffix", "text"]);
  const axe = await new AxeBuilder({ page }).include('[data-testid="textbook-ask"]').analyze();
  expect(axe.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
  await panel.screenshot({ path: "test-results/textbook-ask.png" });
  await panel.getByRole("button", { name: "Đóng hỏi AI" }).click();
  await expect(panel).toHaveCount(0);
});

test("B5: no Hỏi AI mode while the tutor chat is off", async ({ page }) => {
  await mockApp(page, false);
  await page.goto("/ebooks/khtn");
  await expect(page.locator(".ebook-modes").getByRole("button", { name: "Ghi chú" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hỏi AI" })).toHaveCount(0);
});
