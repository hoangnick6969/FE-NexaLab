import { expect, test, type Page } from "@playwright/test";

async function editorPage(page: Page, resources: any[] = []) {
  await page.addInitScript(() => { localStorage.setItem("nexalab.locale", "en"); });
  const teacher = { id: "teacher", role: "TEACHER", email: "teacher@example.test", fullName: "Teacher", grade: 8, mustChangePassword: false };
  const classroom = { id: "class-editor", name: "Editor class", grade: 8, status: "ACTIVE", requiresApproval: true, joinCode: { issued: false, enabled: false, rotatedAt: null }, members: { approved: 1, pending: 0, removed: 0 }, assignments: { active: 0, archived: 0 } };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: any = [];
    if (path.endsWith("/auth/refresh")) json = { user: teacher, accessToken: "test-token" };
    else if (path.endsWith("/me/profile")) json = { ...teacher, preferences: { locale: "en", theme: "system" } };
    else if (path.endsWith("unread-count")) json = { count: 0 };
    else if (path === "/api/classes") json = [classroom];
    else if (path.endsWith("/assignable-content")) json = { lessons: [{ id: "lesson", title: "Lesson", grade: 8, subject: { name: "Science" } }], labs: [{ id: "circuit", title: "Circuit", release: { id: "new-release", version: 2 }, challenges: [{ id: "new-challenge", objective: "New challenge" }] }], tests: [] };
    else if (path.endsWith("/resources")) json = resources;
    return route.fulfill({ json });
  });
  await page.goto("/classes/class-editor?tab=resources");
  const form = page.locator(".class-resource-create form");
  await expect(form).toBeVisible();
  return form;
}

test("upload completion keeps the latest description and ignores a changed source or kind", async ({ page }) => {
  const form = await editorPage(page);
  await form.getByRole("combobox", { name: "Purpose", exact: true }).selectOption("DOCUMENT");
  await form.getByRole("combobox", { name: "Material source", exact: true }).selectOption("upload");
  const pending: Array<() => Promise<void>> = [];
  await page.route("**/api/files", async (route) => { await new Promise<void>((resolve) => pending.push(async () => { await route.fulfill({ json: { id: "uploaded-version" } }); resolve(); })); });
  const input = form.locator('input[type="file"]');
  const file = { name: "activity.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test") };
  await input.setInputFiles(file);
  await expect.poll(() => pending.length).toBe(1);
  await form.getByRole("textbox", { name: "Description / how to use", exact: true }).fill("Latest teacher description");
  await pending.shift()!();
  await expect(form.getByText("The file is ready. Preview it to check the content.")).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Description / how to use", exact: true })).toHaveValue("Latest teacher description");

  await input.setInputFiles(file);
  await expect.poll(() => pending.length).toBe(1);
  await form.getByRole("combobox", { name: "Material source", exact: true }).selectOption("link");
  await form.getByRole("textbox", { name: "HTTPS link", exact: true }).fill("https://example.test/latest");
  await pending.shift()!();
  await expect(form.getByRole("textbox", { name: "HTTPS link", exact: true })).toHaveValue("https://example.test/latest");
  await expect(form.getByText("The file is ready. Preview it to check the content.")).toHaveCount(0);

  await form.getByRole("combobox", { name: "Material source", exact: true }).selectOption("upload");
  await input.setInputFiles(file);
  await expect.poll(() => pending.length).toBe(1);
  await form.getByRole("combobox", { name: "Purpose", exact: true }).selectOption("LINK");
  await form.getByRole("textbox", { name: "HTTPS link", exact: true }).fill("https://example.test/reference");
  await pending.shift()!();
  await expect(form.getByRole("combobox", { name: "Purpose", exact: true })).toHaveValue("LINK");
  await expect(form.getByRole("textbox", { name: "HTTPS link", exact: true })).toHaveValue("https://example.test/reference");
});

test("blocked attachment popups show recovery without requesting an access grant", async ({ page }) => {
  await page.addInitScript(() => { window.open = () => null; });
  await editorPage(page, [{ id: "document", classId: "class-editor", kind: "DOCUMENT", title: "Uploaded material", lessonId: "lesson", version: 1, status: "PUBLISHED", content: { description: "Read this", source: { type: "upload", assetVersionId: "asset-version" } }, attachment: { fileName: "activity.pdf", mime: "application/pdf", bytes: 123, status: "READY" } }]);
  let grants = 0;
  await page.route("**/api/assets/versions/asset-version/access", (route) => { grants++; return route.fulfill({ json: { url: "https://example.test/file" } }); });
  await page.getByRole("button", { name: "Open file", exact: true }).click();
  await expect(page.getByText("Your browser blocked the new window. Allow pop-ups for this site, then select Open file again.")).toBeVisible();
  expect(grants).toBe(0);
});

test("stale drafts retain the pinned challenge until an explicit source upgrade", async ({ page }) => {
  await editorPage(page, [{ id: "old-draft", classId: "class-editor", kind: "LAB", title: "Old source activity", lessonId: "lesson", version: 2, status: "DRAFT", content: { source: { labId: "circuit", releaseId: "old-release", challengeId: "old-challenge" }, learningObjective: "Old objective", instructions: "Old instructions", reportPrompts: [] } }]);
  const row = page.locator(".class-resource-row").filter({ hasText: "Old source activity" });
  await row.getByText("Edit draft", { exact: true }).click();
  const challenge = row.getByRole("combobox", { name: "Approved challenge", exact: true });
  await expect(challenge).toBeDisabled();
  await expect(challenge).toHaveValue("old-challenge");
  await expect(challenge.locator("option")).toHaveText(["Pinned challenge: old-challenge"]);
  await row.getByRole("button", { name: "Use the new release", exact: true }).click();
  await expect(challenge).toBeEnabled();
  await expect(challenge).toHaveValue("new-challenge");
});
