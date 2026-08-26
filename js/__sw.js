// :::::: CLIENT SIDE (MAIN THREAD) ::::::::::::::::::::::::::::::::                               

const sw = navigator.serviceWorker.controller;

const worker = {};

worker.on          =              sw.addEventListener;
worker.sendMessage = (message) => sw.controller.postMessage(message);

// receive message from sw
//worker.on('message',(message)=>{});

// :::::: SERVICE WORKER SIDE ::::::::::::::::::::::::::::::::::::::

const on = self.addEventListener;

function onInstall  (event) {}
function onActivate (event) {}

on('activate' , onActivate);
on('install'  , onInstall);

