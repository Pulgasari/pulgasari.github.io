# UnoCSS

Eine **Engine** für Utility-CSS, kein Framework: UnoCSS bringt selbst keine einzige Utility mit. Alles, was es erzeugt, kommt aus Presets und Regeln, die man selbst wählt oder schreibt. Von Anthony Fu (Vue, Vite, Vitest), erschienen Oktober 2021, inspiriert von Tailwind, Windi CSS und Twind. Nach 0.65 sprang die Versionsnummer auf 66 (Februar 2025); aktuell 66.11.

- Website: https://unocss.dev
- Repository: https://github.com/unocss/unocss
- Build: ja (Vite, webpack, PostCSS, CLI, Astro, Nuxt …) oder als Laufzeit im Browser (`@unocss/runtime`)

## Das Problem, das UnoCSS löst

Tailwind war 2021 gut, aber starr: ein festes Vokabular, eine schwere JavaScript-Konfiguration, ein langsamer Build (vor dem JIT-Modus), und eigene Utilities waren umständlich. Anthony Fus Frage im Blogpost "Reimagine Atomic CSS": Was, wenn eine Utility nur eine Regel ist, ein regulärer Ausdruck und eine Funktion, die CSS zurückgibt? Dann ist das ganze Vokabular austauschbar, die Engine winzig, und eigene Utilities sind eine Zeile.

## Kernkonzepte

### 1. Regeln: Muster und CSS

```js
// uno.config.js
import { defineConfig } from 'unocss';

export default defineConfig({
  rules: [
    ['m-1', { margin: '0.25rem' }],                                    // static
    [/^m-(\d+)$/, ([, size]) => ({ margin: `${size / 4}rem` })],       // dynamic
    [/^grid-area-(\w+)$/, ([, name]) => ({ 'grid-area': name })],
  ],
});
```

Eine Regel ist ein String oder ein regulärer Ausdruck plus ein Objekt oder eine Funktion, die CSS liefert. Mehr ist eine Utility in UnoCSS nicht. Tailwinds gesamtes Vokabular ist eine lange Liste solcher Regeln.

### 2. Presets

| Preset | liefert |
|---|---|
| `presetWind4` (früher `presetUno`, `presetWind3`) | Tailwind-kompatible Utilities, `presetWind4` im Stil von Tailwind 4 |
| `presetMini` | das Minimum, als Basis für eigene Systeme |
| `presetAttributify` | Utilities als Attribute: `<div text="sm white" p="4">` |
| `presetIcons` | jedes Icon aus Iconify als reine CSS-Klasse: `i-mdi-home` |
| `presetTypography` | Prosa-Styles (`prose`) |
| `presetWebFonts` | Google Fonts und andere per Konfiguration |
| `presetTagify` | Utilities als Tags: `<text-red>` |

Ein Preset ist nur ein Bündel aus Regeln, Varianten, Theme und Shortcuts. Eigene Presets für ein Design-System sind der vorgesehene Weg.

### 3. Shortcuts

```js
shortcuts: [
  {
    'btn'         : 'py-2 px-4 rounded-lg font-semibold',
    'btn-primary' : 'btn bg-blue-600 text-white hover:bg-blue-700',
  },
  [/^btn-(.*)$/, ([, color]) => `btn bg-${color}-600 text-white`],   // dynamic
]
```

Mehrere Utilities unter einem Namen, auch dynamisch. Das ist UnoCSS' Antwort auf `@apply`, nur im Markup statt im CSS.

### 4. Varianten

```js
variants: [
  matcher => matcher.startsWith('hocus:')
    ? { matcher: matcher.slice(6), selector: s => `${s}:hover, ${s}:focus-visible` }
    : matcher,
],
```

Eine Variante schneidet ein Präfix ab und verändert den Selektor oder umschließt die Regel (Media Query, `@supports`, Layer). Eigene Varianten sind eine Funktion.

### 5. Transformer

```html
<!-- variant groups -->
<div class="hover:(bg-gray-100 text-black) md:(flex gap-4)">
```

