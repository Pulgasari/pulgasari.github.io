# _hyperscript

Eine kleine Skriptsprache für das Web, die direkt im HTML-Attribut `_` steht. Vom selben Team wie [htmx](htmx.md) (Big Sky Software), inspiriert von HyperTalk, der Sprache von Apples HyperCard (1987). Das Motto: *the underscore is silent*.

- Website: https://hyperscript.org
- Build: keiner, ein `<script>` reicht (auch als ESM: `import _hyperscript from 'hyperscript.org'`)

## Worum es geht

htmx kümmert sich um den Datenaustausch mit dem Server. Für die kleinen Dinge im Browser (eine Klasse umschalten, etwas ausblenden, nach zwei Sekunden entfernen) bräuchte man trotzdem JavaScript. _hyperscript schreibt genau diese Dinge als lesbare Sätze ans Element:

```html
<button _="on click toggle .clicked">schalte .clicked an mir um</button>

<button _="on click call alert('jep!') then wait 2s then remove me">
  klick mich
</button>
```

## Kernkonzepte

### 1. Code steht am Element, in Sätzen

Ein Skript besteht aus *Features* (etwa einem Event-Handler), die *Commands* enthalten, die *Expressions* enthalten:

```html
<div _="
  set :count to 0
  on click
    increment :count
    put :count into me
  end
">0</div>
```

`me` / `my` / `I` ist das aktuelle Element, `it` / `result` das Ergebnis des letzten Commands, `event` und `target` das aktuelle Event.

### 2. Event-Handler mit eingebauten Modifiern

```
on click ...
on click from #other ...                     -- listen on another element
on keyup[key is 'Escape'] ...                -- an event filter in brackets
on click debounced at 300ms ...
on click throttled at 500ms ...
on mutation of @class ...                    -- mutationobserver
on intersection(intersecting) having threshold 0.5 ...
on every click ...                           -- runs concurrently
on click queue all ...                       -- queue: all, first, last (default), none
```

Bemerkenswert: `on keyup[key is 'Escape']` ist fast dieselbe Form wie rats `on:keydown[escape]`.

### 3. Asynchronität verschwindet

Promises werden automatisch abgewartet, ohne `await`. _hyperscript nennt das *async transparency*:

```
fetch /api/data as JSON          -- waits on its own
wait 2s
wait for click or 5s             -- an event or a timeout
```

Damit liest sich ein Ablauf über Zeit wie ein normales Skript von oben nach unten.

### 4. DOM-Literale

```
#myId           -- an element by id
.myClass        -- every element with the class
<div.foo/>      -- a css query
@name           -- an attribute of me
*color          -- a style property
```

Dazu Lageangaben in Worten: `closest <form/>`, `next <input/> from me`, `first in <li/>`.

### 5. Commands für das DOM

```
add .active to me
remove .active from #target
toggle between .on and .off
take .active from .tabs for me      -- move a class between elements
put "hallo" at end of me
show me / hide me / remove me
```

### 6. Variablen mit Reichweite

```
set x to 1        -- local, this handler only
set :x to 1       -- element scoped, survives between handler calls
set ^x to 1       -- dom scoped, looked up the tree of parents
set $x to 1       -- global
```

### 7. Behaviors und Funktionen

```
behavior Removable(removeButton)
  on click from removeButton
    remove me
  end
end
```

Ein Behavior ist ein wiederverwendbares Paket von Handlern: `<div _="install Removable(removeButton: #close)">`. Dazu `def name() … end` für Funktionen und `tell #target … end`, um einen Block auf ein anderes Element zu richten.

### 8. Reaktivität (neuer)

```
live put $count into me          -- runs again when $count changes
when $x changes log it end
bind my value to #slider's value -- two-way
```

## Wie es intern arbeitet

Beim Laden sucht _hyperscript alle Elemente mit `_`-Attribut, parst den Text mit einem eigenen Parser in einen Syntaxbaum und führt ihn mit einem eigenen Interpreter aus. Neue Elemente werden über einen `MutationObserver` erfasst. Die Async Transparency entsteht im Interpreter: Gibt ein Command ein Promise zurück, pausiert er und macht danach weiter.

## Stärken und Schwächen

- **Stark:** sehr lesbar, gerade für Ereignis-Abläufe über Zeit (`wait`, `then`, Queue-Strategien). Kein Build, passt perfekt zu htmx und serverseitig gerendertem HTML.
- **Schwach:** eine komplette eigene Sprache, die man lernen muss und die kein JavaScript-Tooling versteht. Fehler fallen erst zur Laufzeit auf. Für größere Logik ungeeignet.

## Für rat und aufbau

- **Event-Filter in Klammern** (`on keyup[key is 'Escape']`) bestätigen rats Key-Filter-Form.
- **Debounce, Throttle und Queue-Strategien** als Teil der Event-Deklaration sind gute Kandidaten für weitere rat-Modifier: `on:input:debounce(300)`, `on:click:queue(last)`.
- **Variablen-Reichweiten** (`:x` am Element, `^x` den Baum hinauf) sind eine interessante Parallele zu rats `$`-Signals im `<script module>` (geteilt) und im `<script>` (pro Instanz). `^x` entspricht ungefähr Context.
- **Async Transparency** ist der Kern von `@await` und von Elixirs `with` in den rat-Ideen: Abläufe über Zeit sollen sich wie normaler Code von oben nach unten lesen.
