# Rust

Eine Systemsprache, die **Speichersicherheit ohne Garbage Collector** garantiert: Der Compiler prüft beim Übersetzen, wem ein Wert gehört und wie lange eine Referenz gültig ist. Begonnen 2006 von Graydon Hoare als Freizeitprojekt, ab 2009 von Mozilla getragen, 1.0 im Mai 2015. Seit 2021 liegt sie bei der unabhängigen Rust Foundation.

- Website: https://www.rust-lang.org
- Releases: alle sechs Wochen eine neue 1.x-Version (stabil, rückwärtskompatibel); Editionen 2015, 2018, 2021, 2024 bündeln seltene, abschaltbare Änderungen
- Typisierung: statisch, stark, mit Inferenz, Generics und Traits
- Paradigmen: imperativ, funktional, ausdrucksorientiert; keine Klassen, keine Vererbung
- Paketmanager und Build: Cargo, Pakete („Crates“) auf crates.io
- Läuft als: native Binärdatei über LLVM, WebAssembly (`wasm32-unknown-unknown`, `wasm32-wasip2`)

## Woher sie kommt

C und C++ sind schnell, aber Speicherfehler (Use-after-free, Buffer Overflows, Data Races) machen bei Browsern und Betriebssystemen seit Jahrzehnten rund zwei Drittel der Sicherheitslücken aus. Sprachen mit Garbage Collector lösen das, kosten aber Pausen und Kontrolle. Mozilla wollte für Firefox eine dritte Möglichkeit: so schnell und kontrolliert wie C++, aber mit Fehlern, die der Compiler findet statt der Angreifer. Servo, die experimentelle Browser-Engine in Rust, war das Testfeld; Teile davon (Stylo, die CSS-Engine) laufen seit 2017 in Firefox.

## Syntax auf einen Blick

```rust
// comment
fn main () {
    let name = "rat";                 // unveränderlich
    let mut count = 3;                // mut: veränderlich
    count += 1;

    let label = if count > 2 { "viele" } else { "wenige" };   // if ist ein ausdruck

    for i in 0..5 { println!("{i}"); }                       // 0 bis 4
    for i in (0..=10).rev().step_by(2) { println!("{i}"); }  // 10 8 6 4 2 0

    let total: i32 = (1..=10).filter(|n| n % 2 == 0).sum();
    println!("{name} {label} {total}");
}

fn greet (who: &str) -> String {
    format!("hallo {who}")           // letzter ausdruck ohne ; ist der rückgabewert
}
```

| Rust | JavaScript | Anmerkung |
|---|---|---|
| `let x = 1;` | `const x = 1` | Standard ist unveränderlich |
| `let mut x = 1;` | `let x = 1` | |
| `0..5`, `0..=5` | – | Bereiche (rat: `1..5`) |
| `\|x\| x + 1` | `x => x + 1` | Closure |
| `println!`, `vec!`, `format!` | – | `!` markiert ein Makro |
| `Option<T>` | `null`/`undefined` | es gibt kein `null` |
| `Result<T, E>` | `throw` | es gibt keine Ausnahmen |
| `match` | `switch` | erschöpfend, mit Mustern |
| `impl`, `trait` | `class`, `interface` | Methoden und Verhalten getrennt von Daten |

## Kernkonzepte

### 1. Ownership: jeder Wert hat genau einen Besitzer

```rust
let a = String::from("hallo");
let b = a;                  // der besitz wandert zu b
// println!("{a}");         // fehler: a ist nicht mehr gültig

let c = b.clone();          // eine echte kopie, ausdrücklich
```

Verlässt der Besitzer seinen Gültigkeitsbereich, wird der Wert freigegeben (`drop`). Kein `free`, kein Garbage Collector: Der Compiler fügt die Freigabe an der richtigen Stelle ein. Einfache Werte (`i32`, `bool`, `char`) sind `Copy` und werden einfach kopiert.

