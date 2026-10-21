# YUI

Die Yahoo! User Interface Library: eine große JavaScript- und CSS-Bibliothek für DOM, Events, Ajax, Animation, Widgets und ganze Anwendungen. Gegründet von Thomas Sha bei Yahoo!, entwickelt seit 2005, öffentlich unter BSD-Lizenz seit Februar 2006. YUI 3, eine Neuentwicklung von Grund auf, erschien im September 2009. Am 29. August 2014 kündigte Yahoo! das Ende der aktiven Entwicklung an; die letzte Version ist 3.18.1 (Oktober 2014). Das Repository sagt seitdem: keine Fehler- und keine Sicherheitskorrekturen mehr. Ein historischer Steckbrief.

- Website: https://yuilibrary.com (Dokumentation, eingefroren)
- Repository: https://github.com/yui/yui3 (YUI 2: https://github.com/yui/yui2)
- Laufzeit: Browser, ab YUI 3 auch Node; Auslieferung über Yahoos CDN mit Combo-Handler
- Build: keiner für die Nutzung; die Bibliothek selbst wurde mit Shifter gebaut

## Das Problem, das YUI löst

Mitte der 2000er baute Yahoo! Dutzende große Seiten für sehr unterschiedliche Browser. Jedes Team schrieb eigene Lösungen für dieselben Probleme: Events in Internet Explorer, Drag and Drop, Ajax, Tabellen, Kalender, Layout. YUI war die gemeinsame Grundlage dafür, von einem eigenen Team gepflegt, getestet nach Yahoos „Graded Browser Support“ (eine Liste, welcher Browser welche Qualitätsstufe bekommt) und so dokumentiert, dass auch Außenstehende damit arbeiten konnten.

YUI 2 bot das als Sammlung unter einem globalen Objekt `YAHOO`. YUI 3 stellte die Frage anders: Wie lädt eine große Seite nur die Module, die sie braucht, und wie verhindert man, dass sich mehrere Teams und Versionen auf derselben Seite in die Quere kommen? Die Antwort war der Sandbox-Loader `YUI().use()`, Jahre bevor es AMD, CommonJS im Browser oder ES-Module gab.

## Kernkonzepte

### 1. YUI 2: ein globaler Namensraum

```js
YAHOO.util.Event.on('save', 'click', function (event) {
  YAHOO.util.Dom.addClass('form', 'busy');
  YAHOO.util.Connect.asyncRequest('POST', '/save', { success: done });
});

var table = new YAHOO.widget.DataTable('list', columns, source);
```

Alles hing an `YAHOO`, aufgeteilt in `util` (Dom, Event, Connect, Anim, DragDrop) und `widget` (DataTable, Calendar, TreeView, Editor, Menu). Die Dateien lud man per `<script>` in der richtigen Reihenfolge selbst.

### 2. YUI 3: Sandbox mit `YUI().use()`

```js
YUI().use('node', 'io', function (Y) {
  Y.one('#save').on('click', function () {
    Y.io('/save', { method: 'POST' });
  });
});
```

`YUI()` erzeugt eine neue, unabhängige Instanz; `use` lädt die genannten Module samt Abhängigkeiten und ruft dann asynchron den Callback mit `Y`. Alles, was der Code braucht, hängt an `Y`, nichts am globalen Objekt. Die Doku nannte das „das wichtigste Konzept, das man an YUI verstehen muss“. Zwei Sandboxes auf einer Seite sehen nur ihre eigenen Module; ein zweites `Y.use(…)` lädt später weitere nach (Lazy Loading).

### 3. Module mit `YUI.add`

```js
YUI.add('todo-list', function (Y) {
  Y.TodoList = Y.Base.create('todoList', Y.Widget, [], {
    renderUI () { this.get('contentBox').append('<ul></ul>'); },
  });
}, '1.0.0', { requires: ['widget', 'node'] });

YUI().use('todo-list', function (Y) { new Y.TodoList().render('#app'); });
```

`YUI.add` registriert eine Fabrikfunktion unter einem Namen, mit Version und Abhängigkeiten. Ausgeführt wird sie erst, wenn eine Instanz das Modul per `use` anfordert, und dann **pro Instanz**: Jede Sandbox bekommt ihr eigenes `Y.TodoList`. Das ist das Muster, das AMD (`define(name, deps, factory)`) später fast genauso übernahm.

