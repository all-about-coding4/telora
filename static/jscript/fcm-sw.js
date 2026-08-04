importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

console.log("🔥 FCM Service Worker Loaded");

firebase.initializeApp({
  apiKey: "AIzaSyDk4nh6rg21fb6SQHzWheZbLV37VsnjKRg",
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

// Background messages
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
    renotify: true,
    requireInteraction: true,
    data: {
      url: (payload.data && payload.data.url) || "/"
    }
  });
});

// Click handler
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