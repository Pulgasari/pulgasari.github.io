# Cycle.js

Ein funktionales, reaktives Framework von André Staltz, seit 2014. Die Anwendung ist eine Funktion von Eingabeströmen zu Ausgabeströmen; Treiber übernehmen DOM, HTTP und andere Seiteneffekte. Aktuell `@cycle/run` 5.7.0 (Januar 2022), `@cycle/dom` 23.1.0 (März 2022). Die veröffentlichten Kernpakete sind seitdem unverändert; hier ist das etablierte xstream-Modell beschrieben.

- Website: https://cycle.js.org
- Repository: https://github.com/cyclejs/cyclejs
- Abhängigkeiten: typischerweise `@cycle/run`, `@cycle/dom`, `xstream`; weitere Treiber nach Bedarf
- Build: für npm-Imports gewöhnlich ein Bundler; keine eigene Template-Sprache nötig

## Das Problem, das Cycle.js löst

In imperativem UI-Code laufen Events in Handler, Handler ändern Zustand, Zustand verändert das DOM, und irgendwo starten Requests. Wer den Ablauf verstehen will, muss den Aufrufen folgen. Selbst bei sauber getrennten Komponenten verstecken sich Seiteneffekte leicht in Lebenszyklen.

Cycle beschreibt stattdessen den Datenfluss: Klicks werden zu Zahlen, Zahlen zu Ansichten, Ansichten zum DOM. Die Anwendung führt die Außenwelt nicht selbst aus. Sie beschreibt Ausgaben, die Treiber ausführen. Das verbindet [RxJS](rxjs.md)-artige Ströme mit einer Architektur für die ganze Anwendung.

## Kernkonzepte

### 1. `main(sources)` liefert Sinks

```js
import { run } from '@cycle/run';
import { makeDOMDriver, button } from '@cycle/dom';

function main(sources) {
  const count$ = sources.DOM.select('.counter').events('click')
    .fold(count => count + 1, 0);

  return {
    DOM: count$.map(count => button('.counter', String(count))),
  };
}

run(main, { DOM: makeDOMDriver('#app') });
```

Die Seite enthält `#app`. `sources.DOM` ist die Eingabeseite des Treibers, `DOM` im Ergebnis seine Ausgabeseite. `$` ist hier eine Namenskonvention für Streams, keine Syntaxerweiterung.

### 2. Zustand ist ein gefalteter Strom

```js
const actions$ = sources.DOM.select('.add').events('click')
  .mapTo(state => ({ ...state, count: state.count + 1 }));

const state$ = actions$.fold((state, reduce) => reduce(state), { count: 0 });
```

`fold` hält den letzten Zustand und liefert auch den Anfangswert. Reine Reducer können unabhängig vom Browser geprüft werden. Anders als bei einem Signal steht der zeitliche Verlauf im Vordergrund.

### 3. Intent, Model, View

```js
const intent = DOM => DOM.select('.add').events('click');
const model = clicks$ => clicks$.fold(count => count + 1, 0);
const view = count$ => count$.map(count => button('.add', String(count)));
```

Diese Zerlegung ist eine Konvention: Intent interpretiert äußere Ereignisse, Model berechnet Zustand, View beschreibt Ausgabe. `main` steckt die drei zusammen. Für kleine Komponenten braucht es keine zusätzlichen Dateien.

### 4. Treiber sind die Effektgrenze

```js
function logDriver(messages$) {
  messages$.addListener({ next: message => console.log(message) });
  return {};
}
```

Ein Treiber nimmt einen Ausgabestrom und liefert eine Eingabequelle zurück. Ein echter Treiber muss außerdem Fehler und Ressourcen-Lebensdauer sauber behandeln. Für Tests lässt sich die Außenwelt durch künstliche Quellen ersetzen.

### 5. Isolation

`@cycle/isolate` gibt einer Komponentenfunktion einen eigenen Scope. Das verhindert, dass `.counter` in zwei Instanzen dieselben Events einsammelt. Komponenten sind damit weiterhin Funktionen; die Isolation wird außen ergänzt.

## Wie es intern arbeitet

`run` muss einen Kreis schließen: Der Treiber braucht die Ausgabe von `main`, `main` braucht aber zuerst die Treiberquelle. Dafür legt die Runtime stellvertretende Sink-Streams an, startet die Treiber, ruft `main` mit deren Quellen auf und verbindet anschließend die wirklichen Sinks mit den Stellvertretern.

Der DOM-Treiber setzt den Strom aus virtuellen Bäumen über Snabbdom in Änderungen am echten DOM um. Events fließen zurück in die Quellen. Die Architektur ist also reaktiv, der Renderer aber weiterhin ein Virtual-DOM-Renderer; Ströme allein erzeugen keine feingranularen Textbindungen.

## Stärken und Schwächen

- **Stark:** klare Effektgrenzen, expliziter Datenfluss, austauschbare Treiber, gut isolierbare Logik. Zeitliche Abläufe können mit denselben Werkzeugen wie Eingaben modelliert werden.
- **Schwach:** Streams, Abonnements und Rückkopplungen kosten Einarbeitung. Ein einfacher Zähler braucht bereits mehrere Begriffe; Paketlandschaft und lange unveränderte Veröffentlichungen verlangen bei neuen Projekten besondere Prüfung.

## Für rat und aufbau

- **Treiber als Grenze** könnten helfen, Netzwerk, Persistenz oder Timer eines aufbau-Stores austauschbar zu halten (Vorschlag), ohne Cycle als UI-Schicht einzuführen.
- **Streams und Signals ergänzen sich:** Ein Stream beschreibt Ereignisse, rats Signal den gegenwärtigen Wert. Eine Brücke braucht Anfangswert, Fehlerbehandlung und eine definierte Aufräumstelle.
- **Isolation ist mehr als CSS-Scoping.** Rats Behaviors brauchen auch getrennte Listener und Ressourcen pro Instanz. Ein gleicher Selektor darf keine benachbarte Instanz bedienen.
- **Nicht den Renderer mit dem Datenmodell verwechseln:** Cycle liefert einen VDOM-Strom, rat aktualisiert Bindungen. Ein übertragbarer Effektvertrag bedeutet keinen Wechsel des Renderers.

Quellen: [Guide](https://cycle.js.org/getting-started.html), [Treiber](https://cycle.js.org/drivers.html), [Quellcode und Pakete](https://github.com/cyclejs/cyclejs), [npm](https://registry.npmjs.org/@cycle/run/latest). Stand: 17. Oktober 2026.
