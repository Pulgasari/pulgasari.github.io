# MDX

Markdown mit JSX: Komponenten, Ausdrücke und ES-Module direkt im Markdown-Text. Eine `.mdx`-Datei wird zu einem JavaScript-Modul compiliert, das eine Komponente exportiert. Seit 2018, gebaut auf dem unified-Ökosystem (remark, rehype) von Titus Wormer. Aktuell `@mdx-js/mdx` 3.1 (MDX 3 seit Oktober 2023).

- Website: https://mdxjs.com
- Repository: https://github.com/mdx-js/mdx
- Build: meist ja (Plugins für Vite, esbuild, Rollup, webpack, Next, Astro), zur Laufzeit über `evaluate()` möglich

## Das Problem, das MDX löst

Dokumentation, Blogs und Lerninhalte sind zu 90 % Text, zu 10 % interaktiv: ein Live-Beispiel, ein Diagramm, eine Warnbox im Stil des Design-Systems. Reines Markdown kann das nicht, reines JSX ist für Fließtext eine Qual. MDX lässt beides in einer Datei stehen: Prosa als Markdown, Interaktives als Komponente.

## Kernkonzepte

### 1. JSX im Markdown

```mdx
import { Chart } from './chart.js';

# Umsatz 2026

Das Wachstum im dritten Quartal war **deutlich**:

<Chart year={2026} quarter={3} />

Mehr dazu im nächsten Abschnitt.
```

Markdown und Komponenten wechseln sich frei ab. Innerhalb einer Komponente kann wieder Markdown stehen, wenn er durch Leerzeilen abgesetzt ist.

### 2. Ausdrücke und Exporte

```mdx
export const year = 2026;

Dieses Dokument ist von {year}, also {new Date().getFullYear() - year} Jahre alt.

{/* a comment: html comments are not allowed */}
```

`{…}` ist ein JavaScript-Ausdruck, `import`/`export` sind echte ES-Module. Ein exportierter Wert ist auch von außen lesbar (`import { year } from './doc.mdx'`), gebräuchlich für Metadaten.

### 3. Die Ausgabe ist eine Komponente

```js
import Doc from './doc.mdx';

<Doc components={{ h1: FancyHeading, Chart }} />
```

Eine `.mdx`-Datei compiliert zu einem Modul mit `export default function MDXContent (props)`. Über `components` lassen sich alle Markdown-Elemente ersetzen: jedes `# …` wird zu `FancyHeading`, jedes `` ` `` zu einem eigenen `code`. So bekommt reiner Markdown-Text das Aussehen des Design-Systems, ohne dass der Autor etwas anderes schreibt.

### 4. Jede JSX-Runtime

```js
compile(source, { jsxImportSource: 'preact' })   // or react, vue, solid, hono/jsx
```

MDX erzeugt JSX-Aufrufe, keine React-Abhängigkeit. Mit `@mdx-js/react`, `@mdx-js/preact` oder `@mdx-js/vue` kommen die `components` zusätzlich über einen Provider aus dem Context.

### 5. Plugins: remark und rehype

```js
import remarkGfm         from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeSlug        from 'rehype-slug';

compile(source, { remarkPlugins: [remarkGfm, remarkFrontmatter], rehypePlugins: [rehypeSlug] });
```

Tabellen, Fußnoten, Frontmatter, Überschriften-Anker, Syntax-Highlighting, Mathematik: alles Plugins aus dem unified-Ökosystem. MDX selbst kann nur CommonMark plus JSX.

### 6. Zur Laufzeit compilieren

```js
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'preact/jsx-runtime';

const { default: Content } = await evaluate(source, { ...runtime });
```

Für Inhalte aus einer Datenbank oder einem Editor. Der Compiler ist aber groß (er bringt micromark, acorn und die unified-Kette mit) und `evaluate` führt Code aus, also nur für vertrauenswürdige Quellen.

## Wie es intern arbeitet

MDX ist eine Pipeline von Syntaxbäumen, jeder Schritt ein eigenes unified-Format:

```
source ─ micromark + mdx extensions ─► mdast   (markdown ast, remark plugins run here)
       ─ mdast-util-to-hast           ─► hast    (html ast, rehype plugins run here)
       ─ hast-util-to-estree           ─► esast   (javascript ast, recma plugins run here)
       ─ estree-util-to-js             ─► module  (jsx calls, export default MDXContent)
```

Der Parser ist micromark, ein Zustandsautomat für CommonMark, um Erweiterungen für JSX, Ausdrücke und ESM ergänzt. Ausdrücke werden mit acorn geparst, damit Fehler mit Zeile und Spalte gemeldet werden. Jede Stufe ist ein offenes Format mit eigenen Werkzeugen, deshalb funktionieren hunderte remark- und rehype-Plugins unverändert.

## Stärken und Schwächen

- **Stark:** Prosa bleibt lesbar, Komponenten wo nötig, `components`-Mapping macht Markdown themenfähig, offene AST-Pipeline mit riesigem Plugin-Ökosystem, unabhängig von React.
- **Schwach:** strenger als Markdown (`<` und `{` müssen escaped werden, HTML-Kommentare und eingerückte Code-Blöcke gehen nicht), Fehlermeldungen für Autoren ohne JavaScript-Kenntnis verwirrend, der Compiler ist schwer für den Browser, ein Inhalt mit Code ist ein Sicherheitsthema. Nicht-Entwickler stolpern regelmäßig.

## Für rat, aufbau und zugriff

- **`withSource` ist dieselbe Idee, andersherum.** aufbaus `write-text` und andere `withSource`-Elemente behalten Markdown als Quelle in den Kindern und rendern daneben. MDX compiliert die Quelle zu Code. aufbaus Weg ist sicherer und braucht keinen Build; ein `components`-Mapping (Markdown-Element → Custom Element) wäre dort eine billige, nützliche Erweiterung: ein Codeblock wird zu `<write-code>`, eine Tabelle zu `<data-table>`.
- **Eine `.rat.md`?** Markdown mit rat-Komponenten und `{…}`-Holes. Mit rats Compiler wäre das ein kleiner Schritt: Markdown zu Markup, dann der normale `.rat`-Pfad. Für die Playground-Doku in `rat/demos` direkt nutzbar.
- **Die Pipeline als Vorbild für rats Compiler-Plugins:** feste, dokumentierte Zwischenstufen (Markup-AST, Script-AST, Ausgabe), an jeder Stufe Plugins. Das ist der Weg, wie MDX sein Ökosystem bekommen hat, ohne selbst Features zu bauen.
- **Fehler mit Zeile und Spalte in eingebetteten Ausdrücken** (acorn an der richtigen Stelle starten) ist dasselbe, was rats Compiler für `{…}` braucht.
