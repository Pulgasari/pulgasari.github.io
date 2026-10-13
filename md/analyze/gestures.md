# `@aufbau/gestures` im Vergleich

`@aufbau/gestures` 2.0 gegen die beiden Bibliotheken, nach denen gefragt war, **Hammer.js** und **TheFinger**, und gegen die drei, die in diesem Feld heute tatsächlich den Ton angeben:
- **@use-gesture** (Gesten als Zustandsstrom)
- **interact.js** (Ziehen, Skalieren, Ablegen)
- **TinyGesture** (die kleinste gepflegte Alternative)

Am Rand: ZingTouch, AlloyFinger, SortableJS und das, was die Plattform inzwischen selbst kann.

Grundlage ist jeweils der Quellcode des aktuellen npm-Pakets (Oktober 2026), nicht die Doku. Größen: minifiziert und gzip, mit esbuild gemessen.

- [1. Kurzfassung](#1-kurzfassung)
- [2. Die Kandidaten](#2-die-kandidaten)
- [3. Eingabemodell: Pointer, Touch, Maus](#3-eingabemodell-pointer-touch-maus)
- [4. Architektur](#4-architektur)
- [5. Was ein Handler bekommt](#5-was-ein-handler-bekommt)
- [6. Gesten-Katalog](#6-gesten-katalog)
- [7. Schwellen und Voreinstellungen](#7-schwellen-und-voreinstellungen)
- [8. Arbitrierung: wer bekommt die Geste](#8-arbitrierung-wer-bekommt-die-geste)
- [9. Scrollen und `touch-action`](#9-scrollen-und-touch-action)
- [10. Trackpad, Mausrad, Kontextmenü](#10-trackpad-mausrad-kontextmenü)
- [11. API-Form und Ereignisse](#11-api-form-und-ereignisse)
- [12. Verhalten: Bundles gegen interact.js und Co.](#12-verhalten-bundles-gegen-interactjs-und-co)
- [13. Barrierefreiheit](#13-barrierefreiheit)
- [14. Performance](#14-performance)
- [15. Robustheit](#15-robustheit)
- [16. Wer ist wo besser](#16-wer-ist-wo-besser)
- [17. Was `@aufbau/gestures` noch fehlt](#17-was-aufbaugestures-noch-fehlt)

---

## 1. Kurzfassung

| | aufbau | Hammer.js | TheFinger | @use-gesture | interact.js | TinyGesture |
|---|---|---|---|---|---|---|
| Version | 2.0 | 2.0.8 (2016) | 1.0.4 (2025) | 10.3.1 (2024) | 1.10.28 (2026) | 3.0.1 (2026) |
| gepflegt | ja | nein (Fork `@egjs/hammerjs`) | ja, jung | kaum noch | ja | ja |
| Eingabe | Pointer Events | Pointer, sonst Touch + Maus | nur Touch Events | Pointer Events | Pointer Events | Touch + Maus |
| Maus, Stift | ja, je eigene Toleranz | ja | **nein** | ja | ja | Maus ja |
| Trackpad-Pinch/-Drehung | ja | nein | nein | ja | nein | nein |
| Arbitrierung | Claims, Priorität, `after` | `recognizeWith`, `requireFailure`, Zustandsautomat | keine | pro Geste, Achsen-Sperre | pro Aktion | keine |
| `touch-action` | aus den Gesten berechnet | aus den Gesten berechnet | `preventDefault` nach Winkel | Optionen | gesetzt pro Aktion | — |
| DOM-Ereignisse | ja, bubbelnd, Delegation | optional | nein | nein | eigene Events | eigener Emitter |
| fertiges Verhalten | 6 Bundles mit Tastatur | nein | nein | nein (mit Spring-Libs) | Drag, Resize, Drop, Snap, Inertia | nein |
| Größe (gz) | 5,4 kb Kern, 9,9 kb mit Bundles | 7,4 kb | 3,7 kb | 9,2 kb | 29,5 kb | 2,4 kb |

Das Ergebnis vorweg: **`@aufbau/gestures` ist im Kern auf dem Stand von @use-gesture und konzeptionell weiter als Hammer.js.** Es hat das sauberste Session-Modell der Gruppe, als einzige Bibliothek Gesten als echte DOM-Ereignisse mit Delegation, den Trackpad-Pfad und Bundles mit Tastatur-Gegenstück. TheFinger spielt in einer anderen Liga: ein kleines, junges Touch-Werkzeug mit eigenen Ideen (Doppeltippen-und-Ziehen, richtungsabhängiges Scroll-Verhindern), aber ohne Maus, ohne Stift und ohne `touchcancel`. Die Lücken von aufbau liegen in der Robustheit über Elementgrenzen hinweg, in der Performance der Bundles und in der Laufzeit-Steuerung (Abschnitt 17).

---

## 2. Die Kandidaten

### Hammer.js

2012 von Jorik Tangelder, jahrelang **die** Gesten-Bibliothek (Angular Material, viele Slider und Karten nutzten sie). Version 2.0.8 erschien im April 2016, danach kam nichts mehr. Naver pflegt einen Fork (`@egjs/hammerjs` 2.0.17) mit ES-Modulen und kleinen Korrekturen, ohne neue Konzepte. Hammer prägte das Vokabular, das fast alle späteren Bibliotheken übernommen haben: `tap`, `press`, `pan`, `swipe`, `pinch`, `rotate`, die `…start/…move/…end`-Phasen und `velocity` in px/ms.

### TheFinger

Von Oleksii Segodin (nordskill), erschienen im Juni 2025, ISC-Lizenz, Website thefinger.dev. Eine einzelne Klasse mit rund 900 Zeilen auf **Touch Events**, ohne Abhängigkeiten. Bringt zwei Gesten mit, die sonst kaum jemand hat (`two-finger-tap`, `double-tap-and-drag`) und eine Testumgebung, die Fingerbewegungen über künstliche `TouchEvent`s simuliert.

### @use-gesture

Aus dem pmndrs-Umfeld (react-spring, react-three-fiber), mit Bindings für React und Vanilla (`@use-gesture/vanilla`). Anders gedacht als alle anderen: Statt benannter Gesten liefert es für `drag`, `pinch`, `wheel`, `scroll`, `move` und `hover` einen fortlaufenden **Zustand** (`offset`, `movement`, `velocity`, `direction`, `first`, `last`, `memo`), den man direkt in eine Animation steckt. Mit Grenzen, Gummiband-Effekt, Achsen-Sperre und Trackpad-Pinch. Version 10.3.1 vom März 2024, seitdem ruhig.

### interact.js

Seit 2012, Taye Adeyemi. Keine Gesten-Erkennung im engeren Sinn, sondern **Aktionen**: Ziehen, Größe ändern, Ablegen, Mehrfinger-`gesture`, mit Modifikatoren (Raster, Einrasten, Begrenzen), Trägheit und Autoscroll. Arbeitet auf Selektoren (`interact('.item')`), also delegiert. Der nächste Verwandte der aufbau-Bundles, nicht der Recognizer.

### TinyGesture

2,4 kb, Hunter Perrin (sciactive), Version 3 (2026). Swipe, Pan, Tap, Doppeltippen, Long Press, Pinch, Rotate auf Touch und Maus. Bemerkenswert: Die Swipe-Schwelle ist eine Funktion (Standard: 15 % der Fensterbreite), nicht eine feste Pixelzahl.

### Am Rand

| | | Stand |
|---|---|---|
| ZingTouch | Gesten pro "Region", eigene Gesten über Klassen | seit 2022 still |
| AlloyFinger | Tencent, 2 kb, Touch-Events, bekannt aus China | seit 2022 still |
| SortableJS | Listen umsortieren, das Gegenstück zum `sortable`-Bundle | gepflegt, 12,9 kb |

---

## 3. Eingabemodell: Pointer, Touch, Maus

Die wichtigste technische Entscheidung, weil sie alles Weitere begrenzt.

| | Pointer Events | Touch Events | Maus Events |
|---|---|---|---|
| Geräte | Maus, Finger, Stift in einem Pfad | nur Finger (und Stift, wo der Browser ihn als Touch meldet) | nur Maus |
| Abbruch durch den Browser | `pointercancel` | `touchcancel` | keiner |
| Scrollen verhindern | deklarativ über `touch-action` | `preventDefault()` in nicht-passiven Listenern | — |
| Stiftdaten | `pressure`, `tiltX`, `twist`, `pointerType` | teilweise (`force`) | — |
| Doppelte Ereignisse | nein | Maus-Kompatibilitätsereignisse folgen | — |

- **aufbau** und **@use-gesture** und **interact.js** arbeiten auf Pointer Events. Maus, Finger und Stift laufen durch denselben Code; aufbau gibt jedem Eingabetyp sogar eine eigene Toleranz (Maus 4, Stift 8, Finger 10 px).
- **Hammer.js** wählt beim Start eine Eingabeklasse: `PointerEventInput`, wo es Pointer Events gibt, sonst `TouchMouseInput`, das Touch und Maus zusammenführt und die nachgeschobenen Maus-Ereignisse nach einem Touch herausfiltert. Das war 2016 nötig, heute ist es Ballast.
- **TheFinger** hört nur auf `touchstart`, `touchmove`, `touchend`. Auf einem Desktop mit Maus passiert nichts, auf einem Laptop mit Touchscreen nur mit dem Finger. Es fehlt außerdem `touchcancel`: Übernimmt der Browser den Finger (zum Scrollen, durch einen Systemdialog, durch einen eingehenden Anruf), bleibt der Zustand der Instanz stehen, bis der nächste `touchend` kommt.
- **TinyGesture** hört auf Touch und zusätzlich auf Maus (abschaltbar).

aufbau verfolgt den Zeiger nach `pointerdown` über Listener am `window` statt über `setPointerCapture`. Der Grund steht im Code: Pointer Capture lenkt auch die Kompatibilitäts-Mausereignisse um und würde die Klicks auf Buttons innerhalb des Elements schlucken. @use-gesture nutzt Capture (abschaltbar) und trennt Klicks von Zügen selbst (`filterTaps`). Beide Wege funktionieren; der von aufbau stört native Bedienelemente weniger.

---

## 4. Architektur

### aufbau: messen, entscheiden, handeln

```
pointer events ─► tracker      one session per element: center, delta, velocity, scale, rotation, travel
wheel, gesture ─► trackpad     the same session shape for input without pointers
                     │
                     ▼ start / move / end / cancel
                 recognizers   small state machines, claim the session: tap, press, longPress, swipe,
                     │         edgeSwipe, pan, pinch, rotate, wheel, secondary
                     ▼ emit
                 CustomEvent   on the element the pointer went down on, bubbling
                     │
                     ▼
                 handlers      onSwipeLeft … with guards        bundles   draggable, sortable, …
```

Drei Schichten mit klaren Zuständigkeiten. Der Tracker entscheidet nichts, die Recognizer handeln nicht, die Bundles erkennen nichts. Ein Recognizer ist eine Funktion, die Hooks (`start`, `move`, `end`, `cancel`) und Wünsche (`touchAction`, `style`, `nativeDrag`) zurückgibt. Nur die Recognizer, deren Gesten jemand hört, werden überhaupt angelegt.

### Hammer.js: Manager, Input, Recognizer

```
Manager(element)
  input      PointerEventInput | TouchMouseInput …  → computeInputData (center, delta, velocity …)
  touchAction  compute from recognizers, polyfill for old browsers
  recognizers  Tap, Pan, Swipe, Pinch, Rotate, Press, each a state machine:
               POSSIBLE → BEGAN → CHANGED → ENDED | CANCELLED | FAILED
  emit       own event emitter: mc.on('panleft', …), optionally dom events
```

Strukturell sehr ähnlich, nur älter: Hammer kennt dieselbe Trennung von Messung und Erkennung, aber jeder Recognizer ist eine Klasse mit expliziten Zuständen, und das Zusammenspiel regelt der Manager (Abschnitt 8). Eigene Gesten entstehen durch Ableiten von `Recognizer` oder `AttrRecognizer`. Gerechnet wird bei jedem Ereignis für alle Recognizer, aktiviert oder nicht wird über `enable`.

### TheFinger: eine Klasse, alles immer

Eine Klasse mit einem Objekt `gestures`, in dem jede Geste `start`, `move`, `end` hat. Bei jedem Touch-Ereignis laufen **alle** zehn Gesten, auch die nicht verfolgten; erst beim Aufruf des Callbacks wird geprüft, ob jemand zuhört. Es gibt keine Session als Objekt, sondern rund 30 private Felder (`#startX`, `#revs`, `#lastPanPayload` …), und eine Historie aller Fingerpositionen als Arrays.

### @use-gesture: Engines pro Gestentyp

Ein Controller verteilt native Ereignisse an Engines (`DragEngine`, `PinchEngine`, `WheelEngine` …). Jede Engine pflegt einen eigenen Zustand und ruft den Handler bei jeder Änderung mit diesem Zustand auf. Keine Erkennung "war das ein Swipe?", sondern ein Strom; `swipe` und `tap` sind nur Felder im Drag-Zustand am Ende.

**Bewertung:** aufbau und Hammer haben die tragfähigste Architektur, aufbau die schlankere (Funktionen statt Klassen, nur aktive Recognizer, ein gemeinsames Session-Objekt statt pro Recognizer berechneter Eingabedaten). TheFinger skaliert schlecht: jede neue Geste kostet bei jedem Ereignis, ob sie verfolgt wird oder nicht.

---

## 5. Was ein Handler bekommt

| | aufbau | Hammer.js | TheFinger | @use-gesture |
|---|---|---|---|---|
| Position | `center`, `start` | `center` | `x`, `y` (relativ zum Element) | `xy`, `initial` |
| Verschiebung | `delta`, `movement` (seit letztem Ereignis) | `deltaX`, `deltaY` | `dx`, `dy` (nur eine Geste) | `movement`, `delta`, `offset` |
| Distanz | `distance`, `travel` (Maximum) | `distance` | `dist` (eine Geste) | `distance` |
| Geschwindigkeit | `velocity { x, y, speed }`, letzte 100 ms | `velocity`, `velocityX/Y`, alle 25 ms | `speed` über die letzten 5 Punkte | `velocity` |
| Richtung | `direction`, `angle` (0 rechts, 90 unten) | `direction`, `offsetDirection` (Bitmasken) | `initial_direction`, `final_direction`, `angle` (0 oben) | `direction` (Vorzeichen pro Achse) |
| Zwei Finger | `scale`, `rotation`, `scaleChange`, `rotationChange` | `scale`, `rotation` | `scale`, `rotation`, `angleRelative` | `offset`, `da` (Abstand, Winkel) |
| Eingabe | `input`, `pointers`, `maximumPointers`, `buttons`, `modifiers` | `pointerType`, `pointers` | `touches` | `touches`, `buttons`, Modifier |
| Ziel | `target`, `path` (in Shadow Roots), `element` | `target` | — | `target` |
| Zeit | `duration`, `time` | `deltaTime`, `timeStamp` | — | `elapsedTime`, `timeStamp` |
| Phase | `phase` | `eventType`, `isFirst`, `isFinal` | — | `first`, `last`, `active` |
| Urereignis | `sourceEvent` | `srcEvent` | Historie aller Punkte | `event` |

Drei Stärken von aufbau, die sonst niemand in dieser Form hat:

- **`travel`**, die größte Entfernung während der Session. Ein Finger, der weg und zurück ging, hat eine kleine `distance`, aber eine große `travel`. Genau das unterscheidet einen Tap von einer Bewegung. Hammer und TheFinger prüfen nur die Entfernung am Ende oder (TheFinger) ob es überhaupt ein `touchmove` gab.
- **Stetiges `delta`, wenn Finger dazukommen oder gehen.** Der Startpunkt wandert mit (`rebaseCenter`), damit der Mittelpunkt nicht springt. TheFinger springt hier, Hammer löst es ähnlich über Offsets.
- **`movement`, `scaleChange`, `rotationChange` pro Ereignis** neben den Gesamtwerten. Eine inkrementelle Transformation (wie im `transformable`-Bundle) multipliziert nur, statt sich Zwischenstände zu merken.

Die Benennung ist ausgeschrieben und einheitlich (`maximumPointers`, `minimumSpeed`). TheFinger mischt `snake_case` (`initial_direction`) mit `camelCase` (`startX`) und liefert je nach Geste andere Formen, ohne ein Feld, das sagt, welche Geste es war.

---

## 6. Gesten-Katalog

| Geste | aufbau | Hammer | TheFinger | use-gesture | TinyGesture |
|---|---|---|---|---|---|
| Kontakt (wie `:active`) | `pressStart/End/Cancel` | — | `press` | `drag` mit `first` | — |
| Tap, Mehrfach-Tap | `tap` mit `count`, `doubleTap` | `tap`, `doubletap`, beliebig über `taps` | `tap`, `double-tap` | `tap` im Drag-Zustand | `tap`, `doubletap` |
| Long Press | `longPress` | `press` | `long-press` | — | `longpress` |
| Wiederholen beim Halten | `pressRepeat` | — | — | — | — |
| Kontextmenü-Absicht | `secondary` (nativ) | — | — | — | — |
| Swipe | `swipe` + vier Richtungen | `swipe` + Richtungen | `drag` mit `flick: true` | `swipe` im Drag-Zustand | `swipe…` |
| Swipe vom Rand | `edgeSwipe` mit `progress` | — | — | — | — |
| Ziehen | `pan` (Fingerzahl wählbar, Achse, `after`) | `pan` | `drag` (1 Finger), `pan` (2+) | `drag` | `pan` |
| Pinch | `pinch` (+ Trackpad) | `pinch` | `pinch-spread` | `pinch` (+ Trackpad) | `pinch` |
| Drehen | `rotate` (+ Safari-Trackpad) | `rotate` | `rotate` | in `pinch` (`da`) | `rotate` |
| Mausrad als Geste | `wheel` mit Start/Ende | — | — | `wheel` | — |
| Zwei-Finger-Tap | — | über `pointers: 2` | `two-finger-tap` | — | — |
| Doppeltippen und ziehen | — | — | `double-tap-and-drag` | — | — |
| Hover, Bewegung ohne Druck | — | — | — | `move`, `hover` | — |

`pressRepeat` (der Stepper-Knopf, der beim Halten weiterzählt), `secondary` und `edgeSwipe` sind Eigenheiten von aufbau, die sonst nirgends eingebaut sind. `double-tap-and-drag` ist TheFingers beste Idee: das Einhand-Zoomen aus Google Maps und iOS Fotos (zweimal tippen, beim zweiten Mal liegen lassen und auf- oder abwärts ziehen).

---

## 7. Schwellen und Voreinstellungen

| | aufbau | Hammer | TheFinger | use-gesture |
|---|---|---|---|---|
| Tap-Toleranz | Maus 4, Stift 8, Finger 10 px (`travel`) | 9 px | keine: jedes `touchmove` beendet den Tap | 3 px (`filterTaps`) |
| Tap-Dauer | 500 ms | 250 ms | 350 ms | — |
| Doppeltipp-Fenster | 300 ms, Ort innerhalb 3× Toleranz | 300 ms, 10 px | 250 + 350 ms, Ort egal | — |
| Long Press | 500 ms | 251 ms | 350 ms | — |
| Pan startet ab | Toleranz | 10 px | erstem `touchmove` | sofort, mit `filterTaps` ab 3 px |
| Swipe | 30 px und 0,3 px/ms | 10 px und 0,3 px/ms | `flick` ab 0,75 px/ms | 50 px, 0,5 px/ms, 250 ms |
| Pinch startet ab | 5 % Skalierung | sofort | sofort | sofort |
| Drehung startet ab | 10° | sofort | sofort | sofort |

Zwei Punkte stechen heraus:

- **TheFinger ohne Toleranz:** `#moving` wird beim ersten `touchmove` wahr, und dann ist es kein Tap mehr. Ob das in der Praxis trifft, hängt davon ab, ob der Browser winzige Bewegungen schon vorher schluckt; verlassen kann man sich darauf nicht. Ein Toleranzwert im eigenen Code ist robuster.
- **Hammer und use-gesture starten Pinch und Drehung sofort.** Jede Zwei-Finger-Geste ist dann gleichzeitig Pinch und Drehung, mit Zittern in beiden. aufbau wartet auf 5 % beziehungsweise 10° und meldet den Sprung bis zur Schwelle in einem `…Move` direkt nach `…Start`, sodass ein Handler auf `Move` nichts verliert. Das ist die sorgfältigere Lösung.

---

## 8. Arbitrierung: wer bekommt die Geste

Mehrere Recognizer sehen dieselbe Bewegung. Wer gewinnt?

### aufbau: Claims, Priorität, `after`

```js
session.claims.add('pan');   // a recognizer that owns the session says so
```

- `pan`, `pinch`, `rotate` und `edgeSwipe` beanspruchen die Session, sobald sie starten; `longPress`, sobald es feuert.
- `tap` scheitert, wenn irgendetwas beansprucht hat. `swipe` scheitert an `longPress` und `edgeSwipe`.
- `edgeSwipe` hat Priorität 1 und hört die Session vor `pan`.
- `pan: { after: 'longPress' }` (auch pro Eingabe: `{ touch: 'longPress' }`) startet erst nach einem Long Press. Das ist der Mechanismus hinter `sortable`: Auf Touch hebt ein langer Druck das Element an, ein normales Ziehen scrollt weiter.
- `tap` und `doubleTap` feuern standardmäßig beide (kein Warten), mit `waitForDoubleTap` exklusiv.

### Hammer.js: Beziehungen zwischen Recognizern

```js
pinch.recognizeWith(rotate);        // may run at the same time
singleTap.requireFailure(doubleTap); // waits until doubleTap failed
```

Jeder Recognizer hat einen Zustand (`POSSIBLE`, `BEGAN`, `CHANGED`, `ENDED`, `FAILED`, `CANCELLED`). Der Manager lässt pro Session einen Recognizer gewinnen, außer zwei sind ausdrücklich miteinander erlaubt. `requireFailure` hält einen Recognizer zurück, bis ein anderer gescheitert ist. Das ist allgemeiner als aufbaus feste Regeln: Jede Kombination ist einstellbar. Dafür muss man sie auch einstellen, und Fehler zeigen sich als Gesten, die nie feuern.

### TheFinger: keine

Alle Gesten melden unabhängig. Ein Tap feuert `press` beim Aufsetzen, dann `tap`; ein zweiter Tap `double-tap`, nachdem der erste schon `tap` war. Ein Pinch ist gleichzeitig `pan` (zwei Finger), `rotate` und `pinch-spread`. Was zusammengehört, muss der Aufrufer entscheiden.

### @use-gesture: pro Geste

Jede Geste ist für sich: `drag` mit Achsen-Sperre (`axis`, `lockDirection`), `filterTaps` trennt Klicks von Zügen. Keine allgemeinen Regeln zwischen Gesten, aber für die Hauptfälle eingebaut.

**Bewertung:** aufbaus feste Regeln decken die typischen Fälle ohne Konfiguration ab und haben mit `after` und `priority` die zwei Stellschrauben, die in der Praxis wirklich gebraucht werden. Hammers Modell ist mächtiger, aber fehleranfälliger. Was beiden fehlt, ist Arbitrierung **zwischen Elementen** (Abschnitt 15 und 17.2).

---

## 9. Scrollen und `touch-action`

Eine Geste auf Touch muss dem Browser **vor** dem ersten `pointerdown` sagen, was er selbst behalten darf: Scrollen, Zoomen. Das geht nur über die CSS-Eigenschaft `touch-action`.

| | Weg |
|---|---|
| aufbau | jeder aktive Recognizer wünscht sich einen Wert, der strengste gewinnt (`pan-x` und `pan-y` zusammen ergeben `none`); `swipe` mit nur links/rechts lässt vertikales Scrollen zu; `destroy()` stellt den alten Wert wieder her |
| Hammer | `touchAction: 'compute'` leitet den Wert aus den Recognizern ab, plus ein Polyfill über `preventDefault` für Browser ohne `touch-action` |
| TheFinger | kein `touch-action`; stattdessen `preventDefault()` im `touchmove`, wahlweise nur bei waagerechter oder senkrechter Bewegung (`preventDefault: 'horizontal'`) |
| use-gesture | `touch-action` pro Option, `preventScroll` mit Verzögerung (erst halten, dann ziehen) |

TheFingers Weg ist der von 2014: Er braucht nicht-passive Touch-Listener, und der Browser muss vor jedem Scroll-Schritt auf JavaScript warten. Bei langsamem Hauptthread ruckelt dann das Scrollen der ganzen Seite. Dafür ist die Idee, richtungsabhängig zu entscheiden, hübsch, und genau das, was aufbaus `swipe` und `pan: { axis }` deklarativ über `pan-y` / `pan-x` erreichen.

aufbau geht dort, wo `touch-action` nicht reicht (Ziehen nach einem Long Press, Ziehen am oberen Rand für Pull to Refresh), gezielt auf `touchmove` mit `preventDefault` zurück, und nur während einer laufenden Geste. Das ist die richtige Mischung.

---

## 10. Trackpad, Mausrad, Kontextmenü

### Trackpad

Ein Trackpad sendet für Pinch und Drehung **keine** Pointer Events:

- Chrome und Firefox melden einen Pinch als `wheel` mit `ctrlKey` (die Konvention des Seiten-Zooms).
- Safari meldet `gesturestart`, `gesturechange`, `gestureend` mit `scale` und `rotation`, die einzige Quelle für eine Trackpad-Drehung.

aufbau (`trackpad.js`) macht aus beidem eine Session mit `input: 'trackpad'` und zwei virtuellen Zeigern, sodass `pinch` und `rotate` sie wie Finger behandeln. @use-gesture tut dasselbe (`pinchOnWheel`, Safari-`gesture`-Ereignisse). Hammer, TheFinger und TinyGesture kennen keins von beiden; auf einem MacBook zoomt dann der Browser die Seite statt des Elements.

### Mausrad

aufbaus `wheel` ist eine kontinuierliche Geste mit `wheelStart`, `wheelMove` und einem `wheelEnd` nach 150 ms Pause, mit normalisierten Pixeln (Zeilen und Seiten umgerechnet) und optionalem Modifier (`modifier: 'alt'`). Ein natives `wheel` hat kein Ende; wer "Scroll-Geste vorbei" braucht, baut sonst immer denselben Timer.

### Kontextmenü

`secondary` hört auf das native `contextmenu`: Rechtsklick, langer Druck dort, wo die Plattform ihn meldet, Menütaste, Shift+F10. Tastatur und Screenreader kommen damit ohne eigenen Code mit. Keine der anderen Bibliotheken hat diese Brücke; dort ist "Rechtsklick oder langer Druck" zwei Handler und ein Tastatur-Fall, den meist niemand schreibt.

---

## 11. API-Form und Ereignisse

```js
// aufbau
const handle = gestures(element, {
  onTap       : gesture => select(gesture.target),
  onSwipeLeft : { input: 'touch', minimumSpeed: 1, handler: gesture => next() },
  swipe       : { minimumDistance: 80 },
});
list.addEventListener('swipeleft', event => archive(event.detail.target));

// hammer
const manager = new Hammer(element);
manager.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
manager.on('swipeleft', event => next());

// thefinger
const finger = new TheFinger(element);
finger.track('drag', (gesture, history) => move(gesture.x, gesture.y), { preventDefault: 'horizontal' });

// use-gesture (vanilla)
const drag = new DragGesture(element, ({ offset: [x, y] }) => element.style.translate = `${x}px ${y}px`);
```

| | aufbau | Hammer | TheFinger | use-gesture |
|---|---|---|---|---|
| Form | ein Aufruf, Handler-Objekt | Manager + `on()` | Instanz + `track()` | Klasse oder Hook pro Geste |
| Schwellen gegen Filter | getrennt: Recognizer-Optionen gegen Guards am Handler | nur Recognizer-Optionen | nur `preventDefault` pro Geste | Optionen pro Geste |
| DOM-Ereignisse | immer, bubbelnd, auf dem Element unter dem Finger | `domEvents: true` (langsamer, Standard aus) | nein | nein |
| Delegation | ja: ein `gestures()` auf einer Liste bedient alle Einträge | nein | nein | nein |
| zur Laufzeit ändern | nein (neu anlegen) | `set()`, `enable`, `add`/`remove` | `track`/`untrack` | Optionen neu übergeben |
| Aufräumen | `destroy()` stellt Styles wieder her | `destroy()` | `off()`, Styles bleiben | `destroy()` |
| Framework | Preact-Hook (`useGesture`, liest Handler live) | Wrapper der Community | — | React, Vanilla |
| Typen | `index.d.ts` mit 444 Zeilen | DefinitelyTyped | — | TypeScript |

Die Trennung **Schwellen gegen Guards** ist bei aufbau ein echter Gewinn: Eine Schwelle (`swipe: { minimumDistance: 80 }`) ändert, was erkannt wird, und wirkt damit auf die Arbitrierung; ein Guard am Handler (`onSwipeLeft: { input: 'touch' }`) filtert nur, was ankommt. In Hammer muss man für "nur Touch" den ganzen Recognizer umbauen oder im Handler filtern.

**Gesten als DOM-Ereignisse** sind der zweite große Vorteil. `swipeleft` bubbelt vom Eintrag zur Liste, `event.detail.target` sagt welcher. Damit passt `@aufbau/gestures` direkt zu `Selection.on` in `@aufbau/element` und zu jedem Framework, das DOM-Ereignisse binden kann, ohne Adapter.

---

## 12. Verhalten: Bundles gegen interact.js und Co.

| aufbau-Bundle | macht | Gegenstück |
|---|---|---|
| `draggable` | folgt dem Zeiger, Achse, Grenzen, Trägheit, Raster, Einrasten, Ablageziele, `revert` | interact.js `draggable` + `dropzone` + Modifier; use-gesture `drag` mit `bounds`, `rubberband` |
| `sortable` | Liste oder Raster umsortieren, die anderen gleiten (FLIP), Long Press auf Touch | SortableJS |
| `dismissable` | wegwischen mit Widerstand in verbotene Richtungen | Swipe-to-dismiss in Material-Bibliotheken |
| `pullable` | Pull to Refresh | — |
| `transformable` | verschieben, zoomen, drehen um die Finger, Trackpad, Doppeltipp-Zoom | panzoom, interact.js `gesturable` |
| `adjustable` | eine Zahl per Pinch (Rastergröße) | — |

Gegenüber **interact.js** fehlen: Größe ändern (`resizable` mit Kanten und Ecken), Autoscroll beim Ziehen an den Rand, Ablegen über Listen hinweg, ein allgemeines Modifier-System (Einrasten an Elementen, Begrenzen auf Rechtecke, Seitenverhältnis). Dafür hat aufbau die Tastatur-Gegenstücke, `pullable`, `dismissable` und `adjustable`, und ist ein Drittel so groß.

Gegenüber **SortableJS** fehlen: Gruppen (zwischen Listen ziehen), Autoscroll, Mehrfachauswahl, verschachtelte Listen, Klonen. SortableJS nutzt die native HTML5-Drag-and-Drop-API und auf Touch einen eigenen Ersatzpfad, also zwei Implementierungen; aufbau arbeitet einheitlich auf Pointer Events, mit Long Press auf Touch.

Gegenüber **@use-gesture**: dort gibt es keine fertigen Verhalten, dafür `bounds`, `rubberband` (Gummiband an den Grenzen) und `offset` (der aufsummierte Zustand über mehrere Gesten), mit denen sich Bundles in wenigen Zeilen bauen lassen, meist zusammen mit einer Spring-Bibliothek. `rubberband` fehlt aufbau: `draggable` klemmt hart an die Grenzen.

---

## 13. Barrierefreiheit

Gesten sind von Natur aus nicht für Tastatur und Screenreader zugänglich. aufbau geht damit bewusster um als alle anderen:

- **Tastatur bleibt `click`.** `tap` ist ausdrücklich nur die Zeigergeste; wer eine Aktion hat, die auch per Tastatur gehen muss, bindet `click`.
- **`secondary` über das native `contextmenu`** bringt Menütaste und Shift+F10 mit.
- **Jedes Bundle hat ein Tastatur-Gegenstück:** Pfeiltasten bei `draggable` und `transformable` (+/−, [ ], 0), Alt+Pfeile bei `sortable`, Entf/Rücktaste bei `dismissable`. Wo es keins gibt (`pullable`, `adjustable`), nennt der Dateikopf das Bedienelement, das es ersetzen soll.

Hammer, TheFinger, use-gesture, TinyGesture und interact.js bringen keine Tastatur-Bedienung mit.

Offen bei aufbau: ARIA. `sortable` verschiebt Einträge per Alt+Pfeil, kündigt die neue Position aber nicht an (eine `aria-live`-Meldung, "Eintrag 3 von 7"). `draggable` setzt `tabindex`, aber keine Rolle und keine Beschreibung, wie es bedient wird.

---

## 14. Performance

### Was pro Zeigerbewegung passiert

| | Arbeit pro `pointermove` |
|---|---|
| aufbau | Session messen (mehrere kleine Objekte: `center`, `delta`, `movement`, `modifiers`, `velocity`, ein Sample), dann pro gemeldeter Geste: Snapshot der Session (Objekt-Spread über rund 25 Felder), `CustomEvent`, `dispatchEvent` mit Bubbling bis zum Dokument, Listener prüft Element und Guard |
| Hammer | Eingabedaten berechnen (auch mehrere Objekte), alle aktivierten Recognizer durchlaufen, eigener Emitter; DOM-Ereignisse nur mit `domEvents` |
| TheFinger | alle zehn Gesten durchlaufen, Historie um einen Punkt pro Finger verlängern, für die Geschwindigkeit dreimal `slice` |
| use-gesture | Zustand der Engine aktualisieren, Handler aufrufen |

aufbau ist damit nicht langsam, aber auch nicht das schlankste: Ein `panmove`, das nur ein Bundle intern braucht, wird trotzdem als bubbelndes DOM-Ereignis durch den ganzen Baum geschickt, einmal pro Frame (Browser fassen `pointermove` meist auf eines pro Frame zusammen, die Zwischenpunkte liefert `getCoalescedEvents()`). Das ist bewusst (jeder kann zuhören), kostet aber pro Ereignis einen Weg durch alle Vorfahren und einen Snapshot. Bei einfachen Seiten unmerklich, bei tiefen Bäumen mit vielen Listenern messbar.

### Wo es wirklich teuer wird: die Bundles

| Stelle | Muster | Wirkung |
|---|---|---|
| `draggable`, `onPanMove` | erst `style.translate` schreiben, dann `document.elementsFromPoint()` lesen | erzwungenes Layout bei **jeder** Bewegung, sobald `drop` gesetzt ist |
| `sortable`, `follow()` | erst `translate` schreiben … beim nächsten Aufruf `getBoundingClientRect()` lesen; nach einem Umsortieren beide direkt hintereinander | erzwungenes Layout pro Bewegung, bei jedem Platzwechsel zwei Messungen aller Einträge |
| alle Bundles | `render()` und `onChange` direkt im Ereignis | meist harmlos, weil Browser `pointermove` an Frames ausrichten; wo nicht (oder bei `pinch` und `rotate` aus demselben Ereignis), mehrere Schreibvorgänge pro Frame |

Das Schreiben-dann-Lesen ist das bekannte "Layout Thrashing": Der Browser muss das Layout sofort neu berechnen, statt es einmal pro Frame zu tun. Bei einer Liste mit 200 Einträgen ist `sortable` dadurch auf schwachen Geräten spürbar zäh. Abhilfe in 17.3.

### Was gut gelöst ist

- Nur aktive Recognizer existieren; ein `gestures(el, { onTap })` legt keinen Pinch an.
- Die Geschwindigkeit wird über ein gleitendes Fenster von 100 ms berechnet, ohne die ganze Historie zu speichern (TheFinger speichert jeden Punkt der Session in Arrays, die bis zum Loslassen wachsen).
- `transformable` misst sein Ausgangsrechteck einmal pro Berührung, nicht pro Ereignis, und rechnet danach nur noch mit Matrizen.
- `touch-action` statt `preventDefault` hält das Scrollen der Seite vom JavaScript-Thread unabhängig.

### Größe

| | gz |
|---|---|
| TinyGesture | 2,4 kb |
| TheFinger | 3,7 kb |
| **aufbau, nur `gestures()`** | **5,4 kb** |
| Hammer.js | 7,4 kb |
| @use-gesture/vanilla | 9,2 kb |
| **aufbau mit allen Bundles** | **9,9 kb** |
| SortableJS | 12,9 kb |
| interact.js | 29,5 kb |

aufbau ist unminifiziert veröffentlicht; die Zahlen gelten nach dem Minifizieren durch einen Bundler. Weil die Bundles in eigenen Dateien liegen und die Elemente sie per `import()` erst bei Bedarf laden (`dash-board`, `data-index`), zahlt eine Seite nur, was sie nutzt.

---

## 15. Robustheit

### aufbau

- **Verschachtelte `gestures()` wissen nichts voneinander.** Ein `dismissable`-Eintrag in einer `sortable`-Liste: Beide hängen an `pointerdown`, beide legen eine Session für denselben Zeiger an, beide können gleichzeitig `pan` starten. Mit der Maus zieht dann der Eintrag zur Seite **und** die Liste sortiert um. Die Claims gelten nur innerhalb einer Session, nicht zwischen Elementen. Hammer und use-gesture haben dasselbe Problem. interact.js nicht: Es ordnet jedem Zeiger genau eine Interaktion zu und wählt dafür das innerste passende Element.
- **Ein verlorenes `pointerup` hinterlässt eine halbe Session.** Selten, aber möglich: Maus über einem `<iframe>` losgelassen, `alert()` während des Ziehens, Fensterwechsel per Tastatur bei gedrückter Taste. Bei der Maus heilt es sich (gleiche `pointerId`, die nächste Berührung läuft als Fortsetzung, ein Tap geht verloren). Bei Touch hat jeder Finger eine neue `pointerId`; ein liegengebliebener Zeiger würde jede folgende Berührung zur Zwei-Finger-Geste machen. Hier fehlt ein Aufräumen bei `blur`, `visibilitychange` und `lostpointercapture`.
- **Ereignisse sind nicht `composed`.** Ein `swipeleft` aus einem Shadow Root erreicht Listener außerhalb nicht. Für Custom Elements mit Shadow DOM (siehe `static shadow` in `@aufbau/element`) ist das eine Falle.
- **`pinch` und `rotate` legen je eine eigene Trackpad-Instanz an**, beide hören auf Safaris `gesture*`-Ereignisse. Funktioniert, ist aber doppelte Arbeit.

### Hammer.js

- Seit 2016 ohne Pflege; Fehlerkorrekturen seitdem nur im egjs-Fork.
- Setzt standardmäßig `user-select: none` auf das Element (`cssProps`). Wer Hammer auf einen Container legt, kann darin keinen Text mehr markieren. Eine der häufigsten Beschwerden über Hammer.
- Kein ES-Modul im Original, `Hammer` als Global.

### TheFinger

- **Kein `touchcancel`.** Übernimmt der Browser den Finger, bleibt die Instanz im alten Zustand.
- **`settings.visualize: true` wirft einen `ReferenceError`**, weil `visualize` im veröffentlichten Paket nicht definiert ist (die Funktion lebt nur in der Entwicklungsumgebung).
- **Unbegrenzte Historie:** jeder `touchmove` hängt an drei Arrays pro Finger an.
- **Koordinaten relativ zum Element, gemessen beim `touchstart`:** Scrollt die Seite während der Geste, stimmen sie nicht mehr.
- `off()` entfernt die Listener, aber es gibt keinen Zustand, der aufgeräumt werden müsste; dafür auch keine Styles, die zurückgesetzt werden müssten.

### Testbarkeit

TheFinger bringt eine Simulation mit, die `TouchEvent`s mit realistischen Zeiten und Bahnen erzeugt und jede Geste prüft. Hammer hatte eine umfangreiche QUnit-Suite mit simulierten Eingaben. aufbau hat den Playground (`www/gestures.html`) zum Ausprobieren, aber keine reproduzierbare Simulation; Regressionen in den Schwellen merkt man nur auf dem Gerät.

---

## 16. Wer ist wo besser

| Bereich | besser | warum |
|---|---|---|
| Eingabegeräte | aufbau, use-gesture | Pointer Events, Toleranz pro Gerät, Trackpad |
| Session-Modell | aufbau | `travel`, stetiges `delta`, Werte pro Ereignis und gesamt, Pfad in Shadow Roots |
| Arbitrierung in einem Element | Hammer (Mächtigkeit), aufbau (Voreinstellungen) | `recognizeWith`/`requireFailure` gegen Claims mit sinnvollen Regeln |
| Arbitrierung zwischen Elementen | interact.js | eine Interaktion pro Zeiger; aufbau, Hammer und use-gesture gar nicht |
| Scrollen | aufbau, Hammer | `touch-action` aus den Gesten berechnet |
| DOM-Integration | aufbau | echte Ereignisse, Bubbling, Delegation |
| fertiges Verhalten | interact.js (Umfang), aufbau (Breite + Tastatur) | Resize/Modifier gegen Pull/Dismiss/Adjust |
| Barrierefreiheit | aufbau | Tastatur-Gegenstücke, `secondary` |
| Gesten-Vielfalt | aufbau | `pressRepeat`, `edgeSwipe`, `wheel`, `secondary`; TheFinger hat `double-tap-and-drag` |
| animationsgetriebene UIs | use-gesture | Zustand mit `offset`, `bounds`, `rubberband`, `memo` |
| Größe | TinyGesture, TheFinger | 2 bis 4 kb, dafür kaum Arbitrierung und keine Pointer Events |
| Laufzeit-Konfiguration | Hammer | `set`, `enable`, `add`, `remove` |
| Testbarkeit | TheFinger, Hammer | eingebaute Simulation |
| Pflege, Zukunft | aufbau, interact.js, TinyGesture | Hammer tot, use-gesture ruhig, TheFinger jung |

Zu den beiden gefragten Bibliotheken konkret:

- **Gegen Hammer.js** ist `@aufbau/gestures` in fast jeder Hinsicht der Nachfolger: dasselbe Vokabular und dieselbe Trennung von Messung und Erkennung, aber Pointer Events ohne Altlasten, Trackpad, DOM-Ereignisse mit Delegation, sinnvolle Voreinstellungen statt manueller Verknüpfungen, Bundles und Tastatur. Hammer bleibt besser in der allgemeinen Arbitrierung und der Laufzeit-Steuerung.
- **Gegen TheFinger** ist es eine andere Gewichtsklasse. TheFinger ist ein kleines Touch-Werkzeug für Mobilseiten, das man in fünf Minuten versteht. Für ein Design-System, das Maus, Stift und Trackpad bedienen muss, fehlt ihm das Fundament. Übernehmenswert sind drei Ideen: `double-tap-and-drag`, `two-finger-tap` und die Simulation.

---

## 17. Was `@aufbau/gestures` noch fehlt

Sortiert nach Wirkung.

### 17.1 Arbitrierung über Elementgrenzen

**Problem:** Verschachtelte `gestures()` erkennen gleichzeitig (Abschnitt 15).

**Vorschlag:** Ein modulweites Register `pointerId → Besitzer`. Wer einen Claim setzt, der den Zeiger festhält (`pan`, `pinch`, `rotate`, `edgeSwipe`, `longPress`), trägt sich ein; andere Sessions mit demselben Zeiger brechen ab (`…Cancel`). Weil `pointerdown` vom inneren Element nach außen bubbelt, sieht das innere Element den Zeiger zuerst, was der Erwartung entspricht (der Eintrag vor der Liste).

```js
const owners = new Map;   // pointerId -> session

function claim (session, name) {
  session.claims.add(name);
  for (const id of session.pointerIds) {
    const other = owners.get(id);
    if (other && other !== session) other.cancel();
    owners.set(id, session);
  }
}
```

Dazu eine Option, die das Verhalten umkehrt (`yield: true`: lass äußere Gesten gewinnen), für Fälle wie eine wischbare Karte in einem Karussell, wo das Karussell gewinnen soll, sobald die Bewegung waagerecht ist.

### 17.2 Sessions sicher beenden

`window` `blur` und `document` `visibilitychange` beenden eine laufende Session mit `cancel`. Bei einem `pointerdown` mit einem unbekannten Zeiger, während die Session nur Zeiger kennt, deren letztes Ereignis mehr als eine Sekunde zurückliegt, wird die alte Session verworfen statt fortgesetzt. Rund zehn Zeilen in `tracker.js`.

### 17.3 Bundles ohne Layout Thrashing

- **Ein Frame, ein Schreibvorgang:** Bundles merken sich den Zielzustand und schreiben in `requestAnimationFrame`. Der Gewinn ist klein, solange der Browser `pointermove` an Frames ausrichtet, macht aber die Reihenfolge Lesen-vor-Schreiben einfach durchzuhalten.
- **Erst lesen, dann schreiben:** `sortable` misst die Grundposition des gezogenen Eintrags einmal beim Start und nach jedem Platzwechsel (dort wird ohnehin gemessen), nicht in jedem `follow()`. `draggable` ruft `elementsFromPoint` vor dem Schreiben auf oder nur im Frame, nicht im Ereignis.
- **Optional `getCoalescedEvents()`:** für Zeichen- und Malanwendungen die Zwischenpunkte eines Frames, als Feld `points` in der Session, nur wenn jemand es verlangt.

### 17.4 Laufzeit-Steuerung

Heute heißt jede Änderung: `destroy()` und neu anlegen, wobei Zustand wie der Tap-Zähler verloren geht.

```js
handle.enable('swipe', false);                    // pause a recognizer
handle.set({ swipe: { minimumDistance: 120 } });  // new thresholds, same session
handle.on('doubleTap', gesture => zoom());        // add a handler, touch-action recomputed
```

`enable` kann auch eine Funktion sein (`enable: gesture => !editor.readOnly`), wie bei Hammer.

### 17.5 `composed` und Namen

Gesten-Ereignisse mit `composed: true`, damit sie aus Shadow Roots herauskommen; `event.detail.target` bleibt das innere Ziel, `event.target` wird an der Grenze wie üblich umgeschrieben. Für die offene Frage nach einem Präfix: Die Plattform hat bisher keine Ereignisse namens `tap`, `swipe` oder `pinch` angekündigt, `press…` und `wheel…` sind durch die Endungen eindeutig. Ein Präfix lohnt sich erst, wenn eines davon in einer Spezifikation auftaucht; bis dahin kostet es nur Lesbarkeit.

### 17.6 Fehlende Gesten und Daten

| | wofür | Aufwand |
|---|---|---|
| `doubleTapDrag` | Einhand-Zoom (Karten, Bilder, `transformable`) | klein: `tap` merkt sich den letzten Tap, `pan` mit `after: 'doubleTap'` |
| `twoFingerTap` | Rückgängig (iPadOS), Zoom heraus (Karten) | klein: `tap` mit `pointers: 2` |
| `pressure`, `tilt`, `twist` | Stift, Zeichnen | klein: aus dem Pointer Event in die Session |
| `hover` / `move` ohne Druck | Vorschau, Fadenkreuz | mittel: eigener Pfad ohne Session-Start |

### 17.7 Die offenen Fragen aus dem Konzept

- **Swipe-Richtung:** Die Richtung der Geschwindigkeit beim Loslassen ist die bessere Lesart. Ein Zug nach links, der mit einem Schwung nach rechts endet, ist für den Nutzer ein Wisch nach rechts. Vorschlag: Richtung aus `velocity`, Distanz-Schwelle aus `delta` in dieselbe Richtung.
- **Long Press und `contextmenu` auf Android:** `secondary` gewinnt, wenn beides gehört wird (es ist die Plattform-Bedeutung), `longPress` allein bleibt, wenn `secondary` nicht aktiv ist. So entsteht nie eine doppelte Aktion.
- **Strg + Mausrad als Pinch:** beibehalten. Es ist dieselbe Konvention, die der Browser für den Seiten-Zoom nutzt, und Nutzer erwarten in Zoom-Ansichten genau das.
- **Tap mit oder ohne Warten auf den Doppeltipp:** sofort (wie jetzt) als Standard. Exklusiv nur, wo beide Aktionen sich widersprechen.

### 17.8 Bundles erweitern

- `sortable`: Autoscroll an den Rändern des Containers (steht schon als offen im Konzept), Gruppen über Listen hinweg, `aria-live`-Meldung der neuen Position.
- `draggable`: Gummiband an den Grenzen statt hartem Klemmen (`rubberband: 0.15`).
- Neu: `resizable` (Kanten und Ecken, mit `aspectRatio`, Raster, Tastatur), die meistgenutzte Funktion von interact.js, die aufbau fehlt.

### 17.9 Debug-Overlay und Simulation

TheFingers `visualize` ist eine gute Idee, schlecht umgesetzt: Ein Overlay, das Zeiger, Mittelpunkt, `delta`, `velocity` und die aktiven Claims live zeigt, macht Schwellen auf dem Gerät einstellbar. Als `@aufbau/gestures/debug`, nur im Playground geladen. Eine Simulation (Pointer-Ereignisse mit realistischen Bahnen) ist der zweite Schritt, für den Playground als "abspielen"-Knopf pro Geste.

### 17.10 Anschluss an `@aufbau/element` und rat

- **`@aufbau/element`:** `Selection.on('swipeleft', …)` funktioniert heute nur, wenn vorher `gestures(this, { recognize: ['swipe'] })` lief. Die Basisklasse könnte Gesten-Ereignisnamen in `on()` erkennen und den Recognizer selbst aktivieren, aufgeräumt über `track()`.
- **rat:** `gestures()` gibt `{ destroy }` zurück und passt damit unverändert auf rats Behavior-Vertrag:

  ```html
  <div use:gestures={{ onSwipeLeft: next, onDoubleTap: zoom }}></div>
  <ul @sortable={{ onSort: save }}></ul>
  ```

  Und rats Compiler kennt alle `on:`-Attribute eines Elements. Steht dort `on:swipeleft` oder `on:pinchmove`, kann er `gestures(el, { recognize: [...] })` selbst einfügen. Gesten würden sich dann schreiben wie Klicks, was genau das Ziel aus dem ersten Satz des Konzepts ist.

### Reihenfolge

1. **17.1 + 17.2:** Robustheit. Ohne sie sind verschachtelte Bundles (Listen in Panels, Karten in Karussells) nicht verlässlich.
2. **17.3:** Performance der Bundles, vor allem `sortable` und `draggable` mit `drop`.
3. **17.5 + 17.10:** `composed` und der Anschluss an `@aufbau/element`, weil die Elemente das Paket schon nutzen.
4. **17.4 + 17.7:** Laufzeit-Steuerung und die offenen Fragen entscheiden.
5. **17.6, 17.8, 17.9:** neue Gesten, Bundles, Werkzeuge.
