import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];
for (const width of [360, 390, 768, 1440, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ['sign-in', 'register']) {
    await page.goto(`http://127.0.0.1:3100/${route}`);
    await page.locator('.auth-workshop-image').evaluate(img => img.decode());
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const img = document.querySelector('.auth-workshop-image');
      const form = document.querySelector('.auth-card');
      const art = img.getBoundingClientRect();
      const card = form.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, loaded: img.naturalWidth > 0, overlap: art.right > card.left && art.left < card.right && art.bottom > card.top && art.top < card.bottom, font: getComputedStyle(form).fontFamily, primary: getComputedStyle(document.querySelector('.auth-primary')).backgroundColor };
    });
    if (state.overflow || state.overlap || !state.loaded) throw Error(JSON.stringify({width,route,...state}));
    results.push({width,route,...state});
    if ([390,1440].includes(width)) await page.screenshot({ path: `outputs/auth-workshop/${route}-${width}.png`, fullPage: true });
    if (width === 1440) {
      const axe = await new AxeBuilder({ page }).analyze();
      const failures = axe.violations.filter(v => ['serious','critical'].includes(v.impact));
      results.push({route, theme:'light', accessibility: failures});
      if (failures.length) throw Error(JSON.stringify(failures));
      await page.getByRole('button', {name:'Переключить тему'}).click();
      const dark = await new AxeBuilder({page}).analyze();
      const darkFailures = dark.violations.filter(v => ['serious','critical'].includes(v.impact));
      results.push({route, theme:'dark', accessibility:darkFailures});
      await page.screenshot({path:`outputs/auth-workshop/${route}-dark.png`,fullPage:true});
      if (darkFailures.length) throw Error(JSON.stringify(darkFailures));
    }
  }
}
await writeFile('outputs/auth-workshop/check-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
await browser.close();
