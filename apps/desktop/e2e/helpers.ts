import { _electron as electron, type Page } from "@playwright/test";
import { createProgress } from "../../../src/domain/seed";
import { achievementDeck } from "../../../src/content/achievements.ru";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

// Launches the real built Electron app. Supabase is replaced by mocked
// responses: every request to the Supabase origin is fulfilled here or
// aborted, so no real account is used and nothing leaves the machine.
export const appDir = resolve(__dirname, "..");
const electronPath = createRequire(join(appDir, "package.json"))(
  "electron",
) as unknown as string;

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
export const userId = "00000000-0000-4000-8000-000000000001";
export const fakeJwt = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: userId, exp, role: "authenticated", aud: "authenticated" })}.test`;
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

export type Mock = {
  progress?: unknown;
  /** Reply of the site's AI mentor (SSE); without it the call is aborted. */
  mentorReply?: string;
};
export type MentorCall = {
  authorization?: string;
  origin?: string;
  body: unknown;
};

export async function launchMocked(userData: string, mock: Mock = {}) {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [appDir],
    env: { ...process.env, ARDUHUB_USER_DATA: userData },
  });
  const requests: string[] = [];
  const progressData = mock.progress ?? {
    lessons: {
      "lesson-1": { status: "done" },
      "lesson-2": { status: "done" },
      "lesson-3": { status: "current" },
    },
  };
  await app.context().route(/supabase\.co/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    requests.push(`${req.method()} ${url.pathname}`);
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    if (url.pathname === "/auth/v1/token") {
      const body = req.postDataJSON() as { password?: string };
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
      return json(
        single
          ? {
              id: userId,
              display_name: "Алия",
              role: "student",
              timezone: "Asia/Almaty",
              sparks: 0,
              mentor_tokens: 50,
              hide_from_leaderboard: false,
              inventory: [],
              freeze_count: 0,
              hint_count: 0,
            }
          : [{ id: userId, display_name: "Алия" }],
      );
    if (url.pathname === "/rest/v1/progress")
      return json(
        single
          ? { user_id: userId, data: progressData }
          : [{ user_id: userId, data: progressData }],
      );
    if (url.pathname.startsWith("/rest/v1/rpc/")) return json({ ok: true });
    if (url.pathname.startsWith("/rest/v1/")) return json(single ? null : []);
    return route.abort();
  });
  // The site is never reached from tests: the AI mentor is mocked or aborted.
  const mentorCalls: MentorCall[] = [];
  await app.context().route(/arduhub\.vercel\.app/, async (route) => {
    const req = route.request();
    if (
      !new URL(req.url()).pathname.startsWith("/api/mentor") ||
      !mock.mentorReply
    )
      return route.abort();
    const h = req.headers();
    mentorCalls.push({
      authorization: h["authorization"],
      origin: h["origin"],
      body: req.postDataJSON(),
    });
    const words = mock.mentorReply.split(" ");
    const sse =
      words
        .map(
          (w, i) =>
            `event: delta
data: ${JSON.stringify({ text: (i ? " " : "") + w })}

`,
        )
        .join("") +
      `event: done
data: ${JSON.stringify({ fallback: false, tokensUsed: 1 })}

`;
    return route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Access-Control-Allow-Origin": "app://arduhub",
      },
      body: sse,
    });
  });
  const page = await app.firstWindow();
  // Tests never speak out loud: speech is recorded instead.
  await page.evaluate(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(`${u.voice?.name ?? "?"}: ${u.text}`);
    };
  });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  return { app, page, errors, requests, mentorCalls };
}

export async function signIn(page: Page, password: string) {
  await page.getByLabel("Почта").fill("pilot@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

// Learner fixture of the site's learning E2E: notices and tours seen.
export function learnerProgress(mentor = "volt") {
  const p = createProgress();
  p.profile.name = "Алия";
  p.mentor = { ...p.mentor, selectedId: mentor, unlockedIds: [mentor] };
  p.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((item) => item.id),
  };
  p.tourSeen = { "/app": true, "/app/map": true, "/app/practice": true };
  for (let i = 1; i <= 12; i++) p.tourSeen["/app/lesson/lesson-" + i] = true;
  return p;
}

/** Removes a test profile folder; never throws (Windows may still hold a
 *  file of the closing app, and a throw here would hide the real error). */
export function removeDir(dir: string) {
  try {
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  } catch {
    /* left in the temp folder */
  }
}
