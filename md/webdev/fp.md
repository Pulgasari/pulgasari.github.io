# Functional Programming

## Vokabular

Hier sind die wichtigsten FP-Grundbegriffe und Vokabeln, geordnet nach ihren typischen Aufgaben im Code:


### 1. Daten-Transformation & Iteration
- `map`: Wandelt jedes Element einer Struktur 1:1 um (A \to B).
- `filter`: Behält nur die Elemente, für die ein Prädikat true ergibt.
- `flatMap` (auch `chain` / `bind`): Transformiert ein Element und flacht das Ergebnis ab (verhindert ungewollte Verschachtelungen wie [[1], [2]]).
 * `traverse` / `walk`: Wandert durch eine verschachtelte Baum- oder Listenstruktur und wendet auf jedem Knoten eine Aktion/einen Effekt an.
 * `each` / `forEach`: Geht eine Struktur durch, um Seiteneffekte auszuführen (wird meist nur am "Rand" einer FP-Pipeline genutzt, da kein Wert zurückgegeben wird).

### 2. Akkumulation & Kombination
- `fold` / `reduce`: Faltet eine Struktur Element für Element zu einem einzelnen Gesamtwert zusammen.
- `scan`: Wie reduce, gibt aber nach jedem einzelnen Schritt den aktuellen Zwischenstand als Liste zurück.
- `zip` / `zipWith`: Führt zwei Listen paarweise zusammen wie ein Reißverschluss (z. B. [1, 2] + ['a', 'b'] \to [[1, 'a'], [2, 'b']]).
- `partition`: Teilt eine Liste anhand eines Prädikats in zwei Teillisten auf ([matches, nonMatches]).

### 3. Komposition & Plumbing (Funktionen verketten)
- `pipe`: Führt Funktionen von links nach rechts aus. Die Ausgabe von f wird zur Eingabe von g (pipe(f, g)(x) entspricht g(f(x))).
- `compose`: Führt Funktionen von rechts nach links aus (mathematische Notation: (g \circ f)(x)).
- `curry`: Wandelt eine Funktion mit mehreren Argumenten f(a, b) in eine Kette von Einzelargument-Funktionen um (f(a)(b)).
 * `partial`: Wandelt eine Funktion um, indem manche Argumente vorab fest gebunden werden.
 * `tap`: Führt eine Funktion für Seiteneffekte aus (z. B. Logging/Debugging), ignoriert deren Rückgabewert und reicht die ursprünglichen Daten unverändert weiter.

### 4. Kontrollfluss & Prädikate (Bedingungen als Funktionen)
 * predicate: Eine reine Funktion, die Daten entgegennimmt und einen Boolean (true/false) zurückgibt.
 * when / unless: Führt eine Transformation nur aus, wenn ein Prädikat zutrifft (bzw. nicht zutrifft).
 * ifElse: Funktionales Äquivalent zu if/else (ifElse(predicate, onTrue, onFalse)).
 * cond: Funktionales Äquivalent zu switch/case (erwartet ein Array aus [predicate, action]-Paaren).
 * both / either / allPass / anyPass: Kombiniert Prädikate funktional mit AND bzw. OR.

### 5. Primitiven & Combinators (Die kleinen Helfer)
 * identity (oft id oder x => x): Gibt das übergebene Argument unverändert zurück.
 * always (auch constant): Erstellt eine Funktion, die egal bei welchem Aufruf immer denselben festen Wert zurückgibt (always(42)() === 42).
 * noop: Eine leere Funktion (() => {}), die gar nichts tut.

### Zusammenspiel in einer Pipeline

```js
import { pipe, filter, map, tap, always, ifElse } from 'ramda';

// Predicate definition
const isEven = x => x % 2 === 0;

// Data-last processing pipeline
const processNumbers = pipe(
  filter(isEven),
  tap(x => console.log('Filtered value:', x)), // Side-effect without mutating state
  map(ifElse(
    x => x > 10,
    x => x * 2,
    always(0)
  ))
);
```
