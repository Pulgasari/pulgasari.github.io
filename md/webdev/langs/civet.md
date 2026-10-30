# Civet

Eine Sprache, die zu TypeScript oder JavaScript compiliert, als „modernes CoffeeScript für TypeScript“: einrückungsbasierte Kurzschreibweisen, Pattern Matching, Pipes und viele kleine Abkürzungen, während jedes gültige TypeScript (bis auf wenige Grenzfälle) auch gültiges Civet bleibt. Von Daniel X. Moore, seit 2022; Erik Demaine (MIT) ist Mitautor. Aktuell 0.11 (2026), aktiv; vor 1.0, aber in Projekten produktiv benutzt.

- Website: https://civet.dev
- Repository: https://github.com/DanielXMoore/Civet
- Typisierung: die von TypeScript (Civet erzeugt `.ts`, `tsc` prüft)
- Compiler: `@danielx/civet`, ein PEG-Parser (Hera), läuft in Node, Deno, Bun und im Browser
- Integration: Plugins für Vite, esbuild, Rollup, Webpack (über [unplugin](../libs/unplugin.md)), Language Server für VS Code, Zed, Neovim, Sublime
- Dateiendung: `.civet`

## Woher sie kommt

[CoffeeScript](../libs/coffeescript.md) hat 2009 vieles vorweggenommen, was später in JavaScript kam (Pfeilfunktionen, Klassen, Destructuring), ist aber an TypeScript gescheitert: Es kennt keine Typen und passt nicht zur Werkzeugkette. Civet setzt umgekehrt an: TypeScript bleibt die Grundlage, Civet fügt **nur Syntax** hinzu und entfernt nichts. Wer will, schreibt reines TypeScript in einer `.civet`-Datei und nimmt die Abkürzungen nach und nach dazu. Viele Ideen stammen aus TC39-Vorschlägen (Pipeline, Pattern Matching, `do`-Ausdrücke), die in JavaScript seit Jahren feststecken.

## Syntax auf einen Blick

```js
// einrückung statt klammern, klammern bleiben erlaubt
greet := (name: string) => `hallo ${name}` // := ist const
count .= 0                                 // .= ist let

function total(items: Item[])
  sum .= 0
  for item of items
    sum += item.price
  sum // implizite rückgabe

if user?.admin
  show settings
else
  show home

name := user?.name ?? "gast"
```

| Civet | TypeScript | |
|---|---|---|
| `x := 1` | `const x = 1` | |
| `x .= 1` | `let x = 1` | |
| `f x, y` | `f(x, y)` | Aufruf ohne Klammern (an Zeilenanfang) |
| `x.map .name` | `x.map(a => a.name)` | Kurz-Lambda über `.` oder `&` |
| `x \|> f \|> g` | `g(f(x))` | Pipeline |
| `a < b < c` | `a < b && b < c` | verkettete Vergleiche |
| `data{x, y}` | `{x: data.x, y: data.y}` | Teilobjekt |
| `@name` | `this.name` | wie CoffeeScript |
| `unless`, `until` | `if (!…)`, `while (!…)` | |

## Kernkonzepte

### 1. Ausdrücke überall

```js
label := if count > 2 then "viele" else "wenige"

status := switch code
  when 200
    "ok"
  when 404
    "fehlt"
  else
    "fehler"

squares := for n of [1..5]
  n * n                 // for als ausdruck: ein array
```

`if`, `switch`, `for`, `try` und `do`-Blöcke haben einen Wert; `when` bricht von selbst ab, ein Durchfallen wie in JavaScript gibt es dort nicht. Die letzte Anweisung einer Funktion wird zurückgegeben. Das macht viele Hilfsvariablen und Ternary-Ketten überflüssig.

### 2. Pattern Matching

```js
area := (shape: Shape) =>
  switch shape
    {kind: "circle", radius}
      Math.PI * radius ** 2
    {kind: "rect", width, height}
      width * height
    [first, ...rest]
      first
    /^#[0-9a-f]+$/i
      "eine farbe"
```

`switch` vergleicht gegen Objekt- und Array-Muster, reguläre Ausdrücke und Bereiche und bindet dabei Namen. TypeScript verengt die Typen in jedem Zweig.

### 3. Pipes und Kurz-Lambdas

```js
data |> Object.keys |> console.log      // console.log(Object.keys(data))

port := input
  |> .trim()
  |> Number
  |> (n) => Math.max(0, n)

names   := users.filter(.active).map .name
doubled := list.map &+1                  // list.map($ => $+1)
shout   := words.map &.toUpperCase()

url |> fetch |> await                    // await am ende der kette
```

