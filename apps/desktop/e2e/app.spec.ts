import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// The app is the real built Electron app. Supabase is replaced by mocked
// responses (no real account, no request leaves the machine): every request
// to the Supabase origin is fulfilled here or aborted.
const appDir = resolve(__dirname, "..");
const electronPath = createRequire(join(appDir, "package.json"))(
  "electron",
) as unknown as string;
const shots = resolve(appDir, "../../outputs/desktop-d1");

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const userId = "00000000-0000-4000-8000-000000000001";
const fakeJwt = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: userId, exp, role: "authenticated", aud: "authenticated" })}.test`;
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "pilot@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-01T00:00:00Z",
};
const tokenBody = {
  access_token: fakeJwt,
  token_type: "bearer",
  expires_in: 86400,
  expires_at: exp,
  refresh_token: "test-refresh",
  user,
};

async function launch(userData: string) {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [appDir],
    env: { ...process.env, ARDUHUB_USER_DATA: userData },
  });
  const requests: string[] = [];
  await app.context().route(/supabase\.co/, async (route) => {
    const url = new URL(route.request().url());
    requests.push(`${route.request().method()} ${url.pathname}`);
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname === "/auth/v1/token") {
      const body = route.request().postDataJSON() as { password?: string };
      return body?.password === "correct-horse"
        ? json(tokenBody)
        : json(
            {
              code: "invalid_credentials",
              message: "Invalid login credentials",
            },
            400,
          );
    }
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname === "/auth/v1/logout")
      return route.fulfill({ status: 204 });
    if (url.pathname === "/rest/v1/profiles")
      return json({ display_name: "Алия" });
    if (url.pathname === "/rest/v1/progress")
      return json({
        data: {
          lessons: {
            "lesson-1": { status: "done" },
            "lesson-2": { status: "done" },
            "lesson-3": { status: "current" },
          },
        },
      });
    return route.abort();
  });
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  return { app, page, errors, requests };
}

async function signIn(page: Page, password: string) {
  await page.getByLabel("Почта").fill("pilot@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

test.describe.configure({ mode: "serial" });

let userData = "";
let app: ElectronApplication;
test.beforeAll(() => {
  userData = mkdtempSync(join(tmpdir(), "arduhub-e2e-"));
});
test.afterAll(() =>
  rmSync(userData, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  }),
);
test.afterEach(async () => app?.close());

test("login screen: validation, wrong password, security", async () => {
  const s = await launch(userData);
  app = s.app;
  const { page } = s;
  await expect(
    page.getByRole("heading", { name: "Вход в ArduHub" }),
  ).toBeVisible();
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("script-src 'self'");
  expect(
    await page.evaluate(
      () => typeof (window as unknown as { require?: unknown }).require,
    ),
  ).toBe("undefined");
  expect(
    await page.evaluate(() =>
      window.arduhub.openExternal("https://example.com/"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      window.arduhub.openExternal("https://arduhub.vercel.app/app/lessons"),
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("alert")).toHaveText("Введи почту и пароль.");
  await signIn(page, "wrong-password");
  await expect(page.getByRole("alert")).toHaveText(
    "Неверная почта или пароль.",
  );
  await page.screenshot({ path: join(shots, "login.png") });
  // Chromium logs the expected 400 of the rejected password; nothing else.
  expect(s.errors.filter((e) => !e.includes("status of 400"))).toEqual([]);
});

test("menu after login shows account data; practice is still in development", async () => {
  const s = await launch(userData);
  app = s.app;
  const { page } = s;
  await signIn(page, "correct-horse");
  await expect(
    page.getByRole("heading", { name: /Привет, Алия!/ }),
  ).toBeVisible();
  await expect(page.getByText("Пройдено 2 из 12")).toBeVisible();
  await expect(page.getByText("В разработке", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Профиль/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Обучение/ })).toBeVisible();
  await page.screenshot({ path: join(shots, "menu.png") });

  // The stored session is encrypted on disk.
  const disk = readFileSync(join(userData, "session.json"), "utf8");
  expect(disk).not.toContain(fakeJwt);
  expect(disk).not.toContain("test-refresh");
  expect(s.errors).toEqual([]);
});

test("session survives restart; settings and sign out work", async () => {
  const s = await launch(userData);
  app = s.app;
  const { page } = s;
  await expect(
    page.getByRole("heading", { name: /Привет, Алия!/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Настройки/ }).click();
  await expect(page.getByText("pilot@example.test")).toBeVisible();
  await expect(
    page.getByText("Зашифровано средствами Windows на этом компьютере"),
  ).toBeVisible();
  await page.getByLabel("Крупный", { exact: true }).check();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).fontSize,
    ),
  ).toBe("18.4px");
  await page.screenshot({ path: join(shots, "settings.png") });
  await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
  await expect(
    page.getByRole("heading", { name: "Вход в ArduHub" }),
  ).toBeVisible();
  expect(s.requests).toContain("POST /auth/v1/logout");
  expect(s.errors).toEqual([]);
});
