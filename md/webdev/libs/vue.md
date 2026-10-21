# Vue

Ein Framework für Benutzeroberflächen mit HTML-Templates, Single-File-Komponenten und eingebauter Reaktivität. Von Evan You, erste öffentliche Version Februar 2014, 1.0 im Oktober 2015, Vue 2 im September 2016, Vue 3 (Neuschreiben in TypeScript, Composition API, Proxies) im September 2020; Vue 2 ist seit Ende 2023 ohne Support. Unabhängig, über Sponsoren finanziert, nicht an eine Firma gebunden. Aktuell 3.5.44 (Oktober 2026), sehr aktiv. Vue 3.6 ist seit Juli 2026 im Release-Candidate-Stadium (3.6.0-rc.12 vom 16. Oktober 2026) und bringt zwei große Änderungen: Vapor Mode (Komponenten ohne Virtual DOM) und einen Reaktivitätskern auf Basis von [alien-signals](alien-signals.md).

- Website: https://vuejs.org
- Repository: https://github.com/vuejs/core (Vue 3; Vue 2 in `vuejs/vue`)
- Laufzeit: Reaktivität (`@vue/reactivity`, auch allein nutzbar) plus Renderer; ab 3.6 wahlweise VDOM (`runtime-dom`) oder Vapor (`runtime-vapor`)
- Build: für `.vue`-Dateien ja (Compiler, meist über [Vite](vite.md), das ebenfalls von Evan You stammt); ohne Build mit `vue.esm-browser.js`, das Templates im Browser compiliert

## Das Problem, das Vue löst

Vue entstand aus AngularJS: Evan You wollte dessen Datenbindung im Template ohne das schwere Framework darum. Die Antwort war eine kleine Bibliothek, die man per `<script>` in eine bestehende Seite setzen kann und die bei Bedarf zu einem vollständigen Framework mit Router, Store und Build wächst („progressive framework“).

Gegenüber [React](react.md) setzt Vue auf zwei Dinge: **Templates statt JSX**, damit HTML wie HTML aussieht und ein Compiler es analysieren kann, und **Reaktivität statt Re-Render aus Zustand**: Vue weiß, welche Komponente welchen Wert gelesen hat, und rendert nur diese neu. Abhängigkeitslisten und Hook-Regeln gibt es deshalb nicht.

## Kernkonzepte

### 1. Single-File-Komponenten

```vue
<script setup>
import { computed, ref } from 'vue';

const count  = ref(0);
const double = computed(() => count.value * 2);
</script>

<template>
  <button @click="count++">{{ count }} · {{ double }}</button>
</template>

<style scoped>
button { font-weight: 700; }
</style>
```

Script, Template und Style in einer Datei. `<script setup>` ist Zucker für die Composition API: Alles, was oben deklariert ist, steht im Template zur Verfügung. Daneben gibt es die ältere **Options API** (`data`, `computed`, `methods` als Objekt), die in Vue 3 weiter unterstützt wird. `scoped` hängt jedem Element ein Attribut wie `data-v-7ba5bd90` an und schreibt die Selektoren darauf um.

### 2. Reaktivität: `ref`, `reactive`, `computed`, `watch`

```js
import { computed, reactive, ref, watch, watchEffect } from 'vue';

const count = ref(0);                     // a signal: count.value
const state = reactive({ todos: [] });    // a deep proxy: every property tracked
const total = computed(() => state.todos.length + count.value);

watchEffect(() => console.log(total.value));
watch(count, (value, previous) => console.log(previous, '→', value));

state.todos.push({ title: 'brot' });     // reactive, no reassignment needed
```

`ref` ist ein Signal mit `.value`; im Template wird es automatisch ausgepackt (`{{ count }}`, nicht `count.value`). `reactive` macht ein Objekt tief reaktiv: Jede gelesene Eigenschaft wird verfolgt, Mutation wie `push` löst Updates aus. `shallowRef` und `shallowReactive` verfolgen nur die oberste Ebene.

