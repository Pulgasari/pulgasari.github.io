# Haskell

Eine rein funktionale, nicht-strikt (lazy) ausgewertete Sprache mit statischen Typen und Typinferenz, entworfen ab 1987 von einem Komitee aus Forschern, das die damals zersplitterten Lazy-Sprachen vereinen sollte. Benannt nach dem Logiker Haskell Curry. Haskell ist bis heute die Referenz für Ideen, die später in anderen Sprachen ankommen: Typklassen, Monaden, `Maybe` statt `null`, algebraische Datentypen mit Pattern Matching, Typinferenz ohne Annotationen. Praktisch heißt Haskell fast immer **GHC**, der Glasgow Haskell Compiler.

- Website: https://www.haskell.org
- Aktuelle Linie: GHC 9.14 (erste LTS-Reihe, 9.14.1 seit Dezember 2025, 9.14.2 als Release Candidate); GHC 10.0 im Alpha-Stadium (September 2026); Sprachedition GHC2024
- Typisierung: statisch, stark, mit Typinferenz (Hindley-Milner, erweitert) und Typklassen
- Paradigmen: rein funktional, lazy; Effekte über Typen (`IO`)
- Paketmanager: Cabal und Stack, Pakete auf Hackage; Installation über GHCup

## Woher sie kommt

Mitte der 1980er gab es ein Dutzend ähnlicher, lazy ausgewerteter funktionaler Sprachen, jede an einer anderen Universität. Die bekannteste, Miranda (David Turner), war proprietär. Auf der Konferenz FPCA 1987 in Portland beschlossen die Beteiligten, eine gemeinsame, offene Sprache zu definieren: für Lehre, Forschung und echte Programme. Das Ergebnis war der Haskell-Report 1.0 (1990). Die schwierigste offene Frage, wie eine reine Sprache Ein- und Ausgabe macht, wurde erst 1996 mit **monadischem IO** (Haskell 1.3) gelöst; die Idee kam von Eugenio Moggi und Philip Wadler.

Seit Haskell 2010 gibt es keinen neuen Standard mehr. Die Sprache entwickelt sich über **Extensions** in GHC (heute weit über hundert), die man pro Datei einschaltet. Seit 2021 bündelt GHC eine geprüfte Auswahl davon als **Sprachedition** (GHC2021, GHC2024).

| Jahr | Version | Meilenstein |
|---|---|---|
| 1990 | Haskell 1.0 | erster Report |
| 1992 | GHC | erste Versionen des Glasgow Haskell Compiler |
| 1996 | Haskell 1.3 | monadisches IO, `do`-Notation, Konstruktor-Klassen |
| 1999 | Haskell 98 | stabiler Standard (revidiert 2003), Basis für Lehrbücher |
| 2010 | Haskell 2010 | letzter Standard: FFI, hierarchische Module |
| 2021 | GHC 9.2 | Sprachedition GHC2021 |
| 2023 | GHC 9.6 | Backends für JavaScript und WebAssembly |
| 2024 | GHC 9.10 | Sprachedition GHC2024 (u. a. `LambdaCase`, `DataKinds`, `GADTs`) |
| 2025 | GHC 9.14 | erste LTS-Reihe, Updates für mindestens zwei Jahre |
| 2026 | GHC 10.0 (Alpha) | GHC2024 wird Standard-Edition, `Type` und `Constraint` getrennt |

## Syntax auf einen Blick

```haskell
module Main where

import Data.Char (toUpper)

greet :: String -> String                -- type signature (optional, but customary)
greet name = "hallo " ++ name            -- function definition, ++ concatenates

shout :: String -> String
shout = map toUpper                      -- point-free: no parameter named

grade :: Int -> Char
grade score
  | score > 90 = 'A'                     -- guards
  | score > 75 = 'B'
  | otherwise  = 'C'

main :: IO ()
main = do
  putStrLn (greet "rat")
  print (map (* 2) [1 .. 5])             -- [2,4,6,8,10]
  let evens = [x | x <- [1 .. 10], even x]
  print (sum evens)
```

Auffällig für JavaScript-Augen:

| Haskell | JavaScript | Anmerkung |
|---|---|---|
| `f x y` | `f(x, y)` | Aufruf ohne Klammern und Kommas; jede Funktion ist gecurried |
| `\x -> x + 1` | `x => x + 1` | Lambda, `\` steht für λ |
| `(+ 1)`, `(* 2)` | `x => x + 1` | Operator-Sections |
| `f . g` | `x => f(g(x))` | Komposition |
| `f $ g x` | `f(g(x))` | `$` ist Anwendung mit niedriger Priorität, spart Klammern |
| `/=` | `!==` | |
| `[1 .. 5]` | – | inklusiver Range, lazy |
| `x : xs` | `[x, ...xs]` | Liste aus Kopf und Rest |
| `Nothing`, `Just x` | `null`, `x` | es gibt kein `null` |
| Einrückung | `{ … }` | Layout-Regel; Klammern und `;` sind möglich, aber unüblich |

## Kernkonzepte

### 1. Reinheit: Funktionen ohne Nebenwirkungen

Eine Funktion vom Typ `Int -> Int` kann nichts lesen, schreiben, loggen oder würfeln. Bei gleichen Argumenten gibt sie immer dasselbe zurück. Effekte stehen im Typ: `readFile :: FilePath -> IO String`. Ein `IO String` ist kein String, sondern eine **Beschreibung** einer Aktion, die einen String liefert; ausgeführt wird sie nur, wenn sie Teil von `main` ist. Variablen sind unveränderlich, `x = x + 1` ist eine Endlosschleife, keine Zuweisung.

### 2. Algebraische Datentypen und Pattern Matching

```haskell
data Remote a = NotAsked | Loading | Failure String | Success a

render :: Remote [String] -> String
render NotAsked        = ""
render Loading         = "lädt"
render (Failure err)   = "fehler: " ++ err
render (Success names) = unwords names
```

Ein Typ zählt seine Fälle auf (Summe), jeder Fall trägt Felder (Produkt). Funktionen werden pro Fall definiert. Mit `-Wincomplete-patterns` (in `-Wall`) meldet GHC fehlende Fälle. Großgeschriebene Namen sind Konstruktoren, kleingeschriebene binden Variablen: so unterscheidet Haskell im Pattern, was verglichen und was gebunden wird.

### 3. Typinferenz und Polymorphie

```haskell
pairs xs = zip xs (tail xs)      -- inferred: pairs :: [a] -> [(a, a)]
```

Der Compiler leitet den allgemeinsten Typ selbst her. Signaturen schreibt man an Top-Level-Funktionen als Dokumentation, nötig sind sie selten. `a` ist eine Typvariable: `pairs` funktioniert für Listen beliebiger Elemente.

### 4. Typklassen

```haskell
class Show a where
  show :: a -> String

data Color = Red | Green deriving (Show, Eq, Ord)

instance Semigroup Color where
  _ <> b = b
```

Eine Typklasse ist ein Interface, das man **nachträglich** für fremde Typen implementieren kann (wie Traits in Rust, Protokolle in Swift). `deriving` erzeugt Standardimplementierungen. Unter der Haube übergibt der Compiler eine Tabelle mit den Funktionen als verstecktes Argument (siehe [Dictionary Passing](../types/generics.md)). Die bekanntesten Klassen: `Eq`, `Ord`, `Show`, `Functor` (`fmap`), `Foldable` (`foldr`, `sum`, `length`), `Monoid`, `Monad`.

### 5. Laziness

```haskell
naturals = [1 ..]                          -- infinite list
firstSquares = take 5 (map (^ 2) naturals) -- [1,4,9,16,25]
fibs = 0 : 1 : zipWith (+) fibs (tail fibs)
```

Ein Ausdruck wird erst ausgewertet, wenn sein Wert gebraucht wird, und dann nur einmal (Thunk, danach gecacht). Unendliche Listen, eigene Kontrollstrukturen als normale Funktionen und Trennung von Erzeugen und Verbrauchen werden dadurch einfach. Der Preis: Speicherverbrauch ist schwer vorherzusagen (**Space Leaks** durch aufgestaute Thunks), deshalb gibt es `seq`, `foldl'` und `{-# LANGUAGE Strict #-}`.

### 6. Monaden und `do`

```haskell
parseAge :: String -> Maybe Int
parseAge s = do
  n <- readMaybe s                 -- Nothing stops the whole block
  if n >= 0 then Just n else Nothing

main :: IO ()
main = do
  name <- getLine
  putStrLn ("hallo " ++ name)
```

Eine Monade ist ein Typ mit zwei Operationen: einen Wert verpacken (`pure`) und verpackte Berechnungen verketten (`>>=`). `do` ist Zucker dafür. Dieselbe Notation bedeutet bei `Maybe` „brich beim ersten `Nothing` ab“, bei `Either e` „brich beim ersten Fehler ab“, bei `IO` „führe nacheinander aus“, bei Listen „probiere alle Kombinationen“. JavaScripts `async`/`await` ist der Spezialfall für Promises.

### 7. List Comprehensions und Ranges

```haskell
[x * 2 | x <- [1 .. 10], even x]           -- [4,8,12,16,20]
[(x, y) | x <- [1 .. 3], y <- "ab"]        -- all combinations
[1, 3 .. 9]                                -- [1,3,5,7,9], step from the first two
['a' .. 'e']                               -- "abcde"
```

