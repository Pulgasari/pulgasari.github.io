# Reaktivitätsmodelle

Alle wichtigen Modelle, wie Oberflächen auf Zustand reagieren, in der Reihenfolge, in der sie entstanden sind, und was jedes vom vorigen übernommen oder verworfen hat. Grundbegriffe (Quelle, Abgeleitet, Effekt, Push/Pull, Glitch) stehen in [reactivity.md](reactivity.md).

---

## Inhalt
- [Überblick: die Linie](#überblick-die-linie)
- [0. Vorgeschichte: Tabellen, Datenfluss, FRP](#0-vorgeschichte-tabellen-datenfluss-frp)
- [1. Von Hand: Zustand im DOM](#1-von-hand-zustand-im-dom)
- [2. Observer und Events](#2-observer-und-events)
- [3. Dirty Checking](#3-dirty-checking)
- [4. Getter/Setter und deklarierte Abhängigkeiten](#4-gettersetter-und-deklarierte-abhängigkeiten)
- [5. Observables mit automatischem Tracking](#5-observables-mit-automatischem-tracking)
- [6. Alles neu rendern: Virtual DOM und unidirektionaler Fluss](#6-alles-neu-rendern-virtual-dom-und-unidirektionaler-fluss)
- [7. Ströme: Reactive Extensions](#7-ströme-reactive-extensions)
- [8. Feingranulare Signals](#8-feingranulare-signals)
- [9. Proxies und tiefe Reaktivität](#9-proxies-und-tiefe-reaktivität)
- [10. Compiler-Reaktivität](#10-compiler-reaktivität)
- [11. Wo der Zustand lebt: Server, Resumability, Sync](#11-wo-der-zustand-lebt-server-resumability-sync)
- [12. Am Rand: inkrementelle Berechnung](#12-am-rand-inkrementelle-berechnung)
- [13. Vergleich](#13-vergleich)
- [14. Wie man wählt](#14-wie-man-wählt)

---

## Überblick: die Linie

```
1979  spreadsheet (visicalc)          cells and formulas: the model everything copies
1997  frp (fran, elliott & hudak)     behaviors and events over continuous time
2006  jquery                          no model: state lives in the dom
2010  backbone                        observer: models emit change events, views re-render by hand
2010  angularjs                       dirty checking: compare everything after every event
2010  knockout                        observables + computed with AUTOMATIC dependency tracking
2011  ember                           computed properties with DECLARED dependencies
2012  meteor tracker, rxjs            tracking again (tracker); streams over time (rx)
2013  react                           re-render the component, diff a virtual dom
2014  vue 1                           getters/setters + automatic tracking, knockout without the parentheses
2015  mobx, redux, s.js               transparent tracking on objects; immutable store; tiny signal core
2016  vue 2                           the same, with a virtual dom per component
2018  solid (early)                   signals straight into the dom, no virtual dom
2019  svelte 3, react hooks           the compiler tracks assignments; hooks with explicit deps
2020  vue 3                           proxies instead of getters, refs, a separate @vue/reactivity
2022  preact signals, reactively      signals for everyone; push-pull with coloring
2023  angular signals, qwik 1         signals in the largest frameworks; resumability
2024  svelte 5 runes, tc39 signals    the compiler moves onto signals; a standard is proposed
2025  react compiler, alien-signals   auto-memoization for react; the fastest push-pull core (vue 3.6)
```

Die große Bewegung: **von „alles vergleichen“ zu „genau wissen, wer betroffen ist“**, und **vom Laufzeit-Wissen zum Compiler-Wissen**. Knockout hatte 2010 das Kernstück der heutigen Signals; dazwischen lagen zehn Jahre, in denen Virtual DOM das Feld beherrschte, und die Rückkehr zu feingranularer Reaktivität ab etwa 2020.

---

## 0. Vorgeschichte: Tabellen, Datenfluss, FRP

**Tabellenkalkulation (VisiCalc 1979).** Zellen mit Werten, Zellen mit Formeln. Eine Änderung rechnet genau die betroffenen Formeln in der richtigen Reihenfolge neu. Das ist bis heute das Ideal, an dem sich jedes System messen lässt (siehe [reactivity.md, 2](reactivity.md#2-die-tabellenkalkulation-als-urbild)).

**Datenflussprogrammierung (ab den 1960ern).** Programme als Graph von Knoten, durch die Daten fließen. Wiederentdeckt in visuellen Werkzeugen (LabVIEW, Max/MSP, Node-Editoren in Blender und Unreal).

**Functional Reactive Programming (Fran, Conal Elliott und Paul Hudak, 1997).** Zwei Grundbegriffe:
- **Behavior:** ein Wert über *kontinuierliche* Zeit (die Mausposition, eine Animation). Heute heißt das Signal.
- **Event:** diskrete Ereignisse über Zeit (Klicks). Heute heißt das Stream oder Observable.

Fast alles Spätere ist eine praktische Vereinfachung davon: Signals übernehmen die Behaviors (ohne kontinuierliche Zeit), Rx übernimmt die Events. [Elm](libs/elm.md) begann 2012 als echte FRP-Sprache und hat die Signals 2016 wieder entfernt, zugunsten der Elm-Architektur (Abschnitt 6).

---

## 1. Von Hand: Zustand im DOM

```js
$('#add').on('click', () => {
  const count = Number($('#count').text()) + 1;   // the dom is the state
  $('#count').text(count);
  $('#empty').toggle(count === 0);
});
```

**Modell:** keins. Der Zustand steht im DOM, jedes Ereignis liest und schreibt dort direkt ([jQuery](libs/jquery.md)).

- **Vorteile:** nichts zu lernen, kein Overhead, für kleine Interaktionen bis heute richtig.
- **Nachteile:** Zustand ist über das DOM verteilt; jede Schreibstelle muss jede Anzeige kennen; Inkonsistenzen sind die Regel, sobald zwei Stellen dasselbe anzeigen; nicht testbar ohne DOM.

---

## 2. Observer und Events

```js
const todo = new Backbone.Model({ done: false });
todo.on('change:done', () => view.render());   // a listener per interest
todo.set('done', true);                        // fires change:done, then change
```

**Modell:** Das Observer-Muster (Gang of Four, 1994). Ein Objekt hält eine Liste von Zuhörern und benachrichtigt sie bei Änderung. [Backbone](libs/backbone.md) (2010) machte daraus die Struktur ganzer Apps.

- **Woher bekannt, was sich ändert:** `set()` vergleicht und feuert `change:<attr>`.
- **Wer betroffen ist:** wer sich ausdrücklich angemeldet hat.
- **Was neu läuft:** was der Zuhörer tut, meist ein ganzes `render()`.

**Vorteile:** Daten vom DOM getrennt; entkoppelt; einfach zu verstehen; funktioniert ohne Build und ohne Magie.

**Nachteile:**
- **Abgeleitete Werte rechnet niemand nach.** Hängt `total` von `price` und `count` ab, muss man beide Events abonnieren und selbst rechnen.
- **Grobe Updates:** `render()` ersetzt meist alles (Fokus und Eingaben gehen verloren).
- **Speicherlecks:** vergessene Abmeldungen halten Views am Leben („Zombie Views“).
- **Reihenfolge und Kaskaden:** Ein Zuhörer ändert ein anderes Model, das feuert wieder; schwer zu durchschauen.

Das Muster lebt weiter in `EventTarget`, Node-`EventEmitter`, `MutationObserver` und jeder Store-Bibliothek mit `subscribe`.

---

## 3. Dirty Checking

```html
<input ng-model="name">
<p>Hallo {{ name }}</p>
```

**Modell:** AngularJS (2010). Jeder Ausdruck im Template wird ein *Watcher*, der sich seinen letzten Wert merkt. Nach jedem Ereignis, das Angular kennt (Klick, `$http`, `$timeout`), läuft der **Digest**: alle Watcher werden ausgewertet und mit dem alten Wert verglichen. Hat sich etwas geändert, läuft der Digest erneut (ein Watcher kann einen anderen beeinflussen), bis nichts mehr dirty ist, höchstens zehnmal („10 $digest() iterations reached“).

**Vorteile:**
- **Normale Objekte:** keine Wrapper, keine Setter. `$scope.name = 'x'` reicht.
- **Zweiwege-Bindung** fast umsonst (`ng-model`).
- Für kleine Seiten sehr produktiv.

**Nachteile:**
- **Kosten wachsen mit der Anzahl der Bindungen, nicht der Änderungen.** Jedes Ereignis prüft *alles*. Die Faustregel lag bei etwa 2000 Watchern, ab denen die Seite spürbar langsam wird.
- **Änderungen außerhalb von Angular** (ein `setTimeout`, eine Fremdbibliothek) bemerkt niemand, bis jemand `$scope.$apply()` aufruft.
- **Tiefe Vergleiche** (`$watch(fn, true)`) sind teuer, flache übersehen Mutationen.
- **Zweiwege-Bindung** macht den Datenfluss unübersichtlich: Wer hat das zuletzt geändert?

Angular (2, 2016) ersetzte den Digest durch Zone.js plus Change Detection pro Komponente; seit Angular 16 (2023) wandert es zu Signals. Dirty Checking lebt in abgeschwächter Form im Vergleich der Virtual-DOM-Systeme weiter.

---

## 4. Getter/Setter und deklarierte Abhängigkeiten

```js
// ember (2011), before octane
fullName: Ember.computed('firstName', 'lastName', function () {
  return `${this.firstName} ${this.lastName}`;
}),
```

**Modell:** Eigenschaften werden über Getter/Setter (`Object.defineProperty`, ab ES5) oder `get`/`set`-Methoden gelesen und geschrieben, damit Schreibzugriffe bemerkt werden. Abhängigkeiten eines abgeleiteten Werts werden **ausdrücklich aufgeschrieben** (Ember: Dependent Keys).

**Vorteile:** Änderungen werden genau dort bemerkt, wo sie passieren (kein Durchprüfen); Abhängigkeiten sind sichtbar und überprüfbar.

**Nachteile:**
- **Die Liste kann lügen.** Liest die Funktion `middleName`, steht es aber nicht in der Liste, ist der Wert still veraltet. Dasselbe Problem hat heute React mit `useEffect(fn, [deps])`, weshalb es dafür eine Lint-Regel gibt.
- **Bedingte Abhängigkeiten** (liest `b` nur, wenn `a` wahr ist) müssen trotzdem immer deklariert werden.
- Viel Schreibarbeit.

Ember wechselte 2019 (Octane) zu *Autotracking* mit `@tracked`, also zu Modell 5.

---

## 5. Observables mit automatischem Tracking

```js
// knockout (2010)
const first = ko.observable('Ada');
const last  = ko.observable('Lovelace');
const full  = ko.computed(() => `${first()} ${last()}`);   // no list of dependencies
```

**Modell:** Ein Wert ist eine Funktion: ohne Argument lesen, mit Argument schreiben. Während ein `computed` läuft, liegt es oben auf einem globalen Stapel; jedes gelesene Observable meldet sich bei ihm an. Nach dem Lauf kennt der Computed seine Abhängigkeiten, **und zwar genau die, die tatsächlich gelesen wurden.** Beim nächsten Lauf werden sie neu erfasst; bedingte Abhängigkeiten stimmen damit automatisch. ([Knockout](libs/knockout.md))

Das ist der Kern aller späteren Signal-Systeme. Was Knockout 2010 noch fehlte:

| Knockout 2010 | heutige Signals |
|---|---|
| Computed rechnen **eager** bei jeder Änderung (`pureComputed` ab 2014 schläft ohne Abonnenten) | lazy: rechnen erst beim Lesen |
| keine Garantie gegen **Glitches** im Diamond | glitch-frei durch Färbung oder Versionen |
| Lesen mit `name()`; vergessene Klammern sind stille Fehler | `.value`, Getter oder Compiler |
| Bindings als Strings im Markup (`data-bind`), ausgewertet mit `new Function` | Templates, JSX oder Compiler |
| kein Besitzer-Baum für Aufräumen | Owner/Scope, Cleanup |

Verwandte aus derselben Zeit: **Meteor Tracker** (2012, `Tracker.autorun`), **Vue 1** (2014, dasselbe Modell mit Gettern statt Funktionen), **MobX** (2015, auf ganzen Objekten und Klassen, mit glitch-freien Derivations; [MobX](libs/mobx.md)).

**Vorteile:** keine Abhängigkeitslisten; nur Betroffenes rechnet neu; bedingte Abhängigkeiten stimmen von selbst.

**Nachteile:** Magie (was ist reaktiv, was nicht?); Lesen außerhalb des Tracking-Kontexts wird nicht bemerkt (Callbacks, nach `await`); die frühen Implementierungen waren eager und nicht glitch-frei.

---

## 6. Alles neu rendern: Virtual DOM und unidirektionaler Fluss

```jsx
function Counter () {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Modell:** React (2013) dreht die Frage um. Statt zu verfolgen, wer betroffen ist, wird die **ganze Komponente neu ausgeführt**. Sie liefert eine Beschreibung der Oberfläche (Virtual DOM), die mit der vorigen verglichen wird; nur die Unterschiede gehen ins echte DOM. *UI = f(state).*

- **Woher bekannt, was sich ändert:** `setState`/`setCount` meldet es ausdrücklich.
- **Wer betroffen ist:** die Komponente und alle Kinder (außer mit `memo`).
- **Push oder Pull:** keins von beiden im Signal-Sinn; geplantes Neu-Rendern mit Diff.

Dazu kam der **unidirektionale Datenfluss** aus [Elm](libs/elm.md) (Model, Update, View) über Flux (2014) und Redux (2015): ein Store, Änderungen nur über Actions, ein Reducer berechnet den neuen Zustand **unveränderlich**. Weil jede Änderung eine neue Referenz ist, reicht `===`, um sie zu erkennen.

**Vorteile:**
- **Einfaches Denkmodell:** Die Oberfläche ist eine Funktion des Zustands, ohne Abhängigkeitsgraph im Kopf.
- **Vorhersagbar:** ein Weg für Änderungen, Zeitreise-Debugging, Undo fast geschenkt (Redux).
- **Keine Glitches:** Es gibt keinen Zwischenzustand, nur „vorher“ und „nachher“.
- Riesiges Ökosystem; der Rendervorgang ist abstrahiert (DOM, Native, Canvas, Server).

**Nachteile:**
- **Arbeit wächst mit der Größe des Baums, nicht der Änderung.** Ein Tastendruck in einem Formular kann Hunderte Komponenten neu ausführen. Gegenmittel (`memo`, `useMemo`, `useCallback`, Selektoren) sind Handarbeit und fehleranfällig.
- **Explizite Abhängigkeitslisten** in Hooks (Modell 4, mit denselben Problemen).
- **Stale Closures:** Ein Callback sieht den Zustand des Renders, in dem er entstand.
- Virtual DOM kostet Speicher und Vergleichszeit, auch wenn sich nichts geändert hat.

Die Antwort von React selbst ist der **React Compiler** (1.0 im Oktober 2025): Er setzt `useMemo`/`memo` automatisch, wo der Code es erlaubt. Das Modell bleibt, die Handarbeit verschwindet.

---

## 7. Ströme: Reactive Extensions

```js
fromEvent(input, 'input').pipe(
  map(event => event.target.value),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => fetchResults(query)),
).subscribe(render);
```

**Modell:** Rx (Microsoft, Rx.NET 2009; RxJS 2012) behandelt alles als **Folge von Werten über die Zeit**: Ereignisse, Antworten, Timer. Operatoren verbinden, filtern, verzögern und kombinieren Ströme. Das ist die Event-Hälfte von FRP. ([RxJS](libs/rxjs.md))

**Vorteile:**
- Unschlagbar für **Abläufe über Zeit**: Debounce, Abbrechen veralteter Anfragen (`switchMap`), Wiederholen, Zusammenführen.
- Abbrechen und Aufräumen sind Teil des Modells (`unsubscribe`).
- Deklarativ: der ganze Ablauf in einer Pipeline.

**Nachteile:**
- **Für Zustand ungeeignet:** Ein Strom hat keinen „aktuellen Wert“ (`BehaviorSubject` als Notlösung).
- **Glitches:** `combineLatest(a, b)` im Diamond feuert mit einem neuen und einem alten Wert.
- Hot gegen Cold, Subjects, Scheduler: steile Lernkurve; rund 100 Operatoren.
- Vergessene Subscriptions sind Lecks.

Heute ist die Arbeitsteilung klar: **Signals für Zustand, Ströme für Ereignisse.** Angular verbindet beide (`toSignal`, `toObservable`), und mit `Observable` als Teil der Web-Plattform (in Chrome seit 2025 als `element.when('click')`) wandert das Modell in den Browser.

---

## 8. Feingranulare Signals

```js
// solid
const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);
createEffect(() => console.log(double()));

// preact signals / vue / tc39 proposal
const count  = signal(0);
const double = computed(() => count.value * 2);
effect(() => console.log(double.value));
```

**Modell:** Modell 5, zu Ende gedacht. Drei Bausteine (Signal, Computed, Effect), automatisches Tracking, und darauf eine Reihe von Garantien, die Knockout fehlten. Vorläufer: **S.js** (Adam Haile, um 2015). Breit bekannt durch **Solid** (Ryan Carniato; 1.0 im Juni 2021), dann **Preact Signals** (2022), **Angular Signals** (2023), **Svelte 5** (2024, unter dem Compiler), **Vue** (Refs seit 3.0, seit 3.6 mit `alien-signals` als Kern), **Qwik**. Seit April 2024 gibt es ein **TC39-Proposal** (Stufe 1), das Signals in die Sprache bringen will, als gemeinsame Grundlage für alle Frameworks.

### 8.1 Push-Pull: wie es glitch-frei wird

1. **Schreiben (Push):** Ein Signal ändert sich. Es markiert seine direkten Abhängigen als **dirty**, deren Abhängige als **check** (vielleicht betroffen). Dabei wird **nichts berechnet**.
2. **Planen:** Betroffene Effekte kommen in eine Warteschlange. In einem Batch wird erst am Ende abgearbeitet.
3. **Lesen (Pull):** Ein Effekt läuft und liest ein Computed. Das Computed prüft: Bin ich dirty, rechne ich. Bin ich check, frage ich erst meine Quellen; hat sich keine wirklich geändert (gleicher Wert), bleibe ich, wie ich bin, und meine Abhängigen auch.

Diese **Färbung** (clean / check / dirty; bekannt geworden durch *Reactively*, 2022) oder alternativ **Versionsnummern** pro Knoten (Preact Signals) sorgt für:
- **glitch-frei:** Jeder Computed rechnet erst, wenn alle seine Quellen aktuell sind; im Diamond rechnet `D` genau einmal, mit neuem `B` und neuem `C`.
- **lazy:** Was niemand liest, rechnet nicht.
- **Equality cut-off:** Ändert sich ein Zwischenwert nicht, läuft dahinter nichts. Geht `count` von 3 auf 4, rechnet `positive = count > 0` neu, bleibt aber `true`; alles, was nur `positive` liest, läuft nicht.

### 8.2 Ohne Virtual DOM

Der eigentliche Unterschied zu React: Ein Template wird **einmal** ausgeführt und erzeugt echte DOM-Knoten. Jede dynamische Stelle (`{count()}`) wird ein kleiner Effekt, der genau diesen Textknoten schreibt. Ändert sich `count`, läuft genau dieser Effekt; die Komponente selbst läuft nie wieder. Komponenten sind damit nur noch Organisationseinheiten, keine Render-Einheiten.

### 8.3 Besitzer und Aufräumen

Effekte, die in anderen Effekten (oder in Komponenten) entstehen, gehören ihnen. Läuft der äußere neu oder wird entsorgt, werden die inneren mit entsorgt (Solid: `createRoot`, `onCleanup`; rat: `scope`). Das löst die Lecks aus Modell 2 strukturell.

**Vorteile:**
- **Arbeit proportional zur Änderung**, nicht zur Größe der App.
- Keine Abhängigkeitslisten, keine `memo`-Handarbeit, keine Stale Closures.
- Glitch-frei und lazy (bei guten Implementierungen).
- Klein: der Kern passt in 1 bis 3 kb.
- Unabhängig vom Framework nutzbar (Preact Signals in jedem Code, das TC39-Proposal als Ziel).

**Nachteile:**
- **Lesen muss im Kontext passieren:** Destructuring, Lesen in Callbacks oder nach `await` verliert die Reaktivität (siehe [reactivity.md, 7](reactivity.md#7-typische-fallen)).
- **Lesen sieht anders aus:** `count()`, `count.value` oder ein Compiler, der es versteckt.
- **Komponenten laufen einmal:** Bedingungen und Schleifen brauchen eigene Konstrukte (`<Show>`, `<For>`), sonst werden sie nicht neu ausgewertet.
- **Debugging:** Der Graph ist unsichtbar; „warum lief das?“ ist schwerer zu beantworten als bei einem Re-Render.

---

## 9. Proxies und tiefe Reaktivität

```js
// vue 3
const state = reactive({ todos: [], filter: 'all' });
state.todos.push({ title: 'Brot', done: false });   // noticed, deep
state.todos[0].done = true;                          // noticed
```

**Modell:** Ein `Proxy` (ES2015) fängt jedes Lesen und Schreiben eines Objekts ab, auch neue Eigenschaften, gelöschte, Array-Indizes, `Map` und `Set`. Darunter arbeitet dasselbe Tracking wie bei Signals, nur pro Eigenschaft. **Vue 3** (2020), **MobX** ab Version 5, **Valtio** (2020), **Solid Stores**.

Die Vorgänger mit `Object.defineProperty` (Vue 2, MobX bis 4) konnten neue Eigenschaften und Array-Indizes nicht bemerken (`Vue.set`); Proxies lösten das.

Verwandt, aber andersherum: **Immer** (2017) nutzt Proxies, um Mutationen *aufzuzeichnen* und daraus einen neuen unveränderlichen Zustand zu bauen. Man schreibt wie in Modell 9 und bekommt das Ergebnis von Modell 6.

**Vorteile:** Mutation wie bei normalen Objekten; tiefe Strukturen ohne Wrapper pro Feld; feingranular pro Eigenschaft.

**Nachteile:**
- **Identität:** Der Proxy ist nicht das Original (`===`, `WeakMap`-Schlüssel, Übergabe an Fremdbibliotheken mit `toRaw`/`toJS`).
- **Unsichtbar:** `state.count++` sieht aus wie jede Zuweisung.
- **Kosten:** jeder Zugriff durch einen Trap; große Listen von Objekten erzeugen viele Proxies.
- Nicht alles lässt sich proxen (Klassen mit privaten Feldern, DOM-Objekte, `Date`).

---

## 10. Compiler-Reaktivität

```svelte
<!-- svelte 3 -->
<script>
  let count = 0;
  $: double = count * 2;          // a reactive declaration
</script>
<button on:click={() => count += 1}>{double}</button>
```

**Modell:** Der Compiler sieht den Code und weiß, welche Variablen wo gelesen und wo zugewiesen werden. **Svelte 3** (2019) machte aus `count += 1` ein `$$invalidate('count', …)` und erzeugte Update-Code, der genau die betroffenen Stellen schreibt. Abhängigkeiten werden **statisch** ermittelt, beim Übersetzen, nicht zur Laufzeit.

Die Grenze zeigte sich schnell: Statische Analyse sieht nur, was im selben Modul steht. Reaktivität über Modulgrenzen (Stores, geteilte Objekte) brauchte eigene Mechanismen (`$store`). **Svelte 5** (2024) zog daraus die Konsequenz: **Runes** (`$state`, `$derived`, `$effect`) sind sichtbare Markierungen, und darunter arbeiten **Signals**. Der Compiler versteckt nur noch `.value`.

Andere Compiler-Ansätze: **Marko 6** (Tags API, `<let>`, `<const>`; [Marko](libs/marko.md)), **Vue Vapor** (Vue ohne Virtual DOM, kompiliert auf Signals), **React Compiler** (automatisches Memoisieren, Modell 6 bleibt), und **rat**: `let $count = 0` wird zu einem Signal, `{$count}` zu einem Effekt pro Loch; das `$` macht sichtbar, was reaktiv ist.

**Vorteile:** keine Laufzeit-Buchhaltung für das, was der Compiler schon weiß; normale Syntax (`count += 1`); kleine Ausgabe; Fehler (Schreiben im Computed) zur Übersetzungszeit.

**Nachteile:** braucht einen Build; die Grenze zwischen „der Compiler sieht es“ und „er sieht es nicht“ ist eine Falle (Svelte 3); Debugging im erzeugten Code; eigene Dateiformate und Tooling.

Der Stand heute: **Compiler und Signals ergänzen sich.** Signals sind die Laufzeit, der Compiler entfernt das Rauschen (`.value`, Getter) und erzeugt die feinen Effekte. Svelte 5, Vue Vapor, Marko 6 und rat arbeiten alle so.

---

## 11. Wo der Zustand lebt: Server, Resumability, Sync

Die bisherigen Modelle beantworten, *wie* reagiert wird. Eine zweite Achse ist, *wo*:

- **Server hält den Zustand, schickt Unterschiede:** Phoenix **LiveView** (2019), Laravel Livewire, Hotwire. Ein Ereignis geht per WebSocket zum Server, der rendert neu und schickt nur die geänderten Teile zurück. Reaktivität ohne JavaScript-Zustand im Browser. Verwandt: [htmx](libs/htmx.md), das HTML-Fragmente austauscht.
- **Resumability (Qwik, 1.0 2023):** Der Server rendert und **serialisiert den reaktiven Graphen** ins HTML. Der Browser lädt kein Framework zum Hydratisieren, sondern setzt beim ersten Ereignis genau dort fort, wo der Server aufgehört hat; Code wird pro Handler nachgeladen. Signals sind dafür nötig, weil nur ein expliziter Graph serialisierbar ist.
- **Islands ([Astro](libs/astro.md), [Fresh](libs/fresh.md)):** Reaktivität nur in markierten Inseln, der Rest ist statisches HTML.
- **Reaktive Abfragen und Sync (Local-First):** Replicache/Zero, Convex, InstantDB, Jazz. Eine Abfrage ist ein Signal über Daten, die mit dem Server (und anderen Geräten) synchronisiert werden. Die Reaktivität reicht bis in die Datenbank.

---

## 12. Am Rand: inkrementelle Berechnung

Dieselbe Idee außerhalb von Oberflächen: Eine große Berechnung so aufbauen, dass eine kleine Änderung der Eingabe nur einen kleinen Teil neu rechnet.

- **Self-Adjusting Computation, Adapton** (2014): Forschung zu automatisch inkrementellen Programmen.
- **Jane Street Incremental** (OCaml): Handelssysteme als Graph von Berechnungen, Grundlage ihrer Web-UIs (Bonsai).
- **Build-Systeme** (Make, Bazel, Vite) und **Compiler** (Salsa in rust-analyzer): Abhängigkeitsgraphen über Dateien und Abfragen.
- **Datenbanken:** Materialized Views, die inkrementell aktualisiert werden (Differential Dataflow, Materialize).

Sie zeigen, dass „Signals“ kein Frontend-Trick sind, sondern eine allgemeine Technik: Abhängigkeiten aufzeichnen, Veraltung propagieren, faul nachrechnen.

---

## 13. Vergleich

| Modell | Erkennt Änderung | Findet Betroffene | Arbeit pro Änderung | Glitches | Lernkurve | heute |
|---|---|---|---|---|---|---|
| von Hand | gar nicht | Programmierer | minimal, aber fehleranfällig | – | keine | kleine Interaktionen |
| Observer | Setter/`set()` | Anmeldung | ein ganzes `render` | möglich | niedrig | Events, Stores mit `subscribe` |
| Dirty Checking | Vergleich aller Watcher | alle | alle Bindungen | nein (Schleife bis stabil) | niedrig | ausgestorben |
| deklarierte Abhängigkeiten | Setter | Liste | betroffene | möglich | mittel | Hook-Abhängigkeiten |
| Observables (Knockout) | Funktion/Setter | automatisch | betroffene (eager) | möglich | mittel | Vorfahre der Signals |
| Virtual DOM | `setState` | Teilbaum | Teilbaum + Diff | nein | niedrig bis mittel | React, Preact |
| Ströme (Rx) | Ereignis | Pipeline | Operatoren | im Diamond | hoch | Abläufe über Zeit |
| Signals | Setter | automatisch | genau die Betroffenen | nein (push-pull) | mittel | Solid, Vue, Angular, Preact, Svelte 5 |
| Proxies | Trap | automatisch, pro Eigenschaft | genau die Betroffenen | nein | mittel | Vue `reactive`, MobX, Valtio |
| Compiler | Zuweisung (statisch) | Analyse oder Signals | genau die Betroffenen | nein | niedrig (mit Build) | Svelte, Marko, Vue Vapor, rat |

---

## 14. Wie man wählt

- **Ein paar interaktive Stellen auf einer Seite:** von Hand, [htmx](libs/htmx.md) oder Islands. Ein Reaktivitätssystem lohnt sich erst, wenn derselbe Zustand an mehreren Stellen angezeigt wird.
- **Zustand, der an vielen Stellen gebraucht wird:** Signals. Sie sind heute das Modell mit dem besten Verhältnis aus Arbeit pro Änderung und Einfachheit, und mit dem TC39-Proposal auf dem Weg in den Standard.
- **Tiefe, verschachtelte Daten, die man natürlich verändern will:** Proxies über Signals (Vue `reactive`, Solid Stores, MobX), oder Immer, wenn Unveränderlichkeit zählt (Undo, Zeitreise, Vergleich per `===`).
- **Abläufe über Zeit** (Suche mit Debounce, Abbrechen, Wiederholen, WebSocket-Ströme): Rx oder native `Observable`, an der Grenze in ein Signal überführt.
- **Viel Zustand auf dem Server, wenig im Browser:** LiveView-artig oder Hypermedia.
- **Eigene Syntax und ein Build sind in Ordnung:** ein Compiler über Signals entfernt das meiste Rauschen.
