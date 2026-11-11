import { achievementDeck } from "../../src/content/achievements.ru";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
import { passLessonQuiz } from "./helpers/lessonQuiz";
import { createClient } from "@supabase/supabase-js";

test.beforeEach(async ({ page, context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  const p = createProgress();
  p.profile.name = "Искра";
  // These feature fixtures represent a learner who has acknowledged reward notices.
  p.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((item) => item.id),
  };
  p.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, p);
  await page.route("**/api/lesson-video?*", (r) => r.fulfill({ json: {} }));
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
});

test("70% gate, immediate feedback, saved position, one retry and reward dedup", async ({
  page,
}) => {
  const questions = lessonQuizzes["lesson-1"];
  const practice = page
    .locator(".flow-stage-indicator")
    .getByRole("button", { name: "Практика", exact: true });
  await expect(practice).toBeDisabled();
  await expect(page.locator(".flow-answer")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Дальше →", exact: true }),
  ).toHaveCount(0);
  // Four correct answers are 67%, so practice must stay closed.
  for (let i = 0; i < 6; i++) {
    await page
      .locator(".flow-answer")
      .nth(i < 4 ? questions[i].correct : (questions[i].correct + 1) % 4)
      .click();
    await expect(page.locator(".flow-feedback")).toContainText(
      questions[i].explanation,
    );
    if (i === 1) {
      await page.reload();
      await expect(page.locator(".flow-question-progress")).toContainText(
        "Вопрос 2 из 6",
      );
      await expect(page.locator(".flow-answer").first()).toBeDisabled();
    }
    await page.getByRole("button", { name: "Дальше →", exact: true }).click();
  }
  await expect(page.locator(".flow-quiz-score")).toHaveText(
    "67% · Верно 4 из 6",
  );
  await expect(practice).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Пройти заново", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Повторить ошибки", exact: true })
    .click();
  await page.locator(".flow-answer").nth(questions[4].correct).click();
  await page.getByRole("button", { name: "Дальше →", exact: true }).click();
  await page
    .locator(".flow-answer")
    .nth((questions[5].correct + 1) % 4)
    .click();
  await page.getByRole("button", { name: "Дальше →", exact: true }).click();
  await expect(page.locator(".flow-quiz-score")).toHaveText(
    "83% · Верно 5 из 6",
  );
  await expect(
    page.getByRole("button", { name: "Повторить ошибки", exact: true }),
  ).toHaveCount(0);
  await expect(practice).toBeEnabled();
  const xp = await page.evaluate(
    () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
  );
  expect(xp).toBe(5);
  await page.goto("/app/lesson/lesson-1");
  await expect(page.locator(".flow-practice")).toBeVisible();
  await page
    .locator(".flow-stage-indicator")
    .getByRole("button", { name: /Тест/, exact: false })
    .click();
  await expect(page.locator(".flow-quiz-score")).toContainText("83%");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(xp);
});

test("mobile keyboard quiz is accessible and opens practice on success", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const first = page.locator(".flow-answer").first();
  await first.focus();
  await first.press("Space");
  await expect(page.locator(".flow-feedback")).toContainText("Верно");
  await page.locator(".flow-feedback").evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
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
    .locator(".flow-quiz")
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
  await page.locator(".flow-answer").first().click();
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
  await page.goto("/app/lesson/lesson-1?stage=test");
  await expect(page.locator(".flow-quiz h1")).toHaveText("Тест по теме");
  const skip = page.getByRole("button", { name: "Пропустить", exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator(".flow-answer").first()).toBeDisabled();
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
            submitted: data?.data.flow.quiz.phase,
            answers: data?.data.flow.quiz.answers,
          };
        },
        { timeout: 15000 },
      )
      .toEqual({
        passed: true,
        submitted: "result",
        answers: Object.fromEntries(
          lessonQuizzes["lesson-1"].map((q, i) => [`q${i + 1}`, q.correct]),
        ),
      });
    await page.reload();
    await expect(page.locator(".l2-workspace")).toBeVisible();
    await page
      .locator(".flow-stage-indicator")
      .getByRole("button", { name: /Тест/ })
      .click();
    await expect(page.locator(".flow-quiz-score")).toHaveText(
      "100% · Верно 6 из 6",
    );
  } finally {
    await client.auth.signOut();
  }
});
