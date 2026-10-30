# Zig

Eine Systemsprache als „besseres C“: so klein und direkt wie C, aber ohne Präprozessor, ohne versteckte Speicherzuteilung und ohne versteckten Kontrollfluss. Von Andrew Kelley, seit 2016, getragen von der gemeinnützigen Zig Software Foundation. Noch vor 1.0: Jede Minor-Version ändert Sprache und Standardbibliothek. Aktuell 0.16 (April 2026), mit I/O als Schnittstelle.

- Website: https://ziglang.org
- Typisierung: statisch, stark, mit Inferenz; Generics über `comptime`
- Paradigmen: imperativ, prozedural; keine Klassen, keine Ausnahmen, keine Makros
- Build: `zig build` mit `build.zig` (das Build-Skript ist selbst Zig), Pakete über `build.zig.zon`
- Läuft als: native Binärdatei (eigenes Backend und LLVM), WebAssembly; dazu ein vollständiger C/C++-Compiler (`zig cc`)

## Woher sie kommt

Kelley schrieb einen Musik-Synthesizer in C und ärgerte sich über Präprozessor, Header, undefiniertes Verhalten und Build-Systeme. Rust erschien ihm zu groß. Zig sollte C so ersetzen, dass man es Stück für Stück einführen kann: Zig importiert C-Header direkt, ruft C-Funktionen ohne Bindings auf und übersetzt nebenbei bestehenden C-Code, für jedes Ziel, von einem Rechner aus.

Der Leitsatz lautet „**no hidden control flow, no hidden memory allocations**“: Was eine Zeile tut, steht in der Zeile. Kein Operator ruft heimlich eine Funktion auf, keine Funktion holt sich heimlich Speicher.

## Syntax auf einen Blick

```zig
const std = @import("std");

pub fn main () void {
    const name = "rat";              // unveränderlich
    var count: u32 = 3;              // var: veränderlich, typ oft nötig
    count += 1;

    if (count > 2) {
        std.debug.print("viele {s}\n", .{name});
    }

    var i: usize = 0;
    while (i < 5) : (i += 1) {}      // schleife mit fortsetzungsausdruck
    for (0..5) |n| _ = n;            // 0 bis 4, |n| fängt den wert
}
```

| Zig | JavaScript | Anmerkung |
|---|---|---|
| `const`, `var` | `const`, `let` | ein ungenutztes `var` ist ein Fehler |
| `@import`, `@intCast`, `@This` | – | `@` markiert eingebaute Funktionen des Compilers |
| `.{ … }` | `{ … }`, `[…]` | anonymes Struct oder Tupel |
| `?T`, `null` | `null` | nur ein Optional-Typ darf `null` sein |
| `!T`, `try`, `catch` | `throw`, `try` | Fehler sind Werte |
| `defer`, `errdefer` | `finally` | am Blockende ausführen |
| `\|x\|` | – | fängt den Wert in `if`, `while`, `for`, `catch` |
| `undefined` | `undefined` | „noch nicht gesetzt“, kein eigener Wert |

## Kernkonzepte

### 1. Allocator als Parameter

```zig
fn greet (allocator: std.mem.Allocator, who: []const u8) ![]u8 {
    return std.fmt.allocPrint(allocator, "hallo {s}", .{who});
}

pub fn main () !void {
    var gpa: std.heap.DebugAllocator(.{}) = .init;
    defer _ = gpa.deinit();               // meldet lecks beim beenden
    const allocator = gpa.allocator();

    const text = try greet(allocator, "ada");
    defer allocator.free(text);
}
```

Eine Funktion, die Speicher braucht, bekommt einen `Allocator` übergeben. Die Standardbibliothek hat keinen globalen Speicher-Manager. Damit entscheidet der Aufrufer: ein Arena-Allocator für eine Anfrage (am Ende alles auf einmal frei), ein fester Puffer ohne Heap, ein Test-Allocator, der Lecks meldet.

### 2. Fehler sind Werte

```zig
const ParseError = error{ Empty, TooLong };

fn parse (text: []const u8) ParseError!u16 {
    if (text.len == 0) return error.Empty;
    if (text.len > 5) return error.TooLong;
    return 42;
}

const port = parse(input) catch |err| switch (err) {
    error.Empty   => 80,
    error.TooLong => return err,
};
const other = try parse(input);   // try: bei fehler sofort zurückgeben
```

`!T` heißt „ein Fehler oder ein T“. Fehlermengen sind Aufzählungen, die der Compiler über Funktionen hinweg zusammenführt. `try` reicht weiter, `catch` behandelt, `errdefer` räumt nur im Fehlerfall auf. Es gibt keine Ausnahmen und keinen Stack-Unwinding.

### 3. `comptime`: Code, der beim Übersetzen läuft

```zig
fn List (comptime T: type) type {
    return struct {
        items: []T,
        len: usize = 0,
        pub fn first (self: @This()) ?T { return if (self.len > 0) self.items[0] else null; }
    };
}

const Numbers = List(u32);   // ein typ, beim übersetzen erzeugt

fn max (comptime T: type, a: T, b: T) T { return if (a > b) a else b; }
```

