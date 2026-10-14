# LSP: Ökosystem

Übersicht: [README.md](README.md) · Features: [features.md](features.md)

## Highlighting und LSP: zwei Schichten

| Schicht | Werkzeug | wo es läuft | weiß | Tempo |
|---|---|---|---|---|
| Grammatik | TextMate (Regex-Zustände), tree-sitter (echter Parser), Monarch, CodeMirror-Modi | im Editor, synchron | wie der Text **aussieht**: das ist ein String, ein Tag, ein Keyword | sofort, bei jedem Tastendruck |
| Language Server | LSP | eigener Prozess, asynchron | was der Text **bedeutet**: diese Variable ist ein Signal, dieser Aufruf hat den falschen Typ, diese Komponente gibt es nicht | Millisekunden bis Sekunden |

Die Grammatik färbt, faltet und rückt ein, ohne dass ein Server läuft. Der Server liefert alles, wofür man das ganze Programm verstehen muss. Semantic Tokens sind die Brücke: Der Server überschreibt Farben dort, wo die Bedeutung von der Form abweicht.

Für rat heißt das: `@rat/syntax` (TextMate, tree-sitter, hljs, Monarch, CodeMirror aus einer Spec) bleibt die erste Schicht. Ein Language Server wäre die zweite, er ersetzt nichts davon.

tree-sitter liefert neben Farben auch Struktur (Einrückung, Klammerpaare, Textobjekte, Outline in Zed). Einiges, was LSP auch kann (Folding, Document Symbols), lösen Zed, Neovim und Helix deshalb schon über tree-sitter-Queries, ganz ohne Server.

## Wie Editoren Server einbinden

### VS Code

Eine Extension mit zwei Teilen: dem Client (läuft im Extension Host, nutzt `vscode-languageclient`) und dem Server (eigener Prozess). Highlighting kommt aus einer TextMate-Grammatik in der Extension.

```js
// extension.js (client)
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

function activate (context) {
  const server = { module: context.asAbsolutePath('server.js'), transport: TransportKind.ipc };
  client = new LanguageClient('rat', 'rat language server', { debug: server, run: server }, {
    documentSelector: [{ language: 'rat', scheme: 'file' }, { language: 'ratjs', scheme: 'file' }],
  });
  client.start();
}

const deactivate = () => client?.stop();

module.exports = { activate, deactivate };
```

In `package.json` der Extension stehen `contributes.languages` (Endungen, Kommentarzeichen), `contributes.grammars` (die TextMate-Datei aus `@rat/syntax/textmate/`) und `activationEvents`.

### Zed

Zed spricht LSP von Haus aus. Eine Extension meldet den Server in `extension.toml` an und sagt in Rust (kompiliert zu WebAssembly), wie er gestartet wird:

```toml
# extension.toml
[language_servers.rat-language-server]
name      = "rat language server"
languages = ["RAT", "RAT JS"]
```

```rust
// src/lib.rs
use zed_extension_api::{self as zed, LanguageServerId, Result};

struct Rat;

impl zed::Extension for Rat {
    fn new () -> Self { Rat }

    fn language_server_command (&mut self, _id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        let node = worktree.which("node").ok_or("node not found")?;
        Ok(zed::Command { command: node, args: vec!["/path/to/server.js".into(), "--stdio".into()], env: vec![] })
    }
}

zed::register_extension!(Rat);
```

Der Rust-Teil ist nur der Starter. Üblich ist, den Server als npm-Paket zu veröffentlichen und ihn von der Extension per `zed::npm_install_package` installieren zu lassen. Das Highlighting kommt weiterhin aus der tree-sitter-Grammatik (`packages/syntax/zed`).

### Neovim (ab 0.11)

Eingebauter Client, Konfiguration in Lua:

