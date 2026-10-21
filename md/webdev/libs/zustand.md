# Zustand

Ein kleiner Zustandsspeicher, gebaut für React, aber ohne React nutzbar: ein Objekt mit Zustand und Aktionen, `set` zum Ändern, Selektoren zum Lesen. Kein Provider, keine Reducer, kein Boilerplate. Aus dem Entwickler-Kollektiv Poimandres (pmndrs), begonnen von Paul Henschel, 1.0 im Juni 2019; gepflegt vor allem von Daishi Kato (auch Jotai und Valtio). Version 5 seit Oktober 2024, aktuell 5.0.15 (August 2026), aktiv.

- Website: https://zustand.docs.pmnd.rs
- Repository: https://github.com/pmndrs/zustand
- Laufzeit: Browser, Node, Deno, Bun; React ≥ 18 nur für die Hooks, `zustand/vanilla` ohne React
- Abhängigkeiten: keine; optional als Peer `react`, `immer` (Middleware), `use-sync-external-store` (`zustand/traditional`)
- Build: keiner

## Das Problem, das Zustand löst

Geteilter Zustand in React lief um 2019 meist über Redux (Actions, Reducer, `connect`, viel Code für wenig Logik) oder über Context. Context hat ein grundsätzliches Problem: Jede Änderung am Wert rendert **alle** Konsumenten neu, auch die, die nur einen unveränderten Teil lesen. Dazu kamen subtile Fehler bei externen Stores in React selbst: „Zombie Children“ (ein Kind liest Daten, die das Elternteil schon entfernt hat) und Tearing im Concurrent Rendering.

Zustand ist die kleinste Lösung dafür: Der Store ist ein Modul-Singleton außerhalb von React, eine Komponente abonniert nur das Stück, das ihr Selektor liefert, und rendert nur neu, wenn sich genau dieses Stück ändert. Die Anbindung an React läuft über `useSyncExternalStore`, React's offizielle Schnittstelle für externe Stores.

## Kernkonzepte

### 1. `create`: Zustand und Aktionen in einem Objekt

```js
import { create } from 'zustand';

const useTodos = create((set, get) => ({
  items  : [],
  filter : 'all',
  add    : title => set(state => ({ items: [...state.items, { id: crypto.randomUUID(), title, done: false }] })),
  toggle : id    => set(state => ({ items: state.items.map(item => item.id === id ? { ...item, done: !item.done } : item) })),
  open   : ()    => get().items.filter(item => !item.done),
}));
```

`create` bekommt eine Funktion, die den Anfangszustand liefert, und gibt einen **Hook** zurück. Aktionen sind gewöhnliche Funktionen im selben Objekt; `get` liest den aktuellen Stand außerhalb von `set`.

### 2. Selektoren entscheiden, wann neu gerendert wird

```js
function Counter () {
  const count = useTodos(state => state.items.length);   // re-renders only when the number changes
  const add   = useTodos(state => state.add);            // functions are stable
  return <button onClick={() => add('Brot')}>{count}</button>;
}
```

Der Selektor läuft nach jeder Änderung; ist sein Ergebnis per `Object.is` gleich, bleibt die Komponente stehen. Ohne Selektor abonniert die Komponente den ganzen Store.

### 3. `useShallow` für zusammengesetzte Selektoren

```js
import { useShallow } from 'zustand/react/shallow';

const { filter, items } = useTodos(useShallow(state => ({ filter: state.filter, items: state.items })));
```

Ein Selektor, der jedes Mal ein neues Objekt baut, ist nach `Object.is` nie gleich. In Version 5 führt das sogar zu einer Endlosschleife („Maximum update depth exceeded“), weil `useSyncExternalStore` stabile Snapshots verlangt. `useShallow` vergleicht eine Ebene tief und gibt bei Gleichheit die alte Referenz zurück. `zustand/traditional` bietet den Vergleich aus Version 4 (`createWithEqualityFn`).

### 4. `set` mischt flach

```js
set({ filter: 'done' });                         // merged into the state, one level deep
set(state => ({ count: state.count + 1 }));      // from the previous state
set({ items: [], filter: 'all' }, true);          // replace: the whole state, actions included
```

