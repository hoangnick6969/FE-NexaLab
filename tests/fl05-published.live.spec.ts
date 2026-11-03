import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";
const backendRequire = createRequire(resolve("../BE-NexaLab/package.json"));
backendRequire("dotenv").config({ path: resolve("../BE-NexaLab/.env"), quiet: true });
test("published FL-05 is listed by the real API and opens its live 3D LabRun", async ({ page, context }) => {
  test.skip(process.env.FL05_LIVE !== "1", "Explicit live release verification only");
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const { PrismaClient } = backendRequire("@prisma/client");
  const db = new PrismaClient();
  const user = await db.user.findUniqueOrThrow({ where: { username: "student.active" } });
  const refresh = randomBytes(32).toString("hex");
  const session = await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(refresh).digest("hex"), remember: false, expiresAt: new Date(Date.now() + 600000) } });
  try {
  await context.addCookies([{ name: "refresh", value: refresh, domain: "localhost", path: "/api/auth", httpOnly: true, secure: false, sameSite: "Strict" }]);
  const listing = page.waitForResponse(response => new URL(response.url()).pathname === "/api/labs" && response.status() === 200);
  await page.goto("/labs");
  const labs = await (await listing).json();
  expect(labs.some((lab: any) => lab.id === "buoyancy")).toBe(true);
  const card = page.locator("#lab-buoyancy");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Lực đẩy Ác-si-mét");
  await expect(card).toContainText("THỰC HÀNH");
  await expect(card.locator(".lab-library-lesson-primary")).toContainText(/Lực đẩy/);
  await expect(card.locator("img")).toBeVisible();
  await page.screenshot({ path: "test-results/fl05-published-catalog.png", fullPage: true });
  await card.locator("a.lab-card").click();
  await expect(page).toHaveURL(/\/labs\/buoyancy$/);
  const launched = page.waitForResponse(response => new URL(response.url()).pathname === "/api/labs/buoyancy/runs" && response.request().method() === "POST", { timeout: 45000 });
  await page.getByTestId("lab-session-start").click();
  const launch = await launched;
  expect(launch.status(), await launch.text()).toBe(201);
  await expect(page.getByRole("heading", { name: "FL-05 · Lực đẩy Ác-si-mét", exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".physics-stage canvas")).toBeVisible();
  await page.getByRole("button", { name: "Nhúng chìm hoàn toàn", exact: true }).click();
  await expect(page.getByRole("status", { name: "Số đọc trên dụng cụ" })).toContainText("0.667 N");
  await page.screenshot({ path: "test-results/fl05-published-stage.png" });
  console.log(JSON.stringify({ liveApiLabCount: labs.length, buoyancyCard: true, liveLabRun3D: true }));
  } finally {
    await context.request.post("/api/auth/logout").catch(() => undefined);
    await db.session.deleteMany({ where: { id: session.id } });
    await db.$disconnect();
  }
});
