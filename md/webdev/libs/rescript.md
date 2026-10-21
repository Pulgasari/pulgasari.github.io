# ReScript

Eine statisch typisierte Sprache, die zu JavaScript compiliert, mit dem Typsystem von **OCaml** und einer Syntax, die JavaScript-Entwicklern vertraut sein soll. Entstanden 2020 aus zwei Projekten: **BuckleScript** (Hongbo Zhang, ab 2016 bei Bloomberg, ein OCaml-zu-JS-Compiler) und **Reason** (Jordan Walke, Facebook 2016, eine JS-artige Syntax für OCaml). Im August 2020 trennte sich das BuckleScript-Team vom Reason-Ökosystem, gab dem Ganzen eine eigene Syntax und einen eigenen Namen und hörte auf, OCaml-Kompatibilität zu versprechen. Seitdem ist ReScript eine eigenständige Sprache mit Fokus auf lesbare JS-Ausgabe und schnelle Builds. Aktuell ist 12.3.1 (August 2026); 12.0 erschien im November 2025, ReScript 13 ist im Alpha-Stadium (13.0.0-alpha.6, September 2026), aktiv.

- Website: https://rescript-lang.org
- Repository: https://github.com/rescript-lang/rescript
- Laufzeit: `@rescript/runtime` (Standardbibliothek `Stdlib`, Hilfsfunktionen); in die Ausgabe gelangt nur, was benutzt wird
- Build: ja, der Compiler (`rescript build`, nativ in OCaml und Rust); `.res` → `.res.mjs` neben der Quelle

## Das Problem, das ReScript löst

[TypeScript](typescript.md) legt Typen über JavaScript, übernimmt dafür aber dessen Semantik: `any`, unsound Casts, strukturelle Typen, die sich gegenseitig zuweisen lassen, und einen Typchecker, der bei großen Projekten langsam wird. [Elm](elm.md) ist sound und fehlerfrei, verlangt aber eine eigene Architektur und macht den Austausch mit JavaScript mühsam.

ReScript liegt dazwischen: ein **sound** Typsystem mit vollständiger Typinferenz (Hindley-Milner, aus OCaml), Varianten und erschöpfendem Pattern Matching wie in Elm, aber ohne vorgeschriebene Architektur und mit direkten Bindings an jede JS-Bibliothek. Der Compiler ist auf kurze Build-Zeiten ausgelegt und erzeugt JavaScript, das so aussieht, als hätte es jemand von Hand geschrieben.

## Kernkonzepte

### 1. Records und Typinferenz

```rescript
type user = {name: string, age: int, email?: string}   // email: optional field

let adults = users => users->Array.filter(u => u.age >= 18)->Array.map(u => u.name)
let greet  = (user: user) => `hallo ${user.name}`
```

Typen schreibt man selten aus: `adults` bekommt `array<user> => array<string>`, weil `u.age` und `u.name` den Record eindeutig machen. Records sind nominal (der Name zählt, nicht nur die Form) und im erzeugten Code einfache JS-Objekte. `int` und `float` sind getrennte Typen; Ganzzahlarithmetik wird mit `| 0` auf 32 Bit gehalten.

### 2. Varianten und erschöpfendes `switch`

```rescript
type remote<'a> =
  | NotAsked
  | Loading
  | Failure(string)
  | Success('a)

let show = state =>
  switch state {
  | NotAsked         => ""
  | Loading          => "lädt"
  | Failure(message) => "fehler: " ++ message
  | Success(users)   => users->Array.map(u => u.name)->Array.join(", ")
  }
```

Fehlt ein Fall, warnt der Compiler (als Fehler einstellbar). Patterns zerlegen in einem Schritt: `Some({age}) if age > 30` prüft auf `Some`, holt `age` aus dem Record und prüft eine Bedingung (Guard). Ausgabe:

```js
function show(state) {
  if (typeof state !== "object") {
    if (state === "NotAsked") { return ""; } else { return "lädt"; }
  } else if (state.TAG === "Failure") {
    return "fehler: " + state._0;
  } else {
    return state._0.map(u => u.name).join(", ");
  }
}
```

Varianten ohne Daten werden Strings, Varianten mit Daten Objekte mit `TAG`.

### 3. Varianten auf bestehende JS-Formen legen

```rescript
@tag("status")
type result =
  | @as("ok")    Ok({user: string})
  | @as("error") Failed({message: string})

let text = r => switch r { | Ok({user}) => "hallo " ++ user | Failed({message}) => message }
```