### 4. Seed, Loader und Combo-Handler

```html
<script src="https://yui.yahooapis.com/3.18.1/build/yui/yui-min.js"></script>
<script>
  YUI({ combine: true, filter: 'min' }).use('app', 'datatable', function (Y) { … });
</script>
```

Auf der Seite steht nur die kleine **Seed-Datei**. Sie enthält den Kern, den Skript-Lader und die Metadaten aller Module (Name, Abhängigkeiten, CSS). Der Loader berechnet daraus die vollständige, sortierte Liste und holt sie mit **einem** Request: `combo?3.18.1/node-core/node-core-min.js&3.18.1/io-base/io-base-min.js&…`. Der Combo-Handler auf dem CDN hängt die Dateien zusammen. Bundling zur Laufzeit, ohne Build-Schritt.

### 5. Attribute und Custom Events

```js
var todo = new Y.Model({ title: 'Brot', done: false });

todo.on('doneChange', function (event) {        // before the change, can be prevented
  if (locked) event.preventDefault();
});
todo.after('doneChange', function (event) {     // after the change
  Y.one('#status').set('text', event.newVal ? 'erledigt' : 'offen');
});
todo.set('done', true);
```

`Y.Attribute` und `Y.Base` geben jedem Objekt Attribute mit Gettern, Settern, Validierung und einem Ereignis pro Attribut. Custom Events haben zwei Phasen: `on` vor der Änderung (abbrechbar), `after` danach. Darauf bauten `Y.Widget` und das App-Framework (`Y.Model`, `Y.ModelList`, `Y.View`, `Y.Router`, ab 3.4 im Jahr 2011), das in Aufbau und Begriffen [Backbone.js](backbone.md) sehr ähnlich ist.

### 6. Werkzeuge rund um die Bibliothek

```sh
java -jar yuicompressor.jar app.js -o app-min.js
```

Aus dem YUI-Team kamen Werkzeuge, die länger lebten als die Bibliothek: der YUI Compressor (Minifier für JavaScript und CSS), Reset-, Fonts- und Grids-CSS, YUI Test, YUIDoc und später Pure CSS. Der YUI-Blog machte das Module Pattern von Douglas Crockford, damals bei Yahoo!, bekannt: eine sofort aufgerufene Funktion, die private Variablen in einer Closure hält und ein Objekt zurückgibt.

## Wie es intern arbeitet

`YUI` ist eine Fabrik: Jeder Aufruf `YUI(config)` liefert eine neue Instanz mit eigener Konfiguration und eigener Liste angehängter Module. `YUI.add` legt die Fabrikfunktionen global in `YUI.Env.mods` ab, geteilt über alle Instanzen. `use` fragt den Loader, welche Module samt transitiver Abhängigkeiten noch fehlen, lädt sie per `<script>` (über den Combo-Handler gebündelt) und ruft danach die Fabrikfunktionen in Abhängigkeitsreihenfolge gegen das `Y` der Instanz auf. Erst dann läuft der Callback. Die Modul-Metadaten stecken als großes Objekt im Seed, deshalb ist der Seed mit Loader nicht klein: `yui-min.js` 26,6 kb gzip, der Core-Seed ohne Loader 9,2 kb (Dateien aus dem npm-Paket 3.18.1). Insgesamt umfasst YUI 3 rund 370 Module.

Der Preis der Sandbox: Jede Instanz führt die Modulfabriken erneut aus, Objekte aus zwei Sandboxes sind nicht austauschbar (`instanceof` scheitert), und Code ist an `Y` gebunden statt an Imports, die ein Werkzeug statisch lesen kann.

## Stärken und Schwächen

- **Stark:** für seine Zeit sehr gründlich (Tests, Doku, Browser-Matrix), ein echtes Modulsystem mit Abhängigkeiten, Versionen, Lazy Loading und Bündelung zur Laufzeit, Isolation mehrerer Versionen auf einer Seite, reiche Widgets (DataTable, Charts, Editor), Attribute mit `on`/`after`-Ereignissen.
- **Schwach:** groß und schwergewichtig, viel Zeremonie (`Y.Base.create`, `ATTRS`, `get`/`set`), die Sandbox macht Code schwer zu teilen und statisch zu analysieren, Abhängigkeit von Yahoos CDN für den bequemen Weg, YUI 2 und 3 waren nicht kompatibel (der Umstieg kostete Teams Jahre). Seit 2014 ohne Pflege, also für neue Projekte ausgeschlossen und für bestehende ein Sicherheitsrisiko.

