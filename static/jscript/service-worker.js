const CACHE = "telora-v0.0.2";

const FILES = [
  "./",
  "./index.html",
  "./static/jsons/manifest.json",
  
  "./static/style/telora1.css",

  "./static/jscript/helper.js",

  "./static/jscript/user.js",
  "./static/jscript/watchdog.js",
  
  "./static/icons/telora-icon-192.png",
  "./static/icons/telora-icon-512.png",
  "./static/icons/telora-icon2-192.png"
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