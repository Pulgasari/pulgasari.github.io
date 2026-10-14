# LSP: Language Server Protocol

Das **Language Server Protocol** legt fest, wie ein Editor und ein Programm, das eine Sprache versteht, miteinander reden. Der Editor schickt „diese Datei wurde geöffnet, hier hat sich etwas geändert, was steht an Zeile 12, Zeichen 8?“. Der Server antwortet mit Fehlern, Vervollständigungen, Sprungzielen, Umbenennungen.

Es ist ein Protokoll im Sinne von [../protocols.md](../protocols.md): kein Code, sondern eine Absprache. Wer sie einhält, funktioniert mit jedem Editor, der sie ebenfalls einhält.

## Die Dateien

| Datei | Inhalt |
|---|---|
| [basics.md](basics.md) | das Problem, das LSP löst; Architektur; JSON-RPC und Transport; Lebenszyklus; Dokument-Synchronisation; Positionen; Abbruch, Fortschritt, Fehler |
| [features.md](features.md) | was ein Server alles kann, von Diagnostics bis Inlay Hints, mit den Methodennamen und was der Editor daraus macht |
| [ecosystem.md](ecosystem.md) | Abgrenzung zu Syntax-Highlighting (TextMate, tree-sitter); wie VS Code, Zed, Neovim, Helix, Monaco und CodeMirror Server einbinden; Bibliotheken; eingebettete Sprachen (Volar); verwandte Protokolle (DAP, LSIF, MCP) |
| [rat.md](rat.md) | ein Language Server für `.rat` und `.rat.js`: was der Compiler schon liefert, Ausbaustufen, eingebettetes JS über ein virtuelles Dokument, Einbindung in die Editoren, ein Minimal-Server |
| [htx.md](htx.md) | htx in normalem JavaScript: warum hier ein TypeScript-Plugin besser passt als ein eigener Server, was es prüfen und vervollständigen kann, Custom Elements Manifest von aufbau |

## In einem Satz pro Begriff

| Begriff | Bedeutung |
|---|---|
| Client | der Editor bzw. seine LSP-Anbindung |
| Server | ein eigener Prozess (oder Worker), der die Sprache versteht |
| Capability | was eine Seite kann; beide nennen ihre beim Start, nur die Schnittmenge wird benutzt |
| Request | Nachricht mit `id`, auf die genau eine Antwort kommt |
| Notification | Nachricht ohne `id`, keine Antwort |
| `textDocument/*` | Methoden, die ein einzelnes Dokument betreffen |
| `workspace/*` | Methoden, die das Projekt betreffen |
| `window/*` | Meldungen, Fortschritt, Dialoge im Editor |
| `$/*` | Protokoll-interne Nachrichten (Abbruch, Fortschritt), dürfen ignoriert werden |
| URI | wie Dokumente benannt werden: `file:///home/me/app/counter.rat` |
| Position | `{ line, character }`, beide ab 0, `character` standardmäßig in UTF-16-Einheiten |
| Range | `{ start, end }`, zwei Positionen, `end` exklusiv |

## Die Kurzfassung

1. Der Editor startet den Server (meist als Kindprozess, Kommunikation über stdin/stdout).
2. `initialize`: Beide tauschen ihre Capabilities aus.
3. Der Editor meldet geöffnete Dateien (`didOpen`) und jede Änderung (`didChange`). Der Server hält also eine Kopie des ungespeicherten Inhalts.
4. Der Server schickt von sich aus Fehler (`publishDiagnostics`).
5. Für alles andere fragt der Editor: Hover, Completion, Definition, Rename, Formatierung.
6. `shutdown`, `exit`.

Für rat bedeutet das: Der Compiler, der schon Fehler mit Zeile und Spalte wirft, ist der Kern eines Servers. Der Rest ist Verpackung und, für JS in den Holes, eine Brücke zu TypeScript. Siehe [rat.md](rat.md).
