import { expect, test, type Page } from "@playwright/test";

const student = { id: "student-1", username: "hub.student", fullName: "Học Sinh", role: "STUDENT", grade: 8, mustChangePassword: false };
const released = {
  id: "lesson-shared",
  title: "Bài 1. Năng lượng",
  subjectId: "science",
  subject: { id: "science", name: "Khoa học tự nhiên" },
  grade: 8,
  chapter: "Chương 1",
  topic: "Năng lượng",
  curriculumOrder: 1,
};
const assigned = {
  id: "lesson-assigned",
  title: "Bài 2. Thực hành",
  subjectId: "science",
  subject: { id: "science", name: "Khoa học tự nhiên" },
  grade: 8,
  chapter: "Chương 1",
  topic: "Thực hành",
};

async function mockStudentApi(page: Page) {
  const json = (body: unknown) => ({ contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/**", (route) => route.fulfill(json([])));
  await page.route("**/api/auth/refresh", (route) => route.fulfill(json({ user: student, accessToken: "token" })));
  await page.route("**/api/subjects", (route) => route.fulfill(json([
    { id: "science", name: "Khoa học tự nhiên", ebookUrl: "https://books.example.test/science" },
    { id: "history", name: "Lịch sử", ebookUrl: null },
  ])));
  await page.route("**/api/open-curriculum", (route) => route.fulfill(json({ subjects: [{
    id: "science", name: "Khoa học tự nhiên", ebookUrl: "https://books.example.test/science", grades: [{
      grade: 8, chapters: [{ officialOrder: 1, title: "Chương 1", lessons: [released], topics: [] }],
    }],
  }] })));
  await page.route("**/api/assignments", (route) => route.fulfill(json([
    { id: "assignment-1", title: "Ôn tập lớp 8A", contentId: assigned.id, contentTitle: assigned.title, contentType: "lesson", subject: assigned.subject, grade: 8, chapter: assigned.chapter, chapterOrder: 1, curriculumOrder: 2, dueDate: "2026-10-20T00:00:00.000Z", overdue: false, canOpen: true, classroom: { id: "class-1", name: "Lớp 8A" } },
    { id: "assignment-2", title: "Ôn tập lớp 8B", contentId: assigned.id, contentTitle: assigned.title, contentType: "lesson", subject: assigned.subject, grade: 8, chapter: assigned.chapter, chapterOrder: 1, curriculumOrder: 2, dueDate: null, overdue: false, canOpen: true, classroom: { id: "class-2", name: "Lớp 8B" } },
    { id: "test-assignment", title: "Kiểm tra cuối chương", contentId: "test-1", contentType: "test", subject: assigned.subject, grade: 8, chapter: assigned.chapter, chapterOrder: 1, curriculumOrder: 2, dueDate: "2026-10-19T18:00:00.000Z", overdue: false, canOpen: true, classroom: { id: "class-1", name: "Lớp 8A" }, testStatus: { status: "DUE_SOON", revision: 1, dueSoon: true, extended: false } },
    { id: "legacy-test", title: "Bài kiểm tra chưa phân môn", contentId: "legacy-test-1", contentType: "test", dueDate: "2026-10-22T00:00:00.000Z", overdue: false, canOpen: true, classroom: { id: "class-1", name: "Lớp 8A" }, testStatus: { status: "UPCOMING", revision: 1, dueSoon: false, extended: false } },
  ])));
  await page.route("**/api/lessons", (route) => route.fulfill(json([assigned])));
  await page.route("**/api/classes", (route) => route.fulfill(json([
    { id: "class-pending", name: "Lớp đang chờ duyệt", grade: 8, status: "ACTIVE", enrollmentStatus: "pending", assignments: [] },
  ])));
}

test("student lesson hub combines released and assigned lessons and keeps Class Space separate", async ({ page }) => {
  await mockStudentApi(page);
  await page.goto("/lessons");

  await expect(page.getByRole("heading", { name: "Học theo môn và khối" }).first()).toBeVisible();
  await expect(page.getByText("Thư viện mở", { exact: true })).toBeVisible();
  await expect(page.getByText("Được giao từ lớp học", { exact: true })).toBeVisible();
  await expect(page.getByText("Lịch sử", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Khoa học tự nhiên/ })).toHaveCount(2);

  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await expect(page).toHaveURL(/\/lessons\/catalog\/grades\/8\/subjects\/science$/);
  await expect(page.getByRole("heading", { name: "Khoa học tự nhiên" })).toBeVisible();
  await page.getByRole("link", { name: /Chương 1/ }).first().click();
  await expect(page).toHaveURL(/\/chapters\/Ch%C6%B0%C6%A1ng%201$/);
  await expect(page.getByRole("heading", { name: "Chương 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 1. Năng lượng" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(1);
  const assignedCard = page.locator(".student-lesson-card").filter({ has: page.getByRole("heading", { name: "Bài 2. Thực hành" }) });
  await expect(assignedCard.getByRole("link", { name: /Học nội dung/ }).first()).toHaveAttribute("href", "/lessons/lesson-assigned?assignmentId=assignment-1");
  await expect(assignedCard.getByRole("link", { name: /Làm bài tập/ }).first()).toHaveAttribute("href", "/assignments/assignment-1");
  await expect(page.getByText("Ôn tập lớp 8A · Lớp 8A")).toBeVisible();
  await page.goto("/lessons");

  await page.getByRole("button", { name: "Bài học chung" }).click();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(0);
  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Đang lọc: Bài học chung" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.getByRole("link", { name: /Chương 1/ }).first().click();
  await expect(page.getByRole("heading", { name: "Bài 1. Năng lượng" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(1);

  await page.getByRole("link", { name: "Class Space" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("heading", { name: "Class Space của em" })).toBeVisible();
  await expect(page.getByText("Chờ giáo viên duyệt", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Lớp đang chờ duyệt" }).click();
  await expect(page).toHaveURL(/\/classes\/class-pending\/catalog$/);
  await expect(page.getByText("Yêu cầu của em đang chờ giáo viên duyệt.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nội dung theo môn học" })).toHaveCount(0);
});

test("zero eligible open lessons are not represented by assigned lessons", async ({ page }) => {
  await mockStudentApi(page);
  const lessons = Array.from({ length: 11 }, (_, index) => ({
    ...assigned,
    id: `lesson-assigned-${index + 1}`,
    title: `Bài được giao ${index + 1}`,
  }));
  await page.route("**/api/open-curriculum", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ subjects: [] }) }));
  await page.route("**/api/lessons", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(lessons) }));
  await page.route("**/api/assignments", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(lessons.map((lesson, index) => ({
    id: `assignment-${index + 1}`, title: `Lớp 8A · ${lesson.title}`, contentId: lesson.id, contentTitle: lesson.title,
    contentType: "lesson", subject: lesson.subject, grade: 8, chapter: lesson.chapter, canOpen: true,
    classroom: { id: "class-1", name: "Lớp 8A" }, dueDate: null,
  }))) }));

  await page.goto("/lessons");
  const openSection = page.locator("#open-lessons-title").locator("xpath=ancestor::section[1]");
  const assignedSection = page.locator("#assigned-lessons-title").locator("xpath=ancestor::section[1]");
  await expect(openSection.getByText("Chưa có bài học chung được phát hành phù hợp với tìm kiếm này.")).toBeVisible();
  await expect(assignedSection.locator(".student-lesson-card")).toHaveCount(11);
  await expect(assignedSection.getByText("Bài được giao 1", { exact: true })).toBeVisible();
  await expect(openSection.locator(".student-lesson-card")).toHaveCount(0);
});

test("assigned lesson navigation keeps the selected assignment on its pathway request", async ({ page }) => {
  await mockStudentApi(page);
  let assignmentDetailRequested = false;
  page.on("request", (request) => {
    if (request.url().includes("/api/assignments/assignment-1")) assignmentDetailRequested = true;
  });
  await page.route("**/api/lessons/lesson-assigned/pathway?assignmentId=assignment-1", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      lesson: { id: assigned.id, title: assigned.title, subject: assigned.subject, grade: 8, chapter: assigned.chapter, topic: assigned.topic, learningObjective: "Ôn tập", prerequisites: "", content: "Nội dung dự phòng", materials: [] },
      assignment: { id: "assignment-1", dueDate: null, overdue: false },
      contentArchived: false,
      steps: [
        { id: "reading-1", type: "READING", state: "NOT_STARTED", progressValue: 0, resource: { html: "<p>Nội dung đọc thuộc bài được giao.</p>" } },
        { id: "video-1", type: "VIDEO", state: "NOT_STARTED", progressValue: 0, resource: { url: "https://video.example.test/lesson.mp4", title: "Video bài giảng" } },
      ],
    }),
  }));

  await page.goto("/lessons");
  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await page.getByRole("link", { name: /Chương 1/ }).first().click();
  const pathwayRequest = page.waitForRequest((request) => request.url().includes("/api/lessons/lesson-assigned/pathway"));
  const assignedCard = page.locator(".student-lesson-card").filter({ has: page.getByRole("heading", { name: assigned.title }) });
  await assignedCard.getByRole("link", { name: /Học nội dung/ }).first().click();
  const request = await pathwayRequest;

  expect(new URL(request.url()).searchParams.get("assignmentId")).toBe("assignment-1");
  await expect(page.getByRole("heading", { name: assigned.title })).toBeVisible();
  await expect(page.getByText("Nội dung đọc thuộc bài được giao.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Video bài giảng" })).toBeVisible();
  expect(assignmentDetailRequested).toBe(false);
});

