#

```javascript
const matchDisplayMode = value => window.matchMedia?.(`(display-mode: ${value})`)?.matches;      

const isStandalone = () => isClient()
                        && matchDisplayMode('standalone')
                        || matchDisplayMode('window-controls-overlay')
                        || window.navigator?.standalone === true;
```

```md
Caveat
Grenze
Grenze Gotisch
JetBrains Mono
Manrope
Manufacturing Consent
Montserrat
Noto Sans
roboto condensed
roboto flex
roboto mono
roboto serif
roboto slab
Rubik
Texturina

-- not variable
Germania One
Nova Cut
Nova Flat
Nova Oval
Nova Round
UnifrakturCook
UnifrakturMaguntia
```

# todo

- [ ] `@aufbau/stylesheet` tunen
- [ ] optimistic ui stuff in aufbau

## @bunker

- [ ] `@bunker/memo`
- [ ] `@bunker/opfs`

## cache + store

- `@aufbau/store` erschaffen
- `@aufbau/cache` evtl überarbeiten
- dient dann vorallem dazu intern caching und persistenz zu handeln.
- aber auch um dieses zeug über `aufbau-kits` mit am start zu haben
- es gibt ja auch ne native cache-api, es gibt localstorage, es gibt indexeddb. welches is für was am besten?
- was eignet sich zb für aktuelles css speichern sodass es beim neuladen der seite sofort vorhanden ist? (sodass nix flackern kann) quasi richtung optimistic-ui. (erst lädt das "alte" css bevor das neue gecached wird usw)


## @aufbau/elements

- [x] struktur-css (zb picker/combobox, oder dass bei inputs das icon rechts im input steht)
- [x] und evtl generell so standard-design für die elemente, dass simpel ist, quasi nur aus `currentcolor` als farbe besteht (bspw der slider) und vom stil flat/outlined/modern/clean ist
- [x] `<aufbau-code>` um support von `poo/hljs` erweitern: `import registerPoo from '@poo/hljs'; hljs.registerLanguage('poo', registerPoo);` (vermutlich wärs am sinnvollsten in aufbau-config n mechanismus zu schaffen, dass man da langs registrieren kann und standardmäßig poo damit registrieren)
- [x] `<aufbau-code>` um `editable`-attribut erweitern
- [x] `<aufbau-flag>` wird scheinbar vom stylesheet von `<aufbau-icon>` zerstört (bzw die mask überlagert)
- [x] `<aufbau-toggle>` zeigt nix, evtl `<aufbau-icon>` nutzen? (zb `famicons:toggle` und `mdi:checkbox-outline`)
- [x] evtl. mechanismus um elemente (nur controls?) optional persistent zu machen

- neues element: `<aufbau-modal>`
- überlegung: so elemente wie toast oder modal brauchen ja meist (also kenn ichs von preact, svelte und co) so ne art ankerpunkt im dom, falls das bei webcomponents auch so ist, wäre vllt ne überlegung ob das quasi <aufbau-config> automatisch sein könnte?

## zugriff apps

- userconfig-component schaffen, weil in irgendner form werden settings ja alle apps haben, die sich zwar tendenziell nur bzgl aspekten der optik-einstellungen inhaltlich überschneiden werden, aber

### ebooks


- festes app-menü unten:
  - lib(rary)
  - 
- meta-data:
  - title
  - author
  - jahr
  - verlag
  - serie/reihe
  - kategorie
  - tags



# notizen

```
abschrift, anschein,
durchblick,
einband, erleuchtung,
geleitwort,
handbuch,
leitbild, leitfaden,
nachweis,
quelltext,
regelwerk,
schimmer, sinnbild, struktur,
überblick, urbild, ursprung,
wegweiser,
zugriff
```

```
blueprints
builders / sitebuilders
crafters
engines
makers / sitemakers
systems
```

https://skypack.dev
https://svgjs.dev

---

```css
/* die geteilte Substanz — in jeder Variante dieselbe */
:root aufbau-splash {
  position: fixed; inset: 0;
  z-index: var(--aufbau-splash-z, 200);
  display: grid; place-items: center; gap: 1rem;
  background: var(--aufbau-bg, var(--bg, Canvas));
  color:      var(--aufbau-fg, var(--fg, CanvasText));
  font: 1rem/1 system-ui, sans-serif;      /* nicht auf Hubot Sans warten */
  opacity: 0;
  animation: aufbau-splash-reveal   var(--aufbau-splash-fade, 160ms) ease var(--aufbau-splash-delay, 180ms) both,
             aufbau-splash-failsafe 0s linear var(--aufbau-splash-limit, 10s) forwards;
}
:root aufbau-splash[data-state="done"]    { animation: aufbau-splash-dismiss var(--aufbau-splash-fade,160ms) ease both; pointer-events: none; }
:root aufbau-splash[data-state="skipped"] { display: none; }

@keyframes aufbau-splash-reveal   { to   { opacity: 1; } }
@keyframes aufbau-splash-dismiss  { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }
@keyframes aufbau-splash-failsafe { to   { opacity: 0; visibility: hidden; pointer-events: none; } }
```

```javascript
// in boot.js
/* neuer block in boot.js, VOR dem storage-block, eigener try/catch */
try {
  if (document.currentScript?.dataset.splash !== undefined) {
    const style = document.createElement('style');
    style.setAttribute('data-aufbau-splash', '');
    style.textContent = SPLASH_CSS;         // string-konstante im file
    (document.head || document.getElementsByTagName('head')[0])?.appendChild(style);
  }
} catch (error) { /* splash ist kosmetik, niemals die seite mitreissen */ }
```

```css
:root aufbau-splash {
  position: fixed; inset: 0; z-index: var(--aufbau-splash-z, 200);
  display: grid; place-items: center; gap: 1rem;
  background: var(--aufbau-bg, var(--bg, Canvas));
  color:      var(--aufbau-fg, var(--fg, CanvasText));
  font: 1rem/1 system-ui, sans-serif;
  opacity: 0;
  animation: aufbau-splash-reveal   var(--aufbau-splash-fade, 160ms) ease var(--aufbau-splash-delay, 180ms) both,
             aufbau-splash-failsafe 0s linear var(--aufbau-splash-limit, 10s) forwards;
}
:root aufbau-splash[data-state="done"]    { animation: aufbau-splash-dismiss var(--aufbau-splash-fade, 160ms) ease both; pointer-events: none; }
:root aufbau-splash[data-state="skipped"] { display: none; }

@keyframes aufbau-splash-reveal   { to   { opacity: 1; } }
@keyframes aufbau-splash-dismiss  { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }
@keyframes aufbau-splash-failsafe { to   { opacity: 0; visibility: hidden; pointer-events: none; } }

@media (prefers-reduced-motion: reduce) { :root aufbau-splash { --aufbau-splash-fade: 0s; } }
```
