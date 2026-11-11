import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'outputs/figma/native');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext({reducedMotion:'reduce'});
await context.addCookies([{name:'arduhub-guest',value:'1',domain:'127.0.0.1',path:'/'}]);
const seed=await context.newPage();
await seed.goto('http://127.0.0.1:3100/app',{waitUntil:'domcontentloaded'});
await seed.locator('h1').waitFor();
const lessons=await Promise.all(Array.from({length:12},(_,i)=>context.request.get('http://127.0.0.1:3100/api/lessons/lesson-'+(i+1)).then(r=>r.json())));
await seed.evaluate(ls=>{
 const progress=JSON.parse(localStorage.getItem('arduhub.progress.v1')); const drafts={};
 for(const l of ls){const quiz={answers:Object.fromEntries(l.quiz.questions.map(q=>[q.id,q.correctIndex])),current:0,phase:'result',lastScore:100,retryQueue:[],retryAnswers:{},retryCurrent:0,attempts:1,awarded:[]};const flow={version:2,stage:'video',tab:'circuit',stages:{video:true,test:true,practice:true},video:{confirmed:true},practice:{circuit:true,code:true,run:true},quiz};progress.lessons[l.id]={...progress.lessons[l.id],...flow,status:'done'};drafts[l.id]={scene:l.circuit.referenceScene,code:l.code.solution,step:0,steps:{video:true,theory:true,quiz:true,circuit:true,code:true,run:true},flow};}
 localStorage.setItem('arduhub.progress.v1',JSON.stringify(progress));localStorage.setItem('arduhub.drafts.v1',JSON.stringify({version:2,curriculumVersion:2,drafts}));localStorage.setItem('arduhub.onboarding.v1:local','1');localStorage.setItem('arduhub.save-prompt.v1:local',JSON.stringify({firstShownAt:Date.now(),shown:2}));
},lessons);
await seed.close();
const projectPage=await context.newPage();await projectPage.goto('http://127.0.0.1:3100/app/projects',{waitUntil:'domcontentloaded'});await projectPage.getByRole('button',{name:'Создать проект',exact:true}).waitFor({timeout:20000});await projectPage.getByRole('button',{name:'Создать проект',exact:true}).evaluate(b=>b.click());await projectPage.locator('.l2-workspace').waitFor({timeout:20000});const projectPath=new URL(projectPage.url()).pathname;await projectPage.close();
const routes=JSON.parse(await fs.readFile(path.join(root,'outputs/figma/routes.json'),'utf8')).filter(j=>!process.env.EXPORT_ONLY||new RegExp(process.env.EXPORT_ONLY).test(j.slug));
for(const job of routes){
 const p=await context.newPage();await p.setViewportSize({width:job.width||1440,height:job.width===390?844:1000});
 try{
 await p.goto('http://127.0.0.1:3100'+(job.slug.includes('editor')?projectPath:job.path),{waitUntil:'domcontentloaded',timeout:45000});
 await p.waitForFunction(()=>document.querySelector('h1')||document.querySelector('.l2-workspace')||document.querySelector('.dev-gallery'),{timeout:15000}).catch(()=>{});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
 await p.addStyleTag({content:'*{content-visibility:visible!important;contain-intrinsic-size:none!important}.reveal,[data-motion-ready]{opacity:1!important;transform:none!important;filter:none!important}'});
 if(job.slug.includes('editor'))await p.locator('.l2-workspace').waitFor({timeout:20000});
 if(job.action==='code')await p.getByRole('tab',{name:'Код',exact:true}).evaluate(b=>b.click());
 if(job.action==='serial')await p.getByRole('tab',{name:'Монитор порта',exact:true}).evaluate(b=>b.click()).catch(()=>{});
 if(job.action==='search')await p.keyboard.press('Control+k');
 if(job.action==='mentor')await p.evaluate(()=>window.dispatchEvent(new CustomEvent('arduhub:mentor-open',{detail:{lessonId:'lesson-1'}})));
 if(job.action==='forgot')await p.getByRole('button',{name:/Забыли пароль/}).click();
 if(job.action==='menu')await p.getByRole('button',{name:'Ещё',exact:true}).click();
 await p.waitForTimeout(350);
 if(!job.keepDialogs)await p.evaluate(()=>{document.querySelectorAll('[data-overlay-root],dialog[open]').forEach(e=>e.remove());document.body.style.overflow='';document.documentElement.style.overflow='';});
 const tree=await p.evaluate(()=>{
  const viewport={width:innerWidth,height:Math.max(document.documentElement.scrollHeight,innerHeight)};
  const images=[];let count=0;
  function paint(v){const m=v?.match(/[\d.]+/g);return m?{r:+m[0]/255,g:+m[1]/255,b:+m[2]/255,a:m[3]===undefined?1:+m[3]}:{r:0,g:0,b:0,a:0};}
  function font(cs){const fam=cs.fontFamily.toLowerCase();return fam.includes('manrope')?'Manrope':fam.includes('mono')||fam.includes('courier')?'Cousine':'Inter';}
  function walk(node,px=0,py=0){
   if(node.nodeType===3){if(!node.textContent.trim())return null;const el=node.parentElement,cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return null;const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(r.width<.1||r.height<.1)return null;count++;return{k:'text',n:node.textContent.trim().slice(0,60),text:node.textContent.trim(),x:r.x-px,y:r.y-py,w:r.width+1.5,h:r.height,font:font(cs),size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight)||400,line:parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.55,color:paint(cs.color),align:cs.textAlign,spacing:parseFloat(cs.letterSpacing)||0};}
   if(node.nodeType!==1||['SCRIPT','STYLE','LINK','META','NOSCRIPT','IFRAME'].includes(node.tagName))return null;
   const cs=getComputedStyle(node),r=node.getBoundingClientRect();if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||r.width<.1||r.height<.1)return null;
   if(node.matches('.skip-link,.sr-only')||node.getAttribute('aria-hidden')==='true'&&r.width<2)return null;
   const result={k:'frame',n:node.getAttribute('aria-label')||node.tagName.toLowerCase()+(node.id?'#'+node.id:node.classList.length?'.'+node.classList[0]:''),x:r.x-px,y:r.y-py,w:r.width,h:r.height,bg:paint(cs.backgroundColor),stroke:paint(cs.borderTopColor),border:parseFloat(cs.borderTopWidth)||0,radius:parseFloat(cs.borderTopLeftRadius)||0,opacity:+cs.opacity,clip:['hidden','clip'].includes(cs.overflow),display:cs.display,direction:cs.flexDirection,gap:parseFloat(cs.gap)||0,padding:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].map(v=>parseFloat(v)||0),children:[]};count++;const bgMatch=cs.backgroundImage.match(/url\(["']?([^"')]+)/);if(bgMatch){result.imageSrc=new URL(bgMatch[1],location.href).href;images.push(result.imageSrc);}
   if(node.tagName.toLowerCase()==='svg'){
    const clone=node.cloneNode(true), originals=[node,...node.querySelectorAll('*')], clones=[clone,...clone.querySelectorAll('*')];originals.forEach((e,i)=>{const s=getComputedStyle(e);for(const key of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','fill-rule','font-family','font-size','font-weight'])clones[i].style.setProperty(key,s.getPropertyValue(key));});clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',String(r.width));clone.setAttribute('height',String(r.height));return{...result,k:'svg',svg:new XMLSerializer().serializeToString(clone)};
   }
   if(node.tagName==='IMG'){result.k='image';result.src=node.currentSrc||node.src;images.push(result.src);return result;}
   result.children=[...node.childNodes].map(n=>walk(n,r.x,r.y)).filter(Boolean);if(['INPUT','TEXTAREA','SELECT'].includes(node.tagName)&&node.type!=='password'&&(node.value||node.placeholder)){const value=node.tagName==='SELECT'?node.selectedOptions?.[0]?.text:node.value||node.placeholder;result.children.push({k:'text',n:'Значение поля',text:value,x:result.padding[3],y:result.padding[0],w:Math.max(1,r.width-result.padding[1]-result.padding[3]),h:parseFloat(cs.fontSize)*1.3,font:font(cs),size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight)||400,line:parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.55,color:paint(cs.color),align:'start',spacing:0});}return result;
  }
  const body=walk(document.body);body.x=0;body.y=0;body.w=viewport.width;body.h=viewport.height;return{tree:body,count,images,viewport,title:document.title};
 });
 const assets={};for(const src of new Set(tree.images)){try{const u=new URL(src);let file=u.pathname;if(file.startsWith('/_next/image'))file=new URL(u.searchParams.get('url'),u).pathname;const actual=path.resolve(root,'public','.'+decodeURIComponent(file));if(actual.startsWith(path.join(root,'public')+path.sep))assets[src]=(await fs.readFile(actual)).toString('base64');}catch{}}
 const data={...job,...tree,assets,url:p.url()};await fs.writeFile(path.join(out,job.slug+'.json'),JSON.stringify(data));
 await p.screenshot({path:path.join(out,job.slug+'.png'),fullPage:true});console.log(JSON.stringify({slug:job.slug,nodes:tree.count,height:tree.viewport.height,assets:Object.keys(assets).length}));
 }catch(e){console.log(JSON.stringify({slug:job.slug,error:String(e)}));}
 await p.close();
}
await browser.close();
