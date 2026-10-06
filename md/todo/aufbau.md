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
  - [ ] anzahl input-files gesamt + je fileExt
  - [ ] anzahl output-files gesamt + je fileExt

---

## @aufbau/elements

### app
- [x] create `<app-area>`
- [ ] create `<app-config>`
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
- [ ] create `<data-table>`

### div
- [ ] create `<div-grid>` (noch unklar)
- [ ] create `<div-x>`
- [ ] create `<div-y>`

### embed
- [x] create `<embed-bandcamp>`
- [x] create `<embed-soundcloud>`
- [x] create `<embed-spotify>`
- [x] create `<embed-youtube>`

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

### menu (alles noch unklar)
- [ ] create `<menu-actions>`
- [ ] create `<menu-context>`
- [ ] create `<menu-float>`

### nav
- [x] create `<nav-crumbs>`
- [ ] create `<nav-chars>`
- [ ] create `<nav-paginate>`
- [x] create `<nav-toc>`

### pop
- [x] create `<pop-menu>`
- [x] create `<pop-modal>`
- [x] create `<pop-over>`
- [x] create `<pop-prompt>`
- [x] create `<pop-tip>`
- [x] create `<pop-toast>`

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
- [ ] optional: normalize-fn
- [ ] optional: validite-fn
- [ ] optional: datalist (?)
- [ ] optional: suggestions

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
