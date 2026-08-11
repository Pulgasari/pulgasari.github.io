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
