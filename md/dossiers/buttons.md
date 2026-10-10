# Buttons: eine Politik

Frage: Fast alles Anklickbare ist ein Button, aber es gibt halbeigene Formen (Icon-Button, Ghost-Button, reine Icons, klickbare Überschriften). Wie ordnet man das, ohne dass Semantik, Tastatur und Screenreader leiden?

## Grundsatz: das Element nach dem Verhalten, das Aussehen getrennt davon

Welches Element es ist, entscheidet, **was passiert**. Wie es aussieht, entscheidet der Look. Das sind zwei Achsen, und sie werden nicht vermischt.

| Was passiert | Element | Bemerkung |
|---|---|---|
| eine Aktion | `<button>` / `aufbau-button` | Standardfall |
| Navigation | `<a href>` | auch wenn es wie ein Button aussieht |
| ein Zustand an/aus | Button mit `aria-pressed` / `aufbau-toggle look="button"` | |
| auf- und zuklappen | `<summary>` oder Button mit `aria-expanded` | |
| eins von mehreren wählen | Radio oder `aufbau-picker` | keine Button-Reihe |
| klickbare Überschrift | `<h2><button>…</button></h2>` | das WAI-ARIA-Muster für Akkordeons: Überschrift und Button bleiben beide erhalten |
| klickbare Karte | Link oder Button auf dem Titel, dessen `::after` die Karte überdeckt (`inset: 0`) | nicht die ganze Karte zum Button machen, sonst wird aller Text darin zum Button-Namen |

## Warum `display: contents` scheiterte

Ein Element mit `display: contents` erzeugt keine eigene Box:
- Es ist nicht fokussierbar, also per Tastatur nicht erreichbar.
- Es fiel lange ganz aus dem Accessibility-Baum. Inzwischen ist das für viele Rollen behoben, der Fokus bleibt aber weg.

Genau das, wofür man den `<button>` wollte, geht damit verloren. Die Alternative heißt nicht „keine Box“, sondern „Box ohne Button-Optik“: siehe `plain` unten.

## Was gängige Design-Systeme machen

| System | Stufen | Icon-only |
|---|---|---|
| Material 3 | filled, tonal, elevated, outlined, text | eigene Icon-Buttons (standard, filled, tonal, outlined), FAB |
| IBM Carbon | primary, secondary, tertiary, ghost, danger | ein Modus jeder Stufe, Tooltip Pflicht |
| GitHub Primer | primary, secondary (default), invisible, danger | eigene `IconButton`, `aria-label` Pflicht |
| shadcn / Radix | default, secondary, outline, ghost, link, destructive | Größe `icon` |
| Apple HIG | bordered prominent, bordered, borderless, plain | über den Inhalt |

Gemeinsam ist allen:
1. **Eine Stufenleiter der Betonung** (laut bis leise), mit ghost/text/borderless ganz unten.
2. **Icon-only ist keine Stufe**, sondern ein Modus des Inhalts, der mit jeder Stufe geht und immer einen zugänglichen Namen braucht.
3. **Die Form (eckig, rund, Kreis)** ist keine eigene Button-Sorte, sondern kommt aus Theme oder Größe.

## Vorschlag: drei Achsen statt vier Sorten

1. **`variant`, die Betonung:**
   - `solid`: gefüllt mit `--color-ink`, die Hauptaktion
   - `default`: Rahmen
   - `ghost`: ohne Hintergrund und Rahmen, nur Tönung bei Hover
   - `plain`: gar keine Button-Optik. Erbt Schrift und Farbe, behält Cursor und Fokusring. Das ist der richtige „naked“-Button, **mit** Box.
2. **Inhalt, automatisch erkannt:** Label, Icon mit Label oder Icon allein.
   - Bei Icon allein gilt `:state(icon-only)`: quadratisch (`aspect-ratio: 1`) mit gleichen Abständen.
   - `label` wird dann `aria-label` und Tooltip. Fehlt es, gibt es eine Warnung in der Konsole.
3. **Form über `geometry`:** sharp, soft, round, pill.
   - Icon-only bei `pill` (oder `round`) ergibt einen Kreis.
   - Optional `shape="circle"`, um das pro Button zu erzwingen.

Deine vier Begriffe darauf abgebildet:

| dein Begriff | wird zu |
|---|---|
| button | `variant="default"` (oder `solid` für die Hauptaktion) |
| taplet / ghost | `variant="ghost"`. „ghost“ ist der verbreitete Name, „taplet“ ist schön, aber unbekannt |
| piktogramm / glyph / symbol | **keine Sorte**: Icon-only-Zustand × Variante × Geometrie. „Kreis mit Rahmen“ = icon-only + `default` + `pill` |
| naked / not-a-button | `variant="plain"`. Box bleibt, Optik weg, Fokus und Rolle bleiben |

Weitere Achsen, falls sie später gebraucht werden:
- **`tone`**, die Absicht: `danger`, `success`. Getrennt von der Betonung, weil ein gefährlicher Button auch leise sein kann.
- **Größe** über density.

## Zu `onclick` auf beliebigen Elementen (htx/preact)

Statt automatisch zu wrappen:

- **Warnung im Dev-Modus:** htx warnt, wenn `onClick` auf einem nicht-interaktiven Element liegt. Das macht eslint-plugin-jsx-a11y mit `no-static-element-interactions` und `click-events-have-key-events` genauso.
- **Eine kurze Schreibweise, damit der richtige Weg bequem ist:** z. B. ein htx-Shorthand `<$tap>` für `<aufbau-button variant="plain">` oder `<button class="plain">`. Dann kostet der richtige Weg nicht mehr Tipparbeit als der falsche.
- **Nicht zu empfehlen:** `role="button"` plus `tabindex` plus Enter/Space-Handler nachbauen. Das ist genau das, was `<button>` von selbst kann, nur fehleranfälliger.

## Für aufbau-button hieße das

- `variant`: `solid | default | ghost | plain`.
  - Heute heißen die Varianten `default | ghost | primary`.
  - `primary` beschreibt eine Bedeutung, `solid` das Aussehen. Die Bedeutung (Hauptaktion) entscheidet die App, das Aussehen der Skin.
- Automatisch `:state(icon-only)`, wenn nur `icon` gesetzt ist. `label` wird dann Name und Tooltip.
- Die Ecken über `--radius-control` (geometry). Icon-only bei `round`/`pill` wird ein Kreis.
- Optional `href`: Dann verhält er sich als Link (Rolle `link`, Navigation), sieht aber aus wie ein Button.

## Offen

- `primary` in `solid` umbenennen, oder beide Namen behalten?
- Braucht `plain` einen sichtbaren Hover (z. B. Unterstreichung), oder reicht der Fokusring?
- Kommt `tone` jetzt schon oder erst, wenn es gebraucht wird?
