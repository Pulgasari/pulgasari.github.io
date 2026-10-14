# Dart

Eine klassenbasierte, statisch typisierte Sprache von Google, 2011 vorgestellt von Lars Bak und Kasper Lund, den beiden, die vorher V8 gebaut hatten. Gedacht als Ersatz für JavaScript im Browser, gescheitert an genau diesem Ziel, und dann über **Flutter** zu einer der meistgenutzten Sprachen für Apps geworden. Dart kompiliert zu nativem Maschinencode, zu JavaScript und zu WebAssembly.

- Website: https://dart.dev
- Aktuelle Linie: Dart 3 (seit Mai 2023)
- Typisierung: statisch, sound, mit Typinferenz und Null-Sicherheit
- Paradigmen: objektorientiert, mit funktionalen Elementen (Records, Patterns, Closures)
- Paketmanager: pub (`pubspec.yaml`, pub.dev)

## Woher sie kommt

2011 sah Google JavaScript als Sackgasse für große Anwendungen: keine Klassen, keine Module, keine Typen, schwer zu optimieren. Dart sollte eine eigene VM in Chrome bekommen („Dartium“) und daneben zu JavaScript kompilieren. Andere Browserhersteller lehnten ab, ES6 brachte Klassen und Module, TypeScript bot Typen ohne neue Laufzeit. 2015 gab Google die Dart-VM im Browser auf.

Gerettet hat die Sprache ein internes Projekt: Flutter (1.0 im Dezember 2018) brauchte eine Sprache, die schnell genug für 60 Bilder pro Sekunde ist, während der Entwicklung **Hot Reload** kann (JIT) und für die Auslieferung nativ kompiliert (AOT). Dart konnte beides. Seitdem richtet sich die Sprache stark nach den Bedürfnissen von UI-Code.

| Jahr | Version | Meilenstein |
|---|---|---|
| 2011 | Vorstellung | als JavaScript-Alternative |
| 2013 | 1.0 | optionale Typen |
| 2018 | 2.0 | sound type system, Fokus auf Flutter und Web-Kompilierung |
| 2021 | 2.12 | Null-Sicherheit (zunächst optional) |
| 2023 | 3.0 | Null-Sicherheit Pflicht, Records, Patterns, Sealed Classes, Class Modifiers |
| 2024 | 3.3 / 3.4 | Extension Types; WebAssembly als Ziel für Flutter Web |
| 2025 | 3.x | geplante Makros eingestellt (zu Gunsten von schnellerem Build-Tooling), dafür kleinere Erweiterungen |

## Syntax auf einen Blick

```dart
void main() {
  final name  = 'rat';            // einmal zuweisbar, typ wird abgeleitet (String)
  var   count = 3;                 // veränderlich
  const limit = 10;                // compile-zeit-konstante
  int?  maybe;                     // darf null sein, sonst nie

  print('hallo $name, ${count * 2}');   // interpolation mit $ und ${}

  if (count > 2) {
    print('viele');
  } else {
    print('wenige');
  }

  for (var i = 0; i < 3; i++) print(i);
  for (final item in ['a', 'b']) print(item);

  final doubled = [1, 2, 3].map((n) => n * 2).toList();
  print(doubled);                  // [2, 4, 6]
}
```

Wer Java, C# oder TypeScript kennt, liest Dart sofort. Die Unterschiede liegen im Detail.

## Kernkonzepte

### 1. Null-Sicherheit

Kein Typ enthält `null`, außer man schreibt `?` dahinter. Der Compiler verfolgt, wo ein Wert geprüft wurde.

```dart
String  name  = 'ada';
String? title;                         // darf null sein

print(title?.length);                  // null-aware zugriff
print(title ?? 'ohne titel');          // default
title ??= 'neu';                       // zuweisen, wenn null
if (title != null) print(title.length);   // hier ist title ein String (promotion)

late final String config;              // wird später gesetzt, versprochen
```

„Sound“ heißt: Der Compiler **garantiert** das. Anders als TypeScript, wo `any` und Casts die Prüfung aushebeln, kann ein `String` in Dart zur Laufzeit nie `null` sein. Das erlaubt dem Compiler auch Optimierungen (keine Null-Prüfungen im erzeugten Code).

### 2. Klassen, Konstruktoren, Mixins

```dart
class Point {
  final double x, y;
  const Point(this.x, this.y);                       // this.x: direkt ins feld
  Point.origin() : x = 0, y = 0;                     // benannter konstruktor, initializer list
  factory Point.parse(String s) {                    // factory: darf auch cache oder subtyp liefern
    final [a, b] = s.split(',').map(double.parse).toList();
    return Point(a, b);
  }

  double get length => sqrt(x * x + y * y);          // getter
  Point operator +(Point other) => Point(x + other.x, y + other.y);
}

mixin Named { String get name; String greet() => 'hallo $name'; }
class User with Named { @override final String name; User(this.name); }
```

