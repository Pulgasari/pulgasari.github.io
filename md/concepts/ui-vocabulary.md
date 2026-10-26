# ui vocabulary :: say what, the target says how

An app names **what** it needs: a list you can pick from, a button, a dialog. It does not name
which library draws it. A mapping per target turns the words into real elements:

```html
<ui:list items={$tracks} select='multiple' on:change={pick}>
  <ui:item>{item.title}</ui:item>
</ui:list>

<ui:button icon='settings' label='Settings' on:press={openSettings} />
```

| target | `ui:list` | `ui:button` |
|---|---|---|
| web, aufbau | `<data-index>` + `<data-item>` | `<btn-icon>` |
| web, another set | its list | its button |
| native (later, maybe) | a list of slint / dioxus | a button of it |

---

## why

- **An app does not hang on one element set.** Today the markup of the apps is `<data-index>`, `<btn-icon>`, `<pop-toast>` of aufbau. Swapping one element, or aufbau as a whole, means touching every app.
- **The build knows what an app uses.** The words in the markup are the list of elements: no `autoloader()`, no hand-written `import` list in `config.rat.js`. The mapping turns them into imports.
- **Behaviour lives in the contract, not in each app.** Selection, keyboard navigation and a long press are part of what `ui:list` means. Every target has to bring them, the app does not build them again (noisy's `browse.js` does today).
- **A door to other targets stays open.** Every project that renders the same source to web and native (React Native, Slint, Lynx, NativeScript) works with a small vocabulary of its own. Arbitrary html and css do not translate.

---

## the three parts

### 1. the vocabulary: words with a contract

A word is a promise: these props, these events, these slots, this behaviour. The format exists
already: the **Custom Elements Manifest** (`custom-elements.json`) that aufbau writes for its
elements. The vocabulary is a manifest of contracts, without an implementation:

```jsonc
// vocabulary.json (rat or its own package)
{
  "ui:list": {
    "props"  : { "items": "array", "select": "'none' | 'single' | 'multiple'", "layout": "'list' | 'grid'" },
    "events" : { "change": "{ selected: key[] }", "activate": "{ key }" },
    "slots"  : { "item": "one entry" },
    "means"  : "a scrolling list of entries. click picks one, ctrl/meta toggles, shift a range, a long press toggles. arrows move, space picks"
  },
  "ui:button": {
    "props"  : { "label": "string", "icon": "string", "variant": "'primary' | 'plain'" },
    "events" : { "press": "{}" },
    "means"  : "an action. enter and space press it"
  }
}
```

Small on purpose. The words every app has: `ui:button`, `ui:list`, `ui:item`, `ui:input`, `ui:select`,
`ui:dialog`, `ui:toast`, `ui:icon`, `ui:menu`, `ui:tabs`, `ui:panel`, `ui:area`. A word comes when a second
app needs the same thing, not before.

### 2. the mapping: one per target

```js
// @aufbau/elements/rat.js: aufbau says how it fulfils the vocabulary
export default {
  'ui:button' : { tag: 'btn-icon',   module: 'webcomponents/btn-icon.js',   props: { press: 'click' } },
  'ui:icon'   : { tag: 'svg-icon',   module: 'webcomponents/svg-icon.js' },
  'ui:list'   : { tag: 'data-index', module: 'webcomponents/data-index.js', props: { layout: 'viewmode' } },
  'ui:item'   : { tag: 'data-item',  module: 'webcomponents/data-item.js' },
  'ui:toast'  : { tag: 'pop-toast',  module: 'webcomponents/pop-toast.js' },
};
```

The mapping belongs to the **element library**, not to rat: whoever implements the words knows them.
rat only reads it. `config.rat.js` picks the library:

```js
export default {
  ui : '@aufbau/elements/rat.js',
};
```

### 3. the compiler: words in, tags and imports out

The compiler already reads every tag of the markup. A `ui:` tag is looked up in the mapping:

```html
<!-- the app -->
<ui:button icon='settings' label='Settings' on:press={openSettings} />
```

```js
// what the compiled module holds (web, aufbau)
import '@aufbau/elements/webcomponents/btn-icon.js';
… html`<btn-icon icon="settings" label="Settings" onclick=${openSettings}></btn-icon>` …
```

- without a build the loader resolves the module through the import map, as with any import
- with a build the import is static: the bundle holds exactly the elements the app names
- a word the mapping does not have is a compile error with its name, not a silently undefined tag

---

## what stays open on purpose

- **Styling.** A word has no css of its own in the app. Look comes from tokens (gestalt: palette, density,
  geometry, space), which every target can read. `class` and `style` stay possible, as the way out of the vocabulary
  for one app, and that part does not translate.
- **Layout.** Flex and grid, the model web and native both have (on native through taffy). `ui:` is about
  controls, layout stays plain markup (`<div>`, `<rat-area>`).
- **Words of one app.** Anything else stays a normal component (`<Cover>`) or a normal tag. The vocabulary
  is not meant to cover everything.

---

## steps

1. **The vocabulary of the words the apps use today**, written down as contracts (props, events, behaviour).
2. **The mapping of aufbau**, in aufbau.
3. **The compiler**: `ui:` tags through the mapping, the module as an import. `config.rat.js` names the mapping.
4. **One app moved** (noisy: list, button, toast, icon), to see where a contract is missing something.
5. **Later, maybe:** a second mapping (another element set) as a test that the words carry. A native target only
   after that, and only as research.
