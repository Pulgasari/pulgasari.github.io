/*
/framework/
├── framework-client.js   (Läuft im Tab: Compiler, Cache-Writer & SW-Registration)
└── framework-sw.js       (Läuft im SW: Caching- & Fetch-Intercept-Logik)
*/

// :::::: framework-sw.js
// Framework Service Worker Module (Framework-internal logic)

const FRAMEWORK_CACHE = 'framework-compiled-cache-v1';

// 1. Intercept requests for custom .bla.css files
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('.bla.css')) {
    event.respondWith(
      caches.open(FRAMEWORK_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

// 2. Listen for re-compilation events from main thread and broadcast to all tabs
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'CSS_RECOMPILED') {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: 'HOT_RELOAD_CSS',
        url: event.data.url
      });
    }
  }
});

// :::::: framework-client.js
// Framework Client SDK
export class Framework {
  static async init(swPath = '/sw.js') {
    if ('serviceWorker' in navigator) {
      // Register SW and setup hot-reload listener
      await navigator.serviceWorker.register(swPath);
      navigator.serviceWorker.addEventListener('message', this._handleSWMessage);
    }
  }

  // Call this whenever your framework finishes compiling .bla.css
  static async updateCssCache(requestUrl, compiledCssString) {
    // Write directly to shared Cache Storage
    const cache = await caches.open('framework-compiled-cache-v1');
    const response = new Response(compiledCssString, {
      status: 200,
      headers: { 'Content-Type': 'text/css; charset=utf-8' }
    });
    await cache.put(requestUrl, response);

    // Notify Service Worker about the update
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CSS_RECOMPILED',
        url: requestUrl
      });
    }
  }

  static _handleSWMessage(event) {
    if (event.data?.type === 'HOT_RELOAD_CSS') {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const targetLink = links.find(l => l.href.includes(event.data.url));

      if (targetLink) {
        const url = new URL(targetLink.href);
        url.searchParams.set('v', Date.now().toString());
        targetLink.href = url.toString();
      }
    }
  }
}

// :::::: im projekt
// sw..js // Import entire framework service worker logic directly from the framework path
importScripts('/framework/framework-sw.js');

// index.html
<!DOCTYPE html>
<html lang="de">
<head>
  <link rel="stylesheet" href="/styles/main.bla.css">
  
  <script type="module">
    import { Framework } from '/framework/framework-client.js';

    // 1. Initialize framework and register SW
    await Framework.init('/sw.js');

    // 2. Example: When your compiler runs in browser
    const compiledCss = "body { background: #111; color: #fff; }";
    await Framework.updateCssCache('/styles/main.bla.css', compiledCss);
  </script>
</head>
<body>
</body>
</html>
