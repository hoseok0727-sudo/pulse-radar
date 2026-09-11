import {CATEGORIES} from './catalog.mjs';
import {createExtension} from './access.mjs';
import {createViews} from './views.mjs';
import {request,requestExplorePages,download,isPublicSite} from './api.mjs';
import {mountPersonalAI} from './personal-ai.mjs';
import {parseRoute,dailyHash,editionLink} from './daily-navigation.mjs';
let disposePersonalAI=null;
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={preferences:{locale:'ko',theme:'light',region:'korea',categories:[],keywords:[],exclude:[]},user:null,tab:'today',period:'day',category:'all',q:'',page:1,radar:false,libraryKind:'save',expanded:false,stories:new Map(),bookmarks:[],feedback:[],hidden:[],version:0};
const cat=CATEGORIES;
const tabs={today:['오늘의 브리핑','Today'],explore:['이야기 탐색','Explore'],library:['내 보관함','Library'],history:['브리핑 기록','History'],settings:['관심사·설정','Settings']};
const tr=(ko,en)=>state.preferences.locale==='en'?en:ko;
const storyTitle=s=>state.preferences.locale==='en'?(s.titleEn||s.title):s.title;
const txt=value=>typeof value==='string'?value:value?.[state.preferences.locale]||value?.ko||'';
const categoryName=s=>cat[s]?.[state.preferences.locale==='en'?1:0]||s;
const date=(value,full=false)=>value?new Intl.DateTimeFormat(state.preferences.locale==='en'?'en-US':'ko-KR',{month:'short',day:'numeric',...(full?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(value)):tr('확인 전','Not checked');
const href=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?esc(u.href):'#'}catch{return '#'}};
let toastTimer,searchTimer,dialogTrigger,searchComposing=false;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800)}
function capturePreferenceDraft(){
  const form=$('#preferences');if(!form)return;
  const values=new FormData(form),fields={categories:values.getAll('categories'),keywords:String(values.get('keywords')||'').split(',').map(s=>s.trim()).filter(Boolean),exclude:String(values.get('exclude')||'').split(',').map(s=>s.trim()).filter(Boolean),region:values.get('region'),personalization:values.has('personalization')};
  const baseline=Object.fromEntries(Object.keys(fields).map(key=>[key,state.preferences[key]]));
  state.preferenceDraft=JSON.stringify(fields)===JSON.stringify(baseline)?null:fields;
  const status=$('#preferences-draft-status');if(status)status.textContent=state.preferenceDraft?tr('아직 저장하지 않은 변경이 있어요.','You have unsaved changes.'):'';
}
function scheduleSearch(input){
  state.q=input.value;clearTimeout(searchTimer);if(searchComposing)return;
  searchTimer=setTimeout(async()=>{if(state.tab!=='explore'||searchComposing)return;const selection=[input.selectionStart,input.selectionEnd],focused=document.activeElement===input;state.page=1;await load({keep:true});const next=$('#search');if(next&&focused){next.focus();next.setSelectionRange(...selection);}},450);
}
function remember(items){for(const s of items||[])state.stories.set(s.topicId,s);return items||[]}
function scope(){return new URLSearchParams({region:state.preferences.region,period:state.period})}
function shell(){document.documentElement.lang=state.preferences.locale;document.body.classList.toggle('dark',state.preferences.theme==='dark');$('#navigation').innerHTML=Object.entries(tabs).map(([key,n])=>`<a href="#${key}" ${key===state.tab?'aria-current="page"':''}>${esc(tr(...n))}</a>`).join('');$('#navigation').setAttribute('aria-label',tr('주요 메뉴','Main navigation'));$('.skip').textContent=tr('본문으로 이동','Skip to content');$('.dialog-close').setAttribute('aria-label',tr('닫기','Close'));$('#dialog').setAttribute('aria-label',tr('상세 내용','Story details'));$('#account').textContent=state.user?.displayName||tr(isPublicSite?'내 설정':'내 계정',isPublicSite?'My settings':'Account');$('#language').textContent=tr('EN','한국어');$('.edition').textContent=tr('세상의 흐름, 나의 관심사','The world. Your interests.');$('#footer-copy').textContent=tr('하루의 흐름을 읽고, 관심사를 이어가다','Read the day. Follow your curiosity.');$('#theme').setAttribute('aria-label',state.preferences.theme==='dark'?tr('밝은 테마로 변경','Switch to light theme'):tr('어두운 테마로 변경','Switch to dark theme'));$('#theme').setAttribute('aria-pressed',String(state.preferences.theme==='dark'));document.querySelector('meta[name="theme-color"]').content=state.preferences.theme==='dark'?'#11141b':'#f5f6fa';extension?.shell();}
const {heading,empty,loader,renderDaily,renderPersonal,renderToday,renderExplore,renderLibrary,renderHistory,historyRows,renderSettings,sourceLinks,actionButtons}=createViews({state,$,esc,tr,txt,date,categoryName,cat,remember,href,storyTitle});
const extension=createExtension?.({state,$,esc,tr,date,href,heading,sourceLinks,request,download,toast,load});
Object.assign(tabs,extension?.tabs||{});
extension?.initialize();
function openDialog(html){if(!$('#dialog').open)dialogTrigger=document.activeElement;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();$('#dialog').scrollTop=0;}
async function openStory(id){try{let s=state.stories.get(id);if(!s)s=await request('/api/v2/story/'+encodeURIComponent(id));remember([s]);if(s.evidence!=='source-reviewed'){
  const reports=s.articles||[];
  openDialog(`<article class="detail"><div class="eyebrow">${esc(categoryName(s.category))} · ${esc(date(s.publishedAt))}</div><h1>${esc(storyTitle(s))}</h1><p class="source-notice">${tr('관련 제목의 원문 보도를 모았습니다. 기사 본문을 검토한 요약은 아니므로, 아래 출처에서 내용을 확인해 주세요.','A collection of related source headlines. Article bodies have not been reviewed; read the original reports below.')}</p>${actionButtons(s)}<h2>${tr('원문에서 이어 읽기','Continue with the original reports')}</h2>${sourceLinks(reports.slice(0,5))}${reports.length>5?`<details class="more-sources"><summary>${tr('원문 더 보기','More source reports')} · ${reports.length-5}</summary>${sourceLinks(reports.slice(5))}</details>`:''}<details class="collection-context"><summary>${tr('이 소식을 고른 이유와 지난 기록','Why this story & previous coverage')}</summary><p>${esc(txt(s.reason))}</p><p>${esc(txt(s.change))}</p>${sourceLinks(s.change?.articles||[])}</details></article>`);return;
}openDialog(`<article class="detail"><div class="eyebrow">${esc(categoryName(s.category))} · ${esc(date(s.publishedAt))}</div><h1>${esc(storyTitle(s))}</h1><p class="lead">${esc(txt(s.summary))}</p>${s.why?`<div class="editor-note"><strong>${tr('이 대목을 봐주세요','What to pay attention to')}</strong><p>${esc(txt(s.why))}</p></div>`:''}<div class="change-box"><h2>${tr('지난번 이후','Since your last visit')}</h2><p>${esc(txt(s.change))}</p>${sourceLinks(s.change.articles||[])}</div><h2>${tr('다음에 확인할 질문','What to watch next')}</h2><p>${esc(txt(s.next))}</p><p class="source-notice">${esc(txt(s.limits))}</p><h2>${tr('이 이야기를 고른 이유','Why this story')}</h2><p>${esc(txt(s.reason))}</p>${actionButtons(s)}${extension?.detailActions(s)||''}<h2>${tr('확인한 원문과 관련 보도','Original sources and coverage')}</h2>${sourceLinks(s.verifiedSources?.length?s.verifiedSources:s.articles)}<p class="fine">${s.evidence==='source-reviewed'?tr('Codex가 공식 원문을 대조해 작성한 AI 편집 설명입니다. 원문과 함께 확인해 주세요.','AI editorial context written by Codex after checking official sources. Read alongside the originals.'):tr('보도 제목을 수집한 상태입니다. 본문 검증이나 AI의 사실 판정을 뜻하지 않습니다.','Collected source headlines. Article bodies have not been fact-checked.')}</p></article>`);}catch(e){toast(e.message)}}
async function loadDaily({version=state.version}={}){
  const sequence=state.dailySequence=(state.dailySequence||0)+1;
  const activeControl=document.activeElement?.id;
  state.dailyBusy=true;state.dailyError='';
  const paint=()=>{if(version===state.version&&state.tab==='today'&&$('#daily-digest-region'))$('#daily-digest-region').innerHTML=renderDaily()};
  paint();
  try{const result=await request('/api/v2/daily'+(state.dailyDate?'?date='+encodeURIComponent(state.dailyDate):''));if(sequence!==state.dailySequence)return;state.daily=result;}
  catch(error){if(sequence!==state.dailySequence)return;state.dailyError=error.message;}
  finally{if(sequence===state.dailySequence){state.dailyBusy=false;paint();if(version===state.version&&['daily-reload','daily-retry','daily-date','daily-previous','daily-next','daily-latest'].includes(activeControl)){const control=$('#'+activeControl);(control&&!control.disabled?control:$('#daily-date'))?.focus({preventScroll:true});}}}
}
async function loadHome(version){
  $('#main').innerHTML=renderToday(null);
  $('#main').setAttribute('aria-busy','false');
  const personal=request('/api/v2/briefing?'+scope()).then(data=>{if(version!==state.version)return;$('#personal-briefing-region').innerHTML=renderPersonal(data);}).catch(error=>{if(version!==state.version)return;$('#personal-briefing-region').innerHTML=empty(tr('내 관심사 소식을 불러오지 못했어요.','Your personal briefing is unavailable.'),error.message,`<button id="retry">${tr('다시 시도','Try again')}</button>`)});
  await Promise.allSettled([loadDaily({version}),personal]);
  if(version===state.version)$('#main').setAttribute('aria-busy','false');
}
async function load({keep=false}={}){capturePreferenceDraft();disposePersonalAI?.();disposePersonalAI=null;const version=++state.version;const route=parseRoute(location.hash,tabs);state.tab=route.tab;if(state.dailyDate!==route.date)state.daily={...state.daily,edition:null};state.dailyDate=route.date;const canonical=route.tab==='today'?dailyHash(route.date):'#'+route.tab;if(location.hash&&location.hash!=='#main'&&location.hash!==canonical)history.replaceState(null,'',canonical);shell();$('#main').setAttribute('aria-busy','true');const more=$('#load-more');if(more)more.disabled=true;if(state.tab==='today')return loadHome(version);if(!keep)$('#main').innerHTML=loader();try{let html;
  if(state.tab==='explore'){const q=scope();q.set('q',state.q);q.set('category',state.category);q.set('page',state.page);const data=await requestExplorePages(q);if(version!==state.version||q.get('q')!==state.q)return;state.page=data.page;html=renderExplore(data);}
  else if(state.tab==='library'){const data=await request('/api/v2/library');if(version!==state.version)return;html=renderLibrary(data);}
  else if(state.tab==='history'){const data=await request('/api/v2/history');if(version!==state.version)return;html=renderHistory(data);}
  else if(extension?.handles(state.tab))html=await extension.render();
  else html=renderSettings();if(version!==state.version)return;$('#main').innerHTML=html;$('#main').setAttribute('aria-busy','false');if(state.tab==='settings')disposePersonalAI=mountPersonalAI($('#personal-ai-settings'),{request,tr});
}catch(e){if(version!==state.version)return;$('#main').setAttribute('aria-busy','false');if(more)more.disabled=false;if(keep)toast(e.message);else $('#main').innerHTML=empty(tr('지금은 연결이 원활하지 않아요.','The connection needs a moment.'),e.message,`<button id="retry">${tr('다시 시도','Try again')}</button>`);}}
async function sync(){const next=await request('/api/v2/state');Object.assign(state,next);shell();}
async function action(button,kind,id,value){
  const version=state.version,tab=state.tab,dialog=$('#dialog'),inDialog=dialog.open;
  const dialogScroll=dialog.scrollTop,storyElement=button.closest('.story'),storyTop=storyElement?.getBoundingClientRect().top;
  const expandedDaily=[...document.querySelectorAll('.digest-context')].map((node,index)=>node.open?index:-1).filter(index=>index>=0);
  button.disabled=true;
  try{
    const result=await request('/api/v2/action',{method:'POST',body:{topicId:id,kind,value}});remember([result.story]);await sync();
    if(version===state.version&&tab===state.tab){
      if(inDialog&&dialog.open&&kind!=='hide')await openStory(id);else if(kind==='hide')dialog.close();
      const reloadVersion=state.version+1;await load({keep:true});
      if(tab===state.tab&&state.version===reloadVersion){
        document.querySelectorAll('.digest-context').forEach((node,index)=>{node.open=expandedDaily.includes(index)});
        const area=inDialog&&dialog.open?dialog:$('#main');
        const replacement=[...area.querySelectorAll('button')].find(node=>node.dataset.id===id&&node.dataset.action===kind||button.dataset.unhide&&node.dataset.unhide===id);
        if(inDialog&&dialog.open)dialog.scrollTop=dialogScroll;
        else if(storyTop!==undefined){const nextStory=[...document.querySelectorAll('.story')].find(node=>node.dataset.story===id);if(nextStory)window.scrollBy({top:nextStory.getBoundingClientRect().top-storyTop,behavior:'instant'});}
        if(replacement)replacement.focus({preventScroll:true});else if(document.activeElement===document.body)$('#main').focus({preventScroll:true});
      }
    }
    toast(kind==='hide'?tr('다음 브리핑에서 빼둘게요. 설정에서 되돌릴 수 있어요.','Hidden. You can restore it in Settings.'):tr('기억해 두었습니다.','Saved.'));broadcast();
  }catch(e){toast(e.message)}finally{button.disabled=false}
}
function confirmReset(all){openDialog(`<h2>${tr(all?'관심사와 보관함까지 삭제할까요?':'읽음과 피드백을 초기화할까요?',all?'Delete all your local data?':'Reset your reading memory?')}</h2><p>${tr(all?'관심사, 보관함, 브리핑 기록, 피드백이 삭제됩니다.':'읽음, 피드백, 브리핑 기록을 지웁니다. 관심사와 보관함은 남습니다.',all?'This deletes preferences, library, briefings and feedback.':'This deletes reading feedback and briefing history. Interests and library remain.')}</p><button class="danger" data-confirm-reset="${all?'all':'memory'}">${tr('삭제하기','Delete')}</button>`)}
function auth(){location.hash='settings';}
const channel='BroadcastChannel' in window?new BroadcastChannel('pulse-radar-v2'):null;
function broadcast(){channel?.postMessage('changed')}
if(channel)channel.onmessage=async()=>{await sync();if(!$('#dialog').open&&state.tab!=='settings')await load({keep:true})};
window.addEventListener('hashchange',async()=>{
  if(location.hash==='#main'){$('#main').focus();return}
  clearTimeout(searchTimer);
  const route=parseRoute(location.hash,tabs),target=route.tab,changed=target!==state.tab;
  const canonical=target==='today'?dailyHash(route.date):'#'+target;
  if(location.hash!==canonical)history.replaceState(null,'',canonical);
  if(!changed&&target==='today'){
    if(state.dailyDate!==route.date)state.daily={...state.daily,edition:null};
    state.dailyDate=route.date;await loadDaily();return;
  }
  state.page=1;await load();
  if(changed&&state.tab===target){window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}
});
$('#dialog').addEventListener('close',()=>{
  const restored=dialogTrigger?.isConnected?dialogTrigger:[...$('#main').querySelectorAll('button')].find(node=>dialogTrigger?.dataset.open&&node.dataset.open===dialogTrigger.dataset.open||dialogTrigger?.dataset.history&&node.dataset.history===dialogTrigger.dataset.history||dialogTrigger?.id&&node.id===dialogTrigger.id);
  (restored||$('#main')).focus({preventScroll:true});
});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;try{
  if(await extension?.click(b))return;
  if(b.matches('.dialog-close'))return $('#dialog').close();
  if(b.hasAttribute('data-daily-date')){location.hash=dailyHash(b.dataset.dailyDate);return;}
  if(b.dataset.open)return openStory(b.dataset.open);
  if(b.dataset.action){const s=state.stories.get(b.dataset.id),kind=b.dataset.action,prop={save:'saved',follow:'followed',read:'read',useful:'useful',hide:'hidden'}[kind];return action(b,kind,b.dataset.id,!s?.[prop]);}
  if(b.dataset.unhide)return action(b,'hide',b.dataset.unhide,false);
  if(b.dataset.category){state.category=b.dataset.category;state.page=1;return load({keep:true});}
  if(b.dataset.library){state.libraryKind=b.dataset.library;return load({keep:true});}
  if(b.dataset.authMode)return auth(b.dataset.authMode);
  if(b.dataset.history){const h=state.history.items.find(h=>h.id===b.dataset.history);return openDialog(`<div class="detail"><div class="eyebrow">${esc(date(h.generatedAt,true))} · ${tr('당시의 브리핑','Archived briefing')}</div>${h.items.map(s=>`<section><h1>${esc(storyTitle(s))}</h1><p>${esc(txt(s.summary))}</p>${s.why?`<p>${esc(txt(s.why))}</p>`:''}<h2>${tr('다음 질문','Next question')}</h2><p>${esc(txt(s.next))}</p>${sourceLinks(s.verifiedSources?.length?s.verifiedSources:s.articles)}</section>`).join('')}</div>`);}
  if(b.dataset.confirmReset){b.disabled=true;await request('/api/v2/reset',{method:'POST',body:{scope:b.dataset.confirmReset,confirmation:'DELETE'}});if(b.dataset.confirmReset==='all'){$('#preferences')?.remove();state.preferenceDraft=null;}await sync();$('#dialog').close();await load();broadcast();return;}
  switch(b.id){
    case 'daily-retry':case 'daily-reload':return loadDaily();
    case 'daily-personal':{const region=$('#personal-briefing-region');region?.focus({preventScroll:true});region?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
    case 'daily-copy':{if(!state.daily?.edition)return;const link=editionLink(location.href,state.daily.edition.date);try{await navigator.clipboard.writeText(link);toast(tr('이 날짜의 브리핑 링크를 복사했어요.','Link to this edition copied.'));}catch{openDialog(`<h2>${tr('이 날짜의 브리핑 링크','Link to this edition')}</h2><p>${tr('아래 주소를 복사해 주세요.','Copy the address below.')}</p><input id="edition-link" aria-label="${tr('발행본 주소','Edition address')}" value="${esc(link)}" readonly>`);$('#edition-link').select();}return;}

    case 'retry':return load();
    case 'explore-week':state.period='week';state.page=1;await load({keep:true});$('#period')?.focus({preventScroll:true});return;
    case 'account':if(isPublicSite){location.hash='settings';return;}return auth();
    case 'expand':state.expanded=true;$('#personal-briefing-region').innerHTML=renderPersonal(state.briefing);return;
    case 'radar-toggle':state.radar=!state.radar;$('#main').innerHTML=renderExplore(state.explore);return;
    case 'read-list':$('#reading-list')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;
    case 'refresh':{b.disabled=true;const version=state.version;try{const d=await request('/api/v2/refresh?'+scope(),{method:'POST',body:{}});if(version===state.version&&state.tab==='today'){$('#personal-briefing-region').innerHTML=renderPersonal(d);toast(tr('최신 발행 자료를 확인했습니다.','Checked the latest published collection.'));}}finally{b.disabled=false}return;}
    case 'load-more':{b.disabled=true;const previousVersion=state.version,previousQuery=[state.q,state.category,scope().toString()].join('|');const q=scope();q.set('q',state.q);q.set('category',state.category);q.set('page',state.page+1);const d=await request('/api/v2/explore?'+q);if(previousVersion!==state.version||previousQuery!==[state.q,state.category,scope().toString()].join('|')){b.disabled=false;return;}state.page++;d.items=[...state.explore.items,...d.items];$('#main').innerHTML=renderExplore(d);return;}
    case 'theme':case 'language':{capturePreferenceDraft();const changes=b.id==='theme'?{theme:state.preferences.theme==='dark'?'light':'dark'}:{locale:state.preferences.locale==='ko'?'en':'ko'};await request('/api/v2/preferences',{method:'PUT',body:changes});await sync();if(b.id==='language')await load({keep:true});broadcast();return;}
    case 'export':return download('pulse-radar-my-data.json',await request('/api/v2/export'));
    case 'reset-memory':return confirmReset(false);
    case 'reset-all':return confirmReset(true);
    case 'logout':await request('/api/auth/logout',{method:'POST',body:{}});state.stories.clear();await sync();$('#dialog').close();await load();broadcast();return;
    case 'make-recovery':{b.disabled=true;const d=await request('/api/auth/recovery-code',{method:'POST',body:{}});openDialog(`<h2>${tr('복구 코드를 따로 보관해 주세요.','Keep this recovery code somewhere safe.')}</h2><p>${tr('이 코드는 지금 한 번만 보여드립니다. 새 코드를 발급하면 이전 코드는 사용할 수 없습니다.','Shown once. Creating another code invalidates this one.')}</p><code class="recovery-code">${esc(d.data.recoveryCode)}</code>`);return;}
    case 'delete-account':openDialog(`<h2>${tr('계정과 모든 기록을 삭제할까요?','Delete your account and all its data?')}</h2><p>${tr('이 작업은 되돌릴 수 없습니다.','This cannot be undone.')}</p><button id="confirm-delete-account" class="danger">${tr('계정 삭제','Delete account')}</button>`);return;
    case 'confirm-delete-account':await request('/api/account',{method:'DELETE',body:{}});state.stories.clear();await sync();$('#dialog').close();await load();broadcast();return;
  }
}catch(error){b.disabled=false;toast(error.message)}});
document.addEventListener('change',async e=>{if(e.target.closest('#preferences'))capturePreferenceDraft();if(e.target.id==='daily-date'){location.hash=dailyHash(e.target.value);return;}if(!['region','period'].includes(e.target.id))return;const more=$('#load-more');if(more)more.disabled=true;try{if(e.target.id==='region'){state.preferences.region=e.target.value;await request('/api/v2/preferences',{method:'PUT',body:{region:e.target.value}});}else state.period=e.target.value;state.page=1;await load({keep:true});}catch(error){toast(error.message)}});
document.addEventListener('compositionstart',e=>{if(e.target.id==='search'){searchComposing=true;clearTimeout(searchTimer);}});
document.addEventListener('compositionend',e=>{if(e.target.id==='search'){searchComposing=false;scheduleSearch(e.target);}});
document.addEventListener('input',e=>{if(e.target.closest('#preferences'))capturePreferenceDraft();if(e.target.id==='search'){if(e.isComposing){searchComposing=true;clearTimeout(searchTimer);}scheduleSearch(e.target);}if(e.target.id==='history-search'){const q=e.target.value.toLowerCase();$('#history-list').innerHTML=historyRows(state.history.items.filter(h=>JSON.stringify(h).toLowerCase().includes(q)));}});
document.addEventListener('submit',async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]'),error=form.querySelector('.form-error');if(!button)return;button.disabled=true;if(error)error.textContent='';try{const data=new FormData(form);
  if(form.id==='preferences'){await request('/api/v2/preferences',{method:'PUT',body:{categories:data.getAll('categories'),keywords:String(data.get('keywords')).split(','),exclude:String(data.get('exclude')).split(','),region:data.get('region'),personalization:data.has('personalization'),onboarded:true}});await sync();state.preferenceDraft=null;state.expanded=false;location.hash='today';if(state.tab==='today')await load();toast(tr('관심사를 기억해 두었습니다.','Your interests are saved.'));broadcast();}
  if(form.id==='auth-form'){const mode=form.dataset.mode,body=Object.fromEntries(data);await request('/api/auth/'+(mode==='recover'?'recover':mode),{method:'POST',body});if(mode==='recover'){auth('login');toast(tr('비밀번호를 바꿨습니다. 다시 로그인해 주세요.','Password changed. Sign in again.'));return;}await request('/api/v2/claim',{method:'POST',body:{}});state.stories.clear();await sync();$('#dialog').close();await load();broadcast();}
}catch(err){if(error)error.textContent=err.message;else toast(err.message)}finally{button.disabled=false}});
try{await sync();await load();}catch(e){$('#main').innerHTML=empty('Pulse Radar',e.message,'<button id="retry">다시 시도</button>');}
