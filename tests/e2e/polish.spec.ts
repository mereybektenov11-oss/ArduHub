import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";
const routes = [
  "/app",
  "/app/map",
  "/app/practice",
  "/app/projects",
  "/app/leaderboard",
  "/app/shop",
  "/app/profile",
  "/app/missions",
];
async function init(page: Page) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const p = createProgress();
  p.tourSeen = Object.fromEntries(
    [...routes, ...learningLessons.map((l) => "/app/lesson/" + l.id)].map(
      (r) => [r, true],
    ),
  );
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await init(page);
});
test("seven menu links, practice tabs, old addresses and mobile more", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page.locator(".dash-nav-group")).toHaveCount(3);
  await expect(page.locator(".dash-nav-group a")).toHaveCount(7);
  await expect(
    page.getByRole("link", { name: "Все уроки", exact: true }),
  ).toBeVisible();
  await page.goto("/app/glossary?term=резистор");
  await expect(page).toHaveURL(/tab=glossary/);
  await expect(
    page.locator(".polish-practice-tabs a[aria-current]"),
  ).toHaveText("Словарь");
  await page.goto("/app/homework");
  await expect(page).toHaveURL(/tab=homework/);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "Ещё", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ещё", exact: true });
  await expect(dialog.getByRole("link")).toHaveCount(3);
  await expect(
    dialog.getByRole("button", { name: "Поиск", exact: true }),
  ).toBeVisible();
});
for (const route of routes)
  test("type scale " + route, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const report = await page.locator(".cabinet").evaluate((root) => {
      const sizes: number[] = [];
      const invalid: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const el = node.parentElement!;
        if (
          !node.textContent?.trim() ||
          !el.checkVisibility() ||
          el.closest("svg,.cm-editor")
        )
          continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        sizes.push(size);
        if (size > 28 || (size < 13 && !el.closest(".group-label")))
          invalid.push(
            `${el.tagName} ${size} ${node.textContent?.slice(0, 25)}`,
          );
      }
      return { sizes: [...new Set(sizes)], invalid };
    });
    expect(report.invalid).toEqual([]);
    expect(
      report.sizes.length,
      JSON.stringify(report.sizes),
    ).toBeLessThanOrEqual(7);
  });
