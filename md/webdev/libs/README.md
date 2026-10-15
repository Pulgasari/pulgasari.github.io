# Bibliotheken und Frameworks

Steckbriefe zu Bibliotheken, Frameworks und Sprachen aus dem Web-Umfeld: wofür sie gebaut wurden, ihre Kernkonzepte mit Code, wie sie intern arbeiten, Stärken und Schwächen, und was davon für rat, aufbau und zugriff interessant ist.

| | Was | Seit / bis | Größe | Build |
|---|---|---|---|---|
| [alien-signals](alien-signals.md) | Signal-Kern, Push-Pull | 2024– | 1,9 kb | nein |
| [ArrowJS](arrowjs.md) | reaktive UI-Runtime | 2021– | 7,7 kb | nein |
| [Astro](astro.md) | Framework für Inhaltsseiten mit Islands | 2021– | – (Server/Build; Island-Runtime 1,9 kb) | ja (Vite) |
| [Backbone.js](backbone.md) | Models, Collections, Views, Router | 2010–, in Wartung | 8,6 kb, mit Underscore 17,6 kb | nein |
| [CoffeeScript](coffeescript.md) | Sprache, compiliert zu JavaScript | 2009–, ruht seit 2022 | – (Browser-Compiler 101,5 kb) | ja, oder Compiler im Browser |
| [Datastar](datastar.md) | Signals im Markup, Server-Patches über SSE | 2023– (1.0: 2026) | 13,0 kb, Kern 4,7 kb | nein |
| [EJS](ejs.md) | Template-Sprache | 2011– | 8,0 kb (Browser-Build) | nein |
| [Elm](elm.md) | funktionale Sprache für Web-Apps | 2012–, ruht seit 2019 | – | ja |
| [Express](express.md) | Web-Framework für Node | 2010– | – (Server) | nein |
| [Fresh](fresh.md) | Deno-Web-Framework | 2022– | – (Server, Islands mit Preact) | ja (Vite) |
| [htmx](htmx.md) | HTML-Erweiterung für Requests | 2020– (intercooler.js 2013) | 18,4 kb | nein |
| [htmz](htmz.md) | Fragment-Swaps über einen Iframe | 2024–, fertig | 166 Byte (inline) | nein |
| [Hyperapp](hyperapp.md) | Elm-Architektur mit Virtual DOM | 2017–, ruht seit 2022 | 1,7 kb | nein |
| [_hyperscript](hyperscript.md) | Skriptsprache im Attribut | 2020– | 45,5 kb | nein |
| [jQuery](jquery.md) | DOM-Bibliothek | 2006– | 28,0 kb | nein |
| [Knockout](knockout.md) | MVVM mit Observables | 2010–, 3.x in Wartung, TKO seit 2026 | 25,8 kb | nein |
| [Lit](lit.md) | Web Components | 2017– | 6,2 kb | nein |
| [Lynx](lynxjs.md) | native UI mit Web-Technik | 2025– | – (eigene Engine) | ja (Rspeedy) |
| [Marko](marko.md) | HTML-Obermenge mit Compiler | 2014– | bis 12,5 kb (Runtime, pro App gekürzt) | ja |
| [MDX](mdx.md) | Markdown mit JSX | 2018– | – (Compiler, Ausgabe ist eine Komponente) | ja, oder `evaluate()` |
| [MobX](mobx.md) | reaktiver Zustand, direkte Mutation | 2015– | 15,6 kb, typisch 12,0 kb | nein |
| [morphdom / idiomorph](morphdom.md) | DOM-Morphing | 2015– / 2022– | 2,2 kb / 3,7 kb | nein |
| [Open Props](open-props.md) | Design-Tokens als Custom Properties | 2021– | 7,5 kb CSS alles, mit JIT nur Benutztes | nein, JIT mit PostCSS |
| [PostCSS](postcss.md) | CSS-Syntaxbaum mit Plugins | 2013– | – (Build; im Browser 18,7 kb) | ja |
| [Ramda](ramda.md) | funktionale Hilfsfunktionen, gecurried | 2014– | 16,0 kb alles, typisch 3,6 kb | nein |
| [RxJS](rxjs.md) | Ereignisströme | 2012– (RxJS 5: 2016) | 7,6 kb typisch, 18,5 kb alles | nein |
| [StyleX](stylex.md) | atomares CSS aus JS-Objekten | 2023– | 1,7 kb Runtime, CSS statisch | ja |
| [Tailwind CSS](tailwind.md) | Utility-CSS-Framework | 2017– | – (CSS aus dem Build; Browser-Skript 73,5 kb) | ja |
| [TSRX](tsrx.md) | Nachfolger von JSX | 2026– | – (Compiler, Runtime je Ziel) | ja |
| [UnoCSS](unocss.md) | Engine für Utility-CSS, Regeln statt Vokabular | 2021– | Laufzeit 9,8 kb Kern, bis 58 kb mit Presets | ja, oder Laufzeit im Browser |
| [Valibot](valibot.md) | Schemas und Validierung, modular | 2023– | 14,9 kb alles, typisch 1,6 kb | nein |
| [Zod](zod.md) | Schemas und Validierung | 2020– | 25,6 kb typisch, `zod/mini` 5,8 kb | nein |

