# MobX

Eine Bibliothek für reaktiven Zustand, 2015 von Michel Weststrate (später auch Autor von Immer). Das Prinzip: Zustand ist ein ganz normales Objekt, das man direkt verändert, und alles, was davon abgeleitet ist (Berechnungen, UI), aktualisiert sich von selbst. Bekannt vor allem aus React-Projekten, aber unabhängig davon. MobX 7 (Juli 2026) hat alte Kompatibilitätspfade entfernt; aktuell 7.0.

- Website: https://mobx.js.org
- Repository: https://github.com/mobxjs/mobx
- Build: keiner (Decorators optional, dann nach dem Stage-3-Standard)

## Das Problem, das MobX löst

Redux, damals der Standard für Zustand in React, verlangt für jede Änderung eine Action, einen Reducer, eine unveränderliche Kopie und Selektoren, die festlegen, welche Komponente was neu rendern muss. Viel Code für "erhöhe den Zähler". MobX sagt: Schreib einfach `store.count++`. Was davon abhängt, findet MobX selbst heraus, indem es beobachtet, welche Werte gelesen werden.

Das Motto aus der Doku: *Anything that can be derived from the application state, should be. Automatically.*

## Kernkonzepte

### 1. Observables

```js
import { autorun, makeAutoObservable } from 'mobx';

class Todos {
  items = [];
  filter = 'all';

  constructor () { makeAutoObservable(this); }

  get open () { return this.items.filter(todo => !todo.done); }   // computed

  add (title) { this.items.push({ title, done: false }); }        // action
}

const todos = new Todos;
autorun(() => console.log(`${todos.open.length} offen`));
todos.add('Brot');   // logs "1 offen"
```

`makeAutoObservable` macht Felder zu Observables, Getter zu Computeds und Methoden zu Actions. Danach ist das Objekt ein normales JavaScript-Objekt, nur dass Lesen und Schreiben beobachtet werden.

### 2. Mutation ist erlaubt

```js
todos.items.push(item);       // notifies
todos.items[0].done = true;   // notifies, deep
delete todos.settings.theme;  // notifies (proxy)
```

Anders als bei Redux, React-State oder vielen Signal-Bibliotheken wird nicht neu zugewiesen, sondern verändert. Arrays, Maps, Sets und verschachtelte Objekte sind tief beobachtbar. Seit MobX 7 immer über Proxies; der alte ES5-Weg ohne Proxies ist entfernt.

### 3. Computeds

```js
get total () { return this.items.reduce((sum, item) => sum + item.price, 0); }
```

Ein Computed wird erst berechnet, wenn ihn jemand liest, dann zwischengespeichert, und nur neu berechnet, wenn sich eine gelesene Quelle geändert hat. Liest ihn niemand mehr, wird er wieder vergessen. Berechnungen laufen glitch-frei: Ein Computed sieht nie einen halb aktualisierten Zustand.

### 4. Actions und Transaktionen

```js
import { action, runInAction } from 'mobx';

const save = action(() => { store.saving = true; store.error = null; });

runInAction(() => { store.a = 1; store.b = 2; });   // one notification for both
```

Actions bündeln Änderungen: Reaktionen laufen erst danach, einmal. Im Strict Mode (`configure({ enforceActions: 'always' })`) sind Änderungen außerhalb von Actions verboten, damit Schreibstellen auffindbar bleiben.

### 5. Reaktionen

```js
autorun(() => document.title = `${todos.open.length} offen`);   // runs now and on every change

reaction(
  () => todos.filter,                         // what to watch
  filter => router.push(`?filter=${filter}`), // what to do, without tracking
);

await when(() => todos.loaded);               // promise once the condition holds
```

`autorun` verfolgt alles, was es liest. `reaction` trennt "was beobachten" von "was tun", damit der Effekt selbst nichts Unbeabsichtigtes abonniert. Jede Reaktion gibt eine Funktion zum Beenden zurück.

### 6. Asynchronität: `flow`

```js
fetchUser = flow(function* (id) {
  this.loading = true;
  this.user = yield api.user(id);   // after yield, still inside an action
  this.loading = false;
});
```

Ein Generator statt `async`, weil MobX nach jedem `yield` wieder in eine Action einsteigen kann. Mit `async` müsste jede Änderung nach einem `await` in `runInAction` stehen.

