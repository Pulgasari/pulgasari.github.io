# SolidJS

Ein UI-Framework mit JSX, aber ohne Virtual DOM: Komponenten laufen **einmal**, und Signals schreiben direkt an die Stellen im DOM, die sich ändern. Von Ryan Carniato, erste Versionen 2018, Version 1.0 im Juni 2021. Aktuell 1.9.17 (Oktober 2026); Solid 2.0 ist seit August 2026 im Release-Candidate-Stadium (2.0.0-rc.15), mit Async als festem Teil des reaktiven Graphen. Solid hat das Signal-Modell, das heute fast jedes Framework übernommen hat, bekannt gemacht.

- Website: https://www.solidjs.com
- Repository: https://github.com/solidjs/solid
- Build: ja (JSX über `babel-preset-solid`); ohne Build mit `solid-js/html` (Tagged Templates)

## Das Problem, das Solid löst

React sieht aus, als würde es nur ändern, was sich ändert, rechnet aber bei jedem Update die ganze Komponente neu und vergleicht. Das kostet Arbeit und verlangt `useMemo`, `useCallback`, Abhängigkeitslisten und Regeln (keine Hooks in Bedingungen).

Solid behält JSX und das Komponentenmodell, ändert aber, was eine Komponente ist: **eine Funktion, die einmal läuft und das DOM aufbaut.** Alles Dynamische darin ist ein Signal oder ein Ausdruck, der Signals liest, und der Compiler macht daraus kleine Effekte, die genau ein Stück DOM aktualisieren. Es gibt nichts neu zu rendern.

## Kernkonzepte

### 1. Signals, Memos, Effects

```js
import { createEffect, createMemo, createSignal } from 'solid-js';

const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);

createEffect(() => console.log(double()));
setCount(5);   // logs 10
```

Lesen ist ein Funktionsaufruf (`count()`), Schreiben eine eigene Funktion (`setCount`). Die Trennung von Lesen und Schreiben ist Absicht: Wer nur lesen darf, bekommt nur den Getter.

### 2. Komponenten laufen einmal

```jsx
function Counter () {
  const [count, setCount] = createSignal(0);
  console.log('runs once');
  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}
```

Der Compiler macht aus `{count()}` einen Effekt, der nur diesen Textknoten schreibt. `console.log` läuft genau einmal. Deshalb gibt es keine Hook-Regeln: Signals dürfen überall angelegt und gelesen werden, in Bedingungen, Schleifen, außerhalb von Komponenten.

### 3. Props sind Getter, Destructuring bricht die Reaktivität

```jsx
function Greeting (props) {
  return <p>hallo {props.name}</p>;   // live
}

function Broken ({ name }) {          // read once, never again
  return <p>hallo {name}</p>;
}
```

Der Compiler übergibt `<Greeting name={user()} />` als Objekt mit Getter. Liest man `props.name` im JSX, ist der Zugriff verfolgt; zerlegt man die Props in der Parameterliste, wird einmal gelesen. Hilfen: `splitProps`, `mergeProps`.

### 4. Kontrollfluss als Komponenten

```jsx
<Show when={user()} fallback={<Login />}>
  {user => <p>{user().name}</p>}
</Show>

<For each={todos()}>{todo => <li>{todo.title}</li>}</For>
```

`array.map` würde bei jeder Änderung alle Zeilen neu bauen. `<For>` legt jede Zeile einmal pro Eintrag an und verschiebt sie nur; `<Index>` hält die Position fest und tauscht den Inhalt. `<Switch>`/`<Match>`, `<Suspense>`, `<ErrorBoundary>` folgen demselben Muster.

### 5. Stores: tiefe Reaktivität

```js
import { createStore, produce } from 'solid-js/store';

const [state, setState] = createStore({ todos: [] });
setState('todos', state.todos.length, { title: 'brot', done: false });   // path setter
setState(produce(draft => { draft.todos[0].done = true; }));              // immer-like
```

Ein Store ist ein Proxy, bei dem jede Eigenschaft ein eigenes Signal ist. Geschrieben wird über einen Pfad-Setter oder mit `produce` im Stil von [Immer](immer.md).