Größe: minifiziert und gzip, mit esbuild am aktuellen npm-Paket gemessen (Oktober 2026), alle Exporte eingebunden. Backbone ohne jQuery (für Views und `sync` nötig, 28,0 kb). „Typisch“: RxJS zehn häufige Operatoren und Subjects, Ramda zehn häufige Funktionen, MobX der Kern (`observable`, `computed`, `autorun`, `action`, `makeAutoObservable`), Zod und Valibot ein Objekt-Schema mit vier Feldern (`import * as z`; `import { z }` zieht die Locales mit, 90 kb). Datastar aus dem Repository (`bundles/datastar.js`, v1.0.4), weil npm nur eine alte Beta hat; Open Props ist CSS, gzip der `.min.css`. „–" wo im Browser nichts Eigenes läuft oder die Größe von der App abhängt.

## Querverbindungen

- **Seitenwechsel ohne Neuladen:** `hx-boost` ([htmx](htmx.md)), Partials ([Fresh](fresh.md)), `<ClientRouter />` ([Astro](astro.md)), pjax, Turbo Drive und `hyperfetch.js` sind dieselbe Idee.
- **Statisch vs. live:** [ArrowJS](arrowjs.md) (`() =>` macht live), [Lit](lit.md) (statische Template-Teile einmal geparst) und rat (`{…}` wird vom Compiler zu `() =>`) lösen dasselbe Problem auf verschiedenen Ebenen.
- **Kontrollfluss im Markup:** [TSRX](tsrx.md) und rat haben fast dieselbe `@if`/`@for`-Syntax, [Marko](marko.md) macht daraus Tags (`<if=…>`), [Knockout](knockout.md) Kommentare (`<!-- ko if -->`), [EJS](ejs.md) zeigt, warum: `<% } %>` wird unlesbar.
- **Verhalten über Attribute:** [htmx](htmx.md), [_hyperscript](hyperscript.md), jQuery-Plugins ([jQuery](jquery.md)) und die Behaviors von rat.
- **Vor der Reaktivität:** [Backbone](backbone.md) meldet Änderungen als Events (`change:title`), die App rendert von Hand; [Knockout](knockout.md) rechnet im selben Jahr (2010) Abhängigkeiten selbst nach.
- **Signals vor den Signals:** [Knockout](knockout.md) (Observables und Computeds mit automatischer Abhängigkeitserkennung, 2010), [Marko](marko.md) (`<let>`/`<const>`), [ArrowJS](arrowjs.md) (`reactive()`) und rats `$` sind dasselbe Modell in vier Notationen.
- **Zustand gegen Ereignisse:** Signals halten den aktuellen Wert, [RxJS](rxjs.md) und das native `Observable` beschreiben Folgen über die Zeit. rats Event-Modifier sind kleine, feste Operatoren.
- **Aufräumen über `AbortSignal`:** RxJS 9, Markos `$signal`, `fetch`, `addEventListener` und aufbaus `Selection` nutzen dasselbe Plattform-Objekt.
- **Server rendert HTML:** [Express](express.md) mit [EJS](ejs.md) (Strings), [Fresh](fresh.md) und [Astro](astro.md) (Islands), [Marko](marko.md) (Streaming, nur interaktiver Code im Browser).
- **Styles ohne Konflikte:** [StyleX](stylex.md) (eine Klasse pro Eigenschaft), aufbau (Cascade Layers), rat (`@scope`), [Lit](lit.md) (Shadow DOM).
- **Utility-CSS:** [Tailwind](tailwind.md) (festes Vokabular, Konfiguration in CSS), [UnoCSS](unocss.md) (nur Regeln, auch im Browser), [StyleX](stylex.md) (atomar aus JS-Objekten). Tailwind 4 und aufbau setzen beide auf Cascade Layers.
- **CSS verarbeiten:** [PostCSS](postcss.md) als gemeinsames Fundament, Lightning CSS als schnellere Alternative (in Tailwind 4), rats `<style>`-Pipeline mit `@scope` und `lang`.
- **Mutation oder Neuzuweisung:** [MobX](mobx.md) beobachtet direkte Änderungen tief, [Ramda](ramda.md) verändert nie, rat erlaubt heute nur Neuzuweisung (d-23).
- **Pipelines:** [Ramda](ramda.md) (gecurried, Daten zuletzt) passt ohne Platzhalter auf rats `|>`; [RxJS](rxjs.md) dasselbe für Ströme. Begriffe in [fp.md](../fp.md).
- **Markdown als Quelle:** [MDX](mdx.md) compiliert Markdown zu Komponenten, aufbaus `withSource` rendert ihn neben der Quelle.
- **Sugar über JavaScript:** [CoffeeScript](coffeescript.md) (Ranges, Bedingungen hinten, `?`), rats Script-Sugar (`$`, `|>`, `a..b`). Was JavaScript übernimmt, wird zur Abweichung.
- **Lazy laden:** Astros `client:visible`/`client:idle` ([Astro](astro.md)) und rats `lazy:visible` (Idee 2.13).
- **Web Components bauen:** [Lit](lit.md) und `@aufbau/element` im direkten Vergleich: [lit-vs-aufbau.md](../../analyze/lit-vs-aufbau.md).
- **Daten an der Grenze prüfen:** Decoder ([Elm](elm.md)), Island-Serialisierung ([Fresh](fresh.md)), Content Collections ([Astro](astro.md)), `validate`/`parse` ([Backbone](backbone.md)), Schemas in `@rat/types`.
- **Morphing statt `innerHTML`:** [morphdom / idiomorph](morphdom.md) als Bibliothek, eingebaut in [Datastar](datastar.md), Turbo 8 und Phoenix LiveView; [htmz](htmz.md) und htmx ersetzen ohne. `@domina/render` und rat brauchen es nicht, weil sie nur Löcher schreiben.
- **Fragmente vom Server:** [htmx](htmx.md) (Attribute), [htmz](htmz.md) (Iframe und `target`, 166 Byte), [Datastar](datastar.md) (SSE-Strom mit Element- und Signal-Patches).
- **Signal-Kerne:** [alien-signals](alien-signals.md) (Vue 3.6, Datastar), Preact Signals (`@aufbau/signals`), `@rat/runtime/signals.js`; Vergleich der Datenstrukturen in alien-signals.md.
- **Schemas als Werte:** [Zod](zod.md) (Methoden, Klassen), [Valibot](valibot.md) (Funktionen, Pipe), Standard Schema als gemeinsame Schnittstelle; d-14 a in rat, `types.js` in `@aufbau/store`.
- **Handler als Daten:** `[Action, payload]` in [Hyperapp](hyperapp.md), Kommandos mit Argument in rat (d-16), Effekte als Daten bei [Elm](elm.md).
- **Tokens oder Funktionen:** [Open Props](open-props.md) legt jeden Wert als Variable ab, `@aufbau/css` rechnet sie mit `@function` aus wenigen Grund-Tokens, [Tailwind](tailwind.md) macht sie zu Klassen.

