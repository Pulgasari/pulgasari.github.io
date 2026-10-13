# TSRX

**TypeScript Render Extensions:** eine Spracherweiterung von TypeScript für Oberflächen, gedacht als „geistiger Nachfolger von JSX". Von Dominic Gannaway (früher React- und Svelte-Core, Autor von Inferno, Lexical und Ripple). Herausgelöst aus dem Framework Ripple und framework-neutral gemacht. Status: aktive Beta.

- Website: https://tsrx.dev
- Repository: https://github.com/tsrx-org/tsrx
- Build: ein Compiler-Plugin pro Ziel (Vite, Rspack, Turbopack, Bun)

> Von allen Bibliotheken in diesem Ordner die nächste Verwandte von rat. Fast dieselbe Kontrollfluss-Syntax, unabhängig entstanden.

## Worum es geht

JSX ist ausdrucksbasiert: Kontrollfluss muss als Ausdruck geschrieben werden, also Ternaries (`cond ? a : b`), `&&` und `.map()`. TSRX ist **anweisungsbasiert**: Eine Komponente ist eine Funktion, in deren Rumpf Setup-Code und Markup nebeneinander stehen, und Kontrollfluss hat eigene Direktiven. Eine `.tsrx`-Datei compiliert in **mehrere Ziele**: React, Preact, Solid, Vue, Hono, Ripple und Octane.

## Kernkonzepte

### 1. Komponenten mit Statement-Container `@{ … }`

```tsx
export function TodoList({ items }: { items: Todo[] }) @{
  const visibleItems = items.filter((item) => !item.hidden);

  <>
    <ul>
      @for (const item of visibleItems; index i; key item.id) {
        <li>{i + 1}. {item.title}</li>
      } @empty {
        <li>Noch keine Todos</li>
      }
    </ul>

    <style>
      ul { display: grid; gap: 0.5rem; }
    </style>
  </>
}
```

Der Rumpf nach `@{` ist ein Container: oben normaler TypeScript-Code, darunter das Markup, das zurückgegeben wird. Kein `return (…)`. Ein `@{ … }` im Markup öffnet einen neuen Gültigkeitsbereich für lokale Variablen:

```tsx
function App() @{
  const name = 'Welt';
  <div>
    @{
      const greeting = 'Hallo, ' + name + '!';
      <p>{greeting}</p>
    }
  </div>
}
```

### 2. Kontrollfluss-Direktiven

```tsx
@if (status === 'active') {
  <span>Online</span>
} @else if (status === 'idle') {
  <span>Abwesend</span>
} @else {
  <span>Offline</span>
}

@switch (status) {
  @case 'loading': { <p>Lädt …</p> }
  @case 'success': { <p>Fertig!</p> }
  @default:        { <p>Unbekannt.</p> }
}
```

`@for` kennt Index und Key direkt im Kopf (`; index i; key item.id`), und `@empty` für die leere Liste.

### 3. Fehler- und Ladegrenzen: `@try`

```tsx
@try {
  <UserProfile id={userId} />
} @pending {
  <p>Lädt …</p>
} @catch (error, reset) {
  <p>Fehler: {error.message}</p>
  <button onClick={() => reset()}>Nochmal</button>
}
```

Eine Error Boundary und eine Suspense-Grenze als eine Direktive. `reset` setzt die Grenze zurück.

### 4. Kurzschreibweisen

```tsx
<Input value={value} onChange={onChange} />   // instead of repeating the name
<Input {value} {onChange} />                  // the shorthand
```

Dynamische Elemente mit `<{as}>…</{as}>`, Komponenten als Variable mit `<{Body} />`.

### 5. Geschwister-gescopte Styles

Ein `<style>`-Block gilt für seine **Geschwister und alles darunter**, sonst nichts. Der Compiler hängt diesen Elementen eine Hash-Klasse an und schreibt die Selektoren darauf um (`.card` wird zu `.card.tsrx-1a2b3c4d`). `@layer`, `@keyframes` (umbenannt, oder global mit `-global-`) und `:global(…)` werden unterstützt.

### 6. Themes als Werte

```tsx
export const theme = <style>
  div { color: green; }
  .dark { color: purple; }
</style>;

// theme.$class -> 'tsrx-1a2b3c4d'
// theme.dark   -> 'tsrx-1a2b3c4d dark'

<Badge class={theme.dark} />
```

Ein zugewiesener `<style>`-Block ist ein Theme: ein Wert mit Klassennamen, der an Kindkomponenten weitergegeben und mit `<style apply={theme} />` kombiniert werden kann.

### 7. Plattform-Weichen zur Compile-Zeit

```ts
if (import.meta.env.platform.ios) { … }
```

Ein `if` auf genau eine Plattform-Flag (`web`, `ios`, `android`) wird vor der Analyse entfernt, wenn die Plattform nicht passt: Code, Imports und Styles der anderen Plattformen landen nicht im Build.

### 8. Tooling von Anfang an

Language Server, TypeScript-Plugin, Prettier, ESLint, Erweiterungen für VS Code, Zed, JetBrains, Neovim und Sublime Text.

## Wie es intern arbeitet

TSRX parst eine `.tsrx`-Datei in einen framework-neutralen AST und übergibt ihn einem Ziel-Compiler (`@tsrx/react`, `@tsrx/solid` …), der idiomatischen Code für dieses Framework erzeugt. Für TypeScript wird eine virtuelle `.ts`-Fassung erzeugt, damit Typprüfung und Editor-Hilfe funktionieren.

## Stärken und Schwächen

- **Stark:** Kontrollfluss liest sich wie Code, nicht wie verschachtelte Ausdrücke. Ein Quelltext, viele Frameworks. Ernsthaftes Tooling. Erfahrener Autor.
- **Schwach:** Beta, Syntax kann sich noch ändern. Bindet an TypeScript. Ein weiterer Compile-Schritt vor dem eigentlichen Framework.

## Für rat und aufbau

TSRX ist unabhängig zu fast denselben Antworten gekommen wie rat, was die Richtung bestätigt. Die Unterschiede sind die interessanten Stellen:

| | TSRX | rat |
|---|---|---|
| leere Liste | `@for … @empty { }` | `@for … @else { }` |
| Index, Key | `@for (const item of list; index i; key item.id)` | `@for (item, index of list)`, Key geplant als `; key item.id` |
| Laden, Fehler | `@try / @pending / @catch` | `@await` geplant, `@pending` als Variante in d-28 |
| Kurzform für Props | `{value}` | `{value}` (gleich) |
| Blockformen | nur Klammern | Klammern, Einrückung, Einzeiler |
| Styles | Geschwister-Scope per Hash-Klasse | `@scope` nativ, ohne Selektor-Umschreiben |
| Themes | `<style>` als Wert mit `$class` | noch nichts |
| Ziel | React, Solid, Vue … | eigene Runtime |
| Sprache | TypeScript | JavaScript |

Übernehmenswert:

- **`@pending` und `@catch` in einem Block** (`@try`) passt zu d-28 Variante b.
- **`; index i; key item.id` im `@for`-Kopf** ist eine lesbare Form für Index und Key, die rats geplante Key-Syntax bestätigt.
- **Themes als Werte** sind eine gute Idee für rat-Styles: ein `<style>`, das man exportiert und an Kinder weiterreicht, statt globaler Klassen.
- **Plattform-Weichen zur Compile-Zeit** passen zu zugriff (Web vs. Capacitor/Android).
