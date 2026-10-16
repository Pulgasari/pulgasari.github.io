# ArkType

Eine Bibliothek für Schemas und Validierung wie [Zod](zod.md) und [Valibot](valibot.md), aber mit einer eigenen Typ-Sprache in Strings, die fast wie TypeScript aussieht: `'string | number'`, `'number.integer >= 0'`, `'string[]'`. ArkType parst diese Strings zur Laufzeit zu einem Typ-Graphen und compiliert daraus Prüffunktionen. Von David Blass, erste Versionen im September 2022, Version 2.0 im Januar 2025. Aktuell 2.2.8 (Oktober 2026), aktiv. Mitautor von Standard Schema.

- Website: https://arktype.io
- Repository: https://github.com/arktypeio/arktype
- Abhängigkeiten: `@ark/schema`, `@ark/util`, `arkregex` (eigene Pakete)
- Build: keiner nötig

## Das Problem, das ArkType löst

Mit Zod oder Valibot beschreibt man Typen in einer zweiten Sprache: `z.union([z.string(), z.number()])` statt `string | number`, `z.array(z.string())` statt `string[]`. Wer TypeScript kennt, übersetzt jedes Mal im Kopf. Und die Typ-Ableitung über Generics kostet in großen Projekten viel Compiler-Zeit.

ArkType nimmt die Schreibweise, die man schon kennt, und macht sie zur Laufzeit gültig: **ein Typ ist ein String, der wie ein TypeScript-Typ aussieht**. TypeScript selbst parst diese Strings bereits im Editor (über Template-Literal-Typen) und meldet Tippfehler sofort; zur Laufzeit parst ArkType sie ein zweites Mal und baut daraus die Prüfung. Das Motto: *TypeScript's 1:1 validator*.

## Kernkonzepte

### 1. Typen als Strings in Objekten

```js
import { type } from 'arktype';

const User = type({
  name   : 'string > 0',               // at least one character
  email  : 'string.email',
  'age?' : 'number.integer >= 0',      // ? in the key: optional
  role   : "'admin' | 'user'",
});

const user = User(input);              // the value, or an ArkErrors object
if (user instanceof type.errors) console.log(user.summary);
```

Ein Typ ist eine Funktion: aufrufen prüft. Das Ergebnis ist entweder der (eventuell umgewandelte) Wert oder ein Fehlerobjekt, nie eine Exception (`User.assert(input)` wirft, wer das will). Die Fehler sind lesbar und vollständig:

```
email must be an email address (was "x")
name must be non-empty
role must be "admin" or "user" (was "x")
age must be non-negative (was -1)
```

### 2. Die Syntax

| ArkType | bedeutet |
|---|---|
| `'string'`, `'number'`, `'boolean'`, `'Date'` | Basistypen, Klassen |
| `"'admin' \| 'user'"`, `'1 \| 2 \| 3'` | Literale und Unions |
| `'string[]'`, `'(string \| number)[]'` | Listen |
| `['number', 'number']` | Tuple (als Array geschrieben) |
| `'string > 0'`, `'string <= 255'` | Länge |
| `'number >= 0'`, `'0 <= number.integer <= 255'` | Wertebereich, auch beidseitig |
| `'number % 2'` | teilbar durch 2 |
| `'string.email'`, `'string.uuid'`, `'string.url'` | eingebaute Formate (Keywords) |
| `'string & /^a/'` | Schnitt, hier mit einem Regex |
| `{ 'age?': 'number' }` | optionales Feld |

Was nicht in einen String passt, geht über Methoden: `type('string').narrow(fn)` für eigene Bedingungen, `.pipe(...)` für Umwandlungen, `.default(x)`, `.describe('…')`.

### 3. Umwandeln: Morphs und Pipes

```js
const Port = type('string.numeric.parse').pipe(type('0 <= number.integer <= 65535'));

Port('8080');       // 8080
Port('x');          // error: must be a well-formed numeric string (was "x")

type('string.date.iso.parse')('2026-10-16');   // a Date
```

Ein *Morph* wandelt einen Wert um (String zu Zahl, String zu Date), eine Pipe hängt Prüfung und Umwandlung hintereinander. Keywords mit `.parse` am Ende sind fertige Morphs. Das ist dasselbe wie Zods `transform` und Valibots `pipe`, nur mit Namen statt Funktionen.

### 4. Scopes: Typen, die sich gegenseitig kennen

```js
import { scope } from 'arktype';

const $ = scope({
  tree : { value: 'number', children: 'tree[]' },   // recursive
  user : { name: 'string', friends: 'user[]' },
}).export();

$.tree({ value: 1, children: [{ value: 2, children: [] }] });
```

Ein Scope ist ein Namensraum: Typen darin können sich beim Namen nennen, auch rekursiv und gegenseitig. Das entspricht `.with()` in `@pulgasari/typeshift`.

### 5. Pattern Matching: `match`

```js
import { match } from 'arktype';

const describe = match
  .case({ type: "'user'", name: 'string' }, user => `user ${user.name}`)
  .case('string', text => text)
  .default(() => 'other');

describe({ type: 'user', name: 'ada' });   // 'user ada'
describe(4);                               // 'other'

const label = match({ string: s => `str ${s}`, number: n => `num ${n}`, default: 'assert' });
```

