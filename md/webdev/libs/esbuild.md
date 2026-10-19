# esbuild

Ein Bundler, Transformer und Minifier für JavaScript und CSS, von Evan Wallace, seit 2020. In Go geschrieben, über Kommandozeile, JavaScript-API und Go-API verwendbar. Aktuell 0.28.2 (August 2026), aktiv. esbuild machte kurze Build-Zeiten zum Ausgangspunkt statt zu einer späteren Optimierung; ältere Vite-Versionen nutzten es unter anderem zur Vorbereitung von Abhängigkeiten.

- Website: https://esbuild.github.io
- Repository: https://github.com/evanw/esbuild
- Laufzeit: natives Programm; npm installiert das passende Plattform-Binary, alternativ WebAssembly
- Build: esbuild ist das Build-Werkzeug; keine eigene Browser-Runtime

## Das Problem, das esbuild löst

Build-Ketten bestanden oft aus mehreren Werkzeugen: Parser, TypeScript- oder JSX-Transformer, Bundler und Minifier. Jeder Schritt las Code neu ein und erzeugte Text für den nächsten. Bei vielen Modulen kostete schon eine kleine Änderung spürbar Zeit.

esbuild verbindet diese Aufgaben in einem nativen Programm und führt Arbeit parallel aus. Es ist dabei eher ein präzises Werkzeug als ein vollständiges App-Framework: Dev-Server und Watch-Modus sind vorhanden, Routing und komponentenspezifisches Hot Reloading nicht automatisch.

## Kernkonzepte

### 1. Ein Bundle erzeugen

```sh
npm install --save-dev esbuild
npx esbuild src/main.ts --bundle --format=esm --outdir=dist --sourcemap
```

`bundle` folgt Imports und verbindet Module. Ohne diese Option werden Eingabedateien transformiert, ihre Abhängigkeiten aber nicht eingebaut. `platform`, `target` und `format` bestimmen verschiedene Dinge: Zielumgebung, erlaubte Syntax und Modulformat.

### 2. JavaScript-API

```js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: ['es2022'],
  minify: true,
  metafile: true,
});
```

Der Build kann Assets, CSS und mehrere Einstiegspunkte verarbeiten. `metafile` beschreibt Eingaben, Ausgaben und ihre Beziehungen; daraus lässt sich erkennen, warum ein Paket im Bundle gelandet ist.

### 3. Transformation ohne Dateisystem

```js
const result = await esbuild.transform('const square = (x: number) => x * x', {
  loader: 'ts',
  target: 'es2020',
  sourcemap: 'inline',
});
```

`transform` bearbeitet einen Text ohne Modulauflösung. TypeScript-Typen verschwinden, werden aber nicht geprüft. Dafür bleibt ein separater Lauf wie `tsc --noEmit` nötig; ein Syntaxziel liefert außerdem keine Polyfills für fehlende Browser-APIs.

### 4. Wiederholte Builds

```js
const context = await esbuild.context({
  entryPoints: ['src/main.js'], bundle: true, outdir: 'dist',
});
await context.watch();
// later: await context.dispose();
```

Ein Context hält Build-Zustand für Rebuilds, Watch oder Serve. Das ist etwas anderes als ein einmaliger `build`-Aufruf. Ressourcen müssen am Ende freigegeben werden.

### 5. Plugins und virtuelle Module

```js
const virtual = {
  name: 'virtual-message',
  setup(build) {
    build.onResolve({ filter: /^virtual:message$/ }, () => ({
      path: 'message', namespace: 'virtual',
    }));
    build.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({
      contents: 'export default "Hallo"', loader: 'js',
    }));
  },
};
```

`onResolve` bestimmt, was ein Import bedeutet, `onLoad` liefert seinen Inhalt. Plugins können fremde Dateiformate übersetzen; sie bekommen aber keine beliebig veränderbare esbuild-AST als allgemeine Transformationsschnittstelle.

## Wie es intern arbeitet

esbuild löst Module auf, parst sie, verfolgt ihre Verbindungen, entfernt unbenutzten Code und erzeugt Ausgaben. Mehrere Phasen laufen über Dateien parallel. Gemeinsame interne Strukturen vermeiden, dass nach jeder Transformation wieder JavaScript-Text geparst werden muss.

Die JavaScript-API spricht im nativen npm-Paket mit dem esbuild-Prozess. Die schwere Arbeit läuft damit nicht als JavaScript im aufrufenden Node-Prozess. Häufige oder langsame Plugin-Callbacks können diesen Vorteil teilweise wieder aufbrauchen.

## Stärken und Schwächen

- **Stark:** kurze Builds, kleine API, viele Standardaufgaben ohne Plugin, gut als Baustein eigener Compiler-Pipelines. Metadaten und Source Maps gehören dazu.
- **Schwach:** keine Typprüfung, begrenzte tiefgreifende AST-Plugins, app-spezifisches HMR braucht zusätzliche Infrastruktur. Ein natives Binary muss zur Umgebung passen; die WASM-Variante hat andere Kosten.

## Für rat und aufbau

- **Compiler und Bundler trennen:** Rats Compiler könnte JavaScript samt Source Map liefern, ein esbuild-Plugin nur Auflösung und Übersetzung von `.rat`-Dateien übernehmen (Vorschlag). Das Sprachmodell bliebe bundlerunabhängig.
- **`transform` für Script-Syntax** ersetzt keinen Parser für rats eigene Erweiterungen. `$`, Ranges oder Pipelines müssen vorher in gültiges JavaScript übersetzt sein.
- **Größen messen:** Die bestehenden Steckbriefe messen mit esbuild und gzip. Vergleichbar sind Ergebnisse nur mit festgelegten Imports, Versionen, Ziel und Minifizierung; eine Paketgröße aus npm ist keine Browsergröße.
- **Vite ist kein Synonym für esbuild:** [Vite](vite.md) 8 verwendet Rolldown und Oxc. Eine rat-Integration sollte sich an den jeweiligen Plugin-Vertrag halten und alte interne Abhängigkeiten nicht voraussetzen.

Quellen: [Überblick](https://esbuild.github.io/), [API](https://esbuild.github.io/api/), [Plugins](https://esbuild.github.io/plugins/), [Architektur](https://esbuild.github.io/faq/#why-is-esbuild-fast), [npm](https://registry.npmjs.org/esbuild/latest). Stand: 17. Oktober 2026.
