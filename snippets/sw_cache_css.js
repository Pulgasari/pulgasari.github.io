const isFetchRequestOfCSS = request => request !== undefined && (request.destination === 'style' || request.url.endsWith('.css'));    


const CACHE_NAME = 'css-cache-v1';
const CSS_ASSETS = [
  '/css/style.css',
  '/css/vendor.css'
];

// 1. Install Event: Pre-cache CSS assets on setup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CSS_ASSETS))
  );
  // Force active service worker takeover without waiting
  self.skipWaiting();
});

// 2. Activate Event: Clean up outdated cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => { if (cache !== CACHE_NAME) return caches.delete(cache); })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Intercept CSS requests and serve from cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (isFetchRequestOfCSS(request)) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        // return cached version if found; otherwise fall back to network
        return cachedResponse || fetch(request).then(networkResponse => {
          // dynamic caching: cache CSS files fetched on-the-fly
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
