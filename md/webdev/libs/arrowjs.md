# ArrowJS

Eine winzige reaktive UI-Runtime (unter 5 kb) aus JavaScript-Modulen, Template-Literalen und dem DOM. Von Justin Schroeder (FormKit), seit Version 1.0 bei Standard Agents. Aktuell `@arrow-js/core` 1.0.6. Seit 1.0 positioniert als „UI-Framework für Coding Agents": nur Plattform-Bausteine, die KI-Modelle ohnehin gut kennen.

- Website: https://arrow-js.com
- Repository: https://github.com/standardagents/arrow-js
- Build: keiner nötig (`import { html, reactive } from 'https://esm.sh/@arrow-js/core'`)

## Worum es geht

Kein Compiler, kein JSX, kein Virtual DOM. Zustand ist ein reaktives Objekt, das UI ist ein `html`-Template, und die Grenze zwischen „einmal rendern" und „live halten" ist eine einzige Regel: **Ein Wert wird einmal gerendert, eine Funktion bleibt live.**

## Kernkonzepte

### 1. `reactive()` für Zustand

```js
import { html, reactive } from '@arrow-js/core';

const state = reactive({ count: 0 });

html`<button @click="${() => state.count++}">
  ${() => state.count} mal geklickt
</button>`(document.body);
```

`reactive()` macht aus Objekten und Arrays beobachtbaren Zustand (über Proxies). Ein `html`-Template ist eine Funktion: Aufgerufen mit einem Element, rendert sie hinein.

### 2. Statisch oder live: Wert oder Funktion

```js
html`<p>${state.name}</p>`         // rendered once, never updates
html`<p>${() => state.name}</p>`   // live: updates when state.name changes
```

Was in einer Funktion steht, wird beim Lesen verfolgt und bei Änderungen neu ausgewertet, genau an dieser Stelle im DOM. Das ist dieselbe Regel, die rats Compiler automatisch anwendet: Jedes `{…}` wird zu `() => …`. In Arrow schreibt man das `() =>` selbst.

### 3. Events mit `@`

`@click="${handler}"`: Das `@` vor einem Attribut hängt einen Listener an (wie bei Lit und Vue).

### 4. `component()`

```js
import { component, html, reactive } from '@arrow-js/core';

const Counter = component(() => {
  const state = reactive({ count: 0 });
  return html`<button @click="${() => state.count++}">
    ${() => state.count} mal geklickt
  </button>`;
});

html`${Counter()}`(document.body);
```

`component()` gibt einer einfachen Funktion stabile Instanzen pro Render-Stelle. Props sind Live-Proxies: Reaktive Objekte werden als Props übergeben und in Funktionen gelesen (`() => props.label`).

### 5. Listen und Keys

Listen sind Arrays von Templates. Wenn die Identität der DOM-Knoten Umsortierungen überstehen soll, bekommt jedes Template einen Key:

```js
html`<ul>${() => state.todos.map(todo => html`<li>${todo.title}</li>`.key(todo.id))}</ul>`
```

### 6. `watch()` für Seiteneffekte

`watch()` beobachtet reaktive Werte für imperative Arbeit (Speichern, Logging). UI-Updates gehören in Template-Ausdrücke, nicht in `watch()`.

### 7. Optionale Pakete

| Paket | Inhalt |
|---|---|
| `@arrow-js/framework` | asynchrone Komponenten, `boundary()`, `render()` |
| `@arrow-js/ssr` | `renderToString()`, `serializePayload()` |
| `@arrow-js/hydrate` | `hydrate()`, übernimmt servergerendertes HTML |
| `@arrow-js/sandbox` | führt Arrow-Code in einer QuickJS/WASM-Sandbox aus, getrennt vom `window` der Seite, rendert aber ins echte DOM |
| `@arrow-js/vite-plugin-arrow` | Vite-Integration |

Die Sandbox ist das Besondere an 1.0: Von einem KI-Agenten erzeugter UI-Code kann laufen, ohne Zugriff auf Cookies, Storage oder den Rest der Seite zu haben.

## Wie es intern arbeitet

`reactive()` legt einen Proxy um das Objekt, der Lesezugriffe registriert und Schreibzugriffe meldet. `html` zerlegt das Template in statische Teile und Ausdrücke. Ein Ausdruck, der eine Funktion ist, wird in einer Beobachtung ausgeführt: Er merkt sich die gelesenen Properties und wird neu ausgewertet, wenn eine davon sich ändert. Es gibt keinen Komponentenbaum, der neu gerendert wird, nur einzelne Ausdrücke.

## Stärken und Schwächen

- **Stark:** extrem klein, sofort im Browser nutzbar, eine Regel statt vieler Konzepte. Feingranulare Updates wie Signals, ohne Compiler.
- **Schwach:** Das `() =>` vor jedem Live-Wert vergisst man leicht, und dann ist der Wert still statisch. Kein Tooling erzwingt es. Die Zielgruppe „Coding Agents" bestimmt die Richtung stärker als menschliche Ergonomie.

## Für rat und aufbau

- **Arrow ist rats Laufzeit-Modell ohne Compiler.** Das bestätigt den Weg: `{…}` im rat-Markup ist genau Arrows `${() => …}`, nur nimmt rats Compiler das Schreiben ab. Die häufigste Fehlerquelle von Arrow (vergessenes `() =>`) gibt es in rat nicht.
- **`.key(…)` am Template** ist eine Alternative zu `@for (…; key todo.id)`.
- **Die WASM-Sandbox** ist eine Idee für zugriff: Plugins oder Nutzer-Skripte (etwa in `apps/code`) könnten UI rendern, ohne an die Daten der App zu kommen.
