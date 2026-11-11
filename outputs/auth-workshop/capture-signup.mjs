import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
for(const width of [360,390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:3100/register');
  await page.locator('.auth-backdrop[data-ready="true"]').waitFor({state:'attached'});
  await page.locator('.auth-backdrop img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  for(let step=0;step<3;step++){
    const layout=await page.evaluate(()=>{const card=document.querySelector('.auth-card').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,centered:Math.abs(card.left+card.width/2-innerWidth/2)<2};});
    if(layout.overflow||!layout.centered)throw Error(JSON.stringify({width,step,...layout}));
    await page.screenshot({path:`outputs/auth-workshop/signup-step-${step+1}-${width}.png`,fullPage:true});
    if(step===0){await page.getByLabel('Почта').fill('learner@example.org');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByLabel('Пароль',{exact:true})).toBeVisible();}
    if(step===1){await page.getByLabel('Пароль',{exact:true}).fill('TestPassword123!');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByLabel('Повтори пароль')).toBeVisible();}
    console.log(width,step+1,layout);
  }
}
await browser.close();
