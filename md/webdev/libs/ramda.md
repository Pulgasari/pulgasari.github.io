# Ramda

Eine Bibliothek für funktionales Programmieren in JavaScript, seit 2013/2014 von Scott Sauyet und Michael Hurley. Rund 270 kleine Funktionen (`map`, `filter`, `pipe`, `prop`, `evolve` …), alle **automatisch gecurried**, alle mit den **Daten als letztem Argument**, keine verändert ihre Eingabe. Aktuell 0.32 (Oktober 2025). Eine 1.0 gab es nie, die Bibliothek gilt trotzdem seit Jahren als stabil.

- Website: https://ramdajs.com
- Repository: https://github.com/ramda/ramda
- Build: keiner (ES-Module unter `ramda/es`, `sideEffects: false`)
- Begriffe: [fp.md](../fp.md)

## Das Problem, das Ramda löst

Underscore und lodash hatten 2013 schon `map` und `filter`, aber mit den Daten **vorn**: `_.map(users, fn)`. Damit kann man keine Funktion bauen, die "irgendwann" auf Daten angewendet wird, ohne eine Hülle drumherum zu schreiben. Ramda dreht das um: Erst kommt, **was** getan wird, zuletzt **womit**. Dadurch entstehen aus kleinen Funktionen neue Funktionen, ohne dass man je ein Argument benennen muss.

```js
// lodash: data first, every step names its input
const names = users => _.map(_.filter(users, user => user.active), user => user.name);

// ramda: data last, the pipeline is a function itself
const names = R.pipe(R.filter(R.propEq(true, 'active')), R.map(R.prop('name')));
names(users);
```

## Kernkonzepte

### 1. Automatisches Currying

```js
const add = R.add;     // (a, b) => a + b
add(1, 2);             // 3
add(1)(2);             // 3
const increment = add(1);
increment(41);         // 42
```

Jede Ramda-Funktion nimmt ihre Argumente auf einmal oder nacheinander. Mit weniger Argumenten als nötig gibt sie eine Funktion zurück, die auf den Rest wartet. `R.curry(fn)` macht das mit eigenen Funktionen.

### 2. Daten zuletzt

```js
R.map(double, [1, 2, 3]);      // [2, 4, 6]
const doubleAll = R.map(double);
doubleAll([1, 2, 3]);           // [2, 4, 6]
```

Weil die Daten am Ende stehen, lassen sich alle Funktionen teilweise anwenden und dann verketten. Das ist die eine Designentscheidung, auf der alles Weitere aufbaut.

### 3. `pipe` und `compose`

```js
const slug = R.pipe(
  R.trim,
  R.toLower,
  R.replace(/\s+/g, '-'),
);
slug('  Hallo Welt  ');   // 'hallo-welt'
```

`pipe` liest von links nach rechts, `compose` von rechts nach links (wie in der Mathematik). Das Ergebnis ist wieder eine Funktion. Man schreibt Abläufe, ohne die Zwischenwerte zu benennen ("point-free").

### 4. Der Platzhalter `R.__`

```js
const half = R.divide(R.__, 2);   // the missing argument goes where __ stands
half(10);                          // 5
```

Wenn die Daten ausnahmsweise nicht ans Ende passen, markiert `R.__` die Lücke.

### 5. Unveränderliche Updates

```js
const user = { name: 'ada', address: { city: 'london' } };

R.assoc('name', 'Ada', user);                        // new object, user unchanged
R.assocPath(['address', 'city'], 'Paris', user);     // deep, structural sharing
R.evolve({ name: R.toUpper, age: R.inc }, user);     // a function per field
R.dissoc('address', user);
```

Keine Funktion verändert ihre Eingabe. Unveränderte Teile werden geteilt, nicht kopiert.

### 6. Lenses

```js
const city = R.lensPath(['address', 'city']);

R.view(city, user);                 // 'london'
R.set(city, 'Paris', user);         // new object
R.over(city, R.toUpper, user);      // apply a function at that spot
```

