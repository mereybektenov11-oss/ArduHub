async function buildScreen(DATA,PAGE_ID,SCREEN_NAME,POSITION){
const created=[],errors=[];
const variables=await figma.variables.getLocalVariablesAsync();
const palette=variables.filter(v=>v.resolvedType==='COLOR').map(v=>({v,value:Object.values(v.valuesByMode)[0]}));
const fontStyles={Inter:{400:'Regular',500:'Medium',600:'Semi Bold',700:'Bold',800:'Extra Bold',900:'Black'},Manrope:{400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold'},Cousine:{400:'Regular',700:'Bold'}};
const families=new Map();
function scan(d){if(d.k==='text'){const family=d.font||'Inter',weight=Math.min(family==='Manrope'?800:900,Math.max(400,Math.round(d.weight/100)*100));const style=fontStyles[family]?.[weight]||'Regular';families.set(family+'|'+style,{family,style});}for(const c of d.children||[])scan(c);}
scan(DATA.tree);for(const f of families.values())await figma.loadFontAsync(f);
function paint(c){if(!c||c.a<.005)return[];let p={type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity:c.a};const found=palette.find(({value:v})=>Math.abs(v.r-c.r)<.002&&Math.abs(v.g-c.g)<.002&&Math.abs(v.b-c.b)<.002&&Math.abs((v.a??1)-c.a)<.002);if(found)p=figma.variables.setBoundVariableForPaint(p,'color',found.v);return[p];}
function decode64(s){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',result=[];let buffer=0,bits=0;for(const c of s){const v=chars.indexOf(c);if(v<0)continue;buffer=(buffer<<6)|v;bits+=6;if(bits>=8){bits-=8;result.push((buffer>>bits)&255);}}return new Uint8Array(result);}
const hashes={};for(const [src,b64]of Object.entries(DATA.assets||{})){try{hashes[src]=figma.createImage(decode64(b64)).hash;}catch(e){errors.push({image:src,error:String(e)});}}
function build(d,parent){
 let n;
 if(d.k==='text'){
  n=figma.createText();const family=d.font||'Inter',weight=Math.min(family==='Manrope'?800:900,Math.max(400,Math.round(d.weight/100)*100));n.fontName={family,style:fontStyles[family]?.[weight]||'Regular'};n.fontSize=d.size;n.lineHeight={unit:'PIXELS',value:d.line};n.letterSpacing={unit:'PIXELS',value:d.spacing||0};n.characters=d.text;n.textAutoResize='HEIGHT';n.resize(Math.max(1,d.w),Math.max(1,d.h));n.fills=paint(d.color);
 }else if(d.k==='svg'){
  try{n=figma.createNodeFromSvg(d.svg);n.resize(Math.max(1,d.w),Math.max(1,d.h));}catch(e){errors.push({svg:d.n,error:String(e)});n=figma.createFrame();n.resize(Math.max(1,d.w),Math.max(1,d.h));n.fills=[];}
 }else{
  n=figma.createFrame();n.resize(Math.max(1,d.w),Math.max(1,d.h));const image=d.k==='image'?d.src:d.imageSrc;n.fills=image&&hashes[image]?[{type:'IMAGE',imageHash:hashes[image],scaleMode:'FILL'}]:paint(d.bg);n.clipsContent=!!d.clip;n.cornerRadius=Math.min(d.radius||0,d.w/2,d.h/2);if(d.border>0){n.strokes=paint(d.stroke);n.strokeWeight=d.border;n.strokeAlign='INSIDE';}
 }
 n.name=d.n||d.k;parent.appendChild(n);n.x=d.x||0;n.y=d.y||0;if(d.k==='text'&&d.h<d.line*1.4)n.y-=(d.line-d.h)/2;n.opacity=d.opacity??1;created.push(n.id);
 if(d.k!=='svg')for(const child of d.children||[])build(child,n);
 // Simple flex groups retain a genuine auto-layout relation.
 if(d.k==='frame'&&d.display==='flex'&&n.children.length>1&&d.children.every(c=>c.k!=='text')&&d.children.every(c=>c.x>=0&&c.y>=0)){
  const vertical=d.direction==='column';const ordered=[...d.children].sort((a,b)=>(vertical?a.y-b.y:a.x-b.x));const aligned=ordered.every((c,i)=>i===0||(vertical?c.y>=ordered[i-1].y+ordered[i-1].h-1:c.x>=ordered[i-1].x+ordered[i-1].w-1));
  if(aligned){const positions=n.children.map(c=>({c,x:c.x,y:c.y}));n.layoutMode=vertical?'VERTICAL':'HORIZONTAL';n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';for(const {c,x,y}of positions){c.layoutPositioning='ABSOLUTE';c.x=x;c.y=y;}n.paddingTop=d.padding[0];n.paddingRight=d.padding[1];n.paddingBottom=d.padding[2];n.paddingLeft=d.padding[3];n.itemSpacing=d.gap;}
 }
 return n;
}
const page=await figma.getNodeByIdAsync(PAGE_ID);await figma.setCurrentPageAsync(page);
const root=build(DATA.tree,page);root.name=SCREEN_NAME;root.x=POSITION.x;root.y=POSITION.y;root.clipsContent=true;
const descendants=root.findAll(()=>true),counts={};for(const n of descendants)counts[n.type]=(counts[n.type]||0)+1;
return{createdNodeIds:created,rootId:root.id,name:root.name,width:root.width,height:root.height,counts,errors,fonts:[...families.values()],images:descendants.filter(n=>Array.isArray(n.fills)&&n.fills.some(f=>f.type==='IMAGE')).map(n=>({id:n.id,name:n.name,width:n.width,height:n.height}))};

}
figma.showUI(__html__, {width:420,height:520,themeColors:true});
let running=false;
figma.ui.onmessage=async message=>{
 if(message.type!=='import'||running)return;
 running=true;
 try{
 const dataset=message.data, views=[], errors=[];
 const names=['01 · Компьютер · Все экраны','02 · Телефон · Все экраны','03 · Компоненты и инструкция'];
 const pages=[];for(let i=0;i<3;i++){let p=figma.root.children.find(p=>p.name===names[i]);if(!p){p=figma.root.children[i]||figma.createPage();p.name=names[i];}pages.push(p);}
 const draftIds=new Set(dataset.draftIds);if(figma.fileKey===dataset.fileKey){const captureNames=new Set(['ArduHub | Arduino в браузере','Кабинет ученика · ArduHub','Вход · ArduHub','Регистрация · ArduHub','Политика конфиденциальности | ArduHub']);for(const node of pages[0].children)if(node.type==='FRAME'&&captureNames.has(node.name))draftIds.add(node.id);}
 const existing=await figma.variables.getLocalVariablesAsync();
 let collection=(await figma.variables.getLocalVariableCollectionsAsync()).find(c=>c.name==='ArduHub · CSS tokens');if(!collection){collection=figma.variables.createVariableCollection('ArduHub · CSS tokens');collection.renameMode(collection.modes[0].modeId,'Текущий сайт');}
 for(const [name,hex]of Object.entries(dataset.colors)){if(existing.some(v=>v.name==='color/'+name))continue;const v=figma.variables.createVariable('color/'+name,collection,'COLOR'),n=parseInt(hex.slice(1),16);v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];v.setValueForMode(collection.defaultModeId,{r:((n>>16)&255)/255,g:((n>>8)&255)/255,b:(n&255)/255,a:1});v.setVariableCodeSyntax('WEB','var(--'+name+')');}
 const selected=dataset.screens.filter(s=>s.width===390?message.mobile:message.desktop);
 const sections=new Map();let nextY=0;
 for(let i=0;i<selected.length;i++){
  const data=selected[i],mobile=data.width===390,page=pages[mobile?1:0],key=(mobile?'m:':'d:')+data.group;
  await figma.setCurrentPageAsync(page);
  let state=sections.get(key);
  if(!state){const section=figma.createSection();section.name=dataset.groups[data.group]||data.group;page.appendChild(section);section.x=0;section.y=nextY;section.resizeWithoutConstraints(mobile?3200:6400,1000);state={section,columns:Array(mobile?6:4).fill(100)};sections.set(key,state);nextY+=mobile?18000:14000;}
  const col=state.columns.indexOf(Math.min(...state.columns)),position={x:100+col*(mobile?500:1560),y:state.columns[col]};
  data.assets=dataset.assets;
  const result=await buildScreen(data,page.id,(dataset.labels[data.slug.replace(/^m-/,'')]||data.slug)+' · '+data.path,position);
  const root=await figma.getNodeByIdAsync(result.rootId);state.section.appendChild(root);root.x=position.x;root.y=position.y;state.columns[col]+=root.height+120;state.section.resizeWithoutConstraints(mobile?3200:6400,Math.max(...state.columns)+80);
  views.push({...result,slug:data.slug});errors.push(...result.errors);
  figma.ui.postMessage({type:'progress',done:i+1,total:selected.length,label:root.name});
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 // Keep sections compact after the content sizes are known.
 for(const page of pages.slice(0,2)){await figma.setCurrentPageAsync(page);let y=100;for(const state of sections.values()){if(state.section.parent.id!==page.id)continue;state.section.y=y;y+=state.section.height+240;}}
 let componentCount=0;
 if(message.components){
  await figma.setCurrentPageAsync(pages[2]);
  const masters=new Map();let x=100,y=1550,row=0;
  for(const view of views){const root=await figma.getNodeByIdAsync(view.rootId);const candidates=root.findAll(n=>n.type==='FRAME'&&n.name.startsWith('button')&&n.children.length===1&&n.children[0].type==='TEXT'&&n.height>=30&&n.height<=64);
   for(const frame of candidates){const text=frame.children[0];await figma.loadFontAsync(text.fontName);const key=JSON.stringify([Math.round(frame.height),frame.cornerRadius,frame.fills.map(p=>p.type==='SOLID'?p.color:p.type),text.fontName,text.fontSize,text.fills]);let entry=masters.get(key);
    if(!entry){const main=figma.createComponent();main.name='ArduHub / Кнопка / '+(componentCount+1);main.description='Кнопка из актуального кода ArduHub. Изменяйте текст через свойство «Текст».';main.resize(frame.width,frame.height);main.fills=frame.fills;main.strokes=frame.strokes;main.strokeWeight=frame.strokeWeight;main.cornerRadius=frame.cornerRadius;main.layoutMode='HORIZONTAL';main.primaryAxisAlignItems='CENTER';main.counterAxisAlignItems='CENTER';main.primaryAxisSizingMode='FIXED';main.counterAxisSizingMode='FIXED';const label=text.clone();main.appendChild(label);label.textAutoResize='WIDTH_AND_HEIGHT';const property=main.addComponentProperty('Текст','TEXT',text.characters);label.componentPropertyReferences={characters:property};pages[2].appendChild(main);main.x=x;main.y=y;x+=Math.max(main.width,200)+40;row=Math.max(row,main.height);if(x>1500){x=100;y+=row+80;row=0;}entry={main,property};masters.set(key,entry);componentCount++;}
    const parent=frame.parent,index=parent.children.indexOf(frame),px=frame.x,py=frame.y,w=frame.width,h=frame.height,positioning=frame.layoutPositioning;const instance=entry.main.createInstance();parent.insertChild(index,instance);instance.resize(w,h);if(parent.layoutMode&&parent.layoutMode!=='NONE')instance.layoutPositioning=positioning;instance.x=px;instance.y=py;instance.setProperties({[entry.property]:text.characters});frame.remove();
   }
  }
 }
 if(message.cleanup&&figma.fileKey===dataset.fileKey){for(const id of draftIds){const n=await figma.getNodeByIdAsync(id);if(n&&n.type==='FRAME'&&n.parent?.type==='PAGE')n.remove();}}
 await figma.setCurrentPageAsync(pages[0]);const first=await figma.getNodeByIdAsync(views[0]?.rootId);if(first)figma.viewport.scrollAndZoomIntoView([first]);
 figma.ui.postMessage({type:'complete',screens:views.length,components:componentCount,nodes:views.reduce((a,v)=>a+v.createdNodeIds.length,0),errors});
 }catch(error){figma.ui.postMessage({type:'error',message:String(error)});}finally{running=false;}
};
