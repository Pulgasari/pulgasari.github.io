# Lua

Eine kleine, schnelle Skriptsprache zum **Einbetten**, 1993 an der PUC-Rio (Päpstliche Katholische Universität Rio de Janeiro) entstanden, von Roberto Ierusalimschy, Luiz Henrique de Figueiredo und Waldemar Celes. Der ganze Interpreter ist ANSI-C, passt in wenige hundert Kilobyte und läuft praktisch überall. Lua ist selten die Sprache eines Programms, sondern die Sprache **in** einem Programm: in Spielen, Editoren, Datenbanken, Webservern.

- Website: https://www.lua.org
- Aktuelle Linie: 5.4 (seit 2020); 5.5 war 2025 in Arbeit
- Typisierung: dynamisch, stark
- Paradigmen: imperativ, funktional, prototypbasiert über Metatables
- Paketmanager: LuaRocks
- Name: portugiesisch für „Mond“

## Woher sie kommt

Tecgraf, eine Forschungsgruppe der PUC-Rio, baute Werkzeuge für Petrobras, den brasilianischen Ölkonzern. Zwei Vorgänger, DEL (eine Sprache für Dateneingabe) und SOL („Sonne“, für Konfiguration), wurden zu klein. Importierte Software war wegen Handelsschranken teuer, also entstand eine eigene, kleine, portable Sprache. Daher bis heute der Leitsatz: **Mechanismen statt Richtlinien**. Lua liefert wenige Bausteine (Tabellen, Funktionen, Metatables, Coroutinen), aus denen man Klassen, Module, Vererbung oder Ausnahmen selbst baut.

## Syntax auf einen Blick

```lua
-- comment
--[[ block
     comment ]]

local name  = "rat"           -- local: sonst global!
local count = 3
local done  = false

if count > 2 and not done then
  print("viele")
elseif count == 0 then
  print("keine")
else
  print("wenige")
end

for i = 1, 5 do print(i) end              -- 1 bis 5, inklusive
for i = 10, 1, -2 do print(i) end         -- 10 8 6 4 2
while count > 0 do count = count - 1 end
repeat count = count + 1 until count >= 3

local function greet (who) return "hallo " .. who end   -- .. verkettet strings
print(greet(name), #name)                                -- # ist die länge
print(1 ~= 2)                                            -- ~= ist ungleich
```

Auffällig für JavaScript-Augen:

| Lua | JavaScript | Anmerkung |
|---|---|---|
| `local x = 1` | `let x = 1` | ohne `local` ist eine Variable **global** |
| `~=` | `!==` | |
| `..` | `+` bei Strings | `"a" .. 1` ergibt `"a1"` |
| `#t` | `t.length` | |
| `and`, `or`, `not` | `&&`, `\|\|`, `!` | `x = x or 10` ist der Default-Idiom |
| `nil` | `null` und `undefined` | es gibt nur eins |
| nur `nil` und `false` sind falsy | `0`, `""`, `NaN` sind falsy | in Lua sind `0` und `""` **wahr** |
| `do … end`, `then … end` | `{ … }` | Blöcke enden mit `end` |
| Index ab **1** | ab 0 | `t[1]` ist das erste Element |

## Kernkonzepte

### 1. Tabellen: die einzige Datenstruktur

Arrays, Dictionaries, Objekte, Module, Klassen, Namensräume: alles ist eine Tabelle.

```lua
local list = { "a", "b", "c" }              -- array-teil: list[1] == "a"
local user = { name = "ada", age = 36 }      -- hash-teil: user.name, user["name"]
local mixed = { 10, 20, x = 1, [true] = "ja", [{}] = "jede taste geht" }

user.email = "ada@example.org"               -- feld hinzufügen
user.age   = nil                             -- feld löschen

for index, value in ipairs(list) do print(index, value) end   -- array-teil, in ordnung
for key, value in pairs(user)    do print(key, value) end     -- alles, ohne ordnung
```

Intern hat jede Tabelle zwei Teile: einen Array-Teil für die Schlüssel 1 bis n und einen Hash-Teil für den Rest. Der Interpreter entscheidet selbst, was wohin kommt.

Die bekannteste Falle: `#` ist bei Tabellen mit Löchern (`nil` mittendrin) nicht eindeutig. `#{1, nil, 3}` darf 1 oder 3 sein. Arrays sollte man deshalb lückenlos halten.

### 2. Funktionen sind Werte, mit mehreren Rückgaben

```lua
local function divide (a, b)
  if b == 0 then return nil, "division by zero" end
  return a // b, a % b                      -- // ist ganzzahlige division (seit 5.3)
end

local quotient, rest = divide(17, 5)        -- 3, 2
local value, err     = divide(1, 0)         -- nil, "division by zero"

local function sum (...)                     -- variadisch
  local total = 0
  for _, n in ipairs({ ... }) do total = total + n end
  return total
end
```