### 2. Borrowing: leihen statt besitzen

```rust
fn length (text: &String) -> usize { text.len() }    // liest nur
fn shout (text: &mut String) { text.push('!'); }      // verändert

let mut s = String::from("hi");
let n = length(&s);
shout(&mut s);
```

Die Regel des **Borrow Checkers**: beliebig viele gleichzeitige Lesereferenzen (`&T`) **oder** genau eine Schreibreferenz (`&mut T`), nie beides. Das verhindert Data Races und das Ändern einer Liste, während jemand über sie iteriert, schon beim Übersetzen.

### 3. Lifetimes

```rust
fn longest<'a> (x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

`'a` sagt: Das Ergebnis lebt höchstens so lange wie die kürzere der beiden Eingaben. Meist leitet der Compiler Lifetimes selbst ab; ausgeschrieben werden sie nur, wo es mehrdeutig ist.

### 4. Enums mit Daten, und `match`

```rust
enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
}

fn area (shape: &Shape) -> f64 {
    match shape {
        Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
        Shape::Rect { width, height } => width * height,
    }
}
```

Rust-Enums sind **Summentypen** (tagged unions): Jede Variante trägt ihre eigenen Daten. `match` muss jede Variante abdecken, sonst übersetzt das Programm nicht. Kommt eine Variante hinzu, zeigt der Compiler jede Stelle, die sie noch nicht kennt.

### 5. `Option` und `Result` statt `null` und Ausnahmen

```rust
fn parse_port (text: &str) -> Result<u16, std::num::ParseIntError> {
    let port: u16 = text.trim().parse()?;   // ? gibt den fehler sofort zurück
    Ok(port)
}

let user: Option<&str> = None;
let name = user.unwrap_or("gast");
if let Some(found) = user { println!("{found}"); }
```

`Option<T>` ist `Some(T)` oder `None`, `Result<T, E>` ist `Ok(T)` oder `Err(E)`. Der Operator `?` reicht einen Fehler nach oben weiter: das, was in JavaScript `await` für Promises ist, für Fehler. Wer `unwrap()` schreibt, sagt ausdrücklich „hier stürze ich lieber ab“.

### 6. Traits

```rust
trait Describe { fn describe (&self) -> String; }

struct Track { title: String }

impl Describe for Track {
    fn describe (&self) -> String { format!("♪ {}", self.title) }
}

fn print_all (items: &[impl Describe]) {
    for item in items { println!("{}", item.describe()); }
}
```

Traits sind Fähigkeiten, die man jedem Typ nachträglich geben kann, auch fremden. Generics werden zur Übersetzungszeit für jeden Typ eigens erzeugt (**Monomorphisierung**): schnell, aber größere Binaries und längere Compile-Zeiten.

### 7. Iteratoren ohne Kosten

```rust
let titles: Vec<String> = tracks.iter()
    .filter(|t| t.year >= 2020)
    .map(|t| t.title.to_uppercase())
    .collect();
```

Die Kette wird zu einer einzigen Schleife zusammengefaltet, ohne Zwischenarrays. „Zero-cost abstractions“: Was man nicht benutzt, kostet nichts, und was man benutzt, könnte man von Hand nicht besser schreiben.

### 8. Nebenläufigkeit und `async`

```rust
async fn fetch_title (url: &str) -> Result<String, reqwest::Error> {
    let body = reqwest::get(url).await?.text().await?;
    Ok(body)
}
```

`async`/`await` wie in JavaScript, aber ohne eingebaute Laufzeit: Die Event-Loop kommt aus einer Bibliothek (meist Tokio). Threads teilen Daten nur über Typen, die das erlauben (`Send`, `Sync`, `Arc<Mutex<T>>`); falsches Teilen ist ein Übersetzungsfehler.

### 9. `unsafe`

