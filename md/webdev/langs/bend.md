# Bend

Eine funktionale Sprache der Higher Order Company (HOC, gegründet von Victor Taelin), die Programme **ohne Threads, Locks oder Kernel-Code** auf viele CPU-Kerne und auf die GPU verteilt. Der Name steht für zwei sehr verschiedene Sprachen: **Bend 1** (Mai 2024) war eine Oberfläche mit Python-artiger Syntax für **HVM2**, eine Laufzeit, die Programme als Graphen aus Interaction Combinators parallel umschreibt. **Bend 2** (September 2026) ist eine Neuentwicklung: rein, affin, mit abhängigen Typen und eingebautem Beweisprüfer, compiliert zu einem einzigen C-Programm für CPU und GPU, und positioniert als Sprache, in der man einer KI Regeln vorgibt, deren Einhaltung der Compiler beweisen lässt. Bend-1-Programme und HVM laufen in Bend 2 nicht mehr.

- Website: https://bend-lang.com
- Repository: https://github.com/bendlang/bend (früher `HigherOrderCO/Bend`)
- Aktuelle Linie: Bend 2.0.38 (20. Oktober 2026), Releases fast wöchentlich; Bend 1 zuletzt 0.2.38 (Februar 2025)
- Typisierung: Bend 2 statisch, abhängige Typen, affin, kaum Inferenz; Bend 1 optional typisiert (Typprüfung seit 0.2.37, Oktober 2024)
- Paradigmen: rein funktional, rekursiv statt Schleifen, Effekte über `IO`
- Ziele: Bend 2 nativ über C (CPU), CUDA und Metal (GPU), JavaScript (ein Kern); Bend 1 über HVM2 (Rust-, C- und CUDA-Interpreter)

## Woher sie kommt

Victor Taelin arbeitete seit Jahren an Laufzeiten für **Interaction Nets**, ein Rechenmodell von Yves Lafont (1990, als Interaction Combinators 1997): Ein Programm ist ein Graph, Rechnen heißt, Paare verbundener Knoten nach festen lokalen Regeln umzuschreiben. Weil jede Regel nur zwei Knoten betrifft, können alle anstehenden Umschreibungen gleichzeitig laufen, ohne Absprache. Daraus wurde HVM1 (2022, Rust, Prototyp) und HVM2 (2024, mit Compiler nach C und CUDA). HVM2 selbst war nicht für Menschen gedacht; Bend war die Sprache darüber.

Bend 1 bewies das Prinzip („wenn Code parallel laufen **kann**, läuft er parallel“), war aber auf einem Kern weit langsamer als C, kannte nur 24-Bit-Zahlen und brauchte für jeden Speedup sehr viele Kerne. Bend 2 trennt sich vom Graph-Modell: Affinität (jeder Wert hat genau einen Besitzer) und Reinheit erlauben, direkt C zu erzeugen, und das Typsystem wurde zu einem Beweisprüfer ausgebaut.

| Jahr | Version | Meilenstein |
|---|---|---|
| 2022 | HVM1 | Prototyp einer parallelen, „optimalen“ Laufzeit in Rust |
| 2024 (Mai) | Bend 1 (0.2), HVM2 | öffentlicher Start: Python-artige Syntax, `bend`/`fold`, `run-c`, `run-cu` |
| 2024 (Aug.) | HVM2 2.0.22 | letzte HVM2-Version |
| 2025 (Feb.) | Bend 0.2.38 | letzte Version von Bend 1 |
| 2026 (Sept.) | Bend 2.0 | neue Sprache: abhängige Typen, `LAWS.bend`/`PROOF.bend`, Ausgabe als C, CUDA, Metal, JS |
| 2026 (Okt.) | Bend 2.0.38 | aktuelle Version |

## Syntax auf einen Blick

Bend 2, wie es heute aussieht:

```python
import Base

type Shape is Data:                  # is Data: values may be copied
  Circle{r: U32}
  Square{s: U32}

def area(x: Shape) -> U32:
  match x:
    case Circle{+r}:                 # +r: r may be used more than once
      (3 * r * r : U32)              # operators need the type: (… : U32)
    case Square{+s}:
      (s * s : U32)

def main() -> IO(Unit):
  do IO<Unit>:
    IO.print(U32.show(area(Square{5})))
```

Die Syntax ist Python-förmig (Einrückung, `def`, `match`/`case`), die Semantik eher Haskell oder Lean: rein, Rekursion statt Schleifen, Effekte als `IO`-Werte. Auffällig: Es gibt kein `if`, verzweigt wird mit `match` auf `True{}`/`False{}`. Rechenoperatoren brauchen eine Typangabe (`(a + b : U32)`), `==` ist nur auf Typebene eine Gleichung, Werte vergleicht man mit `T.is_eq(a, b)`. Zahlen gibt es als `Nat` (`3n`), `U32` und `F32`, sonst nichts.

