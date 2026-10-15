# alien-signals

Eine Signal-Bibliothek, die sich als „die leichteste“ bezeichnet und in Benchmarks seit 2024 vorne liegt. Von Johnson Chu (Autor der Vue Language Tools, Mitarbeiter am Reaktivitätssystem von Vue), seit Oktober 2024, unter dem Dach von StackBlitz. Der Algorithmus wurde in Vue 3.6 übernommen, ebenso in XState und (als Port) in [Datastar](datastar.md). Aktuell 3.2.1 (Mai 2026), aktiv, aber bewusst klein gehalten.

- Repository: https://github.com/stackblitz/alien-signals
- Abhängigkeiten: keine
- Build: keiner nötig
- Ports: Dart, Lua, Go, Rust, Java, C# und weitere

## Das Problem, das alien-signals löst

Signals (Signal, Computed, Effect mit automatischer Abhängigkeitserkennung, Herleitung in [reactivity_models.md](../reactivity_models.md)) sind seit Solid und Preact Signals das Standardmodell. Die Implementierungen unterscheiden sich aber stark darin, was eine Änderung kostet: Speicher pro Abhängigkeit, Arbeit beim Weitergeben, wie oft ein Computed unnötig neu rechnet.

alien-signals ist ein Forschungsprojekt zu genau dieser Frage. Es kombiniert vier bekannte Ideen (Vues Propagation, Preacts doppelt verkettete Listen, Sveltes Effekt-Planung, Reactivelys Graph-Färbung) und legt sich harte Regeln auf: **keine `Array`, `Set` oder `Map` im Kern, keine Rekursion.** Das Ergebnis ist ein Kern von wenigen hundert Zeilen, 1,9 kb groß, der in den gängigen Benchmarks schneller ist als die Vorbilder.

## Kernkonzepte

### 1. Signal, Computed, Effect als Funktionen

```js
import { computed, effect, signal } from 'alien-signals';

const count  = signal(1);
const double = computed(() => count() * 2);

const stop = effect(() => console.log(`count is ${count()}`));   // logs "count is 1"

count(2);          // write: logs "count is 2"
double();          // read: 4
stop();
```

Ein Signal ist eine Funktion: ohne Argument lesen, mit Argument schreiben (wie bei [Knockout](knockout.md) 2010). Kein `.value`, kein Getter-Objekt. `computed` bekommt den vorigen Wert als Argument (`computed(previous => …)`), praktisch für Akkumulatoren.

### 2. Verschachtelte Effekte und Scopes

```js
import { effect, effectScope, signal } from 'alien-signals';

const show = signal(true);

const stopAll = effectScope(() => {
  effect(() => {
    if (show()) effect(() => console.log(count()));   // inner effect lives as long as the branch
  });
});

stopAll();   // stops every effect created inside
```

Ein Effekt, der in einem anderen entsteht, gehört diesem: Läuft der äußere neu, wird der innere vorher entfernt. Ein `effectScope` sammelt Effekte, ohne selbst zu reagieren, und beendet sie gemeinsam. Das ist das Ownership-Modell, das `@if`/`@for` in Frameworks brauchen.

### 3. Batching und Untracking

```js
import { endBatch, setActiveSub, startBatch } from 'alien-signals';

startBatch();
first('Ada'); last('Lovelace');   // effects run once, after endBatch
endBatch();

const previous = setActiveSub(undefined);   // untracked reads from here
const snapshot = count();
setActiveSub(previous);
```

Die API ist bewusst roh: keine `batch(fn)`- oder `untrack(fn)`-Hülle, sondern die Bausteine, aus denen man sie in zwei Zeilen baut.

### 4. `trigger()` für Mutation

```js
const list = signal([]);
list().push(1);   // mutation, no notification
trigger(list);    // notify everything that depends on list
```

Ein Signal vergleicht nur Referenzen. Wer ein Array verändert statt ersetzt, meldet die Änderung mit `trigger` selbst, auch für mehrere Signals auf einmal (`trigger(() => { a(); b(); })`).

### 5. Eigene Oberfläche: `createReactiveSystem`

```js
import { createReactiveSystem } from 'alien-signals/system';

const { link, unlink, propagate, checkDirty, shallowPropagate } = createReactiveSystem({
  update    (node) { /* recompute, return true if the value changed */ },
  notify    (node) { /* an effect became dirty: queue it */ },
  unwatched (node) { /* last subscriber gone: release sources */ },
});
```

Der eigentliche Wert der Bibliothek: Der Graph-Algorithmus ist von der API getrennt. Vue 3.6, XState und Datastar nutzen den Kern mit eigener Oberfläche (`ref()`, Atoms, `$signal`-Pfade). Es gibt ein Starter-Template, das die `.get()`/`.set()`-API des TC39-Signals-Proposals nachbaut.

## Wie es intern arbeitet

**Knoten und Links.** Jeder Knoten (Signal, Computed, Effect) hat zwei doppelt verkettete Listen: `deps` (wovon er abhängt) und `subs` (wer von ihm abhängt). Eine Abhängigkeit ist ein einziges `Link`-Objekt, das in *beiden* Listen gleichzeitig hängt (`prevDep`/`nextDep` und `prevSub`/`nextSub`). Eine Abhängigkeit kostet also ein Objekt statt zweier Einträge in zwei `Set`s, und Entfernen ist O(1).

