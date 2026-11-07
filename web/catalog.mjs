// Shared reader vocabulary. This module contains no server or account data.
export const REGIONS=Object.freeze({
  korea:['대한민국','Korea'],japan:['일본','Japan'],china:['중국','China'],
  europe:['유럽','Europe'],us:['미국','United States'],world:['전세계','Worldwide']
});
export const REGION_KEYS=Object.freeze(Object.keys(REGIONS));
export const REGION_SCOPES=Object.freeze({
  korea:['한국어로 발행된 국내 뉴스 중심','Korean-language coverage'],
  japan:['일본 뉴스와 일본어 원문 중심','Japanese news and original Japanese reports'],
  china:['중국 관련 뉴스와 중국어 원문 중심','China-related news and original Chinese reports'],
  europe:['영국·독일·프랑스 보도 중심','Coverage from the UK, Germany and France'],
  us:['미국 뉴스와 영어 원문 중심','US news and original English reports'],
  world:['여러 지역의 주요 보도를 함께 살펴봅니다','A selection of major reports across regions']
});
export const CATEGORIES=Object.freeze({
  finance:['경제·금융','Economy'],technology:['산업·기술','Technology'],policy:['정책','Policy'],
  society:['사회','Society'],world:['세계','World'],science:['과학·환경','Science'],
  culture:['문화','Culture'],subculture:['서브컬처','Subculture'],sports:['스포츠','Sports']
});
export const CATEGORY_KEYS=Object.freeze(Object.keys(CATEGORIES));

// Popular interests collected every day by keyword search, so a visitor's
// interests have matching public reports even when they are not top headlines.
// Shown as suggestion chips in settings. Region = the Google News edition used.
export const INTEREST_PACKS=Object.freeze([
  ['finance',[['코스피','korea'],['비트코인','korea'],['부동산','korea'],['금리','korea'],['환율','korea'],['엔비디아','korea'],['테슬라','korea'],['삼성전자','korea']]],
  ['technology',[['인공지능','korea'],['반도체','korea'],['스마트폰','korea'],['전기차','korea'],['우주','korea']]],
  ['policy',[['청약','korea'],['전세사기','korea'],['최저임금','korea'],['국민연금','korea'],['교육','korea']]],
  ['society',[['날씨','korea'],['미세먼지','korea'],['저출생','korea'],['의료','korea']]],
  ['culture',[['K팝','korea'],['넷플릭스','korea'],['영화','korea'],['드라마','korea'],['여행','korea']]],
  ['subculture',[['애니메이션','korea'],['웹툰','korea'],['버튜버','korea'],['닌텐도','korea'],['리그 오브 레전드','korea'],['원신','korea'],['블루 아카이브','korea'],['プロセカ','japan']]],
  ['sports',[['프로야구','korea'],['손흥민','korea'],['이강인','korea'],['K리그','korea'],['NBA','korea'],['e스포츠','korea']]],
  ['world',[['미국 대선','korea'],['중국 경제','korea'],['일본','korea'],['우크라이나','korea'],['중동','korea']]]
].map(([category,terms])=>Object.freeze({category,terms:Object.freeze(terms.map(([term,region])=>Object.freeze({term,region})))})));
