const created=[],errors=[];
const variables=await figma.variables.getLocalVariablesAsync();
const palette=variables.filter(v=>v.resolvedType==='COLOR').map(v=>({v,value:Object.values(v.valuesByMode)[0]}));
const fontStyles={Inter:{400:'Regular',500:'Medium',600:'Semi Bold',700:'Bold',800:'Bold',900:'Bold'},Manrope:{400:'Bold',500:'Bold',600:'Bold',700:'Bold',800:'ExtraBold'},Cousine:{400:'Regular',700:'Bold'}};
const families=new Map();
function scan(d){if(d.k==='text'){const family=d.font||'Inter',weight=Math.min(family==='Manrope'?800:900,Math.max(400,Math.round(d.weight/100)*100));const style=fontStyles[family]?.[weight]||'Regular';families.set(family+'|'+style,{family,style});}for(const c of d.children||[])scan(c);}
scan(DATA.tree);for(const f of families.values())await figma.loadFontAsync(f);
function paint(c){if(!c||c.a<.005)return[];let p={type:'SOLID',color:{r:c.r,g:c.g,b:c.b},opacity:c.a};const found=palette.find(({value:v})=>Math.abs(v.r-c.r)<.002&&Math.abs(v.g-c.g)<.002&&Math.abs(v.b-c.b)<.002&&Math.abs((v.a??1)-c.a)<.002);if(found)p=figma.variables.setBoundVariableForPaint(p,'color',found.v);return[p];}
function decode64(s){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',result=[];let buffer=0,bits=0;for(const c of s){const v=chars.indexOf(c);if(v<0)continue;buffer=(buffer<<6)|v;bits+=6;if(bits>=8){bits-=8;result.push((buffer>>bits)&255);}}return new Uint8Array(result);}
const hashes={};for(const [src,b64]of Object.entries(DATA.assets||{})){try{hashes[src]=figma.createImage(decode64(b64)).hash;}catch(e){errors.push({image:src,error:String(e)});}}
function build(d,parent){
 let n;
 if(d.k==='text'){
  n=figma.createText();const family=d.font||'Inter',weight=Math.min(family==='Manrope'?800:900,Math.max(400,Math.round(d.weight/100)*100));n.fontName={family,style:fontStyles[family]?.[weight]||'Regular'};n.fontSize=d.size;n.lineHeight={unit:'PIXELS',value:d.line};n.letterSpacing={unit:'PIXELS',value:d.spacing||0};n.characters=d.text;n.textAlignHorizontal=d.align==='center'?'CENTER':d.align==='right'||d.align==='end'?'RIGHT':'LEFT';n.textAutoResize='HEIGHT';n.resize(Math.max(1,d.w),Math.max(1,d.h));n.fills=paint(d.color);
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
  if(aligned){const positions=n.children.map(c=>({c,x:c.x,y:c.y}));n.layoutMode=vertical?'VERTICAL':'HORIZONTAL';n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';for(const {c,x,y}of positions){c.layoutPositioning='ABSOLUTE';c.x=x;c.y=y;}n.paddingTop=d.padding[0];n.paddingRight=d.padding[1];n.paddingBottom=d.padding[2];n.paddingLeft=d.padding[3];n.itemSpacing=d.gap;n.resize(Math.max(1,d.w),Math.max(1,d.h));}
 }
 return n;
}
const page=await figma.getNodeByIdAsync(PAGE_ID);await figma.setCurrentPageAsync(page);
const root=build(DATA.tree,page);root.name=SCREEN_NAME;root.x=POSITION.x;root.y=POSITION.y;root.clipsContent=true;
const descendants=root.findAll(()=>true),counts={};for(const n of descendants)counts[n.type]=(counts[n.type]||0)+1;
return{createdNodeIds:created,rootId:root.id,name:root.name,width:root.width,height:root.height,counts,errors,fonts:[...families.values()],images:descendants.filter(n=>Array.isArray(n.fills)&&n.fills.some(f=>f.type==='IMAGE')).map(n=>({id:n.id,name:n.name,width:n.width,height:n.height}))};
