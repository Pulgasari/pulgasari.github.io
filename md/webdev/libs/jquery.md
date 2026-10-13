# jQuery

Die JavaScript-Bibliothek, die das DOM benutzbar gemacht hat. Erschienen 2006, rund zehn Jahre lang auf fast jeder Website. Heute meist Altlast, aber fast jede Browser-API, die sie abgelöst hat (`querySelectorAll`, `classList`, `fetch`), gibt es, weil jQuery gezeigt hat, was Entwickler wollen.

- Website: https://jquery.com
- Größe: rund 30 kb (minifiziert, gzip)
- Build: keiner nötig, ein `<script>` reicht

## Das Problem, das jQuery gelöst hat

2006 hatte jeder Browser seine eigene DOM-API, Events funktionierten im Internet Explorer anders, und Elemente fand man mit `getElementById` und anschließendem Durchlaufen des Baums von Hand. jQuery hat das hinter einer einzigen, überall gleich funktionierenden Schnittstelle versteckt.

## Kernkonzepte

### 1. Eine Funktion für alles: `$`

Ein CSS-Selektor rein, ein *Wrapped Set* von Elementen raus. Jede Methode wirkt auf alle Elemente des Sets gleichzeitig:

```js
$('.card').addClass('ready');            // every .card gets the class
$('#menu li').hide();                    // every li inside #menu
$('<p>hallo</p>').appendTo('body');      // creating elements uses the same function
$(function () { … });                    // and so does "run when the page is ready"
```

Das Set ist eine **implizite Schleife**: kein `forEach`, keine Prüfung, ob überhaupt etwas gefunden wurde. Ein leeres Set tut einfach nichts.

### 2. Chaining

Fast jede Methode gibt das Set zurück, die Aufrufe reihen sich aneinander:

```js
$('.alert')
  .addClass('visible')
  .text('gespeichert')
  .delay(2000)
  .fadeOut();
```

Das Muster heißt *Fluent Interface*. `@domina` übernimmt es: `element('#panel').addClass('open').setAttr(…)`.

### 3. Event-Delegation

Ein Listener auf einem Elternelement bedient die Events seiner Kinder, auch solcher, die erst später dazukommen:

```js
$('#list').on('click', 'li .remove', function () {
  $(this).closest('li').remove();
});
```

Der Listener sitzt auf `#list`. Ein Klick steigt vom `.remove` nach oben (Bubbling), jQuery prüft den Selektor und ruft den Handler mit dem passenden Element als `this` auf. Tausend Listeneinträge, ein Listener.

### 4. Effekte und die Queue

`fadeIn`, `slideUp`, `animate({ left: 100 })`. Animationen auf einem Element warten in einer Queue aufeinander, verkettete Effekte laufen also nacheinander statt gleichzeitig.

### 5. Plugins

`$.fn.tooltip = function () { … }` hängt eine Methode an jedes Set: `$('.help').tooltip()`. Das hat jQuery zum Ökosystem gemacht (jQuery UI und tausende Plugins).

### 6. Ajax

`$.get('/api/users', users => …)` und `$('#box').load('/teil.html')`, lange bevor es `fetch` gab.

## Wie es intern arbeitet

`$('.card')` gibt ein Objekt zurück, das wie ein Array aussieht (`0`, `1`, `length`) und alle jQuery-Methoden auf seinem Prototyp trägt (`$.fn`). Jede Methode läuft über die enthaltenen Elemente und gibt `this` zurück. Es gibt keinen Zustand und kein Rendering: jQuery ändert das DOM direkt, in dem Moment, in dem man die Methode aufruft.

## Stärken und Schwächen

- **Stark:** sofort benutzbar, kein Build, keine Konzepte, die man vor der ersten Zeile verstehen muss. „Selektor rein, alles passiert mit allen" ist extrem gut lesbar.
- **Schwach:** Das DOM *ist* der Zustand. Sobald eine App wächst, weiß niemand mehr, welcher Code welches Element wann geändert hat. Dieses Spaghetti-Problem ist der Grund, warum React, Vue und Signals erfunden wurden.

## Für rat und aufbau

- Implizite Schleife und Chaining leben in `@domina` weiter. Die Behaviors von rat (`@tooltip={…}`) sind die moderne Form von jQuery-Plugins: eine Funktion, die ein Element bekommt, nur im Markup angehängt statt nachträglich per Selektor gefunden.
- Event-Delegation ist eine echte Performance-Idee für lange Listen: ein Modifier wie `on:click.delegate`, oder eine Runtime, die Events in `@for`-Einträgen von selbst delegiert.
- Nicht übernehmen: das DOM als Quelle der Wahrheit. In rat liegt der Zustand in Signals, das DOM folgt.
