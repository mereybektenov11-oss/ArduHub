import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";
import { completeEvidence } from "../helpers/progressEvidence";
import { stubExternalVideo } from "./helpers/externalVideo";

async function prepare(page: Page, xp?: number) {
  const p = createProgress();
  p.profile.name = "Лис";
  if (xp !== undefined) {
    p.xp = xp;
    p.profile.level = 1;
  }
  p.mentor.tokens = 1250;
  p.tourSeen = Object.fromEntries(
    [
      "/app",
      "/app/map",
      "/app/shop",
      "/app/practice",
      "/app/projects",
      "/app/lesson/lesson-1",
    ].map((r) => [r, true]),
  );
  const evidence = completeEvidence("lesson-1");
  evidence.stages.practice = false;
  evidence.practice = { circuit: false, code: false, run: false };
  p.lessons["lesson-1"] = {
    ...p.lessons["lesson-1"],
    ...evidence,
    status: "current",
  };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(
    ({ p, lesson }) => {
      if (!localStorage.getItem("arduhub.progress.v1"))
        localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
      localStorage.setItem(
        "arduhub.save-prompt.v1:local",
        JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
      );
      localStorage.setItem(
        "arduhub.drafts.v1",
        JSON.stringify({
          version: 1,
          curriculumVersion: 2,
          drafts: {
            "lesson-1": {
              scene: lesson.circuit.referenceScene,
              code: lesson.code.solution,
              step: 3,
              steps: {
                video: true,
                theory: true,
                quiz: true,
                circuit: true,
                code: true,
                run: false,
              },
            },
          },
        }),
      );
      const history = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 ? "assistant" : "user",
        text:
          i % 2
            ? "Проверь соединение светодиода и резистора. Это сообщение из длинной истории."
            : `Вопрос ${i}: почему светодиод не горит? {"version":1,"components":[],"wires":[]}`,
      }));
      localStorage.setItem(
        `arduhub.chat.guest.${p.mentor.selectedId}.general`,
        JSON.stringify(history),
      );
    },
    { p, lesson: learningLessons[0] },
  );
  await page.route("**/api/lesson-video?*", (r) => r.fulfill({ json: {} }));
  await stubExternalVideo(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
}
async function centered(page: Page, panel: Locator) {
  await expect(panel).toBeVisible();
  await expect
    .poll(async () =>
      panel.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return Math.max(
          Math.abs(r.x + r.width / 2 - innerWidth / 2),
          Math.abs(r.y + r.height / 2 - innerHeight / 2),
        );
      }),
    )
    .toBeLessThan(2);
  expect(
    await panel.evaluate(
      (e) =>
        !!e.closest("[data-overlay-root]") &&
        e.closest("[data-overlay-root]")?.parentElement === document.body,
    ),
  ).toBe(true);
}
for (const width of [360, 768, 1440]) {
  test(`H layout and nine evidence screenshots ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
    await prepare(page);
    await mkdir("docs/H_SCREENSHOTS", { recursive: true });
    await page.goto("/app");
    await expect(page.locator(".kids-stats")).toBeVisible();
    const geometry = await page.locator(".kids-stats > div").evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect(),
          i = e
            .querySelector(".polish-stat-icon,.kids-level-ring")!
            .getBoundingClientRect(),
          c = e
            .querySelector(".kids-stat-copy, :scope > small")
            ?.getBoundingClientRect();
        const copy = e.querySelector(".kids-stat-copy");
        const a = copy?.firstElementChild?.getBoundingClientRect(),
          b = copy?.lastElementChild?.getBoundingClientRect();
        return {
          height: r.height,
          left: r.left,
          right: r.right,
          delta: c ? Math.abs(i.y + i.height / 2 - c.y - c.height / 2) : 999,
          align: a && b ? Math.abs(a.x - b.x) : 0,
        };
      }),
    );
    expect(geometry).toHaveLength(4);
    for (const g of geometry) {
      expect(g.delta).toBeLessThan(2);
      expect(g.align).toBeLessThanOrEqual(1);
      expect(g.left).toBeGreaterThanOrEqual(0);
      expect(g.right).toBeLessThanOrEqual(width);
    }
    expect(
      Math.max(...geometry.map((g) => g.height)) -
        Math.min(...geometry.map((g) => g.height)),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `docs/H_SCREENSHOTS/home-counters-${width}.png`,
      animations: "disabled",
    });
    await page.goto("/app/lesson/lesson-1?stage=practice");
    let body: Record<string, unknown> | undefined;
    await page.route("**/api/mentor", async (r) => {
      body = r.request().postDataJSON();
      await r.fulfill({
        json: {
          reply:
            "# Подсказка\n\n**Проверь** провод.\n- Первый шаг\n- Второй шаг\n\n```cpp\nint led = 13;\n```",
        },
      });
    });
    await page
      .getByRole("button", { name: "Спросить наставника", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    if (width !== 360) await centered(page, dialog);
    else await expect(dialog).toBeVisible();
    const log = page.locator(".cab-chat-log");
    await expect(
      log.locator(".cab-chat-user, .cab-chat-assistant"),
    ).toHaveCount(30);
    await expect(log).not.toContainText(
      /"version"|"components"|"wires"|Наставник видит:/,
    );
    const scrolling = await dialog.evaluate((e) =>
      [e, ...e.querySelectorAll("*")]
        .filter((x) => {
          const s = getComputedStyle(x);
          return (
            /auto|scroll/.test(s.overflowY) &&
            x.scrollHeight > x.clientHeight + 1
          );
        })
        .map((x) => x.className),
    );
    expect(scrolling).toEqual(["cab-chat-log"]);
    await page.screenshot({
      path: `docs/H_SCREENSHOTS/mentor-long-history-${width}.png`,
      animations: "disabled",
    });
    const fullyVisibleInput = async (height: number) => {
      const rect = await dialog.locator("textarea").boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(height);
      const send = await dialog.locator("form button").boundingBox();
      expect(send!.y + send!.height).toBeLessThanOrEqual(height);
    };
    await fullyVisibleInput(width === 360 ? 640 : 900);
    if (width === 360) {
      await page.evaluate(() => {
        Object.defineProperty(window.visualViewport!, "height", {
          configurable: true,
          value: 320,
        });
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
      await expect(page.locator('[data-overlay-keyboard="true"]')).toHaveCount(
        1,
      );
      await fullyVisibleInput(320);
      await page.evaluate(() => {
        delete (window.visualViewport as unknown as { height?: number }).height;
        window.visualViewport!.dispatchEvent(new Event("resize"));
      });
      await expect(page.locator('[data-overlay-keyboard="true"]')).toHaveCount(
        0,
      );
    }
    const headerBefore = await page
      .locator(".polish-chat-header")
      .boundingBox();
    const formBefore = await dialog.locator("form").boundingBox();
    await log.evaluate((e) => {
      e.scrollTop = 0;
      e.dispatchEvent(new Event("scroll"));
    });
    await expect(
      dialog.getByRole("button", { name: "Вниз", exact: true }),
    ).toBeVisible();
    expect(await page.locator(".polish-chat-header").boundingBox()).toEqual(
      headerBefore,
    );
    // The input remains visible while the history scrolls.
    await expect(dialog.locator("form")).toBeInViewport();
    expect((await dialog.locator("form").boundingBox())!.y).toBeLessThanOrEqual(
      formBefore!.y + 2,
    );
    await page.locator(".polish-chat-quick button").first().click();
    await expect(log.locator("strong")).toContainText("Проверь");
    await expect(log).not.toContainText(/\*\*|```|# Подсказка/);
    await expect(
      log.getByRole("button", { name: "Копировать", exact: true }),
    ).toBeVisible();
    expect(body?.context).toBeTruthy();
    expect(typeof body?.message).toBe("string");
    expect(await log.evaluate((e) => e.scrollTop)).toBeLessThanOrEqual(2);
    await dialog.getByRole("button", { name: "Вниз", exact: true }).click();
    await expect
      .poll(() =>
        log.evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight),
      )
      .toBeLessThanOrEqual(80);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page
      .getByRole("button", { name: "Проверить схему", exact: true })
      .click();
    // Force a scrolled document even when the lesson fits a wide viewport.
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "100vh";
      spacer.setAttribute("aria-hidden", "true");
      document.body.append(spacer);
      window.scrollTo(0, 150);
    });
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    // Dispatch without Playwright scrolling the launch control back into view.
    await page
      .getByRole("button", { name: /^Запустить/ })
      .dispatchEvent("click");
    const complete = page.getByRole("dialog", { name: "Урок пройден!" });
    await expect(complete).toBeVisible({ timeout: 35000 });
    await centered(page, complete);
    const heading = complete.locator(".h-overlay-header > h2");
    const h = await heading.boundingBox(),
      panel = await complete.boundingBox();
    expect(
      Math.abs(h!.x + h!.width / 2 - panel!.x - panel!.width / 2),
    ).toBeLessThan(2);
    await expect(heading).toHaveCSS("text-align", "center");
    await expect(heading).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    expect((await complete.boundingBox())!.height).toBeLessThanOrEqual(
      (width === 360 ? 640 : 900) * 0.9 + 1,
    );
    expect(
      await page.locator("body").evaluate((e) => getComputedStyle(e).overflow),
    ).toBe("hidden");
    const y = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => scrollY)).toBe(y);
    await page.screenshot({
      path: `docs/H_SCREENSHOTS/lesson-complete-${width}.png`,
      animations: "disabled",
    });
  });
}

