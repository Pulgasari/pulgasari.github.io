# Open Props

Eine Sammlung von rund 600 CSS Custom Properties als fertige Design-Tokens: Farben, Abstände, Schatten, Radien, Typografie, Easings, Animationen, Gradienten, Media Queries. Kein Framework, keine Klassen, nur Variablen, die man in eigenem CSS benutzt. Von Adam Argyle, seit Oktober 2021. Aktuell 1.7.23 (Januar 2026); das Repository ist aktiv (zuletzt Übergänge für `<dialog>` und Popover, Oktober 2026), Releases sind selten.

- Website: https://open-props.style
- Repository: https://github.com/argyleink/open-props
- Abhängigkeiten: keine
- Build: keiner nötig (`<link rel="stylesheet" href="https://unpkg.com/open-props">`); mit PostCSS optional nur die benutzten Props

## Das Problem, das Open Props löst

Jedes Projekt braucht dieselben Grundwerte: eine Abstands-Skala, eine Farbpalette mit Abstufungen, ein paar gute Schatten, Easing-Kurven, Schriftgrößen. Man schreibt sie jedes Mal neu oder übernimmt sie mit einem ganzen Framework. [Tailwind](tailwind.md) liefert sie, aber nur als Klassen im Markup; Bootstrap liefert sie mit fertigen Komponenten, die man dann überschreibt.

Open Props liefert **nur die Werte**, als native Custom Properties: im CSS benutzbar, zur Laufzeit änderbar, in DevTools sichtbar, ohne Build. Die Idee aus der Doku: *Sub-atomic styles*. Was man daraus baut, bleibt eigenes CSS.

## Kernkonzepte

### 1. Variablen statt Klassen

```css
@import 'https://unpkg.com/open-props';

.card {
  background    : var(--surface-2);
  border-radius : var(--radius-3);
  box-shadow    : var(--shadow-3);
  padding       : var(--size-5);
  font-size     : var(--font-size-2);
  transition    : transform .3s var(--ease-spring-3);
}
```

Das HTML bleibt sauber (`<div class="card">`), das CSS bleibt CSS. Jede Variable ist ein Wert aus einer konsistenten Skala.

### 2. Nummerierte Skalen

```css
--size-1: .25rem;  --size-3: 1rem;  --size-7: 2rem;  --size-15: 30rem;
--size-fluid-3: clamp(1.5rem, 3vw, 2rem);
--font-size-0 … --font-size-8,  --font-size-fluid-0 … 3
--radius-1 … --radius-6,  --radius-round,  --radius-blob-1 … 5
--shadow-1 … --shadow-6,  --inner-shadow-0 … 4
--ease-1 … 5,  --ease-out-*,  --ease-elastic-*,  --ease-spring-*,  --ease-bounce-*
```

Zahlen statt Namen (`--size-3`, nicht `--space-md`): eine Skala ist leicht zu erweitern und braucht keine Benennungsdebatten. Fluide Varianten mit `clamp()` wachsen mit dem Viewport.

### 3. Farben: Paletten und `--color-hue`

```css
@import 'open-props/indigo';                /* --indigo-0 … --indigo-12 */
@import 'open-props/colors-oklch';

.badge {
  --color-hue : 145;                        /* any hue, the whole oklch scale follows */
  background  : var(--color-3);
  color       : var(--color-12);
}
```

Neben 19 festen Paletten (je 13 Stufen, auch als HSL) gibt es eine OKLCH-Skala `--color-0` bis `--color-15`, die aus einem einzigen Farbton (`--color-hue`) gerechnet wird. Eine Komponente bekommt damit ihre eigene Palette mit einer Zeile.

### 4. Adaptive Schatten und Themes

```css
--shadow-color    : 220 3% 15%;
--shadow-strength : 1%;
/* under prefers-color-scheme: dark the same props get a darker color and more strength */
```

Schatten sind aus Farbe und Stärke zusammengesetzt und passen sich im Dark Mode an. `open-props/normalize` liefert ein Grund-Stylesheet mit semantischen Variablen (`--surface-1` bis `--surface-4`, `--text-1`, `--text-2`, `--link`), hell und dunkel; `open-props/buttons` fertige Buttons. Beides optional.

### 5. Animationen und Media Queries

```css
.toast { animation: var(--animation-slide-in-up), var(--animation-fade-in); }

@media (--motionOK) { .toast { animation: var(--animation-bounce); } }
@media (--md-n-above) { … }
```

`--animation-*` sind fertige Kurzschreibweisen mit Keyframes (fade, scale, slide, shake, spin, ping, pulse …), kombinierbar. Media Queries kommen als `@custom-media` (`--motionOK`, `--OSdark`, `--touch`, `--md-n-above` …); die braucht in der Praxis noch PostCSS (`postcss-custom-media`), weil `@custom-media` in Browsern nicht verlässlich ankommt.

### 6. Nur bezahlen, was man benutzt: JIT

