# LSP für htx

Übersicht: [README.md](README.md) · rat: [rat.md](rat.md)

htx lebt in **normalem JavaScript**: ``html`<div.card>${title}</div>` `` oder ``htx`<div.card>${title}</div>` `` in einer `.js`-Datei. Es gibt keine eigene Dateiendung, die ein Editor einem eigenen Server zuordnen könnte. Die Datei gehört dem JavaScript-Server, und der ist in praktisch jedem Editor der TypeScript-Server.

## Drei Wege, und warum der dritte passt

| Weg | wie | Problem |
|---|---|---|
| eigener Server für `.js` | ein zweiter Server neben dem JS-Server, der nur die Templates ansieht | zwei Server pro Datei, die nichts voneinander wissen; der htx-Server kennt keine Typen der Holes; Konfiguration in jedem Editor |
| Linter-Regel (ESLint) | Templates beim Linten prüfen | nur Fehler, keine Completion, kein Hover |
| **TypeScript-Plugin** | ein Plugin für `tsserver`, das sich in dessen Antworten einklinkt | keins der beiden: läuft in jedem Editor, der TypeScript nutzt, und hat den Type Checker zur Hand |

TypeScript-Plugins sind genau für eingebettete Sprachen in JS gedacht. `ts-lit-plugin` (lit-analyzer) macht das für Lit, `typescript-styled-plugin` für CSS in styled-components. Ein `@htx/ts-plugin` wäre dasselbe für htx.

## Wie ein TypeScript-Plugin funktioniert

`tsserver` lädt Plugins, die in `tsconfig.json` oder `jsconfig.json` stehen:

```jsonc
// jsconfig.json
{
  "compilerOptions": {
    "checkJs": false,
    "plugins": [{ "name": "@htx/ts-plugin", "tags": ["html", "htx"], "manifest": "./custom-elements.json" }]
  }
}
```

Das Plugin bekommt den Language Service und gibt einen umhüllten zurück. Jede Methode kann es ergänzen:

```js
// @htx/ts-plugin (skizze)
function init ({ typescript: ts }) {
  return {
    create (info) {
      const service = info.languageService;
      const proxy   = Object.create(null);
      for (const key of Object.keys(service)) proxy[key] = (...args) => service[key](...args);

      // the template under the cursor answers first, typescript for everything else
      proxy.getCompletionsAtPosition = (file, position, options) => {
        const template = templateAt(ts, service.getProgram(), file, position);
        return template ? completionsIn(template, position) : service.getCompletionsAtPosition(file, position, options);
      };

      proxy.getSemanticDiagnostics = file => [
        ...service.getSemanticDiagnostics(file),
        ...templatesIn(ts, service.getProgram(), file).flatMap(diagnosticsOf),
      ];

      return proxy;
    },
  };
}

module.exports = init;
```

`templateAt` sucht im Syntaxbaum von TypeScript den `TaggedTemplateExpression`, dessen Tag `html` oder `htx` heißt und den Cursor enthält. Die statischen Teile des Templates sind genau das, was `program()` aus `@htx/htx` liest. Das Plugin parst sie mit demselben Parser wie zur Laufzeit, und Parser und Prüfung können nicht auseinanderlaufen.

Weil das Plugin im TypeScript-Server läuft, sieht es **alles, was TypeScript sieht**: den Typ jedes `${…}`, die Imports, wo `html` herkommt.

### Wo es läuft

| Editor | Weg |
|---|---|
| VS Code | Plugins aus `tsconfig`/`jsconfig` lädt VS Code nur mit der TypeScript-Version des Workspaces. Mit der eingebauten Version braucht es eine kleine Extension mit `contributes.typescriptServerPlugins` |
| Zed, Neovim, Helix, Sublime, Emacs | über `typescript-language-server` oder `vtsls`, die `tsserver` starten und Plugins aus der Konfiguration laden |
| Monaco | der TypeScript-Worker von Monaco nimmt keine Plugins; dort bräuchte es eine eigene Anbindung (Custom Worker) |

## Was das Plugin für htx tun kann

### Diagnostics

