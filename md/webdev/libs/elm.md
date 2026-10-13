# Elm

Eine funktionale Sprache, die zu JavaScript compiliert, 2012 von Evan Czaplicki für Web-Apps entworfen. Klein, streng, berühmt für ihren Compiler. Die aktuelle Version 0.19.1 stammt von 2019; seitdem ruht die Sprache weitgehend, das Ökosystem lebt.

- Website: https://elm-lang.org
- Build: der Elm-Compiler

## Das Problem, das Elm löst

JavaScript-Apps stürzen zur Laufzeit ab (`undefined is not a function`), und Zustandsänderungen kommen von überall. Elms Versprechen: in der Praxis **keine Laufzeitfehler**, und genau ein klarer Weg, auf dem Daten fließen.

## Kernkonzepte

### 1. Die Elm-Architektur (TEA): Model, Update, View

Jede Elm-App hat genau diese Form:

```elm
-- the state of the whole app, one value
type alias Model = { count : Int }

init : Model
init = { count = 0 }

-- everything that can happen, as a closed list
type Msg = Increment | Decrement | Reset

-- the only place the state changes: old state + message -> new state
update : Msg -> Model -> Model
update msg model =
  case msg of
    Increment -> { model | count = model.count + 1 }
    Decrement -> { model | count = model.count - 1 }
    Reset     -> { model | count = 0 }

-- the interface is a function of the state
view : Model -> Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , text (String.fromInt model.count)
    , button [ onClick Increment ] [ text "+" ]
    ]
```

Die View ändert nie etwas. Ein Klick erzeugt eine `Msg`, Elm gibt sie an `update`, das ein neues Model zurückgibt, und die View wird daraus neu berechnet. Redux (React) ist diese Architektur, nach JavaScript kopiert.

### 2. Alles ist unveränderlich

`{ model | count = 5 }` erzeugt einen neuen Record. Nichts wird an Ort und Stelle geändert, also kann kein Code einem anderen die Daten unter den Füßen wegziehen.

### 3. Custom Types und erschöpfendes `case`

Ein Typ zählt jede Form auf, die ein Wert haben kann:

```elm
type RemoteData
  = NotAsked
  | Loading
  | Failure String
  | Success (List User)

view data =
  case data of
    NotAsked      -> text ""
    Loading       -> text "lädt …"
    Failure error -> text ("fehlgeschlagen: " ++ error)
    Success users -> ul [] (List.map viewUser users)
```

Fehlt ein Zweig, compiliert das Programm nicht. „Den Lade-Zustand vergessen" ist ein Compile-Fehler, kein Bug in Produktion.

### 4. Kein `null`, keine Exceptions

Ein Wert, der fehlen kann, ist ein `Maybe` (`Just x` oder `Nothing`). Eine Operation, die scheitern kann, gibt ein `Result` zurück (`Ok x` oder `Err e`). Der Typ zwingt dazu, beide Fälle zu behandeln.

### 5. Effekte als Daten

Eine Funktion darf nichts laden und nicht auf die Uhr schauen. Stattdessen gibt `update` ein *Command* zurück, das den Effekt beschreibt. Die Runtime führt ihn aus und schickt das Ergebnis als neue Message zurück:

```elm
update msg model =
  case msg of
    Load     -> ( { model | data = Loading }, Http.get { url = "/users", expect = Http.expectJson Loaded usersDecoder } )
    Loaded r -> ( { model | data = fromResult r }, Cmd.none )
```

### 6. Decoder: JSON wird an der Grenze geprüft

Daten von außen (HTTP, Local Storage) gehen durch einen Decoder, der entweder einen korrekten Wert oder einen klaren Fehler liefert. Innerhalb der App sind Daten immer wohlgeformt.

```elm
userDecoder = Decode.map2 User (field "name" string) (field "age" int)
```

### 7. Der freundliche Compiler

Elms Fehlermeldungen sind berühmt: Sie erklären das Problem in ganzen Sätzen, zeigen auf den Code und schlagen eine Lösung vor.

```
The 1st argument to `viewUser` is not what I expect:

42|     viewUser model.name
                 ^^^^^^^^^^
This `name` field is a: String
But `viewUser` needs the 1st argument to be: User

Hint: Did you mean model.user?
```

### 8. Die Pipe

Elm hat auch `|>`: `users |> List.filter .active |> List.map .name`. Achtung `.active`: Ein Property-Name mit Punkt ist eine Funktion, die ihn ausliest (Pluck).

## Wie es intern arbeitet

Der Compiler prüft die Typen über das ganze Programm (mit Inferenz, man schreibt Typen also selten selbst) und gibt JavaScript aus. Die Runtime hält das eine Model, ruft für jede Message `update` auf, dann `view`, und patcht das DOM über einen Virtual-DOM-Vergleich.

## Stärken und Schwächen

- **Stark:** Refactoring ohne Angst, fast keine Laufzeitfehler, ein offensichtlicher Ort für jede Zustandsänderung, die besten Fehlermeldungen aller Compiler.
- **Schwach:** Der Austausch mit JavaScript geht über „Ports" (Message Passing), das ist mühsam. Kleines Ökosystem, Sprache seit Jahren ohne neue Version, und die strenge Architektur wirkt für kleine Dinge schwer.

## Für rat und aufbau

- **Decoder für `@rat/types`:** Elms Decoder sind genau die Idee „Schemas prüfen an der Grenze" aus rats Types-Konzept. Daten aus Storage, Netzwerk oder Worker gehen einmal durch ein Schema, danach wird ihnen vertraut.
- **Erschöpfendes Matching** über eine geschlossene Menge von Fällen: Ein `@switch` über die Fälle eines Schemas (`Enum` oder benannte Cases) könnte einen fehlenden Zweig zur Compile-Zeit melden.
- **Remote Data als Typ** (`NotAsked | Loading | Failure | Success`) ist die Form, die `@await` gut unterstützen sollte.
- **Fehlermeldungen:** rats Compiler nennt schon Datei, Zeile und Spalte. Elm setzt die Messlatte für den nächsten Schritt: sagen, was erwartet wurde, was gefunden wurde, und einen Fix vorschlagen.
- Nicht übernehmen: ein globales Model und Messages für alles. rats Signals liefern feingranulare Updates ohne diese Zeremonie.