### 3. Direktiven im Template

```vue
<p v-if="user">{{ user.name }}</p>
<Login v-else />

<li v-for="todo in todos" :key="todo.id">{{ todo.title }}</li>

<a :href="url" :class="{ active: isActive }">link</a>
<form @submit.prevent="save">
  <input v-model.trim="name" />
  <input @keydown.enter="send" />
</form>
```

Kontrollfluss und Bindungen stehen als Attribute (`v-if`, `v-for`, `v-show`). `:x` ist kurz für `v-bind:x` (Wert als Ausdruck), `@x` für `v-on:x`. Modifier am Event (`.prevent`, `.stop`, `.once`, Tastennamen) und an `v-model` (`.trim`, `.number`, `.lazy`) erledigen Routinearbeit im Markup.

### 4. Props, Emits, `defineModel`

```vue
<script setup>
const { title, size = 'm' } = defineProps(['title', 'size']);   // stays reactive (3.5)
const emit  = defineEmits(['close']);
const value = defineModel();                                  // two-way with v-model
</script>

<template>
  <h2 :class="size">{{ title }}</h2>
  <input v-model="value" />
  <button @click="emit('close')">×</button>
</template>
```

`defineProps` und Co. sind Compiler-Makros, keine Importe. Seit 3.5 bleiben destrukturierte Props reaktiv: Der Compiler schreibt jedes `title` zu `__props.title` um, Defaults stehen als normale JavaScript-Defaults da. Wer eine solche Prop an eine Funktion weitergibt, die reaktiv beobachten soll, muss einen Getter übergeben (`watch(() => title, …)`); der Compiler meldet den Fehler sonst.

### 5. Slots

```vue
<!-- card.vue -->
<article>
  <header><slot name="title" /></header>
  <slot :item="item" />
</article>

<!-- usage -->
<Card>
  <template #title><h2>wetter</h2></template>
  <template #default="{ item }"><p>{{ item.text }}</p></template>
</Card>
```

Benannte Slots füllen mehrere Stellen, *Scoped Slots* geben Daten vom Kind zurück an den Inhalt, den das Elternteil schreibt (Markup mit Parametern).

### 6. Composables und Direktiven

```js
export function useMouse () {
  const x = ref(0), y = ref(0);
  const move = event => { x.value = event.pageX; y.value = event.pageY; };
  onMounted(()   => window.addEventListener('mousemove', move));
  onUnmounted(() => window.removeEventListener('mousemove', move));
  return { x, y };
}

const vFocus = { mounted: element => element.focus() };   // used as v-focus
```

Ein *Composable* ist eine Funktion, die Refs und Lifecycle-Hooks bündelt; anders als React-Hooks darf sie in Bedingungen stehen, weil `setup` nur einmal läuft. Eigene Direktiven sind Objekte mit Hooks (`mounted`, `updated`, `unmounted`) und bekommen das Element.

### 7. Vapor Mode (3.6)

```vue
<script setup vapor>
import { ref } from 'vue';
const todos = ref([]);
</script>
```

```js
// compiled vapor output (excerpt, 3.6.0-rc.12)
const t0 = _template("<li> ");
const n4 = _createFor(() => (todos.value), (item) => {
  const n6 = t0();
  const x6 = _txt(n6);
  _renderEffect(() => _setText(x6, _toDisplayString(item.value.title)));
  return n6;
}, (todo) => (todo.id));
```

Ein Attribut `vapor` an `<script setup>` (oder `<template vapor>`) lässt dieselbe Komponente ohne Virtual DOM compilieren: Template klonen, pro Loch ein Effekt, der einen Knoten schreibt, Events am Dokument gesammelt. Reine Vapor-Apps starten mit `createVaporApp`, gemischte Apps nutzen `vaporInteropPlugin`. Vapor unterstützt nur `<script setup>` und Templates; Options API, `v-memo`, `getCurrentInstance()` und Render-Funktionen bleiben beim VDOM. Laut Release-Notes erreicht Vapor im js-framework-benchmark das Niveau von [SolidJS](solidjs.md) und [Svelte](svelte.md) 5.

