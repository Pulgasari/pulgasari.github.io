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

function onInstall  (event) {}
function onActivate (event) {}

on('activate' , onActivate);
on('install'  , onInstall);





