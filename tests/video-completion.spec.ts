import { expect, test, type Page, type Route } from "@playwright/test";

const password = process.env.SEED_FIXTURE_PASSWORD ?? process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_FIXTURE_PASSWORD or SEED_PASSWORD from the backend seed.");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.active");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  const response = page.waitForResponse((item) =>
    item.request().method() === "POST" && item.url().endsWith("/api/auth/student/login"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await response).ok()).toBeTruthy();
}

function currentVideoPathway(base: any, resource: any, completed: boolean, position: number, progress: number) {
  const steps = base.steps.map((step: any) => {
    if (step.type === "READING")
      return { ...step, state: "COMPLETED", progressValue: 100, lastPosition: null, lockReasonCode: null };
    if (step.type === "VIDEO")
      return {
        ...step,
        state: completed ? "COMPLETED" : "IN_PROGRESS",
        progressValue: progress,
        lastPosition: position || null,
        lockReasonCode: null,
        resource,
      };
    return { ...step, state: "LOCKED", resource: null, lockReasonCode: "PREREQUISITE_INCOMPLETE" };
  });
  return {
    ...base,
    steps,
    nextStepId: completed ? null : steps.find((step: any) => step.type === "VIDEO").id,
  };
}

test("batches media evidence, retains failed high-water, completes, and resumes after reload", async ({ page }) => {
  let basePathway: any;
  let completed = false;
  let position = 0;
  let progress = 0;
  let failOnce = true;
  const writes: any[] = [];
  const resource = {
    title: "Video mạch điện",
    url: "https://media.example.test/video.mp4",
    transcript: "Bản chép lời về mạch điện kín",
    equivalentText: "<p>Nội dung thay thế về mạch điện</p>",
  };

  await page.route("https://media.example.test/video.mp4", (route) => route.abort());
  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const response = await route.fetch();
    basePathway = await response.json();
    await route.fulfill({
      response,
      json: currentVideoPathway(basePathway, resource, completed, position, progress),
    });
  });
  await page.route("**/api/lessons/*/steps/*/progress*", async (route: Route) => {
    const body = route.request().postDataJSON();
    writes.push(body);
    if (failOnce) {
      failOnce = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Lỗi lưu tạm thời" }),
      });
      return;
    }
    position = Math.max(position, body.positionSeconds);
    completed = body.action === "ended" || body.positionSeconds / body.durationSeconds >= 0.9;
    progress = completed
      ? 100
      : Math.max(progress, Math.floor(body.positionSeconds / body.durationSeconds * 100));
    const pathway = currentVideoPathway(basePathway, resource, completed, position, progress);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        step: pathway.steps.find((step: any) => step.type === "VIDEO"),
        pathway,
      }),
    });
  });

  await login(page);
  // I1 moved video from the assignment page to the lesson page tabs.
  await page.goto("/lessons/lesson-circuit?assignmentId=pilot-a-lesson-assignment");
  await page.getByRole("tab", { name: /Video bài giảng/ }).click();
  const video = page.getByRole("region", { name: "Nội dung video" }).locator("video");
  await expect(video).toHaveCount(1);
  await expect(video).not.toHaveAttribute("autoplay");

  const transcriptToggle = page.getByRole("button", { name: "Xem bản chép lời" });
  await expect(transcriptToggle).toHaveAttribute("aria-expanded", "false");
  const transcriptId = await transcriptToggle.getAttribute("aria-controls");
  expect(transcriptId).toBeTruthy();
  await transcriptToggle.click();
  await expect(page.locator(`button[aria-controls="${transcriptId}"]`)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(`#${transcriptId}`)).toBeVisible();

  await video.evaluate((element) => {
    Object.defineProperty(element, "duration", { configurable: true, value: 30 });
    Object.defineProperty(element, "currentTime", { configurable: true, writable: true, value: 9 });
    element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  });
  await page.waitForTimeout(150);
  expect(writes).toHaveLength(0);
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 10;
    element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  });
  await expect(page.getByRole("alert")).toContainText("Lỗi lưu tạm thời");
  expect(writes[0]).toMatchObject({ action: "heartbeat", positionSeconds: 10, durationSeconds: 30 });

  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 20;
    element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    element.currentTime = 5;
    element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    element.dispatchEvent(new Event("pause", { bubbles: true }));
  });
  const retried = page.waitForResponse((response) => response.url().includes("/steps/") && response.request().method() === "PUT" && response.ok());
  await page.getByRole("button", { name: "Thử lưu lại" }).click();
  await retried;
  const videoDone = page.getByRole("tab", { name: /Video bài giảng/ }).getByLabel("Đã hoàn thành");
  await expect(videoDone).toHaveCount(0);
  expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({ action: "heartbeat", positionSeconds: 20, durationSeconds: 30 });

  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 5;
    element.dispatchEvent(new Event("ended", { bubbles: true }));
  });
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2]).toMatchObject({ action: "ended", positionSeconds: 5, durationSeconds: 30 });
  await expect(videoDone).toBeVisible();
  await expect(page.getByText("Đã lưu 100%", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: /Video bài giảng/ }).click();
  await expect(videoDone).toBeVisible();
  await expect(page.getByText(/tiếp tục từ 20 giây/)).toBeVisible();
  await video.evaluate((element) => {
    Object.defineProperty(element, "duration", { configurable: true, value: 30 });
    Object.defineProperty(element, "currentTime", { configurable: true, writable: true, value: 0 });
    element.dispatchEvent(new Event("loadedmetadata", { bubbles: true }));
  });
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBe(20);
});