test("reading 18px and 1.3 scale affects only content", async ({ page }) => {
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Продолжить без видео" }).click();
  await expect(page.locator(".l2-theory p").first()).toHaveCSS(
    "font-size",
    "18px",
  );
  const button = page.getByRole("button", { name: /^Понятно/ });
  const before = await button.evaluate((el) => getComputedStyle(el).fontSize);
  await page.getByLabel("Размер текста").selectOption("1.3");
  await expect(page.locator(".l2-theory p").first()).toHaveCSS(
    "font-size",
    "23.4px",
  );
  await expect(button).toHaveCSS("font-size", before);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("central mentor, streamed reply, history, keyboard and mobile", async ({
  page,
}) => {
  await page.route("**/api/mentor", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'event: delta\ndata: {"text":"Проверь полярность светодиода."}\n\nevent: done\ndata: {"fallback":false,"tokensUsed":1}\n\n',
    }),
  );
  await page.goto("/app");
  const fab = page.getByRole("button", {
    name: "Спроси наставника",
    exact: true,
  });
  await fab.click();
  const dialog = page.getByRole("dialog", { name: "Наставник", exact: true });
  const input = dialog.getByRole("textbox", { name: "Твой вопрос" });
  await expect(input).toBeFocused();
  await input.fill("Как подключить светодиод?");
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("Как подключить светодиод?\n");
  await input.press("Enter");
  await expect(dialog.getByRole("log")).toContainText("Проверь полярность");
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(
    4,
  );
  await page.screenshot({ path: "reports/polish/chat-desktop.png" });
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(fab).toBeFocused();
  await page.setViewportSize({ width: 360, height: 800 });
  await fab.click();
  await expect(dialog.getByRole("log")).toContainText("Проверь полярность");
  expect((await dialog.boundingBox())!.width).toBe(360);
  expect(
    (await dialog.getByRole("log").boundingBox())!.height,
  ).toBeGreaterThanOrEqual(200);
  const field = await input.boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(800);
  await page.screenshot({ path: "reports/polish/chat-mobile.png" });
});
test("mentor stop aborts an in-flight answer", async ({ page }) => {
  await page.route("**/api/mentor", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await r
      .fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'event: done\ndata: {"fallback":false,"tokensUsed":0}\n\n',
      })
      .catch(() => {});
  });
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Спроси наставника", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Наставник", exact: true });
  const input = dialog.getByRole("textbox", { name: "Твой вопрос" });
  await input.fill("Объясни ток");
  await input.press("Enter");
  await dialog.getByRole("button", { name: "Остановить", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Остановить", exact: true }),
  ).not.toBeVisible();
});
test("reference sketch runs when compiler is offline, including comment changes", async ({
  page,
}) => {
  const l = learningLessons[0];
  await page.addInitScript((l) => {
    localStorage.setItem(
      "arduhub.drafts.v1",
      JSON.stringify({
        version: 1,
        curriculumVersion: 2,
        drafts: {
          "lesson-1": {
            scene: l.circuit.referenceScene,
            code: l.code.solution + "\n// same circuit",
            step: 3,
            steps: {
              video: true,
              theory: true,
              circuit: true,
              code: false,
              run: false,
            },
          },
        },
      }),
    );
  }, l);
  let calls = 0;
  await page.route("**/api/compile", (r) => {
    calls++;
    return r.fulfill({ status: 503, json: { error: "compiler_unconfigured" } });
  });
  await page.goto("/app/lesson/lesson-1");
  const editor = page.locator(".cm-editor");
  await expect(editor).toHaveCSS("font-size", "14px");
  const larger = page.getByRole("button", { name: "Увеличить шрифт кода" });
  const smaller = page.getByRole("button", { name: "Уменьшить шрифт кода" });
  for (let i = 0; i < 6; i++) await larger.click();
  await expect(editor).toHaveCSS("font-size", "20px");
  await expect(larger).toBeDisabled();
  for (let i = 0; i < 8; i++) await smaller.click();
  await expect(editor).toHaveCSS("font-size", "12px");
  await expect(smaller).toBeDisabled();
  for (let i = 0; i < 2; i++) await larger.click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByRole("heading", { name: "Урок пройден!" }),
  ).toBeVisible({ timeout: 30000 });
  expect(calls).toBe(0);
  await expect(page.locator(".polish-reward")).toContainText("+");
  await expect(page.locator(".polish-reward")).not.toBeVisible({
    timeout: 5000,
  });
});
test("lesson two keeps the type scale at all six steps", async ({ page }) => {
  const lesson = learningLessons[1];
  const p = createProgress();
  p.profile.level = 4;
  for (const l of Object.values(p.lessons)) l.status = "done";
  p.tourSeen = { "/app/lesson/lesson-2": true };
  await page.addInitScript(
    ({ p, lesson }) => {
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
      if (!localStorage.getItem("arduhub.drafts.v1"))
        localStorage.setItem(
          "arduhub.drafts.v1",
          JSON.stringify({
            version: 1,
            curriculumVersion: 2,
            drafts: {
              "lesson-2": {
                scene: lesson.circuit.referenceScene,
                code: lesson.code.solution,
                step: 0,
                steps: {
                  video: true,
                  theory: true,
                  quiz: true,
                  circuit: true,
                  code: true,
                  run: true,
                },
              },
            },
          }),
        );
    },
    { p, lesson },
  );
  for (const step of [0, 1, 5, 2, 3, 4]) {
    await page.goto("/app/lesson/lesson-2");
    await page.evaluate((step) => {
      const key = "arduhub.drafts.v1";
      const store = JSON.parse(localStorage.getItem(key)!);
      store.drafts["lesson-2"].step = step;
      localStorage.setItem(key, JSON.stringify(store));
    }, step);
    await page.reload();
    await expect(page.locator(".l2-lesson")).toBeVisible();
    const violations = await page.locator(".l2-lesson").evaluate((root) => {
      const out: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const sizes = new Set<number>();
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement!;
        if (
          !walker.currentNode.textContent?.trim() ||
          !el.checkVisibility() ||
          el.closest("svg,.cm-editor")
        )
          continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        sizes.add(size);
        if (size > 28 || size < 13) out.push(`${el.className}: ${size}`);
      }
      if (sizes.size > 7) out.push(`sizes:${Array.from(sizes).join(",")}`);
      return out;
    });
    expect(violations).toEqual([]);
  }
});
test("video loading placeholder and automatic alternative on player error", async ({
  page,
}) => {
  await page.route("**/api/lesson-video?**", (r) =>
    r.fulfill({
      json: {
        videoId: "aaaaaaaaaaa",
        title: "Первое видео",
        channel: "Первый канал",
        alternatives: [
          {
            videoId: "bbbbbbbbbbb",
            title: "Запасное видео",
            channel: "Учебный канал",
          },
        ],
      },
    }),
  );
  await page.addInitScript(() => {
    (window as unknown as { YT: unknown }).YT = {
      Player: class {
        constructor(
          el: HTMLIFrameElement,
          options: { events: { onReady: () => void; onError: () => void } },
        ) {
          setTimeout(() => {
            options.events.onReady();
            if (el.src.includes("aaaaaaaaaaa")) options.events.onError();
          }, 100);
        }
        getCurrentTime() {
          return 0;
        }
        getDuration() {
          return 10;
        }
        getPlayerState() {
          return 0;
        }
        destroy() {}
      },
    };
  });
  await page.goto("/app/lesson/lesson-1");
  await expect(
    page.getByRole("heading", { name: "Запасное видео" }),
  ).toBeVisible();
  await expect(page.locator(".polish-video-frame")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    (await page.locator(".polish-video-frame").boundingBox())!.width,
  ).toBeLessThanOrEqual(360);
});
for (const route of ["/app", "/app/practice", "/app/lesson/lesson-1"])
  test("accessibility " + route, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const a = await new AxeBuilder({ page }).analyze();
    expect(
      a.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