## Wie es intern arbeitet

Der Template-Compiler parst HTML in einen AST und erzeugt Render-Funktionen. Im VDOM-Modus ist das ein **compiler-informierter Virtual DOM**: Statische Teile werden einmal erzeugt und wiederverwendet, dynamische Knoten bekommen *Patch Flags* (nur Text, nur `class`, nur Props), und jeder Block sammelt seine dynamischen Nachfahren in einer flachen Liste. Beim Update vergleicht Vue nur diese Liste, nicht den ganzen Baum. Im Vapor-Modus entfällt der VNode-Baum ganz.

Die Reaktivität beruht auf Proxies (`reactive`) und Getter/Setter-Objekten (`ref`). Ein Lesezugriff in einem laufenden Effekt registriert eine Abhängigkeit (`track`), ein Schreibzugriff benachrichtigt die Abhängigen (`trigger`). Jede Komponente ist ein Effekt; Updates landen in einer Warteschlange und werden im nächsten Microtask gesammelt ausgeführt (`nextTick`). 3.5 hat den Kern auf doppelt verkettete Listen mit Versionen umgebaut (laut Ankündigung 56 % weniger Speicher), 3.6 ersetzt ihn durch einen Port von alien-signals. Die öffentliche API (`ref`, `computed`, `watch`) bleibt dabei gleich.

## Stärken und Schwächen

- **Stark:** sanfter Einstieg (ein `<script>`-Tag reicht), lesbare Templates, feingranulare Reaktivität ohne Abhängigkeitslisten, mutierbare Objekte sind reaktiv, gute offizielle Werkzeuge (Router, Pinia, Vite, Volar). Größe moderat: typisch 24,6 kb (`createApp`, `ref`, `computed`), alle Exporte 45,6 kb, mit Template-Compiler im Browser 62,2 kb. Vapor bringt das Modell von Solid und Svelte, ohne bestehende Komponenten aufzugeben.
- **Schwach:** zwei APIs (Options und Composition) und ab 3.6 zwei Renderer, deren Funktionsumfang sich unterscheidet. `ref` mit `.value` im Script, ohne im Template, und das Auspacken in `reactive` sind eine bekannte Fehlerquelle. Template-Syntax ist eine eigene Sprache neben JavaScript, Typen im Template nur über Volar. Vapor ist im RC noch nicht für die Migration ganzer Apps empfohlen; in einer eigenen Messung (esbuild, Einstieg `vue`, 3.6.0-rc.12) war eine kleine Vapor-App noch nicht kleiner als dieselbe im VDOM-Modus (28,1 kb gegen 23,8 kb).

## Für rat und aufbau

