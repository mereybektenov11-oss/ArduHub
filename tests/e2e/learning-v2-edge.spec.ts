import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import {
  exampleScene,
  learningLessons,
} from "../../src/domain/lessons/content";
import sketches from "../../src/content/sketches.json" with { type: "json" };
for (const index of [2, 5])
  test(`v2 lesson ${index + 1} checks real input and output behavior`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    const p = createProgress();
    p.profile.level = 4;
    p.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
    for (let i = 1; i <= 12; i++) p.tourSeen["/app/lesson/lesson-" + i] = true;
    for (let i = 0; i < index; i++)
      p.lessons[`lesson-${i + 1}`].status = "done";
    const scene = exampleScene(index === 2 ? "button" : "pwm");
    if (index === 2) {
      scene.components.find((c) => c.type === "button")!.id = "custombutton";
      for (const w of scene.wires)
        for (const pin of [w.from, w.to])
          if (pin.componentId === "btn") pin.componentId = "custombutton";
    }
    const id = `lesson-${index + 1}`,
      draft = {
        scene,
        code: learningLessons[index].code.starter,
        step: 2,
        steps: {
          video: true,
          theory: true,
          quiz: true,
          circuit: false,
          code: false,
          run: false,
        },
      };
    await page.addInitScript(
      ({ p, id, draft }) => {
        localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
        localStorage.setItem(
          "arduhub.drafts.v1",
          JSON.stringify({
            version: 1,
            curriculumVersion: 2,
            drafts: { [id]: draft },
          }),
        );
      },
      { p, id, draft },
    );
    await page.goto(`/app/lesson/${id}`);
    await page
      .getByRole("button", { name: "Проверить схему", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Код", exact: true })
      .fill(sketches[index === 2 ? 1 : 2].code);
    await page.getByRole("button", { name: /^Дальше/ }).click();
    await page.getByRole("button", { name: /^Запустить/ }).click();
    await expect(
      page.getByRole("heading", { name: "Урок пройден!" }),
    ).toBeVisible({ timeout: 30000 });
  });
test("constant high never passes blink and compiler diagnostics mark the code", async ({
  page,
}) => {
  test.setTimeout(45000);
  const p = createProgress();
  p.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
  for (let i = 1; i <= 12; i++) p.tourSeen["/app/lesson/lesson-" + i] = true;
  const draft = {
    scene: exampleScene(),
    code: sketches[4].code,
    step: 4,
    steps: { video: true, theory: true, circuit: true, code: true, run: false },
  };
  await page.addInitScript(
    ({ p, draft }) => {
      if (!localStorage.getItem("arduhub.progress.v1")) {
        localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
        localStorage.setItem(
          "arduhub.drafts.v1",
          JSON.stringify({ version: 1, drafts: { "lesson-1": draft } }),
        );
      }
    },
    { p, draft },
  );
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByText("Пин 13 не менялся достаточно часто.", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(0);
  await page.route("**/api/compile", (r) =>
    r.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "compile_error",
        diagnostics: [
          { line: 2, col: 3, message: "expected ';' before '}' token" },
        ],
      }),
    }),
  );
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Код", exact: true })
    .fill("void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {}");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page
      .locator(".l2-error")
      .filter({ hasText: "Похоже, в конце команды нет точки с запятой." }),
  ).toBeVisible();
  await expect(page.locator(".cm-lintRange-error")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Стоп/ })).toBeDisabled();
});

// Cabinet regression scenarios use the explicit guest session.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
});
