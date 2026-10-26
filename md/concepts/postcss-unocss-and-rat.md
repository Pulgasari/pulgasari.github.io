# postcss, unocss and rat :: what css tooling brings to rat and gestalt

rat's css today, in short:

- **a component's `<style>`** goes into native `@scope` around its elements (`data-rat="<hash>"`), adopted as a
  constructable stylesheet. No selector rewriting, no class mangling: the browser scopes.
- **css files** come in three ways (`style link`, `style adopt`, `style inline`), inline ones are read while
  compiling and scoped like the component's own.
- **other languages:** `scss` and `sass` built in, any other through `compile(source, { styles: { lang: fn } })`.
- **a build** keeps css as it is (`cssMinify: false`, `target: 'esnext'`): gestalt uses `@function`, `if()` and
  other things minifiers do not know yet.

gestalt, the design system on top:

- **`@gestalt/css`:** tokens on axes (palette, scheme, density, geometry), layers, custom functions in css
  (`@function --darker(…)`, chromium only for now), skins, layouts.
- **`@gestalt/shorthands`:** a small language for groups of properties (`gestalt-typo='serif bold 3rem/1.1'`),
  compiled **at runtime**: a rule per distinct value in one adopted sheet, an observer for new elements, and
  `compileCSS()` for the same inside css text.
- **`@gestalt/filters`, `@gestalt/patterns`:** effects and backgrounds, made at runtime, the implementations
  loaded on first use.

The question is where PostCSS and UnoCSS fit into this.

---

## postcss

### what it is

A css parser, an AST and a plugin pipeline, in js. It does nothing by itself: the plugins do (autoprefixer,
postcss-preset-env, nesting, cssnano, Tailwind up to v3). Vite runs it on every css file when a
`postcss.config.js` is there, no plugin needed.

### for rat

**As a `<style lang>`:** possible today through `options.styles.postcss`, a function that runs the
plugins. But what for? Its classic jobs are lowering new css for old browsers (preset-env) and prefixes. rat
is browser-first on modern engines, gestalt goes ahead of the platform on purpose. preset-env would help
little: it does not lower `@function` or `if()`.

**As the place where gestalt's runtime work moves into the build.** This is where it pays:

| today, at runtime | as a postcss plugin, in the build |
|---|---|
| `compileCSS('h1 { gestalt-typo: serif bold 3rem; }')` | the same, run by the plugin: plain declarations in the file, no js in the page |
| `pattern(dots …)` / `filter(…)` resolved by `transform.js` | the data uri, the svg `<filter>` written into the css |
| `color: --darker(ink, 10%)` only in chromium | where the arguments are static: the result computed and put in front as a fallback |

The last row is the one no tool does yet: **lowering css custom functions.** gestalt writes them, a plugin that
knows them (they are css, it can read the `@function` rules) evaluates calls with static arguments and leaves a
plain value in front. Chromium keeps using the function, other browsers get the value.

And it is not rat-only: a postcss plugin runs in **every** Vite, Astro, Next or webpack project. gestalt as a
postcss plugin is gestalt for everyone with a build. rat's own `<style>` blocks reach it too: `@rat/dev` could
hand them through the same postcss config.

### lightning css instead?

Lightning CSS (rust, wasm) parses, lowers, minifies and bundles, much faster than postcss, and Vite can use it
(`css.transformer: 'lightningcss'`). It knows a fixed set of css: unknown new syntax can come out changed or
dropped, the reason `cssMinify` is off now. For gestalt's plugin, postcss's tolerant parser and its plugin api
are the better fit. Lightning CSS stays a choice for minifying once it knows `@function`.

---

## unocss

### what it is

An **atomic css engine, on demand.** It scans the source (files, or the dom at runtime) for tokens, matches
them against rules (a string or a regex → declarations), and generates css only for what was found. Presets
bring rule sets: `preset-wind4` (Tailwind 4 compatible), `preset-attributify` (`<div p="2" text="red">`),
`preset-icons` (any iconify icon as a class, its svg inlined as css). Two modes:

- **build:** a Vite plugin scans the module graph, one css file with what is used.
- **runtime:** `@unocss/runtime` in the page, a MutationObserver, rules generated as classes appear.

### for rat

Tailwind-style utility classes in rat components would work (Uno scans `.rat` files as text, include them in
its config). But that is a second way of styling next to scoped `<style>` and gestalt, and rat has no need of
it.

**What matters is that `@gestalt/shorthands` is already an engine of the same kind:**

| | @gestalt/shorthands | unocss |
|---|---|---|
| input | attribute values: `gestalt-typo='bold uppercase'` | class names or attributes: `font-bold uppercase`, `font="bold"` |
| rules | groups (`typo`, `flow`): tokens → declarations | rules: string or regex → declarations |
| output | a rule per distinct value, one adopted sheet | a rule per token, one sheet |
| when | runtime (observer) | build (scan) **and** runtime (observer) |
| unknown | warned once | ignored |

The difference is the build. gestalt shorthands only run in the page: every value is compiled on the
client, on every load. Uno extracts what is used **while building** and ships plain css.

Two ways to get that:

1. **gestalt shorthands as a unocss preset.** A preset with gestalt's groups as rules, matching gestalt's
   attributes (`gestalt-typo`, `gestalt`, `data-gestalt-*`) through an extractor. Uno does the scanning, the
   build integration, the runtime fallback, the devtools (an inspector exists). gestalt stays the vocabulary and
   the tokens, and gets every bundler Uno supports.
2. **gestalt's own extraction**, Uno's design taken over: a scan of `.rat` / `.html` / `.js` for gestalt
   attributes in `@rat/dev` (or a postcss plugin, which has file access too), the rules written into one css
   file, `@gestalt/shorthands/render.js` left for values that only exist at runtime
   (`gestalt-typo={$size}`).

The first is less code and more reach. The second keeps gestalt free of a dependency, and the extraction is
small: the compiler (`compileCSS`, `compile`) exists, only the scan is new.

### what does not fit

- **utility classes as the main style** (Tailwind's way): it fights rat's scoped `<style>` and gestalt's
  tokens on axes. A palette switch in gestalt is a few custom properties; with utilities it is every class.
- **uno's preset-icons** overlaps with aufbau's `<svg-icon>`: icons as css backgrounds (no element) against
  icons as an element with a fetched svg. Interesting for static icons in a build, not as a replacement.

---

## and rat's css itself

Things the two tools showed, for rat directly:

- **a css pipeline in `@rat/dev`:** the component's `<style>` through the project's postcss config (if one is
  there), the same way Vite treats css files. One hook, and gestalt's plugin reaches components too.
- **comptime already covers part of it:** a pattern or a filter whose values are static can be baked
  (`<script comptime>` with `use('dots').image()`). A postcss plugin is the same idea for css text.
- **scoping stays native:** neither tool is needed for it, `@scope` does what css modules or Svelte's hashes
  did.

---

## verdict

| | for rat | for gestalt |
|---|---|---|
| postcss | an optional pipeline for `<style>` in a build | **yes:** gestalt's runtime transforms (shorthands in css, patterns, filters) and the lowering of `@function` move into a plugin that works in any build |
| lightning css | for minifying, once it knows the new syntax | no |
| unocss | no, as a styling approach | **the model** for shorthands: extraction in the build, runtime only for dynamic values. a gestalt preset or the same design built in |

Steps for gestalt:

1. `@gestalt/postcss`: `gestalt-*` declarations in css through `compileCSS`, patterns and filters with static
   values to data uris and svg.
2. the lowering of `@function` calls with static arguments, as a fallback in front of the call.
3. the extraction of gestalt attributes in a build (a unocss preset, or a scan in the plugin), runtime only for
   what is bound.
4. `@rat/dev`: `<style>` of components through the project's postcss config.