test("H real name dialog centers and requires an explicit choice", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  const name = page.getByRole("dialog", { name: "Как тебя зовут?" });
  await centered(page, name);
  await page.keyboard.press("Escape");
  await expect(name).toBeVisible();
  await name.getByLabel("Твой ник", { exact: true }).fill("Лис");
  await name.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(name).toHaveCount(0);
});

test("H real save, sticker and purchase dialogs use the shared portal", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const p = createProgress();
  p.profile.name = "Лис";
  p.sparks = 200;
  p.tourSeen = { "/app/shop": true, "/app/profile": true };
  for (const id of ["lesson-1", "lesson-2", "lesson-3"])
    p.lessons[id] = {
      ...p.lessons[id],
      ...completeEvidence(id),
      status: "done",
      rewarded: true,
    };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
  await page.goto("/app/shop");
  const save = page.getByRole("dialog", { name: "Сохрани прогресс" });
  await centered(page, save);
  await save.getByRole("button", { name: "Закрыть", exact: true }).click();
  const sticker = page.getByRole("dialog", { name: "Стикер открыт" });
  await centered(page, sticker);
  // Every earned notice is closed through the real UI; only one modal is visible at a time.
  while (await sticker.isVisible()) {
    expect(await page.locator("dialog[open]").count()).toBe(1);
    await sticker.getByRole("button", { name: "Закрыть стикер" }).click();
    await page.waitForTimeout(180);
  }
  const card = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Ома", exact: true }) });
  await card.getByRole("button", { name: "Купить", exact: true }).click();
  const purchase = page.getByRole("dialog", { name: "Купить за 60 искр?" });
  await centered(page, purchase);
  await page.keyboard.press("Escape");
  await expect(purchase).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: "Купить", exact: true }),
  ).toBeFocused();
});

