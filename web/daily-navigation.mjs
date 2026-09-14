// Public edition addresses contain only the covered date, never reader state.
export function validEditionDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}
export function dailyHash(date = '') {
  return validEditionDate(date) ? '#today?date=' + date : '#today';
}
export function parseRoute(hash, tabs) {
  const [name, query = ''] = String(hash || '').replace(/^#/, '').split('?');
  const tab = Object.hasOwn(tabs, name) ? name : 'today';
  const date = name === 'today' ? new URLSearchParams(query).get('date') : '';
  return {tab, date: validEditionDate(date) ? date : ''};
}
export function editionNeighbors(dates, current) {
  const sorted = [...new Set((dates || []).filter(validEditionDate))].sort();
  return {previous: sorted.filter(d => d < current).at(-1) || '', next: sorted.find(d => d > current) || ''};
}
export function editionLink(base, date) {
  const url = new URL(base);
  url.search = '';
  url.hash = dailyHash(date);
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
