# Datastar

Ein „Hypermedia-Framework“: Reaktivität im Browser über `data-*`-Attribute (Signals wie bei [Alpine](https://alpinejs.dev)) und Server-Updates über Server-Sent Events, mit denen der Server HTML-Fragmente und Signal-Werte in die Seite schiebt. Von Delaney Gillilan, seit September 2023 (zuerst als `@sudodevnull/datastar`), heute getragen von der gemeinnützigen Star Federation. Version 1.0 im April 2026 nach langer Beta- und RC-Phase; aktuell 1.0.4 (September 2026), aktiv. Ein Teil der Funktionen steckt in einer kostenpflichtigen „Pro“-Ausgabe.

- Website: https://data-star.dev
- Repository: https://github.com/starfederation/datastar
- Laufzeit: ein Skript, `<script type="module" src="…/datastar.js">`; nicht auf npm aktuell, sondern über das Repository und CDNs
- Server-SDKs: Go, Python, TypeScript, PHP, Ruby, Rust, Zig, Java, C#, Clojure, Haskell
- Build: keiner

## Das Problem, das Datastar löst

[htmx](htmx.md) holt HTML vom Server und setzt es ein, lässt aber alles Clientseitige offen: Für ein Dropdown, eine Zeichenanzeige, ein abhängiges Formularfeld braucht man zusätzlich Alpine oder [_hyperscript](hyperscript.md). Und htmx denkt in Request/Response: Ein Klick, eine Antwort, ein Ziel.

Datastar vereint beides in einem Skript: **Signals im Markup** für den lokalen Zustand und **ein Server, der jederzeit streamen kann**. Die Antwort auf einen Request ist kein einzelnes Fragment, sondern ein SSE-Strom, der beliebig viele Elemente an beliebigen Stellen patcht und Signals setzt, sofort oder über Minuten (Fortschritt, Chat, Live-Dashboards, Multiplayer). Der Server bleibt die Quelle der Wahrheit, das Frontend wird dünn.

## Kernkonzepte

### 1. Signals im Markup

```html
<div data-signals="{ count: 0, user: { name: '' } }">
  <input data-bind:user.name>
  <p data-text="`hallo ${$user.name}`"></p>
  <button data-on:click="$count++">+1</button>
  <span data-text="$count" data-show="$count > 0"></span>
</div>
```

`data-signals` legt Signals an (verschachtelt über Pfade), `$name` liest und schreibt sie in Ausdrücken. `data-bind` bindet beidseitig, `data-text`, `data-show`, `data-class`, `data-attr` und `data-style` binden in eine Richtung. Ausdrücke sind JavaScript. Seit RC.6 trennt ein Doppelpunkt Attribut und Argument (`data-on:click`, früher `data-on-click`).

### 2. Abgeleitete Werte und Effekte

```html
<div data-computed:total="$price * $quantity"></div>
<div data-effect="localStorage.cart = JSON.stringify($cart)"></div>
<div data-init="@get('/feed')"></div>
<div data-on-intersect="@get('/more')"></div>
<div data-on-interval__duration.5s="@get('/status')"></div>
```

Dieselben drei Bausteine wie jedes Signal-System ([reactivity.md](../reactivity.md)), nur als Attribute. Modifier hängen mit `__` an: `data-on:input__debounce.300ms`, `data-on:click__once__prevent`, `data-on:keydown__window`, `data-on:click__outside`.

### 3. Aktionen: Requests mit allen Signals

```html
<button data-on:click="@post('/todos')" data-indicator:saving>speichern</button>
<span data-show="$saving">…</span>
```

`@get`, `@post`, `@put`, `@patch`, `@delete` (und seit 1.0.4 `@query` für die neue HTTP-Methode `QUERY`) schicken **alle Signals** als JSON mit (bei `GET` als Query-Parameter `datastar`). Signals, deren Name mit `_` beginnt, bleiben lokal. Der Server bekommt damit den gesamten Client-Zustand, ohne dass ein Formular ihn einsammeln muss. `data-indicator` setzt ein Signal, solange der Request läuft.

### 4. Die Antwort: ein Strom von Patches

```
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: datastar-patch-elements
data: elements <div id="todos">…</div>

event: datastar-patch-elements
data: selector #count
data: mode inner
data: elements 3 offen

event: datastar-patch-signals
data: signals {"saving": false, "draft": ""}
```

Zwei Ereignisse decken fast alles ab: **`patch-elements`** setzt HTML ein (standardmäßig per Morphing an das Element mit derselben Id; Modi `outer`, `inner`, `replace`, `prepend`, `append`, `before`, `after`, `remove`), **`patch-signals`** setzt Signals per JSON Merge Patch (`null` löscht). Die Verbindung kann offen bleiben und später weitere Ereignisse schicken; bricht sie ab, verbindet Datastar sich mit Backoff neu. Eine Antwort darf auch schlicht `text/html`, `application/json` oder `text/javascript` sein.

### 5. Morphing statt Ersetzen

Eingesetztes HTML wird nicht per `innerHTML` getauscht, sondern mit einer eigenen Portierung von idiomorph gemorpht ([morphdom.md](morphdom.md)), mit `moveBefore`, wo der Browser es kennt. Der Server darf deshalb großzügig große Teile neu schicken („fat morph“): Fokus, Eingaben und Scroll-Positionen bleiben, solange Ids stimmen. Das Muster der Datastar-Leute: ein langlebiger SSE-Strom, über den der Server bei jeder Änderung die ganze Ansicht neu rendert und schickt.

### 6. Rocket: Komponenten

Rocket (seit 1.0.4 im freien Bundle, vorher Pro) definiert Web Components, deren Template und Zustand in Datastar-Attributen geschrieben sind, mit typisierten Props über Codecs. Für die Fälle, in denen ein Stück UI wirklich clientseitig gekapselt sein muss.

### 7. CSP-Modus

Ausdrücke werden mit `Function(...)` compiliert, was `unsafe-eval` verlangt. Seit 1.0.3 gibt es einen CSP-Modus: Steht ein `nonce` am `<html>`, schreibt Datastar jeden Ausdruck als Funktion in ein `<script>` mit diesem Nonce (über Trusted Types, wo vorhanden) und holt sie von dort ab. Das ist erlaubt, weil die Seite dem Nonce vertraut; es heißt aber auch, dass jeder Ausdruck im Markup mit vollen Rechten läuft.

## Wie es intern arbeitet

Der Kern ist eine kleine Plugin-Engine: Ein `MutationObserver` findet `data-*`-Attribute, zerlegt sie in Name, Argument (`:click`) und Modifier (`__debounce.300ms`) und gibt sie an das Plugin dieses Namens. Ausdrücke werden einmal compiliert (Cache pro Ausdrucks-String), `$name` wird dabei auf einen Pfad in einem globalen, tiefen Signal-Baum umgeschrieben. Der Signal-Kern ist eine Portierung von [alien-signals](alien-signals.md) (dieselben Links, Flags und `checkDirty`), darüber ein Proxy, der verschachtelte Objekte zu Signals pro Blatt macht.

`@post` und Co. laufen über `fetch` mit einem eigenen SSE-Parser (nicht `EventSource`, damit `POST`, Header und Body möglich sind). Jedes Ereignis geht an einen „Watcher“: `patchElements` parst das Fragment und morpht es ein, `patchSignals` wendet den Merge Patch auf den Signal-Baum an, was wiederum die gebundenen Attribute aktualisiert.

Größe: 13,0 kb für alles, der Kern ohne Plugins 4,7 kb, mit Rocket 22,9 kb.

## Stärken und Schwächen

- **Stark:** ein Skript für lokale Reaktivität und Server-Updates. SSE als Normalfall macht Echtzeit (Streams, Fortschritt, Kollaboration) zum selben Mechanismus wie einen Klick. Morphing macht große Server-Updates billig für den Entwickler. Server-SDKs für viele Sprachen, schnelle Signals, kein Build.
- **Schwach:** Logik in Attribut-Strings, die kein Werkzeug prüft (dieselbe Schwäche wie htmx und Alpine). Alle Signals bei jedem Request zu schicken ist bequem, kann aber groß werden und leakt leicht Zustand, der nicht zum Server soll (Konvention `_`). Lange Beta mit vielen brechenden Umbenennungen; einige Funktionen nur in Pro (kommerzielle Lizenz). Jede Interaktion mit Server-Logik braucht Netz; offline nichts.

## Für rat und aufbau

- **Das SSE-Protokoll ist der interessanteste Teil.** Zwei Ereignisse (`patch-elements`, `patch-signals`) reichen für eine Server-gesteuerte UI. Für rat wäre ein Gegenstück denkbar, das statt Fragmenten **Signal-Patches** empfängt: Der Server schickt `{ "todos": […] }`, ein Store in `@rat/runtime` übernimmt die Werte per Merge Patch, und rats feingranulare Bindungen erledigen den Rest. Weniger Bytes als HTML, und das Markup bleibt im Client (Vorschlag, etwa als `@rat/stream`).
- **Signal-Pfade (`$user.name`) als ein tiefer Baum** sind die Datastar-Antwort auf d-23: Jedes Blatt ist ein eigenes Signal, Zuweisung an einen Pfad ist reaktiv. Gleiche Kosten wie bei [MobX](mobx.md) (Proxy, Identität), aber mit sichtbarem `$`, also rats Sichtbarkeitsregel.
- **Modifier-Syntax** (`__debounce.300ms`, `__once`, `__outside`, `__window`) ist eine weitere Vorlage für rats Event-Modifier neben htmx' Trigger-Sprache und Vue. `__outside` fehlt in rat und wird ständig gebraucht (Menüs, Popover ohne Popover-API).
- **`data-indicator`** (ein Signal, solange ein Request läuft) ist klein und nützlich, als Behavior in rat (`use:pending={$saving}`) oder als Attribut in aufbau.
- **Merge Patch als Update-Format** (RFC 7396) passt auch zu `@aufbau/store`: `store.patch({ zoom: 120, title: null })` statt mehrerer `set`-Aufrufe, in einer Transaktion, mit `null` als Zurücksetzen (Vorschlag).
- **zugriff** ist offline-first; Datastars Modell (Zustand auf dem Server) passt dort nicht. Übertragbar sind die Attribute und das Patch-Format, nicht der Transport, wie bei [htmx](htmx.md).
