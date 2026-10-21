# Middleware

**Middleware** ist Code, der *zwischen* zwei Seiten sitzt und alles sieht, was durchläuft: meist zwischen einer eingehenden Anfrage und dem Code, der sie eigentlich beantwortet. Jede Middleware kann die Anfrage ansehen, verändern, selbst beantworten oder an die nächste weiterreichen.

Weiterführend: [server.md](server.md) (wo Middleware läuft), [protocols.md](types/protocols.md) (warum `(request, next)` ein kleines Protokoll ist).

---

## Das Bild

```
request ─▶ [ log ] ─▶ [ auth ] ─▶ [ cors ] ─▶ handler
response ◀─ [ log ] ◀─ [ auth ] ◀─ [ cors ] ◀────┘
```

Ohne Middleware müsste jeder Handler selbst loggen, prüfen, ob jemand angemeldet ist, CORS-Header setzen und Fehler abfangen. Middleware zieht das aus den Handlern heraus und stellt es einmal davor. Der Handler kümmert sich nur noch um seine eigentliche Aufgabe.

Typische Aufgaben:

| Aufgabe | tut |
|---|---|
| Logging, Tracing | Zeit messen, Anfrage und Status protokollieren |
| Authentifizierung | Cookie oder Token prüfen, Nutzer an die Anfrage hängen, sonst `401` |
| CORS, Sicherheitsheader | Header setzen, Preflight-Anfragen (`OPTIONS`) selbst beantworten |
| Body parsen | JSON oder Formulardaten lesen und als Objekt bereitstellen |
| Kompression | die Antwort mit gzip oder brotli verpacken |
| Caching | aus dem Cache antworten oder die Antwort dort ablegen |
| Rewrites, Redirects | die URL umschreiben oder umleiten, bevor das Routing greift |
| Rate Limiting | zu viele Anfragen mit `429` abweisen |
| Fehlerbehandlung | Ausnahmen fangen und eine saubere Fehlerseite liefern |

## Drei Formen

### 1. Linear mit `next()` (Express, 2010)

```js
app.use((req, res, next) => {
  req.started = Date.now();
  next();                                     // hand over to the next one
});

app.use((req, res, next) => {
  if (!req.headers.authorization) return res.status(401).end();   // answer and stop
  next();
});

app.get('/me', (req, res) => res.json(req.user));
```

Jede Middleware bekommt Anfrage und Antwortobjekt und entscheidet: weiterreichen (`next()`), selbst antworten, oder mit `next(error)` an die Fehler-Middleware (in Express erkennbar an **vier** Parametern). Was nach `next()` steht, läuft zwar danach, aber nicht unbedingt nach dem Handler: Das Modell kennt kein „zurück“. ([Express](libs/express.md))

### 2. Die Zwiebel mit `await next()` (Koa, 2013)

```js
app.use(async (ctx, next) => {
  const started = Date.now();
  await next();                               // everything inside runs here
  ctx.set('x-time', `${Date.now() - started}ms`);
});
```

Weil `next()` ein Promise ist, läuft der Code nach `await next()` wirklich **nach** allen inneren Schichten und dem Handler. Jede Middleware umschließt die nächste wie Schalen einer Zwiebel: einmal hinein, einmal heraus. Das macht Zeitmessung, Fehlerbehandlung (`try { await next() } catch`) und Nachbearbeitung der Antwort trivial.

### 3. Funktionen über `Request` und `Response` (heute)

Mit der Fetch-API auf dem Server (Deno, Bun, Cloudflare Workers, Node) hat sich eine dritte Form durchgesetzt: Eine Middleware nimmt ein `Request` und gibt ein `Response` zurück, `next` ist der Rest der Kette.

```js
// hono, fresh, astro (onRequest), sveltekit (handle), vercel
const timing = async (request, next) => {
  const started  = Date.now();
  const response = await next(request);
  response.headers.set('server-timing', `app;dur=${Date.now() - started}`);
  return response;
};
```

Die Zwiebel aus Koa, aber mit Web-Standards statt eigener Objekte. Dieselbe Middleware läuft damit überall, wo `Request`/`Response` gelten.

## Die Kette selbst: zehn Zeilen