```lua
vim.filetype.add({ extension = { rat = 'rat' }, pattern = { ['.*%.rat%.js'] = 'ratjs' } })

vim.lsp.config('rat', {
  cmd          = { 'rat-language-server', '--stdio' },
  filetypes    = { 'rat', 'ratjs' },
  root_markers = { 'package.json', 'deno.json', '.git' },
})

vim.lsp.enable('rat')
```

Ältere Konfigurationen nutzen `nvim-lspconfig`, das für viele Server fertige Einträge mitbringt.

### Helix

```toml
# languages.toml
[language-server.rat]
command = "rat-language-server"
args    = ["--stdio"]

[[language]]
name             = "rat"
scope            = "source.rat"
file-types       = ["rat"]
language-servers = ["rat"]
```

Helix hat keinen Plugin-Mechanismus für Server, nur diese Konfiguration. Highlighting kommt aus einer tree-sitter-Grammatik plus Queries.

### Sublime, Emacs, JetBrains

- Sublime: Paket `LSP`, Server per Settings-Eintrag.
- Emacs: `eglot` (eingebaut) oder `lsp-mode`.
- JetBrains: eigene Analyse-Engine, LSP-Unterstützung für Plugins seit 2023 (in den bezahlten IDEs vollständig).

### Im Browser: Monaco und CodeMirror

Ein Server kann auch in einem **Web Worker** laufen. Transport ist dann `postMessage` statt stdio.

| Editor | Client | Server |
|---|---|---|
| Monaco | `monaco-languageclient` (TypeFox) | Worker mit `vscode-languageserver/browser` (`BrowserMessageReader`, `BrowserMessageWriter`) |
| CodeMirror 6 | `@codemirror/lsp-client` | ebenso ein Worker oder ein WebSocket zu einem Server-Prozess |

Für rat ist das interessant, weil der Compiler ohnehin im Browser läuft: Der Playground (`demos/playground`) oder `zugriff/code` könnten denselben Server im Worker nutzen, den VS Code als Prozess startet. Monaco bringt für JS/TS und CSS eigene Worker mit, die man für eingebettete Teile wiederverwenden kann.

Acode (CodeMirror-basiert, mobil) hat keine allgemeine LSP-Anbindung für Plugins. Dort bleibt es bei der Grammatik.

## Bibliotheken für Server

| Sprache | Bibliothek | Anmerkung |
|---|---|---|
| JavaScript / TypeScript | `vscode-languageserver` + `vscode-languageserver-textdocument` | die Referenzimplementierung von Microsoft, läuft in Node und (Subpfad `/browser`) im Worker |
| JavaScript / TypeScript | Volar (`@volar/language-server`) | Framework für eingebettete Sprachen, siehe unten |
| Rust | `tower-lsp`, `lsp-server` (aus rust-analyzer) | |
| Python | `pygls` | |
| Go | `go.lsp.dev/protocol`, gopls-Interna | |

Fertige Sprachdienste, die man in eigene Server einbaut, statt sie nachzubauen:

| Paket | liefert |
|---|---|
| `typescript` (Language Service API) | Completion, Hover, Definition, Fehler für JS und TS, auch für reines JS mit JSDoc und `.d.ts`-Dateien |
| `vscode-css-languageservice` | dasselbe für CSS, SCSS, Less |
| `vscode-html-languageservice` | dasselbe für HTML, erweiterbar mit Custom Data (eigene Tags und Attribute) |

## Eingebettete Sprachen

Die meisten Web-Formate mischen Sprachen: Vue, Svelte, Astro, MDX, und eben `.rat` (Markup, JS in `<script>` und in `{…}`, CSS in `<style>`). Zwei Ansätze:

### 1. Weiterreichen pro Region

Der Server findet heraus, in welcher Region der Cursor steht, schneidet sie aus und fragt den passenden Sprachdienst (CSS-Service für `<style>`). Die Positionen rechnet er hin und zurück. Für CSS reicht das, weil eine `<style>`-Region für sich allein gültiges CSS ist.

### 2. Virtuelle Dokumente

