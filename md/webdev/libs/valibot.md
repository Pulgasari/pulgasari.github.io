# Valibot

Eine Bibliothek für Schemas und Validierung, wie [Zod](zod.md), aber vollständig aus einzelnen Funktionen gebaut, damit ein Bundler alles Unbenutzte entfernen kann. Von Fabian Hiller, entstanden 2023 als Bachelorarbeit, Version 1.0 im März 2025. Aktuell 1.5.0 (September 2026), aktiv. Mitautor von Standard Schema.

- Website: https://valibot.dev
- Repository: https://github.com/open-circle/valibot
- Abhängigkeiten: keine
- Build: keiner nötig; Typ-Ableitung mit TypeScript wie bei Zod

## Das Problem, das Valibot löst

Zod 3 bündelte jede Methode an jedes Schema: `z.string()` brachte `email`, `url`, `uuid`, `regex` und Dutzende weitere mit, ob benutzt oder nicht. Ein Formular mit drei Feldern kostete im Browser über 10 kb. Für Server egal, für Client-Bundles, Edge-Funktionen und Formulare nicht.

Valibot trennt alles in einzelne Exporte: Schemas (`string`, `object`), Aktionen (`email`, `minLength`) und Methoden (`parse`, `pipe`) sind freie Funktionen. Was nicht importiert wird, landet nicht im Bundle. Ein typisches Formular-Schema kostet so 1,6 kb statt 25 kb (Zod klassisch) oder 5,8 kb (`zod/mini`, das den Ansatz später übernommen hat).

## Kernkonzepte

### 1. Schemas sind Funktionsaufrufe

```js
import * as v from 'valibot';

const User = v.object({
  age   : v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  email : v.pipe(v.string(), v.email()),
  name  : v.pipe(v.string(), v.nonEmpty('name is required')),
  role  : v.optional(v.picklist(['admin', 'user']), 'user'),
});

// in typescript: type User = v.InferOutput<typeof User>
```

Kein Methoden-Chaining: `optional(...)` umhüllt, statt `.optional()` anzuhängen. Fehlermeldungen sind ein Argument der jeweiligen Prüfung.

### 2. `pipe`: Prüfen und Umwandeln in einer Reihe

```js
const Port = v.pipe(
  v.string(),
  v.trim(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.maxValue(65535),
);
```

`pipe` nimmt ein Schema und danach beliebig viele **Aktionen**: Prüfungen (`email`, `minLength`), Transformationen (`trim`, `toLowerCase`, `transform`) oder ein weiteres Schema. Jede Aktion sieht das Ergebnis der vorigen. Das ist eine Pipeline im Sinn von [fp.md](../fp.md): eine Liste kleiner Funktionen statt eines Objekts mit vielen Methoden.

### 3. `parse`, `safeParse`, `is`

```js
const user   = v.parse(User, input);          // throws ValiError
const result = v.safeParse(User, input);      // { success, output, issues }
if (v.is(User, input)) { … }                  // type guard, no copy
const { nested } = v.flatten(result.issues);  // errors by dot path, for forms
```

`v.parser(User)` erzeugt eine wiederverwendbare Funktion, `v.assert` prüft ohne Rückgabe. `getDotPath(issue)` liefert den Pfad eines Fehlers als String (`'address.city'`).

### 4. Objekte, Varianten, Rekursion

```js
const Shape = v.variant('type', [
  v.object({ type: v.literal('circle'), radius: v.number() }),
  v.object({ type: v.literal('rect'), width: v.number(), height: v.number() }),
]);

const Patch  = v.partial(User);
const Public = v.pick(User, ['name']);
const Tree   = v.object({ name: v.string(), children: v.array(v.lazy(() => Tree)) });
```

`object` entfernt unbekannte Schlüssel, `looseObject` behält sie, `strictObject` lehnt sie ab, `objectWithRest` prüft sie gegen ein eigenes Schema. `variant` ist die diskriminierte Union.

### 5. Prüfungen über mehrere Felder

```js
const Register = v.pipe(
  v.object({ password: v.string(), repeat: v.string() }),
  v.forward(
    v.partialCheck([['password'], ['repeat']], input => input.password === input.repeat, 'passwords differ'),
    ['repeat'],
  ),
);
```

`partialCheck` läuft auch dann, wenn andere Felder des Objekts fehlerhaft sind, solange die genannten in Ordnung sind; `forward` hängt den Fehler an ein bestimmtes Feld. Wichtig für Formulare, die alle Fehler auf einmal zeigen.

