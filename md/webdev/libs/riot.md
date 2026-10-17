# Riot.js

Eine UI-Bibliothek mit HTML-artigen Komponenten aus Markup, Script und Style. Von Muut gestartet, seit 2013; die aktuelle Entwicklung liegt beim Riot-Team. Aktuell 10.1.6 (August 2026), aktiv. Riot kompiliert `.riot`-Dateien zu JavaScript und aktualisiert dynamische Template-Stellen ohne allgemeinen Virtual-DOM-Baum.

- Website: https://riot.js.org
- Repository: https://github.com/riot/riot
- Abhängigkeiten: Runtime mit Template- und DOM-Binding-Paketen, Compiler separat
- Build: gewöhnlich ja; für Experimente ist Kompilierung im Browser möglich

## Das Problem, das Riot.js löst

Wer wiederverwendbare Oberflächen bauen will, braucht eine Grenze für Markup, Zustand und Stil. JSX legt diese Grenze in JavaScript. Web Components geben eine Browser-Schnittstelle vor, bringen aber allein noch kein bequemes Template- und Update-Modell.

Riot hält die Komponente als HTML-artige Datei zusammen. Es ergänzt Ausdrücke, Bedingungen und Schleifen und lässt den Compiler daraus Bindungen bauen. Das ist ein kleineres Modell als ein vollständiges Anwendungsframework mit Router, Datenladen und Serverstrategie.

## Kernkonzepte

### 1. Eine `.riot`-Komponente

```html
<counter>
  <button onclick={ increment }>{ state.count }</button>

  <script>
    export default {
      state: { count: 0 },
      increment() {
        this.update({ count: this.state.count + 1 });
      }
    }
  </script>

  <style>
    :host { display: inline-block; }
  </style>
</counter>
```

Der äußere Tag benennt die Komponente. Das Script exportiert ihr Verhalten, das Template liest Zustand. Die Datei ist keine native HTML-Datei und das Element wird durch diesen Namen allein noch kein registriertes Custom Element.

### 2. Registrieren und mounten

```js
import { register, mount } from 'riot';
import Counter from './counter.riot';

register('counter', Counter);
mount('counter');
```

Der Import setzt eine passende Compiler-Integration voraus. Die Seite enthält `<counter></counter>`. Eine alternative Factory über `component` kann ein importiertes Template gezielt auf einem Element instanziieren.

### 3. Props und State

Props kommen von außen, State gehört zur Instanz. `this.update(...)` stößt eine Aktualisierung an. Ein direkt verändertes beliebiges Objekt wird dadurch nicht zu einem beobachteten Signal; die Update-Grenze bleibt explizit.

```html
<p if={ props.show }>{ props.title }</p>
<ul>
  <li each={ item in props.items } key={ item.id }>{ item.title }</li>
</ul>
```

`if` verwaltet bedingte Struktur, `each` wiederholte Templates, `key` deren Identität. Das Markup bleibt nah an HTML, enthält aber eigene Compilerregeln.

### 4. Lifecycle und Aufräumen

```js
export default {
  onMounted() {
    this.handleResize = () => console.log(window.innerWidth);
    window.addEventListener('resize', this.handleResize);
  },
  onBeforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }
};
```

Die Methoden stehen im Komponentenscript. Lebenszyklen geben externen Ressourcen einen Besitzer. Das ist besonders bei eingebetteten Editoren oder Diagrammen wichtig; ein DOM-Knoten verschwindet sonst, während ein globaler Listener weiterläuft.

### 5. Styles und Slots

Styles können auf die Komponente bezogen kompiliert werden; Slots übernehmen Inhalt vom Aufrufer. Riot-Scoping ist nicht automatisch Shadow-DOM-Kapselung. Native Custom Elements sind über zusätzliche Integration möglich, gehören aber nicht schon zur Bedeutung jeder `.riot`-Datei.

## Wie es intern arbeitet

Der Compiler zerlegt Markup und Script und erzeugt ein Template mit Anweisungen für dynamische Bereiche. Die Runtime klont die statische Struktur, findet Bindungsstellen und hält dort Auswertungsfunktionen für Text, Attribute, Events und strukturelle Blöcke.

Ein `update` lässt betroffene Template-Arbeit laufen und vergleicht Bindungswerte, bevor ins DOM geschrieben wird. Dadurch entfällt ein allgemeiner VDOM-Diff, nicht aber jede erneute Auswertung. Ohne Signal-Abhängigkeitsgraph ist ein explizites Komponentenupdate etwas anderes als rats einzelne reaktive Bindung.

## Stärken und Schwächen

- **Stark:** kompakte Komponenten, HTML-nahe Syntax, kleine Zahl zentraler Konzepte, kein vollständiger VDOM-Baum pro Update. Compiler und Runtime sind getrennt verwendbar.
- **Schwach:** eigene Syntax und Tooling nötig, kleinere Integrationsauswahl, Zustandsänderungen brauchen Disziplin. „Kein Virtual DOM“ bedeutet weder automatische Signals noch einen vollständigen SSR- und Routing-Stack.

## Für rat und aufbau

- **Sehr nahes Dateimodell:** Markup, Script und Style in einer Datei sind auch für rat ein verständlicher Einstieg. Unterschiede liegen im Sprachumfang und darin, wie Updates ausgelöst werden.
- **Bindungen als Compiler-Ausgabe** sind ein guter Vergleich für rats Runtime. Riot zeigt zugleich, dass ein Template-Compiler und feingranulare Abhängigkeitsverfolgung zwei eigenständige Entscheidungen sind.
- **Custom Elements ausdrücklich behandeln:** Für aufbau zählt die native Elementgrenze. Ein Riot-Tag erfüllt deren Vertrag nicht automatisch; eine Einbettung müsste Props, Events und Lebenszyklen übersetzen.
- **Cleanup als Teil der Komponente:** Eine rat-Behavior für Riot wäre denkbar (Vorschlag), müsste aber die Instanz beim Entfernen zuverlässig unmounten.

Quellen: [Überblick](https://riot.js.org/), [Komponenten und API](https://riot.js.org/documentation/), [Compiler](https://riot.js.org/compiler/), [npm](https://registry.npmjs.org/riot/latest). Stand: 17. Oktober 2026.