| Transformer | macht |
|---|---|
| `transformerVariantGroup` | `hover:(a b)` wird zu `hover:a hover:b` |
| `transformerDirectives` | `@apply`, `--at-apply`, `theme()` in CSS |
| `transformerCompileClass` | eine Klassenliste zu einer einzigen generierten Klasse zusammenfassen |
| `transformerAttributifyJsx` | Attributify in JSX |

Transformer ändern den Quelltext vor dem Erkennen, ähnlich wie Babel-Plugins.

### 6. Laufzeit im Browser

```html
<script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>
```

`@unocss/runtime` läuft ganz im Browser: Ein `MutationObserver` sieht neue Klassen und Attribute und erzeugt das CSS dazu. Ohne Build, ohne Konfigurationsdatei (sie kann als `window.__unocss` übergeben werden). Mit dem Kern allein 9,8 kb gz, mit allen Presets bis 58 kb.

## Wie es intern arbeitet

UnoCSS parst kein CSS und baut keinen Syntaxbaum des Quelltexts. Ein **Extractor** zerlegt Dateien nur grob in Wörter (alles, was wie ein Klassenname aussehen könnte); jedes Wort wird gegen die Regeln geprüft, zuerst gegen statische Regeln über eine Hash-Map, dann gegen die regulären Ausdrücke. Ergebnisse werden zwischengespeichert, also wird jedes Wort nur einmal ausgewertet. Die Ausgabe ist sortiert nach Layern und Varianten. Weil es keine Liste möglicher Utilities gibt (anders als Tailwind bis v2), sondern nur Muster, kostet ein großes Vokabular nichts, solange es nicht benutzt wird.

## Stärken und Schwächen

- **Stark:** völlig anpassbar (eigene Utilities sind eine Zeile), sehr schnell, läuft wahlweise ohne Build im Browser, Variant Groups machen lange Klassenlisten lesbarer, Icons als CSS ohne JavaScript, Attributify-Modus, mit `presetWind4` weitgehend Tailwind-kompatibel.
- **Schwach:** gerade die Freiheit ist ein Risiko: Jedes Projekt hat ein anderes Vokabular, Editor-Unterstützung und Doku hängen vom Preset ab. Kleineres Ökosystem als Tailwind. Reguläre Ausdrücke als Regeln sind mächtig, aber schwer zu lesen. Die gleichen grundsätzlichen Einwände wie gegen Tailwind (Klassen im Markup, dynamische Namen werden nicht gefunden).

## Für rat und aufbau

- **Die Laufzeit passt zu "browser first".** UnoCSS ist die einzige Utility-Engine, die ernsthaft ohne Build im Browser läuft. Für rats Playground und für aufbau-Seiten ohne Bundler ist `@unocss/runtime` mit einem eigenen kleinen Preset eine realistische Option; Tailwinds Browser-Build ist dafür siebenmal so groß.
- **Ein gestalt-Preset:** Die Tokens aus `gestalt` als UnoCSS-Theme, die aufbau-Konventionen als Regeln, und jedes Projekt hat dasselbe Vokabular. Das ist mit UnoCSS ein Preset von ein paar Dutzend Zeilen, mit Tailwind eine Plugin-Sammlung.
- **Attributify ähnelt aufbaus Attribut-Denken:** `<div p="4" text="sm muted">` liest sich wie die Attribute eines Custom Elements (`<pop-toast duration="3000">`). Für Elemente, die ohnehin über Attribute konfiguriert werden, fühlt sich das natürlicher an als lange Klassenlisten.
- **Regeln als Muster und Funktion** sind dasselbe Modell wie `@rat/syntax`: eine Tabelle aus regulären Ausdrücken und Aktionen. Ein rat-Preset könnte Klassen erkennen, die rats Compiler erzeugt.
- **Variant Groups** (`hover:(a b)`) sind eine kompakte Schreibweise, die sich auch für rats `class:`-Props eignen würde: `class:hover={…}` gibt es nicht, aber `class="hover:(…)"` funktioniert mit UnoCSS in jedem rat-Template schon heute.
