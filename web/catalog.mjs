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
