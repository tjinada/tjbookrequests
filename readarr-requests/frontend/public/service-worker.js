// public/service-worker.js

// V3 UPGRADE DETECTION - Check immediately if V3 is deployed
// This runs on every service worker activation and fetch
const V3_MARKER_URL = '/v3-marker.json';

async function checkForV3Upgrade() {
  try {
    const response = await fetch(V3_MARKER_URL, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.version === 'v3') {
        console.log('[Service Worker] V3 detected! Self-destructing...');
        
        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => {
          console.log('[Service Worker] Deleting cache:', name);
          return caches.delete(name);
        }));
        
        // Unregister this service worker
        await self.registration.unregister();
        
        // Notify all clients to reload
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'V3_UPGRADE', action: 'reload' });
        });
        
        return true; // V3 is active
      }
    }
  } catch (e) {
    // V3 marker not found or error - continue as V2
  }
  return false;
}

// Cache version - change manually when needed
const CACHE_VERSION = 'v1';
// Add a build timestamp that will change with each build - this is replaced by the Dockerfile
const BUILD_TIMESTAMP = new Date().toISOString();
// Add a cache-busting parameter to ensure immediate updates
const CACHE_BUST = Math.random().toString(36).substring(2, 8);
// Combined cache name will be unique for each deployment
const CACHE_NAME = `readarr-requests-${CACHE_VERSION}-${BUILD_TIMESTAMP.substring(0, 19)}-${CACHE_BUST}`;

// App shell files to cache
const appShellFiles = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/badge-72x72.png'
];

// Install event - cache app shell files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  console.log('[Service Worker] Cache version:', CACHE_VERSION, 'Build:', BUILD_TIMESTAMP);
  console.log('[Service Worker] Cache bust:', CACHE_BUST);
  
  event.waitUntil(
    (async () => {
      // Check for V3 first
      const isV3 = await checkForV3Upgrade();
      if (isV3) {
        console.log('[Service Worker] V3 detected during install, aborting V2 installation');
        return;
      }
      
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching App Shell');
      try {
        await cache.addAll(appShellFiles);
      } catch (err) {
        console.error('[Service Worker] Cache addAll error:', err);
      }
    })()
  );
  
  // Skip waiting on initial installation or when explicitly asked
  const skipWaitingParam = new URL(self.location).searchParams.get('skipWaiting');
  if (!self.registration.active || skipWaitingParam === 'true') {
    console.log('[Service Worker] skipWaiting - immediate activation');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    (async () => {
      // Check for V3 first
      const isV3 = await checkForV3Upgrade();
      if (isV3) {
        console.log('[Service Worker] V3 detected during activate, self-destructing');
        return;
      }
      
      const keyList = await caches.keys();
      await Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('readarr-requests-')) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })()
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Check for V3 marker on navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Check for V3 upgrade
        const isV3 = await checkForV3Upgrade();
        if (isV3) {
          // Let the browser handle it normally - V3 is now active
          return fetch(event.request);
        }
        
        // Continue with normal V2 handling
        return handleFetch(event.request);
      })()
    );
    return;
  }
  
  // Skip caching for specific files that should never be cached
  const neverCache = [
    '/service-worker.js',
    '/manifest.json',
    'index.html',
    '/v3-marker.json',
    '/sw.js'
  ];
  
  // Also skip for API calls and other non-GET requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') || 
      neverCache.some(url => event.request.url.includes(url))) {
    // For these special files, always go to network
    return;
  }
  
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const fetchResponse = await fetch(request.clone());
    
    // Don't cache responses if they're not successful
    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
      return fetchResponse;
    }
    
    // Clone the response - one to return, one to cache
    const responseToCache = fetchResponse.clone();
    
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, responseToCache).catch(err => {
      console.error('[Service Worker] Cache put error:', err);
    });
    
    return fetchResponse;
  } catch (err) {
    console.error('[Service Worker] Fetch error:', err);
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Notification received', event);

  let notification = {};

  if (event.data) {
    try {
      notification = event.data.json();
    } catch (e) {
      notification = {
        title: 'New Notification',
        body: event.data.text(),
        icon: '/icon-192x192.png'
      };
    }
  } else {
    notification = {
      title: 'New Notification',
      body: 'No content available',
      icon: '/icon-192x192.png'
    };
  }

  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    data: notification.data || {},
    actions: notification.actions || [],
    vibrate: notification.vibrate || [100, 50, 100],
    tag: notification.tag || 'readarr-notification',
    renotify: notification.renotify !== undefined ? notification.renotify : true
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event);

  event.notification.close();

  // If there was an action click (like "view-book"), handle it
  if (event.action) {
    console.log(`[Service Worker] Notification action clicked: ${event.action}`);
    
    switch (event.action) {
      case 'view-book':
        if (event.notification.data && event.notification.data.url) {
          openUrl(event.notification.data.url);
        }
        break;
      case 'view-requests':
        openUrl('/admin/requests');
        break;
      default:
        console.log(`[Service Worker] Unknown action: ${event.action}`);
    }
  } else {
    // If notification was clicked (not a specific action)
    // Try to open the URL from the notification data if available
    if (event.notification.data && event.notification.data.url) {
      openUrl(event.notification.data.url);
    } else {
      // Default fallback - open app
      openUrl('/');
    }
  }
});

// Add message event handler with improved reliability
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting and activate immediately');
    
    // First notify clients before skipping waiting
    self.clients.matchAll().then(clients => {
      const notifyPromises = clients.map(client => {
        return client.postMessage({ 
          type: 'SERVICE_WORKER_UPDATED',
          timestamp: new Date().toISOString() 
        });
      });
      
      // After notifying, skip waiting
      Promise.all(notifyPromises).then(() => {
        console.log('[Service Worker] All clients notified, now skipping waiting');
        self.skipWaiting();
      });
    });
  }
  
  // Also handle force update requests
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('[Service Worker] Force update requested');
    self.skipWaiting();
    
    // Clear all caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[Service Worker] Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    });
  }
});

// Helper function to open a URL
function openUrl(url) {
  // Check for existing open windows and focus one if possible
  const urlToOpen = new URL(url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        // If so, focus it
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
}
