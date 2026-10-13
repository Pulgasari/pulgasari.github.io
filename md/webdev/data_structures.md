# Wenige Datenstrukturen, viele Namen

Struct, Schema, Interface, Trait, Protokoll, Record, Tabelle, Message: Ist das nicht alles im Kern dasselbe?

Weitgehend ja. Es gibt nur eine Handvoll Grundformen, und die vielen Begriffe sind meist dieselbe Idee in einer anderen Community oder auf einer anderen Ebene. Eine Unterscheidung muss man aber festhalten, sonst wird es schief: **Struct und Schema sind nicht dasselbe, sondern Ding und Beschreibung des Dings.**

Vorher: [protocols.md](protocols.md) (was ein Protokoll ist).

## 1. Die Handvoll Grundformen

Fast alle Daten bestehen aus diesen Bausteinen:

| Grundform | Bedeutung | heißt auch |
|---|---|---|
| Produkt | A **und** B **und** C, feste Felder | struct, record, tuple, object, row, message, DTO |
| Summe | A **oder** B **oder** C | union, enum, variant, tagged union, `'grid' \| 'list'` |
| Folge | viele gleicher Art, geordnet | array, list, stream, table (als Folge von Zeilen) |
| Abbildung | Schlüssel → Wert | map, dict, hash, object (als Wörterbuch), index |
| Verweis | zeigt auf etwas anderes, auch auf sich selbst | pointer, reference, id, foreign key → daraus entstehen Bäume und Graphen |
| Funktion | Eingabe → Ausgabe | method, callback, handler |

JSON ist Produkt (Objekt) plus Folge (Array) plus ein paar Grundwerte. Eine Datenbanktabelle ist eine Folge von Produkten. Ein DOM ist ein Baum, also Produkte mit Verweisen. Ein Redux-Action-Typ ist eine Summe von Produkten. Ein Protobuf-`message` ist ein Produkt, `oneof` eine Summe.

Die Typtheorie nennt Produkte und Summen zusammen **algebraische Datentypen**. „Algebraisch“, weil man damit rechnen kann: Ein Produkt aus `Boolean` (2 Werte) und `'s' | 'm' | 'l'` (3 Werte) hat 2 × 3 = 6 mögliche Werte, eine Summe der beiden 2 + 3 = 5.

## 2. Zwei Ebenen: Ding und Beschreibung

| Ebene | Beispiele |
|---|---|
| der Wert selbst | ein konkretes Objekt `{ id: 1, title: 'Brot' }`, eine Zeile, eine HTTP-Nachricht |
| die Beschreibung, welche Form Werte haben müssen | Schema, Typ, Interface, Trait, Protokoll, Klasse, `CREATE TABLE`, JSON Schema |

Ein Struct in C oder Rust ist beides zugleich: Es beschreibt die Form, und jede Instanz ist ein Wert dieser Form. Ein Interface, ein Trait, ein Schema oder ein Protokoll ist **nur** die Beschreibung. Es gibt kein „Interface-Objekt“, nur Objekte, die eines erfüllen.

Auf der zweiten Ebene stimmt die Vermutung also: Schema, Interface, Trait und Protokoll sind alle Beschreibungen von Formen, und sie beschreiben sie mit denselben Grundformen.

## 3. Wo sich die Beschreibungen wirklich unterscheiden

Trotzdem sind die Begriffe nicht nur Synonyme. Sie unterscheiden sich entlang weniger Achsen, und genau diese Achsen verdecken die vielen Namen.

### Was beschrieben wird

| | beschreibt | Beispiel |
|---|---|---|
| Schema, Struct, Record | Felder, also Daten | `{ id: Str, done: Bool }` |
| Interface, Trait, Typklasse | Methoden, also Verhalten | „hat `next()`“, „kann man vergleichen“ |
| Protokoll im vollen Sinn | Verhalten **plus Ablauf über die Zeit** | erst `next()` bis `done: true`; erst Anfrage, dann Antwort |

