# GraphQL

**GraphQL** ist eine Abfragesprache für APIs und eine Laufzeit, die sie beantwortet. Der Server veröffentlicht ein typisiertes **Schema**, der Client schickt eine **Query**, die genau beschreibt, welche Felder er haben will, und bekommt JSON in genau dieser Form zurück. 2012 bei Facebook für die mobile App entstanden, 2015 veröffentlicht, seit 2019 bei der GraphQL Foundation (Linux Foundation). Aktuelle Ausgabe der Spezifikation: **September 2025**, die erste seit Oktober 2021.

Weiterführend: [server.md](server.md) (GraphQL ist eine Art API-Server), [middleware.md](middleware.md) (Auth und Logging vor dem einen Endpunkt), [types/protocols.md](types/protocols.md) (das Schema als Vertrag zwischen Client und Server), [standard-schema.md](standard-schema.md) (Schemas als Werte in JavaScript).

---

## Das Problem gegenüber REST

```
REST                                         GraphQL
GET /users/7           ─▶ { 30 fields }      POST /graphql
GET /users/7/posts     ─▶ [ 20 posts ]         { user(id: 7) { name
GET /posts/1/comments  ─▶ …                        posts(last: 3) { title } } }
GET /posts/2/comments  ─▶ …                  ─▶ { "data": { "user": { "name": …,
                                                   "posts": [ … 3 titles … ] } } }
```

| Problem bei REST | was GraphQL daraus macht |
|---|---|
| **Overfetching:** `/users/7` liefert 30 Felder, die Ansicht braucht zwei | der Client wählt die Felder; was nicht angefragt wird, wird nicht berechnet und nicht übertragen |
| **Underfetching:** für eine Ansicht braucht es mehrere Anfragen nacheinander (Wasserfall) | eine Query folgt Beziehungen beliebig tief, eine Rundreise |
| viele Endpunkte, jeder mit eigener Form, Versionen (`/v2/…`) | **ein** Endpunkt; Felder werden ergänzt und mit `@deprecated` markiert statt versioniert |
| die Form der Antwort steht in einer Doku, die veralten kann | ein **typisiertes Schema**, das der Server selbst ausliefert (Introspection) |

Der Preis: HTTP-Semantik geht weitgehend verloren. Fast alles läuft als `POST` an eine URL, Fehler kommen oft mit Status `200` im Feld `errors`, und HTTP-Caching greift nicht von selbst (siehe unten). REST bleibt einfacher, wenn es nur wenige Clients gibt, die Daten flach sind oder CDN-Caching zählt.

## Das Schema (SDL)

Die **Schema Definition Language** beschreibt Typen, Felder und Beziehungen. `!` heißt „nie `null`“, `[Post!]!` eine Liste ohne Lücken.

```graphql
"""Ein angemeldeter oder fremder Nutzer."""
type User {
  id: ID!
  name: String!
  posts(last: Int = 10): [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!
  draft: Boolean @deprecated(reason: "use status")
}

input NewPost @oneOf { markdown: String, html: String }   # exactly one of them, since 2025

type Query        { user(id: ID!): User, me: User }
type Mutation     { createPost(input: NewPost!): Post! }
type Subscription { postAdded: Post! }
```

Skalare sind `Int`, `Float`, `String`, `Boolean`, `ID`, dazu eigene (`scalar DateTime`). Dazu kommen `enum`, `interface`, `union` und `input` für Argumente. Das Schema ist zugleich Vertrag, Dokumentation und Grundlage für Codegenerierung.

## Drei Operationen

| Operation | Zweck | Ausführung |
|---|---|---|
| `query` | lesen | Felder dürfen parallel aufgelöst werden |
| `mutation` | schreiben | Wurzelfelder **nacheinander**, in der Reihenfolge der Anfrage |
| `subscription` | Ereignisse empfangen | ein Strom von Ergebnissen, meist über WebSocket (`graphql-ws`) oder Server-Sent Events |

```graphql
query Profile($id: ID!, $withPosts: Boolean = true) {
  user(id: $id) {
    name
    ...Avatar
    posts(last: 3) @include(if: $withPosts) { title }
  }
}

fragment Avatar on User { id name }
```

