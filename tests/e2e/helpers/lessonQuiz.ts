import type { Page } from "@playwright/test";
import { lessonQuizzes } from "../../../src/content/lesson-quiz.ru";
export async function passLessonQuiz(page: Page, id = "lesson-1") {
  const questions = lessonQuizzes[id];
  for (let i = 0; i < questions.length; i++) {
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
  await page
    .getByRole("button", { name: "Перейти к схеме", exact: false })
    .click();
}
