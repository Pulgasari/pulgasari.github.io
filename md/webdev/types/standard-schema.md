# Standard Schema

**Standard Schema** ist eine gemeinsame Schnittstelle für Validierungsbibliotheken in JavaScript. Ein Schema, das sie erfüllt, trägt eine Eigenschaft `~standard` mit `version`, `vendor` und einer Funktion `validate`. Wer Schemas annimmt (ein Formular, ein Router, ein API-Framework), muss dann nur diese eine Form kennen und funktioniert mit jeder Bibliothek, die sie anbietet. Entworfen von den Autoren von [Zod](libs/zod.md) (Colin McDonnell), [Valibot](libs/valibot.md) (Fabian Hiller) und [ArkType](libs/arktype.md) (David Blass); Version 1 des Pakets `@standard-schema/spec` erschien am 26. Januar 2025, aktuell 1.1.0 (Dezember 2025) mit der Ergänzung *Standard JSON Schema*.

Weiterführend: [types/protocols.md](types/protocols.md) (ein Protokoll zwischen Bibliotheken, wie das Context-Protokoll), [types/types_and_schemas.md](types/types_and_schemas.md) (was ein Schema ist), [codecs.md](codecs.md) (Werte in beide Richtungen umwandeln), [graphql.md](graphql.md) (auch GraphQL-Typen gibt es als Standard Schema).

---

## Das Problem

```
ohne Standard                                   mit Standard
tRPC        ─┬─ zod adapter                     tRPC        ─┐
             ├─ valibot adapter                 TanStack    ─┤
             └─ yup adapter                     Hono        ─┼─▶ ['~standard'].validate ◀─┬─ zod
TanStack    ─┬─ zod adapter                     Formular X  ─┘                            ├─ valibot
             └─ …                                                                         ├─ arktype
Hono        ─── @hono/zod-validator, …                                                    └─ yup, joi, …
```

Jedes Werkzeug, das ein Schema annimmt, musste für jede Bibliothek einen eigenen Adapter schreiben und pflegen (`@hono/zod-validator`, `@hookform/resolvers` mit Dutzenden Varianten), oder es legte sich auf eine fest, meist Zod. Neue Bibliotheken hatten es schwer, weil niemand sie unterstützte. Bei N Werkzeugen und M Bibliotheken waren das N × M Adapter; mit einer gemeinsamen Schnittstelle N + M Implementierungen, und keine Abhängigkeit in irgendeine Richtung.

## Die Schnittstelle

Alles liegt unter einem einzigen Schlüssel. Die Spezifikation ist reine TypeScript-Typen; hier verkürzt, weil die Typen das Thema sind:

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version  : 1;
    readonly vendor   : string;
    readonly validate : (value: unknown, options?: { libraryOptions?: Record<string, unknown> })
                        => Result<Output> | Promise<Result<Output>>;
    readonly types?   : { readonly input: Input; readonly output: Output };
  };
}

type Result<Output> = { readonly value: Output; readonly issues?: undefined }
                    | { readonly issues: ReadonlyArray<Issue> };

interface Issue {
  readonly message : string;
  readonly path?   : ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}
