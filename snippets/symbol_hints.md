# Das Grundprinzip: "Frag den Wert nach der Form, die du brauchst"
​Wir definieren ein zentrales Symbol, z. B. Symbol.for('domina.shape').
​Eine Funktion sagt jetzt nicht mehr: "Was bist du für ein Typ?", sondern: "Gib mir deine Daten als 'array' (oder 'string', 'object', 'element')."
​1. Der universelle Shape-Resolver
​Diese kleine Hilfsfunktion fragt ein Objekt nach dem Symbol. Falls das Objekt kein Symbol hat, greift ein generischer Fallback für rohe JS-Typen:

```javascript
// @domina/core/internal/shape.js

export const SHAPE = Symbol.for('domina.shape');

/**
 * Resolves any value into the requested target shape/hint.
 * @param {any} value - The input value or object
 * @param {'string'|'array'|'object'|'element'} hint - The shape the calling function needs
 */
export function asShape(value, hint) {
  if (value == null) {
    if (hint === 'array') return [];
    if (hint === 'object') return {};
    if (hint === 'string') return '';
    return null;
  }

  // 1. DYNAMIC SYMBOL PROTOCOL: The object handles the hint itself!
  if (typeof value[SHAPE] === 'function') {
    return value[SHAPE](hint);
  }

  // 2. FALLBACK: Generic conversions for plain JS primitives
  switch (hint) {
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.trim().split(/\s+/);
      if (value instanceof Set) return [...value];
      return [value];

    case 'string':
      if (Array.isArray(value)) return value.join(' ');
      return String(value);

    case 'object':
      if (typeof value === 'object') return value;
      return {};

    case 'element':
      if (value instanceof Element) return value;
      if (typeof value === 'string') return document.querySelector(value);
      return null;

    default:
      return value;
  }
}
```

## 2. Ein Objekt/Wrapper bestimmt seine Formen über das Symbol
​Jetzt kann jedes beliebige Objekt (oder jede Klasse) mit [SHAPE](hint) genau festlegen, was bei welchem hint zurückgegeben wird. Kein if/else mehr in deinen Funktionen!

```js
// MySmartData.js

import { SHAPE } from './shape.js';

export class UserSelection {
  constructor() {
    this.users = new Map([
      ['usr_1', { name: 'Alice', active: true }],
      ['usr_2', { name: 'Bob', active: false }]
    ]);
  }

  // THE MULTISHAPE PROTOCOL: Responds dynamically to the requested hint!
  [SHAPE](hint) {
    switch (hint) {
      case 'array':
        // Converts map values to an array
        return [...this.users.values()];

      case 'string':
        // Converts active users to a comma-separated string
        return [...this.users.values()]
          .filter(u => u.active)
          .map(u => u.name)
          .join(', ');

      case 'object':
        // Converts map to a plain key-value object
        return Object.fromEntries(this.users);

      case 'number':
        // Returns the total count
        return this.users.size;
    }
  }
}
```

## 3. Wie deine Bibliotheks-Funktionen das nutzen (Genial sauber!)
​Deine Funktionen müssen null if/else oder typeof-Vergleiche für Typen mehr schreiben. Sie fordern einfach den benötigten hint an:

```js
import { asShape } from './shape.js';
import { UserSelection } from './MySmartData.js';

// Function 1: Needs an array
function processItems(input) {
  const items = asShape(input, 'array'); // Guaranteed to be an Array!
  items.forEach(item => console.log('Item:', item));
}

// Function 2: Needs a string
function renderText(input) {
  const text = asShape(input, 'string'); // Guaranteed to be a String!
  console.log('Rendering:', text);
}

// TEST CASES WITH DIFFERENT INPUTS:

const selection = new UserSelection();

processItems(selection); 
// Output: Array of user objects [{ name: 'Alice'... }, { name: 'Bob'... }]

renderText(selection);   
// Output: Rendering: "Alice"

// Works JUST AS WELL with raw strings or arrays without breaking!
processItems('foo bar baz'); 
// Output: ['foo', 'bar', 'baz']

renderText(['Red', 'Green', 'Blue']); 
// Output: "Red Green Blue"
```

## 4. Der generische Decorator / Higher-Order-Function
​Wenn du das ganze noch auf die Spitze treiben willst, kannst du eine Higher-Order Function bauen, die deinen Funktions-Parametern die benötigten Hints zuweist:

```js
// @domina/core/internal/withShapes.js

import { asShape } from './shape.js';

/**
 * Wraps a function and auto-converts its arguments according to specified shape hints.
 * Example: enforceShapes(fn, 'element', 'array')
 */
export function enforceShapes(fn, ...hints) {
  return function (...args) {
    const convertedArgs = args.map((arg, index) => {
      const hint = hints[index];
      return hint ? asShape(arg, hint) : arg;
    });

    return fn.apply(this, convertedArgs);
  };
}

```

Nutzung:

```js
// Raw function assumes arg1 is ALWAYS an Element and arg2 is ALWAYS an Array of class strings
function rawAddClasses(element, classesArray) {
  if (!element) return;
  element.classList.add(...classesArray);
}

// Wrap it ONCE:
export const addClasses = enforceShapes(rawAddClasses, 'element', 'array');

// NOW YOU CAN PASS ANYTHING:
addClasses('#my-btn', 'btn primary active'); 
// Automatically converts '#my-btn' -> Element and 'btn primary active' -> ['btn', 'primary', 'active']

```
