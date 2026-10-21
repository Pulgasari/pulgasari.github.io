# Typen und Schemas

„Typ“ ist eines der Wörter, die in der Programmierung an fünf Stellen fünf verschiedene Dinge meinen. Dieses Dokument sortiert sie: was ein Typ eigentlich ist, was `typeof`, `<input type>` und TypeScript damit zu tun haben, und wo Schemas wie Zod und Valibot dazwischen stehen.

Weiterführend: [codecs.md](../codecs.md), [generics.md](generics.md), [data_structures.md](data_structures.md), [zod.md](../libs/zod.md), [valibot.md](../libs/valibot.md), `rat/.md/causa_types.md`.

---

## Die Kurzfassung

- Ein **Typ** ist eine *Idee*: eine Menge erlaubter Werte. „Ein String“, „eine Zahl von 0 bis 255“, „`'grid'` oder `'list'`“.
- Diese Idee kann man an verschiedenen Orten aufschreiben, und **der Ort entscheidet, wer sie wann prüft**.
- Ein **statischer Typ** (TypeScript) steht im Quelltext und wird vom Compiler *vor* dem Ausführen geprüft. Danach wird er gelöscht.
- Ein **Schema** (Zod, Valibot, JSON Schema) ist dieselbe Idee als *Wert im Programm*. Es existiert zur Laufzeit und prüft echte Daten.

Der Satz deines Kumpels, „Typen gibt es nur bis zur Compile-Zeit“, stimmt also für eine Sorte Typen: die statischen von TypeScript, Java oder Rust. Er stimmt nicht für Typen allgemein. JavaScript selbst hat Typen zur Laufzeit, und Schemas sind Typen zur Laufzeit.

Ein Bild dafür:

| | wie | wann | prüft |
|---|---|---|---|
| statischer Typ | Rechtschreibprüfung im Editor | bevor der Text gedruckt wird | ob der *Text* (Code) in sich stimmt |
| Schema | Türsteher am Eingang | jedes Mal, wenn jemand kommt | ob der *Gast* (die Daten) reindarf |

Die Rechtschreibprüfung kann nicht wissen, wer später an der Tür steht. Der Türsteher kann nicht wissen, ob im Text Fehler sind. Beide arbeiten mit derselben Vorstellung davon, was „richtig“ ist.

---

## Das Wort „Typ“ an fünf Stellen

| wo | Beispiel | was es ist | existiert |
|---|---|---|---|
| JavaScript selbst | `typeof 'abc'` → `'string'` | die eingebaute Grundart eines **Werts** | zur Laufzeit |
| Klassen | `value instanceof Date` | wer einen Wert gebaut hat | zur Laufzeit |
| TypeScript | `let name: string` | was eine **Variable** enthalten darf | nur beim Compilieren |
| Schema | `z.string().min(1)` | eine Typ-Beschreibung als Objekt | zur Laufzeit |
| HTML | `<input type="email">` | welche Art Eingabefeld (und welche Prüfung) | zur Laufzeit, im Browser |

Dazu kommen Verwandte, die auch „Type“ heißen: der MIME-Type (`Content-Type: image/png`, welches Format eine Datei hat) und der Spaltentyp in einer Datenbank (`INTEGER`, `TEXT`). Alle meinen im Kern dasselbe: **welche Werte hier erlaubt sind oder vorliegen.** Sie unterscheiden sich darin, wer fragt und wann.

---

## Werte haben Typen, Variablen haben Typen

Der wichtigste Unterschied überhaupt, und der Kern von „dynamisch“ gegen „statisch“ typisiert:

```js
let x = 'abc';   // the VALUE 'abc' is a string
x = 42;          // the variable now holds a number: fine in javascript
```

In JavaScript trägt **jeder Wert** seinen Typ mit sich herum. `'abc'` *ist* ein String, `42` *ist* eine Zahl, und `typeof` fragt genau das ab. Eine **Variable** dagegen ist nur ein Name und darf alles enthalten. Das heißt **dynamisch typisiert**: Typen gibt es, aber erst zur Laufzeit und nur an Werten.

```ts
let x: string = 'abc';
x = 42;          // typescript: error, before anything runs
```

TypeScript gibt zusätzlich **Variablen, Parametern und Rückgaben** einen Typ und prüft vor dem Ausführen, ob alle Zuweisungen dazu passen. Das heißt **statisch typisiert**. Danach entfernt der Compiler die Typen; was im Browser läuft, ist wieder die erste Version ohne `: string`.

| | dynamisch (JavaScript, PHP ohne Typen, Python) | statisch (TypeScript, Java, Rust) |
|---|---|---|
| Typ hängt an | dem Wert | der Variable (und dem Wert) |
| geprüft | wenn die Zeile läuft | vor dem Ausführen |
| Fehler sichtbar | beim Benutzen, oft spät | im Editor, sofort |

---

