

const CACHE = "telora";

const FILES = [
  "/",
  "/index.html",
  "/manifest.json",

  "/static/style/telora1.css",

  "/static/jscript/helper.js",
  "/static/jscript/user.js",
  "/static/jscript/watchdog.js",

  "/static/icons/telora-icon-192.png",
  "/static/icons/telora-icon-512.png"
  "/static/icons/telora-icon2-192.png"
];

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );

  self.skipWaiting();

});

self.addEventListener("activate", event => {

  event.waitUntil((async () => {

    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

  })());

});

self.addEventListener("fetch", event => {
  console.log("Request:", event.request.url);

  (async () => {
  const cache = await caches.open("telora");
  const keys = await cache.keys();

  keys.forEach(k => console.log(k.url));
})();

  if (event.request.mode === "navigate") {

    event.respondWith((async () => {

      const cached = await caches.match("./index.html");
      console.log("Navigation cache:", cached);

      if (cached) return cached;

      return fetch(event.request);

    })());

    return;
  }
  

  event.respondWith((async () => {

    const cached = await caches.match(event.request);

    if (cached) return cached;

    return fetch(event.request);

  })());

});

self.addEventListener("message", event => {

  if (event.data.type === "UPDATE_APP") {

    event.waitUntil(updateApplication(event.data.versionInfo));

  }

});

async function updateApplication(versionInfo) {

  const cache = await caches.open(CACHE);

  const base = versionInfo.base;

  const files = versionInfo.files || FILES;

  for (const file of files) {

    const response = await fetch(base + file, {
      cache: "no-store"
    });

    if (!response.ok) {

      throw new Error("Failed: " + file);

    }

    await cache.put(file, response.clone());

  }

  const clients = await self.clients.matchAll();

  clients.forEach(client => {

    client.postMessage({
      type: "UPDATE_COMPLETE",
      version: versionInfo.version
    });

  });

}


