# Vite

Ein Entwicklungsserver und Build-Werkzeug für Web-Projekte. Von Evan You, seit 2020; Vite 2 machte es 2021 frameworkübergreifend nutzbar. Aktuell 8.3.4 (Oktober 2026), aktiv. Vite 8, erschienen im März 2026, verwendet Rolldown als einheitlichen Bundler und Oxc für Compileraufgaben. Die oft gelesene Beschreibung „esbuild in Entwicklung, Rollup im Build“ gehört zu älteren Versionen.

- Website: https://vite.dev
- Repository: https://github.com/vitejs/vite
- Laufzeit: Node.js für Entwicklungsserver und Build; Vite 8 verlangt Node 20.19+ beziehungsweise 22.12+ in diesen Versionslinien
- Build: Vite stellt ihn bereit; keine allgemeine Vite-UI-Runtime im Produktionsbrowser

## Das Problem, das Vite löst

Ein klassischer Bundler baut vor dem ersten sichtbaren Ergebnis oft die ganze Anwendung. Mit wachsendem Projekt verlängert sich damit auch der Start einer Entwicklungssitzung. Selbst kleine Änderungen können große Teile einer Kette neu verarbeiten.

Vites ursprünglicher Ansatz nutzt die nativen ES-Module des Browsers und transformiert benötigte Quelldateien auf Anfrage. Dazu kommen ein schneller Abhängigkeitsweg, HMR und ein optimierter Produktionsbuild. Vite ist dabei keine UI-Bibliothek: [Preact](preact.md), rat oder ein Vanilla-Projekt können dieselbe Entwicklungsumgebung benutzen.

## Kernkonzepte

### 1. HTML ist ein Einstiegspunkt

```html
<!doctype html>
<html lang="de">
  <meta charset="utf-8">
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</html>
```

Vite verarbeitet die Modulreferenz im HTML. Im Projekt laufen `npx vite` für die Entwicklung und `npx vite build` für die Ausgabe. `vite preview` dient zur lokalen Vorschau des Builds, nicht als allgemeiner Produktionsserver.

### 2. Konfiguration statt eigener Build-Kette

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/demo/',
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
```

`base` beeinflusst Asset-Pfade und ist etwa für eine Website unter einem Unterverzeichnis wichtig. Entwicklung und Deployment müssen nicht dieselbe URL-Struktur haben.

### 3. Hot Module Replacement

```js
if (import.meta.hot) {
  import.meta.hot.accept('./message.js', module => {
    console.log(module);
  });
}
```

HMR ersetzt geeignete Module ohne vollständigen Reload. Ob Komponenten dabei ihren Zustand behalten, bestimmt die jeweilige Framework-Integration. Ein beliebiges neues Template-Format bekommt das nicht automatisch.

### 4. Plugins übersetzen Dateiformate

```js
const textModule = {
  name: 'text-module',
  transform(source, id) {
    if (!id.endsWith('.note')) return;
    return { code: `export default ${JSON.stringify(source)}`, map: null };
  },
};
```

Das Plugin macht `.note` zu einem Modul mit String-Export. Für eine Sprache wie rat wären echte Kompilierung, Source Maps, Abhängigkeiten und ein Update-Vertrag nötig. Das Beispiel ist nur die Form eines einfachen Transform-Hooks.

### 5. Umgebungen und Assets

`import.meta.env` stellt Build-Informationen und freigegebene Variablen bereit; `VITE_`-Werte sind im Clientcode öffentlich. Assets können über Imports in den Build gelangen oder aus `public` unverändert übernommen werden. SSR braucht zusätzlich eine Serverintegration; Vite selbst entscheidet weder Routen noch Datenzugriffe.

## Wie es intern arbeitet

Der Entwicklungsserver verwaltet einen Modulgraphen. Dateianfragen werden aufgelöst und transformiert, Imports für den Browser vorbereitet. Änderungen invalidieren betroffene Module; über die HMR-Verbindung erfährt der Client, welche Teile neu geladen werden müssen.

Für Vite 8 vereinheitlicht Rolldown die Bundler-Grundlage, Oxc übernimmt zentrale Compileraufgaben. Damit entfällt die ältere Grundaufteilung zwischen esbuild und Rollup. Der Standardansatz mit Modulanfragen in der Entwicklung und einem optimierten Build bleibt als Nutzerkonzept wichtig; experimentelle Betriebsarten sind davon getrennt zu betrachten.

## Stärken und Schwächen

- **Stark:** schneller Einstieg, verbreitete Plugin-Schnittstelle, gute Basis für eigene Compiler und mehrere UI-Frameworks. HTML, Assets, CSS und HMR werden gemeinsam behandelt.
- **Schwach:** Unterschiede zwischen Entwicklung, Build und Serverumgebung bleiben möglich. Plugins können Annahmen über alte Interna enthalten; TypeScript wird transformiert, eine vollständige Typprüfung braucht ein eigenes Werkzeug.

## Für rat und aufbau

- **Ein `vite-plugin-rat` wäre eine Integrationsschicht** (Vorschlag), keine zweite Sprachimplementierung: Compiler aufrufen, Source Maps zurückgeben, importierte Abhängigkeiten verfolgen und Updates definieren.
- **HMR braucht eine Zustandsregel:** Was passiert mit vorhandenen Signals, Behaviors und Custom Elements, wenn nur Markup oder Script geändert wird? Ein kompletter Remount ist einfach, erhält aber keinen lokalen Zustand.
- **Build-Ausgabe und Dev-Erlebnis getrennt prüfen:** Ein Plugin, das im Browser startet, muss nicht schon korrekte Produktionspfade oder SSR-Imports liefern. Für aufbau wären diese Grenzen Teil des Integrationsvertrags.
- **[esbuild](esbuild.md) bleibt eigenständig:** Vites heutige Architektur ist kein Grund, bestehende kleine Build-Skripte automatisch umzustellen. Entscheidend sind benötigte Plugins und Funktionen.

Quellen: [Einstieg](https://vite.dev/guide/), [Plugin-API](https://vite.dev/guide/api-plugin), [Vite 8](https://vite.dev/blog/announcing-vite8), [npm](https://registry.npmjs.org/vite/latest). Stand: 17. Oktober 2026.
