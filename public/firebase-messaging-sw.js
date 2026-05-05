/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging service worker for background notifications.
 *
 * This service worker handles:
 *  - Background FCM messages (when app is closed or in background)
 *  - Notification clicks for deep linking to chat conversations
 *  - Token refresh handling
 *
 * IMPORTANT: This file must be served from /public/firebase-messaging-sw.js
 * and registered via getMessaging() in the client code.
 */

importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

// Initialize Firebase with environment variables
firebase.initializeApp({
  apiKey: self.__NEXT_PUBLIC_FIREBASE_API_KEY__,
  authDomain: self.__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__,
  projectId: self.__NEXT_PUBLIC_FIREBASE_PROJECT_ID__,
  storageBucket: self.__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: self.__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__,
  appId: self.__NEXT_PUBLIC_FIREBASE_APP_ID__,
  measurementId: self.__NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID__,
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM] Received background message:", payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/window.svg",
    badge: "/window.svg",
    tag: payload.data?.conversationId || "chat-notification",
    data: {
      conversationId: payload.data?.conversationId,
      click_action: `/chat/${payload.data?.conversationId}`,
    },
    requireInteraction: false,
    silent: false,
  };

  // Show the notification
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM] Notification clicked:", event);

  event.notification.close();

  const conversationId = event.notification.data?.conversationId;

  if (conversationId) {
    // Open or focus the chat page
    const urlToOpen = new URL(`/chat`, self.location.origin);
    urlToOpen.searchParams.set("chatId", conversationId);

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Try to find an existing window that's already open
          for (const client of clientList) {
            if (client.url.includes("/chat") && "focus" in client) {
              return client.focus().then(() => {
                // Send a message to the client to navigate to the specific chat
                client.postMessage({
                  type: "NAVIGATE_TO_CHAT",
                  conversationId,
                });
              });
            }
          }

          // If no existing window, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen.toString());
          }
        })
    );
  } else {
    // Default: open the app
    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow("/");
          }
        })
    );
  }
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("[FCM] Service worker activated");
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener("install", (event) => {
  console.log("[FCM] Service worker installed");
  event.waitUntil(self.skipWaiting());
});
