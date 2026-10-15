# Backbone.js

Eine kleine MVC-Bibliothek, 2010 von Jeremy Ashkenas bei DocumentCloud veröffentlicht, aus demselben Umfeld wie Underscore und [CoffeeScript](coffeescript.md). Backbone gab jQuery-Apps zum ersten Mal eine Struktur: Models, Collections, Views, einen Router und ein Event-System, das alles verbindet. Die aktuelle Version ist 1.6.1 (April 2025); seit Jahren nur noch Pflege, aber weiter im Einsatz, etwa in der Medienbibliothek von WordPress.

- Website: https://backbonejs.org
- Repository: https://github.com/jashkenas/backbone
- Abhängigkeiten: Underscore (oder Lodash), jQuery für Views und `sync`
- Build: keiner, drei `<script>` reichen

## Das Problem, das Backbone löst

Um 2010 bestanden interaktive Seiten aus jQuery-Selektoren und Callbacks, und die Daten der App steckten im DOM: Wer wissen wollte, ob ein Todo erledigt ist, fragte die Checkbox. Backbone holt die Daten heraus in **Models**, die Ereignisse melden, wenn sie sich ändern. Views hören darauf und zeichnen sich neu. Das Rendern selbst überlässt Backbone komplett der App.

## Kernkonzepte

### 1. Events: ein Mixin für alles

```js
const bus = Object.assign({}, Backbone.Events);

bus.on('saved', id => console.log(id));
bus.trigger('saved', 42);
bus.off('saved');
```

`Backbone.Events` ist ein Objekt mit `on`, `off`, `once`, `trigger`, `listenTo` und `stopListening`. Models, Collections, Views, Router und `Backbone` selbst mischen es ein. Event-Namen dürfen Namensräume haben (`change:title`), `all` empfängt jedes Ereignis.

### 2. Models: Attribute mit Änderungsmeldung

```js
const Todo = Backbone.Model.extend({
  defaults : { done: false, title: '' },
  toggle () { this.save({ done: !this.get('done') }); },
  validate (attrs) { if (!attrs.title.trim()) return 'title is empty'; },
});

const todo = new Todo({ title: 'Brot' });
todo.on('change:done', (model, value) => console.log(value));
todo.set('done', true);    // fires change:done, then change
```

Gelesen und geschrieben wird über `get` und `set`, nicht über Properties: Nur so bemerkt Backbone Änderungen, denn 2010 gab es weder Proxies noch verbreitete Getter. `set` vergleicht alte und neue Werte und feuert `change:<attr>` pro geändertem Attribut, danach einmal `change`. `validate` läuft vor `save` (und vor `set` mit `{ validate: true }`), `parse` formt die Antwort des Servers um.

### 3. Collections: geordnete Mengen von Models

```js
const Todos = Backbone.Collection.extend({
  model      : Todo,
  url        : '/todos',
  comparator : 'order',
  remaining () { return this.where({ done: false }); },
});

const todos = new Todos;
todos.fetch();              // GET /todos, then add/remove/merge via set()
todos.on('add remove reset', render);
```

Eine Collection hält Models nach `id` und `cid` (Client-ID) im Index, sortiert über `comparator` und reicht die Events ihrer Models durch: `change:done` an einem Todo kommt auch an der Collection an. Dazu die Underscore-Methoden (`filter`, `map`, `groupBy`, `pluck` …) direkt auf der Collection.

### 4. `sync`: REST als Konvention

`fetch`, `save` und `destroy` gehen alle durch `Backbone.sync(method, model, options)`, das CRUD auf HTTP abbildet: `create` → `POST /todos`, `read` → `GET /todos/1`, `update` → `PUT`, `delete` → `DELETE`. Wer etwas anderes will (Local Storage, WebSocket), ersetzt `sync` global oder pro Model.

### 5. Views: ein Element, deklarative Events

```js
const TodoView = Backbone.View.extend({
  tagName  : 'li',
  template : _.template('<input type="checkbox" <%= done ? "checked" : "" %>> <%- title %>'),
  events   : {
    'click input'     : 'toggle',
    'dblclick'        : 'edit',
    'keyup .edit'     : 'onKey',
  },
  initialize () {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'destroy', this.remove);
  },
  render () {
    this.el.innerHTML = this.template(this.model.toJSON());
    return this;
  },
  toggle () { this.model.toggle(); },
});
```

Eine View besitzt genau ein Element (`el`, als jQuery-Objekt `$el`). Der `events`-Hash wird per Event-Delegation an `el` gebunden: `'click input'` heißt „Klick auf ein `input` innerhalb von `el`". `render` ist leer, die App entscheidet, wie HTML entsteht; meist ein Underscore-Template und `innerHTML`.

### 6. `listenTo` statt `on`: aufräumen

