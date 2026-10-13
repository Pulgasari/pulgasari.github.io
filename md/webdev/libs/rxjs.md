# RxJS

**Reactive Extensions for JavaScript:** eine Bibliothek für Ereignisströme. Werte, die über die Zeit eintreffen (Klicks, Tastendrücke, Requests, WebSocket-Nachrichten, Timer), werden als **Observable** behandelt und mit Operatoren wie Arrays verarbeitet: filtern, umformen, zusammenführen, abbrechen. Ursprung ist Rx.NET von Erik Meijer bei Microsoft (2009), RxJS seit 2012, 2016 von Ben Lesh (Netflix) als RxJS 5 neu geschrieben. Bekannt vor allem durch Angular, das es jahrelang überall einsetzte.

Aktuell stabil: RxJS 7.8. Seit August 2026 gibt es die **Beta von RxJS 9**, eine neue Generation auf Basis des nativen `Observable` der Web-Plattform (in Chromium seit Version 135). RxJS 8 wurde nie veröffentlicht.

- Website: https://rxjs.dev
- Repository: https://github.com/ReactiveX/rxjs
- Build: keiner nötig

## Das Problem, das RxJS löst

Asynchrone Abläufe mit mehreren Quellen werden mit Callbacks und Promises schnell unübersichtlich. Das klassische Beispiel ist eine Suche während des Tippens:

- nicht bei jedem Tastendruck suchen, sondern erst, wenn eine Pause entsteht,
- nicht dieselbe Anfrage zweimal schicken,
- eine alte Anfrage abbrechen, wenn eine neue startet, damit keine veraltete Antwort die neue überschreibt,
- alles aufräumen, wenn das Feld verschwindet.

Mit Promises ist das ein Geflecht aus Timern, Flags und `AbortController`. Mit RxJS ist es eine Kette:

```js
import { fromEvent, debounceTime, map, distinctUntilChanged, switchMap } from 'rxjs';

fromEvent(input, 'input').pipe(
  map(event => event.target.value.trim()),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => fetch(`/search?q=${query}`).then(response => response.json())),
).subscribe(results => render(results));
```

`switchMap` bricht die vorige Anfrage ab, sobald eine neue Eingabe durchkommt. Das ist der Kern von RxJS: **Zeit und Abbruch sind Teil des Datenflusses**.

## Kernkonzepte

### 1. Observable: ein Strom, faul und abbrechbar

```js
import { Observable } from 'rxjs';

const ticks = new Observable(subscriber => {
  let count = 0;
  const id  = setInterval(() => subscriber.next(count++), 1000);
  return () => clearInterval(id);                // teardown on unsubscribe
});

const subscription = ticks.subscribe(value => console.log(value));
subscription.unsubscribe();
```

| | ein Wert | viele Werte |
|---|---|---|
| synchron (pull) | Funktion | Iterator |
| asynchron (push) | Promise | **Observable** |

Ein Observable tut nichts, bis jemand es abonniert (faul), kann beliebig viele Werte liefern, endet mit `complete` oder `error` und lässt sich jederzeit abbrechen. Ein Promise kann nichts davon außer einem Wert.

### 2. Operatoren und `pipe`

```js
source.pipe(
  filter(user => user.active),
  map(user => user.name),
  take(10),
)
```

Operatoren sind Funktionen, die ein Observable nehmen und ein neues zurückgeben. Über 100 sind eingebaut, die wichtigsten Gruppen:

| Gruppe | Beispiele | wofür |
|---|---|---|
| umformen | `map`, `scan`, `pairwise`, `buffer` | Werte verändern, Zustand akkumulieren |
| filtern | `filter`, `take`, `takeUntil`, `distinctUntilChanged`, `first` | Werte auslassen, Ströme beenden |
| Zeit | `debounceTime`, `throttleTime`, `delay`, `timeout`, `auditTime` | wann ein Wert durchkommt |
| kombinieren | `merge`, `combineLatest`, `withLatestFrom`, `zip`, `concat` | mehrere Quellen |
| höhere Ordnung | `switchMap`, `mergeMap`, `concatMap`, `exhaustMap` | aus jedem Wert ein neuer Strom |
| Fehler | `catchError`, `retry` | wiederholen, ersetzen |

Die vier `…Map`-Operatoren sind das Herz und die größte Hürde: Was passiert, wenn ein neuer innerer Strom startet, solange der alte läuft?

| | Verhalten | typischer Fall |
|---|---|---|
| `switchMap` | alten abbrechen | Suche, Navigation |
| `mergeMap` | parallel laufen lassen | unabhängige Uploads |
| `concatMap` | hinten anstellen | Speichern in Reihenfolge |
| `exhaustMap` | neuen ignorieren, solange der alte läuft | Doppelklick auf "Absenden" |

### 3. Subjects: Quelle und Strom zugleich

```js
import { BehaviorSubject } from 'rxjs';

const theme = new BehaviorSubject('light');
theme.subscribe(value => document.documentElement.dataset.theme = value);
theme.next('dark');
theme.value;                                     // current value: 'dark'
```

Ein `Subject` ist ein Observable, in das man von außen Werte schreiben kann, und verteilt sie an alle Abonnenten. `BehaviorSubject` hat immer einen aktuellen Wert (und gibt ihn neuen Abonnenten sofort), `ReplaySubject` puffert die letzten n Werte. Ein `BehaviorSubject` ist damit fast ein Signal, nur ohne automatische Abhängigkeitserkennung.

### 4. Hot und Cold

Ein **kaltes** Observable startet seine Quelle für jeden Abonnenten neu (zwei `subscribe` auf einen HTTP-Request = zwei Requests). Ein **heißes** teilt eine laufende Quelle (ein Subject, ein DOM-Event). `share()` und `shareReplay()` machen aus kalt heiß. Diese Unterscheidung ist die häufigste Fehlerquelle in RxJS-Code.

