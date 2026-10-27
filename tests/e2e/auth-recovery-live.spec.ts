import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("recovery fragment opens password form in a fresh browser and changes a QA password", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_AUTH_EMAIL ||
      !process.env.E2E_AUTH_PASSWORD ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Dedicated QA account required",
  );
  test.setTimeout(60000);
  const email = process.env.E2E_AUTH_EMAIL!;
  const original = process.env.E2E_AUTH_PASSWORD!;
  const replacement = original + "-recovered";
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: original,
  });
  expect(error?.code).toBeUndefined();
  expect(data.session).toBeTruthy();
  const hash = new URLSearchParams({
    type: "recovery",
    access_token: data.session!.access_token,
    refresh_token: data.session!.refresh_token,
  }).toString();
  try {
    await page.goto("/auth/callback?next=reset#" + hash);
    await expect(page.getByLabel("Повтори пароль")).toBeVisible();
    await expect(page.locator("#auth-error")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
    await page.getByLabel("Пароль", { exact: true }).fill(replacement);
    await page.getByLabel("Повтори пароль").fill(replacement);
    await page.locator(".auth-primary").click();
    await expect(page).toHaveURL(/\/app$/);
    const login = await client.auth.signInWithPassword({
      email,
      password: replacement,
    });
    expect(login.error?.code).toBeUndefined();
    expect(login.data.user?.id).toBe(data.user!.id);
  } finally {
    const login = await client.auth.signInWithPassword({
      email,
      password: replacement,
    });
    if (!login.error) {
      const restored = await client.auth.updateUser({ password: original });
      expect(restored.error?.code).toBeUndefined();
    }
    await client.auth.signOut();
  }
});
