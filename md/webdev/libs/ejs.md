# EJS

**Embedded JavaScript Templates:** eine Template-Sprache, die normales JavaScript zwischen `<% %>`-Tags ins HTML einbettet, ähnlich wie PHP. Seit über zehn Jahren der Klassiker für serverseitiges Rendern mit Node und Express, läuft aber auch im Browser.

- Website: https://ejs.co
- Repository: https://github.com/mde/ejs
- Laufzeit: Node, Deno, Bun, Browser

## Worum es geht

Kein Framework, keine Reaktivität, keine Komponenten: EJS macht aus einem Template und Daten einen HTML-**String**. Die Logik im Template ist echtes JavaScript, man muss keine eigene Template-Sprache lernen.

```ejs
<% if (user) { %>
  <h2><%= user.name %></h2>
<% } %>

<ul>
  <% for (const item of items) { %>
    <li><%= item.title %></li>
  <% } %>
</ul>
```

## Kernkonzepte

### 1. Tags

| Tag | Wirkung |
|---|---|
| `<% … %>` | JavaScript ausführen, keine Ausgabe (Kontrollfluss) |
| `<%= … %>` | Wert ausgeben, **escaped** (sicher für HTML) |
| `<%- … %>` | Wert ausgeben, **nicht** escaped (fertiges HTML, Includes) |
| `<%# … %>` | Kommentar, wird weder ausgeführt noch ausgegeben |
| `<%%` | gibt ein literales `<%` aus |
| `-%>` | schließt und entfernt den folgenden Zeilenumbruch |
| `<%_` / `_%>` | entfernen allen Leerraum davor / danach |

Die Trennzeichen sind einstellbar, etwa `[? ?]` statt `<% %>`.

### 2. Includes

```ejs
<%- include('header', { title: 'Start' }) %>
<main>…</main>
<%- include('footer') %>
```

Ein Include rendert ein anderes Template mit eigenen Daten und setzt das Ergebnis unescaped ein (deshalb `<%-`).

### 3. Compilieren zu einer Funktion

```js
import ejs from 'ejs';

const template = ejs.compile('<p><%= name %></p>', { cache: true, filename: 'greeting' });
template({ name: 'Welt' });            // '<p>Welt</p>'

ejs.render('<p><%= name %></p>', { name: 'Welt' });
ejs.renderFile('views/page.ejs', data, options, (error, html) => { … });
```

`compile()` macht aus dem Template einmal eine JavaScript-Funktion, die dann beliebig oft mit Daten aufgerufen wird. Mit `cache` wird diese Funktion pro Dateiname gemerkt.

### 4. Express-Integration

EJS passt in das View-System von Express: `app.set('view engine', 'ejs')` und `res.render('index', { user })`.

## Wie es intern arbeitet

Der Compiler zerlegt das Template an den Tags in Text und Code und baut daraus den Quelltext einer Funktion: Text wird zu `__output += "…"`, `<%= x %>` zu `__output += escape(x)`, `<% … %>` wird unverändert eingefügt. Diese Funktion wird mit `new Function` erzeugt. Variablen wie `user` stehen im Template direkt zur Verfügung, weil die Daten standardmäßig über `with (locals) { … }` sichtbar gemacht werden; im Strict Mode stattdessen über ein `locals`-Objekt.

## Sicherheit

EJS ist im Kern eine JavaScript-Laufzeit: Ein Template **ist** Code. Templates dürfen nie aus Nutzereingaben stammen, und Nutzerdaten gehören nie ungeprüft in die Optionen von `render()`. `<%=` escaped nur für HTML-Inhalt und Attribute in Anführungszeichen, nicht für JavaScript, CSS oder URLs.

## Stärken und Schwächen

- **Stark:** nichts Neues zu lernen (es ist JavaScript), winzig, schnell, überall lauffähig. Ideal für E-Mails, statische Seiten, einfache Server-Ausgabe.
- **Schwach:** Der Wechsel zwischen `<% %>` und HTML wird bei viel Logik unlesbar (die geschweiften Klammern stehen verstreut in eigenen Tags). Nur Strings, kein DOM, keine Reaktivität.

## Für rat und aufbau

- **Dasselbe Grundprinzip wie rats Compiler:** Markup mit eingebettetem Code wird einmal in eine JavaScript-Funktion übersetzt. EJS baut daraus einen String, rat DOM-Aufrufe mit Signals. Ein `ssr`-Target von rat würde ziemlich genau wie EJS arbeiten.
- **Das Lesbarkeitsproblem** von `<% } %>` ist der Grund, warum rat `@if (…) { … }` und die einrückungsbasierte Form hat: Der Kontrollfluss bleibt ein Block im Markup, statt in Tag-Fragmenten zerstreut zu sein.
- **`-%>` und `<%_`** zeigen, dass Leerraum um Kontrollfluss ein echtes Thema ist. rat entfernt Leerraum mit Zeilenumbruch am Rand von Textknoten automatisch.
