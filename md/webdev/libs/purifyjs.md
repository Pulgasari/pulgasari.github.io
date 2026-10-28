# purify.js

Eine kleine **DOM-Bibliothek mit Signals**, etwa 1 kb: Elemente werden mit einem Builder in reinem JavaScript erzeugt, reaktive Werte sind Signals, und die Bibliothek erhebt keinen Anspruch auf das DOM. Man darf jederzeit `querySelector`, `append` oder `remove` benutzen, ohne dass etwas bricht. Seit 2023, aktuell 0.5 (2026), auf JSR veröffentlicht (`@purifyjs/core`), LGPL-2.1.

- Repository: https://github.com/purifyjs/core
- Paket: https://jsr.io/@purifyjs/core
- Größe: 1,1 kb (alle Exporte)
- Build: keiner, kein JSX, keine eigene Dateiendung, kein Language Server
- Leitsatz: „a thin wrapper, not a framework“

## Das Problem, das purify.js löst

Frameworks besitzen das DOM: React, Vue und Svelte erwarten, dass nur sie ändern, was sie gerendert haben, und reagieren empfindlich, wenn fremder Code Knoten verschiebt. Dazu kommen Build-Schritt, JSX, eigene Dateiformate und Editor-Erweiterungen. purify.js will das Gegenteil: so nah an der Plattform wie möglich, nur die Teile ergänzen, die fehlen (Reaktivität, Lebenszyklus), und mit der Zeit **schrumpfen**, wenn die Plattform sie selbst kann.

## Kernkonzepte

### 1. Elemente über `tags`

```js
import { ref, tags, toChild } from '@purifyjs/core';

const { div, button, input, ul, li } = tags;

function Hello () {
  const counter = ref(0);
  return div().append$(
    ['Hallo, ', counter.derive(n => '👋'.repeat(n))],
    button().onclick(() => counter.val++).textContent('Hi!'),
  );
}

document.body.append(toChild(Hello()));
```

`tags.div()` liefert einen Builder um ein echtes `HTMLDivElement`. Jede Eigenschaft und jeder Event-Handler des Elements ist eine Methode, die den Builder zurückgibt; TypeScript kennt den genauen Elementtyp (`button()` hat `.disabled`, `input()` hat `.value`). Methoden mit `$` (`append$`, `replaceChildren$`) nehmen auch Signals und halten sie lebendig. Attribute gehen als Objekt an die Tag-Funktion (`div({ class: 'card', 'aria-live': 'polite' })`), getrennt von den Properties der Methodenkette.

### 2. Signals

```js
import { combine, ref, sync } from '@purifyjs/core';

const count  = ref(1);                                   // schreibbar: count.val
const double = count.derive(n => n * 2);                 // abgeleitet aus einem signal
const both   = combine({ count, double });               // aus mehreren: { count, double }
const total  = both.derive(({ count, double }) => count + double);

const stop = total.follow(value => console.log(value), true);   // beobachten, sofort einmal
count.val = 5;
stop();

// eine eigene quelle: läuft, solange jemand folgt
const now = sync(set => {
  const timer = setInterval(() => set(Date.now()), 1000);
  return () => clearInterval(timer);
});
```

Alles Reaktive ist ein Signal (die Klasse heißt `Sync`): `ref` ist schreibbar, `derive` leitet aus einem ab, `combine` fasst mehrere zusammen, `sync` baut eine Quelle mit Start und Stopp. Abhängigkeiten werden nicht automatisch beim Lesen erkannt, sondern ausdrücklich verkettet. `.pipe()` hängt eigene Operatoren an, ähnlich wie bei [RxJS](rxjs.md). Signals sind faul: Ein abgeleitetes Signal rechnet erst, wenn jemand ihm folgt, und hört auf, wenn niemand mehr zusieht.

### 3. An ein Element gebunden, solange es im DOM ist

```js
input()
  .value(name)                         // ein signal als property: bindet
  .oninput(event => name.val = event.currentTarget.value)
```

Gibt man einem Builder ein Signal statt eines Werts, folgt das Element ihm, solange es im Dokument hängt. Wird es entfernt, egal von wem, endet die Bindung. Das erledigt purify.js über einen Lebenszyklus am Element.

### 4. Lebenszyklus über `WithLifecycle`

```js
import { WithLifecycle } from '@purifyjs/core';

class Clock extends WithLifecycle(HTMLElement) {
  constructor () {
    super();
    this.$bind(element => {
      const timer = setInterval(() => this.textContent = new Date().toLocaleTimeString(), 1000);
      return () => clearInterval(timer);     // beim entfernen aus dem dom
    });
  }
}
customElements.define('x-clock', Clock);
```

Ein Mixin ergänzt Custom Elements um `$bind`: eine Funktion, die beim Einhängen läuft und deren Rückgabe beim Aushängen aufräumt. Builder haben dieselbe Methode (`div().$bind(element => …)`). Für gewöhnliche Elemente nutzt purify.js intern **customized built-in elements** (`<div is="…">`).

### 5. Kein JSX, kein SSR

Bewusst ausgelassen: JSX (ein `<img>` aus JSX ist nur ein `JSX.Element`, kein `HTMLImageElement`; außerdem braucht es einen Build), und Server-Rendering, das ausdrücklich nicht geplant ist.

## Wie es intern arbeitet

Der Builder ist ein Proxy um das Element: Ein Methodenaufruf wird zu einer Zuweisung an die gleichnamige Property oder zu einem Event-Handler. Signals sind kleine Objekte mit einer Liste von Folgern, die nur laufen, solange es Folger gibt; wird ein Signal einem Element gegeben, registriert purify.js die Bindung im Lebenszyklus des Elements und hebt sie beim Aushängen auf. Der Lebenszyklus beruht auf `connectedCallback`/`disconnectedCallback` erweiterter eingebauter Elemente.

## Stärken und Schwächen

- **Stark:** winzig, ohne Build, typisch das echte Element statt eines Wrapper-Typs, verträgt fremde DOM-Änderungen, Signals mit klarem Lebenszyklus, bewusst kleiner Umfang.
- **Schwach:** Safari unterstützt customized built-in elements nicht (ein Polyfill ist nötig; der Autor rät offen davon ab, Safari zu unterstützen), Markup als Methodenketten ist für große Seiten schwer zu lesen, kein Server-Rendering, kleine Nutzerschaft, vor 1.0.

## Für rat und aufbau

- **Die Haltung teilt domina.** „Don't break the DOM“ und „die Plattform verbessern statt verstecken“ sind auch die Leitsätze von `@domina` (Element-Hilfen, `dom.createElement`) und htx. purify.js zeigt, wie weit man mit Builder plus Signals ohne Compiler kommt.
- **Builder vs. Template.** rat geht den anderen Weg: Markup bleibt HTML, der Compiler macht daraus Template plus Bindungen. purifys Builder ist typisicher bis auf das Element, rats Templates sind lesbar wie die Seite.
- **Bindungen ans Element hängen** statt an eine Komponente ist eine gute Idee für rats Behaviors (`@tile`, `@reorder`): Sie räumen auf, wenn ihr Element geht, egal wer es entfernt.
- **Customized built-ins und Safari** sind derselbe Stolperstein, auf den jede Bibliothek trifft, die Lebenszyklus ohne eigenes Tag will. aufbau und rat arbeiten deshalb mit autonomen Custom Elements (`<rat-view>`, `<btn-icon>`) oder mit dem Lebenszyklus der Komponente.
- Verwandt: [RE:DOM](redom.md), [ArrowJS](arrowjs.md), [alien-signals](alien-signals.md), [htm](htm.md).