Bend 1 sah imperativer aus, mit `if`, `return` und Zuweisungen, die nur lokal umbinden:

```python
def Sum(start, target):
  if start == target:
    return start
  else:
    half = (start + target) / 2
    return Sum(start, half) + Sum(half + 1, target)   # two independent calls: parallel
```

## Kernkonzepte

### 1. Parallelität durch Teilen

```python
def pow2(+n: Nat) -> U32:
  match n:
    case 0n:
      1
    case 1n+p:
      a b = pow2(p) pow2(p)          # parallel let: both calls run at once
      (a + b : U32)

def main() -> IO(Unit):
  IO.print(U32.show(pow2!(20n)))     # !: run this call tree on the GPU
```

`a b = f(x) g(y)` verspricht dem Compiler: Die Aufrufe sind unabhängig und etwa gleich teuer. Weil Bend rein und affin ist, gilt das Erste immer; das Zweite muss man selbst sicherstellen. Der Scheduler ist eine binäre Fork-Join-Maschine: Jede Aufgabe wird einmal einem Kern zugeteilt und nie verschoben. Das ist schnell und GPU-tauglich, verlangt aber **balancierte** Rekursion (Teile und herrsche). `f!(x)` schickt einen Aufruf samt allem, was er parallel aufruft, auf die GPU; ohne GPU läuft er parallel auf der CPU.

### 2. Bend 1: `bend` und `fold`

```python
type Tree:
  Node { ~left, ~right }             # ~: recursive field
  Leaf { value }

def sum(tree):
  fold tree:                         # consume a tree, children are already summed
    case Tree/Node:
      return tree.left + tree.right
    case Tree/Leaf:
      return tree.value

def main():
  bend d = 0, i = 0:                 # build a tree, fork() recurses
    when d < 28:
      sum = fork(d + 1, i * 2) + fork(d + 1, i * 2 + 1)
    else:
      sum = i
  return sum
```

`bend` erzeugt eine rekursive Struktur (Anamorphismus), `fold` baut sie ab (Katamorphismus). Beide ersetzen Schleifen und sind von Natur aus Bäume, also parallel. In Bend 2 ist an ihre Stelle gewöhnliche Rekursion mit dem Parallel-Let getreten.

### 3. Affine Werte und Quantitäten

```python
#  n: affine (used at most once)   +x: reusable   -A: erased at runtime
def replicate(-A: Data, n: Nat, +x: A) -> List<A>:
  match n:
    case 0n:
      Nil{}
    case 1n+p:
      x <> replicate(A, p, x)
```

Standardmäßig darf jede Variable höchstens einmal benutzt werden. `+` erlaubt Mehrfachnutzung, aber nur für Typen der Art `Data` (kopierbar); dafür zahlt die Laufzeit einen Referenzzähler. `-` markiert Argumente, die nur für Typen und Beweise existieren und im erzeugten Code verschwinden. Funktionen, Arrays und IO-Handles sind `Type`, also nie kopierbar; auch eine Closure kann nur einmal aufgerufen werden.

### 4. Arrays: Mutation ohne Unreinheit

```python
a = [0 : U32*8n]      # 8 slots of 0
a[5] <- 42            # in-place write, rebinds a
a[5]                  # read: returns the element next to the array
```

Weil ein Array genau einen Besitzer hat, darf ein Schreibzugriff den Speicher direkt überschreiben und dasselbe Array zurückgeben, ohne Kopie und ohne dass jemand die Änderung „sieht“. Ein Lesezugriff gibt das Array mit zurück, sonst wäre es verbraucht.

### 5. Terminierung ist Pflicht

Rekursive Aufrufe müssen mit kleineren Teilen ihrer Eingabe arbeiten (aus einem `match` gewonnen), sonst lehnt der Compiler ab. Wechselseitige Rekursion ist verboten, Endlosschleifen eines Servers zählen einen `Nat`-„Treibstoff“ herunter. Hintergrund: Eine Funktion, die nie zurückkehrt, könnte in einem Beweissystem jede Aussage „beweisen“. `@unsafe` schaltet die Prüfung ab und nimmt die Funktion aus den Garantien.

### 6. Laws und Proofs

```python
# LAWS.bend: written by a human
law add_zero:
  for x: Nat
  {Nat.add(x, 0n) == x : Nat}

# PROOF.bend: written by the AI, checked by the compiler
def add_zero(x):
  match x:
    case 0n:
      {==}                                              # both sides compute to the same
    case 1n+p:
      %add_zero(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}   # rewrite with the induction hypothesis
      {==}
```

