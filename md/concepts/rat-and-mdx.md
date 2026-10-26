# mdx and rat :: markdown with components

The question: rat has `.rat` (html with a script, a style and sugar), aufbau renders markdown at runtime (`<output-md>`, marked). Markdown with components in it would be the next step. MDX does exactly that and is widely used. Is it the thing, or does rat need its own?

**Short answer:** MDX does not fit rat. It is markdown plus **JSX**, and everything rat does lives in its own markup, not in JSX. What fits is the idea behind it, done the way Svelte (mdsvex) and VitePress do it: **markdown as the outer syntax, the framework's own markup inside.** For rat that is a `.rat.md`, a small pass in front of the compiler that exists.

---

## what mdx is

```mdx
import { Chart } from './chart.jsx';
export const meta = { title: 'sales' };

# Sales {meta.title}

The year in one chart:

<Chart year={2026} />
```

`@mdx-js/mdx` (MDX 3) compiles that into an es module whose default export is a component:

```js
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';   // jsxImportSource: any runtime
export const meta = { title: 'sales' };
export default function MDXContent (props) {
  return _jsxs(_Fragment, { children: [_jsx('h1', { children: ['Sales ', meta.title] }), …, _jsx(Chart, { year: 2026 })] });
}
```

- **the pipeline:** micromark parses → mdast (remark plugins) → hast (rehype plugins) → estree (recma plugins) → js. A big plugin world: math, syntax highlighting, toc, frontmatter …
- **the runtime is open:** `jsxImportSource` takes React, Preact, Vue, Solid or anything with a `jsx(type, props)` function. MDX itself renders nothing, it calls that function.
- **the syntax is strict:** `{` is always an expression and `<` a tag, so prose with `a < b` or `{curly}` has to escape them. No html comments (`{/* */}`), no indented code blocks, no `<https://…>` autolinks. It is JSX, not html: an html snippet copied in can break.

---

## why it does not fit rat

| | mdx | rat |
|---|---|---|
| markup | JSX: `className`, `{cond && <a />}`, `.map()` for lists | html plus sugar: `<section.todos>`, `@if`, `@for`, `on:click`, `{$x}` |
| a hole | evaluated once, the value goes into `jsx()` | a getter: `{$count}` becomes `() => $count.value` and updates on its own |
| output | calls of a jsx runtime (a virtual dom tree for most) | an htx template, rendered by `@domina/render` into real dom |
| state | the runtime's (React hooks …) | `$` names, signals, the compiler's |

Making it fit would mean:

1. **a jsx runtime of rat's own** (`@rat/runtime/jsx-runtime`) that builds dom: doable, libraries like `jsx-dom` do it.
2. **reactivity:** a recma plugin that wraps every expression hole in an arrow and adds `.value` to `$` names. That is rat's script transform, written a second time over estree.
3. **rat's sugar:** none of it. `@if`, `@for`, `<div.card>`, event modifiers, `{$x |> fmt}` would not exist in an `.mdx` file, the author writes JSX instead.

What would come out is an MDX that can show rat components, but is not rat. And two compilers in a row (unified's and rat's), with unified's in the browser for the no-build mode: micromark, acorn, the estree tools, several hundred kB.

---

## what fits: `.rat.md`

Svelte had the same question and answered it with [mdsvex](https://github.com/pngwn/MDsveX): markdown is the outer syntax, Svelte's markup is allowed inside, the result goes through Svelte's own compiler. VitePress does the same with Vue templates in markdown. For rat:

```md
---
title: Sales
---

<script>
  import Chart from './chart.rat';
  let $year = 2026;
</script>

# {title} {$year}

The year in one chart:

<Chart year={$year} />

@if ($year > 2025) {
  Numbers are **preliminary**.
}

<button on:click={() => $year--}>a year back</button>
```

A `.rat.md` is a `.rat` file whose markup part is markdown.

### how

One pass in front of `compileComponent`, nothing behind it changes:

1. **frontmatter** (`---` yaml) becomes `<script module> export const meta = { … }; const { title } = meta;`
2. **protect what is rat's:** `<script>`, `<style>`, `@if` / `@for` / `@match` blocks, component tags, `{…}` holes and elements with rat attributes are cut out and replaced by placeholders that markdown leaves alone.
3. **markdown → html** of the rest (marked, as aufbau already uses; or micromark).
4. **put back** what was cut out, the result is a normal `.rat` source.
5. **code blocks stay literal:** inside a fence, `{`, `<` and `@` are text. The pass escapes them, so a code
   example about rat does not run.

Extras that come cheap once the pass exists:

- **headings with ids and a toc** exported (`export const toc = [{ depth, id, text }]`): the docs' navigation needs it today and builds it at runtime.
- **comptime** works as in any `.rat` file: a changelog, a table from a json file, all baked.
- **the loader** compiles `.rat.md` like `.rat.html`, a build the same: `<rat-view src='./guide.rat.md'>`.

### what it replaces

The docs (`dev/docs`) fetch a `.md` file and render it with `<output-md>` at runtime: marked in the page, no components, no state. With `.rat.md` a page is a component: compiled once, interactive examples inside the text, a toc without parsing in the page.

`<output-md>` stays for markdown that is data: a note in the notes app, a readme fetched from elsewhere.

### cost and open points

- the protect-and-restore step is the delicate part: markdown wraps loose inline html in `<p>`, a blank line inside a block ends it. mdsvex has years of edge cases here. A block (`@if`, a component with children) wants blank lines around it.
- a markdown parser in the compiler: marked is about 40 kB. In the browser only for files that are `.rat.md`, loaded like sass on first use (`loadStyles` has the pattern).
- syntax highlighting of code blocks: at compile time (shiki in a build, or nothing without one).

---

## other things worth knowing

- **[Markdoc](https://markdoc.dev)** (Stripe): markdown with tags of its own (`{% callout type="warning" %}`),
  **no** js expressions. Made for content written by people who are not developers, renders to any target. A good model if the docs are ever written by others, less so for interactive pages.
- **mdx for content only:** if a project already lives in React or Preact land (an Astro site, a blog), MDX is the standard and fine. For rat it is the wrong layer.

---

## verdict

| | for rat |
|---|---|
| MDX | no. JSX, not rat's markup; reactivity and sugar would have to be rebuilt over estree; heavy in the browser |
| `.rat.md` (the mdsvex way) | yes. A pass in front of the compiler, rat stays rat, the docs become components |
| Markdoc | as an idea, if content ever needs a safer, expression-free form |

Steps:

1. the pass: frontmatter, protect, markdown, restore, fences escaped. `.rat.md` in the loader and `@rat/dev`.
2. headings with ids, `toc` exported.
3. one docs page moved (`components.md`), to find the edge cases of protect-and-restore.
4. the docs as a whole, `<output-md>` only for markdown as data.
