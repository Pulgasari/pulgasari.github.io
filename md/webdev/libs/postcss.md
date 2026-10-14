# PostCSS

Ein Werkzeug, das CSS in einen Syntaxbaum zerlegt, Plugins darauf loslässt und wieder CSS daraus macht. Selbst tut es nichts mit dem CSS; jede Funktion ist ein Plugin. 2013 von Andrey Sitnik (Evil Martians), bekannt geworden durch sein erstes Plugin **Autoprefixer**. Heute steckt PostCSS in fast jeder Build-Kette (Vite, webpack, Next, Tailwind bis Version 3), meist unbemerkt. Aktuell 8.5.

- Website: https://postcss.org
- Repository: https://github.com/postcss/postcss
- Build: ja, in der Regel als Teil eines Bundlers (läuft aber auch im Browser)

## Das Problem, das PostCSS löst

Sass, Less und Stylus waren um 2012 die Antwort auf die Grenzen von CSS: Variablen, Verschachtelung, Mixins, alles in einer eigenen Sprache mit eigenem Compiler. Jede neue Idee musste in einem dieser Compiler landen.

PostCSS kehrt das um: **eine gemeinsame Grundlage (Parser, Syntaxbaum, Ausgabe), und jede Transformation ist ein austauschbares Plugin.** Wer Präfixe will, nimmt Autoprefixer. Wer künftige CSS-Syntax heute will, nimmt `postcss-preset-env`. Wer minifizieren will, nimmt cssnano. Man setzt sich seine eigene Sprache aus Bausteinen zusammen, oder schreibt normales CSS und lässt nur ein paar Werkzeuge darüber laufen.

## Kernkonzepte

### 1. Parser, Syntaxbaum, Ausgabe

```js
import postcss from 'postcss';

const root = postcss.parse('a { color: red; }');
root.walkDecls('color', decl => { decl.value = 'blue'; });
root.toString();   // 'a { color: blue; }'
```

Der Syntaxbaum hat wenige Knotentypen:

| Knoten | steht für | Beispiel |
|---|---|---|
| `Root` | die ganze Datei | |
| `AtRule` | eine `@`-Regel | `@media (…) { … }`, `@import '…'` |
| `Rule` | ein Selektor mit Block | `a:hover { … }` |
| `Declaration` | Eigenschaft und Wert | `color: red` |
| `Comment` | Kommentar | `/* … */` |

Jeder Knoten merkt sich Leerzeichen und Position (`raws`, `source`), damit die Ausgabe dem Original gleicht und Source Maps stimmen.

### 2. Plugins

```js
const removeColors = () => ({
  postcssPlugin: 'remove-colors',
  Declaration: {
    color (decl) { decl.remove(); },
  },
});
removeColors.postcss = true;

await postcss([removeColors()]).process(css, { from: 'app.css' });
```

Seit PostCSS 8 beschreibt ein Plugin, auf welche Knoten es reagiert (`Declaration`, `Rule`, `AtRule`, `Once`, `OnceExit` …). PostCSS läuft den Baum **einmal** ab und ruft alle interessierten Plugins pro Knoten auf, statt dass jedes Plugin den ganzen Baum selbst abläuft. Ändert ein Plugin einen Knoten, besucht PostCSS ihn erneut, bis sich nichts mehr ändert.

### 3. Die bekannten Plugins

| Plugin | macht |
|---|---|
| Autoprefixer | ergänzt `-webkit-` und Co. nach den Daten von caniuse und der Browserliste |
| `postcss-preset-env` | übersetzt neue CSS-Syntax für ältere Browser (Verschachtelung, `oklch`, Media-Query-Ranges …) |
| `postcss-import` | löst `@import` auf und fügt die Dateien ein |
| `postcss-nested` | Verschachtelung im Sass-Stil |
| cssnano | minifiziert |
| Stylelint | prüft CSS (baut auf PostCSS auf) |
| `tailwindcss` (bis v3), `@tailwindcss/postcss`, `@unocss/postcss` | erzeugen Utility-CSS |

### 4. Browserslist

```
# .browserslistrc
> 0.5%, last 2 versions, not dead
```

Viele Plugins (Autoprefixer, preset-env) fragen dieselbe Liste: Welche Browser sollen unterstützt werden? Daraus folgt, welche Präfixe und Übersetzungen nötig sind. Browserslist ist ein eigenes Projekt, ebenfalls von Andrey Sitnik.

### 5. Andere Syntaxen

PostCSS kann über austauschbare Parser auch SCSS (`postcss-scss`), Less, SugarSS oder CSS in HTML und JavaScript lesen. Der Baum bleibt derselbe, sodass ein Linter wie Stylelint über alle Varianten läuft.

## Wie es intern arbeitet

Der Tokenizer zerlegt den Text in Zeichenketten, Klammern, Doppelpunkte, Semikolons, Kommentare und Leerraum; der Parser baut daraus die Knoten, ohne Selektoren oder Werte weiter zu zerlegen (ein Selektor ist ein String, ein Wert auch). Wer mehr braucht, nimmt Hilfspakete (`postcss-selector-parser`, `postcss-value-parser`). Diese Flachheit macht PostCSS schnell und robust gegenüber unbekannter Syntax, schiebt die feine Arbeit aber in jedes Plugin.

## Stärken und Schwächen

- **Stark:** ein gemeinsames Fundament für das ganze CSS-Ökosystem, riesige Plugin-Auswahl, verlustfreie Ausgabe mit Source Maps, die Plugin-API ist einfach, läuft überall (Node, Deno, Browser).
- **Schwach:** in JavaScript geschrieben und damit langsamer als die Rust-Konkurrenz (Lightning CSS ist um ein Vielfaches schneller und erledigt Präfixe, Übersetzung und Minifizierung in einem). Viele Plugins mit überlappenden Aufgaben, Reihenfolge der Plugins ist eine häufige Fehlerquelle. Da moderne Browser Verschachtelung, `@layer`, `oklch` und Container Queries selbst können, braucht man einen Teil der Plugins nicht mehr. Tailwind 4 hat PostCSS als Kern durch eine eigene Engine mit Lightning CSS ersetzt.

## Für rat und aufbau

- **aufbaus `ass` und `stylescript`** stehen vor derselben Wahl, die PostCSS vor zwölf Jahren getroffen hat: eigene Sprache mit eigenem Compiler oder offenes Fundament mit Plugins. PostCSS zeigt, wie viel Ökosystem allein dadurch entsteht, dass der Syntaxbaum offen und dokumentiert ist.
- **rats `<style>`-Pipeline** (`@scope`, `lang="scss|sass|ass"`, `options.styles`) ist schon eine kleine PostCSS-artige Kette. Eine PostCSS-kompatible Plugin-Stelle (`options.postcss = [autoprefixer()]`) würde das ganze Ökosystem öffnen, ohne dass rat selbst etwas davon bauen muss. Weil PostCSS im Browser läuft (18,7 kb gz), ginge das auch im Playground ohne Build.
- **Plattform zuerst:** Verschachtelung, `@scope`, `@layer`, `color-mix()` und Container Queries sind nativ. Für rat und aufbau, die modern zielen, ist PostCSS eher ein Werkzeug für Ausnahmen (ein Minifizierer im Build, ein Linter) als eine Pflicht.
