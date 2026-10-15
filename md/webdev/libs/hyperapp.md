# Hyperapp

Ein Mini-Framework für Web-Apps nach der Elm-Architektur, von Jorge Bucaran, seit Januar 2017. Zustand ist ein unveränderliches Objekt, Änderungen laufen über reine Funktionen (Actions), Seiteneffekte werden als Daten beschrieben, gerendert wird über einen kleinen Virtual DOM. Hyperapp 2 erschien im Juli 2019; die letzte Version ist 2.0.22 (März 2022). Das Projekt ruht, ist aber fertig und stabil.

- Website: https://hyperapp.dev (nicht mehr gepflegt; Doku im Repository)
- Repository: https://github.com/jorgebucaran/hyperapp
- Abhängigkeiten: keine
- Build: keiner nötig (`import { app, h, text } from 'https://esm.sh/hyperapp'`)

## Das Problem, das Hyperapp löst

2017 hieß „ordentliche Architektur“ meist React plus Redux: zwei Bibliotheken, Actions, Reducer, Middleware für Seiteneffekte (Thunks, Sagas), zusammen weit über 40 kb. [Elm](elm.md) zeigte, dass dasselbe Modell (ein Zustand, reine Updates, Effekte als Daten) viel einfacher sein kann, verlangte aber eine eigene Sprache.

Hyperapp bringt Elms Architektur nach JavaScript, in einer Datei von unter 2 kb: ein Zustand, Actions als Funktionen, Effekte und Subscriptions als Tupel, die das Framework ausführt. Kein Build, keine Klassen, keine Hooks.

## Kernkonzepte

### 1. `app()`: Zustand, View, Knoten

```js
import { app, h, text } from 'hyperapp';

const Increment = state => ({ ...state, count: state.count + 1 });

app({
  init : { count: 0 },
  view : state => h('main', {}, [
    h('h1', {}, text(state.count)),
    h('button', { onclick: Increment }, text('+1')),
  ]),
  node : document.querySelector('main'),
});
```

`init` ist der Anfangszustand, `view` eine reine Funktion vom Zustand zum Virtual DOM, `node` das Element, das übernommen wird (vorhandenes HTML wird recycelt, also eine einfache Form von Hydration). Text muss ausdrücklich `text()` sein; `h` ist ein Hyperscript-Aufruf, kein JSX.

### 2. Actions: Zustand rein, Zustand raus

```js
const SetName = (state, event) => ({ ...state, name: event.target.value });
const Add     = (state, amount) => ({ ...state, count: state.count + amount });

h('input', { oninput: SetName })
h('button', { onclick: [Add, 10] }, text('+10'))   // action with a fixed payload
```

Eine Action bekommt den aktuellen Zustand und eine Payload (bei Events das Event-Objekt) und gibt den neuen Zustand zurück. Ein Tupel `[Action, payload]` bindet eine feste Payload, ohne eine neue Funktion pro Render zu erzeugen. Der Handler ist damit **ein Wert**, kein Closure.

### 3. Effekte als Daten

```js
const httpGet = (dispatch, { url, action }) =>
  fetch(url).then(response => response.json()).then(data => dispatch(action, data));

const GotUser  = (state, user) => ({ ...state, user, loading: false });
const LoadUser = state => [
  { ...state, loading: true },
  [httpGet, { url: '/api/user', action: GotUser }],   // [effecter, props]
];
```

Eine Action darf statt des Zustands ein Array zurückgeben: erst der neue Zustand, dann beliebig viele Effekte. Ein Effekt ist `[effecter, props]`, wobei der Effecter die einzige Stelle mit Seiteneffekten ist. Die Action selbst bleibt rein und testbar: Ihr Ergebnis ist ein Wert, den man vergleichen kann, kein Netzwerkaufruf. Fertige Effekte und Subscriptions liefern `@hyperapp/time` und `@hyperapp/events`, HTML-Hilfen ohne `h('…')` `@hyperapp/html`.

### 4. Subscriptions: deklarative Quellen

```js
const every = (dispatch, { delay, action }) => {
  const id = setInterval(() => dispatch(action, Date.now()), delay);
  return () => clearInterval(id);                        // unsubscribe
};

app({
  …,
  subscriptions: state => [
    state.running && [every, { delay: 1000, action: Tick }],
  ],
});
```

