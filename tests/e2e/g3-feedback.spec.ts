import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { dayInZone } from "../../src/domain/missions";
import { localDate } from "../../src/domain/progress/streak";
import { completeEvidence } from "../helpers/progressEvidence";
import { initialFlowQuiz } from "../../src/domain/lessons/flow";
type AudioLog = { contexts: number; frequencies: number[] };
async function seed(
  page: Page,
  options: {
    sparks?: number;
    missions?: boolean;
    expired?: boolean;
    freeze?: boolean;
    lesson?: boolean;
    active?: boolean;
  } = {},
) {
  const p = createProgress();
  p.profile.name = "Искра";
  p.sparks = options.sparks ?? 200;
  p.tourSeen = {
    "/app": true,
    "/app/shop": true,
    "/app/profile": true,
    "/app/lesson/lesson-1": true,
  };
  if (options.active) p.streak = { count: 1, lastActiveDate: localDate() };
  if (options.missions)
    p.daily = {
      day: dayInZone(new Date()),
      lessonIds: ["lesson-1"],
      xp: 50,
      perfect: true,
      claimed: false,
      quiz: false,
    };
  if (options.expired) {
    const old = new Date();
    old.setDate(old.getDate() - 2);
    p.streak = { count: 7, lastActiveDate: localDate(old) };
    p.boosts = { freeze: options.freeze ? 1 : 0, hints: 0 };
  }
  if (options.lesson) {
    const evidence = completeEvidence("lesson-1");
    evidence.stages.practice = false;
    evidence.stages.test = false;
    evidence.practice.run = false;
    evidence.quiz = initialFlowQuiz();
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...evidence,
      status: "current",
    };
  }
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
    const log: AudioLog = { contexts: 0, frequencies: [] };
    const param = () => ({
      setValueAtTime: (v: number) => log.frequencies.push(v),
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    });
    Object.assign(window, {
      __audioLog: log,
      AudioContext: class {
        state = "running";
        currentTime = 0;
        destination = {};
        constructor() {
          log.contexts++;
        }
        async resume() {}
        async suspend() {}
        async close() {}
        createOscillator() {
          return {
            frequency: param(),
            connect() {},
            start() {},
            stop() {},
            disconnect() {},
          };
        }
        createGain() {
          return {
            gain: { ...param(), setValueAtTime() {} },
            connect() {},
            disconnect() {},
          };
        }
      },
    });
  }, p);
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({ status: 200, json: {} }),
  );
}
async function progress(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
  );
}
async function audio(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __audioLog: AudioLog }).__audioLog,
  );
}

test("sound starts only after a gesture, toggle and volume survive reload", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/profile");
  await expect(
    page.getByRole("heading", { name: "Профиль", exact: true }),
  ).toBeVisible();
  expect((await audio(page)).contexts).toBe(0);
  await page
    .getByRole("button", { name: "Выключить звук", exact: true })
    .click();
  expect((await audio(page)).contexts).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Включить звук", exact: true }),
  ).toBeVisible();
  expect((await audio(page)).contexts).toBe(0);
  await page
    .getByRole("button", { name: "Включить звук", exact: true })
    .click();
  const range = page.getByLabel("Громкость звуков");
  await range.fill("0.25");
  await range.dispatchEvent("input");
  await expect
    .poll(async () => (await progress(page)).settings.soundVolume)
    .toBe(0.25);
  await page.reload();
  await expect(range).toHaveValue("0.25");
});
test("sound and search stay clear of counters on phone and tablet", async ({
  page,
}) => {
  await seed(page);
  for (const width of [390, 900]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app");
    await expect(page.locator(".kids-stats")).toBeVisible();
    await expect(page.locator(".g3-sound-toggle")).toBeVisible();
    const searchControl = page
      .getByRole("button", { name: "Поиск", exact: true })
      .filter({ visible: true });
    await expect(searchControl).toBeVisible();
    const sound = await page.locator(".g3-sound-toggle").boundingBox(),
      search = await searchControl.boundingBox(),
      stats = await page.locator(".kids-stats").boundingBox();
    expect(sound).not.toBeNull();
    expect(search).not.toBeNull();
    expect(stats).not.toBeNull();
    if (width === 390)
      expect(sound!.x + sound!.width).toBeLessThanOrEqual(search!.x);
    expect(stats!.y).toBeGreaterThanOrEqual(sound!.y + sound!.height);
    await page.screenshot({
      path: `reports/g3/home-${width}.png`,
      fullPage: true,
    });
  }
});

