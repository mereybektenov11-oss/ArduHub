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
