/*
https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9
https://developer.chrome.com/docs/workbox
*/

// :::::: CLIENT SIDE (MAIN THREAD) ::::::::::::::::::::::::::::::::                               

const sw = navigator.serviceWorker;

sw.register('/sw.js');

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



