# Astro

Ein Web-Framework für inhaltsgetriebene Seiten (Blogs, Dokumentationen, Marketing, Shops), 2021 von Fred K. Schott und dem Team hinter Snowpack gestartet, 1.0 im August 2022. Astro rendert alles zu HTML und schickt standardmäßig **kein JavaScript** in den Browser; interaktive Komponenten werden als Islands einzeln geladen, in React, Preact, Vue, Svelte, Solid oder ohne Framework. Seit Januar 2026 gehört das Team zu Cloudflare (Astro bleibt MIT-lizenziert und hosterunabhängig). Astro 6 (März 2026) brachte einen neuen Dev-Server auf Basis der Vite Environment API, Astro 7 (Juni 2026) einen Compiler in Rust, Vite 8 und Route Caching. Aktuell: 7.3.

- Website: https://astro.build
- Repository: https://github.com/withastro/astro
- Laufzeit: Node ab 22.12; Ausgabe statisch oder über Adapter (Node, Cloudflare, Netlify, Vercel, Deno, Bun)
- Build: ja (Vite)

## Worum es geht

Die meisten Seiten im Web sind Dokumente mit ein paar interaktiven Stellen. Single-Page-Frameworks behandeln sie trotzdem wie Apps: Router, Hydration und Framework-Code für die ganze Seite. Astro dreht das um: Die Seite ist HTML vom Server oder aus dem Build, JavaScript gibt es nur für ausdrücklich markierte Komponenten. Dasselbe Modell wie [Fresh](fresh.md), aber ohne Bindung an ein UI-Framework oder eine Laufzeit.

## Kernkonzepte

### 1. `.astro`-Komponenten

```astro
---
// runs on the server or at build time, never in the browser
import Layout from '../layouts/layout.astro';
import Card   from '../components/card.astro';

const { title = 'Start' } = Astro.props;
const posts = await fetch('https://api.example.com/posts').then(r => r.json());
---

<Layout title={title}>
  <h1>{title}</h1>
  {posts.length === 0
    ? <p>Noch nichts da.</p>
    : posts.map(post => <Card {...post} />)}
  <slot />
</Layout>

<style>
  h1 { color: var(--accent); }
</style>
```

Oben zwischen `---` steht der **Frontmatter**: JavaScript oder TypeScript, das beim Rendern läuft, mit Top-Level-`await`. Darunter das Template, eine JSX-ähnliche Syntax, die aber HTML ausgibt: `class` statt `className`, Attribute wie in HTML, Kontrollfluss über Ausdrücke (`&&`, `? :`, `.map`). Eine `.astro`-Komponente hat keinen Zustand und keine Reaktivität; sie wird einmal gerendert und ist dann HTML. Inhalte kommen über `<slot />` und benannte Slots (`<slot name="footer" />`, `slot="footer"`).

### 2. Styles und Skripte

`<style>` in einer Komponente ist automatisch **scoped**: Astro hängt an jedes Element ein `data-astro-cid-…`-Attribut und schreibt die Selektoren um (`h1[data-astro-cid-x7k2]`, mit `scopedStyleStrategy` auch über `:where()` ohne Spezifität). `<style is:global>` schaltet das ab, `class:list={['card', { active }]}` baut Klassen zusammen.

`<script>` wird gebündelt, als Modul ausgeliefert und pro Seite nur einmal eingebunden, auch wenn die Komponente zwanzigmal vorkommt. `<script is:inline>` bleibt unverändert im HTML. Für kleine Interaktion ohne Framework ist das der vorgesehene Weg, oft zusammen mit einem Custom Element.

### 3. Islands und Client-Direktiven

```astro
---
import Counter  from '../components/counter.jsx';
import Chart    from '../components/chart.svelte';
import Comments from '../components/comments.vue';
---

<Counter client:load start={3} />
<Chart client:visible data={points} />
<Comments client:idle />
<Menu client:media="(max-width: 40rem)" />
<Map client:only="react" />
```

Ohne Direktive wird eine Framework-Komponente nur auf dem Server gerendert und kommt als reines HTML an. Mit `client:*` wird sie zur Island und im Browser hydratisiert:

| Direktive | lädt und hydratisiert |
|---|---|
| `client:load` | sofort |
| `client:idle` | wenn der Browser untätig ist (`requestIdleCallback`) |
| `client:visible` | wenn sie in den Viewport kommt (`IntersectionObserver`, mit `rootMargin`) |
| `client:media` | wenn die Media Query passt |
| `client:only` | nur im Browser, ohne Server-Rendering |

Props müssen serialisierbar sein (Primitive, Objekte, Arrays, `Date`, `Map`, `Set`, `URL`, `RegExp`, typisierte Arrays). Islands verschiedener Frameworks können nebeneinander stehen, teilen aber keinen Zustand außer über geteilte Stores (Nano Stores) oder Ereignisse.

### 4. Server Islands

```astro
<Avatar server:defer>
  <GenericAvatar slot="fallback" />
</Avatar>
```

Seit Astro 5: Eine Komponente mit `server:defer` wird aus der Seite herausgelöst. Die Seite selbst kann gecacht oder statisch sein, die Island wird danach in einem eigenen Request auf dem Server gerendert (personalisierte Inhalte, Warenkorb) und eingesetzt. Bis dahin steht der `fallback`-Slot.

### 5. Routing, Endpoints und Middleware

Dateien in `src/pages/` sind Routen: `about.astro` → `/about`, `blog/[slug].astro` → `/blog/:slug`, `[...path].astro` für Rest-Pfade. Statische Seiten mit Parametern liefern ihre Pfade über `getStaticPaths()`. `.js`/`.ts`-Dateien sind Endpoints (`export function GET ({ params, request }) { return Response.json(…); }`). Mit `export const prerender = false` und einem Adapter wird eine Route pro Anfrage gerendert. `src/middleware.js` exportiert `onRequest(context, next)` und läuft vor jeder Route.

Seit Astro 7 lässt sich die ganze Pipeline in `src/fetch.ts` selbst zusammensetzen, als Objekt mit `fetch(request)` im Format von Cloudflare Workers, Bun und Hono. Die Bausteine (`trailingSlash`, `redirects`, `actions`, `middleware`, `pages`) kommen aus `astro/fetch`, eine Hono-Anbindung aus `astro/hono`.

### 6. Content Collections

```js
// src/content.config.js
import { defineCollection } from 'astro:content';
import { glob }             from 'astro/loaders';
import { z }                from 'astro/zod';

const blog = defineCollection({
  loader : glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema : z.object({
    title : z.string(),
    date  : z.coerce.date(),
    tags  : z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
```

```astro
---
import { getCollection, render } from 'astro:content';
const posts = (await getCollection('blog')).sort((a, b) => b.data.date - a.data.date);
---
```

Eine Collection ist eine Menge von Einträgen aus einer Quelle (Markdown- und [MDX](mdx.md)-Dateien, JSON, ein CMS über einen eigenen Loader), geprüft gegen ein Zod-Schema. Ein falsches Frontmatter-Feld bricht den Build mit einer genauen Meldung ab, und `entry.data` ist danach typisiert. Seit Astro 6 gibt es **Live Collections**, die erst pro Anfrage laden statt im Build.

### 7. Weitere eingebaute APIs

- **View Transitions:** `<ClientRouter />` im `<head>` macht Seitenwechsel zu Fetch und Austausch mit der View Transitions API; `transition:name` und `transition:persist` halten Elemente (und Islands samt Zustand) über den Wechsel.
- **Actions:** typisierte Server-Funktionen (`defineAction` mit Zod-Eingabe), aus dem Browser wie eine Funktion aufrufbar und als `<form action={actions.x}>` ohne JavaScript nutzbar.
- **Bilder und Fonts:** `<Image />`/`<Picture />` optimieren im Build, die Fonts API (Astro 6) lädt und hostet Webfonts selbst.
- **Content Security Policy** (Astro 6): Hashes für eigene Skripte und Styles werden automatisch erzeugt.
- **Route Caching** (Astro 7, experimentell): `routeRules` in der Konfiguration, `Astro.cache.set()` pro Anfrage, Invalidierung über Tags und Pfade; Provider im Speicher oder beim CDN des Adapters.

## Wie es intern arbeitet

