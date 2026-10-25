import { test, expect } from "@playwright/test";
test("developer progress reset and mark-through use the shared course state", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_DEV_STATUS !== "true",
    "Requires explicitly enabled local developer pages",
  );
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.goto("/dev/progress");
  await expect(
    page.getByRole("heading", { name: "Проверка прогресса" }),
  ).toBeVisible();
  await page.getByLabel("Пройдено до урока").fill("1");
  await page.getByRole("button", { name: "Применить", exact: true }).click();
  const state = await page.locator("pre").innerText();
  expect(
    JSON.parse(state).map((lesson: { status: string }) => lesson.status),
  ).toEqual(["done", "current", ...Array(10).fill("locked")]);
  await page
    .getByRole("button", { name: "Сбросить прогресс", exact: true })
    .click();
  await expect
    .poll(
      async () => JSON.parse(await page.locator("pre").innerText())[0].status,
    )
    .toBe("current");
  expect(
    JSON.parse(await page.locator("pre").innerText()).filter(
      (lesson: { status: string }) => lesson.status === "done",
    ),
  ).toHaveLength(0);
});
