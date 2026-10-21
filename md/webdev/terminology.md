# webdev :: terminology

definitions of terms or introductions into concepts in webdev context.

---

# A

## a11y
accessibility: a site usable by everyone, also with a screen reader, a keyboard only, low vision, reduced motion. "a11y" is a numeronym: a, 11 letters, y (like i18n, l10n). mostly it is semantic html (a `<button>` instead of a clickable `<div>`), labels, focus order and contrast; aria only fills the gaps. see [a11y.md](a11y.md).

## algorithm
a finite, exact recipe that turns an input into an output in steps. sorting, searching, diffing two lists, finding a route. what makes one better than another is mostly its [complexity](#complexity): how the work grows with the input.

## api
application programming interface: the surface a piece of software offers to other code, the part you are allowed to call and rely on. a function signature is an api, so is a rest endpoint, a dom method, a cli's flags. everything behind it is implementation and may change; the api should not.

# B

## blob
binary large object: raw bytes without structure the database or runtime cares about. in the browser a `Blob` is an immutable chunk of data with a mime type (a file is a blob with a name); `URL.createObjectURL(blob)` gives it a temporary `blob:` url, which is how rat loads a compiled module without a server.

## bootstrap
starting a system from (almost) nothing: the small first step that loads what loads the rest. "pulling yourself up by your bootstraps". in a page: the one script that sets up the import map, loads the framework and mounts the app. in a compiler: a compiler written in the language it compiles, built once with an older one. not to confuse with Bootstrap, the css framework.

## build
the step between source and what is shipped: compile, [bundle](#bundle), minify, copy assets, hash file names. the result is a folder (`dist/`) of plain files. a build is an optimization or a necessity (for a language the browser does not speak), never the program itself.

## bundle
many modules joined into few files, following their imports. fewer requests and no import waterfall, plus [tree shaking](#side-effect) of unused code. the cost: one change invalidates the whole bundle in the cache, and the code in the browser is not the code you wrote (source maps bridge that).

# C

## cache
a copy kept closer to where it is needed, so the original does not have to be asked again: memory before disk, disk before network, a cdn before the origin server. the two hard parts are when a copy is stale (invalidation) and what to drop when space runs out (eviction). [memoization](#memoization) is a cache for function results.

## callback
a function handed to other code, to be called by it later: when an event fires, a request is done, an item is visited (`list.map(callback)`). inversion of control: you no longer decide when your code runs. nested callbacks for steps in sequence are "callback hell", which promises and `async`/`await` replaced.

## charset
character set: which characters exist and which number each one gets. today that is [unicode](#unicode) everywhere; the [encoding](#encoding) (utf-8) says how those numbers become bytes. `<meta charset="utf-8">` is really about the encoding, the name is historical.

## cli
command line interface: a program used by typing commands and flags in a terminal (`git commit -m "…"`), as opposed to a gui. scriptable, composable through pipes, and the usual way tooling is driven (`npm`, `vite`, `deno`).

## codec
coder plus decoder: a pair that turns data into another representation and back. audio and video codecs (opus, av1) compress, a json codec turns objects into text and back. the important property is the round trip: decode(encode(x)) gives x again (or close enough, for lossy codecs). see [codecs.md](codecs.md).

## coding
writing source code. also short for [encoding](#encoding) in some contexts (base64 coding, character coding).

## cold start
the first run, with nothing prepared: no cache, no jit-compiled code, no warm connection, a serverless function whose container first has to boot. measured separately from the warm case because users hit it on their first visit, which is the one that decides whether they stay.

## compiler
a program that translates source code from one language into another, as a whole, before it runs: c to machine code, typescript to javascript, `.rat` to javascript. an interpreter instead runs the source directly. the steps: parse into an ast, analyze, transform, generate. what is decided at [compile time](#compiletime) costs nothing at [runtime](#runtime).

## compiletime
everything that happens while the code is translated, before it runs: syntax errors, type checks, constant folding, dead code removal. its opposite is [runtime](#runtime). moving work from runtime to compile time is the whole idea of compiler-based frameworks (svelte, solid, rat).

## complexity
how the cost of an [algorithm](#algorithm) grows with the size of its input, written in big-o: o(1) constant, o(log n) like a binary search, o(n) one pass, o(n²) a loop in a loop. it ignores constants, so it says nothing about small inputs, everything about large ones. also: how hard code is to understand, which grows faster than its size.

## computation
the work a program does to turn inputs into a value. in reactive systems a computation (computed, derived) is a value defined by a function of other values, recalculated when they change.

## constraint
a rule a value or a system must satisfy: a column that is `not null`, a number between 1 and 10, a layout that keeps an aspect ratio. constraints are checked (validation) or enforced (a database rejects the write). the more of them are declared instead of hand-coded, the fewer bugs slip through.

# D

## database
an organized, persistent store of data with a way to query it. relational (tables, sql: postgres, sqlite), document (json-like: mongodb), key-value (redis, `localStorage`), graph. in the browser: indexeddb, opfs. the hard parts are concurrency, consistency and getting the [schema](#schema) right before there is much data in it.

## decoding
turning an encoded representation back into the original: bytes into text, base64 into binary, json text into objects, a compressed stream into frames. the reverse of [encoding](#encoding).

## directive
an instruction inside markup or code that tells a framework or compiler what to do with it, without being content itself. vue's `v-if`, alpine's `x-data`, angular's `*ngFor`, rat's `@if`/`@for`, `'use strict'` in javascript, `#include` in c.

## domain
1. a name in the dns, mapped to an ip address: `example.com`, with subdomains like `code.example.com`. the browser's security boundary (origin) is scheme plus host plus port.
2. the subject area a program is about (shop, music, mail), with its own terms and rules; "domain logic" is the part that would exist without any ui or database.

# E

## encoding
turning data into another representation for storage or transport: text into bytes (utf-8), binary into text (base64), special characters into safe forms (`&amp;`, `%20`). not encryption: anyone can decode it. see [escaping](#escaping), [charset](#charset).

## environment
everything a program runs in that is not the program: the [runtime](#runtime) (browser, node), the os, the configuration, environment variables (`NODE_ENV=production`), the stage (development, staging, production). "works on my machine" is an environment difference.

## escaping
marking characters so they are read as plain text and not as syntax: `\"` inside a string, `&lt;` in html, `\.` in a regex. the defense against injection (xss, sql injection): user input must be escaped for exactly the context it is put into, html, attribute, url or sql each have their own rules.

## expression
a piece of code that evaluates to a value: `1 + 2`, `user.name`, `a ? b : c`, `fn(x)`. a statement does something (`if`, `for`, a declaration) and has no value. templates (`{…}`, `${…}`) take expressions, which is why there is no `if` inside them.

# F

## framework
a structure your code is plugged into: it calls your code, you do not call it (inversion of control). it decides how the app is organized, how it starts, how parts talk. a [library](#library) is the opposite: you call it when you need it. react calls itself a library, but used for a whole app it acts as a framework.

## function
a named, reusable piece of code that takes inputs (parameters) and returns an output. in javascript functions are values: they can be passed around ([callback](#callback)), returned, stored. a pure function always gives the same output for the same input and has no [side effects](#side-effect).

## functional programming
programming with functions as the main building block: pure functions, immutable data, composition instead of mutation and loops (`map`, `filter`, `reduce`, pipes). easier to test and reason about, since nothing changes behind your back. see [fp.md](fp.md).

# H

## head
1. `<head>` of an html document: metadata, title, styles, scripts, not shown as content.
2. the newest commit of a branch in git (`HEAD` is the one checked out).
3. an http `HEAD` request: like `GET`, but only the headers come back.

## headless
without a built-in user interface: a headless browser runs without a window (tests, screenshots), a headless cms only stores content and serves it through an [api](#api) (the frontend is yours), headless ui components bring behavior and accessibility but no styles.

## hoisting
javascript moves declarations to the top of their scope before running: a `function` declaration can be called before it appears, a `var` exists (as `undefined`) before its line. `let`, `const` and `class` are hoisted too, but using them before the line throws (temporal dead zone).

## hook
a named place where foreign code may plug in: wordpress' actions and filters, git hooks (`pre-commit`), react hooks (`useState`, functions that hook into the component's lifecycle), a webhook (a url called when something happens). see [wordpress.md](libs/wordpress.md) for the classic case.

# I

## invoking
calling a function, running it: `fn()` invokes `fn`. "immediately invoked function expression" (iife): `(() => { … })()`, a function defined and called at once, the pre-module way to get a private scope.

# K

## k.i.s.s.
keep it simple, stupid. the simplest solution that works beats a clever one: fewer parts, fewer bugs, easier to change. not "do less", but "add nothing that is not needed yet" (related: yagni, you aren't gonna need it).

# L

## library
code you call to get something done, without it taking over your app: lodash, d3, a date library. you stay in control of the flow. see [framework](#framework) for the opposite.

# M

## memoization
caching the result of a [function](#function) by its arguments: called again with the same ones, it returns the stored result instead of computing again. only safe for pure functions. a computed signal is memoization with automatic invalidation.

## memory
where a running program keeps its data. the stack holds calls and small local values, the heap everything else (objects, arrays, closures). javascript frees memory by garbage collection: what is no longer reachable is collected. a leak is memory still reachable by accident: a forgotten listener, a growing cache, a timer that never stops.

## method
a [function](#function) attached to an [object](#object), called on it: `list.push(x)`, `element.remove()`. inside it, `this` is the object it was called on.

## middleware
code that sits between a request and the code that answers it, and sees everything that passes: logging, auth, cors, parsing. each one may change the request, answer it itself, or hand it to the next. see [middleware.md](middleware.md).

# N

## namespace
a container that groups names so they do not collide: `Math.max` and `myLib.max` can both exist. modules are namespaces, so are objects used as one (`RAT.app`), xml namespaces (`svg:`), prefixes in css custom properties (`--gestalt-…`).

# O

## object
a value made of named properties (key, value), plus methods. in javascript almost everything is an object or behaves like one; plain objects (`{ a: 1 }`) are the default container for structured data. in oop an object is an instance of a class: data and the behavior that belongs to it.

# P

## parser
a program that reads text and turns it into a structure: json text into objects, html into a dom tree, source code into an ast. usually in two steps: a tokenizer (lexer) splits the text into tokens, the parser arranges them by a grammar. parse errors are where the text does not fit the grammar.

## performance
how fast and how efficiently software does its work: load time, response time to input, frame rate, memory and battery use. on the web the user-facing metrics are lcp (main content visible), inp (reaction to input) and cls (layout shifts). measure first, then optimize what the measurement shows. see [optimization.md](optimization.md).

## plugin
an add-on that extends a program through an interface the program offers for exactly that: vite plugins, wordpress plugins, a browser extension. the host defines what a plugin may hook into ([hook](#hook), [registry](#registry)); the plugin does not need to change the host's code.

# Q

## query
a request for data, phrased in a language the data store understands: sql `select`, a graphql query, a css selector (a query against the dom), a url query string (`?page=2&sort=name`), a media or container query (a question about the environment).

# R

## reactivity
values that update what depends on them by themselves: change `$count`, and every place that shows or uses it follows, without calling an update. signals, observables and virtual dom diffing are different ways to get there. see [reactivity.md](reactivity.md).

## redirect
an answer that sends the client somewhere else: http `301` (moved for good, cached), `302`/`307` (for now), `308` (for good, keeps the method), with the new url in the `Location` header. also client-side, by script or `<meta http-equiv="refresh">`.

## registry
a central list where things are registered by name and looked up later: `customElements.define()` registers an element, npm is a registry of packages, a command registry maps names to functions. it decouples who provides something from who uses it.

## request
a message from a client asking a server for something: in http a method (`GET`, `POST` …), a url, headers and maybe a body. the server sends a response with a status, headers and a body. see [server.md](server.md).

## rest
representational state transfer: a style for web [apis](#api) where urls name resources (`/users/42`) and http methods say what to do with them (`GET` reads, `PUT` replaces, `DELETE` removes), stateless, with standard status codes. most "rest apis" are just json over http that follow part of it.

## router
the part that maps an address to what should handle it. on a server: url and method to a handler. in a single page app: the url (path, hash) to a view, without reloading the page. routes may have parameters (`/set/:prefix`).

## runtime
1. the time when the program runs, as opposed to [compile time](#compiletime).
2. the environment that runs the code: the browser, node, deno, bun.
3. the support code a compiled program needs while it runs: a framework's runtime (`@rat/runtime`) holds what the compiler's output calls.

# S

## schema
a description of the shape data must have: which fields, which types, which [constraints](#constraint). a database schema defines tables and columns, a json schema or a validation schema (zod, valibot, `@rat/types`) checks values at runtime. "schemaless" usually means the schema lives in the code instead.

## script
a program that is run as it is, usually interpreted and short: a shell script, a build script, `<script>` in a page. "scripting language" once meant a language for glue code (javascript, python, lua); today the line is blurry.

## server
a program that waits for [requests](#request) and answers them, and by extension the machine it runs on. a web server serves files and responses over http; an app server runs your code for each request. see [server.md](server.md).

## side effect
anything a function does besides returning a value: changing a variable outside, writing to the dom, a network request, logging. needed for every useful program, but hard to reason about, so they are kept at the edges. for bundlers, a module "has side effects" if importing it does something (registers an element): it cannot be dropped even if nothing of it is used (tree shaking).

## socket
an endpoint of a two-way network connection, identified by address and port. a websocket is a persistent connection between browser and server over which both sides can send at any time, unlike http's request and response.

## specification
the document that defines exactly how something must behave, so independent implementations agree: the html living standard, ecmascript (ecma-262), css specs, rfcs for protocols. "spec compliant" means it does what the spec says, including the edge cases.

## ssr
server-side rendering: the server produces the finished html for a page, so it shows before any javascript runs, good for first load and search engines. the client then often "hydrates" it: attaches event handlers and state to the existing markup. the alternative is client-side rendering (an empty page filled by javascript).

## stream
data processed piece by piece as it arrives, instead of waiting for all of it: a video that plays while loading, a response read chunk by chunk, a file piped through compression. in the browser: `ReadableStream`, `WritableStream`, `TransformStream`. less memory, earlier first results.

## symlink
symbolic link: a file that points to another file or folder by path, a shortcut at the filesystem level. `node_modules` setups (pnpm, `npm link`) use them so one package can appear in many places.

# T

## template
a text or markup with holes that are filled with values: `` `Hello ${name}` ``, a `<template>` element cloned for each row, latte, ejs, htx. separates the fixed structure from the changing data; [escaping](#escaping) the values is the template engine's job.

## toolkit
a set of tools and components meant to be used together, looser than a [framework](#framework): you pick what you need. ui toolkits (gtk, qt, a component library), a widget toolkit, aufbau.

## type
the kind of a value: number, string, boolean, object, function. it decides which operations make sense. static typing checks types before running (typescript, dart), dynamic typing at runtime (javascript, lua). runtime schemas ([schema](#schema)) check values at the edges where types from code cannot reach: user input, network, storage.

# U

## unicode
the one character set for all writing systems: every character gets a number (code point, `U+00E4` for ä), over 150,000 so far, emoji included. utf-8 is the [encoding](#encoding) that stores those numbers in 1 to 4 bytes and is used for nearly the whole web. javascript strings are utf-16, which is why `'😀'.length` is 2.

# V

## value
a piece of data a program works with: `42`, `'text'`, `true`, an object, a function. primitive values (numbers, strings, booleans) are compared and copied by value; objects by reference, two variables can point to the same object.

# W

## web
the world wide web: documents and apps linked by urls, delivered over http, rendered by browsers. built on three standards: html (structure), css (presentation), javascript (behavior). not the same as the internet, which is the network underneath that also carries mail, games and everything else.

---

# how
- English, lowercase, except brandnames etc.
- short but informative, "on point"
- that stuff you end up remembering to make it make sense

# todo
