import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";

test("G15 twelve cells, once-only notification and reward survive reload", async ({
  page,
}) => {
  const p = createProgress();
  p.profile.name = "Искра";
  p.tourSeen = { "/app": true, "/app/profile": true };
  p.lessons["lesson-1"] = {
    ...p.lessons["lesson-1"],
    ...completeEvidence("lesson-1"),
    status: "done",
    rewarded: true,
    attempts: 1,
    bestErrors: 0,
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
  await page.goto("/app/profile");
  await expect(page.locator("[data-sticker]")).toHaveCount(12);
  await expect(page.locator('[data-sticker="first-light"]')).toHaveAttribute(
    "data-earned",
    "true",
  );
  await expect(page.locator('[data-sticker="inventor"]')).toHaveAttribute(
    "data-earned",
    "false",
  );
  const popup = page.getByRole("region", { name: "Стикер открыт" });
  const save = page.getByRole("dialog", { name: "Сохрани прогресс" });
  await expect(save).toBeVisible();
  await save.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(popup).toBeVisible();
  // Notifications are nonmodal and closing consumes each persisted notice once.
  for (let i = 0; i < 2; i++) {
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "Закрыть стикер" }).click();
  }
  await expect(popup).toHaveCount(0);
  const balance = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).sparks,
    );
  const before = await balance();
  const cell = page.locator('[data-sticker="first-light"]');
  await cell.getByRole("button", { name: "Забрать 5 искр" }).dblclick();
  await expect(
    cell.getByRole("button", { name: "Награда получена" }),
  ).toBeDisabled();
  await expect.poll(balance).toBe(before + 5);
  await page.reload();
  await expect(
    cell.getByRole("button", { name: "Награда получена" }),
  ).toBeDisabled();
  await expect(popup).toHaveCount(0);
  expect(await balance()).toBe(before + 5);
  await expect(page.locator("[data-reward-particle]")).toHaveCount(0);
});
