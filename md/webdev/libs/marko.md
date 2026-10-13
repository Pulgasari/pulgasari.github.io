# Marko

eBays UI-Framework, seit 2014 offen, heute bei der OpenJS Foundation. Eine Obermenge von HTML mit eingebautem Zustand, Kontrollfluss als Tags und einem Compiler, der für Server und Browser getrennten Code erzeugt. Marko 6 (April 2025) hat Syntax und Runtime komplett erneuert: die **Tags API** und eine feingranulare Runtime, die nur den Code der wirklich interaktiven Teile ausliefert. Aktuell 6.4.

- Website: https://markojs.com
- Repository: https://github.com/marko-js/marko
- Build: ja (Vite-Plugin, `@marko/run` als App-Framework)

## Das Problem, das Marko löst

eBay rendert große, inhaltslastige Seiten auf dem Server und will, dass sie schnell erscheinen und wenig JavaScript laden. Die üblichen Frameworks hydratisieren die ganze Seite: Der Browser lädt den Code aller Komponenten und führt ihn noch einmal aus, auch für Teile, die nie interaktiv werden. Marko will zwei Dinge gleichzeitig: **HTML streamen**, sobald Teile fertig sind, und **nur den Code ausliefern, der im Browser etwas tut**, ohne dass der Entwickler Islands von Hand markieren muss.

## Kernkonzepte

### 1. HTML mit JavaScript in Attributen

```marko
<h1 title=user.name data-count=items.length + 1>
  Hallo ${user.name}
</h1>
```

Text-Lücken sind `${…}`, Attributwerte sind **rohes JavaScript** ohne Klammern oder Anführungszeichen. Jede `.marko`-Datei ist eine Komponente, der Dateiname ist der Tag-Name: `tags/product-card.marko` wird überall als `<product-card>` gefunden, ohne Import.

### 2. Zustand als Tag: `<let>` und `<const>`

```marko
<let/count=0>
<const/double=count * 2>

<button onClick() { count++ }>
  ${count} × 2 = ${double}
</button>
```

`<let/name=…>` legt eine Zustandsvariable an (der Schrägstrich bindet den Namen), `<const/name=…>` einen abgeleiteten Wert, der sich selbst neu berechnet. Geändert wird per Zuweisung im Handler. Keine Hooks, kein `setState`. Wie in rat: kein In-Place-Mutieren, `items.push(x)` aktualisiert nichts, man weist neu zu (`items = items.concat(x)`).

### 3. Tag-Variablen: was ein Tag zurückgibt

Der `/name` ist allgemein: jeder Tag kann einen Wert zurückgeben.

```marko
<input/field>                                 <!-- field() returns the element -->
<toggle-section/open title="A">…</toggle-section>
<p>${open ? 'offen' : 'zu'}</p>
```

In der Kind-Komponente steht `<return=open>`. Der Elternteil bekommt den Wert als normale reaktive Variable. Das ersetzt Refs, Callbacks nach oben und viele Fälle von Context.

### 4. Zwei-Wege-Bindung mit `:=`

```marko
<let/text="">
<input value:=text>                           <!-- value=text valueChange(v) { text = v } -->
<input type="number" value:parseFloat:=n>     <!-- with a transform -->
```

`value:=text` ist die Kurzform für Wert plus Änderungs-Handler. Ohne `valueChange` sind native Inputs unkontrolliert (der Wert ist nur der Startwert), mit ihm kontrolliert. Das gilt einheitlich für eigene Komponenten: `<let/count:=input.count>` macht ein Kind kontrollierbar, wenn der Elternteil einen Handler mitgibt, sonst hält es seinen eigenen Zustand.

### 5. Kontrollfluss als Tags

```marko
<if=items.length>
  <ul>
    <for|item, index| of=items by="id">
      <li>${item.title}</li>
    </for>
  </ul>
</if>
<else>
  <p>Nichts da</p>
</else>

<for|i| from=0 until=5>${i}</for>             <!-- 0..4, to= is inclusive -->
<for|key, value| in=settings>${key}</for>     <!-- object entries -->
<show=open>stays mounted while hidden</show>
```

`<for>` hat die Schleifenvariablen zwischen `|…|`, den Schlüssel als `by=`, und eingebaute Zahlenbereiche (`from`/`to`/`until`/`step`). `<show>` versteckt statt zu zerstören und behält dabei den Zustand.

### 6. Async mit Streaming

```marko
<try>
  <await|user|=getUser(id)>
    <h2>${user.name}</h2>
  </await>
  <@placeholder>Lädt …</@placeholder>
  <@catch|error|>${error.message}</@catch>
</try>
```

Auf dem Server wird der Platzhalter sofort geschickt und die Seite weitergestreamt; sobald das Promise erfüllt ist, folgt der Inhalt im selben Response und wird an die richtige Stelle gesetzt. Im Browser funktioniert dasselbe Tag mit neuen Promises.

### 7. Inhalt und benannte Bereiche

```marko
<!-- parent -->
<my-card>
  <@header>Titel</@header>
  Text im Rumpf
</my-card>

<!-- tags/my-card.marko -->
<div class="card">
  <header><${input.header.content}/></header>
  <${input.content}/>
</div>
```

Attribute kommen als `input` an. Der Rumpf ist `input.content`, Bereiche mit `@` heißen **Attribute Tags**. Ein Kind kann seinem Rumpf Werte mitgeben (`<${input.content}(x)/>`), der Elternteil empfängt sie mit `<my-tag|x|>`.

