# rat drivers :: one api, a driver per platform

A mod of rat (`RAT.app.clipboard`, `RAT.app.files`, `RAT.app.notifications`) has **one api**. What does the
work underneath depends on where the app runs: the browser, an android app through Capacitor, a desktop app
through Deno Desktop. The app does not know and does not care:

```js
await RAT.app.clipboard.write('copied');           // the same line in the browser, on android, on windows
await RAT.app.notifications.show({ title: 'scan done' });
const folder = await RAT.app.folders.add();         // the browser's picker, android's, the desktop's
```

---

## targets

| target | shell | status |
|---|---|---|
| web | the browser | the base. every mod has a web driver, even a weaker one |
| android | Capacitor | stable. Capacitor plugins for files, sqlite, notifications, clipboard, share … |
| ios | Capacitor | the same project as android, no extra work beyond building it on a mac |
| windows, linux, macos | Deno Desktop (`deno desktop`, Deno 2.9+) | **experimental**. system webview (WebView2, WebKitGTK, WKWebView) or bundled chromium (cef). the page calls deno through `bindings.<name>()` |
| harmonyos | – | no Capacitor platform (Ionic researches it). would need a shell of its own: ArkWeb plus a bridge in ArkTS. the web build runs in its browser meanwhile |
| freebsd | – | Deno Desktop does not list it, Deno itself has no official freebsd build. the web build runs in a browser |

Harmonyos and freebsd get the web drivers: they work wherever a browser does. A native driver comes
when a shell does.

---

## the layers

```
app code                 RAT.app.clipboard.write('…')
   │
mod (the api)            packages/app/modules/clipboard.js     one contract, no platform in it
   │
driver (the platform)    drivers/clipboard/web.js · capacitor.js · deno.js
   │
platform                 navigator.clipboard · @capacitor/clipboard · bindings['rat:clipboard.write']
```

Four rules keep it clean:

1. **The mod knows no platform.** It checks arguments, holds state, gives the app its api. It calls its driver.
2. **A driver knows one platform and nothing else.** It does exactly what the contract asks, no more.
3. **Choosing the driver is in one place:** the platform rat runs on, found once (`platform.js`).
4. **Every mod has a web driver.** Native ones are additions. An app never breaks in the browser.

---

## 1. where rat runs: `platform.js`

Found once, at start, from what the shell puts into the page:

```js
// @rat/app :: platform

const capacitor = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.getPlatform() : null;   // 'android' | 'ios'
const deno      = typeof globalThis.bindings === 'object' ? 'desktop' : null;                                // deno desktop exposes bindings

export const platform = capacitor ?? deno ?? 'web';   // 'android' | 'ios' | 'desktop' | 'web'
export const native   = platform !== 'web';
```

`RAT.platform` gives it to an app that has to do something different itself (rare: a menu that only
the desktop has).

---

## 2. the contract of a mod

Written once, in the mod. Every driver fulfils it. Everything returns a promise, the native calls cross a
bridge:

```js
// @rat/app :: modules/clipboard.js

/*
contract of a clipboard driver:

  read  ()      -> promise of the text
  write (text)  -> promise
  can           -> { read: bool, write: bool }   what the platform allows (a browser may not read)
*/

import { driverOf } from '../drivers.js';

const clipboard = async (options, { app }) => {
  const driver = await driverOf('clipboard', options.driver);
  return {
    can   : driver.can,
    read  : () => driver.can.read ? driver.read() : Promise.reject(new Error('[rat] clipboard: this platform does not let the app read it')),
    write : text => driver.write(String(text)),
  };
};

export default clipboard;
```

`can` says before a call what works. An app shows a "paste" button only where it does something, instead
of failing on the press.

---

## 3. drivers: one file per platform

```js
// drivers/clipboard/web.js
export const can   = { read: !!navigator.clipboard?.readText, write: !!navigator.clipboard?.writeText };
export const read  = () => navigator.clipboard.readText();
export const write = text => navigator.clipboard.writeText(text);
```

```js
// drivers/clipboard/capacitor.js
import { Clipboard } from '@capacitor/clipboard';

export const can   = { read: true, write: true };
export const read  = async () => (await Clipboard.read()).value;
export const write = text => Clipboard.write({ string: text });
```

```js
// drivers/clipboard/deno.js: the page side. the deno side is below
export const can   = { read: true, write: true };
export const read  = () => bindings['rat:clipboard.read']();
export const write = text => bindings['rat:clipboard.write'](text);
```

---

## 4. choosing and loading: `drivers.js`

One table: mod -> platform -> how to load. Only the driver of this platform is loaded, the others are files
that are never fetched. A mod without a native driver falls back to web:

```js
// @rat/app :: drivers

import { platform } from './platform.js';

const DRIVERS = {
  clipboard : {
    capacitor : () => import('./drivers/clipboard/capacitor.js'),
    deno      : () => import('./drivers/clipboard/deno.js'),
    web       : () => import('./drivers/clipboard/web.js'),
  },
  notifications : {
    capacitor : () => import('./drivers/notifications/capacitor.js'),
    deno      : () => import('./drivers/notifications/deno.js'),
    web       : () => import('./drivers/notifications/web.js'),
  },
  // …
};

// android and ios share capacitor, the desktop is deno
const SHELL = { android: 'capacitor', desktop: 'deno', ios: 'capacitor', web: 'web' };

// the driver of a mod: the one config.rat.js names, else the platform's, else web
export function driverOf (mod, named) {
  const drivers = DRIVERS[mod];
  const loader  = drivers[named] ?? drivers[SHELL[platform]] ?? drivers.web;
  return loader();
}
```

`config.rat.js` can name a driver for one mod (`clipboard: { driver: 'web' }`), for a test or a platform
where the native one misbehaves. bunker's `driver` option (`store: { driver: 'local' }`) already works this
way, the two use the same word.

---

## 5. the native side

### Capacitor

Nothing of its own: a driver imports the plugin (`@capacitor/clipboard`), Capacitor bridges it. An app lists
the plugins it uses in its Capacitor project (`npm i @capacitor/clipboard`, `npx cap sync`). Where no plugin
exists, a Capacitor plugin of rat's own (kotlin and swift) is the way, the same as skullface's
`modules-android`, only inside Capacitor's plugin model.

### Deno Desktop

The deno side binds a handler per call, under rat's own prefix so they do not mix with the app's:

```js
// @rat/app/host/deno.js: the deno side of rat's drivers, called by the app's deno entrypoint
export function host (win) {
  win.bind('rat:clipboard.read',  () => clipboard.readText());
  win.bind('rat:clipboard.write', text => clipboard.writeText(text));
  win.bind('rat:files.read',      path => Deno.readFile(path));
  win.bind('rat:notifications.show', options => notify(options));   // through the notifications api of deno desktop (its docs)
  // …
}
```

```js
// the app's deno entrypoint (main.ts), next to its built apps/<name>
import { host } from '@rat/app/host/deno.js';
const win = …;   // the window deno desktop opens
host(win);
win.bind('scanLibrary', path => …);   // the app's own, without the rat: prefix
```

The app's own bindings are skullface's `addCommand` idea, with deno desktop's mechanism: the page calls
`bindings.scanLibrary(path)`.

---

## 6. in a build: only the platform's drivers

`rat build --target android` (`desktop`, `web`) knows the platform before the app runs. `@rat/dev` sets it as a
constant, the table shrinks to one driver per mod, the others are not part of the build:

```js
// what drivers.js becomes in a build for android (the minifier drops the rest)
const loader = drivers.capacitor ?? drivers.web;
```

Without a build (`run.js` in a browser) the table stays whole and the platform is found at runtime, as above.

The target then also says what comes after the build:

| target | after `rat build` |
|---|---|
| `web` | `apps/<name>`, served as it is |
| `android`, `ios` | copied into the app's Capacitor project, `npx cap sync`, then gradle / xcode |
| `desktop` | `deno desktop` on the app's entrypoint, per os (cross-compiling as deno allows) |

---

## the mods and their drivers

| mod | web | capacitor (android, ios) | deno desktop |
|---|---|---|---|
| `store` | localStorage, … (bunker) | Preferences | a json file in the app's data folder |
| `database` | indexeddb (bunker) | sqlite | sqlite (deno) |
| `files` | opfs (bunker) | Filesystem (app data) | the app's data folder |
| `folders` | showDirectoryPicker, only chromium | a folder picker + Filesystem | a folder dialog + Deno fs: real paths, any folder |
| `thumbnails` | opfs + canvas | the same, files through Filesystem | the same |
| `clipboard` | navigator.clipboard (reading often not allowed) | Clipboard | the system's |
| `notifications` | Notification api, permission | LocalNotifications | the system's |
| `dialogs` | `<pop-prompt>`, pickers of the browser | Dialog | native dialogs |
| `external` (open a url, a file) | window.open | Browser, App Launcher | the default app |
| `share` | navigator.share where there is one | Share | – (no share sheet on the desktop) |
| `offline` | service worker | not needed: the files are in the app | not needed |

`folders` is the one that gains most: noisy, ebooks and notes read folders the user grants. On the desktop
and on android a driver reaches real paths and any folder, not only what chromium's picker allows.

---

## steps

1. ~~**`platform.js` and `drivers.js`** in `@rat/app`, the table empty except for web.~~ done
2. ~~**One small mod through all three platforms**, `clipboard`: contract, three drivers, the deno host.~~ done.
   the deno side has no clipboard of its own: the system's tools (pbcopy/pbpaste, wl-clipboard or xclip, powershell)
3. ~~**`rat build --target`**: the constant for the platform, the steps after the build (capacitor, deno desktop).~~
   done: `capacitor` and `desktop` in `config.rat.js` name the capacitor project and the deno entrypoint
4. **The mods that exist** (`store`, `database`, `files`, `folders`) get their native drivers, bunker's driver
   option and this table become one.
5. **New mods** (`notifications`, `dialogs`, `external`, `share`) when an app needs them.
