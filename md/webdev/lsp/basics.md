# LSP: Grundlagen

Übersicht: [README.md](README.md)

## Das Problem: M × N

Vor LSP brauchte jede Kombination aus Editor und Sprache eine eigene Integration. Fünf Editoren und zehn Sprachen hießen fünfzig Plugins, jedes mit eigenem Parser, eigener Typprüfung, eigenen Bugs. Die gute Unterstützung gab es nur in der IDE, die zur Sprache gehörte (Java in Eclipse, C# in Visual Studio).

LSP dreht das um: Jede Sprache baut **einen** Server, jeder Editor baut **einen** Client. Aus M × N werden M + N.

```
vorher                         nachher

VS Code ── TS-Plugin           VS Code ──┐               ┌── TS-Server
VS Code ── Go-Plugin           Zed     ──┤               ├── Go-Server (gopls)
Vim     ── TS-Plugin           Neovim  ──┼──── LSP ──────┼── Rust (rust-analyzer)
Vim     ── Go-Plugin           Helix   ──┤               ├── CSS-Server
…                              Monaco  ──┘               └── rat-Server
```

Microsoft hat LSP 2016 zusammen mit VS Code veröffentlicht, entstanden aus der Arbeit am TypeScript-Server und an OmniSharp (C#). Die Spezifikation liegt offen auf `microsoft.github.io/language-server-protocol`. Die veröffentlichte Version ist 3.17, an 3.18 wird gearbeitet. Neue Versionen fügen Features hinzu; alles ist über Capabilities verhandelt, deshalb funktionieren alte Clients mit neuen Servern und umgekehrt.

## Architektur

```
┌──────────── Editor (Client) ───────────┐          ┌──────── Language Server ────────┐
│ Puffer, Cursor, UI                      │  stdio   │ Kopie der offenen Dokumente      │
│ LSP-Client: übersetzt UI ⇄ Nachrichten  │ ◄──────► │ Parser, Analyse, Index           │
│ zeigt Fehler, Menüs, Tooltips an        │  JSON-RPC│ antwortet, meldet Diagnostics    │
└─────────────────────────────────────────┘          └──────────────────────────────────┘
```

- Der Server ist ein **eigener Prozess**. Er darf in jeder Sprache geschrieben sein (gopls in Go, rust-analyzer in Rust, der TypeScript-Server in TypeScript) und kann abstürzen, ohne den Editor mitzunehmen.
- Der Server kennt **kein UI**. Er sagt „an dieser Range ist ein Fehler“, der Editor entscheidet, ob er ihn unterkringelt, in eine Liste schreibt oder in die Statusleiste.
- Der Server sieht den **ungespeicherten** Inhalt. Der Editor schickt jede Änderung, der Server liest offene Dateien nie von der Platte.
- Der Server ist **zustandsbehaftet**. Er hält Dokumente, Indizes, Caches, solange die Sitzung läuft. Das ist der Unterschied zu einem Compiler-Aufruf pro Datei.

## Die Nachrichten: JSON-RPC 2.0

Jede Nachricht ist ein JSON-Objekt nach JSON-RPC 2.0. Es gibt drei Arten:

```jsonc
// request: hat id und method, verlangt eine antwort
{ "jsonrpc": "2.0", "id": 7, "method": "textDocument/hover",
  "params": { "textDocument": { "uri": "file:///app/counter.rat" }, "position": { "line": 9, "character": 14 } } }

// response: dieselbe id, entweder result oder error
{ "jsonrpc": "2.0", "id": 7, "result": { "contents": { "kind": "markdown", "value": "`$count`: signal<number>" } } }

// notification: keine id, keine antwort
{ "jsonrpc": "2.0", "method": "textDocument/didChange", "params": { … } }
```

Beide Seiten dürfen Requests schicken. Meist fragt der Editor, aber der Server kann zum Beispiel `workspace/configuration` (Einstellungen lesen) oder `workspace/applyEdit` (Änderungen anwenden lassen) anfragen.

### Rahmung (Base Protocol)

Weil ein Datenstrom keine Nachrichtengrenzen kennt, steht vor jedem JSON ein Header, getrennt durch eine Leerzeile:

```
Content-Length: 52\r\n
\r\n
{"jsonrpc":"2.0","method":"initialized","params":{}}
```

`Content-Length` zählt **Bytes** des UTF-8-kodierten Inhalts, nicht Zeichen. Ein optionaler `Content-Type`-Header ist erlaubt und wird praktisch nie gesendet. Mehr ist das Base Protocol nicht; Bibliotheken übernehmen es vollständig.

### Transport

| Transport | wie | wann |
|---|---|---|
| stdio | der Editor startet den Server als Kindprozess, Nachrichten über stdin/stdout | Standard, von allen Editoren unterstützt. Konsequenz: Der Server darf **nie** etwas anderes nach stdout schreiben. Logs gehen nach stderr oder über `window/logMessage` |
| Socket / Pipe | TCP-Port oder Named Pipe | Server, der mehrere Editoren bedient, oder Debugging |
| Node-IPC | Node-eigener Kanal zwischen Prozessen | VS Code mit einem Server in Node |
| `postMessage` | Server in einem Web Worker | Editoren im Browser (Monaco, CodeMirror), siehe [ecosystem.md](ecosystem.md) |

Das Protokoll über dem Transport ist immer dasselbe. Ein Server, der stdio und Worker unterstützt, braucht nur zwei kleine Adapter.

## Lebenszyklus

```
Client                                   Server
  │ ── initialize (request) ───────────────► │  wer bin ich, was kann ich
  │ ◄────────────────── result: capabilities │  was kann der server
  │ ── initialized (notification) ─────────► │  ab jetzt darf alles fließen
  │                                          │
  │ ── textDocument/didOpen ───────────────► │
  │ ── textDocument/didChange ─────────────► │
  │ ◄─────────── textDocument/publishDiagnostics
  │ ── textDocument/completion ────────────► │
  │ ◄──────────────────────────────── result │
  │            …                             │
  │ ── shutdown (request) ─────────────────► │  aufräumen, keine neuen requests
  │ ◄──────────────────────────── result null│
  │ ── exit (notification) ────────────────► │  prozess beenden
```

### `initialize`

Der erste Request. Bis zur Antwort darf der Server nichts anderes verarbeiten (er antwortet sonst mit Fehler `-32002 ServerNotInitialized`).

Der Client schickt unter anderem:

| Feld | Bedeutung |
|---|---|
| `processId` | die PID des Editors; stirbt der, beendet sich der Server |
| `clientInfo` | Name und Version des Editors |
| `workspaceFolders` (früher `rootUri`) | die geöffneten Projektordner |
| `capabilities` | was der Client kann, fein aufgeschlüsselt: versteht er Markdown in Hovers? Snippets in Completions? Pull-Diagnostics? Welche Positions-Kodierung? |
| `initializationOptions` | frei, für den Server bestimmt (z.B. Pfad zu einer Konfiguration) |

Der Server antwortet mit seinen `capabilities`:

```jsonc
{
  "capabilities": {
    "textDocumentSync": 2,                                  // inkrementell
    "hoverProvider": true,
    "completionProvider": { "triggerCharacters": ["$", "@", "<", "."] },
    "definitionProvider": true,
    "documentSymbolProvider": true,
    "semanticTokensProvider": { "legend": { "tokenTypes": ["variable"], "tokenModifiers": ["reactive"] }, "full": true }
  },
  "serverInfo": { "name": "rat-language-server", "version": "0.1.0" }
}
```

Was nicht angekündigt ist, fragt der Editor nicht. Ein Server fängt also klein an und wächst Capability für Capability.

### Dynamische Registrierung

Manche Capabilities meldet der Server erst später an (`client/registerCapability`), zum Beispiel einen Datei-Watcher für `**/*.rat`, sobald er das Projekt kennt. Der Client muss dafür im `initialize` `dynamicRegistration: true` gemeldet haben.

### Ende

`shutdown` ist ein Request (der Server antwortet, wenn er aufgeräumt hat), `exit` eine Notification (jetzt beenden). Ein `exit` ohne vorheriges `shutdown` endet mit Exit-Code 1.

## Dokument-Synchronisation

Der Server muss jederzeit wissen, was im Puffer des Editors steht.

| Notification | Inhalt |
|---|---|
| `textDocument/didOpen` | URI, `languageId` (z.B. `"rat"`), `version` (eine Zahl), der volle Text. Ab jetzt gehört das Dokument dem Editor, der Server liest es nicht mehr von der Platte |
| `textDocument/didChange` | neue `version` und die Änderungen |
| `textDocument/didSave` | optional, auf Wunsch mit Text |
| `textDocument/didClose` | der Editor gibt das Dokument frei, die Wahrheit liegt wieder auf der Platte |
| `textDocument/willSave`, `willSaveWaitUntil` | vor dem Speichern, `willSaveWaitUntil` darf noch Edits liefern (Formatieren beim Speichern) |

Der Server wählt in `textDocumentSync`, wie Änderungen kommen:

| Wert | Name | `didChange` enthält |
|---|---|---|
| 0 | None | nichts, der Server will keine Synchronisation |
| 1 | Full | jedes Mal den ganzen Text |
| 2 | Incremental | nur die geänderten Ranges: `{ range, text }`, in Reihenfolge anzuwenden |

Full ist einfacher und für Dateien von einigen hundert Zeilen völlig ausreichend. Incremental spart bei großen Dateien Bandbreite und erlaubt inkrementelles Parsen. Die `version` steigt mit jeder Änderung; der Server schickt sie bei Diagnostics mit, damit der Editor veraltete Ergebnisse verwerfen kann.

## Positionen

```ts
interface Position { line: number; character: number }   // beide ab 0
interface Range    { start: Position; end: Position }    // end exklusiv
interface Location { uri: string; range: Range }
```

Die Falle ist `character`. Es zählt standardmäßig **UTF-16-Code-Units**, weil VS Code und JavaScript intern so zählen. Ein Emoji wie 🐀 ist ein Zeichen, aber zwei UTF-16-Einheiten und vier UTF-8-Bytes. Ein Server in Rust oder Go, der Bytes zählt, muss umrechnen, sonst sitzen Markierungen hinter jedem Emoji oder Umlaut falsch.

Seit 3.17 wird die Kodierung verhandelt: Der Client nennt in `general.positionEncodings` die, die er kann (`utf-8`, `utf-16`, `utf-32`), der Server wählt eine und meldet sie als `positionEncoding`. Ohne Verhandlung gilt UTF-16.

Für einen Server in JavaScript ist UTF-16 bequem: `string.length` und `string.slice()` zählen genauso. Zeilenumbrüche sind `\n`, `\r\n` und `\r`; ein Server sollte alle drei als Zeilenende behandeln.

Typische Umrechnung von einem Offset (wie ihn Parser liefern) in eine Position:

```js
function positionAt (text, offset) {
  let line = 0, start = 0;
  for (let index = 0; index < offset; index++) {
    if (text[index] === '\n') { line++; start = index + 1; }
  }
  return { character: offset - start, line };
}
```

In der Praxis nimmt man `vscode-languageserver-textdocument`, das eine Zeilentabelle hält und inkrementelle Änderungen anwendet.

## Abbruch, Fortschritt, Fehler

### Abbruch

Tippt man weiter, ist die letzte Completion-Anfrage veraltet. Der Client schickt `$/cancelRequest` mit der `id`. Der Server bricht ab, wenn er kann, und antwortet trotzdem: mit Fehler `-32800 RequestCancelled` oder mit einem Teilergebnis. Wichtig für Server, deren Antworten teuer sind: zwischen Arbeitsschritten auf den Abbruch prüfen.

`-32801 ContentModified` heißt: Das Dokument hat sich während der Berechnung geändert, das Ergebnis taugt nichts mehr.

### Fortschritt

Lange Arbeiten (Projekt indizieren) zeigt der Server über Work-Done-Progress an: `window/workDoneProgress/create` mit einem Token, dann `$/progress` mit `begin`, `report` (Prozent, Text) und `end`. Der Editor zeigt das in der Statusleiste. Partial Results gehen auf demselben Weg: Eine lange Referenzsuche kann Treffer in Teilen liefern.

### Meldungen

| Methode | Zweck |
|---|---|
| `window/logMessage` | ins Log des Editors (Ausgabe-Panel) |
| `window/showMessage` | Hinweis im UI |
| `window/showMessageRequest` | Hinweis mit Knöpfen, Antwort ist die Wahl |
| `window/showDocument` | eine Datei oder URL öffnen lassen |
| `telemetry/event` | Telemetrie, falls der Client sie will |

### Fehlercodes

| Code | Name | Bedeutung |
|---|---|---|
| -32700 | ParseError | kein gültiges JSON |
| -32600 | InvalidRequest | kein gültiger Request |
| -32601 | MethodNotFound | Methode unbekannt. Für `$/…`-Requests ist das erlaubt, Notifications mit `$/` werden einfach ignoriert |
| -32602 | InvalidParams | Parameter falsch |
| -32603 | InternalError | Fehler im Server |
| -32002 | ServerNotInitialized | Request vor `initialize` |
| -32800 | RequestCancelled | abgebrochen |
| -32801 | ContentModified | Dokument hat sich geändert |
| -32803 | RequestFailed | gültig, aber gescheitert (z.B. Rename an einer unmöglichen Stelle) |

## Konfiguration und Workspace

- `workspace/configuration`: Der Server fragt Einstellungen ab (`{ section: "rat" }`), der Editor liest sie aus seinen Settings.
- `workspace/didChangeConfiguration`: Einstellungen haben sich geändert.
- `workspace/didChangeWatchedFiles`: Dateien, die der Editor nicht offen hat, haben sich auf der Platte geändert (z.B. eine importierte Komponente, `custom-elements.json`). Den Watcher meldet der Server per dynamischer Registrierung an, der Editor beobachtet.
- `workspace/didChangeWorkspaceFolders`: Ordner hinzugefügt oder entfernt.
- `workspace/willRenameFiles`, `didRenameFiles` und Verwandte: Datei-Operationen, damit ein Server beim Umbenennen von `card.rat` die Imports anpassen kann.

## Was LSP nicht ist

- **Kein Syntax-Highlighting.** Farben kommen aus einer Grammatik im Editor (TextMate, tree-sitter), die sofort und ohne Server greift. LSP kann sie mit Semantic Tokens ergänzen, siehe [features.md](features.md) und [ecosystem.md](ecosystem.md).
- **Kein Debugger.** Dafür gibt es DAP, das Debug Adapter Protocol, nach demselben Muster.
- **Kein Build-System.** Der Server analysiert, er erzeugt keine Artefakte.
- **Keine Pflicht für alles.** Ein Server, der nur Diagnostics kann, ist ein gültiger Server.

Weiter: [features.md](features.md)
