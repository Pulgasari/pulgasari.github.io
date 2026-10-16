# htm

JSX-ähnliches Markup in Tagged Templates, ohne Compiler: ``html`<div class="card">${title}</div>` `` statt `<div className="card">{title}</div>`. htm parst das Template im Browser und ruft dafür eine `h`-Funktion auf (Preact, React oder jede andere). Von Jason Miller (developit, auch [Preact](preact.md)), Version 1.0 im November 2018. Aktuell 3.1.1 (April 2022): fertig, seitdem keine Änderungen nötig.

- Repository: https://github.com/developit/htm
- Abhängigkeiten: keine
- Build: keiner; optional `babel-plugin-htm`, das die Templates beim Bauen zu `h()`-Aufrufen macht

## Das Problem, das htm löst

JSX ist bequem, aber kein JavaScript: Ohne Babel, esbuild oder TypeScript läuft es nicht im Browser. Wer ohne Build arbeiten will (Prototypen, kleine Seiten, Lernprojekte, Apps aus ES-Modulen über eine Import-Map), musste auf `h('div', { class: 'card' }, title)` ausweichen, was bei verschachteltem Markup schnell unlesbar wird.

htm nutzt, was JavaScript seit 2015 kann: **Tagged Templates**. Der Tag bekommt die festen Teile des Templates und die Werte getrennt, kann die festen Teile also selbst parsen. Das Ergebnis liest sich wie JSX und läuft ohne Werkzeug.

## Kernkonzepte

### 1. `bind` an eine `h`-Funktion

```js
import htm   from 'htm';
import { h } from 'preact';

const html = htm.bind(h);

html`<ul class="list">${items.map(item => html`<li key=${item.id}>${item.title}</li>`)}</ul>`;
```

`htm` kennt kein DOM und keine Komponenten. Es ruft nur `h(type, props, ...children)` auf. Das macht es für jede Bibliothek mit dieser Signatur nutzbar. `htm/preact` liefert die fertige Bindung samt `render`.

### 2. Die Syntax

| htm | JSX |
|---|---|
| `<div class="a">` | `<div className="a">` (in React) |
| `<${Card} title=${t} />` | `<Card title={t} />` |
| `<${Card}>…<//>` | `<Card>…</Card>` (kurzes End-Tag) |
| `<div ...${props}>` | `<div {...props}>` |
| `<input disabled>` | `<input disabled />` |
| `<a /><b />` | `<><a /><b /></>` (mehrere Wurzeln ohne Fragment) |
| `<!-- comment -->` | `{/* comment */}` |

Komponenten sind Werte in `${…}`, weil ein Template keine Variablennamen sieht. Attribute ohne Anführungszeichen (`class=foo`) sind erlaubt wie in HTML.

### 3. Einmal parsen, oft auswerten

```js
const render = name => html`<p class="greeting">hallo ${name}</p>`;
render('ada');   // parses the template
render('bob');   // reuses the parsed form
```

Ein Tagged Template liefert bei jedem Aufruf **dasselbe** `strings`-Array (dieselbe Objekt-Identität). htm nutzt es als Schlüssel in einem Cache: Beim ersten Aufruf wird geparst, danach nur noch eine vorbereitete Befehlsliste mit neuen Werten abgespielt.

### 4. Größe und `htm/mini`

htm wiegt 0,7 kb, `htm/mini` (ohne Cache) 0,5 kb, mit Preact zusammen 5,1 kb. `babel-plugin-htm` entfernt htm ganz, indem es die Templates beim Bauen in `h()`-Aufrufe übersetzt: Entwicklung ohne Build, Produktion mit.

## Wie es intern arbeitet

Ein kleiner Zustandsautomat läuft Zeichen für Zeichen durch die `strings` und baut eine flache Liste von Operationen: „Element öffnen“, „Prop setzen mit Wert Nummer 3“, „Kind anhängen“, „Element schließen“. Wo im Template ein `${…}` stand, steht in der Liste nur die Nummer des Werts. Diese Liste wird pro Template gespeichert. Ein Aufruf geht sie durch, setzt die Werte ein und ruft `h()`. Das Parsen kostet also einmal pro Template, nicht pro Render; es gibt keinen Syntaxbaum, nur diese Befehlsliste.

## Stärken und Schwächen

- **Stark:** JSX-Komfort ohne Build, winzig, unabhängig vom Renderer, HTML-nähere Syntax als JSX. Mit `babel-plugin-htm` ohne Laufzeitkosten.
- **Schwach:** Komponenten als `<${Card}>` sind umständlicher als `<Card>`. Editoren erkennen es nur mit Plugin (lit-html-Erweiterung). Kein Typ-Check der Props wie bei TSX. Fehler im Template (ein vergessenes `>`) fallen erst zur Laufzeit auf und werden schlecht gemeldet.

## Für rat und aufbau

- **htx ist ein Fork von htm**, und damit die Grundlage für zugriff (`@htx/preact`), `@htx/js` und die Templates, die rats Compiler erzeugt. Was htx dazubaut (Props zusammenführen statt überschreiben, Tag-Selektoren `<div#main.card>`, Prop-Gruppen `a|b=`, Shorthand-Tags, ein Vanilla-DOM-Adapter, `.htx`-Dateien), steht in `htx/README.md`. Der Kern, das Befehlslisten-Programm pro Template, ist htms Idee.
- **Das Befehlslisten-Programm ist die Brücke zu `@domina/render`:** htx übersetzt ein Template in ein Programm, `@domina/render` spielt es ab und bindet nur die Löcher. Dieselbe Trennung wie bei htm (parsen einmal, auswerten oft), nur mit echtem DOM statt `h()`.
- **`<${Card}>` gegen `<Card>`:** Der Grund, warum rats Compiler existiert. In `.rat` und `.rat.js` kann `<Card>` stehen, weil der Compiler die Namen im Gültigkeitsbereich kennt; ein Template zur Laufzeit kann das nie (siehe d-12).
- **`babel-plugin-htm` ist ein Vorbild für htx:** Templates im Build zu Programmen vorcompilieren, damit der Parser in Produktion entfällt. Bei htx wäre das dasselbe für `@domina/render`-Programme.
