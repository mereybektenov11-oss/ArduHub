import { chromium } from '@playwright/test';
const browser = await chromium.launch({channel:'chrome'});
const context = await browser.newContext();
const page = await context.newPage();
for (const width of [360,390,768,1440,1920]) {
  await page.setViewportSize({width,height:900});
  for (const route of ['sign-in','register']) {
    await page.goto(`http://127.0.0.1:3100/${route}`);
    await page.locator('.auth-backdrop[data-ready="true"]').waitFor({state:'attached'}).catch(async error => {console.log(await page.locator('body').innerText()); console.log(await page.locator('.auth-backdrop img').evaluateAll(images => images.map(img => ({src:img.currentSrc,loaded:img.complete,width:img.naturalWidth})))); throw error;});
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.auth-backdrop img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const state = await page.evaluate(() => {
      const card = document.querySelector('.auth-card').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth > innerWidth, centered:Math.abs(card.left + card.width / 2 - innerWidth / 2) < 2};
    });
    if (state.overflow || !state.centered) throw Error(JSON.stringify({width,route,...state}));
    await page.locator('.auth-backdrop img').evaluateAll(images => images.forEach(img => {const a=img.getAnimations()[0]; a.pause(); a.currentTime=0;}));
    if ([390,1440].includes(width)) await page.screenshot({path:`outputs/auth-workshop/fullscreen-${route}-${width}.png`,fullPage:true});
    if (width===1440 && route==='sign-in') {
      for (const [time,name] of [[6000,'giant-robot'],[12000,'robot-test']]) {
        await page.locator('.auth-backdrop img').evaluateAll((images,time) => images.forEach(img => {img.getAnimations()[0].currentTime=time;}),time);
        await page.screenshot({path:`outputs/auth-workshop/fullscreen-${name}.png`,fullPage:true});
      }
    }
    console.log(width,route,state);
  }
}
await browser.close();
