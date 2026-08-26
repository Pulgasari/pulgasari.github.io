# Workers

## Links

- <https://web.dev/articles/es-modules-in-sw?hl=de>

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
