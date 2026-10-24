import { test, type Page } from "@playwright/test";
import { accounts, adultLogin, expect, studentLogin } from "./fixtures/live";

// Route guards on the real app: every role lands on a page it may use, and no
// page it reaches answers with a 4xx (pages are not hidden behind API errors).
type Case = [path: string, landing: string];
const cases: Record<"parent" | "teacher" | "student", Case[]> = {
  parent: [["/lessons", "/"], ["/lessons/lesson-circuit", "/"], ["/saved", "/"], ["/labs/circuit", "/"], ["/classes", "/"], ["/assignments", "/"], ["/admin", "/"], ["/progress", "/progress"]],
  teacher: [["/saved", "/"], ["/progress", "/classes"], ["/assignments", "/classes"], ["/admin", "/"], ["/lessons", "/lessons"]],
  student: [["/admin", "/"], ["/saved", "/saved"], ["/progress", "/progress"]],
};

async function visit(page: Page, [path, landing]: Case) {
  const failed: string[] = [];
  const record = (r: { url(): string; status(): number }) => {
    if (r.url().includes("/api/") && r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);
  };
  page.on("response", record);
  await page.goto(path);
  await expect(page).toHaveURL((url) => url.pathname === landing);
  await page.waitForLoadState("networkidle");
  page.off("response", record);
  expect(failed, `${path} → ${landing}`).toEqual([]);
}

test.beforeAll(() => {
  test.skip(!accounts.parent.password || !accounts.owner.password || !accounts.student.password, "Set SEED_PASSWORD and SEED_FIXTURE_PASSWORD");
});

test("a parent only reaches their own pages and has no lesson library", async ({ browser }) => {
  const page = await adultLogin(browser, accounts.parent);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Thư viện bài học" })).toHaveCount(0);
  for (const item of cases.parent) await visit(page, item);
});

test("a teacher is sent away from student-only pages", async ({ browser }) => {
  const page = await adultLogin(browser, accounts.owner);
  for (const item of cases.teacher) await visit(page, item);
});

test("a student is sent away from admin pages", async ({ browser }) => {
  test.setTimeout(180000);
  const page = await studentLogin(browser);
  for (const item of cases.student) await visit(page, item);
});
