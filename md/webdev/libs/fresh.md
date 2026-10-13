# Fresh

Das Web-Framework von Deno. Server-Rendering mit Preact und TypeScript, und standardmäßig **kein JavaScript im Browser**: Nur ausdrücklich markierte „Islands" werden interaktiv. Seit Fresh 2 ein Vite-Plugin mit programmatischer `App`-API, ausgeliefert über JSR.

- Website: https://usefresh.dev (früher fresh.deno.dev)
- Repository: https://github.com/denoland/fresh
- Laufzeit: Deno, deploybar auf Deno Deploy

## Worum es geht

Die meisten Seiten sind überwiegend statischer Inhalt mit ein paar interaktiven Stellen (ein Suchfeld, ein Warenkorb, ein Zähler). Single-Page-Frameworks schicken trotzdem das ganze Framework und den Code jeder Komponente in den Browser. Fresh rendert alles auf dem Server und schickt JavaScript nur für die Teile, die es brauchen: die **Islands Architecture**.

## Kernkonzepte

### 1. Die `App` und Routen

```ts
import { App, staticFiles } from 'fresh';

const app = new App()
  .use(staticFiles())
  .get('/', () => new Response('hallo'))
  .get('/books/:id', (ctx) => new Response(`Buch: ${ctx.params.id}`));

app.listen();
```

Routen folgen der `URLPattern`-Syntax. Statische Routen haben Vorrang, dynamische greifen in der Reihenfolge ihrer Registrierung. Middlewares (`.use()`) gelten für alles, was nach ihnen registriert wird. Zusätzlich gibt es dateibasiertes Routing: `routes/about.tsx` antwortet auf `/about`.

### 2. Islands

Eine Island ist eine Preact-Komponente in `islands/` (oder in einem `(_islands)`-Ordner unter `routes/`):

```tsx
// islands/counter.tsx
import { useSignal } from '@preact/signals';

export default function Counter () {
  const count = useSignal(0);
  return (
    <div>
      <p>Zähler: {count}</p>
      <button onClick={() => (count.value += 1)}>+</button>
    </div>
  );
}
```

Sie wird wie jede Komponente benutzt. Fresh rendert sie auf dem Server mit und **hydratisiert** sie im Browser: lädt ihren Code und macht das vorhandene HTML interaktiv. Alles außerhalb von Islands bleibt reines HTML.

### 3. Props über die Grenze: Serialisierung

Props einer Island müssen serialisierbar sein, denn sie reisen als Daten vom Server in den Browser: Primitive, `Date`, `URL`, `RegExp`, `Map`, `Set`, `Uint8Array`, Temporal-Werte, JSX-Elemente, einfache Objekte und Arrays, sogar **Preact-Signals** (samt Inhalt) und zirkuläre Referenzen. **Funktionen nicht.**

### 4. Partials: Seitenwechsel ohne Neuladen

```tsx
// routes/_app.tsx
import { Partial } from 'fresh/runtime';

export default define.page(function App ({ Component }) {
  return (
    <html>
      <body f-client-nav>
        <Partial name="body">
          <Component />
        </Partial>
      </body>
    </html>
  );
});
```

Mit `f-client-nav` holt Fresh bei einem Linkklick die neue Seite, sucht darin die `<Partial>`-Bereiche mit passendem `name` und tauscht nur deren Inhalt. Mit `f-partial="/partials/docs"` an einem Link fragt Fresh gleich eine kleinere Route an, die nur die Partials rendert. Das ist das Muster von `hx-boost` in [htmx](htmx.md) und von `hyperfetch.js`, eingebaut ins Framework.

### 5. Fresh 2

- Fresh ist jetzt ein **Vite-Plugin** (HMR auch in Islands, schnellere Builds).
- **`App`-API** statt reiner Konvention, dateibasiertes Routing bleibt möglich.
- Eingebaute Plugins für CORS, CSRF und Content Security Policy, OpenTelemetry, View Transitions.
- Veröffentlicht auf JSR (`jsr:@fresh/core`).

## Wie es intern arbeitet

Jede Anfrage läuft durch die Middlewares zur Route, die Preact-Komponenten auf dem Server zu HTML rendert. Beim Rendern merkt sich Fresh jede Island samt serialisierten Props und setzt Marker ins HTML. Im Browser lädt ein kleines Skript nur die Module der vorhandenen Islands und hydratisiert sie an ihren Markern.

## Stärken und Schwächen

- **Stark:** sehr wenig JavaScript im Browser, schnelle erste Darstellung, TypeScript ohne Konfiguration, eng mit Deno und Deno Deploy verzahnt.
- **Schwach:** an Deno und Preact gebunden. Die Grenze Server/Island muss man im Kopf behalten (keine Funktionen als Props, Zustand zwischen Islands nur über geteilte Signals).

## Für rat und aufbau

- **Islands** sind die Server-Version von „lazy components" in den rat-Ideen: Nur was interaktiv ist, bekommt Code. Für ein späteres SSR-Target von rat wäre das die naheliegende Form: Komponenten mit `$`-Signals werden Islands, der Rest bleibt HTML.
- **Signals als serialisierbare Props** sind eine starke Idee für rat: Ein Signal wandert mit seinem Wert vom Server zum Client und bleibt dort reaktiv.
- **Partials** sind exakt `hyperfetch.js` mit Namen statt Selektoren. Wenn hyperfetch je in aufbau landet, ist `<Partial name>` ein gutes Vorbild für eine robustere Zuordnung als CSS-Selektoren.
