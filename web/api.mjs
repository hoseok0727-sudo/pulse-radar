export const isPublicSite=typeof document!=='undefined'&&document.querySelector('meta[name="pulse-mode"]')?.content==='public';
let staticRequest;
export async function request(path,{method='GET',body,signal}={}) {
  if(isPublicSite){staticRequest ||= import('./static-store.mjs').then(module=>module.createStaticRequest());return (await staticRequest)(path,{method,body,signal});}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try {const response=await fetch(path,{method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),credentials:'same-origin',signal:signal||controller.signal});const data=await response.json();if(!response.ok){const e=new Error(data.error||'요청을 처리하지 못했습니다.');e.status=response.status;e.code=data.code;throw e}return data;
  }catch(e){if(e.name==='AbortError')throw new Error('응답이 늦어지고 있습니다. 잠시 뒤 다시 시도해 주세요.');throw e}finally{clearTimeout(timer)}
}
export function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
