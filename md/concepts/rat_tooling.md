# RAT :: Tooling-Briefing

Wie das Tooling für RAT aussehen kann: welche Werkzeuge und Mechanismen es im JavaScript-Ökosystem gibt, was davon RAT nutzen kann, was RAT selbst bereitstellen muss, und welche Wege es für Browser und lokale Umgebungen gibt. 

Geschrieben für ehem. PHP-Fanboys ohne Framework kommt (einzelne Libs, selbstgebautes Tooling, FTP). Begriffe werden daher ausführlich erklärt, und die Lib-Dev-Themen bekommen einen eigenen Teil.

Ergänzt [esbuild.md](../webdev/libs/esbuild.md) und [vite.md](../webdev/libs/vite.md). Bezieht sich auf den Stand von `rat` im Oktober 2026 (`@rat/compiler` v0, `@rat/runtime` v0, Playground, `@rat/syntax`).

Alles unter „Konzepte“ sind Vorschläge, keine Entscheidungen.

---

## Inhalt

**Teil A: Lage**
1. [Kurzfassung](#1-kurzfassung)
2. [Was RAT heute schon hat](#2-was-rat-heute-schon-hat)

**Teil B: Briefing Ökosystem**

3. [Das mentale Modell: von PHP und FTP zu JS-Tooling](#3-das-mentale-modell-von-php-und-ftp-zu-js-tooling)
4. [Laufzeiten: Browser, Node, Deno, Bun](#4-laufzeiten-browser-node-deno-bun)
5. [Module und Auflösung: der Kern von allem](#5-module-und-auflösung-der-kern-von-allem)
6. [Pakete, Registries, CDNs](#6-pakete-registries-cdns)
7. [Transformieren, Bundeln, Dev-Server](#7-transformieren-bundeln-dev-server)
8. [Die Werkzeuglandschaft](#8-die-werkzeuglandschaft)

**Teil C: RAT**

9. [Die Schichten eines Sprach-Toolings](#9-die-schichten-eines-sprach-toolings)
10. [Was RAT selbst bereitstellen muss](#10-was-rat-selbst-bereitstellen-muss)
11. [Browser: vier Wege, `.rat` ohne Build zu laden](#11-browser-vier-wege-rat-ohne-build-zu-laden)
12. [Lokal: Bundler-Plugins und Laufzeit-Hooks](#12-lokal-bundler-plugins-und-laufzeit-hooks)
13. [Ein eigenes CLI-Paket](#13-ein-eigenes-cli-paket)
14. [Editor: Highlighting, LSP, Formatter](#14-editor-highlighting-lsp-formatter)

**Teil D: Lib-Dev**

15. [Was man als Lib-Entwickler wissen muss](#15-was-man-als-lib-entwickler-wissen-muss)
16. [Die besonderen Probleme eines Compilers mit Runtime](#16-die-besonderen-probleme-eines-compilers-mit-runtime)
17. [Repos übergreifend entwickeln: domina, aufbau, bunker, rat](#17-repos-übergreifend-entwickeln-domina-aufbau-bunker-rat)
18. [Testen, Messen, Veröffentlichen](#18-testen-messen-veröffentlichen)

**Teil E: Konzepte**

19. [Konzepte im Überblick](#19-konzepte-im-überblick)
20. [Die Konzepte im Detail](#20-die-konzepte-im-detail)
21. [Empfohlene Reihenfolge](#21-empfohlene-reihenfolge)
22. [Performance-Hinweise](#22-performance-hinweise)

---

# Teil A: Lage

## 1. Kurzfassung

- **Der Compiler ist das Produkt, alles andere sind Adapter.** `compile(source, options) → { code, css, … }` existiert und läuft überall. Jedes weitere Werkzeug (Vite-Plugin, Node-Loader, Service Worker, CLI, LSP) ist eine dünne Schale, die Dateien liest, `compile()` aufruft und das Ergebnis an der richtigen Stelle abliefert.
- **Was RAT selbst liefern muss**, kann kein Fremdwerkzeug übernehmen:
  - Compiler mit **Source Maps** und guten Fehlerpositionen;
  - Adapter für die jeweiligen Plugin-Schnittstellen;
  - eine **HMR-Regel** (was bei einer Änderung mit Zustand passiert);
  - Editor-Unterstützung (Syntax existiert, LSP nicht).
- **Was das Ökosystem liefert:** Bundling, Minifizierung, Dev-Server, Paketverwaltung, Veröffentlichung, Tests, Linting von reinem JS. Nichts davon muss RAT neu bauen.
- **Browser-first bleibt tragfähig.** Für GitHub Pages ohne Build gibt es einen sauberen Weg: einen **Service Worker**, der `.rat`-Anfragen kompiliert beantwortet. Damit funktionieren auch relative Imports zwischen `.rat`-Dateien, die mit Blob-URLs scheitern.
- **Ein CLI lohnt sich**, aber klein:
  - `rat check`, `rat build`, `rat dev`, `rat new`;
  - nur `node:`-Builtins, damit es unter Node, Deno und Bun läuft;
  - den Dev-Server selbst schreiben (wenige hundert Zeilen) oder Vite einbinden, beides möglich.
- **Mit `unplugin`** wird *ein* Plugin zu Plugins für Vite, Rolldown, Rollup, esbuild, webpack, Rspack und Bun.
- **Das größte strukturelle Thema sind nicht Werkzeuge, sondern Abhängigkeiten über Repo-Grenzen:** `rat` braucht `@domina/render`, `@aufbau/*`, `@bunker/*`. Im Browser löst das die zentrale Import Map, lokal (Node, Tests, Build) muss dieselbe Auflösung nachgebaut werden ([17](#17-repos-übergreifend-entwickeln-domina-aufbau-bunker-rat)).

---

## 2. Was RAT heute schon hat

| Baustein | Stand | Tooling-relevant |
|---|---|---|
| `@rat/compiler` | v0 | `compile()` (sync), `compileAsync()` (lädt `sass`/`ass` bei Bedarf), `CompileError` mit `line`/`column`, Abhängigkeit nur `acorn` |
| `@rat/runtime` | v0 | Signals plus `@domina/render`; wird im generierten Code als `$$` importiert (Option `runtime`) |
| `@rat/syntax` | v0 | eine Spezifikation, abgeleitet für hljs, Monaco, CodeMirror/Acode, Zed (tree-sitter), TextMate; Build per `node build.js` mit esbuild |
| Playground | v0 | kompiliert im Browser; Vorschau als iframe mit Blob-URL und der Import Map der Seite |
| Hosting | live | GitHub Pages unter `code.pulgasari.dev`; jedes Repo ein Unterpfad (`/rat/`, `/aufbau/`, …) |
| Import Map | live | `importmap.js` im Site-Repo erzeugt **eine** Map für alle Repos (mobiler Browser kann nur eine); Fremdpakete über esm.sh (`acorn` → `https://esm.sh/acorn@8`) |
| Service Worker | live (Site) | `sw.js` als klassisches Script, `importScripts('./aufbau/sw.js')`, Precache |
| Veröffentlichung | live (js-packages) | GitHub Action veröffentlicht `@pulgasari/*` per OIDC auf JSR |
| Geplant | | `@rat/vite`, `@rat/esbuild`, `@rat/node` als Adapter; Source Maps; Scope-Analyse; `rat new/check/build` (ideas 2.14); SW-Loader (ideas 3) |

Die Architektur ist also bereits richtig geschnitten: Ein reiner, synchroner Compiler ohne Dateisystemzugriff ist die beste Voraussetzung für alle Adapter.

---

# Teil B: Briefing Ökosystem

## 3. Das mentale Modell: von PHP und FTP zu JS-Tooling

### Was sich verschiebt

In der klassischen PHP-Welt ist der Server die Laufzeit: Dateien werden per FTP hochgeladen, der Server führt sie bei jeder Anfrage aus. Es gibt keinen Schritt zwischen „Datei speichern“ und „Datei läuft“.

Im Frontend-JS ist die Laufzeit der **Browser des Besuchers**, und der Server liefert nur Dateien aus (statisches Hosting wie GitHub Pages). Dazwischen kann ein **Build-Schritt** liegen, der den Quellcode vor dem Hochladen umformt: Sprache übersetzen, Dateien zusammenfassen, verkleinern.

```
PHP:      editor ──ftp──▶ server (php läuft hier) ──html──▶ browser

JS ohne Build:
          editor ──git push──▶ github pages (liefert nur aus) ──.js──▶ browser (js läuft hier)

JS mit Build:
          editor ──▶ build (lokal oder ci) ──▶ dist/ ──deploy──▶ hosting ──▶ browser
```

RAT hat eine eigene Sprache (`.rat`). Ein Browser versteht sie nicht, also muss sie **irgendwo** zu JavaScript werden: im Browser selbst (heute im Playground), in einem Service Worker, auf dem eigenen Rechner oder in einer GitHub Action. Die gesamte Tooling-Frage ist im Kern die Frage: **Wo findet diese Übersetzung statt, und wer löst die Imports auf?**

### Übersetzungstabelle

Ausgangspunkt ist PHP ohne Framework: einzelne Libs per Hand heruntergeladen und per `require` eingebunden, Tooling rundherum selbst gebaut.

| Selbstgebautes PHP | JS-Welt | Anmerkung |
|---|---|---|
| `php datei.php` auf der Kommandozeile | `node`, `deno`, `bun` | JS außerhalb des Browsers ausführen |
| Lib-ZIP herunterladen, in einen `lib/`-Ordner entpacken | **Paketmanager**: npm, pnpm, yarn, bun, deno | erledigt Download, Ablage und Abhängigkeiten der Lib automatisch |
| Projektseite oder GitHub der Lib | **Registry**: npm Registry, JSR | zentrales Verzeichnis, aus dem der Paketmanager lädt |
| Notiz, welche Lib in welcher Version im Projekt steckt | **Manifest**: `package.json`, `deno.json`, `jsr.json` | maschinenlesbare Liste der Abhängigkeiten plus Metadaten der eigenen Lib |
| „genau diese ZIP-Version liegt bei mir“ | **Lockfile**: `package-lock.json`, `bun.lock`, `deno.lock` | exakte Versionen aller Abhängigkeiten, auch der indirekten |
| `lib/`-Ordner | `node_modules/` | installierte Pakete; wird nicht committet, sondern aus Manifest und Lockfile wiederhergestellt |
| `require __DIR__ . '/lib/latte/latte.php'` | `import { x } from 'latte'` | der Name statt eines Pfades; eine Regel bestimmt, welche Datei gemeint ist ([5](#5-module-und-auflösung-der-kern-von-allem)) |
| eigener Autoloader (`spl_autoload_register`) | Modulauflösung: Import Maps, `exports`, Loader-Hooks | wie ein Name zu einer Datei wird |
| **Latte standalone mit Temp-Verzeichnis** | **Compiler** (`.rat` → `.js`) plus Cache | siehe unten |
| eigenes `tools.php` mit Funktionen für Projektaufgaben | eigenes CLI (`rat …`) | |
| FTP-Upload | `git push` + Pages, oder CI-Deploy | |
| Cache-Ordner leeren | Cache-Busting über Dateinamen-Hashes, Service-Worker-Update | |

Die Parallele zu **Latte** trägt weit. Latte standalone (`new Latte\Engine`, `setTempDirectory()`) kompiliert eine `.latte`-Datei beim ersten Aufruf zu einer PHP-Klasse, legt sie im Temp-Ordner ab und nutzt danach nur noch diese Datei, bis sich die Vorlage ändert. RAT macht dasselbe mit `.rat` → `.js`. Offen ist nur der Ort:
- im Browser (Service Worker als „Server im Browser“, mit Cache als Temp-Ordner);
- vorab auf dem eigenen Rechner;
- in einer GitHub Action.

`@for … @else` in RAT stammt ja schon aus Latte (`{foreach}…{else}`).

### Selbstgebautes Tooling ist hier kein Nachteil

Die großen JS-Apparate (Vite-Projekte mit Dutzenden Plugins, Framework-Starter, Monorepo-Werkzeuge) sind genauso überfordernd wie ein Symfony-Setup und für RAT zum größten Teil unnötig. Dein bestehendes Setup ist im Kern schon die JS-Variante deines PHP-Stils:

- **eine Import Map statt Paketmanager:** Namen werden direkt auf Dateien oder esm.sh-URLs abgebildet, kein `node_modules`, kein Installationsschritt;
- **GitHub Pages statt FTP:** Push und fertig;
- **eigene kleine Werkzeuge:** `importmap.js`, `sw.js` und das Build-Script von `@rat/syntax`.

Dieses Briefing behält diese Linie: Es empfiehlt kleine, eigene Werkzeuge mit wenigen oder keinen Abhängigkeiten (eigenes CLI, eigener Dev-Server, Service Worker) und nennt die großen Werkzeuge vor allem dort, wo *andere* RAT nutzen wollen (Vite-Plugin) oder wo sie Arbeit abnehmen, die man nicht selbst machen sollte (esbuild für Bundling und Minifizierung). Paketmanager und Registries werden erst relevant, wenn RAT-Pakete veröffentlicht oder Werkzeuge wie Vite eingebunden werden.

---

## 4. Laufzeiten: Browser, Node, Deno, Bun

| | Browser | Node | Deno | Bun |
|---|---|---|---|---|
| Wofür | Ausführung der App | Tooling, Server, CLIs, Tests | wie Node, mit eingebautem Tooling | wie Node, auf Tempo optimiert |
| Module | ESM, Import Maps | ESM und CommonJS, `node_modules`, `exports` | ESM, `jsr:`/`npm:`-Specifier, `deno.json`-Imports, Import-Map-Datei | ESM und CJS, `node_modules`, eigene Plugins |
| Paketmanager | keiner | npm (dabei), pnpm, yarn | eingebaut (`deno add`) | eingebaut (`bun add`) |
| Eingebaut | DOM, Fetch, Service Worker | `node:test`, `node:fs`, `fs.watch`, `util.parseArgs`, `fs.glob` | Formatter, Linter, Test, Bench, Doc, `deno compile`, `deno bundle` | Bundler, Test-Runner, `bun build --compile` |
| Eigene Dateitypen laden | Service Worker oder Blob-URL | **Module Hooks** (`module.registerHooks`) | **keine Loader-Hooks**: vorher kompilieren oder bundeln | **`Bun.plugin`**, auch zur Laufzeit |
| TypeScript | nein | Typen entfernen (Type Stripping, ab 22.18/23.6 ohne Flag) | ja | ja |

**Node** ist der Standard für Tooling: Fast jedes Werkzeug (Vite, esbuild-Wrapper, Prettier, ESLint) setzt es voraus. Aktuell sind die LTS-Linien 22 und 24 relevant.

**Deno** ist interessant, weil es ohne Konfiguration Formatter, Linter, Tests, Doku und das Erzeugen von Einzel-Binaries mitbringt und JSR-nativ ist. Für RAT problematisch: **Deno erlaubt keine eigenen Loader.** `import './card.rat'` funktioniert in Deno nur, wenn vorher kompiliert wurde. `npm:`-Pakete wie Vite laufen aber unter Deno (`deno run -A npm:vite`).

**Bun** erlaubt eigene Loader über Plugins am elegantesten: `Bun.plugin({ setup (build) { build.onLoad(…) } })` gilt für den Bundler **und** die Laufzeit. Ein `bunfig.toml` mit `preload` aktiviert das projektweit.

Alle drei können `node:`-Module importieren (`node:fs`, `node:http`, `node:util`). Ein CLI, das nur `node:`-Builtins nutzt, läuft daher überall.

---

## 5. Module und Auflösung: der Kern von allem

### ESM

```js
import { signal } from '@rat/runtime';   // bare specifier
import Card       from './card.rat';     // relativ
import confetti   from 'https://esm.sh/canvas-confetti@1';   // url
```

- **ES-Module** sind der Standard: `import`/`export`, statisch analysierbar, asynchron geladen, einmal ausgeführt pro URL.
- **CommonJS** (`require`, `module.exports`) ist Nodes Altformat. Für eine neue, browserorientierte Lib irrelevant, außer beim Konsumieren alter Pakete.
- **Die Identität eines Moduls ist seine aufgelöste URL.** Zwei verschiedene URLs zum selben Code ergeben zwei Instanzen, zwei Signal-Graphen. Siehe [16](#16-die-besonderen-probleme-eines-compilers-mit-runtime).

### Wer löst `@rat/runtime` auf?

Ein „bare specifier“ (`@rat/runtime`, `acorn`) ist kein Pfad. Jede Umgebung braucht eine Regel, wie daraus eine Datei wird:

| Umgebung | Mechanismus |
|---|---|
| Browser | **Import Map** (`<script type="importmap">`), sonst Fehler |
| Node | Suche in `node_modules/` aufwärts, dann `package.json` → `exports` |
| Deno | `deno.json` → `imports`, oder eine Import-Map-Datei, oder `jsr:`/`npm:`-Präfix |
| Bun | wie Node, plus `tsconfig`-Pfade |
| Bundler (Vite, esbuild) | wie Node, plus Aliase und Plugins |
| Service Worker, Web Worker | **keine Import Maps**; nur URLs bzw. `importScripts` |

**Das ist der wichtigste Punkt des ganzen Briefings:** Dein Setup löst heute alles über **eine Browser-Import-Map** auf. Jede andere Umgebung (Node-Tests, Build, CLI, Service Worker) kennt diese Map nicht. Entweder stellt man dort dieselbe Auflösung her, oder es entstehen zwei Wahrheiten. Konzept [K4](#k4-ratnode) und [17](#17-repos-übergreifend-entwickeln-domina-aufbau-bunker-rat) behandeln das.

### `package.json` `exports`

```json
{
  "name"    : "@rat/runtime",
  "type"    : "module",
  "exports" : {
    "."         : { "types": "./index.d.ts", "development": "./dev.js", "default": "./index.js" },
    "./signals" : "./signals.js"
  }
}
```

- `exports` ist die **öffentliche Oberfläche**: Nur diese Pfade sind importierbar, alles andere ist privat.
- **Conditions** wählen je nach Umgebung: `types`, `import`, `require`, `browser`, `node`, `deno`, `development`, `production`, `default`. Die erste passende Bedingung in der Reihenfolge gewinnt, `default` gehört ans Ende. Vite setzt `development` im Dev-Modus und `production` im Build. Damit kann die Runtime eine Dev-Variante mit Devtools-Hooks und Warnungen ausliefern, ohne die Produktion zu belasten.
- **`imports`** (mit `#`) sind paketinterne Aliase: `import { x } from '#shared'`.

---

## 6. Pakete, Registries, CDNs

### npm-Registry und JSR

| | npm | JSR |
|---|---|---|
| Seit | 2010 | 2024 (von Deno, offen für alle Laufzeiten) |
| Format | beliebig, JS, auch CJS | ESM-only, Quelltext (JS oder TS) |
| Manifest | `package.json` | `jsr.json` oder `deno.json` |
| Typen | separat (`.d.ts`, `types`-Feld) | aus TS-Quelle oder `@ts-self-types`; generiert Doku automatisch |
| Veröffentlichen | `npm publish` (Token oder OIDC, Provenance optional) | `npx jsr publish` / `deno publish`, OIDC aus GitHub Actions ohne Token |
| Nutzung in Node | direkt | `npx jsr add @scope/pkg` (über npm-Kompatibilitätsschicht) |
| Im Browser | über CDN | über CDN (`esm.sh/jsr/@scope/pkg`) |

Du nutzt JSR bereits für `@pulgasari/*`. Für `@rat/*` ist JSR naheliegend, weil es JS-Quellen mit `index.d.ts` direkt akzeptiert und Dokumentation erzeugt. Der Scope `@rat` müsste auf JSR frei sein; sonst unter `@pulgasari/rat-*`, oder ein eigener Scope.

**Doppelt veröffentlichen** (npm und JSR) ist üblich, wenn Werkzeuge wie Vite-Plugins npm-Pakete erwarten. Ein Vite-Plugin wird von Vite-Nutzern per `npm i -D` installiert; das geht auch aus JSR, ist aber ungewohnt.

### CDNs

| CDN | Was es tut |
|---|---|
| **esm.sh** | baut npm- und JSR-Pakete on demand in **Browser-ESM** um, löst deren Abhängigkeiten zu weiteren esm.sh-URLs auf. Optionen: `?bundle`, `?deps=`, `?external=`, `?dev`, `?target=` |
| jsDelivr | liefert Dateien aus npm und GitHub unverändert; `/+esm` baut ESM |
| unpkg | liefert Dateien aus npm unverändert |

Wichtig für eine Framework-Runtime: Lädt eine Komponente `@rat/runtime` von esm.sh und eine andere von `code.pulgasari.dev`, laufen **zwei Runtimes**. esm.sh bietet `?external=@rat/runtime`, damit ein Paket die Runtime **nicht** selbst einbindet, sondern über die Import Map der Seite bezieht.

### Semver und Versionsbereiche

- `1.4.2` = Major.Minor.Patch. `^1.4.2` erlaubt `1.x.x` ab `1.4.2`, `~1.4.2` erlaubt `1.4.x`.
- **Unter `0.x` gilt jede Minor-Version als potenziell inkompatibel:** `^0.3.1` erlaubt nur `0.3.x`. Für RAT ist das gut: `0.x` signalisiert Instabilität korrekt.

### Lockfiles

Ein Lockfile hält die **exakt** aufgelösten Versionen fest. Ohne Lockfile installiert jeder Rechner und jede CI-Run potenziell andere Versionen. Lockfiles gehören für **Apps** ins Repo, für **Libs** ebenfalls (für CI und Reproduzierbarkeit), werden aber nicht mit veröffentlicht.

---

## 7. Transformieren, Bundeln, Dev-Server

| Begriff | Bedeutung |
|---|---|
| **Transformieren** | eine Datei in eine andere übersetzen (`.rat` → `.js`, TS → JS, neue Syntax → alte). Kennt nur die eine Datei. |
| **Bundeln** | dem Import-Graphen folgen und viele Module zu wenigen Dateien zusammenfügen |
| **Tree Shaking** | ungenutzte Exporte beim Bundeln entfernen; braucht statische ESM-Imports und `sideEffects: false` |
| **Code Splitting** | ein Bundle in Teile zerlegen, die bei Bedarf geladen werden (`import()`) |
| **Minifizieren** | Leerzeichen, lange Namen und toten Code entfernen |
| **Target** | welche JS-Version das Ergebnis haben darf (`es2022`); höhere Syntax wird heruntergebrochen. Keine Polyfills für fehlende APIs. |
| **Source Map** | eine JSON-Datei, die Positionen im erzeugten Code auf Positionen in der Quelle abbildet. Devtools zeigen dann `card.rat:12` statt `card.js:87`. |
| **Dev-Server** | lokaler HTTP-Server, der Dateien beim Anfordern transformiert; kein Bundle nötig |
| **HMR** (Hot Module Replacement) | geänderte Module im laufenden Browser austauschen, ohne Seiten-Reload |
| **Live Reload** | bei Änderung die Seite komplett neu laden; der einfache Bruder von HMR |
| **Asset-Hashing** | `app.3f9a1c.js` statt `app.js`: Dateiname ändert sich mit dem Inhalt, Browser-Cache kann ewig gelten |

**Braucht man Bundling noch?** Für Entwicklung nicht: Browser laden ESM nativ, HTTP/2 verträgt viele Dateien. Für Produktion spricht weiter einiges dafür: Tiefe Import-Ketten erzeugen **Wasserfälle** (der Browser entdeckt Modul 4 erst, wenn Modul 3 geladen und geparst ist). Dein Service Worker mit Precache und `modulepreload` mildert genau das. Siehe [22](#22-performance-hinweise).

---

## 8. Die Werkzeuglandschaft

Was es gibt, gruppiert nach Aufgabe. **Fett** markiert, was für RAT konkret in Frage kommt.

### Bundler, Transformer, Build-Werkzeuge

| Werkzeug | Was | Für RAT |
|---|---|---|
| **esbuild** | Bundler und Transformer in Go, sehr schnell, kleine API, WASM-Variante für den Browser | Plugin-Ziel; **esbuild-wasm** für Builds im Browser; schon im Einsatz für `@rat/syntax` |
| **Vite** | Dev-Server und Build, ab 8 auf Rolldown und Oxc | wichtigstes Plugin-Ziel für Nutzer |
| **Rolldown** | Rollup-kompatibler Bundler in Rust, Basis von Vite 8 | über die Rollup-Plugin-API mit abgedeckt |
| Rollup | der ältere JS-Bundler mit der „Standard“-Plugin-API | Plugin-API ist das De-facto-Format, dem Vite folgt |
| Oxc | Rust-Toolchain: Parser, Transformer, Minifier, Linter (`oxlint`), Resolver | als Resolver oder Linter interessant |
| SWC, Babel | Transformer (Rust bzw. JS) | nicht nötig; RAT hat eigenen Compiler |
| webpack, Rspack | große, konfigurationsreiche Bundler | nur über unplugin mitnehmen |
| Parcel | Zero-Config-Bundler | ignorieren |
| **unplugin** | schreibt *ein* Plugin für Vite, Rollup, Rolldown, esbuild, webpack, Rspack, Farm, Bun | **ein Adapter für alle** ([K2](#k2-ratunplugin)) |
| tsdown, tsup, unbuild | Lib-Build-Wrapper um Rolldown/esbuild | unnötig, solange RAT-Pakete Quelltext ausliefern |

### Laufzeit-Integrationen

| Mechanismus | Umgebung |
|---|---|
| **`module.registerHooks`** (sync) / `module.register` (async) | Node: `resolve`- und `load`-Hooks für eigene Dateitypen und Import-Map-Auflösung |
| **`Bun.plugin`** | Bun: Laufzeit und Bundler |
| **Service Worker** | Browser: Anfragen abfangen und beantworten |
| Import Maps | Browser: Bare Specifier auflösen |
| `deno bundle` | Deno: bundelt (intern esbuild), aber ohne Plugins für fremde Dateitypen |

### Qualität

| Werkzeug | Was | Für RAT |
|---|---|---|
| Prettier | Formatter, Plugin-API für eigene Sprachen | `prettier-plugin-rat` denkbar, aufwändig |
| dprint | Formatter-Plattform, Plugins als WASM | Alternative zu Prettier |
| Biome | Formatter und Linter in Rust | keine Plugins für fremde Sprachen |
| ESLint | Linter; „processors“ extrahieren JS aus anderen Dateien | `.rat`-Scripts linten über einen Processor möglich |
| oxlint | sehr schneller Linter | für die JS-Pakete selbst |
| `deno fmt`, `deno lint` | eingebaut, null Konfiguration | **für die Pakete selbst die einfachste Wahl** |
| **`tsc --noEmit`** | Typprüfung, auch für JS mit `checkJs` gegen `.d.ts` | prüft, ob `index.d.ts` zur Implementierung passt |
| **publint** | prüft `package.json`-Felder und `exports` auf Fehler | vor jeder Veröffentlichung |
| **are-the-types-wrong** (`attw`) | prüft, ob Typen in allen Auflösungsmodi gefunden werden | dito |

### Tests und Messen

| Werkzeug | Was |
|---|---|
| **`node:test`**, `deno test`, `bun test` | eingebaute Test-Runner, ohne Abhängigkeit |
| Vitest | Test-Runner auf Vite-Basis, nutzt Vite-Plugins (`.rat` direkt testbar), **Browser-Modus** mit echtem Browser |
| happy-dom, linkedom, jsdom | DOM-Nachbildung in Node; schnell, aber nicht vollständig |
| **Playwright** | echter Browser (Chromium, Firefox, WebKit), skriptgesteuert |
| mitata, tinybench | Benchmarks |
| **size-limit** | Bundle-Größen als Grenzwert in CI |

### Editor

| Werkzeug | Was |
|---|---|
| TextMate-Grammatiken | Highlighting in VS Code, Shiki, GitHub (Linguist) |
| tree-sitter | inkrementeller Parser für Highlighting, Folding, Struktur (Zed, Neovim, Helix) |
| **LSP** (Language Server Protocol) | ein Server liefert Diagnosen, Vervollständigung, Hover, Go-to-Definition an jeden Editor |
| **Volar** | Framework für Language Server von Template-Sprachen (Vue, Astro, MDX nutzen es): bildet eingebettetes JS/TS auf virtuellen Code ab, damit der TS-Server es versteht |

### Veröffentlichung und Versionierung

| Werkzeug | Was |
|---|---|
| `npm publish`, `jsr publish` | veröffentlichen |
| Changesets | Versionierung und Changelogs in Monorepos über kleine Markdown-Dateien pro Änderung |
| GitHub Actions | CI und Deploy, OIDC-Veröffentlichung ohne Tokens |

---

# Teil C: RAT

## 9. Die Schichten eines Sprach-Toolings

Ein Framework mit eigener Sprache braucht dieselben Schichten wie Svelte, Vue oder Astro. Nur die unterste ist wirklich „die Sprache“.

```
 L7  scaffolding        create-rat, rat new                       klein
 L6  docs, playground   docs-site, playground mit mehreren dateien vorhanden (v0)
 L5  test-hilfen        mount(), compiler-golden-files            klein
 L4  devtools           signal-graph, komponentenbaum             mittel
 L3  editor             syntax ✓, lsp, formatter                  groß (lsp)
 L2  cli                check, build, dev, new                    klein bis mittel
 L1  integrationen      browser-loader, sw, vite, esbuild, node   je klein
 L0  compiler-api       compile(), source maps, fehler, analyse   vorhanden, maps fehlen
```

**Regel:** Alles ab L1 ruft nur L0 auf. Keine Schicht enthält eigene Parser- oder Codegen-Logik. Bekommt eine Schicht etwas nicht aus `compile()` heraus, ist das ein fehlendes Feature von L0, nicht ein Workaround in L1.

### Was L0 dafür liefern muss

| Fähigkeit | Wer braucht es | Stand |
|---|---|---|
| `code` | alle | ✓ |
| `css` getrennt | Bundler (CSS-Extraktion), SSR | ✓ |
| **`map`** (Source Map v3) | Bundler, Devtools, Fehlermeldungen | fehlt; die Edit-Liste enthält die Information bereits |
| **`imports`** (Liste der Abhängigkeiten) | HMR, Watch, Service Worker (Precache), Graph-Analyse | aus dem acorn-AST billig ableitbar |
| `CompileError` mit Position und Code-Frame | CLI, Overlay, LSP | ✓ Position; Code-Frame als Hilfsfunktion |
| **`warnings`** (nicht fatal) | CLI, LSP | fehlt: unbekannte `$`-Namen, Shadowing, statische Holes |
| `filename` → stabile Komponenten-ID | HMR, Scoping-Hash | Hash existiert für `<style>`; als `id` exportieren |
| `hmr: true` | Dev-Server | Codegen-Zusatz, siehe [K2](#k2-ratunplugin) |
| `ssr` | später | geplant |
| Positionen der eingebetteten Scripts | LSP (virtuelle Dateien) | im AST vorhanden |

---

## 10. Was RAT selbst bereitstellen muss

| Aufgabe | Ökosystem | RAT selbst |
|---|---|---|
| `.rat` → JS | | **Compiler** |
| Source Maps erzeugen | Bibliotheken (`@jridgewell/gen-mapping`, `magic-string`) | **Positionsbuchhaltung im Compiler**; Kodierung kann eine Lib übernehmen |
| Bundeln, Minifizieren, Hashing | esbuild, Vite, Rolldown | Plugin, das `.rat` beisteuert |
| Dev-Server | Vite, oder `node:http` | Plugin, oder eigener kleiner Server |
| **HMR-Verhalten** | Vites `import.meta.hot` | **was mit Signals, Scopes, DOM passiert** |
| `.rat` in Node laden (Tests, SSR, Scripts) | `module.registerHooks` | **Hook-Modul** |
| `.rat` im Browser ohne Build | Service Worker, Import Maps | **Loader / SW-Modul** |
| Import-Map-Auflösung außerhalb des Browsers | `@jspm/import-map`, oder selbst (klein) | Anbindung |
| Highlighting | TextMate, tree-sitter, hljs, … | ✓ `@rat/syntax` |
| Diagnosen und Completion im Editor | LSP-Bibliotheken, Volar | **Language Server** |
| Formatieren von `.rat` | Prettier-Plugin-API, dprint | **Formatter**, falls gewünscht |
| JS in `<script>` linten | ESLint-Processor | Processor (klein) |
| Paketmanagement, Veröffentlichung | npm, JSR, Actions | Konfiguration |
| Tests ausführen | `node:test`, Vitest, Playwright | `mount()`-Hilfe, Golden Files |
| Typprüfung von Nutzer-Code | `tsc` | optional über LSP; RAT setzt auf Laufzeit-Schemas statt TS |
| Devtools | | **Hooks in der Runtime** und ein Panel (`@aufbau/devtools`) |

Kurz: **Alles, was die Sprache versteht, ist eigene Arbeit. Alles, was Dateien bewegt, nicht.**

---

## 11. Browser: vier Wege, `.rat` ohne Build zu laden

Browser-first heißt: Eine Seite auf GitHub Pages soll `.rat`-Dateien nutzen können, ohne dass vorher etwas gebaut wurde. Es gibt vier Mechanismen, mit verschiedenen Grenzen.

### W1: Blob-URL-Loader (heute im Playground)

```js
import { compile } from '@rat/compiler';

export async function load (url) {
  const source = await (await fetch(url)).text();
  const { code } = compile(source, { filename: url });
  return import(URL.createObjectURL(new Blob([code + `\n//# sourceURL=${url}`], { type: 'text/javascript' })));
}
```

- **Grenze:** Ein Modul mit Blob-URL hat keine sinnvolle Basis-URL. **Relative Imports darin (`./item.rat`) schlagen fehl.** Bare Specifier funktionieren über die Import Map der Seite.
- Lösung: Der Loader schreibt relative Imports vor dem Erzeugen der Blob-URL um. `./item.rat` wird dabei rekursiv selbst geladen und durch seine Blob-URL ersetzt, `./util.js` durch die absolute URL. Dafür braucht der Compiler die `imports`-Liste mit Positionen (siehe [9](#9-die-schichten-eines-sprach-toolings)).
- `//# sourceURL=` lässt das Modul in den Devtools unter seinem echten Namen erscheinen. Mit einer Inline-Source-Map (`//# sourceMappingURL=data:…`) zeigen Devtools sogar die `.rat`-Quelle.
- **Kosten:** Compiler plus acorn im Seiten-Bundle, Kompilierung bei jedem Laden (cachebar).

### W2: `<script type="text/rat">` (Auto-Loader)

```html
<script type="module" src="https://code.pulgasari.dev/rat/packages/browser/auto.js"></script>
<script type="text/rat" src="./app.rat" data-mount="#app"></script>
```

Wie Babel Standalone: Ein Script sucht nach dem Laden alle `text/rat`-Elemente, kompiliert sie über W1 und mountet sie. Bequem für Demos, Codepen-artige Seiten und den „Einstiegsdrogen“-Fall. Gleiche Grenzen wie W1.

### W3: Service Worker (empfohlen für echte Seiten ohne Build)

```
browser ─ import './card.rat' ─▶ service worker ─ fetch card.rat ─▶ github pages
                                      │
                                      ├─ compile() → js
                                      ├─ cache (cache api, schlüssel: url + etag/hash)
                                      ▼
browser ◀─ content-type: text/javascript ─┘
```

- **Relative Imports funktionieren nativ**, weil das Modul seine echte URL behält. `./item.rat` geht wieder durch den Worker. Das ist der entscheidende Vorteil gegenüber W1.
- Bare Specifier im kompilierten Code (`@rat/runtime`) löst weiterhin die Import Map der Seite auf. Der Worker liefert nur Quelltext aus.
- **Blocker** (in ideas.md schon erkannt): Service Worker haben **keine Import Maps** und sollen bei dir klassisch registriert werden (`importScripts`). Der Compiler mit `import 'acorn'` lädt dort nicht. Lösung: Der Compiler wird zu **einer klassischen Datei** gebündelt (`esbuild --bundle --format=iife --global-name=ratCompiler`), mit acorn darin, und per `importScripts('./rat/dist/compiler.sw.js')` geladen. Das ist derselbe Weg, auf dem schon das Acode-Plugin gebaut wird.
- Einbindung in deinen bestehenden `sw.js`:
  ```js
  importScripts('./aufbau/sw.js', './rat/dist/rat-sw.js');

  aufbauServiceWorker({ precache: [ … ] });
  ratServiceWorker({ match: /\.rat(\.js)?$/, cache: 'rat-v1' });
  ```
  `rat-sw.js` registriert einen eigenen `fetch`-Listener. Wichtig ist die Reihenfolge: Der RAT-Listener muss `.rat`-Anfragen per `event.respondWith` übernehmen, bevor ein allgemeiner Cache-Listener sie beantwortet.
- **Erstes Laden:** Beim allerersten Besuch ist der Worker noch nicht aktiv. Die Seite muss warten, bis `navigator.serviceWorker.controller` gesetzt ist (Worker mit `clients.claim()`), und erst dann die App importieren. Sonst gehen die ersten `.rat`-Anfragen am Worker vorbei an GitHub Pages und kommen als `text/plain` zurück.
  ```js
  await navigator.serviceWorker.register('/sw.js');
  if (!navigator.serviceWorker.controller) await new Promise(done => navigator.serviceWorker.addEventListener('controllerchange', done, { once: true }));
  await import('./app.rat');
  ```
- **Fehler:** Bei einem `CompileError` antwortet der Worker mit einem Modul, das den Fehler mit Code-Frame wirft und ein Overlay zeigt, statt einem 500er.
- **Cache-Schlüssel:** URL plus Hash des Quelltexts, plus Compiler-Version. Sonst bleibt nach einem Compiler-Update veralteter Output im Cache.
- **CSS:** Der Worker kann `css` aus dem Ergebnis entweder als `adoptedStyleSheets`-Code ins Modul einbetten (einfach, heute vermutlich schon so) oder unter `card.rat?css` separat ausliefern.

### W4: Vorkompiliert ausliefern

`.rat` wird vor dem Deploy zu `.js` (CLI, GitHub Action). Der Browser lädt normales JS. Das ist der schnellste Weg für Besucher und unabhängig von Service-Worker-Eigenheiten. Siehe [K6](#k6-precompile-in-github-actions).

### Vergleich

| | relative `.rat`-Imports | Compiler im Client | erste Ladezeit | Setup |
|---|---|---|---|---|
| W1 Blob-Loader | nur mit Umschreiben | ja | langsam | trivial |
| W2 `text/rat` | wie W1 | ja | langsam | trivial |
| W3 Service Worker | **nativ** | im Worker | langsam beim 1. Mal, danach Cache | mittel |
| W4 vorkompiliert | nativ | nein | **schnell** | Build nötig |

Sinnvoll ist eine **Kombination**: W3 für Entwicklung und Demos direkt auf Pages, W4 für Seiten, auf die es ankommt. Beide nutzen denselben Compiler.

---

## 12. Lokal: Bundler-Plugins und Laufzeit-Hooks

### esbuild-Plugin

```js
// @rat/esbuild
import { readFile } from 'node:fs/promises';
import { compile }  from '@rat/compiler';

export function rat (options = {}) {
  return {
    name: 'rat',
    setup (build) {
      build.onLoad({ filter: /\.rat(\.js)?$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8');
        try {
          const { code, map } = compile(source, { ...options, filename: path });
          return { contents: map ? `${code}\n//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(map))}` : code, loader: 'js' };
        } catch (error) {
          if (!error.line) throw error;
          return { errors: [{ text: error.reason, location: { file: path, line: error.line, column: error.column - 1, lineText: source.split('\n')[error.line - 1] } }] };
        }
      });
    },
  };
}
```

- `filter` als Regex wird in Go ausgewertet. Nur Treffer kosten einen Aufruf in JS.
- `.rat.js` endet auf `.js` und würde sonst von esbuild als normales JS geladen. Der Filter `/\.rat(\.js)?$/` fängt es vorher ab.
- Fehler im esbuild-Format erscheinen mit Code-Frame im Terminal. esbuild zählt Spalten 0-basiert.
- **Läuft auch im Browser:** `esbuild-wasm` hat dieselbe Plugin-API. Damit ist ein **Build im Browser** möglich ([K10](#k10-build-im-browser)).

### Vite-Plugin

```js
// @rat/vite
import { compile } from '@rat/compiler';

const RAT = /\.rat(\.js)?$/;

export function rat (options = {}) {
  let dev = false;
  return {
    name    : 'rat',
    enforce : 'pre',
    configResolved (config) { dev = config.command === 'serve'; },
    transform (source, id) {
      if (!RAT.test(id.split('?')[0])) return;
      const { code, map } = compile(source, { ...options, filename: id, hmr: dev });
      return { code, map };
    },
  };
}
```

- `enforce: 'pre'` läuft vor Vites eigenen Transformationen.
- Vite reicht den `map` durch und verkettet ihn mit späteren Schritten.
- `CompileError` mit `loc` (`{ file, line, column }`) zeigt Vite in seinem Fehler-Overlay im Browser an.
- **HMR** ist der eigentliche Aufwand:
  - **Stufe 1, Full Reload:** nichts tun. Vite lädt die Seite neu, wenn kein Modul die Änderung akzeptiert.
  - **Stufe 2, Remount:** Der Compiler hängt im Dev-Modus an:
    ```js
    if (import.meta.hot) import.meta.hot.accept(next => $$.hmr.replace(id, next.default));
    ```
    Die Runtime führt eine Registry: Komponenten-ID → lebende Instanzen (Scope plus Wurzelknoten). `replace` entsorgt jeden Scope und rendert mit der neuen Funktion an derselben Stelle. Lokaler Zustand geht verloren, Modulzustand (`<script module>`-Signals) auch, weil das Modul neu ausgeführt wird.
  - **Stufe 3, Zustand erhalten:** Signals mit stabilem Schlüssel (Komponenten-ID plus Name) in `import.meta.hot.data` ablegen und beim Neuaufbau wiederverwenden, solange Name und Initialwert-Ausdruck gleich bleiben. So arbeitet Svelte; aufwändig und fehleranfällig. Stufe 2 reicht lange.
  - **Nur-CSS-Änderung:** Wird `<style>` als eigenes virtuelles Modul (`card.rat?style`) ausgegeben, tauscht Vite das CSS ohne Remount.

### unplugin: einmal schreiben, überall nutzen

```js
// @rat/unplugin
import { createUnplugin } from 'unplugin';
import { compile }        from '@rat/compiler';

export const unplugin = createUnplugin((options = {}) => ({
  name             : 'rat',
  enforce          : 'pre',
  transformInclude : id => /\.rat(\.js)?$/.test(id),
  transform (source, id) { return compile(source, { ...options, filename: id }); },
}));

export const esbuild  = unplugin.esbuild;
export const rolldown = unplugin.rolldown;
export const rollup   = unplugin.rollup;
export const vite     = unplugin.vite;
export const webpack  = unplugin.webpack;
```

- Eine Abhängigkeit (`unplugin`), dafür alle Bundler.
- Spezialfälle wie Vite-HMR ergänzt man über das Feld `vite: { … }` im selben Objekt.

### Node: Module Hooks

```js
// @rat/node/register.js
import { registerHooks } from 'node:module';
import { readFileSync }  from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile }       from '@rat/compiler';

registerHooks({
  load (url, context, nextLoad) {
    if (!/\.rat(\.js)?$/.test(url)) return nextLoad(url, context);
    const { code } = compile(readFileSync(fileURLToPath(url), 'utf8'), { filename: url });
    return { format: 'module', source: code, shortCircuit: true };
  },
});
```

```sh
node --import @rat/node/register app.js
node --import @rat/node/register --test
```

- `registerHooks` ist synchron und läuft im selben Thread (Node 22.15+ und 23.5+). Das ältere `module.register` läuft in einem eigenen Thread und ist asynchron.
- Ein zusätzlicher **`resolve`-Hook** kann eine Import Map lesen und Bare Specifier auflösen ([K4](#k4-ratnode)). Dann laufen dieselben Importe wie im Browser auch in Node.
- Wofür: **Tests**, SSR, Scripts, CLI-Befehle, die Komponenten ausführen (z. B. statische Seiten vorrendern).
- **Kein DOM in Node.** Komponenten brauchen für Tests happy-dom oder linkedom (global registriert), oder man testet im echten Browser.

### Bun

```js
// @rat/bun
import { plugin } from 'bun';
import { compile } from '@rat/compiler';

plugin({
  name: 'rat',
  setup (build) {
    build.onLoad({ filter: /\.rat(\.js)?$/ }, async ({ path }) => ({ contents: compile(await Bun.file(path).text(), { filename: path }).code, loader: 'js' }));
  },
});
```

`bunfig.toml`: `preload = ["@rat/bun"]`. Gilt dann für `bun run`, `bun test` und `bun build`. unplugin deckt den Bundler-Teil ebenfalls ab.

### Deno

Kein Loader-Hook. Optionen:

1. **Vite unter Deno:** `deno run -A npm:vite` mit `@rat/vite`. Funktioniert, weil Vite npm-kompatibel ist.
2. **Vorkompilieren:** `rat build --out .rat-cache/` und aus Deno die `.js`-Dateien importieren.
3. **esbuild aus Deno** mit dem RAT-Plugin bundeln (`npm:esbuild` oder `jsr:@luca/esbuild-deno-loader` für Deno-Auflösung).

Deno ist damit für RAT eher **Werkzeug-Host** (fmt, lint, test der Pakete selbst, JSR-Publish) als Laufzeit für `.rat`-Code.

---

## 13. Ein eigenes CLI-Paket

### Lohnt es sich?

Ja, aus drei Gründen:

1. **Ein Einstieg für alle Laufzeiten.** `npx @rat/cli`, `bunx @rat/cli`, `deno run -A jsr:@rat/cli`: derselbe Befehl, dieselben Ergebnisse.
2. **`rat check`** ist die billigste Qualitätssicherung überhaupt: alle Dateien kompilieren, Fehler mit Position ausgeben. Ein Befehl für CI.
3. **Unabhängigkeit von Vite.** Für dein Setup (statische Seiten, Import Map, Pages) ist Vite überdimensioniert. Ein eigener `rat dev` mit 200–400 Zeilen trifft genau dein Modell.

### Befehle

| Befehl | Tut | Baut auf |
|---|---|---|
| `rat check [glob]` | kompiliert alle `.rat`/`.rat.js`, gibt Fehler und Warnungen mit Code-Frame aus, Exit-Code ≠ 0 bei Fehlern | `compile()` |
| `rat build [in] [--out dir]` | kompiliert Datei für Datei nach `dist/` (gleiche Struktur, `.rat` → `.rat.js`, Imports umgeschrieben), optional `--bundle` über esbuild | `compile()`, optional esbuild |
| `rat dev [dir]` | statischer Server, kompiliert `.rat` beim Anfordern, Live Reload über SSE, optional Import-Map-Injektion | `node:http`, `fs.watch` |
| `rat new component name` | erzeugt Datei aus Vorlage | Templates |
| `rat new app name` | Gerüst: `index.html`, Import Map, `app.rat`, `sw.js` | Templates |
| `rat fmt` | formatiert `.rat` (später) | Formatter |
| `rat ast file` / `rat out file` | gibt AST bzw. Output aus; zum Debuggen des Compilers | `compile()` |
| `rat graph [entry]` | Import-Graph, Tiefe, Fan-in; welche Module vorladen | `imports` aus `compile()` |
| `rat map` | erzeugt oder prüft die Import Map aus den lokalen Repos | [17](#17-repos-übergreifend-entwickeln-domina-aufbau-bunker-rat) |
| `rat info` | Versionen von Compiler, Runtime, Node/Deno/Bun; erkennt doppelte Runtimes | |

### Bauweise

```
packages/cli/
├─ package.json        "bin": { "rat": "./bin.js" }
├─ bin.js              #!/usr/bin/env node; parseArgs, dispatch
├─ commands/
│  ├─ build.js
│  ├─ check.js
│  ├─ dev.js
│  └─ new.js
├─ templates/
└─ shared.js           dateien finden, code-frame, farben
```

```js
#!/usr/bin/env node
// @rat/cli

import { parseArgs } from 'node:util';

const COMMANDS = {
  build : () => import('./commands/build.js'),
  check : () => import('./commands/check.js'),
  dev   : () => import('./commands/dev.js'),
  new   : () => import('./commands/new.js'),
};

const [name, ...rest] = process.argv.slice(2);
const load            = COMMANDS[name];

if (!load) { console.log(`rat <${Object.keys(COMMANDS).join('|')}>`); process.exit(1); }

const command = await load();
const { values, positionals } = parseArgs({ args: rest, options: command.options, allowPositionals: true });

process.exitCode = await command.run(positionals, values) ?? 0;
```

- **Keine Abhängigkeiten außer dem Compiler.** `node:util` `parseArgs`, `node:fs/promises` `glob` (Node 22+), `fs.watch(dir, { recursive: true })`, `node:http`. Farben über `node:util` `styleText`.
- **Befehle lazy laden** (`import()` pro Befehl): `rat check` lädt keinen Server-Code.
- **Cross-Runtime:** Deno und Bun unterstützen alle genannten `node:`-APIs. Ein Shebang mit `node` stört unter `deno run` nicht.
- **Einzel-Binary** möglich: `deno compile` oder `bun build --compile` erzeugt eine ausführbare Datei ohne installierte Laufzeit. Für ein Hobby-Framework kein Muss.

### `rat dev` im Detail

```
GET /app.rat     → compile, antwort als text/javascript (+ inline source map)
GET /index.html  → datei + <script type="importmap"> (optional) + live-reload-snippet
GET /__rat/sse   → server-sent events: "reload" bei dateiänderung
sonst            → statische datei
```

- Eine Map `Pfad → { mtime, code }` als Cache; `fs.watch` invalidiert und sendet `reload`.
- Live Reload statt HMR: 20 Zeilen Client-Code (`new EventSource('/__rat/sse').onmessage = () => location.reload()`).
- Optional später Remount-HMR über dieselbe SSE-Verbindung (`{ type: 'update', id }` → `import(url + '?t=' + Date.now())` → `$$.hmr.replace`).
- Mit `--map ../pulgasari.github.io/importmap.js` (bzw. JSON) und `--root ..` kann `rat dev` **alle Geschwister-Repos** unter denselben Pfaden ausliefern wie `code.pulgasari.dev`. Dann verhält sich `localhost:4000/rat/demos/…` exakt wie die Live-Seite.

Konzeptionell ist das die Server-Variante des Service Workers aus W3: dieselbe Logik (Anfrage → compile → Antwort), nur in Node statt im Browser.

### `create-rat`

Konvention: Ein Paket namens `create-rat` wird mit `npm create rat@latest` (oder `bun create rat`, `deno init --npm rat`) ausgeführt und legt ein Projekt an. Es kann einfach `rat new app` aufrufen.

---

## 14. Editor: Highlighting, LSP, Formatter

### Was es schon gibt

`@rat/syntax` deckt Highlighting für hljs, Monaco, CodeMirror/Acode, Zed und TextMate ab. Damit sind VS Code (über TextMate), GitHub (Linguist nutzt TextMate-Grammatiken, Aufnahme braucht aber Verbreitung) und Shiki ebenfalls erreichbar.

### Language Server

Ein LSP-Server ist ein Prozess, der über JSON-RPC mit dem Editor spricht. Was er für RAT liefern kann, nach Aufwand:

| Stufe | Features | Aufwand | Basis |
|---|---|---|---|
| 1 | **Diagnosen**: `compile()` bei jeder Änderung, `CompileError` und `warnings` als rote Unterstreichung | klein (≈200 Zeilen) | `vscode-languageserver` |
| 2 | Hover und Completion für Markup: Direktiven (`@if`, `@for`), `on:`-Modifier, bekannte `$`-Namen, Komponenten aus Imports | mittel | Compiler-AST |
| 3 | **JS-Intelligenz in `<script>` und `{…}`**: Completion, Typinfos aus `.d.ts`, Go-to-Definition | groß | **Volar**: bildet die `.rat`-Datei auf eine virtuelle `.js`/`.ts`-Datei ab, die der TypeScript-Server versteht; Mappings zurück |
| 4 | Formatter, Rename, Code Actions | groß | |

- **Stufe 1 bringt am meisten pro Zeile.**
- Stufe 3 ist der Weg von Vue, Astro und MDX. Er profitiert direkt von den `index.d.ts`-Dateien deiner Pakete: Completion für `@domina/chain` in einem `.rat`-Script.
- Die Mappings aus Stufe 3 sind dieselbe Information wie die Source Maps. Eine saubere Positionsbuchhaltung im Compiler zahlt doppelt.
- **Editoren:**
  - VS Code: Extension, die den Server startet;
  - Zed: Extension mit `language_servers` in `extension.toml`, existiert schon für die Grammatik;
  - Neovim und Helix: Konfiguration.
  - Acode auf Android: Es gibt LSP-Plugins der Community, aber keine stabile Basis. Für Acode bleibt der Weg über ein eigenes Plugin, das `compile()` direkt im Editor aufruft und Fehler markiert. Das ist ohne Server möglich, weil der Compiler im Browser läuft.

### Formatter

Eine eigene Syntax ohne Formatter führt zu Stil-Wildwuchs, für ein Ein-Personen-Projekt aber kein drängendes Problem. Optionen:

- **Prettier-Plugin:** Parser (AST aus `compile()`) plus Printer. Der Printer ist der Aufwand; JS-Teile kann Prettier selbst formatieren (eingebettete Sprachen).
- **Eigener `rat fmt`:** nur Markup-Einrückung und Attribut-Ausrichtung, Scripts unverändert oder durch `deno fmt`/Prettier für JS.
- Deine Ausrichtungsregeln (`const a   = …`) beherrscht kein gängiger Formatter. Ein eigener Formatter könnte sie umsetzen.

---

# Teil D: Lib-Dev

## 15. Was man als Lib-Entwickler wissen muss

### Das `package.json` einer Lib

```json
{
  "name"             : "@rat/runtime",
  "version"          : "0.3.0",
  "description"      : "signals plus @domina/render for compiled rat components",
  "license"          : "MIT",
  "type"             : "module",
  "exports"          : {
    "."       : { "types": "./index.d.ts", "development": "./index.dev.js", "default": "./index.js" },
    "./hmr"   : "./hmr.js"
  },
  "files"            : ["*.js", "*.d.ts", "README.md"],
  "sideEffects"      : false,
  "dependencies"     : { "@domina/render": "^0.4.0" },
  "peerDependencies" : {},
  "engines"          : { "node": ">=22" },
  "repository"       : { "type": "git", "url": "git+https://github.com/Pulgasari/rat.git", "directory": "packages/runtime" }
}
```

| Feld | Bedeutung |
|---|---|
| `type: "module"` | `.js` ist ESM. Ohne das behandelt Node `.js` als CommonJS. |
| `exports` | die einzigen importierbaren Pfade; Conditions pro Umgebung ([5](#5-module-und-auflösung-der-kern-von-allem)) |
| `files` | was im veröffentlichten Paket landet. Ohne das kommt alles mit, auch Notizen und Demos. `npm pack --dry-run` zeigt die Liste. |
| `sideEffects: false` | „Importieren ohne Nutzen darf entfallen“: aktiviert Tree Shaking über Modulgrenzen. Falsch gesetzt bricht es Pakete, die beim Import etwas registrieren (etwa `@domina/chain`, das `extend()` beim Laden ruft). Dann lieber eine Liste: `["./index.js"]`. |
| `dependencies` | wird mitinstalliert |
| `peerDependencies` | muss der **Nutzer** installieren; garantiert eine gemeinsame Instanz ([16](#16-die-besonderen-probleme-eines-compilers-mit-runtime)) |
| `devDependencies` | nur für die Entwicklung der Lib selbst |
| `engines` | Hinweis auf Mindestversionen |

### Typen ohne TypeScript

Dein Modell (JS plus zentrale `index.d.ts`) ist für Libs ideal:

- `"types": "./index.d.ts"` bzw. die Condition `types` in `exports`.
- `// @ts-self-types="./index.d.ts"` am Anfang von `index.js` für Deno und JSR (nutzt du bereits).
- **Prüfen, ob die `.d.ts` zur Implementierung passt:** `tsc --noEmit --allowJs --checkJs` mit einem kleinen `tsconfig.json`, oder Testdateien, die die API so nutzen, wie die Typen es versprechen (`*.test-d.ts`). Sonst driften Typen und Code unbemerkt auseinander.
- `attw` und `publint` prüfen vor der Veröffentlichung, ob Typen in allen Auflösungsmodi gefunden werden.

### Versionierung

- `0.x` bis die API steht. Breaking Changes bumpen Minor.
- **Changelog** pro Paket. Changesets automatisiert das in Monorepos.
- Compiler und Runtime **gemeinsam versionieren**, solange der generierte Code an die Runtime-API gebunden ist ([16](#16-die-besonderen-probleme-eines-compilers-mit-runtime)).

### Veröffentlichen

| Weg | Für |
|---|---|
| **GitHub Pages + Import Map** | dich und Demos. Keine Versionen: `main` ist live, und ein Push kann jede Seite brechen. |
| **JSR** | versionierte Releases, für Deno und über esm.sh im Browser. Schon eingerichtet für `@pulgasari/*`. |
| **npm** | Plugins für Vite und Co., das CLI (`npx`) |
| **esm.sh** | liefert JSR- und npm-Releases als Browser-ESM aus, mit festen Versionen in der URL |

Für Stabilität der eigenen Seiten kann die Import Map auf **versionierte** URLs zeigen (`https://esm.sh/jsr/@rat/runtime@0.3.0`) statt auf `./rat/packages/runtime/index.js`. Entwicklung läuft dann über die lokale Map (`rat dev`), die Live-Seite über gepinnte Releases. Das entspricht der Trennung zwischen Entwicklungs- und Produktionsserver in der PHP-Welt.

---

## 16. Die besonderen Probleme eines Compilers mit Runtime

### Eine Runtime, nicht zwei

Signals funktionieren nur, wenn **alle** Komponenten denselben reaktiven Graphen nutzen: dieselbe `effect`-Stack-Variable, derselbe Batch-Zustand. Zwei Kopien von `@rat/runtime` (oder `@domina/render`) bedeuten: Eine Komponente setzt ein Signal, eine andere bemerkt es nicht. Typischer Fehler ohne Fehlermeldung.

Wie es zu zwei Kopien kommt:

- Import Map zeigt auf `code.pulgasari.dev/rat/…`, ein Paket bringt aber `esm.sh/@rat/runtime` mit;
- zwei Versionen in `node_modules` (`^0.2` und `^0.3`);
- `?t=…`-Query-Strings beim HMR auf der Runtime selbst;
- Blob-URL-Loader, der die Runtime aus Versehen inline kompiliert.

Gegenmittel:

- `@rat/runtime` als **`peerDependency`** jeder Lib, die kompilierte Komponenten ausliefert;
- Vite: `resolve.dedupe: ['@rat/runtime', '@domina/render']`;
- esm.sh: `?external=@rat/runtime`;
- **Laufzeit-Wächter:** Die Runtime registriert sich auf `globalThis[Symbol.for('rat.runtime')]` und warnt im Dev-Build, wenn dort schon eine andere Version liegt. `rat info` kann dasselbe statisch prüfen.

### Compiler-Output und Runtime-Version

Generierter Code ruft `$$.signal`, `$$.when`, `$$.each`, `$$.listener` usw. auf. Eine vorkompilierte Komponente aus einer älteren Compiler-Version kann mit einer neueren Runtime brechen. Optionen:

- Compiler und Runtime **mit gleicher Version** veröffentlichen; der Output importiert `@rat/runtime` und setzt eine Kennung (`$$.v(3)`), die die Runtime prüft;
- oder ein stabiler, versionierter Einstieg: `import * as $$ from '@rat/runtime/v1'`. Das ist teurer in der Pflege, aber sauber für Dritt-Komponenten.

Für jetzt reicht die erste Variante.

### Libraries aus `.rat`-Komponenten veröffentlichen

Wenn jemand (oder du in `aufbau`) eine Komponentenbibliothek in `.rat` schreibt: **kompiliert** oder **als Quelle** veröffentlichen?

| | kompiliert (`.js`) | Quelle (`.rat`) |
|---|---|---|
| Nutzbar ohne RAT-Tooling | ja | nein |
| Bindung an Compiler-Version | fest | flexibel; Nutzer-Compiler entscheidet |
| Tree Shaking, Optimierungen | wie beim Bauen der Lib | im Build des Nutzers |
| Vorgehen bei Svelte | Quelle (`svelte`-Condition in `exports`) | |

Ein Mittelweg ist beides: `exports` mit Condition `rat` → `.rat`-Quelle, `default` → kompiliertes `.js`. Das RAT-Plugin setzt die Condition `rat`, alle anderen bekommen JS.

### Source Maps

Die Edit-Liste des Compilers (nur Einfügungen, siehe compiler.md) ist eine gute Ausgangslage: Jede Einfügung verschiebt nachfolgende Positionen um eine bekannte Länge. Daraus lässt sich ein Mapping „Ausgabe-Offset → Quell-Offset“ bauen. Für die Markup-Generierung (`generate.js`) müssen Knoten ihre Quellposition mitführen und beim Schreiben einen Mapping-Eintrag erzeugen.

- Format: Source Map v3, `mappings` VLQ-kodiert. Die Kodierung sind etwa 40 Zeilen oder `@jridgewell/gen-mapping` als Abhängigkeit.
- **Granularität:** Eine Zuordnung pro Zeile und pro Hole reicht für Fehlermeldungen und Breakpoints. Zeichengenaue Maps braucht nur der LSP.
- `sourcesContent` mitliefern, damit Devtools die `.rat`-Datei ohne weiteren Request zeigen.

### Fehlerqualität ist Tooling

Eine eigene Sprache wird über ihre Fehlermeldungen erlebt. Was die Werkzeuge daraus machen können, hängt davon ab, was `CompileError` mitliefert:

```
card.rat:12:18  unknown reactive name $cout. did you mean $count?

  11 │   <button onclick={inc}>
  12 │     {$cout} × 2
     │      ^^^^^
  13 │   </button>
```

Ein `codeFrame(source, error)` im Compiler-Paket wird von CLI, Overlay, Service Worker und Playground gemeinsam genutzt.

---

## 17. Repos übergreifend entwickeln: domina, aufbau, bunker, rat

### Das Problem

`rat` importiert `@domina/render`, `@domina/prototypes`, `@aufbau/*`, `@bunker/db`. Diese Pakete sind **nicht veröffentlicht**, sondern liegen in anderen Repos und werden im Browser über `importmap.js` auf `code.pulgasari.dev/<repo>/…` abgebildet.

Für alles außerhalb des Browsers existiert diese Auflösung nicht. `node --test` in `rat` kennt `@domina/render` nicht.

### Optionen

| Option | Wie | Pro | Contra |
|---|---|---|---|
| **A: Import Map als gemeinsame Quelle** | `importmap.js` schreibt zusätzlich eine `importmap.json` (oder liest sie). Browser nutzt sie direkt, Deno über `"importMap"` in `deno.json`, Node über einen `resolve`-Hook in `@rat/node`, Vite über ein Alias-Plugin, das die Map liest | eine Wahrheit, identisches Verhalten überall | Node braucht den Hook |
| B: `file:`-Abhängigkeiten | `"@domina/render": "file:../domina/packages/render"` in `package.json` | Node-nativ | nur lokal; Pfade brechen in CI ohne Geschwister-Repos |
| C: Workspace über alle Repos | ein Meta-Ordner mit `package.json` `"workspaces": ["*/packages/*", …]` (npm/pnpm/bun) oder `deno.json` `"workspace"` | ein `npm install` verlinkt alles | ein zusätzliches Repo oder eine lokale Datei; Repos müssen nebeneinander liegen |
| D: Monorepo | alle Pakete in ein Repo | einfachste Auflösung, atomare Änderungen | Umbau, alle Pages-Pfade ändern sich |
| E: veröffentlichen | JSR-Releases, Import nach Version | sauberste Entkopplung | Release-Aufwand bei jeder Änderung über Repo-Grenzen |

### Empfehlung: A, ergänzt um E für stabile Stände

**A** passt zu deinem Modell, weil die Import Map **schon** die zentrale Wahrheit ist. Konkret:

1. **Die Map als Daten.** `importmap.json` im Site-Repo enthält die Map mit relativen Pfaden, `importmap.js` liest sie bzw. wird daraus erzeugt. Die Logik zum Injizieren in den Browser bleibt.
2. **Deno:** `deno.json` in jedem Repo bzw. ein gemeinsames im Elternordner:
   ```json
   { "importMap": "../pulgasari.github.io/importmap.json" }
   ```
   Deno versteht Import Maps nativ. `deno test`, `deno check`, `deno lint` funktionieren dann über Repo-Grenzen.
3. **Node:** `@rat/node/register` liest die Map über eine Umgebungsvariable oder Option und löst Bare Specifier im `resolve`-Hook auf:
   ```js
   resolve (specifier, context, nextResolve) {
     const target = resolveFromMap(map, specifier, context.parentURL);
     return target ? { url: target, shortCircuit: true } : nextResolve(specifier, context);
   }
   ```
   Die Auflösung nach Spezifikation (exakte Treffer, Präfixe mit `/`, `scopes`) ist überschaubar, etwa 40 Zeilen; alternativ `@jspm/import-map`.
4. **Vite / esbuild:** ein kleines Plugin `importMap(path)` mit `resolveId` / `onResolve` aus derselben Funktion.
5. **CI:** Eine Action checkt die benötigten Geschwister-Repos nebeneinander aus (`actions/checkout` mit `repository:` und `path:`), dann gilt dieselbe Struktur wie lokal und auf Pages.

Damit entspricht `localhost` (über `rat dev --root ..`), Deno, Node und `code.pulgasari.dev` **derselben Verzeichnisstruktur und derselben Map**.

**E** kommt dazu, sobald etwas stabil sein muss: Releases auf JSR, und eine zweite Map (`importmap.prod.json`) mit versionierten URLs für Seiten, die nicht bei jedem Push brechen dürfen.

---

## 18. Testen, Messen, Veröffentlichen

### Was sich für RAT zu testen lohnt

| Ebene | Methode | Werkzeug |
|---|---|---|
| **Compiler** | **Golden Files**: `fixtures/x.rat` → `fixtures/x.expected.js`; Test vergleicht, `--update` überschreibt. Jede Syntax-Regel bekommt eine Fixture. | `node:test` oder `deno test`, keine Abhängigkeit |
| Compiler-Fehler | Fixtures mit erwarteter Fehlermeldung und Position | dito |
| Runtime: Signals | reine Logik, kein DOM | `node:test` |
| Runtime: DOM | Komponenten mounten, Events auslösen, DOM prüfen | happy-dom/linkedom in Node, oder **echter Browser** |
| Ende zu Ende | Playground und Demos laden, Klicks, Screenshots | Playwright |
| Größe | Runtime gebündelt, minifiziert, gzip/brotli | esbuild + `zlib`, oder size-limit |
| Tempo | Compiler-Durchsatz, Update-Benchmarks (js-framework-benchmark-artig) | mitata |

**Golden Files** sind für einen Compiler das wichtigste Werkzeug: Jede Änderung am Codegen wird als Diff sichtbar. Unbeabsichtigte Änderungen fallen sofort auf.

**Test im Browser ohne Node:** Eine Seite `rat/test/index.html` lädt alle Testmodule über die Import Map und zeigt Ergebnisse. Das funktioniert auf dem Handy und auf Pages. Eine winzige `test(name, fn)`-Funktion reicht. Playwright kann dieselbe Seite später in CI ausführen.

### `mount()`-Hilfe

```js
import { mount } from '@rat/test';
import Counter   from './counter.rat';

const view = mount(Counter, { start: 2 });
view.click('button');
await view.tick();
view.text('b');      // 'viele'
view.destroy();
```

Klein, nutzt den Root-Scope der Runtime. Gleicher Code in Node (mit happy-dom) und im Browser.

### Veröffentlichungsablauf

```
änderung ─▶ changeset (welches paket, patch/minor) ─▶ push
        ─▶ ci: check, test, golden files, size
        ─▶ release-pr (versionen + changelogs) ─▶ merge
        ─▶ action: jsr publish (oidc) + optional npm publish (provenance)
```

Der bestehende JSR-Workflow aus `js-packages` lässt sich übernehmen. Für mehrere Pakete im selben Repo: pro Paket `jsr.json` mit Namen und Version, Action mit `working-directory`.

---

# Teil E: Konzepte

## 19. Konzepte im Überblick

| # | Konzept | Löst | Aufwand | Abhängig von |
|---|---|---|---|---|
| K0 | Compiler-API ausbauen: `map`, `imports`, `warnings`, `id`, `codeFrame` | Voraussetzung für alles | mittel | |
| K1 | `@rat/browser`: Blob-Loader mit Import-Umschreibung, `text/rat` | Demos, Einstieg ohne alles | klein | K0 (`imports`) |
| K2 | `@rat/unplugin`: ein Adapter, alle Bundler | Vite, esbuild, Rolldown, Bun | klein | K0 (`map`) |
| K3 | `@rat/sw`: Service-Worker-Compiler | ohne Build auf Pages, relative Imports | mittel | K0, Bundle des Compilers |
| K4 | `@rat/node`: Node-Hooks inkl. Import-Map-Auflösung | Tests, SSR, Scripts in Node | klein | |
| K5 | `@rat/cli`: check, build, dev, new | CI, lokales Arbeiten ohne Vite | klein bis mittel | K0, K4 |
| K6 | Precompile in GitHub Actions | schnelle Live-Seiten, ohne lokalen Build | klein | K5 |
| K7 | `@rat/lsp`: Diagnosen, später Volar | Editor-Komfort | Stufe 1 klein, Stufe 3 groß | K0 (`warnings`, Maps) |
| K8 | HMR in der Runtime: Registry plus Remount | Dev-Erlebnis | mittel | K0 (`id`) |
| K9 | Devtools-Hooks plus Panel in `@aufbau/devtools` | Signal-Graph, Komponentenbaum sichtbar | mittel | Dev-Condition |
| K10 | Build im Browser: esbuild-wasm plus RAT-Plugin | Bundles erzeugen auf dem Handy | mittel | K2 |
| K11 | Playground als Mini-IDE: virtuelles Dateisystem, mehrere Dateien, Export | Entwickeln ganz im Browser | mittel | K1 oder K3 |
| K12 | `importmap.json` als gemeinsame Auflösung für alle Umgebungen | Repo-übergreifende Entwicklung | klein | K4 |
| K13 | `@rat/test`: `mount()`, Golden-File-Runner, Browser-Testseite | Qualität | klein | |

---

## 20. Die Konzepte im Detail

### K0: Compiler-API ausbauen

```js
const result = compile(source, { filename, hmr, sourcemap: true });

result.code       // string
result.css        // string | undefined
result.map        // source map v3 | null
result.imports    // [{ specifier, start, end, kind: 'static' | 'dynamic' }]
result.warnings   // [{ code, message, line, column }]
result.id         // stabiler hash aus filename
result.names      // $-namen (vorhanden)
```

`codeFrame(source, { line, column })` als eigener Export. Der Rest des Toolings ist danach Klebecode.

### K1: `@rat/browser`

- `load(url)` mit rekursivem Laden relativer `.rat`-Imports und Umschreiben auf Blob-URLs, plus Cache (`Map` url → Promise, damit Zyklen und doppelte Imports dieselbe Instanz bekommen).
- `auto.js` für `<script type="text/rat">`.
- Optional ein persistenter Cache in IndexedDB über `@bunker/db` (Schlüssel: URL + Quell-Hash + Compiler-Version).

### K2: `@rat/unplugin`

Ein Paket, Exporte pro Bundler. Vite-spezifisch: HMR-Code im Dev-Modus, `<style>` als virtuelles Modul `?rat&type=style` für CSS-HMR. Fehler mit `loc`. Nutzung:

```js
// vite.config.js
import { vite as rat } from '@rat/unplugin';

export default { plugins: [rat()] };
```

```js
// build.js
import * as esbuild     from 'esbuild';
import { esbuild as rat } from '@rat/unplugin';

await esbuild.build({ entryPoints: ['app.rat'], bundle: true, format: 'esm', outdir: 'dist', plugins: [rat()] });
```

### K3: `@rat/sw`

```
rat/packages/sw/
├─ index.js        ratServiceWorker({ match, cache, compileOptions })
└─ build.js        esbuild: index.js + compiler + acorn → dist/rat-sw.js (iife)
```

- In deinen `sw.js` per `importScripts` eingebunden ([11 W3](#w3-service-worker-empfohlen-für-echte-seiten-ohne-build)).
- `dist/rat-sw.js` wird committet, weil Pages nichts baut. Alternativ baut es eine Action.
- Fehler als Modul, das ein Overlay zeigt.
- `?raw` an der URL liefert die Quelle unverändert (für den Playground und Editoren).

### K4: `@rat/node`

```
@rat/node
├─ register.js     registerHooks: load (.rat), resolve (import map, falls RAT_IMPORT_MAP gesetzt)
└─ import-map.js   resolveFromMap(map, specifier, parentURL), auch von vite/esbuild-plugins genutzt
```

```sh
RAT_IMPORT_MAP=../pulgasari.github.io/importmap.json node --import @rat/node/register --test
```

`import-map.js` ist das Bindeglied zu K12 und auch für das CLI nützlich.

### K5: `@rat/cli`

Siehe [13](#13-ein-eigenes-cli-paket). Reihenfolge: `check` → `build` (ohne Bundling) → `dev` → `new`. `check` und `build` sind je unter 100 Zeilen.

### K6: Precompile in GitHub Actions

```yaml
# .github/workflows/pages.yml (skizze)
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with: { repository: Pulgasari/domina, path: ../domina }
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npx @rat/cli build demos --out _site/demos
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
  deploy:
    needs: build
    permissions: { pages: write, id-token: write }
    environment: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

Für die FTP-Denkweise: Die Action ist der Rechner, der vor dem Hochladen baut. Pages ist der FTP-Server. Du pushst weiterhin nur Quellen.

Achtung: Wechselt ein Repo von „Pages aus Branch“ auf „Pages aus Actions“, liefert Pages **nur noch das Artefakt** aus. Alles, was ausgeliefert werden soll (auch unkompilierte Dateien, Bilder), muss in `_site` kopiert werden.

### K7: `@rat/lsp`

Stufe 1 als erstes Ziel:

```js
connection.onDidChangeContent(({ document }) => {
  try {
    const { warnings } = compile(document.getText(), { filename: document.uri });
    send(document, warnings.map(toDiagnostic));
  } catch (error) {
    send(document, [toDiagnostic(error, 1)]);
  }
});
```

Dazu eine VS-Code-Extension (TextMate-Grammatik plus Server-Start) und der Eintrag in der Zed-Extension. Stufe 3 (Volar) erst, wenn Scope-Analyse und Maps stehen.

### K8: HMR in der Runtime

```js
// @rat/runtime/hmr.js
const registry = new Map;   // id -> Set<{ scope, anchor, props, children }>

export function track (id, instance) { … }
export function replace (id, next) {
  for (const instance of registry.get(id) ?? []) {
    instance.scope.dispose();
    instance.anchor.replaceWith(render(next, instance.props, instance.children));
  }
}
```

Nur im Dev-Build aktiv (Condition `development`). Der Compiler setzt `track` und `import.meta.hot.accept` nur mit `hmr: true`. Funktioniert mit Vite und mit `rat dev`.

### K9: Devtools

- Die Dev-Runtime meldet Signals, Computeds, Effects und Komponenten an einen Hook: `globalThis.__RAT_DEVTOOLS__?.emit('signal:create', …)`.
- Ein Panel in `@aufbau/devtools` zeigt Komponentenbaum, Signal-Werte und Abhängigkeitsgraph. Klick auf ein Element markiert seine Bindings.
- Ohne Browser-Extension: als Overlay in der Seite, also auch mobil nutzbar.

### K10: Build im Browser

```js
import * as esbuild     from 'esbuild-wasm';
import { esbuild as rat } from '@rat/unplugin';

await esbuild.initialize({ wasmURL: 'https://esm.sh/esbuild-wasm@0.28.2/esbuild.wasm' });
const result = await esbuild.build({
  entryPoints : ['app.rat'],
  bundle      : true,
  format      : 'esm',
  minify      : true,
  write       : false,
  plugins     : [virtualFiles(files), importMapResolver(map), rat()],
});
```

- Dateien kommen aus dem virtuellen Dateisystem des Playgrounds (K11), aus OPFS (`@bunker/opfs`) oder per `fetch` von Pages.
- Ergebnis: Download, oder Commit über die GitHub-API (`PUT /repos/…/contents/…`) mit einem Token, das der Nutzer selbst einträgt und lokal speichert.
- Damit ist ein **kompletter Build-Workflow auf dem Handy** möglich, ohne Node.
- unplugin hat noch keinen esbuild-wasm-spezifischen Pfad, nutzt aber dieselbe API. Bei Bedarf ein separater, schlanker Plugin-Export ohne unplugin-Laufzeit.

### K11: Playground als Mini-IDE

- **Mehrere Dateien:** ein Dateibaum im Speicher, persistiert in OPFS.
- Imports zwischen Dateien über K1 (Umschreiben auf Blob-URLs) oder über einen Service Worker mit Scope `/playground/vfs/`, der Dateien aus OPFS liefert. Letzteres ist näher an W3 und braucht kein Umschreiben.
- **Teilen:** Projekt als komprimierter String im URL-Hash (`CompressionStream('deflate-raw')` + base64url).
- **Export:** als ZIP, als GitHub-Gist, oder K10-Build.
- **Editor:** `<write-code>` aus `@aufbau/elements` mit CodeMirror und `@rat/syntax`. Diagnosen direkt aus `compile()`, ohne LSP.

Für jemanden, der hauptsächlich mobil arbeitet, ist das die eigentliche „lokale Umgebung“.

### K12: Gemeinsame Import Map

Siehe [17](#17-repos-übergreifend-entwickeln-domina-aufbau-bunker-rat). Kleinster Schritt: `importmap.json` neben `importmap.js` erzeugen, `deno.json` mit `importMap` in `rat`, `resolveFromMap` in `@rat/node`.

### K13: `@rat/test`

- `mount()` wie in [18](#18-testen-messen-veröffentlichen).
- `golden(dir)`: Fixtures finden, kompilieren, vergleichen, `--update`.
- `test/index.html`: Browser-Testseite für Handy und Pages.

---

## 21. Empfohlene Reihenfolge

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **1. Fundament** | K0 (`imports`, `warnings`, `codeFrame`, `id`; Maps zeilengenau), K13 Golden Files | Compiler ist werkzeugfähig und abgesichert |
| **2. Lokal ausführen** | K12 (`importmap.json`, `deno.json`), K4 (`@rat/node`), K5 `rat check` + `rat build` | Tests und CI laufen über Repo-Grenzen |
| **3. Browser ohne Build** | K3 Service Worker, K1 für Demos | `.rat` direkt auf Pages, mit relativen Imports |
| **4. Bundler** | K2 unplugin mit Vite-HMR Stufe 1–2, K8 | RAT ist in normalen Projekten nutzbar |
| **5. Dev-Erlebnis** | K5 `rat dev`, K7 LSP Stufe 1, K9 Devtools | Fehler im Editor, Live Reload, sichtbarer Zustand |
| **6. Mobil komplett** | K11, K10 | Entwickeln, bauen, veröffentlichen ohne Rechner |
| **7. Veröffentlichung** | JSR-Releases, versionierte Import Map für Live-Seiten, K6 | stabile Seiten trotz laufender Entwicklung |

Phase 1 und 2 sind unsichtbar, bringen aber am meisten. Ohne `imports`, Maps und eine Auflösung außerhalb des Browsers bleibt jedes weitere Werkzeug ein Provisorium.

### Was man bewusst weglassen kann

- **webpack, Parcel, Babel:** kommen über unplugin mit, falls jemand sie braucht; keine eigene Arbeit.
- **TypeScript-Integration für Nutzer-Code:** entgegen dem Konzept (Typen als Werte). Die Volar-Stufe des LSP liefert Typinfos aus `.d.ts`, ohne dass Nutzer TS schreiben.
- **Zustandserhaltendes HMR (Stufe 3):** hoher Aufwand, geringer Gewinn für kleine Apps.
- **Eigener Bundler:** esbuild und Rolldown sind besser, als ein eigener je wird.
- **SSR:** erst, wenn eine konkrete App es braucht. Mit K4 ist die Grundlage da.

---

## 22. Performance-Hinweise

| Stelle | Ursache | Maßnahme |
|---|---|---|
| **Kompilieren im Client** | acorn plus Compiler müssen geladen werden (Größenordnung zweistelliger KB nach gzip), dann kompiliert jede Datei auf dem Haupt-Thread | für Live-Seiten vorkompilieren (W4, K6); sonst im Service Worker (anderer Thread) mit Cache |
| **Import-Wasserfälle** | ungebündeltes ESM: der Browser entdeckt tiefe Module erst nach dem Parsen ihrer Eltern. Über Repo-Grenzen (`rat` → `domina` → `aufbau`) wird die Kette lang | `modulepreload` für Module mit hohem Fan-in (dein SW-Precache macht das schon), `rat graph` zum Messen, oder bundeln |
| **Cache ohne Versionsschlüssel** | kompilierter Output überlebt ein Compiler-Update | Schlüssel: URL + Quell-Hash + Compiler-Version |
| **Zwei Runtimes** | doppelte Instanzen durch verschiedene URLs | `peerDependency`, Dedupe, Laufzeit-Wächter ([16](#16-die-besonderen-probleme-eines-compilers-mit-runtime)) |
| **`sideEffects` falsch** | entweder kein Tree Shaking oder entfernte Registrierungen | pro Paket bewusst setzen; Pakete mit `extend()` beim Laden ausnehmen |
| **HMR mit `?t=`** | jede Änderung erzeugt eine neue Modul-URL; alte Instanzen bleiben im Speicher, solange referenziert | Scopes beim Ersetzen sauber entsorgen (K8) |
| **Live-Seiten auf `main`** | jeder Push wirkt sofort; Browser-Caches mischen alte und neue Dateien | versionierte URLs (JSR + esm.sh) oder Hash-Dateinamen beim Build |
| **esbuild-Plugin-Callbacks** | jeder Treffer kostet einen Wechsel Go → JS | enger `filter`, Arbeit pro Datei klein halten |
| **Kompilieren pro Pipe** | `pipes()` / `topics()` tokenisieren pro Pipe neu (siehe compiler.md) | für generierte Dateien mit vielen Pipes relevant, in `rat check` über große Projekte messbar |

---

## Quellen

- Node: [Module customization hooks](https://nodejs.org/api/module.html#customization-hooks), [`util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig), [`fs.glob`](https://nodejs.org/api/fs.html#fspromisesglobpattern-options), [Packages: exports and conditions](https://nodejs.org/api/packages.html)
- Import Maps: [HTML Standard](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps), [`@jspm/import-map`](https://github.com/jspm/import-map)
- Deno: [Configuration, importMap, workspaces](https://docs.deno.com/runtime/fundamentals/configuration/), [`deno compile`](https://docs.deno.com/runtime/reference/cli/compile/)
- Bun: [Plugins](https://bun.sh/docs/runtime/plugins)
- Vite: [Plugin-API](https://vite.dev/guide/api-plugin), [HMR-API](https://vite.dev/guide/api-hmr)
- esbuild: [Plugins](https://esbuild.github.io/plugins/), [esbuild-wasm](https://esbuild.github.io/getting-started/#wasm)
- unplugin: [unplugin.unjs.io](https://unplugin.unjs.io/)
- Volar: [volarjs.dev](https://volarjs.dev/)
- LSP: [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- JSR: [jsr.io/docs](https://jsr.io/docs), esm.sh: [esm.sh](https://esm.sh/)
- Source Maps: [Source Map Spec (ECMA-426)](https://tc39.es/ecma426/)
- Werkzeuge: [publint](https://publint.dev/), [are-the-types-wrong](https://arethetypeswrong.github.io/), [Changesets](https://github.com/changesets/changesets), [size-limit](https://github.com/ai/size-limit)
- RAT intern: `rat/.md/concept.md`, `compiler.md`, `ideas.md` (2.14, 3)
