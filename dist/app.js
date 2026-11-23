'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const icons = {
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 decks:'<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8m-4-3v3"/>',
 bookmark:'<path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4z"/>',
 layers:'<path d="m12 3 9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
 scroll:'<rect x="6.5" y="2.5" width="11" height="19" rx="5.5"/><path d="M12 6v4"/>',
 flower:'<path d="M12 9c-5-8 5-8 1 0 6-7 10 2 2 2 9 1 5 10-1 4 2 9-7 9-5 0-7 5-10-5-2-5-6-5 2-10 5-1z"/><circle cx="12" cy="12" r="1.3"/>',
 leaf:'<path d="M4 17C1 9 8 4 21 3c0 13-6 19-14 15M3 21l13-13"/>',
 chevron:'<path d="m9 6 6 6-6 6"/>', menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
 play:'<path d="m7 4 13 8-13 8z"/>', copy:'<rect x="8" y="7" width="12" height="14" rx="2"/><path d="M15 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
 edit:'<path d="m4 16-1 5 5-1L20 8l-4-4zM13 7l4 4"/>', x:'<path d="m6 6 12 12M18 6 6 18"/>',
 folder:'<path d="M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
 workspace:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2M3 11h18m-11 0v2h4v-2"/>',
 down:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.4"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';}
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=n=>String(n+1).padStart(2,'0');
const seed=[
 {type:'cover',name:'Cover',kicker:'A springtime story',title:'Cherry Blossom',body:'A moment of beauty, held in bloom.'},
 {type:'intro',name:'Introduction',kicker:'The awakening',title:'When spring arrives',body:'Along the quiet shore, the first blossoms unfold. For a few short weeks, familiar paths become something new.'},
 {type:'story',name:'Image story',kicker:'In detail',title:'A closer look',body:'Five soft petals catch the evening light. Each little bloom holds a whole season within it.',image:'./assets/blossoms.webp'},
 {type:'quote',name:'Quote',kicker:'',title:'“Even the briefest bloom leaves a lasting impression.”',body:'A reflection on spring'},
 {type:'closing',name:'Closing',kicker:'Until next spring',title:'Thank you',body:'May you find beauty in the passing moments.'}
];
let decks=[],currentDeck=null,sceneIndex=0,draftImage='',pendingFile=null,noticeTimer;
let workspaceId='default',workspaces={default:'Personal workspace'};
try{workspaces={...workspaces,...JSON.parse(localStorage.getItem('petal-profiles')||'{}')};workspaceId=localStorage.getItem('petal-active')||'default';if(!Object.hasOwn(workspaces,workspaceId))workspaceId='default';}catch{}
const bookmarkKey=()=>workspaceId==='default'?'petal-bookmark':'petal-bookmark-'+workspaceId;
const belongs=d=>(d.owner||'default')===workspaceId;
let bookmarked=false;
try{bookmarked=localStorage.getItem(bookmarkKey())==='yes';}catch{}
const dbReady=new Promise((resolve,reject)=>{
 const req=indexedDB.open('petal-studio-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('presentations',{keyPath:'id'});
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function loadDecks(){const db=await dbReady;return new Promise((resolve,reject)=>{const r=db.transaction('presentations').objectStore('presentations').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updated-a.updated));r.onerror=()=>reject(r.error);});}
async function saveDeck(deck){const db=await dbReady;await new Promise((resolve,reject)=>{const tx=db.transaction('presentations','readwrite');tx.objectStore('presentations').put(deck);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);});decks=[deck,...decks.filter(d=>d.id!==deck.id)];}
function notify(msg){const n=$('#notice');n.textContent=msg;n.classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('visible'),2800);}
function toggleFavorite(){const next=!bookmarked;try{localStorage.setItem(bookmarkKey(),next?'yes':'no');}catch{notify('Your browser could not save this favorite.');return;}bookmarked=next;render(false);notify(next?'Added to favorites':'Removed from favorites');}
const navItems=[['library','grid','Template library'],['mine','decks','My presentations'],['favorites','bookmark','Favorites']];
$('#workspace-nav').innerHTML=navItems.map(([path,glyph,name])=>'<a data-nav="'+path+'" href="#'+path+'">'+icon(glyph)+name+'</a>').join('');
$('#foot-icon').innerHTML=icon('workspace');$('#mobile-menu').innerHTML=icon('menu');$('#profile').onclick=()=>{
 $('#workspace-list').innerHTML=Object.entries(workspaces).map(([id,name])=>'<option value="'+esc(id)+'" '+(id===workspaceId?'selected':'')+'>'+esc(name)+'</option>').join('');
 $('#workspace-name').value='';$('#profiles').showModal();
};
$('#switch-profile').onclick=()=>switchWorkspace($('#workspace-list').value);
$('#profile-form').onsubmit=e=>{
 e.preventDefault();const name=$('#workspace-name').value.trim();if(!name)return;
 const id=crypto.randomUUID();workspaces[id]=name;switchWorkspace(id);
};
function switchWorkspace(id){
 try{localStorage.setItem('petal-profiles',JSON.stringify(workspaces));localStorage.setItem('petal-active',id);}catch{notify('Could not save this workspace.');return;}
 workspaceId=id;bookmarked=localStorage.getItem(bookmarkKey())==='yes';$('#profiles').close();location.hash='mine';render();
}
function menu(open){$('#sidebar').classList.toggle('open',open);$('#scrim').classList.toggle('on',open);$('#mobile-menu').setAttribute('aria-expanded',open);}
$('#mobile-menu').onclick=()=>menu(!$('#sidebar').classList.contains('open'));$('#scrim').onclick=()=>menu(false);
$('#edit-x').innerHTML=icon('x');$('#present-close').innerHTML=icon('x');
const bookmarkButton=()=>'<button class="icon-button '+(bookmarked?'is-saved':'')+'" data-action="bookmark" aria-pressed="'+bookmarked+'" aria-label="'+(bookmarked?'Remove from favorites':'Add to favorites')+'" title="'+(bookmarked?'Remove from favorites':'Add to favorites')+'">'+icon('bookmark')+'</button>';
const deckName=d=>d.scenes[0].title.trim()||'Untitled presentation';
function setCrumbs(items){$('#crumbs').innerHTML=items.map((x,i)=>(i?icon('chevron'):'')+(x[1]?'<a href="#'+x[1]+'">'+esc(x[0])+'</a>':'<strong>'+esc(x[0])+'</strong>')).join('');}
const layouts = {
 cover: [[8,16,84],[4,30,92],[8,65,84]],
 intro: [[6,8,78],[6,23,86],[6,48,84]],
 story: [[51,9,45],[51,22,46],[51,46,45]],
 quote: [[8,4,84],[5,19,90],[9,68,82]],
 closing: [[6,16,88],[5,30,90],[7,65,86]]
};
function initialBoxes(scene) {
 const layout = layouts[scene.image ? 'story' : scene.type];
 return ['kicker','title','body'].flatMap((role,i)=>{
  if(!scene[role]) return [];
  const [x,y,w]=layout[i];
  return [{id:role,role,text:scene[role],x,y,w}];
 });
}
function sceneBoxes(scene) { return scene.boxes ?? initialBoxes(scene); }
function boxHTML(box,editing) {
 const controls = editing ? '<button type="button" class="move-box" aria-label="Move text box with drag or arrow keys" title="Drag to move · arrow keys to nudge">✥</button>' : '';
 const field = editing ? ' contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="'+esc(box.role)+' text"' : '';
 return '<div class="text-box box-'+esc(box.role)+'" data-box="'+esc(box.id)+'" style="left:'+box.x+'%;top:'+box.y+'%;--box-y:'+box.y+'%;width:'+box.w+'%">'+controls+'<div class="box-text"'+field+'>'+esc(box.text)+'</div></div>';
}
function sceneHTML(scene,editing=false) {
 const photo=scene.image?'<img class="board-photo" src="'+esc(scene.image)+'" alt="Image for '+esc(scene.name)+'">':'';
 return '<section class="scene '+esc(scene.type)+(editing?' editable':'')+'" aria-label="'+esc(scene.name)+'"><div class="board">'+photo+sceneBoxes(scene).map(b=>boxHTML(b,editing)).join('')+'</div></section>';
}
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
let selected=null, pendingFocus=null;
function selectBox(node){
 main.querySelectorAll('.text-box.selected').forEach(el=>el.classList.remove('selected'));
 selected=node;
 node?.classList.add('selected');
 const remove=$('[data-action="deleteBox"]');
 if(remove)remove.disabled=!node;
}
function modelFor(node){
 const scene=node.closest('.scene');
 const index=Array.from(scene.parentElement.children).indexOf(scene);
 const data=currentDeck.scenes[index];
 data.boxes??=initialBoxes(data);
 return {scene:data,index,box:data.boxes.find(b=>b.id===node.dataset.box)};
}
function saveLayout(){
 currentDeck.updated=Date.now();
 saveDeck(currentDeck).catch(()=>notify('Could not save. Check your device storage.'));
}
function syncTitle(index){
 const s=currentDeck.scenes[index];
 const thumbNode=main.querySelectorAll('.thumb-art')[index];
 if(thumbNode)thumbNode.innerHTML=sceneHTML(s);
 if(index===0){
  const title=deckName(currentDeck);
  $('h1',main).textContent=title;
  setCrumbs([['My presentations','mine'],[title]]);
  document.title=title+' · Petal Studio';
 }
}
main.addEventListener('focusin',e=>{
 const box=e.target.closest('.editable .text-box');
 if(box) selectBox(box);
});
main.addEventListener('input',e=>{
 if(!e.target.matches('.editable .box-text'))return;
 const {scene,box,index}=modelFor(e.target.closest('.text-box'));
 box.text=e.target.innerText.replace(/\r/g,'');
 if(['title','body','kicker'].includes(box.role))scene[box.role]=box.text;
 syncTitle(index);saveLayout();
});
function focusBox(id){
 const stage=$('.stage',main),field=stage.querySelectorAll('.scene')[sceneIndex].querySelector('[data-box="'+CSS.escape(id)+'"] .box-text');
 if(!field)return;
 field.focus({preventScroll:true});
 const range=document.createRange();range.selectNodeContents(field);
 const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
}
function addBox(){
 const scene=currentDeck.scenes[sceneIndex];scene.boxes??=initialBoxes(scene);
 const extra=scene.boxes.filter(b=>b.role==='note').length;
 const box={id:crypto.randomUUID(),role:'note',text:'Your text here',x:6+(extra%3)*9,y:Math.max(8,82-(extra%5)*13),w:48};
 scene.boxes.push(box);saveLayout();detail(currentDeck);focusBox(box.id);
}
function deleteBox(){
 if(!selected?.isConnected)return;
 const {scene,box}=modelFor(selected);
 scene.boxes=scene.boxes.filter(b=>b.id!==box.id);
 if(['title','body','kicker'].includes(box.role))scene[box.role]='';
 selectBox(null);saveLayout();detail(currentDeck);
}
function moveBox(node,box,x,y){
 const board=node.parentElement;
 box.x=clamp(x,0,100-box.w);
 box.y=clamp(y,0,Math.max(0,100-100*node.offsetHeight/board.clientHeight));
 node.style.left=box.x+'%';node.style.top=box.y+'%';node.style.setProperty('--box-y',box.y+'%');
}
main.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('.move-box');if(!handle)return;
 const node=handle.parentElement,{box,index}=modelFor(node),board=node.parentElement;
 const x=box.x,y=box.y,startX=e.clientX,startY=e.clientY;
 e.preventDefault();selectBox(node);handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);
 handle.onpointermove=ev=>moveBox(node,box,x+(ev.clientX-startX)*100/board.clientWidth,y+(ev.clientY-startY)*100/board.clientHeight);
 handle.onlostpointercapture=()=>{handle.onpointermove=null;syncTitle(index);saveLayout();};
});
main.addEventListener('keydown',e=>{
 const handle=e.target.closest('.move-box');if(!handle)return;
 const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(!delta)return;
 e.preventDefault();const node=handle.parentElement,{box,index}=modelFor(node);
 moveBox(node,box,box.x+delta[0],box.y+delta[1]);syncTitle(index);saveLayout();
});
function stageHTML(scenes,editing){
 return '<div class="stage"><div class="scene-scroll" tabindex="0" role="region" aria-label="Scrollable presentation scenes">'+scenes.map(s=>sceneHTML(s,editing)).join('')+'</div><div class="petals" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="preview-tag">'+icon('eye')+(editing?'Click text to edit':'Live preview')+'</span><button class="expand" data-action="present" title="Open presentation" aria-label="Open presentation">'+icon('expand')+'</button><div class="counter"><span class="current-number">01</span><i></i><span>05</span></div><button class="scroll-cue">'+icon('scroll')+'<span>Scroll to explore</span></button><div class="stage-dots">'+scenes.map((s,i)=>'<button data-to="'+i+'" aria-label="Go to scene '+(i+1)+', '+esc(s.name)+'"></button>').join('')+'</div></div>';
}
function thumb(s,i){return '<button class="thumb-card" data-scene="'+i+'" aria-label="Preview scene '+(i+1)+', '+esc(s.name)+'"><span class="thumb-art" aria-hidden="true">'+sceneHTML(s)+'</span><span class="thumb-label"><small>'+digits(i)+'</small><b>'+esc(s.name)+'</b></span></button>';}
function detail(deck){
 selected=null;
 const scenes=deck?deck.scenes:seed,title=deck?deckName(deck):'Cherry Blossom';
 setCrumbs(deck?[['My presentations','mine'],[title]]:[['Template library','library'],['Template preview']]);
 main.innerHTML='<div class="detail-head"><div><div class="eyebrow">'+icon('leaf')+'Botanical collection</div><h1>'+esc(title)+'</h1><div class="metadata"><span>'+icon('layers')+'5 scenes</span><i></i><span>'+icon('scroll')+'Scrolling presentation</span></div></div><div class="actions">'+(deck?'<button class="icon-button" data-action="export" title="Download presentation HTML" aria-label="Download presentation HTML">'+icon('down')+'</button><button class="btn primary" data-action="present">'+icon('play')+'Present</button>':bookmarkButton()+'<button class="btn primary" data-action="use">'+icon('copy')+'Use template</button>')+'</div></div>'+stageHTML(scenes,!!deck)+(deck?'<div class="editor-toolbar"><p id="edit-context"></p><div class="box-actions"><button class="btn" data-action="addBox">+ Text box</button><button class="btn" data-action="deleteBox" disabled>Delete box</button><button class="btn" data-action="edit">Scene image</button></div></div>':'')+'<section aria-label="Scene overview"><div class="outline-head"><h2>Scene overview</h2><span>5 scenes</span></div><div class="scene-grid">'+scenes.map(thumb).join('')+'</div></section>';
 bindStage($('.stage',main),sceneIndex,true);
 document.title=title+' · Petal Studio';
 if(deck&&pendingFocus){const target=pendingFocus;pendingFocus=null;sceneIndex=target.index;goScene($('.stage',main),sceneIndex,false);focusBox(target.id);}
}
function goScene(stage,i,smooth=true){const scroller=$('.scene-scroll',stage);scroller.scrollTo({top:scroller.clientHeight*i,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});}
function bindStage(stage,start,updateMain){
 const scroller=$('.scene-scroll',stage);let index=start;
 const update=i=>{index=i;$('.current-number',stage).textContent=digits(i);stage.querySelectorAll('[data-to]').forEach((b,k)=>{b.classList.toggle('current',i===k);b.setAttribute('aria-current',i===k);});$('.scroll-cue span',stage).textContent=i===4?'Back to cover':i===0?'Scroll to explore':'Next scene';if(updateMain){if(sceneIndex!==i)selectBox(null);sceneIndex=i;main.querySelectorAll('[data-scene]').forEach((b,k)=>b.setAttribute('aria-current',i===k));if($('#edit-context'))$('#edit-context').textContent='Scene '+digits(i)+' · '+seed[i].name;}};
 scroller.onscroll=()=>update(Math.min(4,Math.max(0,Math.round(scroller.scrollTop/scroller.clientHeight))));
 stage.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>goScene(stage,Number(b.dataset.to)));
 $('.scroll-cue',stage).onclick=()=>goScene(stage,(index+1)%5);
 scroller.onkeydown=e=>{if(e.target.closest('.text-box'))return;let next=({ArrowDown:index+1,PageDown:index+1,' ':index+(e.shiftKey?-1:1),ArrowUp:index-1,PageUp:index-1,Home:0,End:4})[e.key];if(next===undefined)return;e.preventDefault();goScene(stage,Math.max(0,Math.min(4,next)));};
 goScene(stage,start,false);update(start);
}
function card(deck){
 const url=deck?'deck/'+deck.id:'template',title=deck?deckName(deck):'Cherry Blossom';
 return '<article class="gallery-card"><a href="#'+url+'"><div class="gallery-image"><strong>'+esc(title)+'</strong></div><div class="gallery-body"><h2>'+esc(title)+'</h2><p>Botanical · 5 scenes</p></div></a><div class="gallery-tools"><a href="#'+url+'">'+(deck?'Open presentation':'Preview template')+'</a>'+(deck?'':bookmarkButton())+'</div></article>';
}
function collection(route){
 const title=({library:'Template library',botanical:'Botanical collection',mine:'My presentations',favorites:'Favorites'})[route];
 document.title=title+' · Petal Studio';setCrumbs([['Workspace'],[title]]);
 let cards=route==='mine'?decks.filter(belongs).map(card).join(''):route==='favorites'&&!bookmarked?'':card(null);
 main.innerHTML='<div class="library-head"><div class="eyebrow">'+icon(route==='mine'?'decks':'leaf')+(route==='mine'?'Personal workspace':'Template collection')+'</div><h1>'+title+'</h1></div>'+(cards?'<div class="gallery">'+cards+'</div>':'<div class="empty"><h2>'+(route==='mine'?'Create your first presentation':'Your favorite templates')+'</h2><p>'+(route==='mine'?'Choose a template to start adding your text and images.':'Save a template with the bookmark button to find it here.')+'</p><a class="btn primary" href="#library">Browse templates</a></div>');
}
function render(reset=true){
 $('.sidebar-foot strong').textContent=workspaces[workspaceId];$('#profile').textContent=workspaceId==='default'?'PS':workspaces[workspaceId].slice(0,2).toUpperCase();const route=location.hash.slice(1)||'template';menu(false);if(reset){sceneIndex=0;window.scrollTo(0,0);}
 currentDeck=route.startsWith('deck/')?decks.find(d=>belongs(d)&&d.id===route.slice(5)):null;
 const nav=currentDeck?'mine':['mine','favorites','botanical'].includes(route)?route:'library';
 document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===nav);if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(['library','favorites','mine','botanical'].includes(route))collection(route);else if(route.startsWith('deck/')&&!currentDeck)collection('mine');else detail(currentDeck);
}
async function newDeck(){
 if($('[data-action=use]')?.disabled)return;
 const btn=$('[data-action=use]');if(btn)btn.disabled=true;
 const d={id:crypto.randomUUID(),updated:Date.now(),owner:workspaceId,scenes:structuredClone(seed)};
 for(const scene of d.scenes)scene.boxes=initialBoxes(scene);
 d.scenes[1].boxes.push({id:'detail',role:'note',text:'Field notes · Early spring',x:6,y:83,w:58});
 d.scenes[4].boxes.push({id:'signature',role:'note',text:'Presented by '+(workspaceId==='default'?'you':workspaces[workspaceId]),x:22,y:83,w:56});
 try{await saveDeck(d);location.hash='deck/'+d.id;notify('Your presentation is ready to edit');}
 catch{notify('Your browser could not save a presentation. Check device storage.');if(btn)btn.disabled=false;}
}
function present(){const p=$('#presenter');$('#present-stage').innerHTML=stageHTML(currentDeck?currentDeck.scenes:seed,false);p.showModal();document.body.style.overflow='hidden';bindStage($('#present-stage .stage'),sceneIndex,false);$('#present-stage .scene-scroll').focus({preventScroll:true});}
$('#present-close').onclick=()=>$('#presenter').close();
$('#presenter').onclose=()=>{document.body.style.overflow='';const active=$('#present-stage .current');if(active&&$('.stage',main))goScene($('.stage',main),Number(active.dataset.to),false);$('#present-stage').replaceChildren();};
function imagePreview(){const p=$('#upload-preview');p.hidden=!draftImage;if(draftImage)p.src=draftImage;else p.removeAttribute('src');$('#remove-image').hidden=!draftImage;}
function edit(){if(!currentDeck)return;const s=currentDeck.scenes[sceneIndex];$('#edit-num').textContent='Scene '+digits(sceneIndex)+' · '+s.name;draftImage=s.image||'';$('#edit-image').value='';$('#edit-error').textContent='';pendingFile=null;imagePreview();$('#editor').showModal();$('#edit-image').focus();}
async function readPicture(file){
 const url=URL.createObjectURL(file);
 try{const pic=new Image();pic.src=url;await pic.decode();const factor=Math.min(1,1600/Math.max(pic.naturalHeight,pic.naturalWidth));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(pic.naturalWidth*factor));canvas.height=Math.max(1,Math.round(pic.naturalHeight*factor));canvas.getContext('2d').drawImage(pic,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.86);}
 finally{URL.revokeObjectURL(url);}
}
$('#edit-image').onchange=async e=>{const file=e.target.files[0];if(!file)return;const job=readPicture(file);pendingFile=job;$('#edit-save').disabled=true;try{const image=await job;if(job!==pendingFile)return;draftImage=image;imagePreview();$('#edit-error').textContent='';}catch{if(job===pendingFile)$('#edit-error').textContent='Choose an image your browser can open, such as JPG or PNG.';}finally{if(job===pendingFile){pendingFile=null;$('#edit-save').disabled=false;}}};
$('#remove-image').onclick=()=>{pendingFile=null;draftImage='';$('#edit-image').value='';$('#edit-save').disabled=false;imagePreview();};
$('#edit-x').onclick=$('#edit-cancel').onclick=()=>$('#editor').close();
$('#editor').onclose=()=>{pendingFile=null;$('#edit-save').disabled=false;};
$('#edit-form').onsubmit=async e=>{e.preventDefault();if(pendingFile)return;const deck=structuredClone(currentDeck);const scene=deck.scenes[sceneIndex];
 const previous=initialBoxes(scene);
 scene.image=draftImage;
 const next=initialBoxes(scene);
 for(const box of scene.boxes||[]){
  const old=previous.find(b=>b.id===box.id),updated=next.find(b=>b.id===box.id);
  if(old&&updated&&box.x===old.x&&box.y===old.y&&box.w===old.w)Object.assign(box,{x:updated.x,y:updated.y,w:updated.w});
 }
 deck.updated=Date.now();$('#edit-save').disabled=true;try{await saveDeck(deck);$('#editor').close();render(false);notify('Changes saved on this device');}catch{$('#edit-error').textContent='Could not save changes. Check your available device storage.';}finally{$('#edit-save').disabled=false;}};