Variablen kommen getrennt von der Query, Fragmente sind wiederverwendbare Feldauswahlen, Direktiven (`@include`, `@skip`) schalten Teile ab. Über die Leitung geht ein JSON-Objekt; das Format beschreibt die separate Spezifikation *GraphQL over HTTP* (Stage 2, Entwurf):

```js
const response = await fetch('/graphql', {
  body    : JSON.stringify({ query, variables: { id: '7' }, operationName: 'Profile' }),
  headers : { 'content-type': 'application/json', accept: 'application/graphql-response+json' },
  method  : 'POST',
});
const { data, errors } = await response.json();   // both may be present: partial success
```

## Resolver

Der Server führt eine Query aus, indem er für jedes Feld eine Funktion aufruft, den **Resolver**. Er bekommt das Elternobjekt, die Argumente und einen Kontext (Nutzer, Datenbank, Loader).

```js
import { createSchema, createYoga } from 'graphql-yoga';

const resolvers = {
  Query : {
    user : (parent, { id }, context) => context.db.users.find(id),
  },
  User  : {
    posts : (user, { last }, context) => context.db.posts.byAuthor(user.id, last),
  },
};

const yoga = createYoga({ schema: createSchema({ typeDefs, resolvers }) });
Deno.serve(yoga);   // a fetch handler: request in, response out
```

Fehlt ein Resolver, liest der Standardresolver einfach `parent[feldname]`. Die Ausführung läuft die Query als Baum ab: erst `user`, dann für dieses Ergebnis `name` und `posts`, dann für jeden Post `title`. Wirft ein Resolver, wird das Feld `null` und der Fehler mit Pfad in `errors` gemeldet; bei einem `!`-Feld wandert das `null` bis zum nächsten nullbaren Elternteil.

## Introspection

Jedes Schema lässt sich über die Query selbst abfragen: `__schema`, `__type(name: "User")`, `__typename` an jedem Objekt. Darauf bauen GraphiQL (Explorer mit Autovervollständigung), Codegeneratoren (`graphql-codegen` erzeugt Typen und typisierte Dokumente) und Linter. In Produktion schalten viele Server Introspection ab, weil sie die gesamte Angriffsfläche offenlegt; das ersetzt keine Autorisierung.

## N+1 und DataLoader

Das Resolver-Modell hat einen eingebauten Fehler: Für eine Liste von 50 Posts ruft `Post.author` 50-mal die Datenbank, plus die eine Abfrage für die Liste. **N+1**.

```
posts      ─▶ SELECT * FROM posts LIMIT 50            1
author ×50 ─▶ SELECT * FROM users WHERE id = ?       50
```

**DataLoader** (Facebook, heute `graphql/dataloader`, 2.2.3) sammelt alle `load(id)`-Aufrufe eines Ticks und führt sie als eine Abfrage aus, dazu ein Cache pro Anfrage:

```js
import DataLoader from 'dataloader';

// once per request, in the context: the cache must not outlive the request
const context = () => ({
  users : new DataLoader(async ids => {
    const rows = await db.users.findMany(ids);                 // WHERE id IN (…)
    const byId = new Map(rows.map(row => [row.id, row]));
    return ids.map(id => byId.get(id) ?? new Error(`no user ${id}`));   // same order as ids
  }),
});

const resolvers = { Post: { author: (post, args, context) => context.users.load(post.authorId) } };
```

Die Regel: Die Batch-Funktion muss genau so viele Ergebnisse in genau der Reihenfolge der Schlüssel liefern. Der Loader gehört pro Anfrage erzeugt, sonst sieht ein Nutzer gecachte Daten eines anderen.

## Kosten, Persisted Queries, Caching

Weil der Client die Query schreibt, kann er auch teure schreiben: tief verschachtelt (`user { posts { author { posts { … } } } }`) oder breit. Server begrenzen deshalb **Tiefe** und **Kosten** (jedes Feld hat ein Gewicht, Listen multiplizieren) oder erlauben nur bekannte Queries.