### 6. Metadaten, Defaults, JSON Schema

```js
const Todo = v.pipe(v.object({ title: v.string() }), v.title('Todo'), v.description('one entry'));

v.getDefaults(Settings);                       // object with every default filled in
toJsonSchema(Todo);                            // from @valibot/to-json-schema
```

Metadaten sind ebenfalls Aktionen in der Pipe. Der JSON-Schema-Export ist ein eigenes Paket, damit er nur bezahlt, wer ihn braucht. Globale Meldungen und Übersetzungen kommen über `setGlobalMessage` und `@valibot/i18n`.

### 7. Asynchron nur, wo nötig

Jede Funktion mit asynchronem Gegenstück hat eine `…Async`-Variante (`objectAsync`, `pipeAsync`, `checkAsync`). Ein synchrones Schema kann deshalb nie versehentlich ein Promise zurückgeben, und der synchrone Code bleibt frei von `await`.

## Wie es intern arbeitet

Jedes Schema und jede Aktion ist ein schlichtes Objekt mit `kind` (`'schema'`, `'validation'`, `'transformation'`), `type`, ein paar Feldern und einer Methode `'~run'(dataset, config)`. Ein Dataset ist `{ value, typed, issues }`. Ein Objekt-Schema ruft `~run` der Felder auf und sammelt Issues, eine Pipe ruft die Aktionen nacheinander auf und bricht nach einem Typfehler ab, nach einem Prüffehler nur mit `abortPipeEarly`.

Weil es keine Klassen und keine Prototyp-Methoden gibt, bleibt ein Schema genau so groß wie das, was es benutzt. Der Preis: Jede Funktion steht für sich, gemeinsame Logik wird bewusst kaum geteilt. Valibot verzichtet außerdem auf `new Function`; es läuft unter jeder CSP, ist dafür bei großen Objekten etwas langsamer als Zods JIT.

## Stärken und Schwächen

- **Stark:** sehr klein im Bundle (typisch 1 bis 3 kb), keine `eval`-Abhängigkeit, ein klares Modell (Schema plus Pipe aus Aktionen), gute Formular-Funktionen (`partialCheck`, `forward`, `flatten`). Standard Schema eingebaut.
- **Schwach:** wortreicher als Zods Methodenketten (`v.pipe(v.string(), v.email())` statt `z.email()`), kleineres Ökosystem. Viele Exporte (320) machen die API breit, wenn auch nie schwer. Ohne TypeScript bleibt wie bei Zod nur die Prüfung.

## Für rat und aufbau

- **Valibots Form passt zu rats Pipe.** Aktionen sind Funktionen, die nacheinander laufen; mit `|>` sähe ein rat-Schema so aus (Skizze, kein Valibot-Code): `string() |> trim() |> email()`. Dasselbe Muster wie [Ramda](ramda.md) mit Daten zuletzt. Wenn `@rat/types` eigene Schemas bekommt (d-14 a), ist Valibots Aufbau (Schema plus Aktionen, Dataset mit Issues) die bessere Vorlage als Zods Klassen, weil er klein bleibt und kein `eval` braucht.
- **Für `@aufbau/store` und zugriff die passende Wahl, wenn eine Bibliothek.** Reines JavaScript, Browser-first, Capacitor (CSP ohne `unsafe-eval` ist dort sinnvoll): Valibot kostet für ein Import-Format in zugriff (Notizen, Todos, Feed-Einträge) rund 2 kb und läuft überall. Über Standard Schema bliebe der Code trotzdem austauschbar, siehe [zod.md](zod.md#für-rat-und-aufbau).
- **`getDefaults(schema)`** ist das, was `@aufbau/store` heute über `init` pro Typ macht: Aus der Beschreibung entsteht der Anfangszustand. Ein Store aus einem Schema (`store(Settings)`) wäre damit kurz (Vorschlag).
- **`flatten(issues).nested`** liefert Fehler nach Pfad, genau die Form, die ein Formular-Element in `@aufbau/elements` bräuchte, um Meldungen an die richtigen Felder zu hängen (`setCustomValidity` pro Feld).
- **Sync und Async getrennt** ist eine gute Regel auch für rats `@await`-Blöcke (d-28): Eine Prüfung, die synchron sein kann, sollte nie ein Promise erzeugen.