Ein `law` ist eine Aussage als Typ, ein gleichnamiges `def` ist ihr Beweis. Die Konvention: Menschen schreiben `LAWS.bend` („die Summe aller Kontostände ist null“, „man kann das Spiel nicht gewinnen“), die KI schreibt Code und `PROOF.bend`, und `bend PROOF.bend` ist das Tor vor jedem Commit: `ALL PROOFS CHECK` oder `SOME PROOFS FAIL`. Taktiken oder automatische Beweissuche gibt es nicht; Beweise sind gewöhnliche Funktionen. `--verdict` prüft ein zweites Mal mit einem kleinen Kernel, dessen Korrektheit in Lean bewiesen ist.

### 7. Abhängige Typen

Typen sind Terme: Eine Funktion kann einen `Type` zurückgeben (`def IsEven(n: Nat) -> Type:`), ein Rückgabetyp kann von einem Argument abhängen (`@x:A -> B`), eine Gleichheit `{a == b : T}` ist ein Typ, dessen Werte Beweise sind. Inferenz gibt es fast keine; das macht Code ausführlich, den Prüfer aber schnell und seine Fehlermeldungen genau.

### 8. Effekte mit `do`

```python
def add_strs(a: String, b: String) -> Maybe<&2, U32>:
  do Maybe<&2, U32>:
    x : U32 <- U32.read(a)     # None ends the block with None
    y : U32 <- U32.read(b)
    return (x + y : U32)
```

`do` funktioniert für jeden Typ mit `bind` und `pure` (`IO`, `Maybe`, `Result`, eigene), wie in [Haskell](haskell.md). Eingebaute Effekte: Ausgabe, Umgebung, Zeit, Dateien, TCP, UDP, Kanäle, Fenster, Audio. Eigene Effekte bindet man über C- und JS-Dateien ein (`import "./e.js"`).

## Wie es läuft

| | Bend 1 (HVM2) | Bend 2 (BendRT) |
|---|---|---|
| Modell | Programm als Interaction-Combinator-Graph, parallele lokale Umschreibungen | affine Terme, Fork-Join-Scheduler über CPU- und GPU-Lanes |
| Ausgabe | HVM2-Netz, interpretiert (Rust, C) oder als C/CUDA erzeugt | eine C-Datei, zugleich CPU-Programm und GPU-Kernel (clang, CUDA, Metal) |
| Speicher | Graph-Knoten, kein GC | ein Heap für alle Kerne und die GPU, 64-Bit-Wörter, kein GC; nur `+`-Werte zählen Referenzen |
| Zahlen | 24 Bit (`u24`, `i24`, `f24`) | `Nat`, `U32`, `F32` |
| Web | – | `-o file.js` und `-o f.mjs` (ES-Modul der reinen Funktionen), `bend page.html -o dist` bündelt eine Seite mit `.bend`-Imports; immer ein Kern |

Für Bend 1 nannte das README eine Bitonic-Sortierung mit 12,15 s (`bend run`, ein Kern), 0,96 s (`run-c`, Apple M3 Max) und 0,21 s (`run-cu`, RTX 4090). Für Bend 2 zeigt das Repository Vergleiche mit C, TypeScript und Lean sowie mit Isabelle, Agda, Lean und Rocq beim Prüfen, nur als Grafiken. Beides sind Herstellerzahlen.

## Werkzeuge

- `bend datei.bend` prüft und führt `main` aus, `-o datei` erzeugt ein natives Binary, `-o datei.c`/`.js`/`.mjs` den Quelltext.
- `bend guide` druckt die Anleitung, `bend base` die Standardbibliothek. Beide sind ausdrücklich auch für KI-Agenten geschrieben; das README empfiehlt einen Absatz in `AGENTS.md`.
- Ein Formatierer mit LSP-Anbindung; Fehlermeldungen, Hover und Diagnosen nur über einen Community-Language-Server. Kein Debugger, kein Profiler, kein REPL, kein Test-Framework.
- Laut README ist der Compiler (nicht der Kernel) „zu 99 % von KI geschrieben und noch nicht vollständig geprüft“.

## Stärken und Schwächen

