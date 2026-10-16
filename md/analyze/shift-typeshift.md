# shift und typeshift, eingeordnet

`@pulgasari/shift` und `@pulgasari/typeshift` (in `js-packages`) sind entstanden, um If-Ketten und `switch` zu ersetzen, ohne die Theorie dahinter zu kennen. Dieses Dokument legt die Begriffe aus [types_and_schemas.md](../webdev/types_and_schemas.md), [codecs.md](../webdev/codecs.md) und `rat/.md/causa_types.md` darüber: was die beiden Pakete in dieser Sprache sind, wo sie schon weiter sind als gedacht, was ihnen fehlt, und wie sie zu den named cases in rat und zu `@rat/types` passen.

Kurz vorweg: Beide sind auf der richtigen Spur. `shift` ist eine Idee von 1958, `typeshift` ist ein Laufzeit-Typsystem mit eigener Syntax, und dein `todo 2` dort ist Pattern Matching im strengen Sinn.

---

## shift: benannte Bedingungen, erste gewinnt

```js
const toElements = shift ({
  isNullish  : ()       => [document.documentElement],
  isString   : (target) => [...document.querySelectorAll(target)],
  isElement  : (target) => [target],
  isIterable : (target) => [...target].filter(isElement),
  fallback   : ()       => [],
});
```

### was es ist

Eine Liste aus Paaren *(Bedingung, Ergebnis)*, von oben nach unten geprüft, der erste Treffer gewinnt, sonst ein Rest-Fall. Das ist eines der ältesten Kontrollkonstrukte überhaupt: **`cond`** aus Lisp (John McCarthy, 1958). McCarthy führte damit die bedingte Verzweigung als Ausdruck ein; ALGOL 60 machte daraus kurz danach das `if … then … else`, wie wir es heute kennen.

```lisp
(cond ((null? x)   (list root))
      ((string? x) (query-all x))
      (else        '()))
```

Verwandte, die genau dasselbe tun: `cond` in Clojure und Scheme, `case … when` in Ruby (vergleicht mit `===`, das eine Klasse, ein Range oder ein Regex sein kann), *guards* in Haskell. Der Fachbegriff für das Prinzip ist **predicate dispatch**: Welcher Code läuft, entscheidet eine Reihe von Prädikaten.

### in den neuen Begriffen

- Ein **Prädikat** (`isString`) ist ein Typ in der Mengen-Sicht: eine Funktion, die für jeden Wert sagt, ob er dazugehört. In der Mathematik heißt das *charakteristische Funktion* einer Menge. `@pulgasari/is` mit seinen rund 90 Prädikaten ist damit eine kleine **Bibliothek von Laufzeit-Typen**, nur in der einfachsten Form (Ja/Nein).
- `shift` ist **Stufe 1** der Leiter aus `causa_types.md`: benannte Bedingungen. Das ist genau das, was du dir unter „named cases“ ursprünglich vorgestellt hattest. Du hattest es schon gebaut.
- Fast alle Beispiele im README sind **Decoder** im Sinne von [codecs.md](../webdev/codecs.md): „irgendetwas rein, ein bestimmter Typ raus“. `toDate` nimmt Date, Zahl, String oder nichts und liefert immer ein `Date`. `toElements` liefert immer ein Array von Elementen. Das ist *parse, don't validate*: Nach dem Aufruf ist die Form garantiert. `@pulgasari/coerce` macht dasselbe für feste Zieltypen.

### was es nicht hat

| | shift | was die Theorie dazu sagt |
|---|---|---|
| Ergebnis eines Tests | `true` / `false` | ein Schema sagt zusätzlich *warum nicht* und *wo* (Pfad) |
| Teile herausholen | nein, der Handler bekommt den ganzen Wert | Stufe 3: Bindings |
| alle Fälle abgedeckt? | `fallback` fängt alles | Stufe 4: Vollständigkeit braucht eine geschlossene Union |
| Beschreibung | ein Prädikat ist eine Funktion, also **undurchsichtig**: man kann sie aufrufen, aber nicht fragen, was sie prüft | ein Schema kann man ansehen (`min`, `max`, Werteliste) und daraus z. B. ein Input bauen |

Der letzte Punkt ist der wichtigste für deine Frage aus dem Typen-Thema („warum gibt es die Information zur Laufzeit nicht?“): Bei Prädikaten gibt es sie zur Laufzeit, aber eingeschlossen in einer Funktion. `isPort` weiß, dass 0 bis 65535 gilt, kann es aber niemandem sagen.

---

## typeshift: eine Typ-Sprache als String

```js
const toElements = typeshift ({
  'null | undefined'   : ()       => [document.documentElement],
  'string(1..)'        : (target) => [...document.querySelectorAll(target)],
  'element'            : (target) => [target],
  'iterable & !string' : (target) => [...target].filter(isElement),
  fallback             : ()       => [],
});
```

