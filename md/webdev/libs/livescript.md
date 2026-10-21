# LiveScript

Eine Sprache, die zu JavaScript compiliert, 2012 von George Zahariev veröffentlicht, als Abzweig von **Coco** (satyr, 2010), das selbst ein Abzweig von [CoffeeScript](coffeescript.md) war. LiveScript übernimmt CoffeeScripts Einrückung, „alles ist ein Ausdruck“ und die knappe Syntax und legt eine funktionale Schicht darüber: Currying, Pipes, Komposition, Operator-Sections, Pattern-artige `match`-Ausdrücke. Dazu gehört die Bibliothek **prelude.ls** (vom selben Autor), eine an Haskells Prelude angelehnte Sammlung von Listenfunktionen. LiveScript 1.0 erschien im Juli 2012, die letzte npm-Version ist 1.6.0 (September 2018). Im Repository steht seit Juli 2020 eine nie veröffentlichte 1.6.1, der letzte Commit ist von Mai 2023. Die Sprache ruht.

- Website: https://livescript.net
- Repository: https://github.com/gkz/LiveScript
- Laufzeit: keine eigene; der Compiler fügt kleine Helfer (`curry$`, `compose$`, `partialize$`) nur bei Bedarf in die Ausgabe ein
- Build: der Compiler (`lsc -c`), oder im Browser `<script type="text/ls">` mit dem Browser-Compiler (64,3 kb gzip)

## Das Problem, das LiveScript löst

CoffeeScript machte JavaScript 2010 kürzer, blieb aber im Kern imperativ und objektorientiert. Wer funktional schreiben wollte, also kleine Funktionen zu Pipelines zusammensetzen, Argumente teilweise anwenden, Daten zuletzt übergeben, schrieb weiter `function (x) { return f(g(x)); }` oder holte sich Underscore. LiveScript wollte die Schreibweise von Haskell und F# (Pipes, Komposition, Currying, Sections) in eine Sprache bringen, die eins zu eins auf JavaScript abbildet, ohne eigene Laufzeit und ohne Typsystem.

Nebenbei repariert LiveScript zwei bekannte Schwächen von CoffeeScript: die Scope-Regel (eine Zuweisung überschreibt still eine äußere Variable) und die Verwechslung von `..` und `...` bei Ranges.

## Kernkonzepte

### 1. Pipes und Komposition

```livescript
users |> filter (.active) |> map (.name) |> join ', '
sum <| map (.price), items          # backward: sum(map(...))

word-count = (.trim!) >> (.split /\s+/) >> (.length)   # compose left to right
```

`x |> f` ist `f(x)`, `f <| x` dasselbe in die andere Richtung. `>>` und `<<` setzen Funktionen zusammen (Ergebnis ist eine neue Funktion, `compose$` in der Ausgabe). Der Compiler schreibt eine Pipe in verschachtelte Aufrufe um, ohne Laufzeitkosten:

```js
h = join(', ')(map(function(it){ return it.name; })(filter(function(it){ return it.active; })(users)));
```

### 2. Currying und partielle Anwendung

```livescript
add  = (a, b) --> a + b      # --> curries
add2 = add 2                 # function waiting for b
add2 5                       # 7

pow-of-two = Math.pow _, 2   # _ marks the open slot
```

`-->` erzeugt eine gecurriete Funktion: Bekommt sie zu wenige Argumente, liefert sie eine Funktion, die auf den Rest wartet. `_` als Platzhalter wendet eine beliebige Funktion teilweise an, auch eine ungecurriete. Zusammen mit Daten-zuletzt-Funktionen aus prelude.ls passt jede Funktion ohne Platzhalter in eine Pipe, wie bei [Ramda](ramda.md).

### 3. Operator-Sections und implizite Funktionen

```livescript
map (* 2), [1 2 3]           # [2, 4, 6]
filter (> 2), numbers
map (.name), users           # pluck: (.name) reads a property
names = map (-> it.name), users   # it: the single implicit parameter
```

Ein Operator in Klammern mit nur einer Seite ist eine Funktion (`(* 2)`, `(> 2)`, `(+ 1)`), wie die Sections in Haskell. `(.name)` liest eine Eigenschaft. `it` ist der Name des einzigen Parameters, wenn keiner angegeben ist.

### 4. Ranges in Worten

```livescript
[1 to 5]         # [1, 2, 3, 4, 5]  inclusive
[1 til 5]        # [1, 2, 3, 4]     exclusive
[1 to n by 2]    # loop at runtime
[x * 2 for x in [1 to 10] when x % 2 is 0]
```

