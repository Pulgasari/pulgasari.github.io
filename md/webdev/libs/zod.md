# Zod

Eine Bibliothek, die Schemas für Daten beschreibt, zur Laufzeit prüft und daraus TypeScript-Typen ableitet. Von Colin McDonnell, seit März 2020. Zod 4 (Juli 2025) war ein Neuschreiben mit eigenem Kern (`zod/v4/core`), einer schlanken Variante `zod/mini` und JSON-Schema-Export. Aktuell 4.6.7 (Oktober 2026), sehr aktiv. Der De-facto-Standard für Validierung im TypeScript-Umfeld (tRPC, Astro, React Hook Form, AI-SDKs für Tool-Parameter).

- Website: https://zod.dev
- Repository: https://github.com/colinhacks/zod
- Abhängigkeiten: keine
- Build: keiner nötig; die Typ-Ableitung braucht TypeScript, die Prüfung nicht

## Das Problem, das Zod löst

TypeScript-Typen existieren nur beim Compilieren. Was zur Laufzeit hereinkommt (eine API-Antwort, ein Formular, `localStorage`, eine Datei, ein URL-Parameter), ist `unknown`, egal was der Typ behauptet. Vor Zod schrieb man deshalb zweimal: einen Typ für den Compiler und eine Prüfung für die Laufzeit (von Hand, mit Joi oder Yup, oder mit JSON Schema und einem Generator), und beide liefen auseinander.

Zod dreht es um: Man schreibt nur das Schema, und der Typ wird daraus abgeleitet. *Parse, don't validate*: Ein Schema prüft nicht nur, es liefert einen Wert zurück, dem man ab da trauen darf.

## Kernkonzepte

### 1. Schema beschreiben, Typ ableiten

```js
import * as z from 'zod';

const User = z.object({
  age   : z.number().int().min(0).optional(),
  email : z.email(),
  name  : z.string().min(1),
  role  : z.enum(['admin', 'user']).default('user'),
});

// in typescript: type User = z.infer<typeof User>
```

Schemas sind Werte, aus kleinen Bausteinen zusammengesetzt. Jede Methode (`.min`, `.optional`, `.default`) gibt ein neues Schema zurück. `z.infer` macht daraus den Typ, ohne dass er irgendwo von Hand steht (wie das über Generics funktioniert, steht in [generics.md](../types/generics.md)).

### 2. `parse` und `safeParse`

```js
const user = User.parse(json);                 // throws a ZodError on failure

const result = User.safeParse(json);           // never throws
if (!result.success) console.log(z.prettifyError(result.error));
else                 save(result.data);
```

Das Ergebnis ist eine **Kopie**: Unbekannte Schlüssel fallen weg (`z.strictObject` lehnt sie ab, `z.looseObject` behält sie), Defaults sind eingesetzt, Transformationen angewandt. Fehler sind strukturiert (`issues` mit Pfad, Code, Meldung); `z.flattenError` und `z.treeifyError` formen sie für Formulare um.

### 3. Transformationen, Refinements, Codecs

```js
const Port  = z.string().transform(Number).pipe(z.number().int().max(65535));
const Range = z.object({ from: z.date(), to: z.date() })
  .refine(range => range.from <= range.to, { message: 'from after to', path: ['to'] });

const IsoDate = z.codec(z.iso.datetime(), z.date(), {
  decode : string => new Date(string),
  encode : date   => date.toISOString(),
});
IsoDate.decode('2026-10-15T12:00:00Z');   // Date
IsoDate.encode(new Date);                 // string
```

`transform` ändert den Wert, `refine` prüft beliebige Bedingungen, `pipe` hängt Schemas hintereinander. Seit 4.1 gibt es **Codecs**: Schemas, die in beide Richtungen laufen, für alles, was serialisiert und wieder eingelesen wird (Datum, BigInt, JSON in einem String). `z.stringbool()` liest `'true'`, `'yes'`, `'1'` und so weiter als Boolean, für Umgebungsvariablen und Query-Strings.

### 4. Zusammensetzen

```js
const Admin   = User.extend({ permissions: z.array(z.string()) });
const Patch   = User.partial();
const Public  = User.pick({ name: true });
const Shape   = z.discriminatedUnion('type', [
  z.object({ type: z.literal('circle'), radius: z.number() }),
  z.object({ type: z.literal('rect'), width: z.number(), height: z.number() }),
]);
const Tree = z.object({ name: z.string(), get children () { return z.array(Tree); } });   // recursive
```

Rekursive Schemas gehen seit Zod 4 über einen Getter, ohne `z.lazy` und ohne Typ von Hand.

### 5. `zod/mini`: dieselbe Logik, funktional

```js
import * as z from 'zod/mini';

const User = z.object({
  email : z.email(),
  name  : z.string().check(z.minLength(1)),
  age   : z.optional(z.int()),
});
```

Die klassische API hängt alles als Methoden an jedes Schema, deshalb kann ein Bundler nichts davon entfernen. `zod/mini` nutzt denselben Kern, aber Funktionen statt Methoden: Was nicht importiert wird, fällt weg. Für dieses Schema 5,8 kb statt 25,6 kb. Das ist Valibots Ansatz ([valibot.md](valibot.md)), von Zod übernommen.

### 6. Metadaten und JSON Schema

