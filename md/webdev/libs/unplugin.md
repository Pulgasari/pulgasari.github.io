# unplugin

Ein **einheitliches Plugin-System für Build-Werkzeuge**: Man schreibt ein Plugin einmal und bekommt daraus Plugins für [Vite](vite.md), Rollup, Rolldown, Webpack, Rspack, Rsbuild, [esbuild](esbuild.md), Farm und Bun. Aus dem UnJS-Umfeld von Nuxt, seit 2021, von Anthony Fu u. a.; heute unter Nuxt Contrib. Aktuell 3.x (Oktober 2026), aktiv, MIT-lizenziert.

- Website: https://unplugin.unjs.io
- Repository: https://github.com/unjs/unplugin
- Größe: – (läuft nur im Build)
- Bekannte Plugins darauf: `unplugin-auto-import`, `unplugin-vue-components`, `unplugin-icons`, `unplugin-vue-router`, Civet, rat (`@rat/dev`)

## Das Problem, das unplugin löst

Jedes Build-Werkzeug hat seine eigene Plugin-API. Rollup hat Hooks wie `resolveId`, `load`, `transform`; Vite übernimmt sie und fügt eigene hinzu (`configureServer`, `transformIndexHtml`); Webpack arbeitet mit Loadern und einem Tapable-Hook-System; esbuild mit `onResolve` und `onLoad` über reguläre Ausdrücke. Wer eine Spracherweiterung (eine neue Dateiendung, einen Compiler) für alle anbieten will, schreibt sie viermal.

unplugin legt eine gemeinsame Schnittstelle darüber, die der Rollup-API folgt, weil sie am verbreitetsten ist, und übersetzt sie für jedes Werkzeug.

## Kernkonzepte

### 1. Ein Plugin, viele Ausgaben

```js
import { createUnplugin } from 'unplugin';

export const unplugin = createUnplugin((options = {}, meta) => ({
  name: 'unplugin-shout',

  // nur diese dateien gehen durch transform
  transformInclude (id) { return id.endsWith('.shout'); },

  transform (code, id) {
    return { code: `export default ${JSON.stringify(code.toUpperCase())};`, map: null };
  },
}));

export const vitePlugin     = unplugin.vite;
export const rollupPlugin   = unplugin.rollup;
export const rolldownPlugin = unplugin.rolldown;
export const esbuildPlugin  = unplugin.esbuild;
export const webpackPlugin  = unplugin.webpack;
export const rspackPlugin   = unplugin.rspack;
```

```js
// vite.config.js
import { vitePlugin as shout } from 'unplugin-shout';
export default { plugins: [shout({ loud: true })] };
```

`meta.framework` sagt dem Plugin, in welchem Werkzeug es gerade läuft, falls es doch einmal unterscheiden muss.

### 2. Die gemeinsamen Hooks

| Hook | wofür |
|---|---|
| `buildStart`, `buildEnd` | Beginn und Ende eines Builds |
| `resolveId(id, importer)` | einen Import auf eine Datei oder ein virtuelles Modul abbilden |
| `loadInclude`, `load(id)` | den Inhalt eines Moduls liefern (virtuelle Module) |
| `transformInclude`, `transform(code, id)` | Quelltext umschreiben, mit Source Map |
| `watchChange` | eine beobachtete Datei hat sich geändert |
| `writeBundle` | nach dem Schreiben der Ausgabe |

Seit Version 2 gibt es **Filter** direkt in den Hooks (`transform: { filter: { id: /\.rat$/ }, handler }`), damit Werkzeuge wie Rolldown die JavaScript-Funktion gar nicht erst aufrufen müssen, wenn eine Datei nicht passt.

### 3. Virtuelle Module

```js
resolveId (id) { if (id === 'virtual:config') return '\0virtual:config'; },
loadInclude (id) { return id === '\0virtual:config'; },
load () { return `export default ${JSON.stringify(readConfig())};`; },
```

Ein Import, hinter dem keine Datei steht, sondern Code, den das Plugin erzeugt. Das `\0` vor der ID ist die Rollup-Konvention, damit kein anderes Plugin versucht, es als Pfad aufzulösen.

### 4. Werkzeug-Spezifisches

```js
createUnplugin(() => ({
  name: 'x',
  vite: { configureServer (server) { … }, transformIndexHtml (html) { … } },
  webpack (compiler) { … },
  esbuild: { setup (build) { … } },
}));
```

Was sich nicht vereinheitlichen lässt, steht in einem Schlüssel pro Werkzeug. Es wird nur dort ausgeführt.

## Wie es intern arbeitet

Für Rollup, Rolldown und Vite gibt unplugin das Objekt nahezu unverändert weiter, weil deren API die Vorlage ist. Für Webpack und Rspack registriert es einen eigenen Loader, der `transform` aufruft, und bildet `resolveId`/`load` über virtuelle Module im Dateisystem-Layer nach. Für esbuild baut es aus `resolveId`, `load` und `transform` ein Plugin mit `onResolve`/`onLoad`, das den Inhalt selbst liest und weiterreicht. Die Unterschiede in Details (welche Hooks im Dev-Modus laufen, wie Source Maps zusammengesetzt werden) bleiben aber spürbar.

## Stärken und Schwächen

- **Stark:** einmal schreiben, überall nutzen; die vertraute Rollup-API; virtuelle Module und Transformationen werkzeugübergreifend; Filter für schnelle Builds mit Rolldown; der Standardweg für Spracherweiterungen und Auto-Import-Plugins.
- **Schwach:** nur der gemeinsame Nenner ist wirklich gleich; Dev-Server-Funktionen (HMR, HTML-Transformation) sind werkzeugspezifisch; Fehler in einem Werkzeug lassen sich schwer reproduzieren, wenn man sonst ein anderes benutzt; esbuild fehlt die Möglichkeit, mehrere Transformationen auf dieselbe Datei hintereinander zu schalten.

## Für rat und aufbau

- **`@rat/dev` ist ein unplugin.** `createUnplugin` liefert rats Integration für Vite, Rollup, Rolldown, esbuild und Webpack: `.rat`, `.rat.html` und `.rat.js` werden in `transform` compiliert, Bare Specifiers über Import Maps in `resolveId` aufgelöst, der Einstieg der App (`\0rat:entry:`) ist ein virtuelles Modul, und `vite: { transformIndexHtml }` ersetzt das `run.js`-Skript der Seite durch den gebauten Einstieg.
- **Was nur mit Vite geht,** steht bei rat auch im `vite`-Schlüssel: `<style>` von Komponenten durch Vites CSS-Pipeline (PostCSS), `<script comptime>` in einem eigenen Vite-Server, `keepNames` für Klassen, die ihr Tag aus ihrem Namen beziehen. In esbuild oder Webpack fallen diese Teile weg; das ist die Grenze des gemeinsamen Nenners.
- **Auto-Import** (`unplugin-auto-import`, `unplugin-vue-components`) entspricht rats `autoImport` in `config.rat.js`: Komponenten ohne Import, ergänzt im Build.
- **Civet und rat** sind beide als unplugin erhältlich; eine Kette aus beiden wäre technisch möglich (siehe [../langs/civet.md](../langs/civet.md)).
