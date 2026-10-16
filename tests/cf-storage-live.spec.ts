import { expect, test } from "@playwright/test";

// Real browser → private object storage (R2 in development). Proves the
// bucket CORS lets the web origin PUT presigned objects, read multipart ETags
// and GET signed URLs, without any storage credential in the browser.
const api = process.env.TEST_API ?? "http://127.0.0.1:4000/api";
const adminEmail = process.env.C2_ADMIN_EMAIL ?? "admin@nexalab.local";
const adminPassword = process.env.C2_ADMIN_PASSWORD ?? process.env.SEED_PASSWORD ?? "";

test("browser uploads straight to private storage and the admin sees content-foundation screens", async ({ page, request }) => {
  test.skip(!adminPassword, "C2_ADMIN_PASSWORD or SEED_PASSWORD is required");
  expect.configure({ timeout: 30000 });
  const login = await request.post(`${api}/auth/admin/login`, { data: { email: adminEmail, password: adminPassword } });
  expect(login.status()).toBe(201);
  const token = (await login.json()).accessToken as string;

  await page.goto("/login");
  const outcome = await page.evaluate(
    async ({ api, token }) => {
      const call = async (path: string, body?: unknown) => {
        const r = await fetch(api + path, {
          method: body === undefined ? "GET" : "POST",
          headers: { "content-type": "application/json", authorization: "Bearer " + token },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      };
      const digest = async (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buf)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      // 1) single presigned PUT from the browser origin
      const pdf = new Blob([new TextEncoder().encode("%PDF-1.4\n" + "x".repeat(4096))], { type: "application/pdf" });
      const one = await call("/assets/uploads", { fileName: "trinh-duyet.pdf", mime: "application/pdf", bytes: pdf.size });
      const put = await fetch(one.data.upload.url, { method: "PUT", headers: one.data.upload.headers, body: pdf });
      const done = await call(`/assets/uploads/${one.data.versionId}/complete`, {});
      // 2) multipart: every part's ETag must be readable cross-origin
      const size = 70 * 1024 * 1024;
      const video = new Uint8Array(size);
      video.set([0, 0, 0, 24, 102, 116, 121, 112]);
      const multi = await call("/assets/uploads", { fileName: "trinh-duyet.mp4", mime: "video/mp4", bytes: size });
      const signed = await call(`/assets/uploads/${multi.data.versionId}/parts`, { partNumbers: Array.from({ length: multi.data.partCount }, (_, i) => i + 1) });
      const parts: Array<{ partNumber: number; etag: string | null }> = [];
      for (const p of signed.data.parts) {
        const r = await fetch(p.url, { method: "PUT", body: video.slice((p.partNumber - 1) * multi.data.partSize, p.partNumber * multi.data.partSize) });
        parts.push({ partNumber: p.partNumber, etag: r.headers.get("ETag") });
      }
      const multiDone = await call(`/assets/uploads/${multi.data.versionId}/complete`, { parts });
      // 3) signed GET read back in the browser
      const access = await call(`/assets/versions/${done.data.versionId}/access`);
      const back = await fetch(access.data.url);
      return {
        mode: one.data.mode,
        putOk: put.ok,
        ready: done.data.status,
        sameBytes: (await digest(await back.arrayBuffer())) === (await digest(await pdf.arrayBuffer())),
        etagsExposed: parts.every((p) => Boolean(p.etag)),
        multiReady: multiDone.data.status,
        noSecret: !/secret|SecretAccessKey/i.test(JSON.stringify(one.data) + JSON.stringify(signed.data)),
        assetIds: [done.data.assetId, multiDone.data.assetId],
      };
    },
    { api, token },
  );
  expect(outcome).toMatchObject({ mode: "single", putOk: true, ready: "READY", sameBytes: true, etagsExposed: true, multiReady: "READY", noSecret: true });

  // Admin screens
  await page.goto("/login");
  await page.getByRole("button", { name: "Cổng quản trị viên" }).click();
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Tệp" }).click();
  await expect(page.getByText("trinh-duyet.pdf").first()).toBeVisible();
  await expect(page.getByText(/v1 · application\/pdf .* R2/).first()).toBeVisible();
  await page.getByRole("tab", { name: "Gói & phát hành" }).click();
  await expect(page.getByRole("heading", { name: "Báo cáo coverage lớp 8–9" })).toBeVisible();
  await expect(page.getByText("Lớp 8 · ENERGY")).toBeVisible();
  await page.getByRole("tab", { name: "Nguồn & nhập liệu" }).click();
  await expect(page.getByRole("heading", { name: "Danh mục nguồn và nhập liệu" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  for (const id of outcome.assetIds)
    await request.delete(`${api}/admin/assets/${id}`, { headers: { authorization: `Bearer ${token}` }, data: { reason: "dọn kiểm thử", confirm: true } });
});
