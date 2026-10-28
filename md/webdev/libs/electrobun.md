# Electrobun

Ein Framework für Desktop-Apps in **TypeScript**, mit **Bun** als Laufzeit des Hauptprozesses und der System-WebView (oder einem mitgelieferten Chromium) für die Oberfläche. Die nativen Teile sind in Zig und C++ geschrieben, Updates kommen als Binär-Diffs von wenigen Kilobyte. Von Yoav (Blackboard, blackboard.sh), seit 2023; 1.0 im Februar 2026, aktuell 2.0 (Oktober 2026), aktiv, MIT-lizenziert.

- Website: https://electrobun.dev
- Repository: https://github.com/blackboardsh/electrobun
- Plattformen: macOS 14+ (Apple Silicon, Intel), Windows 11+ (x64, ARM64 in Beta), Ubuntu 24.04+; andere Linux-Distributionen über die Community
- Größe der App: wenige MB mit System-WebView, deutlich mehr mit gebündeltem Chromium (CEF)
- Build: eigene CLI (`electrobun dev`, `electrobun build`), dazu **Hutch**, ein Werkzeug für Projekte, Toolchains und Abhängigkeiten

## Das Problem, das Electrobun löst

[Tauri](tauri.md) macht Desktop-Apps klein, verlangt aber Rust für die native Seite. Electron erlaubt JavaScript überall, ist aber groß und langsam beim Start. Electrobun will beides: TypeScript im Haupt- und im Oberflächenprozess, aber eine schlanke Laufzeit (Bun statt Node), die System-WebView statt eines Pflicht-Chromium, und ein eingebautes, sehr kleines Update-Verfahren. Ziel ist eine „Lösung in einer Schachtel“: Projekt anlegen, entwickeln, signieren, ausliefern, aktualisieren.

## Kernkonzepte

### 1. Hauptprozess und Fenster

```ts
// src/bun/index.ts: läuft in bun
import { BrowserWindow } from 'electrobun/bun';

const win = new BrowserWindow({
  frame : { height: 600, width: 900, x: 100, y: 100 },
  title : 'Notizen',
  url   : 'views://main/index.html',     // eine gebündelte view
});
```

Der Hauptprozess ist ein gewöhnliches Bun-Programm: Dateisystem, Netzwerk, SQLite (`bun:sqlite`), Shell, alles mit Bun-APIs. Views sind gebaute Web-Seiten, die über das eigene Schema `views://` geladen werden.

### 2. Typisierte RPC zwischen Prozessen

```ts
// src/shared/rpc.ts
export type NotesRPC = {
  bun: RPCSchema<{ requests: { readNote: { params: { path: string }, response: string } } }>;
  webview: RPCSchema<{ messages: { saved: { path: string } } }>;
};
```

```ts
// hauptprozess
const rpc = BrowserView.defineRPC<NotesRPC>({
  handlers: { requests: { readNote: ({ path }) => Bun.file(path).text() } },
});

// view
const electroview = new Electroview({ rpc: Electroview.defineRPC<NotesRPC>({ handlers: {} }) });
const text = await electroview.rpc.request.readNote({ path: 'a.md' });
```

Ein gemeinsamer Typ beschreibt, was jede Seite anbietet: Requests mit Antwort, Messages ohne. TypeScript prüft beide Enden. Die Nachrichten laufen über einen verschlüsselten lokalen Kanal statt über eine `postMessage`-Brücke mit JSON-Strings.

### 3. WebViews als Elemente

```html
<electrobun-webview src="https://example.org" partition="persist:docs"></electrobun-webview>
```

Eine Oberfläche kann weitere, isolierte WebViews als Element einbetten, mit eigener Session, eigener Prozessgrenze und eigenem Preload. Damit lassen sich Browser, Vorschauen oder fremde Inhalte in die App setzen, ohne iframes und ihre Einschränkungen. Dazu kommt `<electrobun-wgpu>` für native GPU-Flächen (WebGPU über Dawn) mitten im Layout.

### 4. Updates als Binär-Diff

```ts
import { Updater } from 'electrobun/bun';
const update = await Updater.checkForUpdate();
if (update.updateAvailable) await Updater.downloadUpdate();
```

Beim Build erzeugt Electrobun aus der vorigen und der neuen Version einen Patch (eine in Zig optimierte BSDIFF-Variante) und legt ihn neben das vollständige, mit Zstandard gepackte Paket auf einen statischen Server (S3, R2, GitHub Releases). Eine kleine Änderung am Code ist ein Update von wenigen Kilobyte; scheitert der Patch, lädt die App das ganze Paket.

### 5. Native Erweiterungen

Was Bun nicht kann, schreibt man in Zig, Rust, Go, Odin oder C und ruft es über Buns FFI auf. Menüs, Tray, Kontextmenüs, Dateidialoge und Fenstersteuerung bringt Electrobun selbst mit.

## Wie es intern arbeitet

Ein kleiner Launcher (Zig) entpackt beim ersten Start das selbstextrahierende Paket und startet Bun mit dem gebündelten Hauptprozess. Ein nativer Wrapper (Objective-C auf macOS, C++ auf Windows und Linux) öffnet Fenster und WebViews und spricht über FFI mit Bun. Die Views laufen in der System-WebView oder, mit `bundleCEF`, in einem mitgelieferten Chromium, das dann auf allen Plattformen gleich rendert. Hutch verwaltet SDKs, Toolchains und Abhängigkeiten in einem Lockfile.

## Stärken und Schwächen

- **Stark:** TypeScript auf beiden Seiten mit typisierter RPC, Bun als schnelle Laufzeit mit eingebautem Bundler und SQLite, sehr kleine Updates, wahlweise System-WebView oder einheitlicher Chromium, WebViews als Elemente.
- **Schwach:** jung (1.0 erst 2026) und von wenigen Leuten getragen, kein Mobil-Ziel, kleines Ökosystem, Linux nur für Ubuntu offiziell, Bun-Abhängigkeit (nicht jedes Node-Paket läuft dort), schnelle Versionssprünge mit Brüchen.

## Für rat und aufbau

- **Ein Kandidat für rats Desktop-Ziel.** Bun im Hauptprozess heißt: rats Treiber für `files`, `store`, `database` könnten als Bun-Code laufen, ganz ohne zweite Sprache. Die Deno-Variante von `@rat/app` (`host/deno.js`) zeigt schon das Muster; eine Electrobun-Variante wäre ihr nahe.
- **Typisierte RPC** ist das Gegenstück zu rats Treibern: eine Schnittstelle, zwei Seiten. Bei rat wählt der Build die Seite (`__RAT_TARGET__`), bei Electrobun prüft TypeScript den Vertrag.
- **`<electrobun-webview>`** löst, was der Browser Cosmonaut auf Android mit nativen Content-WebViews hinter einer transparenten Capacitor-WebView löst: fremde Seiten neben der eigenen Oberfläche, jede in ihrem Prozess.
- **Binär-Updates** wären für zugriff-Apps außerhalb der Stores interessant: Ein neuer Build einer rat-App ändert meist nur wenige Chunks.
- Verwandt: [Tauri](tauri.md), [Capacitor](capacitor.md), [Zig](../langs/zig.md), [Odin](../langs/odin.md).