Die Pipe nimmt eine Funktion; ein Pfeil oder die `&`-Kurzform sagt, wie der Wert eingesetzt wird. `&` steht für den einen Parameter eines Kurz-Lambdas, `.name` allein ist der Feldzugriff. `|> await`, `|> yield` und `|> return` hängen das Schlüsselwort an die Kette.

### 4. Bereiche und Slices

```js
for i of [0...10]       // 0 bis 9 (... exklusiv, .. inklusiv)
  log i

last3 := list[-3..]
middle := text[2...5]
```

### 5. Kleinigkeiten, die sich summieren

```civet
{name, ...rest} := user
point := data{x, y}                  // {x: data.x, y: data.y}
flags := {+debug, -live}             // {debug: true, live: false}
config.port ??= 8080
return unless ready                  // nachgestellte bedingung
x from ./x                           // import x from "./x"
export a, b                          // export {a, b}
class Point
  @(@x: number, @y: number)          // konstruktor, der felder setzt
```

Dazu eigene Infix-Operatoren aus jeder Funktion mit zwei Parametern und `///`-Regex mit Leerraum und Kommentaren wie in Pythons `re.X`.

### 6. Konfiguration pro Datei

```civet
"civet coffeeCompat"     // coffeescript-kompatibel: 'is', 'isnt', 'and', 'or', … 
"civet autoVar"          // deklarationen ohne const/let
```

Mit Direktiven am Dateianfang lässt sich das Verhalten umstellen, etwa um alten CoffeeScript-Code Datei für Datei zu übernehmen.

## Wie es arbeitet

Ein PEG-Parser liest Civet und erzeugt TypeScript-Quelltext mit Source Maps. Für Typprüfung und Editor übersetzt der Language Server Civet nach TypeScript und schickt Anfragen an den TypeScript-Dienst weiter; Positionen werden über die Source Maps zurückgerechnet. Laufzeit gibt es keine: Was ankommt, ist gewöhnliches JavaScript, bei Bedarf mit kleinen Hilfsfunktionen.

## Stärken und Schwächen

- **Stark:** baut auf TypeScript auf statt neben ihm, schrittweise einführbar, Pattern Matching und Pipes heute statt in zehn Jahren, kompakte Schreibweise für Datenverarbeitung, gute Integration in Vite und esbuild.
- **Schwach:** sehr viele Abkürzungen (der Cheatsheet ist lang), mehrdeutige Lesarten bei Aufrufen ohne Klammern, eine kleine Nutzerschaft, Abhängigkeit von einem Compiler und Language Server außerhalb des Mainstreams, Formatierer und Linter verstehen `.civet` nur eingeschränkt.

## Für rat und aufbau

Civet ist das nächste Verwandte von rats Skript-Sugar: beide erweitern JavaScript um Syntax, statt eine neue Sprache zu bauen.

| Civet | rat | |
|---|---|---|
| `x \|> f`, `&` | `x \|> f`, `f <\| x` | beide haben Pipes; rat zusätzlich die Rückwärtspipe |
| `[1..5]`, `[1...5]` | `1..5` | Bereiche |
| `switch` mit Mustern | `match`, `@match`, `case` | Pattern Matching; rat mit benannten Fällen und Schemas als Muster |
| `if`/`for` als Ausdruck | `@if`/`@for` im Markup | rat macht Kontrollfluss im Markup, Civet im Skript |
| `x := 1` | `const $x = …` | rat gibt Deklarationen eine Reaktivitätsbedeutung, Civet nur eine Kurzform |

- **Was rat lernen kann:** Civet zeigt, wie man so etwas wartbar hält, nämlich mit einem echten Parser, Source Maps und einem Language Server, der TypeScript fragt, statt es nachzubauen. rats Language Server steht vor derselben Aufgabe ([../lsp/rat.md](../lsp/rat.md)).
- **Was rat bewusst anders macht:** rat fügt wenige Zeichen mit großer Bedeutung hinzu (`$`, `!`, `@`), Civet viele kleine Abkürzungen. Je mehr Sugar, desto weniger kann ein Leser ohne Cheatsheet folgen.
- **Kombinierbar?** Civets Ausgabe ist TypeScript, rats Compiler nimmt JavaScript in `<script>`. Über ein unplugin-Plugin vor rat wäre Civet in `.rat`-Skripten technisch denkbar, aber zwei Sugar-Schichten übereinander wären vor allem für Fehlermeldungen schwierig.
