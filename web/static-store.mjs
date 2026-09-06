// Public Pages edition: common stories are published files; personal state stays
// in this browser. This module never stores credentials or calls an AI provider.
export const STATIC_STORAGE_KEY = 'pulse-radar:public:v1';
const DAY=86400000,KST=9*3600000;
const CATEGORIES=['finance','technology','policy','society','world','science','culture','sports'];
const DEFAULT_PREFS={categories:[],keywords:[],exclude:[],region:'korea',personalization:true,onboarded:false,locale:'ko',theme:'light'};
const copy=value=>JSON.parse(JSON.stringify(value));
const normalize=value=>String(value??'').normalize('NFKC').replace(/[\u200b\ufeff]/g,'').replace(/[‐‑‒–—−]/g,'-').replace(/[‘’]/g,"'").replace(/\s+/gu,' ').trim();
const string=(value,max=1600)=>typeof value==='string'?value.slice(0,max):'';
const localized=value=>typeof value==='string'?string(value):{ko:string(value?.ko),...(typeof value?.en==='string'?{en:string(value.en,3200)}:{})};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const realDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const time=value=>realDate(value)?Date.parse(value+'T00:00:00+09:00'):Date.parse(value);
const dateString=value=>typeof value==='string'&&Number.isFinite(time(value))?value:null;
const kstDate=value=>new Date(value+KST).toISOString().slice(0,10);
const urlString=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:''}catch{return ''}};
const list=(value,max=20)=>[...new Map((Array.isArray(value)?value:[]).filter(v=>typeof v==='string').map(v=>normalize(v).slice(0,70).trim()).filter(Boolean).map(v=>[v.toLowerCase(),v])).values()].slice(0,max);
function prefs(input={},base=DEFAULT_PREFS){input=input&&typeof input==='object'?input:{};return {categories:list(input.categories??base.categories,8).filter(v=>CATEGORIES.includes(v)),keywords:list(input.keywords??base.keywords),exclude:list(input.exclude??base.exclude),region:['korea','world'].includes(input.region)?input.region:base.region,personalization:typeof input.personalization==='boolean'?input.personalization:base.personalization,onboarded:typeof input.onboarded==='boolean'?input.onboarded:base.onboarded,locale:['ko','en'].includes(input.locale)?input.locale:base.locale,theme:['light','dark'].includes(input.theme)?input.theme:base.theme};}
function matches(value,term){
  let needle=normalize(term).toLowerCase(),text=normalize(value).toLowerCase();if(!needle)return false;
  const cjk=/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
  if([...needle].filter(c=>cjk.test(c)).length>=4){const spaces=/(?<=[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]) +(?=[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu;needle=needle.replace(spaces,'');text=text.replace(spaces,'');}
  const escape=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),pattern=needle.split(/(?<=[\p{L}\p{N}])[ -]+(?=[\p{L}\p{N}])/u).map(escape).join('[\\s-]*');
  const boundary=/\p{Script=Latin}/u.test(needle)?'\\p{Script=Latin}\\p{N}_':'\\p{L}\\p{N}_',chars=[...needle];
  const expression=new RegExp(`${cjk.test(chars[0])?'':`(^|[^${boundary}])`}${pattern}${cjk.test(chars.at(-1))?'':`(?=$|[^${boundary}])`}`,'u');
  return expression.test(text)||expression.test(text.replace(/(?<=\p{Script=Latin})-(?=\p{Script=Latin})/gu,''));
}
const storyMatches=(story,term)=>[story.title,story.titleEn,...(story.articles||[]).map(a=>a.title)].some(v=>typeof v==='string'&&matches(v,term));
function articles(input){return (Array.isArray(input)?input:[]).slice(0,30).map(a=>({title:string(a?.title,400),source:string(a?.source||a?.publisher,150),publisher:string(a?.publisher||a?.source,150),url:urlString(a?.url),publishedAt:dateString(a?.publishedAt||a?.date)})).filter(a=>a.url&&a.title);}
// This is a stable identity for comparison, not a cryptographic security hash.
function signature(value){let hash=2166136261;for(const char of JSON.stringify(value)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16);}
function cleanStory(value){
  if(!value||typeof value!=='object'||!string(value.topicId,200)||!string(value.title,400))return null;
  const reports=articles(value.articles),verified=articles(value.verifiedSources),sources=[...new Set((reports.length?reports:verified).map(a=>a.source))];
  return {topicId:string(value.topicId,200),issueId:string(value.issueId,200),title:string(value.title,400),titleEn:string(value.titleEn,600)||null,summary:localized(value.summary),why:value.why?localized(value.why):null,next:localized(value.next),category:CATEGORIES.includes(value.category)?value.category:'society',categoryKo:string(value.categoryKo,80),categoryEn:string(value.categoryEn,80),articles:reports,verifiedSources:verified,sources,sourceCount:sources.length,publishedAt:dateString(value.publishedAt),language:value.language==='en'?'en':'ko',evidence:value.evidence==='source-reviewed'&&verified.length?'source-reviewed':'headlines',editorialDate:realDate(value.editorialDate)?value.editorialDate:null,limits:localized(value.limits||{ko:'공개된 자료의 범위 안에서 보여드립니다. 원문을 함께 확인해 주세요.',en:'Shown within the published collection. Read the original sources.'}),region:['korea','world'].includes(value.region)?value.region:null,fingerprint:string(value.fingerprint,128)||signature(reports.map(a=>[a.url,a.title,a.publishedAt])),rawScore:Math.max(0,Math.min(Number(value.rawScore)||0,100))};
}
const emptyState=()=>({schemaVersion:1,preferences:copy(DEFAULT_PREFS),bookmarks:[],feedback:[],visits:{},briefings:[]});
function cleanSnapshot(value){
  if(!value||!dateString(value.generatedAt))return null;
  return {id:string(value.id,100),scope:string(value.scope,50),generatedAt:value.generatedAt,baselineAt:dateString(value.baselineAt),items:(Array.isArray(value.items)?value.items:[]).slice(0,6).map(cleanStory).filter(Boolean),preferences:prefs(value.preferences),total:Math.max(0,Number(value.total)||0),meta:{mode:'published',fetchedAt:dateString(value.meta?.fetchedAt),collection:'published-snapshot'},fingerprint:string(value.fingerprint,100)};
}
function cleanState(value){
  const result=emptyState();if(!value||value.schemaVersion!==1)return result;result.preferences=prefs(value.preferences);
  result.bookmarks=(Array.isArray(value.bookmarks)?value.bookmarks:[]).slice(0,300).map(b=>({topicId:string(b?.topicId,200),kind:b?.kind,snapshot:cleanStory(b?.snapshot),createdAt:dateString(b?.createdAt)})).filter(b=>['save','follow'].includes(b.kind)&&b.snapshot&&b.topicId===b.snapshot.topicId&&b.createdAt);
  result.feedback=(Array.isArray(value.feedback)?value.feedback:[]).slice(0,900).map(f=>({topicId:string(f?.topicId,200),kind:f?.kind,fingerprint:string(f?.fingerprint,128),updatedAt:dateString(f?.updatedAt),snapshot:cleanStory(f?.snapshot)})).filter(f=>f.topicId&&['read','useful','hide'].includes(f.kind)&&f.updatedAt);
  result.briefings=(Array.isArray(value.briefings)?value.briefings:[]).slice(0,90).map(cleanSnapshot).filter(Boolean);
  for(const [key,v] of Object.entries(value.visits||{})){if(!/^(korea|world):(day|week|month)$/.test(key)||!v||!dateString(v.startedAt))continue;result.visits[key]={startedAt:v.startedAt,currentAt:dateString(v.currentAt),baselineAt:dateString(v.baselineAt),baseline:(Array.isArray(v.baseline)?v.baseline:[]).slice(0,6).map(cleanStory).filter(Boolean),current:(Array.isArray(v.current)?v.current:[]).slice(0,6).map(cleanStory).filter(Boolean)};}
  return result;
}
function cleanData(value){
  if(!value||value.schemaVersion!==1||!dateString(value.generatedAt)||!Array.isArray(value.stories)||!Array.isArray(value.editions))throw fail('공개 브리핑 파일을 읽지 못했습니다. 잠시 뒤 다시 확인해 주세요.',503);
  return {schemaVersion:1,generatedAt:value.generatedAt,stories:[...new Map(value.stories.map(cleanStory).filter(Boolean).map(s=>[s.topicId,s])).values()],editions:value.editions.filter(e=>e&&e.schemaVersion===1&&realDate(e.date)&&dateString(e.publishedAt)&&e.editorialReview==='primary_sources_checked'&&Array.isArray(e.stories)&&e.stories.length>=3&&e.stories.length<=5).map(e=>({schemaVersion:1,date:e.date,coverageStart:e.coverageStart,coverageEnd:e.coverageEnd,publishedAt:e.publishedAt,headline:string(e.headline,200),headlineEn:string(e.headlineEn,300),intro:localized(e.intro),editorialReview:'primary_sources_checked',stories:e.stories.map(s=>({id:string(s.id,100),category:CATEGORIES.includes(s.category)?s.category:'society',eventDate:s.eventDate,headline:string(s.headline,200),headlineEn:string(s.headlineEn,300),summary:localized(s.summary),whyItMatters:localized(s.whyItMatters),nextWatch:localized(s.nextWatch),sources:articles(s.sources).map(({title,publisher,url,publishedAt})=>({title,publisher,url,publishedAt}))}))}))};
}
async function defaultLoad(){
  try{
    const response=await fetch(new URL('../public-data.json',import.meta.url),{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw fail('공개 브리핑 파일에 연결하지 못했습니다.',response.status);
    return await response.json();
  }catch(error){
    if(['AbortError','TimeoutError'].includes(error?.name))throw fail('공개 브리핑을 20초 안에 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.',504);
    throw error;
  }
}
function browserStorage(){try{return globalThis.localStorage||null}catch{return null}}

/** Return a request(path, {method, body}) function matching the reader API.
 * loadData receives {force}; storage follows the localStorage interface.
 */
export function createStaticRequest({loadData=defaultLoad,storage=browserStorage(),now=()=>Date.now()}={}){
  let memory=emptyState(),lastRaw,storageProblem=!storage,data,pending,loadFailed=false;
  const iso=()=>new Date(Number(now())).toISOString();
  const storageStatus=()=>({mode:storageProblem?'memory':'local',notice:storageProblem?{ko:'브라우저 저장 공간을 사용할 수 없어 현재 탭에서만 기록을 보관합니다. 닫기 전에 내보내기로 저장해 주세요.',en:'Browser storage is unavailable. Your records last only in this tab; export them before closing.'}:{ko:'관심사와 읽음 기록은 이 브라우저에만 저장됩니다.',en:'Interests and reading history are saved only in this browser.'}});
  function read(){if(storageProblem&&lastRaw!==undefined)return memory;try{if(storage){const raw=storage.getItem(STATIC_STORAGE_KEY);if(raw!==lastRaw){const parsed=raw===null?emptyState():JSON.parse(raw);if(!parsed||parsed.schemaVersion!==1)throw Error('Unknown local data');memory=cleanState(parsed);lastRaw=raw;}}}catch{storageProblem=true;lastRaw=null;}return memory;}
  function save(value){memory=cleanState(value);const raw=JSON.stringify(memory);try{if(!storage)throw Error('Storage unavailable');storage.setItem(STATIC_STORAGE_KEY,raw);lastRaw=raw;storageProblem=false;}catch{storageProblem=true;lastRaw=raw;}}
  async function published(force=false){if(pending)return pending;if(data&&!force)return data;pending=(async()=>{try{data=cleanData(await loadData({force}));loadFailed=false;return data}catch(error){loadFailed=true;if(data)return data;throw error}finally{pending=null}})();return pending;}
  function meta(publication,queryTerms=[]){const elapsed=Number(now())-time(publication.generatedAt),stale=loadFailed||elapsed>36*3600000||elapsed<0;return {mode:stale?'stale-published':'published',fetchedAt:publication.generatedAt,collection:'published-snapshot',persistence:'browser',region:null,refreshSupport:'publication-only',storage:storageStatus(),notice:{ko:'운영자가 발행한 공개 자료를 읽고 있습니다. 새로 확인은 최신 발행본을 가져오며, 실시간 웹 검색을 실행하지 않습니다.',en:'You are reading the published collection. Refresh checks for a new publication; it does not run a live web search.'},...(queryTerms.length?{searchQuery:queryTerms.join(', ')}:{})};}
  function coverage(terms,stories,currentMeta){const matchedKeywords=terms.filter(k=>stories.some(s=>storyMatches(s,k)));return {requestedKeywords:terms,matchedKeywords,missingKeywords:terms.filter(k=>!matchedKeywords.includes(k)),matchedStoryCount:stories.filter(s=>terms.some(k=>storyMatches(s,k))).length,mode:currentMeta.mode,source:'Published public collection',notice:{ko:'발행된 공개 자료의 제목에서 찾은 결과입니다. 결과가 없으면 현재 자료에 일치하는 보도가 없다는 뜻이며, 해당 관심사에 새 소식이 없다는 뜻은 아닙니다. 실시간 웹·커뮤니티 전체를 검색하지 않습니다.',en:'Matches come from titles in the published collection. No match means this collection has no matching reports, not that the topic has no news. This is not a live web or community search.'}};}
  function baseStory(id,personal=memory){return data?.stories.find(s=>s.topicId===id)||personal.bookmarks.find(b=>b.topicId===id)?.snapshot||personal.briefings.flatMap(b=>b.items).find(s=>s.topicId===id)||personal.feedback.find(f=>f.topicId===id)?.snapshot||null;}
  function decorate(raw,personal,{baseline=[],baselineAt=null,personalized=true}={}){
    const p=personal.preferences,active=personalized&&p.personalization!==false,marks=personal.feedback.filter(f=>f.topicId===raw.topicId),matchedKeywords=active?p.keywords.filter(k=>storyMatches(raw,k)):[],followed=personal.bookmarks.some(b=>b.topicId===raw.topicId&&b.kind==='follow'),saved=personal.bookmarks.some(b=>b.topicId===raw.topicId&&b.kind==='save'),read=marks.some(f=>f.kind==='read'&&f.fingerprint===raw.fingerprint),prior=baseline.find(s=>s.topicId===raw.topicId),old=new Set(prior?.articles.map(a=>a.url)||[]),newArticles=prior?raw.articles.filter(a=>!old.has(a.url)&&(!baselineAt||time(a.publishedAt)>=time(baselineAt))):[];
    const change=!baselineAt?{kind:'first',ko:'처음 살펴보는 이야기입니다.',en:'Your first look at this story.',articles:[]}:!prior?{kind:'new',ko:'지난 브리핑에는 없었던 이야기입니다.',en:'New since your previous briefing.',articles:[]}:newArticles.length?{kind:'coverage',ko:`지난번 이후 발행 자료에 보도 ${newArticles.length}건이 더해졌습니다. 새로운 사실인지는 원문을 확인해 주세요.`,en:`${newArticles.length} reports were added to the published collection. Read the originals to check for new facts.`,articles:newArticles.slice(0,3)}:{kind:'unchanged',ko:'지난번과 같은 발행 자료입니다. 다음 발행본에서 후속 보도를 확인할 수 있습니다.',en:'The same published coverage as last time. A later edition may contain follow-up reports.',articles:[]};
    const reason=!active?{ko:'공개된 전체 소식에서 골랐습니다.',en:'Selected from the public collection.'}:followed?{ko:'계속 지켜보기로 한 이야기입니다.',en:'A story you chose to follow.'}:matchedKeywords.length?{ko:`관심 키워드 ‘${matchedKeywords.join(' · ')}’와 연결돼 골랐습니다.`,en:`Matches your keywords: ${matchedKeywords.join(', ')}.`}:p.categories.includes(raw.category)?{ko:'선택한 관심 분야에서 살펴볼 이야기입니다.',en:'From your selected interest categories.'}:{ko:'공개된 소식에서 전체 흐름을 살펴볼 수 있도록 골랐습니다.',en:'Selected to help you catch up on the published news.'};
    return {...copy(raw),change,reason,matchedKeywords,followed,saved,read,useful:marks.some(f=>f.kind==='useful'),hidden:marks.some(f=>f.kind==='hide')};
  }
  function candidates(publication,personal,scope,{personalized=true,baseline=[],baselineAt=null}={}){
    const duration=({day:1,week:7,month:30}[scope.period]||1)*DAY,p=personal.preferences,active=personalized&&p.personalization!==false;
    return publication.stories.filter(s=>!s.region||s.region===scope.region).filter(s=>{const at=time(s.publishedAt);return Number.isFinite(at)&&at<=Number(now())&&at>=Number(now())-duration;}).filter(s=>!p.exclude.some(k=>storyMatches(s,k))).map(s=>decorate(s,personal,{personalized,baseline,baselineAt})).filter(s=>!s.hidden).filter(s=>!active||!p.categories.length&&!p.keywords.length||s.followed||p.categories.includes(s.category)||s.matchedKeywords.length);
  }
  function ranked(stories,personal){
    const active=personal.preferences.personalization!==false;
    const score=s=>(active?(s.followed?48:s.matchedKeywords.length?40:personal.preferences.categories.includes(s.category)?18:0)+(s.read?-45:0)+(s.useful?5:0):0)+(s.evidence==='source-reviewed'?8:0)+Math.max(0,18-Math.max(0,(Number(now())-time(s.publishedAt))/3600000)*.6)+Math.min(s.sourceCount,5)*3+s.rawScore*.2;
    const remaining=[...stories].sort((a,b)=>score(b)-score(a)||a.topicId.localeCompare(b.topicId)),result=[],categories=new Map(),publishers=new Map(),keywords=new Map();
    const adjusted=s=>score(s)-(categories.get(s.category)||0)*16-(publishers.get(s.sources[0])||0)*8-Math.max(0,...s.matchedKeywords.map(k=>keywords.get(k)||0))*12;
    while(remaining.length&&result.length<6){let best=0;for(let i=1;i<remaining.length;i++)if(adjusted(remaining[i])>adjusted(remaining[best]))best=i;const [s]=remaining.splice(best,1);result.push(s);categories.set(s.category,(categories.get(s.category)||0)+1);publishers.set(s.sources[0],(publishers.get(s.sources[0])||0)+1);for(const k of s.matchedKeywords)keywords.set(k,(keywords.get(k)||0)+1);}return [...result,...remaining];
  }
  async function briefing(scope,force=false){
    const publication=await published(force),personal=read(),key=scope.region+':'+scope.period,previous=personal.visits[key],fresh=!previous||Number(now())-time(previous.startedAt)>30*60000,baseline=fresh?previous?.current||[]:previous.baseline||[],baselineAt=(fresh?previous?.currentAt:previous.baselineAt)||null;
    const stories=ranked(candidates(publication,personal,scope,{baseline,baselineAt}),personal),metadata={...meta(publication),...scope},terms=personal.preferences.personalization!==false?personal.preferences.keywords:[];
    if(terms.length)metadata.interestCoverage=coverage(terms,stories,metadata);
    const body={scope:key,generatedAt:iso(),baselineAt,items:stories.slice(0,6),total:stories.length,preferences:copy(personal.preferences),meta:metadata};
    // A failed/stale refresh cannot overwrite the last successful reading baseline.
    if(metadata.mode==='published'&&body.items.length){
      personal.visits[key]={startedAt:fresh?iso():previous.startedAt,currentAt:iso(),baselineAt,baseline,current:body.items};
      const identity=signature([key,body.items.map(s=>[s.topicId,s.fingerprint]),{categories:personal.preferences.categories,keywords:personal.preferences.keywords,exclude:personal.preferences.exclude,personalization:personal.preferences.personalization},kstDate(Number(now()))]);
      const existing=personal.briefings.find(b=>b.fingerprint===identity);body.id=existing?.id||'briefing-'+identity;
      if(!existing)personal.briefings.unshift({...body,id:body.id,fingerprint:identity});personal.briefings=personal.briefings.slice(0,90);save(personal);body.meta.storage=storageStatus();
    }
    return body;
  }
  return async function request(path,{method='GET',body}={}){
    const url=new URL(path,'https://reader.invalid'),route=url.pathname,verb=method.toUpperCase();
    if(!route.startsWith('/api/v2/'))throw fail('공개 사이트는 이 브라우저의 저장 공간을 사용합니다. 서버 계정 기능은 제공하지 않습니다.',404);
    const personal=read(),scope={region:url.searchParams.get('region')==='world'?'world':'korea',period:['day','week','month'].includes(url.searchParams.get('period'))?url.searchParams.get('period'):'day'};
    if(verb==='GET'&&route==='/api/v2/state')return copy({id:'local-browser',user:null,preferences:personal.preferences,bookmarks:personal.bookmarks,feedback:personal.feedback,hidden:personal.feedback.filter(f=>f.kind==='hide').map(f=>({topicId:f.topicId,title:baseStory(f.topicId,personal)?.title||'보관한 이야기'})),storage:storageStatus()});
    if(verb==='PUT'&&route==='/api/v2/preferences'){personal.preferences=prefs(body,personal.preferences);save(personal);return copy({preferences:personal.preferences,storage:storageStatus()});}
    if(verb==='GET'&&route==='/api/v2/daily'){
      const dates=url.searchParams.getAll('date'),date=dates[0];if(dates.length>1||date!==undefined&&!realDate(date))throw fail('날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.');
      const publication=await published(true);if(loadFailed)throw fail('발행본을 다시 확인하지 못했습니다. 이전에 읽던 내용과 기록은 보관되어 있습니다.',503);
      const expectedDate=kstDate(Number(now())-DAY),editions=publication.editions.filter(e=>e.date<=expectedDate&&time(e.publishedAt)<=Number(now())&&time(e.coverageEnd)<=Number(now())).sort((a,b)=>b.date.localeCompare(a.date)),edition=(date?editions.find(e=>e.date===date):editions[0])||null;
      return copy({edition,availableDates:editions.map(e=>e.date),status:edition?edition.date===expectedDate?'current':'stale':'empty',expectedDate});
    }
    if(verb==='GET'&&route==='/api/v2/briefing'||verb==='POST'&&route==='/api/v2/refresh')return briefing(scope,verb==='POST');
    if(verb==='GET'&&route==='/api/v2/explore'){
      const publication=await published(),q=normalize(url.searchParams.get('q')||'').slice(0,100),category=url.searchParams.get('category'),metadata={...meta(publication,q?[q]:[]),...scope};
      let stories=ranked(candidates(publication,personal,scope,{personalized:false}),personal);if(q)stories=stories.filter(s=>storyMatches(s,q));if(category&&category!=='all')stories=stories.filter(s=>s.category===category);
      if(q)metadata.interestCoverage=coverage([q],stories,metadata);const page=Math.max(1,Math.min(100,Math.floor(Number(url.searchParams.get('page'))||1)));
      return {items:stories.slice((page-1)*12,page*12),total:stories.length,page,hasMore:page*12<stories.length,meta:metadata};
    }
    if(verb==='GET'&&route.startsWith('/api/v2/story/')){await published().catch(error=>{if(!personal.bookmarks.length&&!personal.briefings.length&&!personal.feedback.length)throw error});let id;try{id=decodeURIComponent(route.slice('/api/v2/story/'.length))}catch{throw fail('이야기 주소를 확인해 주세요.')}const story=baseStory(id,personal);if(!story)throw fail('발행 자료와 내 보관함에서 이야기를 찾지 못했습니다.',404);return decorate(story,personal);}
    if(verb==='POST'&&route==='/api/v2/action'){
      if(typeof body?.value!=='boolean'||!['save','follow','read','useful','hide'].includes(body?.kind))throw fail('변경할 기록과 상태를 확인해 주세요.');await published().catch(error=>{if(!baseStory(body.topicId,personal))throw error});const story=baseStory(String(body.topicId),personal);if(!story)throw fail('이야기를 찾지 못했습니다.',404);const key=body.kind==='save'||body.kind==='follow'?'bookmarks':'feedback',rows=personal[key],index=rows.findIndex(v=>v.topicId===story.topicId&&v.kind===body.kind);
      if(!body.value){if(index>=0)rows.splice(index,1);}else if(key==='bookmarks'){if(index<0){if(rows.length>=300)throw fail('보관함은 최대 300개입니다.');rows.unshift({topicId:story.topicId,kind:body.kind,snapshot:story,createdAt:iso()});}}else{const mark={topicId:story.topicId,kind:body.kind,fingerprint:story.fingerprint,updatedAt:iso(),snapshot:story};if(index>=0)rows[index]=mark;else rows.unshift(mark);}save(personal);return {story:decorate(story,personal),storage:storageStatus()};
    }
    if(verb==='GET'&&route==='/api/v2/library'){await published().catch(()=>{});return {items:personal.bookmarks.map(b=>{const current=data?.stories.find(s=>s.topicId===b.topicId);return {...copy(b),story:decorate(current||b.snapshot,personal,{baseline:[b.snapshot],baselineAt:b.createdAt}),archived:!current};})};}
    if(verb==='GET'&&route==='/api/v2/history'){const q=(url.searchParams.get('q')||'').toLowerCase();return copy({items:personal.briefings.filter(b=>!q||JSON.stringify(b).toLowerCase().includes(q))});}
    if(verb==='GET'&&route==='/api/v2/export')return copy({schemaVersion:2,exportedAt:iso(),preferences:personal.preferences,bookmarks:personal.bookmarks,feedback:personal.feedback,briefings:personal.briefings});
    if(verb==='POST'&&route==='/api/v2/reset'){if(body?.confirmation!=='DELETE'||!['all','memory'].includes(body?.scope))throw fail('삭제 범위와 확인이 필요합니다.');save(body.scope==='all'?emptyState():{...personal,feedback:[],visits:{},briefings:[]});return {deleted:true,storage:storageStatus()};}
    throw fail('공개 사이트에서 제공하지 않는 기능입니다.',404);
  };
}

export const request=createStaticRequest();