Generatoren (`<-`), Bedingungen und lokale `let` stehen durch Kommas getrennt. Ranges sind inklusiv; die Schrittweite ergibt sich aus den ersten beiden Elementen. Alles funktioniert für jeden Typ der Klasse `Enum`.

### 8. Currying, Komposition, Point-free

```haskell
add :: Int -> Int -> Int        -- really: Int -> (Int -> Int)
add a b = a + b
add2 = add 2

activeNames = map name . filter active     -- compose, no argument named
total = sum $ map price items
```

Jede Funktion nimmt genau ein Argument und gibt bei mehreren Parametern eine Funktion zurück. Daraus folgt die Konvention **Daten zuletzt**: `map f xs`, `filter p xs`. Dann setzt `.` Funktionen zu Pipelines zusammen. Eine Pipe in Leserichtung gibt es als `&` (`Data.Function`): `users & filter active & map name`.

### 9. Records und Newtypes

```haskell
data User = User { name :: String, age :: Int }

older = ada { age = age ada + 1 }          -- copy with one field changed

newtype UserId = UserId Int                -- distinct type, same runtime value
```

Records sind unveränderlich, Update erzeugt eine Kopie. `newtype` erzeugt einen eigenen Typ ohne Laufzeitkosten, wie Extension Types in [Dart](dart.md).

### 10. Typen als Spezifikation

Mit Extensions wie `GADTs`, `DataKinds` und `TypeFamilies` (alle in GHC2024 oder einschaltbar) beschreiben Typen auch Eigenschaften: eine Liste mit bekannter Länge, ein HTTP-API als Typ, aus dem Server, Client und Dokumentation abgeleitet werden (Servant). Das ist der Weg zu abhängigen Typen, ohne ganz dort anzukommen.

## Haskell im Web

| Weg | was |
|---|---|
| Server | Warp (HTTP-Server), Servant (APIs als Typen), Yesod, IHP, Scotty; PostgREST erzeugt ein REST-API aus einer Postgres-Datenbank |
| JavaScript-Backend | seit GHC 9.6 im Compiler (Nachfolger von GHCJS): `ghc --target=javascript`. Die Ausgabe enthält die Haskell-Laufzeit und ist entsprechend groß |
| WebAssembly-Backend | seit GHC 9.6, mit JS-FFI; 9.14 kann Code auch im Interpreter für Wasm auswerten |
| Frontend-Frameworks | Miso (Elm-Architektur in Haskell), Reflex-DOM (funktional-reaktiv) |
| Abkömmlinge | [Elm](../libs/elm.md) (vereinfacht, ohne Typklassen), PureScript (strikt, compiliert zu lesbarem JS) |

## Wo man Haskell begegnet

