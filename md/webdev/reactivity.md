# Reaktivität

Ein Einstieg: was Reaktivität ist, welche Fragen jedes reaktive System beantworten muss, und die Begriffe, die dabei immer wieder auftauchen. Die einzelnen Modelle (Observer, Dirty Checking, Virtual DOM, Signals, Compiler …) und wie sie auseinander hervorgegangen sind, stehen in [reactivity_models.md](reactivity_models.md).

---

## Inhalt
- [1. Worum es geht](#1-worum-es-geht)
- [2. Die Tabellenkalkulation als Urbild](#2-die-tabellenkalkulation-als-urbild)
- [3. Die drei Rollen](#3-die-drei-rollen)
- [4. Sechs Fragen, die jedes System beantwortet](#4-sechs-fragen-die-jedes-system-beantwortet)
- [5. Begriffe](#5-begriffe)
- [6. Ein Signal in 30 Zeilen](#6-ein-signal-in-30-zeilen)
- [7. Typische Fallen](#7-typische-fallen)
- [8. Wo man es in meinen Projekten findet](#8-wo-man-es-in-meinen-projekten-findet)

---

## 1. Worum es geht

Eine Oberfläche zeigt Zustand an. Ändert sich der Zustand, muss sich die Anzeige ändern. **Reaktivität** heißt: Diese zweite Hälfte passiert von selbst. Man beschreibt einmal, *was wovon abhängt*, und das System sorgt dafür, dass es stimmt.

Ohne Reaktivität:

```js
let count = 0;

button.addEventListener('click', () => {
  count++;
  label.textContent = `${count} clicks`;        // every write must remember every reader
  badge.hidden      = count === 0;
  total.textContent = String(count * price);
});
```

Jede Stelle, die `count` ändert, muss wissen, wer `count` anzeigt. Kommt eine Anzeige dazu, müssen alle Schreibstellen angepasst werden. Vergisst eine davon eine Anzeige, ist die Oberfläche inkonsistent.

Mit Reaktivität:

```js
const count = signal(0);

effect(() => label.textContent = `${count.value} clicks`);
effect(() => badge.hidden = count.value === 0);
effect(() => total.textContent = String(count.value * price));

button.addEventListener('click', () => count.value++);   // the write knows no reader
```

Schreiben und Lesen sind entkoppelt. Die Schreibstelle weiß nichts von den Anzeigen, jede Anzeige sagt selbst, was sie braucht.

---

## 2. Die Tabellenkalkulation als Urbild

Fast jedes reaktive System ist eine Tabellenkalkulation in anderer Form (VisiCalc, 1979):

| Tabelle | reaktives System |
|---|---|
| Zelle mit einem Wert (`A1 = 5`) | Quelle, Zustand, Signal, Observable |
| Zelle mit einer Formel (`C1 = A1 + B1`) | abgeleiteter Wert, Computed, Memo, Selector |
| ein Diagramm, das die Zellen zeigt | Effekt, Reaction, Render, Watcher |
| Neuberechnung beim Ändern einer Zelle | Propagation |

Was eine Tabelle ohne Nachdenken richtig macht, ist genau das, was reaktive Systeme schwer finden: Sie rechnet jede Formel **einmal**, **in der richtigen Reihenfolge**, und **nur die betroffenen**. Die meisten Unterschiede zwischen den Modellen sind Antworten darauf, wie man das erreicht.

---

## 3. Die drei Rollen

```
source  ──▶  derived  ──▶  effect
(state)      (computed)     (side effect: dom, network, log)
```

| Rolle | liest | wird gelesen | hat Seiteneffekte | Beispiele |
|---|---|---|---|---|
| **Quelle** | nichts | ja | nein | `signal`, `ref`, `observable`, `useState`, `$state` |
| **Abgeleitet** | Quellen und andere Abgeleitete | ja | nein (rein) | `computed`, `memo`, `pureComputed`, `$derived`, `useMemo` |
| **Effekt** | Quellen und Abgeleitete | nein | ja | `effect`, `autorun`, `watch`, `subscribe`, `$effect`, ein Render |

Die wichtigste Regel aller Modelle: **Abgeleitete Werte sind rein.** Sie berechnen nur. Alles, was die Welt verändert (DOM schreiben, Netzwerk, Log), gehört in einen Effekt. Wer im Computed etwas schreibt, bekommt Zyklen, doppelte Läufe und Reihenfolgefehler.

---

## 4. Sechs Fragen, die jedes System beantwortet

Jedes Modell in [reactivity_models.md](reactivity_models.md) lässt sich an diesen sechs Fragen einordnen.

### 4.1 Woher weiß das System, was sich geändert hat?

| Antwort | Wie | Beispiel |
|---|---|---|
| **gar nicht** | der Code sagt es (`render()` aufrufen) | jQuery, Backbone |
| **Vergleich** | alte und neue Werte vergleichen | AngularJS (Dirty Checking), React (Virtual DOM, `Object.is` bei State) |
| **Abfangen** | jeder Schreibzugriff läuft durch eine Funktion, einen Setter oder einen Proxy | Knockout, Vue, MobX, Signals |
| **Compiler** | Zuweisungen werden beim Übersetzen erkannt | Svelte 3, rat |

### 4.2 Woher weiß das System, wer betroffen ist?

| Antwort | Wie | Beispiel |
|---|---|---|
| **niemand Bestimmtes** | alles neu rendern, danach vergleichen | React, Elm |
| **ausdrücklich** | Abhängigkeiten werden aufgeschrieben | Ember-Computed mit Dependent Keys, `useEffect(fn, [a, b])`, RxJS `combineLatest(a, b)` |
| **automatisch** | Lesezugriffe während einer Berechnung werden mitgeschrieben | Knockout, MobX, Vue, Signals |
| **statisch** | der Compiler sieht, welche Variablen ein Ausdruck liest | Svelte 3 |

Automatisches Mitschreiben (*automatic dependency tracking*) ist der Trick, der Knockout 2010 so überlegen machte und der heute in jedem Signal-System steckt.

### 4.3 Push oder Pull?

- **Push:** Eine Änderung schiebt neue Werte zu allen Abhängigen. Schnell, aber es wird auch berechnet, was niemand liest.
- **Pull:** Abhängige holen sich Werte erst, wenn sie gelesen werden. Faul, aber jemand muss wissen, *wann* zu lesen ist.
- **Push-Pull:** Eine Änderung schiebt nur die Information „veraltet“ durch den Graphen, die Werte werden beim Lesen gezogen. So arbeiten MobX und alle modernen Signal-Bibliotheken.

### 4.4 Wie fein?

| Granularität | Bei einer Änderung läuft neu | Beispiel |
|---|---|---|
| App | alles | Elm, frühes React mit einem Store an der Wurzel |
| Komponente | die Komponente und ihre Kinder, dann ein Diff | React, Vue (Render-Ebene), MobX mit `observer` |
| Knoten | genau der Textknoten oder das Attribut, das den Wert zeigt | Solid, Svelte 5, Lit-Direktiven, rat |

Feiner heißt weniger Arbeit pro Änderung, aber mehr Buchhaltung (jeder Knoten ist ein kleiner Effekt).

### 4.5 Wann läuft es?

- **synchron:** sofort beim Schreiben. Einfach zu verstehen, aber drei Schreibzugriffe hintereinander lösen drei Durchläufe aus.
- **gebündelt (Batch):** Schreibzugriffe in einer Transaktion (`batch`, `action`, `runInAction`) lösen einen Durchlauf am Ende aus.
- **geplant:** am Ende der Microtask, im nächsten Frame oder nach Priorität (React Concurrent Mode).

### 4.6 Veränderung oder Neuzuweisung?

- **Neuzuweisung (immutable):** `state = { ...state, done: true }`. Eine Änderung ist eine neue Referenz, und ein Vergleich per `===` reicht. Grundlage von React, Redux, Elm.
- **Mutation:** `state.done = true`. Ein Proxy oder Setter bemerkt sie. Grundlage von Vue, MobX, Valtio, Solid Stores.

Beides ist legitim. Neuzuweisung macht Änderungen billig erkennbar und Verlauf (Undo) trivial, verlangt aber Kopien. Mutation ist natürlicher zu schreiben, verlangt aber Proxies und hat Identitätsfallen.

---

## 5. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Abhängigkeitsgraph** | Knoten sind Quellen, Abgeleitete und Effekte; Kanten zeigen „liest“. Gerichtet und hoffentlich azyklisch |
| **Tracking-Kontext** | die gerade laufende Berechnung, bei der sich gelesene Quellen anmelden. Meist ein globaler Stapel |
| **Glitch** | ein Zwischenzustand wird sichtbar: ein Abgeleiteter rechnet mit einer neuen und einer alten Quelle zugleich |
| **Diamond-Problem** | der klassische Glitch-Fall: `A → B`, `A → C`, `B + C → D`. Ändert sich `A`, darf `D` nur einmal und nur mit neuem `B` *und* neuem `C` rechnen |
| **glitch-frei** | das System garantiert, dass kein Abgeleiteter einen Zwischenzustand sieht (Topologische Ordnung oder Push-Pull mit Färbung) |
| **Batch / Transaktion** | mehrere Schreibzugriffe, ein Durchlauf |
| **Equality / `equals`** | nach welcher Regel ein neuer Wert „gleich“ ist und keine Propagation auslöst. Meist `Object.is` |
| **lazy / eager** | Abgeleitete rechnen erst beim Lesen (lazy) oder sofort bei Änderung (eager) |
| **untrack / peek** | lesen, ohne sich als Abhängigkeit anzumelden |
| **Owner / Scope** | ein Effekt gehört zu einem Besitzer (Komponente, Root). Wird der entsorgt, auch alle seine Effekte |
| **Cleanup / Dispose** | Code, der vor dem nächsten Lauf oder beim Entsorgen eines Effekts läuft (Listener abmelden, Timer stoppen) |
| **Resource / Suspense** | ein asynchroner Wert mit Ladezustand im Graphen |
| **Store** | ein Objekt (oft tief) mit reaktiven Eigenschaften, meist über Proxies |
| **Snapshot** | eine eingefrorene, unveränderliche Kopie eines reaktiven Zustands, z. B. für Rendering oder Undo |

---

## 6. Ein Signal in 30 Zeilen

Das Grundprinzip moderner Signals, ohne Optimierungen, zum Verstehen:

```js
let current = null;   // the computation that is running, it collects what it reads

export function signal (value) {
  const subscribers = new Set;
  return {
    get value () {
      if (current) { subscribers.add(current); current.sources.add(subscribers); }
      return value;
    },
    set value (next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const run of [...subscribers]) run();
    },
  };
}

export function effect (fn) {
  const run = () => {
    for (const sources of run.sources) sources.delete(run);   // forget the old dependencies
    run.sources.clear();
    const previous = current;
    current = run;
    try { fn(); } finally { current = previous; }             // re-collect them
  };
  run.sources = new Set;
  run();
  return () => { for (const sources of run.sources) sources.delete(run); };
}

export const computed = fn => {
  const result = signal();
  effect(() => result.value = fn());
  return { get value () { return result.value; } };
};
```

Das reicht für das Beispiel aus Abschnitt 1. Es hat genau die Schwächen, die echte Bibliotheken lösen:

- **Eager:** `computed` rechnet sofort, auch wenn niemand liest.
- **Glitches:** Im Diamond rechnet `D` zweimal, einmal davon mit einem alten Wert.
- **Kein Batch:** drei Schreibzugriffe, drei Durchläufe.
- **Keine Besitzer:** Effekte in Effekten werden nie entsorgt.

Wie das gelöst wird (Färbung, Versionsnummern, Push-Pull), steht in [reactivity_models.md, Signals](reactivity_models.md#8-feingranulare-signals).

---

## 7. Typische Fallen

| Falle | Was passiert | Gegenmittel |
|---|---|---|
| **Destructuring** | `const { count } = store` liest einmal; danach ist `count` ein toter Wert | spät lesen, Getter oder Signal weitergeben |
| **Lesen außerhalb des Kontexts** | in einem Callback, `setTimeout` oder nach `await` gelesen, also nicht verfolgt | im Effekt lesen, oder bewusst `untrack` |
| **Schreiben im Computed** | Zyklen, Endlosschleifen, „Cannot update during render“ | Schreiben nur in Effekten oder Event-Handlern |
| **Effekt schreibt, was er liest** | Endlosschleife | `untrack` oder Logik in ein Computed |
| **Vergessenes Cleanup** | Listener und Timer überleben die Komponente (Speicherleck) | Owner-Bäume, `onCleanup`, `AbortSignal` |
| **Objekt-Identität** | neues Objekt mit gleichem Inhalt gilt als Änderung | `equals` setzen, oder primitive Werte ableiten |
| **Mutation ohne Meldung** | `array.push()` auf einem Signal ändert den Inhalt, aber nicht die Referenz | neu zuweisen, oder reaktive Collections |
| **Async** | nach `await` ist der Tracking-Kontext weg | Resources, `flow`, Batch pro Abschnitt (siehe [MobX, Deep Dive](libs/mobx.md#flow-actions-über-await-hinweg-zu-6)) |

---

## 8. Wo man es in meinen Projekten findet

| Projekt | Modell | Wo |
|---|---|---|
| rat | Compiler plus Signals: `let $count = 0` wird zu `signal(0)`, `{$count}` zu einem Effekt pro Loch | `@rat/runtime/signals.js`, `@rat/compiler` |
| aufbau | Signals (`@aufbau/signals`, Basis Preact Signals), eigener Push-Pull-Kern in `@aufbau/store/reactive` | `signals/`, `store/reactive.js` |
| domina | keine eigene Reaktivität; `@domina/observer` beobachtet das DOM selbst (Mutation, Resize, Sichtbarkeit) | `packages/observer` |

Steckbriefe mit Bezug: [Knockout](libs/knockout.md), [MobX](libs/mobx.md), [RxJS](libs/rxjs.md), [Elm](libs/elm.md), [Backbone](libs/backbone.md), [ArrowJS](libs/arrowjs.md), [Marko](libs/marko.md), [Lit](libs/lit.md).
