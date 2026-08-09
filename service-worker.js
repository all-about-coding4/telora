const CACHE = "telora";

const FILES = [
  "/",
  "/index.html",
  "/manifest.json",

  "/static/style/telora1.css",

  "/static/jscript/helper.js",
  "/static/jscript/user.js",
  "/static/jscript/watchdog.js",
  "/static/jscript/connection.js",
  "/static/jscript/telegram-api.js",

  "/static/icons/telora-icon-192.png",
  "/static/icons/telora-icon-512.png",
  "/static/icons/telora-icon2-192.png"
];

// INSTALL
self.addEventListener("install", event => {

  event.waitUntil((async () => {

    const cache = await caches.open(CACHE);

    await cache.addAll(FILES);

  })());

  self.skipWaiting();

});

// ACTIVATE
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

// FETCH
self.addEventListener("fetch", event => {

  console.log("Request:", event.request.url);

  // HTML page navigation
  if (event.request.mode === "navigate") {

    event.respondWith((async () => {

      const cached =
        await caches.match("/") ||
        await caches.match("/index.html");

      console.log("Navigation cache:", cached);

      if (cached) return cached;

      try {
        return await fetch(event.request);
      } catch (err) {
        return new Response("Offline", {
          status: 503,
          headers: {
            "Content-Type": "text/plain"
          }
        });
      }

    })());

    return;

  }

  // Other assets
  event.respondWith((async () => {

    const cached = await caches.match(event.request);

    if (cached) return cached;

    try {

      return await fetch(event.request);

    } catch (err) {

      return Response.error();

    }

  })());

});

// UPDATE MESSAGE
self.addEventListener("message", event => {

  if (event.data?.type === "UPDATE_APP") {

    event.waitUntil(updateApplication(event.data.versionInfo));

  }

});

// UPDATE CACHE 
async function updateApplication(versionInfo) {

  const cache = await caches.open(CACHE);

  const base = versionInfo.BASE_URL;

  const files = versionInfo.FILES || FILES;

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

// DEBUG (remove later)
(async () => {

  const cache = await caches.open(CACHE);

  const keys = await cache.keys();

  console.log("===== CACHE CONTENTS =====");

  keys.forEach(key => console.log(key.url));

})();