### 5. Marble-Diagramme

RxJS dokumentiert jeden Operator als Zeitleiste:

```
input:   --a--b-c-------d--|
debounceTime(20)
output:  --------c--------d|
```

In Tests lassen sich diese Diagramme als Strings schreiben (`TestScheduler`) und mit virtueller Zeit ausführen.

### 6. RxJS 9 und das native Observable

Browser haben seit 2025 ein eingebautes `Observable` (WICG-Spezifikation, Chromium 135), mit Operatoren als Methoden und `when()` an jedem `EventTarget`:

```js
button.when('click')
  .filter(event => !event.shiftKey)
  .map(event => event.clientX)
  .takeUntil(form.when('submit'))
  .subscribe(x => console.log(x), { signal: controller.signal });
```

RxJS 9 baut darauf auf, statt ein eigenes Observable mitzubringen:

```js
import { filter } from 'rxjs/filter';
import { map }    from 'rxjs/map';

users[filter](user => user.active)[map](user => user.name);
```

| | RxJS 7 | RxJS 9 (Beta) |
|---|---|---|
| Observable | eigene Klasse | das native, Polyfill wo es fehlt |
| Operatoren | `source.pipe(map(…))` | Symbol-Methoden: `source[map](…)`, ein Import pro Operator |
| Abbrechen | `subscription.unsubscribe()` | `AbortSignal` in den Optionen, `subscribe()` gibt nichts zurück |
| Aufräumen im Producer | Rückgabe einer Funktion | `subscriber.addTeardown(…)` |
| Lebenszyklus | kalt per Standard | nativ: geteilt, solange Abonnenten da sind; `ColdObservable` ausdrücklich für "ein Producer pro Abo" |
| Scheduler | ja | entfallen |
| Module | ESM + CommonJS | nur ESM |

Die Symbol-Schlüssel sorgen dafür, dass RxJS-Operatoren nicht mit den nativen Methoden gleichen Namens kollidieren (`source.map` ist nativ, `source[map]` ist RxJS).

## Wie es intern arbeitet

Ein Observable ist im Kern eine gespeicherte Funktion (der Producer). `subscribe` ruft sie mit einem Subscriber auf, der `next`, `error` und `complete` weitergibt und eine Liste von Teardown-Funktionen hält. Ein Operator ist ein neues Observable, dessen Producer das Quell-Observable abonniert und die Werte verändert weiterreicht; eine Kette aus fünf Operatoren ist also eine Kette aus fünf Abonnements. `unsubscribe` läuft die Kette rückwärts und ruft alle Teardowns. Zeitoperatoren benutzen Scheduler (in RxJS 7), die `setTimeout`, Microtasks oder `requestAnimationFrame` kapseln und in Tests durch virtuelle Zeit ersetzt werden.

## Stärken und Schwächen

- **Stark:** löst Zeit, Abbruch und Nebenläufigkeit deklarativ, wo Promises versagen; ein Vokabular für alle asynchronen Quellen; gut testbar mit Marbles; in RxJS 9 auf einem Plattform-Standard.
- **Schwach:** steile Lernkurve (über 100 Operatoren, Hot/Cold, die `…Map`-Varianten), Speicherlecks durch vergessenes `unsubscribe`, schwer zu debuggen (Stacktraces zeigen RxJS-Interna), für einfachen Zustand übertrieben. Angular ist für Zustand auf Signals umgestiegen und nutzt RxJS nur noch für Ereignisse und HTTP. RxJS 9 ist eine semantische Migration, kein Versionssprung.

## Für rat und aufbau

- **Signals für Zustand, Observables für Ereignisse.** Die Lehre aus Angular: Ein Signal hat immer einen aktuellen Wert und eignet sich für "was ist gerade", ein Observable ist eine Folge von Ereignissen und eignet sich für "was passiert gerade". rat hat das erste (`$`), das zweite steckt heute in `on:`-Handlern und Event-Modifiern. Die Modifier (`on:click:once`, `on:keydown[ctrl+c]`, `on:submit!`) sind kleine, feste Operatoren: `take(1)`, `filter(…)`, `tap(preventDefault)`.
- **Zeit-Modifier wären der nächste Schritt:** `on:input:debounce(300)={search}` oder `on:scroll:throttle(100)`. Das deckt 80 % dessen ab, wofür man RxJS in UIs holt, ohne Operatoren-Vokabular.
- **Die `|X>`-Familie (d-10) ist ein Operator-Vokabular für Arrays.** Auf Observables angewendet (`clicks |?> #.shiftKey |:> #.clientX`) würde sie die native Observable-API direkt in rats Syntax holen, wenn der Compiler Methodenaufrufe statt Array-Funktionen erzeugt (`.filter`, `.map` gibt es auf beiden).
- **Holes für Observables:** `{price$}` könnte in rat ein Observable abonnieren und beim Entfernen des Blocks über das Scope-Signal abbrechen, so wie Angulars `async`-Pipe. Mit dem nativen `Observable` und `AbortSignal` ist das wenige Zeilen in `@rat/runtime`.
- **`AbortSignal` als gemeinsamer Nenner:** RxJS 9, natives Observable, `fetch`, `addEventListener`, Markos `$signal` und aufbaus `signal`/`Selection` räumen alle über dasselbe Plattform-Objekt auf. rats Scope könnte jedem Effekt ein Signal geben, statt nur Cleanup-Rückgaben zu kennen.
- **aufbau:** `Selection.on` mit `until(signal)` ist bereits ein Stück Observable-Denken. Ein `selection.when('click')`, das ein natives Observable zurückgibt, wäre die Brücke: delegiert, live, mit allen Plattform-Operatoren.
