# htmz

Kein Paket, sondern ein Schnipsel: 166 Byte HTML, die Links und Formulare Teile einer Seite austauschen lassen, wie [htmx](htmx.md), aber nur mit dem, was der Browser ohnehin kann. Von Lean Rada (Kalabasa), erschienen im Februar 2024 als Antwort auf htmx („Brauche ich dafür wirklich eine Bibliothek? Das klingt nach Frames.“). Fertig; der Schnipsel hat sich seit 2024 nicht geändert, das Repository ruht seit Juni 2025.

- Website: https://leanrada.com/htmz/
- Repository: https://github.com/Kalabasa/htmz
- Abhängigkeiten: keine
- Build: keiner, nicht einmal ein Skript-Import. Das npm-Paket `htmz` ist ein Scherz („for npm enjoyers“), das den Schnipsel in eine Datei kopiert, mit 25 Abhängigkeiten.

## Das Problem, das htmz löst

htmx ([htmx.md](htmx.md)) bringt 18 kb, eine eigene Attribut-Sprache (`hx-get`, `hx-target`, `hx-swap`, `hx-trigger`) und eigenes Request-Handling mit. Dabei konnte HTML schon 1997 eine Seite in Teile zerlegen, die unabhängig nachladen: Frames. Ein Link mit `target="name"` lädt seine Seite in den Frame mit diesem Namen. Das Einzige, was fehlt, ist, den Inhalt nicht im Frame zu lassen, sondern in ein beliebiges Element zu setzen.

htmz ist genau dieses fehlende Stück: ein versteckter `<iframe>` als Zwischenstation, und eine Zeile, die seinen Inhalt an die richtige Stelle setzt.

## Kernkonzepte

### 1. Der ganze Code

```html
<iframe hidden name=htmz onload="setTimeout(()=>document.querySelector(contentWindow.location.hash||null)?.replaceWith(...contentDocument.body.childNodes))"></iframe>
```

Einmal in die Seite kopiert, ist htmz „installiert“.

### 2. Benutzen: `target=htmz` und ein Hash

```html
<!-- loads /flower.html and puts it in place of #my-element -->
<a href="/flower.html#my-element" target=htmz>Blume</a>

<div id="my-element">…</div>
```

Ein Link lädt seine URL in den versteckten Iframe. Der Hash der URL, sonst ohne Bedeutung für diesen Request, wird zum Zielselektor. Nach dem Laden ersetzt der Inhalt des Iframe-Bodys das Ziel.

### 3. Ersetzen, nicht Einfügen

Die Antwort ersetzt das Ziel komplett, sie wird nicht hineingesetzt. Das wirkt erst unbequem, ist aber die mächtigste Operation: Ersetzen durch dasselbe Element mit neuem Inhalt ist „einfügen“, Ersetzen durch nichts ist „löschen“, Ersetzen durch zwei Elemente ist „ergänzen“. Die Antwort enthält deshalb typisch das Zielelement selbst, mit derselben Id, damit der nächste Request es wieder findet.

### 4. Formulare, Buttons, Standardziel

```html
<form action="/todos#list" method="post" target=htmz>
  <input name="title">
  <button>hinzufügen</button>
  <button formaction="/todos/clear#list">alle löschen</button>
</form>

<base target=htmz>   <!-- every relative link and form goes through htmz -->
```

Alles, was HTML für Navigation hat, funktioniert unverändert: `method`, `formaction`, `formmethod`, Validierung mit `required`, Datei-Uploads, `<base target>`. Kein `preventDefault`, kein `fetch`, keine Serialisierung.

### 5. Erweitern: eine Funktion statt Attribute

```html
<script>
  function htmz (frame) {
    // write your extensions here
    setTimeout(() =>
      document
        .querySelector(frame.contentWindow.location.hash || null)
        ?.replaceWith(...frame.contentDocument.body.childNodes)
    );
  }
</script>
<iframe hidden name="htmz" onload="window.htmz(this)"></iframe>
```

