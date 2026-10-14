# LSP: Features

Übersicht: [README.md](README.md) · Grundlagen: [basics.md](basics.md)

Jedes Feature ist eine Methode plus eine Capability. Der Server kündigt an, was er kann, der Editor fragt nur das. Die Beispiele beziehen sich auf rat, wo es passt.

## Diagnostics: Fehler und Warnungen

Das wichtigste Feature und meist das erste, das ein Server kann.

```jsonc
// server -> client, notification
{ "method": "textDocument/publishDiagnostics", "params": {
  "uri": "file:///app/blocks.rat",
  "version": 4,
  "diagnostics": [{
    "range": { "start": { "line": 11, "character": 4 }, "end": { "line": 11, "character": 8 } },
    "severity": 1,                       // 1 error, 2 warning, 3 information, 4 hint
    "source": "rat",
    "code": "block-attribute",
    "message": "@if is a block, not an attribute: write it around the element",
    "tags": [],                          // 1 unnecessary (ausgegraut), 2 deprecated (durchgestrichen)
    "relatedInformation": []             // weitere Orte, z.B. "hier deklariert"
  }]
}}
```

Zwei Modelle:

| Modell | Methode | wer entscheidet |
|---|---|---|
| Push | `textDocument/publishDiagnostics` | der Server schickt, wann er will, immer die vollständige Liste für ein Dokument (eine leere Liste löscht) |
| Pull (seit 3.17) | `textDocument/diagnostic`, `workspace/diagnostic` | der Editor fragt, wenn er Fehler zeigen will (z.B. nur für sichtbare Dateien). Mit `resultId` kann der Server „unverändert“ antworten |

Push ist einfacher und wird überall verstanden. Pull ist effizienter für große Projekte.

## Completion: Vervollständigung

`textDocument/completion` liefert eine Liste von `CompletionItem`:

| Feld | Bedeutung |
|---|---|
| `label` | was in der Liste steht: `$count` |
| `kind` | Symbolart, bestimmt das Icon (Variable 6, Function 3, Keyword 14, Snippet 15, Property 10 …) |
| `detail` | eine Zeile daneben: `signal<number>` |
| `documentation` | Markdown, im Seitenpanel |
| `insertText` / `textEdit` | was eingefügt wird; `textEdit` ersetzt eine bestimmte Range |
| `insertTextFormat` | 2 = Snippet: `@for (${1:item} of ${2:list}) {\n\t$0\n}` mit Tab-Stops |
| `sortText`, `filterText` | Reihenfolge und wonach gefiltert wird |
| `additionalTextEdits` | zusätzliche Änderungen, z.B. einen Import oben einfügen |
| `commitCharacters` | Zeichen, die die Auswahl bestätigen |

`completionProvider.triggerCharacters` sagt, nach welchen Zeichen der Editor von selbst fragt (für rat: `$`, `@`, `<`, `.`, `:`). `completionItem/resolve` erlaubt es, teure Felder (Dokumentation) erst zu laden, wenn ein Eintrag markiert wird. `isIncomplete: true` heißt: Bei weiterem Tippen erneut fragen statt lokal filtern.

## Hover

`textDocument/hover` an einer Position liefert Markdown (oder Klartext) und optional die Range, auf die er sich bezieht. In rat: über `$double` steht `computed: $count * 2`, über `<data-list>` die Beschreibung des Elements aus dem Manifest.

## Signature Help

`textDocument/signatureHelp` zeigt beim Tippen in einem Aufruf die Parameter, der aktive ist hervorgehoben. Auslöser sind meist `(` und `,`.

## Navigation

| Methode | springt zu |
|---|---|
| `textDocument/definition` | der Definition (`$count` → `let $count = 0`) |
| `textDocument/declaration` | der Deklaration, wo sich das von der Definition unterscheidet (C-Header) |
| `textDocument/typeDefinition` | dem Typ der Sache |
| `textDocument/implementation` | Implementierungen eines Interfaces |
| `textDocument/references` | allen Verwendungen |
| `textDocument/documentHighlight` | allen Vorkommen im selben Dokument, zum Hervorheben unter dem Cursor (lesend/schreibend unterschieden) |
| `textDocument/documentLink` | klickbaren Links im Text (Import-Pfade, `src="…"`) |

Antworten sind `Location` oder `LocationLink`. `LocationLink` hat zusätzlich die Range des Ursprungs, damit der Editor genau das Wort unterstreichen kann, auf das man gerade zeigt.

## Symbole

| Methode | liefert |
|---|---|
| `textDocument/documentSymbol` | den Gliederungsbaum einer Datei (Outline, Breadcrumbs, „Gehe zu Symbol“): in rat Komponente, Signale, Funktionen, `@for`/`@if`-Blöcke, Elemente mit `#id` |
| `workspace/symbol` | Symbole im ganzen Projekt per Suchbegriff |
| `callHierarchy/*` | wer ruft wen auf, in beide Richtungen |
| `typeHierarchy/*` | Ober- und Untertypen |

## Ändern

| Methode | macht |
|---|---|
| `textDocument/rename` | liefert einen `WorkspaceEdit` mit allen Änderungen, auch über Dateien hinweg |
| `textDocument/prepareRename` | prüft vorher, ob an der Stelle umbenannt werden kann, und welche Range |
| `textDocument/formatting` | formatiert das ganze Dokument, liefert `TextEdit[]` |
| `textDocument/rangeFormatting` | formatiert eine Auswahl |
| `textDocument/onTypeFormatting` | formatiert nach bestimmten Zeichen (`}` schließt Block, Einrückung korrigieren) |
| `textDocument/linkedEditingRange` | Ranges, die gemeinsam editiert werden: Öffnendes und schließendes Tag in HTML (`<div.card>` … `</div.card>`) |
| `textDocument/willSaveWaitUntil` | Edits kurz vor dem Speichern |

