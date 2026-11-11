import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless:true,channel:"chrome"});
const page = await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
await page.screenshot({path:'outputs/navbar-gradient/desktop-top.png'});
await page.evaluate(()=>window.scrollTo(0,1100));
await page.waitForTimeout(500);
await page.screenshot({path:'outputs/navbar-gradient/desktop-scroll.png'});
console.log(await page.locator('.header').evaluate(el=>{const s=getComputedStyle(el);return {background:s.background,border:s.borderWidth,shadow:s.boxShadow,filter:s.backdropFilter,glow:getComputedStyle(el,'::before').background,scrolled:el.dataset.scrolled}}));
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>window.scrollTo(0,0));
await page.waitForTimeout(300);
await page.screenshot({path:'outputs/navbar-gradient/mobile-top.png'});
await page.locator('.menu-toggle').click();
console.log({menuVisible:await page.locator('#mobile-menu').isVisible(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
await page.screenshot({path:'outputs/navbar-gradient/mobile-menu.png'});
await browser.close();

