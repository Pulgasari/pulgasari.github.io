const FRAMEWORK_CACHE = 'framework-compiled-cache-v1';

// :::::: Schritt A: Dein Framework schreibt in den Cache (Main Thread)
// ​Sobald dein Framework das Dialekt-CSS fertig kompiliert hat, 
// erzeugt es eine künstliche Response und legt sie im Cache ab:

// Executed in the main application thread / custom compiler
async function storeCompiledDialectCss(requestUrl, compiledCssString) {
  const cache = await caches.open(FRAMEWORK_CACHE);

  // Create an artificial HTTP Response object with the compiled CSS string
  const cssResponse = new Response(compiledCssString, {
    status: 200,
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'X-Compiled-By': 'Custom-Framework'
    }
  });

  // Store the response using the URL as key
  await cache.put(requestUrl, cssResponse);
}

// :::::: Schritt B: Der Service Worker liefert aus (Service Worker)
​// Der Service Worker prüft, ob die Anfrage auf .bla.css endet. 
// Ist das der Fall, sucht er in demselben Cache-Speicher nach dem kompilierten Ergebnis:   

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Intercept requests for custom file extension .bla.css
  if (url.endsWith('.bla.css')) {
    event.respondWith(
      caches.open(FRAMEWORK_CACHE).then(async (cache) => {
        // Try to fetch compiled result written by the framework/main thread
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        // Fallback: If not cached yet, pass through to network or handle gracefully
        return fetch(event.request).catch(() => {
          return new Response('/* Custom CSS not compiled/cached yet */', {
            status: 404,
            headers: { 'Content-Type': 'text/css' }
          });
        });
      })
    );
  }
});

//=========================

// :::::: Schritt 1: Framework sendet Event an Service Worker (Main Thread)
​// Nachdem dein Framework den neuen String kompiliert und in den Cache geschrieben hat, 
// schickst du eine Nachricht an den aktiven Service Worker:

// Main Thread / Framework Compiler
async function notifyServiceWorkerCssUpdated (requestUrl) {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    return;
  }

  // Send message to active Service Worker
  navigator.serviceWorker.controller.postMessage({
    type: 'CSS_RECOMPILED',
    url: requestUrl,
    timestamp: Date.now()
  });
}

// :::::: Schritt 2: Service Worker empfängt Event & informiert alle Tabs (Service Worker)
// ​Der Service Worker fängt das message-Event ab 
// und leitet es an alle aktiven Browser-Fenster (clients) weiter:

// Service Worker
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CSS_RECOMPILED') {
    const { url } = event.data;

    // Get all open tab windows controlled by this service worker
    const allClients = await self.clients.matchAll({ type: 'window' });

    // Notify each open tab that new CSS is available
    for (const client of allClients) {
      client.postMessage({
        type: 'HOT_RELOAD_CSS',
        url: url
      });
    }
  }
});

// :::::: Schritt 3: Tabs tauschen das CSS nahtlos aus (Main Thread / Client)
// ​In deinem Client-Script hörst du auf Nachrichten vom Service Worker. 
// Sobald das Event eingeht, erneuerst du das <link>-Tag in der Seite (Hot Swap):

// Main Thread / Client Runtime Listener
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'HOT_RELOAD_CSS') {
    const targetUrl = event.data.url;

    // Find the corresponding stylesheet link element in DOM
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const matchingLink = linkElements.find((link) => link.href.includes(targetUrl));

    if (matchingLink) {
      // Append query parameter to bypass browser rendering cache and force re-evaluate from SW Cache
      const urlObj = new URL(matchingLink.href);
      urlObj.searchParams.set('reload', Date.now().toString());
      matchingLink.href = urlObj.toString();
    }
  }
});

