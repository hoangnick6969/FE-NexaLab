import { test, expect, type Page } from "@playwright/test";

// Run against the Vite development server. Reconciliation/race tests dynamically
// import its already-loaded API module URL to share the application's auth store.

const user = { id: "login-test", fullName: "Login Test", role: "STUDENT", grade: 8, mustChangePassword: true };
const session = (flagged = true, role = "STUDENT") => ({ user: { ...user, role, mustChangePassword: flagged }, accessToken: "memory-only-token" });
async function mockApi(page: Page, restored = false) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") return route.fulfill({ status: restored ? 201 : 401, json: restored ? session() : { code: "UNAUTHENTICATED" } });
    if (path === "/api/auth/me") return route.fulfill({ json: user });
    if (path === "/api/me/profile") return route.fulfill({ json: { ...user, preferences: {} } });
    return route.fulfill({ json: [] });
  });
}
async function submitLogin(page: Page, username = "student.active") {
  await page.getByLabel(/Tên đăng nhập học sinh|Student username/).fill(username);
  await page.getByLabel(/^(Mật khẩu|Password)$/).fill("test-password");
  await page.getByRole("button", { name: /^(Đăng nhập|Sign in)$/ }).click();
}

for (const locale of ["vi", "en"] as const) {
  test.describe(locale, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("nexalab.locale", value), locale);
      await mockApi(page);
    });
    test("username guidance, normalization, mode reset and keyboard retry", async ({ page }) => {
      let requests = 0;
      await page.route("**/api/auth/student/login", async (route) => {
        requests++;
        expect(route.request().postDataJSON().username).toBe(" STUDENT.ACTIVE ");
        return route.fulfill({ status: 401, json: { code: "INVALID_CREDENTIALS", message: "Tên đăng nhập hoặc mật khẩu không đúng" } });
      });
      await page.goto("/login");
      for (const invalid of ["ab", "a".repeat(33), "bad name", ".student", "student-", "student@name"]) {
        await submitLogin(page, invalid);
        await expect(page.getByRole("alert")).toContainText("3–32");
        await expect(page.getByLabel(/Tên đăng nhập học sinh|Student username/)).toBeFocused();
        expect(requests).toBe(0);
      }
      await page.getByLabel(/Tên đăng nhập học sinh|Student username/).fill(" STUDENT.ACTIVE ");
      await page.getByLabel(/^(Mật khẩu|Password)$/).press("Enter");
      await expect(page.getByRole("alert")).toContainText(locale === "vi" ? "không đúng" : "incorrect");
      await page.getByRole("button", { name: locale === "vi" ? "Đăng nhập người lớn" : "Adult sign-in" }).click();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    });
    for (const failure of ["network", "gateway", "gateway-200", "rate", "validation", "expired"] as const) {
      test(`friendly ${failure} error and successful retry into gate`, async ({ page }) => {
        let first = true;
        await page.route("**/api/auth/student/login", async (route) => {
          if (!first) return route.fulfill({ status: 201, json: session() });
          first = false;
          if (failure === "network") return route.abort("failed");
          if (failure === "gateway") return route.fulfill({ status: 502, contentType: "text/html", body: "<h1>Gateway internals</h1>" });
          if (failure === "gateway-200") return route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Gateway internals</h1>" });
          const responses = {
            rate: { status: 429, json: { code: "RATE_LIMITED", message: "technical rate exception" } },
            validation: { status: 400, json: { code: "VALIDATION_FAILED", message: "username: Invalid regex", details: [{ path: "username", message: "Invalid regex" }] } },
            expired: { status: 401, json: { code: "TEMPORARY_PASSWORD_EXPIRED", message: "Mật khẩu tạm đã hết hạn. Hãy nhờ giáo viên cấp lại." } },
          };
          return route.fulfill(responses[failure]);
        });
        await page.goto("/login");
        await submitLogin(page);
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page.getByRole("alert")).not.toContainText(/TypeError|fetch|Invalid regex|internals|technical/);
        if (failure === "expired") await expect(page.getByRole("alert")).toContainText(locale === "vi" ? "giáo viên" : "teacher");
        await page.getByLabel(/^(Mật khẩu|Password)$/).fill("corrected-password");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await page.getByRole("button", { name: /^(Đăng nhập|Sign in)$/ }).click();
        await expect(page.getByRole("heading", { name: locale === "vi" ? "Đổi mật khẩu tạm" : "Change your temporary password" })).toBeVisible();
      });
    }
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`restored gate blocks deep link and confirms password at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockApi(page, true);
    let changes = 0;
    await page.route("**/api/auth/password", async (route) => {
      changes++;
      const body = route.request().postDataJSON();
      expect(body).not.toHaveProperty("confirmPassword");
      if (changes === 1) return route.fulfill({ status: 400, json: { code: "CURRENT_PASSWORD_INCORRECT", message: "Mật khẩu cũ không đúng" } });
      return route.fulfill({ status: 201, json: session(false, "TEACHER") });
    });
    await page.goto("/lessons/secret?verifyEmail=irrelevant");
    await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(0);
    await page.getByLabel("Mật khẩu tạm", { exact: true }).fill("wrong-temporary");
    await page.getByLabel("Mật khẩu mới (ít nhất 12 ký tự)", { exact: true }).fill("my-private-password");
    await page.getByLabel("Nhập lại mật khẩu mới").fill("different-password");
    await page.getByRole("button", { name: "Lưu và bắt đầu học" }).click();
    await expect(page.getByRole("alert")).toContainText("chưa khớp");
    expect(changes).toBe(0);
    await page.getByLabel("Nhập lại mật khẩu mới").fill("my-private-password");
    await page.getByLabel("Nhập lại mật khẩu mới").press("Enter");
    await expect(page.getByRole("alert")).toContainText("không đúng");
    await page.getByLabel("Mật khẩu tạm", { exact: true }).fill("correct-temporary");
    await page.getByLabel("Mật khẩu tạm", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/classes$/);
    expect(changes).toBe(2);
    await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toHaveCount(0);
  });
}

test("stale local state reconciles PASSWORD_CHANGE_REQUIRED without replaying the mutation", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 201, json: session(false, "TEACHER") }));
  let attempts = 0;
  await page.route("**/api/test/gated", (route) => {
    attempts++;
    return route.fulfill({ status: 403, json: { code: "PASSWORD_CHANGE_REQUIRED", message: "Bạn cần đổi mật khẩu tạm trước khi tiếp tục" } });
  });
  await page.goto("/classes");
  await expect(page.getByRole("complementary")).toBeVisible();
  await page.evaluate(async () => {
    const { api } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    await api("/test/gated", "POST", { value: 1 }).catch(() => undefined);
  });
  await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
  expect(attempts).toBe(1);
});

test("gate sign-out recovery revokes the browser session before returning to login", async ({ page }) => {
  await mockApi(page, true);
  let signedOut = false;
  await page.route("**/api/auth/logout", (route) => {
    signedOut = true;
    return route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.goto("/classes");
  await page.getByRole("button", { name: "Đăng xuất và quay lại đăng nhập" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Tên đăng nhập học sinh")).toBeVisible();
  expect(signedOut).toBe(true);
});


test("a prior session's delayed password-change response cannot gate the next account", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 201, json: session(false, "TEACHER") }));
  let release!: () => void;
  const released = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route("**/api/test/delayed", async (route) => {
    requested = true;
    await released;
    await route.fulfill({ status: 403, json: { code: "PASSWORD_CHANGE_REQUIRED" } });
  });
  await page.goto("/classes");
  await expect(page.locator("aside.sidebar")).toBeVisible();
  await page.evaluate(async () => {
    const { api } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    (window as any).pendingLoginCheck = api("/test/delayed", "POST", {}).catch(() => undefined);
  });
  await expect.poll(() => requested).toBe(true);
  await page.evaluate(async () => {
    const { useAuth } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    useAuth.getState().set({ id: "next-account", fullName: "Next Account", role: "TEACHER", grade: 8, mustChangePassword: false }, "next-session-token");
  });
  release();
  await page.evaluate(async () => { await (window as any).pendingLoginCheck; });
  await expect(page.locator("aside.sidebar")).toContainText("Next Account");
  await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toHaveCount(0);
});


test("editing username cannot unlock or resubmit a pending login", async ({ page }) => {
  await mockApi(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let attempts = 0;
  await page.route("**/api/auth/student/login", async (route) => {
    attempts++;
    await held;
    await route.fulfill({ status: 201, json: session() });
  });
  await page.goto("/login");
  await submitLogin(page);
  await expect.poll(() => attempts).toBe(1);
  await page.getByLabel("Tên đăng nhập học sinh").fill("student.edited");
  await expect(page.locator("form button.primary")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Đăng nhập người lớn" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Quên mật khẩu?" })).toBeDisabled();
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter");
  await page.locator("form").evaluate((form) => (form as HTMLFormElement).requestSubmit());
  expect(attempts).toBe(1);
  release();
  await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
  expect(attempts).toBe(1);
});

test("password gate refreshes once after an expired access token and retries with the rotated token", async ({ page }) => {
  await mockApi(page, true);
  let refreshes = 0;
  let attempts = 0;
  await page.route("**/api/auth/refresh", (route) => {
    refreshes++;
    return route.fulfill({ status: 201, json: { ...session(), accessToken: refreshes === 1 ? "expired-token" : "rotated-token" } });
  });
  await page.route("**/api/auth/password", (route) => {
    attempts++;
    expect(route.request().headers().authorization).toBe(attempts === 1 ? "Bearer expired-token" : "Bearer rotated-token");
    return route.fulfill(attempts === 1 ? { status: 401, json: { code: "UNAUTHENTICATED" } } : { status: 201, json: session(false, "TEACHER") });
  });
  await page.goto("/classes");
  await page.getByLabel("Mật khẩu tạm", { exact: true }).fill("temporary-password");
  await page.getByLabel("Mật khẩu mới (ít nhất 12 ký tự)", { exact: true }).fill("my-private-password");
  await page.getByLabel("Nhập lại mật khẩu mới").fill("my-private-password");
  await page.getByRole("button", { name: "Lưu và bắt đầu học" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.locator("aside.sidebar")).toBeVisible();
  expect(attempts).toBe(2);
  expect(refreshes).toBe(2);
});

for (const locale of ["vi", "en"]) {
  test(`malformed JSON error envelope uses HTTP status and safe copy in ${locale}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("nexalab.locale", value), locale);
    await mockApi(page);
    await page.route("**/api/auth/student/login", (route) => route.fulfill({ status: 502, json: { statusCode: "200", code: { internal: "unsafe" }, message: { internal: "unsafe exception" } } }));
    await page.goto("/login");
    await submitLogin(page);
    await expect(page.getByRole("alert")).toContainText(locale === "vi" ? "Máy chủ đang gặp sự cố" : "temporarily unavailable");
    await expect(page.getByRole("alert")).not.toContainText(/object|unsafe|exception|200/);
  });
}

