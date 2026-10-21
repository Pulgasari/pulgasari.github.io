# Server

Ein **Server** ist ein Programm, das wartet, bis jemand etwas von ihm will, und dann antwortet. Wer fragt, ist der **Client**. Das Wort meint zweierlei, und das verwirrt oft: das *Programm*, das antwortet, und die *Maschine*, auf der es läuft.

Weiterführend: [protocols.md](types/protocols.md) (wie Client und Server sich verstehen), [middleware.md](middleware.md) (was zwischen Anfrage und Antwort passiert).

---

## Das Grundprinzip

```
client                                server
  │  GET /index.html  ───────────────▶  │   listens on a port, e.g. 443
  │                                     │   finds or builds the answer
  │  ◀───────────────  200 OK + body    │
```

1. Der Server **lauscht** auf einem Port (80 für HTTP, 443 für HTTPS, beim Entwickeln oft 3000, 5173 oder 8000).
2. Ein Client **verbindet** sich und schickt eine Anfrage in einem gemeinsamen [Protokoll](types/protocols.md), im Web HTTP.
3. Der Server **antwortet**: eine Datei, ein berechnetes HTML, JSON, ein Fehler.
4. Er wartet auf die nächste Anfrage, meist viele gleichzeitig.

Server und Client sind **Rollen**, keine Gerätearten. Ein Laptop mit `npx vite` ist ein Server; ein Server, der eine API eines anderen Dienstes abfragt, ist in dem Moment Client.

## Ein Server in wenigen Zeilen

Heute sehen Server in allen JavaScript-Laufzeiten fast gleich aus: eine Funktion, die ein `Request` bekommt und ein `Response` zurückgibt.

```js
// deno
Deno.serve(request => new Response('hallo'));

// bun
Bun.serve({ fetch: request => new Response('hallo') });

// cloudflare workers, vercel, and the convention of hono, astro (src/fetch.ts) and others
export default {
  fetch (request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/time') return Response.json({ now: Date.now() });
    return new Response('not found', { status: 404 });
  },
};
```

```js
// node, the classic way: own request and response objects instead of fetch
import { createServer } from 'node:http';
createServer((req, res) => res.end('hallo')).listen(3000);
```

Dass sich die `fetch`-Form durchsetzt, ist kein Zufall: **WinterTC** (Ecma TC55, vorher WinterCG) legt eine gemeinsame Minimal-API für Server-Laufzeiten fest, mit `Request`, `Response`, `URL`, `fetch`, Streams und Web Crypto. Code, der sich daran hält, läuft auf jeder dieser Plattformen.

## Arten von Servern

Nach dem, was sie tun:

| Art | tut | Beispiele |
|---|---|---|
| **Webserver** (statisch) | liefert Dateien von der Platte aus, so wie sie sind | nginx, Caddy, Apache, GitHub Pages |
| **Anwendungsserver** | führt Code pro Anfrage aus: HTML rendern, Daten lesen, Formulare verarbeiten | Express, Fresh, Rails, Django, Laravel |
| **API-Server** | liefert Daten statt Seiten, meist JSON | REST, GraphQL, tRPC |
| **Reverse Proxy** | nimmt Anfragen an und reicht sie an andere Server weiter; TLS, Kompression, Caching davor | nginx, Caddy, Traefik |
| **Load Balancer** | verteilt Anfragen auf mehrere gleiche Server | HAProxy, Cloud-Load-Balancer |
| **CDN / Edge** | viele Server weltweit, die Kopien nah beim Nutzer halten oder Code dort ausführen | Cloudflare, Fastly, Vercel Edge |
| **Echtzeitserver** | hält Verbindungen offen und schiebt Nachrichten | WebSocket, Server-Sent Events |
| **Datenbankserver** | beantwortet Abfragen auf Daten | PostgreSQL, Redis |
| **andere Protokolle** | Mail, Dateien, Namensauflösung | SMTP, SFTP, DNS |

In der Praxis sind das oft Schichten hintereinander: CDN → Reverse Proxy → Anwendungsserver → Datenbankserver.

## Wo und wie er läuft

