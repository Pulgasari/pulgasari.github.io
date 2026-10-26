# signal shape :: `.value` or a function

rat's signals are objects with `.value` today. alien-signals, whose graph `@rat/signals` uses, has a
second shape in its own api: a signal **is a function**.

```js
// today: an object
const count = signal(0);
count.value;            // read
count.value = 5;        // write

// the alien form: a function
const count = signal(0);
count();                // read: called without an argument
count(5);               // write: called with one
```

The question: could rat take the function form as its only shape, what changes, what is better, what worse.

---

## short answer

**Possible, yes:** the graph does not care how a node is exposed. `@rat/signals` is a facade over
alien-signals' system, the facade decides the shape. It is a change of the facade, the compiler and every
place that touches a signal by hand.

**Worth it, hardly:** in `.rat` files the compiler writes the access anyway (`$count` stays `$count`), so the
shape is felt only in plain `.js` and where signals are handed around. There the function form brings one
real gain (a signal is a getter you can pass straight on) and several real traps (a signal looks like every
other function). A mixed form (callable **and** `.value`) avoids the switch but says everything twice.

---

## where the shape is felt

| where | today | function form |
|---|---|---|
| `.rat` script, `$` names | `$count++` (the compiler writes `.value`) | `$count++` (the compiler writes the call) |
| `.rat` markup | `{$count}` | `{$count}` |
| plain `.js` (stores, libraries) | `tracks.value = […]`, `player.time.value` | `tracks([…])`, `player.time()` |
| handing a signal on | `<Panel items={list} />`, `let { $x } = obj` | the same |
| inside rat (runtime, app, types) | `.value` in ~50 places | calls |

