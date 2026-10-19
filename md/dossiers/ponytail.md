# Ponytail

Ein Regelwerk für Coding-Agents (Claude Code, Codex, Cursor, Copilot, Gemini und rund 15 weitere), das sie dazu bringt, **die kleinste vollständige Änderung** zu schreiben. Das Bild dahinter: der stille Senior-Entwickler mit Pferdeschwanz, der fünfzig Zeilen anschaut und durch eine ersetzt.

- Repository: https://github.com/DietrichGebert/ponytail (MIT, Autor: Dietrich Gebert)
- Website: https://ponytail.dev
- npm: `@dietrichgebert/ponytail`
- Stand: Version 5.2.0 (Oktober 2026)
- Achtung: Nur aus `DietrichGebert/ponytail` bzw. `@dietrichgebert/ponytail` installieren. Laut Autor liefert das Original nie `.exe`- oder `.dll`-Dateien; Kopien, die das tun, sind nicht seine.

---

## Was es ist

Im Kern **ein einziger Prompt**: [`skills/ponytail/SKILL.md`](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md), in kompakter Form als [`AGENTS.md`](https://github.com/DietrichGebert/ponytail/blob/main/AGENTS.md). Alles andere im Repository sind Adapter, die diesen Prompt in die verschiedenen Agents bringen (Plugin-Manifeste, Hooks, Regeldateien).

Kein Code-Generator, kein Linter, keine Laufzeit. Ponytail ändert nur, *wie* der Agent arbeitet.

## Die Regeln

### Erst lesen, dann wählen

Vor jeder Änderung liest der Agent die Aufgabe und den betroffenen Code und listet, wohin die Änderung reichen muss: Aufrufer, Tests, Fixtures, Konfiguration, Exporte. Dazu, was sie für Nutzer kaputt machen könnte. Das ist der Umfang; Zusatzfunktionen gehören nicht dazu.

### Die Leiter

Danach nimmt er die **erste Stufe, die das Problem vollständig löst**:

1. **Muss es überhaupt existieren?** Nicht verlangte Features, Optionen und Flexibilität weglassen und in einer Zeile nennen.
2. **Gibt es das schon in der Codebasis?** Helper, Komponente, Muster: so benutzen wie der umliegende Code.
3. **Standardbibliothek oder Plattform?** Benutzen, außer das Projekt hat eine eigene Lösung.
4. **Eine installierte Abhängigkeit?** Benutzen. Nie eine neue Abhängigkeit für ein paar Zeilen.
5. **Eine Zeile, die man sofort versteht?** Eine Zeile.
6. **Sonst:** das Minimum, das funktioniert.

Das Beispiel aus der README: „Füge einen Date Picker hinzu“. Ohne Ponytail 335 Zeilen (Bibliothek oder handgebauter Kalender), mit Ponytail 10 Zeilen: die vorhandene `Input`-Komponente mit `type="date"`, den Kalender liefert der Browser.

### Weitere Regeln

- Faul bei der Lösung, nie bei der Änderung: Alles, was die Aufgabe berührt (Aufrufer, Tests, Fixtures), wird fertig.
- Keine Abstraktion, kein Wrapper, keine Option, keine Konfiguration „für später“. Löschen schlägt Hinzufügen. Die Struktur des Projekts bleibt.
- Kommentare nur für das *Warum*, das der Code nicht zeigt, in einer Zeile.
- Bugfix: erst alle Aufrufer der Funktion suchen, dann die Ursache einmal an der gemeinsamen Stelle beheben.
- Bei gleich großen Lösungen gewinnt die, die bei Randfällen stimmt.
- **Nicht-triviale Logik** (Verzweigung, Schleife, Parser, Geld, Sicherheit, ein neues Skript) hinterlässt **einen kleinen Test** oder einen Selbstcheck mit Asserts.
- Eine Abkürzung mit bekannter Grenze bekommt einen Kommentar: `shortcut: <die Grenze>, <wann aufrüsten>`.
- **Nie gestrichen:** Validierung an Vertrauensgrenzen, Fehlerbehandlung gegen Datenverlust, Sicherheit, Barrierefreiheit, alles, worum ausdrücklich gebeten wurde.
- Jede Antwort endet mit ein, zwei Zeilen: was ausgelassen oder nicht geprüft wurde, und welches Risiko der Nutzer kennen muss.

### Stufen

| Stufe | Verhalten |
|---|---|
| `lite` | baut, was verlangt ist, und nennt die kleinere Variante in einer Zeile |
| `full` | die Regeln oben (Standard) |
| `ultra` | hinterfragt zusätzlich die Anfrage selbst und widerspricht vor dem Bauen |

## Befehle

| Befehl | Was er tut |
|---|---|
| `/ponytail [lite\|full\|ultra\|off]` | Stufe setzen oder abschalten; ohne Argument einschalten bzw. Stufe anzeigen |
| `/ponytail-review` | Review der aktuellen Änderung: liest den berührten Code, nicht nur den Diff. Reihenfolge: korrekt, sicher, hält unter Last, getestet, schnell, schlank. Jeder Befund mit konkretem Fall, Fix und Folgen. Ziel benennbar: `uncommitted`, `staged`, `branch`, PR-Link |
| `/ponytail-audit` | dasselbe für das ganze Repo, nach Wichtigkeit sortiert, ändert nichts |
| `/ponytail-debt` | sammelt alle `shortcut:`-Kommentare in ein Schuldenbuch; markiert die ohne Auslöser fürs Aufrüsten |
| `/ponytail-gain` | zeigt die Benchmark-Zahlen (keine Zahlen für das eigene Repo, mit Absicht) |
| `/ponytail-help` | Kurzreferenz |

Abschalten auch mit der Nachricht „stop ponytail“ oder „normal mode“ (nur als ganze Nachricht).

## Installation

### Claude Code

Zwei **getrennte** Prompts:

```
/plugin marketplace add DietrichGebert/ponytail
```
```
/plugin install ponytail@ponytail
```

Das Plugin bringt drei kleine Node-Hooks mit (`node` muss im `PATH` der nicht-interaktiven Shell liegen):

| Hook | Zweck |
|---|---|
| `SessionStart` | aktiviert die Standardstufe und lädt die Regeln als versteckten Kontext |
| `SubagentStart` | gibt die Regeln auch an Subagents weiter (sonst arbeiten die ohne Ponytail) |
| `UserPromptSubmit` | merkt sich Stufenwechsel (`/ponytail ultra`) |

### Andere Agents

| Agent | Installation |
|---|---|
| Codex | `codex plugin marketplace add DietrichGebert/ponytail`, `codex plugin add ponytail@ponytail`, dann in `/hooks` die zwei Hooks freigeben |
| Copilot CLI | `copilot plugin marketplace add DietrichGebert/ponytail`, `copilot plugin install ponytail@ponytail` |
| Gemini CLI | `gemini extensions install https://github.com/DietrichGebert/ponytail` |
| OpenCode | `opencode plugin add @dietrichgebert/ponytail` |
| Cursor, Windsurf, Cline, Kiro … | Regeldatei bzw. `AGENTS.md` ins Projekt kopieren (ohne Befehle, nur die Regeln) |

Vollständig: [INSTALL.md](https://github.com/DietrichGebert/ponytail/blob/main/INSTALL.md).

### Konfiguration (optional)

```bash
export PONYTAIL_DEFAULT_MODE=lite          # off | lite | full | ultra
export PONYTAIL_SUBAGENT_MATCHER='general' # regeln nur in passende subagents
export PONYTAIL_HIDE_STATUS=1              # keine statuszeile
```

oder `~/.config/ponytail/config.json`:

```json
{ "defaultMode": "lite", "hideStatus": true }
```

Reihenfolge: Umgebungsvariable vor Datei vor `full`.

## Was die Zahlen sagen

Der Autor hat Ponytail 5 gegen denselben Agent ohne Skill gemessen: Claude Code, Opus 5.5, 39 Aufgaben (Feature-Tickets in einem echten FastAPI- und React-Repo, Bugfixes, Sicherheitsfälle, kleine Apps), je 5 Läufe, 585 Sitzungen. Geometrisches Mittel der Mediane pro Aufgabe:

| gegenüber ohne Skill | Ponytail 5 |
|---|--:|
| Codezeilen | −53 % |
| Output-Tokens | −45 % |
| Kosten | −26 % |
| Zeit | −41 % |
| riskante Logik mit Test | 98 % (ohne: 68 %) |
| versteckte Prüfungen bestanden | 97 % (ohne: 96 %) |

Einordnung: Das sind Messungen des Autors, mit veröffentlichter Methode ([benchmarks/results/2026-10-07-agentic.md](https://github.com/DietrichGebert/ponytail/blob/main/benchmarks/results/2026-10-07-agentic.md)), aber ohne unabhängige Wiederholung. Ein früherer Benchmark mit 80 bis 94 % weniger Code wurde zu Recht kritisiert (er verglich mit einem nackten Modell im Chatfenster); die heutigen Zahlen sind nach dieser Korrektur entstanden. Im Benchmark war die Shell abgeschaltet, gemessen wurde also, was der Agent schreibt, nicht wie gut er debuggt.

## Für meine Projekte

Ponytail und die Regeln in [`agents`](https://github.com/pulgasari/agents) wollen weitgehend dasselbe: wenig Code, Plattform zuerst (bei mir: browser-first), keine Abstraktion auf Vorrat, kurze Kommentare nur fürs Warum.

### Wo es sich beißt

| Ponytail | `agents` | Auflösung |
|---|---|---|
| nicht-triviale Logik hinterlässt einen kleinen Test | `workflow.md`: keine Tests ohne ausdrücklichen Auftrag | muss entschieden werden, sonst bekommt der Agent zwei widersprüchliche Anweisungen |
| `shortcut: …`-Kommentare | `code.md`: so wenig Kommentare wie möglich | verträglich: ein `shortcut:` ist genau ein Warum. Wer sie nicht will, sagt es in `AGENTS.md` |
| jede Antwort endet mit „ausgelassen / Risiko“ | `chat.md`: knapp, kein Füllstoff | verträglich, solange es eine Zeile bleibt |
| `ultra` widerspricht vor dem Bauen | eigene Konzepte, bewusst ausprobieren | `ultra` eher nicht; `full` oder `lite` |

### Einbinden: drei Wege

**1. Nur die Regeln, überall gültig (empfohlen).** Eine Datei `ponytail.md` in `agents/` mit dem Inhalt von Ponytails `AGENTS.md` und einer Vorrangregel, eingebunden in `agents/AGENTS.md`:

```md
@chat.md
@code.md
@workflow.md
@ponytail.md
```

```md
# ponytail (lazy senior dev)

<inhalt von DietrichGebert/ponytail/AGENTS.md>

## precedence
- where this file and workflow.md disagree on tests, workflow.md wins.
- `shortcut:` comments follow code.md: english, lowercase.
```

Vorteil: wirkt in jeder Umgebung, in der die `CLAUDE.md`-Kette geladen wird, auch in Cloud-Sitzungen, ohne Hooks und ohne `node`. Nachteil: keine Befehle (`/ponytail-review` usw.) und Updates nur von Hand.

**2. Das Plugin in Claude Code lokal.** Die zwei `/plugin`-Befehle oben. Dann gibt es Stufen und Befehle, und die Regeln erreichen auch Subagents. Die Vorrangregel für Tests gehört trotzdem in `agents/` (oder in die `CLAUDE.md` des Projekts), sonst gewinnt je nach Kontext mal die eine, mal die andere Anweisung.

**3. Pro Projekt.** `AGENTS.md` von Ponytail ins Projekt kopieren, für ein einzelnes Repo, in dem es ausprobiert werden soll.

### Wofür es sich lohnt

- `/ponytail-review` vor einem Merge und `/ponytail-audit` einmal über ein Paket (etwa `@bunker` oder `@domina/verbs`): Die Prompts sind gut gebaut (erst den Fluss verstehen, jeder Befund braucht einen konkreten Fall) und lassen sich auch ohne Plugin als Vorlage für eigene Reviews lesen.
- Als Gegengewicht beim Konzipieren: `lite` nennt die kleinere Variante, ohne den Bau zu verweigern. Passt zu „viel ausprobieren“, ohne dass der Agent jede Idee auf das Minimum zusammenstreicht.
