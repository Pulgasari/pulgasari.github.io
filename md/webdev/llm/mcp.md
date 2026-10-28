# MCP und WebMCP

Das **Model Context Protocol (MCP)** ist ein offenes Protokoll, über das KI-Anwendungen (Claude, ChatGPT, Editoren, Agenten) mit externen Werkzeugen und Daten sprechen: ein Server bietet Tools, Ressourcen und Prompts an, ein Client im KI-Programm ruft sie auf. Von Anthropic im November 2024 veröffentlicht, seit Ende 2025 bei der Agentic AI Foundation unter der Linux Foundation. Die Spezifikation hat Datumsversionen; aktuell **2026-07-28**.

**WebMCP** bringt dieselbe Idee in den Browser: Eine Web-Seite meldet ihre eigenen Funktionen als Tools an, und ein Agent im Browser ruft sie direkt auf, statt Knöpfe zu suchen und Formulare auszufüllen. Ein Entwurf der W3C Web Machine Learning Community Group (kein Standard), in Chrome seit 146 hinter einem Flag und seit 149 als Origin Trial.

- MCP: https://modelcontextprotocol.io, SDKs für TypeScript (`@modelcontextprotocol/sdk`), Python, Java, Kotlin, C#, Go, Rust, Swift, Ruby, PHP
- WebMCP: Entwurf der W3C Web Machine Learning CG, Chrome-Doku unter developer.chrome.com/docs/ai/webmcp

Weiterführend: [middleware.md](../middleware.md) (MCP-Gateways sind Middleware für Tool-Aufrufe), [claude_code_env.md](claude_code_env.md), [../types/protocols.md](../types/protocols.md).

---

## Das Problem

Ein Sprachmodell weiß nur, was in seinem Kontext steht, und kann nur Text erzeugen. Damit es eine Datei liest, ein Ticket anlegt oder eine Datenbank fragt, braucht es Werkzeuge. Vor MCP baute jede KI-Anwendung ihre eigenen Integrationen: ein GitHub-Plugin für ChatGPT, ein anderes für Cursor, ein drittes für Claude. **N Anwendungen mal M Dienste.**

MCP macht daraus N plus M: Ein Dienst schreibt einen MCP-Server, jede Anwendung, die MCP spricht, kann ihn benutzen. Das Vorbild ist das [Language Server Protocol](../lsp/README.md), das dasselbe für Editoren und Programmiersprachen gelöst hat; auch technisch ist MCP ihm nah (JSON-RPC 2.0, Fähigkeiten werden beim Start ausgehandelt).

## MCP: Rollen und Bausteine

```
 ┌────────────── Host (Claude Desktop, Claude Code, ein Editor, …) ──────────────┐
 │  Modell  ◀──▶  Client ──── JSON-RPC ────▶ Server (github, filesystem, db, …)  │
 └───────────────────────────────────────────────────────────────────────────────┘
```

| Baustein | wer steuert ihn | was |
|---|---|---|
| **Tools** | das Modell | Funktionen mit Namen, Beschreibung und JSON-Schema für die Argumente: `create_issue`, `query_db`, `read_file` |
| **Resources** | die Anwendung | Daten, über URIs adressiert (`file:///…`, `db://orders/42`), die in den Kontext gelegt werden |
| **Prompts** | der Nutzer | vorgefertigte Vorlagen, oft als Slash-Befehle angeboten |
| **Elicitation** | der Server | fragt mitten in einem Aufruf beim Nutzer nach (ein Formular, eine Bestätigung) |
| **Sampling** | der Server | lässt das Modell des Hosts für sich antworten (in 2026-07-28 als veraltet markiert) |

### Ein Server in TypeScript

```js
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'notes', version: '1.0.0' });

server.registerTool('add_note', {
  description : 'eine notiz anlegen',
  inputSchema : { text: z.string(), title: z.string() },
}, async ({ text, title }) => {
  const note = await notes.add({ text, title });
  return { content: [{ text: `angelegt: ${note.id}`, type: 'text' }] };
});

server.registerResource('note', new ResourceTemplate('notes://{id}', {}), {}, async (uri, { id }) => ({
  contents: [{ text: (await notes.get(id)).text, uri: uri.href }],
}));

await server.connect(new StdioServerTransport());
```

Das Eingabeschema ist ein [Standard Schema](../types/standard-schema.md) (hier Zod), das SDK macht daraus JSON Schema für das Modell und prüft die Argumente, bevor der Handler läuft.

### Was über die Leitung geht

```json
{ "jsonrpc": "2.0", "id": 7, "method": "tools/call",
  "params": { "name": "add_note", "arguments": { "title": "Einkauf", "text": "Milch" } } }

{ "jsonrpc": "2.0", "id": 7,
  "result": { "content": [{ "type": "text", "text": "angelegt: n42" }] } }
```

Dazu `tools/list`, `resources/list`, `resources/read`, `prompts/get` und Benachrichtigungen wie `notifications/tools/list_changed`, wenn sich das Angebot ändert.

### Transporte

| Transport | wo |
|---|---|
| **stdio** | der Host startet den Server als Kindprozess und spricht über stdin/stdout; für lokale Werkzeuge |
| **Streamable HTTP** | ein Endpunkt für POST, Antworten als JSON oder als SSE-Strom; für entfernte Server, mit OAuth 2.1 zur Anmeldung |

