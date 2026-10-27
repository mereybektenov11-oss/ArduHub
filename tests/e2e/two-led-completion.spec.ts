import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";
import { achievementDeck } from "../../src/content/achievements.ru";
import { completeEvidence } from "../helpers/progressEvidence";

test("two LEDs complete with recreated components in reverse order", async ({
  page,
}) => {
  const progress = createProgress();
  progress.profile.name = "Лис";
  progress.tourSeen = { "/app": true, "/app/lesson/lesson-4": true };
  progress.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((a) => a.id),
  };
  for (let i = 1; i < 4; i++)
    progress.lessons[`lesson-${i}`] = {
      ...progress.lessons[`lesson-${i}`],
      ...completeEvidence(`lesson-${i}`),
      rewarded: true,
      status: "done",
    };
  const evidence = completeEvidence("lesson-4");
  evidence.stages.practice = false;
  evidence.practice = { circuit: false, code: false, run: false };
  progress.lessons["lesson-4"] = {
    ...progress.lessons["lesson-4"],
    ...evidence,
    status: "current",
  };
  const lesson = learningLessons[3];
  const scene = structuredClone(lesson.circuit.referenceScene);
  scene.components.reverse();
  for (const component of scene.components)
    component.id = `new-${component.id}`;
  for (const wire of scene.wires)
    for (const pin of [wire.from, wire.to])
      pin.componentId = `new-${pin.componentId}`;
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(
    ({ progress, scene, code }) => {
      if (!localStorage.getItem("arduhub.progress.v1")) {
        localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
        localStorage.setItem(
          "arduhub.drafts.v1",
          JSON.stringify({
            version: 1,
            curriculumVersion: 2,
            drafts: {
              "lesson-4": {
                scene,
                code,
                step: 3,
                steps: {
                  video: true,
                  theory: true,
                  quiz: true,
                  circuit: true,
                  code: true,
                  run: false,
                },
              },
            },
          }),
        );
      }
      localStorage.setItem(
        "arduhub.save-prompt.v1:local",
        JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
      );
    },
    { progress, scene, code: lesson.code.solution },
  );
  await page.goto("/app/lesson/lesson-4?stage=practice");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(page.getByRole("dialog", { name: "Урок пройден!" })).toBeVisible(
    { timeout: 20000 },
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arduhub.progress.v1")!).lessons[
          "lesson-4"
        ].status,
    ),
  ).toBe("done");
});
