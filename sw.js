// Mutation Lab service worker — offline-capable PWA shell.
// Strategy: precache the entry shell, then stale-while-revalidate every same-origin
// GET (so the game launches instantly and works offline, while quietly updating in
// the background). Bump CACHE to force-refresh all clients after a release.
const CACHE = "mlab-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles/style.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./vendor/three.module.js",
  "./src/main.js",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached); // offline: fall back to cache
      return cached || network;
    })
  );
});