| Prüfung | Beispiel |
|---|---|
| Syntax des Templates | `<div.card>` ohne Schluss, `<//>` zu viel |
| unbekannter Shorthand-Tag | `<$icon …>`, aber kein `html.define('$icon', …)` in Reichweite |
| Positionswerte ohne Ziel | `<$btn "a" "b">`, aber `$btn` deklariert nur ein Argument |
| Event-Hole ohne Funktion | `onclick=${count}`, und `count` ist eine Zahl. Das prüft der Type Checker am Hole-Ausdruck |
| unbekanntes Attribut, falscher Wert an einem Custom Element | etwa `variant="huge"`, wo das Manifest nur `primary \| ghost` kennt |
| `!html=${x}` mit einem Wert, der nicht nachweislich bereinigt ist | Hinweis auf XSS |
| mehrere Ids im Selektor | `<div#a#b>`, das htx zur Laufzeit nur warnt |

### Completion und Hover

- nach `<`: HTML-Tags, Custom Elements aus dem Manifest, Shorthand-Tags aus `html.define(...)` (statisch gefunden), `${Komponente}`.
- im Tag: Attribute des Elements, `class:` und `style:` mit Klassen und CSS-Properties, Prop-Gruppen (`title|aria-label=`), Events als `on…`.
- im Selektor `<div.|`: Klassen, die im Projekt-CSS vorkommen.
- Hover auf Tag und Attribut: Beschreibung aus dem Manifest bzw. MDN-Daten.
- Definition auf einem Shorthand-Tag: springt zum `html.define`-Aufruf. Auf einem Custom Element: zur Klassendefinition (das Manifest enthält den Pfad).

### Typen der Holes

Das ist der Teil, den nur ein TypeScript-Plugin kann. `program()` sagt, welche Rolle jedes Hole hat (Kind, Prop-Wert, Spread, Tag, Event). Das Plugin fragt den Type Checker nach dem Typ des Ausdrucks und vergleicht:

| Hole | erwartet |
|---|---|
| `on…=${…}` | eine Funktion |
| `ref=${…}` | eine Funktion oder ein Objekt mit `current` |
| `<${Tag}>` | String oder Funktion `(props, children)` |
| `...${…}` | ein Objekt |
| Attribut an einem Custom Element | der Typ der Property aus dem Manifest |
| Kind-Hole | etwas Darstellbares: String, Zahl, Node, Template-Ergebnis, `each`/`when`/`match`, Array davon |

Ohne `checkJs` bleiben das Warnungen, die nur das Plugin zeigt. Mit JSDoc-Typen in den aufbau-Paketen (`index.d.ts`) wird es präzise.

## Highlighting

Das Plugin färbt nichts. Farben im Template kommen aus einer Grammatik-Injektion: Die JavaScript-Grammatik des Editors erkennt ``html`…` `` und schaltet für den Inhalt auf HTML um. In VS Code geht das mit einer kleinen Grammatik, die sich in `source.js` injiziert (`injectTo`), in tree-sitter-Editoren mit einer `injections.scm`-Regel für Tagged Templates. Für `.rat.js` macht `@rat/syntax` das bereits, und zwar mit htx-Syntax statt nur HTML (Selektoren, Prop-Gruppen).

## Verhältnis zu rat

| Datei | Templates | zuständig |
|---|---|---|
| `.js` | ``html`…${x}…` `` | `@htx/ts-plugin` |
| `.rat.js` | ``html`…` `` **ohne** eigene Holes | rat: wird zu rat-Markup kompiliert, der rat-Server ist zuständig ([rat.md](rat.md)) |
| `.rat.js` | ``html`…${x}…` `` mit Holes | bleibt Laufzeit-htx; der rat-Server kann die Anfrage an dieselbe Logik wie das Plugin weitergeben |
| `.rat` | Markup | rat-Server |
| kompilierter rat-Code | ``$$.html`…` `` | wird nicht editiert, nur gelesen |

Der Template-Teil (Tags, Attribute, Manifest, Shorthand-Tags) sollte deshalb als eigene Bibliothek entstehen, etwa `@htx/analyzer`, die beide benutzen: das TypeScript-Plugin für `.js`, der rat-Server für `.rat` und `.rat.js`. So ist die Element-Doku, die Attributprüfung und die Completion an beiden Orten dieselbe.

## Reihenfolge

| Schritt | Ergebnis |
|---|---|
| `@htx/analyzer`: Template finden, mit `program()` parsen, Fehler mit Positionen | Grundlage für Plugin und rat-Server |
| `@htx/ts-plugin` mit Diagnostics | Syntaxfehler in Templates in jedem Editor |
| Manifest einlesen (`custom-elements.json` aus `@aufbau/elements`) | Completion und Hover für alle aufbau-Elemente |
| Shorthand-Tags aus `html.define` | Completion, Definition, Argumentprüfung |
| Hole-Typen über den Type Checker | Event-, Ref-, Property-Prüfung |
