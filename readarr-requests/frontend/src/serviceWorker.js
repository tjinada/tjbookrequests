// src/serviceWorker.js
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

// Store registration globally for access from other components
let registration = null;

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      return;
    }

    window.addEventListener('load', () => {
      // Add timestamp to force cache busting of the service worker itself
      const timestamp = new Date().getTime();
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js?v=${timestamp}`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('This web app is being served cache-first by a service worker.');
        });
      } else {
        // Register service worker
        registerValidSW(swUrl, config);
      }

      // Set up periodic checks for updates (every 15 minutes)
      setInterval(() => {
        console.log('Checking for service worker updates...');
        if (registration) {
          registration.update().then(() => {
            console.log('Service worker update check completed');
          }).catch(error => {
            console.error('Error checking for service worker updates:', error);
          });
        }
      }, 15 * 60 * 1000);
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(reg => {
      registration = reg; // Store registration globally
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('New content is available and will be used when all tabs for this page are closed.');
              
              // Dispatch an event that our components can listen for
              const updateEvent = new CustomEvent('serviceWorkerUpdate', { 
                detail: { registration: registration }
              });
              window.dispatchEvent(updateEvent);
              
              // Execute callback if provided
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              console.log('Content is cached for offline use.');
              
              // Execute callback if provided
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

// Get the current registration if available
export function getRegistration() {
  return registration;
}

// Force update and refresh
export function updateAndRefresh() {
  if (registration && registration.waiting) {
    // Send message to waiting service worker to skipWaiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Once the service worker is activated, reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('New service worker activated, reloading page');
        window.location.reload();
      }
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}