```js
const Todo = z.object({ title: z.string() }).meta({ id: 'Todo', description: 'one entry' });

z.toJSONSchema(Todo);        // { type: 'object', properties: { title: { type: 'string' } }, … }
z.fromJSONSchema(jsonSchema);
```

Schemas tragen Metadaten in Registries (`z.globalRegistry`) und lassen sich nach JSON Schema exportieren und daraus einlesen. Damit beschreibt ein Zod-Schema Werkzeug-Parameter für LLMs, OpenAPI-Dokumente oder Formulare.

### 7. Standard Schema

Zod implementiert **Standard Schema**, eine gemeinsame Schnittstelle von Zod, [Valibot](valibot.md) und ArkType: Jedes Schema hat eine Eigenschaft `~standard` mit `validate(value)`. Bibliotheken, die Schemas annehmen (Formulare, Router, tRPC), können so jede dieser Bibliotheken akzeptieren, ohne von einer abzuhängen.

```js
const result = await schema['~standard'].validate(input);   // { value } or { issues }
```

### 8. Geschwindigkeit: JIT und `zod/compile`

Zod 4 erzeugt für Objekte zur Laufzeit optimierten Code mit `new Function`. Seit 4.5 kann `zod/compile` ganze Schemas beim ersten `parse` in eine einzige Prüffunktion übersetzen; was der Compiler nicht abdecken kann (asynchrone Refinements), läuft still über den normalen Weg. In Umgebungen mit strenger CSP schaltet `z.config({ jitless: true })` beides ab.

## Wie es intern arbeitet

Jedes Schema ist ein Objekt mit einem internen Teil `_zod`: Definition (`def`), Prüfungen (`checks`) und eine `run`-Funktion, die einen *Payload* `{ value, issues }` durchreicht. Ein Objekt-Schema ruft `run` jedes Felds auf und sammelt die Issues mit Pfad, statt beim ersten Fehler abzubrechen. Prüfungen (`min`, `email`) sind eigene kleine Objekte, die an den Payload gehängt werden. Klassik und Mini sind zwei Oberflächen über denselben Kern-Klassen, deshalb verhalten sie sich gleich.

Die Typ-Ableitung ist reine Typ-Ebene: Jedes Schema ist generisch über seinen Ausgabe- und Eingabetyp (`z.output`, `z.input`), und `z.object` rechnet die Typen der Felder zusammen. Das kostet keinen Byte zur Laufzeit, aber Compiler-Zeit: Zod 4 hat die Zahl der Typ-Instanziierungen gegenüber Zod 3 stark gesenkt.

## Stärken und Schwächen

- **Stark:** ein Schema für Laufzeit und Typ, ausdrucksstarke Fehler mit Pfaden, Transformationen und Codecs, JSON Schema in beide Richtungen, riesiges Ökosystem. Mit Zod 4 schnell genug, dass Validierung selten der Engpass ist.
- **Schwach:** Die klassische API ist nicht tree-shakable: schon ein kleines Schema kostet rund 25 kb, und `import { z } from 'zod'` statt `import * as z` zieht über den Namensraum die Locales mit (gemessen 90 kb). `zod/mini` löst das, liest sich aber umständlicher. Der Nutzen hängt an TypeScript; in reinem JavaScript bleibt „nur“ die Prüfung. Der JIT braucht `unsafe-eval`, sonst den langsameren Pfad.

## Für rat und aufbau

- **d-14 a (Schema als Anfangswert, `let $view = Enum('grid', 'list')`) ist Zods Grundidee.** Ein Wert, der zugleich beschreibt, was erlaubt ist. Statt eigener Schema-Bausteine in `@rat/types` könnte rat **Standard Schema** annehmen: `let $user = signal(User)` mit einem beliebigen Zod- oder Valibot-Schema, die Runtime prüft jede Zuweisung über `~standard.validate`. Vorschlag: `@rat/types` liefert eigene, kleine Schemas für die eingebauten Typen und akzeptiert zusätzlich alles mit `~standard`; damit hängt rat von keiner Bibliothek ab.
- **`@aufbau/store` hat dasselbe Muster in klein**: Jeder Typ in `types.js` ist `coerce` plus Methoden, `enum` weist falsche Werte mit Warnung ab. Was fehlt, sind zusammengesetzte Typen (Objekt, Liste von Objekten) und Fehler mit Pfad. Ein Eintrag `{ type: 'schema', schema }`, der `~standard.validate` ruft, würde das öffnen, ohne die bestehenden Typen anzufassen (Vorschlag).
- **Grenzen prüfen, nicht überall:** Zod lohnt sich, wo Daten von außen kommen. In zugriff sind das Importe (Notizen, Todos, Feeds aus Dateien und dem Netz) und `localStorage` nach einem App-Update mit geändertem Format. `@bunker` wäre der natürliche Ort für ein optionales Schema beim Lesen.
- **Für reines JavaScript ist Zod klassisch zu schwer.** Ohne TypeScript bleibt die Typ-Ableitung ungenutzt, der Preis (25 kb) aber bleibt. Wenn eine Bibliothek, dann [Valibot](valibot.md) oder `zod/mini`.
- **Codecs** sind genau das, was `@aufbau/store/persist.js` mit `decode` und `JSON.parse` von Hand tut: ein Wert, der beim Speichern kodiert und beim Laden dekodiert und geprüft wird. Ein `Date` im Store kommt nach einem Neuladen heute als String zurück.
