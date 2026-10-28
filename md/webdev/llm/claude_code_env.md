# Claude Code auf claude.ai: Umgebungen sinnvoll nutzen

Wie eine Cloud-Umgebung für Claude Code auf claude.ai, auch im mobilen Browser, aufgebaut ist und konfiguriert wird: Umgebungsvariablen, Setup-Script, Netzwerk, Secrets. Dazu die Frage, wie sich Pfade und Abkürzungen hinterlegen lassen, damit man sie nicht jedes Mal ausschreiben muss.

Stand: Oktober 2026. Die Oberfläche ändert sich häufig; die Bezeichnungen der Menüpunkte können abweichen.

---

## 1. Was eine Session ist

```
claude.ai/code ──▶ Session ──▶ VM / Container (Ubuntu 24.04, root)
                                ├─ /home/user/<repo>     geklonte Repos, ein Ordner je Repo
                                ├─ Setup-Script           einmal pro Umgebung, gecacht
                                ├─ Env-Variablen          beim Start gesetzt
                                └─ Agent-Proxy            jeder ausgehende Request, Netzwerk-Regeln, Secrets
```

- Jede Session startet in einem **frischen Container**. Was nicht committet und gepusht ist, geht verloren, sobald der Container nach Inaktivität oder beim Session-Ende abgeräumt wird.
- Eine **Umgebung** (Environment) ist die wiederverwendbare Konfiguration dieser Container: Name, Netzwerkzugriff, Env-Variablen, Setup-Script, Secrets. Mehrere Sessions nutzen dieselbe Umgebung.
- Die Repos kommen **nicht** aus der Umgebung, sondern aus der Session (Auswahl beim Start oder nachträglich hinzugefügt). Sie liegen unter `/home/user/<repo>`.

---

## 2. Umgebung bearbeiten (auch mobil)

- **Neue Session:** Unter dem Eingabefeld sitzt der Umgebungs-Selektor (Name der Umgebung). Darüber Umgebung wählen, anlegen oder bearbeiten.
- **Laufende Session:** Pfeil bzw. Caret neben dem Session-Titel → **„Edit cloud environment“**.

Felder:

| Feld | Inhalt |
|---|---|
| Name | frei |
| Netzwerkzugriff | `None`, `Trusted`, `Full`, `Custom` (siehe [6](#6-netzwerk-und-secrets)) |
| Environment variables | `.env`-Format, ein `KEY=value` pro Zeile |
| Setup script | Bash, läuft als root vor dem Start von Claude |
| Secrets | API-Keys, die der Proxy einsetzt, ohne dass die Session sie sieht |

Im mobilen Browser funktioniert das genauso, ist aber fummelig. Längere Setup-Scripts besser am Desktop schreiben oder als Datei im Repo pflegen und im Setup-Script nur aufrufen (siehe [5](#5-setup-script)).

---

## 3. Umgebungsvariablen

### Format und Semantik

```env
TZ=Europe/Berlin
DOMINA=/home/user/domina
WEBDEV=/home/user/pulgasari.github.io/md/webdev
BASH_DEFAULT_TIMEOUT_MS=300000
```

- Gelesen werden sie **beim Erstellen der Session** und beim Wiederherstellen einer VM. Änderungen wirken erst in einer neuen bzw. neu gestarteten Session.
- Sie sind in **jedem Shell-Befehl** verfügbar, den ich ausführe (`echo $DOMINA`, `cd "$WEBDEV"`).
- Sie sind für **jeden lesbar, der die Umgebung nutzt**, und für alle Prozesse im Container. Sie sind **kein Ort für Secrets**.

### Die entscheidende Einschränkung

**Env-Variablen stehen nicht in meinem Kontext.** Ich sehe ihre Werte nur, wenn ich einen Befehl ausführe (`env`, `echo $X`). Schreibst du „schau mal in `$WEBDEV`“, funktioniert das nur, weil ich es als Shell-Variable erkenne und auflöse. Schreibst du „schau in webdev“, weiß ich nicht, dass es eine Variable dafür gibt.

Für **Abkürzungen im Chat** sind Env-Variablen daher das falsche Werkzeug. Das richtige ist eine Datei, die bei jedem Session-Start in den Kontext geladen wird: `CLAUDE.md`.

### Wofür Env-Variablen gut sind

| Zweck | Beispiel |
|---|---|
| Pfade für **Befehle** | `$DOMINA/packages/chain` in Scripts, Hooks, Setup |
| Zeitzone, Locale | `TZ=Europe/Berlin`, `LANG=de_DE.UTF-8` |
| Längere Befehls-Timeouts | `BASH_DEFAULT_TIMEOUT_MS=300000`, `BASH_MAX_TIMEOUT_MS=1200000` |
| Tool-Konfiguration | `NODE_OPTIONS=--max-old-space-size=4096`, `DENO_DIR=…` |
| Feature-Flags eigener Scripts | `PULGASARI_ENV=cloud` |

---

## 4. Pfad-Aliase: der richtige Ort ist CLAUDE.md

### Wie CLAUDE.md geladen wird

- Jede `CLAUDE.md` im Wurzelverzeichnis eines Repos der Session wird beim Start in meinen Kontext geladen.
- `@pfad` in einer CLAUDE.md **importiert** eine weitere Datei. Deine Repos nutzen das bereits: `@../agents/AGENTS.md` → `@chat.md`, `@code.md`, `@workflow.md`.
- Die nutzerweite Datei `~/.claude/CLAUDE.md` gibt es in Cloud-Sessions zunächst **nicht**. Der Container ist frisch, deine lokale Home-Konfiguration wird nicht übertragen. Sie lässt sich aber per Setup-Script erzeugen (Variante C).

### Variante A: Alias-Tabelle im `agents`-Repo (empfohlen)

Neue Datei `agents/paths.md`:

````md
# paths

repos live in `/home/user/<repo>`. aliases below may be used in chat and resolve as listed.

| alias | path |
|---|---|
| `@agents`  | `/home/user/agents` |
| `@aufbau`  | `/home/user/aufbau` |
| `@domina`  | `/home/user/domina` |
| `@chain`   | `/home/user/domina/packages/chain` |
| `@methods` | `/home/user/domina/packages/methods` |
| `@site`    | `/home/user/pulgasari.github.io` |
| `@webdev`  | `/home/user/pulgasari.github.io/md/webdev` |
| `@zugriff` | `/home/user/zugriff` |
````

Und in `agents/AGENTS.md` ergänzen:

```md
@paths.md
```

Danach reicht im Chat: „Schreib nach `@webdev/wordpress.md`“ oder „wie in `@chain/view.js`“.

Vorteile:

- Liegt einmal zentral, gilt für jedes Repo, dessen CLAUDE.md `@../agents/AGENTS.md` importiert.
- Versioniert, auf jedem Gerät gleich, keine Umgebungskonfiguration nötig.

Voraussetzungen:

- Das `agents`-Repo muss in der Session sein, sonst läuft der Import ins Leere.
- Das Repo, in dem du arbeitest, braucht eine `CLAUDE.md` mit dem Import. Aktuell haben `aufbau`, `pulgasari.github.io` und `zugriff` eine. **`domina`, `htx`, `js-packages`, `rat` und `bunker` haben keine.** Wird eine Session nur mit `domina` gestartet, greifen weder Aliase noch Code-Regeln. Abhilfe: in jedes Repo eine zweizeilige `CLAUDE.md`:
  ```md
  @../agents/AGENTS.md
  ```

### Variante B: Env-Variablen plus Hinweis in CLAUDE.md

Wenn die Pfade auch in Scripts gebraucht werden: Variablen in der Umgebung setzen und in `paths.md` nur deklarieren:

```md
paths are also set as env vars: `$DOMINA`, `$WEBDEV`, … (see `env`). in chat, `$NAME` means that path.
```

Dann gilt dieselbe Schreibweise im Chat und in der Shell. Nachteil: zwei Stellen, die synchron bleiben müssen.

### Variante C: Setup-Script schreibt `~/.claude/CLAUDE.md`

Für Regeln, die in **jeder** Session dieser Umgebung gelten sollen, unabhängig von den Repos:

```bash
#!/bin/bash
mkdir -p ~/.claude
cat > ~/.claude/CLAUDE.md <<'EOF'
# user

- repos: `/home/user/<repo>`
- `@webdev` = `/home/user/pulgasari.github.io/md/webdev`
- `@chain`  = `/home/user/domina/packages/chain`
EOF
```

Das wirkt nur in dieser einen Umgebung und ist im Webformular schlechter zu pflegen als eine Datei im Repo. Sinnvoll als Ergänzung, nicht als Ersatz für Variante A.

### Vergleich

| | im Chat nutzbar | in Befehlen nutzbar | versioniert | gilt für |
|---|---|---|---|---|
| A: `agents/paths.md` | ja | nein | ja | alle Sessions mit `agents` + importierendem Repo |
| B: Env + Hinweis | ja | ja | halb | eine Umgebung |
| C: Setup → `~/.claude/CLAUDE.md` | ja | nein | nein | eine Umgebung |

---

## 5. Setup-Script

- Läuft als **root** auf Ubuntu 24.04, **bevor** Claude startet, im Container der neuen Session.
- Muss mit **Exit-Code 0** enden, sonst startet die Session nicht. Unkritische Schritte mit `|| true` absichern.
- **Caching:** Endet das Script in ca. 5 Minuten, wird das Ergebnis als Snapshot gespeichert und von späteren Sessions wiederverwendet. Der Cache läuft nach ca. 7 Tagen ab oder wenn das Script geändert wird. Bei der Wiederherstellung einer VM läuft es **nicht** erneut.
- Typische Inhalte: Tools installieren (`deno`, `bun`, `pnpm`, CLI-Werkzeuge), globale Konfiguration schreiben, Caches vorwärmen.

```bash
#!/bin/bash
set -e
curl -fsSL https://deno.land/install.sh | sh || true
npm i -g pnpm || true
git config --global pull.rebase false
mkdir -p ~/.claude && cp /home/user/agents/templates/user-claude.md ~/.claude/CLAUDE.md 2>/dev/null || true
```

Ob die Repos zum Zeitpunkt des Setup-Scripts schon geklont sind, ist nicht garantiert. Dateien aus Repos daher defensiv lesen (`|| true`) oder in einen SessionStart-Hook verlagern.

Für Installationen mit externen Downloads muss der Netzwerkzugriff das zulassen (`Trusted` deckt gängige Paket-Registries ab).

---

## 6. Netzwerk und Secrets

### Netzwerkzugriff

| Stufe | Bedeutung |
|---|---|
| `None` | kein ausgehender Zugriff außer der API |
| `Trusted` | Allowlist bekannter Hosts: Paket-Registries (npm, PyPI, crates, …), GitHub, gängige CDNs |
| `Full` | alles |
| `Custom` | eigene Allowlist |

Jeder ausgehende Request läuft über den **Agent-Proxy** der Umgebung. `WebFetch` und `WebSearch` sind davon unabhängig verfügbar.

### Secrets

- **Niemals Tokens, API-Keys oder Passwörter in den Chat schreiben.** Der Chatverlauf wird gespeichert und landet im Kontext.
- **Nicht als Env-Variable.** Die sind für alle Nutzer der Umgebung und alle Prozesse lesbar.
- **Richtig:** im Bereich für Secrets der Umgebung hinterlegen. Der Proxy setzt den Key in ausgehende Requests an den zugehörigen Host ein; die Session selbst sieht den Wert nie.
- GitHub-Zugriff läuft nicht über ein Token in der Umgebung, sondern über die GitHub-App-Verbindung von claude.ai.

---

## 7. Hooks: SessionStart

Hooks liegen in `.claude/settings.json` eines Repos:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/session-start.sh" }] }
    ]
  }
}
```

```bash
#!/bin/bash
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
npm ci --silent >/dev/null 2>&1 || true
echo "cloud session: deps installed"
```

- Läuft bei **jedem** Start einer Session, auch beim Fortsetzen. Damit eignet er sich für Dinge, die das gecachte Setup-Script nicht abdeckt (Dependencies eines konkreten Repos).
- `CLAUDE_CODE_REMOTE=true` kennzeichnet Cloud-Sessions. Damit läuft derselbe Hook lokal nicht.
- Die **Ausgabe** eines SessionStart-Hooks wird in meinen Kontext übernommen. Ein Hook könnte also auch Aliase oder Status dynamisch ausgeben.

**Einschränkung bei mehreren Repos:** In Multi-Repo-Sessions werden aus den `.claude/settings.json` der Repos nur `enabledPlugins` und `extraKnownMarketplaces` gelesen. Hooks dort greifen dann nicht. Da deine Sessions meist mehrere Repos enthalten, ist CLAUDE.md (Variante A) der verlässlichere Weg.

---

## 8. Was übertragen wird und was nicht

| Quelle | in der Cloud-Session |
|---|---|
| `CLAUDE.md` der Repos, inkl. `@`-Imports | ja |
| `.claude/` im Repo: Rules, Skills, Agents, Commands | ja |
| `.claude/settings.json` im Repo | ja; bei mehreren Repos nur Plugins und Marketplaces |
| `~/.claude/` deines lokalen Rechners (User-CLAUDE.md, eigene Commands, Settings) | **nein** |
| lokale MCP-Server | nein; Connectors von claude.ai sind verfügbar, wenn freigegeben |
| Dateien außerhalb von Repos | nein, außer das Setup-Script erzeugt sie |

Wiederkehrende Abläufe lassen sich daher am besten als **Skill oder Command in einem Repo** ablegen, etwa im `agents`-Repo unter `.claude/commands/` oder `.claude/skills/`. Dann stehen sie in jeder Session mit diesem Repo als `/name` zur Verfügung, auch mobil.

---

## 9. Empfohlene Konfiguration

**Umgebung** (einmal anlegen, z. B. „pulgasari“):

```env
TZ=Europe/Berlin
BASH_DEFAULT_TIMEOUT_MS=300000
BASH_MAX_TIMEOUT_MS=1200000
```

- Netzwerk: `Trusted`.
- Setup-Script: nur Tools, die nicht vorinstalliert sind.

**`agents`-Repo:**

```
agents/
├─ AGENTS.md          + @paths.md
├─ paths.md           Alias-Tabelle (Abschnitt 4, Variante A)
└─ .claude/
   └─ commands/       wiederkehrende Aufträge als /befehle
```

**Jedes Arbeits-Repo:** eine `CLAUDE.md` mit `@../agents/AGENTS.md` und projektspezifischen Ergänzungen darunter.

**Sessions:** immer `agents` mit auswählen. Dann gelten Regeln und Aliase überall, und Prompts im mobilen Browser bleiben kurz:

```
@webdev/wordpress.md: abschnitt 6 um termmeta-beispiel ergänzen
```

---

## 10. Nützliche Fakten

- Repos: `/home/user/<repo>`. Arbeitsverzeichnis ist `/home/user`, bei einem einzelnen Repo dessen Ordner.
- Branch: Jede Session arbeitet auf einem eigenen Branch, der im Session-Kontext steht. Ohne ausdrückliche Bitte wird kein Pull Request erstellt.
- Speicher: Der beschreibbare Speicher ist ein festes Kontingent pro Session. `df` zeigt das nicht korrekt an.
- Browser: Chromium mit Playwright ist vorinstalliert.
- Lebensdauer: Der Container wird nach Inaktivität abgeräumt. Ergebnisse, die bleiben sollen, gehören in einen Commit.

---

## Quellen

- [code.claude.com/docs/en/claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)
- [code.claude.com/docs/en/cloud-environments](https://code.claude.com/docs/en/cloud-environments)
- [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings)
- [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) (CLAUDE.md, Imports)
- [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)
