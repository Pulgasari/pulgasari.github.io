# Knockout

Eine MVVM-Bibliothek für datengebundene Oberflächen, 2010 von Steve Sanderson (Microsoft) veröffentlicht. Knockout hatte schon 2010, was heute als "Signals" wiederentdeckt wird: Observables mit automatischer Abhängigkeitserkennung und abgeleitete Werte, die sich selbst aktualisieren. Version 3.5 stammt von 2019, 3.5.2 und 3.5.3 (März 2026) brachten Trusted-Types-Unterstützung. Der modulare Nachfolger **TKO** (Knockout 4) ist nach Jahren im Alpha-Stadium seit April 2026 stabil (4.1).

- Website: https://knockoutjs.com, TKO: https://tko.io
- Repository: https://github.com/knockout/knockout
- Build: keiner, ein `<script>` reicht

## Das Problem, das Knockout löst

2010 hieß interaktives UI: jQuery-Code, der bei jeder Änderung von Hand das DOM anfasst, und Zustand, der irgendwo zwischen JavaScript-Variablen und DOM-Inhalten verteilt ist. Knockout trennt beides: Das **ViewModel** hält den Zustand als Observables, das **Markup** beschreibt deklarativ, was wovon abhängt. Ändert sich ein Observable, aktualisieren sich genau die gebundenen Stellen.

## Kernkonzepte

### 1. Observables: ein Wert, den man aufruft

```js
const name = ko.observable('Ada');

name();            // read: 'Ada'
name('Grace');     // write
name.subscribe(value => console.log(value));
```

Ein Observable ist eine **Funktion**: ohne Argument lesen, mit Argument schreiben. Das ist Knockouts Antwort auf die Frage, wie man Lesezugriffe bemerkt, als es noch keine Proxies gab.

### 2. Computed: abgeleitete Werte

```js
const first = ko.observable('Ada');
const last  = ko.observable('Lovelace');
const full  = ko.pureComputed(() => `${first()} ${last()}`);
```

`full` merkt sich automatisch, welche Observables beim Auswerten gelesen wurden, und rechnet neu, wenn eines davon sich ändert. `pureComputed` ist zusätzlich lazy: ohne Abonnenten schläft es und hält keine Abhängigkeiten fest. Genau das Modell heutiger Signal-Bibliotheken (Preact Signals, Solid, das TC39-Signals-Proposal).

### 3. Bindings im Markup: `data-bind`

```html
<p>Name: <input data-bind="value: first, valueUpdate: 'input'"></p>
<p>Hallo <strong data-bind="text: full"></strong></p>
<button data-bind="click: save, enable: first().length > 0">Speichern</button>
```

```js
ko.applyBindings({ first, last, full, save () { … } });
```

Ein Attribut, darin eine kommagetrennte Liste von `binding: ausdruck`. Die Ausdrücke sind JavaScript im Kontext des ViewModels. Eingebaut sind unter anderem `text`, `html`, `value`, `checked`, `css`, `style`, `attr`, `visible`, `enable`, `event`, `click`, `submit`, `hasFocus`.

### 4. Kontrollfluss und containerlose Bindings

```html
<ul data-bind="foreach: todos">
  <li data-bind="text: title, css: { done: done }"></li>
</ul>

<!-- ko if: todos().length === 0 -->
  <p>Nichts zu tun.</p>
<!-- /ko -->
```

`foreach`, `if`, `ifnot`, `with` und `using` steuern Teilbäume. Wo kein Wrapper-Element erwünscht ist, stehen sie in **Kommentaren** (`<!-- ko … -->` bis `<!-- /ko -->`). Innerhalb von `foreach` gibt es `$data`, `$index` (ein Observable), `$parent` und `$root`.

### 5. Observable Arrays

```js
const todos = ko.observableArray([]);
todos.push({ title: 'Brot', done: ko.observable(false) });   // notifies
todos.remove(item);
```

Ein `observableArray` umhüllt ein Array und meldet die mutierenden Methoden (`push`, `splice`, `remove`, `sort` …). `foreach` vergleicht alte und neue Einträge und fügt nur die Differenz ein, statt die Liste neu zu bauen.

### 6. Eigene Bindings

```js
ko.bindingHandlers.fadeVisible = {
  init (element, valueAccessor) {
    element.hidden = !ko.unwrap(valueAccessor());
  },
  update (element, valueAccessor) {
    const visible = ko.unwrap(valueAccessor());
    visible ? fadeIn(element) : fadeOut(element);
  },
};
```

```html
<div data-bind="fadeVisible: open"></div>
```

`init` läuft einmal, `update` läuft in einem Computed und damit neu, sobald ein gelesenes Observable sich ändert. Aufräumen über `ko.utils.domNodeDisposal.addDisposeCallback(element, …)`.

