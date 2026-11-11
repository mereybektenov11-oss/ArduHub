import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";
import { stubExternalVideo } from "./helpers/externalVideo";
import { dismissRewardDialogs } from "./helpers/rewardDialogs";
test.use({ actionTimeout: 15_000 });

type AudioLog = { contexts: number; notes: number[] };
async function audioProbe(page: Page) {
  await page.addInitScript(() => {
    const root = window as typeof window & { g4Audio: AudioLog };
    root.g4Audio = { contexts: 0, notes: [] };
    const parameter = () => ({
      setValueAtTime(value: number) {
        root.g4Audio.notes.push(value);
      },
      exponentialRampToValueAtTime() {},
      linearRampToValueAtTime() {},
      cancelScheduledValues() {},
    });
    class FakeAudioContext {
      state = "running";
      currentTime = 0;
      destination = {};
      constructor() {
        root.g4Audio.contexts++;
      }
      resume() {
        return Promise.resolve();
      }
      createGain() {
        return {
          gain: { ...parameter(), setValueAtTime() {} },
          connect() {},
          disconnect() {},
        };
      }
      createOscillator() {
        return {
          frequency: parameter(),
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
        };
      }
    }
    window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });
}
const notes = (page: Page) =>
  page.evaluate(
    () => (window as typeof window & { g4Audio: AudioLog }).g4Audio.notes,
  );
async function dismissTour(page: Page) {
  // Exercise the real tour dismissal instead of pre-seeding the student's preferences.
  const tour = page.locator(".cab-tour-card");
  await page.waitForTimeout(850);
  if (await tour.isVisible())
    await tour.getByRole("button", { name: "Пропустить", exact: true }).click();
}
async function audit(page: Page) {
  // Route content fades in (PageTransition); measure contrast on the settled
  // page, not on a semi-transparent intermediate frame.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Infinity,
      ),
  );
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
}
async function fresh(page: Page) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.route("**/api/lesson-video?*", (r) => r.fulfill({ json: {} }));
  await stubExternalVideo(page);
  await audioProbe(page);
  await page.goto("/app");
  const dialog = page.getByRole("dialog", { name: "Как тебя зовут?" });
  await expect(dialog).toBeVisible();
  expect(await notes(page)).toEqual([]);
  await dialog.getByLabel("Твой ник", { exact: true }).fill("Искра");
  await dialog.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await dismissTour(page);
}
const getProgress = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("arduhub.progress.v1")!));