- **Jede Klasse ist auch ein Interface**: `class A implements B` übernimmt die Signaturen von `B`, ohne die Implementierung.
- **Mixins** (`with`) mischen Methoden in eine Klasse, ohne Mehrfachvererbung.
- **`const`-Konstruktoren** erzeugen kanonische Objekte zur Compile-Zeit: `const Point(1, 2)` ist überall dasselbe Objekt. Flutter nutzt das massiv, ein `const`-Widget wird beim Neuaufbau übersprungen.
- **Privat** ist alles, was mit `_` beginnt, und zwar pro Datei (Library), nicht pro Klasse.

### 3. Benannte und optionale Parameter

```dart
void button(String label, {required void Function() onTap, bool disabled = false, Color? color}) { … }

button('Senden', onTap: send, disabled: true);
```

`{…}` sind benannte Parameter (optional, außer mit `required`), `[…]` optionale positionelle. Flutter-Code besteht fast nur aus benannten Parametern, und dadurch liest sich ein Widget-Baum wie Markup.

### 4. Kaskade `..`

```dart
final paint = Paint()
  ..color = Colors.red
  ..strokeWidth = 4
  ..style = PaintingStyle.stroke;
```

`..` ruft auf demselben Objekt weiter auf und gibt am Ende das Objekt zurück, nicht das Ergebnis des letzten Aufrufs. Ein Builder ohne Builder-Klasse.

### 5. Collection `if`, `for` und Spread

```dart
final items = [
  'start',
  if (loggedIn) 'profil' else 'login',
  for (final tab in tabs) tab.title,
  ...extra,
  ...?maybeMore,                 // spread, wenn nicht null
];
```

Kontrollfluss **innerhalb** eines Listen-, Set- oder Map-Literals. Dafür gemacht, Kinder eines Widgets bedingt oder in Schleifen zu erzeugen, ohne Hilfsvariablen.

### 6. Records und Patterns (Dart 3)

```dart
(String, int) parse() => ('ada', 36);           // record: anonymes tupel
final (name, age) = parse();                     // destrukturieren

({double lat, double lng}) home = (lat: 52.5, lng: 13.4);   // benannte felder

final description = switch (shape) {             // switch-ausdruck mit patterns
  Circle(radius: var r) when r > 10 => 'großer kreis',
  Circle()                          => 'kreis',
  Square(side: var s)               => 'quadrat $s',
};
```

Patterns funktionieren in `switch`, `if-case`, Zuweisungen und `for`. Sie prüfen Typen, zerlegen Listen, Maps, Records und Objekte und binden Variablen.

### 7. Sealed Classes: erschöpfendes Matching

```dart
sealed class Remote<T> {}
class Loading<T> extends Remote<T> {}
class Failure<T> extends Remote<T> { final Object error; Failure(this.error); }
class Success<T> extends Remote<T> { final T value;      Success(this.value); }

String show(Remote<String> state) => switch (state) {
  Loading()          => 'lädt',
  Failure(:var error) => 'fehler: $error',
  Success(:var value) => value,
};   // fehlt ein fall, meldet der compiler einen fehler
```

`sealed` heißt: Alle Untertypen stehen in derselben Datei, der Compiler kennt die vollständige Liste. Dazu die Class Modifiers `base`, `interface`, `final` und `mixin class`, die festlegen, ob eine Klasse außerhalb ihrer Datei erweitert oder implementiert werden darf.

### 8. Asynchronität: Future, Stream, Isolates

```dart
Future<User> load(int id) async {
  final response = await http.get(Uri.parse('/users/$id'));
  return User.fromJson(jsonDecode(response.body));
}

Stream<int> countdown(int from) async* {
  for (var i = from; i >= 0; i--) { yield i; await Future.delayed(Duration(seconds: 1)); }
}

await for (final n in countdown(3)) print(n);
```

`Future` entspricht `Promise`, `Stream` einem asynchronen Iterator mit Abonnement. Wie JavaScript läuft Dart in einem Event-Loop pro Thread.

Echte Parallelität gibt es über **Isolates**: eigene Heaps, kein geteilter Speicher, Kommunikation über Nachrichten, wie Web Worker (siehe [../workers.md](../workers.md)). `Isolate.run(() => schwereArbeit())` lagert eine Funktion aus und gibt ein `Future` zurück.

### 9. Extension Methods und Extension Types

```dart
extension on String { String get shout => '${toUpperCase()}!'; }
'ratte'.shout;   // 'RATTE!'

extension type UserId(int value) { bool get valid => value > 0; }   // eigener typ, zur laufzeit nur ein int
```

Extension Methods hängen Methoden an fremde Typen, ohne sie zu ändern (statisch aufgelöst). Extension Types sind Typen ohne Laufzeitkosten: `UserId` und `int` lassen sich im Code nicht verwechseln, im kompilierten Programm ist es derselbe Wert.

