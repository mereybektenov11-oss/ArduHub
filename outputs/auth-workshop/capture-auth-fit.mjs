import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
for(const viewport of [{width:862,height:327},{width:390,height:480},{width:1440,height:900}]){
 await page.setViewportSize(viewport);
 for(const route of ['register','sign-in']){
  await page.goto(`http://127.0.0.1:3100/${route}`);
  await page.locator('.auth-backdrop[data-ready="true"]').waitFor({state:'attached'});
  await page.locator('.auth-backdrop img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  for(let step=0;step<(route==='register'?3:2);step++){
   const field=step===0?page.getByLabel('Почта'):step===1?page.getByLabel('Пароль',{exact:true}):page.getByLabel('Повтори пароль');
   await field.fill(step===0?'learner@example.org':'TestPassword123!');
   const state=await page.evaluate(()=>({scroll:scrollY,brand:document.querySelector('.signup-brand').getBoundingClientRect().top,title:document.querySelector('h1').getBoundingClientRect().top}));
   if(state.scroll!==0 || state.brand<0 || state.title<0)throw Error(JSON.stringify(state));
   await page.screenshot({path:`outputs/auth-workshop/fit-${route}-${viewport.width}x${viewport.height}-step${step+1}.png`});
   console.log(route,viewport,step+1,state);
   if(route==='register' && step<2){await page.getByRole('button',{name:'Продолжить',exact:true}).click();await expect(page.getByLabel(step===0?'Пароль':'Повтори пароль',{exact:true})).toBeVisible();}
  }
 }
}
await browser.close();
