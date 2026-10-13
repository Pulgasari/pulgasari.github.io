# Bibliotheken und Frameworks

Steckbriefe zu Bibliotheken, Frameworks und Sprachen aus dem Web-Umfeld: wofür sie gebaut wurden, ihre Kernkonzepte mit Code, wie sie intern arbeiten, Stärken und Schwächen, und was davon für rat, aufbau und zugriff interessant ist.

| | Was | Kern | Build |
|---|---|---|---|
| [ArrowJS](arrowjs.md) | reaktive UI-Runtime, unter 5 kb | `reactive()` + `html`, eine Funktion bleibt live | nein |
| [EJS](ejs.md) | Template-Sprache | JavaScript in `<% %>`, compiliert zu einer String-Funktion | nein |
| [Elm](elm.md) | funktionale Sprache für Web-Apps | Model, Update, View; keine Laufzeitfehler | ja |
| [Fresh](fresh.md) | Deno-Web-Framework | Server-Rendering, Islands, Partials | ja (Vite) |
| [htmx](htmx.md) | HTML-Erweiterung | jedes Element macht Requests, Server schickt HTML | nein |
| [_hyperscript](hyperscript.md) | Skriptsprache im Attribut | Ereignisabläufe als Sätze, Async ohne `await` | nein |
| [jQuery](jquery.md) | DOM-Bibliothek | `$`, implizite Schleife, Chaining | nein |
| [Lit](lit.md) | Web Components | reaktive Properties, Template-Caching, Shadow DOM | nein |
| [Lynx](lynxjs.md) | native UI mit Web-Technik | eigene Engine, zwei Threads | ja (Rspeedy) |
| [TSRX](tsrx.md) | Nachfolger von JSX | `@if`/`@for`/`@try`, ein Quelltext für viele Frameworks | ja |

## Querverbindungen

- **Seitenwechsel ohne Neuladen:** `hx-boost` ([htmx](htmx.md)), Partials ([Fresh](fresh.md)), pjax, Turbo Drive und `hyperfetch.js` sind dieselbe Idee.
- **Statisch vs. live:** [ArrowJS](arrowjs.md) (`() =>` macht live), [Lit](lit.md) (statische Template-Teile einmal geparst) und rat (`{…}` wird vom Compiler zu `() =>`) lösen dasselbe Problem auf verschiedenen Ebenen.
- **Kontrollfluss im Markup:** [TSRX](tsrx.md) und rat haben fast dieselbe `@if`/`@for`-Syntax, [EJS](ejs.md) zeigt, warum: `<% } %>` wird unlesbar.
- **Verhalten über Attribute:** [htmx](htmx.md), [_hyperscript](hyperscript.md), jQuery-Plugins ([jQuery](jquery.md)) und die Behaviors von rat.
- **Daten an der Grenze prüfen:** Decoder ([Elm](elm.md)), Island-Serialisierung ([Fresh](fresh.md)), Schemas in `@rat/types`.

## todo
- [ ] AlpineJS
- [ ] Angular
- [x] ArrowJS
- [ ] CoffeScript
- [x] EJS
- [x] Elm
- [ ] Express
- [x] Fresh
- [ ] HTM
- [x] htmx
- [x] jQuery
- [x] Lit
- [ ] LiveScript
- [x] Lynx JS
- [ ] MobX
- [ ] Preact
- [ ] React
- [ ] ReScript
- [ ] RxJS
- [ ] SolidJS
- [ ] Svelte
- [x] TSRX
- [ ] TypeScript
- [ ] Vue
