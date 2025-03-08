// public/service-worker.js

// Cache version - change this on each deployment
const CACHE_VERSION = 'v1';
// Add a build timestamp that will change with each build
const BUILD_TIMESTAMP = new Date().toISOString();
// Combined cache name will be unique for each deployment
const CACHE_NAME = `readarr-requests-${CACHE_VERSION}-${BUILD_TIMESTAMP.substring(0, 10)}`;

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
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(appShellFiles);
    })
  );
  
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('readarr-requests-')) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip for API calls and other non-GET requests
  if (!event.request.url.includes('/api/') && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          // Don't cache responses if they're not successful
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // Clone the response - one to return, one to cache
          const responseToCache = fetchResponse.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return fetchResponse;
        });
      })
    );
  }
});

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

// Add message event handler for SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting and activate immediately');
    self.skipWaiting();
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