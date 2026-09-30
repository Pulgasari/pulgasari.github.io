# aufbau

## aufbau/components

### app
- [ ] create `<app-config>`
- [ ] create `<app-root>`
- [ ] create `<app-panel>`
- [ ] create `<app-slot>`
- [ ] create `<app-view>`

### embed
- [ ] `<embed-bandcamp>`
- [ ] `<embed-soundcloud>`
- [ ] `<embed-spotify>`
- [ ] `<embed-youtube>`

### flow
- [ ] create `<flow-dropdown>`
- [ ] create `<flow-flyout>`
- [ ] create `<flow-loop>`
- [ ] create `<flow-popover>`

### input
- [ ] create `<input-color>`
- [ ] create `<input-country>`
- [ ] create `<input-date>`
- [ ] create `<input-email>`
- [ ] create `<input-font>`
- [ ] create `<input-password>`
- [ ] create `<input-text>`

### write
- [ ] create `<write-code>`
- [ ] create `<write-md>`
- [ ] create `<write-text>`

### dynamische components
- prüfen inwiefern es möglich ist ad-hoc custom elements zu generieren bspw. für neue imputs

### `<aufbau-fontpicker>`

basically ein `<aufbau-picker>` basierend auf `@aufbau/webfonts`

```html
<!-- aufbau handpicked/standard fonts -->
<aufbau-fontpicker></aufbau-fontpicker>
<aufbau-fontpicker type='monospace' scope='#some-element'></aufbau-fontpicker>
<aufbau-fontpicker lib='aufbau'></aufbau-fontpicker>

<!-- google fonts (using the sub-package)-->
<aufbau-fontpicker lib='google' type='monospace'></aufbau-fontpicker>
```

## @aufbau/elements

## @aufbau/filters

- [ ] untersuchen ob/inwiefern die neuen css "custom functions" neue möglichkeiten das package evtl. um reine css-varianten zu erweitern

## @aufbau/gui

- [ ] definition von "bereichen" durch array gedöns. also key + array = bereich
