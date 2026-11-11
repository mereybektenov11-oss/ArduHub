import fs from 'node:fs/promises';
const path='src/app/landing-cobalt.css';
let css=await fs.readFile(path,'utf8');
const start=css.indexOf('.landing-cobalt {');
const end=css.indexOf('\n}',start);
const colors={
  '#ffffffc9':'nav-edge','#ffffffc7':'nav-surface','#26366707':'nav-shadow','#e1e2ee66':'nav-inset',
  '#fffffff0':'nav-scrolled','#2636670d':'nav-scrolled-shadow','#fff':'card','#1460ff18':'button-shadow',
  '#ffffffb3':'secondary-button','#f5f7ff':'hero-glow','#eaf0ff':'hero-edge','#1460ff0b':'orbit',
  '#24417216':'object-shadow','#2c467512':'window-shadow','#26366706':'window-shadow-close',
  '#d8ddeb':'window-dot','#ff9f9f':'window-dot-red','#f7d998':'window-dot-yellow','#97d3b6':'window-dot-green',
  '#697791':'step-index','#f9faff':'canvas','#a8b4d050':'canvas-dot','#edc8cb':'error-border',
  '#bd2e43':'error-ink','#b8d8cf':'success-border','#167b5e':'success-ink','#e9eeff':'feature-frame',
  '#2636670a':'feature-shadow','#ece9fa':'mentor-frame','#e3f0fb':'video-frame','#e9edf5':'repeat-frame',
  '#f2f5ff':'steps-surface','#243d750a':'steps-shadow','#334b94':'badge-ink','#f4f6fc':'browser-bar',
  '#f1f4fd':'thumbnail','#f6f7fc':'practice-surface','#f0f4ff':'access-surface','#d6dff3':'access-divider',
  '#196f56':'check-ink','#c6d2ed':'input-border','#a82a3f':'form-error','#b3c8f6':'plus',
  '#f6f8ff':'footer-surface','#fffffff5':'mobile-nav'
};
const head=css.slice(0,end);
let tail=css.slice(end);
tail=tail.replace(/#[0-9a-f]{3,8}\b/gi,value=>{
  const key=colors[value.toLowerCase()];
  if(!key)throw new Error('Missing color '+value);
  return `var(--landing-${key})`;
});
const existing=new Set([...head.matchAll(/(--landing-[a-z-]+):/g)].map(m=>m[1]));
const declarations=Object.entries(colors).filter(([,name])=>!existing.has('--landing-'+name)).map(([value,name])=>`  --landing-${name}: ${value};`).join('\n');
await fs.writeFile(path,head+'\n'+declarations+tail);