`set` macht `Object.assign({}, state, partial)`. Verschachtelte Objekte muss man selbst kopieren, deshalb gibt es die `immer`-Middleware ([Immer](immer.md)), die `set(state => { state.items.push(x) })` erlaubt.

### 5. Ohne React

```js
import { createStore } from 'zustand/vanilla';

const store = createStore(set => ({ dark: false, toggle: () => set(s => ({ dark: !s.dark })) }));

const off = store.subscribe((state, previous) => {
  if (state.dark !== previous.dark) document.documentElement.classList.toggle('dark', state.dark);
});
store.getState().toggle();
off();
```

Der Store ist ein Objekt mit vier Methoden: `getState`, `setState`, `subscribe`, `getInitialState`. Ein Hook aus `create` hat dieselben Methoden, `useTodos.getState()` funktioniert also auch in Event-Handlern, Workern oder Tests. `useStore(store, selector)` bindet einen Vanilla-Store an React.

### 6. Middleware

```js
import { devtools, persist } from 'zustand/middleware';

const useSettings = create(devtools(persist(
  set => ({ theme: 'light', setTheme: theme => set({ theme }) }),
  { name: 'settings', version: 2, migrate: (old, version) => ({ ...old, theme: old.mode }) },
)));
```

Middleware sind Funktionen, die die Store-Funktion umhüllen und `set`, `get` oder die API austauschen. Mitgeliefert: `persist` (Storage, Versionen und Migration, Hydration), `devtools` (Redux DevTools), `immer`, `subscribeWithSelector` (`subscribe` mit Selektor und Vergleich), `combine` (Zustand und Aktionen getrennt, bessere Typinferenz), `redux` (Reducer und `dispatch`).

## Wie es intern arbeitet

Der ganze Kern (`zustand/vanilla`) sind gut zwanzig Zeilen: eine Variable `state`, ein `Set` von Listenern, `setState` berechnet den nächsten Zustand, bricht bei `Object.is`-Gleichheit ab, mischt sonst flach und ruft **jeden** Listener mit neuem und altem Zustand. Es gibt keinen Abhängigkeitsgraphen und keine Verfolgung von Lesezugriffen; wer was braucht, sagt der Selektor.

Die React-Seite ist ebenso klein: `useStore` ruft `useSyncExternalStore(api.subscribe, () => selector(api.getState()))`. React abonniert, ruft nach jeder Änderung den Selektor und vergleicht das Ergebnis selbst. Bei tausend abonnierten Komponenten laufen also bei jedem `set` tausend Selektoren, auch wenn sich nur ein Feld geändert hat. Das ist billig, solange Selektoren billig sind, und der Grund, warum teure Ableitungen in Zustand memoisiert werden müssen.

Größe (esbuild, minifiziert und gzip, ohne React): `createStore` 0,3 kb, `create` mit React-Anbindung 0,4 kb, alle Middleware zusammen 2,8 kb.

## Stärken und Schwächen

- **Stark:** winzig, fast keine API, kein Provider, Stores außerhalb von Komponenten les- und schreibbar, gut typisierbar, durchdachte Middleware (`persist` mit Versionen und Migration), korrekt mit Concurrent React.
- **Schwach:** grob: Jede Änderung weckt jeden Abonnenten, die Feinheit muss man über Selektoren von Hand herstellen; abgeleitete Werte gibt es nicht eingebaut (Funktionen mit `get()` oder Selektoren, ohne Cache); unveränderliche Updates verschachtelter Daten sind mühsam ohne Immer; Selektoren mit neuen Objekten sind seit Version 5 eine Fehlerquelle. Ein globaler Singleton-Store ist bei Server-Rendering pro Request falsch und braucht dort doch wieder Context.

## Für rat und aufbau

Zustand ist der Gegenentwurf zu Signals: ein Objekt, eine Liste von Listenern, und die Komponente sagt per Selektor, was sie braucht. In rat sagt es der Lesezugriff.

