import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { completeEvidence } from "../helpers/progressEvidence";

test("a restored 6-of-6 result with a stale stage flag opens practice and survives reload", async ({
  page,
  baseURL,
}) => {
  const progress = createProgress();
  progress.profile.name = "Лис";
  progress.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
  const evidence = completeEvidence("lesson-1");
  evidence.stages.test = false;
  evidence.stages.practice = false;
  evidence.practice = { circuit: false, code: false, run: false };
  evidence.quiz.lastScore = 0;
  progress.lessons["lesson-1"] = {
    ...progress.lessons["lesson-1"],
    ...evidence,
    status: "current",
  };
  const lesson = learningLessons[0];
  await page
    .context()
    .addCookies([{ name: "arduhub-guest", value: "1", url: baseURL! }]);
  await page.addInitScript(
    ({ progress, lesson, evidence }) => {
      if (localStorage.getItem("arduhub.progress.v1")) return;
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
      localStorage.setItem(
        "arduhub.drafts.v1",
        JSON.stringify({
          version: 1,
          curriculumVersion: 2,
          drafts: {
            "lesson-1": {
              scene: lesson.circuit.starterScene,
              code: lesson.code.starter,
              step: 5,
              steps: {
                video: true,
                theory: true,
                quiz: false,
                circuit: false,
                code: false,
                run: false,
              },
              flow: { version: 2, stage: "test", ...evidence },
            },
          },
        }),
      );
    },
    { progress, lesson, evidence },
  );
  await page.goto("/app/lesson/lesson-1?stage=test");
  await expect(
    page.getByRole("heading", { name: "Верно 6 из 6", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "К практике →", exact: true }).click();
  await expect(page.locator(".l2-workspace")).toBeVisible();
  await expect(page).toHaveURL(/stage=practice/);
  await page.reload();
  await expect(page.locator(".l2-workspace")).toBeVisible();
});