Mehrere Rückgabewerte sind echte Werte, kein Array. Das Paar `nil, fehlermeldung` ist die übliche Art, Fehler zu melden, ohne Ausnahmen zu werfen. Closures funktionieren wie in JavaScript.

### 3. Metatables: Verhalten an Tabellen hängen

Eine Metatable ist eine zweite Tabelle, die festlegt, wie sich die erste bei Operationen verhält. Die Einträge heißen **Metamethoden**.

```lua
local Vector = {}
Vector.__index = Vector                      -- fehlende felder in Vector suchen

function Vector.new (x, y) return setmetatable({ x = x, y = y }, Vector) end
function Vector.__add (a, b) return Vector.new(a.x + b.x, a.y + b.y) end
function Vector.__tostring (v) return "(" .. v.x .. ", " .. v.y .. ")" end
function Vector:length () return math.sqrt(self.x ^ 2 + self.y ^ 2) end

local v = Vector.new(3, 4) + Vector.new(0, 0)
print(tostring(v), v:length())               -- (3, 4)   5.0
```

| Metamethode | wird gerufen bei |
|---|---|
| `__index` | Lesen eines fehlenden Felds (Tabelle oder Funktion): Vererbung, Defaults, Proxys |
| `__newindex` | Schreiben eines fehlenden Felds: Validierung, Beobachten |
| `__call` | `t(...)`: Tabelle als Funktion |
| `__add`, `__sub`, `__mul`, `__eq`, `__lt`, `__le`, `__concat`, `__len`, `__unm` … | Operatoren |
| `__tostring` | `tostring(t)` |
| `__close` | Ende des Blocks bei `local x <close>` (seit 5.4) |
| `__gc` | Garbage Collection |
| `__mode` | `"k"`, `"v"`, `"kv"`: schwache Tabellen (wie `WeakMap`) |

`__index` ist der ganze Vererbungsmechanismus: Eine Instanz findet ihre Methoden, weil fehlende Felder in der Klassentabelle gesucht werden, und die Klasse kann wiederum eine Metatable mit `__index` auf ihre Oberklasse haben. Das ist die Prototypkette von JavaScript, nur ausdrücklich gebaut. `__index`/`__newindex` zusammen entsprechen einem `Proxy`.

### 4. Der Doppelpunkt: Methoden

```lua
function Vector:length () … end    -- ist zucker für: function Vector.length (self) … end
v:length()                         -- ist zucker für: v.length(v)
```

Es gibt kein `this`. Der Doppelpunkt übergibt das Objekt als ersten Parameter `self`. Verwechselt man `.` und `:`, fehlt `self` oder ist um eins verschoben: der häufigste Anfängerfehler.

### 5. Coroutinen

```lua
local producer = coroutine.wrap(function ()
  for i = 1, 3 do coroutine.yield(i) end
end)

print(producer(), producer(), producer())   -- 1 2 3
```

Coroutinen sind kooperative Threads: Eine Funktion kann mittendrin anhalten (`yield`) und später weiterlaufen. Anders als JavaScript-Generatoren dürfen sie aus beliebig tief verschachtelten Aufrufen heraus `yield`en, nicht nur im Körper der Generatorfunktion selbst. Damit baut man Iteratoren, Zustandsautomaten, Skripte für Spielfiguren („gehe hin, warte 2 Sekunden, sprich“) und nicht-blockierende I/O (OpenResty macht daraus synchron aussehenden Netzwerkcode).

### 6. Module sind Tabellen

```lua
-- greet.lua
local M = {}
function M.hello (name) return "hallo " .. name end
return M

-- main.lua
local greet = require("greet")
print(greet.hello("ada"))
```

`require` führt die Datei einmal aus, merkt sich ihren Rückgabewert und gibt ihn bei jedem weiteren `require` zurück. Mehr Modulsystem gibt es nicht.

### 7. Fehler mit `pcall`

```lua
local ok, err = pcall(function () error({ code = 42 }) end)
if not ok then print(err.code) end          -- 42
```

`error` wirft einen beliebigen Wert, `pcall` („protected call“) fängt ihn und gibt `false, wert` zurück. Es gibt kein `try`/`catch`.

### 8. Strings und Patterns

Lua-Patterns sind keine regulären Ausdrücke, sondern eine kleinere eigene Sprache (`%d` statt `\d`, `%a` für Buchstaben, kein `|`). Dafür passen sie in ein paar hundert Zeilen C.

```lua
local year, month = ("2026-10-14"):match("(%d+)-(%d+)")
local slug = ("Hallo Welt"):lower():gsub("%s+", "-")
```

### 9. Zahlen

Seit 5.3 haben Zahlen zwei Untertypen: `integer` (64 Bit) und `float`. `3 / 2` ist immer `1.5`, `3 // 2` ist `1`. Dazu Bitoperatoren (`&`, `|`, `~`, `<<`, `>>`). Vorher war jede Zahl ein Double, wie in JavaScript.

