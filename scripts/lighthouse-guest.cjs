module.exports = async (browser) => {
  await browser.defaultBrowserContext().setCookie({
    name: "arduhub-guest",
    value: "1",
    domain: "127.0.0.1",
    path: "/",
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3100/app");
  await page.waitForFunction(() => localStorage.getItem("arduhub.progress.v1"));
  await page.evaluate(() => {
    const key = "arduhub.progress.v1";
    const progress = JSON.parse(localStorage.getItem(key));
    progress.profile.name = "Проверка";
    progress.tourSeen = {
      ...progress.tourSeen,
      "/app": true,
      "/app/map": true,
      "/app/practice": true,
      "/app/lesson/lesson-1": true,
    };
    localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.close();
};
