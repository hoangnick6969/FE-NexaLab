import { expect, test, type Page, type Route } from "@playwright/test";

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

function blankPdf(pageCount = 200) {
  const pageObjectStart = 3;
  const contentObject = pageObjectStart + pageCount;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${pageObjectStart + index} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...Array.from({ length: pageCount }, () => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents ${contentObject} 0 R >>`),
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  let body = "%PDF-1.4\n%1234\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

async function mockSourcePdf(page: Page, assetVersionId = "khtn8-source-pdf") {
  const pdf = blankPdf();
  const rangeRequests: string[] = [];
  await page.route(`**/api/assets/versions/${assetVersionId}/access`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ url: "https://storage.example.test/khtn8.pdf", expiresAt: "2026-10-26T12:00:00.000Z", bytes: pdf.length }),
  }));
  const fulfillRange = (route: Route) => {
    const headers = { "accept-ranges": "bytes", "content-type": "application/pdf", "content-length": String(pdf.length) };
    if (route.request().method() === "HEAD") return route.fulfill({ status: 200, headers, body: "" });
    const range = route.request().headers().range;
      rangeRequests.push(`${route.request().method()}:${range ?? "full"}`);
    const match = range?.match(/^bytes=(\d+)-(\d+)$/);
    if (!match) return route.fulfill({ status: 200, headers, body: pdf });
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), pdf.length - 1);
    const body = pdf.subarray(start, end + 1);
    return route.fulfill({ status: 206, headers: { ...headers, "content-length": String(body.length), "content-range": `bytes ${start}-${end}/${pdf.length}` }, body });
  };
  await page.route(`**/api/assets/versions/${assetVersionId}/content`, fulfillRange);
  await page.route("https://storage.example.test/khtn8.pdf", fulfillRange);
  return rangeRequests;
}

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

test("lessons hub lists every configured ebook edition", async ({ page }) => {
  await mockStudentApi(page);
  const rangeRequests = await mockSourcePdf(page);
  await page.route("**/api/open-curriculum", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ subjects: [{
      id: "khtn", name: "Khoa học tự nhiên", ebookUrl: null,
      ebookEditions: [
        { id: "ebook-khtn8", version: "sgk-khtn8", url: "https://storage.example.test/khtn8.pdf", fallbackPhysicalPage: 1 },
        { id: "ebook-khtn9", version: "sgk-khtn9", url: "https://files.example.test/book-9.pdf", fallbackPhysicalPage: 1 },
      ],
      grades: [{ grade: 8, chapters: [] }],
    }] }),
  }));
  await page.route("**/api/subjects", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{ id: "khtn", name: "Khoa học tự nhiên", ebookUrl: null, ebookEditions: [
      { id: "ebook-khtn8", version: "sgk-khtn8", url: "https://storage.example.test/khtn8.pdf", fallbackPhysicalPage: 1 },
      { id: "ebook-khtn9", version: "sgk-khtn9", url: "https://files.example.test/book-9.pdf", fallbackPhysicalPage: 1 },
    ] }]),
  }));

  await page.goto("/ebooks");
  await expect(page.locator(".ebook-library-card")).toHaveCount(2);
  await page.locator(".ebook-library-open").first().click();
  await expect(page).toHaveURL(/\/ebooks\/khtn$/);
  await expect(page.getByText("Trang 1 / 200", { exact: true })).toBeVisible({ timeout: 20_000 });
  expect(rangeRequests.some((request) => /^GET:bytes=0-\d+$/.test(request))).toBe(true);
});

test("student lesson hub combines released and assigned lessons and keeps Class Space separate", async ({ page }) => {
  await mockStudentApi(page);
  await page.goto("/lessons");

  await expect(page.getByRole("heading", { name: "Học theo môn và khối" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Thư viện mở" })).toBeVisible();
  await page.getByRole("group", { name: "Lọc bài học" }).getByRole("button", { name: /Bài học được giao/ }).click();
  await expect(page.getByRole("heading", { name: "Bài học được giao" })).toBeVisible();
  await expect(page.getByText("Lịch sử", { exact: true })).toHaveCount(0);

  await page.getByRole("group", { name: "Lọc bài học" }).getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.goto("/lessons/catalog/grades/8/subjects/science");
  await expect(page.getByRole("heading", { name: "Khoa học tự nhiên" })).toBeVisible();
  await page.goto("/lessons/catalog/grades/8/subjects/science/chapters/Ch%C6%B0%C6%A1ng%201");
  await expect(page).toHaveURL(/\/chapters\/Ch%C6%B0%C6%A1ng%201$/);
  await expect(page.getByRole("heading", { name: "Chương 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 1. Năng lượng" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(1);
  const assignedCard = page.locator(".student-lesson-row").filter({ has: page.getByRole("heading", { name: "Bài 2. Thực hành" }) });
  await expect(assignedCard.getByRole("link", { name: /Học nội dung/ }).first()).toHaveAttribute("href", "/lessons/lesson-assigned?assignmentId=assignment-1");
  await expect(assignedCard.getByRole("link", { name: /Làm bài tập/ }).first()).toHaveAttribute("href", "/assignments/assignment-1");
  await expect(assignedCard).toContainText("Lớp 8A");
  await page.goto("/lessons");

  await page.getByRole("button", { name: "Thư viện mở" }).click();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(0);
  await page.getByRole("link", { name: /Khoa học tự nhiên/ }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Đang lọc: Thư viện mở" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.goto("/lessons/catalog/grades/8/subjects/science/chapters/Ch%C6%B0%C6%A1ng%201");
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
  const assignedTab = page.getByRole("group", { name: "Lọc bài học" }).getByRole("button", { name: /Bài học được giao/ });
  await assignedTab.click();
  const assignedSection = page.locator("#assigned-top-heading").locator("xpath=ancestor::section[1]");
  await expect(assignedSection.locator(".student-assigned-apple-card")).toHaveCount(11);
  await expect(assignedSection).toContainText("11 nhiệm vụ cần làm");
  await page.getByRole("group", { name: "Lọc bài học" }).getByRole("button", { name: "Tất cả", exact: true }).click();
  const openSection = page.locator("#catalog-lessons-title").locator("xpath=ancestor::section[1]");
  await expect(openSection).toContainText("Chưa có nội dung phù hợp");
  await expect(openSection.locator(".student-lesson-row")).toHaveCount(0);
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
  await page.goto("/lessons/catalog/grades/8/subjects/science/chapters/Ch%C6%B0%C6%A1ng%201");
  const pathwayRequest = page.waitForRequest((request) => request.url().includes("/api/lessons/lesson-assigned/pathway"));
  const assignedCard = page.locator(".student-lesson-row").filter({ has: page.getByRole("heading", { name: assigned.title }) });
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
  await page.goto("/lessons/catalog/grades/8/subjects/science/chapters/Ch%C6%B0%C6%A1ng%201");
  const sharedCard = page.locator(".student-lesson-row").filter({ has: page.getByRole("heading", { name: released.title }) });
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
      sourceDocument: { assetVersionId: "khtn8-source-pdf", sourceDigest: "6dcda104a5b09d1395417afef9ac48630843e57dc53938412eada13a6fdfdbf1", bytes: 25151587 },
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
  await expect(page.getByRole("button", { name: "Xem trong SGK" }).first()).toBeEnabled();
  await expect(page.locator(".lesson-structured-markdown")).toContainText("Tính");
  await page.screenshot({ path: "test-results/structured-lesson-math-gfm.png", fullPage: true });
});

test("SGK source viewer opens exact pages from three chapters and preserves lesson reading position", async ({ page }) => {
  await mockStudentApi(page);
  const rangeRequests = await mockSourcePdf(page);
  const digest = "6dcda104a5b09d1395417afef9ac48630843e57dc53938412eada13a6fdfdbf1";
  const lessons = [
    { id: "pack-structured-aec4412ca7656e2823228773ee45e68852315850-v1", chapter: "Chương I. PHẢN ỨNG HOÁ HỌC", title: "Phản ứng hoá học", page: 13, block: "sgk-khtn8-nxbgd-2026-p0013-b0001" },
    { id: "pack-structured-53c1ae7ae0e2c220f8f94e5172ec419f4cb6e81a-v1", chapter: "Chương V. ĐIỆN", title: "Hiện tượng nhiễm điện do cọ xát", page: 86, block: "sgk-khtn8-nxbgd-2026-p0086-b0001" },
    { id: "pack-structured-03b2dcaf5fd4851dbd229b2d01c7d14ac8c1544c-v1", chapter: "Chương VIII. SINH VẬT VÀ MÔI TRƯỜNG", title: "Môi trường và các nhân tố sinh thái", page: 172, block: "sgk-khtn8-nxbgd-2026-p0172-b0001" },
  ];
  for (const lesson of lessons) {
    await page.route(`**/api/open-curriculum/lessons/${lesson.id}`, (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...released,
        id: lesson.id,
        title: lesson.title,
        chapter: lesson.chapter,
        learningObjective: "",
        prerequisites: "",
        materials: [],
        steps: [],
        ebookEditions: [],
        sourceDocument: { assetVersionId: "khtn8-source-pdf", sourceDigest: digest, bytes: 25151587 },
        structuredContent: {
          book: { title: "Khoa học tự nhiên 8", sha256: digest },
          sourceBlocks: [{ id: lesson.block, physicalPageIndex: lesson.page, printedPageLabel: String(lesson.page - 2), sourceSha256: digest }],
          learningContent: { sections: [{ heading: `Mục ${lesson.chapter}`, content: `${"Nội dung có nguồn xác thực.\\n\\n".repeat(100)}\\n\\n[nguồn](source)`, sourceBlockIds: [lesson.block] }] },
        },
      }),
    }));
    await page.goto(`/lessons/${lesson.id}`);
    const reading = page.locator(".lesson-reading-scroll");
    await expect(reading).toHaveAttribute("aria-label", "Nội dung bài đọc");
    await expect(reading.locator(".lesson-structured-content")).toBeVisible();
    await reading.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await reading.evaluate((element) => { element.scrollTop = 120; });
    const before = await reading.evaluate((element) => element.scrollTop);
    const openSource = page.getByRole("button", { name: "Xem trong SGK" });
    await openSource.evaluate((element: HTMLButtonElement) => element.click());
    const viewer = page.getByRole("dialog", { name: `Nguồn sách giáo khoa` });
    await expect(viewer).toHaveAttribute("data-page", String(lesson.page));
    await expect(viewer).toHaveAttribute("data-source-digest", digest);
    await expect(viewer.getByRole("heading", { name: `Trang PDF ${lesson.page}` })).toBeVisible();
    await expect(viewer.locator("canvas")).toBeVisible({ timeout: 20_000 });
    expect(rangeRequests.length).toBeGreaterThan(0);
    expect(rangeRequests.every((request) => request.startsWith("GET:bytes="))).toBe(true);
    await viewer.getByRole("button", { name: "Đóng sách giáo khoa" }).click();
    expect(await reading.evaluate((element) => element.scrollTop)).toBe(before);
  }
});

test("SGK source viewer is full-screen on mobile and handles an unavailable PDF", async ({ page }) => {
  await mockStudentApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/open-curriculum/lessons/source-mobile", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      ...released, id: "source-mobile", title: "Nguồn mobile", learningObjective: "", prerequisites: "", materials: [], steps: [], ebookEditions: [],
      sourceDocument: { assetVersionId: "missing-source", sourceDigest: "a".repeat(64), bytes: 100 },
      structuredContent: { sourceBlocks: [{ id: "mobile-block", physicalPageIndex: 13, printedPageLabel: "11" }], learningContent: { sections: [{ content: "Nội dung", sourceBlockIds: ["mobile-block"] }] } },
    }),
  }));
  await page.route("**/api/assets/versions/missing-source/access", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ statusCode: 403, code: "ASSET_ACCESS_DENIED", message: "Không có quyền mở tệp này" }) }));
  await page.goto("/lessons/source-mobile");
  await page.getByRole("button", { name: "Xem trong SGK" }).click();
  const viewer = page.getByRole("dialog", { name: "Nguồn sách giáo khoa" });
  await expect(viewer).toBeVisible();
  const box = await viewer.boundingBox();
  expect(box?.width).toBe(375);
  expect(await page.locator("body").evaluate((element) => getComputedStyle(element).overflow)).toBe("hidden");
  expect(box?.height).toBe(812);
  await expect(viewer.getByRole("alert")).toContainText("Trang nguồn hiện không khả dụng");
  await viewer.getByRole("button", { name: "Đóng sách giáo khoa" }).click();
  await expect(page.getByText("Nội dung", { exact: true })).toBeVisible();
});

test("valid source references keep a visible disabled action when no authorized PDF exists", async ({ page }) => {
  await mockStudentApi(page);
  await page.route("**/api/open-curriculum/lessons/source-no-pdf", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ...released, id: "source-no-pdf", title: "Nguồn chưa có tệp", learningObjective: "", prerequisites: "", materials: [], steps: [], ebookEditions: [],
      sourceDocument: null,
      structuredContent: { sourceBlocks: [{ id: "known-block", physicalPageIndex: 13, printedPageLabel: "11" }], learningContent: { sections: [{ content: "Nội dung vẫn đọc được", sourceBlockIds: ["known-block"] }] } },
    }),
  }));
  await page.goto("/lessons/source-no-pdf");
  const action = page.getByRole("button", { name: "Xem trong SGK" });
  await expect(action).toBeVisible();
  await expect(action).toBeDisabled();
  await expect(page.getByRole("note")).toContainText("Bản PDF nguồn hiện chưa khả dụng");
  await expect(page.getByText("Nội dung vẫn đọc được", { exact: true })).toBeVisible();
});

test("SGK source viewer refreshes one expired signed URL", async ({ page }) => {
  await mockStudentApi(page);
  await mockSourcePdf(page);
  const pdfBytes = blankPdf().length;
  let accessCount = 0;
  await page.route("**/api/assets/versions/khtn8-source-pdf/access", (route) => {
    accessCount += 1;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({
      url: accessCount === 1 ? "https://storage.example.test/expired.pdf" : "https://storage.example.test/khtn8.pdf",
      expiresAt: "2026-10-26T12:00:00.000Z", bytes: pdfBytes,
    }) });
  });
  await page.route("https://storage.example.test/expired.pdf", (route) => route.fulfill({ status: 403 }));
  await page.route("**/api/open-curriculum/lessons/source-expired-url", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ...released, id: "source-expired-url", title: "Nguồn hết hạn", learningObjective: "", prerequisites: "", materials: [], steps: [], ebookEditions: [],
      sourceDocument: { assetVersionId: "khtn8-source-pdf", sourceDigest: "6dcda104a5b09d1395417afef9ac48630843e57dc53938412eada13a6fdfdbf1", bytes: pdfBytes },
      structuredContent: { sourceBlocks: [{ id: "retry-block", physicalPageIndex: 13, printedPageLabel: "11" }], learningContent: { sections: [{ content: "Nội dung", sourceBlockIds: ["retry-block"] }] } },
    }),
  }));
  await page.goto("/lessons/source-expired-url");
  await page.getByRole("button", { name: "Xem trong SGK" }).click();
  await expect.poll(() => accessCount).toBe(2);
  await expect(page.getByRole("dialog").locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(accessCount).toBe(2);
});

test("SGK source viewer rejects an out-of-range physical page without guessing", async ({ page }) => {
  await mockStudentApi(page);
  await mockSourcePdf(page);
  await page.route("**/api/open-curriculum/lessons/source-invalid-page", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      ...released, id: "source-invalid-page", title: "Nguồn sai trang", learningObjective: "", prerequisites: "", materials: [], steps: [], ebookEditions: [],
      sourceDocument: { assetVersionId: "khtn8-source-pdf", sourceDigest: "a".repeat(64), bytes: 100 },
      structuredContent: { sourceBlocks: [{ id: "invalid-block", physicalPageIndex: 201, printedPageLabel: "199" }], learningContent: { sections: [{ content: "Nội dung vẫn đọc được", sourceBlockIds: ["invalid-block"] }] } },
    }),
  }));
  await page.goto("/lessons/source-invalid-page");
  await page.getByRole("button", { name: "Xem trong SGK" }).click();
  const viewer = page.getByRole("dialog", { name: "Nguồn sách giáo khoa" });
  await expect(viewer.getByRole("alert")).toContainText("Trang nguồn không tồn tại trong tài liệu này");
  await expect(viewer).toHaveAttribute("data-page", "201");
  await expect(viewer.locator("canvas")).toBeHidden();
  await expect(page.getByText("Nội dung vẫn đọc được", { exact: true })).toBeVisible();
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

test("YouTube lesson videos play in the embedded player and report progress; a publisher page link opens its source", async ({ page }) => {
  await mockStudentApi(page);
  // A stand-in for the YouTube IFrame API: the player "plays" for 2 minutes and ends.
  await page.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "text/javascript", body: `
    window.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 }, Player: function (el, opts) {
      const frame = document.createElement("iframe"); frame.setAttribute("data-testid", "yt-frame"); frame.setAttribute("data-video-id", opts.videoId);
      el.replaceWith(frame); let t = 0;
      this.getCurrentTime = () => t; this.getDuration = () => 120; this.destroy = () => frame.remove();
      setTimeout(() => { opts.events.onStateChange({ data: 1 }); t = 120; opts.events.onStateChange({ data: 0 }); }, 50);
    } };
    window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();` }));
  const lesson = (id: string, url: string) => ({
    ...released, id, curriculum: "Khoa học tự nhiên THCS", content: "<p>Bài.</p>", materials: [], ebookEditions: [],
    steps: [{ id: "video-1", type: "VIDEO", state: "NOT_STARTED", progressValue: 0, lastPosition: null, resource: { url, title: "Video bài giảng" } }],
  });
  await page.route("**/api/open-curriculum/lessons/lesson-yt", (route) => route.fulfill({ json: lesson("lesson-yt", "https://www.youtube.com/watch?v=mTN7ijVi8GQ") }));
  await page.route("**/api/open-curriculum/lessons/lesson-page", (route) => route.fulfill({ json: lesson("lesson-page", "https://www.hoc10.vn/bai-giang/khoa-hoc-tu-nhien/lop-6") }));
  const writes: any[] = [];
  await page.route("**/api/open-curriculum/lessons/lesson-yt/steps/video-1/progress", async (route) => {
    writes.push(await route.request().postDataJSON());
    return route.fulfill({ json: { step: { id: "video-1", state: "COMPLETED", progressValue: 100, lastPosition: 120 } } });
  });

  await page.goto("/lessons/lesson-yt?tab=video");
  await expect(page.getByTestId("yt-frame")).toHaveAttribute("data-video-id", "mTN7ijVi8GQ");
  await expect(page.locator("video.video-player")).toHaveCount(0);
  await expect.poll(() => writes.some((w) => w.action === "ended" && w.positionSeconds === 120 && w.durationSeconds === 120)).toBe(true);

  await page.goto("/lessons/lesson-page?tab=video");
  await expect(page.getByRole("link", { name: "Mở bài giảng ở trang nguồn" })).toHaveAttribute("href", "https://www.hoc10.vn/bai-giang/khoa-hoc-tu-nhien/lop-6");
  await expect(page.locator("video.video-player")).toHaveCount(0);
});