### 10. Attribute (5.4)

```lua
local limit <const> = 10                 -- unveränderlich
local file  <close> = io.open("x.txt")   -- wird am blockende geschlossen (__close)
```

## Die C-API: wofür Lua eigentlich gebaut ist

Das Programm (in C, C++, Rust …) erzeugt einen Lua-Zustand, legt eigene Funktionen hinein und ruft Skripte auf. Werte wandern über einen **Stack** zwischen beiden Seiten:

```c
lua_State *L = luaL_newstate();
luaL_openlibs(L);
lua_pushcfunction(L, my_draw);  lua_setglobal(L, "draw");   // c-funktion als globale "draw"
luaL_dofile(L, "plugin.lua");                                // skript ausführen
```

Mehrere Lua-Zustände sind völlig unabhängig, haben keine globalen Variablen im C-Sinn, und das Programm entscheidet, welche Bibliotheken ein Skript bekommt. Damit ist Lua die naheliegende Wahl für Plugins und Modding: klein, schnell, gut abschottbar.

## Varianten und Verwandte

| Name | was |
|---|---|
| **LuaJIT** | Mike Palls JIT-Compiler für Lua 5.1, oft um ein Vielfaches schneller als der Standard-Interpreter, mit FFI (C-Funktionen direkt aufrufen). Grundlage von Neovim und OpenResty. Bleibt bei 5.1-Sprachstand |
| **Luau** | Robloxs Ableger (offen seit 2021): schrittweise Typisierung, schnellerer Interpreter, Sandbox |
| **Teal** | Lua mit statischen Typen, kompiliert zu Lua (wie TypeScript zu JS) |
| **Fennel** | ein Lisp, das zu Lua kompiliert |
| **MoonScript**, **YueScript** | CoffeeScript-artige Syntax für Lua |
| **Fengari** | eine Lua-VM in JavaScript, für den Browser |
| **wasmoon** | das Original-Lua als WebAssembly, für Browser und Node |

## Wo man Lua begegnet

| Ort | wofür |
|---|---|
| Neovim | Konfiguration und Plugins (`init.lua`, LuaJIT) |
| Roblox | Spiele, in Luau |
| World of Warcraft, Garry's Mod, viele weitere Spiele | Addons, Mods, Spiellogik |
| LÖVE, Defold, Solar2D | Spiele-Engines mit Lua als Hauptsprache |
| Redis | atomare Skripte auf dem Server (`EVAL`) |
| OpenResty (nginx), HAProxy, Kong | Logik im Webserver bzw. Proxy |
| Wireshark | Protokoll-Dissektoren |
| Pandoc | Filter für Dokumentkonvertierung |
| Adobe Lightroom, WezTerm, AwesomeWM, mpv | Plugins und Konfiguration |

## Stärken und Schwächen

- **Stark:** winzig, portabel, schnell (mit LuaJIT sehr schnell), einfach einzubetten und abzuschotten, eine kleine Sprache, die man an einem Nachmittag kennt. Tabellen und Metatables tragen erstaunlich weit.
- **Schwach:** Globale Variablen als Default, Index ab 1, `#` mit Löchern, kein eingebautes Klassen- oder Typsystem (jedes Projekt baut sein eigenes), kleine Standardbibliothek, Spaltung zwischen 5.1/LuaJIT und 5.4. Für große Anwendungen fehlt Struktur, die man selbst mitbringen muss.

## Für rat und aufbau

- **Metatables und `Proxy`.** rats Signale lösen per Compiler, was Lua per `__index`/`__newindex` löst: Lesen und Schreiben abfangen. `@rat/types` mit reaktiven Datentypen (`$List`, `$Dict`) steht vor derselben Wahl wie Lua-Bibliotheken: explizite Methoden oder ein Proxy.
- **`..`** ist in Lua die Verkettung, in rat ein Range (`1..5`), in Dart die Kaskade. Ein Zeichen, drei Bedeutungen; für rat-Leser aus der Lua-Welt eine kleine Stolperfalle.
- **Mehrere Rückgabewerte und `nil, err`** sind ein schlankes Fehlermodell für Funktionen, die erwartbar scheitern, ohne Ausnahmen. In JS am nächsten: `[value, error]`-Tupel.
- **Coroutinen** zeigen, wie viel einfacher asynchrone Abläufe werden, wenn man aus beliebiger Tiefe anhalten kann. Für rat-Behaviors oder Animationsskripte („erst einblenden, dann warten, dann …“) wäre ein Generator-basiertes API die JS-Entsprechung.
- **Einbetten statt Ausliefern.** Luas Rolle als Plugin-Sprache ist das Vorbild für jede App, die Nutzern Skripte erlauben will. Im Browser wäre das heute ein Worker (siehe [../workers.md](../workers.md)) oder wasmoon in einer Sandbox.