```

| Feld | Bedeutung |
|---|---|
| `version` | immer `1`; eine inkompatible Änderung hieße `StandardSchemaV2` |
| `vendor` | Name der Bibliothek (`'zod'`, `'valibot'`, `'arktype'`), für Fehlermeldungen und Sonderfälle |
| `validate(value, options)` | prüft einen unbekannten Wert, liefert `{ value }` oder `{ issues }`, darf ein Promise liefern, **wirft nicht** bei ungültigen Daten |
| `types` | nur für TypeScript: trägt Ein- und Ausgabetyp, damit `InferInput`/`InferOutput` sie herauslesen können; zur Laufzeit meist `undefined` |
| `options.libraryOptions` | Durchreiche für herstellerspezifische Einstellungen (seit 1.1) |

Erfolg erkennt man allein daran, dass `issues` fehlt oder falsy ist. `value` ist der **Ausgabewert**: Er kann sich vom Eingabewert unterscheiden (Defaults eingesetzt, `'120'` zu `120` umgewandelt, unbekannte Schlüssel entfernt). Ein Pfadsegment ist ein Schlüssel oder ein Objekt `{ key }`, damit Bibliotheken zusätzliche Informationen anhängen können.

## Die Designentscheidungen

- **Ein Schlüssel, mit Tilde.** `~` sortiert in der Autovervollständigung hinter alle Buchstaben und Ziffern; ein Unterstrich stünde ganz oben. Ein `Symbol` wurde verworfen, weil TypeScript gewöhnliche Symbol-Schlüssel zu einem allgemeinen `symbol` zusammenfallen lässt.
- **Keine Laufzeit-Abhängigkeit.** `@standard-schema/spec` enthält nur Typen. Man darf die Typen auch kopieren; Bibliotheken in reinem JavaScript brauchen das Paket gar nicht.
- **Minimal.** Eine Bibliothek implementiert die Spezifikation in wenigen Zeilen über ihre vorhandene Prüffunktion. Fehlercodes, Defaults, Selbstbeschreibung oder Serialisierung sind bewusst nicht enthalten.
- **Sync oder async.** `validate` darf ein Promise liefern. Die Spezifikation empfiehlt, wo möglich synchron zu bleiben; ein Konsument, der nur synchron kann, prüft auf `then` und lehnt ab.

## Ein Konsument

Eine Funktion, die jedes Standard-Schema annimmt, ohne eine Bibliothek zu importieren:

```js
// any library's schema, one shape
export async function check (schema, input) {
  let result = schema['~standard'].validate(input);
  if (typeof result?.then === 'function') result = await result;
  if (result.issues) throw new TypeError(result.issues.map(format).join(', '));
  return result.value;
}

const key    = segment => typeof segment === 'object' ? segment.key : segment;
const format = issue   => (issue.path?.length ? issue.path.map(key).join('.') + ': ' : '') + issue.message;

const isStandardSchema = value => typeof value?.['~standard']?.validate === 'function';
```

```js
import * as z from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';

await check(z.email(), 'a@b.de');
await check(v.pipe(v.string(), v.email()), 'a@b.de');
await check(type('string.email'), 'a@b.de');
```

Wer nur synchron prüfen kann (eine Signal-Zuweisung, ein `localStorage`-Lesezugriff vor dem ersten Paint), ersetzt das `await` durch eine Fehlermeldung.

## Eine Implementierung

Eine eigene Mini-Bibliothek, die die Schnittstelle erfüllt, in reinem JavaScript:

```js
const standard = run => ({ validate: run, vendor: 'mini', version: 1 });

export const string = (message = 'expected a string') => ({
  '~standard': standard(value => typeof value === 'string' ? { value } : { issues: [{ message }] }),
});

export const object = shape => ({
  '~standard': standard(input => {
    if (input === null || typeof input !== 'object') return { issues: [{ message: 'expected an object' }] };
    const issues = [];
    const value  = {};
    for (const [key, schema] of Object.entries(shape)) {
      const result = schema['~standard'].validate(input[key]);      // sync children only
      if (result.issues) issues.push(...result.issues.map(issue => ({ ...issue, path: [key, ...(issue.path ?? [])] })));
      else               value[key] = result.value;
    }
    return issues.length ? { issues } : { value };
  }),
});

