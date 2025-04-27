// src/utils/pwaRecovery.js

/**
 * Force updates the PWA by unregistering service workers, clearing caches,
 * and reloading the page. This is a last resort recovery mechanism for
 * white screens or service worker issues.
 */
export function forceUpdatePWA() {
  return new Promise((resolve, reject) => {
    console.log('[PWA Recovery] Starting force update process...');
    
    // Try to communicate with service worker first (more graceful)
    const tryMessageServiceWorker = () => {
      if (!('serviceWorker' in navigator)) {
        return Promise.resolve(false);
      }
      
      return navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration && registration.active) {
            // First try to send a force update message
            console.log('[PWA Recovery] Sending FORCE_UPDATE message to service worker');
            registration.active.postMessage({ type: 'FORCE_UPDATE' });
            return true;
          }
          return false;
        })
        .catch(err => {
          console.warn('[PWA Recovery] Error messaging service worker:', err);
          return false;
        });
    };
    
    const unregisterServiceWorkers = () => {
      if (!('serviceWorker' in navigator)) {
        console.log('[PWA Recovery] Service worker not supported');
        return Promise.resolve();
      }
      
      return navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          const unregistrations = registrations.map(registration => {
            console.log('[PWA Recovery] Unregistering service worker');
            return registration.unregister();
          });
          return Promise.all(unregistrations);
        });
    };
    
    const clearCaches = () => {
      if (!('caches' in window)) {
        console.log('[PWA Recovery] Cache API not supported');
        return Promise.resolve();
      }
      
      return caches.keys()
        .then(cacheNames => {
          const deletions = cacheNames.map(cacheName => {
            console.log('[PWA Recovery] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          });
          return Promise.all(deletions);
        });
    };
    
    const clearLocalStorage = () => {
      // Clear just the update-related flags
      localStorage.removeItem('update_notification_shown');
      localStorage.removeItem('last_update_check');
      return Promise.resolve();
    };
    
    // Execute recovery steps in sequence
    tryMessageServiceWorker()
      .then(messagedSuccessfully => {
        // If we successfully messaged the service worker, we can proceed more gracefully
        if (messagedSuccessfully) {
          console.log('[PWA Recovery] Service worker notified, waiting brief period before continuing');
          // Wait a brief period to allow service worker to process message
          return new Promise(resolve => setTimeout(resolve, 500));
        }
        return Promise.resolve();
      })
      .then(() => clearLocalStorage())
      .then(() => clearCaches())
      .then(() => unregisterServiceWorkers())
      .then(() => {
        console.log('[PWA Recovery] Recovery completed, reloading page...');
        
        // More comprehensive cache busting
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        
        // Create URL with cache busting parameters
        const url = new URL(window.location.href);
        url.searchParams.set('recovery', `${timestamp}-${random}`);
        url.searchParams.set('ts', timestamp);
        
        // For service worker, explicitly request skipWaiting
        url.searchParams.set('skipWaiting', 'true');
        
        window.location.href = url.toString();
        
        resolve(true);
      })
      .catch(error => {
        console.error('[PWA Recovery] Error during recovery:', error);
        reject(error);
      });
  });
}

/**
 * Checks if the app is experiencing a white screen or loading issue
 * by verifying the presence of rendered content.
 */
export function detectWhiteScreen() {
  return new Promise((resolve) => {
    // Check if content is already rendered
    if (document.getElementById('root')?.childElementCount > 0) {
      resolve(false); // Not a white screen
      return;
    }
    
    // Set timeout to check if content loads within timeout period
    const timeout = setTimeout(() => {
      const isWhiteScreen = !document.getElementById('root') || 
                            document.getElementById('root').childElementCount === 0;
      
      resolve(isWhiteScreen);
    }, 3000); // Wait 3 seconds
    
    // Cancel check if content is loaded before timeout
    const observer = new MutationObserver((mutations) => {
      if (document.getElementById('root')?.childElementCount > 0) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(false); // Not a white screen
      }
    });
    
    // Start observing DOM changes
    observer.observe(document.getElementById('root') || document.body, { 
      childList: true,
      subtree: true
    });
  });
}

/**
 * Creates and displays a recovery button on the screen.
 * This is used as a last resort if automatic recovery fails.
 */
export function showRecoveryButton() {
  // Only create the button if it doesn't already exist
  if (document.getElementById('pwa-recovery-button')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'pwa-recovery-button';
  button.innerText = 'Repair Application';
  button.style.position = 'fixed';
  button.style.top = '50%';
  button.style.left = '50%';
  button.style.transform = 'translate(-50%, -50%)';
  button.style.zIndex = '999999';
  button.style.padding = '12px 20px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.fontSize = '16px';
  button.style.fontWeight = 'bold';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  
  button.onclick = () => {
    button.disabled = true;
    button.innerText = 'Repairing...';
    forceUpdatePWA();
  };
  
  document.body.appendChild(button);
}