**Versionen statt Neuaufbau.** Läuft ein Computed oder Effect neu, werden seine Abhängigkeiten nicht gelöscht und neu angelegt. Ein Zeiger (`depsTail`) läuft die vorhandene Liste mit: Wird dieselbe Quelle in derselben Reihenfolge gelesen wie beim letzten Mal, wird der Link nur wiederverwendet; ein Versionszähler verhindert doppelte Links bei mehrfachem Lesen. Erst was am Ende übrig bleibt, wird abgehängt. Im Normalfall (gleiche Abhängigkeiten wie zuvor) entsteht beim Neulauf **kein einziges neues Objekt**.

**Zwei Zustände: `Pending` und `Dirty`.** Ein Schreibzugriff markiert direkte Abhängige als `Dirty`, alles weiter unten nur als `Pending` („vielleicht veraltet“) und benachrichtigt Effekte (Push). Wird ein `Pending`-Knoten gelesen, prüft `checkDirty` seine Quellen von unten: Nur wenn eine davon *wirklich* einen neuen Wert hat, wird er neu berechnet (Pull). Ändert sich `count` von 3 auf 4, aber `isPositive` bleibt `true`, laufen die Effekte hinter `isPositive` nicht. Das ist die Graph-Färbung aus Reactively.

**Bitflags und Iteration.** Der Zustand eines Knotens ist eine Zahl mit Bits (`Mutable`, `Watching`, `Dirty`, `Pending`, `Recursed`, …), keine Felder. `propagate` und `checkDirty` laufen iterativ mit einem eigenen kleinen Stack statt rekursiv, damit tiefe Graphen keinen Stack-Overflow und keine Funktionsaufruf-Kosten erzeugen. Das README zeigt beide Funktionen zusätzlich rekursiv, als lesbare Referenz für Ports.

## Stärken und Schwächen

- **Stark:** schnellster verbreiteter Kern, sehr wenig Speicher pro Abhängigkeit, keine Allokationen im stabilen Fall, glitch-frei, sauberes Ownership. Algorithmus und API getrennt, daher in Vue, XState und Datastar eingebaut. 1,9 kb.
- **Schwach:** absichtlich minimal: kein `batch(fn)`, kein `untrack(fn)`, kein `equals`-Parameter, keine Fehlerbehandlung in Effekten, keine Async-Hilfen. Signals als Funktionen sind kurz, aber im Code schwerer von normalen Funktionen zu unterscheiden. Der Kern ist dicht und schwer zu lesen; Änderungen daran brauchen die Benchmarks.

## Für rat und aufbau

`@rat/runtime/signals.js` implementiert dasselbe Modell (Push der Markierung, Pull der Werte, Effekte in einer Queue, Ownership), aber auf die einfache Art. Der Vergleich zeigt drei konkrete Engpässe:

| | `@rat/runtime` | alien-signals |
|---|---|---|
| Abhängigkeit | Eintrag in `source.observers` **und** `target.sources` (zwei `Set`s) | ein `Link`-Objekt in zwei Listen |
| Neulauf eines Effekts | `unlink()` löscht alles, `track()` baut alles neu auf | vorhandene Links werden der Reihe nach wiederverwendet |
| Schreiben | `[...this.observers]` kopiert die Menge in ein neues Array, jedes Mal | Liste wird direkt durchlaufen |
| Computed, Wert unverändert | `stale()` gibt die Markierung weiter, abhängige Effekte laufen trotzdem | `Pending` statt `Dirty`, Effekt läuft nur bei echter Änderung |
| Propagation | rekursiv über `stale()` | iterativ, Bitflags |

- **Der wichtigste Punkt ist der letzte**, weil er Arbeit spart, nicht nur Speicher: Ein `computed(() => $items.length > 0)` meldet heute jede Änderung an `$items` weiter, auch wenn das Ergebnis `true` bleibt, und jedes `{…}`-Loch dahinter schreibt erneut ins DOM. Abhilfe ohne Neuschreiben: `Computed` bekommt den Zustand `pending`; `stale()` setzt bei Abhängigen nur `pending`, und vor dem Lauf eines Effekts wird geprüft, ob eine Quelle tatsächlich einen neuen Wert hat (Vorschlag). Alternativ ein `Object.is`-Vergleich im Computed, der bei gleichem Wert die Weitergabe abbricht (billiger, aber nicht ganz glitch-frei).
- **Die Allokationen** (`Set`s, Kopie pro Schreibzugriff, Neuaufbau pro Lauf) fallen erst bei vielen Bindungen ins Gewicht, etwa einer Liste mit tausend Zeilen in `@for`. Messen lohnt sich vor dem Umbau: Die Runtime ist heute lesbar, und Lesbarkeit war eine bewusste Entscheidung.
- **Den Kern übernehmen statt nachbauen** ist eine echte Option: `createReactiveSystem` liefert den Graphen, rat behält seine Oberfläche (`signal(v).value`, `batch`, `scope`, `onCleanup`). So machen es Vue und Datastar. Kosten: eine Abhängigkeit von 1,9 kb und ein Kern, den man nicht selbst versteht.
- **`@aufbau/signals` ist ein Fork von `@preact/signals`**, dessen Algorithmus (doppelt verkettete Listen, Versionen) einer der vier Vorfahren von alien-signals ist. Dort ist der Abstand kleiner; ein Wechsel lohnt sich eher nicht, solange zugriff auf Preact baut.
- **`trigger()`** ist eine Mini-Antwort auf d-23: Mutation erlaubt, Meldung von Hand. Für rat passt das nicht zur Sichtbarkeitsregel (`$todos.push(x)` sähe reaktiv aus und wäre es nicht), als Werkzeug in `@rat/types` für `$List` aber schon.
