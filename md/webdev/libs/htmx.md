# htmx

Eine kleine Bibliothek (rund 14 kb), die HTML um Attribute erweitert, damit jedes Element einen HTTP-Request machen und die Antwort (HTML, kein JSON) in die Seite setzen kann. „HTML over the wire". Nachfolger von intercooler.js, erschienen 2020.

- Website: https://htmx.org
- Schwesterprojekt: [_hyperscript](hyperscript.md)
- Build: keiner nötig

## Das Problem, das htmx löst

Für viele Anwendungen ist eine Single-Page-App zu viel: eine JSON-API, ein Client-Framework, Zustand doppelt auf Client und Server. htmx sagt: Der Server rendert HTML wie eh und je, und auf der Seite wird nur der Teil getauscht, der sich geändert hat.

## Kernkonzepte

### 1. Jedes Element kann einen Request machen, mit jeder Methode

```html
<button hx-post="/clicked" hx-target="#result" hx-swap="innerHTML">
  klick mich
</button>
<div id="result"></div>
```

Ein Klick schickt `POST /clicked`. Der Server antwortet mit einem Stück HTML, das den Inhalt von `#result` ersetzt. Kein selbst geschriebenes JavaScript.

### 2. Trigger: wann der Request passiert

```html
<input name="q" hx-get="/search" hx-trigger="keyup changed delay:300ms" hx-target="#hits">
<div hx-get="/news" hx-trigger="every 30s"></div>
<div hx-get="/more" hx-trigger="revealed"></div>       <!-- once it scrolls into view -->
```

`keyup changed delay:300ms`: bei keyup, nur wenn sich der Wert geändert hat, mit 300 ms Debounce. Eine kleine Sprache in einem einzigen Attribut.

### 3. Targets und Swaps: wohin die Antwort kommt

```html
hx-target="#hits"                     <!-- a css selector -->
hx-target="closest tr"                <!-- relative: the nearest tr upwards -->
hx-swap="outerHTML"                   <!-- replace the target itself -->
hx-swap="beforeend"                   <!-- append (endless lists) -->
hx-swap="innerHTML transition:true"   <!-- with a view transition -->
```

### 4. Out-of-Band-Swaps

Eine Antwort kann mehrere Stellen aktualisieren: Elemente in der Antwort mit `hx-swap-oob="true"` und einer id ersetzen das Element mit derselben id irgendwo auf der Seite, etwa einen Zähler im Header oder ein Benachrichtigungs-Badge.

### 5. Boosting

`<body hx-boost="true">` macht aus jedem normalen Link und Formular einen Ajax-Request, der den Body tauscht. Eine klassische Multi-Page-Website fühlt sich wie eine Single-Page-App an, ohne Änderung am Server. Dieselbe Idee wie pjax (2011), Turbolinks/Turbo Drive, die Partials von [Fresh](fresh.md) und `hyperfetch.js`.

### 6. History

`hx-push-url="true"` aktualisiert die URL, der Zurück-Button funktioniert. Beim Zurückgehen stellt htmx einen gespeicherten Snapshot der Seite wieder her, ohne neuen Request.

### 7. _hyperscript

Für die kleinen clientseitigen Dinge, die htmx bewusst weglässt, gibt es eine eigene Mini-Sprache im Attribut, siehe [hyperscript.md](hyperscript.md):

```html
<button _="on click toggle .open on #menu">menü</button>
```

## Wie es intern arbeitet

htmx durchsucht das Dokument nach `hx-*`-Attributen (und beobachtet neue mit einem `MutationObserver`), hängt Listener für die Trigger an, schickt den Request, parst die HTML-Antwort und tauscht sie ein. Request- und Response-Header tragen Zusatzinformationen (`HX-Request`, `HX-Target`, `HX-Boosted`, `HX-Redirect`). Der Server weiß also, dass er htmx antwortet, und kann nur ein Fragment schicken.

## Stärken und Schwächen

- **Stark:** gar kein Client-Zustand, also keine Synchronisationsprobleme. Sehr wenig JavaScript. Das Verhalten steht sichtbar im Markup. Funktioniert mit jeder Serversprache.
- **Schwach:** Jede Interaktion ist ein Roundtrip. Offline-Apps oder stark interaktive Oberflächen (ein Editor, eine Zeichen-App) passen nicht. Logik verteilt sich auf Attribut-Strings, die kein Tooling prüft.

## Für rat und aufbau

- **Verhalten über Attribute** ist der Kern von htmx, von deinem aufbau-Controller-Konzept und inzwischen der rat-Behaviors. htmx beweist, wie weit das trägt.
- **Die Trigger-Mini-Sprache** (`keyup changed delay:300ms`, `every 30s`, `revealed`) lohnt sich für Event-Modifier: `on:input:delay(300)`, `on:revealed`, `@every:30s`. rats `[keys]`, `!` und `:once` sind schon ein Schritt in diese Richtung.
- **Out-of-Band-Updates** haben in rat einen clientseitigen Zwilling: Ein Signal, das an mehreren Stellen benutzt wird, aktualisiert sie alle. Gleiches Ziel, umgekehrter Ort.
- **zugriff** läuft offline in Capacitor-Apps, Server-Roundtrips kommen dort nicht in Frage. Übernehmenswert ist das Attribut-Design, nicht der Transport.
