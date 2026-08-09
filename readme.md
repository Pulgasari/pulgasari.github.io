# todo

- [ ] `@aufbau/stylesheet` tunen
- [ ] optimistic ui stuff in aufbau

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