for (const mode of ["service", "browser", "mobile-reduced"] as const) {
  test(`G17 fresh learner full journey: ${mode}`, async ({ page }) => {
    test.setTimeout(120_000);
    if (mode === "mobile-reduced") {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    let compileCalls = 0;
    const hex = await readFile("tests/fixtures/firmware/blink.hex", "utf8");
    await page.route("**/api/compile", (route) => {
      compileCalls++;
      return route.fulfill(
        mode === "service"
          ? { json: { hex, warnings: [], source: "service" } }
          : { status: 503, json: { error: "compiler_unconfigured" } },
      );
    });
    await fresh(page);
    await expect(page.locator(".kids-continue .cab-btn")).toHaveCount(1);
    await expect(page.getByText("Продолжить", { exact: true })).toHaveCount(1);
    await expect(page.getByTestId("mentor-fab")).toHaveCount(0);
    await expect(page.locator(".dash-node.current")).toHaveCount(1);
    await audit(page);
    await page.locator(".kids-continue .cab-btn").click();
    await expect(page.locator(".flow-video-stage")).toBeVisible();
    await dismissTour(page);
    await page
      .getByRole("button", { name: "Я посмотрел", exact: true })
      .click();
    await page.getByRole("button", { name: "К тесту", exact: true }).click();
    const questions = lessonQuizzes["lesson-1"];
    for (let i = 0; i < questions.length; i++) {
      await expect(page.locator(".flow-question-progress")).toContainText(
        `Вопрос ${i + 1} из`,
      );
      const before = (await notes(page)).length;
      const selected =
        i === 0
          ? (questions[i].correct + 1) % questions[i].options.length
          : questions[i].correct;
      await page.locator(".flow-answer").nth(selected).click();
      await expect(
        page.locator(`.flow-feedback.is-${i === 0 ? "incorrect" : "correct"}`),
      ).toBeVisible();
      await expect
        .poll(async () => (await notes(page)).slice(before))
        .toContain(i === 0 ? 196 : 784);
      await page.getByRole("button", { name: "Дальше", exact: true }).click();
    }
    await page.getByRole("button", { name: "К практике", exact: true }).click();
    await page.getByRole("tab", { name: "Код", exact: true }).click();
    // Service mode uses an Arduino include to bypass the interpreter and known-code cache.
    // The fixture is real compiled Blink firmware; no compiler availability is claimed here.
    const code =
      mode === "service"
        ? `#include <Arduino.h>\n${learningLessons[0].code.solution}`
        : learningLessons[0].code.solution.replace(
            /delay\(\s*\d+\s*\)/g,
            "delay(333)",
          );
    await page.getByRole("textbox", { name: "Код", exact: true }).fill(code);
    await page.getByRole("tab", { name: "Схема", exact: true }).click();
    for (const [a, b] of [
      ["uno 13", "r 1"],
      ["r 2", "led A"],
      ["led C", "uno GND.2"],
    ]) {
      await page.getByRole("button", { name: a, exact: true }).click();
      await page.getByRole("button", { name: b, exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Проверить схему", exact: true })
      .click();
    if (mode === "mobile-reduced")
      await page
        .getByRole("button", { name: "Показать задание", exact: true })
        .click();
    await expect(page.locator(".flow-checklist")).toBeVisible();
    await page.getByRole("button", { name: /^Запустить/ }).click();
    const completed = page.getByRole("dialog", { name: "Урок пройден!" });
    await expect(completed).toBeVisible({ timeout: 35_000 });
    expect(compileCalls).toBe(mode === "service" ? 1 : 0);
    expect((await getProgress(page)).sparks).toBe(10);
    if (mode === "mobile-reduced")
      await expect(
        page.locator("[data-confetti],[data-reward-particle]"),
      ).toHaveCount(0);
    await completed.getByRole("link", { name: "К пути", exact: true }).click();
    await dismissRewardDialogs(page);
    await expect(page.locator(".dash-node.done")).toHaveCount(1);
    await expect(page.locator(".dash-node.current")).toHaveCount(1);
    await expect(page.locator(".kids-continue a")).toHaveAttribute(
      "href",
      /lesson-2/,
    );
    await page.goto("/app/lessons");
    await expect(page.locator(".cab-lesson-list-row.done")).toHaveCount(1);
    await expect(page.locator(".cab-lesson-list-row.current")).toHaveCount(1);
    await expect(page.locator(".cab-lesson-list-row.current")).toContainText(
      "Мигаем быстрее",
    );
    await page.goto("/app/map");
    await expect(page.locator(".island-map-node.is-current")).toHaveCount(1);
    await page.goto("/app/shop");
    await dismissTour(page);
    await page.getByRole("button", { name: "Бусты", exact: true }).click();
    const item = page.locator(".dash-shop-item").filter({
      has: page.getByRole("heading", {
        name: "Токены наставника",
        exact: true,
      }),
    });
    await item.getByRole("button").click();
    await expect(item).toHaveClass(/g3-denied/);
    expect((await getProgress(page)).sparks).toBe(10);
    for (const route of ["/app", "/app/map", "/app/shop", "/app/leaderboard"]) {
      await page.goto(route);
      await expect(page.getByTestId("mentor-fab")).toHaveCount(0);
      expect(await page.locator("main").innerText()).not.toMatch(
        /гост[а-яё]*|демо[а-яё]*|скоро(?![а-яё])|в\s+разработке|ранн[а-яё]*\s+доступ/iu,
      );
    }
    await page.goto("/app/profile");
    await dismissTour(page);
    await page.getByRole("switch", { name: "Звуки", exact: true }).uncheck();
    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Звуки", exact: true }),
    ).not.toBeChecked();
    const silentBefore = (await notes(page)).length;
    await page
      .getByRole("switch", { name: "Подсказки наставника", exact: true })
      .click();
    expect((await notes(page)).length).toBe(silentBefore);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await audit(page);
  });
}

test("G17 map and icon screenshots with accessibility at three widths", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await fresh(page);
  await mkdir("reports/g4/screenshots", { recursive: true });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/dev/icons", "/app/map"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await audit(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `reports/g4/screenshots/${route === "/dev/icons" ? "icons" : "map"}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
});

test("G17 cabinet event performance and cleanup", async ({ page }) => {
  test.skip(
    !process.env.G4_PROFILE,
    "Run through scripts/profile-cabinet-events.mjs",
  );
  test.setTimeout(90_000);
  // Separate fixture: verified completed lesson evidence funds repeated real shop interactions.
  // This is intentionally not used by the fresh learner journey above.
  const progress = createProgress();
  progress.profile.name = "Проверка";
  progress.sparks = 200;
  for (const id of ["lesson-1", "lesson-2", "lesson-3"])
    progress.lessons[id] = {
      ...progress.lessons[id],
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
  }, progress);
  await page.goto("/app/shop");
  await dismissTour(page);
  await dismissRewardDialogs(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const baseline = await cdp.send("Runtime.getHeapUsage");
  await page.evaluate(() => {
    const root = window as typeof window & {
      g4Frames: number[];
      g4MaxParticles: number;
      g4Running: boolean;
    };
    root.g4Frames = [];
    root.g4MaxParticles = 0;
    root.g4Running = true;
    let previous = performance.now();
    const tick = (now: number) => {
      root.g4Frames.push(now - previous);
      previous = now;
      root.g4MaxParticles = Math.max(
        root.g4MaxParticles,
        document.querySelectorAll("[data-confetti],[data-reward-particle]")
          .length,
      );
      if (root.g4Running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByRole("button", { name: "Бусты", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    const item = page.locator(".dash-shop-item").filter({
      has: page.getByRole("heading", {
        name: "Токены наставника",
        exact: true,
      }),
    });
    await item.getByRole("button", { name: "Купить", exact: true }).click();
    await expect(item.locator(".g3-purchase-stamp")).toBeVisible();
    await expect
      .poll(async () => (await getProgress(page)).sparks)
      .toBe(200 - (i + 1) * 25);
    await expect(
      page.locator("[data-confetti],[data-reward-particle]"),
    ).toHaveCount(0, { timeout: 4000 });
    await expect(
      item.getByRole("button", { name: "Купить", exact: true }),
    ).toBeEnabled();
    await dismissRewardDialogs(page);
  }
  const measurement = await page.evaluate(() => {
    const root = window as typeof window & {
      g4Frames: number[];
      g4MaxParticles: number;
      g4Running: boolean;
    };
    root.g4Running = false;
    const frames = root.g4Frames.slice(1),
      sorted = [...frames].sort((a, b) => a - b);
    return {
      frames: frames.length,
      observedAverageFps:
        1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      maxFrameMs: Math.max(...frames),
      peakParticles: root.g4MaxParticles,
      particlesAfterCleanup: document.querySelectorAll(
        "[data-confetti],[data-reward-particle]",
      ).length,
    };
  });
  await page.goto("/app/profile");
  await dismissTour(page);
  await dismissRewardDialogs(page);
  const claims: { id: string; before: number; after: number }[] = [];
  for (const id of ["first-light", "buyer"]) {
    const reward = page.locator(`[data-sticker="${id}"]`);
    await expect(reward).toHaveAttribute("data-earned", "true");
    const before = (await getProgress(page)).sparks;
    await reward
      .getByRole("button", { name: "Забрать 5 искр", exact: true })
      .click();
    await expect(
      reward.getByRole("button", { name: "Награда получена", exact: true }),
    ).toBeDisabled();
    await expect
      .poll(async () => (await getProgress(page)).sparks)
      .toBe(before + 5);
    await expect(
      page.locator("[data-confetti],[data-reward-particle]"),
    ).toHaveCount(0, { timeout: 4000 });
    claims.push({ id, before, after: (await getProgress(page)).sparks });
  }
  await cdp.send("HeapProfiler.collectGarbage");
  const after = await cdp.send("Runtime.getHeapUsage");
  await mkdir("reports/g4", { recursive: true });
  await writeFile(
    "reports/g4/performance.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        scope:
          "RAF sampled during three real token purchases. Two real sticker claims checked separately for exact rewards and cleanup. Completed-lesson funding fixture; heap spans shop-to-profile navigation and is observational, not a leak proof.",
        ...measurement,
        claims,
        heapBeforeBytes: baseline.usedSize,
        heapAfterBytes: after.usedSize,
        heapDeltaBytes: after.usedSize - baseline.usedSize,
      },
      null,
      2,
    ),
  );
  expect(measurement.peakParticles).toBeLessThanOrEqual(60);
  expect(measurement.particlesAfterCleanup).toBe(0);
  expect((await getProgress(page)).mentor.tokens).toBe(
    progress.mentor.tokens + 30,
  );
});
