/*

*/

// :::::: CLIENT SIDE (MAIN THREAD) ::::::::::::::::::::::::::::::::                               

const sw = navigator.serviceWorker;

sw.register('/sw.js');                      // classic
sw.register('/sw.js', { type: 'classic' }); // classic
sw.register('/sw.js', { type: 'module'  }); // module

const worker = {};
worker.on          =              sw.addEventListener;
worker.sendMessage = (message) => sw.controller.postMessage(message);

/*
// receive message from sw
worker.on('message',(message)=>{});

//
document.querySelector( '.fetch-content' ).addEventListener( 'click', () => {
  window.caches.open( myCache )
    .then( cache => cache.addAll( content ) )
    .then( () => alert( 'content is now available offline' ) )
    .catch( () => alert( 'oh noes! something went wrong' ) );
});
*/

// :::::: SERVICE WORKER SIDE ::::::::::::::::::::::::::::::::::::::

// ::: Constants

var version = '1';
var CACHE_NAME   = 'my-chache-name-${version}'

// ::: Cache

var urlsToCache = [
  '/',
  '/styles/smestyle.css',
  '/image/img1.png',
  '/js/jsfile.js'
];

// :::

const on = self.addEventListener;

// ::: Methods

function isLocalURL (sth) {
  let url;
  
  if (sth instanceof URL)     url = sth;
  if (sth instanceof Request) url = new URL(request.url);
  if (sth instanceof Event)   url = new URL(event.request.url);
  
  return url.origin == location.origin;
}

function cacheStaticFiles () {
  caches.open(CACHE_NAME).then((cache) => {
    return cache.addAll(urlsToCache);
  });
}

// ::: Event Handlers

function onActivate (event) {
  self.clients.claim();
}

function onError (error) {

}

function onFetch (event) {
  if (isLocalURL(event)) {
    //event.respondWith(caches.match('other.jpg'));
  }
}

function onInstall  (event) {
  // install instantly (no refresh needed)
  self.skipWaiting();
  //
  event.waitUntil(cacheStaticFiles);
}

function onSync (event) {

}

// :::::: Event Listeners

on('activate'     , onActivate);
on('error'        , onError);
on('fetch'        , onFetch);
on('install'      , onInstall);
on('periodicsync' , onSync);

/*
/*

*/

// :::::: CLIENT SIDE (MAIN THREAD) ::::::::::::::::::::::::::::::::                               

const sw = navigator.serviceWorker;

sw.register('/sw.js');                      // classic
sw.register('/sw.js', { type: 'classic' }); // classic
sw.register('/sw.js', { type: 'module'  }); // module

const worker = {};
worker.on          =              sw.addEventListener;
worker.sendMessage = (message) => sw.controller.postMessage(message);

/*
// receive message from sw
worker.on('message',(message)=>{});

//
document.querySelector( '.fetch-content' ).addEventListener( 'click', () => {
  window.caches.open( myCache )
    .then( cache => cache.addAll( content ) )
    .then( () => alert( 'content is now available offline' ) )
    .catch( () => alert( 'oh noes! something went wrong' ) );
});
*/

// :::::: SERVICE WORKER SIDE ::::::::::::::::::::::::::::::::::::::

// ::: Constants

var version = '1';
var CACHE_NAME   = 'my-chache-name-${version}'

// ::: Cache

var urlsToCache = [
  '/',
  '/styles/smestyle.css',
  '/image/img1.png',
  '/js/jsfile.js'
];

// :::

const on = self.addEventListener;

// ::: Methods

function isLocalURL (sth) {
  let url;
  
  if (sth instanceof URL)     url = sth;
  if (sth instanceof Request) url = new URL(request.url);
  if (sth instanceof Event)   url = new URL(event.request.url);
  
  return url.origin == location.origin;
}

function cacheStaticFiles () {
  caches.open(CACHE_NAME).then((cache) => {
    return cache.addAll(urlsToCache);
  });
}

// ::: Event Handlers

function onActivate (event) {
  self.clients.claim();
}

function onError (error) {

}

function onFetch (event) {
  if (isLocalURL(event)) {
    //event.respondWith(caches.match('other.jpg'));
  }
}

function onInstall  (event) {
  // install instantly (no refresh needed)
  self.skipWaiting();
  //
  event.waitUntil(cacheStaticFiles);
}

function onSync (event) {

}

// :::::: Event Listeners

on('activate'     , onActivate);
on('error'        , onError);
on('fetch'        , onFetch);
on('install'      , onInstall);
on('periodicsync' , onSync);

/*
function staleWhileRevalidate(event) {
  return caches.open('dynamic-cache').then((cache) => {
    return cache.match(event.request).then((cachedResponse) => {
      // Trigger background network fetch to update the cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failure silently handled; cached response is used
        });

      // Return cached response immediately, or wait for network if not in cache
      return cachedResponse || fetchPromise;
    });
  });
}


function networkFirst(event) {
  return fetch(event.request)
    .then((networkResponse) => {
      // Update cache with fresh data on successful network request
      if (networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open('api-cache').then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    })
    .catch(() => {
      // Offline fallback: try to serve from cache
      return caches.match(event.request);
    });
}








self.importScripts('foo.js')

------------------------------------------

The clients.claim() line really matters on the first load of the page if you want to run the service worker before certain calls. In the below example we listen to a fetch of other.jpg.

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin == location.origin) {
    event.respondWith(caches.match('other.jpg'));
  }
});
Without the clients.claim() we won’t see the other.jpg on the initial load.
clients.claim() also signals to the clients that this version of the service worker is now the active one.








self.importScripts('foo.js')

------------------------------------------

The clients.claim() line really matters on the first load of the page if you want to run the service worker before certain calls. In the below example we listen to a fetch of other.jpg.

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin == location.origin) {
    event.respondWith(caches.match('other.jpg'));
  }
});
Without the clients.claim() we won’t see the other.jpg on the initial load.
clients.claim() also signals to the clients that this version of the service worker is now the active one.
*/



