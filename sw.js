/* AURA PWA Service Worker */
const CACHE_NAME = 'aura-3.0-cache-v1';
const ASSETS = [
  './',
  './AURA_3.0_pwa_ios_audio.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache same-origin only
        try{
          const url = new URL(req.url);
          if (url.origin === self.location.origin){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
        }catch(e){}
        return res;
      }).catch(()=> caches.match('./AURA_3.0_pwa_ios_audio.html'));
    })
  );
});
