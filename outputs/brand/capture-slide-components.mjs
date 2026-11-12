import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const out='outputs/slide-components';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2,reducedMotion:'reduce'});
await context.addCookies([{name:'arduhub-guest',value:'1',domain:'arduhub.vercel.app',path:'/'}]);
const page=await context.newPage();
await page.addLocatorHandler(page.getByRole('dialog',{name:'Тур по кабинету'}),async d=>d.getByRole('button',{name:'Пропустить',exact:true}).click());
const origin='https://arduhub.vercel.app';
const lesson=await(await context.request.get(origin+'/api/lessons/lesson-1')).json();
async function capture(selector,name){
  const el=page.locator(selector).first();await el.waitFor();
  await el.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  await el.evaluate(e=>{let p=e.parentElement;while(p){p.style.background='transparent';p=p.parentElement;}});
  await page.addStyleTag({content:`html,body{background:transparent!important} ${selector}{border-radius:24px;overflow:hidden;background:#f6f4e9;padding:24px;box-sizing:border-box} .dash-path{max-height:780px} .flow-theory{margin:0!important}`});
  await el.screenshot({path:`${out}/${name}.png`,omitBackground:true,animations:'disabled'});
}
await page.goto(origin+'/app');await page.locator('.dash-node.current').first().waitFor();
console.log('PATH',await page.locator('.dash-node.current').first().evaluate(e=>e.parentElement.outerHTML.slice(0,350)));
await capture('.dash-path','01-learning-path');
await page.goto(origin+'/app/lesson/lesson-1?stage=video');await page.locator('.flow-video-stage').waitFor();await page.waitForURL(/stage=video/);
await page.locator('.flow-note-block').last().scrollIntoViewIfNeeded();
await capture('.flow-theory','02-lesson-summary');
await page.getByRole('button',{name:'Я посмотрел',exact:true}).click();await page.getByRole('button',{name:'К тесту →',exact:true}).click();
await page.locator('.flow-answer').first().waitFor();
console.log('QUIZ',await page.locator('.flow-answer').first().evaluate(e=>e.parentElement.parentElement.outerHTML.slice(0,400)));
await capture('.flow-quiz','03-topic-quiz');
for(const q of lesson.quiz.questions){await page.locator('.flow-answer').nth(q.correctIndex).click();await page.getByRole('button',{name:'Дальше →',exact:true}).click();}
await page.getByRole('button',{name:'К практике →',exact:true}).click();await page.locator('.l2-workspace').waitFor();
for(const[a,b]of[['uno 13','r 1'],['r 2','led A'],['led C','uno GND.2']]){await page.getByRole('button',{name:a,exact:true}).click();await page.getByRole('button',{name:b,exact:true}).click();}
await capture('.l2-workspace','04-circuit-editor');
await capture('.l2-canvas','06-assembled-circuit');
console.log('CANVAS',await page.locator('svg').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>400).map(e=>({cls:e.getAttribute('class'),label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width}))));
await page.getByRole('tab',{name:'Код',exact:true}).click();await page.getByRole('textbox',{name:'Код',exact:true}).fill(lesson.code.solution);
await capture('.l2-workspace','05-code-editor');
await browser.close();console.log('Saved',out);

