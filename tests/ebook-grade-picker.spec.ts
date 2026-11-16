import { expect, test, type Page } from "@playwright/test";

// The e-book reader asks which grade's textbook to open when a subject has several editions and the link does not name one.
const student = { id: "student-1", role: "STUDENT", grade: 9, fullName: "Nguyen An" };
const url8 = "https://books.example.test/khtn8.pdf";
const url9 = "https://books.example.test/khtn9.pdf";

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

async function mockApp(page: Page) {
  for (const [u, line] of [[url8, "Sach lop 8"], [url9, "Sach lop 9"]] as const)
    await page.route(u, (route) => route.fulfill({ status: 200, body: pdf(line), headers: { "content-type": "application/pdf", "access-control-allow-origin": "*" } }));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    let body: any = [];
    if (path === "/auth/refresh") body = { user: student, accessToken: "mock-token" };
    else if (path === "/me/profile") body = { ...student, preferences: { locale: "vi", theme: "light" } };
    else if (path === "/me/notifications/unread-count") body = { count: 0 };
    else if (path === "/subjects") body = [{ id: "khtn", name: "KHTN", ebookUrl: url9, ebookEditions: [
      { id: "ed-8", version: "KHTN 8", url: url8, isCurrent: false },
      { id: "ed-9", version: "KHTN 9", url: url9, isCurrent: true },
    ] }];
    else if (path === "/tutor/status") body = { provider: "rules", llmEnabled: false };
    else if (path === "/tutor/chat/status") body = { enabled: false, maxMessage: 500 };
    await route.fulfill({ json: body });
  });
}

test("opening a multi-grade textbook directly asks for the grade; the header button reopens the choice", async ({ page }) => {
  await mockApp(page);
  await page.goto("/ebooks/khtn");
  const dialog = page.getByRole("dialog", { name: "Chọn sách theo lớp" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /SGK KHTN 9/ })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: /SGK KHTN 8/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".ebook-reader-page").getByText("SGK KHTN 8", { exact: true })).toBeVisible();
  await expect(page.locator(".ebook-text-layer")).toContainText("Sach lop 8");
  await page.getByRole("button", { name: /Đổi sách theo lớp/ }).click();
  await expect(dialog.getByRole("button", { name: /SGK KHTN 8/ })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("a link that names the edition (library card) opens the book without asking", async ({ page }) => {
  await mockApp(page);
  await page.goto("/");
  await page.evaluate(() => { history.pushState({ usr: { editionId: "ed-9", fromLibrary: true }, key: "lib", idx: 1 }, "", "/ebooks/khtn"); dispatchEvent(new PopStateEvent("popstate", { state: history.state })); });
  await expect(page.locator(".ebook-reader-page").getByText("SGK KHTN 9", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Chọn sách theo lớp" })).toHaveCount(0);
});