### 6. Solid 2.0: Async im Graphen

```js
const user = createMemo(async () => fetchUser(id()));   // a memo may return a promise

<Loading fallback={<Spinner />}>
  <p>{user().name}</p>
</Loading>

isPending(() => user());   // true while a newer value is on its way
```

Die größte Änderung von 2.0: Berechnungen dürfen Promises liefern, der Graph wartet selbst darauf. `createResource` entfällt, `<Loading>` ersetzt `<Suspense>` für das erste Laden, `isPending` zeigt laufende Aktualisierungen. Schreibzugriffe werden gesammelt und erst bei `flush()` (oder am Ende des Ticks) sichtbar, damit nie ein halber Zustand gelesen wird. Für Mutationen gibt es `action()` mit `createOptimistic` und `createOptimisticStore`. Der Signal-Kern ist als `@solidjs/signals` ein eigenes Paket.

## Wie es intern arbeitet

Der Compiler zerlegt JSX in statisches HTML und Löcher. Das statische HTML wird als `<template>` einmal geparst und pro Komponente geklont; jedes Loch wird zu einem `insert`- oder Attribut-Effekt, der genau den einen Knoten kennt. Events werden, wo möglich, am Dokument gesammelt (Event Delegation).

Der reaktive Kern ist ein Push-Pull-Graph mit Besitzern: Jeder Effekt gehört dem Scope, in dem er entstand, und wird mit ihm entsorgt (deshalb räumt `<Show>` alles in seinem Zweig auf). Seit 2.0 kennt der Graph außerdem Zustände wie „wartet auf Promise“ und kann Teile davon anhalten, bis Daten da sind.

## Stärken und Schwächen

- **Stark:** sehr schnell (seit Jahren an der Spitze der js-framework-benchmarks), klein (Kern plus DOM typisch 4,7 kb, alles 14,7 kb), keine Hook-Regeln, keine Abhängigkeitslisten, JSX ohne VDOM, saubere Ownership. Das Modell ist das, was Preact Signals, Vue Vapor, Angular Signals und Svelte 5 übernommen haben.
- **Schwach:** Destructuring von Props und frühes Lesen brechen still die Reaktivität. JSX sieht aus wie React, verhält sich aber anders, was Umsteiger verwirrt. Der Übergang zu 2.0 bringt viele neue Begriffe (Loading, Pending, Optimistic, Projection). Ökosystem kleiner als bei React oder Vue.

## Für rat und aufbau

- **Solid ist rats engster Verwandter.** Komponente läuft einmal, Löcher werden Effekte, Template klonen statt neu bauen, Ownership für `@if`/`@for`: Das ist genau `@rat/runtime` mit `@domina/render`. Der Unterschied ist die Oberfläche: Solid schreibt JSX mit `count()`, rat Markup mit `$count`, und rats Compiler setzt das `.value` ein, wo Solids Entwickler die Klammern selbst schreiben.
- **Props als Getter** macht rat schon (`get x () { … }` in `componentProp`). Solids größte Falle, Destructuring, ist rats d-13: Variante b (`let { $title } = props`) würde den Getter für `$`-Namen erhalten und so Solids Fehlerquelle beseitigen.
- **`<For>` gegen `<Index>`** sind zwei Antworten auf d-15 (Index in `@for`): `<For>` hält Zeilen pro Eintrag und gibt den Index als Signal, `<Index>` hält die Position. rats `$loop` (Empfehlung) wäre die dritte Form.
- **Solid 2.0 und rats `@await` (d-28):** Async im Graphen statt als eigener Block ist eine echte Alternative zu `@await`/`@pending`. Ein `const $user = await load($id)` in einem rat-Script, das der Graph selbst abwartet, wäre näher an Solid 2.0 als an Svelte. `isPending(() => $user)` entspräche `@pending`.
- **Gesammelte Schreibzugriffe bis `flush()`** sind eine strengere Form von rats `batch()`. Für rats Handler (jede Zuweisung eine eigene Transaktion, siehe den `flow`-Abschnitt in [mobx.md](mobx.md)) wäre das automatische Bündeln pro Tick die einfachere Regel.
