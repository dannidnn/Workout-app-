// FORGE service worker: precache the app shell, then serve cache-first and refresh in the background.
const CACHE_VERSION = 'forge-cache-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => { if (res && res.status === 200) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (cached) { event.waitUntil(refresh); return cached; }
      const fresh = await refresh;
      return fresh || (await cache.match('./index.html')) || Response.error();
    })
  );
});
