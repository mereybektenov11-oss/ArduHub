import { test, expect } from "@playwright/test";
import { createProgress, lessons } from "../../src/domain/seed";
import { initialFlowQuiz } from "../../src/domain/lessons/flow";
import { learningLessons } from "../../src/domain/lessons/content";
test("path, map and lesson list share the single current lesson and clean stages", async ({
  page,
}) => {
  const p = createProgress();
  p.profile.name = "Тестер";
  p.tourSeen = {
    "/app": true,
    "/app/map": true,
    "/app/map/0": true,
    "/app/lessons": true,
    "/app/lesson/lesson-2": true,
  };
  const quiz = initialFlowQuiz();
  quiz.phase = "result";
  quiz.lastScore = 100;
  quiz.answers = Object.fromEntries(
    learningLessons[0].quiz!.questions.map((q) => [q.id, q.correctIndex]),
  );
  p.lessons[lessons[0].id] = {
    ...p.lessons[lessons[0].id],
    status: "done",
    video: { confirmed: true },
    stages: { video: true, test: true, practice: true },
    practice: { circuit: true, code: true, run: true },
    quiz,
  };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((progress) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
  }, p);
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({ status: 200, json: {} }),
  );
  await page.goto("/app");
  const prompt = page.getByRole("dialog", { name: "Сохрани прогресс" });
  if (await prompt.isVisible())
    await prompt.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".dash-node.current")).toHaveCount(1);
  await expect(page.locator(".dash-node.current")).toHaveAccessibleName(
    new RegExp(lessons[1].title),
  );
  await page.goto("/app/map/0");
  await expect(page.locator(".cab-path-step.current")).toHaveCount(1);
  await expect(page.locator(".cab-path-step.current")).toContainText(
    lessons[1].title,
  );
  await page.goto("/app/lessons");
  await expect(page.locator(".cab-lesson-list-row.current")).toHaveCount(1);
  await expect(page.locator(".cab-lesson-list-row.current")).toContainText(
    lessons[1].title,
  );
  await expect(page.locator(".cab-lesson-list-row.locked")).toHaveCount(10);
  await page.goto("/app/lesson/lesson-2?stage=practice");
  await expect(page.locator(".flow-video-stage")).toBeVisible();
  await expect(page.locator(".flow-stage-indicator .is-done")).toHaveCount(0);
  await page.goto("/app/map/1");
  await expect(page.locator(".cab-path-step")).toHaveCount(0);
});
