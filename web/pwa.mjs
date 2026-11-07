// Installable app shell for the public site only. The local operator server is unaffected.
const isPublic=document.querySelector('meta[name="pulse-mode"]')?.content==='public';
if(isPublic&&'serviceWorker' in navigator){
  addEventListener('load',()=>{navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname}).catch(()=>{});});
}
let deferred=null;
const english=()=>document.documentElement.lang==='en';
function button(){
  let b=document.getElementById('install-app');
  if(!b){const actions=document.querySelector('.header-actions');if(!actions)return null;b=document.createElement('button');b.id='install-app';b.className='quiet';b.type='button';actions.prepend(b);
    b.addEventListener('click',async()=>{if(!deferred)return;deferred.prompt();try{await deferred.userChoice;}catch{}deferred=null;b.hidden=true;});}
  b.textContent=english()?'Install app':'앱 설치';return b;
}
addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;const b=button();if(b)b.hidden=false;});
addEventListener('appinstalled',()=>{deferred=null;const b=document.getElementById('install-app');if(b)b.hidden=true;});