Typen sind Werte, solange sie zur Übersetzungszeit bekannt sind. Generics sind gewöhnliche Funktionen, die einen Typ zurückgeben. Ein `comptime`-Block führt beliebigen Zig-Code beim Übersetzen aus: Tabellen vorberechnen, Formate prüfen (`std.debug.print` prüft seinen Formatstring beim Übersetzen), Strukturen untersuchen (`@typeInfo`). Das ersetzt Makros, Templates und Präprozessor mit einem Mechanismus.

### 4. `defer`

```zig
const file = try std.fs.cwd().openFile("x.txt", .{});
defer file.close();
```

Läuft beim Verlassen des Blocks, in umgekehrter Reihenfolge. Aufräumen steht direkt neben dem Anlegen.

### 5. Optionals und Slices

```zig
var maybe: ?u32 = null;
if (maybe) |value| std.debug.print("{d}\n", .{value});
const sure = maybe orelse 0;

const text: []const u8 = "hallo";   // slice: zeiger plus länge
const part = text[1..3];            // "al", grenzen werden im debug-modus geprüft
```

Zeiger können nicht `null` sein, außer ihr Typ ist `?*T`. Slices tragen ihre Länge mit; im Debug- und ReleaseSafe-Modus prüft Zig Grenzen und Überläufe, im ReleaseFast-Modus nicht.

### 6. C ohne Bindings

```zig
const c = @cImport(@cInclude("stdio.h"));

pub fn main () void { _ = c.printf("hallo aus c\n"); }
```

`zig cc` ist ein C-Compiler mit eingebauten Standardbibliotheken für alle Plattformen: Ein Linux-Rechner baut eine Windows- oder macOS-Binärdatei ohne weitere Toolchain. Deshalb nutzen auch Projekte ohne eine Zeile Zig `zig cc` zum Cross-Compiling (etwa für Rust oder Go mit C-Abhängigkeiten).

### 7. I/O als Schnittstelle (0.16)

Seit 0.16 bekommt jede Funktion, die liest, schreibt, wartet oder ins Netz geht, eine `Io`-Instanz übergeben, wie einen Allocator. Ob dahinter Threads, ein Event-Loop oder blockierende Aufrufe stehen, entscheidet der Aufrufer. Das umgeht die „Funktionsfarben“ von `async`/`await`: Dieselbe Funktion läuft synchron oder nebenläufig, je nach übergebenem `Io`. Der Preis: Fast jeder Code vor 0.16 musste angepasst werden.

## Wo man Zig begegnet

| Projekt | was |
|---|---|
| **Bun** | JavaScript-Laufzeit, Bundler und Paketmanager, in Zig geschrieben |
| **TigerBeetle** | Finanzdatenbank, ohne dynamische Speicherzuteilung nach dem Start |
| **Ghostty** | Terminal-Emulator von Mitchell Hashimoto |
| **[Electrobun](../libs/electrobun.md)** | Desktop-Framework; Zig für den nativen Teil und das Update-Diffing |
| **Roc**, **Uber** | Compiler bzw. Cross-Compiling mit `zig cc` |

## Stärken und Schwächen

- **Stark:** einfache, kleine Sprache, sehr gute C-Anbindung, Cross-Compiling von Haus aus, explizite Speicherverwaltung mit austauschbaren Allocators, `comptime` statt Makros, schnelle Debug-Builds mit eigenem Backend und inkrementeller Übersetzung.
- **Schwach:** vor 1.0 mit Brüchen in jeder Version, keine Speichersicherheit wie in Rust (Use-after-free bleibt möglich, nur besser auffindbar), kleine Bibliothekslandschaft, Dokumentation hinkt hinterher, keine Closures (Kontext wird ausdrücklich übergeben).

## Für rat und aufbau

- **`comptime` und rats Compiler.** rat verlagert ebenfalls Arbeit in die Übersetzung (Sugar, `$name!`, Typschemas). Zig zeigt, dass „Code zur Compile-Zeit“ am lesbarsten ist, wenn es **dieselbe Sprache** ist und kein zweites Makrosystem. rats Compile-Time-Werte (`comptime` in der rat-Doku) gehen in diese Richtung.
- **Allocator und `Io` als Parameter** sind Dependency Injection auf Sprachebene: Wer Seiteneffekte hat, bekommt das Werkzeug dafür übergeben. rats Treiber (store, files, database pro Shell) lösen dasselbe für Plattformen: Der Code sagt, *was* er braucht, die Umgebung entscheidet, *wie*.
- **Bun ist Zig.** Wer rat-Apps mit Bun baut oder testet, nutzt Zig indirekt; Electrobun bringt Zig in den Desktop-Pfad.
- **Fehler als Werte** (`!T`, `try`) passen zum Modell von [Lua](lua.md) (`nil, err`) und Rust (`Result`). Für rat-Aktionen, die erwartbar scheitern (Dateizugriff, Netz), ist ein Wert ehrlicher als eine Ausnahme, die bis zum Fehler-Toast fliegt.
