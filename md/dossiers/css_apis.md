# APIs

## 1. CSSOM (CSS Object Model)

Die grundlegende JavaScript-API zum Lesen und Verändern von Stylesheets.
Wofür?
- Stylesheets auslesen
- Regeln hinzufügen/löschen
- CSS-Eigenschaften ändern

Beispiele:

```
document.styleSheets
stylesheet.cssRules
CSSStyleRule
CSSStyleDeclaration
```

## 2. CSS Typed OM

Eine moderne, typisierte Alternative zum klassischen CSSOM.

```javascript
// Anstatt
element.style.width = "100px";
// schreibt man
element.attributeStyleMap.set("width", CSS.px(100));
```

Vorteile:
- keine Stringparsing-Probleme
- Einheiten bleiben erhalten
- schneller
- besser für Animationen

Klassen:
```
StylePropertyMap
CSSUnitValue
CSSKeywordValue
CSSMathSum
CSSMathProduct
CSSMathMin
CSSMathMax
CSSMathClamp
CSSNumericValue
```

## 3. CSS Properties & Values API (Houdini)

Erlaubt eigene CSS-Properties zu registrieren.

Dadurch werden Custom Properties animierbar.

```css
@property --progress {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
}
```

```javascript
CSS.registerProperty(...)
```

## 4. CSS Painting API (Paint Worklet)

Teil von Houdini.

Man kann eigene Hintergründe zeichnen.

```css
background: paint(myPainter);
```

```javascript
registerPaint(...)
```

Verwendung:
- Muster
- Noise
- Raster
- Effekte

## 5. CSS Layout API (Layout Worklet)

Eigene Layout-Algorithmen entwickeln.

Beispiele:
- Masonry
- Magazine Layout
- Flow Layouts

Noch kaum implementiert.

## 6. CSS Animation Worklet

Animationen unabhängig vom Main Thread.

Ideal für:

- Scrollanimationen
- flüssige Animationen

Wird teilweise von moderneren APIs ersetzt.

## 7. CSS Typed OM Geometry Interfaces

Arbeitet mit:
```
DOMRect
DOMMatrix
DOMPoint
```

für Transformationen.

## 8. Constructable Stylesheets

Stylesheets als JavaScript-Objekte.

```javascript
const sheet = new CSSStyleSheet();

sheet.replaceSync(`
div {
    color:red;
}
`);

document.adoptedStyleSheets = [sheet];
```

Ideal für:
- Web Components
- Shadow DOM

## 9. CSSStyleSheet API

Teil des CSSOM.

Methoden:
```javascript
replace()
replaceSync()
insertRule()
deleteRule()
```

## 10. CSS.escape()

Hilfsfunktion.

```javascript
CSS.escape(id)
```

Escaped Selektoren sicher.

## 11. CSS.supports()

Feature Detection.

```javascript
CSS.supports("display", "grid")
//oder
CSS.supports("(display:grid)")
```

## 12. getComputedStyle()

Eine der ältesten CSS-APIs.

```javascript
const style = getComputedStyle(element);
```

Liest:
- tatsächliche Farben
- Größen
- Fonts
- Positionen

## 13. Element.computedStyleMap()

Teil des Typed OM.

```javascript
element.computedStyleMap()
```

Liefert typisierte Werte statt Strings.

## 14. StylePropertyMap

Neue API zum Lesen und Schreiben.

```javascript
element.attributeStyleMap
```

## 15. CSS Font Loading API

Schriften dynamisch laden.

```javascript
const font = new FontFace(...)
document.fonts.add(font)
// außerdem:
document.fonts.ready
```

## 16. CSS Font Palette API

Für Variable Fonts mit Farbpaletten. Noch wenig verbreitet.

## 17. CSS Highlight API

Eigene Textmarkierungen.

```javascript
CSS.highlights.set(...)
```

Nützlich für:
- Editoren
- Suchergebnisse
- Kommentare

## 24. Media Query API

JavaScript-Zugriff.

```javascript
matchMedia("(prefers-color-scheme: dark)")
// auch:
prefers-reduced-motion
prefers-contrast
width
height
```


