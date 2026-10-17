# MooTools

Eine modulare JavaScript-Bibliothek für DOM, Events, Klassen, Animation und Ajax. Von Valerio Proietti, seit 2006; hervorgegangen aus moo.fx. Der offizielle Browser-Stand von Core und More ist 1.6.0 (Januar 2016), ein historisches System für bestehende Anwendungen. Das npm-Paket `mootools` ist ein anderer, älterer Node-Port und kein verlässlicher Versionsanzeiger für den Browser-Core.

- Website: https://mootools.net
- Repository: https://github.com/mootools/mootools-core
- Abhängigkeiten: Core als Grundlage, More ergänzt weitere Module; eigene Builds möglich
- Build: keiner für ein fertiges Browser-Bundle nötig

## Das Problem, das MooTools löst

2006 unterschieden sich Browser bei Selektoren, Events, Ajax und DOM-Eigenschaften erheblich. Gleichzeitig fehlten JavaScript viele heute selbstverständliche Hilfen. Wiederverwendbare Oberflächen mussten deshalb erst eine eigene gemeinsame Plattform schaffen.

[jQuery](jquery.md) legte den Schwerpunkt auf Auswahl und Verkettung. MooTools wollte zusätzlich die Sprache und ihre Objekte erweitern: Elemente bekommen Methoden, Klassen bekommen Vererbung und Mixins, Arrays und Funktionen zusätzliche Operationen. Das wirkt zusammenhängend, greift aber in den gemeinsamen Namensraum des Browsers ein.

## Kernkonzepte

### 1. Elemente auswählen und erweitern

```js
var panel = document.id('panel');
panel.set('text', 'Hallo');
panel.addClass('active');
$$('.item').addClass('ready');
```

`document.id` liefert ein für MooTools vorbereitetes Element, `$$` eine Sammlung. Methoden wie `set`, `get`, `inject` und `adopt` bilden eine gemeinsame DOM-API über Browserunterschiede hinweg.

### 2. Klassen und Mixins

```js
var Counter = new Class({
  Implements: [Events, Options],
  options: { start: 0 },

  initialize: function (options) {
    this.setOptions(options);
    this.count = this.options.start;
  },

  increment: function () {
    this.fireEvent('change', ++this.count);
  }
});
```

`Extends` beschreibt Vererbung, `Implements` ergänzt Verhalten. `Events` und `Options` sind wiederverwendbare Verträge für eigene Objekte. Das stammt aus der Zeit vor nativen `class`- und Modul-Systemen.

### 3. Events

```js
function activate(event) {
  event.stop();
  document.id('panel').toggleClass('active');
}

document.id('toggle').addEvent('click', activate);
// later: document.id('toggle').removeEvent('click', activate);
```

Die Bibliothek vereinheitlicht Event-Objekte und Registrierung. Für das Entfernen bleibt die Identität des Handlers wichtig. Die UI wird dabei von Hand verändert; ein Datenwert erzeugt nicht automatisch eine neue Ansicht.

### 4. Ajax über `Request`

```js
new Request.JSON({
  url: '/api/items',
  method: 'get',
  onSuccess: function (items) {
    console.log(items);
  }
}).send();
```

Requests sind Objekte mit Optionen und Events. `Request.HTML` ergänzt HTML-Verarbeitung. Das ist ein älteres Abstraktionsmodell über XMLHttpRequest, nicht die heutige `fetch`- und Promise-API.

### 5. Animation und Module

```js
document.id('panel').tween('opacity', 0.5);
```

`Fx.Tween` animiert einzelne Eigenschaften, `Fx.Morph` mehrere. More liefert zusätzliche Effekte und Hilfen. Welche Methoden verfügbar sind, hängt vom gewählten Build ab; ein kopiertes Beispiel setzt oft still ein bestimmtes Modul voraus.

## Wie es intern arbeitet

Core ergänzt native Typen und DOM-Objekte um Methoden, speichert interne Daten für Elemente und vereinheitlicht browserabhängige Operationen. Das Klassensystem setzt Methoden und Vererbungsbeziehungen zusammen und stellt etwa `this.parent()` für überschreibende Methoden bereit.

Es gibt keinen zentralen Renderer und keine automatische Reaktivität. Der Code empfängt Events und verändert Elemente ausdrücklich. Die Erweiterung nativer Prototypen war damals praktisch, kann aber mit späteren Standards oder anderen Bibliotheken kollidieren; die bekannte `Array.prototype.flatten`-Geschichte führte im Standard zur Benennung `flat`.

## Stärken und Schwächen

- **Stark:** für seine Zeit ein kohärentes Modell aus Klassen, Events und DOM, modular zusammenstellbar, bestehende Anwendungen lassen sich damit nachvollziehen und warten.
- **Schwach:** veraltete Plattformannahmen, globale Erweiterungen und mögliche Namenskollisionen, kein zeitgemäßes Modul- und Zustandsmodell. Für neue Anwendungen deckt der Browser viele Aufgaben direkt ab.

## Für rat und aufbau

- **Hilfen ohne globale Änderungen:** aufbaus eigene APIs können eine ähnliche Ergonomie bieten, ohne `Array`, `Element` oder `Function` global zu erweitern. Eine Bibliotheksgrenze bleibt leichter austauschbar.
- **Verhalten zusammensetzen statt Klassenketten:** `Events` und `Options` zeigen kleine wiederverwendbare Verträge. Für rat könnten solche Verträge als Behaviors mit explizitem Setup und Abbau formuliert werden (Vorschlag).
- **Event-System nicht mit Reaktivität verwechseln:** `fireEvent('change')` teilt eine Änderung mit, berechnet aber keine Abhängigkeiten. Der Abstand zu Signals entspricht dem Vergleich mit [Backbone](backbone.md).
- **Migration entlang der Plattform:** Selektoren, Klassen, Requests und Animationen lassen sich einzeln durch native APIs ersetzen. Dafür muss eine alte Anwendung nicht sofort einen neuen Renderer bekommen.

Quellen: [Überblick und Beispiele](https://mootools.net/), [Core-Dokumentation](https://mootools.net/core/docs/1.6.0), [Release 1.6.0](https://mootools.net/blog/2016/01/14/mootools-1-6-0-release), [Core-Repository](https://github.com/mootools/mootools-core). Stand: 17. Oktober 2026.
