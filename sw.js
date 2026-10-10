const CACHE = "underward-v14";
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

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS).then(() =>
        Promise.allSettled(ICONS.map(url => c.add(url)))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
