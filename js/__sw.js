navigator.serviceWorker.register("/sw.js");

// :::::: CLIENT SIDE (MAIN THREAD) ::::::::::::::::::::::::::::::::                               

const sw = navigator.serviceWorker;

const worker = {};

worker.on          =              sw.addEventListener;
worker.sendMessage = (message) => sw.controller.postMessage(message);

// receive message from sw
//worker.on('message',(message)=>{});

// :::::: SERVICE WORKER SIDE ::::::::::::::::::::::::::::::::::::::

// ::: Constants

var version = '1';
var cache   = 'my-chache-name-${version}'

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
  caches.open("app-shell-v1").then((cache) => {
    return cache.addAll(urlsToCache);
  });
}

// ::: Event Handlers

function onActivate (event) {
  self.clients.claim();
}

function onInstall  (event) {
  // install instantly (no refresh needed)
  self.skipWaiting();
  //
  event.waitUntil(cacheStaticFiles);
}

function onFetch (event) {
  if (isLocalURL(event)) {
    //event.respondWith(caches.match('other.jpg'));
  }
};

// :::::: Event Listeners

on('activate' , onActivate);
on('fetch'    , onFetch);
on('install'  , onInstall);



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