```js
function text(r) { if (r.status === "ok") { return "hallo " + r.user; } else { return r.message; } }
```

`@tag` und `@as` (seit 11) legen fest, wie eine Variante zur Laufzeit aussieht. Damit beschreibt man JSON aus einer API oder Objekte aus einer JS-Bibliothek direkt als Variante, ohne Umwandlung. `@unboxed` geht weiter und unterscheidet Fälle am JS-Typ (`string`, `number`, Array, Objekt, `null`), etwa für einen JSON-Typ.

### 4. Pipe-first `->`

```rescript
users->Array.filter(u => u.active)->Array.map(u => u.name)
5->add(1)          // add(5, 1)
5->add(_, 2)       // _ marks another slot
```

`a->f(b)` ist `f(a, b)`: der Wert wird **erstes** Argument. Die Standardbibliothek ist darauf ausgelegt (Daten zuerst, wie JavaScripts Methoden). Das alte Pipe-last `|>` (Wert als letztes Argument, wie in OCaml, Elm, F#) war seit 11 veraltet und ist mit 12 entfernt. Grund: Mit Daten zuerst kennt der Typchecker den Typ links schon, bevor er die Funktion rechts prüft; das verbessert Inferenz, Fehlermeldungen und Autovervollständigung im Editor.

### 5. Kein `null`: `option`

```rescript
let label = switch users->Array.find(u => u.name == "ada") {
| Some({age}) if age > 30 => "erfahren"
| Some(_)                 => "jung"
| None                    => "unbekannt"
}
```

`option<'a>` ist `Some(x)` oder `None`; zur Laufzeit ist `None` einfach `undefined` und `Some(x)` meist `x` selbst. `Array.find` gibt direkt eine `option` zurück, weil JavaScripts `find` `undefined` liefert. Fehler, die erwartbar sind, laufen über `result<'ok, 'err>`.

### 6. Bindings an JavaScript

```rescript
@module("node:fs") external readFileSync: (string, string) => string = "readFileSync"
@val external fetch: string => promise<'response> = "fetch"

let load = async () => await fetch("/users")
```

`external` beschreibt eine JS-Funktion mit ihrem Typ, ohne Wrapper: Im erzeugten Code steht der direkte Aufruf. Für Bibliotheken ohne Bindings schreibt man sie selbst; das ist der Preis für Soundness. `genType` erzeugt umgekehrt TypeScript-Typen für ReScript-Module.

### 7. JSX, Dicts, Regex, `async`

```rescript
let config  = dict{"theme": "dark", "lang": "de"}       // since 12
let isSlug  = s => /^[a-z-]+$/->RegExp.test(s)          // regex literal, since 12

@react.component
let make = (~count) => <button> {React.int(count)} </button>
```

JSX ist eingebaut (Version 4, ursprünglich für React, über eine eigene JSX-Konfiguration auch für andere Bibliotheken); seit 12 kann der Compiler JSX auch unverändert ausgeben (Preserve-Modus), damit ein nachgelagertes Werkzeug es übersetzt. `async`/`await` gibt es seit 10.1, polymorphe Varianten (`#active`) für offene Mengen ohne Typdeklaration.

## Wie es intern arbeitet

Der Compiler (`bsc`) ist ein Abzweig des OCaml-Compilers: Parser für die ReScript-Syntax, dann OCamls Typprüfung, dann eine eigene Zwischendarstellung (Lambda, später ein JS-IR), auf der optimiert wird: Inlining, Konstantenfaltung (`let total = 1 + 2` wird `let total = 3`), Entfernen von totem Code. Am Ende steht ein JS-Printer, der Namen und Struktur der Quelle so weit wie möglich erhält. Jede `.res`-Datei wird ein ES-Modul.

Das Build-System (früher „Rewatch“, seit 12 der Standard hinter `rescript`) ist in Rust geschrieben, liest `rescript.json`, kennt die Abhängigkeiten zwischen Modulen und compiliert nur, was sich geändert hat, auch über Pakete in einem Monorepo. Das alte Ninja-basierte System ist in 13 entfernt. 13 bringt außerdem Source Maps, `break`/`continue` und ESM als Standard und streicht den alten `Js`-Namespace.

## Stärken und Schwächen

- **Stark:** sound Typen mit fast vollständiger Inferenz, erschöpfendes Matching über Varianten, lesbare und kleine JS-Ausgabe ohne nennenswerte Laufzeit, sehr schnelle Builds, Varianten, die sich auf bestehende JS-Objekte legen lassen (`@tag`, `@unboxed`).
- **Schwach:** Bindings für jede JS-Bibliothek von Hand; kleines Ökosystem und Community, starke Bindung an React; häufige Brüche zwischen Hauptversionen (Uncurried-Umstellung in 11, `Js`/Belt → `Stdlib` und Pipe-last-Entfernung in 12, weitere Streichungen in 13); die Geschichte aus BuckleScript, Reason und ReScript sorgt bis heute für veraltete Anleitungen und Pakete; der Compiler ist ein natives Binary, im Browser läuft nur der Playground-Build.

## Für rat und aufbau

`rat/.md/ideas/pattern-matching.md` nimmt die `@match`-Idee schon aus ReScript (d-30). Was ReScript darüber hinaus zeigt:

- **Die Laufzeitform ist der Schlüssel für d-30.** rats Beispiel `{ status: 'ok', user }` gegen `{ status: 'error', message }` ist in ReScript mit `@tag("status")` eine gewöhnliche Variante, und der erzeugte Code ist genau der Vergleich `r.status === "ok"` plus Feldzugriff. Ein rat-Pattern `@case { status: 'ok', user }` sollte zu demselben Code führen: ein Vergleich pro Literal, Destrukturierung der freien Namen, kein Laufzeit-Helfer. Option b) aus d-30 („`@switch` lernt Patterns“) braucht nichts anderes.
- **Erschöpfend geht nur mit geschlossener Menge.** ReScript kann fehlende Fälle melden, weil der Typ alle Fälle aufzählt. rat hat keinen statischen Typ, aber named cases und `Union(…)` aus `@rat/types` könnten diese Menge liefern: Ein `@switch` über einen `$state`, dessen Schema eine Union aus Cases ist, könnte fehlende Cases zur Compile-Zeit melden (Vorschlag, Option c aus d-30). Ohne Schema bleibt nur `@default`.
- **Guards gleich an den Fall:** `Some({age}) if age > 30` ist dieselbe Form wie rats `case Adult = { age } if age >= 18`. Die Schreibweise ist damit durch eine produktive Sprache gedeckt.
- **Pipe-first gegen Platzhalter.** ReScript hat sich gegen Pipe-last entschieden und den Platzhalter `_` auf Sonderfälle beschränkt; der Formatierer schreibt `a->map2(_, fn)` sogar zu `a->map2(fn)` um. rat geht mit `|>` und `#` (d-08, d-09) den Weg, der beide Richtungen abdeckt: `x |> f(#, 1)` ist pipe-first, `x |> f(1, #)` pipe-last. Der Preis: rat bekommt keinen Typ links, der die Vervollständigung rechts steuert. Mit statisch lesbaren Schemas (concept.md, Abschnitt 5) wäre das teilweise nachholbar.
- **Konstantenfaltung** (`5->add(1)->add(_, 2)` wird `8`) ist die kleine Schwester von `comptime` (`ideas/comptime.md`): Was der Compiler kennt, steht fertig in der Ausgabe.
- **Bindings sind Arbeit.** ReScripts größte Hürde ist, dass jede JS-Bibliothek beschrieben werden muss. rat hat diese Hürde nicht, weil es JavaScript bleibt: `.rat.js` ist JS mit Sugar. Das ist ein Argument, beim Prinzip „types without typescript“ (Schemas zur Laufzeit) zu bleiben, statt ein statisches Typsystem einzuführen.
- **Ausgabe, die man pflegen kann:** „PLEASE EDIT WITH CARE“ steht über jeder erzeugten Datei, und sie ist tatsächlich lesbar. Dasselbe Ziel formuliert der [CoffeeScript](coffeescript.md)-Steckbrief für rat.

Für aufbau: wenig direkt. ReScript-Komponenten sind React-Komponenten; Custom Elements aus `@aufbau/elements` ließen sich über JSX-Bindings oder `external` ansprechen, das ist aber Aufwand ohne Gegenwert für aufbau selbst.

Quellen: [Website](https://rescript-lang.org), [Release 12.0](https://rescript-lang.org/blog/release-12-0-0), [Roadmap](https://rescript-lang.org/community/roadmap), [Changelog](https://github.com/rescript-lang/rescript/blob/master/CHANGELOG.md), [npm](https://registry.npmjs.org/rescript), [InfoQ zu ReScript 12](https://www.infoq.com/news/2025/12/rescript-12-release); Beispiele mit `rescript@12.3.1` compiliert. Stand: 21. Oktober 2026.