test("an old auth/me reconciliation cannot overwrite the next account", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 201, json: session(false, "TEACHER") }));
  await page.route("**/api/test/reconcile", (route) => route.fulfill({ status: 403, json: { code: "PASSWORD_CHANGE_REQUIRED" } }));
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let reconciling = false;
  await page.route("**/api/auth/me", async (route) => {
    reconciling = true;
    await held;
    await route.fulfill({ json: user });
  });
  await page.goto("/classes");
  await expect(page.locator("aside.sidebar")).toBeVisible();
  await page.evaluate(async () => {
    const { api } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    (window as any).pendingReconcile = api("/test/reconcile", "POST", {}).catch(() => undefined);
  });
  await expect.poll(() => reconciling).toBe(true);
  await page.evaluate(async () => {
    const { useAuth } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    useAuth.getState().set({ id: "next-account", fullName: "Next Account", role: "TEACHER", grade: 8, mustChangePassword: false }, "next-session-token");
  });
  release();
  await page.evaluate(async () => { await (window as any).pendingReconcile; });
  await expect(page.locator("aside.sidebar")).toContainText("Next Account");
  const state = await page.evaluate(async () => {
    const { useAuth } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
    return { id: useAuth.getState().user?.id, token: useAuth.getState().token };
  });
  expect(state).toEqual({ id: "next-account", token: "next-session-token" });
});


