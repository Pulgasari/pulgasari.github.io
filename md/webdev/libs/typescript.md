# TypeScript

JavaScript mit statischen Typen: Variablen, Parameter und Rückgaben bekommen Typen, ein Compiler prüft vor dem Ausführen, ob alles zusammenpasst, und entfernt die Typen dann wieder. Von Microsoft, federführend Anders Hejlsberg (auch Turbo Pascal, Delphi, C#), öffentlich seit Oktober 2012, Version 1.0 im April 2014. TypeScript 7.0 (Juli 2026) ist eine Neuschreibung des Compilers in Go, rund zehnmal schneller; aktuell 7.0.2. Heute der Standard für größere JavaScript-Projekte.

- Website: https://www.typescriptlang.org
- Repository: https://github.com/microsoft/TypeScript (7.x: https://github.com/microsoft/typescript-go)
- Build: ja (`tsc`, oder esbuild, Vite, Bun, Deno, Node, die Typen nur entfernen)

Grundlagen zu Typen allgemein, statisch gegen Laufzeit, und warum Schemas etwas anderes leisten: [types_and_schemas.md](../types/types_and_schemas.md).

## Das Problem, das TypeScript löst

JavaScript prüft nichts, bevor Code läuft. Ein Tippfehler im Eigenschaftsnamen, ein vergessenes Argument, ein `undefined`, wo ein Objekt erwartet wurde: All das fällt erst auf, wenn genau diese Zeile ausgeführt wird, oft beim Nutzer. In großen Codebasen weiß außerdem niemand mehr sicher, was eine Funktion annimmt und zurückgibt, und Umbenennen wird zum Glücksspiel.

TypeScript legt eine Prüfschicht darüber, die nur im Editor und im Build existiert. Sie findet diese Fehler beim Schreiben, macht Umbenennen und Autovervollständigung zuverlässig und dokumentiert Schnittstellen. Zur Laufzeit ändert sie nichts: Was im Browser läuft, ist das JavaScript ohne die Typen.

## Kernkonzepte

### 1. Annotationen und Inferenz

```ts
function area (width: number, height: number): number {
  return width * height;
}

const sizes = [1, 2, 3];          // inferred: number[]
const label = `${sizes.length}`;  // inferred: string
```

Man schreibt Typen dort, wo der Compiler sie nicht selbst herleiten kann, vor allem an Funktionsparametern. Innerhalb von Funktionen leitet TypeScript fast alles selbst ab (*Inferenz*). Wie viel man schreiben muss, hängt stark davon ab, wie streng das Projekt eingestellt ist.

### 2. Strukturelle Typen

```ts
type Point = { x: number, y: number };

const p = { x: 1, y: 2, label: 'a' };
const q: Point = p;   // fine: p has at least x and y
```

TypeScript vergleicht Formen, nicht Namen (*strukturell*, siehe die Begriffstabelle in `rat/.md/causa_types.md`). Ein Objekt ist ein `Point`, wenn es `x` und `y` hat, egal woher es kommt. Das passt zu JavaScript, wo Objekte selten aus Klassen stammen.

### 3. Unions, Literale, Narrowing

```ts
type State = { status: 'loading' } | { status: 'error', message: string } | { status: 'done', data: User };

function render (state: State) {
  if (state.status === 'error') return state.message;   // here state is the error member
  if (state.status === 'done')  return state.data.name;
}
```

Literal-Typen (`'loading'`) und Unions beschreiben genau die erlaubten Fälle. Nach einer Prüfung (`state.status === 'error'`) weiß der Compiler, welcher Fall vorliegt (*Narrowing*), und erlaubt nur dessen Felder. Das ist Pattern Matching ohne eigene Syntax, und mit `never` lässt sich Vollständigkeit prüfen.

### 4. Generics und berechnete Typen

```ts
function first<T> (list: T[]): T | undefined { return list[0]; }

type Partial<T>  = { [K in keyof T]?: T[K] };            // mapped type
type Getters<T>  = { [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] };
type Unwrap<T>   = T extends Promise<infer U> ? U : T;   // conditional type
```

Generics machen Typen zu Funktionen über Typen ([generics.md](../types/generics.md)). Darüber hinaus kann man mit Typen *rechnen*: Schlüssel durchlaufen, Strings zusammensetzen, Bedingungen auswerten. Diese Typ-Sprache ist so mächtig, dass Bibliotheken wie [Zod](zod.md) und [ArkType](arktype.md) damit ihre Schemas in statische Typen übersetzen; ArkType parst sogar Strings auf Typ-Ebene.

### 5. Typen ohne TypeScript-Dateien

```js
// @ts-check

/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function area (width, height) { return width * height; }
```

```ts
// index.d.ts next to index.js
export function area (width: number, height: number): number;
```

Drei Wege, JavaScript zu prüfen, ohne `.ts` zu schreiben: **JSDoc**-Kommentare (der Compiler liest sie mit `checkJs`), **Deklarationsdateien** (`.d.ts`) neben dem JavaScript, die nur Typen enthalten, und reine **Inferenz** (der Editor prüft auch unannotiertes JavaScript ein Stück weit). Svelte und Preact schreiben ihren Quellcode so: JavaScript mit Typen in JSDoc oder `.d.ts`.

### 6. Nur entfernen: Type Stripping

```ts
const count: number = 1;   // node, deno, bun: runs as is, the types are blanked out
```

Node (seit 23.6 ohne Flag), Deno und Bun führen `.ts`-Dateien direkt aus, indem sie die Typen durch Leerzeichen ersetzen, ohne zu prüfen. Das geht nur mit Syntax, die sich rein entfernen lässt; Dinge, die Code erzeugen (`enum`, `namespace`, Parameter-Properties), sind ausgeschlossen. Die Option `erasableSyntaxOnly` (seit 5.8) verbietet sie auch im Compiler. Ein TC39-Vorschlag (*Type Annotations*, Stufe 1) will Typ-Syntax als ignorierte Kommentare direkt in JavaScript erlauben.

### 7. TypeScript 7: der Compiler in Go

Der Compiler war bis 6.x selbst in TypeScript geschrieben und lief auf Node. Version 7 („Project Corsa“) ist eine Portierung nach Go: native Binärdateien statt JavaScript, Prüfung über mehrere Kerne, Builds und Editor-Antworten rund zehnmal schneller. Die Sprache bleibt dieselbe; was sich ändert, ist das Werkzeug. Werkzeuge, die die alte JavaScript-API des Compilers benutzen (Vue, Svelte, Astro, MDX für ihre Editor-Unterstützung), warten auf eine stabile API in einer späteren 7.x.

## Wie es intern arbeitet

Der Compiler hat vier Stufen: **Scanner** und **Parser** machen aus dem Quelltext einen Syntaxbaum, der **Binder** legt Symbole und Gültigkeitsbereiche an, der **Checker** (der größte Teil, früher eine einzige Datei mit über 50.000 Zeilen) berechnet für jeden Ausdruck einen Typ und vergleicht, der **Emitter** schreibt JavaScript ohne Typen und, wenn gewünscht, `.d.ts`-Dateien. Der Editor spricht über den Language Server (`tsserver`, in 7.x über LSP) mit demselben Checker; deshalb sind Fehler im Editor und im Build dieselben.

Wichtig für das Verständnis: Der Checker ist **absichtlich nicht vollständig korrekt** (*unsound*). Einige Lücken (`any`, `as`, Array-Zugriffe ohne `undefined`, Bivarianz bei Methoden) sind gewollt, damit typisches JavaScript ohne Umbauten durchgeht. TypeScript garantiert also nicht, dass zur Laufzeit alles stimmt; es fängt die häufigen Fehler.

## Stärken und Schwächen

- **Stark:** findet viele Fehler vor dem Ausführen, zuverlässiges Umbenennen und Navigieren, Autovervollständigung, Schnittstellen sind dokumentiert. Riesiges Ökosystem: fast jede Bibliothek bringt Typen mit. Mit 7.0 auch in großen Projekten schnell.
- **Schwach:** Die Typen sind zur Laufzeit weg (*type erasure*): Daten von außen prüft TypeScript nicht, dafür braucht es zusätzlich Schemas ([Zod](zod.md), [Valibot](valibot.md)). Annotationen auf kleinen Funktionen fühlen sich wie Doppelarbeit an. Die Typ-Sprache ist so mächtig, dass Bibliotheks-Typen unlesbar werden können und Fehlermeldungen seitenlang. Ein Build-Schritt ist nötig (außer mit Type Stripping). Unsound: Ein `as` kann jede Garantie aushebeln.

## Für rat und aufbau

- **Deine bestehende Praxis ist die JSDoc/`.d.ts`-Variante:** JavaScript im Code, `index.d.ts` für die Pakete (so steht es in den Regeln in `agents/code.md`). Das ist genau, wie Svelte und Preact arbeiten, und ergibt für Nutzer der Pakete dieselbe Editor-Hilfe wie TypeScript-Quellcode. Was fehlt, ist nur die Prüfung des eigenen Codes; `// @ts-check` am Dateianfang gäbe sie ohne Umstieg.
- **Schema zuerst, Typ abgeleitet:** Wenn `@rat/types` Schemas als Werte liefert, kann eine `index.d.ts` daraus die statischen Typen ableiten wie Zods `z.infer` (siehe die Typen in `rat/packages/types/index.d.ts`: `Infer<S>`). Der umgekehrte Weg, TypeScript-Typen in Laufzeit-Schemas zu verwandeln, geht nicht, weil die Typen gelöscht werden.
- **Narrowing über Unions ist rats `@switch` mit named cases** in statischer Form. Wenn rat je statische Typen ableitet, ergibt eine Union aus Cases (`Union(loading, failed, done)`) in TypeScript eine diskriminierte Union, und die Vollständigkeitsprüfung käme dazu.
- **`erasableSyntaxOnly` als Maßstab für rats Sugar:** rats `$`, `|>`, `..` erzeugen Code und sind damit das Gegenteil von „nur entfernen“. Das ist in Ordnung, weil rat einen Compiler hat; es heißt aber, dass rat-Dateien nie direkt in Node laufen werden wie `.ts` mit Type Stripping. rats Service-Worker-Idee (d-20) ist die Antwort darauf für den Browser.
