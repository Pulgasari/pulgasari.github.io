# Lit

Googles kleine Bibliothek (rund 5 kb) zum Schreiben von Web Components, Nachfolger von Polymer. Eine Lit-Komponente ist ein echtes Custom Element (`<my-counter>`), das in jeder Seite und jedem Framework funktioniert.

- Website: https://lit.dev
- Build: keiner nötig (Decorators sind optional und brauchen einen)
- Vergleich mit `@aufbau/element`: [lit-vs-aufbau.md](lit-vs-aufbau.md)

## Das Problem, das Lit löst

Native Custom Elements sind umständlich: Rendern, Attribute und Properties synchron halten, Re-Renders planen, alles von Hand. Lit fügt genau so viel hinzu, dass es angenehm wird, ohne ein Framework zu werden.

## Kernkonzepte

### 1. Reaktive Properties

Deklarierte Properties rendern die Komponente neu, wenn sie sich ändern:

```js
import { LitElement, html, css } from 'lit';

class MyCounter extends LitElement {
  static properties = { count: { type: Number } };

  constructor () { super(); this.count = 0; }

  render () {
    return html`<button @click=${() => this.count++}>${this.count}</button>`;
  }
}

customElements.define('my-counter', MyCounter);
```

`count` wird zu einem Getter/Setter-Paar. Ein Setzen plant ein Update, gesammelt in einem Microtask: zehn Änderungen hintereinander ergeben ein Rendering. `type: Number` wandelt das Attribut `count="5"` in eine Zahl.

### 2. `html`-Templates, effizient gerendert

Der eigentliche Trick. Die statischen Strings eines Templates sind bei jedem Aufruf dieselben, nur die `${…}`-Werte unterscheiden sich. Lit parst die Strings **einmal** in ein `<template>`, merkt sich die Positionen der Lücken und vergleicht bei späteren Renderings nur noch die Werte in diesen Lücken. Kein Virtual DOM, kein Vergleich ganzer Bäume.

```js
html`<p class=${cls}>${text}</p>`
//   ^^^^^^^^^^^^^^ static, parsed once; only cls and text are checked on later renders
```

rats geplantes `dom:clone`-Target ist dieselbe Idee, nur zur Compile-Zeit statt beim ersten Rendern.

### 3. Binding-Präfixe im Template

```js
html`
  <input .value=${text}>       <!-- . sets the property, not the attribute -->
  <button ?disabled=${busy}>   <!-- ? a boolean attribute: present or absent -->
  <button @click=${save}>      <!-- @ an event listener -->
`
```

Drei Zeichen, drei Arten von Bindung.

### 4. Directives

Funktionen, die steuern, wie eine Lücke gerendert wird:

```js
html`${repeat(items, item => item.id, item => html`<li>${item.name}</li>`)}`  // keyed list
html`<div class=${classMap({ active, disabled })}>`                           // class toggles
html`${until(fetchData(), html`lädt …`)}`                                      // a promise
html`${guard([items], () => expensive(items))}`                                // memoize
```

### 5. Gekapselte Styles über Shadow DOM

```js
static styles = css`button { color: crimson; }`;
```

Der Shadow Root der Komponente kapselt Markup und Styles: Seiten-CSS kommt nicht hinein, Komponenten-CSS nicht hinaus. Die Styles sind ein geteiltes, konstruiertes Stylesheet (`adoptedStyleSheets`), einmal geparst für alle Instanzen.

### 6. Reactive Controllers

Wiederverwendbare Verhaltensbausteine, die sich in den Lebenszyklus einer Komponente einhängen (`hostConnected`, `hostUpdate`), etwa ein `MouseController`, der den Zeiger verfolgt und ein Re-Rendering anstößt. Lits Antwort auf React-Hooks.

### 7. Context und SSR

`@lit/context` reicht Werte durch den Baum, ohne Props. `@lit-labs/ssr` rendert Komponenten auf dem Server mit Declarative Shadow DOM.

## Stärken und Schwächen

- **Stark:** baut auf Plattform-Standards, das Ergebnis sind einfach Custom Elements. Klein, schnell, kein Build nötig. Gut für Design-Systeme, die framework-übergreifend genutzt werden.
- **Schwach:** Shadow DOM macht globale Styles und Formulare umständlich (ein Formular sieht Inputs in einem Shadow Root nicht ohne Zusatzaufwand). Re-Rendering passiert pro Komponente, gröber als bei Signals.

## Für rat und aufbau

- **Das Template-Caching** bestätigt das `dom:clone`-Target: statische Teile einmal, Lücken nach Position verfolgt.
- **`.prop` / `?attr` / `@event`** ist ein kompaktes Binding-Vokabular. rat hat `on:` und für Behaviors `@` gewählt, aber Booleans im Stil von `?disabled` sind einen Gedanken wert.
- **Directives** finden sich in rat wieder: `repeat` ist `@for` (keyed), `classMap` ist `class:x`, `until` ist `@await`.
- **Custom Elements als Ausgabe:** Eine rat-Komponente, die zu einem Lit-artigen Custom Element compiliert (`@rat/elements`, im Konzept geplant), wäre in jeder Seite nutzbar. Die aufbau-Elements sind schon Custom Elements.