Ein `unsafe`-Block erlaubt Rohzeiger, Aufrufe in C und anderes, das der Compiler nicht prüfen kann. Die Idee: Unsichere Stellen sind klein, markiert und hinter einer sicheren API versteckt (`Vec`, `String` selbst sind so gebaut).

## Rust und das Web

| Wo | was |
|---|---|
| **WebAssembly** | `wasm-bindgen` und `wasm-pack` erzeugen ein `.wasm` mit JS-Glue; Bildverarbeitung, Codecs, Parser im Browser |
| **Frontend-Frameworks** | Leptos, Dioxus, Yew: Komponenten in Rust, compiliert zu Wasm; Leptos mit Signals |
| **Werkzeuge in Rust** | SWC, Rolldown und Oxc (Vite 7/8), Rspack, Turbopack, Lightning CSS, Biome, Parcel-Kern |
| **Server** | Axum, Actix Web; Deno ist in Rust geschrieben |
| **Desktop** | [Tauri](../libs/tauri.md): Rust im Hauptprozess, die Oberfläche in der System-WebView |
| **Edge** | Cloudflare Workers und Fastly Compute nehmen Rust als Wasm |

Der größte Einfluss aufs Web ist indirekt: Ein großer Teil der JavaScript-Werkzeugkette ist seit 2022 nach Rust umgezogen, weil Parser und Bundler dort zehn- bis hundertmal schneller laufen als in JavaScript.

## Wo man Rust begegnet

Firefox (Stylo, WebRender), der Linux-Kernel (Treiber, seit 6.1), Windows-Kern-Komponenten, Android (Bluetooth, Keystore), Cloudflare (Proxy Pingora), Discord, Dropbox, AWS (Firecracker, die VMs unter Lambda), Kommandozeilenwerkzeuge (ripgrep, fd, bat, uv, ruff).

## Stärken und Schwächen

- **Stark:** Speicher- und Threadsicherheit ohne Laufzeitkosten, sehr schnelle Programme, ein ausgezeichneter Paketmanager (Cargo), hilfreiche Fehlermeldungen, ausdrucksstarkes Typsystem (Enums, `match`, Traits), gute Wasm-Unterstützung.
- **Schwach:** steile Lernkurve (Borrow Checker, Lifetimes), lange Compile-Zeiten, große Abhängigkeitsbäume, `async` mit mehreren Laufzeiten und „farbigen“ Funktionen, schnelle Prototypen sind mühsam. Für Oberflächen mit vielen sich gegenseitig referenzierenden Objekten (DOM, Graphen) passt das Besitzmodell schlecht.

## Für rat und aufbau

- **Werkzeuge statt Laufzeit.** rat baut auf Vite, das über Rolldown und Oxc selbst Rust ist. Ein schneller rat-Compiler wäre ein Rust-Projekt, die Laufzeit im Browser bleibt JavaScript: Dort gewinnt Wasm gegen den JIT selten, und jeder Aufruf über die Grenze kostet.
- **`Option`/`Result` und `match`.** rats Pattern Matching (`match`, `@match`, `case`) und die Diskussion um `null` ([../null.md](../null.md)) zielen auf dasselbe wie Rusts Summentypen: einen Fall, der vergessen wurde, früh zu finden. Ohne Compiler mit Erschöpfungsprüfung bleibt es in JavaScript bei Konvention plus Schema.
- **Ownership und Signals.** Ein Signal mit einem Besitzer (rats `scope`, Aufräumen mit der Komponente) ist dieselbe Idee in klein: Wer etwas anlegt, räumt es auf, wenn er geht.
- **Wasm für Rechenarbeit.** Für zugriff-Apps (Bild- und Audioverarbeitung, Vektorisierung) ist Rust über Wasm in einem Worker die naheliegende Wahl, wenn JavaScript zu langsam wird (siehe [../workers.md](../workers.md)).
- **Tauri** ist neben Capacitor und Electrobun ein Kandidat für rats Desktop-Ziel; dort wäre Rust die Sprache der nativen Seite.
