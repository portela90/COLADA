// Service worker de la app de limpieza: guarda la app para abrirla sin conexión, recibe los avisos y abre la app al tocarlos.
const CACHE = "limp-app-v4";
const BASE = ["limpieza.html", "errlog.js", "offline.js", "graficos.js", "limpieza.webmanifest", "limp-180.png", "limp-192.png", "limp-512.png", "limp-badge.png",
  "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/inter-latin-700-normal.woff2"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k.startsWith("limp-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const esDatos = u => /supabase\.co$/.test(u.hostname);
const esLib = u => /(^|\.)jsdelivr\.net$|(^|\.)cdnjs\.cloudflare\.com$|(^|\.)unpkg\.com$|fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (esDatos(u)) return;
  const mismo = u.origin === self.location.origin;
  if (!mismo && !esLib(u)) return;
  const pagina = r.mode === "navigate" || (mismo && /\.html?$/.test(u.pathname)) || (mismo && /\.js$/.test(u.pathname)); // páginas y scripts propios: siempre la versión nueva si hay red
  if (pagina) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(new Request(u.origin + u.pathname), cp)); }
      return res;
    }).catch(() => caches.match(new Request(u.origin + u.pathname)).then(x => x || caches.match(r, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(r).then(x => {
    const red = fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => x);
    return x || red;
  }));
});
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{};}catch(_){d={titulo:"Limpieza CIE",texto:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.titulo||"Limpieza CIE",{body:d.texto||"",icon:"limp-192.png",badge:"limp-badge.png",tag:d.tag||undefined,renotify:!!d.tag,data:{url:d.url||"limpieza.html"},vibrate:[200,100,200]}));});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||"limpieza.html",self.registration.scope).href;
  const pag=new URL(url).pathname;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(L=>{
    for(const c of L){if(new URL(c.url).pathname===pag&&"focus" in c){if(url!==c.url.split("#")[0]&&"navigate" in c)return c.navigate(url).then(w=>(w||c).focus());c.postMessage({tipo:"recargar"});return c.focus();}}
    for(const c of L){if("navigate" in c&&"focus" in c)return c.navigate(url).then(w=>(w||c).focus()).catch(()=>self.clients.openWindow(url));}
    return self.clients.openWindow(url);}));});