for (const delayed of ["password-response", "refresh-response"]) {
  test(`an account switch during ${delayed} cannot replay an old password mutation`, async ({ page }) => {
    await mockApi(page, true);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let waiting = false;
    let refreshes = 0;
    let attempts = 0;
    await page.route("**/api/auth/refresh", async (route) => {
      refreshes++;
      if (refreshes > 1 && delayed === "refresh-response") {
        waiting = true;
        await held;
      }
      await route.fulfill({ status: 201, json: session() });
    });
    await page.route("**/api/auth/password", async (route) => {
      attempts++;
      if (delayed === "password-response") {
        waiting = true;
        await held;
      }
      await route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } });
    });
    await page.goto("/classes");
    await expect(page.getByRole("heading", { name: "Đổi mật khẩu tạm" })).toBeVisible();
    await page.evaluate(async () => {
      const { api } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
      (window as any).pendingPassword = api("/auth/password", "POST", { currentPassword: "old-account-password", password: "new-private-password" }).catch(() => undefined);
    });
    await expect.poll(() => waiting).toBe(true);
    await page.evaluate(async () => {
      const { useAuth } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
      useAuth.getState().set({ id: "next-account", fullName: "Next Account", role: "TEACHER", grade: 8 }, "next-session-token");
    });
    release();
    await page.evaluate(async () => { await (window as any).pendingPassword; });
    expect(attempts).toBe(1);
    expect(refreshes).toBe(delayed === "password-response" ? 1 : 2);
    await expect(page.locator("aside.sidebar")).toContainText("Next Account");
    const activeToken = await page.evaluate(async () => {
      const { useAuth } = await import(/* @vite-ignore */ performance.getEntriesByType("resource").map((entry) => entry.name).find((name) => new URL(name).pathname === "/src/lib/api.ts") ?? "/src/lib/api.ts");
      return useAuth.getState().token;
    });
    expect(activeToken).toBe("next-session-token");
  });
}