| Ort | wofür |
|---|---|
| Pandoc | Dokumentkonvertierung, Markdown nach fast allem |
| ShellCheck | statische Analyse von Shell-Skripten |
| PostgREST | API-Server über Postgres (Grundlage von Supabase' REST-API) |
| Meta (Sigma, Haxl) | Spam- und Missbrauchserkennung |
| GitHub (Semantic) | Code-Analyse für die Navigation in Repositories |
| Banken und Fintech (Standard Chartered, Mercury) | Geschäftslogik, eigene Dialekte |
| Cardano | Smart Contracts (Plutus) |
| Lehre und Forschung | Programmiersprachen, Typsysteme, Compilerbau |

## Werkzeuge

- **GHCup** installiert GHC, Cabal, Stack und den Language Server in passenden Versionen.
- **HLS** (Haskell Language Server) spricht LSP (siehe [../lsp/README.md](../lsp/README.md)): Typen beim Hovern, Fehler, Refactorings.
- **GHCi**: REPL, `:t ausdruck` zeigt den inferierten Typ.
- **Hoogle**: Suche nach Funktionen über ihren **Typ** (`[a] -> Int` findet `length`).
- **Stackage**: Paketmengen, die zusammen bauen; Gegenmittel gegen Versionskonflikte.

## Stärken und Schwächen

- **Stark:** Typsystem, das sehr viele Fehler vor der Ausführung findet; Refactoring ohne Angst; Reinheit macht Code testbar und parallelisierbar; ausdrucksstarke Abstraktionen (Typklassen, Monaden); viele Ideen der letzten 30 Jahre stammen von hier.
- **Schwach:** steile Lernkurve (Monaden, Typklassen-Hierarchie, Fachvokabular); Laziness macht Speicher und Laufzeit schwer vorhersagbar; über hundert Extensions und mehrere Stile machen Code uneinheitlich; Build-Werkzeuge mit Geschichte (Cabal gegen Stack); im Browser große Ausgabe; kleiner Arbeitsmarkt.

## Für rat und aufbau

`rat/.md/ideas/` nennt Haskell schon an drei Stellen: die List Comprehension als Herkunft der Loop-Filter (d-29), `<|` und `$` als Rückwärts-Anwendung in `pipes.md`, Pattern Synonyms als Verwandte der named cases. Was darüber hinaus trägt:

- **Ranges stimmen schon überein.** Haskells `[1 .. 5]` ist inklusiv und lazy, genau wie rats `1..5` als `Span` (d-05, d-07). Haskell zeigt zwei mögliche Erweiterungen: die Schrittweite über ein zweites Element (`[1, 3 .. 9]`, in rat etwa `1, 3..9` oder `1..9 by 2`, Skizze) und offene Ranges (`[1 ..]`), die nur lazy Sinn ergeben. Für Zeichen (`'a'..'e'`) bräuchte rat einen Enum-Begriff, den es nicht hat.
- **Comprehension mit Komma:** d-29 d) (`@for (todo of $todos, !todo.done)`) ist wörtlich Haskells Form. Haskell erlaubt dort auch mehrere Generatoren und `let`; wenn rat das Komma wählt, sollte es diese Erweiterungen ausdrücklich ausschließen oder gleich mitdenken.
- **`$` ist in Haskell Anwendung**, in rat ein Signal. Für Leser aus Haskell ist `$count` harmlos (in Haskell ein Operator, kein Präfix), `f $ g x` in einem rat-Script dagegen ein Syntaxfehler. Kein Konflikt, aber eine Stolperfalle beim Umlernen.
- **Daten zuletzt oder zuerst:** Haskell, Ramda und Elm setzen auf Daten zuletzt und Komposition (`.`), [ReScript](../libs/rescript.md) hat das zugunsten von Daten zuerst aufgegeben. rats `#` macht die Frage gegenstandslos, weil der Platz frei wählbar ist; Haskells `&` (Pipe in Leserichtung) ist die Form, die rats `|>` am nächsten kommt.
- **`do` ist die Mutter von `with`.** Elixirs `with`, Gleams `use` und F#s Computation Expressions in `ideas/with-chains.md` sind Varianten von Haskells `do` über `Maybe`/`Either`. Wenn rat ein `with` bekommt, ist die Frage, ob es nur `null`/Fehler/Promise kennt (fest eingebaut) oder ein Protokoll wie `bind`/`pure` (offen, wie Haskell). Für rat spricht viel für fest eingebaut: kleiner, verständlicher, kein Monaden-Vokabular.
- **Reinheit für Computeds.** `const $double = $count * 2` sollte rein sein; schreibt ein Computed in ein anderes Signal, entstehen Zyklen und Reihenfolgeprobleme. Haskell erzwingt Reinheit über Typen; rats Compiler könnte bei Schreibzugriffen auf `$`-Namen innerhalb eines Computeds zumindest warnen (Vorschlag, passt zu Roadmap-Punkt 3, Scope-Analyse).
- **FRP stammt von hier.** Functional Reactive Programming (Conal Elliott und Paul Hudak, Fran, 1997) ist in Haskell entstanden: Werte, die sich über die Zeit ändern, als Werte erster Klasse. Signals in rat, `@aufbau/signals` und [alien-signals](../libs/alien-signals.md) sind die pragmatische, nicht-reine Nachfahrin dieser Idee.
- **Großbuchstabe bindet nicht:** Haskell unterscheidet im Pattern Konstruktor (groß, wird verglichen) und Variable (klein, wird gebunden). rats named cases nutzen dieselbe Konvention (`case Name = …` mit Großbuchstaben, `causa_types.md` erwähnt es); das hat damit ein solides Vorbild.

Für aufbau: wenig Direktes. Typklassen erklären gut, was `@aufbau/store` und `@rat/types` mit „Verben passend zum Typ“ (`toggle`, `cycle`, `push`) meinen: Operationen, die an der Art des Werts hängen, nicht am einzelnen Objekt.

Quellen: [haskell.org](https://www.haskell.org), [GHC-Blog](https://www.haskell.org/ghc/blog.html), [GHC 9.14.1](https://www.haskell.org/ghc/blog/20251219-ghc-9.14.1-released.html), [GHC 9.14.2-rc2](https://discourse.haskell.org/t/ghc-9-14-2-rc2-is-now-available/14700), [GHC 10.0.1-alpha1](https://www.haskell.org/ghc/blog/20260918-ghc-10.0.1-alpha1-released.html), [GHC LTS Releases](https://www.haskell.org/ghc/blog/20250702-ghc-release-schedules.html), [Sprach-Editionen im GHC User's Guide](https://ghc.gitlab.haskell.org/ghc/doc/users_guide/exts/control.html), [Haskell 2010 Report](https://www.haskell.org/onlinereport/haskell2010/), [A History of Haskell (Hudak, Hughes, Peyton Jones, Wadler, 2007)](https://www.microsoft.com/en-us/research/publication/a-history-of-haskell-being-lazy-with-class/). Stand: 21. Oktober 2026.
