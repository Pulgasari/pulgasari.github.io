# CoffeeScript

Eine Sprache, die zu JavaScript compiliert, 2009 von Jeremy Ashkenas veröffentlicht (später auch Autor von [Backbone](backbone.md) und Underscore). Leitsatz: *„It's just JavaScript."* Keine eigene Runtime, keine eigenen Typen, nur eine knappere Syntax mit Anleihen bei Ruby und Python. CoffeeScript 1.0 erschien im Dezember 2010, war ab 2011 Standard in Rails (3.1) und um 2012 die meistgenutzte Compile-to-JS-Sprache. Viele seiner Ideen stehen heute in JavaScript selbst. CoffeeScript 2 (2017) gibt modernes ES2015+ aus; die letzte Version ist 2.7.0 (2022).

- Website: https://coffeescript.org
- Repository: https://github.com/jashkenas/coffeescript
- Build: der Compiler (`coffee -c`), oder im Browser `<script type="text/coffeescript">` mit dem Browser-Compiler (101,5 kb gzip)

## Das Problem, das CoffeeScript löst

JavaScript war 2009 ES3: `function` überall, `var` mit Function-Scope und Hoisting, `this`, das in Callbacks verloren geht, Prototypen von Hand, keine Klassen, keine Default-Parameter, kein Destructuring, String-Verkettung mit `+`. CoffeeScript ließ die guten Teile („the good parts") stehen und gab dem Rest eine kürzere Form. Das Ergebnis sollte lesbares JavaScript sein, das man ohne CoffeeScript weiterpflegen könnte.

## Kernkonzepte

### 1. Einrückung statt Klammern, Ausdrücke statt Anweisungen

```coffee
square = (x) -> x * x

grade = (score) ->
  if score > 90 then 'A'
  else if score > 75 then 'B'
  else 'C'

status = switch
  when error?   then 'failed'
  when loading  then 'loading'
  else 'ok'
```

Blöcke entstehen durch Einrückung, Klammern bei Aufrufen sind optional (`console.log 'hallo'`), Semikolons gibt es nicht. **Alles ist ein Ausdruck:** `if`, `switch`, `try` und Schleifen haben einen Wert, und die letzte Zeile einer Funktion wird **implizit zurückgegeben**.

### 2. Funktionen: `->` und `=>`

```coffee
class Counter
  constructor: (@count = 0) ->

  increment: => @count++

  start: ->
    setInterval @increment, 1000
```

`->` ist eine normale Funktion, `=>` bindet `this` an die Umgebung: die Idee, aus der die Arrow Functions von ES2015 wurden. `@count` ist `this.count`, `(@count = 0)` im Konstruktor weist den Parameter direkt zu. Default-Parameter, Rest-Parameter (`(first, rest...)`) und Spread gab es seit 2010.

### 3. Der Existenzoperator `?`

```coffee
alert 'da' if user?                 # user != null
name   = user?.profile?.name        # optional chaining
length = list?.length ? 0           # default for null / undefined
callback?()                         # call only if it exists
options.size ?= 'medium'            # assign only if null / undefined
```

`?` prüft auf `null` und `undefined` (nicht auf falsy). `?.` wurde 2020 als Optional Chaining Teil von JavaScript, `a ? b` als `??`, `?=` als `??=`.

### 4. Comprehensions und Ranges

```coffee
squares = (n * n for n in [1..10])
evens   = (n for n in numbers when n % 2 is 0)
names   = (name for own name, value of object)

countdown = [10..1]           # inclusive, descending
indices   = [0...list.length] # exclusive
tail      = list[1..]         # slice
list[2..4] = ['a', 'b']       # splice
```

Schleifen sind Ausdrücke und liefern Arrays. `when` filtert, `by` setzt die Schrittweite, `for … of` iteriert Objekte (achtung: das Gegenteil von JavaScripts `for…of`; für Iterables gibt es seit 2.0 `for … from`). Ranges: `..` inklusiv, `...` exklusiv, auch als Slices und Splices.

### 5. Lesbare Operatoren und Bedingungen hinten

```coffee
launch() if ready and not aborted
retry() unless attempts > 3
alert 'ok' if 0 < age < 120         # chained comparison
return unless user?
```

`is` (`===`), `isnt` (`!==`), `and`, `or`, `not`, `unless`, `until`, `yes`/`no`/`on`/`off`. Bedingungen und Schleifen dürfen hinter der Anweisung stehen (wie in Ruby). Vergleiche lassen sich verketten. Ein einzelnes `==` gibt es nicht: CoffeeScript compiliert `==` zu `===`.

### 6. Strings, Destructuring, Objekte

```coffee
greeting = "Hallo #{user.name}, du hast #{count} neue Nachrichten"

html = """
  <div class="card">
    <h2>#{title}</h2>
  </div>
  """

{name, age} = user
[first, ..., last] = items

config =
  width  : 640
  height : 480
  title  : 'Fenster'
```

Interpolation mit `#{}` in doppelten Anführungszeichen, Block-Strings mit `"""` (Einrückung wird entfernt), Block-Regex mit `///` und Kommentaren. Objekt-Literale gehen ohne Klammern, über Einrückung.

### 7. CoffeeScript 2

Version 2 gibt statt ES3 modernes JavaScript aus: echte `class`-Deklarationen (mit `extends` von nativen Klassen), `async`/`await` (eine Funktion mit `await` wird automatisch `async`), Generatoren (`yield`), Module (`import`/`export`), Template Literals und JSX direkt im Quelltext. Außerdem **Literate CoffeeScript** (`.litcoffee`): Markdown, in dem nur die eingerückten Blöcke Code sind.

## Wie es intern arbeitet

Der Compiler ist selbst in CoffeeScript geschrieben (er compiliert sich selbst) und arbeitet in vier Schritten:

1. **Lexer:** zerlegt den Text in Tokens und macht aus Einrückungsänderungen `INDENT`- und `OUTDENT`-Tokens.
2. **Rewriter:** der berühmte Teil. Er fügt die weggelassenen Klammern, geschweiften Klammern und Blöcke als implizite Tokens ein (`console.log 'a'` → `console.log('a')`, eingerückte Schlüssel → Objekt-Literal, Einzeiler nach `then` → Block). Danach sieht die Token-Folge aus, als hätte jemand alles ausgeschrieben.
3. **Parser:** eine mit Jison erzeugte LALR-Grammatik baut den Syntaxbaum.
4. **Codegenerierung:** jeder Knoten erzeugt sein JavaScript. Ausdrücke, die in JavaScript Anweisungen sind (`if`, Schleifen, `try`), werden je nach Position zu Ternären, zu IIFEs oder zu Zuweisungen an eine temporäre Variable umgebaut. Variablen werden gesammelt und am Anfang ihres Scopes deklariert. Source Maps seit 1.6.

## Stärken und Schwächen

- **Stark:** sehr kurzer, gut lesbarer Code, „alles ist ein Ausdruck", lesbare Ausgabe, kein Laufzeit-Overhead. Historisch enorm einflussreich: Arrow Functions, Klassen-Syntax, Destructuring, Default-, Rest- und Spread-Parameter, Template Strings, Optional Chaining und `??` kamen über CoffeeScript in die Diskussion um ES2015 und danach.
- **Schwach:**
  - **Leerzeichen entscheiden über Bedeutung:** `f -1` ist `f(-1)`, `f - 1` eine Subtraktion; `a b c` ist `a(b(c))`; ein falsch eingerücktes Objekt wird stillschweigend ein anderes.
  - **Kein `var`/`let`:** eine Zuweisung deklariert nur, wenn der Name im äußeren Scope noch nicht existiert. Heißt eine innere Variable zufällig wie eine äußere, wird die äußere überschrieben, ohne Warnung.
  - **Implizite Rückgaben:** eine Funktion, die mit einer Schleife endet, baut und liefert ein Array, auch wenn niemand es will.
  - **Von JavaScript überholt:** seit ES2015 fehlt der Hauptgrund, und TypeScript gibt es für CoffeeScript nicht. Projekte (GitHub Atom, Dropbox) migrierten mit dem Werkzeug `decaffeinate` zurück zu JavaScript.

## Für rat und aufbau

CoffeeScript ist der direkteste Vorfahre von rats Script-Sugar: ein dünner Compiler über JavaScript, dessen Ausgabe lesbar bleibt. Auch die Warnungen gelten direkt.

| CoffeeScript | rat | Bemerkung |
|---|---|---|
| `[1..5]` inklusiv, `[1...5]` exklusiv | `1..5`, `[1..5]`, nur inklusiv (d-05, d-07) | ein Punkt Unterschied zwischen zwei Bedeutungen war ein bekannter Fehlerherd; rats Entscheidung für nur eine Form hat hier ihr Argument |
| Range als Array, sofort erzeugt | `Span`, lazy (d-07) | `[1..1000000]` allokiert in CoffeeScript eine Million Einträge |
| `for item in items` ohne Deklaration | `for (item of items)` → `const` | CoffeeScripts Scope-Regel überschreibt eine äußere Variable gleichen Namens; rat deklariert immer neu |
| Einrückung bestimmt Blöcke | Einrückung als eine von drei Körperformen, Tabs und Spaces gemischt sind ein Fehler (d-04) | CoffeeScript zeigt, wie viel Mehrdeutigkeit aus impliziten Regeln entsteht; rat beschränkt Einrückung auf Blöcke und meldet Zweifel als Fehler |
| `x if cond` | Bedingung hinten ([ideas/markup-shorthands.md](https://github.com/pulgasari/rat/blob/main/.md/ideas/markup-shorthands.md#ruby-postfix-conditions)) | in CoffeeScript Alltag und gut lesbar, solange die Zeile kurz ist |
| `when` in Comprehensions | Filter an Schleifen ([ideas/loop-filters.md](https://github.com/pulgasari/rat/blob/main/.md/ideas/loop-filters.md)) | `@for (n of numbers when n > 0)` hätte hier sein Vorbild |
| `?`, `?.`, `?=` | in JavaScript angekommen | gute Sugar wird irgendwann Standard; danach ist sie nur noch Ballast |

Die wichtigste Lehre ist die letzte Zeile: CoffeeScript verlor seinen Platz, weil JavaScript seine Ideen übernahm und die Sprache dann nur noch Abweichungen bot (`for … of`, `==`, Scope). Für rat heißt das: Sugar nur dort, wo JavaScript keine Form hat (`$`-Signals, `|>`, Ranges), mit einer Syntax, die einem künftigen Standard nicht widerspricht, und mit einer Ausgabe, die man ohne rat weiterpflegen könnte. Beim Pipe-Operator ist das ein bewusstes Risiko: rats `|>` mit `#` liegt nah am TC39-Proposal (Hack-Pipes mit Platzhalter), weicht aber bei der impliziten Form ab.

Für aufbau: Literate CoffeeScript ist dieselbe Idee wie aufbaus `withSource` und [MDX](mdx.md) von der anderen Seite: Dokumentation, in der der Code steckt, statt Code, in dem die Dokumentation steckt.
