# Eleventy

Ein statischer Seitengenerator für Node.js, auch **11ty** geschrieben. Von Zach Leatherman, seit 2017. Aktuell 3.1.7 (Oktober 2026), die stabile 3.x-Linie; eine 4.x-Vorabversion wird separat angeboten. Eleventy verarbeitet Inhalte und Templates zu Dateien, ohne dafür ein bestimmtes Browser-Framework oder eine Client-Runtime vorzuschreiben.

- Website: https://www.11ty.dev
- Repository: https://github.com/11ty/eleventy (Projektumzug zu https://github.com/11ty/buildawesome)
- Laufzeit: Node.js beim Build, Ausgabe gewöhnlich statisches HTML
- Build: ja; im Browser kein Eleventy-JavaScript erforderlich

## Das Problem, das Eleventy löst

Eine Website aus Markdown, Layouts und Metadaten braucht nicht unbedingt einen Komponentenbaum mit Hydration. Viele Generatoren koppeln diese einfache Aufgabe trotzdem an eine bestimmte Template-Sprache, Verzeichnisstruktur oder UI-Bibliothek.

Eleventy nimmt vorhandene Dateien und ergänzt schrittweise Layouts, Daten und Sammlungen. Das passt zu Blogs und Dokumentation, bei denen Inhalte das Fundament sind. [Astro](astro.md) ergänzt ein eigenes Komponenten- und Islands-Modell; Eleventy lässt die Browserseite weitgehend offen.

## Kernkonzepte

### 1. Markdown und Frontmatter

```md
---
title: Hallo
layout: base.njk
tags: posts
---
# Ein erster Beitrag

Der Inhalt wird beim Build zu HTML.
```

Frontmatter liefert Daten für die Datei. Markdown beschreibt den Inhalt, das Layout seine Hülle. Ein Permalink kann die Zieladresse unabhängig vom Dateinamen festlegen.

### 2. Layouts und Template-Sprachen

```html
<!-- _includes/base.njk -->
<!doctype html>
<html lang="de">
  <meta charset="utf-8">
  <title>{{ title }}</title>
  <main>{{ content | safe }}</main>
</html>
```

Das Beispiel ist Nunjucks; Eleventy unterstützt unter anderem auch Liquid, HTML und JavaScript-Templates. `safe` ist hier für bereits gerenderten, vertrauenswürdigen Inhalt gedacht, nicht als allgemeine Freigabe für fremdes HTML.

### 3. Die Data Cascade

Globale Daten, Verzeichnisdaten, Template-Daten und Frontmatter werden nach einer definierten Rangfolge zusammengeführt. Dadurch kann ein ganzer Blog ein Layout und gemeinsame Metadaten erben, während ein einzelner Beitrag seinen Titel oder Permalink überschreibt.

```json
{
  "layout": "base.njk",
  "tags": "posts"
}
```

Als `posts/posts.json` gilt diese Datei für Inhalte im zugehörigen Verzeichnis. Die Cascade ist Konfiguration über Dateikontext, kein reaktiver Store im Browser.

### 4. Collections

```njk
<ul>
{% for post in collections.posts %}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
```

Tags bilden automatisch Sammlungen. Eigene Collections können filtern und sortieren; Pagination erzeugt daraus mehrere Ausgabeseiten. Der Build kennt damit sowohl den einzelnen Inhalt als auch seine Beziehungen zu anderen Dateien.

### 5. Konfiguration, Filter und kopierte Assets

```js
// eleventy.config.js in a project with type: module
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addFilter('upper', value => String(value).toUpperCase());
  return { dir: { input: 'src', output: '_site' } };
}
```

Filter erweitern Templates, Shortcodes kapseln wiederkehrende Ausgabe. Passthrough Copy übernimmt Dateien unverändert. `npx @11ty/eleventy --serve` baut die Seite und startet den lokalen Server.

## Wie es intern arbeitet

Eleventy sucht Eingabedateien, bestimmt anhand des Formats die Template-Engine und berechnet deren Datenkontext. Daraus entstehen Collections und gegebenenfalls mehrere Seiten pro Template. Anschließend werden Inhalt und Layouts gerendert und an die berechneten Zielpfade geschrieben.

Im Watch-Modus lösen Änderungen neue Arbeit aus. Die fertige Ausgabe braucht diesen Mechanismus nicht mehr: Ein Webserver liefert nur Dateien. Asynchrone Datenquellen können beim Build abgefragt werden, werden dadurch aber nicht automatisch zu Live-Daten nach der Veröffentlichung.

## Stärken und Schwächen

- **Stark:** vorhandene Inhalte weiterverwenden, freie Template-Wahl, wenig vorgeschriebene Browsertechnik, leicht verständliche statische Ausgabe. Gute Grundlage für langlebige Inhaltsseiten.
- **Schwach:** dynamische Funktionen benötigen zusätzliche Dienste oder Browsercode. Viele Datenebenen können die Herkunft eines Werts verschleiern; große Inhaltsbestände und entfernte Datenquellen machen Build-Strategien wichtig.

## Für rat und aufbau

- **Markdown zuerst** passt zu aufbaus `withSource`: Inhalt und seine Darstellung können unabhängig bleiben. Eine Eleventy-Ausgabe könnte rat-Komponenten als gezielte interaktive Ergänzungen einbinden (Vorschlag).
- **Kein implizites Islands-Protokoll:** Ein Custom Element im erzeugten HTML ist möglich, aber Eleventy serialisiert dadurch keine rat-Instanz und übernimmt keine Hydration.
- **Cascade als Vorbild für Defaults:** Für Layouts und Metadaten kann Vererbung nach Verzeichnis sinnvoll sein. Für aufbaus Laufzeitzustand wäre dieselbe versteckte Rangfolge eher schwer nachvollziehbar.
- **Vergleich mit [MDX](mdx.md):** Eleventy hält Markdown als Inhalt und Templates als Hülle auseinander; MDX macht den Inhalt selbst zu einer Komponente. Welche Grenze besser passt, hängt von der gewünschten Interaktion im Text ab.

Quellen: [Einstieg](https://www.11ty.dev/docs/), [Data Cascade](https://www.11ty.dev/docs/data-cascade/), [Collections](https://www.11ty.dev/docs/collections/), [npm](https://registry.npmjs.org/@11ty/eleventy/latest). Stand: 17. Oktober 2026.
