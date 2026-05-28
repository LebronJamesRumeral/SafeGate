const CACHE_NAME = 'safegate-v2';
const APP_SHELL_FALLBACK = '/';
const urlsToCache = [
  '/',
  '/scan',
  '/students',
  '/analytics',
  '/manifest.json',
  '/SGCDC.png',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, then cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(APP_SHELL_FALLBACK);
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Return from cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

// Background sync for offline attendance recording
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance' || event.tag === 'safegate-sync') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'OFFLINE_SYNC_REQUEST' });
        });
      })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let payload = {
    title: 'SafeGate',
    body: 'New notification',
    href: '/',
    icon: '/SGCDC.png',
    badge: '/SGCDC.png',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (error) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SafeGate', {
      body: payload.body || 'New notification',
      icon: payload.icon || '/SGCDC.png',
      badge: payload.badge || '/SGCDC.png',
      vibrate: [100, 50, 100],
      data: {
        href: payload.href || '/',
      },
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.href || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
