# Alpine.js

Reaktives Verhalten direkt im HTML, über `x-`-Attribute: `x-data` legt Zustand an, `x-show`, `x-text`, `x-bind`, `x-on` binden ihn an das Markup. Kein Build, kein Komponentenmodell, nur ein Skript-Tag. Von Caleb Porzio (auch Livewire), seit Dezember 2019, Version 3 im Juni 2021. Aktuell 3.17.4 (September 2026), aktiv. Die Reaktivität kommt von Vue (`@vue/reactivity`).

- Website: https://alpinejs.dev
- Repository: https://github.com/alpinejs/alpine
- Abhängigkeiten: `@vue/reactivity`
- Build: keiner (`<script defer src="…/alpinejs/dist/cdn.min.js">`)

## Das Problem, das Alpine löst

Server-gerenderte Seiten (Laravel, Rails, Django, statische Seiten) brauchen kleine Interaktionen: ein Dropdown, Tabs, ein Modal, ein Zähler für Zeichen. jQuery dafür heißt Selektoren und Event-Handler in einer getrennten Datei, die mit dem Markup synchron bleiben müssen. Vue oder React dafür heißt ein Build und eine App, die das Markup übernimmt.

Alpine sitzt dazwischen: Das Verhalten steht im Markup, an dem Element, um das es geht, und ist trotzdem reaktiv. Die Website nennt es „jQuery für das moderne Web“; man könnte auch sagen: Vues Template-Direktiven ohne Vue.

## Kernkonzepte

### 1. `x-data`: Zustand pro Bereich

```html
<div x-data="{ open: false }">
  <button x-on:click="open = !open">menü</button>
  <nav x-show="open" x-on:click.outside="open = false">…</nav>
</div>
```

`x-data` macht ein Element zur Wurzel eines reaktiven Bereichs mit eigenem Zustand. Alles darin kann diesen Zustand lesen und schreiben. Bereiche lassen sich verschachteln; innen sieht man auch den Zustand der äußeren.

### 2. Direktiven

| Direktive | macht |
|---|---|
| `x-data` | Zustand anlegen |
| `x-init` | Code beim Start |
| `x-show` | ein- und ausblenden (CSS `display`) |
| `x-if` (auf `<template>`) | einfügen und entfernen |
| `x-for` (auf `<template>`) | Liste, mit `:key` |
| `x-text`, `x-html` | Inhalt setzen |
| `x-bind:attr`, kurz `:attr` | Attribut binden, `:class` und `:style` mit Objekten |
| `x-on:event`, kurz `@event` | Event-Handler |
| `x-model` | Formularwert beidseitig binden |
| `x-effect` | Effekt, läuft bei Änderung der gelesenen Werte |
| `x-ref`, `x-id`, `x-teleport`, `x-transition`, `x-cloak`, `x-ignore` | Verweise, eindeutige IDs, an anderen Ort rendern, Übergänge, Flackern verhindern, Bereich überspringen |

### 3. Modifier

```html
<input x-on:input.debounce.300ms="search()">
<form x-on:submit.prevent="save()">
<div x-on:keydown.escape.window="close()">
<button x-on:click.once="init()">
<div x-on:click.outside="open = false">
```

Modifier hängen mit Punkt an: Timing (`.debounce`, `.throttle`), Event-Steuerung (`.prevent`, `.stop`, `.once`, `.self`), Ziel (`.window`, `.document`, `.outside`), Tasten (`.enter`, `.escape`, `.ctrl`).

### 4. Magics

```html
<div x-data="{ count: 0 }" x-init="$watch('count', value => console.log(value))">
  <button @click="count++; $dispatch('changed', count)">+1</button>
  <span x-ref="label" x-text="count"></span>
</div>
```

Eingebaute Helfer mit `$`: `$el` (das Element), `$refs`, `$store`, `$watch`, `$dispatch` (Custom Event auslösen), `$nextTick`, `$root`, `$data`, `$id`.

### 5. Wiederverwendbar: `Alpine.data`, `Alpine.store`, Plugins

