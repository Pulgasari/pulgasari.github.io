# Inferno

Eine auf Render-Geschwindigkeit ausgerichtete UI-Bibliothek mit Komponenten und Virtual DOM. Von Dominic Gannaway, seit 2015. Aktuell 10.0.0 (Oktober 2026), aktiv. Die API ähnelt React, ist aber kein Versprechen vollständiger React-Kompatibilität; dafür gibt es zusätzlich `inferno-compat`. Inferno setzt auf spezialisierte VNodes und Informationen aus dem JSX-Compiler.

- Website: https://infernojs.org
- Repository: https://github.com/infernojs/inferno
- Abhängigkeiten: Paketaufteilung nach Kern, DOM-Erzeugung, Server-Rendering und Kompatibilität
- Build: für JSX ja (`babel-plugin-inferno`), ohne JSX über `inferno-create-element` möglich

## Das Problem, das Inferno löst

Ein allgemeiner Virtual-DOM-Renderer muss zur Laufzeit erkennen, welche Art von Knoten und Kindern er vor sich hat. Dazu kommen Objekte, Vergleiche und Komponentenaufrufe. Bei häufigen Updates großer Oberflächen kann diese Arbeit wichtiger werden als die eigentliche DOM-Änderung.

Inferno hält das Komponentenmodell bei, spezialisiert aber den Renderpfad. Wo ein Compiler schon weiß, dass Kinder Text oder eine keyed Liste sind, muss der Renderer diese Frage nicht erneut allgemein beantworten. Anders als [SolidJS](solidjs.md) beseitigt Inferno den Virtual DOM dabei nicht.

## Kernkonzepte

### 1. Komponenten und `setState`

```jsx
import { Component, render } from 'inferno';

class Counter extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = { count: 0 };
  }

  render() {
    return <button onClick={() => this.setState(state => ({ count: state.count + 1 }))}>
      {this.state.count}
    </button>;
  }
}

render(<Counter />, document.getElementById('app'));
```

Das Beispiel braucht den Inferno-JSX-Transform. `setState` beschreibt eine Zustandsänderung, `render` berechnet die nächste Ansicht. Funktionen können ebenfalls Komponenten sein, Klassen bündeln lokalen Zustand und Lebenszyklen.

### 2. Erzeugung ohne JSX

```js
import { render } from 'inferno';
import { createElement } from 'inferno-create-element';

render(createElement('p', { className: 'note' }, 'Hallo'),
  document.getElementById('app'));
```

Die Element-API ist bequem, kann aber weniger statische Information ausdrücken als der spezialisierte Compilerpfad. JSX ist hier eine Optimierungsquelle, nicht nur eine schönere Schreibweise.

### 3. Keys und kontrollierte Updates

```jsx
<ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>
```

Schlüssel verbinden dieselbe logische Zeile über mehrere Renders. `shouldComponentUpdate` kann Arbeit überspringen, wenn sich relevante Eingaben nicht geändert haben. Falsche Annahmen an dieser Stelle erzeugen allerdings veraltete Ansichten.

### 4. Handler und `linkEvent`

```jsx
import { linkEvent } from 'inferno';

function selectItem(item, event) {
  console.log(item.id, event.type);
}

<button onClick={linkEvent(item, selectItem)}>Auswählen</button>
```

`linkEvent` verbindet Daten und Handler, ohne dafür eine neue Closure zu schreiben. Das Muster ähnelt Handler-Tupeln in [Hyperapp](hyperapp.md), gehört hier aber zur Event-API des Renderers.

### 5. React-Kompatibilität als eigene Schicht

`inferno-compat` kann React-ähnliche Bibliotheken anbinden. Ob ein konkretes Paket funktioniert, hängt von den verwendeten APIs und Annahmen ab. Aktuelle React-Funktionen, Hooks und Spezialverhalten dürfen nicht allein wegen ähnlicher JSX-Syntax vorausgesetzt werden.

## Wie es intern arbeitet

Inferno-VNodes tragen Flags für Knotentypen und Kinderformen. Der Renderer kann damit direkt in spezialisierte Pfade springen, etwa für Text, Elemente, Komponenten oder keyed Kinder. Der JSX-Transform erzeugt passende Konstruktoraufrufe und Informationen schon beim Build.

Ein Update erzeugt weiterhin eine neue Beschreibung der betroffenen View. Inferno vergleicht sie mit der bisherigen und überträgt Unterschiede ins DOM. Geschwindigkeit entsteht aus weniger allgemeiner Arbeit und gezielten Datenstrukturen, nicht aus automatischer Abhängigkeitsverfolgung einzelner Textausdrücke.

## Stärken und Schwächen

- **Stark:** konsequent optimierter VDOM-Pfad, Compiler und Runtime arbeiten zusammen, vertrautes Komponentenmodell, explizite Mittel zum Vermeiden unnötiger Arbeit.
- **Schwach:** kleineres Ökosystem, React-Nähe kann falsche Kompatibilitätserwartungen wecken. Hohe Benchmark-Leistung garantiert weder geringe Netzwerkmenge noch gute Architektur einer konkreten App.

## Für rat und aufbau

- **Compilerwissen in die Runtime tragen:** Rats Compiler kennt statische und dynamische Stellen bereits. Infernos Flags zeigen, warum diese Information erhalten bleiben sollte, statt zur Laufzeit alles erneut zu erkennen.
- **`linkEvent` ist ein Vergleich für Kommandos mit Payload:** Ein stabiler Handler plus Daten könnte auch für rat interessant sein (Vorschlag). Serialisierbarkeit folgt daraus noch nicht; Funktionen bleiben Funktionen.
- **Für zugriff ist ein Rendererwechsel eine eigene Entscheidung.** [Preact](preact.md) plus Signals und Inferno optimieren unterschiedliche Stellen. Entscheidend wären reale Views, Custom Elements und benötigte Bibliotheken.
- **VDOM und Bindungen getrennt bewerten:** rat kann bei einer Textänderung direkt schreiben. Infernos Vorteil liegt im schnelleren Vergleich, der für diese einzelne Bindung gar nicht anfallen muss.

Quellen: [Repository, Beispiele und Architektur](https://github.com/infernojs/inferno), [API-Dokumentation](https://github.com/infernojs/inferno/tree/master/docs), [npm](https://registry.npmjs.org/inferno/latest). Stand: 17. Oktober 2026.