### 7. Komponenten

```js
ko.components.register('like-button', {
  viewModel : function (params) {
    this.count     = params.count;
    this.increment = () => this.count(this.count() + 1);
  },
  template  : '<button data-bind="click: increment, text: count"></button>',
});
```

```html
<like-button params="count: likes"></like-button>
```

Seit 3.2 (2014) mit Custom-Element-Syntax, aber ohne echte Custom Elements: Knockout sucht die Tags beim Binden selbst.

### 8. Extender

```js
const query = ko.observable('').extend({ rateLimit: { timeout: 300, method: 'notifyWhenChangesStop' } });
```

Extender hängen Verhalten an ein Observable: `rateLimit` (Debounce oder Throttle), `notify: 'always'` (auch bei gleichem Wert melden), eigene über `ko.extenders`.

## Wie es intern arbeitet

**Abhängigkeitserkennung:** Knockout hält einen globalen Stapel von "gerade auswertenden" Computeds. Liest eine Funktion ein Observable, registriert sich dieses beim obersten Computed des Stapels. Nach der Auswertung kennt der Computed seine Abhängigkeiten und abonniert sie; beim nächsten Auswerten werden sie neu erfasst. Exakt der Mechanismus moderner Signal-Implementierungen, nur ohne deren Push-Pull-Optimierungen (Knockout rechnet eher, statt erst beim Lesen).

**Bindings:** Der Inhalt von `data-bind` wird als String in ein Objekt-Literal umgeschrieben und mit `new Function` zu einer Funktion compiliert, die mit `with`-Scopes auf ViewModel und Kontext (`$data`, `$parent`) zugreift. Jedes Binding läuft in einem eigenen Computed. Deshalb funktioniert Knockout nicht unter einer strengen Content Security Policy (kein `unsafe-eval`); TKO hat dafür einen eigenen Parser, der ohne `new Function` auskommt.

## Stärken und Schwächen

- **Stark:** das Reaktivitätsmodell war zehn Jahre seiner Zeit voraus, läuft ohne Build, deklarativ und trotzdem nah am DOM, `foreach` mit Differenz statt Neuaufbau, eigene Bindings mit klarem `init`/`update`-Vertrag, extrem stabil (3.x seit 2013 kompatibel).
- **Schwach:** Lesen über `name()` ist laut und vergessene Klammern sind stille Fehler (`text: name` funktioniert, `text: name + '!'` nicht), Bindings in Strings ohne Editor-Unterstützung oder Typprüfung, `new Function` und CSP, große Ausdrücke im Markup werden unlesbar, wenig Bewegung im Ökosystem seit 2019.

## Für rat und aufbau

Knockout ist ein Vorfahre von fast allem, was rat tut. Der Vergleich zeigt, wofür rats Entscheidungen da sind:

| Knockout | rat | Bemerkung |
|---|---|---|
| `ko.observable(0)`, lesen mit `count()` | `let $count = 0`, lesen mit `$count` | der Compiler versteckt `.value`; die Reaktivität bleibt am `$` sichtbar, ohne Klammer-Rauschen |
| `ko.pureComputed(() => …)` | `const $x = …` | derselbe Mechanismus, ohne Hülle |
| `data-bind="text: full"` | `{$full}` | Ausdrücke im Code statt in einem String, mit Highlighting und Compiler-Fehlern |
| `<!-- ko if: … -->` | `@if (…)` | beide ohne Wrapper-Element; rat braucht keine Kommentare, weil der Compiler den Bereich kennt |
| `bindingHandlers.x = { init, update }` | Behaviors `@x={…}` | rats `fn(element, value) → { update, destroy }` ist fast derselbe Vertrag |
| `observableArray` | `$List` aus `@rat/types` (d-23) | Knockout zeigt, dass gemeldete Mutationsmethoden in der Praxis funktionieren |
| `.extend({ rateLimit: 300 })` | offen | ein Extender ist ein Modifier am Signal; denkbar als `$query.debounce(300)` in `@rat/types` |
| `$index` als Observable | `$loop.index` (d-15) | Knockout hatte genau dieses Problem gelöst: ein Index, der nach einem Umsortieren stimmt |

Für aufbau: `data-bind` ist dieselbe Grundidee wie Attribute als Zustand, nur in die andere Richtung (Markup liest JavaScript statt JavaScript liest Markup). Knockouts `foreach` mit Differenz statt Neuaufbau ist genau das, was `innerHTML`-Rendering fehlt (siehe [lit-vs-aufbau.md](../../analyze/lit-vs-aufbau.md#165-rendern-ohne-neuaufbau)).
