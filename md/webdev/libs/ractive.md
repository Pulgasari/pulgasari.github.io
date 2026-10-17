# Ractive.js

Eine Template- und UI-Bibliothek mit deklarativen Datenbindungen, von Rich Harris und weiteren Mitwirkenden, seit 2013. Entstanden für interaktive journalistische Anwendungen bei The Guardian; ein wichtiger Vorläufer von Harris' späterem [Svelte](svelte.md). Aktuell 1.4.4 (Mai 2024); seitdem keine neuere stabile npm-Veröffentlichung. Ractive verbindet Mustache-artige Templates mit gezielten DOM-Updates.

- Website: https://ractive.js.org
- Repository: https://github.com/ractivejs/ractive
- Abhängigkeiten: kein separates UI-Framework nötig
- Build: keiner nötig mit dem vollständigen Browser-Build; Templates können vorab geparst werden

## Das Problem, das Ractive.js löst

Ein String-Template erzeugt HTML, weiß danach aber nicht mehr, welcher Datenwert zu welchem Text gehört. Bei Änderungen muss die Anwendung neu rendern oder selbst DOM-Verweise und Events pflegen. Ein vollständiger Virtual DOM ist eine mögliche, aber nicht die einzige Antwort.

Ractive behält die Verbindung zwischen Template und Daten. Änderungen an einem Keypath aktualisieren die davon abhängigen Stellen. Das macht vorhandene HTML-Kenntnisse nutzbar und hält das UI-Modell näher am Dokument als an einer JavaScript-Funktion, die immer wieder einen ganzen Baum beschreibt.

## Kernkonzepte

### 1. Instanz, Template und Daten

```js
import Ractive from 'ractive';

const view = new Ractive({
  target: '#app',
  template: '<p>Hallo {{name}}</p>',
  data: { name: 'Ada' },
});

view.set('name', 'Grace');
```

Die Seite enthält `#app`. `set` meldet eine Datenänderung. Ein beliebiger direkter Schreibzugriff auf das ursprüngliche Objekt ist nicht automatisch gleichbedeutend mit einem Ractive-Update; dafür sind die jeweiligen Adapter- und Beobachtungsregeln zu beachten.

### 2. Bedingungen und Listen

```html
{{#if items.length}}
  <ul>
    {{#each items:i}}
      <li>{{i + 1}}: {{title}}</li>
    {{/each}}
  </ul>
{{else}}
  <p>Noch nichts da.</p>
{{/if}}
```

Die Template-Struktur kennt Abschnitte, Schleifen und ihren Datenkontext. Innerhalb einer Zeile verweist `title` auf den jeweiligen Eintrag, nicht auf eine globale Variable.

### 3. Zwei-Wege-Bindung

```html
<input value="{{name}}">
<p>{{name}}</p>
```

Eingaben können das Datenmodell verändern, Datenänderungen das Eingabefeld. Das ist bequem für Formulare, verlangt aber eine bewusste Entscheidung darüber, wo Änderungen validiert und Seiteneffekte ausgeführt werden. Zwei-Wege-Bindung ersetzt keine fachlichen Regeln.

### 4. Computeds und Beobachter

```js
const view = new Ractive({
  target: '#app',
  template: '<p>{{double}}</p>',
  data: { count: 2 },
  computed: {
    double() { return this.get('count') * 2; },
  },
});

const observer = view.observe('count', value => console.log(value));
// later: observer.cancel();
```

Computeds beschreiben Ableitungen, Beobachter reagieren mit Seiteneffekten. Keypaths wie `items.0.title` adressieren verschachtelte Daten. Explizite Aufräumstellen bleiben für externe Ressourcen nötig.

### 5. Komponenten und Template-Wiederverwendung

```js
const Greeting = Ractive.extend({
  template: '<strong>{{name}}</strong>',
});
```

Abgeleitete Komponenten bündeln Template, Daten und Verhalten. Partials teilen Template-Fragmente, Transitions und Decorators ergänzen DOM-Verhalten. Vorab geparste Templates sparen den Parser im Browser, machen aus Ractive aber noch keinen Svelte-artigen Compiler für die gesamte Update-Logik.

## Wie es intern arbeitet

Der Parser macht aus dem Template eine Beschreibung seiner statischen und dynamischen Teile. Die Runtime baut daraus Fragmente und Bindungen. Das Viewmodel verwaltet Keypaths, abhängige Ausdrücke und Änderungen; betroffene Bindungen aktualisieren ihre vorhandenen DOM-Stellen.

Änderungen werden in einem geregelten Update-Ablauf verarbeitet, damit abhängige Werte und Ansicht zusammenpassen. Ractive rendert nicht für jede Änderung einen vollständigen neuen VDOM-Baum. Die Zuordnung bleibt dennoch Aufgabe der Runtime; beim Vorparsen wird vor allem die Template-Analyse vorgezogen.

## Stärken und Schwächen

- **Stark:** verständliche Templates, direkte Datenbindungen, Formulare mit wenig Code, Komponenten und Ableitungen ohne JSX oder zwingenden Build. Historisch ein klarer Weg zwischen String-Templates und VDOM.
- **Schwach:** eigenes Daten- und Keypath-Modell, kleineres heutiges Ökosystem, lange unveränderter stabiler Versionsstand. Implizite Zwei-Wege-Bindung und Beobachter können Änderungen schwer nachvollziehbar machen.

## Für rat und aufbau

- **Template-Bindungen vor Signals:** Ractive zeigt, dass gezielte DOM-Updates kein neues Konzept sind. Rats Unterschied liegt unter anderem darin, wie der Compiler JavaScript-Ausdrücke und Signals zusammenführt.
- **`bind:` als sichtbare Entscheidung:** Rats explizite Bindung macht am Markup erkennbar, wann ein Eingabefeld zurückschreibt. Diese Sichtbarkeit ist gegenüber einer generellen Zwei-Wege-Regel hilfreich.
- **Keypaths gegen echte Referenzen:** Für aufbaus Stores sind Stringpfade bequem serialisierbar, aber beim Umbenennen und bei Typen schwächer. Eine Adapter-Idee müsste diesen Preis ausdrücklich berücksichtigen (Vorschlag).
- **Vorparsen und Compilieren unterscheiden:** Ein JSON-artiges Template spart Parserarbeit, erzeugt aber nicht automatisch spezialisierte Update-Funktionen wie ein Compiler. Das ist auch für rats Build-Ziele eine wichtige Grenze.

Quellen: [Überblick](https://ractive.js.org/), [Tutorial](https://ractive.js.org/tutorials/hello-world/), [Dokumentation](https://ractive.js.org/api/), [npm](https://registry.npmjs.org/ractive/latest). Stand: 17. Oktober 2026.
