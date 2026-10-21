# lodash

Eine Sammlung von rund 300 Hilfsfunktionen für Arrays, Objekte, Strings und Funktionen, 2012 von John-David Dalton als Fork von [Underscore](underscore.md) begonnen: gleiche API, aber konsistenter, schneller und mit mehr Funktionen. Über Jahre eines der meistinstallierten npm-Pakete, oft nur als Abhängigkeit einer Abhängigkeit. Aktuell 4.18.1 (April 2026). Nach 4.17.21 (Februar 2021) gab es fast fünf Jahre kein Release; seit Ende 2025 wird lodash unter der OpenJS Foundation und mit Geld der Sovereign Tech Agency wieder gepflegt. Ziel ist der Status „Feature-Complete“: Sicherheitskorrekturen und CI ja, neue Funktionen nein, dazu Anleitungen für den Umstieg auf native APIs. Das seit Jahren angekündigte lodash 5 ist nicht erschienen; ob es vor dem Feature-Complete-Status noch kommt, ist im Roadmap-Issue offen.

- Website: https://lodash.com
- Repository: https://github.com/lodash/lodash
- Laufzeit: Browser, Node, Deno, Bun; Pakete `lodash` (CommonJS/UMD, ein Monolith), `lodash-es` (ES-Module, `sideEffects: false`), `lodash/fp`, dazu Einzelpakete wie `lodash.debounce`
- Build: keiner

## Das Problem, das lodash löst

2012 hatte JavaScript `map`, `filter` und `forEach` erst seit ES5, und ältere Browser kannten sie nicht. Underscore schloss die Lücke, verhielt sich aber zwischen Umgebungen nicht immer gleich (Lücken in Arrays, `arguments`-Objekte, Objekte mit `length`). lodash begann als Drop-in-Ersatz, der in jedem Browser dasselbe Ergebnis liefert und schneller ist, und wuchs dann weit über Underscore hinaus: Pfade, tiefe Kopien, tiefe Vergleiche, `debounce` mit allen Optionen, String-Fälle.

Der eigentliche Wert war später weniger die Kompatibilität als das **Vokabular**: `groupBy`, `keyBy`, `uniqBy`, `debounce`, `get` sind Namen, die jeder JavaScript-Entwickler kennt. Viele davon hat die Sprache inzwischen selbst übernommen (`Object.groupBy`, `Array.prototype.flat`, `?.`, `structuredClone`).

## Kernkonzepte

### 1. Sammlungen: Arrays und Objekte gleich behandeln

```js
_.map({ a: 1, b: 2 }, value => value * 2);   // [2, 4]
_.groupBy(people, 'team');                  // { red: [...], blue: [...] }
_.keyBy(items, 'id');                       // { 7: {...}, 9: {...} }
_.sortBy(people, ['age', 'name']);           // stable, several keys
_.partition(todos, 'done');                 // [[done], [open]]
```

Die „Collection“-Funktionen nehmen Arrays, Objekte und Strings. Die Daten stehen **vorn**, die Funktion dahinter; nichts verändert die Eingabe, außer Funktionen, die es im Namen sagen (`_.remove`, `_.pull`, `_.merge`).

### 2. Iteratee-Kurzformen

```js
_.filter(users, { active: true, role: 'admin' });   // _.matches: deep partial compare
_.filter(users, ['role', 'admin']);                 // _.matchesProperty
_.map(users, 'address.city');                       // _.property with a path
_.uniqBy(items, 'id');
```

Wo eine Funktion erwartet wird, darf auch ein String, ein Objekt oder ein Paar stehen. `_.iteratee` macht daraus die Funktion. Das spart viele `item => item.x`, kostet aber Größe: Wer `_.map` importiert, bekommt die ganze Maschinerie für Objekt-Vergleiche mit.

### 3. Pfade

```js
_.get(config, 'server.ports[0]', 8080);   // default when missing
_.set(state, ['user', 'name'], 'Ada');    // creates missing nodes, mutates
_.has(state, 'user.address.city');
_.unset(state, 'user.token');
```

Ein Pfad ist ein String mit Punkten und Klammern oder ein Array von Schlüsseln. `_.get` ist heute fast immer `?.` mit `??`; `_.set` auf unbekannten Pfaden hat keinen nativen Ersatz. Pfade aus fremden Daten sind ein Angriffsweg: 4.18.0 (März 2026) schließt in `_.unset` und `_.omit` Prototype Pollution über `constructor`/`prototype`.

### 4. Tiefe Operationen

```js
const copy = _.cloneDeep(state);          // also Map, Set, typed arrays, cycles
_.isEqual(a, b);                          // deep, structural
_.merge({}, defaults, options);           // deep merge, mutates the first argument
_.mergeWith(a, b, (x, y) => Array.isArray(x) ? x.concat(y) : undefined);
```

