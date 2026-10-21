import type { Page } from "@playwright/test";

// Audit our video container and iframe title, not YouTube's changing cross-origin UI.
// Player ready/error transitions have separate mocked Player API tests.
export async function stubExternalVideo(page: Page) {
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><html lang="ru"><head><title>Внешний видеоплеер</title></head><body><main>Видео</main></body></html>',
    }),
  );
}
