# Underscore.js

Eine Bibliothek mit gut hundert funktionalen Hilfsfunktionen (`map`, `filter`, `groupBy`, `debounce`, `template` …), die native Objekte **nicht** verändert. Von Jeremy Ashkenas bei DocumentCloud, erste Version 0.1.0 im Oktober 2009, 1.0 im März 2010; aus demselben Umfeld wie [Backbone.js](backbone.md) und [CoffeeScript](coffeescript.md). Seit 2020 vor allem von Julian Gonggrijp gepflegt, der den Code in einzelne ES-Module zerlegt hat. Aktuell 1.13.8 (Februar 2026, Sicherheitskorrektur für `_.flatten` und `_.isEqual`), in Wartung: kleine Korrekturen, keine neue Richtung. [lodash](lodash.md) ist als Fork von Underscore entstanden und hat es in der Verbreitung längst überholt.

- Website: https://underscorejs.org
- Repository: https://github.com/jashkenas/underscore
- Laufzeit: Browser, Node, Deno, Bun; UMD-Bundle, ES-Modul-Bundle und einzelne Module unter `underscore/modules/`
- Build: keiner, ein `<script>` reicht

## Das Problem, das Underscore löst

2009 hatten viele Browser (vor allem Internet Explorer bis Version 8) weder `Array.prototype.map` noch `filter`, `reduce`, `Object.keys` oder `Function.prototype.bind`. Prototype.js und [MooTools](mootools.md) lösten das, indem sie die nativen Prototypen erweiterten, mit allen Kollisionen, die das nach sich zieht. [jQuery](jquery.md) kümmerte sich um das DOM, nicht um Daten.

Underscore legt alles in ein einziges Objekt `_` und fasst nichts Natives an. Gibt es eine native Methode, nutzte Underscore sie früher, sonst die eigene Implementierung. Dazu kamen Werkzeuge, die es nativ bis heute nicht gibt: `debounce`, `throttle`, `memoize`, Mikro-Templates. Backbone baute darauf auf: Collections bekommen die Underscore-Methoden direkt, Views rendern meist mit `_.template`.

## Kernkonzepte

### 1. Ein Namensraum statt erweiterter Prototypen

```js
_.map([1, 2, 3], n => n * 2);                    // [2, 4, 6]
_.each({ a: 1, b: 2 }, (value, key) => log(key, value));
_.reduce(prices, (sum, price) => sum + price, 0);
_.map(items, function (item) { return this.format(item); }, view);   // context argument
```

Jede Funktion bekommt die Daten zuerst, dann die Funktion, optional einen Kontext für `this`. Sammlungsfunktionen arbeiten auf Arrays und Objekten gleich.

### 2. Sammlungen nach Eigenschaften

```js
_.where(books, { author: 'Ende' });     // all with matching properties
_.findWhere(books, { id: 7 });
_.pluck(books, 'title');
_.groupBy(books, 'year');
_.countBy(words, word => word.length);
_.indexBy(books, 'id');
_.sortBy(books, 'title');
```

Wo eine Funktion erwartet wird, darf ein Property-Name oder ein Objekt zum Abgleich stehen. `_.iteratee` macht daraus eine Funktion und lässt sich überschreiben, um eigene Kurzformen einzuführen.

### 3. Objekt-Stil und Ketten

```js
_([3, 1, 2]).sortBy();               // OO style, same functions

_.chain(books)
  .where({ lang: 'de' })
  .sortBy('year')
  .pluck('title')
  .first(3)
  .value();
```

`_(value)` wickelt einen Wert ein, dann stehen alle Funktionen als Methoden bereit. `_.chain` liefert nach jedem Schritt wieder einen Wrapper, bis `value()` auspackt. Anders als bei lodash ist die Kette nicht lazy: Jeder Schritt erzeugt ein vollständiges Zwischen-Array.

### 4. Funktionen über Funktionen

```js
const search = _.debounce(query, 300);
const scroll = _.throttle(update, 100, { leading: false });
const fib    = _.memoize(n => n < 2 ? n : fib(n - 1) + fib(n - 2));
const init   = _.once(setup);
const ready  = _.after(3, start);              // runs on the third call
const greet  = _.partial(format, _, 'Hallo');  // _ marks the gap
```

`_.partial` kennt einen Platzhalter, `_` selbst; dieselbe Idee wie `R.__` bei [Ramda](ramda.md) und `#` in rats Pipe.

### 5. Mikro-Templates

```js
const row = _.template('<li class="<%- cls %>"><%= label %></li>');
row({ cls: 'done', label: '<b>Brot</b>' });

_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;   // mustache-like delimiters
```

`<%= %>` gibt roh aus, `<%- %>` HTML-escaped, `<% %>` führt JavaScript aus. Die Syntax ist dieselbe wie bei [EJS](ejs.md). Ein Template ist eine Funktion, die einen String liefert; die App schreibt ihn mit `innerHTML` ins DOM.

### 6. Eigene Funktionen einhängen

```js
_.mixin({
  capitalize: string => string.charAt(0).toUpperCase() + string.slice(1),
});

_.capitalize('ada');          // 'Ada'
_('ada').capitalize();        // also on the wrapper and in chains
```

