## idea

- native html-tags sind reserviert
- webcomponents-semantik funktioniert vollumfänglich
- man kann custom-tags definieren
- wenn custom-tags nicht definiert wurden, wird daraus `<div>` und der tagname als class
- kurzform `#foo` für id
- kurzform `#-bar` für multi-level combined id

## basic example

```html
<h2>the pieces</h2>
<div class="grid">

  <div class="card">
    <strong>pinchable</strong>
    <div class="pad" id="pinch">pinch me</div>
    <div class="read" id="pinch-read">scale 1.00</div>
  </div>

  <div class="card">
    <strong>rotatable</strong>
    <div class="pad" id="rotate-pad">rotate me</div>
    <div class="read" id="rotate-read">0°</div>
  </div>

  <div class="card">
    <strong>swipeable</strong>
    <div class="pad" id="swipe">swipe me</div>
    <div class="read" id="swipe-read">—</div>
  </div>
</div>
```

```xml
<h2>the pieces</h2>
<grid>
  <card #pinch>
    <strong>pinchable</strong>
    <pad #pinch-pad>pinch me</pad>
    <read #pinch-read>scale 1.00</read>
  </card>

  <card #rotate>
    <strong>rotatable</strong>
    <pad #-pad>rotate me</pad>
    <read #-read>0°</read>
  </card>

  <card #swipe>
    <strong>swipeable</strong>
    <pad #swipe-pad>swipe me</pad>
    <read #swipe-read>—</read>
  </card>
</grid>
```
