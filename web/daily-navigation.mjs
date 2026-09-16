import {CATEGORIES} from './catalog.mjs';
// Public edition addresses contain only the covered date, never reader state.
export function expectedReaderDate(now=Date.now()) {
  return new Date(now-15*3600000).toISOString().slice(0,10);
}
export function editionIndex(editions) {
  return (editions||[]).filter(e=>validEditionDate(e.date)).map(e=>({date:e.date,headline:e.headline,headlineEn:e.headlineEn||'',topics:(e.stories||[]).map(s=>({headline:s.headline,headlineEn:s.headlineEn||'',category:s.category}))}));
}
export function searchEditions(index,query='') {
  const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().trim();
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  return (index||[]).filter(e=>{
    const text=normalize([e.date,e.headline,e.headlineEn,...(e.topics||[]).flatMap(s=>[s.headline,s.headlineEn,...(CATEGORIES[s.category]||[s.category])])].join(' '));
    return terms.every(term=>text.includes(term));
  });
}
export function validEditionDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}
export function validDailyStory(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
}
export function dailyHash(date = '', story = '') {
  return validEditionDate(date) ? '#today?date=' + date + (validDailyStory(story) ? '&story=' + story : '') : '#today';
}
export function parseRoute(hash, tabs) {
  const [name, query = ''] = String(hash || '').replace(/^#/, '').split('?');
  const tab = Object.hasOwn(tabs, name) ? name : 'today';
  const date = name === 'today' ? new URLSearchParams(query).get('date') : '';
  const story = name === 'today' ? new URLSearchParams(query).get('story') : '';
  return {tab, date: validEditionDate(date) ? date : '', ...(validEditionDate(date) && validDailyStory(story) ? {story} : {})};
}
export function editionNeighbors(dates, current) {
  const sorted = [...new Set((dates || []).filter(validEditionDate))].sort();
  return {previous: sorted.filter(d => d < current).at(-1) || '', next: sorted.find(d => d > current) || ''};
}
export function editionLink(base, date, story = '') {
  const url = new URL(base);
  url.search = '';
  url.hash = dailyHash(date, story);
  return url.href;
}

export function sourceDateLabel(value, locale = 'ko') {
  const english = locale === 'en';
  if (!value) return english ? 'Publication date unavailable' : '발표일 확인 전';
  // A calendar date has no timezone. Do not invent a Korean publication time.
  if (validEditionDate(value)) return value + (english ? ' · source date' : ' · 원문 표기일');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return english ? 'Publication date unavailable' : '발표일 확인 전';
  return new Intl.DateTimeFormat(english ? 'en-US' : 'ko-KR', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date) + ' KST';
}