## Aufbau eines Steckbriefs

Jeder Steckbrief hat dieselbe Gliederung, in dieser Reihenfolge:

1. **`# Name`**, darunter ein Absatz: was es ist, von wem, seit wann, aktueller Stand (Version, Monat und Jahr, ob aktiv oder ruhend).
2. **Eckdaten** als Liste: Website, Repository, je nach Fall Laufzeit, Abhängigkeiten, Build.
3. **`## Das Problem, das X löst`** (bei Frameworks auch `## Worum es geht`): die Lage vor X und was X daran ändert.
4. **`## Kernkonzepte`**: nummeriert (`### 1. …`), jedes Konzept mit kurzem Code und Erklärung. Breite vor Tiefe: hier soll klar werden, *was* X kann.
5. **`## Wie es intern arbeitet`**: der Mechanismus darunter, in wenigen Absätzen.
6. **`## Stärken und Schwächen`**: zwei Punkte, **Stark** und **Schwach**.
7. **`## Für rat und aufbau`**: was davon übertragbar ist, was nicht und warum, als Liste oder Vergleichstabelle. Bezüge auf Entscheidungen (`d-xx`) und Ideen in rat, auf Pakete in aufbau und auf andere Steckbriefe.
8. **`## Deep Dive`** (optional, auf Anfrage): einzelne Kernkonzepte oder Punkte aus 7 im Detail. Jeder Abschnitt nennt im Titel, worauf er sich bezieht (`### flow: … (zu 6)`), und an der Stelle oben steht ein Link hierher. Immer der letzte Abschnitt.

Konventionen:

- Fließtext auf Deutsch, Kommentare im Code englisch und klein geschrieben.
- Fakten gegen die aktuelle Quelle prüfen (npm-Paket, Release-Notes), nicht aus dem Gedächtnis.
- Größen wie in der Tabelle oben messen und dort eintragen.
- Ideen für rat und aufbau, die es noch nicht gibt, sind als Skizze erkennbar („könnte“, „Vorschlag“) und prüfen vorher, ob Namen oder Mechanismen dort schon existieren.
- Ein neuer Steckbrief bekommt eine Zeile in der Tabelle, wenn es passt Einträge unter Querverbindungen, und ein Häkchen in [`../TODO.md`](../TODO.md), wo alle Todos für `/webdev` liegen.