Ein `WorkspaceEdit` ist eine Sammlung von Änderungen pro URI, optional mit Datei-Operationen (anlegen, umbenennen, löschen) und Versionsprüfung, damit nichts auf einen veralteten Stand angewendet wird.

## Code Actions und Commands

`textDocument/codeAction` liefert zu einer Range (meist einer Diagnostic) Vorschläge:

| `kind` | Beispiel |
|---|---|
| `quickfix` | „`<p @if={x}>` in einen `@if`-Block umwandeln“ |
| `refactor.extract` | Markup in eine eigene Komponente auslagern |
| `refactor.rewrite` | `{ … }`-Block in Einrückungsschreibweise umwandeln |
| `source.organizeImports` | Imports sortieren und Unbenutztes entfernen |
| `source.fixAll` | alle automatisch behebbaren Probleme |

Eine Code Action enthält entweder direkt einen `WorkspaceEdit` oder einen `command`, den der Editor mit `workspace/executeCommand` an den Server zurückschickt. `codeAction/resolve` berechnet den Edit erst, wenn die Aktion gewählt wird.

## Code Lens

`textDocument/codeLens` setzt klickbare Zeilen über Code: „3 Verwendungen“, „Im Playground öffnen“. Der Klick führt einen Command aus. `codeLens/resolve` berechnet den Text nachträglich.

## Darstellung im Text

| Methode | zeigt |
|---|---|
| `textDocument/semanticTokens/full`, `/range`, `/full/delta` | Farben nach Bedeutung statt nach Syntax: `$count` als reaktive Variable, ein Parameter anders als eine globale |
| `textDocument/inlayHint` | eingeblendeten Text, der nicht in der Datei steht: Typen (`let $count`<sub>`: signal<number>`</sub>), Parameternamen |
| `textDocument/inlineValue` | Werte beim Debuggen direkt im Code |
| `textDocument/documentColor`, `colorPresentation` | Farbquadrate neben `#e5222f`, mit Farbwähler |
| `textDocument/foldingRange` | Einklappbereiche: Elemente, `@if`/`@for`-Körper, `<script>`, `<style>` |
| `textDocument/selectionRange` | „Auswahl erweitern“: Wort → Attribut → Tag → Element → Block |

### Semantic Tokens genauer

Die Tokens kommen als flache Zahlenreihe, fünf Zahlen pro Token, relativ zum vorigen:

```
deltaLine, deltaStartChar, length, tokenType, tokenModifiers
```

`tokenType` ist ein Index in die Legende aus den Capabilities, `tokenModifiers` ein Bitfeld. Relativ, damit eine Änderung in Zeile 3 nicht alle Zahlen dahinter ändert und `full/delta` nur einen kleinen Unterschied schicken muss.

```js
// legende: tokenTypes ['variable', 'function'], tokenModifiers ['reactive', 'readonly']
// $count in zeile 2 ab spalte 6 (reaktiv), $double in zeile 3 ab spalte 6 (reaktiv, readonly)
[2, 6, 6, 0, 0b01,   1, 6, 7, 0, 0b11]
```

Semantic Tokens legen sich über das Grammatik-Highlighting, sie ersetzen es nicht. Siehe [ecosystem.md](ecosystem.md).

## Workspace-Methoden des Servers

| Methode | Richtung | Zweck |
|---|---|---|
| `workspace/executeCommand` | Client → Server | einen Command des Servers ausführen (aus Code Action oder Code Lens) |
| `workspace/applyEdit` | Server → Client | der Server bittet den Editor, einen `WorkspaceEdit` anzuwenden |
| `workspace/configuration` | Server → Client | Einstellungen lesen |
| `workspace/semanticTokens/refresh`, `inlayHint/refresh`, `codeLens/refresh`, `diagnostic/refresh` | Server → Client | „frag noch mal“, z.B. nachdem sich eine importierte Datei geändert hat |

## Neuere Features

- **Notebooks** (3.17): Dokumente aus mehreren Zellen, jede eine Textdatei mit eigener Sprache.
- **Inline Completion** (3.18, in Arbeit): mehrzeilige Vorschläge als grauer Text, wie bei KI-Assistenten.
- Viele Server definieren eigene Methoden mit Präfix (`rust-analyzer/expandMacro`), die nur ihr eigener Editor-Client kennt. Das ist erlaubt, bleibt aber außerhalb des Standards.

## Was ein Editor tatsächlich nutzt

Nicht jeder Editor zeigt jedes Feature. Faustregel 2026: Diagnostics, Completion, Hover, Definition, References, Rename, Formatting, Code Actions, Document Symbols, Semantic Tokens und Inlay Hints kann jeder ernstzunehmende Client. Code Lens, Call/Type Hierarchy, Linked Editing und Notebooks sind uneinheitlich. Beim Bau eines Servers lohnt sich deshalb die Reihenfolge der Tabelle unten.

| Stufe | Features | Nutzen |
|---|---|---|
| 1 | Diagnostics | Fehler beim Tippen, ohne Build |
| 2 | Document Symbols, Folding, Hover | Orientierung |
| 3 | Completion, Definition, References | Schreiben und Navigieren |
| 4 | Rename, Code Actions, Formatting | Umbauen |
| 5 | Semantic Tokens, Inlay Hints, Code Lens | Feinschliff |

Weiter: [ecosystem.md](ecosystem.md)