test("shared lesson details use foundational progress without requesting an assignment pathway", async ({ page }) => {
  await mockStudentApi(page);
  let assignmentPathwayRequested = false;
  let progressSaved = false;
  let exerciseAttempt: any = null;
  page.on("request", (request) => {
    if (request.url().includes("/api/lessons/lesson-shared/pathway")) assignmentPathwayRequested = true;
  });
  await page.route("**/api/open-curriculum/lessons/lesson-shared", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      ...released,
      curriculum: "Khoa học tự nhiên THCS",
      content: "<p>Nội dung bài học chung.</p>",
      materials: [],
      steps: [
        { id: "reading-1", type: "READING", state: "NOT_STARTED", progressValue: 0, resource: { html: "<p>Nội dung đọc.</p>" } },
        {
          id: "step-practice-series-current",
          type: "BASIC_EXERCISE",
          state: "NOT_STARTED",
          progressValue: 0,
          resource: {
            passThreshold: 60,
            questions: [{
              id: "practice-current-question",
              prompt: "Dòng điện trong mạch nối tiếp như thế nào?",
              options: [{ id: "same-current", text: "Bằng nhau" }, { id: "decreasing-current", text: "Giảm dần" }],
            }],
          },
          exercise: null,
        },
      ],
      ebookEditions: [],
    }),
  }));
  await page.route("**/api/open-curriculum/lessons/lesson-shared/steps/reading-1/progress", (route) => {
    progressSaved = true;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ step: { id: "reading-1", state: "COMPLETED", progressValue: 100 } }) });
  });
  await page.route("**/api/open-curriculum/lessons/lesson-shared/exercises/step-practice-series-current/attempts", async (route) => {
    exerciseAttempt = await route.request().postDataJSON();
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ score: 100, passThreshold: 60, passed: true }) });
  });

  await page.goto("/lessons");
  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await page.getByRole("link", { name: /Chương 1/ }).first().click();
  const sharedCard = page.locator(".student-lesson-card").filter({ has: page.getByRole("heading", { name: released.title }) });
  await sharedCard.getByRole("link", { name: /Học nội dung/ }).click();
  await expect(page.getByText("Đây là nội dung chương trình mở; tiến độ đọc và video được lưu riêng, không cần bài được giao.")).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành phần đọc" }).click();
  await expect.poll(() => progressSaved).toBe(true);
  await page.getByRole("tab", { name: "Bài tập luyện tập" }).click();
  await page.getByLabel("Bằng nhau").check();
  await page.getByRole("button", { name: "Nộp bài luyện tập" }).click();
  await expect.poll(() => exerciseAttempt?.answers).toEqual([
    { questionId: "practice-current-question", optionId: "same-current" },
  ]);
  await expect(page.getByRole("status")).toContainText("Đã đạt: 100%");
  expect(assignmentPathwayRequested).toBe(false);
});

