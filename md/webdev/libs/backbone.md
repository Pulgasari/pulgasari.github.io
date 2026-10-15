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
| `events: { 'click input': 'toggle' }` | `on:click={…}` in rat, `Selection.on` in `@aufbau/element` | Backbone braucht Selektoren, weil das Template ein String ist; rat kennt das Element zur Compile-Zeit. aufbau: ausführlich unten |
| `render()` mit `innerHTML` | `{…}`-Löcher in rat, `html` in `@aufbau/element` | beide schreiben nur die geänderten Stellen, Fokus und Eingaben bleiben. ein `render()`, das in aufbau einen String liefert, verhält sich noch wie Backbone ([lit-vs-aufbau.md](../../analyze/lit-vs-aufbau.md#165-rendern-ohne-neuaufbau)) |
| `Collection` mit `comparator`, Index nach `id` | `$List` aus `@rat/types` (d-23) | eine sortierte Liste mit Index ist ein Kandidat für eine `$List`-Variante mit Schlüssel |
| `validate` / `parse` | Schemas in `@rat/types` | Prüfen und Umformen an der Grenze zum Server, wie die Decoder in [Elm](elm.md) |
| `Backbone.sync` als einziger Ausgang | `persist` in `@aufbau/store` | ausführlich unten |

### `Backbone.sync` und `@aufbau/store`

**Was `sync` bei Backbone ist.** Jedes Model und jede Collection kennt nur drei Verben, die irgendwo hinaus gehen: `fetch`, `save` und `destroy`. Alle drei rufen dieselbe Funktion:

```js
Backbone.sync = function (method, model, options) { … };
// method: 'create' | 'read' | 'update' | 'patch' | 'delete'
// model:  the model or collection
// options: success, error, wait, patch, parse …
```

Die Standard-Implementierung macht daraus einen Ajax-Request (`create` → `POST url`, `update` → `PUT url/id` …). Ersetzt man sie, ändert sich für die App nichts: Ein Plugin wie `Backbone.localStorage` setzt pro Collection ein eigenes `sync`, und dieselben Models speichern dann lokal statt beim Server. Das ist die Stärke: eine einzige, schmale Naht zwischen Daten und Transport.

Dahinter steckt mehr als ein Adapter. `sync` hat einen **Rückweg**, und der ist der interessante Teil:

- **Die Antwort fließt zurück.** Nach `save` geht die Antwort des Servers durch `parse` und dann in `set`. Felder, die nur der Server kennt (`id`, `createdAt`, normalisierte Werte), landen so automatisch im Model.
- **`cid` und `id`.** Ein neues Model hat sofort eine Client-ID (`c1`, `c2` …), aber noch keine `id`. `isNew()` ist wahr, solange die `id` fehlt, und entscheidet, ob `save` ein `create` oder ein `update` wird. Die Collection findet das Model über beide Schlüssel, auch während der Server noch rechnet.
- **Optimistisch oder abwartend.** `model.save(attrs)` setzt die Werte sofort und schickt sie danach. `model.save(attrs, { wait: true })` setzt sie erst, wenn der Server zugestimmt hat. Dasselbe bei `collection.create` und `model.destroy`.
- **Der Request als Ereignis.** Ein Model feuert `request` beim Start, `sync` bei Erfolg und `error` bei Fehlschlag. Ein Lade-Indikator hört einfach darauf.

**Was `@aufbau/store` heute hat.** Mit `persist` gibt es dort schon dieselbe Naht: ein `Storage`, ein Name oder ein beliebiges `{ get, set, subscribe? }`, pro Schlüssel (`${key}:${leaf}`), `get` darf ein Promise liefern, `await store.ready` wartet auf die Hydration. Für das, wofür der Store gebaut ist, ist das richtig: Der Store hält **App-Zustand** (Theme, Ansicht, Zoom), er ist die Quelle der Wahrheit, und `set` ist Feuern-und-Vergessen.

Backbone löst ein anderes Problem: **Ressourcen**, deren Quelle der Wahrheit woanders liegt (ein Server, eine IndexedDB, ein anderes Gerät). Was dem Store dafür fehlt, sind genau die vier Punkte oben: Einträge mit eigener Identität statt einer Liste von Werten, eine Antwort, die zurück in den Store fließt, die Wahl zwischen optimistisch und abwartend, und ein sichtbarer Status pro Vorgang.

**Wie das im Store aussehen könnte** (Skizze, nichts davon existiert): ein eigener Typ für Sammlungen mit Schlüssel und ein Adapter mit CRUD-Methoden statt `get`/`set`.

```js
const rest = url => ({
  read   : ()            => fetch(url).then(r => r.json()),
  create : item          => fetch(url, { method: 'POST', body: JSON.stringify(item) }).then(r => r.json()),
  update : (id, changes) => fetch(`${url}/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }).then(r => r.json()),
  delete : id            => fetch(`${url}/${id}`, { method: 'DELETE' }),
});

const app = store({
  todos : { type: 'collection', key: 'id', resource: rest('/todos') },
});

