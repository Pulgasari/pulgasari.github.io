# `@bunker` – Analyse

`@bunker` ist eine Sammlung von Paketen für Browser-Speicher: `localStorage`/`sessionStorage`, IndexedDB, Cache API und OPFS, dazu eine Caching-Policy und kleine Hilfen. Diese Analyse beschreibt, was die Bibliothek und die einzelnen Pakete tun, und bewertet sie nach Code-Design, DX, Performance und Robustheit. Am Ende stehen konkrete Vorschläge und Erweiterungen, nach Priorität geordnet.

Grundlage: der Stand von `pulgasari/bunker` am 15.10.2026 (Commit `9ca3666`), rund 1900 Zeilen JavaScript, 840 Zeilen Typdeklarationen, 990 Zeilen Tests. Größen: minifiziert und gzip, mit esbuild gemessen, jeweils samt der eigenen Abhängigkeiten.

---

## Inhalt
- [1. Kurzfassung](#1-kurzfassung)
- [2. Was bunker ist](#2-was-bunker-ist)
- [3. Die Pakete](#3-die-pakete)
- [4. Code-Design](#4-code-design)
- [5. DX](#5-dx)
- [6. Performance](#6-performance)
- [7. Korrektheit und Robustheit](#7-korrektheit-und-robustheit)
- [8. Tooling, Tests, Veröffentlichung](#8-tooling-tests-veröffentlichung)
- [9. Vorschläge](#9-vorschläge)
- [10. Erweiterungen](#10-erweiterungen)
- [11. Prioritäten](#11-prioritäten)

---

## 1. Kurzfassung

Die Idee ist stark und selten so klar umgesetzt: Die Speicher-APIs des Browsers werden nicht als Varianten derselben Sache behandelt, sondern entlang der Eigenschaft getrennt, die über ihren Einsatz entscheidet (synchron oder nicht, was sie halten, ob ein Service Worker sie sieht). Die Policy (TTL, Staleness, Revalidierung, Eviction) ist von allen Backends getrennt und hängt nur an einem Vertrag aus fünf Methoden. Viele Fallstricke der Plattform sind bewusst gelöst und im Code begründet: IndexedDB-Upgrades, Commit statt `onsuccess`, Safari im Privatmodus, CORS bei bedingten Requests, `waitUntil` im Service Worker.

Die Schwächen liegen weniger in der Architektur als an den Rändern:

- **Akut kaputt:** Die fünf Commits vom 11.10. in `utils/` geben Methoden von `Map`, `Set` und `BroadcastChannel` ungebunden weiter. `policy.delete()`, `policy.clear()`, das Lesen eines abgelaufenen Eintrags, `memoize` mit `max`, `storage.dispose()` und `channel.post()` werfen seitdem `TypeError` ([7.1](#71-ungebundene-methoden-in-utils-kritisch)).
- **Das Kernversprechen hat kein Lieferstück:** Der Lesepfad vor dem ersten Paint braucht ein klassisches, blockierendes Skript. `@bunker/storage` ist aber ein ES-Modul mit Imports, und Modul-Skripte laufen immer verzögert ([7.2](#72-der-boot-pfad-existiert-nicht-als-code)).
- **Inkonsistente Fehlersemantik** zwischen den Drivern, und Tabellen mit `keyPath` lassen sich über die normale API gar nicht beschreiben.
- **Nicht veröffentlichbar** in der jetzigen Form: Pakete importieren einander über relative Pfade (`./../core/index.js`), und die Tests laufen nicht mit `npm install`.

| | Bewertung | kurz |
|---|---|---|
| Architektur | sehr gut | klare Schichten, Policy ohne Backend-Wissen, kleiner Driver-Vertrag |
| Code-Qualität | gut | knapp, gut kommentiert (das *Warum*), aber Sonderwege pro Paket |
| DX | befriedigend | gute Defaults und Doku; Proxy-Zucker uneinheitlich, implizite Tabellen riskant |
| Performance | gut, mit Lücken | klein (1,3 bis 2,7 kb pro Paket); Cursor statt `getAll`, Schleifen über einzelne Transaktionen, Puffern ganzer Responses |
| Robustheit | gut gedacht, aktuell gebrochen | ungebundene Methoden, `onblocked`, Cross-Tab-Kohärenz von L1, Races bei Revalidierung |
| Veröffentlichung | nicht bereit | relative Cross-Package-Imports, Workspace-Protokoll, keine CI |

---

## 2. Was bunker ist

### Die Aufteilung

| Paket | Backend | Kern | Größe |
|---|---|---|---|
| `@bunker/core` | – | Driver-Vertrag, Memory-Driver, Keyspaces, Codecs, Reports, Proxy | 1,4 kb |
| `@bunker/utils` | – | Emitter, Channel, LRU, memoize, once, lazy, Single Flight, Content Hash, Quota | 1,3 kb |
| `@bunker/storage` | `localStorage`, `sessionStorage` | synchron, Namespaces mit Version, Memory-Fallback | 1,8 kb |
| `@bunker/db` | IndexedDB | implizite Tabellen, Prefix-Scans, Kriterien, Change-Events über Tabs | 2,7 kb |
| `@bunker/cache` | Cache API | Stale-while-revalidate mit Transform, bedingte Revalidierung | 2,1 kb |
| `@bunker/opfs` | Origin Private File System | Dateien als Werte, Container für gemischte Werte | 2,1 kb |
| `@bunker/policy` | beliebiger Driver | TTL, Stale-Fenster, L1/L2, SWR, Prune | 2,1 kb |
| `@bunker/kit` | alle | vorverdrahtet unter einem Namespace | 8,1 kb |

### Schichten

```
utils
 └── core
      ├── storage, db, cache, opfs   each exports a driver
      └── policy                     takes a driver, knows none of them
kit                                  the only place that wires them
```

Der Driver-Vertrag ist das Zentrum:

```js
{ clear (), delete (key), get (key), keys (prefix), set (key, value) }   // all async
{ getSync, setSync, deleteSync, sync: true }                             // only storage and memory
```

Alles, was einen Driver liefert (`db.driver(table)`, `cache.driver()`, `opfs.driver()`, `storage` selbst), kann unter `policy` liegen. `withKeyspace` hängt Namespaces vor jeden Schlüssel, ohne dass ein Backend davon weiß.

### Wer es nutzt

aufbau verwendet bunker schon an fünf Stellen: `@bunker/storage` für `persist` in `@aufbau/element` und den Speicher `aufbau` in `@aufbau/signals`, `@bunker/cache` im Stylesheet-Client, im Service Worker (`aufbau-stylesheets`, `aufbau-fonts`) und im Docs-Builder. Fehler in `storage` und `cache` landen also direkt in aufbau.

---

## 3. Die Pakete

### `@bunker/core`

**Was es tut.** Driver-Vertrag und Prüfung (`isDriver`, `assertDriver`), `asyncDriver` (die async Methoden über einer synchronen Oberfläche), der Memory-Driver, `withKeyspace`, `createKeyspace` mit `encode`/`decode`/`owns`/`stale`, drei Codecs (`json`, `text`, `none`), `createReport` (Erfolg und Fehler melden statt werfen) und `proxyOf` (Property-Zucker).

**Gut.**
- Der Vertrag ist minimal und vollständig. Fünf Methoden reichen für Policy, Keyspaces und Tests.
- `NO_KEYSPACE` als Identität, die `withKeyspace` kurzschließt: kein Wrapper, wenn keiner gebraucht wird.
- Versionierte Keyspaces mit `stale()` machen „nach dem Deploy alles Alte weg“ zu einer Zeile. Der Test für `aufbau-docs` gegen `aufbau` zeigt, dass an die Präfix-Falle gedacht wurde.
- `createReport().over(open)` ist eine elegante Form für „Ressource lazy öffnen, Operation ausführen, Fehler melden, Fallback liefern“. Cache und OPFS teilen sich dadurch dieselbe Fehlerbehandlung.
- Ein kaputter JSON-Eintrag ist ein Miss, keine Exception.

**Schwach.**
- Der Vertrag sagt nichts über **Fehler**: Ob `set` bei einem Fehler ablehnt oder still auflöst, entscheidet jedes Backend selbst (siehe [4.2](#42-fehlersemantik)).
- Der Memory-Driver gibt Werte **per Referenz** zurück, IndexedDB und OPFS geben Kopien. Code, der auf dem Memory-Driver getestet ist, kann sich mit IndexedDB anders verhalten (Mutation eines gelesenen Werts verändert den Speicher).
- `withKeyspace` liefert bei synchronen Drivern `getSync`/`setSync`/`deleteSync`, aber nicht `keysSync`/`clearSync`/`hasSync`. Ein synchroner Driver mit Keyspace ist dadurch weniger als einer ohne.
- Codecs sind synchron. Das passt zu `storage`, schließt aber Kompression (`CompressionStream`) oder Verschlüsselung (`crypto.subtle`) für die async Backends aus.

### `@bunker/utils`

**Was es tut.** Prozesslokale Helfer ohne I/O: `createEmitter`, `createChannel` (Cross-Tab über `BroadcastChannel` oder das `storage`-Event), `lru`, `memoize` (abgelehnte Promises werden vergessen), `once` (async, Fehler werden vergessen), `lazy`, `createSingleFlight`, `contentHash`, `quota` (`estimate`, `persist`, `isUnderPressure`).

**Gut.** Klare Aufnahmeregel („kein I/O, nichts überlebt ein Reload“), eine Datei pro Helfer, einzeln importierbar. `memoize` und `once` vergessen Fehler, das ist für Loader genau richtig. `channel` verhält sich mit beiden Transporten gleich (nie an den Sender).

**Schwach.**
- **Akut kaputt** durch ungebundene Methoden, siehe [7.1](#71-ungebundene-methoden-in-utils-kritisch).
- `contentHash` ist ein 32-Bit-Hash über `[...text]`: Für einen Stylesheet von 200 kb entsteht dabei ein Array mit 200 000 Strings. Eine Schleife über `charCodeAt` ist schneller und allokiert nichts. Außerdem wird er nirgends in bunker benutzt, obwohl `cache` ihn bräuchte ([7.6](#76-onrevalidate-meldet-auch-unveränderte-werte)).
- `channel` mit `storage`-Fallback schreibt pro Nachricht zweimal synchron in `localStorage`. Da `BroadcastChannel` seit 2022 überall vorhanden ist, ist der Fallback toter Code mit Kosten in der Wartung.
- `policy` implementiert sein L1-LRU selbst, statt `lru` zu nutzen.

### `@bunker/storage`

**Was es tut.** `localStorage`/`sessionStorage` mit synchroner Oberfläche (`getSync`, `setSync`, `deleteSync`, `hasSync`, `keysSync`, `clearSync`, `sweepSync`), dem async Driver-Vertrag darüber, Namespaces mit Version, Codecs, Change-Events (lokale Schreibzugriffe und das `storage`-Event anderer Tabs in einem `subscribe`) und Proxy-Zucker unter `.proxy`.

**Gut.**
- Der Zweck ist klar benannt: das einzige Backend, das vor dem ersten Paint gelesen werden kann.
- Die Verfügbarkeit wird mit einem Schreibversuch geprüft (Safari im Privatmodus lieferte früher ein `localStorage`, das bei jedem Schreiben warf). Danach fällt alles still auf Memory zurück, mit `persistent: false` als ehrlicher Auskunft.
- Der Memory-Fallback teilt sich eine Map pro Bereich zwischen allen Instanzen, damit Namespaces und `sweepSync` auch ohne echten Speicher funktionieren. Das ist ein Detail, das leicht übersehen wird.
- `codecs.text` für Stylesheets spart das Escaping von JSON auf dem heißen Pfad.
- Die Proxy-Oberfläche liegt bewusst auf `.proxy`, damit ein Schlüssel `keys` keine Methode verdeckt.

**Schwach.**
- Der Boot-Pfad, für den das Paket existiert, ist mit dem Paket selbst nicht umsetzbar ([7.2](#72-der-boot-pfad-existiert-nicht-als-code)).
- Beim Import entstehen zwei Instanzen (`local`, `session`): ein Testschreiben in beide Bereiche und ein globaler `storage`-Listener, auch wenn niemand sie nutzt. `"sideEffects": false` in `package.json` stimmt damit nicht ganz.
- `setSync` gibt bei vollem Speicher `false` zurück, und das war es. Für Caches im Namespace (Stylesheets, Font-Metriken) wäre „älteste Einträge des eigenen Namespace löschen und einmal neu versuchen“ das nützlichere Verhalten (siehe [10.6](#106-quota-bewusstes-schreiben)).

### `@bunker/db`

**Was es tut.** IndexedDB ohne Zeremonie: Tabellen (Object Stores) entstehen beim ersten Schreiben, Lesen auf nicht vorhandenen Tabellen liefert leere Ergebnisse ohne Schema-Änderung. Einzel- und Sammeloperationen (`set`, `setMany`, `deleteMany`), Prefix-Scans über `IDBKeyRange`, Kriterien-Suche mit automatischer Index-Nutzung, `toggle` als Read-Modify-Write in einer Transaktion, `setup(schema)` idempotent, `onChange` lokal und über Tabs (`BroadcastChannel`), Zusammenfassen von Changes pro Microtask, ein Driver pro Tabelle. Dazu Proxy-Zucker direkt auf der Instanz: `db.users.get('ada')`, `await db.users.ada`, `db.users.ada = …`.

**Gut.** Das ist das sorgfältigste Paket. Vier Dinge, die bei rohem IndexedDB oft schiefgehen, sind richtig gelöst und in der Readme begründet:
- Upgrades laufen durch eine Warteschlange (`#lock`), gleichzeitige Erstanlagen von Tabellen können nicht ineinander laufen.
- `onversionchange` schließt die eigene Verbindung, damit andere Tabs upgraden können.
- Ein Schreibzugriff ist erst fertig, wenn die Transaktion committet ist (`oncomplete`), nicht schon bei `onsuccess` des Requests.
- Lesen ändert nie das Schema.

Dazu: Changes ohne Werte (klein über den Bus, Empfänger lesen neu), `origin` pro Instanz, Zusammenfassen pro Tabelle und Typ, `setMany` als eine Transaktion und ein Change.

**Schwach.**
- **Tabellen mit `keyPath` sind über die API nicht beschreibbar.** `set(table, key, value)` ruft immer `os.put(value, key)`. Bei einer Tabelle mit `keyPath` wirft IndexedDB dann einen `DataError` (ein expliziter Schlüssel ist dort verboten). Die Tests schreiben solche Datensätze deshalb über `task()`, und `task()` erzeugt keine Changes. `setup({ posts: { keyPath: 'id' } })` führt also in eine Sackgasse.
- **Zucker auf der Instanz** statt unter `.tables` oder `.table(name)`: Jede Tabelle, die wie eine Methode oder Eigenschaft heißt (`clear`, `delete`, `get`, `keys`, `name`, `version`, `origin`, `tables`, `setup`, `task`, `close`, `driver` …), ist über `db.<name>` nicht erreichbar. `storage` und `cache` haben genau dieses Problem mit `.proxy` gelöst; `db` macht es anders.
- **Ein Tippfehler legt eine Tabelle an:** `db.usres.set(…)` erzeugt `usres`, erhöht die Version und schließt dabei die Verbindungen aller anderen Tabs.
- **Strings sind mehrdeutig:** In `get` und `count` und `has` ist ein String ein Schlüssel, in `toKeys`/`toMap`/`toValues`/`toEntries` ein Präfix. `count('kv', 'css:')` zählt also den Schlüssel `css:`, `toKeys('kv', 'css:')` alles darunter.
- Veraltete Aliase (`getAll`, `keys`, `entries`, `find`) und doppelte Factories (`createDb`, `createDB`), obwohl laut Readme noch nichts veröffentlicht ist. `driver()` nutzt intern sogar den veralteten `keys`.
- `onblocked` wird als Fehler behandelt, ist aber keiner ([7.3](#73-onblocked-ist-kein-fehler)).

### `@bunker/cache`

**Was es tut.** Die Cache API für Fenster und Service Worker: `match`, `put`, `delete`, `keys`, `clear` und vor allem `staleWhileRevalidate(request, { transform, ttl, type, keepAlive, onRevalidate })`. Die Quelle wird optional transformiert (ASS → CSS) und das Ergebnis gespeichert. Validatoren der Quelle (`ETag`, `Last-Modified`) liegen in eigenen Headern, damit die Revalidierung nach der Quelle fragt, nicht nach dem transformierten Body. Dazu ein Driver über synthetische URLs.

**Gut.**
- Der stärkste fachliche Gedanke im Repo: Validatoren der Quelle getrennt vom transformierten Ergebnis speichern. Ohne das wäre eine bedingte Revalidierung nach einer Transformation nicht möglich.
- Bedingte Header nur bei gleichem Origin, weil `If-None-Match` nicht CORS-safelisted ist und einen Preflight erzwingen würde, den die Asset-Hosts nicht beantworten. Das ist aus der Praxis gelernt und im Code begründet.
- `keepAlive` für `event.waitUntil` im Service Worker, Single Flight pro URL, Schutz vor opaken Responses (`cache.put` lehnt Status 0 ab), Re-Read nach 304, weil der Body von `cached` schon beim Aufrufer sein kann.
- Ohne Cache API funktioniert `staleWhileRevalidate` weiter, nur ohne Speicher.

**Schwach.**
- Bei einem Miss wird die ganze Response gepuffert und in den Cache geschrieben, **bevor** sie zurückgegeben wird. Im Service Worker wartet der Browser dadurch auf Download plus Schreibvorgang, statt den Body zu streamen ([6.4](#64-cache-puffern-statt-streamen)).
- Bei einem 304 wird der ganze gespeicherte Body gelesen und neu geschrieben, nur um den Zeitstempel zu erneuern.
- `onRevalidate` meldet sich laut Readme „only when the body actually changed“. Das stimmt nur für 304. Ein Server ohne Validatoren (oder ein Cross-Origin-Host, bei dem bunker keine bedingten Header sendet) liefert 200 mit identischem Body, und `onRevalidate` feuert ([7.6](#76-onrevalidate-meldet-auch-unveränderte-werte)).
- Der Driver vermischt seine Einträge mit echten Responses im selben Cache ([7.5](#75-cachedriver-sieht-fremde-einträge-und-löscht-alles)).
- Bei einem Miss ohne Netz lehnt `staleWhileRevalidate` ab. Das ist im Service Worker richtig (Netzwerkfehler), widerspricht aber dem „nothing throws“ der Readme.

### `@bunker/opfs`

**Was es tut.** Ein Verzeichnis im OPFS als Key-Value-Store, ein Schlüssel ist eine Datei. Bytes (`Blob`, `File`, `ArrayBuffer`, Typed Arrays) werden roh geschrieben, alles andere in einen kleinen Container: Magic Bytes, JSON-Header, danach die Binärteile. Lesen liefert `File` oder `Blob`-Slices, ohne zu kopieren. Dateinamen bleiben lesbar (nur `%`, `/`, `\`, Steuerzeichen, `.` und `..` werden escapt). Fallback auf `createSyncAccessHandle` für ältere Safari-Versionen im Worker.

**Gut.**
- Das Container-Format ist durchdacht: `policy` kann `{ at, expire, value: Blob }` speichern, ohne Base64 und ohne zweiten Store. Gelesene Binärteile sind Slices der Datei auf der Platte.
- `.crswap`-Dateien (Chromes laufende Schreibvorgänge) werden ausgefiltert.
- `entries()` mit Größe und Änderungszeit, `size()` pro Präfix: genau das, was ein Thumbnail-Cache in zugriff braucht.

**Schwach.**
- Ein fehlgeschlagener `write` über `createWritable` ruft nie `writable.abort()`. Die Swap-Datei bleibt liegen und hält eine Sperre, bis der Garbage Collector sie freigibt.
- Zwei gleichzeitige `set()` auf denselben Schlüssel: Unter Safari mit `createSyncAccessHandle` wirft der zweite (exklusive Sperre), bei `createWritable` gewinnt der zuletzt geschlossene. Es fehlt eine Warteschlange pro Schlüssel.
- Der JSON-Container verliert, was IndexedDB über Structured Clone behält: `Date` wird zum String, `Map` und `Set` zu `{}`. Das steht nicht in der Readme.
- `entries()` ruft `getFile()` nacheinander für jede Datei.
- `driver().set` wirft bei Fehlern, die übrige API liefert `false`.

### `@bunker/policy`

**Was es tut.** TTL und Stale-Fenster über einem beliebigen Driver: Ein Eintrag ist frisch bis `expire`, danach stale bis `staleUntil`, danach tot. L1 im Speicher (LRU, `max`), L2 im Driver (`maxEntries`, durchgesetzt von `prune()`). `swr(key, fetcher)` liefert frisch, stale mit Revalidierung im Hintergrund oder wartet beim Miss. Single Flight pro Schlüssel, Namespaces mit Version.

**Gut.**
- Zwei Fenster statt einem: „wie lange vertrauen“ und „wie lange noch ausliefern“ getrennt.
- Die beiden Grenzen (`max` für L1, `maxEntries` für L2) sind mit Begründung getrennt, und eine Eviction aus L1 schreibt bewusst nicht nach L2 durch.
- Ein L2-Wert, der nicht wie ein Eintrag aussieht (alte Version, fremder Schreiber), ist ein Miss.
- `prune()` zählt eindeutige Schlüssel über beide Ebenen.

**Schwach.**
- **L1 ist nicht kohärent:** Schreibt ein anderer Tab (oder eine andere Instanz) denselben Schlüssel, behält dieser Tab den alten Wert in L1, bei `ttl: null` für immer ([7.4](#74-l1-der-policy-ist-nicht-kohärent)).
- **Race bei Löschen während der Revalidierung:** `delete` oder `clear` während eines laufenden `swr` wird vom späten `set` des Fetchers rückgängig gemacht ([7.7](#77-delete-während-revalidierung)).
- `onRevalidate` vergleicht mit `Object.is`. Für Objekte (also fast alles, was ein Fetcher liefert) ist das immer „anders“.
- `max: 0` heißt unbegrenztes L1. Mit einem OPFS-Driver hält jeder gelesene Eintrag seinen `Blob` dauerhaft im Speicher.
- `prune()` liest jeden Schlüssel einzeln, bei IndexedDB eine Transaktion pro Schlüssel.
- Kein `sweep` für alte Versionen des Keyspace, anders als `storage.sweepSync()`. Nach einem Versionssprung bleiben alte Einträge in L2 liegen, bis jemand sie per Hand löscht.

### `@bunker/kit`

**Was es tut.** `createBunker({ namespace, ttl, staleTtl, … })` liefert `db`, `cache`, `policy` (über IndexedDB), `local`, `session`, `core`, `utils`. Exportiert außerdem eine fertige Instanz `bunker`.

**Gut.** Die einzige Stelle, an der verdrahtet wird; alles andere bleibt entkoppelt. Ein Namespace für alles.

**Schwach.**
- `opfs` fehlt, obwohl die Haupt-Readme sagt „the six above, pre-wired“.
- Der Default-Export legt beim Import eine komplette Instanz an (Probe-Schreiben in beide Storage-Bereiche, globaler Listener). Wer nur `createBunker` importiert, bekommt das trotzdem.
- `onSuccess` wird nicht durchgereicht, `onError` nicht an `db` (das keinen Report kennt).
- Der Namespace steckt doppelt im IndexedDB-Pfad: als Datenbankname und als Schlüsselpräfix in `kv` (`bunker` → `bunker:v1:…`).

---

## 4. Code-Design

### 4.1 Was trägt

- **Schichten mit einer Richtung.** Nichts außer `kit` kennt mehr als `core` und `utils`. Die Policy kennt kein Backend.
- **Fähigkeiten über Form, nicht über Klassen.** `isDriver`, `isSyncDriver`, `sync: true`: ein Driver ist, was die Methoden hat. Das hält den Vertrag offen für Fremdes (ein Driver über `@aufbau/store`, über einen Worker, über ein Netzwerk).
- **Kommentare erklären Entscheidungen.** Fast jeder Kommentar beantwortet *warum* (warum `oncomplete`, warum kein bedingter Request Cross-Origin, warum L1 nicht nach L2 durchschreibt). Das ist die Art Kommentar, die bleibt.
- **Werfen ist die Ausnahme.** Stores melden über `onError`/`onSuccess` und geben einen Fallback zurück. Für Speicher, der jederzeit voll, gesperrt oder weg sein kann, ist das die richtige Grundhaltung.

### 4.2 Fehlersemantik

Die Grundhaltung „nie werfen“ ist nicht bis in den Driver-Vertrag durchgezogen:

| Driver | `set` bei Fehler | `get` bei Fehler |
|---|---|---|
| Memory | – | – |
| `storage` (async) | löst auf (der `false` von `setSync` geht in `asyncDriver` verloren) | `null` |
| `db.driver()` | lehnt ab | lehnt ab |
| `cache.driver()` | löst auf | `null` |
| `opfs.driver()` | wirft ausdrücklich | `null` |

`policy` umhüllt jeden L2-Aufruf mit `attempt`. Bei `storage` und `cache` sieht es einen Erfolg und meldet `onSuccess('set')`, obwohl nichts geschrieben wurde. Die Fehlermeldung kommt dann nur über das `onError` des Backends, falls dort eines gesetzt ist.

**Vorschlag:** Der Vertrag legt fest: *Driver-Methoden lehnen bei Fehlern ab.* Die Store-APIs darüber (`setSync`, `opfs.set`, `cache.put`) bleiben bei „nie werfen“. `asyncDriver` übersetzt `false` in eine Ablehnung, `cache.driver()` ebenso. Dann ist `policy` die einzige Stelle, die für Driver-Fehler zuständig ist, und `onSuccess` lügt nicht.

### 4.3 Zucker uneinheitlich

| | Zucker liegt auf | Schlüssel, die Methoden verdecken |
|---|---|---|
| `storage` | `.proxy` | keine |
| `cache` | `.proxy` | keine |
| `db` | der Instanz und jeder Tabelle | Tabellen und Schlüssel mit Methodennamen |

`db` erzeugt außerdem bei **jedem** Zugriff auf `db.users` ein neues Objekt mit 19 Closures und einen neuen Proxy. Und die Instanz selbst ist ein Proxy, der jeden Methodenaufruf über `bind` leitet.

**Vorschlag:** `db.tables.users` oder `db.table('users')`, gecacht pro Name, und die Instanz ohne Proxy. Das entfernt die Verdeckung, die Allokation pro Zugriff und das Binden pro Aufruf auf einmal. `db.users` kann als Alias bleiben, wenn gewünscht, aber nicht als einzige Form.

### 4.4 Rückgabewerte

`set` liefert `true/false` (`storage`, `opfs`), `undefined` (`db`), den Wert (`policy`). `delete` liefert `true/false`, `undefined` oder `boolean` je nach Paket. Für sich genommen ist jede Wahl begründbar, zusammen ist es eine Lernhürde. Eine Regel würde reichen: **Schreiben liefert `boolean` (ging es durch), Lesen den Wert oder `null`.** `policy.set` ist die Ausnahme, die man behalten kann (Wert zurück, für `swr`).

### 4.5 Namen

- Doppelte Factories: `createDb`/`createDB`, `createOpfs`/`createOPFS`.
- Veraltete Aliase in `db` vor der ersten Veröffentlichung.
- `*Sync` als Suffix ist gut, aber dann sollten `keysSync`, `clearSync`, `hasSync` überall da sein, wo `getSync` ist (siehe `withKeyspace`).
- `_/bunker.js` enthält einen alten Cookie-Helfer, der mit dem Rest nichts zu tun hat (siehe [10.3](#103-bunkercookie)).

---

## 5. DX

**Gut.**
- Die Haupt-Readme beantwortet zuerst die Frage, die man wirklich hat: *Welches Backend für was?* Die Tabelle (synchron, was es hält, Quota, Worker) und die Liste „Which one for what“ sind das Beste an der Doku.
- Jede Paket-Readme erklärt Fallstricke, nicht nur die API („What it gets right“, „Why synchronous is the point“).
- Gute Defaults: Namespaces optional, JSON-Codec, Memory-Fallback, keine Konfiguration für den häufigen Fall.
- `index.d.ts` ist vollständig und dokumentiert, Generics an den richtigen Stellen.

**Schwach.**
- **Stille Fehler per Default.** Ohne `onError` verschluckt jeder Store seine Fehler. Ein voller `localStorage` oder ein OPFS ohne Schreibrecht fällt in der Entwicklung nicht auf. Ein `debug`-Schalter oder ein Default-`onError`, das in der Entwicklung `console.warn` aufruft, würde viel Suche sparen.
- **Implizite Tabellen** sind bequem, aber jede neue Tabelle kostet ein Upgrade und unterbricht andere Tabs. Ein Schreibzugriff mit Tippfehler ist ein Schema-Wechsel.
- **Schema-Tabellen ohne Schreib-API** (`keyPath`).
- **`onChange` ohne Werte** ist für Cross-Tab richtig, für lokale Listener aber umständlich: Ein lokaler Schreibzugriff zwingt den eigenen Listener, neu zu lesen, was er gerade geschrieben hat. Optional die Werte bei lokalen Changes mitzugeben (nie über den Bus) würde das lösen.
- **Kein Weg von alt zu neu:** Ein Versionssprung im Keyspace verwirft alles. Für Caches richtig, für Einstellungen im `localStorage` (Theme, Layout) nicht. Es fehlt ein `migrate` (siehe [10.5](#105-migrationen-statt-verwerfen)).
- **Keine Brücke zu aufbau.** `@aufbau/signals/persistence.js` baut sich einen eigenen Adapter um `storage` (mit einem `MISS`-Sentinel), `@aufbau/store` erwartet `{ get, set, subscribe? }`. `storage` hat alle Teile, aber nicht in dieser Form (siehe [10.4](#104-adapter-für-aufbaustore-und-aufbausignals)).

---

## 6. Performance

Grundsätzlich: klein und ohne unnötige Arbeit auf den häufigen Pfaden. Die folgenden Punkte betreffen Mengen (viele Schlüssel, große Bodies).

### 6.1 `db`: Cursor statt `getAll`

`#scan` öffnet für jeden Prefix-Scan und jedes `toValues`/`toMap`/`toEntries` einen Cursor. Ein Cursor kostet pro Datensatz einen `onsuccess`-Callback und einen Rücksprung in die Engine. `getAll(range)` und `getAllKeys(range)` holen dasselbe in einem Request, bei Tausenden Einträgen um ein Vielfaches schneller.

```js
// without criteria: two requests in one transaction instead of one callback per record
const [keys, values] = await Promise.all([requestOf(os.getAllKeys(range)), requestOf(os.getAll(range))]);
```

Mit einem Kriterium auf einem Index ebenso: `os.index(name).getAll(IDBKeyRange.only(value))`. Der Cursor bleibt nur für Kriterien ohne Index und für `limit`.

### 6.2 Schleifen über einzelne Transaktionen

- `withKeyspace().clear()` holt alle Schlüssel und löscht dann jeden einzeln. Bei `db` sind das N Transaktionen und N Changes.
- `policy.prune()` liest jeden Schlüssel einzeln aus L2, nacheinander.
- `withKeyspace().keys()` filtert und dekodiert, das ist in Ordnung.

**Vorschlag:** optionale Driver-Fähigkeiten, erkannt wie `sync` heute (siehe [9.3](#93-optionale-driver-fähigkeiten)): `deletePrefix(prefix)` (bei IndexedDB ein einziges `os.delete(IDBKeyRange.bound(…))`), `entries(prefix)` (bei IndexedDB `getAll`). `withKeyspace` und `policy` nutzen sie, wenn vorhanden.

### 6.3 `db`: Change-Merge quadratisch

`#emit` hängt neue Schlüssel mit `held.keys = [...held.keys, ...change.keys]` an. Bei N Löschungen im selben Turn (genau der Fall aus 6.2) ist das O(N²). `held.keys.push(...change.keys)` genügt.

### 6.4 `cache`: Puffern statt Streamen

Bei einem Miss ohne `transform`:

```js
const stored = stamp(response, await response.clone().arrayBuffer(), meta);
await put(request, stored.clone());
return stored;
```

Der Aufrufer bekommt die Response erst, wenn sie ganz geladen **und** geschrieben ist. Im Service Worker blockiert das den Seitenaufbau für die Dauer von Download plus Cache-Schreiben, bei Fonts und großen Bildern spürbar. Besser:

```js
const stored = stamp(response, response.body, meta);        // a stream, not a buffer
const write  = put(request, stored.clone());                // runs in the background
keepAlive?.(write);
return stored;
```

`stamp` braucht dafür nur `new Response(body, …)` mit einem Stream statt eines Buffers.

**304:** Um den Zeitstempel zu erneuern, wird der gespeicherte Body ganz gelesen und neu geschrieben. Zwei günstigere Wege: den Zeitstempel nur erneuern, wenn `ttl` gesetzt ist (ohne `ttl` wird er nie gelesen), oder die Metadaten (Zeit, Validatoren, Hash) in einer kleinen eigenen Struktur halten (ein Eintrag pro URL in IndexedDB oder als JSON-Response unter einer Meta-URL) statt im Body-Eintrag.

### 6.5 Kleinere Punkte

- `contentHash` mit `[...text]` allokiert einen String pro Zeichen (siehe `utils`).
- `opfs.entries()` holt `getFile()` nacheinander; `Promise.all` über die Handles ist hier gefahrlos.
- `db`: Für Caches und abgeleitete Daten lohnt `durability: 'relaxed'` als Option beim Öffnen einer Transaktion: Der Commit wartet dann nicht auf das Flushen auf die Platte.
- `storage.keysSync` iteriert alle Schlüssel des Bereichs. Bei `localStorage` mit wenigen hundert Einträgen bedeutungslos.

---

## 7. Korrektheit und Robustheit

### 7.1 Ungebundene Methoden in `utils` (kritisch)

Die Commits `990f3cd` bis `9ca3666` vom 11.10. haben Pfeilfunktionen durch direkte Methodenreferenzen ersetzt:

```js
clear  : listeners.clear,     // emitter
has    : store.has,           // lru (also clear, delete, keys)
memoized.clear = store.clear; // memoize
run.abort = inflight.delete;  // singleFlight (also clear, has)
post   : channel.postMessage, // channel
```

Methoden eingebauter Objekte prüfen ihren Empfänger. Aufgerufen als `emitter.clear()` ist `this` das Rückgabeobjekt, nicht das `Set`, und es wirft:

```
emitter.clear()      TypeError: Method Set.prototype.clear called on incompatible receiver #<Object>
lru(2).has('a')      TypeError: Method Map.prototype.has called on incompatible receiver #<Object>
memoize(f, { max })  TypeError (first call, via lru.has)
memoize(f).clear()   TypeError
flight.abort(key)    TypeError: Method Map.prototype.delete called on incompatible receiver …
channel.post(x)      TypeError: Value of "this" must be of type BroadcastChannel
channel.close()      TypeError (via emitter.clear)
```

Folgen in den Paketen:
- `policy.delete()` und `policy.clear()` werfen (über `once.abort`/`once.clear`).
- `policy.get()`, `has()`, `entry()` und `swr()` werfen, sobald sie auf einen **toten** Eintrag treffen, weil `entry()` dann `remove()` aufruft. Jede Policy mit `ttl` wird damit nach Ablauf des Stale-Fensters unbrauchbar.
- `policy.prune()` wirft beim ersten toten Eintrag.
- `storage.dispose()` wirft.

Der Kommentar in `channel.js` (`// unbound, postMessage throws`) beschreibt genau den Fehler, der eine Zeile davor eingeführt wurde. Die Tests hätten das gefangen ([8](#8-tooling-tests-veröffentlichung)).

**Fix:** zurück zu den Pfeilfunktionen, oder `.bind(store)`:

```js
clear  : () => store.clear(),
delete : key => store.delete(key),
has    : key => store.has(key),
keys   : () => store.keys(),
```

### 7.2 Der Boot-Pfad existiert nicht als Code

Die Haupt-Readme und `storage` begründen sich mit dem Lesen vor dem ersten Paint: „A blocking classic script over `@bunker/storage` … reads synchronously in `<head>` and appends a `<style>` before the parser reaches the `<link>`.“

Ein klassisches Skript kann kein `import` ausführen. Ein `<script type="module">` (auch inline) ist immer *deferred* und läuft erst nach dem Parsen, also nach dem ersten Paint. `@bunker/storage` ist ein ES-Modul mit drei Imports. Es gibt im Repo kein Snippet, keinen IIFE-Build und keine Funktion, die den Boot-Teil liefert. Wer den Weg gehen will, muss das Schlüsselformat (`namespace:vN:key`) und den Codec von Hand nachbauen. Bei einer Änderung am Format brechen beide Seiten auseinander, ohne dass ein Test es bemerkt.

**Vorschlag:** siehe [9.2](#92-storageboot).

### 7.3 `onblocked` ist kein Fehler

`#open` und `destroy` lehnen ab, sobald `onblocked` feuert. Laut Spezifikation heißt `blocked` aber nur: „Eine andere Verbindung hat sich nach dem `versionchange`-Event noch nicht geschlossen.“ Der Request läuft weiter und gelingt, sobald sie es tut. Das passiert, wenn eine fremde Verbindung auf dieselbe Datenbank offen ist (anderer Code, eine ältere bunker-Version in einem anderen Tab, DevTools).

Folge heute: Der Aufrufer bekommt einen Fehler („upgrade blocked“), aber der Request gelingt etwas später trotzdem, `onsuccess` setzt `this.#db`, und die Tabelle existiert. Der Schreibzugriff, der das Upgrade ausgelöst hat, ist verloren, obwohl alles Nötige da wäre. Bei `destroy` ebenso: Der Aufrufer hört „blockiert“, die Datenbank wird danach trotzdem gelöscht.

**Fix:** `blocked` melden (`onBlocked` oder über einen Report) und weiter warten, optional mit Timeout, nach dem dann wirklich abgelehnt wird.

### 7.4 L1 der Policy ist nicht kohärent

`policy` liest aus L1, wenn der Schlüssel dort ist, und fragt L2 dann nie. Schreibt ein anderer Tab (oder eine zweite Policy-Instanz im selben Tab) denselben Schlüssel, sieht dieser Tab den alten Wert, bis er in L1 abläuft. Bei `ttl: null` (dem Default) läuft er nie ab.

Die Backends haben die Information: `db.onChange` meldet Änderungen aus anderen Tabs, `storage.subscribe` ebenso. Nur der Driver-Vertrag kennt sie nicht.

**Fix:** optionale Fähigkeit `subscribe(listener)` im Driver ([9.3](#93-optionale-driver-fähigkeiten)). `policy` wirft bei einer fremden Änderung die betroffenen Schlüssel aus L1. `db.driver(table)` leitet aus `onChange` ab, `storage` aus `subscribe`.

### 7.5 `cache.driver()` sieht fremde Einträge und löscht alles

Der Driver legt Werte unter `https://bunker.invalid/<key>` im selben Cache ab, den auch `staleWhileRevalidate` benutzt. Dabei:

- `keys()` mappt **alle** Requests des Caches, auch echte Stylesheets: `https://example.com/app.css` wird zum Schlüssel `app.css`.
- `clear()` ruft `caches.delete(name)` und löscht damit den ganzen Cache, auch alle Responses.

**Fix:** `keys()` filtert auf `origin`, `clear()` löscht nur die eigenen URLs. Oder der Driver bekommt einen eigenen Cache-Namen (`${name}:kv`).

### 7.6 `onRevalidate` meldet auch unveränderte Werte

- `cache`: Ohne Validatoren (oder Cross-Origin, wo bunker keine bedingten Header sendet) antwortet der Server mit 200 und dem gleichen Body. `onRevalidate` feuert, der Aufrufer tauscht ein Stylesheet gegen sich selbst und löst einen Reflow aus. `utils/hash.js` wurde laut eigenem Kommentar genau dafür geschrieben, wird aber nicht benutzt.
- `policy`: `Object.is(fresh, found.value)` ist für jedes Objekt aus einem Fetcher `false`.

**Fix:** In `cache` einen Header `x-bunker-hash` speichern (Hash über den Body nach der Transformation) und `onRevalidate` nur bei abweichendem Hash rufen. In `policy` eine Option `equals` (Default: `Object.is` für Primitive, sonst Vergleich der JSON-Form oder `contentHash`).

### 7.7 `delete` während Revalidierung

```js
cache.swr('k', slowFetch);   // stale: revalidation starts
await cache.delete('k');     // removes l1, l2, and the in-flight entry
// slowFetch resolves -> set('k', fresh) -> the key is back
```

`once.abort(key)` entfernt nur den Eintrag aus der Map, der laufende Fetch schreibt danach trotzdem. Dasselbe bei `clear()`. Für einen Cache, der nach einem Logout geleert wird, ist das ein echtes Problem (Daten des alten Nutzers kommen zurück).

**Fix:** eine Generation pro Schlüssel (und eine globale für `clear`). `set` aus einer Revalidierung schreibt nur, wenn die Generation beim Start noch gilt.

```js
const generation = new Map;
let   epoch      = 0;

const stamp = key => `${epoch}:${generation.get(key) ?? 0}`;
const bump  = key => generation.set(key, (generation.get(key) ?? 0) + 1);

// in swr
const started = stamp(key);
const fresh   = await fetcher(key);
if (stamp(key) === started) await set(key, fresh, overrides);
```

### 7.8 Kleinere Punkte

- **`db`, Verbindung zwischen `await` und `transaction()` geschlossen:** Schließt ein Upgrade in einem anderen Tab die Verbindung genau zwischen `#getDB` und `db.transaction()`, wirft `InvalidStateError`. Selten, aber ein Wiederholungsversuch in `task` kostet eine Zeile.
- **`opfs`:** kein `abort()` nach fehlgeschlagenem Schreiben, keine Serialisierung pro Schlüssel (siehe 3).
- **Memory-Driver per Referenz** (siehe `core`).
- **`proxyOf`:** `String(store.proxy)` wirft, weil `toString` als Schlüssel gelesen wird. Für Zucker vertretbar, ein Satz in der Readme genügt.
- **`storage`:** Ein gespeichertes `null` ist beim Lesen nicht von „fehlt“ zu unterscheiden. Dokumentiert, aber `@aufbau/signals` umgeht es bereits mit einem Sentinel. Ein `getSync(key, MISS)` mit eigenem Sentinel ist die saubere Form; das könnte die Readme als Muster zeigen.

---

## 8. Tooling, Tests, Veröffentlichung

**Gut.** Für Node gibt es einfache, lesbare Smoke-Tests pro Paket, mit `fake-indexeddb` und Helfern für Cache API und OPFS, `storage` zweimal (Memory und Node-Webstorage). `deno.json` mit `check`, `lint`, `fmt`, `publish:dry`. Die Tests prüfen gezielt die heiklen Fälle (Präfix-Falle bei Namespaces, Idempotenz von `setup`, Versionssprung).

**Schwach.**
- **Cross-Package-Imports sind relativ:** `import … from './../core/index.js'; // from '@bunker/core'`. Einzeln veröffentlicht (npm oder JSR) existiert `../core` im Paket nicht, jedes Paket außer `core` und `utils` bricht. In `kit` steht die richtige Form auskommentiert darüber.
- **Die Tests laufen nicht mit npm:** `workspace:*` kennt npm nicht, `npm install` verlinkt die Pakete nicht, `test/core.test.mjs` scheitert an `Cannot find package '@bunker/core'`. Mit bun oder pnpm geht es, aber das steht nirgends, und `bun.lock` ist in `.gitignore`.
- **Keine CI.** Die Commits vom 11.10. sind ohne einen Testlauf auf `main` gelandet.
- Die Tests prüfen keinen Fehlerpfad der Policy mit totem Eintrag (der Bug aus 7.1 hätte dort sofort gezeigt).

**Vorschlag:**
1. Bare Specifier überall (`@bunker/core`), Auflösung im Repo über die Workspaces (bun/pnpm/deno) und im Browser über eine Import Map.
2. `test/run.sh` dokumentiert, womit es läuft, oder `deno test` (Deno löst Workspace-Mitglieder über den Namen in `deno.json` auf, ohne Installation).
3. Eine GitHub Action, die `run.sh` und `deno check` bei jedem Push ausführt.

---

## 9. Vorschläge

### 9.1 `utils` reparieren und absichern

Die Pfeilfunktionen zurück (7.1), dazu ein Test pro Helfer, der jede zurückgegebene Methode einmal aufruft. Das ist die Art Fehler, die ein Linter nicht findet und ein einzeiliger Test sofort.

### 9.2 `storage/boot`

Ein eigener Export, der die Lücke aus 7.2 schließt: Er erzeugt den Quelltext eines klassischen Inline-Skripts aus denselben Konstanten, die `createKeyspace` und die Codecs benutzen.

```js
import { bootScript } from '@bunker/storage/boot';

// at build time or on the server
const head = `<script>${bootScript({
  namespace : 'aufbau',
  version   : 2,
  styles    : ['css/critical'],                 // text codec, appended as <style>
  attrs     : { theme: 'data-theme' },          // json codec, set on <html>
})}</script>`;
```

Erzeugt wird ein IIFE ohne Imports, ein paar hundert Bytes:

```js
(function () {
  try {
    var ls = localStorage, root = document.documentElement, p = 'aufbau:v2:';
    var css = ls.getItem(p + 'css/critical');
    if (css) { var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style); }
    var theme = JSON.parse(ls.getItem(p + 'theme'));
    if (theme != null) root.setAttribute('data-theme', theme);
  } catch (e) {}
})();
```

Die Schlüssel kommen aus `createKeyspace`, damit Format und Snippet nie auseinanderlaufen. Ein Test vergleicht, was `setSync` schreibt, mit dem, was das Snippet liest. zugriff löst dasselbe heute in `boot.js` und `middleware.js` mit eigenem Code; beide könnten darauf aufsetzen.

### 9.3 Optionale Driver-Fähigkeiten

Der Vertrag bleibt bei fünf Pflichtmethoden. Dazu kommen optionale, erkannt wie `sync`:

```js
{
  // required
  clear, delete, get, keys, set,

  // optional, used when present
  subscribe    (listener)  -> unsubscribe   // { keys, origin } on foreign changes (7.4)
  deletePrefix (prefix)    -> Promise        // one range delete instead of n deletes (6.2)
  entries      (prefix)    -> Promise<[key, value][]>   // bulk read for prune (6.2)
  getMany      (keys)      -> Promise<value[]>
}
```

`withKeyspace` reicht sie mit Präfix weiter. `policy` nutzt `subscribe` für L1, `deletePrefix` für `clear` und `entries` für `prune`. `db.driver(table)` bekommt alle vier fast geschenkt (`onChange`, `IDBKeyRange`, `getAll`), `storage` immerhin `subscribe`.

### 9.4 `db`: Tabellen sauber adressieren und `keyPath` unterstützen

```js
const db    = createDb('zugriff', { schema: { posts: { keyPath: 'id', indexes: ['author'] } }, implicit: false });
const posts = db.table('posts');           // cached, no proxy needed

await posts.add({ id: 'p1', author: 'ada' });   // keyPath: the key comes from the record
await posts.set('p1', { … });                   // keyPath: the key must match, else an error
await posts.byPrefix('2026-');                  // explicit, instead of a string meaning two things
```

- `set`/`setMany` prüfen `os.keyPath`: mit `keyPath` wird `put(value)` ohne Schlüssel aufgerufen.
- `implicit: false` verbietet das Anlegen beim Schreiben; ein Tippfehler wird zum Fehler statt zum Upgrade.
- `get(key)` ist immer ein Schlüssel, ein Präfix immer `{ prefix: 'css:' }` oder eine eigene Methode. Das beseitigt die Mehrdeutigkeit aus 3.
- `db.users` kann als Zucker bleiben, aber als Alias auf `db.table('users')` und nur für Namen, die keine Methode sind.

### 9.5 Einheitliche Fehlersemantik

Wie in 4.2: Driver lehnen ab, Stores werfen nie. Dazu ein `debug`-Schalter (oder `onError` mit Default `console.warn`, wenn `globalThis.process?.env?.NODE_ENV !== 'production'` oder ein ähnliches Signal), damit Fehler in der Entwicklung sichtbar sind.

### 9.6 `cache`: streamen, hashen, Metadaten trennen

- Miss: Body streamen, Schreiben im Hintergrund (6.4).
- `x-bunker-hash` speichern, `onRevalidate` nur bei Änderung (7.6).
- 304 ohne `ttl`: nichts neu schreiben.
- Driver in einen eigenen Cache-Namen (7.5).

### 9.7 `policy`: Generationen, `equals`, `sweep`, L1 begrenzen

- Generation pro Schlüssel gegen das Wiederauferstehen nach `delete` (7.7).
- `equals` für `onRevalidate` (7.6).
- `sweep()` analog zu `storage.sweepSync()`: alte Versionen des Keyspace in L2 löschen, mit `deletePrefix`, wenn vorhanden.
- `max` mit einem sinnvollen Default (etwa 500) statt unbegrenzt, mindestens wenn der Driver Blobs hält.
- L1 über `utils/lru` statt eigener Implementierung.

### 9.8 `opfs`: Sperre pro Schlüssel, `abort`

```js
const queue = new Map;   // key -> promise of the last write

const serialized = (key, task) => {
  const next = (queue.get(key) ?? Promise.resolve()).then(task, task);
  queue.set(key, next.finally(() => { if (queue.get(key) === next) queue.delete(key); }));
  return next;
};
```

Und im `write`: `try { await writable.write(data); await writable.close(); } catch (error) { await writable.abort().catch(() => {}); throw error; }`.

---

## 10. Erweiterungen

### 10.1 Single Flight über Tabs mit Web Locks

`createSingleFlight` verhindert doppelte Fetches pro Tab. Drei offene Tabs revalidieren denselben Schlüssel aber dreimal. `navigator.locks.request(name, { ifAvailable: true }, …)` macht daraus einen pro Origin: Wer die Sperre nicht bekommt, wartet auf den `onChange`/`subscribe` des Gewinners statt selbst zu holen. Passt als Option in `policy.swr` und `cache.staleWhileRevalidate` (`shared: true`).

### 10.2 Async Codecs

Für `db`, `opfs` und `cache` dürfen Codecs async sein: `gzip` über `CompressionStream` für große Texte (kompiliertes CSS, Datensätze), `encrypt` über `crypto.subtle` für sensible Daten. `storage` bleibt bei synchronen Codecs, die Unterscheidung ist dieselbe wie bei den Drivern.

### 10.3 `@bunker/cookie`

Der Cookie ist das einzige Speichermedium, das der **Server** sieht. Das ist genau die Art Eigenschaft, nach der bunker trennt. zugriffs `middleware.js` liest die Gestalt einer App aus dem Cookie `zugriff-gestalt`, um sie vor dem ersten Paint ins HTML zu schreiben. `_/bunker.js` enthält schon einen Cookie-Helfer. Ein eigenes Paket:

- synchron lesen über `document.cookie` (wie `storage`), async schreiben und beobachten über die Cookie Store API, wo vorhanden (`cookieStore.set`, `change`-Events),
- dieselben Keyspaces und Codecs, mit Längenprüfung (4 kb pro Cookie),
- `SameSite`, `Secure`, `Path`, `Max-Age` als Optionen statt Strings,
- ein Driver, damit `policy` darüber laufen kann (für kleine, servernahe Werte).

### 10.4 Adapter für `@aufbau/store` und `@aufbau/signals`

`@aufbau/store` nimmt als `persist` ein `{ get, set, subscribe? }`. `@aufbau/signals` baut sich denselben Adapter selbst. `storage` könnte ihn liefern:

```js
const persist = createStorage({ namespace: 'aufbau' }).adapter();
// { get: key => getSync(key, MISS) mapped to undefined, set: setSync, subscribe: remote changes only }
```

Dann verschwinden die Sonderfälle in `@aufbau/signals/persistence.js`, und Änderungen aus anderen Tabs kommen über `subscribe` automatisch im Store an.

### 10.5 Migrationen statt Verwerfen

```js
createStorage({
  namespace : 'zugriff',
  version   : 3,
  migrate   : { 2: (value, key) => key === 'layout' ? { ...value, density: 'normal' } : value },
});
```

Beim ersten Lesen eines Schlüssels, der nur in einer älteren Version existiert, läuft die Kette der Migrationen bis zur aktuellen Version, das Ergebnis wird unter dem neuen Schlüssel gespeichert und der alte gelöscht. Ohne Migration für eine Version bleibt es beim heutigen Verhalten (verwerfen). Für `policy` braucht es das nicht, Caches dürfen verworfen werden.

### 10.6 Quota-bewusstes Schreiben

`storage.setSync(key, value, { evict: true })`: Bei `QuotaExceededError` die ältesten Einträge **des eigenen Namespace** löschen (dafür ein Zeitstempel pro Eintrag, oder einfach in der Reihenfolge von `keysSync`) und einmal neu versuchen. Für die Async-Backends: `policy` ruft bei einer Ablehnung wegen Quota `prune()` und versucht es erneut. `quota.isUnderPressure()` existiert schon und könnte `prune()` beim Start auslösen.

### 10.7 Inspektion

Eine kleine Funktion `inspect()` in `kit`: pro Namespace und Backend Anzahl, Größe (`opfs.size`, `quota.estimate()` mit `usageDetails`, wo vorhanden), alte Versionen, die `sweep` löschen würde. Als Grundlage für ein Panel in `@aufbau/devtools`.

---

## 11. Prioritäten

| # | was | warum jetzt | Aufwand |
|---|---|---|---|
| 1 | `utils` reparieren (7.1) | `policy`, `channel`, `memoize` und `storage.dispose()` werfen | Minuten |
| 2 | CI mit den bestehenden Tests, Tests mit npm lauffähig (8) | hätte 1 verhindert | klein |
| 3 | `onblocked` warten statt ablehnen (7.3) | verlorene Schreibzugriffe | klein |
| 4 | `keyPath` in `set`/`setMany` (9.4) | `setup` mit `keyPath` ist sonst eine Sackgasse | klein |
| 5 | `cache.driver` trennen (7.5) | `clear()` löscht alle Stylesheets | klein |
| 6 | Generationen in `policy` (7.7) | Daten kommen nach `clear` zurück | klein |
| 7 | `storage/boot` (9.2) | das Kernversprechen bekommt Code | mittel |
| 8 | Fehlersemantik des Vertrags (4.2, 9.5) | `onSuccess` meldet heute fehlgeschlagene Schreibzugriffe | mittel |
| 9 | Bare Specifier, Veröffentlichung (8) | Voraussetzung für npm/JSR | mittel |
| 10 | Driver-Fähigkeiten, L1-Kohärenz (9.3, 7.4) | Cross-Tab-Korrektheit und Performance bei Mengen | mittel |
| 11 | Streaming und Hash in `cache` (9.6) | Zeit bis zur ersten Response im Service Worker | mittel |
| 12 | `db.table()`, `implicit: false`, Präfix explizit (9.4) | DX, Tippfehler als Schema-Änderung | mittel |
| 13 | Erweiterungen (10) | nach Bedarf, `cookie` und der aufbau-Adapter zuerst | je klein bis mittel |