Statt `..` und `...` (CoffeeScript, ein Punkt Unterschied) stehen Wörter: `to` inklusiv, `til` exklusiv, `by` für die Schrittweite. Mit festen Grenzen wird der Range schon beim Compilieren zum Array-Literal; mit Variablen wird eine Schleife erzeugt, die ein Array füllt. Ein Range ist immer ein fertiges Array, nie lazy.

### 5. `match`, Guards und `switch` ohne Wert

```livescript
grade = switch
  | score > 90 => \A
  | score > 75 => \B
  | otherwise  => \C

kind = match value
  | (> 10)  => \big
  | (is 0)  => \zero
  | _       => \other
```

`|` leitet einen Fall ein, `_` und `otherwise` sind der Rest. `match` prüft den Wert gegen **Funktionen**: Jeder Fall ist ein Prädikat, das mit dem Wert aufgerufen wird. Destrukturierende Patterns gibt es nicht, Prüfen und Zerlegen bleiben getrennt. `\A` ist ein String ohne Anführungszeichen (`'A'`).

### 6. Backcalls: Callbacks ohne Einrückung

```livescript
data <-! fetch '/users'
console.log data
render data
```

`<-` (hier `<-!`, ohne Rückgabewert) macht **alles darunter** zum Callback des Aufrufs rechts: `fetch('/users', function(data){ console.log(data); render(data); })`. 2012 die Antwort auf die Callback-Pyramide, Jahre vor `async`/`await`.

### 7. Kaskaden und Kleinigkeiten

```livescript
document.body
  ..class-list.add \ready
  ..style.color = \red

counter = 0
inc = !-> counter := counter + 1   # := writes the outer variable
```

- **Kaskaden:** Eingerückte Zeilen mit `..` beziehen sich auf das Objekt darüber, wie die Kaskade in [Dart](../langs/dart.md).
- **`=` und `:=`:** `=` deklariert immer im aktuellen Scope, `:=` weist einer bestehenden äußeren Variable zu. Damit ist CoffeeScripts stilles Überschreiben ausgeschlossen.
- **Bindestrich-Namen:** `get-user-name` wird zu `getUserName`.
- **`!->`:** Funktion ohne implizite Rückgabe (gegen CoffeeScripts ungewollte Arrays aus Schleifen).
- Operatoren wie `++` (Konkatenation), `%%` (mathematisches Modulo), `<?`/`>?` (Minimum, Maximum), `^^` (Klon über den Prototyp), `is`/`isnt`.

## Wie es intern arbeitet

Der Compiler ist in LiveScript geschrieben und folgt dem Aufbau von Coco und CoffeeScript: Ein Lexer erzeugt Tokens und macht aus Einrückung `INDENT`/`DEDENT`, ein Rewriter setzt implizite Klammern und Blöcke ein, eine mit Jison erzeugte Grammatik baut den Baum, und jeder Knoten erzeugt sein JavaScript. Ausdrücke, die in JavaScript Anweisungen sind (`switch`, Schleifen), werden zu IIFEs oder Zuweisungen an Hilfsvariablen umgebaut. `switch` ohne Wert wird `switch (false) { case !(cond): … }`.

Funktionale Konstrukte kosten fast nichts: Pipes und Sections werden zu direkten Aufrufen und Funktionsausdrücken. Nur Currying (`-->`), Komposition (`>>`) und Platzhalter (`_`) brauchen kleine Helfer, die der Compiler am Ende der Datei einfügt, wenn sie benutzt werden. Ausgabe ist ES5, Module als CommonJS; ES-Module, Klassen-Syntax oder `async`/`await` erzeugt LiveScript 1.6 nicht.

## Stärken und Schwächen

- **Stark:** sehr dichter funktionaler Code, Pipes, Currying und Sections ohne Bibliothek; die Ausgabe bleibt nachvollziehbar und hat keine Laufzeit. Repariert konkrete Fehler von CoffeeScript (`:=`, `to`/`til`). Viele Ideen (Pipe, Platzhalter, Pluck) stehen heute in Proposals oder anderen Sprachen.
- **Schwach:**
  - **Zu viele Operatoren:** `|>`, `<|`, `>>`, `<<`, `-->`, `<-`, `<-!`, `!->`, `~>`, `%%`, `<?`, `^^`, `\word` … Wer die Sprache nicht täglich schreibt, kann sie nicht lesen. Leerzeichen entscheiden wie bei CoffeeScript über Bedeutung (`f -1` gegen `f - 1`).
  - **Backcalls** schlucken den Rest des Blocks; wo der Callback endet, sieht man nur an der Einrückung.
  - **Keine Typen**, kein TypeScript-Weg, keine Editor-Unterstützung jenseits von Syntax-Highlighting.
  - **Ausgabe veraltet:** ES5 und CommonJS, keine ES-Module. Mit ES2015, Arrow Functions und Optional Chaining fiel der Hauptgrund weg, wie bei CoffeeScript.
  - **Ruht:** keine Version seit 2018, eine Handvoll Commits seit 2020.

