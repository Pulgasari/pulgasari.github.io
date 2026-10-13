# Express

Das minimalistische Web-Framework für Node, 2010 von TJ Holowaychuk nach dem Vorbild von Ruby's Sinatra geschrieben, heute ein Projekt der OpenJS Foundation. Seit 15 Jahren der Standard für HTTP-Server in Node; fast jedes andere Node-Framework ist entweder darauf gebaut oder bewusst dagegen entworfen. Express 5.0 erschien im September 2024, zehn Jahre nach 4.0, aktuell ist 5.3.

- Website: https://expressjs.com
- Repository: https://github.com/expressjs/express
- Laufzeit: Node (auch Bun; Deno über `npm:express`)
- Build: keiner

## Das Problem, das Express löst

Nodes eingebautes `http`-Modul liefert einen Request und eine Response als rohe Streams. Routing, Query-Strings, Cookies, JSON, statische Dateien, Fehlerbehandlung: alles von Hand. Express legt darüber genau zwei Ideen, **Routing** und **Middleware**, plus Komfort-Methoden an `req` und `res`. Alles andere (Sessions, Uploads, Auth, CORS) kommt als Middleware aus dem Ökosystem.

## Kernkonzepte

### 1. Die App ist eine Funktion

```js
import express from 'express';

const app = express();

app.get('/', (req, res) => res.send('hallo'));

app.listen(3000);
```

`app` ist selbst ein Request-Handler `(req, res)`. `app.listen()` ist nur `http.createServer(app).listen(…)`. Deshalb lässt sich eine Express-App in andere Server, Tests oder Serverless-Adapter stecken.

### 2. Routing

```js
app.get('/users/:id', (req, res) => res.json({ id: req.params.id }));
app.post('/users', createUser);
app.route('/books').get(listBooks).post(addBook);       // one path, several methods
```

Pfadparameter (`:id`) landen in `req.params`. Express 5 nutzt `path-to-regexp` 8 mit strengerer Syntax:

| Express 4 | Express 5 | Bedeutung |
|---|---|---|
| `/files/*` | `/files/*path` | Rest-Pfad, benannt (`req.params.path` ist ein Array) |
| `/:file.:ext?` | `/:file{.:ext}` | optionaler Teil in geschweiften Klammern |
| `/user/:id(\\d+)` | nicht mehr möglich | keine Regex im Pfad, Prüfung im Handler |

Der Grund für die Einschränkung: Regex in Pfaden waren eine Quelle für ReDoS-Lücken.

### 3. Middleware: die Kette

Alles in Express ist Middleware, eine Funktion `(req, res, next)`. Sie kann den Request verändern, eine Antwort schicken oder mit `next()` an die nächste weitergeben.

```js
app.use(express.json());                      // parses json bodies into req.body
app.use(express.static('public'));            // serves files, ends the chain on a hit

app.use((req, res, next) => {
  req.started = Date.now();
  next();                                     // without next() the request hangs
});

app.use('/admin', requireLogin, adminRouter); // middleware only for a path prefix
```

Die Reihenfolge der `use`-Aufrufe ist die Reihenfolge der Ausführung. Das ist das ganze Modell.

### 4. Fehler-Middleware

Eine Middleware mit **vier** Parametern ist ein Fehlerbehandler. `next(error)` springt direkt dorthin.

```js
app.use((error, req, res, next) => {
  res.status(error.status ?? 500).json({ message: error.message });
});
```

Neu in Express 5: Ein `async`-Handler, dessen Promise abgelehnt wird, landet automatisch hier. In Express 4 musste man jeden `async`-Handler in `try/catch` packen oder einen Wrapper wie `express-async-handler` benutzen, sonst blieb der Request hängen.

```js
app.get('/users/:id', async (req, res) => {
  const user = await db.find(req.params.id);   // a rejection reaches the error middleware
  res.json(user);
});
```

### 5. Router: Teil-Apps

```js
const api = express.Router();
api.get('/status', (req, res) => res.json({ ok: true }));
app.use('/api', api);                          // mounted: GET /api/status
```

Ein `Router` ist eine Mini-App mit eigener Middleware-Kette, beliebig verschachtelbar. Seit Express 5 ist der Router ein eigenes Paket (`router`).

### 6. `req` und `res` mit Komfort

| | |
|---|---|
| `req.params`, `req.query`, `req.body`, `req.get('header')` | Eingaben |
| `res.status(404)`, `res.set(…)`, `res.cookie(…)` | verkettbar |
| `res.send(…)`, `res.json(…)`, `res.redirect(…)`, `res.sendFile(…)` | Antworten |
| `res.render('view', data)` | Template rendern, mit einer View-Engine wie [EJS](ejs.md), Pug, Handlebars |

```js
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.render('index', { user: req.user }));
```

## Wie es intern arbeitet

Die App hält einen Stapel von **Layers**. Jede Layer ist ein Pfadmuster plus Handler. Bei einem Request läuft der Router den Stapel von oben nach unten ab, prüft jedes Muster per Regex und ruft den Handler; `next()` setzt die Suche bei der nächsten Layer fort. Es gibt keinen Routing-Baum, die Suche ist linear.

`req` und `res` sind Nodes eigene `IncomingMessage`- und `ServerResponse`-Objekte, deren Prototyp Express beim Eintritt auf seine erweiterten Prototypen umsetzt (`Object.setPrototypeOf`). Daher kommen `res.json` und Co. Dieser Prototyp-Tausch und die lineare Regex-Suche sind die Hauptgründe, warum Express in Benchmarks deutlich langsamer ist als Fastify oder Hono.

## Stärken und Schwächen

- **Stark:** in fünf Minuten verstanden, das Middleware-Modell trägt erstaunlich weit, riesiges Ökosystem, überall dokumentiert, extrem stabil (Express 4 lief zehn Jahre).
- **Schwach:** langsam im Vergleich, keine eingebaute Validierung oder Typen für Requests, Middleware-Reihenfolge als implizite Abhängigkeit (wer setzt `req.user`?), an Nodes `http`-Objekte gebunden statt an die Web-Standards `Request`/`Response`. Dadurch läuft es nicht auf Edge-Runtimes und Workers, wo Hono, Elysia oder itty-router stehen.

## Für rat, aufbau und zugriff

- **Middleware ist Funktionskomposition mit Abbruch.** Dasselbe Muster taucht in rats Hotkeys und Commands auf (ein Handler entscheidet, ob er weiterreicht). Eine `next()`-Kette ist eine Alternative zu Rückgabewerten wie `false`.
- **Ein Dev-Server für `.rat`:** Eine Middleware, die `.rat`- und `.rat.js`-Dateien bei Anfrage compiliert (`compileAsync`) und als Modul ausliefert, ist die Server-Variante des Service-Worker-Plans aus rats Entscheidung d-20. Rund 30 Zeilen.
- **Für neuen Server-Code eher Hono:** dasselbe Modell (`app.get`, Middleware), aber auf `Request`/`Response`, also lauffähig in Node, Deno, Bun, Workers und sogar im Service Worker. Das passt besser zu "browser first".
- **`res.render` + EJS** ist das klassische Gegenstück zu rats geplantem `ssr`-Target: der Server baut HTML-Strings, der Browser bekommt fertiges Markup.