Der letzte Punkt ist der echte Unterschied. Ein Schema sagt, wie **eine** Nachricht aussieht. Ein Protokoll sagt zusätzlich, **in welcher Reihenfolge** welche Nachrichten kommen dürfen. Das ist keine Datenstruktur mehr, sondern ein Zustandsautomat: Der Iterator ist erst „läuft“, dann „fertig“, und nach `done: true` kommt nichts mehr. Darum kann ein Interface ein Protokoll nur zur Hälfte ausdrücken. TypeScript kann sagen „hat `next()`“, aber nicht „ruf `next()` nicht mehr nach `done`“. (Die Forschung nennt Typen, die das können, „Session Types“; im Alltag gibt es sie kaum.)

### Wann geprüft wird

| | Zeitpunkt | Beispiel |
|---|---|---|
| statisch | beim Compilieren | TypeScript-Interface, Rust-Trait |
| zur Laufzeit | beim Einlesen von Daten | JSON Schema, zod, `@rat/types`, `static attr` in aufbau |
| nie | reine Absprache | Duck Typing, das Thenable-Protokoll, das Context-Protokoll |

### Wie Zugehörigkeit entsteht

| | Regel | Beispiel |
|---|---|---|
| nominal | man muss es erklären | `impl Display for Todo` (Rust), `implements` (Java) |
| strukturell | wer die Form hat, gehört dazu | TypeScript, Go-Interfaces, JavaScript-Protokolle |

### Offen oder geschlossen

Ein Struct hat genau diese Felder. Ein Interface verlangt mindestens diese Methoden, mehr ist erlaubt. Ein JSON Schema kann beides (`additionalProperties: false`).

### Logische Form oder Byte-Layout

Ein C-Struct legt auch fest, wo im Speicher welches Feld liegt (Offsets, Ausrichtung). Ein Protobuf-Schema legt fest, wie die Bytes auf der Leitung aussehen. Ein TypeScript-Interface legt nichts davon fest. „Dieselbe Form“ kann also sehr verschiedene Dinge bedeuten, je nachdem, ob Bytes mitgemeint sind.

## 4. Warum es so viele Namen gibt

Jede Gemeinschaft hat dieselbe Idee für ihren Ort benannt:

| Gemeinschaft | Ding | Beschreibung |
|---|---|---|
| Datenbanken | Zeile | Schema, Tabelle |
| OOP | Objekt | Klasse, Interface |
| Funktionale Sprachen | Wert | Typ, Typklasse |
| Systemsprachen | Struct-Instanz | Struct, Trait |
| Netzwerk | Nachricht, Paket | Protokoll, Format |
| Web-APIs | Payload, DTO | OpenAPI, JSON Schema, „Contract“ |
| Konfiguration | Config-Datei | Schema |

Die Begriffe verdecken die gemeinsamen Grundformen, das stimmt. Sie tragen aber auch echte Information: Wer „Protokoll“ sagt, meint meist Ablauf, wer „Struct“ sagt, meist Speicher, wer „Schema“ sagt, meist Laufzeit-Prüfung. Die Grundformen sind wenige, die Achsen sind wenige, und die Begriffe sind Kombinationen daraus.

## 5. Was daraus für rat und aufbau folgt

Das ist im Grunde die Idee hinter `@rat/types` aus dem rat-Konzept: **eine Beschreibung als Laufzeitwert, viele Ableitungen daraus**, so wie `@rat/syntax` aus einer Spezifikation fünf Editor-Formate erzeugt.

```js
const Todo  = Record({ id: Str.uuid, title: Str.min(1), done: Bool });   // product
const View  = Enum('grid', 'list');                                      // sum
const Todos = List(Todo);                                                // sequence
```

Aus diesem einen Wert lassen sich ableiten:

- Laufzeit-Prüfung (Schema),
- `index.d.ts` (statischer Typ),
- JSON Schema oder OpenAPI (Format für andere),
- ein Formular (`describe`),
- Speicherung über `@bunker`.

Dieselbe Form, verschiedene Ebenen. Auch aufbaus `static attr` ist schon so ein Schema, nur auf Attribute begrenzt.

Und in rats offenen Entscheidungen steckt es auch: Pattern Matching (d-30) ist genau das Werkzeug für Summen. Ein `@switch`, das Patterns versteht, zerlegt ein „A oder B oder C“, so wie ein Objekt-Destructuring ein „A und B“ zerlegt.
