# `$` :: a reactive system in one import

One import, one name, no compiler, no framework. `$` is at once the factory for signals, the namespace of the
reactive types and a global store with views for reading, writing and handing a signal on:

```js
import { $ } from 'dollar';

$.set.count = $(0, Num);                  // global, with a schema
$.set.tags  = $.List(Str, ['a', 'b']);    // global, a reactive type
$.set.total = $.computed(() => $.get.count * 2);

$.get.count;          // read
$.set.count = 5;      // write
$.set.count++;        // every js operator works
$.sig.count;          // the signal itself: hand it on, bind it
$.peek.count;         // read without tracking

$.sig.tags.push('c'); // methods of the type
$.effect(() => console.log($.get.count, $.get.total));

const $local = $(0, Num);   // local, not in the store
$local.value = 3;
```

This is a concept for its own sake: a shape for signals seen from the side of a library author, independent
of any framework.

---

## why this shape

Signals have three things to do: be read, be written, be handed on as themselves. Every shape has to tell
these apart, and most of them do it at the signal:

| shape | read | write | the signal | used by |
|---|---|---|---|---|
| object | `count.value` | `count.value = 5` | `count` | Preact, Vue `ref` |
| function | `count()` | `count(5)` | `count` | alien-signals, S.js, Knockout |
| pair | `count()` | `setCount(5)` | `count` | Solid |
| methods | `count.get()` | `count.set(5)` | `count` | TC39 proposal |
| compiler | `count` | `count = 5` | (hidden) | Svelte 5 |

