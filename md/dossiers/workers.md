# Workers

## Links

- https://web.dev/articles/es-modules-in-sw?hl=de
- https://dev.to/mvahedii/service-workers-deep-dive-what-actually-happens-in-the-browser-e1l
- https://gomakethings.com/articles/how-to-immediately-activate-a-service-worker-with-vanilla-js/

---

# Web Worker

- is special kind of *service worker* to do heavy Lifting jobs in the background, in its own separate thread.
- is a js file running on its own thread dedicated to the tab that user opend,
- you can have a *shared worker* which is a thread that run worker and shared it with multiple tabs of your web page.
- with closing tab *web worker* get destroyed , but *service worker* still alive.

### create worker

```javascript
var worker = new Worker('path to your worker file')
worker.addEventListener('message, function onMessage(event) {
  console.log(event.data)
});
```

### communication with web-worker

#### from main thread to worker thread

```javascript
worker.postMessage('hello from main');
```

#### from worker thread to main thread

```javascript
self.onmessage = function onMessage(){
  worker.postMessage('hello from worker')
};
```

### stop web-worker
```javascript
worker.terminate();
```

---

# Service Worker

the key thing to keep i mind is in web apps we are dealing with 2 servers. first one is the server or cdn that serve our static content like image/css/js and others, the second one is api server that we get data from it.

- all the network request will funnel thorough service worker.
- a type of JavaScript file that is run in the background by the browser
- it is a proxy for your web app network.
- able to intercept network requests, cache or retrieve resources from the cache

if you are request an image from another server that server had to enable cors. By default, service worker will not intercept or cache any cross-origin traffic, like HTTP API requests or images loaded from a different domain.

## Register SW

a service worker controlling a page can still intercept any network requests, including those for cross-origin assets. Scope limits which pages are controlled by a service worker, not which requests it can intercept.

- if you pass your path like “/js/sw.js”, service worker just handle the requests for “/js” underneath path.
- if you want to sw will handle all your requests, you should put it in root of your project.

### 3 LifeCycle Of SW

if you change your sw even with a code comment, browser will think it is a new service worker

- **installing:** first time browser see a service-worker or an updated sw.
- **waiting:** an old service worker exsist, your new one has to wait, until a user start navigaton event, then old one die and new one comes into play.
- **active:** your sw is ready to use.

you can only have 1 instance of sw at given time.

#### client code

```javascript
var swReges = await navigator.serviceWoker.register("/sw.js",{})
var SWState = swReges.installing | swReges.waiting | swReges.active;
navigator.serviceWorker.addEventListener("controllerchange",function(){
})
// controllerchange event means a new sw take controll of the page.
```

#### sw code

```javascript
const version = 1;
self.addEventListener('install', function onInstall(event){})
self.addEventListener('activate', function onActivate(event){})
```

##### `skipWainting()`

you can skip waiting phase using self.skipWaiting() on install event, or ask the user to refresh the page or show a pop to user and refresh the pageyour self.

##### `waitUntil()`

after browser run your sw code it will shut down your sw, the way you tell the browser as strong request is event.waitUntil() in activate phase which recives a promise, for example if user open your website and leave it right a way you dont want cache thing partially, with this your asking browser to give you a time to do your work in the background.

##### `client.claim()`

if you use skipWaiting and there are 3 open tabs of your website and user open a new tab with new sw, it doesnt mean we killed the old sw right a way, we have to tell to those 3 tabs a new service worker controlls you now, with adding await clinets.claim() in activate phase.

### Communication To SW

some reason to talk with sw

sw dont have access to localstorage or cokies you can use navigator.isonLine in service work, but not the eventListner offline , online

---

# ...

Ein Service Worker wird nach der ersten Registrierung dauerhaft im Speicher des Browsers unter der jeweiligen Domain (Origin) abgelegt. Das hat direkte Konsequenzen für die Fragen:

### 1. Nimmst du den Registrierungs-Code raus, bleibt der Service Worker aktiv?

​Ja, er bleibt weiterhin voll aktiv und steuert die Seite.

​Sobald der Browser einmal `navigator.serviceWorker.register('/sw.js')` ausgeführt hat, merkt sich die Browser-Engine die Registrierung für diese Domain unabhängig von deiner HTML- oder JS-Datei.

​- Auch wenn du den Registrierungscode komplett aus deinem Client-JS entfernst, fängt der Service Worker bei jedem Aufruf der Seite weiterhin alle `fetch`-Events ab.

- ​Entfernen: Um einen registrierten Service Worker wieder loszuwerden, musst du ihn explizit im Client-Code de-registrieren:

```javascript
// Unregister all active Service Workers for this origin
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
```

### 2. Kann/muss man den Service Worker überschreiben? Wie laufen Updates ab?

​Man muss den Service Worker nicht manuell deinstallieren, um ihn zu aktualisieren. Der Browser prüft bei jedem Seitenaufruf automatisch im Hintergrund, ob sich die Datei `sw.js` auf dem Server geändert hat.

​Der Update-Zyklus läuft in 4 Phasen ab:

#### Phase A: Der Byte-Vergleich

​Sobald eine Seite geladen wird, lädt der Browser die `sw.js` vom Server herunter und vergleicht sie Byte für Byte mit dem aktuell installierten Service Worker.

Unterscheidet sich auch nur 1 Zeichen (oder z.B. eine Versionsnummer im Code), erkennt der Browser ein Update.

#### ​Phase B: Installation der neuen Version

​Der neue SW wird im Hintergrund heruntergeladen und das `install`-Event des neuen Service Workers wird ausgelöst.

Der alte Service Worker bleibt währenddessen aktiv und bedient weiterhin die laufende Seite! Der neue SW befindet sich im Zustand `waiting` (Wartestellung).

#### Phase C: Die Aktivierung (Das "Tab-Problem")

Damit eine neue Service-Worker-Version laufende Seiten nicht durch unerwarteten Code-Tausch zerstört, wartet der Browser standardmäßig so lange, bis alle offenen Tabs dieser Domain geschlossen wurden. Erst beim nächsten Öffnen übernimmt die neue Version.

#### ​Phase D: Erzwungenes Sofort-Update (Skip Waiting)
​Möchtest du, dass der neue Service Worker sofort ohne Tab-Schließen die Kontrolle übernimmt, nutzt du `skipWaiting()` und `clients.claim()`:

```javascript
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
```
