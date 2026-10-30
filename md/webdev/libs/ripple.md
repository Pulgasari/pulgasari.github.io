# Ripple

Ein TypeScript-UI-Framework mit eigenem Dateiformat (`.tsrx`), feingranularer Reaktivität, Kontrollfluss-Direktiven im Markup, scoped CSS und ohne Virtual DOM. Von Dominic Gannaway (trueadm), der vorher an Inferno, React, Lexical und Svelte 5 gearbeitet hat; öffentlich seit August 2025. Aus Ripple ist [TSRX](tsrx.md) herausgelöst worden, die framework-neutrale Sprache, in der Ripple-Komponenten heute geschrieben werden. Aktuell 0.5 (Oktober 2026), aktive Beta, MIT-lizenziert.

- Website: https://ripple-ts.com
- Repository: https://github.com/Ripple-TS/ripple
- Größe: 6,8 kb typisch (`mount`, `track`, `effect`), 23,1 kb alles
- Build: ja (Vite-Plugin `@ripple-ts/vite-plugin`, Compiler aus dem TSRX-Stack)
- Server: Rendern gepuffert und gestreamt, Hydration

## Das Problem, das Ripple löst

Gannaway kennt die großen Ansätze von innen: Reacts Virtual DOM mit Hooks und ihren Regeln, Sveltes Compiler mit Runes. Ripple versucht, das Beste davon in einer Sprache zu vereinen, die sich wie TypeScript anfühlt: Reaktivität ohne Hook-Regeln und ohne Abhängigkeitslisten, Kontrollfluss ohne Ternaries und `.map()`, Styles ohne Konflikte, und Editor-Unterstützung, die TypeScript selbst liefert statt eines eigenen Template-Dialekts.

## Kernkonzepte

### 1. Komponenten sind Funktionen, das Markup steht im Rumpf

```tsrx
export function Counter() @{
  const count = track(0);
  const double = () => count.value * 2;

  <button onClick={() => count.value++}>
    Zähler: {count.value} (doppelt {double()})
  </button>
}
```

`@{ … }` ist ein Anweisungsblock, in dem Setup-Code und Markup gemischt stehen; die Markup-Ausdrücke sind die Ausgabe der Komponente. Eine einfache Komponente kann ihr Markup auch wie bei JSX zurückgeben.

### 2. `track` und `effect`

```tsrx
const user  = track({ name: 'ada' });
const greet = track(() => `hallo ${user.value.name}`);   // abgeleitet

effect(() => {
  console.log('neu:', greet.value);
});
```

`track(value)` legt einen reaktiven Wert an, `track(fn)` einen abgeleiteten. Gelesen und geschrieben wird über `.value`; der Compiler muss Lesezugriffe dadurch nicht erraten. Für Sammlungen gibt es reaktive Varianten: `RippleArray`, `RippleObject`, `RippleMap`, `RippleSet`.

### 3. Kontrollfluss als Direktiven

```tsrx
export function Notes({ notes }: { notes: Note[] }) @{
  @if (notes.length === 0) {
    <p>keine notizen</p>
  } @else {
    <ul>
      @for (const note of notes; key note.id) {
        <li>{note.title}</li>
      }
    </ul>
  }

  @switch (state.value) {
    @case 'loading': { <Spinner /> }
    @default: { <Done /> }
  }

  @try {
    <Profile id={id} />
  } @pending {
    <p>lädt …</p>
  } @catch (error) {
    <p>{error.message}</p>
  }
}
```

Statt Ausdrücken wie in JSX gibt es Anweisungen mit `@`: `@if`/`@else`, `@for` mit `key` und `index` (`@for (const item of items; index i; key item.id)`) und `@empty`, `@switch`, `@try` mit `@pending` für asynchrone Kinder und `@catch` als Fehlergrenze.

### 4. Scoped Styles

```tsrx
export function Card({ title }: { title: string }) @{
  <div class="card">{title}</div>

  <style>
    .card { padding: 1rem; border-radius: var(--radius); }
  </style>
}
```