| Ansatz | wie | löst |
|---|---|---|
| **Persisted Queries** (Trusted Documents) | beim Build werden alle Queries des Clients gesammelt und gehasht; zur Laufzeit schickt der Client nur `{ documentId: 'sha256:…', variables }` | kleine Anfragen, und der Server führt nur bekannte Queries aus (Allowlist) |
| **APQ** (Automatic Persisted Queries, Apollo) | der Client schickt erst nur den Hash, bei Unbekanntheit die volle Query | nur Bandbreite, keine Sicherheit: jeder kann neue Hashes registrieren |
| **GET statt POST** | Query (oder Hash) und Variablen in der URL | HTTP- und CDN-Caching wird wieder möglich |

Caching ist das eigentliche Problem: Bei REST ist die URL der Cache-Schlüssel und `Cache-Control` sagt, wie lange. Bei GraphQL ist jede Query eine andere Sicht auf dieselben Objekte, alles geht als `POST` an `/graphql`. Clients lösen das mit einem **normalisierten Cache**: Antworten werden in Objekte zerlegt und unter `__typename:id` abgelegt (`User:7`), sodass eine Mutation, die `User:7` zurückgibt, jede Ansicht aktualisiert, die diesen Nutzer zeigt. Das ist mächtig, aber ein eigener kleiner Datenbankmotor im Browser, mit eigenen Fehlern (fehlende `id`, Listen, die nach einer Mutation nicht wissen, dass sie ein Element mehr haben).

## Federation

Große Organisationen bauen nicht ein Schema, sondern viele: Jedes Team betreibt einen **Subgraphen**, ein **Router** (Gateway) setzt sie zu einem **Supergraphen** zusammen und verteilt jede Query per Query-Plan auf die zuständigen Dienste.

```
client ─▶ router ─┬─▶ users-subgraph     type User @key(fields: "id") { id name }
                  ├─▶ posts-subgraph     type User @key(fields: "id") { id posts }
                  └─▶ reviews-subgraph
```

Apollo Federation hat das Muster geprägt (Apollo Router), daneben Hive Gateway (The Guild), WunderGraph Cosmo und Hot Chocolate Fusion. Die GraphQL Foundation arbeitet an einem herstellerunabhängigen Standard, seit September 2026 unter dem Namen *GraphQL Federation Spec* (vorher Composite Schemas), noch Stage 0. Für kleine Projekte ist Federation irrelevant.

## Clients und Server

| Client | Ansatz | Stand |
|---|---|---|
| **Apollo Client** | normalisierter Cache, React-Hooks, Local State | 4.3.5 |
| **urql** | kleiner, „Exchanges“ als Middleware-Kette, normalisierter Cache optional (Graphcache) | `urql` 5.0.4, `@urql/core` 6.0.3 |
| **Relay** | Compiler, Fragmente pro Komponente, strenge Konventionen; der Maximalansatz von Meta | `react-relay` 21.0.1 |
| **graphql-request** | nur ein `fetch` mit Query und Variablen, kein Cache | 7.4.0 |
| eigener `fetch` | die zehn Zeilen aus dem Abschnitt oben | |

| Server | Ansatz | Stand |
|---|---|---|
| **graphql-js** | Referenzimplementierung: Parser, Validierung, Ausführung; Basis fast aller JS-Server | 17.0.2 (v17 seit Juni 2026: ESM-`exports`, Node 22+, `@defer`/`@stream` nur über `experimentalExecuteIncrementally`) |
| **GraphQL Yoga** | auf `Request`/`Response`, läuft auf Node, Deno, Bun, Workers; Plugins (Envelop) | 5.24.6 |
| **Apollo Server** | verbreitet, eng mit Apollos Werkzeugen | 5.5.1 |

Relays Idee ist die interessanteste: Jede Komponente deklariert ihre Daten als **Fragment** direkt neben sich; der Compiler setzt die Fragmente einer Seite zu einer Query zusammen. Datenbedarf und Darstellung liegen am selben Ort, und eine Komponente bekommt nur die Felder, die sie selbst angefragt hat (*data masking*).

## Stand der Spezifikation

