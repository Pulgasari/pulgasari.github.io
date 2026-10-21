# React

Eine Bibliothek für Benutzeroberflächen aus Komponenten: Eine Komponente ist eine Funktion vom Zustand zur View, React rendert sie bei jeder Änderung neu und gleicht das Ergebnis mit dem DOM ab. Von Jordan Walke bei Facebook entwickelt, im Mai 2013 als Open Source veröffentlicht. Hooks kamen mit 16.8 (Februar 2019), der nebenläufige Renderer mit 18 (März 2022), Actions, `use` und stabile Server Components mit 19 (Dezember 2024). Seit Februar 2026 liegt React bei der React Foundation unter der Linux Foundation, nicht mehr bei Meta. Aktuell 19.3.1 (Oktober 2026), sehr aktiv; der React Compiler ist seit Oktober 2025 in Version 1.0 stabil.

- Website: https://react.dev
- Repository: https://github.com/react/react (vorher `facebook/react`)
- Laufzeit: `react` (Komponenten, Hooks, plattformunabhängig) plus ein Renderer: `react-dom` für den Browser, `react-native` für Apps
- Build: praktisch ja (JSX, meist über [Vite](vite.md) oder ein Framework wie Next.js); ohne Build mit `createElement` oder [htm](htm.md)

## Das Problem, das React löst

2013 aktualisierte man das DOM entweder von Hand (jQuery: Ereignis, dann gezielt Knoten ändern) oder über Zwei-Wege-Bindungen ([Knockout](knockout.md), AngularJS, [Backbone](backbone.md) mit Events). Beides wird in großen Oberflächen unübersichtlich: Wer hat diesen Knoten zuletzt geändert, und in welcher Reihenfolge laufen die Bindungen?

React dreht die Frage um: Man beschreibt nicht, *wie* sich die Oberfläche ändert, sondern *wie sie aussieht*, für jeden Zustand komplett. Bei einer Änderung wird die Beschreibung neu erzeugt; ein Vergleich (Virtual DOM, Reconciliation) findet heraus, welche DOM-Operationen nötig sind. Daten fließen nur in eine Richtung, von oben nach unten. Das macht Komponenten vorhersagbar, kostet aber Arbeit bei jedem Update, und genau daran arbeitet React seither (Fiber, Concurrent Rendering, Compiler).

## Kernkonzepte

### 1. Komponenten und JSX

```jsx
function Greeting ({ name }) {
  return <p className="greeting">hallo {name}</p>;
}

function App () {
  return <Greeting name="welt" />;
}
```

JSX ist Syntax für `createElement(type, props, ...children)` und wird vom Build übersetzt. Attribute heißen wie die DOM-Properties (`className`, `htmlFor`), Events sind camelCase (`onClick`). Eine Komponente gibt Elemente zurück, keine DOM-Knoten.

### 2. Zustand und Hooks

```jsx
import { useEffect, useState } from 'react';

function Counter () {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = `${count} klicks`; }, [count]);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

`setCount` plant einen neuen Render der ganzen Komponente; `count` ist in jedem Render eine Konstante. Hooks werden über ihre **Aufrufreihenfolge** zugeordnet, deshalb gelten die Regeln: nur oben in der Komponente, nie in Bedingungen oder Schleifen. Effekte bekommen eine Abhängigkeitsliste, die von Hand stimmen muss (oder vom Linter geprüft wird).

### 3. Listen und Schlüssel

```jsx
<ul>
  {todos.map(todo => <li key={todo.id}>{todo.title}</li>)}
</ul>
```

Kontrollfluss ist normales JavaScript (`map`, `&&`, `? :`). `key` sagt der Reconciliation, welches Element zu welchem Eintrag gehört; ohne stabilen Schlüssel werden Zustand und DOM-Knoten beim Umsortieren falsch zugeordnet.

### 4. Actions und Formulare (19)

```jsx
import { useActionState, useOptimistic } from 'react';