### 7. Anbindung an UIs

```js
import { observer } from 'mobx-react-lite';

const Counter = observer(() => <button onClick={() => store.count++}>{store.count}</button>);
```

`observer` macht das Rendern selbst zu einer Reaktion: Die Komponente rendert neu, wenn sich etwas ändert, das sie beim letzten Rendern gelesen hat, und nur dann. Keine Selektoren, keine `useMemo`-Listen. Bindings gibt es für React, Vue, Angular, Lit (`@adobe/lit-mobx`) und andere.

### 8. MobX 7: was sich geändert hat

| vorher | MobX 7 |
|---|---|
| `observable.ref`, `.shallow`, `.struct`, `computed.struct`, `action.bound` | einzelne Exporte: `observableRef`, `observableShallow`, `computedStruct`, `actionBound` … |
| `comparer.structural` | `compareStructural` |
| Proxies optional (`useProxies`) | immer Proxies |
| Legacy-Decorators (TypeScript `experimentalDecorators`) | nur noch Stage-3-Decorators |
| `trace()` | entfernt, stattdessen `spy`, `getDependencyTree` |

Ziel war vor allem die Größe: produktiv rund 14 kb gz statt 17 kb.

## Wie es intern arbeitet

MobX ist ein Abhängigkeitsgraph aus drei Knotentypen: **Observables** (Quellen), **Computeds** (abgeleitete Werte) und **Reactions** (Effekte). Während eine Derivation läuft, merkt sich MobX jeden Lesezugriff auf ein Observable und verbindet die beiden. Ändert sich eine Quelle, werden die abhängigen Knoten als "veraltet" markiert, aber noch nicht neu berechnet (Push der Markierung, Pull der Werte). Am Ende der äußersten Action laufen die betroffenen Reactions, die dabei ihre Computeds lesen und erst dann neu berechnen lassen. Das ist dasselbe Push-Pull-Modell, das heutige Signal-Bibliotheken nutzen, nur ein paar Jahre früher und mit tief beobachtbaren Objekten statt einzelnen Werten.

## Stärken und Schwächen

- **Stark:** am wenigsten Code für Zustand, normale Objekte und Klassen, direkte Mutation, feingranulare Updates ohne Selektoren, ausgereift (seit 2015 in großen Apps), glitch-freie Computeds.
- **Schwach:** "Magie": was reaktiv ist, sieht man dem Code nicht an (ein `store.count++` sieht aus wie jede andere Zuweisung). Destructuring bricht die Verfolgung (`const { count } = store` liest einmal und nie wieder). Proxies sind nicht dieselben Objekte wie die Originale (`===`, `structuredClone`, Übergabe an fremde Bibliotheken mit `toJS`). Größer als reine Signal-Bibliotheken (12 bis 16 kb gz gegenüber 1 bis 3 kb).

## Für rat und aufbau

- **d-23 (Mutation von `$`-Arrays) ist genau die MobX-Frage.** rat erlaubt heute nur Neuzuweisung (`$todos = [...$todos, x]`). MobX zeigt, dass tiefe, beobachtete Mutation in großen Apps funktioniert, und auch, was sie kostet: Proxies, Destructuring-Fallen, Identitätsfragen. Der empfohlene Weg für rat (reaktive Typen aus `@rat/types`, `$List` mit gemeldeten Methoden) liegt dazwischen: Mutation dort, wo der Typ es ausdrücklich erlaubt, keine tiefe Magie überall.
- **Sichtbarkeit ist rats Antwort auf MobX' größte Schwäche.** Bei MobX sieht man einer Zuweisung nicht an, ob sie etwas auslöst. Bei rat steht es im Namen: `$count++` reagiert, `count++` nicht.
- **`reaction(watch, effect)`** ist eine nützliche Form für rat: ein Effekt, der nur auf ausdrücklich genannte Quellen hört und im Effekt selbst nichts abonniert. Heute verfolgt jeder rat-Effekt alles, was er liest.
- **`when(() => cond)` als Promise** ist klein und oft gebraucht ("warte, bis geladen"). Ein Kandidat für `@rat/runtime`.
- **Actions als Transaktionen** entsprechen `batch()` in rats Runtime. MobX' Strict Mode (Schreiben nur in Actions) wäre eine Dev-Warnung, die rat aus dem Compiler heraus geben könnte.