`cloneDeep` und `isEqual` kennen zyklische Strukturen und die meisten eingebauten Typen. `structuredClone` deckt das Klonen heute nativ ab (ohne Funktionen und Prototypen); für tiefe Gleichheit und tiefes Mischen gibt es keinen Standard.

### 5. Funktionen über Funktionen

```js
const save = _.debounce(write, 500, { maxWait: 2000 });   // at the latest after 2s
const move = _.throttle(draw, 100, { leading: true, trailing: false });
save.flush();     // run now if something is pending
save.cancel();

const area = _.memoize(compute, (w, h) => `${w}x${h}`);    // custom cache key
const init = _.once(setup);
```

`debounce` ist die vollständigste Variante, die es gibt: `leading`, `trailing`, `maxWait`, `flush`, `cancel`. `throttle` ist intern ein `debounce` mit `maxWait`.

### 6. Ketten mit Lazy Evaluation

```js
const top = _(users)
  .filter(user => user.active)
  .map(user => user.name)
  .take(3)
  .value();    // nothing runs before value()
```

`_(value)` wickelt den Wert ein, jede Methode liefert wieder einen Wrapper. Bei Arrays sammelt lodash `filter`, `map`, `take` und Verwandte und führt sie in **einem** Durchlauf aus; `take(3)` bricht nach drei Treffern ab, statt das ganze Array zu filtern. Der Preis: Die Kette zieht die gesamte Bibliothek, Tree Shaking ist damit ausgeschlossen.

### 7. `lodash/fp`

```js
import fp from 'lodash/fp';

const names = fp.flow(fp.filter('active'), fp.map('name'), fp.take(3));
names(users);
```

Dieselben Funktionen, aber gecurried, mit den Daten zuletzt und ohne Mutation (`fp.set` kopiert). Das ist das Modell von [Ramda](ramda.md), als Variante über den lodash-Kern gelegt. `flow` ist `pipe`, `flowRight` ist `compose`.

### 8. Strings und Templates

```js
_.camelCase('user-name');     // 'userName'
_.kebabCase('userName');      // 'user-name'
_.escape('<b>');              // '&lt;b&gt;'

const card = _.template('<h2><%- title %></h2>');
card({ title: 'Hallo' });
```

`_.template` stammt aus Underscore (siehe dort) und erzeugt Code mit `Function`. Es war die Quelle mehrerer CVEs (2021 über `variable`, 2026 über `imports`-Schlüssel, CVE-2026-4800) und hat seit 4.18.0 einen Sicherheitshinweis in der Doku.

## Wie es intern arbeitet

Der Quelltext ist ein einziger großer Funktionsrumpf (`runInContext`), der alle Funktionen gegen die Globals einer Umgebung erzeugt. `lodash-es`, `lodash-amd` und die Einzelpakete werden mit `lodash-cli` daraus **generiert**, nicht von Hand geschrieben. Das erklärt 4.18.1: Ein `ReferenceError` in `template` und `fromPairs` steckte nur in den generierten Builds, die CI hatte den Monolithen geprüft.

Fast jede Sammlungsfunktion läuft über `baseIteratee`, das Kurzformen in Funktionen übersetzt, und über eigene Datenstrukturen: `Stack` merkt sich bei `isEqual` und `cloneDeep` besuchte Paare (Zyklen), `MapCache` und `SetCache` ersetzen ab 200 Elementen (`LARGE_ARRAY_SIZE`) bei `uniq`, `difference` und `intersection` lineare Suche durch Hashing. Die Ketten nutzen einen `LazyWrapper`, der Iteratees und `take`-Grenzen sammelt und erst in `value()` ausführt; das funktioniert nur, solange jede Callback-Funktion genau ein Argument nimmt.

Größe (esbuild, minifiziert und gzip): `lodash` als Ganzes 26,4 kb, `lodash-es` mit allen Exporten 30,1 kb, zehn häufige Funktionen aus `lodash-es` 10,6 kb, der reduzierte Build `lodash/core` 5,7 kb. Die zehn Funktionen sind so teuer, weil `map` und `filter` über die Iteratee-Kurzformen `isEqual`, Pfade und Caches mitbringen.

## Stärken und Schwächen

- **Stark:** konsistentes, gut dokumentiertes Vokabular, fast jede Randbedingung bedacht (Zyklen, Lücken, `-0`, `NaN`), `debounce`/`throttle` vollständig, Pfade und tiefe Operationen ohne Gegenstück im Standard, jahrelang erprobt, wieder gepflegt.
- **Schwach:** groß für das, was man meist braucht; der Default-Import und Ketten verhindern Tree Shaking; vieles ist durch die Sprache überholt (`Object.groupBy`, `Array.prototype.findLast`, `?.`, `structuredClone`, `Object.fromEntries`); Pfade aus Nutzerdaten sind riskant (Prototype Pollution, mehrere CVEs); `_.merge` und `_.set` mutieren, was man ihnen nicht ansieht. Kein lodash 5, kein ESM-only-Paket mit sauberer API, Feature-Complete heißt: kein Ausbau mehr.