object({ name: string() })['~standard'].validate({ name: 3 });   // { issues: [{ message, path: ['name'] }] }
```

Weil `object` seine Kinder über `~standard` aufruft, nimmt es als Felder auch Zod- oder Valibot-Schemas an. Der Objekt-Prüfer müsste dafür noch async Kinder abfangen; das ist der eine Haken, wenn man fremde Schemas schachtelt.

## Wer die Schnittstelle anbietet

| Bibliothek | seit |
|---|---|
| [Zod](libs/zod.md) | 3.24.0 |
| [Valibot](libs/valibot.md) | 1.0 |
| [ArkType](libs/arktype.md) | 2.0 |
| Effect Schema | 3.13.0 (über einen Adapter, `Schema.standardSchemaV1`) |
| Yup | 1.7.0 |
| Joi | 18.0.0 |
| typia, VineJS, decoders, Sury, Mongoose (9.7) | |
| GraphQL Standard Schema (Apollo) | macht eine GraphQL-Operation zum Standard-Schema für ihre Antwort |

Die offizielle Liste nennt über 30 Implementierungen. Auf der anderen Seite nehmen über 60 Werkzeuge Standard-Schemas an, darunter **tRPC**, **TanStack Form** und **Router**, **Hono** (`@hono/standard-validator`), **Elysia**, **React Hook Form** (über die Resolver), **RTK Query**, **T3 Env**, **oRPC**, **Nuxt UI**, **Content Collections** und mehrere MCP-SDKs für Werkzeug-Parameter.

## Standard JSON Schema

Viele Werkzeuge brauchen ein Schema nicht zum Prüfen, sondern als **JSON Schema**: OpenAPI-Dokumente, Werkzeug-Parameter für LLMs, generierte Formulare. Dafür gibt es seit `@standard-schema/spec` 1.1 eine zweite, unabhängige Schnittstelle unter demselben Schlüssel:

```js
const json = schema['~standard'].jsonSchema.input({ target: 'draft-2020-12' });
// also .output(…), because input and output may differ (a default makes a field optional on input)
```

Beide teilen sich die Basis `StandardTypedV1` (`version`, `vendor`, `types`); ein Schema kann eine oder beide erfüllen. Ziele sind `'draft-2020-12'`, `'draft-07'` (beide dringend empfohlen) und `'openapi-3.0'`; nicht unterstützte Ziele sollen werfen. Umgesetzt in Zod und `zod/mini` ab 4.2, ArkType ab 2.1.28, Valibot über `toStandardJsonSchema()` aus `@valibot/to-json-schema`, dazu VineJS und Sury. Bei Valibot und Zod Mini liegt die Umwandlung absichtlich außerhalb des Schemas, damit sie nur im Bundle landet, wer sie importiert.

## Grenzen

- **Nur Prüfen.** Kein Default, kein Anfangswert, keine Selbstbeschreibung jenseits von JSON Schema, kein `encode` für den Rückweg. Wer das braucht, braucht die Bibliothek selbst.
- **Keine Fehlercodes.** Ein Issue hat nur `message` und `path`; ein Formular, das Meldungen übersetzen will, bekommt den fertigen Text der Bibliothek.
- **Sync oder async ist erst zur Laufzeit sichtbar.** Ein Konsument weiß vorher nicht, ob ein fremdes Schema ein Promise liefert.
- **Typen nur mit TypeScript.** In reinem JavaScript ist `types` bedeutungslos; was bleibt, ist die Laufzeitprüfung, und genau die ist der Kern.

## Für rat: `@rat/types` und `~standard`

`@rat/types` erfüllt die Schnittstelle schon: `Schema` in `packages/types/schema.js` hat einen Getter `'~standard'`, der `{ validate, vendor: 'rat', version: 1 }` liefert, und `validate` gibt bereits `{ value }` oder `{ issues: [{ message, path }] }` zurück. Auf der anderen Seite nehmen `@rat/signals` (`isSchema` und `check` in `core.js`), `@rat/bunker` (`Store.check`) und `@domina/element` (`static props`, `rat/.md/decisions.md`) jedes Standard-Schema an und lehnen async Ergebnisse ab. Die Frage ist also nicht *ob*, sondern was noch fehlt.

**Empfehlung: dabei bleiben, die eigenen Erweiterungen (`initial`, `describe`) außerhalb von `~standard` lassen, und vier Dinge nachziehen.**

1. **Das `~standard`-Objekt einmal pro Schema anlegen.** Der Getter erzeugt bei jedem Zugriff ein neues Objekt und eine neue Closure, und `check` in `@rat/signals` greift bei **jeder** Signal-Zuweisung zu. Das ist vermeidbarer Speicherdruck auf dem heißesten Pfad der Runtime. Weil der Konstruktor nur benannte Felder liest, kann das Objekt dort vor `Object.freeze` gesetzt werden, ohne dass `derive` es mitkopiert.
2. **Anfangswert für fremde Schemas.** Ein Signal liest `schema.initial`; Zod und Valibot haben das nicht, das Signal startet bei `undefined`. Ein Ausweg über die Schnittstelle selbst: `validate(undefined)`. Hat das fremde Schema einen Default (`z.string().default('')`), kommt er so heraus; sonst bleibt `undefined`.
3. **`types` in `index.d.ts`** ergänzen, nur auf Typebene: `Num` nimmt `'120'` an und liefert `120`, also `{ input: number | string, output: number }`. Dann leiten TypeScript-Nutzer von tRPC oder TanStack die richtigen Typen aus rat-Schemas ab. Laufzeitkosten: keine.
4. **Standard JSON Schema über `describe`**, optional und in einer eigenen Datei, damit es nur kostet, wer es importiert. `describe` trägt schon alles Nötige (`kind`, `min`, `max`, `int`, `pattern`, `values`, `fields`, `item`); dasselbe Abbild braucht `@aufbau/gui` für generierte Bedienelemente.

```js
// @rat/types/schema.js: one object per schema, built before the freeze
constructor ({ checks = [], describe = {}, initial, kind, nullable = false, parts = null, run }) {
  Object.assign(this, { checks, describe: { kind, ...describe }, initial, kind, nullable, parts, run });
  this['~standard'] = Object.freeze({ validate: value => this.validate(value), vendor: 'rat', version: 1 });
  Object.freeze(this);
}