`subscriptions` ist eine Funktion vom Zustand zu einer Liste. Hyperapp vergleicht die Liste nach jeder Änderung mit der vorigen: Ein neuer Eintrag wird gestartet, ein verschwundener beendet, einer mit geänderten Props neu gestartet. Timer, Tastatur- oder Resize-Listener werden also nicht an- und abgemeldet, sondern **beschrieben**, wann sie aktiv sein sollen.

### 5. `memo()` und Keys

```js
h('ul', {}, state.todos.map(todo => memo(TodoItem, todo)))   // skips diffing while todo is the same object
h('li', { key: todo.id }, text(todo.title))
```

`memo(view, data)` überspringt den Vergleich eines Teilbaums, solange die Daten flach gleich sind. Das funktioniert, weil der Zustand nie verändert, nur ersetzt wird: Ein unverändertes Objekt ist dasselbe Objekt.

### 6. `dispatch`-Middleware

`app({ dispatch: next => (action, payload) => { log(action); next(action, payload); } })` umhüllt jede Zustandsänderung, etwa für Logging, Time-Travel-Debugging oder Persistenz.

## Wie es intern arbeitet

`dispatch` ist der Kern, rund 20 Zeilen: Eine Funktion wird mit dem Zustand aufgerufen und das Ergebnis erneut dispatcht, ein Tupel `[Action, payload]` ebenso; ein Array mit Zustand vorne wird zerlegt, der Zustand gesetzt und jeder Effekt mit `dispatch` aufgerufen. Hat sich der Zustand geändert (`!==`), werden die Subscriptions verglichen und ein Render per `requestAnimationFrame` eingeplant, höchstens einer pro Frame.

Der Virtual DOM ist ein klassischer Zwei-Enden-Vergleich der Kinder (Kopf und Ende gleichzeitig, dann eine Key-Tabelle für den Rest). Event-Handler werden nicht pro Element angehängt und getauscht: Jedes Element bekommt einen gemeinsamen `listener`, der die aktuelle Action aus `node.events[type]` liest. Ein Render, der nur Handler ändert, fasst `addEventListener` deshalb nicht an.

## Stärken und Schwächen

- **Stark:** winzig (1,7 kb), kein Build, ein einziges Modell für alles. Reine Actions und Effekte als Daten machen Logik ohne DOM testbar. Handler als Werte (`[Add, 10]`) statt Closures. Subscriptions als Funktion vom Zustand sind ein elegantes Muster.
- **Schwach:** Grobe Granularität: Jede Änderung rechnet die ganze View neu und vergleicht sie; ohne `memo` wird das bei großen Listen teuer. Unveränderliche Updates verschachtelter Daten sind wortreich (`{ ...state, a: { ...state.a, b } }`). Keine Komponenten mit eigenem Zustand, kein Ökosystem mehr. `h()` ohne JSX liest sich schwer.

## Für rat und aufbau

- **Handler als Daten (`[Action, payload]`) ist d-16 b.** rats offene Frage, wie Kommandos mit Argument ins Markup kommen (`onclick={['open', 'settings']}`), hat in Hyperapp eine erprobte Antwort mit genau dieser Form. Vorteil, den Hyperapp zeigt: kein neues Closure pro Render, der Handler ist vergleichbar und serialisierbar. Gegenargument für rat: In Hyperapp ist das erste Element eine Funktion, in d-16 b ein String-Name, das braucht eine Registry (`commandListener` existiert in `@rat/runtime` schon).
- **Subscriptions als Funktion vom Zustand** lassen sich direkt auf Signals übertragen: Ein Effekt, der eine Quelle startet und ihre Aufräumfunktion zurückgibt, ist dasselbe in feingranular. Für `@rat/runtime` wäre ein `subscribe(() => $running && every(1000, tick))` denkbar (Vorschlag), das die Quelle beim Wechsel auf falsch beendet. Das deckt `on:revealed`, Timer und Media Queries mit einem Muster ab.
- **Effekte als Daten** passen nicht zu rats Modell (Schreiben ins Signal ist der Effekt), wohl aber zu Tests in `@aufbau/store`: Eine Action, die `[state, effect]` liefert, ließe sich ohne DOM prüfen.
- **Der gemeinsame Listener pro Element** ist ein billiger Trick, den auch rats Runtime nutzen könnte, wenn sich Handler oft ändern (`on:click={$mode === 'a' ? f : g}`): einmal anhängen, Handler nur im Feld tauschen.
- **zugriff** rendert mit Preact und htx; Hyperapp ist dasselbe VDOM-Modell in klein, bringt aber nichts, was Preact plus `@aufbau/signals` nicht schon feingranularer löst.
