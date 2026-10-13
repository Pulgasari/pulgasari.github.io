# Was ist ein Protokoll?

Ein **Protokoll** ist eine Absprache darüber, wie zwei Seiten miteinander reden, die sich gegenseitig nicht kennen. Halten sich beide daran, funktionieren sie zusammen, egal wer sie gebaut hat. Das Protokoll selbst ist kein Code, sondern eine Regel.

Das Wort kommt aus der Diplomatie: Das Protokoll legt fest, wer bei einem Staatsbesuch wann wen wie begrüßt, damit sich zwei fremde Seiten verständigen können, ohne vorher alles auszuhandeln. In der IT ist es dieselbe Idee.

Weiterführend: [data_structures.md](data_structures.md) (Protokoll, Interface, Schema, Struct: was davon dieselbe Datenstruktur ist und was nicht).

## Was eine solche Absprache festlegt

| Teil | Frage | Beispiel HTTP |
|---|---|---|
| Format | Wie sieht eine Nachricht aus? | `GET /index.html HTTP/1.1`, dann Header-Zeilen |
| Bedeutung | Was heißt sie? | `GET` holt etwas, `404` heißt „gibt es nicht“ |
| Ablauf | Wer sagt wann was? | erst die Anfrage, dann genau eine Antwort |
| Fehlerfälle | Was, wenn etwas schiefgeht? | Statuscodes, Timeouts |

## Wo das Wort vorkommt

Das Prinzip ist überall dasselbe, nur die Ebene ist eine andere.

### 1. Netzwerk

Rechner reden über eine Leitung miteinander. Hier kennt man das Wort am ehesten: TCP, IP, HTTP, WebSocket, SMTP. Ein Browser und ein Server stammen von verschiedenen Herstellern und verstehen sich trotzdem, weil beide HTTP sprechen.

### 2. Programmiersprachen

Objekte reden miteinander. Ein Protokoll ist hier eine Form, die ein Objekt haben muss, damit eine Sprachfunktion es benutzen kann. JavaScript hat einige davon:

```js
// iteration protocol: an object with [Symbol.iterator]() returning { next () → { value, done } }
const range = {
  [Symbol.iterator] () {
    let i = 0;
    return { next: () => ({ value: i, done: i++ >= 3 }) };
  },
};
for (const n of range) console.log(n);   // for…of only knows the protocol, not the object

// thenable protocol: anything with then() can be awaited
await { then (resolve) { resolve(42); } };

// handleEvent protocol: an object instead of a function as listener
element.addEventListener('click', { handleEvent (event) { … } });
```

`for…of` kennt den `range` nicht. Es weiß nur: „Wer `Symbol.iterator` hat, den kann ich durchlaufen.“ Swift und Python nennen das ebenfalls Protokoll, andere Sprachen sagen Interface oder Trait.

### 3. Zwischen Bibliotheken

Code von verschiedenen Autoren redet miteinander, ohne dass einer vom anderen abhängt. Hierher gehört das Context-Protokoll der Web Components Community Group:

```js
// consumer: asks the tree "does anyone have the theme?"
this.dispatchEvent(new Event('context-request', { bubbles: true, composed: true }));
// precisely: an event with { context: 'theme', callback (value) { … }, subscribe: true }

// provider: an ancestor that has it answers
this.addEventListener('context-request', event => {
  if (event.context !== 'theme') return;
  event.stopPropagation();
  event.callback(this.theme);
});
```

Es gibt dafür kein Paket, das man installieren müsste. Es gibt nur die Abmachung: welcher Ereignisname, welche Felder, wer `stopPropagation()` ruft, wie man sich abmeldet. Deshalb funktioniert ein Lit-Element mit `@lit/context` als Anbieter zusammen mit einem aufbau-Element als Abnehmer, sobald beide sich an die Abmachung halten. „Community“ heißt dabei: Ein offener Kreis von Bibliotheksautoren hat es vereinbart, nicht ein Normungsgremium.

## Abgrenzung zu ähnlichen Begriffen

| Begriff | ist | Beispiel |
|---|---|---|
| Protokoll | Absprache zwischen gleichberechtigten Seiten, unabhängig von der Umsetzung | HTTP, Iteration, Context |
| API | die konkrete Schnittstelle **einer** Sache, die man aufruft | `fetch()`, `customElements.define()` |
| Format | nur die Form von Daten, ohne Ablauf | JSON, CSV |
| Spezifikation | das Dokument, das ein Protokoll, eine API oder ein Format genau beschreibt | RFC 9110 für HTTP |
| Standard | eine Spezifikation, die ein Gremium (IETF, W3C, WHATWG, TC39) verabschiedet hat | HTTP ja, das Context-Protokoll nicht |

Faustregel: Eine API sagt „so bedienst du **mich**“. Ein Protokoll sagt „so reden **wir** miteinander“, und jeder kann eine Seite davon umsetzen.

## In eigenem Code

Protokolle tauchen auch in rat und aufbau schon auf:

- **Custom-Element-Callbacks:** Der Browser ruft `connectedCallback`, `attributeChangedCallback` oder `formResetCallback`, wenn eine Klasse sie hat. `withControl` in `@aufbau/element` erfüllt damit das Form-Associated-Protokoll der Plattform.
- **rats Behaviors:** `fn(element, value) → cleanup | { update, destroy }` ist ein kleines Protokoll. Deshalb passt `gestures()` aus `@aufbau/gestures` mit seinem `{ destroy }` ohne Adapter als Behavior.
- **RxJS 9** hat ein altes Protokoll aufgegeben: Objekte mit `Symbol.observable` werden nicht mehr als Observable erkannt. Ein Protokoll lebt nur so lange, wie beide Seiten es noch sprechen.
