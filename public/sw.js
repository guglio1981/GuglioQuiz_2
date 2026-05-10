// GuglioQuiz Service Worker for Push Notifications
// Version: 6.0 - Removed notification actions

const SW_VERSION = '6.0';

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  
  // data.data contains the nested data object from the payload
  const notificationData = data.data || {};
  const gameCode = notificationData.gameCode;
  
  const options = {
    body: data.body || 'Nuova notifica da GuglioQuiz',
    icon: '/logo-gq.png',
    badge: '/logo-gq.png',
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || '/',
      gameCode: gameCode
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GuglioQuiz', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Always build URL locally to ensure correct origin
  const notifData = event.notification.data || {};
  const gameCode = notifData.gameCode;
  const baseUrl = self.location.origin;
  
  // Build URL from gameCode - always use current origin
  const url = gameCode ? `${baseUrl}/join/${gameCode}` : baseUrl;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to find an existing window to navigate
      for (let client of clientList) {
        if (client.url === baseUrl || client.url.startsWith(baseUrl)) {
          return client.navigate(url).then(function(client) {
            return client.focus();
          });
        }
      }
      // No existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
