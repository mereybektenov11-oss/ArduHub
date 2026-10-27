import { completeEvidence } from "../helpers/progressEvidence";
import { achievementDeck } from "../../src/content/achievements.ru";
import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";

async function lesson(page: Page) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const progress = createProgress();
  progress.profile.name = "Искра";
  // These feature fixtures represent a learner who has acknowledged reward notices.
  progress.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((item) => item.id),
  };
  const evidence = completeEvidence("lesson-1");
  evidence.stages.practice = false;
  evidence.practice.run = false;
  progress.lessons["lesson-1"] = {
    ...progress.lessons["lesson-1"],
    ...evidence,
    status: "current",
  };
  progress.tourSeen = { "/app/lesson/lesson-1": true, "/app": true };
  await page.addInitScript(
    ({ progress, lesson }) => {
      if (localStorage.getItem("arduhub.progress.v1")) return;
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
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
                circuit: true,
                code: false,
                run: false,
              },
            },
          },
        }),
      );
    },
    { progress, lesson: learningLessons[0] },
  );
  await page.goto("/app/lesson/lesson-1?stage=practice");
}

test("Practice executes real AVR from the code tab and preserves results", async ({
  page,
}) => {
  test.setTimeout(60000);
  await lesson(page);
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByRole("heading", { name: "Урок пройден!" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("tab", { name: "Код", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".flow-output")).toContainText("Светодиод мигает!");
});

test("wire pointer selection, visible removal, undo and Delete work without losing history", async ({
  page,
}) => {
  await lesson(page);
  await page.getByRole("tab", { name: "Схема", exact: true }).click();
  const wires = page.locator(".l2-wires [role=button]");
  const count = await wires.count();
  await wires.first().scrollIntoViewIfNeeded();
  // Click the midpoint of the actual wire, not its SVG bounding-box centre.
  const midpoint = await wires.first().evaluate((el) => {
    const wire = el as SVGPolylineElement;
    const point = wire.getPointAtLength(wire.getTotalLength() / 2);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(
      wire.getScreenCTM()!,
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.click(midpoint.x, midpoint.y);
  await page.locator(".kids-canvas-menu > summary").click();
  await page
    .getByRole("button", { name: "Удалить провод", exact: true })
    .click();
  await expect(wires).toHaveCount(count - 1);
  await page
    .getByRole("toolbar", { name: "Инструменты схемы" })
    .getByRole("button", { name: "Отмена", exact: true })
    .click();
  await expect(wires).toHaveCount(count);
  await wires.first().focus();
  await wires.first().press("Enter");
  await page.keyboard.press("Delete");
  await expect(wires).toHaveCount(count - 1);
  await page.reload();
  await expect(wires).toHaveCount(count - 1);
});

test("component bodies drag without a name popup and guide keeps spacing on mobile", async ({
  page,
}) => {
  await lesson(page);
  await page.getByRole("tab", { name: "Схема", exact: true }).click();
  const handle = page.locator("[data-component=led] .l2-part-handle");
  await handle.hover();
  await expect(handle).toHaveText("");
  await expect(page.locator(".l2-canvas [title]")).toHaveCount(0);
  const before = await handle.boundingBox();
  await page.mouse.move(
    before!.x + before!.width / 2,
    before!.y + before!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before!.x + before!.width / 2 + 40,
    before!.y + before!.height / 2 + 30,
    { steps: 5 },
  );
  await page.mouse.up();
  expect((await handle.boundingBox())!.x).toBeGreaterThan(before!.x + 20);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Показать задание", exact: true })
    .click();
  await page
    .locator(".l2-lesson-guide")
    .screenshot({ path: "reports/usability/guide-mobile.png" });
});

test("one click clears only wires, undo restores them and pending connections are cancelled", async ({
  page,
}) => {
  await lesson(page);
  await page.getByRole("tab", { name: "Схема", exact: true }).click();
  const wires = page.locator(".l2-wires [role=button]");
  const parts = page.locator(".l2-part");
  const count = await wires.count(),
    partCount = await parts.count();
  const clear = page.getByRole("button", {
    name: "Убрать все провода",
    exact: true,
  });
  await page.getByRole("button", { name: "uno 13", exact: true }).click();
  await page.locator(".kids-canvas-menu > summary").click();
  await clear.click();
  await expect(wires).toHaveCount(0);
  await expect(parts).toHaveCount(partCount);
  await expect(clear).toBeDisabled();
  await page.getByRole("button", { name: "led A", exact: true }).click();
  await expect(wires).toHaveCount(0);
  await page
    .getByRole("toolbar", { name: "Инструменты схемы" })
    .getByRole("button", { name: "Отмена", exact: true })
    .click();
  await expect(wires).toHaveCount(count);
  await page
    .getByRole("toolbar", { name: "Инструменты схемы" })
    .getByRole("button", { name: "Повтор", exact: true })
    .click();
  await expect(wires).toHaveCount(0);
  await page.reload();
  await expect(wires).toHaveCount(0);
  await expect(parts).toHaveCount(partCount);
});

test("edited sketch is compiled by Arduino CLI and runs in the browser", async ({
  page,
}) => {
  test.setTimeout(60000);
  await lesson(page);
  const code =
    '#include <Arduino.h>\nvoid setup(){pinMode(13,OUTPUT);Serial.begin(9600);}\nvoid loop(){digitalWrite(13,HIGH);Serial.println("Edited 137");delay(137);digitalWrite(13,LOW);delay(251);}';
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page.getByRole("textbox", { name: "Код", exact: true }).fill(code);
  await page.getByRole("tab", { name: "Монитор порта", exact: true }).click();
  const compiled = page.waitForResponse(
    (r) => r.url().endsWith("/api/compile") && r.request().method() === "POST",
  );
  const run = page
    .locator(".l2-workbar")
    .getByRole("button", { name: /^Запустить/ });
  await run.click();
  const response = await compiled;
  expect(response.status()).toBe(200);
  expect((await response.json()).source).toBe("service");
  await expect(page.getByRole("log", { name: "Монитор порта" })).toContainText(
    "Edited 137",
    { timeout: 15000 },
  );
  await expect(run).toBeEnabled({ timeout: 15000 });
  await page
    .getByRole("dialog", { name: "Урок пройден!" })
    .getByRole("button", { name: "Закрыть", exact: true })
    .click();
  await page
    .locator(".l2-workspace")
    .screenshot({ path: "reports/compiler-clear/edited-code.png" });
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Код", exact: true })
    .fill("void setup(){\n pinMode(13, OUTPUT)\n}\nvoid loop(){}");
  await run.click();
  await expect(
    page.locator(".l2-workspace > .l2-error[role=alert]"),
  ).toContainText("Исправь ошибки", { timeout: 30000 });
});