Die Revision 2026-07-28 hat die Protokoll-Sitzungen gestrichen: Jede Anfrage trägt ihren Kontext selbst, ein Server lässt sich damit ohne Sticky Sessions hinter einen Load Balancer stellen. Der alte Transport „HTTP+SSE“ läuft aus.

### Sicherheit

Ein Tool ist Code mit den Rechten seines Servers, gesteuert von einem Modell, das Text aus fremden Quellen liest. Daraus folgen die bekannten Risiken: **Prompt Injection** (eine Webseite oder ein Issue enthält Anweisungen, die das Modell befolgt), **Tool Poisoning** (eine Tool-Beschreibung lügt), zu breite Rechte (ein Dateisystem-Server mit Zugriff auf `~`). Hosts lassen Aufrufe deshalb bestätigen, Server sollten so wenig dürfen wie möglich, Tool-Annotationen (`readOnlyHint`, `destructiveHint`) helfen dem Host bei der Entscheidung.

## WebMCP: Tools aus der Seite

Ein Agent im Browser bedient eine Seite heute wie ein Mensch, nur schlechter: Er liest Screenshots oder den Accessibility-Baum, rät, welcher Knopf was tut, tippt in Felder und hofft. WebMCP lässt die Seite sagen, was sie kann:

```js
const controller = new AbortController();

document.modelContext.registerTool({
  name        : 'add_to_cart',
  description : 'ein produkt in den warenkorb legen',
  inputSchema : {
    properties : { productId: { type: 'string' }, quantity: { minimum: 1, type: 'integer' } },
    required   : ['productId'],
    type       : 'object',
  },
  async execute ({ productId, quantity = 1 }) {
    await cart.add(productId, quantity);       // die funktion, die auch der knopf aufruft
    return { content: [{ text: `${quantity}× im warenkorb`, type: 'text' }] };
  },
}, { signal: controller.signal });

controller.abort();   // das tool wieder abmelden
```

- Die Tools laufen **in der Seite**, mit der Sitzung des Nutzers: kein Backend, kein eigener Server, keine zweite Anmeldung. Der Browser vermittelt zwischen Agent und Seite.
- Standardmäßig sieht nur ein Agent für dieselbe Origin die Tools; `exposedTo` gibt sie für weitere sichere Origins frei.
- Neben dieser **imperativen** API gibt es eine **deklarative**: Attribute an einem `<form>` machen ein bestehendes Formular zum Tool, Felder werden zu Parametern.
- Ältere Artikel schreiben `navigator.modelContext`; der Entwurf und Chrome sind auf `document.modelContext` umgezogen (Chrome unterstützt im Origin Trial vorübergehend beides).
- Stand Herbst 2026: ein Entwurf, nur in Chrome, und kaum ein Agent außer Gemini in Chrome ruft die Tools bislang auf. Bibliotheken wie `@mcp-b/global` liefern ein Polyfill und eine Brücke zu gewöhnlichen MCP-Clients.

## MCP und WebMCP im Vergleich

| | MCP | WebMCP |
|---|---|---|
| wo läuft das Tool | in einem Server-Prozess (lokal oder entfernt) | in der Web-Seite, im Browser-Tab |
| wer meldet an | der Server beim Start, über `tools/list` | die Seite zur Laufzeit, solange sie offen ist |
| Rechte | die des Server-Prozesses, plus OAuth | die der Seite und der Sitzung des Nutzers |
| Protokoll | JSON-RPC über stdio oder HTTP | eine Browser-API, kein Netzprotokoll |
| Status | stabile Spezifikation mit Datumsversionen | Community-Group-Entwurf, Origin Trial in Chrome |

## Für rat und aufbau

- **rats Kommandos sind fast schon Tools.** `RAT.app.commands.assign({ 'add-podcast': …, 'refresh-all': … })` gibt jeder Aktion einer App einen Namen, Hotkeys und Markup (`onclick='save'`) rufen sie darüber auf. Ein `@rat/app`-Mod `agent` könnte jedes Kommando mit Beschreibung und Schema (aus `@rat/types`, das ein Standard Schema ist) bei `document.modelContext` anmelden. Die App würde dadurch von Agenten bedienbar, ohne neuen Code pro Aktion.
- **Schemas doppelt nutzen.** Ein `Record({ title: Str, quantity: Num.range(1, 99) })` prüft heute Formulare und gespeicherte Werte (`stored`); dasselbe Schema als `inputSchema` wäre der Vertrag mit dem Agenten.
- **Ein MCP-Server für rat-Docs und den Compiler** (Syntax nachschlagen, eine `.rat`-Datei prüfen, Fehler erklären) wäre für die Arbeit mit Coding-Agenten nützlich: `rat check` liefert schon Fehler mit Datei, Zeile und Spalte.
- **Barrierefreiheit hilft Agenten.** Solange WebMCP selten ist, lesen Agenten den Accessibility-Baum (so auch `@playwright/mcp`, siehe [../libs/playwright.md](../libs/playwright.md)). Saubere Rollen und Labels an aufbaus Elementen sind deshalb doppelt wert (siehe [../a11y.md](../a11y.md)).