Statt Optionen gibt es eine Funktion zum Umschreiben. Die Website sammelt fertige Erweiterungen: mehrere Ziele pro Antwort (`multitarget`), Ladeanzeige (`loader`), Inhalte aus einem `<template>` (`swap-template`, `unwrap-template`), kein History-Eintrag (`no-history`), wiederholte GETs (`repeat-gets`: Ohne sie ist ein zweiter Klick auf denselben Link nur ein Hash-Wechsel im Iframe, ohne Request). Das `setTimeout` verhindert übrigens nur, dass der Browser neue Inhalte automatisch in den sichtbaren Bereich scrollt.

### 6. Fragment oder ganze Seite: `Sec-Fetch-Dest`

Öffnet jemand einen htmz-Link in einem neuen Tab, bekäme er nur das Fragment. Der Browser schickt aber den Header `Sec-Fetch-Dest`: `iframe` für den htmz-Request, `document` für einen echten Seitenaufruf. Der Server kann daran entscheiden, ob er das Fragment oder die ganze Seite rendert, ohne eigene Header (bei htmx: `HX-Request`).

## Wie es intern arbeitet

Der Browser macht alles: Der Link navigiert den Iframe (normaler Request mit Cookies, Weiterleitungen, Caching), der Iframe parst die Antwort zu einem Dokument, `onload` feuert. Erst dann läuft der eine Ausdruck: Hash aus `contentWindow.location` lesen, Ziel suchen, `replaceWith(...childNodes)` verschiebt die geparsten Knoten aus dem Iframe-Dokument ins Hauptdokument (Knoten werden dabei adoptiert, nicht kopiert). Wird kein Ziel gefunden, passiert dank `?.` nichts.

htmz scannt das Dokument nicht nach Attributen, hängt keine Listener an und beobachtet nichts. Es läuft nur, wenn der Iframe geladen hat. „Ein Proxy, kein VPN“, sagt die Doku.

## Stärken und Schwächen

- **Stark:** 166 Byte, nichts zu lernen außer `target` und Hash. Echte Navigation mit allen Browser-Funktionen (Formular-Validierung, Uploads, Cookies, Weiterleitungen). Funktioniert mit jedem Server und auch mit statischen Dateien. Lässt sich vollständig in einer Funktion verstehen und ändern.
- **Schwach:** Ein Ziel pro Antwort (ohne Erweiterung). Jeder Request erzeugt einen History-Eintrag im Iframe, der Zurück-Button springt also durch Fragmente. Kein Morphing: Ersetzen verliert Fokus und Eingaben im Ziel. Fehlerbehandlung, Ladezustand und Abbruch gibt es nur selbst geschrieben. Skripte in der Antwort laufen im Kontext des Iframes, nicht der Seite. Der Hash als Selektor ist ein bewusster Missbrauch, nur Ids sind praktisch.

## Für rat und aufbau

- **Die Haltung ist die Lektion:** erst prüfen, was die Plattform schon kann. htmz ersetzt den Kern von htmx durch `target`, `name` und `onload`. Dasselbe Denken steckt hinter rats `command`-Variante in d-16 c (Invoker Commands API statt eigener Syntax) und hinter aufbaus Nutzung von Cascade Layers und CSS-Funktionen.
- **`Sec-Fetch-Dest`** ist ein nützliches Detail für jedes Fragment-System, auch für ein mögliches `use:fetch` in rat (siehe [morphdom.md](morphdom.md#für-rat-und-aufbau)): Der Server braucht keinen eigenen Header, um Fragment und Seite zu unterscheiden.
- **„Ersetzen statt einfügen“** ist ein gutes Prinzip für Swap-APIs: eine Operation, die alle anderen ausdrücken kann. htmx' acht `hx-swap`-Werte und Datastars acht Modi sind Bequemlichkeit darüber.
- **Für eine Bibliothek in aufbau zu roh, als Muster in zugriff denkbar:** Der versteckte Iframe lädt auch `blob:`- und Service-Worker-URLs. Eine App in zugriff könnte HTML-Fragmente aus dem Service-Worker-Cache so in die Seite holen, offline, ohne `fetch`-Code. Allerdings rendern die Apps mit Preact; dort ist das ein Fremdkörper.
