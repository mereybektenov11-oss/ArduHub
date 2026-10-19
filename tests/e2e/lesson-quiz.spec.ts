import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { lessonQuizzes } from "../../src/content/lesson-quiz.ru";
import { passLessonQuiz } from "./helpers/lessonQuiz";
import { createClient } from "@supabase/supabase-js";
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  const p = createProgress();
  p.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Продолжить без видео" }).click();
  await page.getByRole("button", { name: "Понятно" }).click();
});
test("six-question checkpoint blocks circuit, saves answers, explains errors and retries", async ({
  page,
}) => {
  await expect(page.locator(".l2-quiz h2")).toHaveText("Тест по теме");
  const circuitStep = page
    .locator(".l2-stepper")
    .getByRole("button", { name: /Схема$/ });
  await expect(circuitStep).toBeDisabled();
  await expect(page.locator(".l2-workspace")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Следующий вопрос/ }),
  ).toBeDisabled();
  const questions = lessonQuizzes["lesson-1"];
  await page
    .getByRole("radio", { name: questions[0].options[1], exact: true })
    .check();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: questions[0].options[1], exact: true }),
  ).toBeChecked();
  for (let i = 1; i < questions.length; i++) {
    await page
      .getByRole("button", { name: `Вопрос ${i + 1}`, exact: true })
      .click();
    await page
      .getByRole("radio", {
        name: questions[i].options[questions[i].correct],
        exact: true,
      })
      .check();
  }
  await page
    .getByRole("button", { name: "Проверить ответы", exact: true })
    .click();
  await expect(page.locator(".l2-quiz-result")).toHaveText(
    "Верных ответов: 5 из 6",
  );
  await expect(page.locator(".is-incorrect")).toContainText(
    questions[0].explanation,
  );
  await expect(circuitStep).toBeDisabled();
  await page.reload();
  await expect(page.locator(".l2-quiz-result")).toHaveText(
    "Верных ответов: 5 из 6",
  );
  await page
    .getByRole("button", { name: "Исправить ошибки", exact: true })
    .click();
  await page
    .getByRole("radio", { name: questions[0].options[0], exact: true })
    .check();
  await page.getByRole("button", { name: "Вопрос 6", exact: true }).click();
  await page
    .getByRole("button", { name: "Проверить ответы", exact: true })
    .click();
  await expect(page.locator(".l2-quiz-result")).toHaveText(
    "Верных ответов: 6 из 6",
  );
  await page.reload();
  await expect(circuitStep).toBeEnabled();
  await page.getByRole("button", { name: /Перейти к схеме/ }).click();
  await expect(
    page.getByRole("button", { name: "uno 13", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(0);
});
test("mobile keyboard quiz is accessible and opens the circuit on success", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const first = page.getByRole("radio").first();
  await first.focus();
  await first.press("Space");
  await expect(first).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page
    .locator(".l2-quiz")
    .screenshot({ path: "reports/lesson-quiz/mobile.png" });
  await passLessonQuiz(page);
  await expect(page.locator(".l2-workspace")).toBeVisible();
});

test("account saves quiz results to Supabase", async ({ page }) => {
  test.skip(
    !process.env.E2E_AUTH_EMAIL ||
      !process.env.E2E_AUTH_PASSWORD ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires the dedicated QA account",
  );
  test.setTimeout(60000);
  await page.addLocatorHandler(
    page.getByRole("dialog", { name: "Тур по кабинету" }),
    async (dialog) => {
      await dialog
        .getByRole("button", { name: "Пропустить", exact: true })
        .click();
    },
  );
  await page.getByRole("radio").first().check();
  await page.goto("/sign-in");
  await page.getByLabel("Почта").fill(process.env.E2E_AUTH_EMAIL!);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_AUTH_PASSWORD!);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Перенести прогресс гостя?" })
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Перенести прогресс гостя?" }),
  ).toBeHidden();
  await page.goto("/app/lesson/lesson-1");
  await expect(page.locator(".l2-quiz h2")).toHaveText("Тест по теме");
  const skip = page.getByRole("button", { name: "Пропустить", exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await passLessonQuiz(page);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: login, error } = await client.auth.signInWithPassword({
    email: process.env.E2E_AUTH_EMAIL!,
    password: process.env.E2E_AUTH_PASSWORD!,
  });
  expect(error).toBeNull();
  try {
    await expect
      .poll(
        async () => {
          const { data } = await client
            .from("drafts")
            .select("data")
            .eq("user_id", login.user!.id)
            .eq("lesson_id", "lesson-1")
            .single();
          return {
            passed: data?.data.steps.quiz,
            submitted: data?.data.quiz.submitted,
            answers: data?.data.quiz.answers,
          };
        },
        { timeout: 15000 },
      )
      .toEqual({
        passed: true,
        submitted: true,
        answers: lessonQuizzes["lesson-1"].map((q) => q.correct),
      });
    await page.reload();
    await expect(page.locator(".l2-workspace")).toBeVisible();
    await page
      .locator(".l2-stepper")
      .getByRole("button", { name: /Тест по теме$/ })
      .click();
    await expect(page.locator(".l2-quiz-result")).toHaveText(
      "Верных ответов: 6 из 6",
    );
  } finally {
    await client.auth.signOut();
  }
});