- **September 2025** (veröffentlicht 8. September 2025) ist die aktuelle Ausgabe. Neu gegenüber Oktober 2021: **OneOf Input Objects** (`@oneOf`, „Input-Unions“), **Schema Coordinates** (`User.posts(last:)` als Standardadresse für Werkzeuge), **Beschreibungen in Queries** (Motivation: KI-Clients), Deprecation an mehr Stellen, voller Unicode-Bereich, viele redaktionelle Klärungen.
- Im Entwurf (`spec.graphql.org/draft`) seither unter anderem: Direktiven auf Direktiven-Definitionen, leere Selection Sets, Klärungen zu Fehlerweitergabe.
- **`@defer` und `@stream`** (Teile der Antwort nachliefern) sind weiter ein RFC, nicht Teil der Spezifikation; graphql-js 17 und mehrere Server implementieren sie experimentell.
- **GraphQL over HTTP** ist eine eigene Spezifikation (Stage 2, Entwurf), **GraphQL Federation** ebenfalls (Stage 0).

## Für rat, aufbau und zugriff

- **zugriff braucht keinen GraphQL-Server.** Die Apps (Notizen, Todos, Feeds, Podcasts, Dateien, Werkzeuge) laufen im Browser und in Capacitor, ihre Daten liegen lokal (`@bunker`) oder kommen aus fremden Quellen in fremden Formaten: RSS und Atom, Podcast-Feeds, Dateien. Serverseitig gibt es nur die Edge-[Middleware](middleware.md). Ein GraphQL-Schema hätte keine Gegenseite.
- **Als Client nur, wo eine fremde API GraphQL spricht**, etwa die GitHub-API (v4) für eine Repo-Ansicht in der code-App. Dafür reicht der eigene `fetch` von oben oder graphql-request; Apollo oder urql wären für ein paar Abfragen zu schwer. In aufbau passt eine solche Funktion direkt als Fetcher in `querySignal` (`@aufbau/signals/QuerySignal.js`), das Paging und Abbruch schon mitbringt.
- **bunker:** Der normalisierte Cache (`__typename:id` als Schlüssel, Objekte statt Antworten speichern) ist eine Idee, die auch ohne GraphQL trägt: Wer dieselben Einträge (Feed-Items, Notizen) in mehreren Ansichten zeigt, speichert sie einmal unter ihrer ID und lässt Listen nur IDs halten. Persisted Queries sind Content-Hashing, wie `@bunker/utils` es schon hat.
- **rat:** Relays Fragment-Colocation (eine Komponente sagt, welche Daten sie braucht, der Compiler setzt sie zusammen) ist das Datengegenstück zu dem, was rats Compiler für Reaktivität tut. Als Idee für einen späteren Datenlayer notieren, nicht als Abhängigkeit. Das GraphQL-Typsystem selbst (Typen mit `!`, Input-Typen, `@oneOf`) deckt sich weitgehend mit `@rat/types` (`Record`, `.optional()`, `Union`); ein Generator von Introspection zu `@rat/types`-Schemas wäre klein, lohnt aber erst, wenn eine eigene App eine GraphQL-API konsumiert.
- **Ehrliche Einordnung:** GraphQL löst Probleme vieler Clients gegen viele Dienste in großen Teams. Für die eigenen Projekte (statisch gehostet, lokal gespeichert, ein Autor) ist es ein Konzept zum Verstehen, kein Werkzeug zum Einsetzen.

---

Quellen: [GraphQL-Spezifikation, September 2025](https://spec.graphql.org/September2025/), [Changelog September 2025](https://github.com/graphql/graphql-spec/blob/main/changelogs/September2025.md), [Ankündigung auf graphql.org](https://graphql.org/blog/2025-09-08-september-edition/), [Spezifikationsentwurf](https://spec.graphql.org/draft/), [GraphQL over HTTP](https://github.com/graphql/graphql-over-http), [GraphQL Federation Spec](https://github.com/graphql/graphql-federation-spec), [Defer/Stream-RFC](https://github.com/graphql/graphql-wg/blob/main/rfcs/DeferStream.md), [graphql-js v16 → v17](https://github.com/graphql/graphql-js/blob/v17.0.0/website/pages/upgrade-guides/v16-v17.mdx), [DataLoader](https://github.com/graphql/dataloader), [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), [Apollo Client](https://www.apollographql.com/docs/react), [urql](https://formidable.com/open-source/urql/docs/), [Relay](https://relay.dev), [graphql-request](https://github.com/graffle-js/graffle/tree/graphql-request), npm-Registry (Versionen). Stand: 21. Oktober 2026.
