# aufbau

## aufbau/components

### app
- [ ] create `<app-area>`
- [ ] create `<app-config>`
- [ ] create `<app-root>`
- [ ] create `<app-panel>`
- [ ] create `<app-slot>`
- [ ] create `<app-view>`

### btn
- [ ] create `<btn-copy>`
- [ ] create `<btn-cut>`
- [ ] create `<btn-share>`
- [ ] create `<btn-paste>`

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

### menu-floating
- [ ] create `<menu-float>`

### svg
- [ ] create `<svg-file>`
- [ ] create `<svg-flag>`
- [ ] create `<svg-icon>`
- [ ] create `<svg-logo>`
- [ ] create `<svg-sprite>`

### view
- [ ] create `<view-epub>`
- [ ] create `<view-font>`
- [ ] create `<view-gif>`
- [ ] create `<view-json>`
- [ ] create `<view-pdf>`
- [ ] create `<view-svg>`

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

- [ ] untersuchen ob/inwiefern die neuen css "custom functions" neue möglichkeiten das package evtl. um reine css-varianten zu erweitern

## @aufbau/gui

- [ ] definition von "bereichen" durch array gedöns. also key + array = bereich







Jo das reicht erstmal, guck ich mir morgen genauer an.

jetzt nochmal zurück zu `aufbau` und `zugriff/apps/files`. Ich hab bissi überlegt. Bin mir noch bei allem sicheg aber das bild fügt sich langsam.

ich denke wir sollten die machen:
<app-root> (wie gehabt)
<app-area> (führ ich gleich weiter aus)
 <app-view> (wie gehabt)
<app-slot>
<app-panel>
<app-modal> 
<app-config> (ist quasi was aktuell Settings war, aber finde config passender. Kann als modal, panel oder view gemounter werden.)

<area> is für mich quasi die große unterteilung einer app-ui und mit eindeutige name. Zb für `zugriff/files` würde ich jetzt sowas bauen wollen,wobei der grundrahmen schon mit "generell für zugriff" gedacht ist.

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

  <app-area name='aside-left'></app-area>
  <app-area name='aside-right'></app-area>
  <app-area name='aside-bottom'></app-area>
  <app-area name='floating'></app-area>
  <app-area name='modals'></app-area>
  
<app-root>
```




