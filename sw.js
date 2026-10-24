// Service worker de Almacén, Coladas e Inicio: guarda la app en el móvil para que abra sin conexión.
// - Páginas: primero la red (siempre la versión nueva); si no hay red, la copia guardada.
// - Letras, iconos y librerías: la copia guardada (y se actualiza por detrás).
// - Los datos (Supabase) no pasan por aquí: los guarda offline.js.
const CACHE = "mapri-app-v5";
const BASE = [
  "./", "index.html", "almacen.html", "inicio.html", "errlog.js", "offline.js", "graficos.js", "manifest.json",
  "icon-180.png", "icon-192.png", "icon-512.png",
  "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/inter-latin-700-normal.woff2",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k.startsWith("mapri-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const esDatos = u => /supabase\.co$/.test(u.hostname) || /\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\/|\/functions\/v1\/|\/realtime\//.test(u.pathname);
const esLib = u => /(^|\.)jsdelivr\.net$|(^|\.)cdnjs\.cloudflare\.com$|(^|\.)unpkg\.com$|fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (esDatos(u)) return;
  const mismo = u.origin === self.location.origin;
  if (!mismo && !esLib(u)) return;
  const pagina = r.mode === "navigate" || (mismo && /\.html?$|\/$/.test(u.pathname)) || (mismo && /\.js$/.test(u.pathname)); // páginas y scripts propios: siempre la versión nueva si hay red
  if (pagina) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(new Request(u.origin + u.pathname), cp)); }
      return res;
    }).catch(() => caches.match(new Request(u.origin + u.pathname)).then(x => x || caches.match(r, { ignoreSearch: true }))
      .then(x => x || (r.mode !== "navigate" ? Response.error() : new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font:16px system-ui;padding:24px'><h2>Sin conexión</h2><p>Esta página todavía no se había abierto en este móvil. Ábrela una vez con conexión y luego funcionará sin red.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } })))));
    return;
  }
  e.respondWith(caches.match(r).then(x => {
    const red = fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => x);
    return x || red;
  }));
});
