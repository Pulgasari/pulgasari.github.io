# CSS-Funktionen für filters und patterns

Frage: Eröffnen die neuen CSS-Funktionen (`@function`, `if()`, typisiertes `attr()`, registrierte Properties) Wege, `@aufbau/filters` und `@aufbau/patterns` um reine CSS-Varianten zu erweitern?

Stand: Chrome 141, im Browser getestet. Keine Entscheidung, sondern die Grundlage zum Nachdenken.

## Was die beiden Packages heute sind

- **patterns:** JS-Funktionen erzeugen eine SVG-Kachel. Die kommt als Data-URI in `background-image`.
  - Farben (`bg`, `fg`) können als `var()` live bleiben.
  - Geometrie (size, radius, rotate, width) wird eingebacken.
  - Motion ist ein `background-position`-Loop.
- **filters:** JS-Funktionen erzeugen einen SVG-`<filter>`.
  - Er wird in einen versteckten `<defs>`-Host injiziert und per `filter: url(#id)` genutzt.
  - Einige haben ein CSS-Backend (native Filterfunktionen), andere Canvas oder WebGL.
  - Der `live: true`-Modus schreibt `var(--aufbau-filter-<key>, …)` in die Attribute.

## Was im Browser getestet wurde

| Test | Ergebnis |
|---|---|
| `@function`, die ein Gradient-Muster liefert: `background: --dots(red, 20px, 5px)` | ✅ geht, alle Parameter live |
| `@function`, die eine Filterliste liefert: `filter: --glitch(4px)` | ✅ geht |
| SVG-Filter als Data-URI: `filter: url("data:image/svg+xml,…#f")` | ✅ geht, ohne DOM-Injektion |
| Muster-Kachel als `mask` plus `background-color` | ✅ geht, Größe über `mask-size` live |
| `var()` in einem Filter-Attribut wie `stdDeviation` | ❌ geht nicht |
| `flood-color: var(--x)` am **gefilterten** Element gesetzt | ❌ kommt im Filter nicht an |
| `flood-color: var(--x)` auf `:root` gesetzt (als Stil und als Attribut) | ✅ geht |
| `<animate>` in einem Data-URI-Filter | ⚠️ im Test eingefroren, aber nicht eindeutig |
| Paint Worklet: `background: paint(dots)` | ✅ geht, nur in Chromium |
| `src()` (URL aus einer Variable bauen) | ❌ nicht unterstützt |

### Folgerungen

- **Der `live`-Modus von filters wirkt nur teilweise.** `stdDeviation="var(…)"` und andere Zahlenattribute lesen keine Variablen. Live gehen nur echte CSS-Properties im Filter: `flood-color`, `flood-opacity`, `lighting-color`. Und die erben aus dem Baum des `<filter>`-Elements (also von `:root`), nicht vom gefilterten Element. Die `bake`-Markierungen sollte man durchgehen.
- **CSS kann keine Strings und keine URLs bauen.** Was im SVG-Markup steckt, bleibt eingebacken, außer es ist eine solche CSS-Property.
- **CSS-Funktionen können eine ganze Wertliste zurückgeben.** Das sind mehrere Hintergrund-Ebenen oder mehrere Filterfunktionen, parametrisiert, mit Farbnamen der Palette (`fg`, `ink`) über `--resolve-color-argument`.

## Patterns: Ansätze

### A. Muster als CSS-Funktionen aus Gradients

```css
background: --pattern-dots(ink, 20px, 3px);
background: --pattern-grid(--alpha(fg, 20%), 24px, 1px), --pattern-dots(ink, 24px, 2px);
```

- Pro:
  - reines CSS, kein JS, keine Data-URI
  - **alle** Parameter live, auch die Geometrie
  - Palette-Farben per Name
  - animierbar über registrierte Properties
  - lässt sich stapeln
  - passt neben `--stripes` und `--checkerboard`, die es in `functions.css` schon gibt
- Contra:
  - Die Formen müssen neu als Gradients gebaut werden.
    - Gut machbar: dots, grid, stripes, diagonal, crosshatch, checks, squares, crosses, chevron, triangles, bricks, rings, diamonds.
    - Nur angenähert: waves.
  - Die Kachel als Ganzes drehen geht nicht allgemein, nur lineare Muster über den Winkel.
  - Harte Farbstopps brauchen etwa +0,5px, sonst sind die Kanten treppig.

### B. SVG-Kacheln als Maske, Farbe aus CSS

Die Kacheln unter `@aufbau/svg/patterns` gibt es schon. Die Form kommt aus der Kachel, Farbe und Größe aus CSS (`mask`, `mask-size`, `background-color`).

- Pro: exakt die heutigen Formen; Farbe (auch Palette) und Größe live.
- Contra:
  - Die Proportionen bleiben eingebacken (Radius zu Kachelgröße).
  - Nur eine Musterfarbe plus Hintergrund.
  - Die Maske blendet auch den Inhalt aus. Man braucht also `::before` oder ein eigenes Element, eine einzelne Funktion reicht nicht.

