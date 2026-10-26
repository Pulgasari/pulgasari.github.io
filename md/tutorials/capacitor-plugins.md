# Capacitor plugins :: what they are and how to write one

A Capacitor app is a web app in a native webview. A **plugin** is the bridge from that page to what only
native code can do: a function in JavaScript whose body runs in Kotlin (android) or Swift (ios).

```js
import { Echo } from 'my-echo';

const { value } = await Echo.echo({ value: 'hello' });   // runs in kotlin on android, in swift on ios
```

The api shown here is the one of Capacitor 6 and 7. Names move between major versions: check
[the docs](https://capacitorjs.com/docs/plugins/creating-plugins) against the version an app uses.

---

## when you need one of your own

First look whether it exists:

- **official** (`@capacitor/…`): app, browser, camera, clipboard, device, dialog, filesystem, geolocation, haptics, keyboard, local notifications, network, preferences, share, splash screen, status bar …
- **community** (`@capacitor-community/…`, [capawesome](https://capawesome.io)): sqlite, file picker, media, background tasks …

You write one when nothing covers what you need: a system api no plugin wraps, a library that exists
only in kotlin/swift, something specific to one device.

---

## how a call travels

```
page (js)                          Echo.echo({ value })
  │  registerPlugin('Echo') gives a proxy: every method becomes a message
  ▼
bridge                             { plugin: 'Echo', method: 'echo', options: { value } }
  │
  ▼
native                             EchoPlugin.echo(call)   (kotlin or swift)
  │  call.resolve({ value })   or   call.reject('message')
  ▼
page                               the promise resolves (or rejects)
```

Everything that crosses is json: strings, numbers, booleans, objects, arrays. No functions, no class
instances, no binary (files go as a path or as base64).

---

## 1. create it

```sh
npm init @capacitor/plugin@latest
```

It asks for the npm name (`my-echo`), the plugin's class name (`Echo`), the java package id
(`dev.pulgasari.echo`) and a repository. What comes out:

```
my-echo/
  src/
    definitions.ts   the api as types: what the page sees
    index.ts         registerPlugin: the proxy the page imports
    web.ts           the web implementation (the browser, and ionic serve)
  android/
    src/main/java/dev/pulgasari/echo/
      EchoPlugin.kt  the android side (older templates write java)
      Echo.kt        the actual work, kept apart from the bridge
  ios/
    Sources/EchoPlugin/
      EchoPlugin.swift
      Echo.swift
  package.json
```

---

## 2. the api: `definitions.ts`

The contract. Both native sides and the web side follow it:

```ts
export interface EchoPlugin {
  echo (options: { value: string }): Promise<{ value: string }>;
}
```

---

## 3. the page side: `index.ts` and `web.ts`

```ts
// index.ts
import { registerPlugin } from '@capacitor/core';
import type { EchoPlugin } from './definitions';

const Echo = registerPlugin<EchoPlugin>('Echo', {
  web: () => import('./web').then(module => new module.EchoWeb()),
});

export * from './definitions';
export { Echo };
```

`registerPlugin('Echo')` gives an object whose methods call the native plugin of that name. On a platform
without one (the browser) it takes `web`:

```ts
// web.ts
import { WebPlugin } from '@capacitor/core';
import type { EchoPlugin } from './definitions';

export class EchoWeb extends WebPlugin implements EchoPlugin {
  async echo (options: { value: string }) {
    return options;
  }
}
```

A plugin that has no sense in a browser rejects there: `throw this.unimplemented('not on the web')`.

---

## 4. the android side

```kotlin
// android/src/main/java/dev/pulgasari/echo/EchoPlugin.kt
package dev.pulgasari.echo

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Echo")              // the name registerPlugin uses
class EchoPlugin : Plugin() {

  @PluginMethod                              // a method the page can call
  fun echo (call: PluginCall) {
    val value = call.getString("value") ?: return call.reject("value is missing")
    val result = JSObject()
    result.put("value", value)
    call.resolve(result)
  }
}
```

- `call.getString`, `getInt`, `getBoolean`, `getObject`, `getArray` read the options
- `call.resolve(JSObject)` answers, `call.reject(message)` fails the promise
- `context` and `activity` are there for everything android needs (`activity.contentResolver` …)
- long work goes off the main thread: `Thread { … call.resolve(…) }.start()` or coroutines

---

## 5. the ios side

```swift
// ios/Sources/EchoPlugin/EchoPlugin.swift
import Capacitor
import Foundation

@objc(EchoPlugin)
public class EchoPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier    = "EchoPlugin"
  public let jsName        = "Echo"                        // the name registerPlugin uses
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise),
  ]

  @objc func echo (_ call: CAPPluginCall) {
    guard let value = call.getString("value") else { return call.reject("value is missing") }
    call.resolve(["value": value])
  }
}
```

Every method the page may call is listed in `pluginMethods`. ios can be built on a mac only. An android-only
plugin may leave the ios side rejecting.

---

## 6. events: native -> page

For what happens without a call (a sensor, a download that progresses):

```kotlin
notifyListeners("progress", JSObject().put("percent", 40))
```

```ts
// definitions.ts
addListener (event: 'progress', listener: (data: { percent: number }) => void): Promise<PluginListenerHandle>;
```

```js
const handle = await Echo.addListener('progress', ({ percent }) => …);
await handle.remove();
```

---

## 7. permissions

A plugin that needs one (the camera, notifications) declares it and asks before it acts:

```kotlin
@CapacitorPlugin(
  name = "Echo",
  permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])]
)
class EchoPlugin : Plugin() {

  @PluginMethod
  fun notify (call: PluginCall) {
    if (getPermissionState("notifications") != PermissionState.GRANTED) {
      return requestPermissionForAlias("notifications", call, "afterPermission")
    }
    …
  }

  @PermissionCallback
  private fun afterPermission (call: PluginCall) {
    if (getPermissionState("notifications") == PermissionState.GRANTED) notify(call)
    else call.reject("permission denied")
  }
}
```

The permission goes into `android/src/main/AndroidManifest.xml` of the plugin as well, android merges it
into the app's.

---

## 8. use it in an app

```sh
# in the app's folder (the one with capacitor.config)
npm install ../my-echo        # a local folder while you write it, later from npm
npx cap sync                  # copies the web build, wires the native plugins into the android / ios projects
npx cap open android          # android studio, run it on a device or an emulator
```

A plugin from npm registers itself, nothing to add to `MainActivity`.

### a plugin only for one app, without a package

The class can live in the app's own android project, then the app registers it itself:

```kotlin
// android/app/src/main/java/…/MainActivity.kt
class MainActivity : BridgeActivity() {
  override fun onCreate (savedInstanceState: Bundle?) {
    registerPlugin(EchoPlugin::class.java)   // before super.onCreate
    super.onCreate(savedInstanceState)
  }
}
```

```js
import { registerPlugin } from '@capacitor/core';
const Echo = registerPlugin('Echo');
```

Faster to start, but it lives in one app only. A package is the way once a second app needs it.

---

## 9. checking it

- `console.log` of the page shows in chrome's `chrome://inspect` (a device with usb debugging, or the emulator)
- the native side logs to logcat: `Log.d("Echo", "…")`, android studio shows it
- `npx cap run android` builds and starts on a connected device in one step

---

## and rat

In rat's driver model ([rat-drivers](../concepts/rat-drivers.md)) a plugin is what a capacitor driver calls.
The web side then has two homes, the plugin's `web.ts` and rat's web driver. Keep one: rat's web driver for
the browser, the plugin for native only (its `web` left out or rejecting), so a mod does not exist twice with
two behaviours.

```js
// drivers/notifications/capacitor.js
import { LocalNotifications } from '@capacitor/local-notifications';
export const show = ({ title, body }) => LocalNotifications.schedule({ notifications: [{ body, id: Date.now() % 2 ** 31, title }] });
```

Sources: [Creating Capacitor Plugins](https://capacitorjs.com/docs/plugins/creating-plugins),
[@capacitor/create-plugin](https://classic.yarnpkg.com/en/package/@capacitor/create-plugin),
[capgo: the ultimate guide to Capacitor plugin development](https://capgo.app/blog/ultimate-guide-to-capacitor-plugin-development/).