`_.mixin` fügt Funktionen dem Namensraum und dem Wrapper hinzu. So hat Underscore selbst alle Funktionen verdrahtet.

### 7. Einzelne Module

```js
import { debounce, groupBy } from 'underscore';
import groupBy from 'underscore/modules/groupBy.js';
```

Seit 1.11 (2020) liegt jede Funktion in einem eigenen Modul, seit 1.13 (2021) ist der ESM-Support vollständig. Der Paket-Einstieg mischt aber alle Funktionen in `_` und lässt sich deshalb kaum tree-shaken; schlank wird es nur über `underscore/modules/index.js`.

## Wie es intern arbeitet

Der Quelltext besteht seit 1.11 aus rund 160 kleinen Modulen. `index.js` exportiert alle Funktionen, `index-default.js` ruft `mixin(allExports)` und hängt sie an `_`; daraus baut Rollup das UMD- und das ESM-Bundle. Weil dieses Mischen ein Seiteneffekt ist, bleibt beim Import über den Paket-Einstieg fast alles im Bundle: zehn häufige Funktionen kosten so 7,6 kb, über `underscore/modules/index.js` 5,5 kb, die ganze Bibliothek 8,4 kb (esbuild, minifiziert und gzip).

Sammlungsfunktionen entscheiden mit `isArrayLike`, ob sie über Indizes oder über Schlüssel laufen: Alles mit einer numerischen `length`-Eigenschaft gilt als Array. Ein Objekt `{ length: 3 }` wird deshalb wie ein Array mit drei Lücken behandelt, eine bekannte Falle. Callbacks gehen durch `cb`, das `_.iteratee` aufruft, wenn jemand es überschrieben hat. `_.template` baut aus dem Template den Quelltext einer Funktion und erzeugt sie mit `new Function`, ohne `variable`-Einstellung in einem `with`-Block; das braucht `unsafe-eval` in der Content Security Policy und war 2021 Einfallstor für eine Code-Injection (behoben in 1.12.1).

## Stärken und Schwächen

- **Stark:** klein und lesbar (der kommentierte Quelltext ist als Dokumentation gedacht), keine Eingriffe in native Objekte, stabile API seit über 15 Jahren, wird noch gepflegt, einzelne ES-Module.
- **Schwach:** fast alles davon ist heute nativ (`map`, `filter`, `find`, `Object.keys`, `bind`, `Object.groupBy`, `structuredClone`); Ketten ohne Lazy Evaluation; `_.template` mit `with` und `new Function`; `isArrayLike` rät statt zu prüfen; im Vergleich zu lodash weniger Randfälle bedacht und keine Pfad-Funktionen. Neue Projekte haben kaum einen Grund, es einzubinden; es lebt in Backbone-Anwendungen und deren Umfeld weiter (etwa WordPress).

## Für rat und aufbau

- **Der Ursprung der eigenen Utility-Pakete.** `@pulgasari/arr` (`filterByCriteria`, `mapBy`, `sortBy`) und `obj` sind im Kern `_.where`, `_.pluck` und `_.sortBy` mit sprechenden Namen und ohne Kontext-Argument. Die js-packages verhalten sich zu Underscore wie Underscore zu Prototype.js: dieselben Bedürfnisse, aber ohne das nachzubauen, was die Plattform inzwischen kann.
- **Der Objekt-Wrapper lebt weiter.** `_('ada').capitalize()` ist das Vorbild von `arr(users).sortBy('name')` und `str()` in den js-packages; dort als Proxy, der unbekannte Namen an die native Methode durchreicht, statt jede Methode per `mixin` einzuhängen. Lazy Evaluation fehlt beiden, und beide brauchen sie bei den üblichen Listengrößen nicht.
- **Ein `_.chain` ist eine Pipe ohne Syntax.** `_.chain(books).where(…).pluck('title').value()` schreibt rat als `books |> filterByCriteria(#, …) |> mapBy(#, 'title')`; Wrapper, `value()` und `mixin` fallen weg, weil der Compiler die Verkettung übernimmt (d-08, d-09). Mit den data-last-Funktionen aus `@pulgasari/arr/fp` geht es ganz ohne `#`.
- **Templates als Strings sind das, was rat vermeiden will.** `_.template` erzeugt HTML-Strings, die per `innerHTML` alles ersetzen; Fokus, Eingaben und Listener gehen verloren. Das ist die Ausgangslage, die bei [Backbone.js](backbone.md) beschrieben ist. rats `{…}`-Löcher und `html` in `@aufbau/element` schreiben nur die geänderte Stelle und brauchen kein `new Function`.
- **`_.debounce` gegen `@pulgasari/timing`:** Underscore hat `immediate` (sofort ausführen, dann sperren), `timing.debounce` nur das nachlaufende Verhalten. Wer beides braucht, findet in lodash die vollständigere Variante (`leading`, `trailing`, `maxWait`, `flush`).

Quellen: [Website mit Changelog](https://underscorejs.org), [Repository](https://github.com/jashkenas/underscore), [Changelog-Quelle (index.html)](https://github.com/jashkenas/underscore/blob/master/index.html), [npm](https://registry.npmjs.org/underscore). Stand: 21. Oktober 2026.
