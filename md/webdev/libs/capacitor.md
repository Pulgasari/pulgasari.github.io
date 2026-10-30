# Capacitor

Eine Laufzeit, die eine Web-App als **native App** für Android und iOS ausliefert: Die App läuft in der System-WebView, und JavaScript ruft über eine Brücke native Plugins auf (Kamera, Dateisystem, Benachrichtigungen, eigene Java- oder Swift-Klassen). Von Ionic (Max Lynch, Ben Sperry), seit 2019 als Nachfolger von Cordova. Aktuell 8.x (Oktober 2026), aktiv, MIT-lizenziert.

- Website: https://capacitorjs.com
- Repository: https://github.com/ionic-team/capacitor
- Plattformen: Android (WebView, Chromium), iOS (WKWebView); Web als Rückfallebene; Electron über ein Community-Projekt
- Größe im Browser: `@capacitor/core` 3,5 kb
- Build: das Web-Projekt wie gewohnt (Vite, rat, …), dazu `npx cap sync` und Gradle bzw. Xcode

## Das Problem, das Capacitor löst

Eine Web-App kann viel, aber nicht alles: Sie kommt nicht in den Play Store, darf nicht beliebig auf Dateien, Kontakte oder Bluetooth zugreifen und läuft nicht im Hintergrund. Eine native App in Kotlin und Swift heißt zwei Codebasen. Cordova (2009, als PhoneGap) hat die Lücke zuerst geschlossen, aber mit einem eigenen Build-System, das das native Projekt bei jedem Build neu erzeugt und eigene Änderungen daran überschreibt.

Capacitor dreht das um: Das native Projekt (`android/`, `ios/`) wird **einmal erzeugt und dann eingecheckt**. Es gehört der App, man öffnet es in Android Studio oder Xcode, ändert Manifest, Gradle oder Java nach Belieben. Capacitor kopiert bei jedem Sync nur die gebaute Web-App hinein und registriert die Plugins.

## Kernkonzepte

### 1. Projekt und Sync

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Notes" dev.example.notes --web-dir dist
npx cap add android            # erzeugt android/, einmal
npm run build                  # die web-app nach dist/
npx cap sync android           # dist/ nach android/app/src/main/assets/public, plugins registrieren
npx cap run android            # bauen, installieren, starten
```

```json
// capacitor.config.json
{
  "appId": "dev.example.notes",
  "appName": "Notes",
  "webDir": "dist",
  "android": { "allowMixedContent": true }
}
```

`sync` ist `copy` (Web-Dateien) plus `update` (Plugins aus `node_modules` in die Gradle- und Xcode-Projekte eintragen). Das native Projekt zieht die Plugins über relative Pfade aus `node_modules`; deshalb vertragen sich Capacitor-Apps schlecht mit gehoisteten Workspaces.

### 2. Plugins von JavaScript aus

```js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