Hinter allen drei Formen steckt Funktionskomposition. So sieht der Kern aus:

```js
// compose([a, b, c], handler) -> request => a(request, r => b(r, r => c(r, handler)))
export function compose (middlewares, handler) {
  return middlewares.reduceRight(
    (next, middleware) => request => middleware(request, next),
    handler,
  );
}

const app = compose([timing, auth, cors], request => new Response('hallo'));
const response = await app(new Request('https://example.com/'));
```

`reduceRight` baut die Zwiebel von innen nach außen: Der Handler ist der Kern, jede Middleware bekommt den Rest als `next`. Koa (`koa-compose`) und Hono machen im Prinzip dasselbe, mit Schutz gegen doppeltes `next()` und Fehlerbehandlung.

## Worauf es ankommt

- **Reihenfolge ist Bedeutung.** Logging vor Auth sieht auch abgewiesene Anfragen; Kompression nach Caching speichert die komprimierte Version. Eine falsche Reihenfolge ist ein echter Fehler, keine Stilfrage.
- **Abkürzen ist erlaubt.** Eine Middleware, die selbst antwortet, ruft `next()` nicht; alles danach läuft nicht. So arbeiten Auth, Cache und Rate Limiting.
- **Einmal `next()`.** Zweimal aufgerufen, läuft der Rest der Kette doppelt (in Express: „headers already sent“).
- **Zustand an der Anfrage.** Middleware reicht Ergebnisse weiter, indem sie sie an das Anfrage- oder Kontextobjekt hängt (`req.user`, `ctx.state`, `context.locals`). Bei `Request`-basierten Ketten geht das über einen eigenen Kontext oder neue Header.
- **Global oder pro Route.** Fast alle Frameworks erlauben beides: `app.use(mw)` für alles, `app.get('/admin', auth, handler)` für eine Route.

## Das Wort an anderen Stellen

Das Muster ist allgemeiner als HTTP:

| Ort | Middleware ist | Beispiel |
|---|---|---|
| Redux | Funktionen zwischen `dispatch` und Reducer | `store => next => action => { log(action); return next(action); }` (Logger, Thunk) |
| Client-Requests | Interceptors um `fetch` | Axios-Interceptors, ein eigener `fetch`-Wrapper mit Auth-Header und Retry |
| Service Worker | eine Schicht zwischen Seite und Netz | antwortet aus dem Cache, schreibt Anfragen um, compiliert Dateien |
| Edge | Code vor dem Routing beim Hoster | Vercel Routing Middleware, Netlify Edge Functions, Cloudflare Workers |
| Datenbanken, ORMs | Hooks vor und nach Abfragen | Prisma-Extensions, Mongoose-Middleware |
| Enterprise-IT (ursprüngliche Bedeutung) | Software zwischen Betriebssystem und Anwendungen | Message Queues, Application Server, Integrationsplattformen |

Verwandte Entwurfsmuster: **Chain of Responsibility** (jede Stufe entscheidet, ob sie zuständig ist), **Decorator** (eine Hülle um eine Funktion, die dasselbe Interface behält), **Pipeline** (Daten durch eine Folge von Stufen).

## In eigenem Code

- **zugriff:** `middleware.js` ist Vercel Routing Middleware an der Edge. Sie läuft vor dem Dateisystem, schreibt die Gestalt (Palette, Dichte, Geometrie) aus einem Cookie ins HTML und liefert die Bundles von `<slug>.zugriff.dev` aus. Klassische Middleware: abkürzen (eigene Antwort) oder durchreichen.
- **aufbau:** Der Service Worker in `@aufbau/api/_worker.js` ist Middleware zwischen Seite und Netz: Stylesheets und Fonts kommen per Stale-while-revalidate aus `@bunker/cache`.
- **bunker:** `@bunker/policy` umhüllt einen Driver mit TTL und Revalidierung, ohne dessen Vertrag zu ändern. Das ist das Decorator-Muster, also die Middleware-Idee für Speicher statt für Anfragen.
- **Astro 7** (`src/fetch.ts`) und **Fresh** (`app.use()`) nutzen die dritte Form; siehe [Astro](libs/astro.md) und [Fresh](libs/fresh.md).
