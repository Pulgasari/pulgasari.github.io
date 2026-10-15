# morphdom und idiomorph

Zwei Bibliotheken für **DOM-Morphing**: einen bestehenden DOM-Baum so an einen neuen angleichen, dass möglichst viele Knoten erhalten bleiben, statt ihn mit `innerHTML` zu ersetzen. **morphdom** ist das Original, von Patrick Steele-Idem (auch Autor von [Marko](marko.md)), seit Juni 2015, aktuell 2.7.8 (Januar 2026), in Wartung. **idiomorph** ist der Nachfolger von Big Sky Software (Carson Gross, [htmx](htmx.md)), seit 2022, aktuell 0.8.0 (September 2026), aktiv. Turbo 8 und [Datastar](datastar.md) morphen mit idiomorph (Datastar mit einer eigenen Portierung), Phoenix LiveView mit morphdom.

- morphdom: https://github.com/patrick-steele-idem/morphdom
- idiomorph: https://github.com/bigskysoftware/idiomorph
- Abhängigkeiten: keine
- Build: keiner nötig

## Das Problem, das Morphing löst

Wer HTML als String erzeugt (auf dem Server oder im Browser mit Template-Strings), hat zum Einsetzen nur `innerHTML` oder `replaceWith`. Beides wirft den alten Baum weg: Fokus und Cursor-Position gehen verloren, Eingaben in Formularfeldern, Scroll-Position in Containern, laufende CSS-Transitions, offene `<details>`, abgespielte Videos, angehängte Event-Listener und der Zustand von Custom Elements. Für Ersatz ganzer Seiten ist das hinnehmbar, für ein Update alle paar Sekunden nicht.

React löste das 2013 mit dem Virtual DOM: neuen Baum als Objekte bauen, mit dem alten vergleichen, nur Unterschiede schreiben. Morphing macht dasselbe, aber **mit echtem DOM auf beiden Seiten**: Der neue Inhalt wird geparst (in ein `<template>` oder ein abgetrenntes Element), und der Vergleich läuft gegen den echten, lebenden Baum. Kein Komponentenmodell, kein JSX, nur „mach dieses Element so wie jenes“.

## Kernkonzepte

### 1. Die API ist ein Aufruf

```js
import morphdom      from 'morphdom';
import { Idiomorph } from 'idiomorph';

morphdom(list, '<ul id="list"><li>a</li><li>b</li></ul>');               // morphdom: outer by default
morphdom(list, newList, { childrenOnly: true });

Idiomorph.morph(list, '<li>a</li><li>b</li>', { morphStyle: 'innerHTML' });   // idiomorph
```

Beide nehmen einen bestehenden Knoten und entweder einen String oder einen Knoten. morphdom ersetzt standardmäßig das Element selbst (`outerHTML`), `childrenOnly` nur die Kinder; idiomorph dasselbe über `morphStyle`.

### 2. Was erhalten bleibt

Ein Knoten, der im neuen Baum an derselben Stelle denselben Tag hat, wird **angepasst statt ersetzt**: Attribute werden gesetzt und entfernt, Textknoten aktualisiert, Kinder rekursiv weiter gemorpht. Das Element ist danach dasselbe Objekt, mit denselben Listenern, derselben Scroll-Position und demselben Fokus. Formularwerte bekommen eine Sonderbehandlung (`value`, `checked`, `selected` werden als Property, nicht nur als Attribut übertragen).

### 3. Ids als Anker

```html
<!-- before -->              <!-- after -->
<ul>                         <ul>
  <li id="a">A</li>            <li id="c">C</li>
  <li id="b">B</li>            <li id="a">A</li>
</ul>                          <li id="b">B</li>
                             </ul>
```

Ohne Ids würde Position für Position verglichen: aus A wird C, aus B wird A, B wird neu angelegt. Mit Ids erkennt das Morphing, dass A und B nur verschoben sind und C neu ist. Ids sind hier, was Keys im Virtual DOM sind. morphdom erlaubt einen eigenen Schlüssel (`getNodeKey: node => node.dataset?.key`), idiomorph arbeitet nur mit Ids.

### 4. idiomorphs Id-Sets

Die Schwäche von morphdom: Es sieht nur die Ids der direkten Geschwister. In typischem HTML haben aber die Container keine Id, nur die Blätter darin:

```html
<div class="row"><p id="p1">A</p></div>
<div class="row"><p id="p2">B</p></div>
```

Werden die Zeilen vertauscht, sieht morphdom zwei Divs ohne Id an denselben Positionen und tauscht deren Inhalt aus: Beide `<p>` werden abgehängt und neu eingesetzt. idiomorph berechnet vorher für jedes Element die **Menge aller Ids in seinem Teilbaum**. Zwei Elemente passen zusammen, wenn sich ihre Mengen überschneiden; das erste Div „enthält“ also `p1` und wird als Ganzes verschoben. Ergebnis: weniger Knoten werden bewegt, Zustand in den Blättern bleibt erhalten. Laut eigener Messung ist idiomorph bei großen Bäumen dafür rund 10 % langsamer.

### 5. Callbacks: Eingreifen pro Knoten

```js
morphdom(root, next, {
  onBeforeElUpdated: (from, to) => !from.isEqualNode(to),           // skip identical subtrees
  onBeforeNodeDiscarded: node => !node.hasAttribute?.('data-keep'),
});

Idiomorph.morph(root, next, {
  callbacks: { beforeNodeMorphed: (old, next) => !old.matches?.('video') },
  ignoreActiveValue: true,                                           // keep what the user is typing
});
```

Mit `false` aus einem `before…`-Callback bleibt ein Knoten unangetastet: ein Video, ein Editor, eine Karte, ein Element einer Fremdbibliothek. Der `isEqualNode`-Trick aus der morphdom-Doku überspringt gleiche Teilbäume ohne Abstieg.

