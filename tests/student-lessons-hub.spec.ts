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
    { id: "assignment-1", title: "Ôn tập lớp 8A", contentId: assigned.id, contentType: "lesson", dueDate: "2026-10-20T00:00:00.000Z", overdue: false, canOpen: true, classroom: { id: "class-1", name: "Lớp 8A" } },
    { id: "assignment-2", title: "Ôn tập lớp 8B", contentId: assigned.id, contentType: "lesson", dueDate: null, overdue: false, canOpen: true, classroom: { id: "class-2", name: "Lớp 8B" } },
  ])));
  await page.route("**/api/lessons", (route) => route.fulfill(json([assigned])));
  await page.route("**/api/classes", (route) => route.fulfill(json([
    { id: "class-pending", name: "Lớp đang chờ duyệt", grade: 8, status: "ACTIVE", enrollmentStatus: "pending", assignments: [] },
  ])));
}

test("student lesson hub combines released and assigned lessons and keeps Class Space separate", async ({ page }) => {
  await mockStudentApi(page);
  await page.goto("/lessons");

  await expect(page.getByRole("heading", { name: "Bài học được giao" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Ôn tập lớp 8A · Lớp 8A/ })).toHaveAttribute("href", "/assignments/assignment-1");
  await expect(page.getByRole("link", { name: /Ôn tập lớp 8B · Lớp 8B/ })).toHaveAttribute("href", "/assignments/assignment-2");
  await expect(page.getByRole("link", { name: /Khoa học tự nhiên/ })).toHaveAttribute("href", "/ebooks/science");
  await expect(page.getByRole("heading", { name: "Bài 1. Năng lượng" })).toBeVisible();

  await page.getByRole("button", { name: "Bài học chung" }).click();
  await expect(page.getByRole("heading", { name: "Bài 2. Thực hành" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bài 1. Năng lượng" })).toBeVisible();

  await page.getByRole("link", { name: "Class Space" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("heading", { name: "Class Space của em" })).toBeVisible();
  await expect(page.getByText("Chờ giáo viên duyệt", { exact: true })).toBeVisible();
});