test("expensive purchase confirms, animates intermediate balances and charges once", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/shop");
  const item = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Ома", exact: true }) });
  await item.getByRole("button", { name: "Купить", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Купить за 60 искр?" });
  await expect(dialog).toBeVisible();
  expect((await progress(page)).sparks).toBe(200);
  await page.evaluate(() => {
    const values: number[] = [];
    Object.assign(window, { __balances: values });
    const el = document.querySelector(".kids-sparks strong")!;
    new MutationObserver(() => values.push(Number(el.textContent))).observe(
      el,
      { childList: true, subtree: true, characterData: true },
    );
  });
  await dialog.getByRole("button", { name: "Купить", exact: true }).dblclick();
  await expect(item.getByText("Куплено", { exact: true })).toBeVisible();
  await expect(page.locator(".kids-sparks strong")).toHaveText("140");
  const intermediate = await page.evaluate(
    () => (window as unknown as { __balances: number[] }).__balances,
  );
  expect(intermediate.some((v) => v > 140 && v < 200)).toBe(true);
  expect((await progress(page)).inventory).toEqual(["oma"]);
  await expect(
    page.getByRole("button", { name: "Мои предметы (1)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Мои предметы (1)" }).click();
  await page.getByRole("button", { name: "Выбрать", exact: true }).click();
  expect((await progress(page)).mentor.selectedId).toBe("oma");
  expect((await audio(page)).frequencies).toContain(1568);
  await page.waitForTimeout(2000);
  await expect(page.locator("[data-reward-particle]")).toHaveCount(0);
});

test("denial keeps balance and freeze purchase changes the actual streak icon", async ({
  page,
}) => {
  await seed(page, { sparks: 50, active: true });
  await page.goto("/app/shop");
  const oma = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Ома", exact: true }) });
  await oma.getByRole("button", { name: /Не хватает/ }).click();
  await expect(oma).toHaveClass(/g3-denied/);
  expect((await progress(page)).sparks).toBe(50);
  expect((await audio(page)).frequencies).toContain(165);
  await page.getByRole("button", { name: "Бусты", exact: true }).click();
  const freeze = page.locator(".dash-shop-item").filter({
    has: page.getByRole("heading", { name: "Заморозка серии", exact: true }),
  });
  await freeze.getByRole("button", { name: "Купить", exact: true }).click();
  await expect.poll(async () => (await progress(page)).boosts.freeze).toBe(1);
  await page.goto("/app");
  await expect(
    page.locator('.kids-stats [data-icon="streak"]'),
  ).toHaveAttribute("data-state", "frozen");
});

test("three missions open one chest and reward only once after reload", async ({
  page,
}) => {
  await seed(page, { missions: true });
  let calls = 0;
  await page.route("**/api/award", (r) => {
    calls++;
    return r.fulfill({ status: 500 });
  });
  await page.goto("/app");
  await expect(page.locator('[data-chest="open"]')).toBeVisible();
  await expect.poll(async () => (await progress(page)).sparks).toBe(210);
  expect((await progress(page)).mentor.tokens).toBe(55);
  expect(calls).toBe(0);
  await page.waitForTimeout(2100);
  await expect(
    page.locator("[data-reward-particle],[data-confetti]"),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".kids-stats")).toBeVisible();
  expect((await progress(page)).sparks).toBe(210);
  await expect(page.locator('[data-chest="open"]')).toHaveCount(0);
});

for (const freeze of [false, true])
  test(`expired run ${freeze ? "uses freeze" : "resets"} without fake activity`, async ({
    page,
  }) => {
    await seed(page, { expired: true, freeze });
    await page.goto("/app");
    await expect(
      page.getByRole("status").filter({
        hasText: freeze ? "Заморозка спасла серию!" : "Начнём заново!",
      }),
    ).toBeVisible();
    expect((await progress(page)).streak.count).toBe(freeze ? 7 : 0);
    await expect(page.locator(".kids-streak-day.is-active")).toHaveCount(5);
    if (freeze) expect((await progress(page)).boosts.freeze).toBe(0);
    await page.reload();
    await expect(page.locator(".kids-stats")).toBeVisible();
    await expect(
      page.getByRole("status").filter({
        hasText: freeze ? "Заморозка спасла серию!" : "Начнём заново!",
      }),
    ).toHaveCount(0);
  });

test("wrong quiz shakes, correct answer draws a check and plays distinct tones", async ({
  page,
}) => {
  await seed(page, { lesson: true });
  await page.goto("/app/lesson/lesson-1?stage=test");
  const wrong = page.locator(".flow-answer").nth(1);
  await wrong.click();
  await expect(wrong).toHaveClass(/is-incorrect/);
  expect(
    await wrong.evaluate((el) => getComputedStyle(el).animationName),
  ).toContain("g3-shake");
  expect((await audio(page)).frequencies).toContain(220);
  await page.getByRole("button", { name: /^Дальше/ }).click();
  await page.locator(".flow-answer").nth(1).click();
  await expect(page.locator(".flow-answer.is-correct .g3-check")).toBeVisible();
  expect((await audio(page)).frequencies).toContain(784);
});

test("reduced motion removes shop movement and particles while keeping enabled sound", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await page.goto("/app/shop");
  await page.getByRole("button", { name: "Бусты", exact: true }).click();
  const freeze = page.locator(".dash-shop-item").filter({
    has: page.getByRole("heading", { name: "Заморозка серии", exact: true }),
  });
  await freeze.getByRole("button", { name: "Купить", exact: true }).click();
  await expect(freeze.locator(".g3-purchase-stamp")).toHaveText("Куплено");
  expect(
    await freeze.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await expect(
    page.locator("[data-reward-particle],[data-confetti]"),
  ).toHaveCount(0);
  expect((await audio(page)).frequencies).toContain(1568);
});