test("H real daily mission chest is centered and does not lock the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const p = createProgress();
  p.profile.name = "Лис";
  p.tourSeen = { "/app": true };
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  p.daily = {
    day,
    lessonIds: ["lesson-1"],
    xp: 50,
    perfect: true,
    claimed: false,
    quiz: true,
  };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
  await page.goto("/app");
  const seen = new Set<string>();
  for (let i = 0; i < 2; i++) {
    const popup = page.locator(".g3-chest-toast,.polish-reward");
    await expect(popup).toHaveCount(1);
    await centered(page, popup);
    const kind = (await popup.getAttribute("class"))!.includes("g3-chest-toast")
      ? ".g3-chest-toast"
      : ".polish-reward";
    seen.add(kind);
    expect(
      await page.locator("body").evaluate((e) => getComputedStyle(e).overflow),
    ).not.toBe("hidden");
    expect(
      await popup.evaluate(
        (e) =>
          getComputedStyle(e.closest("[data-overlay-root]")!).pointerEvents,
      ),
    ).toBe("none");
    await expect(page.locator(kind)).toHaveCount(0, { timeout: 5000 });
  }
  expect([...seen].sort()).toEqual([".g3-chest-toast", ".polish-reward"]);
});

test("H real level and completion rewards are queued instead of overlapping", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, 99);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  await page
    .getByRole("button", { name: "Проверить схему", exact: true })
    .click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  const active = page.locator("dialog[open]");
  await expect(active).toHaveCount(1, { timeout: 35000 });
  const first = await active.getAttribute("aria-label");
  expect(["Урок пройден!", "Новый уровень!"]).toContain(first);
  await centered(page, active);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", {
      name: first === "Урок пройден!" ? "Новый уровень!" : "Урок пройден!",
    }),
  ).toBeVisible();
  await expect(active).toHaveCount(1);
  await centered(page, active);
  await page.keyboard.press("Escape");
  await centered(
    page,
    page.locator(".cab-toast").filter({ hasText: "Серия 1!" }),
  );
});

test("H freeze notice uses the centered nonblocking popup", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const p = createProgress();
  p.profile.name = "Лис";
  p.tourSeen = { "/app": true };
  const old = new Date();
  old.setDate(old.getDate() - 2);
  const day = `${old.getFullYear()}-${String(old.getMonth() + 1).padStart(2, "0")}-${String(old.getDate()).padStart(2, "0")}`;
  p.streak = { count: 2, lastActiveDate: day };
  p.boosts = { freeze: 1, hints: 0 };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(
    (p) => localStorage.setItem("arduhub.progress.v1", JSON.stringify(p)),
    p,
  );
  await page.goto("/app");
  const notice = page
    .locator(".cab-toast")
    .filter({ hasText: "Заморозка спасла серию!" });
  await centered(page, notice);
  expect(
    await page.locator("body").evaluate((e) => getComputedStyle(e).overflow),
  ).not.toBe("hidden");
});
