# optimize

Handbuch für Ladezyklen, Caching und kritischen Pfad im aufbau-Kosmos.

Dieses Dokument erklärt **welche Mechanismen es gibt, wie sie funktionieren und wie
man sie korrekt einsetzt** — nicht, was als Nächstes zu tun ist. Beispiele stammen
aus dem eigenen Code, damit die Regeln überprüfbar bleiben.

Der Kosmos lädt bewusst ohne Build-Step: ESM geht direkt an den Browser, aufgelöst
über einen klassischen Importmap-Injector. Damit ist **der Modulgraph selbst die
Performance-Charakteristik** — es gibt keinen Bundler, der etwas glattzieht. Alles
Folgende ergibt sich aus dieser einen Entscheidung.

---

## Inhalt

1. [Wie der Browser ESM lädt](#1-wie-der-browser-esm-lädt)
2. [Die Preload-Familie](#2-die-preload-familie)
3. [Barrel-Dateien & fehlendes Tree-Shaking](#3-barrel-dateien--fehlendes-tree-shaking)
4. [Service Worker](#4-service-worker)
5. [Caching-Strategien](#5-caching-strategien)
6. [HTTP-Caching](#6-http-caching)
7. [Storage — welcher wofür](#7-storage--welcher-wofür)
8. [Kritischer Rendering-Pfad](#8-kritischer-rendering-pfad)
9. [Main-Thread](#9-main-thread)
10. [Messen statt raten](#10-messen-statt-raten)
11. [Anhang: Ist-Zustand](#11-anhang-ist-zustand)

---

## 1. Wie der Browser ESM lädt

Ein Modul durchläuft fünf Phasen:

```
Discovery  ->  Fetch  ->  Parse  ->  Instantiate  ->  Evaluate
```

Entscheidend ist **Discovery**. Der Browser erfährt von einem Modul erst, wenn er das
Modul geparst hat, das es importiert. Ein Graph der Tiefe 5 heißt also: fünf
aufeinanderfolgende Wellen, jede mit mindestens einer Round-Trip-Zeit.

```
level 0    1 modul    kits/preact-htm.js
level 1    2 module   kits/aufbau.js, js/preact/x.js       <- erst nach parse(level 0) bekannt
level 2   13 module   cache, elements, store, stylesheet   <- erst nach parse(level 1)
level 3   61 module   js/*.js, domina/core/*, bunker/*
level 4   24 module   domina/core/internal/*
level 5    3 module
```

### HTTP/2 löst das nicht

Ein verbreiteter Irrtum. HTTP/2-Multiplexing beseitigt die *Verbindungs*-Limits — 100
parallele Requests sind kein Problem mehr. Es beseitigt aber nicht die
**Abhängigkeit in der Zeit**: Level 3 kann nicht angefragt werden, bevor Level 2
geparst ist. Multiplexing hilft *innerhalb* einer Welle, nicht *zwischen* ihnen.

Deshalb sind für die Ladezeit zwei Zahlen relevant, nicht eine:

| Kennzahl | wirkt auf | Gegenmittel |
|---|---|---|
| Anzahl & Bytes | Bandbreite, Parse-Zeit | weniger/kleinere Module, Barrel vermeiden |
| **Tiefe** | Latenz (RTT × Tiefe) | `modulepreload`, flachere Importe |

Gemessen ab `@aufbau/kits/preact-htm` mit `node test/graph.mjs`
(siehe [Kapitel 10](#10-messen-statt-raten)): **104 Module, 341 KB, 5 Ebenen.**

Auf einer Verbindung mit 50 ms RTT sind die Ebenen allein ~250 ms, bevor ein einziges
Byte Anwendungslogik ausgeführt wurde.

---

## 2. Die Preload-Familie

Der Ausweg aus dem Wasserfall: dem Browser Ressourcen nennen, **bevor** er sie durch
Parsen entdecken würde. Vier verwandte Mechanismen, die oft verwechselt werden.

### 2.1 `<link rel="modulepreload">`

Das richtige Werkzeug für ES-Module.

```html
<link rel="modulepreload" href="/aufbau/js/index.js">
```

**Was es tut:** Fetch, Parse *und* Instantiate — und es folgt dabei dem
**Dependency-Graph**, lädt also auch die Importe des Moduls. Das ist der Punkt: ein
einziger `modulepreload` auf einen Einstiegspunkt wärmt den ganzen Teilbaum vor, und
zwar sofort beim Head-Parsing statt gestaffelt über fünf Wellen.

**Was es nicht tut:** Evaluate. Der Modulcode wird nicht ausgeführt. Nebenwirkungen
treten erst auf, wenn ein echter `import` das Modul anfordert — dann liegt es aber
bereits fertig instanziiert im Speicher.

**`as` braucht man nicht.** Bei `modulepreload` ist `as="script"` der Default und der
einzige gültige Wert. Schreiben schadet nicht, ist aber Rauschen.

### 2.2 Die häufigste Falle: die URL muss exakt passen

`href` ist eine **URL, kein Specifier**. Ein `modulepreload` läuft *nicht* durch den
Importmap:

```html
<!-- FALSCH: laedt eine Datei namens "@aufbau/js", die es nicht gibt -->
<link rel="modulepreload" href="@aufbau/js">

<!-- RICHTIG: die aufgeloeste URL -->
<link rel="modulepreload" href="https://pulgasari.github.io/aufbau/js/index.js">
```

Und schärfer: weicht die preloadete URL auch nur minimal von der ab, die der Importmap
später auflöst — anderer Query-String, `./x.js` statt `/x.js`, fehlendes `index.js` —
dann lädt der Browser die Datei **zweimal**. Der Preload verpufft nicht nur, er kostet.

Daraus folgt die Regel: **der Preload gehört in den Injector**, der die Auflösung
ohnehin vornimmt. `pulgasari.github.io/importmap2.js` macht genau das — es liest die
fertige Map und emittiert daraus die Links:

```javascript
// importmap2.js:123-135 — preload aus der aufgeloesten map, nie aus specifiern
const fragment = document.createDocumentFragment();
for (const key of PRELOAD_CRITICAL) {
  const href = map.imports[key];                       // <- aufgeloeste url
  if (href) {
    const link = createElement('link', { href, rel: 'modulepreload' });
    fragment.appendChild(link);
  }
}
if (fragment.childNodes.length > 0) document.head.appendChild(fragment);
```

`PRELOAD_CRITICAL` (`importmap2.js:47`) ist dabei nur eine Liste von Specifier-Keys —
die Übersetzung in URLs macht der Lookup. So können Map und Preload nicht auseinander
laufen.

### 2.3 Cross-Origin

Modulskripte werden **immer im CORS-Modus** geladen. `modulepreload` tut das ebenso,
die beiden passen also von sich aus zusammen. Für fremde Origins muss die Gegenstelle
CORS-Header liefern — bei `esm.sh` und `cdn.jsdelivr.net` gegeben.

Sobald aber Credentials im Spiel sind, muss das `crossorigin`-Attribut auf Preload und
tatsächlichem Import **identisch** sein, sonst gelten es als zwei verschiedene
Cache-Einträge → wieder Doppel-Load.

### 2.4 `rel="preload"` — und warum es für Module falsch ist

```html
<!-- FALSCH fuer ES-module -->
<link rel="preload" as="script" href="/aufbau/js/index.js">
```

Zwei Probleme: `rel=preload as=script` lädt im **No-CORS-Modus** und **ohne**
Modul-Semantik. Es parst das Modul nicht, folgt seinen Importen nicht, und der spätere
echte Modul-Import zählt als anderer Request-Modus → Doppel-Load. Das ist der
klassische Bug, für den `modulepreload` überhaupt erfunden wurde.

`rel="preload"` ist richtig für alles, was **kein** Modul ist und spät entdeckt wird:

```html
<link rel="preload" as="font" type="font/woff2" href="/webfonts/x.woff2" crossorigin>
<link rel="preload" as="image" href="/hero.avif">
```

Fonts brauchen `crossorigin` **immer**, auch same-origin — Font-Requests laufen per
Spezifikation anonym. Ohne das Attribut wird der Font zweimal geladen.

### 2.5 `preconnect` und `dns-prefetch`

Preload holt eine Ressource. Preconnect holt nur die **Verbindung** — DNS, TCP, TLS —
und spart damit bei fremden Origins typisch 100–300 ms.

```html
<link rel="preconnect" href="https://esm.sh" crossorigin>
<link rel="dns-prefetch" href="https://esm.sh">
```

Lohnt sich, wenn von einer Origin sicher geladen wird, aber erst spät. Der Kosmos
zieht `preact`, `htm` und `@preact/signals` von `esm.sh` und `hljs` von
`cdn.jsdelivr.net` — beides Kandidaten.

**Sparsam einsetzen.** Jede offene Verbindung kostet Sockets und auf Mobilfunk Strom.
Faustregel: maximal 2–4, und nur für Origins, die im kritischen Pfad wirklich
vorkommen. Ein `preconnect` auf eine Origin, von der erst nach 5 s geladen wird, ist
verschenkt — die Verbindung wird vorher wieder geschlossen.

`dns-prefetch` ist der schwächere, billigere Bruder (nur DNS) und dient heute vor allem
als Fallback für Browser ohne `preconnect`.

### 2.6 `fetchpriority`

Feinsteuerung, wenn die Standard-Priorität danebenliegt:

```html
<link rel="modulepreload" href="/aufbau/kits/aufbau.js" fetchpriority="high">
<link rel="preload" as="image" href="/below-fold.avif" fetchpriority="low">
```

Nur einsetzen, wenn im Wasserfall belegt ist, dass die Reihenfolge falsch ist. Alles
auf `high` zu setzen ist dasselbe wie nichts auf `high` zu setzen.

### 2.7 Was blockiert eigentlich?

| Form | Parser blockiert? | Ausführung |
|---|---|---|
| `<script src>` | **ja** | sofort, in Reihenfolge |
| `<script src defer>` | nein | nach Parsing, in Reihenfolge |
| `<script src async>` | nein | sobald geladen, ungeordnet |
| `<script type="module">` | nein (implizit defer) | nach Parsing, in Reihenfolge |
| `<script type="module" async>` | nein | sobald geladen |
| `<link rel="stylesheet">` | **rendert nicht** | — |
| `<link rel="modulepreload">` | nein | gar nicht (kein Evaluate) |

Wichtig für den Kosmos: **`boot.js` und der Importmap-Injector sind absichtlich
klassische, blockierende Skripte.** Nicht `defer`, nicht `async`, nicht `module` — alle
drei verschieben die Ausführung hinter den Parser, und genau in diesem Fenster flackert
die Seite. Siehe [Kapitel 8](#8-kritischer-rendering-pfad) und den Kopfkommentar in
`boot.js`.

Der Importmap selbst muss zwingend vor jedem Modul-Skript stehen — ein Importmap nach
dem ersten Modul-Load ist ein Fehler.

### 2.8 Welche Module gehören auf die Preload-Liste?

Nicht „möglichst viele". Kriterien, in dieser Reihenfolge:

1. **Alles, was den ersten Paint blockiert.** Im Kosmos die Stylesheet-Kette, weil
   ungerenderte `.ass`-Dateien die Seite unstyled lassen.
2. **Die Ebenen 0–2 des Graphen.** Sie stehen am Anfang jeder Kette; wer sie vorzieht,
   verkürzt alle Pfade dahinter.
3. **Geteilte Böden.** Module, die von vielen anderen importiert werden — sie liegen
   tief, werden aber garantiert gebraucht.

Punkt 3 ist der wichtigste und wird am häufigsten übersehen: ein Modul auf Ebene 4, das
von 25 anderen importiert wird, ist wertvoller vorzuladen als ein Modul auf Ebene 1,
das nur einmal vorkommt. Es liegt garantiert im kritischen Pfad — nur eben spät.

Kandidaten sind messbar statt zu raten. `node test/graph.mjs` gibt Ebene *und* Fan-in
aus, und die reale Rangliste im Kosmos sieht so aus:

```
most imported modules (preload candidates regardless of level)
   25x  level 4  domina/core/internal/is.js
   18x  level 4  domina/core/internal/resolve.js
   11x  level 2  aufbau/js/index.js
   10x  level 4  domina/core/internal/normalize.js
    9x  level 3  domina/core/query.js
```

Bemerkenswert: die vier meistimportierten Module liegen auf **Ebene 3 und 4** — sie
werden also erst spät entdeckt, obwohl praktisch jeder Pfad durch sie führt. Genau das
ist die Konstellation, für die `modulepreload` gebaut wurde. Eine Preload-Liste, die
nur die Einstiegspunkte auf Ebene 0–1 enthält, lässt den größten Hebel liegen.

---

## 3. Barrel-Dateien & fehlendes Tree-Shaking

Ein *Barrel* ist eine Index-Datei, die andere Module wieder ausgibt:

```javascript
export * from './core.js';
export * from './hash.js';
export * as dom from '@domina/core';
```

Mit Bundler ist das gratis: Rollup/esbuild wirft ungenutzte Exporte weg
(Tree-Shaking). **Ohne Bundler gibt es kein Tree-Shaking.** Der Browser muss jedes
re-exportierte Modul laden, parsen und instanziieren — auch wenn der Importeur eine
einzige Funktion daraus braucht. Ein `export *` ist im Browser ein *Ladebefehl*, keine
Sichtbarkeitserklärung.

### Der Effekt im eigenen Code

`aufbau/js/index.js:20` gibt die komplette DOM-Bibliothek weiter:

```javascript
export * as dom from '@domina/core';   // 38 module, 88 KB
```

`@aufbau/store` braucht daraus exakt ein `createLogger`:

```javascript
// store/index.js:12
import { createLogger } from '@aufbau/js';
```

Rechnung: **63 Module / 153 KB für eine Logger-Funktion.** Dasselbe Muster in
`cache/index.js:13` (`createLogger, hashKey`), `patterns/index.js:4` (`encodeSvg`),
`elements/core/styles.js:4` (`isFn`).

`@aufbau/js` ist damit der gemeinsame Boden unter praktisch allem — **57 der 104
Module**, und es wird von 11 verschiedenen Stellen importiert.

### Gegenmittel

**Deep-Imports in Low-Level-Paketen.** Wer wenig braucht, importiert direkt:

```javascript
// statt:
import { createLogger } from '@aufbau/js';
// direkt:
import { createLogger } from '@aufbau/js/log.js';
```

Voraussetzung ist ein **Trailing-Slash-Eintrag** im Importmap, sonst lässt sich der
Pfad nicht auflösen:

```json
{
  "imports": {
    "@aufbau/js"  : "./aufbau/js/index.js",
    "@aufbau/js/" : "./aufbau/js/"
  }
}
```

Beide Einträge sind nötig: der erste für `'@aufbau/js'`, der zweite für alles darunter.
`importmap2.js` erzeugt dieses Paar automatisch für jeden Array-Eintrag
(`expandImportMap`, Zeilen 85–86):

```javascript
imports[fullKey]       = `${base}${relPath}/index.js`;
imports[`${fullKey}/`] = `${base}${relPath}/`;
```

**Die Arbeitsteilung**, die sich bewährt: das Barrel bleibt für App- und Element-Code,
wo Bequemlichkeit zählt und der Graph ohnehin geladen wird. Bibliotheks-interne Pakete
importieren tief. Damit ist es keine Breaking Change für Konsumenten.

**Reexporte von Fremdpaketen im Barrel vermeiden.** `export * as dom from '@domina/core'`
ist der teuerste Einzelposten, weil es eine *fremde* Bibliothek an den Boden kettet.

---

## 4. Service Worker

Der Service Worker ist im Kosmos die eigentliche Caching-Ebene — auf GitHub Pages
lassen sich HTTP-Header nicht setzen (siehe [Kapitel 6](#6-http-caching)). Umso mehr
lohnt es, seine Mechanik genau zu kennen.

### 4.1 Lebenszyklus

```
register()  ->  installing  ->  installed/waiting  ->  activating  ->  activated  ->  controlling
```

Zwei Eigenschaften überraschen regelmäßig:

**Ein frischer SW kontrolliert den ersten Load nie.** Die Navigation, die zur
Registrierung führt, ist längst abgeschlossen, wenn der SW aktiv wird. Ohne Zutun
greift er erst beim *zweiten* Seitenaufruf.

**Ein neuer SW wartet.** Solange ein alter SW noch Clients kontrolliert, bleibt der
neue in `waiting`. Ein Reload reicht nicht — der alte Client muss geschlossen werden.

Beides hebelt man so aus:

```javascript
self.addEventListener('install', (event) => {
  // do not wait for old clients to close
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await cleanupOldCaches();
    // take over clients that are already open, including the one that registered us
    await self.clients.claim();
  })());
});
```

`skipWaiting()` ist nicht harmlos: der neue SW übernimmt Clients, die mit den Assets
der alten Version geladen wurden. Wenn Modul-URLs versioniert sind, ist das unkritisch;
bei unversionierten Pfaden kann es zu gemischten Versionen kommen.

### 4.2 `respondWith`-Disziplin

Die wichtigste Regel und der häufigste Performance-Fehler:

```javascript
// ANTI-PATTERN
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const response = await handle(event);
    if (response) return response;
    return fetch(event.request);   // <- "fallback", aber der schaden ist da
  })());
});
```

Sobald `respondWith()` gerufen wurde, ist der SW **für diesen Request zuständig** —
auch für den Fallback-Zweig. Konsequenzen:

- *Jeder* Request — Navigationen, Bilder, Cross-Origin-Fonts, Analytics — läuft durch
  JavaScript statt über den optimierten Netzwerkpfad des Browsers.
- Läuft der SW gerade nicht (siehe 4.3), muss er **erst booten**, bevor der Request
  überhaupt weitergereicht wird.
- `event.respondWith(fetch(event.request))` ist messbar **langsamer** als gar nichts zu
  tun.

Richtig ist, die Zuständigkeit **synchron vor** `respondWith` zu entscheiden:

```javascript
self.addEventListener('fetch', (event) => {
  // synchronous check, no await before the decision
  if (!canHandle(event.request)) return;   // browser handles it natively
  event.respondWith(handle(event));
});
```

Wer nicht zuständig ist, kehrt einfach zurück. Der Browser macht dann seinen normalen
Request, als gäbe es keinen SW.

Die Prüfung muss synchron sein — ein `await` vor der Entscheidung ist bereits zu spät,
weil `respondWith` nur im selben Tick gültig ist. Im Kosmos liegen die nötigen Muster
schon vorkompiliert bereit (`plugins/worker/index.js`):

```javascript
const REGEX_FONT_EXT      = /\.(woff2?|otf|ttf)$/i;
const REGEX_AUFBAU_MODULE = /(\/@aufbau\/|github\.io\/aufbau\/|\/kits\/|\/elements\/.*\.js$)/;
const STYLESHEET_PATTERN  = new URLPattern({ pathname: '*\\.aufbau\\.css' });
```

### 4.3 Startkosten — warum ein SW klein importiert

Ein Service Worker ist **kein dauerhafter Prozess**. Der Browser beendet ihn nach
kurzer Idle-Zeit (Chrome: ~30 s) und startet ihn beim nächsten Event neu. Bei jedem
Start wird sein **kompletter Modulgraph neu ausgewertet**.

Ein SW, der einen Kit importiert, zahlt diesen Preis dutzendfach pro Sitzung:

```javascript
// TEUER: zieht das gesamte framework in jeden SW-start
import { interceptFetch } from 'https://pulgasari.github.io/aufbau/kits/aufbau.js';

// RICHTIG: nur was der worker braucht
import { interceptFetch } from 'https://pulgasari.github.io/aufbau/plugins/worker/index.js';
```

Regel: **ein SW importiert das kleinstmögliche Modul, nie einen Kit.**

Für Navigationen gibt es zusätzlich **Navigation Preload** — der Browser startet den
Netzwerk-Request parallel zum SW-Boot:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.navigationPreload?.enable());
});

// im fetch-handler dann:
const preloaded = await event.preloadResponse;
if (preloaded) return preloaded;
```

### 4.4 Der stille Totalausfall

Wirft ein Modul im Import-Graph des SW einen Fehler, **installiert der SW nicht** —
ohne dass in der Seiten-Console etwas auffällt. Die Registrierung selbst kann
erfolgreich aussehen.

Die typische Ursache ist DOM-Zugriff auf Modul-Ebene. Im Worker-Scope gibt es kein
`document`:

```javascript
// bricht jeden SW, der dieses modul (auch transitiv) importiert
export const root = document.documentElement;

// tragfaehig in beiden scopes
export const root = typeof document !== 'undefined' ? document.documentElement : null;
```

`domina/core/fonts.js:5` zeigt das Muster bereits richtig:

```javascript
const fontSet = () => (typeof document !== 'undefined' ? document.fonts : null);
```

**Prüfen lässt sich das so:**

- DevTools → Application → Service Workers: Status, Fehlermeldung, „skipWaiting"-Link
- `navigator.serviceWorker.controller !== null` — der harte Test, ob ein SW die Seite
  wirklich kontrolliert
- DevTools → Network → Spalte „Size": `(ServiceWorker)` verrät bediente Requests
- Ein Import-Fehler erscheint in der **SW-Console**, nicht in der der Seite —
  Kontext-Umschalter oben links im Console-Tab

Weil dieser Fehler still ist, gehört er in einen automatisierten Test.

### 4.5 Precache und Cleanup

```javascript
const VERSION    = 'aufbau-v1';
const PRECACHE   = ['./boot.js', './kits/aufbau.js', './elements/core/index.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // drop every cache that is not the current version
    await Promise.all(names.filter(name => name !== VERSION).map(name => caches.delete(name)));
  })());
});
```

`cache.addAll()` ist **atomar**: schlägt eine URL fehl, scheitert die ganze
Installation. Nur Pfade aufnehmen, die sicher existieren — und den Cache-Namen
versionieren, sonst wächst der Storage unbegrenzt.

---

## 5. Caching-Strategien

Vier Muster. Die Wahl folgt einer einzigen Frage: **wie schlimm ist es, kurzzeitig
veraltete Daten auszuliefern?**

### Cache-First

Liegt es im Cache, geht kein Request raus. 0 ms Latenz.

```javascript
const cached = await cache.match(request);
if (cached) return cached;
const response = await fetch(request);
if (response.ok) cache.put(request, response.clone());
return response;
```

**Nur für unveränderliche URLs.** Hashed Dateinamen, versionierte Pfade, Fonts.

> ⚠️ Cache-First auf **unversionierten** URLs friert die Datei dauerhaft ein. Ohne
> Cache-Löschung sieht der Nutzer nie wieder eine neue Version. Das ist der häufigste
> selbstgebaute „warum sehen meine User das Update nicht"-Bug.

### Network-First

Erst Netz, Cache als Fallback. Für Daten, bei denen Aktualität zählt (API-Antworten,
HTML-Navigationen). Kostet die volle Latenz, wenn online.

### Stale-While-Revalidate

Cache sofort ausliefern, im Hintergrund erneuern. Schnellste Antwort bei
gleichzeitiger Aktualisierung — der Nutzer sieht die neue Version beim **nächsten**
Aufruf.

Das ist der Standardfall für fast alles im Kosmos. `@bunker/cache` implementiert es
vollständig (`bunker/cache/index.js:147`) — inklusive des Teils, den Eigenbauten
meist weglassen:

```javascript
const cached = await match(request);
if (cached && ttl > 0 && ageOf(cached) < ttl) return cached;   // frisch genug: gar nicht fragen

const revalidate = () => once(urlOf(request), async () => {
  const response = await fetch(conditional(request, cached));  // If-None-Match / If-Modified-Since
  if (response.status === 304 && cached) { /* nur das alter auffrischen */ }
  ...
});
```

Drei Details, die den Unterschied machen:

- **TTL-Fenster** — innerhalb der TTL wird gar nicht erst gefragt.
- **Konditionale Requests** — `If-None-Match` mit dem gespeicherten ETag. Bei 304
  kommt kein Body über die Leitung, nur ein Statuscode.
- **`once()`-Dedupe** — parallele Anfragen auf dieselbe URL lösen genau eine
  Revalidierung aus.

### Cache-Only / Network-Only

Randfälle: Cache-Only für Offline-App-Shells, Network-Only für alles, was nie in einen
Cache gehört (Analytics, Auth).

### Entscheidungshilfe

| Inhalt | Strategie | Begründung |
|---|---|---|
| Fonts (`.woff2`) | Cache-First, lange TTL | Dateiname ändert sich beim Rebuild |
| Versionierte Module | Cache-First | URL ist der Content-Identifier |
| **Un**versionierte Module | **SWR** | sonst dauerhaft eingefroren |
| Kompilierte Stylesheets | SWR, kurze TTL | ändern sich beim Entwickeln |
| HTML-Navigation | Network-First | Stale HTML zeigt tote Asset-Referenzen |
| API-Daten | Network-First / SWR | fachabhängig |

---

## 6. HTTP-Caching

Die Ebene *unter* dem Service Worker. Der Browser-HTTP-Cache greift auch ohne SW.

### Die Header

```
Cache-Control: public, max-age=31536000, immutable   # ein jahr, nie revalidieren
Cache-Control: no-cache                              # cachen ja, aber immer revalidieren
Cache-Control: no-store                              # gar nicht cachen
ETag: "a1b2c3"                                       # inhalts-fingerabdruck
Last-Modified: Wed, 21 Oct 2026 07:28:00 GMT         # schwächere alternative
```

`immutable` ist die stärkste Aussage: „revalidiere nie, auch nicht bei Reload." Nur für
Content-Addressed URLs.

`no-cache` heißt **nicht** „nicht cachen" — es heißt „cachen, aber vor jeder Nutzung
mit dem Server rückfragen". Nicht-Cachen ist `no-store`.

### Konditionale Requests

Mit einem gespeicherten ETag fragt der Browser:

```
GET /aufbau/js/index.js
If-None-Match: "a1b2c3"

304 Not Modified          <- kein body, nur header
```

Das spart die Bytes, aber **nicht den Round-Trip**. Genau deshalb ist die TTL in
SWR wertvoll: sie spart auch die Rückfrage.

### Auf GitHub Pages

Die entscheidende Einschränkung: **GitHub Pages lässt keine eigenen Header zu.** Kein
`_headers`, keine Konfiguration. Ausgeliefert wird mit kurzem `max-age` (~10 min) plus
ETag.

Daraus folgt für den Kosmos:

1. **Der Service Worker ist die einzige steuerbare Caching-Ebene.** Alles, was über
   ~10 Minuten hinaus gecacht werden soll, muss durch CacheStorage.
2. **Content-Addressing ersetzt Cache-Control.** Wenn der Schlüssel der Hash des
   Inhalts ist, kann ein Eintrag per Definition nicht veralten — ein anderer Inhalt ist
   ein anderer Schlüssel. `@aufbau/cache` nutzt genau das:

```javascript
// cache/index.js:58 — content-addressed, deshalb kein ttl noetig
export async function compileStylesheet (source, compile) {
  const key    = stylesheetKey(source);   // hash des quelltexts
  const cached = await sheets.get(key);
  if (cached !== null) return cached;
  const css = await compile(source);
  await sheets.set(key, css);
  return css;
}
```

Bei Content-Addressing begrenzt nicht die Ablaufzeit den Speicher, sondern die
Eintragszahl (`maxEntries`).

> **Kollisions-Hinweis:** Wer nach Hash schlüsselt, sollte die Quelle mit ablegen und
> beim Treffer vergleichen. Ein 32-Bit-Hash kollidiert selten — aber wenn, liefert er
> still das falsche Ergebnis, und solche Fehler sind kaum zu finden.

---

## 7. Storage — welcher wofür

| | localStorage | IndexedDB | CacheStorage |
|---|---|---|---|
| API | **synchron** | async | async |
| Blockiert Main-Thread | **ja** | nein | nein |
| Kapazität | ~5 MB | GB-Bereich | GB-Bereich |
| Datentyp | nur Strings | strukturiert (Blob, ArrayBuffer …) | `Response`-Objekte |
| Im Service Worker | **nein** | ja | ja |
| **Vor dem ersten Paint lesbar** | **ja** | nein | nein |

Die letzte Zeile ist die wichtigste. Sie ist der Grund, warum `boot.js` existiert.

### localStorage

Synchron und damit ein Jank-Risiko: jeder Zugriff blockiert den Main-Thread, große
Strings kosten spürbar. Trotzdem unverzichtbar, denn es ist die **einzige** Storage-API,
die vor dem ersten Paint gelesen werden kann. IndexedDB und CacheStorage sind async —
bis eine Antwort da ist, hat der Browser längst gerendert.

Faustregel: **nur was den ersten Paint entscheidet**, und mit Größenbudget.

### IndexedDB

Der Arbeitsspeicher der Anwendung. Async, groß, strukturiert. Trägt im Kosmos den
Content-Addressed Stylesheet-Cache (`@aufbau/cache` über `@bunker/db`).

### CacheStorage

Speichert **`Response`-Objekte** samt Headern — und das ist der Punkt. Ein aus dem
Cache bediente Font durchläuft die normale Font-Pipeline des Browsers, `font-display`
und `unicode-range` funktionieren weiter. Wer stattdessen einen ArrayBuffer in IndexedDB
legt und daraus eine `FontFace` baut, verliert beides. `plugins/worker/index.js`
kommentiert genau diese Entscheidung.

### Dieselben Daten nicht doppelt halten

Zwei Kopien bedeuten zwei Schreibvorgänge, doppelten Verbrauch und die Frage, welche
gilt. Wenn dasselbe kompilierte CSS synchron in localStorage *und* async in IndexedDB
landet, zahlt der kritische Pfad den synchronen Write mit — für Daten, die er nicht
braucht.

Sauber ist eine klare Rollenteilung:

- **localStorage** — nur der Boot-Pfad: was vor dem ersten Paint gebraucht wird
- **IndexedDB** — der eigentliche Content-Store
- **CacheStorage** — alles, was als HTTP-Antwort wieder rausgeht

### Quota

IndexedDB und CacheStorage teilen sich ein Kontingent (typisch ein Anteil des freien
Speichers). Abfragen:

```javascript
const { quota, usage } = await navigator.storage.estimate();
```

Im Privat-Modus ist alles kleiner, und localStorage kann komplett fehlen. Jeder Zugriff
gehört deshalb in ein `try`/`catch` — `boot.js` macht das vorbildlich: ein Boot-Skript,
das über einen Cache-Miss stirbt, ist schlimmer als jedes Flackern.

---

## 8. Kritischer Rendering-Pfad

### Render-blockierendes CSS

Ein `<link rel="stylesheet">` blockiert das **Rendering** (nicht das Parsing). Der
Browser zeigt nichts, bis das Stylesheet da ist — bewusst so, denn ungestyltes Rendern
mit anschließendem Umspringen ist schlimmer.

Für den Kosmos gilt eine Verschärfung: `.ass`-Dateien sind kein gültiges CSS. Der
Browser lädt sie render-blockierend, parst rohe `aufbau-*`-Properties als Müll und
zeigt trotzdem ungestylt an — bis JavaScript sie kompiliert hat. Ohne Gegenmaßnahme
flackert die Seite bei **jedem** Aufruf.

### Der `boot.js`-Mechanismus

`boot.js` löst das in drei Schritten, und jede Design-Entscheidung darin hat einen
Grund:

**1. Klassisch und blockierend.** Nicht `module`, nicht `defer`, nicht `async` — alle
drei verschieben die Ausführung hinter den Parser, also genau in das Fenster, in dem
geflackert wird. Es muss vor den `<link>`-Tags stehen, die es abdeckt.

**2. localStorage als einzige Option.** Ein async Read käme zu spät (siehe
[Kapitel 7](#7-storage--welcher-wofür)).

**3. Das Manifest-Muster.** `boot.js` läuft, bevor die `<link>`-Elemente geparst sind —
es *kann* also nicht aus dem DOM wissen, welche Stylesheets die Seite braucht. Ein beim
letzten Besuch geschriebenes Manifest, nach Pfad geschlüsselt, liefert die Antwort:

```javascript
// boot.js:85 — was diese seite beim letzten mal geladen hat
const manifest = store.getItem(PAGES + location.pathname);
```

**Der entscheidende Kniff** ist Schritt vier: die vorweggenommenen `<link>`-Elemente
sind ja weiterhin unterwegs und würden das gerade Erreichte wieder zerstören — sie
blockieren das Rendering und landen als roher `.ass`-Text *nach* den eingefügten
Styles in der Kaskade. Also werden sie entschärft, sobald sie im DOM auftauchen:

```javascript
// boot.js:137
node.media = 'not all';
```

`media="not all"` macht ein Stylesheet **weder render-blockierend noch anwendbar** —
der Request bleibt aber in der Luft und lässt sich zur Revalidierung weiternutzen. Ein
`MutationObserver`-Callback läuft am nächsten Microtask-Checkpoint, lange bevor eine
Netzwerkantwort eintreffen kann; das Rennen ist also immer gewonnen.

Übertragbar ist daraus: **wer Styles vorwegnimmt, muss das Original entschärfen.**
Sonst hat man beide Kosten und keinen Nutzen.

### Fonts

```css
@font-face {
  font-family: 'X';
  src: url('/webfonts/x.woff2') format('woff2');
  font-display: swap;               /* sofort mit fallback rendern, dann tauschen */
  unicode-range: U+0000-00FF;       /* nur laden, wenn diese zeichen vorkommen */
}
```

`font-display` steuert das Verhalten während des Ladens:

| Wert | Verhalten |
|---|---|
| `auto` | Browser entscheidet (meist `block`) |
| `block` | bis zu 3 s unsichtbarer Text (FOIT) |
| `swap` | sofort Fallback, dann Tausch (FOUT) — meist die beste Wahl |
| `fallback` | 100 ms unsichtbar, dann Fallback |
| `optional` | Browser darf den Font ganz weglassen |

Beides — `font-display` und `unicode-range` — funktioniert nur, wenn der Font die
normale Browser-Pipeline durchläuft. Deshalb gehören Fonts in **CacheStorage** und nicht
als ArrayBuffer in IndexedDB.

Vorladen mit `crossorigin` (siehe [2.4](#24-relpreload--und-warum-es-für-module-falsch-ist)),
und nur die Schnitte, die above-the-fold wirklich vorkommen.

### Splash als Notausgang

Wenn sich Wartezeit nicht vermeiden lässt, kann man sie wenigstens gestalten. Das
Splash-CSS in `boot.js` ist dafür ein sauberes Muster: die `reveal`-Animation trägt
`both` und blendet über ihre Verzögerung hinweg zurück auf `opacity: 0` — ein Boot, der
innerhalb von 180 ms fertig ist, zeigt **gar keinen** Splash. Ein Ladebildschirm, der
bei schnellem Laden aufblitzt, ist schlimmer als keiner.

---

## 9. Main-Thread

Netzwerk ist nur die halbe Miete. Ist alles geladen, entscheidet die Hauptthread-Arbeit
über die Reaktionsfähigkeit.

### Long Tasks

Alles über **50 ms** blockiert Eingaben und zählt als Long Task. Relevant für **INP**
(Interaction to Next Paint), das seit 2024 FID als Core Web Vital ersetzt hat.

```javascript
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) console.warn('long task', entry.duration, entry);
}).observe({ type: 'longtask', buffered: true });
```

### Arbeit aufteilen

```javascript
// nach jedem block dem browser die kontrolle zurueckgeben
if (globalThis.scheduler?.yield) await scheduler.yield();

// oder priorisiert einplanen
scheduler.postTask(work, { priority: 'background' });

// klassisch: wenn der browser ohnehin nichts zu tun hat
requestIdleCallback(work, { timeout: 2000 });
```

`requestIdleCallback` eignet sich für alles, was nicht am kritischen Pfad hängt:
Cache-Pruning, Manifest-Schreiben, Hintergrund-Revalidierung. **`timeout` immer
setzen** — sonst kann der Callback auf einer beschäftigten Seite beliebig lange
ausbleiben.

### Typische Kostenstellen

**Synchrone Storage-Writes auf dem kritischen Pfad.** Jedes `localStorage.setItem` mit
einem großen String blockiert. Im Kosmos passiert das in `plugins/client/index.js:109`
und `:132` — jeweils das komplette kompilierte CSS.

**Wiederholte DOM-Queries.** Läuft eine Funktion einmal *pro* Element, aber macht darin
eine Abfrage über das *ganze* Dokument, wird aus linearer Arbeit quadratische:

```javascript
// plugins/client/index.js:66 — laeuft einmal pro stylesheet
function recordManifest () {
  const hrefs = [...document.querySelectorAll('style[data-aufbau-src]')]
    .map(style => style.getAttribute('data-aufbau-src'));
  if (hrefs.length) pages.setSync(location.pathname, hrefs);   // + synchroner write
}
```

Gegenmittel ist Koaleszieren — einmal pro Microtask statt einmal pro Aufruf:

```javascript
let scheduled = false;
function scheduleManifest () {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; recordManifest(); });
}
```

**Hintergrundarbeit, die zu früh startet.** Ein Refetch zur Revalidierung ist richtig —
aber nicht mitten im initialen Laden, wo er mit kritischen Ressourcen um Bandbreite
konkurriert. Der Aufruf in `plugins/client/index.js:93` startet sofort; ein
`requestIdleCallback` oder ein `load`-Listener verschiebt ihn dorthin, wo er hingehört.

**Selektoren schärfen.** `querySelectorAll('*')` besucht jeden Knoten:

```javascript
// elements/index.js:75
node.querySelectorAll('*').forEach(el => request(tagOf(el)));
```

Für Custom Elements gibt es einen präziseren Weg — `:not(:defined)` matcht ausschließlich
noch nicht registrierte Elemente und ist bei großen DOMs deutlich billiger.

### Arbeit auslagern

Reine Berechnungen ohne DOM-Zugriff gehören in einen Worker. Der Stylesheet-Transform
ist genau so ein Fall — `plugins/worker/index.js` hält mit
`parseStylesheetWorkerMessage` bereits einen Einstiegspunkt dafür bereit.

---

## 10. Messen statt raten

Ohne Messung ist jede Optimierung Spekulation. Vier Werkzeuge decken den Bedarf ab.

### Der Modulgraph

Die projektspezifische Kennzahl. `test/graph.mjs` liest die `import`-Anweisungen
statisch aus — es führt keinen Code aus —, löst sie über den **echten Importmap** auf
und liefert Modulanzahl, Bytes, Tiefe und Fan-in:

```
node test/graph.mjs                                # default-entry, importmap.js
node test/graph.mjs store/index.js                 # ein einzelnes paket
node test/graph.mjs ../domina/core/index.js        # anderes repo
node test/graph.mjs --map importmap2.js            # anderen injector gegenpruefen
```

```
using pulgasari.github.io/importmap.js  (43 entries)

ENTRY  aufbau/kits/preact-htm.js
modules 104   bytes 341.0 KB   max depth 5

modules per waterfall level (each level is one sequential round trip)
  level 0    1  #
  level 1    2  ##
  level 2   13  #############
  level 3   61  ############################################################
  level 4   24  ########################
  level 5    3  ###
```

Den Importmap parst es nicht nach, sondern **führt den Injector gegen ein Stub-Document
aus** und übernimmt, was der emittiert. Damit kann die Messung nicht von der
tatsächlichen Auflösung abweichen — und `--map` erlaubt es, zwei Injektoren
gegeneinander zu halten, bevor man umschaltet.

Zusätzlich meldet es `MISSING` (importiert, aber nicht auf der Platte) und
`UNRESOLVED` (kein Importmap-Eintrag → 404 im Browser) und beendet sich in beiden
Fällen mit Exit-Code 1, ist also als CI-Check verwendbar.

Die Ebenen-Verteilung beantwortet direkt die Frage aus
[2.8](#28-welche-module-gehören-auf-die-preload-liste), die Fan-in-Rangliste die
schwierigere Hälfte davon.

### Resource & Navigation Timing

Was der Browser tatsächlich getan hat:

```javascript
// alle geladenen module, nach dauer
performance.getEntriesByType('resource')
  .filter(entry => entry.name.endsWith('.js'))
  .sort((a, b) => b.duration - a.duration)
  .forEach(entry => console.log(entry.duration.toFixed(0), entry.name));

// kam es aus einem cache? transferSize 0 bei vorhandener decodedBodySize
const cached = entry.transferSize === 0 && entry.decodedBodySize > 0;

// die phasen einer navigation
const [nav] = performance.getEntriesByType('navigation');
console.log({
  dns   : nav.domainLookupEnd - nav.domainLookupStart,
  tcp   : nav.connectEnd      - nav.connectStart,
  ttfb  : nav.responseStart   - nav.requestStart,
  dom   : nav.domContentLoadedEventEnd - nav.responseEnd,
});
```

`transferSize === 0` bei gesetzter `decodedBodySize` ist der verlässliche Test, **ob
Caching überhaupt greift**.

### Core Web Vitals

```javascript
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) console.log(entry.name, entry.startTime, entry);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

Beobachtbare Typen: `largest-contentful-paint`, `layout-shift`, `longtask`,
`event` (für INP), `paint` (FP/FCP).

### DevTools

- **Network** — Wasserfall. Treppenmuster = Tiefenproblem, breite Balken =
  Größenproblem. Spalte „Size" zeigt `(ServiceWorker)`, `(disk cache)`, `(memory cache)`.
- **Coverage** (Cmd/Ctrl+Shift+P → „Coverage") — wie viel des geladenen JS/CSS wurde
  ausgeführt. Direkter Hinweis auf Barrel-Overhead.
- **Performance** — Long Tasks, Main-Thread-Blockaden.
- **Application → Service Workers** — Status, Fehler, Cache-Inhalte.
- **Lighthouse** — Gesamtbild, aber im Zweifel den Zahlen aus Network/Performance
  vertrauen.

### Automatisieren

`playwright` liegt bereits in den `devDependencies`, und `test/*.test.mjs` zeigen das
Muster. Zwei Dinge sind besonders regressionsanfällig, weil sie still brechen:

```javascript
// 1. kontrolliert ein service worker die seite ueberhaupt?
await page.goto(url);
await page.evaluate(() => navigator.serviceWorker.ready);
const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);

// 2. wie viel geht beim zweiten besuch noch ueber die leitung?
const requests = [];
page.on('request', request => requests.push(request.url()));
await page.reload();
```

Beide Fehlerbilder — SW installiert nicht, Cache greift nicht — sind in der normalen
Nutzung unsichtbar. Ohne Test fallen sie beim nächsten Refactor lautlos zurück.

### Reihenfolge

1. **Messen** — Baseline festhalten, sonst ist der Effekt später nicht belegbar
2. **Ändern** — eine Sache
3. **Nachmessen** — gleiche Bedingungen (Cache-Zustand, Netzwerk-Drosselung)

Immer beide Fälle prüfen: **Cold Load** (leerer Cache, Ctrl+Shift+R) und **Warm Load**
(zweiter Besuch). Caching-Arbeit wirkt nur im zweiten, Graph-Arbeit in beiden.

---

## 11. Anhang: Ist-Zustand

Beobachtungen vom Stand dieses Dokuments, mit Datei- und Zeilenverweis. Bewusst als
Befund notiert, nicht als Arbeitsauftrag.

### Messwerte

Erhoben mit `node test/graph.mjs`, Modulgraph ab `@aufbau/kits/preact-htm`:

| Kennzahl | Wert |
|---|---|
| Lokale Module (Requests bei Cold Load) | **104** |
| Lokale Bytes (unminifiziert) | **341 KB** |
| Max. Import-Tiefe | **5** |
| Zusätzlich CDN | preact, htm, @preact/signals — `esm.sh`, fremde Origin |

Kosten der einzelnen Pakete — auffällig gleichförmig, weil alle denselben Boden teilen:

```
 modules  bytes   entry
      57  135.9   js/index.js              <- der gemeinsame boden
      38   88.0   domina/core/index.js     <- steckt darin
      60  155.8   cache/index.js
      63  153.2   store/index.js
      73  200.5   elements/index.js
      79  227.2   stylesheet/index.js
      85  245.5   plugins/worker/index.js
      86  250.7   plugins/client/index.js
```

`store/index.js` importiert aus dem Barrel ein einziges `createLogger` und zahlt dafür
63 Module. `plugins/worker/index.js` — das Modul, das ein Service Worker importieren
sollte — kommt auf 85 Module bei Tiefe 7.

**Gegenprobe `importmap2.js`:** erzeugt exakt denselben Graphen (104 Module, 341 KB,
Tiefe 5) bei 65 statt 43 Einträgen, ist also ein Superset des aktiven Maps.

### Befunde

**Der Service Worker installiert nicht.** `aufbau/docs/sw.js`,
`pulgasari.github.io/sw.js` und `domina/docs/sw.js` importieren `interceptFetch` aus
`kits/aufbau.js`. Der Kit zieht `@domina/core`, und dessen Barrel endet auf einem
ungeschützten Top-Level-Zugriff:

```javascript
// domina/core/index.js:34-36
export const
root = document.documentElement,
body = document.body;
```

Im Worker-Scope existiert kein `document` → `ReferenceError` bei der Modulauswertung →
der SW installiert nie. Damit laufen Stylesheet-SWR, Font-Cache und Modul-Cache
derzeit nicht. Vgl. [4.4](#44-der-stille-totalausfall).

**Kein `install`/`activate` in den Service Workern.** Weder `skipWaiting()` noch
`clients.claim()`, kein Precache, kein Versions-Cleanup. Vgl. [4.1](#41-lebenszyklus).

**`respondWith()` wird unbedingt für jeden Request gerufen** — in allen drei `sw.js`.
Vgl. [4.2](#42-respondwith-disziplin).

**`importmap2.js` ist fertig, aber nirgends eingebunden.** Kein HTML im Kosmos
referenziert es. Es enthält bereits den korrekten `modulepreload`-Einbau (Zeilen
123–135) und erzeugt die Trailing-Slash-Subpaths automatisch (Zeilen 85–86) — die
Voraussetzung für Deep-Imports aus [Kapitel 3](#3-barrel-dateien--fehlendes-tree-shaking).
`PRELOAD_CRITICAL` (Zeile 47) führt allerdings weder `@aufbau/js` (den 57-Modul-Boden)
noch `@aufbau/stylesheet`.

**Fünf Seiten hängen am Legacy-Importmap** `aufbau/importmap.js`, dem `@aufbau/filters`
und `@pulgasari/str` fehlen: `domina/docs`, `aufbau/patterns`, `aufbau/svg`,
`aufbau/test`, `aufbau/webfonts`. `domina/docs/index.html` lädt darüber
`@aufbau/builders/docs`, das in Zeile 3 den Kit importiert — und damit beide fehlenden
Specifier. Die übrigen ziehen nur `@aufbau/elements` und kommen daran vorbei.

**`pulgasari.github.io/index.html` bindet `boot.js` nicht ein**, lädt aber
`./index.aufbau.css` render-blockierend. Vgl. [Kapitel 8](#8-kritischer-rendering-pfad).

**Doppelter Cache-Write.** Dasselbe kompilierte CSS geht synchron nach localStorage
(`plugins/client/index.js:109`, `:132`) und async nach IndexedDB
(`compileStylesheet`). Vgl. [Kapitel 7](#7-storage--welcher-wofür).

**Manifest und Revalidierung auf dem kritischen Pfad.** `recordManifest()`
(`plugins/client/index.js:66`) läuft pro Stylesheet mit vollem `querySelectorAll` plus
synchronem Write; `revalidate()` (`:93`) startet sofort statt im Leerlauf.
Vgl. [Kapitel 9](#9-main-thread).

**Hash-Cache ohne Quellvergleich.** `stylesheet/index.js:188` und `@aufbau/cache`
schlüsseln nach 32-Bit-DJB2 ohne Verifikation — eine Kollision liefert still falsches
CSS. Der Kommentar „LRU eviction" (`stylesheet/index.js:199`) beschreibt zudem FIFO:
ohne Re-Insert bei `get` gibt es keine Nutzungsreihenfolge.

---

## Kurzreferenz

```html
<!-- reihenfolge im head, von oben nach unten -->
<script src="boot.js"></script>              <!-- klassisch, blockierend, ZUERST -->
<link rel="stylesheet" href="app.ass">       <!-- von boot.js entschaerft -->
<link rel="preconnect" href="https://esm.sh" crossorigin>
<script src="importmap.js"></script>         <!-- injiziert map + modulepreload -->
<link rel="preload" as="font" type="font/woff2" href="x.woff2" crossorigin>
```

| Ziel | Mittel |
|---|---|
| Wasserfall verkürzen | `modulepreload` auf Ebene 0–2 und geteilte Böden |
| Fremde Origin vorbereiten | `preconnect` (sparsam, 2–4) |
| Module nicht doppelt laden | preloadete URL === aufgelöste URL |
| Bytes senken (ohne Bundler) | Deep-Imports statt Barrel |
| Zweiten Besuch beschleunigen | Service Worker + SWR |
| Ersten Paint retten | localStorage-Preload, Original entschärfen |
| Jank vermeiden | keine synchronen Writes im kritischen Pfad |
| Nichts kaputt machen | vorher/nachher messen, cold **und** warm |