function Rename ({ name, save }) {
  const [optimistic, setOptimistic] = useOptimistic(name);
  const [error, submit, pending]    = useActionState(async (previous, form) => {
    setOptimistic(form.get('name'));
    return await save(form.get('name'));   // returns an error or null
  }, null);

  return (
    <form action={submit}>
      <input name="name" defaultValue={optimistic} />
      <button disabled={pending}>speichern</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

Eine *Action* ist eine asynchrone Funktion in einer Transition. React verfolgt Pending-Zustand, Fehler und Reihenfolge selbst; `<form action>` nimmt eine Funktion statt einer URL, `useOptimistic` zeigt den erwarteten Wert, bis die Antwort da ist.

### 5. `use` und Suspense

```jsx
import { Suspense, use } from 'react';

function User ({ promise }) {
  const user = use(promise);   // suspends until resolved
  return <p>{user.name}</p>;
}

<Suspense fallback={<p>lädt …</p>}>
  <User promise={loadUser(id)} />
</Suspense>
```

`use` liest ein Promise oder einen Context und darf, anders als Hooks, in Bedingungen stehen. Ist das Promise offen, „wirft“ die Komponente; die nächste `<Suspense>`-Grenze darüber zeigt den Fallback. Async ist damit kein Block im Markup, sondern eine Eigenschaft des Baums.

### 6. Server Components und Server Functions

```jsx
// note.jsx (server component: runs only on the server, ships no js)
export default async function Note ({ id }) {
  const note = await db.notes.get(id);
  return <article>{note.text}<Like id={id} /></article>;
}

// like.jsx
'use client';
export function Like ({ id }) { /* hooks, events */ }

// actions.js
'use server';
export async function like (id) { await db.likes.add(id); }
```

Server Components laufen nur auf dem Server und dürfen direkt auf Daten zugreifen; ihr Ergebnis wird als serialisierter Baum (Flight-Protokoll) zum Client gestreamt. `'use client'` markiert die Grenze zu interaktiven Komponenten, `'use server'` Funktionen, die der Client wie eine lokale Funktion aufruft. Das braucht einen Bundler und ein Framework (Next.js, React Router, Waku); React allein liefert nur die Bausteine. Im Dezember 2025 wurde in der Server-Seite dieses Protokolls eine Lücke mit Codeausführung ohne Anmeldung gefunden (CVE-2025-55182, „React2Shell“, CVSS 10), behoben in 19.0.1, 19.1.2 und 19.2.1.

### 7. React Compiler

```jsx
// written
function Total ({ items }) {
  const sum = items.reduce((total, item) => total + item.price, 0);
  return <p>{sum}</p>;
}

// compiled (simplified)
import { c as _c } from 'react/compiler-runtime';
function Total ({ items }) {
  const $ = _c(4);   // a cache with 4 slots per component instance
  let sum, element;
  if ($[0] !== items) { sum = items.reduce((total, item) => total + item.price, 0); $[0] = items; $[1] = sum; }
  else sum = $[1];
  if ($[2] !== sum) { element = <p>{sum}</p>; $[2] = sum; $[3] = element; }
  else element = $[3];
  return element;
}
```

Ein Babel-Plugin (`babel-plugin-react-compiler`, 1.0 seit Oktober 2025), das Komponenten und Hooks analysiert und Werte automatisch zwischenspeichert. `useMemo`, `useCallback` und `memo` werden weitgehend überflüssig. Voraussetzung: Die Komponenten halten die Regeln ein (reine Render-Funktionen, keine Mutation von Props oder Zustand); wo nicht, lässt der Compiler die Komponente aus.

### 8. Neu in 19.2 und 19.3

| API | seit | macht |
|---|---|---|
| `<Activity mode="hidden">` | 19.2 | versteckt einen Teilbaum, behält aber Zustand und DOM |
| `useEffectEvent` | 19.2 | eine Funktion, die im Effekt immer die neuesten Werte sieht, ohne Abhängigkeit zu sein |
| `<ViewTransition>`, `addTransitionType` | 19.3 | Übergänge über die View Transitions API des Browsers |
| `ref` auf `<Fragment>` | 19.3 | Zugriff auf alle DOM-Kinder eines Fragments (Fokus, Observer, Events) |
| `browser()` aus `react-dom` | 19.3 | `use(browser())` markiert einen Teilbaum als nur im Browser rendern |

Dazu Partial Prerendering (`prerender` und `resume`, 19.2) und Trusted Types (19.3). Transitions werden seit 19.3 unabhängig voneinander gerendert, eine langsame hält andere nicht mehr auf.

## Wie es intern arbeitet

Ein Render erzeugt Elemente (`{ type, props, key }`). Der Reconciler hält dazu einen zweiten Baum aus **Fibers**: ein Objekt pro Komponente oder Host-Element, mit Zustand, Hooks (als verkettete Liste, deshalb die Reihenfolge-Regel), Effekten und Verweisen auf Kind, Geschwister und Elternteil. Ein Update läuft in zwei Phasen: Die **Render-Phase** ruft Komponenten auf und vergleicht mit dem vorigen Fiber-Baum (gleicher Typ heißt behalten, Kinder über `key` oder Position); sie ist unterbrechbar und kann verworfen werden. Die **Commit-Phase** schreibt die gesammelten Änderungen ins DOM und führt Effekte aus, ohne Unterbrechung.

Updates bekommen eine Priorität (*Lanes*): Eingaben sind dringend, Transitions dürfen warten und werden von dringender Arbeit unterbrochen. Ein Scheduler verteilt die Render-Phase auf kleine Zeitscheiben, damit der Main Thread frei bleibt. Events registriert React einmal an der Wurzel und verteilt sie selbst (synthetische Events); Updates aus einem Handler werden gesammelt (Automatic Batching seit 18).

Bei Server Components serialisiert der Server den Baum als Flight-Strom: fertige Elemente als JSON-artige Zeilen, Client-Komponenten als Verweise auf Module, offene Promises als Platzhalter, die später nachkommen. Der Client baut daraus Elemente und reconciled sie wie lokal erzeugte.

## Stärken und Schwächen

- **Stark:** das größte Ökosystem im Frontend (Bibliotheken, Frameworks, Werkzeuge, Erfahrung auf dem Arbeitsmarkt), ein einfaches mentales Modell (View als Funktion), JSX ist nur JavaScript, sehr gute Werkzeuge (DevTools, Performance Tracks). Server Components und Streaming sind weiter als bei jedem anderen Framework. Mit React Native dieselbe Komponentensprache auf Mobilgeräten.
- **Schwach:** groß (`react` 3,4 kb, mit `react-dom/client` 67,2 kb) und langsamer als feingranulare Frameworks, weil jede Änderung die ganze Komponente neu rendert. Hook-Regeln, Abhängigkeitslisten und Memoisierung sind Komplexität, die das Modell selbst erzeugt; der Compiler verdeckt sie, statt sie zu entfernen. Eigenes Event-System und Property-Namen statt HTML-Attributen. Server Components binden an Bundler und Framework und haben eine neue Angriffsfläche geschaffen (React2Shell).

## Für rat und aufbau

- **Das Gegenmodell.** rat sagt in `concept.md` ausdrücklich: keine Kompatibilität mit dem React-Ökosystem, kein VDOM, keine JSX-Parität. React rendert die Komponente bei jeder Änderung neu und vergleicht; rat führt sie einmal aus und lässt Signals einzelne Löcher schreiben (über `@domina/render`). [Preact](preact.md) zeigt den Zwischenweg (VDOM plus Signals), [SolidJS](solidjs.md) den Weg mit JSX ohne VDOM.
- **Zwei Compiler, zwei Aufgaben.** Der React Compiler ist nachträglich gebaut, um die Kosten des Re-Render-Modells zu senken (Caches pro Komponente). rats Compiler ist das Modell: Er erzeugt aus `{…}` direkt feingranulare Effekte, es gibt nichts zu memoisieren. Dass React heute einen Compiler braucht, um performant zu sein, stützt rats Grundsatz „compiler over runtime magic“.
- **Custom Elements in React 19:** React setzt Props auf Custom Elements jetzt als Properties (statt alles als String-Attribut) und bindet Events. `@aufbau/elements` sind damit in React-Apps ohne Wrapper nutzbar; vor 19 brauchte man Refs oder Adapter.
- **Async: vierte Variante für d-28.** React hat keinen `@await`-Block: Die Komponente liest mit `use(promise)` und hält an, eine `<Suspense>`-Grenze weiter oben zeigt den Platzhalter. Gegenüber rats Variante b (`@await (user of load($id))` mit `@pending`) trennt das Laden und Anzeigen räumlich, was bei verschachtelten Daten hilft, beim Lesen einer einzelnen Datei aber die Stelle versteckt, an der gewartet wird.
- **Actions und Optimistic Updates** lösen dasselbe wie rats Kommandos (d-16) plus ein Pending-Zustand. Ein rat-Kommando, das ein Promise zurückgibt und dessen Zustand (`pending`, `error`) als Signal lesbar ist, wäre die kleine Form davon (Skizze).
- **`<ViewTransition>`** nutzt die View Transitions API statt eigener Animationen pro Element. Für rats Übergänge (`transition:fade`, [transitions.md](https://github.com/pulgasari/rat/blob/main/.md/ideas/transitions.md)) ist das eine Alternative: `@if` könnte den DOM-Wechsel in `document.startViewTransition` legen, CSS übernimmt die Animation (Vorschlag).
- **`<Activity>`** ist das Gegenteil von rats Ownership: `@if` entsorgt den Scope des Zweigs, `<Activity mode="hidden">` behält ihn. Vues `<KeepAlive>` ([Vue](vue.md)) ist dasselbe. Für Tabs mit teurem Zustand wäre eine solche Form auch in rat sinnvoll, ist aber bisher nicht vorgesehen.
- **htx und JSX:** htx (Fork von [htm](htm.md)) ist die Antwort auf „JSX ohne Build“. htm funktioniert mit React über `htm.bind(createElement)`; ein `@htx/react`-Adapter wäre so dünn wie `@htx/preact`, ist aber nur sinnvoll, wenn ein Projekt React wirklich braucht.

Quellen: [React CHANGELOG](https://github.com/react/react/blob/main/CHANGELOG.md), [npm: react](https://www.npmjs.com/package/react), [npm: babel-plugin-react-compiler](https://www.npmjs.com/package/babel-plugin-react-compiler), [The React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation), [Linux Foundation: React Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-react-foundation), [CVE-2025-55182](https://arcticwolf.com/resources/blog-uk/cve-2025-55182-critical-remote-code-execution-vulnerability-found-in-react-server-components/). Stand: 21. Oktober 2026.