## Für rat und aufbau

LiveScript ist das Extrem dessen, was rats Script-Sugar werden könnte, wenn jede gute Idee einen Operator bekommt. Die Pipe-Ideen in `rat/.md/ideas/pipes.md` (d-08 bis d-10) haben hier ihren direkten Vorläufer, und die Erfahrung mit LiveScript spricht für die kleine Variante.

| LiveScript | rat | Bemerkung |
|---|---|---|
| `x \|> f`, rechts eine Funktion | `x \|> f()` → `f()(x)` (d-09) | dieselbe Regel: rechts wird ausgewertet und aufgerufen. LiveScript braucht dafür Currying oder `_`, rat den Platzhalter `#` |
| `_` als Platzhalter, nur in Aufrufen | `#` als Platzhalter, überall im Ausdruck (d-08) | `#` kann auch `#.name` oder `# * 2` sein; LiveScripts `_` nur ein Argument. rats Form ist mächtiger und braucht keine Laufzeit-Helfer |
| `<\|` | nicht vorgesehen | die Antwort in `pipes.md` (zu `<\|` als Map) gilt hier direkt: in LiveScript wie in F#, Elm, Haskell ist `<\|` Rückwärts-Anwendung, nicht Map |
| `(.name)`, `(* 2)` | Pluck `\|.>` und `#`-Ausdrücke (d-10 b) | eine Section ist ein `#`-Ausdruck mit festem Platz: `(* 2)` entspricht `# * 2`. rat bräuchte Sections nicht zusätzlich |
| `[1 to 5]`, `[1 til 5]` | nur `1..5`, inklusiv (d-05) | LiveScript löste CoffeeScripts `..`/`...`-Problem mit Wörtern; rat mit nur einer Form. Beide Wege vermeiden die Ein-Punkt-Falle |
| Range zur Compile-Zeit als Array | `Span`, lazy (d-07) | `[1 to 1000000]` steht als Million Zahlen in der Ausgabe; rats Entscheidung für einen lazy Typ ist hier noch klarer begründet als bei CoffeeScript |
| `for … when` | Filter im `@for`-Kopf (d-29) | das Komprehensions-Muster ist bei LiveScript dasselbe wie bei CoffeeScript |
| `match` mit Prädikaten | named cases mit Guard (`case Adult = { age } if age >= 18`) | LiveScript prüft nur, rats Cases prüfen und zerlegen zugleich. Der Weg aus `pattern-matching.md` ist der vollständigere |
| `<-` Backcalls | `with`-Ketten (`ideas/with-chains.md`, Gleams `use`) | dieselbe Idee zwölf Jahre früher. LiveScript zeigt die Kosten: der Rest des Blocks wird unsichtbar zum Callback |
| `..` als Kaskade | `..` als Range | vierte Bedeutung desselben Zeichens nach Lua (Verkettung), Dart (Kaskade) und CoffeeScript (Range) |
| `:=` für äußere Variablen | `for…of` mit implizitem `const`, sonst normales JS | rat übernimmt `let`/`const` aus JavaScript und hat das Scope-Problem gar nicht erst |

Die wichtigste Lehre steht in d-10 schon als Anmerkung: Viele Operatoren werden unlesbar, wenn nicht jeder Name perfekt sitzt. LiveScript ist der Beleg dafür, nicht wegen einzelner schlechter Zeichen, sondern wegen ihrer Summe. Eine Pipe mit einem guten Platzhalter (`|>` mit `#`) deckt fast alles ab, was LiveScript mit `|>`, `_`, Sections, `-->` und `>>` verteilt. Wenn d-10 erweitert wird, dann um wenige Operatoren mit einer erkennbaren Regel (d-10 b oder e), nicht um eine Familie pro Idee.

Für aufbau: wenig direkt Übertragbares. prelude.ls und LiveScript zeigen, dass Daten-zuletzt-Funktionen und Currying nur mit Pipe-Syntax angenehm werden; als reine JS-Bibliothek (Ramda) bleiben sie Nische.

Quellen: [Website](https://livescript.net), [Repository](https://github.com/gkz/LiveScript), [Commits](https://github.com/gkz/LiveScript/commits/master), [npm `livescript`](https://registry.npmjs.org/livescript), [npm `LiveScript` (alter Name)](https://registry.npmjs.org/LiveScript), [prelude.ls](https://github.com/gkz/prelude-ls); Beispiele mit `livescript@1.6.0` compiliert, Browser-Compiler (`lib/browser.js`) mit esbuild 0.28.2 gebündelt, minifiziert und gzip gemessen. Stand: 21. Oktober 2026.
