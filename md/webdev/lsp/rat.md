# LSP für rat

Übersicht: [README.md](README.md) · Einbindung in Editoren: [ecosystem.md](ecosystem.md)

Ein Language Server für `.rat` und `.rat.js`: was es schon gibt, was fehlt, in welcher Reihenfolge man ihn baut.

## Ausgangslage

| vorhanden | wo | für den Server |
|---|---|---|
| Grammatiken für sechs Editoren | `packages/syntax` | erste Schicht: Farben, Klammern, Einrückung. Bleibt, wie sie ist |
| ein Compiler, der im Browser, in Node, Deno und Bun läuft | `packages/compiler` | der Kern: Parser, AST, Fehler |
| `CompileError` mit `index`, `line`, `column`, `reason` | `compiler/util.js` | ist schon fast eine Diagnostic |
| die Liste der Signale (`names` im Ergebnis von `compile()`) | `compiler/script.js` | Hover, Completion, Semantic Tokens für `$x` |
| Script-Umbau nur durch **Einfügungen** (`.value`, `$$.signal(`) | `compiler/script.js` | Positionen lassen sich exakt zurückrechnen. `.md/compiler.md` nennt das schon als Grundlage für Source Maps |
| Typen der Runtime | `runtime/index.d.ts` | TypeScript versteht damit, was `$$.signal(0)` ist |
| Custom Elements Manifest aller aufbau-Elemente | `@aufbau/elements/manifest.js` (`manifestAll()`) | Tags, Attribute, Events, Slots für Completion und Hover |

Was fehlt:

1. **Fehlertoleranz.** `parse()` wirft beim ersten Fehler. Ein Server will alle Fehler und trotzdem einen AST für den Rest der Datei (für Hover, Symbole, Completion an einer kaputten Stelle).
2. **End-Positionen.** Knoten haben `start`, aber kein `end`; Textknoten haben gar keine Position. Für Ranges braucht jeder Knoten beides.
3. **Source Map aus `generate()`.** Der Generator weiß, an welche Stelle der Ausgabe er welches `{…}` schreibt, merkt es sich aber nicht.

## Architektur

```
┌──────────── @rat/language-server ────────────┐
│ connection   stdio (node/deno/bun) | worker   │
│ documents    offene .rat / .rat.js            │
│                                               │
│ rat          parse → ast, fehler, symbole,    │──► @rat/compiler
│              blöcke, $signale, attribute      │
│ js           virtuelles dokument + mapping    │──► typescript (language service)
│              → completion, hover, definition  │       + @rat/runtime/index.d.ts
│ css          <style>-regionen                 │──► vscode-css-languageservice
│ elements     tags, attribute, events          │──► custom-elements.json
└───────────────────────────────────────────────┘
```

Ein Prozess, vier Quellen für Antworten. Für eine Anfrage an einer Position entscheidet der Server zuerst, wo sie liegt (Markup, Hole, `<script>`, `<style>`), und fragt dann die zuständige Quelle.

