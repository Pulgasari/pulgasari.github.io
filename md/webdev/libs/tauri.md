# Tauri

Ein Framework für Desktop- und Mobil-Apps mit einer Web-Oberfläche in der **System-WebView** und einem Hauptprozess in **Rust**. Statt wie Electron einen ganzen Chromium und Node mitzuliefern, nutzt Tauri, was das Betriebssystem schon hat: WebView2 auf Windows, WKWebView auf macOS und iOS, WebKitGTK auf Linux, die Android-WebView. Gestartet 2019, 1.0 im Juni 2022, 2.0 im Oktober 2024 mit iOS und Android; aktuell 2.12 (Oktober 2026). Getragen von der Tauri-Arbeitsgruppe unter der Commons Conservancy, MIT/Apache-2.0.

- Website: https://tauri.app
- Repository: https://github.com/tauri-apps/tauri
- Plattformen: Windows, macOS, Linux, Android, iOS
- Größe im Browser: `@tauri-apps/api` 9,6 kb, nur `invoke` 0,9 kb
- Größe der App: ein „Hallo Welt“ liegt bei wenigen MB (Electron: rund 100 MB)
- Build: `tauri dev`, `tauri build`; das Frontend mit beliebigem Werkzeug (Vite, rat, …)

## Das Problem, das Tauri löst

Electron hat Desktop-Apps mit Webtechnik alltäglich gemacht (VS Code, Slack, Discord), aber jede App bringt ihren eigenen Chromium und Node mit: über 100 MB Download, Hunderte MB Arbeitsspeicher, und ein Node-Prozess mit vollem Systemzugriff, den jede Sicherheitslücke im Frontend erreichen kann.

Tauri teilt die App anders: Die Oberfläche bleibt Web, aber in der WebView, die ohnehin installiert ist. Der privilegierte Teil ist ein kleines Rust-Programm, und das Frontend darf nur die Befehle aufrufen, die ausdrücklich freigegeben sind.

## Kernkonzepte

### 1. Befehle: Rust-Funktionen, von JavaScript aufgerufen

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn greet (name: &str) -> String {
    format!("hallo {name}")
}

#[tauri::command]
async fn read_note (path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn run () {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, read_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```js
import { invoke } from '@tauri-apps/api/core';

const text  = await invoke('greet', { name: 'ada' });
const note  = await invoke('read_note', { path: '/tmp/a.md' });   // ein Err(...) wird zu einem rejected promise
```

Argumente und Rückgaben laufen als JSON (über `serde`), große Binärdaten als `ArrayBuffer`. Ein Befehl kann `async` sein und läuft dann im Tokio-Thread-Pool, ohne die Oberfläche zu blockieren.

### 2. Events in beide Richtungen

```rust
app.emit("progress", 42)?;
```

```js
import { listen } from '@tauri-apps/api/event';
const stop = await listen('progress', event => bar.value = event.payload);
```

Für Datenströme gibt es zusätzlich `Channel`: ein geordneter, schneller Kanal von Rust nach JavaScript, etwa für Download-Fortschritt oder Logzeilen.

### 3. Rechte: Capabilities und Permissions

```json
// src-tauri/capabilities/default.json
{
  "identifier": "main",
  "windows": ["main"],
  "permissions": ["core:default", "fs:allow-read-text-file", "dialog:allow-open"]
}
```

Seit 2.0 ist alles verboten, was nicht erlaubt ist. Jedes Plugin bringt einzelne Permissions mit (`fs:allow-read-text-file`), Capabilities ordnen sie Fenstern zu, Scopes grenzen sie weiter ein (nur bestimmte Pfade). Eine Lücke im Frontend erreicht damit nur, was dieses Fenster darf.

### 4. Plugins

`fs`, `dialog`, `shell`, `http`, `notification`, `store`, `sql`, `updater`, `global-shortcut`, `clipboard-manager`, `deep-link`, `window-state`, `barcode-scanner`, `biometric` … Jedes besteht aus einem Rust-Crate und einem npm-Paket mit der JavaScript-API; auf Android und iOS kann ein Plugin zusätzlich Kotlin- bzw. Swift-Code enthalten.

### 5. Fenster, Menüs, Tray

```js
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
const settings = new WebviewWindow('settings', { title: 'Einstellungen', url: '/settings', width: 480 });
```

Mehrere Fenster, native Menüs, Tray-Icon, Sidecars (mitgelieferte Programme), automatische Updates mit signierten Paketen, Installer (MSI, NSIS, DMG, AppImage, deb, rpm).

## Wie es intern arbeitet

Das Rust-Programm öffnet Fenster über **tao** (ein Fork von winit) und darin WebViews über **wry**, das die Plattform-WebViews hinter einer API zusammenfasst. Die Seite wird über ein eigenes Protokoll (`tauri://localhost`, unter Windows `http://tauri.localhost`) aus den eingebetteten Dateien geliefert. `invoke` schickt eine IPC-Nachricht an den Rust-Prozess; dort prüft Tauri die Permissions, deserialisiert die Argumente und ruft die Funktion auf. Es gibt keinen Node: Was Node in Electron tut, ist Rust.

## Stärken und Schwächen

- **Stark:** kleine Installationspakete und wenig Speicher, ein striktes Rechtemodell, Rust für alles Rechenintensive, Desktop und Mobil aus einem Projekt, sehr aktive Entwicklung.
- **Schwach:** jede Plattform rendert mit ihrer eigenen Engine (Safari-Eigenheiten auf macOS, ältere WebKitGTK unter Linux): man testet in drei Browsern statt einem. Die native Seite verlangt Rust (lange Compile-Zeiten, Lernkurve). Kein Node im Hauptprozess, also keine npm-Pakete dort.

## Für rat und aufbau

- **rats Desktop-Ziel** ist heute Deno Desktop (`config.rat.js` mit `desktop`, `host()` von `@rat/app`). Tauri wäre die naheliegende Alternative, wenn kleine Pakete und ein Rechtemodell wichtiger sind als JavaScript auf der nativen Seite. Die rat-Treiber bräuchten dann eine Tauri-Variante (store über das `store`-Plugin, files über `fs`, dialogs über `dialog`), wie es sie für Capacitor gibt.
- **Capabilities** sind die Antwort auf eine Frage, die sich jede rat-App mit nativen Treibern stellt: Was darf das Frontend? Bei Capacitor ist es „jedes registrierte Plugin, ganz“, bei Tauri „nur die freigegebenen Befehle“.
- **`invoke` mit Namen** entspricht rats Kommandos (`RAT.app.commands`, `onclick='save'`): eine Aktion über ihren Namen, die Umsetzung liegt woanders.
- Verwandt: [Electrobun](electrobun.md) (dasselbe mit Bun statt Rust), [Capacitor](capacitor.md) (dasselbe für Mobilgeräte), [Rust](../langs/rust.md).
