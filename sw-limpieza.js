// Service worker de la app de limpieza: recibe los avisos y abre la app al tocarlos.
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{};}catch(_){d={titulo:"Limpieza CIE",texto:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.titulo||"Limpieza CIE",{body:d.texto||"",icon:"limp-192.png",badge:"limp-badge.png",tag:d.tag||undefined,renotify:!!d.tag,data:{url:d.url||"limpieza.html"},vibrate:[200,100,200]}));});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||"limpieza.html",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(L=>{for(const c of L){if(c.url.includes("limpieza.html")&&"focus" in c){c.postMessage({tipo:"recargar"});return c.focus();}}return self.clients.openWindow(url);}));});
