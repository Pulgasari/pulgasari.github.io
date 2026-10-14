# Tailwind CSS

Ein CSS-Framework aus **Utility-Klassen**: statt `.card { padding: 1rem; border-radius: .5rem; }` schreibt man `class="p-4 rounded-lg"` direkt ins Markup. Von Adam Wathan (Tailwind Labs), erste Version 2017, 1.0 im Mai 2019. Tailwind 4 (Januar 2025) hat die Engine neu geschrieben und die Konfiguration von JavaScript nach CSS verlegt. Aktuell 4.3.

- Website: https://tailwindcss.com
- Repository: https://github.com/tailwindlabs/tailwindcss
- Build: ja (Vite-Plugin, CLI, PostCSS-Plugin); für Prototypen ein Browser-Skript (`@tailwindcss/browser`)

## Das Problem, das Tailwind löst

Klassisches CSS mit Namen für Komponenten (`.card`, `.card__title--large`) hat drei bekannte Probleme:

- **Benennen ist schwer.** Jede Variante braucht einen Namen, und Namen veralten, wenn sich das Markup ändert.
- **CSS wächst nur.** Niemand traut sich, eine Regel zu löschen, weil unklar ist, wo sie noch gilt.
- **Werte driften.** Ohne Grenzen entstehen `13px`, `14px`, `0.85rem` und sieben Grautöne.

Tailwind beantwortet alle drei mit einer Behauptung, die damals provozierte: Styles gehören ins Markup, als kleine, feste Klassen aus einem vorgegebenen System. Gelöscht wird mit dem Markup, benannt wird nichts, und die Werte kommen aus einer Skala.

## Kernkonzepte

### 1. Utility-Klassen

```html
<button class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700">
  Speichern
</button>
```

Jede Klasse setzt eine oder wenige Eigenschaften: `px-4` ist `padding-inline: calc(var(--spacing) * 4)`, `text-white` die Farbe, `rounded-lg` der Radius. Die Werte kommen aus einer festen Skala, nicht aus freien Zahlen.

### 2. Varianten als Präfixe

```html
<div class="grid grid-cols-1 md:grid-cols-3 dark:bg-gray-900">
<input class="border focus:ring-2 invalid:border-red-500 disabled:opacity-50">
<li class="group-hover:underline not-last:border-b">
<div class="@container"><p class="@md:text-lg">…</p></div>
```

Zustände (`hover:`, `focus:`, `disabled:`), Breakpoints (`md:`), Dark Mode (`dark:`), Container Queries (`@md:`), Beziehungen (`group-hover:`, `peer-checked:`), Negation (`not-*`), Startzustände für Übergänge (`starting:`). Ein Präfix ist ein Selektor oder eine Media Query, die vor die Utility gesetzt wird. Varianten lassen sich stapeln (`dark:md:hover:…`).

### 3. Beliebige Werte

```html
<div class="top-[117px] grid-cols-[1fr_2fr] bg-[url(/hero.jpg)] [mask-type:luminance]">
```

Wo die Skala nicht reicht, schreibt man den Wert in eckige Klammern, sogar ganze Eigenschaften. Der Ausweg für Einzelfälle, ohne das System zu verlassen.

### 4. Konfiguration in CSS (v4)

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 260);
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
}