**Compiler:** Eine `.astro`-Datei wird zu einem JavaScript-Modul compiliert, dessen Default-Export eine async Render-Funktion ist. Der Frontmatter wird ihr Rumpf, das Template ein getaggtes Template-Literal, das HTML-Strings und Teile (Komponenten, Slots, Promises) liefert. Bis Astro 6 war der Compiler in Go geschrieben und lief als WebAssembly; seit Astro 7 ist er in Rust. Scoped Styles werden dabei extrahiert, umgeschrieben und an Vite weitergegeben.

**Rendern:** Die Render-Funktionen erzeugen einen Strom von HTML-Stücken, den Astro bei On-Demand-Routen direkt als `Response`-Body streamt. Komponenten anderer Frameworks rendert ein **Renderer** der jeweiligen Integration (`@astrojs/react` usw.) auf dem Server zu HTML.

**Islands:** Jede Island wird in ein Custom Element `<astro-island>` gehüllt, mit Attributen für die URL des Komponenten-Moduls (`component-url`), des Renderers (`renderer-url`), die serialisierten Props und die Direktive. Ein kleines Inline-Skript (rund 1,9 kb gzip) definiert das Element; es wartet auf die Bedingung der Direktive, importiert dann beide Module und ruft die Hydration des Renderers auf. Verschachtelte Islands warten, bis die äußere fertig ist.

## Stärken und Schwächen

- **Stark:** sehr wenig JavaScript im Browser ohne Zutun, framework-unabhängig (auch gemischt), Inhalte mit Schema und Typen, statisch und On-Demand in einem Projekt, gute Defaults (Bilder, Fonts, CSP, scoped Styles), die `.astro`-Syntax ist schnell gelernt.
- **Schwach:** `.astro`-Komponenten sind nur Server-Templates; sobald etwas reaktiv wird, braucht es eine zweite Komponentenwelt mit eigenem Framework. Zustand zwischen Islands geht nur über externe Stores. Für stark interaktive Apps ist das Modell umständlich, und Hydration bleibt Hydration (der Code einer Island wird trotzdem vollständig geladen und ausgeführt). Viel Magie im Build (virtuelle Module wie `astro:content`), häufige Major-Versionen.

## Für rat und aufbau

- **Lazy Components:** rats Idee `lazy:visible` / `lazy:idle` ([ideas.md 2.13](https://github.com/pulgasari/rat/blob/main/.md/ideas.md#213-lazy-components-astro-islands)) ist Astros Client-Direktiven-Tabelle, nur ohne Server: Der Compiler macht aus dem Import ein `import()`, das bei der Bedingung läuft. Astros Liste (`load`, `idle`, `visible`, `media`) ist eine gute Vorlage für die vollständige Menge, `client:visible={{ rootMargin }}` für Optionen.
- **`<astro-island>` als Custom Element** zeigt, dass Hydration kein Framework braucht: ein Element mit Attributen für Modul-URL und Props, das sich selbst lädt. Genau so könnte ein build-freies Lazy-Loading in aufbau aussehen, mit `@domina/observer` für die Sichtbarkeit.
- **Frontmatter vs. `<script module>`:** Astros `---`-Block läuft einmal auf dem Server, rats `<script module>` einmal pro Modul, `<script>` pro Instanz. Für ein späteres SSR-Target wäre die Grenze klar: was nur im Frontmatter-Äquivalent liest, braucht kein Signal und keinen Code im Browser.
- **Scoped Styles:** Astro schreibt Selektoren um und markiert Elemente mit Attributen, rat nutzt `@scope`. Der Vergleich zeigt den Preis der Umschreibung (Attribute an jedem Element, `:global()` als Ausweg) und warum `@scope` die bessere Grundlage ist, seit die Browser es können.
- **Server Islands** sind die Umkehrung: statische Seite, ein dynamisches Loch, das nachgeladen wird. Das ist `hyperfetch.js` mit einem Platzhalter, und mit [htmx](htmx.md) (`hx-trigger="load"`) dieselbe Idee.
- **Content Collections** prüfen Daten an der Grenze gegen ein Schema und brechen früh mit einer genauen Meldung ab: dasselbe Prinzip wie die Schemas in `@rat/types` und die Decoder in [Elm](elm.md).
- **`src/fetch.ts`** mit `fetch(request) → Response` ist dieselbe Handler-Form wie Fresh, Hono, Workers und Service Worker. zugriffs `middleware.js` und ein Service Worker, der `.rat`-Dateien compiliert, sprechen dasselbe Format.
