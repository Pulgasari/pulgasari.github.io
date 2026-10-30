# Odin

Eine Systemsprache „für die Freude am Programmieren“: eine Alternative zu C für Spiele, Grafik und Werkzeuge, mit eingebauter Unterstützung für Vektoren, Matrizen und datenorientiertes Design. Von Ginger Bill (Bill Hall), seit 2016. Es gibt keine nummerierten Versionen, sondern monatliche Releases (`dev-2026-10`); die Sprache gilt als weitgehend stabil, die Bibliotheken bewegen sich noch.

- Website: https://odin-lang.org
- Typisierung: statisch, stark, mit Inferenz; parametrischer Polymorphismus
- Paradigmen: imperativ, prozedural, datenorientiert; keine Klassen, keine Ausnahmen, keine Methoden
- Build: `odin build .` (ein Paket ist ein Ordner, kein Build-System nötig), kein Paketmanager
- Läuft als: native Binärdatei über LLVM, WebAssembly (`js_wasm32`, `wasi_wasm32`)

## Woher sie kommt

Bill arbeitete an Spielen und Werkzeugen in C und C++ und wollte die Kontrolle von C ohne seine Altlasten (Header, Präprozessor, `#define`, unklare Integer-Regeln) und ohne die Komplexität von C++ (Templates, Ausnahmen, RAII, Vererbung). Odin übernimmt dabei viel von Pascal und Go: die Deklarationsform `name: Typ`, Pakete als Ordner, einfache Syntax. Bekannt wurde es durch EmberGen und JangaFX, deren Echtzeit-Simulationswerkzeuge für Feuer und Rauch in Odin geschrieben sind.

## Syntax auf einen Blick

```odin
package main

import "core:fmt"

main :: proc () {
    name  := "rat"            // := deklariert mit inferenz
    count : int = 3
    count += 1

    if count > 2 { fmt.println("viele", name) }

    for i in 0..<5 { fmt.println(i) }      // 0 bis 4
    for i in 0..=5 { fmt.println(i) }      // 0 bis 5

    list := [dynamic]int{1, 2, 3}
    defer delete(list)
    for value, index in list { fmt.println(index, value) }
}

greet :: proc (who: string) -> string {
    return fmt.tprintf("hallo %s", who)    // t: in den temporären allocator
}
```

| Odin | JavaScript | Anmerkung |
|---|---|---|
| `x := 1` | `let x = 1` | |
| `X :: 1` | `const X = 1` | `::` ist eine Konstante, auch für Prozeduren und Typen |
| `proc (…) -> T` | `function` | Prozeduren, keine Methoden |
| `0..<5`, `0..=5` | – | Bereiche |
| `^T`, `p^` | – | Zeiger, Dereferenz hinten |
| `nil` | `null` | nur für Zeiger, Maps, Unions, … |
| `or_return`, `or_else` | `throw`, `??` | Fehler und Optionals als Rückgabewerte |
| `defer` | `finally` | am Blockende |

## Kernkonzepte

### 1. Der implizite `context`

```odin
do_work :: proc () {
    data := make([]u8, 1024)         // holt sich speicher aus context.allocator
    defer delete(data)
}

main :: proc () {
    arena: mem.Arena
    mem.arena_init(&arena, buffer[:])
    context.allocator = mem.arena_allocator(&arena)
    do_work()                        // nutzt jetzt die arena, ohne parameter
}
```

Jede Prozedur bekommt unsichtbar einen `context` mit, der Allocator, temporären Allocator, Logger und Assertion-Handler enthält. Ein Aufrufer kann ihn für alles darunter austauschen. Das ist der Mittelweg zwischen C (globaler `malloc`) und [Zig](zig.md) (Allocator als ausdrücklicher Parameter): austauschbar, aber ohne ihn durch jede Signatur zu reichen.

### 2. Mehrere Rückgabewerte und `or_return`

```odin
Error :: enum { None, Empty, Too_Long }

parse :: proc (text: string) -> (port: int, err: Error) {
    if len(text) == 0 { return 0, .Empty }
    return 80, .None
}

load :: proc () -> (int, Error) {
    port := parse(input) or_return   // fehler sofort zurückgeben
    return port, .None
}

value := find(map, key) or_else 0
```

