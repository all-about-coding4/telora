import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDk4nh6rg21fb6SQHzWheZbLV37VsnjKRg",
  authDomain: "lyknup-ff9e5.firebaseapp.com",
  projectId: "lyknup-ff9e5",
  storageBucket: "lyknup-ff9e5.appspot.com",
  messagingSenderId: "216249761131",
  appId: "1:216249761131:web:50d4f11971920ae024602e",
};

const vapidKey = "BMZhuiuzbEytm8MGdjM2k52gGaLmU6x12zqyrNId4xaLbupgDDOZiLEmlhkhDlyyBnXBtoBgMWqxJp54w-yPcT8";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

let swRegister = null;

// 🔥 Retry token fetch
async function getFCMToken(registration, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration
      });
    } catch (err) {
      console.log(err);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

window.getFCMToken = getFCMToken;

// 🔥 Foreground messages (VERY IMPORTANT)
onMessage(messaging, (payload) => {
  console.log("Foreground message:", payload);
  
  if(swRegister){
    swRegister.showNotification(
        payload.notification?.title || payload.data?.title || "Notification",
        {
          body: payload.notification?.body || payload.data?.body || "",
          icon: "/static/icons/icon-192.png",
          badge: "/static/icons/badge.png", // ✅ NOW WORKS
          data: {
            url: payload.data?.url || "/"
          }
        }
      );
  } else {
    navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg) {
      reg.showNotification(
        payload.notification?.title || payload.data?.title || "Notification",
        {
          body: payload.notification?.body || payload.data?.body || "",
          icon: "/static/icons/icon-192.png",
          badge: "/static/icons/badge.png", // ✅ NOW WORKS
          tag: "lynkUp",
          renotify: true,
          data: {
            url: payload.data?.url || "/"
          }
        }
      );
    }
  });
}
});

console.log("Notification support:", "Notification" in window);
console.log("Permission:", Notification.permission);
