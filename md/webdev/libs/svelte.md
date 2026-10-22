# Svelte

Ein Compiler für Komponenten: `.svelte`-Dateien mit Script, Markup und Style werden beim Bauen zu kleinem JavaScript, das das DOM direkt aktualisiert. Kein Virtual DOM, keine große Laufzeit. Von Rich Harris, seit November 2016; Svelte 3 (2019) machte es bekannt, Svelte 5 (Oktober 2024) ersetzte die alte Reaktivität durch Signals unter dem Namen *Runes*. Aktuell 5.57 (Oktober 2026), aktiv, mit SvelteKit als Anwendungs-Framework.

- Website: https://svelte.dev
- Repository: https://github.com/sveltejs/svelte
- Build: ja (Compiler, meist über Vite)

## Das Problem, das Svelte löst

Frameworks wie React liefern zur Laufzeit eine Maschine aus, die herausfindet, was sich geändert hat (Virtual DOM, Vergleich). Svelte sagt: Das weiß man schon beim Compilieren. Wenn im Code steht, dass `count` in einem Textknoten landet, kann der Compiler genau die Zeile erzeugen, die diesen Knoten schreibt. Das Framework verschwindet weitgehend im Build, übrig bleibt gezielter Code.

## Kernkonzepte

### 1. Eine Datei, drei Teile

```svelte
<script>
  let count = $state(0);
  const double = $derived(count * 2);
</script>

<button onclick={() => count++}>{count} · {double}</button>

<style>
  button { font-weight: 700; }   /* scoped to this component */
</style>
```

Script, Markup mit `{…}`-Löchern, Style. Styles gelten nur in der Komponente (der Compiler hängt eine Klasse an). Event-Handler sind seit Svelte 5 normale Attribute (`onclick`), nicht mehr `on:click`.

### 2. Runes: Signals mit Compiler-Hilfe

| Rune | macht |
|---|---|
| `$state(0)` | ein Signal; Objekte und Arrays werden tief reaktiv (Proxy) |
| `$state.raw(x)` | ein Signal ohne Proxy: nur Neuzuweisung zählt |
| `$derived(expr)`, `$derived.by(fn)` | ein Computed |
| `$effect(fn)`, `$effect.pre(fn)` | ein Effekt, nach bzw. vor dem DOM-Update |
| `$props()` | die Props der Komponente, destrukturierbar |
| `$bindable()` | eine Prop, die das Elternteil per `bind:` zurückbekommt |
| `$inspect(x)` | loggt bei jeder Änderung (nur in Entwicklung) |

Runes sehen aus wie Funktionsaufrufe, sind aber Schlüsselwörter für den Compiler: `let count = $state(0)` wird zu einem Signal, und jedes `count` danach zu einem Lese- oder Schreibzugriff darauf. Man schreibt `count++`, der Compiler macht `set(count, get(count) + 1)`. Runes gehen auch in `.svelte.js`-Dateien, also in normalen Modulen.

### 3. Blöcke im Markup

```svelte
{#if user}
  <p>{user.name}</p>
{:else}
  <Login />
{/if}

{#each todos as todo (todo.id)}
  <li>{todo.title}</li>
{:else}
  <li>nichts zu tun</li>
{/each}

{#await load(id)}
  <p>lädt …</p>
{:then user}
  <p>{user.name}</p>
{:catch error}
  <p>{error.message}</p>
{/await}
```

Kontrollfluss steht im Markup, mit eigener Syntax (`{#…}`, `{:…}`, `{/…}`). Ein Schlüssel in Klammern hält Zeilen beim Umsortieren fest.

### 4. Snippets, Attachments, Bindings

```svelte
{#snippet row(item)}
  <tr><td>{item.name}</td><td>{item.price}</td></tr>
{/snippet}

{#each fruits as fruit}{@render row(fruit)}{/each}

<div {@attach tooltip('speichern')}>…</div>
<input bind:value={name} />
```

Snippets sind Markup mit Parametern (rats `@fragment`).

