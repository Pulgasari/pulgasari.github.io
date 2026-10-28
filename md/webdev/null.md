# null

**null** ist ein Wert, der sagt: *hier ist kein Wert*. Fast jede Sprache hat so etwas, und kaum ein Sprachmerkmal hat so viele Fehler verursacht. Dieses Paper erklärt, was null ist, woher es kommt, warum es als Fehler gilt, was die Alternativen sind, und wie rat es eindämmen könnte.

Weiterführend: [fp.md](fp.md), [types/types_and_schemas.md](types/types_and_schemas.md), [libs/elm.md](libs/elm.md), `rat/.md/causa_types.md`, `rat/.md/elm.md`, `rat/.md/cleanup.md` (A11).

---

## Inhalt
- [Was null ist](#was-null-ist)
- [Woher es kommt](#woher-es-kommt)
- [Warum es als Fehler gilt](#warum-es-als-fehler-gilt)
- [Die Gegenposition](#die-gegenposition)
- [Die Alternativen](#die-alternativen)
- [In JavaScript](#in-javascript)
- [null in rat eindämmen](#null-in-rat-eindämmen)
- [Fazit](#fazit)

---

## Was null ist

Eine Variable, ein Feld, ein Rückgabewert: alles soll *etwas* enthalten. Manchmal gibt es dieses Etwas nicht:

- die Suche fand nichts,
- die Daten sind noch nicht geladen,
- der Nutzer hat nichts gewählt,
- das Feld ist optional.

null ist der Platzhalter für diese Fälle. Das Problem steckt schon in der Liste: **vier verschiedene Bedeutungen, ein Wert.** Wer `null` liest, weiß nicht, welche gemeint ist.

JavaScript hat sogar zwei davon:

| | `undefined` | `null` |
|---|---|---|
| Bedeutung (gedacht) | nie gesetzt | absichtlich leer |
| entsteht durch | fehlendes Feld, fehlendes Argument, `return;` | nur wenn jemand es hinschreibt (und DOM-APIs: `querySelector`) |
| `typeof` | `'undefined'` | `'object'` (ein historischer Bug, siehe unten) |
| Default-Parameter greift | ja | nein |
| in `JSON.stringify` | Feld fällt weg | bleibt `null` |
| `x == null` | true | true |
| `x ?? y`, `x?.y` | behandelt | behandelt |

In der Praxis wird die gedachte Trennung nicht eingehalten: beide stehen für „nichts“, mal so, mal so.

---

## Woher es kommt

**1965, ALGOL W.** Tony Hoare entwarf ein Typsystem für Referenzen und fügte die *null reference* hinzu, „weil sie so leicht zu implementieren war“. Eine Referenz, die auf nichts zeigt.

**C** machte daraus den Nullzeiger (`NULL`, Adresse 0). Ihn zu dereferenzieren ist undefiniertes Verhalten: Absturz, im schlimmsten Fall eine Sicherheitslücke.

**Java** übernahm die Idee für jede Objektreferenz: jede Variable vom Typ `String` darf auch `null` sein. Die Folge ist die `NullPointerException`, jahrelang der häufigste Laufzeitfehler in Java-Programmen.

**JavaScript (1995)** bekam `null` nach dem Vorbild von Java, für „kein Objekt“, und zusätzlich `undefined` für „nicht gesetzt“. Dass `typeof null` `'object'` ergibt, ist ein Bug der ersten Implementierung: Werte trugen ein Typ-Tag in den unteren Bits, Objekte hatten das Tag 0, und null war der Nullzeiger, also ebenfalls 0. Der Bug blieb, weil zu viel Code davon abhing.

**2009, QCon London.** Hoare nannte die null reference in einem Vortrag seinen *„billion-dollar mistake“*: die Fehler, Abstürze und Sicherheitslücken, die sie in vierzig Jahren verursacht hat, hätten vermutlich eine Milliarde Dollar gekostet. Seitdem ist der Ausdruck der Standard-Name für das Problem.

---

## Warum es als Fehler gilt

### 1. Der Typ lügt

In Java ist jede Variable vom Typ `String` in Wahrheit ein `String oder null`. Der Typ verspricht einen String, der Wert hält das Versprechen nicht. Der Compiler kann nicht helfen, weil null zu *jedem* Typ passt.

### 2. Der Fehler tritt weit weg von seiner Ursache auf

```js
const user = users.find(u => u.id === id);   // hier entsteht das undefined, still
// … 200 Zeilen später, in einer anderen Datei …
render(user.name);                            // hier knallt es
// TypeError: Cannot read properties of undefined (reading 'name')
```

Die Fehlermeldung zeigt auf die Stelle, die das Nichts *benutzt*, nicht auf die, die es *erzeugt* hat.

### 3. Eine Bedeutung zu wenig

`null` kann heißen: nicht gefunden, nicht geladen, leer, Fehler, nicht anwendbar, absichtlich gelöscht. Code, der `null` bekommt, muss raten. Ein typisches Beispiel ist ein Ladezustand:

```js
let data = null;   // lädt noch? fehlgeschlagen? leer? noch nie angefragt?
```

### 4. Defensiver Code überall

Wer nicht weiß, ob etwas null ist, prüft vorsichtshalber überall:

```js
$index?.categories?.[item.id]?.count ?? 0
```

Jedes `?.` ist eine kleine Kapitulation: „ich weiß nicht, ob das da ist“. Der Code wird länger, und die Frage *warum* es fehlen könnte, bleibt unbeantwortet.

### 5. Die Prüfung ist freiwillig

Nichts erzwingt sie. Vergisst man sie einmal, läuft der Code trotzdem, bis zu dem Tag, an dem der Wert wirklich fehlt.

---

## Die Gegenposition

Abwesenheit ist real. Eine Suche findet manchmal nichts, ein Feld ist manchmal leer. Das Problem ist also nicht, dass es „kein Wert“ gibt, sondern:

1. dass es **unsichtbar** ist: nichts im Typ sagt, dass etwas fehlen kann,
2. dass es **überall erlaubt** ist: jeder Typ schließt es ein,
3. dass seine Behandlung **freiwillig** ist.

Alle modernen Lösungen setzen genau dort an. Keine schafft die Abwesenheit ab, alle machen sie **sichtbar und erzwungen**.

---

## Die Alternativen

### Option / Maybe: die Abwesenheit als eigener Typ

Haskell (`Maybe`), Elm (`Maybe`), OCaml und F# (`option`), Rust (`Option`), Swift (`Optional`). Es gibt kein null. Ein Wert, der fehlen kann, hat einen anderen Typ als einer, der immer da ist:

```elm
findUser : Id -> List User -> Maybe User

case findUser id users of
    Just user -> text user.name
    Nothing   -> text "unknown"
```

Der Compiler lässt `user.name` nicht zu, bevor der `Nothing`-Fall behandelt ist. Vergessen ist unmöglich. Dazu kommen Funktionen, die das Auspacken ersparen: `Maybe.map`, `Maybe.andThen`, `Maybe.withDefault`.

### null bleibt, wird aber Teil des Typs

Kotlin (`String?`), TypeScript mit `strictNullChecks` (`string | null`), C# mit *nullable reference types*, Dart mit *sound null safety*. Ein `String` ist nie null, ein `String?` darf es sein und muss vor der Benutzung geprüft werden. Kein neuer Typ, aber dieselbe Garantie: der Compiler zwingt zur Prüfung. Das ist der pragmatische Weg für Sprachen, die null schon haben.

### Benannte Zustände statt null

Statt *ein* null für viele Bedeutungen: *ein Name pro Bedeutung*. Elm-Programme machen das für Ladezustände (bekannt als *RemoteData*):

```js
// statt: let data = null;
{ status: 'idle' }
{ status: 'loading' }
{ status: 'failed', error }
{ status: 'ready', data }
```

Jeder Fall sagt, was er ist. `data` existiert nur dort, wo es Daten gibt.

### Leere Werte der richtigen Form

Oft ist „nichts“ einfach der leere Fall des Typs: eine leere Liste statt null, `''` statt null, ein leerer Index mit allen Kategorien auf 0. Code, der damit arbeitet, braucht keine Prüfung: über eine leere Liste iterieren tut nichts.

```js
// statt: let $index = null;
let $index = { categories: { images: { count: 0, size: 0 }, … }, files: [], recent: [] };
```

### Null Object

Das objektorientierte Gegenstück: ein Objekt, das sich wie „nichts“ verhält. Ein `NullLogger`, der Meldungen schluckt, statt `if (logger) logger.log(…)` überall.

### Result / Either für Fehler

Wer null zurückgibt, wenn etwas schiefging, verliert den Grund. `Result` (Rust) oder `Either` (Haskell) trägt entweder den Wert oder den Fehler, nie keins von beiden.

### Defaults an der Grenze

Daten von außen (JSON, Formulare, Storage) werden *einmal* beim Eintritt geprüft und mit Defaults gefüllt (ein Schema, ein Decoder). Danach ist innen alles vollständig, und kein Code dahinter muss mehr prüfen.

| Ansatz | schafft null ab | erzwingt Behandlung | braucht Compiler |
|---|---|---|---|
| Option / Maybe | ja | ja | ja |
| null im Typ (`T?`) | nein | ja | ja |
| benannte Zustände | ja | mit exhaustivem Match | hilft |
| leere Werte | ja | nicht nötig | nein |
| Null Object | ja | nicht nötig | nein |
| Defaults an der Grenze | innen ja | nicht nötig | nein |

---

## In JavaScript

JavaScript hat keinen Compiler, der prüft. Was es hat:

| Werkzeug | wofür |
|---|---|
| `x?.y` | lesen, wenn `x` fehlen kann |
| `x ?? y` | Default für null und undefined (nicht für `0` und `''`, anders als `\|\|`) |
| `x ??= y` | setzen, wenn leer |
| Default-Parameter | nur für `undefined` |
| TypeScript `strictNullChecks` | die einzige echte Prüfung, zur Build-Zeit |
| Schemas (Zod, Valibot, `@rat/types`) | Prüfung zur Laufzeit, an der Grenze |

Maybe-Bibliotheken für JavaScript gibt es (z. B. in fp-ts, Sanctuary, Purify), sie setzen sich aber kaum durch: ohne Pattern Matching und ohne Typprüfer ist `Maybe.map(user, u => u.name)` nur umständlicher als `user?.name`, ohne die Garantie zu bringen, die Maybe in Elm wertvoll macht.

**Für JavaScript gilt deshalb:** null lässt sich nicht abschaffen, die Plattform liefert es (`querySelector`, `JSON`, `localStorage.getItem`). Man kann es nur **an den Rand drängen**: an der Grenze abfangen, innen mit vollständigen Werten und benannten Zuständen arbeiten.

---

## null in rat eindämmen

### Bestandsaufnahme

In der files-App steht null an vielen Stellen als Startwert eines Signals:

```js
export let $file      = null;   // keine Datei in der Vorschau
export let $selected  = null;   // nichts ausgewählt
export let $pickboard = null;   // nichts ausgewählt zum Kopieren
export let $index     = null;   // noch nicht gelesen, oder kein Ordner
export let $autoSync  = null;   // noch nicht vom nativen Dienst gelesen
$folder = $sources.at(-1) ?? null;
```

Und als Folge die Prüfungen:

```js
$index?.categories?.[id]?.count
const $auto = $autoSync ?? {};
$folder ? $perms[$folder.id] ?? null : null
```

Manche davon sind echte Abwesenheit (nichts ausgewählt). Andere sind **verkleidete Zustände** (`$index = null` heißt „liest noch“ *oder* „kein Ordner“) oder **fehlende leere Werte** (`$autoSync ?? {}`).

### Was rat schon hat

| rat | entspricht |
|---|---|
| `case` und `@match` | benannte Zustände |
| typisierte Signale (`let $view = Enum('grid', 'list')`) | ein Signal prüft jeden Wert, den es bekommt |
| Schemas mit `.optional()` | null nur dort, wo es erlaubt ist |
| Schemas mit `.default()`, `Record` füllt fehlende Felder | Defaults an der Grenze |
| `@if`, Löcher (`{x}`) rendern null als nichts | das Markup ist schon null-tolerant |

### Vier Wege, nach Aufwand

**1. Leere Werte statt null** · Konvention, sofort machbar

```js
export let $index = EMPTY_INDEX;   // alle Kategorien auf 0, keine Dateien

$index.categories[id].count        // ohne ?.
```

Für alles, was eine natürliche leere Form hat: Listen, Indizes, Zähler, Texte.

**2. Benannte Zustände mit `case`** · Konvention, die Syntax gibt es schon

```js
case NoFolder   = { kind: 'none' };
case Asking     = { kind: 'prompt', folder };
case Granted    = { kind: 'granted', folder, handle };

export const $root = …;   // einer der drei, nie null
```

```html
@match ($root)
  @case NoFolder: <Welcome />
  @case Asking:   <Reconnect folder={folder} />
  @case Granted:  <Library handle={handle} />
```

Ersetzt `$folder`, `$perm` und `$handle` mit ihren drei `null`-Möglichkeiten durch einen Wert, der sagt, was los ist.

**3. Signale, die null ablehnen** · kleine Laufzeit-Änderung

Typisierte Signale gibt es schon. Ein Signal mit Schema würde null nur annehmen, wenn das Schema es erlaubt:

```js
let $file = File.optional();   // darf null sein, sichtbar am Schema
let $tabs = List(Tab);         // nie null: ein Schreiben von null wird abgelehnt, mit Warnung
```

Das macht Abwesenheit sichtbar, wo sie erlaubt ist, und fängt sie dort, wo sie es nicht ist, an der Stelle, die sie *erzeugt*: beim Schreiben, nicht 200 Zeilen später beim Lesen.

**4. Der Compiler hilft** · Compiler-Arbeit

- **Exhaustives `@match`:** ein `@match` über benannte Fälle ohne `@else` warnt, wenn ein Fall fehlt (siehe `rat/.md/elm.md`). Damit werden benannte Zustände so sicher wie Elms `case`.
- **Hinweis bei `?.` auf ein Signal ohne null:** startet ein Signal mit einem Wert und wird nie mit null beschrieben, ist ein `?.` darauf überflüssig. Ein Lint könnte das melden.
- **Startwert null ohne Schema:** `let $x = null` könnte eine Warnung geben („null ohne `.optional()`: was bedeutet es?“). Streng, aber es zwingt zur Frage, *welche* Abwesenheit gemeint ist.

### Was bleibt

Die Plattform liefert null (DOM, JSON, Storage, native Plugins). rat kann es nicht abschaffen, nur an der Grenze fangen:

```js
// an der Grenze: einmal prüfen und auffüllen
const settings = Settings.parse(storage.read('settings') ?? {});

// innen: vollständige Werte, kein ?.
settings.viewmode
```

### Vorschlag als Regel für rat-Code

1. **Kein null für etwas, das eine leere Form hat.** Leere Liste, leerer Text, leerer Index.
2. **Kein null für einen Zustand.** Laden, Fehler, Berechtigung: benannte Fälle mit `case`.
3. **null nur für echte Abwesenheit**, und dann sichtbar: `.optional()` am Schema, oder ein Kommentar am Signal.
4. **Daten von außen an der Grenze prüfen**, mit Schema und Defaults, nicht an jeder Stelle, die sie liest.
5. **`?.` ist ein Warnzeichen**, kein Stil. Jedes `?.` fragt: warum könnte das hier fehlen?

---

## Fazit

- null ist nicht falsch, weil es Abwesenheit gibt. Es ist falsch, weil es **unsichtbar, überall erlaubt und freiwillig behandelt** ist.
- Sprachen mit Typprüfer lösen das mit `Option`/`Maybe` oder mit nullable Typen (`T?`): die Abwesenheit steht im Typ, der Compiler erzwingt die Behandlung.
- JavaScript kann das nicht erzwingen. Was hilft: **leere Werte, benannte Zustände, Prüfung an der Grenze.**
- rat hat die Bausteine schon (`case`, `@match`, typisierte Signale, Schemas). Was fehlt, sind ein **exhaustives `@match`** und **Signale, die null nur mit `.optional()` annehmen**. Mit beidem würde null in rat-Code vom Normalfall zur Ausnahme mit Ansage.
