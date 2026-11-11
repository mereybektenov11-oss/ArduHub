import { expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launchMocked, signIn } from "./helpers";

const shots = resolve(__dirname, "../../../outputs/desktop-mentor");
const mentors = [
  ["volt", "Вольтик"],
  ["oma", "Ома"],
  ["rezik", "Резик"],
  ["shina", "Шина"],
] as const;
const greeting = "Привет, Алия! Что соберём сегодня?";

for (const [id, name] of mentors)
  test(`main menu: the selected mentor ${name} waves and greets`, async () => {
    const userData = mkdtempSync(join(tmpdir(), `arduhub-mentor-${id}-`));
    const s = await launchMocked(userData, {
      progress: { lessons: {}, mentor: { selectedId: id, unlockedIds: [id] } },
    });
    try {
      const { page } = s;
      // Count voice blips (oscillators started by the sound engine).
      await page.evaluate(() => {
        const w = window as unknown as { __osc: number };
        w.__osc = 0;
        const start = OscillatorNode.prototype.start;
        OscillatorNode.prototype.start = function (
          ...a: Parameters<typeof start>
        ) {
          w.__osc++;
          return start.apply(this, a);
        };
      });
      await signIn(page, "correct-horse");

      // The full greeting is the heading from the first frame.
      await expect(page.getByRole("heading", { name: greeting })).toBeVisible();
      const figure = page.getByRole("button", { name: new RegExp(name) });
      await expect(figure).toBeVisible();
      await expect(page.locator(".mentor-name")).toHaveText(name);
      await expect(page.locator(".mentor-svg image").first()).toHaveAttribute(
        "href",
        `/cabinet/${id}.webp`,
      );

      // Mid-wave: the hand layer is rotated.
      await page.waitForTimeout(700);
      const turn = await page
        .locator(".mentor-hand")
        .evaluate((g) => getComputedStyle(g).transform);
      expect(turn).not.toBe("none");
      await page.screenshot({ path: join(shots, `${id}-wave.png`) });

      // Typing finishes with the whole sentence visible; the mentor spoke.
      await expect(page.locator(".mentor-rest")).toHaveText("", {
        timeout: 5000,
      });
      await expect(page.locator(".mentor-text")).toHaveText(greeting);
      expect(
        await page.evaluate(
          () => (window as unknown as { __osc: number }).__osc,
        ),
      ).toBeGreaterThan(5);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(shots, `${id}-idle.png`) });

      // Clicking the mentor greets again.
      await figure.click();
      await expect(page.locator(".mentor-rest")).not.toHaveText("");
      expect(s.errors).toEqual([]);
    } finally {
      await s.app.close();
      rmSync(userData, { recursive: true, force: true });
    }
  });

test("reduced motion: the greeting is shown at once without animation", async () => {
  const userData = mkdtempSync(join(tmpdir(), "arduhub-mentor-rm-"));
  const s = await launchMocked(userData);
  try {
    const { page } = s;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, "correct-horse");
    await expect(page.locator(".mentor-text")).toHaveText(greeting);
    await expect(page.locator(".mentor-rest")).toHaveText("");
    const anim = await page
      .locator(".mentor-body")
      .evaluate((g) => getComputedStyle(g).animationName);
    expect(anim).toBe("none");
  } finally {
    await s.app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
