// Pulse Radar service worker. Network first so a new publication always wins;
// the last successful copy is kept for offline reading. Same-origin GET only:
// requests to a visitor's own AI provider are never intercepted or cached.
const CACHE='pulse-radar-c52e8920de5e';
const SHELL=['./','./index.html','./public-data.json','./web/app.mjs','./web/views.mjs','./web/api.mjs','./web/access.mjs','./web/catalog.mjs','./web/daily-navigation.mjs','./web/static-store.mjs','./web/personal-ai.mjs','./web/pwa.mjs','./web/styles.css','./web/home-radar.css','./web/personal-ai.css','./web/mark.svg','./web/manifest.webmanifest','./web/icon-192.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(SHELL.map(url=>cache.add(new Request(url,{cache:'reload'}))))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pulse-radar-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=request.mode==='navigate'?'./index.html':request;
    try{const response=await fetch(request);if(response.ok&&response.type==='basic')cache.put(key,response.clone());return response;}
    catch(error){const cached=await cache.match(key,{ignoreSearch:request.mode==='navigate'});if(cached)return cached;throw error;}
  })());
});
