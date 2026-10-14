# Lit und `@aufbau/element` im Vergleich

Beide bauen Web Components auf derselben Plattform, beide mit einer Basisklasse, einem statischen Schema und gemeinsam genutzten Stylesheets. Der Unterschied liegt darin, **wo der Zustand wohnt** und **wie neu gerendert wird**. Daraus folgt fast alles andere.

Verglichen wird:

- **Lit 3:** `@lit/reactive-element` 2.1 (Properties, Update-Zyklus), `lit-html` 3.3 (Templates), `LitElement` (verbindet beides). Geprüft am npm-Paket.
- **aufbau:** `@aufbau/element` (`AufbauElement`, `Selection`, `withControl`, `withSource`, `lib/{schema,styles,config,skin,persist}.js`) und das String-Template aus `@aufbau/elements/lib/html.js`. Stand `aufbau` main.

Profil von Lit allein: [lit.md](../webdev/libs/lit.md).

- [1. Kurzfassung](#1-kurzfassung)
- [2. Aufbau der beiden Basisklassen](#2-aufbau-der-beiden-basisklassen)
- [3. Zustand: `attr` gegen `properties`](#3-zustand-attr-gegen-properties)
- [4. Der Update-Zyklus](#4-der-update-zyklus)
- [5. Rendern: String gegen Template-Parts](#5-rendern-string-gegen-template-parts)
- [6. Styles](#6-styles)
- [7. Shadow DOM, Light DOM, Slots](#7-shadow-dom-light-dom-slots)
- [8. Events und DOM-Zugriff](#8-events-und-dom-zugriff)
- [9. Formulare](#9-formulare)
- [10. Komposition: Mixins, Controller, Context](#10-komposition-mixins-controller-context)
- [11. Plattform-Features](#11-plattform-features)
- [12. Definieren und Laden](#12-definieren-und-laden)
- [13. Typen, Tooling, Ökosystem](#13-typen-tooling-ökosystem)
- [14. Größe und Performance](#14-größe-und-performance)
- [15. Wer ist wo besser](#15-wer-ist-wo-besser)
- [16. Was `@aufbau/element` noch fehlt](#16-was-aufbauelement-noch-fehlt)

---

## 1. Kurzfassung

| | Lit | `@aufbau/element` |
|---|---|---|
| Zustand | JS-Properties, Attribute sind ein Eingang | Attribute, Properties gibt es nicht (nur von Hand) |
| Schema | `static properties = { count: { type: Number } }` | `static attr = { count: Number }` |
| Wert lesen | `this.count` (gespeicherter Wert) | `this.getAttr('count')` (bei jedem Lesen neu ausgewertet) |
| Fallback-Kette | Property-Initialwert | Attribut → globale Config `tag-attr` → Default |
| Update | gesammelt im Microtask, `updateComplete` | synchron bei jeder Attributänderung |
| Rendern | Template einmal geparst, nur Lücken werden gepatcht | String bauen, vergleichen, bei Änderung `innerHTML` |
| Dynamik | automatisch: die `${…}`-Lücken | manuell: `render()` für Struktur, `sync()` für Werte |
| Root | Shadow DOM standardmäßig | Light DOM standardmäßig, `static shadow` optional |
| Styles | `css`-Tag, nur im Shadow Root | String, Objekt, `ass`, Funktion; Cascade Layers, Skins, auch Light DOM |
| Events | `@click=${…}` im Template | `Selection`: live, delegiert, mit `AbortSignal` aufgeräumt |
| Formulare | nichts eingebaut | `withControl`: FormData, Validity, Reset, Restore, `persist` |
| Komposition | Reactive Controllers, Mixins, `@lit/context` | Mixins, globale Config |
| SSR | `@lit-labs/ssr`, Declarative Shadow DOM | keins |
| Größe (gz) | rund 5,6 kb minifiziert | rund 11,6 kb unminifiziert, mit Forms, Config, Skins |

Die Zeile, die alles erklärt: **Lit behandelt eine Komponente wie ein Objekt mit Feldern, aufbau wie ein HTML-Element mit Attributen.** Lit ist gebaut, um von JavaScript aus gesteuert zu werden (Frameworks, Daten-Bindings). aufbau ist gebaut, um aus HTML heraus konfiguriert zu werden (Markup, Config, Skins).

---

## 2. Aufbau der beiden Basisklassen

### Lit: drei Schichten

```
HTMLElement
  └─ ReactiveElement        @lit/reactive-element
       properties → accessors, attribute converters, reflect
       requestUpdate → microtask → performUpdate
       willUpdate / update / firstUpdated / updated / updateComplete
       static styles → adoptedStyleSheets, controllers
       └─ LitElement        lit
            render() → lit-html render(result, renderRoot)
```

`ReactiveElement` weiß nichts vom Rendern, `lit-html` nichts von Komponenten. `LitElement` ist nur der Kleber: `update()` ruft `render()` und gibt das Ergebnis an `lit-html`. Man kann `ReactiveElement` mit einem anderen Renderer kombinieren.

### aufbau: eine Klasse, Bibliotheken drumherum

```
HTMLElement
  └─ AufbauElement          @aufbau/element
       attr schema (lib/schema.js) → observedAttributes, getAttr, reflect, var
       config (lib/config.js), skin (lib/skin.js), styles (lib/styles.js)
       render() → string → innerHTML when changed, sync() every update
       skeleton, states, internals, Selection ($, $$, part, on, emit)
       ├─ withControl       form association, value, validity, persist
       └─ withSource        children are input, result rendered into a slot
```

Rendern, Zustand, Styles, DOM-Zugriff und Plattform-Helfer sitzen in einer Klasse. Der Renderer ist nicht austauschbar, aber durch die Trennung `render()`/`sync()` auch nicht zwingend: ein Element kann `render()` leer lassen und alles in `sync()` imperativ machen.

**Bewertung:** Lits Schichtung ist sauberer (Renderer austauschbar, einzeln testbar). aufbau ist kompakter zu benutzen, alles Nötige ist an `this`.

---

## 3. Zustand: `attr` gegen `properties`

Der Kern des Vergleichs. Gleich ist die Idee: ein statisches Objekt beschreibt die Eingänge, die Basisklasse erzeugt daraus `observedAttributes`, Typumwandlung und Reflexion.

```js
// lit
static properties = {
  size    : { type: Number, reflect: true },
  variant : { type: String },
  open    : { type: Boolean },
  items   : { attribute: false },          // property only
  _hover  : { state: true },               // internal, no attribute
};
constructor () { super(); this.size = 2; this.variant = 'plain'; this.open = false; this.items = []; }

// aufbau
static attr    = {
  size    : { type: Number, default: 2 },
  variant : { values: ['plain', 'primary'], default: 'plain' },
  open    : Boolean,
};
static reflect = ['size'];
```

### 3.1 Wo der Wert gespeichert ist

| | Lit | aufbau |
|---|---|---|
| Speicher | interne Map hinter einem Getter/Setter-Paar | das Attribut selbst |
| Lesen | `this.size` liefert den gespeicherten Wert | `getAttr('size')` liest das Attribut und wandelt es bei **jedem** Aufruf um |
| Schreiben | `this.size = 3` | `setAttribute('size', 3)` oder `setAttr({ size: 3 })` |
| Datenfluss | Attribut → Converter → Property → Render | Attribut → Render, die Umwandlung passiert beim Lesen |

Folge bei aufbau: Es gibt genau eine Quelle der Wahrheit, sichtbar im DOM-Inspektor und per CSS selektierbar (`my-thing[size="3"]`). Es gibt kein Auseinanderlaufen von Property und Attribut, das bei Lit ein bekanntes Thema ist (Attribut sagt `3`, Property sagt `5`, weil nicht reflektiert wird).

Folge bei Lit: Werte jeder Art (Objekte, Arrays, Funktionen, DOM-Knoten) sind normale Properties. Ein Framework kann `el.items = [...]` setzen, ohne zu serialisieren.

### 3.2 Namen

| | Lit | aufbau |
|---|---|---|
| Attributname | Property-Name **kleingeschrieben**: `maxLength` → `maxlength` | kebab-case: `maxLength` → `max-length` |
| eigener Name | `attribute: 'max-length'` | nicht nötig |
| Zugriff im Code | nur der Property-Name | jeder Fall: `getAttr('maxLength')`, `'max-length'`, `'max_length'` (CanonicalMap) |

aufbau ist hier besser: kebab-case ist die HTML-Konvention (`aria-label`, `data-*`), Lits `toLowerCase()` ist ein häufiger Stolperstein.

### 3.3 Umwandlung und Validierung

| | Lit | aufbau |
|---|---|---|
| Typ | `type: Number/Boolean/String/Object/Array` | Typfunktion, oder aus dem Default abgeleitet |
| eigene Umwandlung | `converter: { fromAttribute, toAttribute }` | `fn: (value, name) => …` |
| erlaubte Werte | nicht eingebaut | `values: [...]`, sonst fällt der Wert auf den Default zurück |
| Objekte | `type: Object` parst JSON aus dem Attribut | nicht vorgesehen |

aufbau hat mit `values` eine echte Validierung im Schema, Lit nicht. Lit hat dafür eine Umwandlung in beide Richtungen (`toAttribute`), aufbau nur die Leserichtung, das Zurückschreiben ist ein fixes `String(value)`.

### 3.4 Defaults und die Fallback-Kette

Lit: Der Default ist der Initialwert im Constructor oder Feld. Seit 2.1 gibt es `useDefault: true`, damit ein Default nicht sofort als Attribut reflektiert wird und das Entfernen des Attributs zum Default zurückführt. Das war vorher ein Dauerärgernis.

aufbau: drei Stufen, ausgewertet bei jedem Lesen:

```
authored attribute  →  config 'my-thing-size'  →  schema default
```

Die mittlere Stufe hat Lit gar nicht: `setConfig({ 'pop-toast': { duration: 3000 } })` ändert den Default für alle `<pop-toast>` einer Seite, und laufende Elemente aktualisieren sich (`followConfig`). Damit das funktioniert, merkt sich aufbau, welche Attribute es selbst reflektiert hat (`_reflected`): ein reflektierter Wert gilt nicht als vom Autor gesetzt, eine Config-Änderung schlägt also noch durch. Das ist durchdacht und ein echter Vorteil für Design-Systeme.

### 3.5 Interner Zustand

Lit: `state: true` (oder `@state()`) ist eine reaktive Property ohne Attribut. Setzen löst ein Update aus.

aufbau: gibt es nicht. Interner Zustand sind normale Felder plus `this.invalidate().update()` von Hand, oder ein Attribut, das dann öffentlich und im DOM sichtbar ist.

### 3.6 Werte, die keine Strings sind

Hier zeigt sich die Lücke am deutlichsten. Die Elemente in `@aufbau/elements` schreiben Properties von Hand, 16 Setter in `webcomponents/`, nach zwei Mustern:

```js
// pattern 1: property mirrors a boolean attribute (btn-chip, dash-panel, btn)
set pressed (value) { this.toggleAttribute('pressed', Boolean(value)); }

// pattern 2: rich data next to the attributes (data-tree, media-json)
set nodes (value) {
  this._data = Array.isArray(value) ? value : null;
  this.invalidate();
  if (this._mounted) this.update();
}
get nodes () { return this._data; }
```

Muster 1 erzeugt Lit automatisch für jede Property. Muster 2 ist genau `attribute: false` plus `requestUpdate()`. Beides wiederholt sich und ist ein Kandidat fürs Schema (siehe [16.1](#161-eine-property-schicht-aus-dem-schema)).

### 3.7 Änderungserkennung

Lit: `hasChanged(value, old)`, Standard `notEqual` (`!==` mit NaN-Sonderfall). Gleiche Werte lösen kein Update aus.

aufbau: `attributeChangedCallback` vergleicht `oldValue !== newValue` als Strings. Für Attribute ist das korrekt und billig. Für die handgeschriebenen Daten-Setter gibt es keinen Vergleich, jedes Setzen rendert neu.

---

## 4. Der Update-Zyklus

### Lit

```
this.a = 1; this.b = 2; this.c = 3;
        │ each setter: requestUpdate(name, old) → changedProperties.set(name, old)
        ▼ one microtask later
performUpdate()
  shouldUpdate(changed)    → false skips the update
  willUpdate(changed)      compute derived values, runs on the server too
  update(changed)          reflect properties, then render() → lit-html
  firstUpdated(changed)    once, after the first render
  updated(changed)         after every render
  updateComplete           promise, resolves after updated()
```

Drei Änderungen, ein Rendering. Jeder Hook bekommt die Map der geänderten Properties mit ihren alten Werten, also kann ein Element gezielt reagieren: `if (changed.has('src')) this.load();`.

### aufbau

```
el.setAttribute('a', 1)  →  attributeChangedCallback  →  onAttributeChanged  →  update()
el.setAttribute('b', 2)  →  attributeChangedCallback  →  onAttributeChanged  →  update()
el.setAttribute('c', 3)  →  attributeChangedCallback  →  onAttributeChanged  →  update()

update()
  reflectAttrs()     write resolved values listed in static reflect
  render()           string; innerHTML only if it differs from the last one
  applyVars()        schema entries with var → --custom-properties
  syncSkeleton()
  sync()             every time
  onRender()         only if the markup was rebuilt
```

Drei Änderungen, drei Durchläufe. Jeder Durchlauf ruft `render()` auf und baut den String vollständig, auch wenn am Ende `innerHTML` übersprungen wird. `sync()` weiß nicht, was sich geändert hat, und muss alles neu setzen.

| | Lit | aufbau |
|---|---|---|
| Batching | ja, Microtask | nein |
| geänderte Namen | `changedProperties` mit alten Werten | nur in `onAttributeChanged`, je ein Name |
| erstes Rendern | `firstUpdated` | `onRender` beim ersten Aufbau (auch bei jedem weiteren) |
| vor dem Rendern ableiten | `willUpdate` | kein Hook, passiert in `render()`/`sync()` |
| Update überspringen | `shouldUpdate` | `render()` gibt `null` zurück (überspringt nur das Markup) |
| warten | `await el.updateComplete` | nicht nötig, alles ist sofort fertig |
| Fehler beim Rendern | Exception, `isUpdatePending` bleibt konsistent | Exception mitten in `update()`, Teile wie `sync()` laufen nicht |

**Wo synchron besser ist:** Nach `el.setAttribute('open', '')` ist das DOM sofort fertig. Kein `await`, keine Tests, die an `updateComplete` hängen, keine Reihenfolge-Rätsel. Für Elemente, die wenige Attribute haben und selten geändert werden, ist das schlicht einfacher.

**Wo es teuer wird:** `setAttr({ a, b, c })`, ein Config-Wechsel, ein Skin-Wechsel, oder `withControl`, das bei jeder Eingabe das `value`-Attribut schreibt. Bei einem Eingabefeld heißt das: jeder Tastendruck ein vollständiges `update()` inklusive `render()`-String.

---

## 5. Rendern: String gegen Template-Parts

### Lit

```js
render () { return html`<button class=${this.variant} ?disabled=${this.busy}>${this.label}</button>`; }
```

Beim ersten Rendern parst `lit-html` die statischen Strings einmal in ein `<template>` (Cache pro Template-Literal, Schlüssel sind die `strings` selbst), klont es und legt für jede Lücke einen Part an. Bei weiteren Renderings werden nur die Werte der Lücken mit den letzten verglichen und die geänderten Parts geschrieben: ein `textContent`, ein Attribut, ein Property. Der `<button>` bleibt derselbe Knoten, Fokus und Listener bleiben.

### aufbau

```js
render () { return html`<button part="button"></button>`; }       // structure, rarely changes
sync   () {
  this.$button.attr('class', this.getAttr('variant'));             // values, every update
  this.$button.node.disabled = this.getAttr('busy');
  this.$button.text(this.getAttr('label'));
}
```

`html` aus `elements/lib/html.js` ist ein String-Template mit Escaping. `update()` vergleicht den fertigen String mit dem letzten und setzt bei einer Änderung `innerHTML`. Das ist eine **manuelle Form derselben Idee wie bei Lit**: Lit trennt Statisches und Dynamisches automatisch an den `${…}`, aufbau überlässt die Trennung dem Entwickler über `render()` und `sync()`. 50 der 71 Elemente nutzen `render()`, 45 `sync()`.

Solange `render()` nur Struktur liefert, ist aufbau beim Aktualisieren gleich schnell oder schneller als Lit (kein Wertevergleich pro Part, direkte DOM-Aufrufe in `sync()`). Sobald dynamische Werte in `render()` landen, kippt es:

| Folge von `innerHTML` | Wirkung |
|---|---|
| alle Kindknoten neu | Fokus, Textauswahl, Scrollposition, `<input>`-Werte, laufende CSS-Transitions gehen verloren |
| direkte Listener weg | durch `Selection` abgefedert: Listener hängen delegiert am Root, nicht an den Knoten |
| Referenzen veraltet | durch `$`/`part()` abgefedert: Selektionen werden bei jeder Benutzung neu aufgelöst |
| Parsen | der HTML-Parser läuft über den ganzen String, bei langen Listen spürbar |
| Stringvergleich | bei jedem Update, auch wenn sich nichts ändert, linear in der Länge |
| keine Schlüssel | eine Liste wird komplett neu gebaut statt verschoben (Lit: `repeat()`) |

Die Elemente kennen das und arbeiten darum herum: `invalidate()` erzwingt einen Neuaufbau, wenn sich Daten außerhalb der Attribute geändert haben (`data-tree`, `data-table`, `media-json`, `nav-toc`, `write-code`, `input-file`).

**Sicherheit:** Lit setzt Text über Text-Knoten und Attribute über `setAttribute`, eingefügtes Markup wird nie geparst. XSS ist nur über `unsafeHTML` möglich. aufbau escaped im `html`-Tag korrekt, aber das Ergebnis ist ein String, der durch den Parser geht; `raw()` und jede String-Verkettung außerhalb des Tags sind Einfallstore. Lit ist hier strukturell sicherer.

**Bewertung:** Für statische Struktur mit imperativen Patches ist aufbau gleichauf und hat weniger Abstraktion. Für datengetriebenes Markup (Listen, Bedingungen, viele dynamische Werte) ist Lit deutlich besser: korrekter (Fokus, Zustand) und schneller.

---

## 6. Styles

| | Lit | aufbau |
|---|---|---|
| Notation | ``css`…` `` (nur `css`-Ergebnisse oder `unsafeCSS`) | String, Objekt (verschachtelt, camel → kebab), `ass`-Ergebnis, Funktion, Liste |
| Mechanismus | ein `CSSStyleSheet` pro Klasse, `adoptedStyleSheets` | dasselbe, zusätzlich pro Dokument |
| Light DOM | nicht vorgesehen: mit `createRenderRoot() { return this; }` greifen `static styles` nicht mehr | adoptiert in den Root, in dem das Element lebt (Dokument oder umgebender Shadow Root) |
| Vererbung | `static styles = [super.styles, css`…`]` von Hand | Ketten über `cssOf` |
| Cascade Layers | keine | `@layer aufbau.elements, aufbau.skin` |
| Theming | CSS Custom Properties, `::part` | Custom Properties, `::part`, Skins (`gestalt/skins/*.css`), `var` im Schema |

aufbau ist hier klar besser. Die Layer lösen ein Problem, das Lit-Nutzer mit Light DOM haben: Komponentenstyles gewinnen nicht mehr über Seitenstyles, weil `aufbau.elements` eine niedrigere Layer-Ebene ist als ungelayerte Autorenstyles. Skins und Config machen ein Design-System aus einem Satz Elemente. `var: true` im Schema spiegelt Attributwerte als Custom Property, damit CSS sie benutzen kann; bei Lit schreibt man dafür `styleMap` oder `style.setProperty` von Hand.

---

## 7. Shadow DOM, Light DOM, Slots

| | Lit | aufbau |
|---|---|---|
| Standard | Shadow DOM (`static shadowRootOptions`) | Light DOM |
| Wechsel | `createRenderRoot()` überschreiben | `static shadow = true` oder `{ delegatesFocus: true }` |
| Render-Ziel | immer der Render Root | `renderTarget`, überschreibbar (siehe `withSource`) |
| Kinder als Eingabe | Slots, `slotchange` von Hand | `withSource`: Quelle bleibt in den Kindern, Ausgabe in einem eigenen `slot="output"`, `MutationObserver` |

Light DOM als Standard passt zu aufbau: globale Styles, Skins und Formular-Elemente funktionieren ohne Durchreichen. Die Kosten: kein Kapselungsschutz, `innerHTML` überschreibt Kinder, die der Autor hineingeschrieben hat. Deshalb gibt es `withSource` mit der Trennung von Quelle und Ausgabe, eine Lösung, die Lit nicht braucht, weil Slots das übernehmen.

---

## 8. Events und DOM-Zugriff

### Lit

```js
render () { return html`<li @click=${() => this.select(item)}>…</li>`; }
@query('input') input;                   // decorator, or this.renderRoot.querySelector
```

Listener sitzen direkt an den Knoten und überleben Renderings, weil die Knoten überleben. Aufräumen beim Entfernen übernimmt der Browser (die Knoten werden mit dem Element verworfen). Globale Listener (`window`, `document`) räumt man in `disconnectedCallback` von Hand ab.

### aufbau

```js
onConnected () {
  this.$$('li').onClick((event, item) => this.select(item));   // delegated at the root
  this.on(window, 'resize', () => this.update());              // removed on disconnect
}
```

`Selection` ist eine eigene kleine Bibliothek: Selektoren werden bei jeder Benutzung neu aufgelöst, Listener hängen delegiert am Root (`composedPath()` plus `matches`), nicht-bubbelnde Events werden per Capture gefangen, alles hängt an einem `AbortSignal`, das `disconnectedCallback` auslöst. `emit` für eigene Events, `part`/`parts` und `$name`-Getter für benannte Teile.

**Bewertung:** aufbau ist hier ausgereifter als Lit. Lit braucht diese Mechanik nicht, weil die Knoten stabil sind; aufbau braucht sie, weil sie es nicht sind, und hat dabei ein allgemein nützliches Werkzeug gebaut (automatisches Aufräumen auch globaler Listener ist bei Lit ein Muster, das jeder selbst schreibt).

---

## 9. Formulare

Lit hat nichts eingebaut. Ein formularfähiges Lit-Element setzt `static formAssociated = true`, ruft `attachInternals()`, synchronisiert `setFormValue` und `setValidity` von Hand und implementiert die Form-Callbacks selbst. Es gibt Community-Mixins, aber keinen Standard.

`withControl` liefert das komplett:

| | |
|---|---|
| Wert | `value`-Attribut, `parseValue`/`formatValue`, `commit()`, `input`/`change`-Events |
| Formular | `setFormValue`, `formAssociatedCallback`, `formDisabledCallback`, `formResetCallback` (zurück auf `defaultValue`), `formStateRestoreCallback` |
| Validierung | `validate()` mit `required` und `customError` über `ElementInternals` |
| Zustand | `:state(disabled)`, `:state(readonly)`, ARIA über `internals`, innere Controls werden deaktiviert |
| Fokus | `focusTarget`-Delegation |
| Persistenz | `persist` speichert den Wert über `@bunker/storage` (local/session) |

aufbau ist hier weit vorn. Eine Abweichung von nativen Controls bleibt: bei `<input>` ist das `value`-Attribut der Default und die Property der aktuelle Wert; bei `withControl` ist das Attribut der aktuelle Wert, der Default wird beim ersten Verbinden als `_defaultValue` gemerkt. Das ist konsistent mit "Zustand im Attribut", aber es bedeutet: jeder Tastendruck schreibt ein Attribut und löst ein volles `update()` aus.

---

## 10. Komposition: Mixins, Controller, Context

| | Lit | aufbau |
|---|---|---|
| Mixins | ja, übliches Muster | ja: `withControl`, `withSource` |
| Controller | `addController({ hostConnected, hostDisconnected, hostUpdate, hostUpdated })` | nein; `track(stop)` und das Signal decken das Aufräumen ab |
| Context | `@lit/context` (Community-Protocol, Event-basiert) | nein; die globale Config ist eine Art seitenweiter Context |
| asynchrone Daten | `@lit/task` | von Hand (`src`-Attribut, `invalidate()`) |

Reactive Controllers sind Lits stärkstes Kompositionsmittel: ein Stück wiederverwendbares Verhalten mit eigenem Lebenszyklus, an jedes Element anhängbar, ohne Vererbungskette (`new ResizeController(this)`). Bei aufbau landet solches Verhalten entweder in einem Mixin oder in jedem Element einzeln.

---

## 11. Plattform-Features

| | Lit | aufbau |
|---|---|---|
| `ElementInternals` | von Hand | `internals` (lazy), `static internals` setzt Defaults (role, aria …) |
| `CustomStateSet` | von Hand | `states` mit `toggle`, Skeleton als `:state(skeleton)`/`:state(blank)` |
| `connectedMoveCallback` | nein | ja, `onConnectedMove` (Standard: disconnect + connect) |
| `adoptedCallback` | von Hand | `onAdopted` |
| Lade-Platzhalter | nein | Skeleton mit `ariaBusy` |
| Declarative Shadow DOM | ja, Hydration über `@lit-labs/ssr-client` | nein |
| Scoped Custom Element Registries | über `@lit-labs/scoped-registry-mixin` | nein |

aufbau ist bei den neueren Plattform-APIs schneller dran (Move, States, Internals). Lit dafür bei Server-Rendering und Registries.

---

## 12. Definieren und Laden

```js
// lit
customElements.define('my-thing', MyThing);    // or @customElement('my-thing')

// aufbau
MyThing.init();                                // tag from the class name: MyThing → my-thing
```

`init()` erzeugt außerdem die `$part`-Getter und `observedAttributes` und ignoriert doppelte Definitionen. `@aufbau/elements` hat einen `autoloader()`, der Elemente beim ersten Auftauchen im DOM nachlädt, und `load(tag)`/`registerAll()`. Lit hat dafür nichts im Kern; Lazy Loading ist Sache der Anwendung.

---

## 13. Typen, Tooling, Ökosystem

| | Lit | aufbau |
|---|---|---|
| Sprache | TypeScript zuerst, Decorators | JavaScript, `index.d.ts` |
| Schema zur Laufzeit | `elementProperties` (Map) | `schemaOf(Class)`, eingefroren, mit allen Namensformen |
| Editor | lit-analyzer, lit-plugin (Template-Typprüfung), Custom Elements Manifest Analyzer | Highlighting über `<write-code>`/syntax, sonst nichts |
| SSR | ja | nein |
| Doku, Community | groß, Google, viele Bibliotheken (Shoelace/Web Awesome, Material Web) | eine Person, 71 Elemente |
| Dev-Warnungen | Dev-Build mit Warnungen (z. B. Klassenfelder überschatten Properties) | `log.warn` an einzelnen Stellen |

Ein Punkt für aufbau, der oft übersehen wird: `static attr` ist ein reines Datenobjekt. Daraus lässt sich ohne Analyse des Codes eine Dokumentation, ein Custom Elements Manifest oder ein GUI-Formular erzeugen. Bei Lit braucht es dafür einen statischen Analyzer.

---

## 14. Größe und Performance

### Größe

| | min | gz |
|---|---|---|
| `@lit/reactive-element` 2.1.2 | 6,3 kb | 2,4 kb |
| `lit-html` 3.3.3 | 7,3 kb | 3,2 kb |
| **Lit gesamt** (mit `LitElement`, `css`) | rund 15 kb | rund 5,8 kb |
| `@aufbau/element` (alle `.js`, **unminifiziert**) | 38 kb | 11,6 kb |

Nicht direkt vergleichbar: aufbau enthält Forms, Config, Skins, Persistenz-Anbindung, Selections und Skeleton, Lit nichts davon. Minifiziert dürfte aufbau grob bei der Hälfte liegen, also in derselben Größenordnung wie Lit plus ein Forms-Mixin.

### Performance nach Fall

| Fall | Lit | aufbau | Grund |
|---|---|---|---|
| erstes Rendern | gut | gut | Template-Klon gegen `innerHTML`; beides schnelle Browser-Pfade |
| ein Wert ändert sich, Struktur fest | gut | gut bis besser | Lit: Wertevergleich pro Part. aufbau: `render()`-String + Vergleich, dann direkter Patch in `sync()` |
| ein Wert in `render()` ändert sich | gut | schlecht | aufbau baut den ganzen Teilbaum neu |
| mehrere Attribute nacheinander | ein Update | ein Update pro Attribut | kein Batching |
| Liste umsortieren | gut mit `repeat()` | schlecht | kein Keying, kompletter Neuaufbau |
| Eingabe in einem Control | gut | mittel | jeder Tastendruck: Attribut schreiben, volles `update()` |
| Werte lesen in heißen Pfaden | billig (Feld) | mittel | `getAttr` liest Attribut, prüft Reflexion, Config-Lookup, Umwandlung, `values`, `fn`, bei jedem Aufruf |
| Config/Skin-Wechsel | nicht vorhanden | ein Update pro betroffenem Element | gewollt, selten |

Kritische Stelle: `getAttr` in `sync()` wird bei jedem Update für jedes Attribut ausgewertet. Bei einem Element mit zehn Attributen und einem `sync()`, das alle liest, sind das zehn Umwandlungen samt Config-Lookups pro Update, multipliziert mit fehlendem Batching. Bei normalen Elementen unkritisch, bei Hunderten Instanzen (Tabellenzellen, Listeneinträge) messbar.

---

## 15. Wer ist wo besser

| Bereich | besser | warum |
|---|---|---|
| Steuerung aus HTML | aufbau | Attribute als Wahrheit, kebab-case, `values`, Config-Kaskade |
| Steuerung aus JS / Frameworks | Lit | echte Properties für jeden Datentyp |
| Update-Effizienz | Lit | Batching, `changedProperties` |
| Vorhersagbarkeit | aufbau | synchron, kein `await` |
| Rendern dynamischer Inhalte | Lit | Template-Parts, Knoten bleiben, Keying |
| Rendern statischer Struktur | gleichauf | aufbau mit `render`/`sync` ohne Abstraktion |
| Sicherheit beim Rendern | Lit | kein String-Parsing von Werten |
| Styles und Theming | aufbau | Layers, Skins, Light DOM, Objekt-CSS, `var` |
| Events, Aufräumen | aufbau | `Selection`, Signal-basiertes Abmelden |
| Formulare | aufbau | `withControl` komplett, Lit nichts |
| Plattform-APIs (States, Move, Internals) | aufbau | eingebaut |
| Komposition | Lit | Reactive Controllers, Context |
| SSR, Hydration | Lit | aufbau hat nichts |
| Tooling, Typen, Ökosystem | Lit | Analyzer, Manifest, Community |
| Einstieg für ein neues Element | gleichauf | Lit: ein Template. aufbau: Schema + `render` + `sync`, dafür kein Template-Lernen |

Kurz: **aufbau ist die bessere Grundlage für ein HTML-zentriertes Design-System** (Attribute, Styles, Formulare, Plattform). **Lit ist die bessere Grundlage für datengetriebene Komponenten** (Properties, Rendern, Komposition, SSR). Die Lücken von aufbau liegen fast alle in der zweiten Hälfte, und keine davon verlangt, die erste aufzugeben.

---

## 16. Was `@aufbau/element` noch fehlt

Sortiert nach Wirkung. Jeder Punkt so, dass das Attribut-zuerst-Modell bleibt.

### 16.1 Eine Property-Schicht aus dem Schema

**Problem:** Keine Properties, 16 handgeschriebene Setter, Daten ohne Attribut gehen an der Basisklasse vorbei.

**Vorschlag:** Das Schema erzeugt Accessoren. Für Attribut-Typen spiegeln sie das Attribut (Muster 1), für `prop: true` oder `type: Object/Array` halten sie einen Wert ohne Attribut (Muster 2).

```js
static attr = {
  pressed : Boolean,                        // el.pressed ↔ [pressed], generated
  nodes   : { type: Array, prop: true },    // el.nodes: stored value, no attribute, triggers an update
};
```

`getAttr('nodes')` liefert dann den gespeicherten Wert, die Fallback-Kette bleibt für Attribut-Einträge unverändert. Erzeugt in `init()` wie heute die `$part`-Getter. Ein Feld im Constructor oder ein Klassenfeld mit demselben Namen würde den Accessor überschatten; das ist dieselbe Falle wie bei Lit und verdient eine Warnung in `init()` oder `connectedCallback`.

### 16.2 Gesammelte Updates

**Problem:** Jede Attributänderung rendert sofort.

**Vorschlag:** `attributeChangedCallback` merkt sich den Namen und plant ein Update im Microtask. Wer das DOM sofort braucht, ruft `flush()`.

```js
requestUpdate (name) {
  (this._changed ??= new Set).add(name);
  this._done ??= Promise.resolve().then(() => { this.flush(); return true; });
}

flush () {
  if (!this._changed) return this;
  const changed = this._changed;
  this._changed = this._done = null;
  return this.update(changed);
}

get updateComplete () { return this._done ?? Promise.resolve(true); }
```

Das ändert die Semantik (heute synchron) und betrifft Code, der direkt nach `setAttribute` das DOM liest. Übergang: `static batch = true` pro Klasse, oder umgekehrt `static sync = true` als Ausnahme, bis alle Elemente umgestellt sind.

### 16.3 Geänderte Namen an die Hooks

**Problem:** `sync()` weiß nicht, was sich geändert hat, und setzt alles neu.

**Vorschlag:** `update(changed)` reicht das Set durch: `willUpdate(changed)`, `sync(changed)`, `onRender(changed)`. Beim ersten Durchlauf enthält es alle Namen. Dazu ein `onFirstRender()` (Lits `firstUpdated`), weil `onRender` heute bei jedem Neuaufbau läuft und Elemente Einmal-Initialisierung selbst absichern müssen.

```js
sync (changed) {
  if (changed.has('label')) this.$label.text(this.getAttr('label'));
  if (changed.has('busy'))  this.$button.node.disabled = this.getAttr('busy');
}
```

### 16.4 `getAttr` pro Update zwischenspeichern

**Problem:** Volle Auswertung bei jedem Lesen.

**Vorschlag:** Ein Cache pro Element, geleert bei `attributeChangedCallback` für den Namen, bei Config-Änderung für alles. Zusammen mit 16.2 heißt das: pro Update höchstens eine Umwandlung pro Attribut. Einfach, weil die Invalidierungsquellen bekannt und wenige sind (Attribut, Config, Property aus 16.1).

### 16.5 Rendern ohne Neuaufbau

**Problem:** `innerHTML` bei jeder Markup-Änderung.

Drei Wege, aufsteigend nach Aufwand:

| Weg | Idee | Kosten | Wirkung |
|---|---|---|---|
| a) Morphing | den neuen String in ein `<template>` parsen und den bestehenden Baum angleichen (wie idiomorph, morphdom) | ein Modul, rund 2 kb; Parsen bleibt | Knoten, Fokus, Zustand bleiben; `render()` darf dynamisch sein |
| b) Template-Parts | `html` in `elements/lib/html.js` ist schon ein Tagged Template: Strings pro Literal cachen, Lücken als Parts, nur Werte vergleichen | ein kleiner lit-html, rund 3 kb | Lits Modell, ohne Lit; Escaping entfällt, weil Werte nie geparst werden |
| c) `@rat/runtime` | `render()` liefert Knoten aus `el()`/`when()`/`each()`, gebunden an Signals | Abhängigkeit zur Runtime | feingranular, Brücke zu `@rat/elements` |

Empfehlung: **b** als Standard, weil der Tag schon existiert und die Elemente ihre Templates kaum ändern müssen. **c** als zweiter Renderer für Elemente, die in rat geschrieben werden. Die Trennung `render`/`sync` bleibt nützlich: auch mit Parts ist imperatives `sync()` für Dinge wie Canvas oder Fremdbibliotheken der richtige Ort.

Dafür muss der Renderer austauschbar werden: `update()` ruft `this.commit(this.render())` (Name frei), und je nach Rückgabetyp (String, Template-Result, Node) entscheidet ein kleiner Dispatcher. Heute ist der Pfad fest auf String.

### 16.6 Keyed Lists

Folgt aus 16.5: ohne Schlüssel baut jede Variante eine umsortierte Liste neu. Bei b ein `repeat(items, key, template)` wie bei Lit, bei c ist `each` mit Schlüssel schon in der Runtime vorgesehen.

### 16.7 Fehler beim Rendern abfangen

**Problem:** Eine Exception in `render()` oder `sync()` lässt das Element halb aktualisiert zurück; bei synchronem Update fliegt sie zudem in den Code, der `setAttribute` aufgerufen hat.

**Vorschlag:** `update()` fängt, loggt mit Tag-Namen, setzt `:state(error)` und ruft `onError(error)`. Der nächste erfolgreiche Durchlauf entfernt den State. Für ein Design-System heißt das: ein kaputtes Element sieht kaputt aus, statt die Seite anzuhalten.

### 16.8 Controller

**Problem:** Wiederverwendbares Verhalten (Resize, Intersection, Media Queries, Tastenkürzel, Fetch) landet in Mixins oder wird pro Element kopiert.

**Vorschlag:** `addController(controller)` mit `connected`, `disconnected`, `update(changed)`, `rendered()`. `track()` und `signal` existieren schon und machen das Aufräumen trivial. Mit Lits Protokoll kompatibel zu sein (`hostConnected` …) kostet nur Aliasse und öffnet die Lit-Controller-Bibliotheken.

```js
class ResizeController {
  constructor (host, callback) { this.host = host; this.callback = callback; host.addController(this); }
  connected () {
    const observer = new ResizeObserver(entries => this.callback(entries[0]));
    observer.observe(this.host);
    this.host.track(() => observer.disconnect());
  }
}
```

### 16.9 Context

**Problem:** Daten zwischen verschachtelten Elementen (eine Tabelle und ihre Zellen, ein Formular und seine Felder) laufen heute über `closest()` oder die globale Config.

**Vorschlag:** Das [Context Community Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md): der Konsument feuert `context-request` (bubbling, composed), der Anbieter antwortet mit einem Callback. Rund 1 kb, kompatibel mit `@lit/context` und anderen Bibliotheken, funktioniert durch Shadow-Grenzen.

### 16.10 Declarative Shadow DOM und Hydration

**Problem:** Elemente rendern immer im Browser, ein serverseitig erzeugtes Markup wird überschrieben.

**Vorschlag, in zwei Schritten:**

1. Im Constructor einen vorhandenen deklarativen Shadow Root übernehmen statt `attachShadow` zu rufen (`this.shadowRoot ?? this.attachShadow(…)`; `attachShadow` auf einem deklarativen Root leert ihn sonst).
2. Beim ersten `update()` vorhandenes Markup als `_markup` übernehmen, wenn ein Marker (`data-rendered` oder ein Hash) zum Ergebnis von `render()` passt. Dann entfällt der erste Neuaufbau. Mit 16.5 b wird daraus echte Hydration (Parts an bestehende Knoten binden).

Light-DOM-Elemente brauchen nur Schritt 2. Weil `render()` heute schon einen String liefert, ist serverseitiges Rendern für Light-DOM-Elemente fast geschenkt: dieselbe Funktion in Node aufrufen, braucht nur ein `getAttr` ohne DOM.

### 16.11 Custom Elements Manifest aus dem Schema

`static attr`, `static parts`, `static reflect` und die `emit`-Aufrufe ergeben fast vollständig ein `custom-elements.json`. Ein kleines Build-Skript erzeugt daraus Editor-Unterstützung (VS Code Custom Data, JetBrains), Doku-Seiten und Storybook-Controls. Das ist aufbaus stärkster Hebel im Tooling, weil das Schema Daten ist und kein Code analysiert werden muss. Fehlend dafür: eine Deklaration der Events und Slots im Schema (`static events = { change: 'value changed' }`, `static slots = […]`).

### 16.12 Kleinere Punkte

- **`toAttribute` im Schema:** heute schreibt `reflectAttrs` immer `String(value)`. Ein `format`-Gegenstück zu `fn` für Dates, Listen, Zahlen mit Einheit.
- **Interner Zustand:** `state: true` im Schema (ein Eintrag ohne Attribut, löst ein Update aus), statt Feld plus `invalidate().update()`.
- **`hasChanged`** für Property-Einträge aus 16.1, Standard `!==`.
- **Scoped Registries:** `init(name, registry)` statt fest `customElements`, sobald die Plattform sie breit unterstützt.
- **Dev-Modus:** Warnungen für Attribute außerhalb des Schemas, Werte außerhalb von `values`, Klassenfelder, die Accessoren überschatten, und `render()`-Strings, die sich bei jedem Update ändern (Zeichen für dynamische Werte am falschen Ort).
- **Signals:** ein `effect()`, der an den Lebenszyklus des Elements gebunden ist (`track` räumt ihn ab), damit `@aufbau/signals` oder `@rat/runtime` direkt in `sync()`-Logik nutzbar sind. Das ist die natürliche Brücke zu `@rat/elements`.

### Reihenfolge

1. **16.1 + 16.3 + 16.4:** Properties, geänderte Namen, Cache. Rückwärtskompatibel, entfernt die handgeschriebenen Setter und den größten Teil der Leselast.
2. **16.2:** Batching, mit Opt-in pro Klasse.
3. **16.5 b + 16.6:** Template-Parts im `html`-Tag. Der größte Gewinn für Korrektheit und Geschwindigkeit, ändert intern viel, für die Elemente wenig.
4. **16.7, 16.8, 16.9:** Fehler, Controller, Context.
5. **16.11:** Manifest, sobald Events und Slots im Schema stehen.
6. **16.10:** SSR und Hydration, wenn rat oder zugriff es brauchen.

Nach Schritt 3 hätte `@aufbau/element` alles, was Lit im Kern ausmacht, und behielte alles, worin es heute schon vorn liegt.

---

# anmerkungen

sehr hilfreiche analyse, gut gemacht!

an sich stimme ich *einem* großen grundsätzlichen umbau zu, jedoch hängt da noch bisschen mehr dran zu bedenken. hierzu erstmal ein paar gedanken meinerseits, die zu reflektieren sind, danach können wir ernsthaft neues konzept erstellen.

## 1. htx

(1.1) wieso sollte das `html` in `@aufbau/element` nicht schlichtweg `htx` sein? spricht da irgendwas kategorisch dagegen?

(1.2) `htx` selbst is ja im kern *mein html-syntax*, ddr sich aus der praxis heraus entwickelt hat und ähnlicher form hier und dort, und in diesem fall vorallem hier, mindestens teilweise wieder gebaut wird.

(1.3) darüberhinaus könnte `htx` ja noch einen renderer bekommen, der das wie von dir beschrieben rendert: template strings statisch, löcher, dies das usw.

(1.4) `@htx/js` könnte dann doch auch leisten, was bisher nur in/als `@htx/preact` geht. und funktioniert dann im prinzip doch standalone? (oder man kann nen renderer koppeln? oder quasi beides?)

(1.5) obendrein könnte es trotzdem noch `@htx/vdom` und `@htx/preact` geben htx mit preact usw. nutzen zu können.

(1.6) `@aufbau/element(s)` nutzt dann htx für `html`, hat so nice syntax + renderer, und is diesbzgl. nice wie lit?

(1.7) RAT nutzt dann "bloß" erstmal in erster linie ebenfalls `htx`.
- klinkt sich jedoch iwie durch mechanismus ein und erweitert in `html` innerhalb von nested template strings mit seinem zeug wie pipe-operator usw.
- in vollen `.rat` files macht der rat-compiler halt noch sein anderes zeug wie html-direktiven, `{...}` statt `${...}` usw., aber das findet ja quasi drumherum bzw vor htx statt?

(1.8) das erscheint mir alles als sauber und nachvollziehbar.

## 2. @aufbau/elements

(2.1) ich bin einverstanden mit deinen punkten/vorschlägen: `16.1`, 
`16.2`, `16.3`, `16.4`

(2.2) bzgl. deinem punkt `16.5` siehe hier meine punkte `1.1` bis `1.8`

(2.3) dein `16.7`: klingt vernünftig

(2.4) deinen punkt `16.8` kapier ich nich ganz worauf du genau hinauswillst. bitte nochmal genauer ausführen.

(2.5) hier war bisher schon mal angedacht dieses `static {...}` beim erstaufruf/-init/-load (irgendsowas jdf.) der klasse zu nutzrn um dort evtl derartige connections direkt zu ermöglichen. aber wurde noch nicht ausgearbeitet.

(2.6) bzgl. `16.10` hab ich ehrlich gesagt kp, weil ich derartig js und "ssr" noch nie gemacht habe und nur ständig iwo am.rande mitbekomme dass so voll das problematische ding sei. (ich komm ursprünglich von php. :D)

(2.7) gute idee bzgl. `16.11`

(2.8) bzgl. den kleineren punkten in `16.12` gucken wir dann nochmal konkret

---

# antworten

Zu deinen Punkten, in derselben Nummerierung. Grundlage für den htx-Teil ist der Code in `htx/packages` (main).

## zu 1. htx

### 1.1 htx als `html` in `@aufbau/element`

Kategorisch spricht nichts dagegen, im Gegenteil: htx ist dein Markup, es ist klein (Kern 2,3 kb gz) und bringt Dinge mit, die aufbau heute nur als String-Template hat. Drei Dinge ändern sich aber, und die muss man wollen:

| | heute (`elements/lib/html.js`) | mit htx |
|---|---|---|
| Ergebnis von `render()` | String, verglichen und per `innerHTML` gesetzt | Knoten oder ein Template-Ergebnis, nie ein String |
| Escaping | `html` escaped Werte, `raw()` umgeht es | entfällt: Werte werden nie geparst, nur `!html` parst ausdrücklich |
| Neu rendern | String-Vergleich, bei Änderung Neuaufbau | hängt vom Renderer ab (siehe 1.3) |

Der entscheidende Punkt: **`@htx/js` ist heute ein Builder, kein Renderer** (steht so in seiner README). Jeder Aufruf baut neue Knoten. Würde `render()` bei jedem `update()` `htx` aufrufen und die Knoten einsetzen, wäre das sogar schlechter als heute, weil der String-Vergleich wegfällt, der unnötige Neuaufbauten verhindert. htx als `html` für aufbau lohnt sich deshalb erst **zusammen mit dem Renderer aus 1.3**. Die Reihenfolge ist also: erst der htx-Renderer, dann `@aufbau/element` darauf umstellen.

Was aufbau mit htx zusätzlich bekommt: Tag-Selektoren (`<div.card#main>`), Prop-Gruppen, gemergte `class`/`style` (Array, Objekt, String) und vor allem **Shorthand-Tags**, die ziemlich genau auf `@aufbau/elements` passen (das README-Beispiel ist schon `<$icon 'bx:search' />` → `<aufbau-icon>`). Ein `html.define()` mit allen aufbau-Elementen würde `<input-color 'red' />` mit Positionswerten möglich machen.

### 1.2 htx als deine Markup-Syntax

Einverstanden. Das ist auch der Grund, warum es sich lohnt, htx zum gemeinsamen Nenner von aufbau, rat und zugriff zu machen, statt drei ähnliche Template-Dialekte zu pflegen.

### 1.3 Ein Renderer für htx

Geht, und htx hat die wichtigste Vorarbeit schon: `build(statics)` zerlegt ein Template genau einmal in ein Programm und cached es pro Template-Literal (`cache.get(statics)`). In diesem Programm ist für jede Stelle markiert, ob sie statisch ist oder aus einem `${…}` kommt (`built[i]` ist dann der Index ins `fields`-Array). Genau diese Information braucht ein Lit-artiger Renderer.

Was er tut:

```
first render of a template
  built program  →  <template> with markers at the dynamic places  →  clone
                 →  a list of parts: text, attribute, property, event, spread, child

every later render with the same template
  for each part: new value === old value ? nothing : write only this part
```

Was dabei htx-spezifisch zu lösen ist:

| htx-Feature | im Renderer |
|---|---|
| Tag-Selektoren, Prop-Gruppen | kein Problem, beides passiert schon beim Bauen |
| Shorthand-Tags, Positionswerte | beim Bauen auflösbar, solange der Tag statisch ist |
| gemergte `class`/`style` | ein dynamischer `class`-Teil muss mit den statischen Klassen des Elements zusammengeführt werden, nicht sie ersetzen |
| `<${Component}>` | ein Teil, der bei anderem Typ den Teilbaum austauscht |
| Funktionskomponenten | rendern ihr eigenes Template als verschachtelte Instanz |
| `...${spread}` | ein Teil, der alte Props entfernt und neue setzt |
| `!html` | ein Teil, der `innerHTML` nur bei Änderung schreibt |
| Arrays als Kinder | ein Listen-Teil, mit Schlüssel (`repeat`/`each`) für Umsortieren |

Wichtig: Ein solcher Renderer kann **nicht** als `h`-Adapter gebaut werden. Ein `h` bekommt bei jedem Aufruf fertige Werte und weiß nicht mehr, welche davon statisch waren. Der Renderer ist ein zweiter Abnehmer von `build()` (das der Kern schon exportiert), neben `evaluate()`.

### 1.4 `@htx/js` standalone

Ja. Es gäbe dann zwei Arten, htx im Browser ohne Preact zu nutzen:

```js
import { html, render } from '@htx/js';

const nodes = html`<p>${text}</p>`;                    // builder: one-shot nodes, as today
render(document.body, () => html`<p>${text}</p>`);     // renderer: parts, patched on every call
```

Offen ist nur die API-Form, weil `html` heute sofort Knoten liefert. Zwei Möglichkeiten:

- **a)** `html` liefert künftig ein leichtes Template-Ergebnis (Strings plus Werte, wie bei Lit), das erst `render()` oder ein Einfügen in Knoten verwandelt. Sauber, aber eine Änderung am Verhalten.
- **b)** Builder und Renderer bleiben getrennt: `@htx/js` baut wie bisher, ein neues `@htx/dom` (oder `@htx/js/render`) rendert. Kein Bruch, zwei Einstiege.

Ich würde b) nehmen: Der Builder ist für Einmal-Markup (Toasts, Dialoge, Markdown) genau richtig, und nichts Bestehendes bricht.

Zur Frage "Renderer koppeln": Die Kopplung über `createHTX(h, Fragment)` bleibt für die `h`-Adapter. Der Parts-Renderer koppelt sich eine Ebene tiefer an `build()`. Beides nebeneinander geht.

### 1.5 `@htx/vdom`, `@htx/preact`

Ja, die bleiben `h`-Adapter. Damit hätte htx zwei Familien:

| Familie | koppelt an | Pakete |
|---|---|---|
| `h`-Adapter | `createHTX(h, Fragment)` | `@htx/preact`, `@htx/vdom`, `@htx/js` (Builder), ein `@htx/string` für Server-Rendering (siehe 2.6) |
| Renderer | `build()` | `@htx/dom` (Parts, wie Lit) |

### 1.6 `@aufbau/element` mit htx

Ja, und dann:

- `render()` darf dynamische Werte enthalten, ohne dass Knoten verloren gehen. Die Trennung `render()`/`sync()` bleibt nützlich (Canvas, Fremdbibliotheken), ist aber keine Pflicht mehr.
- Fokus, Eingaben und Listener an inneren Knoten überleben Updates.
- `Selection`, delegierte Events, `part()` und `$name` bleiben wie sie sind; sie funktionieren mit stabilen Knoten sogar besser.
- Das ist 16.5 in der Variante b, nur mit htx statt mit dem bisherigen String-Tag.

### 1.7 rat auf htx

Das passt besser zusammen, als es auf den ersten Blick aussieht, mit einer Präzisierung: Das "Einklinken" passiert **zur Compile-Zeit, nicht zur Laufzeit**. htx sieht nie ein `|>` oder ein `@if`; der rat-Compiler übersetzt vorher.

```
.rat / .rat.js
   │  rat compiler: {…} → ${…}, @if/@for → helpers, |> and .. inside holes, $x → signals
   ▼
htx template with holes
   │  @htx/dom: statics parsed once, parts for the holes
   ▼
DOM
```

Damit das trägt, braucht der htx-Renderer zwei kleine Dinge:

1. **Eine Funktion in einem Loch ist eine Live-Bindung.** Bei `${() => $count}` legt der Renderer einen Effekt für genau diesen Teil an, statt den Wert einmal zu setzen. Das ist die ArrowJS-Regel ("ein Wert wird einmal gerendert, eine Funktion bleibt live"), und rats Compiler erzeugt ohnehin `() => expr` für jedes `{expr}`. Welche Signal-Bibliothek dahintersteht, bleibt austauschbar: Der Renderer bekommt nur eine `effect`-Funktion übergeben.
2. **Kontrollfluss als Helfer.** `@if` wird zu `${when(() => cond, () => html`…`, () => html`…`)}`, `@for` zu `${each(() => list, key, item => html`…`)}`. Das sind die Gegenstücke zu Lits `when` und `repeat`.

Folgen für rat:

- `@rat/runtime` schrumpft auf Signals plus diese Helfer; die eigene DOM-Schicht (`el`, `svg`, `insert` …) übernimmt `@htx/dom`.
- Das geplante `dom:clone`-Target (statische Teile einmal parsen, dann klonen) bekommt rat damit geschenkt, weil der Renderer genau das tut.
- rats htx-Syntax im Compiler (Tag-Selektoren, Prop-Gruppen, `class:`) entfällt dort, weil htx sie selbst versteht.
- Eine Sache gibt rat dabei auf: Heute weiß der rat-Compiler zur Compile-Zeit alles über das Markup und kann eigenen, sehr direkten Code erzeugen. Mit htx dazwischen entscheidet der Renderer zur Laufzeit (beim ersten Rendern). Das kostet einmal pro Template etwas Parsezeit, ist aber genau das, was Lit seit Jahren schnell genug macht.

### 1.8 Zusammengefasst

Das Bild ist stimmig: **htx als gemeinsame Markup-Schicht, ein Parts-Renderer als neuer Teil von htx, aufbau und rat als dessen Nutzer.** Bevor wir das Konzept schreiben, sind drei Dinge zu entscheiden:

1. API-Form des Renderers: neues Paket `@htx/dom` neben dem Builder (Empfehlung) oder `html` mit verändertem Verhalten.
2. Ob Funktionen in Löchern immer live sind (dann braucht jeder Nutzer eine `effect`-Funktion) oder nur, wenn eine übergeben wurde (sonst einmal aufgerufen). Empfehlung: nur mit übergebener `effect`-Funktion, damit `@htx/dom` ohne Signals funktioniert.
3. Wo die Kontrollfluss-Helfer leben (`@htx/dom`, `@rat/runtime` oder beide).

## zu 2. @aufbau/element

### 2.1 bis 2.3

Notiert: 16.1 bis 16.4 und 16.7 sind angenommen, 16.5 geht in die htx-Lösung über.

### 2.4 Controller, genauer

Es geht um wiederverwendbares **Verhalten mit Lebenszyklus**, das man an ein Element hängt, ohne dass das Element davon erben muss.

Ein Beispiel: Ein Element soll auf schmalen Bildschirmen anders rendern. Heute schreibt man das in jedes Element, das es braucht:

```js
class NavBar extends AufbauElement {
  onConnected () {
    this._query = matchMedia('(width < 600px)');
    this._onChange = () => this.update();
    this._query.addEventListener('change', this._onChange);
  }
  onDisconnected () { this._query.removeEventListener('change', this._onChange); }
  render () { return this._query.matches ? '…compact…' : '…full…'; }
}
```

Dasselbe für `data-table`, `app-area` und `dash-board`: dreimal derselbe Code, dreimal die Gefahr, das Abmelden zu vergessen. Mit einem Controller:

```js
class MediaQuery {
  constructor (host, query) { this.host = host; this.list = matchMedia(query); host.addController(this); }
  get matches () { return this.list.matches; }
  connected () { this.host.on(this.list, 'change', () => this.host.update()); }   // removed on disconnect by the host's signal
}

class NavBar extends AufbauElement {
  narrow = new MediaQuery(this, '(width < 600px)');
  render () { return this.narrow.matches ? '…compact…' : '…full…'; }
}
```

Der Unterschied zu Mixins (`withControl`, `withSource`):

| | Mixin | Controller |
|---|---|---|
| Beziehung | das Element **ist** etwas (ein Control) | das Element **hat** etwas (eine Media Query) |
| mehrfach | nein (`withResize(withResize(…))` geht nicht) | ja: zwei Media Queries, zwei Observer |
| Konfiguration | über statische Felder der Klasse | pro Instanz im Konstruktor |
| Namenskonflikte | Methoden zweier Mixins können sich überschreiben | jeder Controller ist ein eigenes Objekt |
| Kandidaten | Formular-Control, Quelle-und-Ausgabe | Media Query, Resize, Sichtbarkeit (Lazy Loading), Tastenkürzel, Laden über `src`, Gesten, Persistenz |

Der Controller hängt sich nur in die Hooks ein, die das Element ohnehin hat (`connected`, `disconnected`, vor und nach `update`). Weil aufbau mit `signal` und `track()` das Aufräumen schon gelöst hat, ist die Basis dafür rund 20 Zeilen in `AufbauElement`: eine Liste von Controllern und je ein Aufruf in `connectedCallback`, `release()` und `update()`. Auch `@aufbau/gestures` wäre als Controller natürlich: `swipe = new Gestures(this, { onSwipeLeft: … })`.

### 2.5 `static { … }`

Gemeint sind wohl Static Initialization Blocks (ES2022): ein Block in der Klasse, der genau einmal läuft, wenn die Klasse definiert wird.

```js
class NavBar extends AufbauElement {
  static attr = { compact: Boolean };
  static { this.init(); }   // runs once at class definition: define <nav-bar>
}
```

Was sich damit machen lässt:

- **Selbstregistrierung:** `static { this.init(); }` statt `NavBar.init()` unter der Klasse. Rein kosmetisch, aber es hält Definition und Registrierung zusammen.
- **Klassenweite Vorbereitung:** Schema auflösen, Styles als Sheet bauen, Part-Getter anlegen, einmal pro Klasse statt beim ersten Verbinden.
- **Controller deklarieren:** `static { this.use(MediaQuery, '(width < 600px)', 'narrow'); }` könnte registrieren, dass jede Instanz einen solchen Controller unter `narrow` bekommt. Das ist die deklarative Form von 2.4, passend zu `static attr` und `static styles`.

Zwei Dinge, die man dabei wissen muss:

- Ein Static Block läuft nur für die Klasse, in der er steht. Ein Block in `AufbauElement` läuft nicht für `NavBar`. Jede konkrete Klasse braucht ihren eigenen Block (oder die Basis erledigt die Arbeit lazy beim ersten `connectedCallback`, wie heute bei Schema und Styles).
- Selbstregistrierung ist ein Seiteneffekt beim Import. Für den Autoloader ist das egal (er importiert ohnehin nur, wenn das Element gebraucht wird), aber ein Element lässt sich dann nicht mehr importieren, ohne es zu definieren (etwa um davon abzuleiten oder es unter anderem Namen zu registrieren). Ein Mittelweg: `static { this.init(); }` nur in den Dateien unter `webcomponents/`, nicht in Basisklassen.

### 2.6 SSR, aus PHP-Sicht

Mit PHP hast du immer SSR gemacht, nur heißt es dort nicht so: Der Server baut HTML als String und schickt es; der Browser zeigt es sofort an. Das "problematische Ding" entsteht erst, wenn dieselbe Oberfläche **auch** im Browser von JavaScript gebaut wird:

1. Der Server muss dasselbe JavaScript ausführen, um dasselbe HTML zu erzeugen (also Node, Deno oder Bun statt PHP).
2. Der Browser bekommt das fertige HTML, lädt danach das JavaScript und muss es an das vorhandene HTML **anschließen**, statt es neu zu bauen: Listener anhängen, Zustand übernehmen. Das heißt **Hydration**.
3. Weicht das Ergebnis im Browser vom Server-HTML ab (andere Uhrzeit, zufällige IDs, Daten nur im Browser), passen die beiden nicht zusammen. Das sind die berüchtigten "hydration mismatches".
4. Der Zustand muss vom Server zum Browser kommen (serialisiert ins HTML), sonst rechnet der Browser alles nochmal.

Für aufbau sieht es entspannter aus als für React und Co.:

- **Light-DOM-Elemente** liefern in `render()` schon heute einen String. Dieselbe Funktion kann ein Server aufrufen, wie ein PHP-Template. Beim Upgrade im Browser müsste das Element nur erkennen, dass das Markup schon da ist, und den ersten Neuaufbau überspringen.
- **Shadow-DOM-Elemente** brauchen das HTML-Feature Declarative Shadow DOM (`<template shadowrootmode="open">` im Server-HTML), das inzwischen alle Browser können.
- Mit htx wäre ein `@htx/string`-Adapter (ein `h`, das Strings statt Knoten baut) die Server-Hälfte, und `@htx/dom` müsste vorhandene Knoten übernehmen können, statt neue zu klonen.

Gebraucht wird das für Seiten, die vor dem JavaScript sichtbar sein sollen (Inhaltsseiten, SEO, langsame Verbindungen). Für Apps wie zugriff, die ohnehin JavaScript brauchen, ist es nachrangig. Empfehlung: jetzt nicht bauen, aber darauf achten, dass `render()` rein bleibt (keine Seiteneffekte, kein Zugriff auf `window` beim Rendern), damit es später möglich ist.

### 2.7 und 2.8

Notiert: 16.11 kommt ins Konzept, 16.12 gehen wir einzeln durch, wenn es so weit ist.

## Nächster Schritt

Wenn du die drei Entscheidungen aus 1.8 triffst, schreibe ich das Konzept in zwei Teilen: **`@htx/dom`** (der Renderer, mit Parts, Live-Bindungen und Kontrollfluss-Helfern) und **`@aufbau/element` 3** (Properties aus dem Schema, gesammelte Updates mit geänderten Namen, `getAttr`-Cache, htx als Renderer, Fehler-State, Controller, Manifest).

---

# anmerkungen

## 1. HTX (zu `1.1` bis `1.8`)

### 1.

bei `1.3` bis `1.5` bin ich bisschen verwirrt und kapier nich wieso das "nicht als h-adapter gebaut werden kann". bzw. ich versteh den tenor als "iwie problematisch" überhaupt nich bzw. erscheint mir regelrecht tautologisch: irgendwas ist da noch nicht so, wie es sein müsste, aber damit es so wäre, müsste es anders werden. ja, und? wo problem?

ich sagte ja eingangs: im ersten schritt ist `htx` syntax. wie da was dann in welchem kontext dann konzipiert ist, damit diese syntax dann nutzbar ist mit irgendwelche tools, is doch ne frage der implementierung. oder anders ausgedrückt: dann provided `@htx` halt zwei/mehrere builder (oder was auch immer): für vdom/h/preact/usw. für lit-artig/aufbau-element/usw.

da muss sich doch für das bisherige "preact + htx" im ergebnis überhaupt nichts ändern. oder zumindest erschliesst sich mir null wieso es so sein sollte.

### 2. renderer für htx

wo der sitzen soll,ist vermutlich gar nicht so entscheidend, solang er nur enkoppelt (also sein eigenes ding ist) als eigenes package. aber wenn ich im namen `@htx/dom` lese, werde ich prinzipiell hellhörig und vermute fast, dass das eigtl. zu `@domina` gehört, vllt als `@domina/render`.

### 3. entscheidungen
1. mich dünkt `@domina/render` wäre richtige ort.
2. ja
3. bin mir unsicher

