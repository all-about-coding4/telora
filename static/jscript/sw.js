// ------------------------------
// Combined Service Worker (PWA + FCM)
// ------------------------------

// 1. Import Firebase scripts (compat version for service worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

console.log("🔥 Combined Service Worker loaded");

// 2. Firebase config
firebase.initializeApp({
  apiKey: "",
  authDomain: "lyknup-ff9e5.firebaseapp.com",
  projectId: "lyknup-ff9e5",
  storageBucket: "lyknup-ff9e5.appspot.com",
  messagingSenderId: "216249761131",
  appId: "1:216249761131:web:50d4f11971920ae024602e"
});

let messaging;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.error("Messaging init failed:", e);
}

// 3. FCM Background Message Handler
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log("Background message:", payload);

    const title = (payload.notification && payload.notification.title) ||
                  (payload.data && payload.data.title) ||
                  "Notification";

    const body = (payload.notification && payload.notification.body) ||
                 (payload.data && payload.data.body) ||
                 "";

    self.registration.showNotification(title, {
      body: body,
      icon: "/static/icons/icon-192.png",
      badge: "/static/icons/badge.png",
      requireInteraction: true,
      data: {
        url: (payload.data && payload.data.url) || "/"
      }
    });
  });
}

// 4. Notification click handler (handles both FCM and custom notifications)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// 5. PWA Caching
const CACHE_NAME = "pwa-cache-v2.2"; // bump version when you change files
const FILES_TO_CACHE = [
  "/",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/badge.png" // cache the whole static folder
]; 
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .catch(err => console.error("Cache addAll failed:", err))
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found, else fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, maybe fallback to offline page
        // but we don't have one, so just return an error
        return new Response("Offline", { status: 503 });
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // take control of all clients immediately
});