### was es ist

Hier hast du, ohne es so zu nennen, ein vollständiges **Laufzeit-Typsystem** gebaut. Die Grammatik in `parse.js` enthält fast jeden Baustein aus `causa_types.md`:

| typeshift | Begriff |
|---|---|
| `string`, `number`, `Date` | Basistypen, Klassen über `instanceof` |
| `'a'`, `3`, `true`, `null` | Literal-Typen |
| `string \| number` | Union (Summe) |
| `iterable & !string` | Intersection und Negation (Mengen-Schnitt und -Komplement) |
| `string[]` | Liste (Collection) |
| `[number, number]`, `[string, ...number]` | Tuple (Produkt, positional) |
| `{ ok: true, data?: object }` | Record (Produkt, benannt), strukturell, optionale Felder |
| `number(0..10)`, `string(1..)` | Refinement (die Pascal-Subranges von 1970) |
| `/^\d+$/` | Refinement über ein Muster |
| `.with({ tree: '{ value: number, children: tree[] }' })` | benannte und **rekursive** Typen |

Intersection und Negation haben übrigens weder Zod noch Valibot in dieser Form; das kommt aus der Mengen-Sicht und ist eine Stärke.

Das nächste existierende Gegenstück ist **ArkType** (David Blass, seit 2023, Mitautor von Standard Schema): ebenfalls Typen als Strings in TypeScript-ähnlicher Syntax (`type({ name: 'string', age: 'number >= 0' })`), geparst und zu schnellen Prüfungen compiliert. typeshift ist dieselbe Idee, unabhängig entstanden.

### wie es intern arbeitet, in den Begriffen

`parse` macht aus dem String einen **Syntaxbaum** (AST), `compile` aus dem Baum eine **Prädikat-Funktion**. Das ist genau die Architektur eines kleinen Compilers, wie in rat: Text, Baum, Code. Und es ist dieselbe Trennung wie zwischen Typ und Schema:

- Der **Baum** ist eine *Beschreibung*: Man kann ihn ansehen, umwandeln, ausgeben. Das ist die Information, die bei `shift` in der Funktion eingeschlossen war.
- Das **compilierte Prädikat** ist die schnelle *Prüfung*: undurchsichtig, aber ohne Overhead.

typeshift hält den Baum nach dem Compilieren nicht fest, aber er existiert. Aus `{ type: 'name', name: 'number', range: { minimum: 0, maximum: 255 } }` ließe sich ohne Weiteres ein Slider von 0 bis 255 ableiten. Damit ist typeshift näher an „aus einem Typ ein Input bauen“, als es aussieht.

### dein todo 2 ist Pattern Matching

```js
const describe = typeshift ({
  "{ type: 'user', name }"     : ({ name })       => `User: ${name}`,
  "{ type: 'error', message }" : ({ message })    => `Error: ${message}`,
  "[head, ...tail]"            : ({ head, tail }) => ({ head, tail }),
  "_"                          : () => null,
});
```

Das ist Stufe 3: Form prüfen **und** Teile herausholen. `name` ohne Doppelpunkt ist eine Bindung, `type: 'user'` ein Test, `_` der Platzhalter für „egal was“ (dasselbe Zeichen wie in Rust, Haskell, Elixir, Python). Damit bist du bei der Bibliothek **ts-pattern** und beim TC39-Vorschlag für Pattern Matching in JavaScript (`match (value) { when … }`, seit Jahren in Arbeit).

Auffällig: Deine Regel im Beispiel („ein Name ohne `:` bindet, mit `:` wird geprüft“) ist genau die, die ich in der Antwort zu rats named cases als Ersatz für die Großschreibung vorgeschlagen habe. Du warst schon dort.

### was es nicht hat

- **Fehlerberichte:** wie `shift` nur `true`/`false`. Für Formulare und Importe braucht man „Feld `age`: zu klein“.
- **Rückgabe eines umgewandelten Werts:** typeshift prüft nur, es koerziert nicht. Die Handler machen die Umwandlung, also ist jeder typeshift-Aufruf ein handgeschriebener Decoder.
- **Werkzeug-Unterstützung:** Ein String ist für Editor und Linter nur Text. Tippfehler (`'strin'`) fallen erst beim Aufruf auf (immerhin mit klarer Meldung `unknown type`).
- **Standard Schema:** steht als `todo 1` da, ist eine Zeile Arbeit und würde typeshift-Muster in rat-Signals, Formular-Bibliotheken und überall sonst nutzbar machen, wo Zod geht.

---

## drei Schreibweisen für denselben Typ

Zwischen deinen Paketen, Zod/Valibot und deinem Entwurf in `concepts/typestuff.md` liegen nur verschiedene Schreibweisen derselben Sache:

```js
// 1. predicate: a function (shift, @pulgasari/is)
const isPort = value => Number.isInteger(value) && value >= 0 && value <= 65535;

// 2. pattern string: text, parsed into a tree (typeshift, arktype)
'integer(0..65535)'

// 3. schema object: a value built from functions (zod, valibot, @rat/types, typestuff.md)
pipe(Number, isInteger, hasValueMin(0), hasValueMax(65535))
```

| | Prädikat | Pattern-String | Schema-Objekt |
|---|---|---|---|
| kurz | mittel | **sehr** | mittel |
| ansehbar (für UI, Doku) | nein | ja, nach dem Parsen | **ja** |
| Fehlermeldung mit Pfad | nein | möglich | **ja** |
| zusammensetzen | über `and`/`or` | im String, plus `.with()` | über normale JS-Variablen und Imports |
| Editor kennt Namen | ja | nein | **ja** |
| braucht einen Parser | nein | **ja** | nein |

Dein `typestuff.md`-Entwurf ist interessant, weil er die erste und dritte Spalte verbindet: `pipe(Number, isInteger, hasValueMin(0))` nimmt die nativen Konstruktoren als Basistypen und die `is`-Prädikate als Prüfungen. Das ist Valibots Aufbau, aber mit Bausteinen, die du schon hast. Was ihm zum Schema noch fehlt, ist dasselbe wie bei `shift`: Die Prädikate müssten *sagen können, was sie sind* (`hasValueMin(0)` als Objekt `{ kind: 'min', value: 0, test }` statt als nackte Funktion), damit man sie ansehen, in Fehlermeldungen nennen und zu Slidern machen kann.

---

## wie es zu rat passt

| Stufe / Frage | shift | typeshift | rat (heute) |
|---|---|---|---|
| benannte Bedingung | ja (Prädikat-Namen) | ja (`.with()`) | `case Name = …` |
| Form prüfen | über Prädikate | **ja**, reichste Syntax | Objekt- und Array-Muster |
| Teile herausholen | nein | todo 2 | ja, `{ status: 'error', message }` |
| Wächter | im Prädikat | `&` mit Prädikat | `if` nach dem Muster |
| Vollständigkeit | nein | nein | nein (offen, braucht `Union`) |
| Typen als Werte für Signals | nein | todo 1 | `@rat/types`, Standard Schema |
| Fehlerberichte | nein | nein | `@rat/types` ja |

Drei Pakete, die je ein Stück derselben Sache abdecken. Wege, sie zusammenzuführen, ohne dass einer davon schon entschieden wäre:

1. **Ein gemeinsamer Kern, zwei Schreibweisen.** Der Baum aus `typeshift/parse.js` und ein Schema-Objekt aus `@rat/types` beschreiben dasselbe. typeshift könnte zur String-Schreibweise für `@rat/types` werden (`T('number(0..255)')` liefert dasselbe Objekt wie `Num.range(0, 255)`), der Rest (Prüfen, Fehler, Standard Schema, Input-Ableitung) gäbe es nur einmal.
2. **typeshift-Syntax in rats Mustern.** Die Muster in `case Name = …` sind heute JavaScript-Ausdrücke. typeshift hat die reichere Sprache (Unions, Negation, Ranges). rats Compiler könnte die Muster mit typeshifts Parser lesen; dann wäre `case port = number(0..65535)` gültig.
3. **`@pulgasari/is` als Basistypen.** Statt in `@rat/types` eigene `Str`, `Num` zu pflegen, könnten die `is`-Prädikate die Basis sein, aufgewertet zu beschreibbaren Objekten (siehe oben). Dann teilen sich shift, typeshift, rat und aufbau eine Typ-Bibliothek.

---

## Befunde im Code

Beim Lesen aufgefallen, unabhängig von der Einordnung:

- **`shift(target, cases)` in der offenen Form** baut die Prädikat-Liste bei jedem Aufruf neu, also in Funktionen wie `valueOf(target)` aus dem README bei jedem einzelnen Wert. Die geschlossene Form `shift(cases)` baut sie einmal; für heiße Pfade sollte das README die empfehlen.
- **Reihenfolge über Objekt-Schlüssel:** Beide Pakete verlassen sich darauf, dass `Object.entries` die Schreibreihenfolge liefert. Das gilt, außer für Schlüssel, die wie ganze Zahlen aussehen (die kommen zuerst); das typeshift-README erwähnt es bereits. Ein Array von Paaren (`shift([[isString, …], …])`) wäre die Form ohne diese Falle.

---

Anmerkungen:

`shift` und `typeshift` waren nur Entwürfe werden noch nicht wirklich benutzt. Ich glaube nur shift an ein paar einzelnen Stellen. Die müssen also nicht überleben bzw. können in einer vernünftigen neuen Form aufgehen.

Aktiv nutzen tue ich nur `@pulgasari/is`. In Libs dann meist inlined in nachgebauter Mini-Variante.