## `typeof`: die Laufzeit-Typen von JavaScript

JavaScript kennt genau diese Grundtypen:

| `typeof` liefert | Werte |
|---|---|
| `'string'` | `'abc'` |
| `'number'` | `42`, `3.14`, `NaN`, `Infinity` |
| `'bigint'` | `42n` |
| `'boolean'` | `true`, `false` |
| `'undefined'` | `undefined` |
| `'symbol'` | `Symbol('x')` |
| `'function'` | Funktionen und Klassen |
| `'object'` | alles andere, **auch Arrays und `null`** |

Also ja: `string` ist ein Typ, und zwar ein echter Laufzeit-Typ. Bei Arrays ist es unordentlicher:

```js
typeof []              // 'object'  (an array is an object)
Array.isArray([])      // true      (the actual check)
typeof null            // 'object'  (a mistake from 1995, kept for compatibility)
typeof new Date        // 'object'
new Date instanceof Date  // true
```

`typeof` kennt nur die groben Grundarten. Alles Feinere (Array, Date, Map, „ein Objekt mit `name` und `age`“) muss man mit `Array.isArray`, `instanceof` oder eigenen Prüfungen erfragen. Genau dieses „Feinere“ beschreiben Schemas.

---

## `<input type>`: auch ein Typ, nur für Formulare

```html
<input type="email" required>
<input type="number" min="0" max="255" step="1">
```

Das `type`-Attribut sagt dem Browser zweierlei:

1. **welches Bedienelement**: Tastatur mit `@` auf dem Handy, Zahlenfeld mit Pfeilen, Datumsauswahl.
2. **welche Werte gültig sind**: `type="email"` lehnt `abc` ab, `min`/`max`/`step` grenzen Zahlen ein, `pattern` prüft mit einem regulären Ausdruck. Abfragbar über `input.validity` und `input.checkValidity()`.

Das ist ein kleines Schema-System, das zur Laufzeit existiert und eine Oberfläche erzeugt. Nur heißt es nicht so, und es lebt am Element statt im Programm. Eine Eigenart bleibt: Was ein Input liefert (`input.value`), ist immer ein String, auch bei `type="number"`. `input.valueAsNumber` gibt es extra.

---

## Was ein Schema ist

Ein Schema ist **eine Typ-Beschreibung, die ein Wert im Programm ist**. Man kann sie herumreichen, speichern, abfragen und vor allem: Daten damit prüfen.

```js
// json schema: a type description as plain data
const User = {
  type       : 'object',
  properties : { name: { type: 'string', minLength: 1 }, age: { type: 'integer', minimum: 0 } },
  required   : ['name'],
};

// zod: a type description as an object with methods
const User = z.object({ name: z.string().min(1), age: z.int().min(0).optional() });

User.safeParse({ name: '' });   // { success: false, error: … name: too short }
```

Beides beschreibt dieselbe Menge („Objekte mit einem nicht-leeren `name` und vielleicht einem `age` ab 0“). JSON Schema als reine Daten (sprachunabhängig, auch in Python oder PHP lesbar), Zod als JavaScript-Objekt mit Methoden.

Was ein Schema kann, ein TypeScript-Typ aber nicht:

- **echte Daten prüfen**: Was von `fetch`, aus `localStorage` oder einem Formular kommt.
- **Einschränkungen ausdrücken**, die TypeScript nicht kennt: „mindestens 1 Zeichen“, „0 bis 255“, „eine E-Mail“. Für TypeScript ist all das nur `string` oder `number`.
- **zur Laufzeit Auskunft geben**: „welche Werte sind erlaubt?“, um daraus ein Select oder einen Slider zu bauen.

---

## Warum TypeScript allein nicht reicht

```ts
type User = { name: string, age: number };

const user = await fetch('/api/user').then(response => response.json()) as User;
user.name.toUpperCase();   // typescript is happy
```

TypeScript ist hier zufrieden, weil man ihm mit `as User` *versprochen* hat, dass die Antwort ein `User` ist. Geprüft hat es niemand. Schickt der Server `{ name: null }`, stürzt die Zeile zur Laufzeit ab, obwohl der Compiler nichts gemeldet hat. Der statische Typ weiß nichts über die Außenwelt; er kann nur prüfen, ob der Code *mit sich selbst* stimmt.

Deshalb haben TypeScript-Projekte fast immer zusätzlich Schemas: für alles, was von außen kommt.

---

## Zod und TypeScript: wo kommt der Typ her?

Das ist der Teil, der am meisten verwirrt. Ohne Schema schreibt man in TypeScript alles doppelt:

```ts
// 1. the static type, for the compiler
type User = { name: string, age?: number };

// 2. the runtime check, for the data
function isUser (value: unknown): value is User {
  return typeof value === 'object' && value !== null && typeof value.name === 'string' && …;
}
```