main.addEventListener('click',e=>{const clicked=e.target.closest('.stage .text-box');
 if(clicked&&!currentDeck){pendingFocus={id:clicked.dataset.box,index:sceneIndex};newDeck();return;}
 const thumb=e.target.closest('[data-scene]');if(thumb){goScene($('.stage',main),Number(thumb.dataset.scene));return;}const b=e.target.closest('[data-action]');if(!b)return;({addBox,deleteBox,use:newDeck,bookmark:toggleFavorite,present,edit,export:exportDeck})[b.dataset.action]?.();});
async function dataUrl(url){const r=await fetch(url);if(!r.ok)throw Error('Could not load an asset');const blob=await r.blob();return new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob);});}
async function exportDeck(){
 const b=$('[data-action=export]');b.disabled=true;
 try{
 const deck=structuredClone(currentDeck);
 const [bg,detail,style,serif,sans]=await Promise.all([dataUrl('./assets/landscape.webp'),dataUrl('./assets/blossoms.webp'),fetch('./style.css').then(r=>r.text()),dataUrl('./assets/type-5.ttf'),dataUrl('./assets/type-0.ttf')]);
 deck.scenes.forEach(s=>{if(s.image==='./assets/blossoms.webp')s.image=detail;});
 const css=style.replaceAll('./assets/landscape.webp',bg)+'@font-face{font-family:"Instrument Serif";src:url('+serif+')}@font-face{font-family:"DM Sans";src:url('+sans+')}html,body,.stage{height:100%;width:100%;border-radius:0;max-height:none}.stage:after{display:none}';
 const doc='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(deckName(deck))+'</title><style>'+css+'</style><div class="stage"><div class="scene-scroll" tabindex="0" role="region" aria-label="Scrolling presentation">'+deck.scenes.map(s=>sceneHTML(s)).join('')+'</div></div></html>';
 const url=URL.createObjectURL(new Blob([doc],{type:'text/html'}));const a=document.createElement('a');a.href=url;a.download=(deckName(deck).replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,80)||'Presentation')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Presentation downloaded');
 }catch{notify('Could not export this presentation. Please try again.');}finally{b.disabled=false;}
}
window.addEventListener('hashchange',()=>{if($('#editor').open)$('#editor').close();if($('#presenter').open)$('#presenter').close();render();});
loadDecks().then(data=>{decks=data;render();}).catch(()=>{render();notify('Browser storage is unavailable. You can still preview templates.');});