test("keyboard completion uses only a published equivalent and remains usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let basePathway: any;
  let completed = false;
  let receivedBody: any;
  const resource = {
    title: "Nội dung tương đương",
    url: "https://media.example.test/fallback.mp4",
    equivalentText: "<p>Đọc nội dung khoa học đã được duyệt.</p>",
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(resource.url, (route) => route.abort());
  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const response = await route.fetch();
    basePathway = await response.json();
    await route.fulfill({
      response,
      json: currentVideoPathway(basePathway, resource, completed, 0, completed ? 100 : 0),
    });
  });
  await page.route("**/api/lessons/*/steps/*/progress*", async (route) => {
    receivedBody = route.request().postDataJSON();
    completed = true;
    const pathway = currentVideoPathway(basePathway, resource, true, 0, 100);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        step: pathway.steps.find((step: any) => step.type === "VIDEO"),
        pathway,
      }),
    });
  });

  await login(page);
  // I1 moved video from the assignment page to the lesson page tabs.
  await page.goto("/lessons/lesson-circuit?assignmentId=pilot-a-lesson-assignment");
  await page.getByRole("tab", { name: /Video bài giảng/ }).click();
  const video = page.getByRole("region", { name: "Nội dung video" }).locator("video");
  await video.evaluate((element) => {
    Object.defineProperty(element, "duration", { configurable: true, value: 30 });
    Object.defineProperty(element, "currentTime", { configurable: true, writable: true, value: 5 });
    element.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  });
  const equivalentToggle = page.getByRole("button", { name: "Xem nội dung thay thế" });
  await expect(equivalentToggle).toHaveAttribute("aria-expanded", "false");
  const equivalentId = await equivalentToggle.getAttribute("aria-controls");
  expect(equivalentId).toBeTruthy();
  await equivalentToggle.click();
  await expect(page.locator(`button[aria-controls="${equivalentId}"]`)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(`#${equivalentId}`)).toBeVisible();
  const complete = page.getByRole("button", { name: "Hoàn thành bằng nội dung thay thế" });
  await complete.focus();
  await complete.press("Enter");
  await expect(page.getByRole("tab", { name: /Video bài giảng/ }).getByLabel("Đã hoàn thành")).toBeVisible();
  expect(receivedBody).toEqual({ action: "complete-fallback" });
  await expect(page.getByText(/Chưa lưu:/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("asset video refreshes authentication, creates a blob URL, and revokes it on cleanup", async ({ page }) => {
  const assetId = "12345678-1234-1234-1234-123456789abc";
  const assetUrl = `asset:${assetId}`;
  let basePathway: any;
  let fileRequests = 0;
  const authorizationHeaders: Array<string | undefined> = [];

  await page.addInitScript(() => {
    const calls = { created: [] as string[], revoked: [] as string[] };
    (window as any).__objectUrlCalls = calls;
    const createObjectURL = URL.createObjectURL.bind(URL);
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob) => {
      const value = createObjectURL(blob);
      calls.created.push(value);
      return value;
    };
    URL.revokeObjectURL = (value: string) => {
      calls.revoked.push(value);
      revokeObjectURL(value);
    };
  });
  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const response = await route.fetch();
    basePathway = await response.json();
    await route.fulfill({
      response,
      json: currentVideoPathway(basePathway, { title: "Video asset", url: assetUrl }, false, 0, 0),
    });
  });
  await page.route(`**/api/files/${assetId}`, async (route) => {
    fileRequests++;
    authorizationHeaders.push(route.request().headers().authorization);
    if (fileRequests === 1) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Expired" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "video/mp4", body: "deterministic-video-bytes" });
  });

  await login(page);
  // I1 moved video from the assignment page to the lesson page tabs.
  await page.goto("/lessons/lesson-circuit?assignmentId=pilot-a-lesson-assignment");
  await page.getByRole("tab", { name: /Video bài giảng/ }).click();
  await expect.poll(() => fileRequests).toBe(2);
  expect(authorizationHeaders.every((value) => value?.startsWith("Bearer "))).toBe(true);
  const video = page.getByRole("region", { name: "Nội dung video" }).locator("video");
  await expect(video).toHaveAttribute("src", /^blob:/);
  const created = await page.evaluate(() => (window as any).__objectUrlCalls.created[0]);
  expect(created).toMatch(/^blob:/);

  await page.getByRole("complementary").getByRole("link", { name: "Bài học", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__objectUrlCalls.revoked)).toContain(created);
});