In the apps of this repo: 231 times `.value` in 19 plain `.js` files (noisy's `library.js`, `player.js`,
ebooks' `lib.js` …). In `.rat` files it is not written at all.

So: **for `.rat` code nothing changes in how it reads.** The decision is about plain JS and the runtime.

---

## what would change

### 1. `@rat/signals`

A node is no longer the object the app holds. The app holds a function that closes over the node:

```js
function signal (value) {
  const node = new SignalNode(value);
  const accessor = function (next) {
    if (!arguments.length) return node.read();   // count()
    node.write(next);                            // count(5)
  };
  accessor[NODE] = node;                         // for isSignal, peek, the runtime
  return accessor;
}

const computed = getter => { const node = new ComputedNode(getter); const accessor = () => node.read(); accessor[NODE] = node; return accessor; };
const isSignal = value => typeof value === 'function' && NODE in value;
```

- `arguments.length` tells read from write: `count(undefined)` writes `undefined`, `count()` reads.
- `peek()`, `toString()` move to the function (`count.peek()`), or to helpers (`peek(count)`).
- a computed called with an argument: an error, or nothing (alien: nothing).

### 2. the compiler

Today every read and write of a `$` name gets `.value` appended: an insertion, the code around it stays.
With functions a write is no longer an assignment, it becomes a call that wraps the right side:

| written | today | function form |
|---|---|---|
| `$count` | `$count.value` | `$count()` |
| `$count = 5` | `$count.value = 5` | `$count(5)` |
| `$count += 2` | `$count.value += 2` | `$count($count() + 2)` |
| `$count++` | `$count.value++` | `$$.inc($count)` (the old value is the result) |
| `[$a, $b] = [$b, $a]` | `[$a.value, $b.value] = […]` | needs temporaries |
| `{ $x }` | `{ $x: $x.value }` | `{ $x: $x() }` |

Assignment forms, `++`, `--` and destructuring assignment become rewrites with helpers instead of
insertions. Doable (Svelte 5 and others do the same), but `script.js` becomes more involved, and source maps
need more care.

### 3. the runtime

- `isSignal` checks the brand on a function instead of `instanceof`.
- every `.value` in runtime, `@rat/app`, `@rat/types` becomes a call.
- the reactive variants keep a version signal inside, nothing changes for them outwardly.

### 4. `$Bool`, `$Num`, `$Str`, `$Enum`

These are objects with `.value` and methods (`toggle()`, `inc()`, `cycle()`). They stay objects. A signal
would be called, a `$Enum` read through `.value`: **two shapes for "a value that changes"**, where today
there is one.

### 5. everything written by hand

The 231 `.value` of the apps, the docs, the d.ts, `aufbau`'s and `bunker`'s places that take a signal.

---

## advantages

1. **Less to write in plain JS.** `player.time()` instead of `player.time.value`, `tracks(next)` instead of
   `tracks.value = next`. On long chains it reads lighter.
2. **A signal is a getter.** Wherever an api takes "a function that gives the current value", a signal fits
   as it is: a reactive hole in `@domina/render` (`${count}` instead of `${() => count.value}`), `computed`
   chains, `effect(() => …)` arguments, `Array.from({ length }, …)`. Today such a place needs an arrow
   around it.
3. **Closer to alien-signals, Solid's getters, S.js, Knockout, Angular's `count()`.** Code and examples of
   those carry over more directly.
4. **Read and write are visibly different.** `count()` vs `count(5)`; `count.value` reads the same in both
   directions, only the `=` tells.
5. **Smaller on the wire in plain JS**: `x()` is shorter than `x.value`, it adds up in a minified bundle
   (a few hundred bytes for an app, not much).

---

## disadvantages

1. **A signal looks like any other function.** This is the main one. rat hands functions around all the
   time, and the runtime decides by `typeof value === 'function'`:
   - `onclick={$open}`: a function in an `on*` attribute is a **handler**: the click would write the event
     object into `$open`.
   - `ref={$el}`: a function in `ref` is **called with the element**: here it happens to be right (it writes
     the element), by accident rather than by design.
   - a prop `onchange={…}` and a prop `items={$list}` can no longer be told apart by their type, only by a
     brand check. Every place that takes "a value or a getter or a callback" needs to know which.
2. **Forgetting the call fails quietly.**
   - `` `${count}` `` prints the source of a function.
   - `if (count)` is always true.
   - `JSON.stringify({ count })` drops it (functions are not json).
   - `count + 1` concatenates the source.

   With `.value` forgetting gives an object: also wrong, but `toString()` (rat's signals have it) prints the
   value, and `JSON.stringify` shows a structure, not nothing.
3. **Writes are not assignments anymore.** `+=`, `++`, destructuring assignment, `??=` all need rewriting in
   the compiler, and by hand in plain JS (`count(count() + 1)`). With `.value` every JS operator just works.
4. **Two shapes in `@rat/types`.** Signals called, `$Enum`/`$Bool`/`$Num`/`$Str` read through `.value`. Or
   those change too, and lose their methods' natural home (`$open.toggle()` on a function works, but then
   `$open.value` and `$open()` exist side by side).
5. **The standard goes the other way.** The TC39 signals proposal has `new Signal.State(0)` with
   `.get()`/`.set()`: an object. Preact, Vue and Angular's writable signals keep an object or methods for
   writing. If the platform ever ships signals, `.value`/`.get()` is closer.
6. **Debugging.** Devtools show `ƒ accessor()` for a signal; an object shows its fields (`currentValue`,
   flags). A function can carry them as properties, but the console folds them away.
7. **Memory per signal.** A closure plus a node instead of one object. Small, but a list of thousands of
   signals feels it; alien-signals itself binds a function per node for this shape.
8. **The cost of the switch.** Facade, compiler rewrites, runtime, types, d.ts, docs, 231 places in the apps.

---

## a middle form: callable and `.value`

```js
const count = signal(0);
count();          // read
count(5);         // write
count.value;      // read
count.value = 6;  // write
```

The function gets a `value` accessor. Nothing breaks, plain JS may use either, the compiler stays as it is.

- **For it:** no migration, a signal fits wherever a getter is wanted, `.value` code keeps working.
- **Against it:** two ways to say the same thing in every file, which one a library uses becomes taste.
  Trap 1 (a signal is a function everywhere the runtime asks `typeof`) comes along in full.

---

## what alien-signals itself does

alien-signals ships the function form as its public api (`signal()`, `computed()`, `effect()` return
functions). Its core (`createReactiveSystem`, the part `@rat/signals/system.js` is) knows no shape at all:
nodes and links. That is exactly why rat can choose. Preact signals, built on a similar graph, chose
`.value`; Solid chose a `[get, set]` pair; Angular chose a callable to read and `.set()` / `.update()` to write.

Angular's split is worth a look: **read by calling, write by a method.**

```js
count();            // read
count.set(5);       // write
count.update(n => n + 1);
```

It keeps "a signal is a getter" (advantage 2) and makes a write unmistakable, so a signal handed in as a
handler can not write by accident (trap 1, the `onclick` case). It still has the other traps of a function
(printing, truthiness, json).

---

## verdict

| | `.value` (today) | function (alien) | callable + `.value` | call to read, `.set()` to write (Angular) |
|---|---|---|---|---|
| `.rat` code | unchanged | unchanged | unchanged | unchanged |
| plain JS | `.value` everywhere | shortest | either | `x()` and `x.set()` |
| a signal as a getter | needs an arrow | yes | yes | yes |
| js operators (`+=`, `++`) | work | rewrites | work on `.value` | rewrites |
| confused with a callback | no | **yes** | **yes** | partly (it can not write when called with one) |
| fits `$Enum`, `$Bool` … | yes | no | yes | no |
| switch cost | – | high | low | high |

For rat, where the compiler hides the shape in `.rat` files and the runtime tells props, handlers and holes
apart by `typeof`, `.value` stays the safer base. The one real gain of the function form, a signal as a
getter, is available more cheaply: a `get` on the object (`count.get`, bound once) or the runtime treating a
signal like a getter wherever it already accepts one (a hole in `@domina/render` that gets `count` and calls
`count.value`). That takes the advantage without the traps.

If plain JS is written much more than today (a lot of stores and libraries outside `.rat`), the callable +
`.value` middle form is the one to try first: no migration, and it shows in practice whether `count()` gets
used at all.
