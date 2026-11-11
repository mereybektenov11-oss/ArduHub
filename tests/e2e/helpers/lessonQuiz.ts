import { expect, type Page } from "@playwright/test";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
export async function passLessonQuiz(page: Page, id = "lesson-1") {
  const questions = lessonQuizzes[id];
  if (
    await page
      .getByRole("button", { name: "К практике →", exact: true })
      .isVisible()
  ) {
    await page
      .getByRole("button", { name: "К практике →", exact: true })
      .click();
    return;
  }
  for (let i = 0; i < questions.length; i++) {
    await expect(page.locator(".flow-question-progress")).toContainText(
      `Вопрос ${i + 1} из`,
    );
    const answer = page.locator(".flow-answer").nth(questions[i].correct);
    if (await answer.isEnabled()) await answer.click();
    await page.getByRole("button", { name: "Дальше →", exact: true }).click();
  }
  await page.getByRole("button", { name: "К практике →", exact: true }).click();
  await expect(page.locator(".l2-workspace")).toBeVisible();
}
