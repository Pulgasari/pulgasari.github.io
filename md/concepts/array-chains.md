# array chains :: why `.filter().map().find()` gets unreadable, and what to do

A count over the code of rat, aufbau, domina, bunker, htx and gestalt (plain `.js`, no `dist/`, no vendor):

| shape of the callback | example | lines |
|---|---|---|
| a key equals a value | `.find(row => row.id === id)` | 91 |
| `.filter(Boolean)` | | 88 |
| one key of each | `.map(entry => entry.name)` | 57 |
| a negated test | `.filter(name => !SKIP.has(name))` | 50 |
| `startsWith` in a callback | `.filter(key => key.startsWith(prefix))` | 42 |
| a hand-written comparator | `.sort((a, b) => a.added - b.added)` | 34 |
| unique values | `[...new Set(list)]` | 20 |
| a method of each | `.map(part => part.trim())` | 19 |
| split, trim, drop the empty | `.split(',').map(part => part.trim()).filter(Boolean)` | 19 |
| a sum | `.reduce((sum, item) => sum + item.size, 0)` | 17 |
| an object through its entries | `Object.fromEntries(Object.entries(object).map(…))` | 12 |

About 290 lines hold a chain of two or more of these calls. The feeling is right: **the chains are long, and
inside them the same dozen shapes come back over and over.**

---

## why it reads badly

Three things, nearly always together.

### 1. the callback says how, not what

`row => row.kind === 'file' && !row.hidden` is seven tokens of machinery for one idea: "a visible file".
Spread over a chain, the reader decodes every arrow to find out what the step is for. The idea has no name,
so it can't be read, only parsed.

### 2. one expression does several jobs

```js
// rat/packages/app/modules/folders.js
const extensions = new Set([spec].flat().flatMap(part => String(part).split(/[,\s]+/)).filter(Boolean).map(part => part.replace(/^\./, '').toLowerCase()));
```

Normalize the input, split it into words, drop the empty ones, normalize each word, make a set: five jobs,
one line, no name for any of them.

### 3. chains nested in chains, or in template literals

```js
// rat/packages/runtime/browser/keys.js
const combos = String(keys).split('|').map(combo => combo.split('+').map(part => keyName(part.trim())).filter(Boolean)).filter(combo => combo.length);
if (combos.some(combo => combo.slice(0, -1).some(part => !MODIFIERS[part]))) trackHeldKeys();

// rat/packages/types/schema.js, and the same line again in rat/packages/bunker/store.js
throw new TypeError(`[rat] ${result.issues.map(issue => (issue.path.length ? issue.path.join('.') + ': ' : '') + issue.message).join(', ')}`);
```

A chain inside an arrow inside a chain, or a chain with a ternary inside `${…}`: the eye loses track of
which parenthesis belongs to which step.

---

## the levers, from biggest to smallest

### 1. name the step: no library, the biggest win

Most of the pain goes away when every callback that is more than a key access gets a name, at module level:

```js
// folders.js
const extensionOf = part => part.replace(/^\./, '').toLowerCase();
const extensions  = new Set(words(spec).map(extensionOf));

// keys.js
const comboOf    = text  => text.split('+').map(part => keyName(part.trim())).filter(Boolean);
const needsTrack = combo => combo.slice(0, -1).some(part => !MODIFIERS[part]);

const combos = String(keys).split('|').map(comboOf).filter(combo => combo.length);
if (combos.some(needsTrack)) trackHeldKeys();

// schema.js and store.js: one helper, used twice
const issueText = ({ message, path }) => path?.length ? `${path.join('.')}: ${message}` : message;
throw new TypeError(`[rat] ${result.issues.map(issueText).join(', ')}`);
```

The chain now reads as a sentence: *the words of spec, as extensions*. *The combos that need tracking.* The
how is one jump away, under a name that says the what.

A name also shows duplicates. `issueText` was written twice, in two packages: a name makes that visible.

### 2. callback factories: the dozen shapes as functions that return the callback

The shapes of the table above are few enough to have a function each. A factory returns exactly the callback
the native method expects, so the chain stays a normal array chain. No wrapper, no pipeline library:

```js
rows.filter(match({ hidden: false, kind: 'file' }))   // row => row.kind === 'file' && row.hidden === false
rows.map(get('name'))                                 // row => row.name
rows.filter(not(match({ id })))                       // row => row.id !== id
names.filter(not(SKIP))                               // a Set is a pattern: name => !SKIP.has(name)
keys.filter(match(/^--/))                             // key => key.startsWith('--')
parts.map(call('trim'))                               // part => part.trim()
rows.toSorted(by('artist', 'album', 'track'))         // the comparator for three keys
rows.toSorted(by('added', 'desc'))
```

The set this codebase needs, by the count above:

| factory | gives | replaces |
|---|---|---|
| `match(pattern)` | a predicate. a value is `===`, a RegExp tests, a Set is membership, an object matches every key, a function is itself | `x => x.id === id`, `x => SET.has(x)`, `x => /…/.test(x)`, multi-key tests (91 + 42 + …) |
| `not(pattern)` | the predicate negated (any pattern `match` takes) | `x => !…` (50) |
| `get(key)` | `x => x[key]`, a path too (`get('meta.title')`) | the key access (57) |
| `call(method, ...args)` | `x => x[method](...args)` | `x => x.trim()` (19) |
| `by(...keys)` | a comparator: keys or getters in order, `'desc'` after a key flips it, natural order for strings | hand-written comparators (34) |

And a few that are not callbacks, for what keeps appearing around the chains:

| helper | does | replaces |
|---|---|---|
| `unique(list, key?)` | the values once, or the items once by a key | `[...new Set(…)]` (20) |
| `sum(list, key?)` | the sum, of a key | the `reduce` (17) |
| `words(text, separator = /[,\s]+/)` | split, trimmed, without the empty ones, an array of texts too | the split chain (19) |
| `mapValues(object, fn)`, `filterValues(object, fn)` | an object through its values | the entries round trip (12) |

`.filter(Boolean)` stays as it is: it already is the name of the idea.

**Most of this exists already.** `@pulgasari/it` has `match()` with exactly these pattern rules, a getter,
`pluck`, `sortBy` with natural order. `@pulgasari/arr/fp` has the data-last forms, `@pulgasari/str` has
`startsWith`, `trim` … What is missing is small: `not`, `get` with paths, `call`, `by` as a comparator, `sum`,
`words`, and the decision to **use** them in the packages. rat already imports `@pulgasari/is` the same way.

Where it stops paying: a single `x => x.id === id` is as clear as `match({ id })`. The factories earn their keep
on several keys, on negation, on sets and on comparators. A rule that holds up: the factory when it is shorter
**or** the arrow needs a second look.

### 3. one step per line

A chain of three steps or more goes vertical:

```js
paths = fs.readdirSync(root, { recursive: true })
  .filter(isSheet)
  .slice(0, 1000)
  .map(file => path.join(root, file));
```

Two steps on one line are fine. Three on one line make the reader count dots.

### 4. what the platform has now

Some of the shapes have native answers that did not exist a few years ago:

```js
Object.groupBy(books, book => book.sourceId)          // { [sourceId]: [books] }, instead of a reduce
Map.groupBy(tracks, get('album'))
rows.toSorted(by('name'))                             // a sorted copy, no [...rows].sort()
rows.toReversed(), rows.with(index, value)

new Set(a).union(b), .intersection(b), .difference(b), .isSubsetOf(b)

// iterator helpers: lazy, no array per step, on any iterator (a Map's values, a generator)
map.values().filter(match({ kind: 'file' })).map(get('path')).toArray()
entries.values().take(10).toArray()

await Array.fromAsync(stream)
```

Iterator helpers are in every engine since 2025 (Chrome 122, Firefox 131, Safari 18.4, Node 22). `groupBy`
and the `Set` methods as well.

---

## the collections out there

| what | form | for this codebase |
|---|---|---|
| [30 seconds of code](https://www.30secondsofcode.org/js/p/1/) | snippets to copy | good to look up a shape, but copying spreads the same helper into every file |
| [just](https://github.com/angus-c/just) | one tiny package per function, no dependencies | close in spirit, many packages for few functions |
| [es-toolkit](https://es-toolkit.dev) | lodash, modern, small, tree-shakable | data first (`sortBy(list, keys)`), not callback factories. fast |
| [Remeda](https://remedajs.com) | data first **and** data last, `pipe()`, lazy | typescript-first, good docs. a pipeline style around the native methods |
| [Ramda](https://ramdajs.com), lodash/fp | data last, curried, point-free | point-free culture often reads *worse* (`R.pipe(R.filter(R.propEq('file', 'kind')), R.map(R.prop('name')))`), the opposite of the goal |
| own: `@pulgasari/it`, `arr`, `str` | already there | the vocabulary fits the codebase, nothing to adopt, only to finish and use |

A library helps against *missing* functions. The problem here is less missing functions than unnamed steps
and a shared vocabulary that is not used. Adopting Remeda or Ramda would add a third style next to the native
chains and `@pulgasari/it`.

---

## cost

- a chain makes an array per step: `filter → map → filter` is three arrays. Fine for tens or hundreds of
  items, worth a look in a hot path (a render, a keydown, a scan of thousands of files). There: iterator
  helpers (one pass, no arrays in between), or a `for` loop.
- a factory makes its closure once. `rows.filter(match({ id }))` inside a loop makes it per run: hoist it,
  or keep the arrow there. `match()` of `@pulgasari/it` prepares the pattern when called (keys, sub-tests),
  so making it once and calling it often is the cheap direction.
- a named callback at module level costs nothing; an arrow written inline in a loop is made anew every time
  as well.

---

## a way through

1. **Finish the vocabulary** in `@pulgasari/it` (or one package `@pulgasari/fn` that both `it` and `arr`
   build on): `match`, `not`, `get`, `call`, `by`, `unique`, `sum`, `words`, `mapValues`. Callback factories
   first, everything data-first on top of them.
2. **Write the rules into `agents/code.md`**, so they hold for every file and every agent:
   - a callback longer than a key access, a comparison or a short call gets a name at module level
   - the same callback in two places: one name, in one place
   - no chain inside a template literal or inside another chain's callback: compute it first, under a name
   - three steps or more: one per line
   - a callback factory instead of an arrow when it is shorter or the arrow needs a second look
3. **The worst files first**, not everything at once: `compiler/generate.js`, `compiler/index.js`,
   `dev/apps/feeds`, `language-server`, `types/Str.js`, `noisy/library.js`, `noisy/browse.js`. The rest when it
   is touched anyway.
4. **A check** that finds the shapes again: `rat check` (or a script) that flags lines with three chained
   calls, a chain in `${…}`, a nested chain, an inline comparator. A grep is enough to start:

   ```sh
   grep -rnE "\.(filter|map|find|flatMap)\(.*\.(filter|map|find|flatMap)\(.*\.(filter|map|find|flatMap|join|sort)\(" --include=*.js .
   ```
