import {chromium} from '@playwright/test';
const b=await chromium.launch({channel:'chrome',headless:true}); const p=await b.newPage();
const r=await p.goto('http://localhost:3000',{waitUntil:'networkidle'}); console.log({status:r.status(),title:await p.title(),text:(await p.locator('body').innerText()).slice(0,160)});
console.log({captions:await p.locator('.video-frame figcaption').count(),videos:await p.locator('.video-frame video[aria-label]').count()}); await b.close();
