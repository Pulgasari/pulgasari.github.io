# Preact

Eine kleine Alternative zu React mit derselben API: Komponenten, JSX, Hooks, Virtual DOM, in rund 5 kb statt rund 45 kb. Von Jason Miller (developit, auch Autor von [htm](htm.md)), seit September 2015. Preact 11 erschien im September 2026 nach langer Beta; aktuell 11.0.1 (Oktober 2026), aktiv. Dazu `@preact/signals` (seit 2022, aktuell 2.11), das Signals in Komponenten bringt.

- Website: https://preactjs.com
- Repository: https://github.com/preactjs/preact
- Abhängigkeiten: keine
- Build: keiner nötig mit [htm](htm.md), sonst JSX über einen Transpiler

## Das Problem, das Preact löst

React war 2015 das Modell der Wahl, aber groß, mit eigenem Event-System (Synthetic Events) und Kompatibilitätsschichten für alte Browser. Für Websites, Widgets und Geräte mit wenig Leistung zu schwer.

Preact behält das Modell (Komponente = Funktion vom Zustand zur View, Virtual DOM, Hooks) und lässt alles weg, was der Browser selbst kann: echte DOM-Events statt synthetischer, `class` statt `className`, kein eigener Scheduler. Was React-spezifisch bleibt, liegt in `preact/compat`, damit React-Bibliotheken trotzdem laufen.

## Kernkonzepte

### 1. Komponenten und Hooks

```js
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function Counter () {
  const [count, setCount] = useState(0);
  return h('button', { onClick: () => setCount(count + 1) }, count);
}

render(h(Counter), document.body);
```

Mit JSX `<button onClick={…}>{count}</button>`, mit htm ``html`<button onClick=${…}>${count}</button>` ``. Jede Zustandsänderung rendert die Komponente neu, der Virtual DOM vergleicht und schreibt nur Unterschiede.

### 2. Nah am DOM

```js
h('label', { class: 'field', for: 'name' })                     // class and for, not className / htmlFor
h('input', { onInput: event => setName(event.currentTarget.value) })  // real dom events
h('my-element', { items: list })                                // custom elements get properties
```

Events sind echte `addEventListener`-Listener, Attribute heißen wie in HTML, Custom Elements bekommen Objekte als Properties. Deshalb funktionieren Web Components (wie `@aufbau/elements`) in Preact ohne Umwege, was in React lange nicht galt.

### 3. Signals: feingranular im Virtual DOM

```js
import { computed, signal } from '@preact/signals';

const count  = signal(0);
const double = computed(() => count.value * 2);

function Counter () {
  return h('button', { onClick: () => count.value++ }, double);   // the signal itself as a child
}
```

Wird ein Signal **selbst** (nicht `count.value`) in die View gegeben, bindet Preact es direkt an den Textknoten: Eine Änderung schreibt nur diesen Text, die Komponente rendert nicht neu. Wird `.value` im Render gelesen, abonniert die Komponente das Signal und rendert bei Änderung neu, wie bei einem Hook. Zwei Granularitäten in einem System.

### 4. Models (`@preact/signals` 2.x)

```js
import { createModel, signal, useModel } from '@preact/signals';

const CounterModel = createModel(() => ({
  count: signal(0),
  increment () { this.count.value++; },
}));

function Counter () {
  const model = useModel(CounterModel);
  return h('button', { onClick: () => model.increment() }, model.count);
}
```

Neu in 2.x: Zustand und Methoden als Model, pro Komponente einmal angelegt; dazu `action()` für gebündelte Änderungen. Das ist Preacts Antwort auf Stores wie Zustand oder MobX, aus Signals gebaut.

### 5. Preact 11

Was 11 gegenüber 10 bringt: `createPortal` im Kern (vorher nur in `compat`), `moveBefore` beim Umsortieren von Knoten, wo der Browser es kennt (Fokus und Zustand verschobener Elemente bleiben), verbesserte Hydration mit Suspense, kein Klonen von Fragmenten auf oberster Ebene mehr. In `compat` neu: `use`, `useEffectEvent`. Die Kern-API bleibt die von Preact 10.

## Wie es intern arbeitet

Ein Render erzeugt einen Baum aus VNodes (`{ type, props, key }`). `diff()` vergleicht ihn mit dem vorigen Baum der Komponente: gleicher Typ heißt Element behalten und Props abgleichen, anderer Typ heißt ersetzen, Kinder werden über `key` oder Position zugeordnet. Anders als React hält Preact keinen eigenen „Fiber“-Baum mit unterbrechbarer Arbeit; der Vergleich läuft in einem Durchgang, die nötigen Verweise hängen an den VNodes. Updates werden pro Microtask gesammelt (`options.debounceRendering`) und in Baumreihenfolge ausgeführt.

`@preact/signals` hängt sich über `options` (Hooks in den Render-Ablauf) ein: Ein Signal als Kind wird zu einer kleinen Text-Komponente mit eigenem Effekt; ein Signal-Lesezugriff im Render macht die Komponente zum Abonnenten. Der Signal-Kern (`@preact/signals-core`) arbeitet mit doppelt verketteten Listen und Versionen, einer der Vorfahren von [alien-signals](alien-signals.md).

## Stärken und Schwächen

- **Stark:** klein (Kern 4,9 kb, mit Hooks 6,3 kb), schnell, React-kompatibel genug für die meisten Bibliotheken, echtes DOM-Verhalten, gute Web-Component-Unterstützung, ohne Build nutzbar (htm). Signals machen Updates in großen Bäumen billig.
- **Schwach:** Der Virtual DOM bleibt: Ohne Signals rendert eine Änderung die ganze Komponente und vergleicht. `compat` deckt nicht jede React-Neuheit sofort ab (Server Components gibt es nicht). Die zwei Granularitäten von Signals (Signal als Kind gegen `.value` im Render) sind eine Falle: Wer `.value` schreibt, verliert den Vorteil still.

## Für rat und aufbau

- **zugriff baut darauf:** Preact plus `htx` (Fork von htm) plus `@aufbau/signals` (Fork von `@preact/signals`). Preact 11 ist für zugriff vor allem wegen `moveBefore` interessant: Custom Elements aus `@aufbau/elements` in umsortierten Listen verlieren keinen Zustand mehr. Ein Upgrade lohnt sich, die API bleibt gleich.
- **`createModel` gegen `@aufbau/store`:** Beide bündeln Zustand und Methoden. `createModel` legt pro Komponente an, `@aufbau/store` ist global mit Typen und Persistenz. Wenn `@aufbau/signals` mit `@preact/signals` 2.x gleichzieht, könnte `useModel` ein `@aufbau/store` direkt annehmen.
- **Signal als Kind ist rats `{…}`-Loch,** nur von Hand: Preact bindet `{count}` feingranular, `{count.value}` grob. rats Compiler macht jedes `{…}` zum feinen Fall, ohne dass jemand zwischen beiden wählen muss. Das ist der Unterschied zwischen „Signals in einem VDOM-Framework“ und „Signals als Fundament“ ([reactivity_models.md](../reactivity_models.md)).
- **Echte Events, HTML-Attributnamen:** Diese Entscheidungen von Preact teilt rat schon (`onclick`, `class`). Gut zu sehen, dass sie mit React-Kompatibilität vereinbar sind.