In each of them the plain name (`count`) is the signal. Reading is the extra step: a `.value`, a call. A store
lets the plain name be the value (Vue's `reactive()`, MobX), but then the signal is out of reach. And a
property cannot tell whether what follows it is a read or a method on the signal: `store.count.get()` is
`(0).get()`, the proxy saw only `count`.

The way out: **put the intent before the key, not after it.** A view says what is wanted, the key says
which:

```js
$.get.count     // the value
$.set.count = 5 // a write
$.sig.count     // the signal
```

Every view is a proxy over the same map of signals. Nothing has to guess.

---

## the parts

### `$(value, schema?)`: a signal

```js
const $count = $(0);              // any value
const $name  = $('', Str);        // checked: every write goes through the schema
```

A signal is an object:

```js
$count.value;          // read (tracked)
$count.value = 1;      // write
$count.get();          // read, the same
$count.set(1);         // write, the same, for passing as a callback: onclick={$open.set}
$count.peek();         // read without tracking
```

The `$` prefix on a local name is only a convention: it says "this is a signal, read it through `.value`".

### the reactive types: `$.Bool`, `$.Num`, `$.Str`, `$.Enum`, `$.List`, `$.Dict` …

Signals with a schema and the methods that make sense for it:

```js
$.set.open  = $.Bool(false);
$.set.mode  = $.Enum('list', 'grid', 'table');
$.set.tags  = $.List(Str, []);
$.set.users = $.Dict(Str, User, {});

$.sig.open.toggle();
$.sig.mode.cycle();
$.sig.tags.push('new');           // a change in place, the readers update
$.sig.users.set('ada', { … });
```

A type is a signal: it lives in the store the same way, `$.get.tags` gives its value.

### the store: `$.get`, `$.set`, `$.sig`, `$.peek`

One map of key -> signal, four views over it:

| view | `view.key` | `view.key = x` | `delete view.key` |
|---|---|---|---|
| `$.get` | the value, tracked | error | – |
| `$.set` | the value (so `+=`, `++` work) | define or write | remove |
| `$.sig` | the signal | – | – |
| `$.peek` | the value, untracked | – | – |

### define or write: decided by the value

```js
$.set.count = $(0, Num);   // the value is made by $ -> DEFINE a key
$.set.count = 5;           // anything else          -> WRITE into the existing signal
$.set.cuont = 5;           // unknown key, plain value -> error: no typo creates state silently
$.set.count = $(1);        // defined key, a new signal -> error: the readers of the old one would be lost
delete $.set.count;        // remove (its effects stop updating from it)
```

Creating needs a signal, so the schema always has a place, and a typo throws instead of creating state.

### derived values and effects

```js
$.set.total = $.computed(() => $.get.price * $.get.quantity);
$.set.total = 3;                       // error: a computed is not written

const stop = $.effect(() => {
  document.title = `${$.get.count} items`;
});
stop();

$.batch(() => { $.set.a = 1; $.set.b = 2; });   // one update for both
```

A function stays a value: `$.set.onSave = $(() => …)` stores the callback. Only `$.computed(…)` derives.
That keeps the function trap away (a store where any function becomes a computed cannot hold a callback).

---

## global first

The store is global on purpose:

- **App state is global anyway.** A player's time, the open folder, the theme: they are read in many places.
  Redux, Pinia, Alpine's `$store` and Zustand all end up with one store per app.
- **No wiring.** No provider, no context, no prop drilling: a module imports `$` and reads `$.get.theme`.
- **The console is a control panel.** `$.get` is inspectable, `$.set.theme = 'dark'` in devtools changes the
  running app. No devtools extension needed for the basics.
- **Hot reload keeps state.** The store outlives a module that is reloaded.

What it costs, and the answers:

| cost | answer |
|---|---|
| two modules want the same key | keys by convention (`'player.time'`), or a nested store (below) |
| tests share state | `$.reset()`, or a store per test (below) |
| server rendering: one global for all requests | not a target here. a server needs a store per request |
| everything reads everything | the same as with any global store: a matter of discipline, not of the api |

Local stays possible next to it: `const $local = $(0)` is not in the store, it lives as long as its references.

### a store of its own (later, if needed)

```js
const player = $.store({ playing: $.Bool(false), time: $(0, Num) });

player.get.time;
player.set.time = 12;
player.sig.playing.toggle();

$.set.player = player;            // a store inside the global one
$.get.player.get.time;            // works, reads long. a path form is an option: $.get['player.time']
```

The same four views, a map of its own. The global `$` is just the first store.

---

## without a framework

The views and an effect are enough for a page:

```js
import { $ } from 'dollar';

$.set.count = $(0, Num);

const button = document.querySelector('button');
const output = document.querySelector('output');

button.onclick = () => $.set.count++;
$.effect(() => output.textContent = $.get.count);
```

With a renderer that takes signals for its holes (lit-html with a directive, a tagged template of one's own,
any library that accepts "a getter or a signal"), `$.sig.count` is what goes in:

```js
html`<output>${$.sig.count}</output>`
```

`$.get.count` in that place would be read once: the value, not the signal. The rule: **render holes get
`$.sig`, code gets `$.get`.**

### destructuring

```js
const { count, total } = $.get;    // two values, read once: right for a snapshot
const { count, total } = $.sig;    // two signals: stay live. Vue needs toRefs() for this, here it is a view
```

---

## a sketch of the implementation

Any signal graph works underneath (alien-signals, preact's core, the TC39 polyfill). Here with alien-signals'
functional api:

```js
import { computed as derive, effect, endBatch, signal as cell, startBatch } from 'alien-signals';

const untracked = read => { … };   // the graph's way to read without a subscriber

class State {
  #cell;
  #schema;
  constructor (value, schema) { this.#schema = schema; this.#cell = cell(this.#check(value)); }
  #check (value) { return this.#schema ? this.#schema.check(value) : value; }
  get value () { return this.#cell(); }
  set value (next) { this.#cell(this.#check(next)); }
  get = () => this.value;
  set = next => { this.value = next; };
  peek = () => untracked(this.#cell);
}

class Computed extends State {
  #read;
  constructor (getter) { super(); this.#read = derive(getter); }
  get value () { return this.#read(); }
  set value (_) { throw new TypeError('[$] a computed is not written'); }
}

const store = () => {
  const states = new Map;

  const stateOf = key => {
    if (!states.has(key)) throw new ReferenceError(`[$] ${String(key)} is not defined`);
    return states.get(key);
  };

  const define = (key, state) => {
    if (states.has(key)) throw new TypeError(`[$] ${String(key)} is defined already`);
    states.set(key, state);
  };

  const keys = { getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }), ownKeys: () => [...states.keys()] };
  const view = (get, more) => new Proxy({}, { ...keys, get: (_, key) => get(stateOf(key)), has: (_, key) => states.has(key), ...more });

  return {
    get  : view(state => state.value, { set: () => { throw new TypeError('[$] $.get is read-only, write through $.set'); } }),
    peek : view(state => state.peek()),
    set  : view(state => state.value, {
      deleteProperty : (_, key) => states.delete(key),
      set            : (_, key, value) => (value instanceof State ? define(key, value) : stateOf(key).value = value, true),
    }),
    sig  : view(state => state),
  };
};

const $ = (value, schema) => new State(value, schema);

Object.assign($, store(), {
  batch    : run => { startBatch(); try { return run(); } finally { endBatch(); } },
  computed : getter => new Computed(getter),
  effect,
  store    : (entries = {}) => { const views = store(); for (const key in entries) views.set[key] = entries[key]; return views; },
  // the types: Bool, Enum, List, Dict, Num, Str … each a subclass of State with its methods
});

export { $ };
```

About 70 lines over the graph, the types aside. A typed `List` is a `State` whose methods replace the array
(or keep a version signal and change in place, the cheaper way for big lists).

### cost

- every `$.get.x` is a proxy trap plus a map lookup. Cheap, far below a dom update. In a hot loop take the
  signal once (`const time = $.sig.time`) and read `time.value`.
- the proxies exist once per store, not per access.
- all types hang on `$`: a bundler cannot drop the unused ones. A library that cares also exports them alone
  (`import { $, List } from 'dollar'`), `$.List` is then a convenience.

---

## traps

- **A read is a read, not a binding.** `const count = $.get.count` at the top of a module is a number, it does
  not update. The same as reading `.value` once: a renderer or an effect has to do the reading.
- **A signal can not be stored as a value.** `$.set.x = someState` defines. Who needs a signal inside a
  signal writes `$.sig.x.value = someState`.
- **String keys.** A symbol works as a key too, but destructuring and the console show only strings.
- **Global names are shared.** A library that uses `$` itself must not touch the app's keys: it takes a
  `$.store()` of its own.

---

## next to the others

| | read | write | the signal | without a compiler | schema |
|---|---|---|---|---|---|
| Vue `reactive()` | `state.count` | `state.count = 5` | `toRef(state, 'count')` | yes | no |
| MobX `observable` | `state.count` | `state.count = 5` | – | yes | no |
| Solid `createStore` | `state.count` | `setState('count', 5)` | – | yes | no |
| Alpine `$store` | `$store.app.count` | `$store.app.count = 5` | – | yes | no |
| nanostores | `$count.get()` | `$count.set(5)` | `$count` | yes | no |
| Svelte 5 | `count` | `count = 5` | (hidden) | no | no |
| **`$`** | `$.get.count` | `$.set.count = 5` | `$.sig.count` | yes | yes |

Its own part: **the signal is a view of the store, not a second api**, and **creating is a value with a schema**.
Reading is longer than in Vue or MobX: the price for never guessing.

---

## open questions

- **Short reads.** `$.count` as a fourth way to read (`$` itself as the get view) would make the most common
  case the shortest. It reserves every name the `$` object has (`set`, `get`, `List`, `effect` …) as a key.
- **Nested stores.** `$.get.player.get.time` reads badly. A path (`$.get['player.time']`) or a store whose
  `get` view goes through nested stores (`$.get.player.time`) are the options.
- **Persisting.** A store is a map of signals with schemas: saving it (localStorage, indexeddb) and loading it
  checked is close at hand: `$.persist('app', ['theme', 'volume'])`.
- **Devtools.** The map knows every signal by name: a panel that lists them and their readers is a small step.
