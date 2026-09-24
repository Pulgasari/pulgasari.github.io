#

- https://github.com/pulgasari/aufbau
- https://github.com/pulgasari/bunker
- https://github.com/pulgasari/cosmonaut
- https://github.com/pulgasari/domina
- https://github.com/pulgasari/htx
- https://github.com/pulgasari/js-packages
- https://github.com/pulgasari/poo
- https://github.com/pulgasari/skullface
- https://github.com/pulgasari/zugriff

---

- https://github.com/pulgasari/classcade
- https://github.com/pulgasari/dingsbums
- https://github.com/pulgasari/modflow

---

```
fast-xml-parser
xml2js
```

```javascript
const matchDisplayMode = value => window.matchMedia?.(`(display-mode: ${value})`)?.matches;      

const isStandalone = () => isClient()
                        && matchDisplayMode('standalone')
                        || matchDisplayMode('window-controls-overlay')
                        || window.navigator?.standalone === true;
```




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
abschrift, anblick, anschein,
durchblick,
einband, erleuchtung,
faulpelz,
geleitwort, gestalt,
handbuch, huckepack,
leitbild, leitfaden,
nachweis,
quelltext,
regelwerk,
schimmer, sinnbild, struktur,
überblick, urbild, ursprung,
wegweiser,
```

```
androgyn
```

```
esmx
modcraft
modflow
modgate
modlink
modline
modpack
modpipe
modwire
phantom
```

```
blueprints
builders / sitebuilders
crafters
engines
makers / sitemakers
systems
```



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
