// sw.js (New Version)

const CACHE_NAME = 'v2-cache';

// 1. Install event: Force immediate takeover
self.addEventListener('install', (event) => {
  // Activate this new version immediately without waiting for tabs to close
  self.skipWaiting();
});

// 2. Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open client tabs immediately
      return self.clients.claim();
    })
  );
});