```js
Alpine.data('dropdown', () => ({
  open: false,
  toggle () { this.open = !this.open; },
}));

Alpine.store('cart', { items: [], add (item) { this.items.push(item); } });
```

```html
<div x-data="dropdown">…</div>
<span x-text="$store.cart.items.length"></span>
```

`Alpine.data` registriert einen benannten Zustand, `Alpine.store` globalen Zustand. Eigene Direktiven und Magics über `Alpine.directive` und `Alpine.magic`. Offizielle Plugins: `persist` (in `localStorage`), `intersect`, `focus` (Fokus-Fallen), `collapse`, `mask` (Eingabemasken), `morph` (DOM-Morphing für Livewire), `sort`, `anchor`.

## Wie es intern arbeitet

Beim Start durchläuft Alpine das DOM, findet `x-data`-Bereiche und für jedes Element die `x-`-Attribute (danach beobachtet ein `MutationObserver` neue Elemente). Der Wert von `x-data` wird mit `new Function` zu einem Objekt ausgewertet und mit `reactive()` aus `@vue/reactivity` zu einem Proxy gemacht. Jede Direktive wertet ihren Ausdruck ebenfalls als Funktion aus, im Kontext des Bereichs (über `with`-artige Scope-Ketten), und läuft in einem `effect()`: Liest `x-text="count"` den Wert `count`, wird es neu ausgeführt, wenn `count` sich ändert. Für strenge CSP gibt es einen eigenen Build (`@alpinejs/csp`), der Ausdrücke ohne `new Function` auswertet und dafür nur einfache Formen erlaubt.

## Stärken und Schwächen

- **Stark:** sofort nutzbar, kein Build, Verhalten steht am Element, ideal für Server-HTML und kleine Interaktionen. Reaktivität von Vue, also ausgereift. Gute Plugins für Alltagsaufgaben (Fokus, Persistenz, Masken). Arbeitet gut mit htmx und Livewire zusammen.
- **Schwach:** Logik in Attribut-Strings: keine Prüfung, keine Autovervollständigung, Fehler erst zur Laufzeit. Bei größeren Oberflächen wird das Markup unübersichtlich. Ausdrücke brauchen `new Function` (außer im eingeschränkten CSP-Build). Mit 19,4 kb größer, als man für „ein paar Attribute“ erwarten würde, weil die Vue-Reaktivität mitkommt.

## Für rat und aufbau

- **Verhalten über Attribute**, die vierte Variante nach [htmx](htmx.md), [_hyperscript](hyperscript.md) und [Datastar](datastar.md). Alpine ist der Vertreter mit lokalem Zustand; Datastar hat später fast dieselbe Idee mit Signals und Server-Patches gebaut (`data-signals` statt `x-data`, `data-on:click` statt `x-on:click`).
- **Modifier-Namen** sind die verbreitetste Form am Markt (`.prevent`, `.once`, `.outside`, `.debounce.300ms`), Vue hat dieselben. Für d-24 (`!` gegen `:prevent`) und d-25 (`:once`) ist das der Vergleichsmaßstab: rats `!` ist kürzer, aber Alpine- und Vue-Nutzer erwarten `.prevent`. `.outside` und `.debounce` hat rat noch nicht.
- **`Alpine.data('dropdown', …)` und `x-data="dropdown"`** sind benannte Zustände, die das Markup beim Namen nennt, ähnlich rats Kommandos über Strings (`onclick='toggleSidebar'`) und der Registry in `@rat/core`.
- **`x-cloak`** löst ein Problem, das jeder Ansatz mit Laufzeit-Attributen hat: Bis das Skript läuft, ist das rohe Markup sichtbar. rat-Komponenten rendern selbst und haben es nicht; `@aufbau/elements` (Custom Elements vor der Definition) schon, dort hilft `:not(:defined)` in CSS.
- **Für zugriff nicht passend:** Die Apps sind Preact-Anwendungen mit Zustand im Store, kein Server-HTML. Alpines Platz wäre eher bei statischen Seiten wie `pulgasari.github.io`, falls dort Interaktion dazukommt.
