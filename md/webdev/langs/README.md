# Programmiersprachen

Steckbriefe zu Programmiersprachen: woher sie kommen, ihre Syntax, Kernkonzepte mit Code, wo man ihnen begegnet, Stärken und Schwächen, und was davon für rat, aufbau und zugriff interessant ist. Sprachen, die fürs Web gebaut sind und eher als Framework wirken (Elm), stehen bei den [Bibliotheken](../libs/README.md).

| | Was | Seit | Typisierung | Läuft als |
|---|---|---|---|---|
| [Bend](bend.md) | massiv parallele Sprache; Bend 2 mit Beweisen für KI-Code | 2024 (Bend 2: 2026) | Bend 2: statisch, abhängige Typen, affin; Bend 1: optional | Bend 2: C (CPU), CUDA, Metal, JavaScript; Bend 1: HVM2 |
| [Civet](civet.md) | TypeScript mit Kurzschreibweisen, Pattern Matching, Pipes | 2022 | die von TypeScript (compiliert zu `.ts`) | TypeScript bzw. JavaScript |
| [Dart](dart.md) | klassenbasierte App-Sprache, Grundlage von Flutter | 2011 | statisch, sound, null-sicher | native AOT, JIT-VM, JavaScript, WebAssembly |
| [Haskell](haskell.md) | rein funktionale, lazy Sprache | 1990 | statisch, Typinferenz, Typklassen | nativ (GHC), GHCi; JavaScript und WebAssembly über GHC-Backends |
| [Lua](lua.md) | kleine Skriptsprache zum Einbetten | 1993 | dynamisch | Interpreter in C (eingebettet), LuaJIT; im Browser über WebAssembly |
| [Odin](odin.md) | Systemsprache für Spiele und Grafik, datenorientiert | 2016 | statisch, Inferenz, parametrisch polymorph | nativ (LLVM), WebAssembly |
| [Rust](rust.md) | Systemsprache, speichersicher ohne Garbage Collector | 2015 (seit 2006) | statisch, Inferenz, Traits, Ownership | nativ (LLVM), WebAssembly |
| [Zig](zig.md) | „besseres C“ mit `comptime`, ohne versteckte Allokation | 2016 | statisch, Inferenz, Generics über `comptime` | nativ (eigenes Backend, LLVM), WebAssembly; dazu `zig cc` |