Zwei Beschreibungen derselben Sache, die auseinanderlaufen, sobald jemand nur eine ändert. Zod dreht es um: **man schreibt nur das Schema, und TypeScript liest den Typ daraus ab.**

```ts
const User = z.object({ name: z.string().min(1), age: z.int().optional() });   // runtime: a real object

type User = z.infer<typeof User>;   // static: { name: string, age?: number }, derived
```

Wie geht das? Jede Zod-Funktion ist in ihren Typ-Deklarationen so geschrieben, dass ihr Rückgabewert den beschriebenen Typ als *Typ-Parameter* mit sich trägt ([generics.md](generics.md)). `z.string()` liefert für TypeScript ein `ZodString`, das „ich stehe für `string`“ in sich trägt; `z.object({ … })` rechnet die Felder zusammen. `z.infer` holt diesen mitgetragenen Typ wieder heraus. Zur Laufzeit gibt es davon nichts; das ist reine Buchhaltung für den Compiler.

Was dabei **hinzukommt**, gegenüber TypeScript allein:

| | nur TypeScript-Typ | Zod-Schema mit `z.infer` |
|---|---|---|
| Prüfung im Editor | ja | ja (aus dem Schema abgeleitet) |
| Prüfung echter Daten | nein | ja |
| Einschränkungen (`min(1)`, `0..255`) | nein, nur `string` / `number` | ja, zur Laufzeit |
| beschreibt man | einmal | einmal |
| existiert im Browser | nein | ja |

Und was **wegfällt**, wenn man kein TypeScript benutzt: nur die obere Zeile. Zod und Valibot funktionieren in reinem JavaScript genauso; man verliert die Hilfe im Editor, behält aber die ganze Prüfung zur Laufzeit. Für jemanden, der TypeScript nicht will, ist das die Hälfte, die zählt.

---

## Also: was ist jetzt „der Typ“?

Beides beschreibt denselben Typ, also dieselbe Menge erlaubter Werte. Der Unterschied ist, **wer die Beschreibung liest**:

```
                      ┌─▶ compiler   (static type)   checks the code, then deleted
the idea of a type  ──┤
                      └─▶ program    (schema)        checks data, stays at runtime
```

- Ein statischer Typ ist eine Beschreibung für den **Compiler**.
- Ein Schema ist eine Beschreibung für das **Programm**.
- `typeof` und `instanceof` sind die Fragen, die JavaScript **von Haus aus** an einen Wert stellen kann.
- `<input type>` ist eine Beschreibung für den **Browser**, der daraus ein Feld und eine Prüfung macht.

Die verbreitete Gleichsetzung „Typ = TypeScript“ kommt daher, dass statische Typen in den letzten zehn Jahren das sichtbarste Werkzeug waren. Die Idee ist älter und breiter.

---

## Die Fragen, direkt beantwortet

- **„Typen gibt es nur bis zur Compile-Zeit?“** Statische Typen ja. Laufzeit-Typen (`typeof`, Klassen, Schemas, `<input type>`) nein.
- **„Man definiert doch da auch bloß Schemas?“** Inhaltlich ja: Ein TypeScript-Typ und ein Schema beschreiben dieselbe Menge. Der TypeScript-Typ ist nur so gebaut, dass ihn ausschließlich der Compiler lesen kann, und wird danach gelöscht.
- **„Ist `string` kein Typ?“** Doch, ein Laufzeit-Typ von JavaScript selbst. `array` ist es im Sinne von `typeof` nicht (das liefert `'object'`), wohl aber als eingebaute Objektart (`Array.isArray`).
- **„Und das `type`-Attribut im HTML?“** Ebenfalls ein Typ: eine Laufzeit-Beschreibung, aus der der Browser ein passendes Feld und eine Prüfung macht.
- **„Zod/Valibot prüfen nur Daten?“** Zur Laufzeit ja. Zusätzlich sind sie so geschrieben, dass TypeScript aus einem Schema den statischen Typ ableiten kann. Man beschreibt einmal und bekommt beides; ohne TypeScript bekommt man die Prüfung.

---

## Für rat und aufbau

- **`@rat/types`** geht den Schema-Weg: Typen als Werte, die zur Laufzeit prüfen und Auskunft geben (`rat/.md/causa_types.md`). Statische Typen ließen sich später daraus ableiten, wie bei Zod; umgekehrt ginge es nicht, weil gelöschte Information weg ist.
- **`@aufbau/gui`** und die `input-*`-Elemente sind die HTML-Seite derselben Idee: aus einer Beschreibung (`{ type: 'number', min, max }`) ein Feld bauen. Ein Schema aus `@rat/types` könnte diese Beschreibung liefern.
- **`<input type>` als Vorbild:** Das Paar „welches Feld“ und „welche Werte gültig“ zeigt, dass Darstellung und Erlaubtes zusammen auftreten, aber getrennte Fragen sind. Ein `type="number"` kann ein Slider oder ein Zahlenfeld sein.