**Warum es endete.** Yahoo! nannte drei Gründe: Die Sprache und die Browser hatten aufgeholt, das Interesse an großen JavaScript-Bibliotheken sank stetig, und Node.js mit npm und neuen Build-Werkzeugen verlagerte Modulsysteme, Abhängigkeiten und Bündelung in den Build. Weitere Arbeit sollte sich auf Korrekturen beschränken, die für Yahoos eigene Seiten „absolut kritisch“ sind; die meisten Kernmodule hatten zu diesem Zeitpunkt keine aktiven Betreuer mehr. Die Ideen von YUI 3 leben in anderer Form weiter: Module mit Abhängigkeiten in ES-Modulen, der Combo-Handler im Bundler, Lazy Loading in dynamischem `import()`.

## Für rat und aufbau

- **`use` ist dynamisches `import()` mit Abhängigkeitsgraph.** `Y.use('datatable', fn)` entspricht `await import('./datatable.js')`; Abhängigkeiten löst heute der Browser selbst über die Imports der Module. rats `lazy:visible` (Idee 2.13) und Astros `client:visible` ([Astro](astro.md)) sind die heutigen Formen von „Modul erst laden, wenn es gebraucht wird“.
- **Der Combo-Handler ist die Frage, die rat ohne Build beantworten muss.** Eine Seite mit vielen kleinen ES-Modulen lädt einen Wasserfall: Erst nach dem ersten Modul kennt der Browser die nächsten Imports. YUI kannte den ganzen Graphen vorher (Metadaten im Seed) und holte alles in einem Request. Für rats Weg ohne Build wäre die Entsprechung ein Manifest der Abhängigkeiten, aus dem `<link rel="modulepreload">` für alle Module einer Seite erzeugt wird (Vorschlag); dieselbe Information, ohne Combo-Server.
- **Sandbox gegen Import Maps.** Mehrere Versionen derselben Bibliothek auf einer Seite löste YUI über Instanzen. Heute erledigen das Import Maps mit `scopes`, ohne dass der Code eine Instanz `Y` herumreichen muss. zugriff lädt Fremdbibliotheken bereits über eine Import Map.
- **`on` und `after` als zwei Phasen** sind eine nützliche Unterscheidung für `@aufbau/store` und rats `$Record`: ein Haken vor dem Schreiben, der ablehnen oder umformen kann (Validierung, Grenzen wie `min`/`max`), und Effekte danach. Heute prüft der Store über den Typ, eigene Prüfungen vor dem Schreiben gibt es nicht als Haken (Vorschlag: `store.before(k, fn)`, das `false` oder einen neuen Wert liefert).
- **Was man nicht übernehmen sollte:** `Y.Base.create` mit `ATTRS`, Gettern und Settern ist dieselbe Zeremonie wie Backbones `get`/`set`. Signals und Properties machen sie überflüssig.
- **Die Lehre aus dem Ende:** Eine Bibliothek, die Lücken der Plattform füllt, verliert ihren Grund, sobald die Plattform aufholt. YUI hat das nicht kommen sehen; jQuery und Underscore leben weiter, weil sie klein genug waren, um mit der Plattform mitzugehen. Für aufbau und die js-packages heißt das: auf Plattform-APIs aufbauen (`AbortSignal`, `@scope`, Import Maps) statt sie nachzubauen.

Quellen: [Repository und README](https://github.com/yui/yui3), [Ankündigung „Important Announcement Regarding YUI“, 29. August 2014](https://yahooeng.tumblr.com/post/96098168666/important-announcement-regarding-yui), [Doku: YUI Global Object und Sandbox](https://github.com/yui/yui3/blob/master/src/yui/docs/index.mustache), [Wikipedia: YUI Library](https://en.wikipedia.org/wiki/YUI_Library), [InfoQ, August 2014](https://www.infoq.com/news/2014/08/yahoo-drop-axe-YUI), [npm](https://registry.npmjs.org/yui). Stand: 21. Oktober 2026.
