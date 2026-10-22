// Offline cache. Bump CACHE_VERSION when files change.

const CACHE_VERSION = "loc-converter-v2";

const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "assets/images/log.jpg",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/sounds/sndConvert.mp3",
  "assets/sounds/sndLogin.mp3",
  "assets/fonts/whitrabt.ttf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete caches from older versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