### 8. Effekte, Lifecycle, Styles

```marko
<div/el/>
<script>
  el().focus();
  const id = setInterval(tick, 1000);
  $signal.onabort = () => clearInterval(id);  // cleanup through an AbortSignal
</script>

<style/styles>
  .card { padding: 1rem; }
</style>
<div class=styles.card/>
```

`<script>` ist kein HTML-Script, sondern ein reaktiver Effekt, der nur im Browser läuft und neu läuft, wenn gelesener Zustand sich ändert. Aufräumen über `$signal`, ein `AbortSignal`. Für Fremdbibliotheken gibt es `<lifecycle onMount onUpdate onDestroy>`. `<style>` ist globales CSS, `<style/styles>` CSS-Module.

### 9. Lazy Loading per Import-Attribut

```marko
import PriceChart from "<price-chart>" with { load: "visible#chart" }

<div#chart><PriceChart symbol=input.symbol/></div>
```

Der Code des Tags wird erst geladen, wenn `#chart` sichtbar wird (`idle`, `media(…)`, `on-click#sel` gehen auch). Der Server rendert ihn trotzdem sofort.

### 10. Concise Mode

Marko kann auch ohne spitze Klammern, über Einrückung:

```marko
ul.list
  for|item| of=items by="id"
    li -- ${item.title}
```

Dieselbe Idee wie htx' Tag-Selektoren und rats eingerückte Blockrümpfe.

## Wie es intern arbeitet

Der Compiler analysiert, welche Werte sich ändern können und welche DOM-Stellen davon abhängen. Daraus entstehen **zwei Ausgaben**:

- **Server:** eine Streaming-Funktion, die HTML-Strings schreibt, mit Markern an den reaktiven Stellen.
- **Browser:** nur die Teile, die auf Zustand reagieren oder Handler haben, als feingranularer Signal-Graph. Statische Teile erzeugen gar keinen Code.

Es gibt keine klassische Hydration: Der Browser rendert nichts noch einmal, er verbindet die Marker im Server-HTML mit dem Graphen und serialisiert nur den nötigen Zustand. Das entspricht dem, was Qwik "Resumability" nennt, hier automatisch aus der Template-Analyse. Events laufen delegiert, Handler bekommen `(event, element)`.

## Stärken und Schwächen

- **Stark:** sehr wenig JavaScript im Browser ohne manuelle Islands, echtes HTML-Streaming mit `<await>`, durchdachte Formular-Semantik (kontrolliert/unkontrolliert), Tag-Variablen als einheitliches Konzept für Refs, Rückgaben und Zustand.
- **Schwach:** eigene Syntax mit Fallen (ein `>` direkt nach einem Operanden im Attribut beendet den Tag: `disabled=n>=8` bricht), immer ein Build nötig, Typprüfung braucht ein eigenes Werkzeug (`mtc`, `tsc` überspringt `.marko`), kleines Ökosystem außerhalb von eBay, Marko 6 ist zu Marko 5 inkompatibel.

## Für rat und aufbau

Marko ist das Framework, das rat am nächsten steht. Vieles ist dieselbe Entscheidung auf anderem Weg:

| Marko | rat | Bemerkung |
|---|---|---|
| `<let/count=0>` | `let $count = 0` | Marko macht Zustand zum Tag, rat zum Namen |
| `<const/double=…>` | `const $double = …` | gleiche Unterscheidung: `let` setzt einen Startwert, `const` rechnet nach |
| `<if=…>` / `<else>` | `@if (…)` / `@else` | Tag gegen Direktive |
| `<for\|item\| of=items by="id">` | `@for (item of $items)` | Marko hat den Schlüssel im Kopf, bei rat offen |
| `<for\|i\| from=0 to=4>` | `@for (i of 0..4)` | rat über Ranges (Entscheidungen d-05 bis d-07) |
| `<await>` + `<@placeholder>` + `<@catch>` | `@await` (d-28 offen) | Markos Form entspricht Variante b: Wert im Kopf, Platzhalter und Fehler als Klauseln |
| `$signal.onabort` im Effekt | Cleanup-Rückgabe | ein `AbortSignal` ist der Plattform-Weg, passt zu aufbaus `signal` |
| `value:=text` | `bind:value={$text}` | `:=` ist kürzer und funktioniert auch für Komponenten-Props |
| Concise Mode | eingerückte Rümpfe | beide erlauben Einrückung statt Schließ-Tags |

Was rat übernehmen könnte:

- **Tag-Variablen / `<return>`:** eine Komponente gibt einen Wert an den Elternteil zurück, der dort ein normales Signal ist. Löst Refs und "Kind meldet Zustand nach oben" mit einem Konzept.
- **`<show>` neben `@if`:** ein Block, der versteckt statt zerstört. Billig zu bauen, oft gebraucht (Tabs, Drafts).
- **`static`:** Werte, die pro Modul statt pro Instanz existieren. rat hat dafür `<script module>`, Marko markiert einzelne Deklarationen.
- **Lazy Loading per Import-Attribut (`with { load: 'visible' }`):** passt zu aufbaus Autoloader, nur deklarativ an der Verwendungsstelle.
- **Die Compiler-Analyse für den Browser-Code** ist das Fernziel von rats `dom:clone`- und `ssr`-Targets: statische Teile erzeugen keinen Code.

Und für aufbau: Markos Handler-Signatur `(event, element)` bei delegierten Events ist exakt die von `Selection.on`.
