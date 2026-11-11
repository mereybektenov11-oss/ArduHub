import fs from 'node:fs/promises';
import vm from 'node:vm';
const folder='outputs/figma/ArduHub-Figma-Transfer';
const html=await fs.readFile(folder+'/ui.html','utf8');
const data=JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const errors=[],counts={frames:0,texts:0,svgs:0,images:0};
function audit(d,slug){
 for(const k of ['x','y','w','h'])if(!Number.isFinite(d[k]))errors.push({slug,node:d.n,field:k});
 if(d.w<=0||d.h<=0)errors.push({slug,node:d.n,field:'dimensions'});
 const key={text:'texts',svg:'svgs',image:'images'}[d.k]||'frames';counts[key]++;
 if(d.k==='svg'&&/(?:xlink:)?href="\/(?!\/)/.test(d.svg))errors.push({slug,node:d.n,field:'external SVG asset'});
 for(const c of d.children||[])audit(c,slug);
}
for(const s of data.screens)audit(s.tree,s.slug);
const routes=JSON.parse(await fs.readFile('outputs/figma/routes.json','utf8'));
if(routes.length!==data.screens.length)errors.push({field:'missing screens'});
for(const script of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)])new vm.Script(script[1]);
new vm.Script(await fs.readFile(folder+'/code.js','utf8'));
const report={screens:data.screens.length,desktop:data.screens.filter(s=>s.width!==390).length,mobile:data.screens.filter(s=>s.width===390).length,...counts,assets:Object.keys(data.assets).length,errorCount:errors.length,errors,figmaExecutionVerified:false};
await fs.writeFile('outputs/figma/package-validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(errors.length)process.exitCode=1;
