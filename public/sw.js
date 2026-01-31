/**
 * Optimio Service Worker
 * Handles caching, offline support, and background sync
 */

const CACHE_NAME = 'optimio-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/todos',
  '/goals',
  '/notes',
  '/settings'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Google API requests (always go to network)
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('google.com')) {
    return;
  }
  
  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Static assets - cache first, network fallback
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // HTML navigation - network first (for SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Default - stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        }
      })
      .catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Network fetch failed:', error);
      throw error;
    });
  
  return cachedResponse || fetchPromise;
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json'
  ];
  
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// Background Sync for offline mutations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-events') {
    event.waitUntil(syncPendingEvents());
  }
});

// Sync pending events from IndexedDB
async function syncPendingEvents() {
  // This will be called when connectivity is restored
  // The actual implementation would read from IndexedDB and sync
  console.log('[SW] Syncing pending events...');
  
  // Notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      timestamp: Date.now()
    });
  });
}

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data;
  let targetUrl = '/';
  
  if (notificationData?.url) {
    targetUrl = notificationData.url;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