@utility content-auto { content-visibility: auto; }
@custom-variant pointer-coarse (@media (pointer: coarse));
@source "../components";
```

Früher war `tailwind.config.js` der Ort für das Design-System. Seit v4 steht es in CSS:

| Direktive | macht |
|---|---|
| `@theme` | Design-Tokens als Custom Properties; jedes Token erzeugt passende Utilities (`--color-brand-500` → `bg-brand-500`, `text-brand-500` …) und steht zur Laufzeit als `var(--color-brand-500)` bereit |
| `@utility` | eigene Utility, mit allen Varianten nutzbar |
| `@custom-variant` | eigene Variante |
| `@variant` | eine Variante in eigenem CSS anwenden |
| `@source` | zusätzliche Pfade zum Durchsuchen (oder ausschließen) |
| `@apply` | Utilities in eigenes CSS einsetzen |
| `@reference` | Theme einbinden, ohne CSS auszugeben (für Komponenten-Styles) |
| `--spacing()`, `--alpha()` | Funktionen für Werte aus dem Theme |

### 5. Cascade Layers und moderne Plattform

```css
@layer theme, base, components, utilities;
```

Tailwind 4 gibt alles in nativen Cascade Layers aus, nutzt `@property` für animierbare Variablen, `color-mix()` für Transparenz und eine Farbpalette in `oklch`. Utilities stehen in der höchsten Layer und gewinnen damit zuverlässig über Basis- und Komponentenstyles, ohne `!important`.

### 6. Automatische Erkennung

Tailwind durchsucht das Projekt nach Klassennamen (alle Dateien außer `.gitignore`-Einträgen und Binärdateien) und erzeugt nur das CSS für tatsächlich vorkommende Klassen. Dynamisch zusammengesetzte Namen (`'bg-' + color`) findet es nicht; sie müssen vollständig im Quelltext stehen.

## Wie es intern arbeitet

Die Engine von v4 ("Oxide") besteht aus einem Scanner in Rust, der Dateien parallel nach Kandidaten für Klassennamen durchsucht, und einem Compiler in TypeScript, der jeden Kandidaten zerlegt (Varianten, Utility, Wert, Modifier wie `/50`), gegen das Theme auflöst und CSS erzeugt. Lightning CSS übernimmt Präfixe, Übersetzung für ältere Browser und Minifizierung. Inkrementelle Builds prüfen nur neue Kandidaten; Tailwind gibt sie als Mikrosekunden statt Millisekunden an.

Im Browser (`@tailwindcss/browser`) läuft derselbe Compiler ohne den Rust-Scanner und beobachtet das DOM über einen `MutationObserver`. Mit 73,5 kb gz ist das nur für Prototypen gedacht.

## Stärken und Schwächen

- **Stark:** sehr schnelles Arbeiten, sobald man das Vokabular kennt; ein festes Design-System erzwingt Konsistenz; CSS wächst kaum mit dem Projekt; Löschen ist sicher; v4 ist nah an der Plattform (Layers, Custom Properties, Container Queries, `oklch`); riesiges Ökosystem (Komponenten-Bibliotheken, Editor-Unterstützung).
- **Schwach:** lange, schwer lesbare Klassenlisten; Markup und Styles sind untrennbar (ein Theme-Wechsel jenseits der Tokens heißt Markup ändern); Wiederverwendung über Komponenten des Frameworks statt über CSS; dynamische Klassennamen funktionieren nicht; ohne Build nur eingeschränkt nutzbar; ein eigenes Vokabular, das man lernen muss, obwohl man CSS schon kann.

## Für rat und aufbau

- **`@theme` ist dasselbe wie aufbaus `var` im Schema und gestalt-Tokens:** Werte als Custom Properties, die CSS und JavaScript gleichermaßen lesen. Tailwind zeigt, wie man aus einem Token-Satz automatisch Werkzeuge erzeugt.
- **Cascade Layers als Konfliktlösung:** Tailwind 4 und aufbau (`aufbau.elements`, `aufbau.skin`) sind unabhängig voneinander beim selben Mittel gelandet. Wer beides kombiniert, muss die Layer-Reihenfolge festlegen: `@layer theme, base, aufbau.elements, components, aufbau.skin, utilities;` würde Utilities über Skins stellen.
- **Varianten-Präfixe gegen rats `class:`-Props:** rat hat `class:active={$on}` von htx. Tailwinds `group-hover:` und `peer-checked:` lösen Beziehungen zwischen Elementen ohne JavaScript; rat-Komponenten mit Tailwind brauchen dafür keine eigene Syntax.
- **Für rats Compiler:** Weil der Compiler alle `class`-Attribute kennt, könnte er die Klassen einer `.rat`-Datei selbst an Tailwind oder UnoCSS melden, statt dass ein Scanner sie sucht. Und dynamische Klassen (`class={`bg-${$color}`}`) könnte er als Warnung markieren, weil Tailwind sie nicht findet.
