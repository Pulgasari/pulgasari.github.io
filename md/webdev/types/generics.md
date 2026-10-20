# Generics

**Generics** sind Typen mit Platzhaltern. Eine Funktion oder ein Typ wird einmal geschrieben und funktioniert für viele Typen, ohne dass dabei die Information verloren geht, *welcher* Typ gerade drinsteckt.

Weiterführend: [data_structures.md](data_structures.md) (Grundformen von Daten), [protocols.md](protocols.md) (Formen, die ein Objekt erfüllen muss).

---

## Das Problem

In JavaScript gibt es keine Typen im Code, also auch kein Problem:

```js
const first = list => list[0];

first([1, 2, 3]);     // 1
first(['a', 'b']);    // 'a'
```

Sobald Typen dazukommen (TypeScript, JSDoc, `index.d.ts`), muss man sagen, was `first` zurückgibt. Drei schlechte Antworten:

```ts
function first (list: number[]): number     // works for numbers only
function first (list: any[]): any           // works for everything, and knows nothing afterwards
function first (list: unknown[]): unknown   // safe, but every caller has to check again
```

Mit `any` ist `first(['a', 'b']).toUpperCase()` erlaubt, aber `first([1, 2]).toUpperCase()` auch, und das stürzt ab. Die Information „was reingeht, kommt raus“ ist weg.

## Die Lösung: ein Typparameter

```ts
function first<T> (list: T[]): T | undefined {
  return list[0];
}

first([1, 2, 3]);          // T = number, returns number | undefined
first(['a', 'b']);         // T = string, returns string | undefined
first<Date>([new Date]);   // T given explicitly
```

`T` ist ein Platzhalter, der bei jedem Aufruf durch einen konkreten Typ ersetzt wird. Meist erschließt der Compiler ihn selbst aus den Argumenten (**Inferenz**); man schreibt ihn nur hin, wenn er sich nicht ableiten lässt.

Der Name `T` ist Konvention (Type). Weitere übliche: `K`/`V` für Schlüssel und Wert, `E` für Elemente, `R` für Rückgaben. Lesbarer sind oft sprechende Namen: `Item`, `Key`, `Value`.

## Wo man Generics schon benutzt, ohne es zu merken

```ts
const ids    : Array<number>            = [1, 2, 3];      // number[]
const lookup : Map<string, Element>     = new Map;
const answer : Promise<Response>        = fetch('/api');
const refs   : WeakMap<Element, Record<string, unknown>> = new WeakMap;
const event  : CustomEvent<{ id: number }> = new CustomEvent('pick', { detail: { id: 1 } });
```

Jede Sammlung und jeder Container ist generisch: Er weiß nicht, was er hält, aber er behält es.

## Die Werkzeuge

### Einschränkungen: `extends`

Ein Typparameter darf nicht alles sein, wenn die Funktion etwas Bestimmtes von ihm braucht:

```ts
function byId<T extends { id: string }> (list: T[], id: string): T | undefined {
  return list.find(item => item.id === id);   // allowed: every T has an id
}

byId(users, 'ada');      // T = User, returns User
byId([1, 2], 'x');       // error: number has no id
```

`extends` heißt hier „mindestens diese Form“. Das ist genau die Verbindung zu [Protokollen](protocols.md): Die Funktion verlangt ein Protokoll, nicht eine bestimmte Klasse.

### Mehrere Parameter, abhängig voneinander

```ts
function pluck<T, K extends keyof T> (list: T[], key: K): T[K][] {
  return list.map(item => item[key]);
}

pluck(users, 'name');    // string[]
pluck(users, 'age');     // number[]
pluck(users, 'nope');    // error: not a key of User
```

### Voreinstellungen

```ts
interface Response<Body = unknown> { status: number; body: Body; }

let a: Response;               // Body = unknown
let b: Response<User[]>;       // Body = User[]
```

### Generische Klassen und Interfaces

```ts
class Stack<T> {
  #items: T[] = [];
  push (item: T) { this.#items.push(item); }
  pop  (): T | undefined { return this.#items.pop(); }
}
```

### Typen, die mit Typen rechnen

TypeScript kann Typen aus anderen Typen ableiten. Das sind auch Generics, nur auf der Typebene:

```ts
type Nullable<T>   = T | null;
type Readonly<T>   = { readonly [K in keyof T]: T[K] };              // mapped type
type Unwrap<T>     = T extends Promise<infer Inner> ? Inner : T;     // conditional type
type Values<T>     = T[keyof T];

type A = Unwrap<Promise<number>>;   // number
```

Damit leiten Bibliotheken wie Zod oder Valibot den Typ eines Werts aus seinem Schema ab (`z.infer<typeof schema>`): Das Schema ist ein generischer Wert, sein Typparameter trägt die Form der Daten.

## Wie Sprachen das umsetzen

| Umsetzung | Was passiert | Sprachen |
|---|---|---|
| **Erasure** | Typparameter werden beim Übersetzen entfernt, zur Laufzeit gibt es nur einen Code für alle | TypeScript, Java |
| **Monomorphisierung** | für jeden benutzten Typ entsteht eine eigene Kopie des Codes | C++ (Templates), Rust, Zig |
| **Reifizierung** | der Typparameter existiert zur Laufzeit und kann abgefragt werden | C#, Kotlin (`reified`), Swift teilweise |
| **Dictionary Passing** | eine Tabelle mit den nötigen Operationen wird unsichtbar mitgegeben | Haskell (Typklassen), Go (teilweise), Swift |

Für JavaScript-Entwickler die wichtigste Folge der Erasure: **Generics in TypeScript existieren zur Laufzeit nicht.** Man kann nicht fragen „ist `T` ein String?“. Wer zur Laufzeit prüfen will, braucht einen echten Wert, etwa ein Schema.

Geschichte in Kürze: ML (1973) hatte parametrische Polymorphie als Erstes, Ada (1980er) den Begriff „generic“, C++ Templates (1990), Java Generics (2004), C# (2005), TypeScript (2013), Go (2022, nach zehn Jahren Debatte).

## Fallen

- **Ein Typparameter nur in der Rückgabe** ist eine versteckte Typumwandlung, keine Garantie:
  ```ts
  function get<T> (key: string): T { return JSON.parse(localStorage.getItem(key)); }
  const user = get<User>('user');   // nothing checks that it is a User
  ```
  Das sieht sicher aus und ist es nicht. Ehrlicher: `unknown` zurückgeben und an der Grenze mit einem Schema prüfen.
- **Zu viele Parameter:** `function f<A, B, C, D>` ist meist ein Zeichen, dass die Funktion zu viel kann.
- **Typ-Gymnastik:** Conditional und Mapped Types können ganze Programme auf der Typebene sein. Lesbar bleiben sie nur, wenn sie klein sind.
- **Varianz:** Ein `Array<Dog>` ist nicht ohne weiteres ein `Array<Animal>`, wenn man hineinschreiben kann (sonst landet eine Katze im Hundekorb). TypeScript ist hier absichtlich locker; `in`/`out` an Typparametern (TS 4.7) macht es ausdrücklich.

## Ohne TypeScript

Wer JavaScript schreibt und Typen nur in `index.d.ts` oder JSDoc pflegt, hat Generics trotzdem:

```js
/**
 * @template T
 * @param {T[]} list
 * @returns {T | undefined}
 */
export const first = list => list[0];
```

Und im Laufzeitcode heißt „generisch“ einfach: **gegen ein Protokoll programmieren statt gegen eine Klasse.** `for…of` ist generisch über alles Iterierbare, `await` über alles mit `then`. Das ist die JavaScript-Form derselben Idee.

## In eigenem Code

- **`@bunker/core`:** `get<T>(key): Promise<T | null>` ist genau die Falle oben: Der Typparameter steht nur in der Rückgabe, nichts prüft ihn. Für einen Speicher ist das vertretbar (der Aufrufer weiß, was er geschrieben hat), aber ehrlicher wäre `unknown` mit einem optionalen Schema.
- **`@domina/chain`:** `Chain<Many extends boolean>` mit `Read<T, Many> = Many extends true ? T[] : T | null`. Ein Getter liefert `string | null` auf `d()` und `string[]` auf `dd()`, aus einer einzigen Methodendeklaration.
- **`@rat/types`:** Schemas, aus denen sich der Typ der Daten ableiten lässt, wären der Weg zu „ein Schema, Laufzeitprüfung und Typ zugleich“ (wie `z.infer`).