`model.on('change', view.render)` hält die View über das Model am Leben, auch wenn sie längst aus dem DOM ist: das klassische Speicherleck von Backbone-Apps („Zombie Views"). `view.listenTo(model, …)` merkt sich die Abonnements auf Seiten der View, und `view.remove()` ruft `stopListening()` und löst alle auf einmal.

### 7. Router und History

```js
const AppRouter = Backbone.Router.extend({
  routes : {
    ''            : 'home',
    'todos/:id'   : 'show',
    'files/*path' : 'files',
  },
  show (id) { … },
});

new AppRouter;
Backbone.history.start({ pushState: true });
```

Routen mit `:param`, `*splat` und optionalen Teilen `(…)`. `Backbone.history` hört auf `popstate` oder `hashchange`; `router.navigate('todos/3', { trigger: true })` wechselt die URL.

## Wie es intern arbeitet

**Events:** Jedes Objekt hält eine Map `_events` von Namen auf Listen von `{ callback, context, listening }`. `trigger` durchläuft die Liste des Namens und danach die von `all`. `listenTo` legt auf beiden Seiten einen Eintrag an (`_listeningTo` beim Hörer, `_listeners` beim Sender), damit `stopListening` ohne Suche alles findet.

**`set`:** vergleicht jedes neue Attribut mit `_.isEqual` gegen den alten Wert, sammelt die Änderungen, schreibt `changed` und `_previousAttributes` und feuert erst danach die Events. Verschachtelte `set`-Aufrufe aus einem `change`-Handler werden zu weiteren `change`-Runden zusammengefasst, nicht rekursiv ausgeführt.

**Views:** `delegateEvents` zerlegt jeden Schlüssel in Ereignis und Selektor und ruft `this.$el.on(event + '.delegateEvents' + cid, selector, handler)`. Der Namensraum mit der `cid` erlaubt `undelegateEvents` ohne Referenzen auf die Handler.

**Kein Rendering:** Backbone hat kein Template-System, keinen Diff und kein Binding. Jede Änderung führt in der Regel zu einem `render`, das den Inhalt von `el` komplett ersetzt, samt Fokus, Cursor und Scroll-Position.

## Stärken und Schwächen

- **Stark:** klein und vollständig lesbar (rund 2000 Zeilen mit Kommentaren, der annotierte Quelltext ist berühmt), keine Magie, Events als einheitlicher Klebstoff, REST-Konvention für Daten, funktioniert mit jedem Template-System, extrem stabil.
- **Schwach:** Rendering und Datenbindung bleiben der App überlassen, also schreibt jede App ihr eigenes Mini-Framework (daher Marionette, Chaplin, Thorax); `render` per `innerHTML` verliert DOM-Zustand; Zombie Views ohne Disziplin bei `listenTo`; `get`/`set` statt Properties; verschachtelte Models und Collections sind nicht vorgesehen; Abhängigkeit von jQuery.

## Für rat und aufbau

Backbone ist der Stand vor der Reaktivität: Es meldet Änderungen, aber niemand rechnet etwas daraus nach. [Knockout](knockout.md) erschien im selben Jahr und löste genau diesen Teil.

| Backbone | rat / aufbau | Bemerkung |
|---|---|---|
| `model.set('done', true)` → `change:done` | `$done = true` | Backbone meldet pro Attribut, rat weiß über den Lesezugriff, wer betroffen ist; kein `render` von Hand. tiefe Änderungen wie `$todo.done = true` erlaubt rat heute nicht (d-23), Backbone umgeht das mit `set` |
| `listenTo` / `stopListening` | `AbortSignal` | dieselbe Idee: Abonnements gehören dem Hörer und werden gemeinsam gelöst. aufbaus `Selection` und rats Behaviors (`destroy`) machen das heute, `AbortSignal` ist die Plattform-Form davon |
| `events: { 'click input': 'toggle' }` | `on:click={…}` am Element | Backbone braucht Selektoren, weil das Template ein String ist; rat kennt das Element zur Compile-Zeit |
| `render()` mit `innerHTML` | `{…}`-Löcher | genau das Problem, das aufbaus `innerHTML`-Rendering hat ([lit-vs-aufbau.md](../../analyze/lit-vs-aufbau.md#165-rendern-ohne-neuaufbau)) |
| `Collection` mit `comparator`, Index nach `id` | `$List` aus `@rat/types` (d-23) | eine sortierte Liste mit Index ist ein Kandidat für eine `$List`-Variante mit Schlüssel |
| `validate` / `parse` | Schemas in `@rat/types` | Prüfen und Umformen an der Grenze zum Server, wie die Decoder in [Elm](elm.md) |
| `Backbone.sync` als einziger Ausgang | `@aufbau/store` | ein austauschbarer Persistenz-Adapter (REST, Local Storage, IndexedDB) ist eine gute Form für einen Store |

Der `events`-Hash ist außerdem ein gutes Vorbild für Komponenten ohne Compiler: Event-Delegation an der Wurzel, deklariert als Daten, gelöst über einen Namensraum. Für `@aufbau/element` wäre das die build-freie Variante von `on:click`.