Ein `<style>`-Block gilt nur für die Elemente seiner Komponente (der Compiler hängt eine Hash-Klasse an). Laufzeitwerte gehen über Custom Properties. Ein Style-Block, der einer Variablen zugewiesen wird, wird zu einem Theme-Objekt, das sich mit `<style apply={theme} />` anwenden lässt.

### 5. Mounten, Server, Hydration

```ts
import { mount } from 'ripple';
import { App } from './App.tsrx';

mount(App, { props: { title: 'Hallo' }, target: document.getElementById('root') });
```

Dazu `Context`, `Portal`, `module server` für Exporte, die nur auf dem Server laufen, `Activity` zum Ausblenden von Bereichen mit erhaltenem Zustand, `Hydrate` zum verzögerten Aufwecken von Server-HTML (bei Sichtbarkeit, Interaktion, Leerlauf).

## Wie es intern arbeitet

Der Compiler (aus dem TSRX-Stack) zerlegt eine Komponente in ein statisches Template, das einmal geklont wird, und Bindungen, die genau die Stellen aktualisieren, die von einem `track` abhängen. Es gibt keinen Virtual DOM und kein erneutes Ausführen der Komponentenfunktion. Für Editoren übersetzt ein Language Server `.tsrx` in virtuelles TypeScript, sodass Typprüfung, Vervollständigung und Umbenennen aus TypeScript kommen.

## Stärken und Schwächen

- **Stark:** Kontrollfluss im Markup, der lesbarer ist als JSX, feingranulare Updates ohne Virtual DOM, TypeScript-Werkzeuge über den Language Server, scoped CSS eingebaut, Server-Rendering mit Streaming, ein Autor mit viel Erfahrung in genau diesem Gebiet.
- **Schwach:** jung und im Wandel (der Wechsel zu TSRX hat Syntax und Dateiendung geändert), kleine Gemeinschaft, wenige Bibliotheken, `.value` überall, eigene Dateiendung mit eigenem Werkzeugbedarf.

## Für rat und aufbau

Ripple und rat sind sich näher als jedes andere Paar in dieser Liste:

| Ripple | rat | |
|---|---|---|
| `@if`, `@for`, `@switch`, `@try`/`@pending`/`@catch` | `@if`, `@for`, `@match`, `@await`/`@pending`/`@catch` | fast dieselbe Direktivenschreibweise |
| `track(0)`, `count.value` | `let $count = 0`, `$count` | rat lässt den Compiler `.value` einsetzen, Ripple schreibt es aus |
| `track(() => …)` | `const $double = $count * 2` | abgeleitete Werte |
| `<style>` scoped mit Hash | `<style>` mit `@scope` | rat nutzt die Plattform statt einer Hash-Klasse |
| `RippleArray`, `RippleMap` | `$List`, `$Map` aus `@rat/types` | reaktive Sammlungen |
| `@{ … }` Anweisungsblock | `<script>` plus Markup | rat trennt Skript und Markup, Ripple mischt sie |

- **`.value` sichtbar oder unsichtbar** ist die eigentliche Designfrage zwischen beiden: Ripple macht jeden reaktiven Zugriff sichtbar und braucht dafür keine Namenskonvention; rat macht ihn mit `$` sichtbar und spart `.value`.
- **`@pending`** in Ripple gehört zu `@try` (asynchrone Kinder), in rat zu `@await` (ein Promise). Beide Lösungen zeigen, dass „lädt noch“ als eigener Zweig in den Kontrollfluss gehört.
- **Gemischt oder getrennt:** In Ripple stehen Anweisungen und Markup im selben Block, ein `const` kann zwischen zwei Elementen stehen. rat trennt `<script>` und Markup und hat dafür `@var` für Werte mitten im Markup.
- Verwandt: [TSRX](tsrx.md), [SolidJS](solidjs.md), [Svelte](svelte.md), [Marko](marko.md).
