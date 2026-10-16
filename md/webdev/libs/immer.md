# Immer

Eine Bibliothek, mit der man unveränderliche Daten so ändert, als wären sie veränderlich: Man mutiert einen *Entwurf* (draft), Immer liefert daraus einen neuen Zustand und lässt das Original unberührt. Von Michel Weststrate (auch [MobX](mobx.md)), Version 1.0 im Januar 2018. Aktuell 11.1 (Oktober 2026), aktiv. In Redux Toolkit eingebaut und dadurch eine der meistgenutzten Bibliotheken im React-Umfeld.

- Website: https://immerjs.github.io/immer
- Repository: https://github.com/immerjs/immer
- Abhängigkeiten: keine
- Build: keiner nötig

## Das Problem, das Immer löst

Viele Systeme erkennen Änderungen über die Identität: Ein neues Objekt heißt „geändert“, dasselbe Objekt heißt „gleich“ (React, Redux, `memo`, [Hyperapp](hyperapp.md)). Deshalb darf man Zustand dort nicht verändern, sondern muss Kopien bauen. Bei verschachtelten Daten wird das mühsam und fehleranfällig:

```js
// without immer: copy every level on the way down
const next = {
  ...state,
  todos: state.todos.map((todo, index) => index === 2 ? { ...todo, done: true } : todo),
};
```

Mit Immer schreibt man die Änderung, wie man sie meint:

```js
const next = produce(state, draft => { draft.todos[2].done = true; });
```

## Kernkonzepte

### 1. `produce`: mutieren am Entwurf

```js
import { produce } from 'immer';

const next = produce(base, draft => {
  draft.todos[0].done = true;
  draft.todos.push({ title: 'brot', done: false });
});

next === base;                    // false
next.todos[1] === base.todos[1];  // true: untouched parts are shared
next.user === base.user;          // true
Object.isFrozen(next);            // true
```

Das Ergebnis ist ein neues Objekt, aber nur entlang des geänderten Pfads neu; alles andere ist **geteilt** (*structural sharing*). Wer mit `===` vergleicht, sieht sofort, welche Teile sich geändert haben. Ändert der Rezept-Code nichts (oder schreibt denselben Wert zurück), liefert `produce` das Original selbst.

### 2. Eingefroren

Das Ergebnis ist standardmäßig tief eingefroren (`Object.freeze`). Ein versehentliches `next.todos[0].done = false` außerhalb von `produce` wirft im Strict Mode. Abschaltbar mit `setAutoFreeze(false)`, wenn die Daten sehr groß sind.

### 3. Curried: Rezepte als Funktionen

```js
const toggle = produce((draft, index) => { draft.todos[index].done = !draft.todos[index].done; });

const next = toggle(state, 2);
```

Ohne Basis-Argument liefert `produce` eine Funktion `(state, ...args) => nextState`. Damit sind Reducer, Event-Handler und Store-Aktionen kurze Rezepte.

### 4. Patches: Änderungen als Daten

```js
import { applyPatches, enablePatches, produceWithPatches } from 'immer';

enablePatches();

const [next, patches, inverse] = produceWithPatches(base, draft => {
  draft.user.name = 'y';
  draft.todos.push({ title: 'c' });
});

// patches:  [{ op: 'add', path: ['todos', 2], value: … }, { op: 'replace', path: ['user', 'name'], value: 'y' }]
// inverse:  [{ op: 'remove', path: ['todos', 2] },        { op: 'replace', path: ['user', 'name'], value: 'x' }]

applyPatches(next, inverse);   // back to base: undo
```

Jede Änderung lässt sich als Liste von Patches (im Stil von JSON Patch, RFC 6902) und als Umkehrung bekommen. Damit sind Undo/Redo, Synchronisation über das Netz und Änderungsprotokolle fast geschenkt.

### 5. Plugins und Hilfen