## Für rat und aufbau

`@pulgasari/arr`, `obj`, `str`, `is` und `timing` decken ehrlich betrachtet die Teile von lodash ab, die man in neuem Code noch braucht, in kleinen ES-Modulen ohne Iteratee-Maschinerie. zugriff nutzt davon heute `is`, `obj`, `str` und `timing`, kein lodash.

| lodash | js-packages | Bemerkung |
|---|---|---|
| `_.filter(users, { role: 'admin' })` | `filterByCriteria(users, { role: 'admin' })` | `arr` vergleicht flach mit `===`, lodash tief und partiell (`_.isMatch`). für Listen von Records reicht flach meist; der Name sagt, was passiert |
| `_.map(users, 'name')` | `mapBy(users, 'name')` | ein Schlüssel, kein Pfad |
| `_.sortBy(users, ['role', 'name'])`, `_.orderBy(…, ['asc', 'desc'])` | `sortBy(users, { role: 'asc', name: 'desc' })` | beide kopieren; `arr` hat die Richtung im selben Argument |
| `_.get` / `_.set` / `_.unset` | `getByPath` / `setByPath` / `deleteByPath` | nur Punkte, keine Klammern; `setByPath` lässt `__proto__`, `constructor`, `prototype` aus |
| `_.cloneDeep`, `_.merge` | `deepClone` (über `structuredClone`), `deepMerge` | `deepMerge` mutiert das Ziel wie `_.merge` |
| `_.camelCase`, `_.kebabCase` | `toCamelCase`, `toKebabCase` … in `str` | dazu `toSlugCase` mit Umlauten, das hat lodash nicht |
| `_.debounce`, `_.throttle` | `debounce`, `throttle`, `rafThrottle` in `timing` | `timing` hat `cancel`, aber kein `flush`, kein `maxWait`, kein `leading` beim `debounce` |
| `_.isPlainObject`, `_.isEqual` … | `is('plainObject')` … in `is` | tiefe Gleichheit fehlt bewusst |
| `_(users).filter().map().value()` | `arr(users).sortBy('name')` | `arr()` ist ein Proxy ohne Lazy Evaluation, dafür ohne Gesamtimport |
| `lodash/fp` | `@pulgasari/arr/fp` | handgeschriebene Closures statt `curry()`, Daten zuletzt |

- **`deleteByPath` hat die Lücke, die lodash 4.18.0 gerade geschlossen hat.** `resolvePath` läuft ungeprüft durch `__proto__`, also löscht `deleteByPath({}, '__proto__.toString')` die Methode auf `Object.prototype`. `setByPath` prüft `UNSAFE_KEYS`, `resolvePath` sollte es auch tun (Vorschlag: Prüfung in `resolvePath`, dann sind `get`, `has`, `delete` und `toggle` gemeinsam abgedeckt).
- **`flush` und `maxWait` für `timing.debounce`** wären die zwei Optionen aus lodash, die in Apps wirklich vorkommen: `flush` vor `beforeunload` (Speichern nicht verlieren), `maxWait` bei Eingaben, die nie pausieren. Beides sind wenige Zeilen.
- **rats Pipe und `lodash/fp`:** `x |> f()` wird zu `f()(x)` (d-09), also passt jede `lodash/fp`-Funktion ohne Platzhalter, genau wie bei [Ramda](ramda.md). Mit dem Standard-lodash (Daten vorn) braucht es `#`: `users |> _.groupBy(#, 'team')`. Für rat ist `@pulgasari/arr/fp` der natürliche Partner, weil es keine Laufzeitkosten für Currying hat.
- **Kein Vorbild für die API-Breite.** lodash zeigt, wohin ein Utility-Paket wächst, wenn jede Anfrage eine Funktion wird: 300 Funktionen, Iteratee-Kurzformen, die jede Funktion teuer machen, und am Ende ein Projekt, das nur noch gepflegt wird, damit es nicht zum Sicherheitsrisiko wird. Die js-packages sind klein, weil sie das Native nicht nachbauen.

Quellen: [Website](https://lodash.com), [Repository und README](https://github.com/lodash/lodash), [Releases 4.18.0 und 4.18.1](https://github.com/lodash/lodash/releases), [Roadmap-Issue #6040](https://github.com/lodash/lodash/issues/6040), [OpenJS: STA supports Lodash](https://openjsf.org/blog/sta-supports-lodash), [Sovereign Tech Agency](https://www.sovereign.tech/tech/lodash), [npm](https://registry.npmjs.org/lodash). Stand: 21. Oktober 2026.