// @rat/signals/core.js: the initial value of a foreign schema through the interface itself
const initialOf = schema => 'initial' in schema ? schema.initial : schema['~standard'].validate(undefined).value;
```

```js
// @rat/types/json-schema.js (sketch): describe -> json schema, same for input and output
const fromDescribe = describe => {
  switch (describe.kind) {
    case 'bool'   : return { type: 'boolean' };
    case 'enum'   : return { enum: [...describe.values] };
    case 'list'   : return { type: 'array', items: fromDescribe(describe.item) };
    case 'num'    : return { type: describe.int ? 'integer' : 'number', minimum: describe.min, maximum: describe.max };
    case 'record' : return { type: 'object', properties: Object.fromEntries(Object.entries(describe.fields).map(([key, field]) => [key, fromDescribe(field)])) };
    case 'str'    : return { type: 'string', minLength: describe.min, maxLength: describe.max, pattern: describe.pattern };
    default       : return {};
  }
};

// like valibot's toStandardJsonSchema: a separate object, the schema itself stays as it is
export const toStandardJSONSchema = schema => {
  const convert = ({ target }) => {
    if (target !== 'draft-2020-12' && target !== 'draft-07') throw new TypeError(`[rat] no json schema for ${target}`);
    return fromDescribe(schema.describe);
  };
  return { '~standard': { ...schema['~standard'], jsonSchema: { input: convert, output: convert } } };
};
```

Die Skizze lässt `undefined`-Felder stehen (`minimum: undefined`), die `JSON.stringify` ohnehin weglässt, und behandelt `optional`, `Tuple`, `Union` und `required` noch nicht. Als nächster Schritt reicht Punkt 1, er ist eine Zeile und betrifft jede typisierte Signal-Zuweisung. Punkt 2 macht das Versprechen „Zod- und Valibot-Schemas funktionieren auch“ für den Anfangswert wahr. Punkte 3 und 4 erst, wenn ein Nutzer sie braucht (TypeScript-Konsumenten, generierte Formulare, LLM-Werkzeuge).

---

Quellen: [standardschema.dev](https://standardschema.dev), [Spezifikation und Listen im Repository](https://github.com/standard-schema/standard-schema/blob/main/packages/spec/schema.md), [Standard JSON Schema](https://github.com/standard-schema/standard-schema/blob/main/packages/spec/json-schema.md), [Changelog `@standard-schema/spec`](https://github.com/standard-schema/standard-schema/blob/main/packages/spec/CHANGELOG.md), [`@standard-schema/spec` auf npm](https://www.npmjs.com/package/@standard-schema/spec), [Zod: Standard Schema](https://zod.dev), [Valibot](https://valibot.dev), [ArkType](https://arktype.io), [`@hono/standard-validator`](https://www.npmjs.com/package/@hono/standard-validator), `rat/packages/types/schema.js`, `rat/packages/signals/core.js`, `rat/packages/bunker/store.js`. Stand: 21. Oktober 2026.