Volar ([ecosystem.md](ecosystem.md#2-virtuelle-dokumente)) übernimmt davon den Teil mit TypeScript und CSS samt Positionsumrechnung. rat liefert nur die Funktion „Datei → virtuelle Dokumente + Mappings“, dazu die rat-eigenen Features.

## Stufe 1: Diagnostics aus dem Compiler

Damit fängt man an, und es ist wenig Code.

```js
// server.js
import { DiagnosticSeverity, ProposedFeatures, TextDocumentSyncKind, TextDocuments, createConnection } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { compileAsync } from '@rat/compiler';

const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments(TextDocument);
const timers     = new Map;

connection.onInitialize(() => ({
  capabilities: { textDocumentSync: TextDocumentSyncKind.Incremental },
  serverInfo  : { name: 'rat-language-server', version: '0.1.0' },
}));

// a compile error marks the word it points at, or one character
function rangeOf (document, index) {
  const text = document.getText();
  let end = index;
  while (end < text.length && /[\w$@:.-]/.test(text[end])) end++;
  return { end: document.positionAt(Math.max(end, index + 1)), start: document.positionAt(index) };
}

async function validate (document) {
  const diagnostics = [];
  try {
    await compileAsync(document.getText(), { filename: document.uri.split('/').pop() });
  } catch (error) {
    if (!('index' in error)) throw error;
    diagnostics.push({ message: error.reason, range: rangeOf(document, error.index), severity: DiagnosticSeverity.Error, source: 'rat' });
  }
  connection.sendDiagnostics({ diagnostics, uri: document.uri, version: document.version });
}

// typing fast should not compile on every key
documents.onDidChangeContent(({ document }) => {
  clearTimeout(timers.get(document.uri));
  timers.set(document.uri, setTimeout(() => validate(document), 150));
});

documents.onDidClose(({ document }) => connection.sendDiagnostics({ diagnostics: [], uri: document.uri }));

documents.listen(connection);
connection.listen();
```

Einige Details:

- **Zeilen und Spalten.** `CompileError` zählt beide ab 1, LSP ab 0. Mit `error.index` und `positionAt()` stellt sich die Frage gar nicht. Weil JavaScript-Strings in UTF-16 zählen wie LSP, passen die Offsets ohne Umrechnung.
- **Dateiname.** Der Dateiname entscheidet zwischen `.rat` und `.rat.js` (`compile()` liest die Endung), deshalb wird er mitgegeben.
- **Style-Sprachen.** `compileAsync()` statt `compile()`, damit `<style lang="scss">` die Präprozessoren lädt statt einen Fehler zu werfen.
- **Einbindung.** Mit diesen 40 Zeilen zeigt jeder Editor aus [ecosystem.md](ecosystem.md) rat-Fehler beim Tippen.

Mit einem fehlertoleranten Parser (siehe oben) wird aus dem einen `catch` eine Liste: `parse()` sammelt Fehler in `ast.errors`, statt zu werfen, und überspringt bis zum nächsten sicheren Punkt (nächstes `<`, nächstes `@` am Zeilenanfang, schließende Klammer).

### rat-eigene Prüfungen

Neben Syntaxfehlern kann der Server prüfen, was der Compiler stillschweigend akzeptiert. Die Roadmap in `.md/concept.md` nennt Punkt 3 („warn on unknown `$` names“).

| Prüfung | Schwere | Code Action |
|---|---|---|
| `$name` gelesen, aber nirgends deklariert | Fehler | `let $name = …` anlegen |
| `$name` in einer inneren Funktion von `.rat.js` deklariert (wird dort nicht zum Signal) | Warnung | erklären, nach oben verschieben |
| `bind:value={x}`, aber `x` ist kein Signal | Fehler | |
| `@for` ohne Schlüssel über Objekte, die neu erzeugt werden (Zeilen werden neu gebaut) | Hinweis | |
| unbekanntes Attribut an einem aufbau-Element | Warnung | ähnlichen Namen vorschlagen |
| Behavior `@name`, aber `name` ist im Scope keine Funktion | Fehler | |

## Stufe 2: Struktur

Alles aus dem rat-AST allein, ohne TypeScript.

| Feature | Inhalt |
|---|---|
| Document Symbols | Komponente (Dateiname), Signale und Computeds, Funktionen aus `<script>`, Elemente mit `#id`, Blöcke `@if`/`@for`/`@switch` mit ihrem Kopf als Name |
| Folding | Elemente, Blockkörper aller drei Schreibweisen, `<script>`, `<style>` |
| Selection Range | Name → Attribut → Tag → Element → Block → Elternelement |
| Linked Editing | öffnendes und schließendes Tag gemeinsam, inklusive Selektor (`<div.card>` … `</div.card>`) |
| Semantic Tokens | `$count` als `variable` + Modifier `reactive`, Computeds zusätzlich `readonly`. Das kann die Grammatik nicht, weil sie nicht weiß, ob `$x` deklariert ist |
| Hover auf `$x` | `signal`, `computed` oder `prop`, mit der Deklaration als Code |
| Completion (rat-Syntax) | `@if`, `@for`, `@switch` als Snippets in allen drei Schreibweisen; nach `on:` Event-Namen, nach `[` Tastennamen, nach `]` die Modifier `!`, `:once`; nach `bind:` die bindbaren Properties (`value`, `checked`, `files`, `open`); nach `@` die Funktionen im Scope (Behaviors) |

## Stufe 3: JavaScript über ein virtuelles Dokument

In `{…}`, in `<script>` und in `.rat.js` steht JavaScript mit Zucker. Für Completion an `{$todos.fil|`, für Hover mit Typen und für „Gehe zur Definition“ in importierte Module braucht es TypeScript. TypeScript versteht aber kein rat.

Die Lösung ist die Compiler-Ausgabe selbst. Sie ist gültiges JavaScript, enthält jede Deklaration, jeden Import und jedes Hole als Closure:

```js
// counter.rat, kompiliert (gekürzt)
import * as $$ from '@rat/runtime';

export default function Counter (props, children) {
  let   $count  = $$.signal(0);
  const $double = $$.computed(() => ($count.value * 2));
  return $$.html`<output>${() => $count.value} × 2 = ${() => $double.value}</output>`;
}
```

Gibt man das dem TypeScript Language Service, zusammen mit `@rat/runtime/index.d.ts`, weiß TypeScript: `$count` ist `Signal<number>`, `$count.value` ist `number`, `$todos.value.filter` gibt es. Fehlt nur das Mapping von jeder Stelle der Quelle auf die Stelle in der Ausgabe.

| Umbau | Mapping |
|---|---|
| Script-Zucker und Signale (`script.js`) | nur Einfügungen: jede Quellposition hat eine eindeutige Zielposition, eingefügter Text (`.value`) hat keine Quelle |
| `\|>`, `..`, `#` (Sugar-Pass) | ersetzt Text: pro Ersetzung ein Segment, innen ungefähr. Die Doku nennt das bereits („error positions after a pipe or range are approximate“) |
| Holes und Attribute (`generate.js`) | der Generator kopiert jeden Ausdruck unverändert (bis auf die Einfügungen) an eine neue Stelle: ein Segment pro Ausdruck |

Konkret: `compile()` liefert zusätzlich `map: [{ source, generated, length }]`, gesammelt aus den Edit-Listen von `script.js` und aus `generate()`. Für Volar ist das genau das Format, das es braucht (`CodeMapping`).

Was man dadurch bekommt, ohne es selbst zu bauen:

- Completion für alles in JS: Variablen, Imports, Methoden, Properties von Signal-Werten.
- Hover mit Typen und JSDoc, auch aus importierten `.js`-Dateien und `index.d.ts`.
- Definition, References, Rename über Dateigrenzen hinweg. Umbenennen von `$count` in `.rat` erreicht auch die Holes, weil sie im virtuellen Dokument ganz normale Verwendungen sind.
- Typfehler auf Wunsch (`// @ts-check` oder `checkJs`), sonst nur Syntaxfehler und unbekannte Namen.

Zwei Feinheiten:

- **Hover auf `$count` soll nicht `Signal<number>` anzeigen, wenn im Hole `$count` gemeint ist (der Wert).** Weil die Ausgabe `$count.value` heißt und `.value` eingefügt ist, landet der Hover auf `$count` (das Signal). Der Server kann das abfangen und für Signale stattdessen den Typ von `.value` zeigen.
- **Komponenten-Props.** `props` ist im kompilierten Code untypisiert. Ein `<script>`-Kommentar `/** @type {{ label: string }} */`, ein `props`-Schema aus `@rat/types` oder eine erzeugte `.d.ts` pro Komponente gibt TypeScript die Information. Andersherum kann der Server beim Verwenden `<Card label={…}>` die Props der importierten Komponente vervollständigen, weil TypeScript den Typ von `Card` kennt.

## Stufe 4: CSS und Elemente

**CSS in `<style>`.** Die Region ist für sich gültiges CSS (oder SCSS). Der Server schneidet sie aus und gibt sie an `vscode-css-languageservice`: Completion für Properties und Werte, Hover mit Browser-Unterstützung, Farbwähler, Fehler. Mit dem AST weiß der Server zusätzlich, welche Klassen im Markup vorkommen, und kann sie in Selektoren vorschlagen oder ungenutzte Regeln ausgrauen (`tags: [1]`).

**Elemente.** HTML-Tags und Attribute kommen aus `vscode-html-languageservice` bzw. dessen Daten. Die aufbau-Elemente kommen aus `custom-elements.json`:

```js
import { manifestAll } from '@aufbau/elements/manifest.js';
const manifest = await manifestAll();   // { schemaVersion: '2.0.0', modules: [...] }
```

Daraus pro Tag: Beschreibung, Attribute mit Typen und Werten (`variant: 'primary' | 'ghost'`), Events (für `on:…`), Slots. Das ergibt Completion nach `<`, nach dem Tag-Namen und nach `on:`, Hover mit Doku, Warnungen bei unbekannten Attributen und falschen Werten.

Das Manifest wird einmal erzeugt und als Datei ins Projekt gelegt (oder im Paket mitgeliefert). Der Server beobachtet sie per `workspace/didChangeWatchedFiles`.

## Stufe 5: Umbauen

| Feature | Beispiel |
|---|---|
| Code Action: Schreibweise wechseln | einen `@if`-Block zwischen Klammern, Einrückung und Einzeiler umschreiben (`.md/syntax.md`, drei Formen) |
| Code Action: Komponente extrahieren | markiertes Markup in `card.rat` verschieben, verwendete Signale werden Props |
| Formatting | ein Formatierer auf dem AST: Einrückung, Attribut-Ausrichtung, Blockform beibehalten |
| Code Lens | „im Playground öffnen“ über der Datei, „n Verwendungen“ über Komponenten |
| Inlay Hints | ausgerechnete Werte von Ranges (`1..5` → `[1, 2, 3, 4, 5]`), der Typ von Signalen |

## Paket und Einbindung

```
packages/language-server/
  index.js          die sprachunabhängige logik (dokument → antworten)
  node.js           stdio-einstieg, bin: rat-language-server
  worker.js         web-worker-einstieg für playground und zugriff
  package.json      bin, exports
```

| Editor | was nötig ist |
|---|---|
| VS Code | eine Extension `packages/vscode`: TextMate-Grammatik aus `@rat/syntax/textmate`, `contributes.languages`, Client wie in [ecosystem.md](ecosystem.md#vs-code) |
| Zed | die bestehende Extension `packages/syntax/zed` bekommt `[language_servers.rat-language-server]` in `extension.toml` und eine kleine Rust-Crate (`Cargo.toml`, `src/lib.rs`), die den Server startet. Zed kompiliert sie selbst zu WebAssembly |
| Neovim, Helix | nur Konfiguration, siehe [ecosystem.md](ecosystem.md) |
| Playground, zugriff (Monaco) | `monaco-languageclient` + `worker.js`. Kein Prozess, kein Server-Hosting: alles läuft im Browser, wie der Compiler schon heute |
| Acode | keine LSP-Anbindung, bleibt bei der Grammatik |

## Reihenfolge und Aufwand

| Schritt | Aufwand | Ergebnis |
|---|---|---|
| Server mit Diagnostics aus `compileAsync()` (Stufe 1) | klein | Fehler beim Tippen in jedem LSP-Editor. **Gebaut:** `rat/packages/language-server` |
| VS-Code- und Zed-Anbindung | klein | installierbar. **Gebaut:** `rat/packages/vscode`, Rust-Crate in `rat/packages/syntax/zed` |
| Parser: Fehlertoleranz und End-Positionen | mittel | Voraussetzung für alles Weitere |
| Struktur und rat-Completion (Stufe 2) | mittel | Outline, Folding, Snippets, Signale hervorgehoben |
| Mapping aus dem Compiler, TypeScript über Volar (Stufe 3) | mittel bis groß | volle JS-Unterstützung in Holes und Scripts |
| CSS-Service und Manifest (Stufe 4) | klein bis mittel | Elemente und Styles mit Doku |
| Umbauen (Stufe 5) | je Feature | Komfort |

Die ersten zwei Schritte sind an einem Tag zu haben und decken den größten Nutzen ab. Ab Schritt 3 lohnt sich Volar, weil Positionsumrechnung über mehrere eingebettete Sprachen sonst den größten Teil des Codes ausmacht.

Weiter: [htx.md](htx.md)
