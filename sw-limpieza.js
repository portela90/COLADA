// Service worker de la app de limpieza: recibe los avisos y abre la app al tocarlos.
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{};}catch(_){d={titulo:"Limpieza CIE",texto:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.titulo||"Limpieza CIE",{body:d.texto||"",icon:"limp-192.png",badge:"limp-badge.png",tag:d.tag||undefined,renotify:!!d.tag,data:{url:d.url||"limpieza.html"},vibrate:[200,100,200]}));});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||"limpieza.html",self.registration.scope).href;
  const pag=new URL(url).pathname;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(L=>{
    for(const c of L){if(new URL(c.url).pathname===pag&&"focus" in c){if(url!==c.url.split("#")[0]&&"navigate" in c)return c.navigate(url).then(w=>(w||c).focus());c.postMessage({tipo:"recargar"});return c.focus();}}
    for(const c of L){if("navigate" in c&&"focus" in c)return c.navigate(url).then(w=>(w||c).focus()).catch(()=>self.clients.openWindow(url));}
    return self.clients.openWindow(url);}));});
