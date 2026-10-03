# aufbau

## aufbau/components + aufbau/elements
- [ ] beide packages sollten als `@aufbau/elements` zusammengelegt werden
- [ ] in den klassen der webcomponents wird teilweise `_` statt `#` als präfix für interne identifierr genutzt. sollte überall geändert werde, wo möglich.
- [ ] überlegung: intern `htx` nutzen statt ner extra `html` function?
- [ ] überlegung: intern `ass` aus `@aufbau/ass` oder `css` von stylescript nutzen für die sheets?

## aufbau/components

### app
- [ ] create `<app-area>`
- [ ] create `<app-config>`
- [ ] create `<app-root>`
- [ ] create `<app-panel>`
- [ ] create `<app-slot>`
- [ ] create `<app-view>`

### btn
- [ ] create `<btn-icon>`
- [ ] create `<btn-tap>`

### data
- [ ] create `<data-chart>`
- [ ] create `<data-sheet>`
- [ ] create `<data-table>`

### div
- [ ] create `<div-x>`
- [ ] create `<div-y>`

### embed
- [ ] create `<embed-bandcamp>`
- [ ] create `<embed-soundcloud>`
- [ ] create `<embed-spotify>`
- [ ] create `<embed-youtube>`

### flow
- [ ] create `<flow-dropdown>`
- [ ] create `<flow-flyout>`
- [ ] create `<flow-loop>`
- [ ] create `<flow-popover>`

### input
- [ ] create `<input-address>`
- [ ] create `<input-bool>`
- [ ] create `<input-chips>`
- [ ] create `<input-color>`
- [ ] create `<input-country>`
- [ ] create `<input-currency>`
- [ ] create `<input-date>`
- [ ] create `<input-datetime>`
- [ ] create `<input-email>`
- [ ] create `<input-emoji>`
- [ ] create `<input-font>`
- [ ] create `<input-hotkey>`
- [ ] create `<input-language>`
- [ ] create `<input-locale>`
- [ ] create `<input-number>`
- [ ] create `<input-password>`
- [ ] create `<input-phone>`
- [ ] create `<input-search>`
- [ ] create `<input-slug>`
- [ ] create `<input-text>`
- [ ] create `<input-time>`
- [ ] create `<input-timezone>`
- [ ] create `<input-unit>`
- [ ] create `<input-url>`
- [ ] create `<input-year>`

### media
- [ ] create `<media-epub>`
- [ ] create `<media-font>`
- [ ] create `<media-gif>`
- [ ] create `<media-json>`
- [ ] create `<media-pdf>`
- [ ] create `<media-svg>`

### menu
- [ ] create `<menu-actions>`
- [ ] create `<menu-context>`
- [ ] create `<menu-float>`

### nav
- [ ] create `<nav-crumbs>`
- [ ] create `<nav-paginate>`

### pop
- [ ] create `<pop-menu>`
- [ ] create `<pop-modal>`
- [ ] create `<pop-prompt>`
- [ ] create `<pop-tip>`
- [ ] create `<pop-toast>`

### svg
- [ ] create `<svg-file>`
- [ ] create `<svg-flag>`
- [ ] create `<svg-icon>`
- [ ] create `<svg-logo>`
- [ ] create `<svg-sprite>`

### write
- [ ] create `<write-code>`
- [ ] create `<write-md>`
- [ ] create `<write-text>`

---

## menu-float

floating-menü das an 9 positionen sitzen könnte
1 : 'upper-left'
2 : 'upper-center'
3 : 'upper-right'

```html
<menu-float position='bottom center'
```

---

### dynamische components
- prüfen inwiefern es möglich ist ad-hoc custom elements zu generieren bspw. für neue imputs

### js-api

```javascript
import { doc } from '@aufbau/elements';

// define a <write-css> element derived from <write-code>
elements.define('write-css', 'write-code', { attr: { lang: 'css' } });

// now it could be used directly in html or in htx or js
const cssEditor = elements.create('write-css');
```

basically ein `<aufbau-picker>` basierend auf `@aufbau/webfonts`

```html
<!-- aufbau handpicked/standard fonts -->
<aufbau-fontpicker></aufbau-fontpicker>
<aufbau-fontpicker type='monospace' scope='#some-element'></aufbau-fontpicker>
<input-font lib='aufbau'></aufbau-fontpicker>

<!-- google fonts (using the sub-package)-->
<aufbau-fontpicker lib='google' type='monospace'></aufbau-fontpicker>
```

## @aufbau/elements

## @aufbau/filters

- [x] untersuchen ob/inwiefern die neuen css "custom functions" neue möglichkeiten das package evtl. um reine css-varianten zu erweitern

## @aufbau/gui

- [x] definition von "bereichen" durch array gedöns. also key + array = bereich

---

# experiment

ich will testweise ein interface schaffen wo folgendes miteinander gesynct ist, und man quasi auf allen ebenen des webdav auf den app-state zugreifen kann usw.

1. in `app-root` ein prop `state`
2. die keys darunter sind auch attribute am element und können geändert werden
3. sie gibts im css als customprops von `app-root`
4. falls machbar: in der url als queryparams
5. im config-panel

---

# notiz

```html
<app-root>
  <app-area name='main'>
    <app-view name='dashboard'>
      <search>...</search>
    </app-view>
    <app-view name='library'>
      <header>...</header>
      <crumbs>...</crumbs>
      <main>...</main>
      <search>...</search>
    </app-view>
    <app-view name='dashboard'>...</app-view>
    <app-view name='config'>...</app-view>
  </app-area>

  <app-area name='aside-left'>
    <app-slot></app-slot>
  </app-area>
  <app-area name='aside-right'>
    <app-slot></app-slot>
  </app-area>
  <app-area name='aside-bottom'>
    <app-slot></app-slot>
  </app-area>

  <app-area name='floating'></app-area> (??? siehe unten)
  <app-area name='modals'></app-area> (???)
  
<app-root>
```
