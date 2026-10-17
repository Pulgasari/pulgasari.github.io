# RE:DOM

Eine kleine Bibliothek zum Erzeugen und Aktualisieren echter DOM-Knoten, von Juha Lindstedt (pakastin), seit 2015. Aktuell 4.3.0 (Januar 2025). RE:DOM bringt Hilfen für Elemente, Komponenten, Listen und Lebenszyklen, aber keinen Virtual DOM und keine automatische Reaktivität. Eine Komponente ist im Kern ein Objekt mit einem `el`-Verweis.

- Website: https://redom.js.org
- Repository: https://github.com/redom/redom
- Abhängigkeiten: keine weiteren Laufzeitpakete im Kern
- Build: keiner nötig mit dem Browser-Bundle oder passenden ES-Modulen

## Das Problem, das RE:DOM löst

Native DOM-Aufrufe sind präzise, aber wortreich: Element anlegen, Attribute setzen, Kinder einfügen, Verweise speichern. Für wiederkehrende Zeilen und Komponenten kommen Listenabgleich und Lebenszyklen dazu. Ein großes Framework ist dafür nicht immer nötig.

RE:DOM verkürzt diese Arbeit, ohne eine zweite Darstellung des DOM-Baums einzuführen. Die Anwendung hält echte Knoten und aktualisiert sie ausdrücklich. Das ist näher an einer kleinen Werkzeugschicht über `document.createElement` als an einer deklarativen Signal-Runtime.

## Kernkonzepte

### 1. Elemente als Funktionsaufrufe

```js
import { el, mount } from 'redom';

const title = el('h1.title', 'Hallo');
const panel = el('section#panel', title, el('p', 'Ein Text'));
mount(document.body, panel);
```

Die kurze Selektorschreibweise beschreibt Tag, ID und Klassen. Kinder können direkt als Argumente folgen. SVG entsteht über `svg`, damit die richtigen Namespaces verwendet werden.

### 2. Eine Komponente hat `el`

```js
class Counter {
  constructor() {
    this.count = 0;
    this.el = el('button', '0');
    this.el.onclick = () => this.update(++this.count);
  }

  update(count) {
    this.el.textContent = String(count);
  }
}

mount(document.body, new Counter());
```

RE:DOM erkennt am `el`-Feld den Wurzelknoten. `update` ist eine Konvention für eigene Komponenten und Hilfen wie Listen. Das bloße Ändern von `count` löst keinen Render aus; der Handler ruft die Aktualisierung selbst auf.

### 3. Listen mit Identität

```js
import { el, list, mount } from 'redom';

class Row {
  constructor() { this.el = el('li'); }
  update(item) { this.el.textContent = item.title; }
}

const rows = list('ul', Row, 'id');
mount(document.body, rows);
rows.update([{ id: 'a', title: 'Erster Eintrag' }]);
```

Der Schlüssel `id` verbindet vorhandene Row-Instanzen mit neuen Datensätzen. Ohne stabile Identität können bei Umsortierungen die falschen lokalen Zustände an einer Zeile hängen. Das ist dieselbe fachliche Frage wie bei keyed Listen in einem Framework.

### 4. Lebenszyklen

Komponenten können `onmount`, `onremount` und `onunmount` implementieren. Darin lassen sich externe Listener, Timer oder Bibliotheken anbinden und wieder lösen. Für verlässliche Benachrichtigungen sollten Einfügen und Entfernen durch die vorgesehenen RE:DOM-Hilfen laufen; beliebige fremde DOM-Manipulation ist kein allgemeines Beobachtungsprotokoll.

### 5. Vorhandene Kinder aktualisieren

```js
import { el, setChildren, setStyle } from 'redom';

const panel = el('section');
const heading = el('h2', 'Titel');
setChildren(panel, [heading]);
setStyle(panel, { opacity: 0.8 });
```

`setChildren` verwaltet die gewünschte Kinderfolge, `setStyle` bündelt Schreibzugriffe. Die Anwendung bestimmt weiterhin, wann diese Funktionen laufen und welche Werte sich geändert haben.

## Wie es intern arbeitet

`el` und `svg` erzeugen echte Knoten und wenden Argumente als Attribute, Eigenschaften oder Kinder an. `mount` kann DOM-Knoten und Komponentenobjekte annehmen. RE:DOM hält genügend Zuordnung für seine Lebenszyklen und Listen, aber keinen bei jedem Render neu erzeugten virtuellen Baum.

Die Listenhilfe verwaltet Instanzen, ordnet Datensätze nach Schlüsseln zu, ruft deren `update` auf und bringt die zugehörigen Knoten in die passende Reihenfolge. Sie nimmt der Anwendung den strukturellen Abgleich ab; was eine Zeile intern aktualisiert, bleibt deren eigener Code.

## Stärken und Schwächen

- **Stark:** echte DOM-Verweise, geringe konzeptionelle Last, kein JSX oder eigener Compiler nötig. Komponenten und keyed Listen sind auch ohne vollständiges Framework verfügbar.
- **Schwach:** Updates müssen von Hand korrekt weitergegeben werden. Größere Formulare und abgeleitete Zustände erzeugen leicht viel Klebecode; Server-Rendering und automatische Hydration sind kein umfassendes Kernmodell.

## Für rat und aufbau

- **RE:DOM ist eher ein Runtime-Baustein als ein Sprachvorbild.** Rats Compiler könnte ähnliche elementare Operationen erzeugen; seine zusätzliche Leistung sind automatische Bindungen und Ressourcenverwaltung.
- **`el` als einfacher Komponentenvertrag** zeigt, wie wenig eine Einbettung grundsätzlich braucht. Bei aufbau wären zusätzlich Mehrwurzelfragmente, Cleanup und eigene Custom-Element-Lebenszyklen zu klären.
- **Listen getrennt vom Renderer betrachten:** RE:DOMs keyed Instanzen und rats `@for` lösen Identität, aber nicht automatisch dasselbe Update-Modell. Ein Zeilen-`update` kann mehr Arbeit erledigen als eine einzelne Signalbindung.
- **DOM-Besitz ausdrücklich machen:** Eine RE:DOM-Insel könnte über eine rat-Behavior eingebunden werden (Vorschlag). Beide Systeme sollten dann nicht dieselben Kinder umsortieren.

Quellen: [Website](https://redom.js.org/), [Repository und Beispiele](https://github.com/redom/redom), [Dokumentationsquelle](https://github.com/redom/redom/tree/master/docs), [npm](https://registry.npmjs.org/redom/latest). Stand: 17. Oktober 2026.
