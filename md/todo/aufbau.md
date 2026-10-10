# aufbau

## aufbau/components + aufbau/elements
- [x] beide packages sollten als `@aufbau/elements` zusammengelegt werden
- [x] überlegung: intern `htx` nutzen statt ner extra `html` function?
- [x] überlegung: intern `ass` aus `@aufbau/ass` oder `css` von stylescript nutzen für die sheets?

---

## @aufbau/bundler
- [ ] evtl. besseren namen für das package finden
- [ ] evtl. deno-kompatibel machen

### statistik erweitern
  - [x] anzahl input-files gesamt + je fileExt
  - [x] anzahl output-files gesamt + je fileExt
  - [x] gzip/brotli, bereiche, größte files, duplikate, zeit je schritt

---

## @aufbau/elements

### app
- [x] create `<app-area>`
- [x] create `<app-config>`
- [x] create `<app-root>`
- [x] create `<app-panel>`
- [ ] create `<app-section>` (??? noch unklar)
- [ ] create `<app-slot>`
- [x] create `<app-view>`

### btn
- [x] create `<btn-icon>`
- [x] create `<btn-push>` (name nicht perfekt)
- [x] create `<btn-tap>`

### data
- [ ] create `<data-chart>`
- [ ] create `<data-form>`
- [ ] create `<data-sheet>`
- [x] create `<data-table>`

### div
- [ ] create `<div-grid>` (noch unklar)
- [x] create `<div-x>`
- [x] create `<div-y>`

### embed
- [x] create `<embed-bandcamp>`
- [x] create `<embed-soundcloud>`
- [x] create `<embed-spotify>`
- [x] create `<embed-youtube>`

### input
- [x] create `<input-address>`
- [x] create `<input-bool>`
- [x] create `<input-chips>`
- [x] create `<input-color>`
- [x] create `<input-country>`
- [x] create `<input-currency>`
- [x] create `<input-date>`
- [x] create `<input-datetime>`
- [x] create `<input-email>`
- [x] create `<input-emoji>`
- [x] create `<input-font>`
- [x] create `<input-hotkey>`
- [x] create `<input-language>`
- [x] create `<input-locale>`
- [x] create `<input-number>`
- [x] create `<input-password>`
- [x] create `<input-phone>`
- [x] create `<input-search>`
- [x] create `<input-slug>`
- [x] create `<input-text>`
- [x] create `<input-time>`
- [x] create `<input-timezone>`
- [x] create `<input-unit>`
- [x] create `<input-url>`
- [x] create `<input-year>`

### media
- [ ] create `<media-epub>`
- [x] create `<media-font>`
- [x] create `<media-gif>`
- [x] create `<media-json>`
- [x] create `<media-pdf>`
- [x] create `<media-svg>`

### menu (alles noch unklar)
- [ ] create `<menu-actions>`
- [ ] create `<menu-context>`
- [ ] create `<menu-float>`

### nav
- [x] create `<nav-crumbs>`
- [x] create `<nav-chars>` (als `<nav-initials>`)
- [x] create `<nav-paginate>`
- [x] create `<nav-toc>`

### pop
- [x] create `<pop-menu>`
- [x] create `<pop-modal>`
- [x] create `<pop-over>`
- [x] create `<pop-prompt>`
- [x] create `<pop-tip>`
- [x] create `<pop-toast>`

### svg
- [x] create `<svg-file>`
- [x] create `<svg-flag>`
- [x] create `<svg-icon>`
- [x] create `<svg-logo>`
- [x] create `<svg-sprite>`

### write
- [x] create `<write-code>`
- [x] create `<write-md>`
- [x] create `<write-text>`

### ???
- headline element, evtl. smart bzgl hierarchie usw

---

## data-form
- [ ] action: export (json, html, xml, queryParams)
- [ ] action: import (json, html, xml, queryParams)
- [x] action: clear
- [x] action: reset
- [ ] action: save | auto-save on/off | persist on/off
- [ ] action: toggle-keyboard

## input-chips
- [x] optional: normalize-fn (`transform`)
- [x] optional: validite-fn (`accept`, `pattern`)
- [x] optional: datalist (?)
- [x] optional: suggestions (`suggestions`, `suggest`)

---

## @aufbau/filters
- [x] untersuchen ob/inwiefern die neuen css "custom functions" neue möglichkeiten das package evtl. um reine css-varianten zu erweitern

---

## @aufbau/gui
- [x] definition von "bereichen" durch array gedöns. also key + array = bereich

---

## @aufbau/svg
- [x] dieses package sollte mit `@aufbau/icons` zusammengelegt werden als `@aufbau/svg`
- [x] die files in `aufbau/svg/icons` sollten dann im `<svg-icon>` element unter dem präfix `aufbau` nutzbar sein
- [x] selbiges gilt für die files in `aufbau/svg/logos` als neues `<svg-logo>` element

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
