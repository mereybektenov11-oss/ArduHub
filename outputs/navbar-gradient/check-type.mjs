import {chromium} from '@playwright/test';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
for(const width of [1440,1920,1100,768,390,360]){
 await p.setViewportSize({width,height:1000});
 await p.screenshot({path:`outputs/navbar-gradient/type-${width}.png`});
 console.log(await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,hero:getComputedStyle(document.querySelector('.hero h1')).fontSize,body:getComputedStyle(document.querySelector('.hero-description')).fontSize,gradient:getComputedStyle(document.querySelector('.header'),'::before').height,navOverflow:document.querySelector('.header-inner').scrollWidth>document.querySelector('.header-inner').clientWidth,cards:[...document.querySelectorAll('.benefit-card')].map(e=>({clipped:e.scrollHeight>e.clientHeight,height:e.clientHeight}))})));
}
await p.locator('.menu-toggle').click(); console.log({menu:await p.locator('#mobile-menu').isVisible()});
await p.locator('.menu-toggle').click();await p.locator('.benefit-card').first().scrollIntoViewIfNeeded();await p.screenshot({path:'outputs/navbar-gradient/type-mobile-cards.png'});
await b.close();