Attachments (`{@attach fn}`, seit 5.29) bekommen das Element, wenn es erscheint, und geben eine Aufräumfunktion zurück; sie ersetzen die älteren Actions (`use:`). 

`bind:` verbindet Formularwerte in beide Richtungen.

### 5. Async (experimentell)

Mit `experimental.async` in den Compiler-Optionen darf `await` direkt im Script und im Markup stehen; die Komponente wartet, ein `<svelte:boundary>` zeigt solange einen Platzhalter, `$effect.pending()` meldet laufende Arbeit. Noch nicht Standard.

## Wie es intern arbeitet

Der Compiler parst die Datei in drei Bäume (Script über Acorn, Markup und Style mit eigenem Parser), analysiert, welche Namen Runes sind und wo sie gelesen werden, und erzeugt eine Funktion pro Komponente. Das statische Markup wird als Template-String einmal geparst und geklont (`$.from_html`), jedes Loch wird ein `template_effect`, der einen Knoten schreibt. Eine kleine Zähler-Komponente mit Liste, Bedingung und Binding wird zu rund 40 Zeilen Ausgabe; zusammen mit der Laufzeit, die sie braucht, 20 kb (gzip).

Die Signals in Svelte 5 sind ein Push-Pull-Graph mit Versionen, ähnlich [alien-signals](alien-signals.md); `$state` mit Objekten legt einen Proxy an, bei dem jede Eigenschaft ein eigenes Signal ist.

## Stärken und Schwächen

- **Stark:** sehr lesbare Komponenten (am wenigsten Boilerplate der großen Frameworks), feingranulare Updates ohne VDOM, Styles eingebaut und gescoped, Runes auch außerhalb von Komponenten, starkes Gesamtpaket mit SvelteKit.
- **Schwach:** ohne Compiler nicht nutzbar. Runes sind „Magie“, die nur in `.svelte`- und `.svelte.js`-Dateien gilt: dieselbe Zeile bedeutet woanders etwas anderes. Die Laufzeit ist größer geworden als zu Svelte-3-Zeiten (20 kb für eine kleine App). Der Umstieg von Svelte 4 auf 5 war für viele Projekte groß.

## Für rat und aufbau

- **rat ist im Aufbau ein Svelte:** Single-File-Komponente mit `<script>`, Markup und `<style>`, Compiler statt VDOM, Template klonen, Löcher als Effekte. Die Tabelle in `rat/.md/concept.md` nennt Svelte schon als Quelle.
- **Runes gegen `$`:** Svelte markiert Signals bei der Deklaration (`$state(0)`) und lässt den Namen danach normal aussehen (`count++`). rat markiert den **Namen** (`$count`), überall. Sveltes Weg ist kürzer, rats Weg sichtbarer: In rat sieht man jedem Zugriff an, dass er reaktiv ist (dieselbe Abwägung wie bei [MobX](mobx.md)).
- **`$state.raw` gegen `$state`** ist d-23 als Schalter: tiefer Proxy oder nur Neuzuweisung. Svelte bietet beides an, mit tief als Standard. rats Empfehlung (Typen aus `@rat/types` mit eigenen Methoden) liegt dazwischen.
- **Snippets = `@fragment`, Attachments = Behaviors:** Svelte hat beide Ideen in derselben Reihenfolge entwickelt. Dass Svelte 5.29 `use:` durch `{@attach}` ersetzt hat, weil Actions nicht auf Wertänderungen reagierten und nicht an Komponenten weitergegeben werden konnten, bestätigt rats Behavior-Modell (Funktion, die bei neuem Wert erneut läuft, auch als Prop weitergebbar). Für d-26 heißt das: Die Form `@name` steht Sveltes `{@attach}` näher als `use:`.
- **`{#await}` mit `{:then}` und `{:catch}`** ist Variante a von d-28. Svelte selbst bewegt sich mit `experimental.async` davon weg, hin zu `await` direkt im Code, wie [SolidJS](solidjs.md) 2.0.
