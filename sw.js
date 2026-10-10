const CACHE = "underward-v16";
const ASSETS = [
 "./",
 "./index.html",
 "./manifest.webmanifest",
 "./js/config.js",
 "./js/save.js",
 "./js/attrs.js",
 "./js/items.js",
 "./js/sprites.js",
 "./js/monsters.js",
 "./js/state.js",
 "./js/levels.js",
 "./js/traits.js",
 "./js/combat.js",
 "./js/log.js",
 "./js/render.js",
 "./js/pathfind.js",
 "./js/input.js",
 "./js/ui.js",
 "./js/main.js"
];

const ICONS = [
 "./icons/icon-192.png",
 "./icons/icon-512.png"
];

function isIcon(url) {
 return url.pathname.includes("/icons/");
}

// ── Install: precache the shell (best effort) ──────────────
self.addEventListener("install", e => {
 e.waitUntil(
  caches.open(CACHE).then(c =>
   c.addAll(ASSETS).then(() =>
    Promise.allSettled(ICONS.map(u => c.add(u)))
   )
  ).then(() => self.skipWaiting())
 );
});

// ── Activate: wipe old version caches ──────────────────────
self.addEventListener("activate", e => {
 e.waitUntil(
  caches.keys().then(keys =>
   Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim())
 );
});

// ── Fetch strategies ───────────────────────────────────────
self.addEventListener("fetch", e => {
 const req = e.request;
 const url = new URL(req.url);

 // Only handle same-origin GET requests
 if(req.method !== "GET" || url.origin !== self.location.origin) return;

 // Icons: cache-first (rarely change, launch instantly offline)
 if(isIcon(url)){
  e.respondWith(
   caches.match(req).then(r => r || fetchAndStore(req))
  );
  return;
 }

 // Everything else (HTML + JS + manifest): NETWORK-FIRST
 // → always get the latest code, fall back to cache when offline
 e.respondWith(
  fetch(req, { cache: "no-cache" })
   .then(res => {
    // Silently update the cache in the background
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
    return res;
   })
   .catch(() => caches.match(req))
 );
});

function fetchAndStore(request){
 return fetch(request).then(res => {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(request, copy));
  return res;
 });
}
