import { chromium } from '@playwright/test';
const b=await chromium.launch({channel:'chrome',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
for(const y of [0,16,20,100,210,420,1100]) {
 await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(90);
 console.log(await p.locator('.header').evaluate(el=>({y:scrollY,progress:el.style.getPropertyValue('--header-scroll-progress'),color:getComputedStyle(el).color,glowHeight:getComputedStyle(el,'::before').height})));
}
await p.screenshot({path:'outputs/navbar-gradient/smooth-desktop.png'});
await p.setViewportSize({width:390,height:844});
await p.screenshot({path:'outputs/navbar-gradient/smooth-mobile.png'});
console.log({overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
await b.close();