- **Derselbe Signal-Kern.** Vue 3.6 und rat (d-32) setzen beide alien-signals' Graphen hinter eine eigene Oberfläche. Vues `ref().value` ist fast genau rats Fassade (Klassen mit `.value`), die rats Compiler aus `$count` erzeugt. Bugs und Optimierungen im Kern betreffen beide; Vues Port ist eine gute Referenz, wie man `effectScope`, `onCleanup` und Batching auf dem Graphen abbildet.
- **Vapor ist rats `dom`-Target.** `_template()` klonen, `_renderEffect` pro Loch, `_createIf`/`_createFor` als Blöcke mit eigenem Scope: Das ist im Aufbau `@rat/runtime` mit `@domina/render`. Vue kommt vom VDOM dorthin und muss Interop und zwei Renderer pflegen; rat beginnt dort. Die Einschränkungen von Vapor (kein `v-memo`, keine Instanz-Proxies) zeigen, welche Features an den VDOM gebunden sind und rat deshalb gar nicht erst braucht.
- **Sichtbarkeit: `$` gegen Auspacken.** Vue zeigt `.value` im Script und verbirgt es im Template; dieselbe Variable sieht an zwei Stellen verschieden aus. rat schreibt `$count` überall gleich. Das ist dieselbe Abwägung wie bei Sveltes Runes, nur mit Vues Bruch zwischen Script und Template als zusätzlichem Argument für rats Regel.
- **Props-Destructuring ist d-13 b.** Vue 3.5 macht genau das, was rats Empfehlung vorsieht: `const { title } = defineProps()` bleibt reaktiv, weil der Compiler jeden Zugriff umschreibt. Vue zeigt, dass es in der Praxis trägt, und auch die verbleibende Falle (Weitergabe an `watch` braucht einen Getter). rats `$`-Variante (`let { $title } = props`) macht sichtbar, welche Namen reaktiv bleiben; bei Vue sieht `title` aus wie eine Konstante.
- **Modifier kommen von hier.** rats Event- und Binding-Modifier ([event-modifiers.md](https://github.com/pulgasari/rat/blob/main/.md/ideas/event-modifiers.md), [binding-modifiers.md](https://github.com/pulgasari/rat/blob/main/.md/ideas/binding-modifiers.md)) nennen Vue als Ursprung. rat ist bei `preventDefault` bewusst abgewichen (`on:submit!` statt `.prevent`, d-24), `bind:value.number`, `.trim`, `.lazy` sind noch Idee und könnten Vues Namen direkt übernehmen.
- **Direktiven gegen Behaviors (d-26):** Vues Direktiven sind Objekte mit `mounted`/`updated`/`unmounted`, wie Sveltes alte Actions. rats einfachste Form (Funktion, die ihre Aufräumfunktion zurückgibt und bei neuem Wert neu läuft) ist kürzer; Vues Objektform entspricht rats optionalem `{ update, destroy }`.
- **`reactive()` und d-23.** Vue macht Objekte standardmäßig tief reaktiv (Proxy, ein Signal pro Eigenschaft), rat empfiehlt Typen aus `@rat/types` (`$List`, `$Map`). Die offene Frage in rats reactivity.md, was `$()` mit einem einfachen Objekt tut, hat Vue mit „tiefer Proxy“ beantwortet; `reactive(new Map)` ist dort die Variante c (ein Signal pro Schlüssel).
- **Slots:** rats Idee für benannte Slots übernimmt die Plattform-Notation (`slot="title"`), Vue hat eine eigene (`<template #title>`). Scoped Slots (Daten vom Kind zum Inhalt) fehlen in rats Idee; `@fragment` als Prop deckt denselben Fall ab.
- **Compiler im Browser:** `vue.esm-browser.js` compiliert Templates zur Laufzeit (62,2 kb mit Compiler gegen 41,5 kb ohne). Das ist ein Vorbild für rats „browser first“ und zeigt den Preis: Der Compiler ist größer als die Laufzeit.
- **Styles und Custom Elements:** `<style scoped>` arbeitet mit Attributen und umgeschriebenen Selektoren, rat mit nativem `@scope`. `defineCustomElement` macht aus einer Vue-Komponente ein Custom Element; dasselbe ist für `@rat/elements` geplant, `@aufbau/elements` funktionieren in Vue-Templates ohne Adapter (Vue setzt bei Custom Elements Properties, wo sie existieren).

Quellen: [Vue CHANGELOG (minor)](https://github.com/vuejs/core/blob/minor/CHANGELOG.md), [Release-Notes 3.6.0-rc.1](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1), [Announcing Vue 3.5](https://blog.vuejs.org/posts/vue-3-5), [npm: vue](https://www.npmjs.com/package/vue), [vuejs.org](https://vuejs.org). Größen mit esbuild gemessen (vue 3.5.44, 3.6.0-rc.12). Stand: 21. Oktober 2026.
