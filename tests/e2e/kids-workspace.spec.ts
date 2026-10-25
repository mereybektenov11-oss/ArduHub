import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";
import { initialFlowQuiz } from "../../src/domain/lessons/flow";
async function setup(page: Page) {
  const p = createProgress();
  p.profile.name = "Искра";
  p.tourSeen = { "/app/lesson/lesson-1": true };
  const evidence = completeEvidence("lesson-1");
  evidence.stages.practice = false;
  evidence.practice.run = false;
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
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({ status: 200, json: {} }),
  );
}
test("practice has six core tools, hidden extras and fitted 60 percent canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  const toolbar = page.getByRole("toolbar", { name: "Инструменты схемы" });
  await expect(toolbar).toBeVisible({ timeout: 2500 });
  await expect(toolbar.getByRole("button")).toHaveCount(6);
  expect(
    (await page
      .getByRole("button", { name: "Запустить", exact: true })
      .boundingBox())!.height,
  ).toBeGreaterThanOrEqual(56);
  await expect(
    page.getByText("Цвет провода", { exact: true }),
  ).not.toBeVisible();
  await expect(page.getByRole("slider", { name: "Масштаб" })).toHaveCount(0);
  await expect(page.getByText(/Детали:.*\/60/)).toHaveCount(0);
  const canvas = page.locator(".l2-canvas-scroll");
  expect((await canvas.boundingBox())!.height).toBeGreaterThanOrEqual(540);
  await expect
    .poll(async () =>
      page.locator(".l2-part").evaluateAll((parts) => {
        const view = parts[0]
          ?.closest(".l2-canvas-scroll")
          ?.getBoundingClientRect();
        return (
          !!view &&
          parts.every((part) => {
            const b = part.getBoundingClientRect();
            return (
              b.left >= view.left - 1 &&
              b.top >= view.top - 1 &&
              b.right <= view.right + 1 &&
              b.bottom <= view.bottom + 1
            );
          })
        );
      }),
    )
    .toBe(true);
  await page.locator(".kids-canvas-menu > summary").click();
  await expect(page.getByText("Цвет провода", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Убрать все провода", exact: true }),
  ).toBeVisible();
  await page.locator(".kids-canvas-menu > summary").click();
  await page.screenshot({
    path: "reports/g2/practice-1440.png",
    fullPage: true,
  });
});
test("settings contain text size and code controls, quiz answers are 56px", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  await expect(
    page.getByRole("combobox", { name: "Размер текста" }),
  ).not.toBeVisible();
  await page.getByLabel("Настройки урока", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Размер текста" }),
  ).toBeVisible();
  await page.getByLabel("Настройки урока", { exact: true }).click();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await expect(
    page.getByLabel("Увеличить шрифт кода", { exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Настройки кода", { exact: true }).click();
  await expect(
    page.getByLabel("Увеличить шрифт кода", { exact: true }),
  ).toBeVisible();
  await page.evaluate((quiz) => {
    const p = JSON.parse(localStorage.getItem("arduhub.progress.v1")!);
    p.lessons["lesson-1"].stages.test = false;
    p.lessons["lesson-1"].quiz = quiz;
    localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    const d = JSON.parse(localStorage.getItem("arduhub.drafts.v1")!);
    d.drafts["lesson-1"].flow.stages.test = false;
    d.drafts["lesson-1"].flow.quiz = quiz;
    localStorage.setItem("arduhub.drafts.v1", JSON.stringify(d));
  }, initialFlowQuiz());
  await page.goto("/app/lesson/lesson-1?stage=test");
  const answers = page.locator(".flow-answer");
  await expect(answers).toHaveCount(4);
  for (const button of await answers.all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(56);
});
test("mobile editor and keyboard controls remain accessible without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  await expect(
    page.getByRole("toolbar", { name: "Инструменты схемы" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "reports/g2/practice-390.png",
    fullPage: true,
  });
});
