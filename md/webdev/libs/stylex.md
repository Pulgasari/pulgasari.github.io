# StyleX

Metas CSS-in-JS-System, das zur Build-Zeit **atomares CSS** erzeugt: Styles stehen als JavaScript-Objekte neben der Komponente, der Compiler macht daraus eine statische CSS-Datei mit einer Klasse pro Eigenschaft und Wert. Im Einsatz auf facebook.com, Instagram, WhatsApp Web und Threads, offen seit Dezember 2023. Aktuell `@stylexjs/stylex` 0.19 (noch vor 1.0, die API ist aber seit 2024 weitgehend stabil).

- Website: https://stylexjs.com
- Repository: https://github.com/facebook/stylex
- Build: ja (Babel-Plugin, Integrationen für Vite, webpack, Rollup, esbuild, Next über `@stylexjs/unplugin` und Co.)

## Das Problem, das StyleX löst

In großen Codebasen wächst CSS nur: Niemand traut sich, eine Regel zu löschen, weil unklar ist, wer sie benutzt. Dazu kommen Konflikte über Spezifität und Reihenfolge der Stylesheets ("warum gewinnt hier dieser Selektor?"). Laufzeit-CSS-in-JS (styled-components, Emotion) löst das Scoping, kostet aber Rechenzeit beim Rendern.

StyleX will alle drei Probleme gleichzeitig lösen:

- **Wachstum:** atomares CSS. Jede Kombination aus Eigenschaft und Wert existiert genau einmal. Ab einer gewissen Größe wächst die CSS-Datei kaum noch, egal wie viele Komponenten dazukommen.
- **Konflikte:** "der letzte Style gewinnt", deterministisch, unabhängig von Spezifität und Lade-Reihenfolge.
- **Laufzeit:** alles zur Build-Zeit, im Browser bleibt eine winzige Funktion, die Klassennamen zusammenführt.

## Kernkonzepte

### 1. `create`: Styles als Objekte

```js
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  base: {
    padding : 16,
    color   : 'rgb(60 60 60)',
    maxWidth: { default: '100%', '@media (min-width: 800px)': 800 },
    opacity : { default: 1, ':hover': 0.9 },
  },
  highlighted: { color: 'gold' },
});
```

Pseudo-Klassen und Media Queries stehen **im Wert einer Eigenschaft**, nicht als verschachtelte Selektoren. Das ist die wichtigste Regel: Eine Eigenschaft hat genau einen Ort, an dem ihre Bedingungen stehen.

### 2. `props` und `attrs`: anwenden und zusammenführen

```js
<div {...stylex.props(styles.base, isActive && styles.highlighted, props.style)} />
```

`props()` gibt `{ className, style }` zurück. Die Argumente werden von links nach rechts zusammengeführt: Für jede Eigenschaft gewinnt der letzte Wert, auch wenn er von außen als Prop hereinkommt. Bedingte Styles sind normales JavaScript (`cond && styles.x`).

Für alles außerhalb von React gibt es `attrs()`, das `{ class, style }` als Strings liefert, passend für Template-Literale und Custom Elements.

### 3. Variablen und Themes: `defineVars`, `createTheme`

```js
// tokens.stylex.js
export const colors = stylex.defineVars({
  primary : 'blue',
  surface : { default: 'white', '@media (prefers-color-scheme: dark)': '#111' },
});

// button.js
import { colors } from './tokens.stylex.js';
const styles = stylex.create({ button: { backgroundColor: colors.primary } });

// a theme overrides the variables for a subtree
const brand = stylex.createTheme(colors, { primary: 'purple' });
<section {...stylex.props(brand)}>…</section>
```

`defineVars` erzeugt CSS Custom Properties mit gehashten Namen, nur in Dateien mit der Endung `.stylex.js`, damit der Compiler sie findet. `createTheme` überschreibt sie für einen Teilbaum. `defineConsts` ist dasselbe für Konstanten, die zur Build-Zeit eingesetzt werden (Breakpoints).

### 4. Dynamische Werte

```js
const styles = stylex.create({
  bar: (width) => ({ width }),
});

<div {...stylex.props(styles.bar(`${percent}%`))} />
```

Eine Funktion wird zu einer Klasse mit `width: var(--x)` plus einem Inline-Style, der nur die Variable setzt. Die Regel bleibt statisch, nur der Wert ist dynamisch.

### 5. Beziehungen: `when` und Marker

StyleX verbietet Nachfahren-Selektoren (`.card:hover .title`), weil sie Styles über Komponentengrenzen verteilen. Seit 2025 gibt es einen kontrollierten Ersatz:

```js
const styles = stylex.create({
  title: {
    color: { default: 'black', [stylex.when.ancestor(':hover')]: 'crimson' },
  },
});

<article {...stylex.props(stylex.defaultMarker())}>
  <h2 {...stylex.props(styles.title)}>…</h2>
</article>
```

Der Titel reagiert auf das Hover eines markierten Vorfahren. Weiter gibt es `when.descendant`, `when.siblingBefore`, `when.siblingAfter`, `when.anySibling` und eigene Marker über `defineMarker()`. Die Bedingung steht wieder beim Element, das sich ändert, nicht beim Auslöser.

### 6. Weitere Helfer

| | |
|---|---|
| `keyframes({ from: …, to: … })` | Animationen, gibt einen Namen zurück |
| `firstThatWorks('sticky', '-webkit-sticky')` | Fallback-Werte |
| `positionTry({ … })` | Anchor Positioning (`@position-try`) |
| `viewTransitionClass({ … })` | Styles für View Transitions |
| `StyleXStyles<{ color?: string }>` | TypeScript: welche Styles eine Komponente von außen annimmt |

## Wie es intern arbeitet

Der Babel-Plugin wertet jedes `stylex.create` zur Build-Zeit aus. Werte müssen dafür statisch sein (Literale, Konstanten, importierte Variablen aus `.stylex.js`). Jede Eigenschaft mit jedem Wert und jeder Bedingung wird zu einer Klasse mit Hash-Namen:

```css
.x1e2nbdu { color: rgb(60 60 60) }
.xv2f06h  { color: gold }
@media (min-width: 800px) { .x193iq5w.x193iq5w { max-width: 800px } }
```

Im Code bleibt statt des Objekts eine Tabelle `{ color: 'x1e2nbdu', … }`. `props()` führt diese Tabellen zusammen: ein Objekt pro Eigenschaft, der letzte Eintrag gewinnt, am Ende werden die Klassennamen verbunden. Weil jede Eigenschaft im HTML nur eine Klasse hat, gibt es keinen Kampf zwischen Regeln. Die Priorität von Bedingungen (Media Query vor Pseudo-Klasse) regelt der Compiler über verdoppelte Selektoren und die Reihenfolge in der Datei. Die Runtime ist rund 1,7 kb.

## Stärken und Schwächen

- **Stark:** CSS wächst nicht mit dem Code, keine Spezifitätskonflikte, Styles sind lokal und löschbar, deterministisches Überschreiben von außen, Themes über echte Custom Properties, praktisch keine Laufzeitkosten, typisierbare Style-Props.
- **Schwach:** ohne Build geht nichts (die frühere Dev-Runtime ist seit Version 0.11 nicht mehr mitgewachsen), Werte müssen statisch auswertbar sein, keine freien Selektoren (globale Styles, fremdes Markup, `::slotted`), das HTML ist voller unlesbarer Klassennamen, die Objekt-Syntax ist länger als CSS, Dokumentation und Werkzeuge sind auf React ausgerichtet.

## Für rat und aufbau

- **Dieselbe Notation wie aufbaus `objectToCss`:** camelCase-Eigenschaften, Objekte als Werte. Der Unterschied liegt in der Richtung: aufbau erzeugt daraus lesbares CSS für eine Klasse (geteilt per `adoptedStyleSheets`, geordnet über Cascade Layers), StyleX atomare Klassen. Beide lösen das Konfliktproblem, aufbau mit Layern (`aufbau.elements` unter `aufbau.skin` unter Autor), StyleX mit "eine Klasse pro Eigenschaft".
- **Die Bedingung beim Wert** (`opacity: { default: 1, ':hover': 0.9 }`) ist eine gute Idee für aufbaus Objekt-CSS und für rats eigene CSS-Erweiterung: alle Zustände einer Eigenschaft an einem Ort.
- **`defineVars` + `createTheme`** entspricht aufbaus Skins und `var` im Schema. StyleX zeigt, wie man Tokens importierbar und damit prüfbar macht: ein Tippfehler im Token ist ein Build-Fehler, kein stilles `var(--primry)`.
- **`when.ancestor` mit Markern** ist ein Gegenentwurf zu rats `@scope`: rat scoped nach außen (Styles bleiben in der Komponente), StyleX nach innen (ein Element reagiert nur auf ausdrücklich markierte Vorfahren).
- **Für rats Build-Target** wäre atomare Extraktion von `<style>`-Blöcken möglich, passt aber schlecht zur Plattform-Linie (`@scope`, lesbares CSS, kein Build nötig). Interessanter ist `attrs()` als Muster: ein Style-Objekt wird zu Attributen, die jede Template-Sprache einsetzen kann.