### C. Beim Build erzeugtes CSS

Die JS-Generatoren schreiben eine `patterns.css` mit fertigen Kacheln als Tokens (`--pattern-dots: url(data:…)`).

- Pro: kein JS zur Laufzeit; der Generator bleibt die einzige Quelle.
- Contra: alles eingebacken. Sinnvoll nur zusammen mit B oder für eine feste Auswahl.

### D. Paint Worklet

`background: paint(aufbau-dots)` mit `--pattern-size` usw. als `inputProperties`.

- Pro:
  - alles live, auch komplexe Geometrie
  - die Logik bleibt JS
  - SVG-Pfade (waves) gehen über `Path2D` fast unverändert
- Contra:
  - nur Chromium; für die anderen Browser bräuchte es ein Polyfill (css-paint-polyfill)
  - die Generatoren bräuchten neben der SVG-Ausgabe eine Canvas-Variante

### E. Attribut-Modul wie animate

```html
<div data-pattern="dots" data-pattern-size="24px" data-pattern-color="ink">
```
```css
.hero { --pattern: dots; }
```

Das ist keine eigene Technik, sondern die Bedienschicht über A oder B. Ein Verteiler (`--pattern(name, …)` über `if()`) wählt das Muster.

- Pro: derselbe Mechanismus wie `data-animate`. animate, filter und pattern wären drei gleich gebaute CSS-Module.

## Filters: Ansätze

### A. Presets aus nativen Filterfunktionen als CSS-Funktionen

```css
filter: --filter-vintage(0.6);
filter: --glitch(3px);   /* drop-shadow in rot und cyan wirkt wie ein rgb split */
```

- Pro:
  - reines CSS, live, animierbar
  - Ein Glitch geht komplett in CSS: Keyframes, die ein registriertes `--shift` stufenweise verändern.
  - Deckt das heutige CSS-Backend ab, dazu viele Looks, die jetzt SVG brauchen: vintage, cold, fade, noir, ein Teil von instacolor.
- Contra: Mehr als `blur`, `brightness`, `contrast`, `drop-shadow`, `grayscale`, `hue-rotate`, `invert`, `opacity`, `saturate` und `sepia` gibt es nicht. Duotone, Kanten, Verschiebung und Körnung gehen damit nicht.

### B. SVG-Filter als Data-URI in einer CSS-Datei

Beim Build aus den JS-Funktionen erzeugt: `--filter-duotone-sunset: url("data:…#f")`.

- Pro:
  - kein DOM-Injizieren, kein JS
  - kombinierbar in einer Liste: `filter: var(--filter-emboss) contrast(1.2)`
- Contra:
  - Parameter eingebacken, also feste Varianten.
  - Animation in Data-URIs war im Test eingefroren.
  - Firefox kann Data-URI-Filter seit Langem. Safari muss man prüfen.

### C. SVG-Filter im Dokument, Farben aus der Palette

`feFlood flood-color="var(--color-ink)"`: Duotone, Tint und Glow folgen der aktuellen Palette.

- Pro: Die Farben sind live und folgen ohne JS der Palette.
- Contra:
  - Die Variablen kommen nur aus dem Baum des Filters (`:root`), also global, nicht pro Element.
  - Zahlenwerte wie Blur-Stärke oder Verschiebung bleiben fest.
  - Pro Variante braucht es eine eigene Filter-ID.

### D. Overlays mit Blend-Modes, wie CSSgram

`filter` plus `::after` mit Gradient und `mix-blend-mode`.

- Pro: die klassischen Foto-Looks in reinem CSS, farblich live.
- Contra: belegt ein Pseudo-Element, braucht also eine Modul-Regel statt einer Funktion.

### E. Attribut-Modul `data-filter`

Analog zu animate und zu Patterns-E. Die Bedienschicht über A bis D.

## Einschätzung

- **Echte Neuerungen durch `@function`** sind nur Patterns-A und Filters-A: Parameter wirklich live, Palette-Farben per Name, animierbar.
- **Gehen heute auch, unabhängig von den Funktionen:** Filters-B und -C. Sie ergänzen A dort, wo native Funktionen nicht reichen.
- **Patterns-D (Worklet)** ist der einzige Weg, auf dem alles live ist, auch bei komplexen Formen. Er gilt aber nur für Chromium.
- **E** lohnt sich unabhängig davon, weil animate, filter und pattern damit gleich funktionieren.
- **Die JS-Packages** bleiben nötig. Canvas und WebGL (pixelate, kaleidoscope, die Editor-Pipeline) sind in CSS nicht möglich. Die CSS-Varianten würden dort als weiteres Backend auftauchen.

## Nächste Schritte, falls gewünscht

- Für Patterns-A fünf, sechs Muster prototypisch bauen und im Browser gegen die SVG-Kacheln vergleichen, also Grenzen sehen statt schätzen.
- Den `live`-Modus von filters gegen die Tests oben prüfen und die `bake`-Markierungen korrigieren.
- Data-URI-Filter in Safari testen.