Für JavaScript reicht Ausschneiden nicht. `{$count * 2}` im Markup braucht die Deklaration aus `<script>`, die Imports, und rat-Zucker (`$count` heißt eigentlich `$count.value`) muss übersetzt werden. Also erzeugt der Server aus der Datei ein **virtuelles JS-Dokument**, in dem alles beisammen ist, und eine **Zuordnung** (Mapping) zwischen Positionen in beiden:

```
counter.rat                                  counter.rat.virtual.js
───────────                                  ──────────────────────
<script>                                     let $count = signal(0);
  let $count = 0;          ── mapping ──►    const inc = () => $count.value++;
  const inc = () => $count++;                 (() => $count.value);
</script>                                     (() => $count.value * 2);
<p>{$count} × 2 = {$count * 2}</p>
```

Fragt der Editor nach Completion an `{$cou|`, rechnet der Server die Position ins virtuelle Dokument um, fragt den TypeScript Language Service und rechnet die Ergebnisse zurück. Was keine Entsprechung hat (eingefügte `.value`), wird übersprungen.

**Volar** ist genau dafür gebaut. Es nimmt eine Funktion „Datei → virtuelle Dokumente + Mappings“ und erledigt den Rest: TypeScript einbinden, Positionen umrechnen, Ergebnisse mischen, CSS und HTML über ihre Services. Vue (`vue-language-tools`), Astro und MDX nutzen es. Für rat ist es der naheliegende Unterbau, siehe [rat.md](rat.md).

### 3. TypeScript-Plugin

Für Sprachen, die in **JavaScript** eingebettet sind (Tagged Templates wie ``html`…` ``, CSS-in-JS), gibt es den umgekehrten Weg: ein Plugin für den TypeScript-Server (`tsserver`). Es läuft in jedem Editor, der TypeScript über LSP anbindet, ohne eigenen Server. `ts-lit-plugin` (lit-analyzer) macht das für Lit-Templates. Für htx ist das der passende Weg, siehe [htx.md](htx.md).

## Verwandte Protokolle

| Protokoll | wofür | Verhältnis zu LSP |
|---|---|---|
| DAP, Debug Adapter Protocol | Debugger: Breakpoints, Schritte, Variablen | gleiche Idee (ein Adapter pro Sprache, ein Client pro Editor), ähnliche Nachrichten, eigener Standard |
| LSIF, Language Server Index Format | vorberechnete LSP-Antworten als Datei, für Code-Browser ohne laufenden Server (GitHub, Sourcegraph) | Ergebnisse von Definition/References/Hover als Graph |
| SCIP | Nachfolger von LSIF bei Sourcegraph, Protobuf statt JSON | wie LSIF |
| BSP, Build Server Protocol | Build-Werkzeuge (Scala, Bazel) mit Editoren verbinden | nach LSP-Vorbild |
| MCP, Model Context Protocol | KI-Modelle mit Werkzeugen und Daten verbinden | bewusst nach LSP-Vorbild: JSON-RPC 2.0, `initialize` mit Capabilities, stdio als Standard-Transport |

## Grenzen von LSP

- **Ein Server pro Sprache, mehrere pro Datei sind möglich, aber nicht abgestimmt.** Laufen ein TS-Server und ein Linter-Server auf derselben Datei, kennt keiner die Ergebnisse des anderen. Der Editor mischt nur.
- **Kein gemeinsames Datenmodell.** Jeder Server parst selbst; zwei Server für dieselbe Datei parsen sie zweimal.
- **Kleinster gemeinsamer Nenner.** Was ein Editor nicht darstellen kann, fehlt dort. Viele Server bauen deshalb Eigenerweiterungen, die nur ihre eigene VS-Code-Extension versteht.
- **Latenz.** Jede Antwort geht durch Serialisierung und einen Prozesswechsel. Für Completion und Hover unkritisch, für Highlighting der Grund, warum es bei Grammatiken bleibt.

Weiter: [rat.md](rat.md)