test("structured lessons render math and GFM tables once and omit unverified page zero", async ({ page }) => {
  await mockStudentApi(page);
  await page.route("**/api/open-curriculum/lessons/lesson-math", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      ...released,
      title: "Bài 4. Dung dịch và nồng độ",
      learningObjective: "■ Nhận biết $m_{nước}$.\n■ Tính $C_{M}$.\n\\frac{m_{ct}}{V_{dd}}",
      materials: [],
      steps: [],
      ebookEditions: [],
      structuredContent: {
        book: { title: "Khoa học tự nhiên 8" },
        sourceBlocks: [
          { id: "verified", physicalPageIndex: 23, printedPageLabel: "21" },
          { id: "unverified", physicalPageIndex: null, printedPageLabel: null },
        ],
        learningContent: {
          summary: "Tính $m_{nước}$ và nồng độ.\n\n- Chất tan\n- Dung môi\n\n| Đại lượng | Ký hiệu |\n| --- | --- |\n| Nồng độ | $C_{M}$ |",
          summarySourceBlockIds: ["verified", "unverified"],
          sections: [{
            id: "section-1",
            heading: "## Công thức và bảng",
            content: "Tính $m_{nước}$ và nồng độ.\n\n- Chất tan\n- Dung môi\n\n| Đại lượng | Ký hiệu |\n| --- | --- |\n| Nồng độ | $C_{M}$ |",
            sourceBlockIds: ["verified", "unverified"],
          }],
          knowledgeUnits: [{ claims: [{ text: "Tính $m_{nước}$ và nồng độ.", sourceBlockIds: ["verified"] }] }],
          definitions: [{ text: "Tính $m_{nước}$ và nồng độ.", sourceBlockIds: ["verified"] }],
          formulas: [{ id: "formula-1", text: "\\mathrm{C}_{\\mathrm{M}} = \\frac{n_{ct}}{V_{dd}}", sourceBlockIds: ["verified"] }],
          tables: [],
          examples: [],
          basicExercises: [],
        },
      },
    }),
  }));

  await page.goto("/lessons/lesson-math");
  await expect(page.getByRole("heading", { name: "Bài 4. Dung dịch và nồng độ" })).toBeVisible();
  const objective = page.locator(".lesson-objective");
  await expect(objective.locator(".katex")).toHaveCount(3);
  await expect(objective.locator(".katex-display")).toHaveCount(1);
  await expect(objective.getByRole("listitem")).toHaveCount(2);
  await expect(objective).not.toContainText("$");
  expect(await objective.locator(".lesson-objective-content").evaluate((node) => getComputedStyle(node).fontWeight)).toBe("400");
  await expect(page.locator(".katex").first()).toBeVisible();
  expect(await page.locator(".lesson-structured-content .katex-display").count()).toBeGreaterThan(0);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator(".lesson-structured-markdown").getByRole("listitem")).toHaveCount(2);
  await expect(page.locator(".lesson-structured-summary")).toHaveCount(0);
  await expect(page.getByText("PDF trang 23", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/PDF trang 0/)).toHaveCount(0);
  await expect(page.locator(".lesson-structured-markdown")).toContainText("Tính");
  await page.screenshot({ path: "test-results/structured-lesson-math-gfm.png", fullPage: true });
});

test("assignment catalog uses the enriched list and opens route-based chapter screens without detail fan-out", async ({ page }) => {
  await mockStudentApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let detailRequests = 0;
  page.on("request", (request) => {
    if (/\/api\/assignments\/[^/?]+$/.test(new URL(request.url()).pathname)) detailRequests += 1;
  });
  await page.goto("/assignments");
  await expect(page.getByRole("link", { name: /Khoa học tự nhiên/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await expect(page).toHaveURL(/\/assignments\/catalog\/grades\/8\/subjects\/science$/);
  await page.getByRole("link", { name: /Chương 1/ }).first().click();
  await expect(page.getByRole("link", { name: /Ôn tập lớp 8A/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kiểm tra cuối chương/ })).toHaveAttribute("href", "/assignments/test-assignment");
  await expect(page.getByRole("link", { name: /Kiểm tra cuối chương/ }).getByText("Bài kiểm tra", { exact: true })).toBeVisible();
  await expect(page.getByText("Sắp đến hạn", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Có 1 bài kiểm tra sắp đến hạn" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài kiểm tra chưa xếp theo môn" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bài kiểm tra chưa phân môn/ })).toHaveAttribute("href", "/assignments/legacy-test");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(detailRequests).toBe(0);
});
