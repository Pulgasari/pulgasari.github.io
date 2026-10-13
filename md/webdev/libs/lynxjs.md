# Lynx (LynxJS)

ByteDances Open-Source-Framework für **native** Oberflächen mit Web-Technik: Markup, CSS und JavaScript (meist React) werden nicht in einem Browser angezeigt, sondern von einer eigenen Engine als echte native Views gerendert, auf Android, iOS, HarmonyOS und im Web. Im Einsatz in TikTok, seit März 2025 offen (Apache 2.0).

- Website: https://lynxjs.org
- Repository: https://github.com/lynx-family/lynx
- Build: Rspeedy (basiert auf Rsbuild/Rspack)

## Worum es geht

React Native hat gezeigt, dass man mit JavaScript native Apps bauen kann, aber mit eigenen Komponenten und einem Styling, das nur nach CSS aussieht. Lynx will näher am Web bleiben (echte CSS-Selektoren, Klassen, Animationen, Variablen) und gleichzeitig schneller starten. Der Hebel dafür ist die **Zwei-Thread-Architektur**.

## Kernkonzepte

### 1. Eigene Element-Tags statt HTML

```html
<view style="padding:10px;background:gray;">
  <text>Hallo Lynx</text>
  <image src="assets/logo.png" />
</view>
```

Statt `<div>`, `<span>`, `<img>` gibt es `<view>`, `<text>`, `<image>`, dazu `<scroll-view>` und `<list>` (virtualisierte Listen). Jedes Tag wird zu einer echten nativen View. Text muss in `<text>` stehen, wie in React Native.

### 2. CSS, wirklich als CSS

Klassen, Selektoren, CSS-Variablen, Transitions und Keyframe-Animationen funktionieren. Für das Layout gibt es Flexbox, Grid und zusätzlich ein eigenes Linear- und Relative-Layout, das aus der nativen Welt kommt.

### 3. Zwei Threads

| Thread | Aufgabe | Engine |
|---|---|---|
| **Main Thread** | Layout, Rendering, Main-Thread-Skripte, alles was Pixel betrifft | PrimJS (basiert auf QuickJS, vom Lynx-Team) |
| **Background Thread** | der eigentliche App-Code: State, Datenabruf, Logik | PrimJS auf Android, JavaScriptCore auf iOS |

Der App-Code kann die Oberfläche also nicht blockieren, egal wie viel er rechnet. Der Preis: Ein Event entsteht auf dem Main Thread, der Handler läuft im Hintergrund, das Ergebnis muss zurück. Für Gesten und Animationen ist dieser Umweg spürbar.

### 4. Main-Thread-Skripte

Die Lösung für diesen Umweg: Code, der ausdrücklich auf dem Main Thread läuft, markiert mit einer Direktive wie `'use strict'`:

```tsx
export default function App () {
  const red = 'red';

  function addBackgroundColor (event) {
    'main thread';
    event.currentTarget.setStyleProperty('background-color', red);
  }

  return (
    <view main-thread:bindtap={addBackgroundColor}>
      <text>Hallo Welt!</text>
    </view>
  );
}
```

- `'main thread'` als erste Zeile macht die Funktion zur Main-Thread-Funktion.
- `main-thread:bindtap` hängt sie als Event-Handler an, der synchron auf dem Main Thread läuft.
- Variablen von außen (`red`) werden beim Definieren mitgenommen, als Kopie.

### 5. Instant First-Frame Rendering (IFR)

Weil der App-Code auch auf dem Main Thread laufen kann, rendert Lynx den ersten Frame synchron beim Laden, wenn die Daten schon da sind: kein weißer Bildschirm, kein Zwischenzustand. Im Web löst man das mit SSR; Lynx bekommt es aus der Architektur.

### 6. ReactLynx

Die offizielle Bindung ist React (`@lynx-js/react`), mit Events in Lynx-Schreibweise (`bindtap` statt `onClick`). Die Engine selbst ist framework-neutral, andere Bindungen sind möglich.

## Wie es intern arbeitet

Der Build (Rspeedy) erzeugt ein Bundle, das die Lynx-Engine lädt. Die Engine baut aus den Element-Tags einen Element-Baum, berechnet Layout und Styles selbst (keine WebView) und erzeugt daraus native Views der jeweiligen Plattform oder zeichnet mit einem eigenen Renderer. Der Background Thread schickt Änderungen am Baum als Operationen an den Main Thread.

## Stärken und Schwächen

- **Stark:** echte native UI mit Web-Wissen, sehr schneller Start, flüssige Interaktion auch bei viel App-Logik. In TikTok im großen Maßstab erprobt.
- **Schwach:** junges Ökosystem außerhalb von ByteDance, macOS als empfohlene Entwicklungsumgebung, eigene Tags statt HTML (Web-Code ist nicht direkt übertragbar). Die Thread-Grenze muss man ständig mitdenken.

## Für rat und aufbau

- **zugriff ist das direkte Gegenmodell:** Capacitor zeigt die Web-App in einer WebView, Lynx rendert nativ. Für zugriff bleibt die WebView richtig (offline, ein Code für Web und Android, aufbau-Elemente). Lynx wäre interessant, falls einzelne Apps (etwa `videos` oder `images`) an Grenzen der WebView-Performance stoßen.
- **Die Direktive `'main thread'`** ist eine schöne Form, Code einem Ausführungsort zuzuordnen. In rat könnte dieselbe Idee für Worker gelten: `'worker'` in einer Funktion, und der Compiler lagert sie in einen Web Worker aus.
- **Zwei Threads** sind die konsequente Form von „UI blockiert nie". Im Browser ist das mit Web Workern plus OffscreenCanvas nur teilweise machbar, weil das DOM nur im Main Thread existiert.
