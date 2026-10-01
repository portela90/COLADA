// Service worker mínimo: permite instalar la app; siempre va a la red (los datos son en vivo).
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});