| | |
|---|---|
| `enableMapSet()` | Drafts für `Map` und `Set` |
| `enablePatches()` | Patches, siehe oben |
| `enableArrayMethods()` | neu in 11.1: `sort`, `filter`, `reverse` … am Draft ohne einen Proxy pro Element |
| `current(draft)` | eine normale Kopie des Entwurfs im jetzigen Zustand, zum Loggen |
| `original(draft)` | der Ausgangswert |
| `createDraft` / `finishDraft` | dasselbe wie `produce`, aber über `await` hinweg |

Plugins sind getrennt, damit der Kern klein bleibt: `produce` allein 3,7 kb, alles 6,7 kb.

## Wie es intern arbeitet

Der Draft ist ein **Proxy** um das Original. Lesen gibt den Originalwert zurück; liest man ein verschachteltes Objekt, wird dafür erst bei Bedarf ein weiterer Proxy angelegt (*copy on write*, lazy). Der erste Schreibzugriff auf einem Knoten erzeugt eine flache Kopie dieses Knotens, markiert ihn als geändert und läuft die Kette der Eltern nach oben, die ebenfalls kopiert werden. Am Ende von `produce` (*finalize*) wird der Baum durchlaufen: Unveränderte Knoten werden durch ihre Originale ersetzt, geänderte Kopien eingefroren, Proxies aufgelöst. Patches entstehen in derselben Runde aus den Änderungs-Markierungen.

Die Kosten: ein Proxy pro besuchtem Knoten und ein Durchlauf am Ende. Für normale App-Zustände unerheblich, bei sehr großen Arrays mit vielen Lesezugriffen spürbar; daher das Plugin für Array-Methoden in 11.1.

## Stärken und Schwächen

- **Stark:** natürliche Schreibweise für unveränderliche Updates, strukturelles Teilen gratis, Einfrieren fängt Fehler, Patches für Undo und Sync, winzig, mit jeder Bibliothek kombinierbar.
- **Schwach:** Drafts sind Proxies: Außerhalb von `produce` aufbewahrt, sind sie ungültig (`revoked`), `console.log(draft)` zeigt den Proxy statt der Daten (`current` hilft). Rückgabe und Mutation dürfen nicht gemischt werden (`return` eines neuen Werts **oder** Änderung am Draft). Klasseninstanzen gehen nur mit `[immerable]`. Leistung bei sehr großen Datenmengen geringer als handgeschriebene Kopien.

## Für rat und aufbau

- **Immer ist die dritte Antwort auf d-23 (Mutation von `$`-Arrays):** a) nur Neuzuweisung, b) Compiler übersetzt `push` und Co., c) reaktive Typen. Immer zeigt eine vierte: mutieren am Entwurf, ein neuer Wert entsteht, und die Neuzuweisung bleibt der einzige Weg, ein Signal zu ändern. In rat könnte das so aussehen (Vorschlag): `$todos = produce($todos, draft => { draft[2].done = true; })`, oder als Sugar `$todos.update(draft => …)`. Das Signal sieht nur Neuzuweisungen, rats Sichtbarkeitsregel bleibt intakt.
- **Strukturelles Teilen hilft `@for`:** Weil unveränderte Einträge dasselbe Objekt bleiben, behält ein `@for`, der nach Identität schlüsselt (rats heutiger Standard), alle Zeilen außer der geänderten. Mit `[...$todos]` plus `{ ...todo }` an jeder Stelle passiert das nicht.
- **Patches als Format** passen zu mehreren Stellen: Undo in zugriff-Apps (Notizen, Todos), Synchronisation zwischen Tabs über `BroadcastChannel`, und als Persistenzformat in `@bunker` (Änderungen statt Gesamtstand speichern). Datastar benutzt mit JSON Merge Patch eine einfachere Variante derselben Idee ([datastar.md](datastar.md)).
- **`@aufbau/store` kopiert schon von Hand** (`push: (v, spec, x) => [...v, x]`): Für flache Listen reicht das. Für verschachtelte Einträge (eine Liste von Objekten) wäre ein `update(key, recipe)` auf Immer-Art die passende Erweiterung.
