import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_FIXTURE_PASSWORD or SEED_PASSWORD from the backend seed.");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.active");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const response = page.waitForResponse((item) =>
    item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

test("assigned study cards in Class Space support flip, retry and server-confirmed progress", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let basePathway: any;
  let completed = false;
  let failOnce = true;
  const writes: any[] = [];

  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const response = await route.fetch();
    basePathway = await response.json();
    const steps = basePathway.steps.map((step: any) => {
      if (step.type === "READING" || step.type === "VIDEO")
        return { ...step, state: "COMPLETED", progressValue: 100, resource: step.resource };
      if (step.type === "STUDY_CARDS")
        return {
          ...step,
          state: completed ? "COMPLETED" : "IN_PROGRESS",
          progressValue: completed ? 100 : 50,
          visitedCardIds: completed ? ["card-one", "card-two"] : ["card-one"],
          resource: { cards: [
            { id: "card-one", front: "Mục tiêu", back: "Hiểu mạch điện" },
            { id: "card-two", front: "An toàn", back: "Ngắt nguồn trước khi thao tác" },
          ] },
        };
      if (step.type === "QUIZ") return { ...step, state: completed ? "IN_PROGRESS" : "LOCKED", resource: null };
      return { ...step, state: "LOCKED", resource: null };
    });
    await route.fulfill({ response, json: { ...basePathway, steps, nextStepId: completed ? steps.find((step: any) => step.type === "QUIZ")?.id : steps.find((step: any) => step.type === "STUDY_CARDS")?.id } });
  });

  await page.route("**/api/lessons/*/steps/*/progress*", async (route) => {
    const body = route.request().postDataJSON();
    writes.push(body);
    if (failOnce && body.action === "complete") {
      failOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Lỗi lưu tạm thời" }) });
      return;
    }
    completed = body.action === "complete" && body.cardIndex === 1;
    const visitedBoth = completed || body.cardIndex === 1;
    const steps = basePathway.steps.map((step: any) => step.type === "STUDY_CARDS"
      ? { ...step, state: completed ? "COMPLETED" : "IN_PROGRESS", progressValue: visitedBoth ? 100 : 50, visitedCardIds: visitedBoth ? ["card-one", "card-two"] : ["card-one"], resource: { cards: [
        { id: "card-one", front: "Mục tiêu", back: "Hiểu mạch điện" },
        { id: "card-two", front: "An toàn", back: "Ngắt nguồn trước khi thao tác" },
      ] } }
      : step.type === "QUIZ" ? { ...step, state: completed ? "IN_PROGRESS" : "LOCKED", resource: null }
      : { ...step, state: "COMPLETED", progressValue: 100 });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ step: steps.find((step: any) => step.type === "STUDY_CARDS"), pathway: { ...basePathway, steps, nextStepId: completed ? steps.find((step: any) => step.type === "QUIZ")?.id : steps.find((step: any) => step.type === "STUDY_CARDS")?.id } }) });
  });

  await login(page);
  // Assigned decks are reviewed in Class Space; the lesson page keeps only content and video.
  await page.goto("/classes?tab=resources&assignmentId=pilot-a-lesson-assignment");
  const cards = page.getByRole("region", { name: "Thẻ ghi nhớ" });
  await expect(cards).toBeVisible();
  await expect(cards.getByText("Thẻ 1 / 2")).toBeVisible();
  await cards.getByRole("button", { name: "Hiện mặt sau của thẻ" }).click();
  await expect(cards.getByText("Hiểu mạch điện")).toBeVisible();
  await cards.getByRole("button", { name: "Đánh dấu đã xem" }).click();
  await cards.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(cards.getByText("Thẻ 2 / 2")).toBeVisible();
  await cards.getByRole("button", { name: "Đánh dấu đã xem" }).click();
  await expect(cards.getByRole("button", { name: /Hoàn thành ôn thẻ/ })).toBeEnabled();
  await cards.getByRole("button", { name: /Hoàn thành ôn thẻ/ }).click();
  await expect(cards.getByRole("alert")).toContainText("Lỗi lưu tạm thời");
  await cards.getByRole("button", { name: "Thử lại" }).click();
  await expect(cards.getByRole("alert")).toHaveCount(0);
  await expect(cards.getByText("2 / 2 đã xem")).toBeVisible();
  expect(writes).toEqual([
    { action: "visit", cardIndex: 0 },
    { action: "visit", cardIndex: 1 },
    { action: "complete", cardIndex: 1 },
    { action: "complete", cardIndex: 1 },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