test("versioned asset video streams from a signed URL and re-signs it when playback fails", async ({ page }) => {
  const versionId = "cmvideoversion000000001";
  let basePathway: any;
  let accessCalls = 0;
  let fileRequests = 0;
  await page.route("**/api/lessons/*/pathway*", async (route) => {
    const response = await route.fetch();
    basePathway = await response.json();
    await route.fulfill({ response, json: currentVideoPathway(basePathway, { title: "Video phiên bản", url: `assetv:${versionId}` }, false, 0, 0) });
  });
  await page.route(`**/api/assets/versions/${versionId}/access`, async (route) => {
    accessCalls++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: `https://media.example.test/signed-${accessCalls}.mp4`, expiresAt: new Date(Date.now() + 300000).toISOString(), mime: "video/mp4" }) });
  });
  await page.route("**/api/files/**", (route) => {
    fileRequests++;
    return route.abort();
  });
  // Every signed URL "expires": the player asks for a fresh one twice, then shows the unavailable notice.
  await page.route("https://media.example.test/signed-*.mp4", (route) => route.abort());

  await login(page);
  await page.goto("/lessons/lesson-circuit?assignmentId=pilot-a-lesson-assignment");
  await page.getByRole("tab", { name: /Video bài giảng/ }).click();
  const region = page.getByRole("region", { name: "Nội dung video" });
  await expect(region.getByRole("status").filter({ hasText: "Video hiện không phát được" })).toBeVisible();
  // One initial signing (twice under React StrictMode in dev) plus exactly two re-signs, never a blob download.
  expect(accessCalls).toBeGreaterThanOrEqual(3);
  expect(accessCalls).toBeLessThanOrEqual(4);
  expect(fileRequests).toBe(0);
  await expect(region.locator("video")).toHaveAttribute("src", `https://media.example.test/signed-${accessCalls}.mp4`);
});