### 6. `<head>` und ganze Seiten

idiomorph kann auch den `<head>` zusammenführen (`head: { style: 'merge' }`): Stylesheets und Skripte, die bleiben, werden nicht neu geladen, neue angehängt, alte entfernt. Damit lassen sich ganze Seitenwechsel morphen (Turbo 8 „page refreshes“), ohne Flackern durch neu geladenes CSS.

### 7. `moveBefore`

idiomorph 0.7 und Datastar nutzen `Element.prototype.moveBefore()`, wo der Browser es kennt: ein Verschieben im DOM, *ohne* den Knoten vorher abzuhängen. Bei `insertBefore` verliert ein verschobenes Element Fokus, ein `<iframe>` lädt neu, eine Animation beginnt von vorn, ein Custom Element bekommt `disconnected`/`connected`. Mit `moveBefore` nicht. Erst damit ist „Verschieben statt Neuanlegen“ wirklich zustandserhaltend. idiomorph schiebt Knoten, deren Ziel noch nicht feststeht, solange in eine versteckte „Pantry“ und holt sie von dort.

## Wie es intern arbeitet

**morphdom** läuft einmal über den alten Baum und legt eine Tabelle `key -> Element` an. Dann werden Kinder paarweise verglichen: Gleicher Schlüssel oder gleicher Tag ohne Schlüssel heißt „morphen“, ein Schlüssel, der woanders in der Tabelle steht, heißt „von dort holen“, sonst neu anlegen. Was am Ende übrig ist und keinen Schlüssel hat, wird entfernt; Elemente mit Schlüssel erst, wenn sie im neuen Baum gar nicht mehr vorkommen.

**idiomorph** berechnet zuerst die Id-Sets für alten und neuen Baum (ein `querySelectorAll('[id]')` und pro Element ein Weg nach oben). Persistente Ids sind die, die auf beiden Seiten vorkommen. Beim Abgleich der Kinder sucht es für jedes neue Kind den besten alten Kandidaten: erst ein Id-Set-Treffer, dann ein „weicher“ Treffer (gleicher Tag, keine widersprechenden Ids), wobei es nur ein kurzes Stück vorausschaut, damit der Abgleich linear bleibt. Knoten mit persistenten Ids werden notfalls aus der Pantry oder von einer späteren Stelle geholt.

Beide parsen zuerst den neuen String; das ist bei großen Fragmenten der teuerste Teil, nicht der Vergleich. Und beide vergleichen den ganzen Teilbaum, auch wenn sich nur ein Wort geändert hat: Kosten wachsen mit der Größe des Fragments, nicht mit der Größe der Änderung.

## Stärken und Schwächen

- **Stark:** macht `innerHTML`-Rendering zustandserhaltend, ohne Komponentenmodell und ohne Build. Klein (morphdom 2,2 kb, idiomorph 3,7 kb). Funktioniert mit HTML von überall: Server, Template-Strings, `fetch`. Callbacks erlauben, Inseln (Editoren, Videos) unangetastet zu lassen.
- **Schwach:** Arbeit proportional zur Größe des Fragments, nicht der Änderung: ein Zähler in einer großen Liste kostet Parsen und Vergleich der ganzen Liste. Ohne Ids (oder Keys) wird bei Umsortierungen viel unnötig neu angelegt. Zustand, der nur in JavaScript lebt (Properties von Custom Elements, Objekte an Knoten), weiß nichts vom Morphing. Was „derselbe Knoten“ ist, bleibt eine Heuristik.

## Für rat und aufbau

- **`@aufbau/element` hat noch den String-Pfad mit `innerHTML`.** Template-Results laufen inzwischen über `@domina/render` (Weg b aus [lit-vs-aufbau.md 16.5](../../analyze/lit-vs-aufbau.md)), ein `render()`, das einen String liefert, ersetzt aber weiter den ganzen Inhalt, wenn sich der String ändert. Weg a dort war genau Morphing. Vorschlag: Den String-Pfad nicht entfernen, sondern morphen statt `innerHTML` zu setzen (ein Modul von rund 2 kb, idiomorphs Id-Sets reichen für die meisten Elemente). Dann behalten auch String-basierte Elemente Fokus und Eingaben, und die Migration zu Template-Results wird optional statt nötig.
- **rat braucht kein Morphing für sich selbst.** Feingranulare Bindungen schreiben nur, was sich geändert hat; der Abgleich passiert vorher, im Compiler. Morphing ist der Weg für HTML, das von außen kommt: `{@html …}`-artige Rohinhalte (`raw()` in `@rat/runtime`), Markdown-Vorschauen, Server-Fragmente.
- **Server-Fragmente in rat** (eine htmx-artige Behavior, Vorschlag): `use:fetch={'/fragment'}` lädt HTML und morpht es ein. Das ist die Brücke zwischen rat-Komponenten und servergerendertem HTML, die [Datastar](datastar.md) mit `datastar-patch-elements` baut.
- **Keyed `@for`** in rat und `repeat` in `@domina/render` lösen dasselbe Problem wie Ids beim Morphing. idiomorphs Id-Sets zeigen eine Abkürzung für den Fall ohne Keys: Ein Eintrag, der ein Element mit Id enthält, kann daran wiedererkannt werden.
- **`moveBefore`** nutzt `@domina/render` schon (`parts.js`, mit `insertBefore` als Rückfall), und damit auch `each` in `@rat/runtime`: Ein Custom Element in einer umsortierten Zeile bekommt dort kein `disconnectedCallback`. Morphing-Bibliotheken kamen zur selben Lösung.
- **zugriff** rendert mit Preact (Virtual DOM); Morphing brächte dort nichts, solange kein HTML von außen eingesetzt wird.