| Modell | was man verwaltet | passt für |
|---|---|---|
| **eigene Maschine / VPS** | alles: Betriebssystem, Updates, Prozesse, TLS | volle Kontrolle, dauerhaft laufende Prozesse |
| **Container / PaaS** | nur das Programm; Plattform startet und skaliert | Anwendungsserver ohne Betriebsaufwand (Fly.io, Render, Railway) |
| **Serverless Functions** | nur einzelne Funktionen; laufen pro Anfrage, kosten im Leerlauf nichts | APIs mit ungleichmäßiger Last; Kaltstarts beachten |
| **Edge Functions** | Funktionen, die weltweit nah beim Nutzer laufen, mit eingeschränkter Laufzeit | Rewrites, Personalisierung, Auth, Middleware |
| **statisches Hosting** | nur Dateien, kein eigener Code auf dem Server | Dokumentation, Blogs, Single-Page-Apps, alles mit Build |

„Serverless“ heißt nicht, dass es keinen Server gibt, sondern dass man sich nicht um ihn kümmert.

## Wo die Seite entsteht

Eine Frage, die jede Webseite beantworten muss: **Wer baut das HTML?**

| Ansatz | HTML entsteht | Vorteile | Nachteile |
|---|---|---|---|
| **Statisch (SSG)** | einmal beim Build | schnell, billig, überall hostbar | Inhalt ändert sich nur mit neuem Build |
| **Server-Rendering (SSR)** | bei jeder Anfrage auf dem Server | immer aktuell, gut für Suchmaschinen | ein Server muss laufen, jede Anfrage kostet |
| **Client-Rendering (CSR)** | im Browser per JavaScript | reiche Interaktion, Server nur für Daten | leere Seite bis das JS lädt, schwächer für Suche |
| **Mischformen** | statisch oder auf dem Server, Interaktion in Inseln | das Beste aus beiden, wo es passt | mehr Konzepte (Hydration, Islands, Resumability) |

Mischformen sind heute der Normalfall: [Astro](libs/astro.md) und [Fresh](libs/fresh.md) (Islands), [Marko](libs/marko.md) (Streaming), Qwik (Resumability). Siehe auch [reactivity_models.md, 11](reactivity_models.md#11-wo-der-zustand-lebt-server-resumability-sync).

## Zustand

HTTP selbst ist **zustandslos**: Jede Anfrage steht für sich, der Server erinnert sich an nichts. Was eine App sich merken muss (wer angemeldet ist, der Warenkorb), braucht einen Ort:

| Ort | wie | Beispiel |
|---|---|---|
| Cookie | der Browser schickt ihn bei jeder Anfrage mit | Session-ID, Spracheinstellung, zugriffs Gestalt-Cookie |
| Token | der Client schickt ihn im Header | `Authorization: Bearer …` (JWT) |
| Server-Speicher | Session-Daten im Speicher oder in Redis, über die Session-ID gefunden | klassische Logins |
| Datenbank | dauerhafte Daten | Nutzer, Bestellungen |
| URL | Zustand steht im Link | Filter, Seitenzahl, Suchbegriff |

Zustandslose Server lassen sich beliebig vervielfachen (jede Instanz kann jede Anfrage beantworten). Das ist der Grund, warum Zustand möglichst in Cookie, Token oder Datenbank liegt und nicht im Speicher eines einzelnen Prozesses.

## Server im Browser

Auch im Browser gibt es eine Rolle, die wie ein Server arbeitet: der **Service Worker**. Er fängt die Anfragen der Seite ab und beantwortet sie selbst, aus einem Cache oder aus berechnetem Inhalt, mit genau der `fetch`-Form oben (`self.addEventListener('fetch', event => event.respondWith(…))`). Siehe [workers.md](workers.md).

## In eigenem Code

- **pulgasari.github.io / code.pulgasari.dev:** statisches Hosting auf GitHub Pages. Kein eigener Servercode; die Repos werden als Projektseiten ausgeliefert, `importmap.js` verbindet sie.
- **zugriff:** statische Dateien auf Vercel plus eine Edge-[Middleware](middleware.md), die vor dem Dateisystem läuft (Gestalt-Cookie ins HTML, Bundles pro Subdomain). Server-Logik nur dort, wo eine statische Datei nicht reicht.
- **aufbau:** Ein Service Worker (`@aufbau/api/_worker.js`) übernimmt die Rolle eines kleinen Servers im Browser: Stylesheets und Fonts aus dem Cache, ASS wird beim ersten Abruf zu CSS compiliert.
- Steckbriefe: [Express](libs/express.md) (der klassische Anwendungsserver in Node), [Fresh](libs/fresh.md) (Deno, Islands), [Astro](libs/astro.md) (statisch und Server in einem Projekt).