```js
// postcss.config.js
import postcssJitProps from 'postcss-jit-props';
import OpenProps       from 'open-props';

export default { plugins: [postcssJitProps(OpenProps)] };
```

Alle 603 Props kosten 7,5 kb (gzip). `postcss-jit-props` durchsucht das eigene CSS und fügt nur die Props ein, die tatsächlich mit `var(--…)` benutzt werden, samt Keyframes und abhängigen Props. Ohne Build gibt es die Teile einzeln (`open-props/sizes`, `open-props/easings`, …).

### 7. Tokens für andere Werkzeuge

Dieselben Werte gibt es als JavaScript-Objekt, als JSON im Design-Token-Format, für Style Dictionary und Figma. Und als Shadow-DOM-Variante (`open-props/shadow/…`), die die Props an `:host` statt an `html` hängt.

## Wie es intern arbeitet

Die Quelle sind JavaScript-Objekte (`src/props.*.js`), aus denen ein Build-Skript CSS, JSON und die Varianten erzeugt. Alle Props stehen in `:where(html)` (die Shadow-Variante in `:host`). `:where()` hat die Spezifität null: Jede eigene Definition, egal wie schwach, überschreibt eine Open Prop, ohne `!important` und ohne auf die Reihenfolge achten zu müssen.

Viele Props sind aus anderen Props zusammengesetzt (`--shadow-3` aus `--shadow-color` und `--shadow-strength-*`, `--color-*` aus `--color-hue`). Weil Custom Properties erst beim Benutzen am Element aufgelöst werden, wirkt ein überschriebener Grundwert auf alle abgeleiteten: `--shadow-color` an einer Karte setzen färbt alle sechs Schatten dieser Karte um. Das ist der eigentliche Mechanismus hinter Themes und adaptiven Schatten: kein JavaScript, nur Kaskade.

## Stärken und Schwächen

- **Stark:** keine Klassen, keine Konventionen, kein Build; sehr gut gewählte Werte (besonders Schatten, Easings, Gradienten). Mit jeder Methodik kombinierbar. `:where()` macht Überschreiben trivial. Zusammengesetzte Props geben Themes fast umsonst.
- **Schwach:** Nummern sagen nichts über Absicht (`--size-5` statt „Abstand zwischen Karten“), semantische Schicht muss man selbst bauen. 600 Props global auf `html` sind viel, wenn man nur zwanzig braucht und keinen Build will. `@custom-media` funktioniert ohne PostCSS nicht. Feste Stufen statt Funktionen: Ein Wert zwischen `--size-5` und `--size-6` geht nur von Hand.

## Für rat und aufbau

- **aufbau geht den entgegengesetzten Weg: Funktionen statt Skalen.** `@aufbau/css` rechnet Werte aus wenigen Grund-Tokens (`--unit`, `--ratio`, `--bg`, `--fg`, `--accent`) mit CSS-Funktionen (`--space()`, `--step()`, `--tint()`, `--shade()`, `--elevation()`, `--fluid()`), Open Props legt jeden Wert einzeln ab. aufbaus Weg ist kleiner und stufenlos, braucht aber `@function` (heute Chromium); Open Props läuft überall. Der Kompromiss in aufbau steht schon im README: ein fester Wert davor als Rückfall.
- **Übertragbar sind die Werte selbst.** Open Props' Easings (`--ease-spring-*`, `--ease-elastic-*`), die Schatten-Stapel und die Animationen sind sorgfältig abgestimmt. `@aufbau/gestalt/animate` und `--elevation()` könnten sie als Vorlage nehmen, statt eigene Kurven zu erfinden (Lizenz MIT).
- **Zusammengesetzte Schatten** (`--shadow-color`, `--shadow-strength`) passen direkt zu aufbaus Achsen: `--scheme: dark` setzt die Stärke hoch, alle Elevationen folgen. Heute müsste `--elevation()` den Modus selbst kennen.
- **`:where(html)` gegen Cascade Layers.** Open Props macht seine Werte über Spezifität null überschreibbar, aufbau über `@layer`. Beides löst dasselbe; Layers sind expliziter und gelten auch für Regeln, nicht nur für Variablen.
- **`--color-hue` mit OKLCH-Skala** ist eine gute Form für Paletten aus einem Wert, nah an `palettes.css` in `@aufbau/gestalt` (Preset-Name oder beliebige Farbe zu `--color-bg`, `--color-fg`, `--color-ink`). Eine Abstufungs-Skala pro Palette fehlt dort und wird bei Zuständen (hover, aktiv, deaktiviert) gebraucht.
- **rat** könnte Open Props einfach benutzen: rats Styles sind normales CSS mit `@scope`, Variablen gehen ungehindert durch. Mit der in [postcss.md](postcss.md#für-rat-und-aufbau) vorgeschlagenen Plugin-Stelle (`options.postcss`) ginge `postcss-jit-props` direkt in die `<style>`-Pipeline, und nur benutzte Props landeten im Bundle.