### 10. Reifizierte Generics

`List<String>` weiß zur Laufzeit, dass es `String` enthält (`list is List<int>` ist eine echte Prüfung). Java und TypeScript vergessen das beim Kompilieren.

## Kompilierung: ein Code, viele Ziele

| Ziel | Werkzeug | wofür |
|---|---|---|
| JIT in der Dart VM | `dart run` | Entwicklung: schneller Start, **Hot Reload** (Code im laufenden Programm austauschen, Zustand bleibt) |
| AOT, nativer Code (x64, ARM) | `dart compile exe`, Flutter Release | Apps und CLI-Tools: schneller Start, keine VM nötig |
| JavaScript | `dart compile js` (dart2js) | Web, mit Tree Shaking über das ganze Programm |
| WebAssembly (WasmGC) | `dart compile wasm` | Flutter Web, Garbage Collection durch den Browser |

## Werkzeuge

- `dart format`: ein Formatierer ohne Optionen, alle Dart-Projekte sehen gleich aus.
- `dart analyze` und der Analysis Server: Fehler, Lints, Fixes. Der Analysis Server spricht LSP (siehe [../lsp/README.md](../lsp/README.md)), deshalb ist Dart in jedem LSP-Editor gut unterstützt.
- `build_runner` mit Generatoren (`json_serializable`, `freezed`): Code-Generierung für JSON, unveränderliche Klassen und Gleichheit. Nötig, weil AOT-Code keine Reflection hat und die geplanten Makros eingestellt wurden.
- DevTools: Profiler, Speicher, Widget-Inspektor.

## Flutter in fünf Zeilen

```dart
class Counter extends StatefulWidget { const Counter({super.key}); @override State<Counter> createState() => _CounterState(); }

class _CounterState extends State<Counter> {
  int count = 0;
  @override
  Widget build(BuildContext context) => Column(children: [
    Text('$count'),
    if (count > 3) const Text('viele'),
    ElevatedButton(onPressed: () => setState(() => count++), child: const Text('+1')),
  ]);
}
```

Eine UI ist ein Baum aus Widgets, `build` beschreibt ihn neu, `setState` stößt den Neuaufbau an, Flutter vergleicht und zeichnet selbst (eigene Engine, keine nativen Bedienelemente, kein DOM). Collection-`if`, benannte Parameter und `const` machen diesen Code lesbar und schnell.

## Stärken und Schwächen

- **Stark:** sound Null-Sicherheit und Typen ohne Hintertüren; ein Code für Android, iOS, Desktop, Web; Hot Reload plus nativer AOT-Code; moderne Sprachmittel (Patterns, Records, Sealed Classes); einheitliche, gute Werkzeuge.
- **Schwach:** außerhalb von Flutter wenig verbreitet; Web-Ausgabe groß im Vergleich zu handgeschriebenem JS; Zugriff auf JavaScript-Bibliotheken nur über Interop-Schichten; Code-Generierung (`build_runner`) für Dinge, die andere Sprachen eingebaut haben; Abhängigkeit von Googles Prioritäten.

## Für rat und aufbau

- **Collection `if`/`for`** ist dieselbe Idee wie rats `@if`/`@for` im Markup: Kontrollfluss dort, wo die Kinder stehen, ohne Hilfsvariablen und ohne `map`/Ternary-Ketten. Dart beweist, dass das auch im Datenliteral lesbar bleibt.
- **Sealed Classes mit erschöpfendem `switch`** sind das Vorbild für `@switch` über Schemas aus `@rat/types` (siehe auch [Elm](../libs/elm.md)): Fehlt ein Fall, meldet es der Compiler, nicht der Nutzer. `Remote<T>` (Loading, Failure, Success) ist die Form, die ein `@await` abbilden sollte.
- **`const`-Widgets** und rats statische Template-Teile lösen dasselbe Problem auf zwei Wegen: Was sich nie ändert, soll beim Aktualisieren nichts kosten. Flutter markiert es per `const`, `@domina/render` klont es einmal pro Template.
- **`$name` in Strings** ist in Dart Interpolation, in rat ein Signal. Wer aus Dart kommt, liest `{$count}` womöglich als doppelte Interpolation.
- **`..`** ist in Dart die Kaskade, in rat ein Range, in [Lua](lua.md) die Verkettung.
- **Isolates** und Web Worker sind dasselbe Modell (kein geteilter Zustand, Nachrichten). `Isolate.run(fn)` ist das API, das man sich für Worker in JS wünscht, und ein Kandidat für einen Helfer in `@domina` oder `@rat/core`.
- **Soundness ohne TypeScript:** Dart zeigt, was ein Typsystem bringt, wenn es keine Hintertür hat. `@rat/types` geht den anderen Weg (Schemas zur Laufzeit), kann aber dieselbe Garantie an den Grenzen geben: Was durch ein Schema ging, ist sicher.