Fehler sind gewöhnliche Werte, meist ein Enum oder eine Union als letzter Rückgabewert. `or_return` gibt ihn weiter, wenn er nicht der Nullwert ist. Keine Ausnahmen, kein spezieller Fehlertyp.

### 3. Unions und `switch`

```odin
Shape :: union { Circle, Rect }
Circle :: struct { radius: f32 }
Rect   :: struct { width, height: f32 }

area :: proc (shape: Shape) -> f32 {
    switch s in shape {
    case Circle: return 3.14159 * s.radius * s.radius
    case Rect:   return s.width * s.height
    }
    return 0
}
```

Tagged Unions mit Typ-Switch, wie Rusts Enums. `#partial switch` erlaubt, nicht alle Fälle zu behandeln; ohne `#partial` warnt der Compiler bei fehlenden.

### 4. Datenorientiert: `#soa`, Arrays als Vektoren

```odin
Particle :: struct { position: [3]f32, velocity: [3]f32 }

particles: #soa[1024]Particle         // structure of arrays, nicht array of structs
particles[0].position += particles[0].velocity * dt   // komponentenweise rechnen

a := [3]f32{1, 2, 3}
b := a.zyx + 1                         // swizzle wie in glsl
m: matrix[4, 4]f32                     // eingebaute matrizen
```

`#soa` legt jedes Feld in ein eigenes Array: Eine Schleife über alle Positionen liest dann zusammenhängenden Speicher, was für Caches und SIMD viel schneller ist. Feste Arrays rechnen komponentenweise, Swizzles und Matrizen kommen aus der Grafikprogrammierung.

### 5. Prozedurgruppen statt Überladung

```odin
length_vec :: proc (v: [2]f32) -> f32 { … }
length_str :: proc (s: string) -> int { … }
length :: proc { length_vec, length_str }   // der compiler wählt nach dem argumenttyp
```

### 6. Batterien für Spiele

Die Distribution bringt Bindings in `vendor:` mit: raylib, SDL2/3, OpenGL, Vulkan, Metal, DirectX, WebGPU, stb, miniaudio, box2d. Ein Fenster mit Grafik ist ohne Paketmanager eine Zeile Import.

## Wo man Odin begegnet

EmberGen, GeoGen und LiquiGen von JangaFX, Spiele und Engines aus der Indie- und Handmade-Szene, Werkzeuge und Prototypen für Grafik. Außerhalb davon ist Odin selten.

## Stärken und Schwächen

- **Stark:** kleine, lesbare Sprache, schnelle Übersetzung ohne Build-System, ausgezeichnet für Grafik und Simulation (Vektoren, Matrizen, `#soa`), austauschbare Allocators über den `context`, viele Bindings im Lieferumfang.
- **Schwach:** keine Speichersicherheit, kein Paketmanager (bewusst), kleine Gemeinschaft, wenig Bibliotheken außerhalb von Spielen und Grafik, keine stabilen Versionsnummern, der implizite `context` ist für Leser unsichtbar.

## Für rat und aufbau

- **Der `context`** ist dasselbe Muster wie Reacts Context oder rats Scopes: Werte, die ein Teilbaum erbt, ohne sie durchzureichen. Bei Odin für Speicher und Logging, bei rat für Eigentümer von Effekten und gespeicherte Schlüssel (`stored` mit dem Namen der umgebenden View).
- **Swizzles und Vektortypen** wären für aufbaus Farb- und Geometrie-Funktionen (`--alpha()`, `--darker()`) die Vorlage, falls aufbau je Farben als Vektoren rechnen will.
- **Wasm-Ziel `js_wasm32`** mit einer kleinen JS-Laufzeit (`odin.js`) zeigt, wie dünn die Brücke zwischen einer Systemsprache und dem Browser sein kann; für rechenintensive Teile einer zugriff-App eine Alternative zu Rust und Zig.
- **[Electrobun](../libs/electrobun.md)** nimmt neben Zig, Rust und Go auch Odin für den nativen Teil einer Desktop-App.