| Zustand | rat / aufbau | Bemerkung |
|---|---|---|
| `useTodos(s => s.items.length)` | `{$todos.length}` | rat verfolgt den Lesezugriff, der Selektor entfällt; ein Loch wird nur neu geschrieben, wenn sich sein Wert ändert |
| `set(s => ({ items: [...s.items, x] }))` | `$todos.push(x)` mit `$List` (d-23) | rat mutiert sichtbar über das `$`, Zustand kopiert immer |
| `subscribe((state, previous) => …)` | `effect(() => …)` in `@rat/signals`, `onChange(k, fn)` in `@aufbau/store` | Zustand meldet jede Änderung und überlässt den Vergleich dem Hörer, `onChange` meldet nur Änderungen eines Schlüssels |
| Aktionen im Store-Objekt | Verben in `@aufbau/store` (`toggle`, `inc`, `push` …) | aufbau leitet Aktionen aus dem Typ ab, Zustand lässt sie von Hand schreiben |
| `persist` mit `name`, `version`, `migrate` | `persist` in `@aufbau/store`, `@rat/bunker` | aufbau speichert pro Schlüssel, Zustand das ganze Objekt unter einem Namen |
| `getState`, `setState`, `subscribe` | `snapshot()`, `set`, `onChange` | siehe unten |

- **Die Schnittstelle ist der Wert, nicht die Bibliothek.** `{ getState, setState, subscribe }` ist genau die Form, die React mit `useSyncExternalStore` und Preact über `preact/compat` erwarten. `@aufbau/store` hat `snapshot()` und `onChange(k, fn)`, aber kein `subscribe(fn)` für den ganzen Store. Ein solches `subscribe`, das einmal pro Batch mit dem neuen Snapshot meldet, würde den Store in jedem React- oder Preact-Code ohne Adapter nutzbar machen (Vorschlag; der Snapshot müsste dann bei unveränderten Werten dieselbe Referenz liefern, sonst entsteht dieselbe Endlosschleife wie bei Zustand 5).
- **`version` und `migrate` für `persist`.** Zustand speichert neben dem Zustand eine Versionsnummer und ruft beim Laden einer älteren `migrate`. `@aufbau/store` hydriert pro Schlüssel und verwirft heute nichts: Wird aus einem `bool` ein `enum`, liegt der alte Wert weiter im Storage. Eine Version pro Store und ein `migrate(key, value, from)` pro Schlüssel wäre die granulare Entsprechung (Vorschlag). Dasselbe gilt für Schemas in `@rat/bunker`.
- **Nicht übernehmen: Feinheit von Hand.** Die Regel „Selektor schreiben, `useShallow` nicht vergessen“ ist genau die Arbeit, die rats Compiler und `@aufbau/signals` abnehmen. Für zugriff (Preact mit `@aufbau/signals`) bringt Zustand nichts, was Signals nicht schon besser können; [MobX](mobx.md) wäre der nähere Vergleich, Zustand der gröbere.
- **Übernehmen: Aktionen gehören in den Store.** Ein Store, der seine Änderungen als benannte Funktionen anbietet, ist leichter zu lesen und zu protokollieren als verstreute Zuweisungen. Für `$Record` in `@rat/types` könnte ein `actions`-Feld im Schema dieselbe Rolle spielen (Vorschlag), mit `batch()` um jede Aktion, wie MobX' Actions.
- **Ein Vanilla-Store in rat** lässt sich in einer Zeile anbinden: `store.subscribe(state => $theme = state.theme)` schreibt in ein rat-Signal, alles Weitere verfolgt rat selbst. Umgekehrt kann ein rat-Signal keinen Zustand-Store ersetzen, wenn React-Code mitliest; dann ist ein Adapter `fromSignal($x)` mit `getState`/`subscribe` die Brücke (Vorschlag).

Quellen: [Dokumentation](https://zustand.docs.pmnd.rs), [Repository und README](https://github.com/pmndrs/zustand), [Migration auf v5](https://github.com/pmndrs/zustand/blob/main/docs/reference/migrations/migrating-to-v5.md), [npm](https://registry.npmjs.org/zustand), Quelltext `esm/vanilla.mjs` und `esm/react.mjs` aus zustand 5.0.15. Stand: 21. Oktober 2026.