await Filesystem.writeFile({ data: 'hallo', directory: Directory.Documents, encoding: Encoding.UTF8, path: 'notes/a.txt' });
await Preferences.set({ key: 'theme', value: 'dark' });
const { value } = await Preferences.get({ key: 'theme' });
```

Jeder Aufruf ist ein Promise. Die Brücke serialisiert die Argumente als JSON, ruft die native Methode im UI- oder Hintergrund-Thread auf und löst das Promise mit deren JSON-Antwort auf. Offizielle Plugins decken die üblichen Gerätefunktionen ab (Camera, Filesystem, Preferences, Share, Haptics, Local Notifications, Status Bar, App, Browser, Clipboard, Dialog …), dazu Community-Plugins (SQLite, Biometrie, …).

### 3. Eigene Plugins

```java
@CapacitorPlugin(name = "Launcher")
public class LauncherPlugin extends Plugin {
  @PluginMethod
  public void launchApp (PluginCall call) {
    String pkg = call.getString("packageName");
    Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(pkg);
    if (launch == null) { call.reject("no launch intent"); return; }
    getContext().startActivity(launch);
    call.resolve();
  }
}
```

```js
const Launcher = registerPlugin('Launcher');      // oder Capacitor.Plugins.Launcher
await Launcher.launchApp({ packageName: 'org.mozilla.firefox' });
```

Ein Plugin ist eine Klasse im nativen Projekt; `registerPlugin` liefert einen Proxy, dessen Methodenaufrufe über die Brücke gehen. Events laufen andersherum: `notifyListeners('state', data)` in Java, `Plugin.addListener('state', fn)` in JavaScript, oder `bridge.triggerWindowJSEvent('name')` als DOM-Event auf `window`.

### 4. Web-Implementierungen

```js
const Echo = registerPlugin('Echo', {
  web: () => import('./web.js').then(m => new m.EchoWeb()),   // im browser
});
```

Ein Plugin kann eine Web-Version mitbringen. So läuft dieselbe App im Browser (mit eingeschränkten Funktionen) und nativ.

### 5. Plattform und Live-Reload

```js
import { Capacitor } from '@capacitor/core';
Capacitor.isNativePlatform();      // true in der app
Capacitor.getPlatform();           // 'android' | 'ios' | 'web'
Capacitor.convertFileSrc(path);    // dateipfad -> url, die die webview laden darf
```

Mit `server.url` in der Konfiguration lädt die App die Seite vom Dev-Server im Netz, statt aus dem Paket: Hot Reload auf dem Gerät.

## Wie es intern arbeitet

Die Android-App ist eine `BridgeActivity` mit einer WebView. Die WebView lädt `https://localhost/` (auf iOS `capacitor://localhost`), ein lokaler Request-Handler liefert die Dateien aus den Assets. Beim Start wird ein kleines Skript eingeschleust, das `window.Capacitor` mit `Plugins`-Proxys anlegt. Ein Aufruf wird zu einer Nachricht `{ pluginId, methodName, options, callbackId }` an ein `@JavascriptInterface` (iOS: `WKScriptMessageHandler`); die Antwort kommt über `evaluateJavascript` mit derselben `callbackId` zurück.

## Stärken und Schwächen

- **Stark:** eine Codebasis für Web und App, das native Projekt bleibt unter eigener Kontrolle, eigene Plugins in wenigen Zeilen, offizielle Plugins für das Übliche, unabhängig vom Frontend-Framework, Web-Fallbacks.
- **Schwach:** die System-WebView bestimmt Leistung und Funktionsumfang (alte Android-Geräte, Safaris Eigenheiten auf iOS), jeder Plugin-Aufruf kostet eine JSON-Runde über die Brücke, große Updates von Capacitor bringen Migrationsschritte in Gradle und Xcode, mehrere WebViews oder echte native Oberflächen sind nicht vorgesehen (sie gehen nur über eigene Klimmzüge).

## Für rat und aufbau

- **rats Android-Ziel ist Capacitor.** `rat build --target android` erzeugt ein Capacitor-Projekt neben der App (`.capacitor/`), oder baut in ein vorhandenes, wenn `config.rat.js` es mit `capacitor` nennt. Die Treiber von `@rat/app` (store, files, folders, database, dialogs, notifications …) haben je eine `capacitor.js`, die die passenden Plugins über `Capacitor.Plugins` anspricht, ohne deren JavaScript ins Bundle zu ziehen.
- **Die Android-Apps von wallpaperfx** (Launcher, Live-Wallpaper, Browser) sind rat-Apps mit eigenen Plugins: `config.rat.js` nennt das Capacitor-Projekt, der Build landet in dessen `www/` (`rat/dev/android/README.md`). Der Browser zeigt, wie weit man Capacitor biegen kann: die Bridge-WebView transparent über nativen Content-WebViews.
- **Treiber-Muster.** Capacitors Web-Implementierung pro Plugin ist dieselbe Idee wie rats Treiber pro Shell (web, capacitor, deno): eine API, mehrere Umsetzungen, die zur Laufzeit oder beim Build gewählt werden.
- **Ordner auf Android** gehen in rat über das Storage Access Framework (eigenes `Saf`-Plugin), weil das Filesystem-Plugin nur App-eigene Verzeichnisse zuverlässig erreicht.
- Verwandt: [Ionic](ionic.md) (die UI-Bibliothek derselben Firma), [Tauri](tauri.md) und [Electrobun](electrobun.md) (dasselbe Prinzip für den Desktop).