await app.load('todos');                              // read, replaces the entries
app.add('todos', { title: 'Brot' });                  // at once with a temporary key, then create
app.patch('todos', 7, { done: true }, { wait: true }); // only after the reply
app.remove('todos', 7);                               // optimistic, restored on error
app.status('todos');                                  // 'idle' | 'pending' | 'error', reactive like any key
```

- `add` legt den Eintrag sofort mit einem temporären Schlüssel an (Backbones `cid`), die Antwort von `create` ersetzt ihn samt der echten `id`. Ein `toNode` oder eine Liste, die auf den Eintrag zeigt, bleibt dabei stabil.
- Optimistische Änderungen merken sich den alten Wert und spielen ihn bei einem Fehler zurück. Backbone macht genau das **nicht** von selbst, das ist eine seiner Lücken.
- Die Verben geben ein Promise zurück, der Wert im Store bleibt trotzdem synchron lesbar.
- Derselbe Adapter für IndexedDB oder einen Worker hat dieselben vier Methoden; der Store weiß nicht, wohin es geht.

Zwei Namen kollidieren dabei mit dem, was der Store schon hat: `sync` heißt dort heute „Schlüssel an eine CSS-Variable oder ein Attribut binden" (bei Backbone: Persistenz), und `delete(k)` löscht einen Schlüssel. Deshalb oben `resource`, `load` und `remove`.

### Der `events`-Hash und `@aufbau/element`

**Wie Backbone ihn umsetzt.** Beim Erzeugen der View (und bei jedem `setElement`) läuft `delegateEvents`:

1. Jeder Schlüssel wird mit `/^(\S+)\s*(.*)$/` in Ereignis und Selektor zerlegt: `'keyup .edit'` → `keyup` und `.edit`, `'dblclick'` → `dblclick` ohne Selektor (gilt für `el` selbst).
2. Der Wert ist eine Funktion oder ein **Methodenname** als String, der auf der View nachgeschlagen und an sie gebunden wird.
3. Pro Eintrag gibt es **einen** Listener auf `el`, über jQuery mit Selektor: `this.$el.on('keyup.delegateEvents' + cid, '.edit', handler)`. Ein Klick irgendwo im Inneren steigt zu `el` auf, jQuery prüft, ob das Ziel (oder ein Vorfahre bis `el`) auf den Selektor passt.
4. `undelegateEvents` entfernt alles über den Namensraum `.delegateEvents<cid>`, ohne Referenzen auf die Handler.

Daraus ergeben sich die drei Eigenschaften, um die es geht:

- **Überlebt das Rendern.** `render` ersetzt mit `innerHTML` alle Kinder, aber der Listener sitzt auf `el`, das bleibt. Kein erneutes Binden nach jedem Render.
- **Ein Listener pro Ereignistyp** statt einer pro Element: Eine Liste mit 500 Einträgen kostet einen Listener.
- **Deklariert als Daten.** Wer die View liest, sieht alle Interaktionen an einer Stelle; eine Unterklasse kann den Hash übernehmen und erweitern.

Die Schwächen gehören zum Bild: Ein vertippter Methodenname wird von Backbone **stillschweigend übersprungen**, Selektoren brechen still, wenn sich das Template ändert, und Ereignisse, die nicht aufsteigen (`focus`, `blur`), funktionieren nur, weil jQuery sie auf `focusin`/`focusout` umbiegt.

**Was `@aufbau/element` heute hat.** Die Mechanik ist schon da, und vollständiger als bei Backbone: Eine Selection aus einem Selektor ist *live*, ihr Listener sitzt auf den Bäumen (Shadow Root und Host), prüft zum Ereigniszeitpunkt über `composedPath()`, ob das Ziel dazugehört, hört auf nicht aufsteigende Ereignisse in der Capture-Phase und endet mit dem `AbortSignal` des Elements beim Trennen.

```js
onConnected () {
  this.on('click', 'input[type=checkbox]', this.toggle);
  this.on('dblclick', 'label', this.edit);
  this.on('keydown', '.edit', this.onKey);
}
```

Was fehlt, ist nur die Form: Das ist imperativ, in einem Hook, und damit Code statt Daten. Der Vorschlag ist, Backbones Hash als statisches Feld daneben zu stellen:

```js
class TodoItem extends AufbauElement {
  static listen = {
    'click input[type=checkbox]' : 'toggle',
    'dblclick label'             : 'edit',
    'keydown .edit'              : 'onKey',
    'pointerenter'               : 'preview',   // no selector: the host itself
  };

  toggle (event, node) { … }
}
```

Die Basisklasse liest das Feld beim Verbinden und ruft für jeden Eintrag `this.on(type, selector, this[name])`; das sind wenige Zeilen, weil `Selection.on(types, selector, handler)` schon existiert. Was man dabei anders machen sollte als Backbone:

- **Ein fehlender Methodenname ist ein Fehler**, beim `init()` der Klasse, nicht erst beim Klick.
- **Vererbung zusammenführen:** die Hashes der Klassenkette werden gemischt, eine Unterklasse überschreibt einzelne Einträge statt alle.
- **Name:** `static events` ist in aufbau schon belegt, dort beschreibt es die Ereignisse, die das Element **auslöst** (für `custom-elements.json`). `static listen` beschreibt die, auf die es **hört**. Beides zusammen wäre im Manifest und in `@aufbau/devtools` als Daten sichtbar, ohne Code zu analysieren, genau wie `attr` und `parts` heute.

Für rat ist der Hash nicht nötig: Der Compiler kennt jedes Element und bindet `on:click={…}` direkt. Er ist die Form für das, was ohne Compiler auskommen muss. Und er wäre eine mögliche Ausgabe, falls rat einmal Custom Elements auf Basis von `@aufbau/element` erzeugt: Ereignisse innerhalb von `@for`-Listen würden dann über einen Listener am Host statt über einen pro Eintrag laufen.