- **Stark:** Parallelität ohne Threads und Locks, ein Programm für CPU und GPU mit gemeinsamem Speicher; Beweise als Teil des Builds, schneller Prüfer, ein in Lean verifizierter Kernel als zweite Instanz; Mutation ohne Unreinheit über Affinität; ehrliche, lange Liste der Grenzen im README.
- **Schwach:** sehr jung und schnell veränderlich, schon einmal komplett gebrochen (Bend 1 → 2); ausführlich (alles annotiert), kein `if`, nur drei Zahlentypen, Strings als verkettete Listen; Parallelität nur bei balancierter Rekursion; kleine Bibliothek, kein HTTP, JSON, TLS; JavaScript-Ziel nur einkernig; Leistungsangaben stammen vom Hersteller; ein großteils KI-geschriebener, ungeprüfter Compiler; ein Unternehmen mit Investoren als einziger Träger.

## Für rat und aufbau

Ehrlich vorweg: Bend ist für rat und aufbau keine Vorlage. Es zielt auf rechenintensive Backends und GPUs, nicht auf DOM, Markup oder Reaktivität, und sein JS-Ziel ist ein Nebenprodukt. Ein paar Gedanken tragen trotzdem:

- **Mutation ist sicher, wenn niemand sonst den Wert hält.** Bends Arrays werden an Ort und Stelle geschrieben, weil der Typ garantiert, dass es genau einen Besitzer gibt. rats d-23 (`$todos.push(x)` meldet nichts) dreht sich um dieselbe Frage von der anderen Seite: Bei geteilten Werten muss jede Änderung sichtbar werden. rat entscheidet sich für reaktive Varianten (`$List`); Bend zeigt, warum Kopieren bei unveränderlichen Daten nur nötig ist, solange Besitz nicht bekannt ist. Für rat ohne Typsystem bleibt das Theorie.
- **Ein Kern, mehrere Notationen.** Bend 1 hatte zwei Syntaxen („Imp“, Python-artig, und „Fun“, Haskell-artig) über demselben Kern, Bend 2 sagt „Python-förmig, Haskell-Semantik“. rats drei Eingänge (concept.md, Abschnitt 2) sind derselbe Ansatz. Bend 1 → 2 zeigt aber auch: Wer den Kern austauscht, verliert alle Programme. rats Zusage, dass `.js` ein vollwertiger Weg bleibt, ist die Absicherung dagegen.
- **Laws als Vertrag.** `LAWS.bend` ist die strengste Form dessen, was rats Schemas an Grenzen tun (concept.md, Abschnitt 5: „the schema as a contract“): Bend beweist eine Eigenschaft für alle Eingaben, rat prüft sie zur Laufzeit für jede tatsächliche Eingabe. Ein realistischer Zwischenschritt für `@rat/types` wäre, aus Schemas Testdaten zu erzeugen (Property-Based Testing) statt etwas zu beweisen (Skizze).
- **Teile und herrsche statt Threads.** Für den Browser heißt Parallelität Worker (siehe [../workers.md](../workers.md)) und Nachrichten. Bends Parallel-Let (`a b = f(x) g(y)`) ist die Form, die man sich dort wünscht; in JavaScript entspräche ihr `await Promise.all([inWorker(f, x), inWorker(g, y)])`, mit Kopierkosten für die Daten. Ein Kandidat für denselben Helfer, den der [Dart](dart.md)-Steckbrief mit `Isolate.run` vorschlägt, nicht für Syntax.
- **`fold` ist reduce.** Der offene Punkt in d-10 (`|*>` braucht einen Startwert) hat in Bend 1 keine Lösung, sondern eine andere Form: `fold` über eine Datenstruktur braucht keinen Startwert, weil jeder Fall (Blatt, Knoten) seinen eigenen Wert hat. Für Listen bleibt der Startwert nötig.
- **Zeichenkollision:** `!` heißt in Bend „auf der GPU“ (`f!(x)`), in rat `preventDefault` (d-24), in LiveScript „ohne Rückgabe“. Kein Konflikt, aber ein weiteres Beispiel dafür, dass ein Zeichen nur innerhalb einer Sprache eine Bedeutung trägt.

Für aufbau: nichts Direktes.

Quellen: [Website](https://bend-lang.com), [Repository (Bend 2)](https://github.com/bendlang/bend), [README](https://raw.githubusercontent.com/bendlang/bend/main/README.md), [GUIDE.md](https://github.com/bendlang/bend/blob/main/guide/GUIDE.md), [Releases](https://github.com/bendlang/bend/releases), [Bend 1 auf crates.io](https://crates.io/crates/bend-lang) (README, GUIDE und CHANGELOG aus `bend-lang` 0.2.38), [HVM2](https://github.com/HigherOrderCO/HVM2), [hvm auf crates.io](https://crates.io/crates/hvm), [HVM1](https://github.com/HigherOrderCO/HVM1), [Ankündigung Bend 2 (Victor Taelin)](https://x.com/VictorTaelin/status/2100681226143092875). Stand: 21. Oktober 2026.
