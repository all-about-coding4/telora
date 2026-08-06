const CACHE = "telora-v0.0.5";

const FILES = [
  "../../",
  "../../index.html",
  "../jsons/manifest.json",
  
  "../style/telora1.css",

  "./helper.js",

  "./user.js",
  "./watchdog.js",
  
  "../icons/telora-icon-192.png",
  "../icons/telora-icon-512.png",
  "../icons/telora-icon2-192.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});