Seit Version 2: Fälle sind ArkType-Typen, der erste passende gewinnt, `default` regelt den Rest: ein Handler, `'assert'` (wirft), `'reject'` (liefert ein Fehlerobjekt) oder `'never'` (im Editor sind dann nur Eingaben erlaubt, die ein Fall abdeckt). ArkType wertet die Fälle nicht der Reihe nach aus, sondern baut daraus einen Entscheidungsbaum: Bei Fällen, die sich an einem Feld unterscheiden (`type: 'user'` gegen `type: 'error'`), wird nur dieses Feld angesehen. Teile herausholen wie in Rust gibt es nicht; der Handler bekommt den ganzen, bereits geprüften Wert.

### 6. Beschreibung zur Laufzeit

```js
User.expression;     // '{ email: /…/, name: string >= 1, role: "admin" | "user", age?: number % 1 & >= 0 }'
User.json;           // the type graph as plain json
User.toJsonSchema(); // a json schema, draft 2020-12
```

Ein ArkType-Typ ist kein undurchsichtiges Prädikat: Er kann sich selbst als Text, als JSON-Graph und als JSON Schema ausgeben. Aus `.json` lässt sich ablesen, dass `age` eine ganze Zahl ab 0 ist, und daraus etwa ein Eingabefeld bauen.

### 7. Mengenlogik: Typen vergleichen

```js
type('number > 10').extends('number > 0');   // true: the first set lies in the second
type('string').and('number');                // never: the sets do not overlap, an error at definition
```

Weil jeder Typ intern eine Menge mit Grenzen ist, kann ArkType entscheiden, ob ein Typ in einem anderen enthalten ist (Subtyping), Schnitte vereinfachen und unmögliche Typen schon beim Definieren melden. Das kann weder Zod noch Valibot.

## Wie es intern arbeitet

Ein Definitions-String wird geparst und in Knoten von `@ark/schema` übersetzt: *Domains* (`string`, `number`, `object`), *Units* (Literale), *Constraints* (`min`, `max`, `pattern`, `divisor`), *Structures* (Felder, Index-Signaturen, Sequenzen), *Unions*, *Morphs*. Diese Knoten werden **normalisiert**: `number >= 0 & number >= 5` wird zu `number >= 5`, doppelte Zweige einer Union fallen weg, unmögliche Schnitte werden erkannt. Bei Unions sucht ArkType ein *diskriminierendes* Feld und baut einen Sprung über dessen Wert, statt jeden Zweig zu probieren.

Aus dem fertigen Graphen erzeugt ArkType JavaScript-Code und compiliert ihn mit `new Function` (JIT). Unter einer Content-Security-Policy ohne `unsafe-eval` erkennt es das selbst (`envHasCsp`) und interpretiert den Graphen stattdessen (`jitless`).

Die Editor-Seite ist ein eigener Parser in TypeScript-Typen: Template-Literal-Typen zerlegen `'number.integer >= 0'` Zeichen für Zeichen. Deshalb zeigt der Editor bei `'strng'` sofort einen Fehler, und `typeof User.infer` ist der passende statische Typ.

## Stärken und Schwächen

- **Stark:** Kürzeste und vertrauteste Schreibweise unter den Schema-Bibliotheken, sehr gute Fehlermeldungen, echte Mengenlogik (Normalisierung, `extends`, unmögliche Typen), diskriminierte Unions automatisch, `match` eingebaut, JSON Schema und Selbstbeschreibung ohne Zusatzpaket. Unter den schnellsten Validatoren. Läuft auch unter strenger CSP.
- **Schwach:** Groß und nicht tree-shakable: schon ein kleines Schema kostet 46 kb (gzip), gegenüber 1,6 kb bei Valibot. Ohne TypeScript entfällt der wichtigste Vorteil, die Prüfung der Strings im Editor: In reinem JavaScript ist `'strng'` erst zur Laufzeit ein Fehler. Strings mit eigener Grammatik sind für Formatter, Suche und Umbenennen nur Text. Das Typ-System im Editor ist komplex und kann die TypeScript-Performance belasten.

## Für rat und aufbau

- **ArkType ist `@pulgasari/typeshift`, zu Ende gebaut.** Strings als Typen, Union, Schnitt, Listen, Tuple, Shapes, Ranges, rekursive Typen über einen Namensraum (`scope` hier, `.with()` dort), dazu ein `match`. Die Einordnung steht in [shift-typeshift.md](../../analyze/shift-typeshift.md). Was ArkType darüber hinaus hat und typeshift fehlt: Fehlermeldungen mit Pfad, Morphs, Normalisierung, Selbstbeschreibung, Standard Schema. Wer typeshift weiterbaut, findet in ArkTypes Syntax-Entscheidungen eine erprobte Vorlage (`>=`-Schreibweise statt `(0..)`, `?` im Schlüssel, `.parse`-Keywords für Umwandlungen).
- **Mengenlogik für `@rat/types`.** `extends` und die Normalisierung zeigen, was „ein Typ ist eine Menge“ praktisch bringt: Der Compiler könnte prüfen, ob ein `@case` überhaupt eintreten kann oder ob alle Fälle einer Union abgedeckt sind. Dafür braucht es Typen, die ihre Grenzen als Daten tragen (`{ min: 0, max: 255 }`), nicht als Funktion.
- **Diskriminierte Unions automatisch:** ArkType findet das unterscheidende Feld selbst. Für rats `@switch` mit named cases wäre das dieselbe Optimierung: Statt jeden Case zu probieren, einmal `value.status` lesen und springen.
- **Für reines JavaScript eher nicht als Abhängigkeit.** Ohne TypeScript fehlt die Prüfung im Editor, und 46 kb sind für Browser-Apps wie zugriff viel. Als Ideenquelle für typeshift und `@rat/types` aber die nächste Verwandte.
