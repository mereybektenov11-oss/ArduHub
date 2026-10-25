import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { initialFlowQuiz } from "../../src/domain/lessons/flow";
async function prepare(page: Page) {
  const p = createProgress();
  p.profile.name = "Искра";
  p.tourSeen = { "/app/lesson/lesson-1": true, "/app/practice/blitz": true };
  p.lessons["lesson-1"] = {
    ...p.lessons["lesson-1"],
    video: { confirmed: true },
    stages: { video: true, test: false, practice: false },
    practice: { circuit: false, code: false, run: false },
    quiz: initialFlowQuiz(),
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
test("wrong quiz answer opens a question draft and sends its lesson context only on request", async ({
  page,
}) => {
  await prepare(page);
  let posted: { lessonId?: string; message?: string } | undefined;
  await page.route("**/api/mentor", async (r) => {
    posted = r.request().postDataJSON();
    await r.fulfill({
      status: 200,
      json: { reply: "Проверь, куда идёт ток через резистор." },
    });
  });
  await page.goto("/app/lesson/lesson-1?stage=test");
  await page.locator(".flow-answer").nth(1).click();
  await page.getByRole("button", { name: "Объясни", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox")).toHaveValue(/Объясни вопрос:/);
  expect(posted).toBeUndefined();
  await dialog.getByRole("button", { name: /Отправить/ }).click();
  await expect.poll(() => posted?.lessonId).toBe("lesson-1");
  expect(posted?.message).toContain("Мой ответ:");
  await expect(dialog.locator(".cab-chat")).toContainText(
    "Проверь, куда идёт ток через резистор.",
  );
});
test("game has no mentor entry until a loss and supplies actual mistakes to the chat", async ({
  page,
}) => {
  await prepare(page);
  let posted: { context?: { errors?: string[] } } | undefined;
  await page.route("**/api/mentor", async (r) => {
    posted = r.request().postDataJSON();
    await r.fulfill({
      status: 200,
      json: { reply: "Проверь номер пина и путь к светодиоду." },
    });
  });
  await page.goto("/app/practice/blitz");
  await expect(
    page.getByRole("button", { name: "Разбор ошибок", exact: true }),
  ).toHaveCount(0);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "13", exact: true }).click();
    await page.getByRole("button", { name: "5V", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Разбор ошибок", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox")).toHaveValue(/Помоги разобраться/);
  await dialog.getByRole("button", { name: /Отправить/ }).click();
  await expect.poll(() => posted?.context?.errors?.length).toBe(3);
});