Eine Lens ist ein Getter und ein Setter als ein Wert. Man kann sie weitergeben, zusammensetzen (`R.compose(lensA, lensB)`) und auf jedes passende Objekt anwenden.

### 7. Kontrollfluss als Funktionen

```js
const label = R.cond([
  [R.lt(R.__, 0),  R.always('negativ')],
  [R.equals(0),    R.always('null')],
  [R.T,            R.always('positiv')],
]);

const safeName = R.ifElse(R.has('name'), R.prop('name'), R.always('anonym'));
```

`cond`, `ifElse`, `when`, `unless`, `allPass`, `anyPass`: Bedingungen werden selbst zu Funktionen, die man in Pipelines stecken kann.

### 8. Sammlungen

```js
R.groupBy(R.prop('team'), people);
R.sortBy(R.prop('age'), people);
R.uniqBy(R.prop('id'), items);
R.indexBy(R.prop('id'), items);     // array -> object by key
R.partition(R.propEq(true, 'done'), todos);
```

## Wie es intern arbeitet

Jede Funktion steckt in einem von drei internen Curry-Helfern (`_curry1`, `_curry2`, `_curry3`), die zählen, wie viele Argumente schon da sind und ob eines davon der Platzhalter ist. Funktionen über Listen prüfen, ob das Datenargument selbst eine passende Methode hat (`R.map` auf ein Objekt mit eigener `map`-Methode ruft diese), und unterstützen **Transducer**: Mit `R.into` oder `R.transduce` laufen `map`, `filter` und `take` in einem Durchlauf statt in mehreren, ohne Zwischen-Arrays.

## Stärken und Schwächen

- **Stark:** konsequentes Design (eine Regel: gecurried, Daten zuletzt, unveränderlich), sehr ausdrucksstarke Pipelines, Lenses, tree-shakebar (zehn typische Funktionen: 3,6 kb gz), keine Abhängigkeiten.
- **Schwach:** Point-free-Code wird schnell unlesbar ("was kommt hier eigentlich rein?"), Stacktraces zeigen Curry-Hüllen statt Code, langsamer als native Methoden (jeder Aufruf geht durch Argument-Zählung), TypeScript-Typen für gecurriete, variadische Funktionen sind notorisch schwierig. Seit es `?.`, `??`, Spread und `structuredClone` gibt, ist ein Teil der Bibliothek überflüssig. Modernere Alternativen: Remeda (Daten vorn und hinten, für TypeScript gebaut), lodash/fp.

## Für rat und aufbau

- **rats Pipe passt genau auf Ramda.** rat hat entschieden (d-09): `x |> f()` wird zu `f()(x)`. Das ist exakt Ramdas Aufrufmodell: Eine gecurriete Funktion mit allen Argumenten außer den Daten ergibt eine Funktion, die die Daten nimmt.

  ```js
  users |> R.filter(isActive) |> R.map(R.prop('name')) |> R.join(', ')
  ```

  Jede Ramda-Funktion funktioniert in rats Pipe ohne Platzhalter.
- **`#` ist `R.__` in der Syntax.** Wo Ramda den Platzhalter als Wert braucht (`R.divide(R.__, 2)`), schreibt rat `x |> divide(#, 2)`. Die Idee ist dieselbe, der Compiler erspart den Import.
- **Die `|X>`-Familie (d-10)** wären Ramdas häufigste Funktionen als Operatoren: `|:>` ist `R.map`, `|?>` `R.filter`, `|!>` `R.reject`, `|*>` `R.reduce`, `|.>` `R.pluck`. Ramda zeigt, welche Operationen sich das verdient haben.
- **Lenses für `@rat/types`:** Ein `$Record` könnte Pfade als Lenses anbieten (`$user.lens('address.city')`), die man an Eingabefelder bindet (`bind:value={…}`). Das wäre Zwei-Wege-Bindung an tiefe Pfade ohne Hilfsfunktionen.
- **`R.evolve`** ist eine gute Form für Updates in Reaktionen: `$user = R.evolve({ visits: R.inc }, $user)` beschreibt die Änderung als Daten.
