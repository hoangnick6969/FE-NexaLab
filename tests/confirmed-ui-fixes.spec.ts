import { expect, test, type Page } from "@playwright/test";

const classroom = { id: "review-class", name: "Lớp kiểm tra giao diện", grade: 8, status: "ACTIVE", requiresApproval: false, joinCode: { issued: false, enabled: false }, members: { approved: 1, pending: 0, removed: 0 }, assignments: { active: 0, archived: 0 } };
const lesson = { id: "review-lesson", title: "Nội dung kiểm tra", grade: 8, chapter: "Chương 1", subject: { id: "science", name: "Khoa học tự nhiên" }, content: "Nội dung bài học", materials: [] };

async function mockApp(page: Page, role: "TEACHER" | "ADMIN" | "STUDENT", writes: any[] = []) {
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, "");
    let data: any = [];
    if (path === "/auth/refresh") data = { user: { id: "review-user", fullName: "Người kiểm tra", role, grade: 8 }, accessToken: "mock-session" };
    else if (request.method() !== "GET") { writes.push({ path, body: request.postDataJSON() }); data = { recipientCount: 1, message: "Đã giao cho 1 học sinh." }; }
    else if (path === "/classes") data = [role === "STUDENT" ? { ...classroom, enrollmentStatus: "approved", assignments: [] } : classroom];
    else if (path.endsWith("/assignable-content")) data = { lessons: [lesson], labs: [], tests: [] };
    else if (path.endsWith("/students")) data = [{ classId: classroom.id, studentId: "review-student", status: "approved", student: { id: "review-student", fullName: "Học sinh kiểm tra", username: "review.student", grade: 8 } }];
    else if (path === "/admin/assets") data = { items: [{ id: "asset-one", title: "Tệp có phiên bản", status: "ACTIVE", scope: "TEACHER_PRIVATE", references: { lessons: [], labs: [] }, versions: [{ id: "v2", version: 2, status: "FAILED", failureReason: "Không đúng định dạng" }, { id: "v1", version: 1, status: "READY", mime: "application/pdf", bytes: 2048, sha256: "abc123abc123abc123" }] }], nextCursor: null };
    else if (path === "/assignments/review-assignment") data = { id: "review-assignment", title: lesson.title, contentType: "lesson", content: lesson, classroom, dueDate: null };
    else if (path === "/lessons/review-lesson/pathway") data = { lesson, steps: [{ id: "read", type: "READING", state: "COMPLETED", resource: { html: "<p>Nội dung bài</p>" } }, { id: "cards", type: "STUDY_CARDS", state: "IN_PROGRESS", visitedCardIds: [], resource: { cards: [{ id: "c1", front: "Mặt trước đã lưu", back: "Mặt sau đã lưu" }] } }], nextStepId: "cards" };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
}

test("teacher dashboard, persistent class URL and empty-group assignment protection", async ({ page }) => {
  const writes: any[] = [];
  await mockApp(page, "TEACHER", writes);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Công việc của lớp" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tiến độ học tập", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: classroom.name, exact: true }).click();
  await expect(page).toHaveURL(/\/classes\/review-class$/);
  await page.reload();
  await expect(page.locator("#class-detail-title")).toHaveText(classroom.name);
  await page.getByRole("button", { name: "Giao bài", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Giao bài" });
  await page.locator(".modal-wrap").click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nội dung đã xuất bản")).toHaveValue("");
  await dialog.getByLabel("Nội dung đã xuất bản").selectOption(lesson.id);
  await dialog.getByRole("radio", { name: "Một nhóm học sinh", exact: true }).check();
  await expect(dialog.getByRole("button", { name: "Giao bài", exact: true })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: "Học sinh kiểm tra", exact: true }).check();
  await expect(dialog.getByText("Đã chọn 1 học sinh.", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Giao bài", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Giao bài", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã giao cho 1 học sinh." })).toBeVisible();
  expect(writes.find((item) => item.path.endsWith("/assignments"))?.body).toMatchObject({ audience: "SUBSET", studentIds: ["review-student"], contentId: lesson.id });
});

test("resource authoring uses fields and submits the resource contract", async ({ page }) => {
  const writes: any[] = [];
  await mockApp(page, "TEACHER", writes);
  await page.goto("/classes/review-class");
  await page.getByLabel("Tên tài nguyên", { exact: true }).fill("Bộ thẻ mới");
  await page.getByRole("combobox", { name: "Bài học liên kết", exact: true }).selectOption(lesson.id);
  await page.getByLabel("Mặt trước thẻ 1", { exact: true }).fill("Khái niệm");
  await page.getByLabel("Mặt sau thẻ 1", { exact: true }).fill("Giải thích");
  await expect(page.getByLabel("Nội dung JSON", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].body.content).toEqual({ cards: [{ front: "Khái niệm", back: "Giải thích" }] });
  await page.getByRole("combobox", { name: "Loại nội dung", exact: true }).selectOption("TEST");
  await page.getByLabel("Tên tài nguyên", { exact: true }).fill("Bài kiểm tra mới");
  await page.getByLabel("Nội dung câu hỏi 1", { exact: true }).fill("Hai cộng hai bằng mấy?");
  await page.getByLabel("Câu 1 · Phương án 1", { exact: true }).fill("Ba");
  await page.getByLabel("Câu 1 · Phương án 2", { exact: true }).fill("Bốn");
  await page.getByRole("combobox", { name: "Đáp án đúng câu 1", exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].body.content).toEqual({ questions: [{ prompt: "Hai cộng hai bằng mấy?", options: ["Ba", "Bốn"], correctOption: 1 }] });
});

test("admin assets use latest ready version, valid filter and persistent tab", async ({ page }) => {
  await mockApp(page, "ADMIN");
  const filters: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/admin/assets")) filters.push(new URL(request.url()).searchParams.get("status") ?? ""); });
  await page.goto("/admin?tab=assets");
  await expect(page.getByRole("cell", { name: /Tệp có phiên bản/ })).toContainText("application/pdf · 2 KB");
  await page.getByRole("combobox", { name: "Trạng thái", exact: true }).selectOption("ACTIVE");
  await expect.poll(() => filters.includes("ACTIVE")).toBe(true);
  expect(filters).not.toContain("READY");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Tệp", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Lớp học của tôi", exact: true })).toHaveCount(0);
});

test("student lesson links to working saved cards in Class Space", async ({ page }) => {
  await mockApp(page, "STUDENT");
  await page.goto("/lessons/review-lesson?assignmentId=review-assignment");
  await expect(page.getByRole("tab", { name: /Nội dung bài/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Thẻ ôn tập", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Mở thẻ ôn tập trong Class Space", exact: true }).click();
  await expect(page).toHaveURL(/\/classes\?tab=resources&assignmentId=review-assignment/);
  await expect(page.getByRole("region", { name: "Thẻ ghi nhớ", exact: true })).toContainText("Mặt trước đã lưu");
  await page.getByRole("button", { name: "Hiện mặt sau của thẻ", exact: true }).click();
  await expect(page.getByRole("region", { name: "Thẻ ghi nhớ", exact: true })).toContainText("Mặt sau đã lưu");
});
