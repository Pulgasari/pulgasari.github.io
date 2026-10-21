# WordPress: interne Architektur und ihre Genese

WordPress betrachtet aus Sicht von Webdev und Lib-Design: wie das Datenmodell aufgebaut ist, warum es so aussieht, wie ein Request durchläuft und wie Plugins, Themes, Blöcke und ACF auf diesem Fundament sitzen.

Stand: WordPress 7.1 (August 2026).

Weiterführend: [middleware.md](../middleware.md) (Hooks als Pipeline), [protocols.md](../types/protocols.md), [server.md](../server.md).

---

## Inhalt

1. [Kurzfassung](#1-kurzfassung)
2. [Genese: von b2 bis 7.x](#2-genese-von-b2-bis-7x)
3. [Das Datenmodell](#3-das-datenmodell)
4. [Posts: alles ist ein Post](#4-posts-alles-ist-ein-post)
5. [Terms und Taxonomien: die Ebene darunter](#5-terms-und-taxonomien-die-ebene-darunter)
6. [Meta: das EAV-Fundament](#6-meta-das-eav-fundament)
7. [Custom Post Types und Taxonomien registrieren](#7-custom-post-types-und-taxonomien-registrieren)
8. [Der Request-Lebenszyklus](#8-der-request-lebenszyklus)
9. [WP_Query und der Loop](#9-wp_query-und-der-loop)
10. [Das Hook-System](#10-das-hook-system)
11. [Das Plugin-System](#11-das-plugin-system)
12. [Themes: Template-Hierarchie bis Block Themes](#12-themes-template-hierarchie-bis-block-themes)
13. [Gutenberg: Blöcke als Datenformat](#13-gutenberg-blöcke-als-datenformat)
14. [REST API](#14-rest-api)
15. [Rechte: Rollen, Capabilities, map_meta_cap](#15-rechte-rollen-capabilities-map_meta_cap)
16. [Options, Transients, Object Cache, Cron, Nonces](#16-options-transients-object-cache-cron-nonces)
17. [ACF und die Custom-Field-Plugins](#17-acf-und-die-custom-field-plugins)
18. [Performance: die bekannten Engstellen](#18-performance-die-bekannten-engstellen)
19. [Lehren für Lib- und Framework-Design](#19-lehren-für-lib--und-framework-design)

---

## 1. Kurzfassung

WordPress hat im Kern **drei generische Entitäten**, die über **Diskriminator-Spalten** typisiert werden:

| Entität | Tabelle | Diskriminator | Wofür |
|---|---|---|---|
| Objekt | `wp_posts` | `post_type` | Inhalte, aber auch Menüeinträge, Revisionen, Templates, Styles, Fonts |
| Klassifikation | `wp_terms` + `wp_term_taxonomy` | `taxonomy` | Kategorien, Tags, Menüs, Post-Formate, Theme-Zuordnung |
| Zusatzdaten | `wp_*meta` | `meta_key` | alles, was in keine Spalte passt |

Dazu kommen Nutzer, Kommentare und Options. Alles Weitere, auch fast alle Features ab Version 3.0, wird **auf diese Tabellen abgebildet**, statt neue Tabellen anzulegen. Das Schema hat sich seit 2007 kaum verändert, der Funktionsumfang dagegen um ein Vielfaches.

Erweiterbarkeit entsteht über ein **globales Event-System** (Hooks), in das sich Core, Plugins und Themes gleichrangig einklinken. Rückwärtskompatibilität ist dabei das oberste Gebot: Es wird praktisch nie etwas entfernt.

Die Erinnerung „darunter war alles irgendwie ein Term“ ist halb richtig. Es gibt zwei Ebenen:

- **„Alles ist ein Post“** ist die prägende Abstraktion.
- **Terms** sind die zweite: Ein Term ist ein Name mit Slug, der erst über eine Zwischentabelle zu einer Kategorie, einem Tag oder einem Menü wird. Genau diese Zwischenebene ist historisch die eigenartigste Stelle im Schema (siehe [5](#5-terms-und-taxonomien-die-ebene-darunter)).

---

## 2. Genese: von b2 bis 7.x

### Vorgeschichte

- **2001:** **b2/cafelog** von Michel Valdrighi. PHP und MySQL, ein Blog-Script mit Templates im PHP-Stil. Die Entwicklung schläft 2002 ein.
- **27. Mai 2003:** Matt Mullenweg und Mike Little forken b2 als **WordPress 0.70**. Das Datenmodell ist rein blogzentriert: Posts, Kategorien, Kommentare, Links (Blogroll), Nutzer, Options.

### Die strukturell relevanten Versionen

| Version | Jahr | Strukturelle Änderung |
|---|---|---|
| 1.0 | 2004 | Permalinks per Rewrite, mehrere Kategorien pro Post (`wp_post2cat`) |
| **1.2** | 2004 | **Plugin-API**: `add_action` / `add_filter`. Ab hier ist WordPress erweiterbar, ohne Core-Dateien zu patchen. |
| **1.5** | 2005 | **Theme-System** mit Template-Hierarchie. **Pages**, damals als Posts mit `post_status = 'static'` |
| **2.0** | 2005 | **Rollen und Capabilities** (`WP_Roles`), Objekt-Cache-API, WYSIWYG |
| **2.1** | 2007 | **Spalte `post_type`**. Pages und Attachments werden über den Typ unterschieden statt über `post_status`. Das ist die Geburtsstunde von „alles ist ein Post“. |
| **2.3** | 2007 | **Tags** und das **Taxonomie-Schema** (`wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`). Es ersetzt `wp_categories`, `wp_post2cat` und `wp_link2cat`. |
| 2.5 | 2008 | Shortcode-API, gesalzene Passwörter (phpass) |
| 2.6 | 2008 | **Revisionen** als Post-Type `revision` |
| 2.7 | 2008 | Neues Admin, Plugin-Installer aus dem Verzeichnis, Child Themes etabliert |
| 2.8 | 2009 | Widget-API als Klasse (`WP_Widget`) |
| 2.9 | 2009 | Post Thumbnails, oEmbed, `register_post_type()` intern vorhanden |
| **3.0** | 2010 | **Custom Post Types und Taxonomien** öffentlich mit Admin-UI. **WordPress MU** wird zu **Multisite** gemergt. **Nav Menus**: Einträge als Post-Type `nav_menu_item`, Menüs als Terms der Taxonomie `nav_menu`. |
| 3.1 | 2011 | Post Formats (Taxonomie `post_format`), `tax_query` und `meta_query` in `WP_Query` |
| 3.4 | 2012 | Customizer |
| 3.5 | 2012 | Links-Manager ausgeblendet, `WP_Post`-Klasse, neuer Media-Manager |
| 3.7 | 2013 | Automatische Hintergrund-Updates |
| **4.2** | 2015 | Beginn des **Shared-Term-Splittings**, `utf8mb4` |
| **4.4** | 2015 | **`wp_termmeta`**, REST-Infrastruktur, responsive Images |
| **4.7** | 2016 | **REST-Endpunkte für Inhalte** im Core, `WP_Hook`-Klasse, Customizer-Changesets als Post-Type |
| **5.0** | 2018 | **Gutenberg**: Block-Editor |
| 5.2 | 2019 | Fatal-Error-Recovery-Mode, Mindestversion PHP 5.6 |
| 5.5 | 2020 | Sitemaps, Lazy Loading, Auto-Updates für Plugins und Themes |
| 5.6 | 2020 | Application Passwords für die REST API |
| **5.8** | 2021 | **`theme.json`**, Block-Widgets |
| **5.9** | 2022 | **Full Site Editing**: Templates (`wp_template`, `wp_template_part`), Global Styles (`wp_global_styles`) und Navigation (`wp_navigation`) als Post-Types |
| 6.2 | 2023 | **HTML API** (`WP_HTML_Tag_Processor`) |
| 6.3 | 2023 | Reusable Blocks werden zu **Synced Patterns** (weiterhin `wp_block`) |
| **6.5** | 2024 | **Interactivity API**, **Block Bindings**, Font Library (`wp_font_family`, `wp_font_face`), **Plugin Dependencies** (`Requires Plugins`) |
| 6.6 | 2024 | `theme.json` v3, neue Autoload-Werte für Options |
| 6.8 | 2025 | Speculative Loading, bcrypt für Passwörter |
| **7.0** | Mai 2026 | KI-Schicht: **Abilities API**, **WP AI Client**. Real-Time-Collaboration wurde vor dem Release herausgenommen. |
| 7.1 | Aug 2026 | „Mary Lou“. Ein 7.2 ist für Dezember 2026 geplant. |

### Die drei Epochen

1. **Blog-Engine (2003–2009).** Feste Begriffe: Post, Page, Kategorie, Link. Erweiterung über Hooks und Templates.
2. **CMS-Framework (2010–2018).** Ab 3.0 sind Post-Types und Taxonomien frei registrierbar, ab 4.7 per REST erreichbar. In dieser Phase entstehen ACF, Pods, Toolset, WooCommerce (Produkte als Post-Type `product`) und die „WordPress als Application-Framework“-Bewegung.
3. **Block-Plattform (seit 2018).** Inhalt, Layout, Templates, Styles und Navigation werden zu Blöcken, die als Posts gespeichert sind. Das Datenmodell bleibt, die Abstraktionsebene darüber wechselt von PHP-Templates zu serialisierten Blockbäumen und JSON-Konfiguration.

Bemerkenswert ist die Kontinuität: Selbst die Block-Ära hat dem Schema **keine neue Tabelle** hinzugefügt. Templates, Styles, Fonts und Navigationen sind Post-Types, die Theme-Zuordnung läuft über eine Taxonomie.

---

## 3. Das Datenmodell

### Die 12 Tabellen einer Single-Site

```
wp_posts ─────────┬── wp_postmeta
     │            │
     │            └── wp_term_relationships ── wp_term_taxonomy ── wp_terms
     │                                                │                │
     └── wp_comments ── wp_commentmeta                 └─ (parent)      └── wp_termmeta
wp_users ── wp_usermeta
wp_options
wp_links                (legacy, Blogroll)
```

| Tabelle | Inhalt |
|---|---|
| `wp_posts` | alle Objekte, typisiert über `post_type` |
| `wp_postmeta` | Key-Value-Paare pro Post |
| `wp_terms` | Name und Slug eines Terms |
| `wp_term_taxonomy` | Term im Kontext einer Taxonomie: Beschreibung, Parent, Count |
| `wp_term_relationships` | Objekt ↔ term_taxonomy (n:m) |
| `wp_termmeta` | Key-Value pro Term (seit 4.4) |
| `wp_comments`, `wp_commentmeta` | Kommentare, Pingbacks, Trackbacks; WooCommerce nutzt sie auch für Bestellnotizen und Reviews |
| `wp_users`, `wp_usermeta` | Nutzer; Rollen und Einstellungen liegen in Meta |
| `wp_options` | globale Konfiguration und Zustand: Key-Value mit Autoload-Flag |
| `wp_links` | Blogroll, seit 3.5 versteckt, aus Kompatibilität noch vorhanden |

**Multisite** ergänzt globale Tabellen (`wp_blogs`, `wp_blogmeta`, `wp_site`, `wp_sitemeta`, `wp_signups`, `wp_registration_log`). Pro Subsite gibt es einen eigenen Satz der Inhaltstabellen mit Präfix `wp_2_`, `wp_3_` usw. Nutzer sind netzwerkweit gemeinsam.

### Design-Eigenschaften

- **Keine Fremdschlüssel.** MyISAM-Erbe. Referenzielle Integrität wird in PHP gesichert (`wp_delete_post` löscht Meta, Relationships, Kommentare). Wird direkt per SQL gelöscht, bleiben Waisen zurück.
- **Eine ID-Sequenz für alle Post-Types.** Revision, Menüeintrag und Produkt teilen den Auto-Increment von `wp_posts`.
- **Schema-Migration über `dbDelta()`.** Sie vergleicht `CREATE TABLE`-Statements textuell mit dem Ist-Zustand. Die Schema-Version steht in der Option `db_version`.

---

## 4. Posts: alles ist ein Post

### Die Spalten von `wp_posts`

| Spalte | Bedeutung |
|---|---|
| `ID` | globale ID |
| `post_author` | User-ID |
| `post_date`, `post_date_gmt`, `post_modified`, `post_modified_gmt` | lokal und UTC, redundant |
| `post_content` | Haupt-Payload: HTML, Block-Markup, JSON (Global Styles) oder serialisierte Daten |
| `post_title`, `post_excerpt` | |
| `post_status` | `publish`, `draft`, `pending`, `private`, `future`, `trash`, `inherit` (Revisionen, Attachments), `auto-draft` |
| `post_name` | Slug |
| `post_parent` | Hierarchie: Seitenbaum, Revision → Original, Attachment → Post |
| `menu_order` | manuelle Sortierung |
| `post_type` | **der Diskriminator** |
| `post_mime_type` | bei Attachments der MIME-Typ |
| `guid` | eindeutige ID für Feeds, **keine URL**, auch wenn sie so aussieht |
| `comment_status`, `ping_status`, `comment_count` | |
| `post_password`, `to_ping`, `pinged`, `post_content_filtered` | Blog-Erbe |

### Was alles ein Post ist

| `post_type` | seit | Verwendung |
|---|---|---|
| `post`, `page` | 0.7 / 1.5 | Inhalt |
| `attachment` | 2.1 | Medien; Datei und Metadaten in Postmeta (`_wp_attached_file`, `_wp_attachment_metadata`) |
| `revision` | 2.6 | Versionsstände, `post_parent` = Original |
| `nav_menu_item` | 3.0 | Menüeintrag, Ziel in Meta (`_menu_item_object_id`, `_menu_item_type`, …) |
| `custom_css` | 4.7 | Customizer-CSS pro Theme |
| `customize_changeset` | 4.7 | Customizer-Entwurf |
| `oembed_cache` | 4.9 | gecachte Embed-Antworten |
| `user_request` | 4.9.6 | DSGVO-Export- und Löschanfragen |
| `wp_block` | 5.0 | Reusable Blocks, heute Synced Patterns |
| `wp_template`, `wp_template_part` | 5.9 | Templates und Template-Teile von Block-Themes, wenn im Editor angepasst |
| `wp_global_styles` | 5.9 | Nutzeranpassungen an `theme.json`, als JSON in `post_content` |
| `wp_navigation` | 5.9 | Navigationsblock-Inhalte |
| `wp_font_family`, `wp_font_face` | 6.5 | Font Library |

Ein Menü in WordPress ist also: ein **Term** (Taxonomie `nav_menu`) als Container, **Posts** (`nav_menu_item`) als Einträge, verknüpft über `wp_term_relationships`, die Zielreferenzen in **Postmeta**, die Zuordnung zu Theme-Locations in einer **Option** (`theme_mods_{theme}`). Alle vier Grundbausteine für ein Feature.

### Warum dieses Muster

`wp_posts` bringt Infrastruktur geschenkt mit:

- Revisionen, Autorenschaft, Status-Workflow (Entwurf, geplant, Papierkorb)
- Hierarchie über `post_parent`
- Capabilities pro Typ
- Query-Engine (`WP_Query`), REST-Controller, Export und Import (WXR)
- Hooks (`save_post_{type}`, `transition_post_status` …)

Ein neues Feature als Post-Type zu modellieren, ist daher fast immer billiger als eine eigene Tabelle. Der Preis: Viele Post-Types nutzen nur einen Bruchteil der Spalten und missbrauchen `post_content` als Blob-Speicher.

### Die Vorgeschichte des Diskriminators

Vor 2.1 war die Unterscheidung über `post_status` kodiert: Eine Page war ein Post mit Status `static`, ein Attachment einer mit Status `attachment`. Damit vermischten sich zwei orthogonale Dimensionen, **was** ein Objekt ist und **in welchem Zustand** es ist. Die Einführung von `post_type` war die Trennung dieser Achsen. Erst sie machte drei Jahre später frei registrierbare Typen möglich.

---

## 5. Terms und Taxonomien: die Ebene darunter

### Vor 2.3

```
wp_categories (cat_ID, cat_name, category_nicename, category_description, category_parent, …)
wp_post2cat   (rel_id, post_id, category_id)
wp_link2cat   (rel_id, link_id, category_id)
```

Eine Tabelle pro Klassifikation und eine Join-Tabelle pro Objekttyp. Für Tags hätte man zwei weitere Tabellen gebraucht, für jede weitere Klassifikation wieder.

### Das generische Schema von 2.3

```
wp_terms              term_id · name · slug · term_group
wp_term_taxonomy      term_taxonomy_id · term_id · taxonomy · description · parent · count
wp_term_relationships object_id · term_taxonomy_id · term_order
```

Die Idee: Ein **Term** ist ein Wort (Name und Slug), unabhängig von seiner Verwendung. Erst die Zeile in `wp_term_taxonomy` macht ihn zu einer Kategorie, einem Tag oder etwas anderem. Die Verknüpfung zu Objekten geht über `term_taxonomy_id`, nicht über `term_id`.

Folgen:

- **`object_id` ist untypisiert.** Es kann eine Post-ID oder eine Link-ID sein. Welche Tabelle gemeint ist, ergibt sich erst aus der Registrierung der Taxonomie (`object_type`). Taxonomien für Nutzer sind daher technisch möglich, aber nicht offiziell unterstützt.
- **Hierarchie hängt an der Taxonomie-Zeile** (`parent`), nicht am Term. Dasselbe Wort könnte theoretisch in einer Taxonomie Kind und in einer anderen Wurzel sein.
- **`count` ist denormalisiert** und wird über `wp_update_term_count()` gepflegt.
- **`term_group`** war für Synonym-Gruppen gedacht und blieb praktisch ungenutzt.

### Shared Terms und ihr Rückbau (4.2–4.3)

Das Zwei-Ebenen-Modell erlaubte, dass ein `term_id` von mehreren Taxonomien geteilt wird: Gibt es eine Kategorie „News“ und einen Tag „News“, existiert eine Zeile in `wp_terms` und zwei in `wp_term_taxonomy`. Das klingt nach sauberer Normalisierung, war in der Praxis aber ein Fehler:

- Fast die gesamte API adressiert Terms per `term_id` plus Taxonomie. Optionen und Meta, die Plugins an einen `term_id` hängten, galten plötzlich für zwei verschiedene Dinge.
- Das Umbenennen eines Tags benannte auch die gleichnamige Kategorie um.
- Termmeta (geplant seit Jahren) war unmöglich, solange ein `term_id` nicht eindeutig ein Ding bezeichnet.

Der Ausweg war das **Shared Term Splitting**:

- **4.2:** Neue Terms werden nicht mehr geteilt. Bestehende geteilte Terms werden beim Bearbeiten in eigene `term_id`s aufgespalten. Plugins erhalten das Event `split_shared_term` (alte ID, neue ID, `term_taxonomy_id`, Taxonomie), um eigene Referenzen nachzuziehen.
- **4.3:** Die verbleibenden geteilten Terms werden per Cron-Batch aufgespalten.
- **4.4:** Mit eindeutigen IDs wird **`wp_termmeta`** eingeführt.

Faktisch ist seitdem `term_id` ≈ `term_taxonomy_id`, also 1:1. Die Trennung in zwei Tabellen existiert nur noch aus Kompatibilität. Sie ist das Lehrbuchbeispiel einer Normalisierung, die eine Unterscheidung modelliert, die die Domäne nicht braucht.

### Was alles eine Taxonomie ist

| Taxonomie | Objekt | Zweck |
|---|---|---|
| `category`, `post_tag` | `post` | klassisch |
| `link_category` | Links | Blogroll |
| `nav_menu` | `nav_menu_item` | **ein Menü ist ein Term** |
| `post_format` | `post` | Aside, Gallery, Quote …, als Terms `post-format-aside` usw. |
| `wp_theme` | `wp_template`, `wp_template_part`, `wp_global_styles` | ordnet FSE-Objekte dem Theme-Slug zu |
| `wp_template_part_area` | `wp_template_part` | Header, Footer, … |
| `wp_pattern_category` | `wp_block` | Pattern-Kategorien |

Taxonomien sind in WordPress daher mehr als „Kategorien“. Sie sind der generische **n:m-Gruppierungsmechanismus**: eine indizierte Relation mit Namen, Slug, optionaler Hierarchie und Zähler. Wo eine Abfrage „alle X in Gruppe Y“ schnell sein muss, ist eine Taxonomie die richtige Wahl und Meta die falsche (siehe [18](#18-performance-die-bekannten-engstellen)).

---

## 6. Meta: das EAV-Fundament

### Struktur

```
wp_postmeta  meta_id · post_id    · meta_key · meta_value (LONGTEXT)
wp_termmeta  meta_id · term_id    · meta_key · meta_value
wp_usermeta  umeta_id · user_id   · meta_key · meta_value
wp_commentmeta …
```

Das ist **Entity-Attribute-Value**: eine Zeile pro Attribut pro Objekt. Eine generische Meta-API (`get_metadata($type, $id, $key, $single)`, `add_`, `update_`, `delete_`) bedient alle Typen. `get_post_meta()` und Co. sind dünne Wrapper darum.

### Semantik

- **Mehrfachwerte:** Derselbe `meta_key` darf mehrfach pro Objekt vorkommen. `get_post_meta($id, $key, false)` liefert ein Array, mit `true` den ersten Wert.
- **Serialisierung:** Arrays und Objekte werden mit PHPs `serialize()` gespeichert (`maybe_serialize`, `maybe_unserialize`). Die Werte sind damit für SQL undurchsichtig und an PHP gebunden. Das Ersetzen von Strings per SQL (Domainwechsel) zerstört die Längenangaben in `s:12:"…"`. Daher gibt es Tools wie `wp search-replace`, die erst deserialisieren.
- **Typlosigkeit:** Alles ist `LONGTEXT`. `42` und `"42"` sind ununterscheidbar, Booleans werden zu `"1"` oder `""`.
- **Unterstrich-Präfix:** `_key` gilt als „protected“ und erscheint nicht in der Custom-Fields-Box. Das ist eine reine UI-Konvention, kein Zugriffsschutz.
- **Meta-Cache:** `update_meta_cache()` lädt beim Abfragen von Posts alle Meta-Zeilen der gefundenen IDs **in einem Query** und legt sie in den Object Cache. Danach sind einzelne `get_post_meta()`-Aufrufe ohne DB-Zugriff. Das verhindert N+1, lädt aber immer **alle** Meta-Werte, auch wenn nur einer gebraucht wird.

### Indexe

`meta_key` ist indiziert, mit Präfixlänge 191 Zeichen wegen `utf8mb4`. **`meta_value` ist nicht indiziert** und als `LONGTEXT` auch nicht sinnvoll indizierbar. Jede Abfrage nach Wert, etwa „alle Produkte mit Preis < 50“, ist ein Scan über alle Zeilen mit diesem Key plus Cast.

### Registrierte Meta

Seit 4.6 und ausgebaut in 4.9.8 kann Meta deklariert werden:

```php
register_post_meta('event', 'start', [
  'type'              => 'string',
  'single'            => true,
  'show_in_rest'      => true,
  'sanitize_callback' => 'sanitize_text_field',
  'auth_callback'     => fn () => current_user_can('edit_posts'),
]);
```

Damit erscheint das Feld im REST-Schema und in Block Bindings. Am Speicherformat ändert sich nichts: Es bleibt eine EAV-Zeile. Die Registrierung ist ein Schema-Overlay, keine Typisierung der Persistenz.

---

## 7. Custom Post Types und Taxonomien registrieren

Registrierung ist **Laufzeit-Konfiguration**, keine Migration. Bei jedem Request rufen Plugins oder Themes auf `init`:

```php
register_post_type('event', [
  'public'          => true,
  'has_archive'     => true,
  'hierarchical'    => false,
  'menu_icon'       => 'dashicons-calendar',
  'rewrite'         => ['slug' => 'events'],
  'show_in_rest'    => true,
  'supports'        => ['title', 'editor', 'thumbnail', 'custom-fields', 'revisions'],
  'capability_type' => 'event',
  'map_meta_cap'    => true,
  'template'        => [['core/paragraph', ['placeholder' => 'Beschreibung']]],
]);

register_taxonomy('venue', ['event'], [
  'hierarchical' => true,
  'show_in_rest' => true,
  'rewrite'      => ['slug' => 'venue'],
]);
```

Was dabei passiert:

- Ein `WP_Post_Type`-Objekt landet in der globalen Registry `$wp_post_types`, ein `WP_Taxonomy` in `$wp_taxonomies`.
- Aus `labels`, `public`, `show_ui` usw. leitet der Core das Admin-UI ab: Menüpunkt, Liste (`WP_Posts_List_Table`), Editor.
- Aus `rewrite` und `has_archive` entstehen Rewrite-Regeln. Sie werden aber erst beim **Flush** (`flush_rewrite_rules()`, auch beim Speichern der Permalink-Einstellungen) in die Option `rewrite_rules` geschrieben. Daher das klassische „404 nach neuem CPT“.
- Aus `capability_type` werden Capability-Namen generiert (`edit_events`, `edit_others_events`, …).
- Aus `show_in_rest` entsteht ein REST-Controller unter `/wp/v2/{rest_base}`.

**Konsequenz:** Daten und Schema leben getrennt. Wird das Plugin deaktiviert, liegen die Posts mit `post_type = 'event'` weiter in der DB, sind aber unsichtbar, weil niemand den Typ registriert. Das Schema ist Code und wird bei jedem Request neu aufgebaut.

---

## 8. Der Request-Lebenszyklus

```
index.php
└─ wp-blog-header.php
   ├─ wp-load.php → wp-config.php → wp-settings.php     BOOTSTRAP
   ├─ wp()                                              ROUTING + QUERY
   └─ wp-includes/template-loader.php                   RENDERING
```

### Bootstrap (`wp-settings.php`)

| Schritt | Hook / Datei |
|---|---|
| Konstanten, Fehlerbehandlung, Fatal-Error-Handler | |
| Page-Cache-Drop-in, falls `WP_CACHE` | `wp-content/advanced-cache.php` |
| DB-Abstraktion | `wp-includes/class-wpdb.php` oder Drop-in `db.php` |
| Object Cache | Drop-in `object-cache.php` oder der nicht-persistente Default |
| Default-Filter registrieren | `default-filters.php` |
| Multisite-Bootstrap | `ms-settings.php`, optional `sunrise.php` |
| Must-Use-Plugins | `muplugins_loaded` |
| Netzwerk-Plugins und aktive Plugins | `plugins_loaded` |
| Pluggable Functions | `pluggable.php` (nur nicht bereits definierte) |
| Theme setup | `setup_theme`, `functions.php` (Child vor Parent), `after_setup_theme` |
| Nutzer bestimmen, Registrierungen | **`init`**: CPTs, Taxonomien, Shortcodes, Blöcke |
| Fertig geladen | `wp_loaded` |

Jeder Request lädt **alle** aktiven Plugins vollständig, egal ob sie für die aktuelle URL gebraucht werden. Es gibt kein Lazy Loading auf Plugin-Ebene.

### Routing (`WP::main()`)

1. **`parse_request`:** Der Pfad wird gegen die Regex-Liste in der Option `rewrite_rules` geprüft, der erste Treffer gewinnt. Das Ergebnis sind **Query-Variablen**, keine Controller-Zuordnung:
   ```
   ^events/([^/]+)/?$  →  index.php?event=$matches[1]
   ```
2. **`send_headers`**
3. **`query_posts`:** Die Query-Variablen werden an die **Main Query** (`$wp_query = new WP_Query`) übergeben. Vorher läuft `pre_get_posts`, der Standardweg, die Hauptabfrage zu verändern.
4. **`handle_404`**, `register_globals` (`$post`, `$posts`, …)

Routing in WordPress bestimmt also nicht, *welcher Code* läuft, sondern *welche Daten* geladen werden. Die Wahl der Darstellung folgt danach aus den Daten.

### Rendering (`template-loader.php`)

1. **`template_redirect`:** der letzte Punkt für Redirects, Feeds, eigene Antworten.
2. Die **Template-Hierarchie** wählt anhand des Query-Typs (`is_single()`, `is_tax()`, …) die spezifischste vorhandene Datei, z. B. `single-event-mein-slug.php` → `single-event.php` → `single.php` → `singular.php` → `index.php`.
3. Der Filter `template_include` erlaubt den Austausch, dann wird die Datei per `include` geladen.

Bei Block-Themes ist der Ablauf derselbe. Am Ende steht aber `template-canvas.php`, das ein HTML-Template (Datei im Theme oder `wp_template`-Post) als Blockbaum rendert.

### Weitere Einstiegspunkte

| Datei | Zweck |
|---|---|
| `wp-admin/*.php` | Admin, lädt zusätzlich `admin.php` mit `admin_init` |
| `wp-admin/admin-ajax.php` | Legacy-AJAX über `wp_ajax_{action}`; bootet das **komplette Admin** |
| `wp-json/…` (Rewrite → `rest_api_init`) | REST |
| `wp-cron.php` | Pseudo-Cron |
| `xmlrpc.php` | XML-RPC, Legacy |

---

## 9. WP_Query und der Loop

`WP_Query` ist ein **SQL-Builder mit Query-Variablen als DSL**:

```php
new WP_Query([
  'post_type'      => 'event',
  'posts_per_page' => 10,
  'tax_query'      => [['taxonomy' => 'venue', 'field' => 'slug', 'terms' => 'berlin']],
  'meta_query'     => [['key' => 'start', 'value' => date('Y-m-d'), 'compare' => '>=', 'type' => 'DATE']],
  'orderby'        => 'meta_value',
  'meta_key'       => 'start',
  'order'          => 'ASC',
]);
```

Intern:

- `WP_Tax_Query` erzeugt JOINs auf `wp_term_relationships` (mit Unterabfragen bei Hierarchie und `include_children`).
- `WP_Meta_Query` erzeugt **einen JOIN pro Klausel** auf `wp_postmeta` (Aliase `mt1`, `mt2`, …).
- `WP_Date_Query` erzeugt WHERE-Bedingungen auf den Datumsspalten.
- Fast jedes Fragment (`posts_where`, `posts_join`, `posts_orderby`, `posts_clauses`, `posts_request`) ist filterbar. Plugins können das SQL beliebig umschreiben.
- Pagination nutzt `SQL_CALC_FOUND_ROWS` und `FOUND_ROWS()`. `no_found_rows => true` spart das, wenn keine Pagination nötig ist.

### Der Loop

```php
while (have_posts()) {
  the_post();       // setzt global $post, ruft setup_postdata()
  the_title();      // liest global $post
  the_content();    // apply_filters('the_content', …)
}
```

Der Loop ist **implizit zustandsbehaftet**: Die Template Tags lesen globale Variablen (`$post`, `$wp_query`, `$pages`, `$page`, …). Sekundäre Queries müssen danach mit `wp_reset_postdata()` aufgeräumt werden. Das Design stammt aus der Zeit, als Templates schlichte PHP-Includes waren und Funktionen ohne Parameter für Theme-Autoren gedacht waren.

`the_content` selbst ist eine Filterkette: `do_blocks` → `wptexturize` → `wpautop` → `shortcode_unautop` → `prepend_attachment` → `wp_filter_content_tags` (responsive Images, Lazy Loading) → `do_shortcode` → `convert_smilies`. Die Reihenfolge ist über Prioritäten in `default-filters.php` festgelegt.

---

## 10. Das Hook-System

### Mechanik

```php
add_filter('the_title', 'my_title', 10, 2);   // hook, callback, priority, accepted_args
add_action('save_post', 'my_save', 20, 3);

$title = apply_filters('the_title', $title, $post_id);
do_action('save_post', $post_id, $post, $update);
```

- **Actions und Filter sind dasselbe.** `add_action` ruft intern `add_filter` auf. Der einzige Unterschied liegt beim Auslösen: `apply_filters` reicht den Rückgabewert weiter, `do_action` verwirft ihn.
- **Registry:** `$wp_filter[$hook]` ist seit 4.7 ein `WP_Hook`-Objekt (vorher ein verschachteltes Array). Es hält Callbacks nach Priorität sortiert und ist **reentrant**: Hooks dürfen während ihrer eigenen Ausführung Callbacks hinzufügen oder entfernen, und rekursive Auslösung funktioniert. Genau dafür wurde `WP_Hook` gebaut.
- **Priorität:** Integer, Default 10, niedriger läuft früher. Gleiche Priorität läuft in Registrierungsreihenfolge.
- **`accepted_args`:** PHP-Callbacks bekommen nur so viele Argumente wie angegeben, Default 1. Häufige Fehlerquelle.
- **Identität:** `remove_action` braucht dieselbe Callback-Referenz und Priorität. Closures und Methoden anonymer Instanzen sind daher praktisch nicht entfernbar. Intern wird die Identität über `_wp_filter_build_unique_id()` gebildet (Funktionsname bzw. `spl_object_hash` plus Methode).
- **Dynamische Hook-Namen:** `save_post_{$post_type}`, `manage_{$screen}_columns`, `option_{$name}`, `pre_option_{$name}`, `rest_prepare_{$post_type}`. Die Hook-Namen sind String-Templates und damit die eigentliche öffentliche API.
- **Introspektion:** `did_action()`, `doing_action()`, `current_filter()`, `has_filter()`. Der Hook `all` feuert bei jedem Hook, nützlich für Debugging, teuer im Betrieb.

### Charakter des Systems

- **Global und flach.** Ein einziger Namensraum, kein Scoping, kein Kontext. Jedes Plugin sieht und verändert jeden Wert.
- **Push statt Pull.** Der Core entscheidet, *wo* Erweiterung möglich ist, durch das Setzen eines Hooks. Was nicht gehookt ist, ist nicht erweiterbar. Deshalb ist der Core voller Hooks: über 2.000.
- **Reihenfolge per Konvention.** Abhängigkeiten zwischen Plugins werden über Magic Numbers (`PHP_INT_MAX`, `999`) und Ladezeitpunkte gelöst, nicht deklariert.
- **Kein Typvertrag.** Filter-Callbacks können beliebige Typen zurückgeben. Ein Plugin, das `null` statt eines Strings liefert, bricht nachgelagerte Callbacks.

### Pluggable Functions

Ein älterer, zweiter Erweiterungsmechanismus. `pluggable.php` definiert Funktionen mit Guard:

```php
if (!function_exists('wp_mail')) {
  function wp_mail ($to, $subject, $message, $headers = '', $attachments = []) { … }
}
```

Da Plugins vorher geladen werden, kann ein Plugin `wp_mail`, `wp_authenticate`, `wp_set_auth_cookie`, `wp_hash_password` usw. komplett ersetzen. Nachteil: Nur **ein** Plugin kann gewinnen, und zwar das, das zuerst lädt. Neue Pluggables werden seit Jahren nicht mehr eingeführt, stattdessen gibt es `pre_*`-Filter (z. B. `pre_wp_mail`), die einen Kurzschluss erlauben.

### Drop-ins

Dateien direkt in `wp-content/`, die bestimmte Core-Subsysteme ersetzen: `advanced-cache.php`, `object-cache.php`, `db.php`, `db-error.php`, `maintenance.php`, `php-error.php`, `fatal-error-handler.php`, `sunrise.php` (Multisite). Das ist Dependency Injection über Dateikonvention.

---

## 11. Das Plugin-System

### Was ein Plugin ist

Eine PHP-Datei in `wp-content/plugins/` (oder ein Ordner mit einer solchen Datei), deren Kopfkommentar geparst wird:

```php
<?php
/**
 * Plugin Name:       Events
 * Version:           1.2.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Requires Plugins:  advanced-custom-fields
 * Text Domain:       events
 */
```

`get_file_data()` liest die ersten 8 KB per Regex. Es gibt kein Manifest-Format wie `package.json`: Der Header ist das Manifest.

### Lebenszyklus

| Phase | Mechanismus |
|---|---|
| Aktivierung | `register_activation_hook(__FILE__, …)`: läuft einmal in einem eigenen Request; typisch: Tabellen anlegen, Rewrite-Flush, Default-Options |
| Laufzeit | `include` in `wp-settings.php`, Reihenfolge aus der Option `active_plugins` (serialisiertes Array, alphabetisch nach Pfad) |
| Deaktivierung | `register_deactivation_hook` |
| Deinstallation | `uninstall.php` oder `register_uninstall_hook` |
| Updates | über die API von wordpress.org oder eigene Update-Server per Filter `pre_set_site_transient_update_plugins` |

**Must-Use-Plugins** (`wp-content/mu-plugins/`) werden immer geladen, vor normalen Plugins, ohne Aktivierung. Nur Dateien direkt im Ordner, keine Unterordner. Das ist Infrastruktur-Code, der nicht deaktivierbar sein soll.

### Eigenschaften

- **Keine Isolation.** Alle Plugins laufen im selben PHP-Prozess, im selben globalen Namensraum, mit vollem DB-Zugriff. Konflikte entstehen bei Funktions- und Klassennamen (daher Präfixe und Namespaces), bei gleichen Hooks und bei gebündelten Libraries: Zwei Plugins bringen dieselbe Composer-Abhängigkeit in verschiedenen Versionen mit, die zuerst geladene gewinnt. Daher Werkzeuge wie PHP-Scoper und Strauss, die Vendor-Namespaces umschreiben.
- **Abhängigkeiten.** Bis 6.4 gar nicht, seit 6.5 `Requires Plugins` mit **Slugs ohne Versionsangaben**. WordPress verhindert nur die Aktivierung ohne vorhandene Abhängigkeit und die Deaktivierung einer benötigten.
- **Fehler-Isolation.** Seit 5.2 fängt der **Recovery Mode** Fatal Errors ab, pausiert das verursachende Plugin für den Admin und schickt einen Login-Link per Mail.
- **Kein Lade-Scoping.** Ein Plugin, das nur im Admin gebraucht wird, lädt trotzdem im Frontend, es sei denn, es prüft selbst `is_admin()`.
- **Verteilung.** Das Verzeichnis auf wordpress.org läuft über SVN, nicht Git. Releases werden über Tags und `Stable tag` in der `readme.txt` gesteuert.

### Die Ökonomie dahinter

Das Plugin-System ist technisch simpel, aber organisatorisch extrem erfolgreich: Die Einstiegshürde ist eine PHP-Datei mit einem Kommentar. Kombiniert mit der Garantie, dass Hooks praktisch nie entfernt werden, entstand ein Ökosystem mit über 60.000 Plugins im Verzeichnis. Die Rückwärtskompatibilität ist kein Nebeneffekt, sondern die tragende Säule dieses Ökosystems und zugleich der Grund, warum der Core seine Architektur kaum ändern kann.

---

## 12. Themes: Template-Hierarchie bis Block Themes

### Klassische Themes (seit 1.5)

- `style.css` mit Header (`Theme Name`, `Template` für Child Themes)
- `functions.php`: ein Plugin, das nur geladen wird, solange das Theme aktiv ist
- PHP-Templates nach Hierarchie, Template Parts über `get_template_part('content', 'event')`
- `add_theme_support()` für Features: `post-thumbnails`, `title-tag`, `html5`, `custom-logo`, …
- Theme-Einstellungen als `theme_mods_{stylesheet}` in den Options

**Child Themes:** Die Template-Suche läuft erst im Child (`STYLESHEETPATH`), dann im Parent (`TEMPLATEPATH`). `functions.php` beider wird geladen, die des Childs zuerst. Das ist Vererbung über Dateisystem-Fallback.

### Block Themes (seit 5.9)

```
theme/
├─ style.css
├─ theme.json
├─ templates/        index.html, single.html, single-event.html, …
├─ parts/            header.html, footer.html
├─ patterns/         *.php mit Header-Kommentar
└─ styles/           Stil-Varianten als JSON
```

- Templates sind **HTML mit Block-Kommentaren**, kein PHP. Die Hierarchie bleibt dieselbe, nur die Dateiendung wechselt.
- Wird ein Template im Site Editor geändert, entsteht ein Post `wp_template` mit Term `wp_theme = {slug}`. Er überschreibt die Datei, „Zurücksetzen“ löscht ihn wieder. Die **Datei ist der Default, die DB das Override.**
- **`theme.json`** ist eine deklarative Konfiguration: Paletten, Typo-Skalen, Spacing, Layout-Breiten, Block-Stile und welche Einstellungen im Editor freigegeben sind. Daraus generiert der Core **CSS Custom Properties** (`--wp--preset--color--primary`) und Utility-Klassen. Die Daten werden geschichtet zusammengeführt: Core → Theme → Child → Stil-Variante → Nutzer (`wp_global_styles`-Post).

Damit hat WordPress das Prinzip „Defaults in Dateien, Overrides in der DB, Merge zur Laufzeit“ auf das gesamte Design übertragen.

---

## 13. Gutenberg: Blöcke als Datenformat

### Serialisierung

Blöcke werden **nicht als JSON** gespeichert, sondern als HTML mit Kommentar-Delimitern in `post_content`:

```html
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Titel</h3>
<!-- /wp:heading -->

<!-- wp:acf/event-card {"name":"acf/event-card","data":{"start":"2026-10-20"}} /-->
```

- Der Kommentar trägt **Name und Attribute als JSON**. Das HTML dazwischen ist das gespeicherte Rendering.
- Ohne Parser bleibt der Inhalt gültiges, lesbares HTML, Kommentare sind unsichtbar. Graceful Degradation bei Feeds, alten Plugins, Export, Deaktivierung.
- `parse_blocks()` (PHP) und `@wordpress/block-serialization-default-parser` (JS) liefern einen Baum aus `blockName`, `attrs`, `innerBlocks`, `innerHTML`, `innerContent`.
- Attribute können per `source` aus dem HTML selbst gelesen werden (`"source": "html", "selector": "h3"`). Dann stehen sie nicht im Kommentar. Das HTML ist die Quelle der Wahrheit.

### Statische und dynamische Blöcke

| | statisch | dynamisch |
|---|---|---|
| Rendering | im Editor per `save()` (JS), Ergebnis wird gespeichert | serverseitig bei jeder Ausgabe (`render_callback` oder `render.php`) |
| gespeichert | vollständiges HTML | meist nur der Kommentar |
| Änderung am Markup | **Block Validation**: Weicht `save()` vom gespeicherten HTML ab, ist der Block „ungültig“ und braucht `deprecated`-Migrationen | wirkt sofort überall |

Die Validierung ist der Preis des Formats: Jede Änderung an `save()` braucht eine Deprecation-Kette, damit alte Inhalte noch geparst werden. Viele Plugin-Autoren rendern daher bevorzugt dynamisch.

### Registrierung über `block.json`

```json
{
  "apiVersion": 3,
  "name": "pulgasari/event-card",
  "title": "Event Card",
  "category": "widgets",
  "attributes": { "start": { "type": "string" } },
  "supports": { "color": { "background": true }, "spacing": { "padding": true } },
  "editorScript": "file:./index.js",
  "render": "file:./render.php",
  "viewScriptModule": "file:./view.js"
}
```

Dieselbe Datei wird von PHP (`register_block_type(__DIR__)`) und JS gelesen. **`supports`** lässt Core-Features (Farbe, Spacing, Typo) deklarativ zuschalten; der Core erzeugt UI, Attribute, Klassen und Styles. Das ist Komposition über Konfiguration statt über Code.

### Block Bindings (6.5)

Attribute bestimmter Core-Blöcke (Paragraph, Heading, Image, Button) können an Quellen gebunden werden:

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"start"}}}}} -->
<p></p>
<!-- /wp:paragraph -->
```

Damit kann ein Template Postmeta direkt anzeigen, ohne eigenen Block. Eigene Quellen registriert man mit `register_block_bindings_source()`. ACF bringt seit 6.x eine eigene Quelle mit. Das ist der Core-Ersatz für viel klassisches `the_field()`-Templating.

### Interactivity API (6.5)

Ein serverseitig gerendertes, **direktivenbasiertes** Frontend-Framework:

```html
<div data-wp-interactive="events" data-wp-context='{"open":false}'>
  <button data-wp-on--click="actions.toggle" data-wp-bind--aria-expanded="context.open">Mehr</button>
  <p data-wp-bind--hidden="!context.open">…</p>
</div>
```

```js
import { store, getContext } from '@wordpress/interactivity';

store('events', {
  actions: {
    toggle () { const context = getContext(); context.open = !context.open; },
  },
});
```

- Die Direktiven werden **in PHP vorgerendert** (`wp_interactivity_process_directives()`, gebaut auf der HTML API), sodass der initiale Zustand ohne JS korrekt im HTML steht. Im Browser hydriert eine kleine Runtime (Preact plus Signals) dieselben Direktiven.
- Stores sind global per Namespace, Blöcke verschiedener Plugins können Zustand teilen.
- Geladen über **Script Modules** (`wp_register_script_module`, Import Maps im Core seit 6.5).

Konzeptionell ist das nah an Alpine, htmx, `_hyperscript` und domina: HTML trägt Verhalten über Attribute, der Server rendert den Zustand mit.

### HTML API (6.2+)

`WP_HTML_Tag_Processor` (6.2) ist ein **streamender, spezifikationskonformer Tokenizer** in PHP, mit dem Tags gefunden und Attribute oder Klassen geändert werden, ohne DOMDocument und ohne Regex. `WP_HTML_Processor` (6.4+) ergänzt Teile des HTML5-Tree-Construction-Algorithmus (Breadcrumbs, Verschachtelung). Er ersetzt im Core nach und nach Regex-basierte HTML-Manipulation, etwa beim Hinzufügen von Klassen durch Block Supports oder bei Lazy-Loading-Attributen.

---

## 14. REST API

- Infrastruktur seit 4.4, Inhalts-Endpunkte seit 4.7, Basis `/wp-json/`.
- **Discovery:** `GET /wp-json/` listet alle Namespaces und Routen samt Schema. Jede Route beantwortet `OPTIONS` mit ihrem JSON Schema.
- **Controller-Muster:** `WP_REST_Posts_Controller` und Co. mit `get_items`, `get_item`, `create_item`, `update_item`, `delete_item`, `prepare_item_for_response` und `get_item_schema`. CPTs mit `show_in_rest` bekommen ihn automatisch.
- **Eigene Routen:**
  ```php
  register_rest_route('events/v1', '/upcoming', [
    'methods'             => 'GET',
    'callback'            => 'events_upcoming',
    'permission_callback' => '__return_true',
    'args'                => ['limit' => ['type' => 'integer', 'default' => 10]],
  ]);
  ```
- **HAL-artige Links:** `_links` in jeder Antwort, `?_embed` löst sie serverseitig auf. `?_fields=id,title` reduziert die Antwort.
- **Authentifizierung:**
  - Cookie plus Nonce (`X-WP-Nonce`) für eigene Seiten;
  - Application Passwords (5.6) über Basic Auth für externe Clients;
  - OAuth oder JWT nur per Plugin.
- **Batch:** `/batch/v1` (5.6) für mehrere Requests in einem.
- **Erweiterung:** `register_rest_field()` fügt Felder an bestehende Antworten an, `rest_prepare_{post_type}` filtert Antworten.

Der Block-Editor ist vollständig ein REST-Client. Ohne die REST API wäre Gutenberg nicht möglich gewesen; deren Einführung war die Voraussetzung.

**WPGraphQL** (Plugin) bildet dasselbe Datenmodell als GraphQL-Schema ab und ist die Basis vieler Headless-Setups (Faust.js, Next.js-Frontends).

---

## 15. Rechte: Rollen, Capabilities, map_meta_cap

- **Rollen** sind benannte Capability-Sets. Sie sind gespeichert in der Option `wp_user_roles` (serialisiert) und **nicht im Code**: `add_role()` und `add_cap()` schreiben in die DB. Deshalb gehören sie in Aktivierungs-Hooks, nicht nach `init`.
- **Nutzer** haben Rollen und Einzel-Capabilities in `wp_usermeta` unter `{prefix}capabilities` (serialisiertes Array) und `{prefix}user_level` (Legacy aus 1.5).
- **Primitive vs. Meta-Capabilities:**
  - Primitiv: `edit_posts`, `edit_others_posts`, `publish_posts`, `manage_options`, …
  - Meta: `edit_post`, `delete_post`, `read_post`, `edit_user`. Sie beziehen sich auf ein **konkretes Objekt** und werden durch **`map_meta_cap()`** in primitive übersetzt:
    ```
    current_user_can('edit_post', 42)
      → Post 42 gehört jemand anderem und ist veröffentlicht
      → ['edit_others_posts', 'edit_published_posts']
      → alle vorhanden?
    ```
- Der Filter `map_meta_cap` ist der zentrale Punkt für objektbezogene Rechte. `user_has_cap` filtert das Ergebnis.
- CPTs mit `capability_type` und `map_meta_cap => true` erhalten eigene primitive Caps (`edit_events`), die man Rollen zuweisen muss. Sonst kann nur der Admin sie bearbeiten. Das ist eine typische Falle.

Das System ist **RBAC mit einer Abbildungsschicht für objektbezogene Rechte**. Es gibt kein ACL pro Objekt; Feinrechte entstehen nur über Mapping-Logik in PHP.

---

## 16. Options, Transients, Object Cache, Cron, Nonces

### Options

`wp_options` (`option_name`, `option_value`, `autoload`) ist der globale Key-Value-Store für alles: Einstellungen, Plugin-Zustände, Rewrite-Regeln, Cron-Plan, Rollen, Widgets, Theme Mods.

- **Autoload:** Alle Options mit Autoload werden bei jedem Request in **einem** Query geladen (`wp_load_alloptions()`) und im Cache gehalten. Seit 6.6 gibt es die Werte `on`, `off` und `auto` (vorher `yes`/`no`). Bei `auto` entscheidet der Core anhand der Größe, große Werte werden nicht mehr automatisch geladen.
- `get_option()` filterbar über `pre_option_{name}` (Kurzschluss) und `option_{name}` (Nachbearbeitung).
- **Settings API** (`register_setting`, `add_settings_section`, `add_settings_field`): deklarative Formulare für Admin-Einstellungsseiten.

### Transients

`set_transient($key, $value, $ttl)`: Cache mit Ablauf.

- **Ohne** persistenten Object Cache: zwei Options (`_transient_{key}`, `_transient_timeout_{key}`).
- **Mit** persistentem Object Cache: direkt im Cache, nicht in der DB.

Abgelaufene Transients werden **lazy** beim nächsten Lesen oder per täglichem Cron gelöscht. Transients sind ein Cache-Hinweis, keine Garantie: Mit Redis können sie jederzeit verdrängt werden.

### Object Cache

`wp_cache_get`, `wp_cache_set` und Co. (Gruppen, Keys, TTL). Der Standard `WP_Object_Cache` ist ein **PHP-Array, das nur während des Requests lebt**. Er verhindert doppelte Queries innerhalb eines Requests, nicht über Requests hinweg. Erst ein Drop-in `object-cache.php` (Redis, Memcached, APCu) macht ihn persistent. Core, `WP_Query`, Meta- und Term-Caches bauen alle darauf auf. Ein persistenter Object Cache ist der wichtigste Performance-Hebel für dynamische Seiten.

### WP-Cron

- Pseudo-Cron: Der Plan liegt in der Option `cron` (serialisiert).
- Bei jedem Seitenaufruf prüft `wp_cron()`, ob etwas fällig ist, und stößt dann einen **nicht-blockierenden HTTP-Request auf sich selbst** (`wp-cron.php`) an.
- Ohne Traffic läuft nichts, bei viel Traffic wird ständig geprüft. Produktiv: `DISABLE_WP_CRON` setzen und echten System-Cron auf `wp-cron.php` oder `wp cron event run --due-now` legen.
- API: `wp_schedule_event($timestamp, 'hourly', 'my_hook')`, eigene Intervalle per Filter `cron_schedules`. Für robuste Jobs mit Queue und Retries gibt es Action Scheduler (aus WooCommerce, eigene Tabellen).

### Nonces

WordPress-Nonces sind **keine echten Nonces** (keine Einmal-Tokens). Sie sind ein HMAC aus Aktion, User-ID, Session-Token und einem **Zeit-Tick** (12 Stunden), gültig für zwei Ticks, also bis 24 Stunden. Sie schützen gegen CSRF, nicht gegen Replay, und ersetzen keine Rechteprüfung (`current_user_can`).

---

## 17. ACF und die Custom-Field-Plugins

> Zu „ACP“: Gemeint ist hier vermutlich ACF (Advanced Custom Fields). Falls **Admin Columns Pro** gemeint war, siehe den Abschnitt [Admin Columns Pro](#admin-columns-pro) unten.

### Herkunft und Besitzverhältnisse

| Jahr | |
|---|---|
| 2011 | Elliot Condon veröffentlicht ACF; später ACF PRO als kommerzielle Variante (Repeater, Flexible Content, Gallery, Options Pages, Blöcke) |
| 2021 | Delicious Brains übernimmt ACF |
| 2022 | WP Engine übernimmt die Plugins von Delicious Brains, darunter ACF |
| Okt. 2024 | Im Konflikt zwischen Automattic/Matt Mullenweg und WP Engine übernimmt wordpress.org den ACF-Eintrag im Plugin-Verzeichnis und forkt ihn als **Secure Custom Fields (SCF)**. WP Engine verteilt ACF seitdem über eigene Kanäle. Gleiche Codebasis, getrennte Entwicklung. |

### Was ACF technisch ist

ACF fügt dem Core nichts hinzu, was er nicht schon hätte. Es ist ein **Schema-Editor und UI-Generator für Postmeta**, gebaut aus Core-Bausteinen.

**Die Definitionen sind selbst Posts:**

| Objekt | Speicherung (ACF 5+) |
|---|---|
| Field Group | Post `acf-field-group`, Regeln und Einstellungen serialisiert in `post_content` |
| Field | Post `acf-field`, `post_parent` = Gruppe oder Elternfeld, Einstellungen serialisiert in `post_content`, `post_name` = Field Key (`field_64f…`), `post_excerpt` = Feldname |
| Post Types und Taxonomien (ACF 6.1+) | Posts `acf-post-type`, `acf-taxonomy`; ACF ruft damit `register_post_type()` auf |
| Options Pages (6.2+) | Post `acf-ui-options-page` |

In ACF 4 lagen Felder noch als Postmeta der Gruppe. Der Umbau zu eigenen Posts in ACF 5 folgte genau dem Core-Muster „alles ist ein Post“.

**Die Werte sind Paare von Postmeta:**

```
meta_key   meta_value
start      20261020
_start     field_64f1a2b3c4d5e
```

Der Unterstrich-Eintrag ist die **Referenz auf die Felddefinition**. Ohne sie weiß ACF nicht, welcher Feldtyp den Wert formatieren soll; `get_field('start')` sucht den Key sonst über den Namen, was bei gleichnamigen Feldern scheitern kann. Werte werden **ungeformt** gespeichert (Datum als `Ymd`, Bild als Attachment-ID, Relationship als serialisiertes ID-Array) und erst beim Lesen formatiert (`format_value`).

**Repeater und Flexible Content werden flachgeklopft:**

```
speakers                  2                           Anzahl der Zeilen
_speakers                 field_aaa
speakers_0_name           Ada
_speakers_0_name          field_bbb
speakers_0_talk           Engines
_speakers_0_talk          field_ccc
speakers_1_name           Grace
_speakers_1_name          field_bbb
…
```

Flexible Content speichert zusätzlich ein serialisiertes Array der Layout-Namen in der Zeilenreihenfolge. Ein Repeater mit 20 Zeilen und 5 Subfeldern erzeugt **202 Meta-Zeilen**, die über den Meta-Cache bei jedem Laden des Posts komplett gelesen werden. Abfragen auf Subfelder per `meta_query` brauchen `LIKE`-Muster auf `meta_key` (`speakers_%_name`).

**Andere Speicherorte:**

| Kontext | Speicherung |
|---|---|
| Terms | `wp_termmeta` |
| Nutzer | `wp_usermeta` |
| Options Pages | `wp_options` mit `options_{name}` und `_options_{name}` |
| ACF-Blöcke | Werte als JSON **im Block-Kommentar** (`"data":{…}`), nicht in Meta. Ausnahme: Seit ACF 6.x lässt sich pro Block Speichern in Postmeta zuschalten. |

**Local JSON und PHP-Registrierung:**

- Liegt im Theme ein Ordner `acf-json/`, schreibt ACF jede Gruppe beim Speichern zusätzlich als JSON-Datei dorthin und lädt sie bevorzugt von dort. Damit werden Feld-Schemata **versionierbar**, und die DB-Lookups für Definitionen entfallen. Ein Sync-UI zeigt Abweichungen zwischen Datei und DB.
- `acf_add_local_field_group([...])` registriert Gruppen rein im Code, ohne DB.

Das ist dasselbe Prinzip wie bei Block Themes: Datei als Default, DB als Override.

### Warum ACF so prägend war

Vor ACF bedeutete „eigene Felder“ eigene Meta-Boxen: `add_meta_box`, HTML-Formular, Nonce-Prüfung und `update_post_meta` in `save_post`, pro Feld. ACF machte daraus eine deklarative Konfiguration mit UI und Location Rules (anzeigen, wenn Post-Type = X und Template = Y). Zusammen mit CPTs und Taxonomien wurde WordPress dadurch für Nicht-Entwickler zu einem **Datenmodellierungs-Werkzeug**. Genau die Erfahrung, „wie komplex man konstruieren konnte“, entsteht dort: Man baut ein relationales Modell (Typen, Relationen über Relationship-Felder und Taxonomien, Attribute) auf einem EAV-Speicher, ohne SQL zu sehen.

### Alternativen und ihre Speicherstrategien

| Plugin | Besonderheit |
|---|---|
| **Meta Box** | Code-first, optional **eigene Tabellen** pro Feldgruppe (MB Custom Table): echte Spalten statt EAV |
| **Pods** | eigene Tabellen pro Pod möglich, Relationen als eigene Tabelle, eigene Query-Sprache |
| **Carbon Fields** | Code-first, Container-Konzept, komplexe Felder ebenfalls flachgeklopft |
| **CMB2** | minimalistische Bibliothek für Meta-Boxen, Code-only |
| **Toolset** | CPTs, Felder, Relationen, Views als Komplettpaket; Relationen in eigenen Tabellen |
| **Core** | `register_post_meta` + Block Bindings + Editor-Panels in JS: der Weg, den der Core selbst langsam geht |

### Admin Columns Pro

Falls ACP gemeint war: Admin Columns Pro konfiguriert die **Listenansichten im Admin** (Spalten, Sortierung, Filter, Inline-Editing, Export) per UI. Technisch nutzt es die Core-Hooks der List Tables:

```php
add_filter('manage_event_posts_columns', fn ($columns) => $columns + ['start' => 'Start']);
add_action('manage_event_posts_custom_column', function ($column, $id) {
  if ($column === 'start') echo esc_html(get_post_meta($id, 'start', true));
}, 10, 2);
add_filter('manage_edit-event_sortable_columns', fn ($columns) => $columns + ['start' => 'start']);
add_action('pre_get_posts', function ($query) {
  if (is_admin() && $query->is_main_query() && $query->get('orderby') === 'start') {
    $query->set('meta_key', 'start');
    $query->set('orderby', 'meta_value');
  }
});
```

ACP erzeugt dieses Muster generisch für jeden Feldtyp, inklusive ACF-Felder. Die Konfiguration wird in Options gespeichert, bei ACP-Versionen ab 6 optional in einer eigenen Tabelle. Sortieren und Filtern nach Meta erben die Kosten aus [6](#6-meta-das-eav-fundament): JOIN plus Scan auf `meta_value`.

---

## 18. Performance: die bekannten Engstellen

| Engstelle | Ursache | Gegenmittel |
|---|---|---|
| **`meta_query` mit mehreren Klauseln** | ein Self-JOIN auf `wp_postmeta` pro Klausel; `meta_value` nicht indiziert, Vergleich per `CAST` | häufig gefilterte Werte als **Taxonomie** modellieren (indizierte Relation); eigene Tabelle; Suchindex (ElasticPress) |
| **Sortieren nach Meta** | `ORDER BY CAST(meta_value …)` erzwingt Filesort über alle Kandidaten | Wert denormalisieren (z. B. in `menu_order`), eigene Tabelle |
| **Repeater und Flexible Content** | Hunderte Meta-Zeilen pro Post, der Meta-Cache lädt alle | wenige Zeilen pro Post, große Strukturen als JSON in eine Meta-Zeile oder in Blöcke |
| **Autoload-Bloat** | Plugins speichern große Arrays mit Autoload, jede Seite lädt sie | Autoload `off`/`auto` (6.6+), Site Health warnt ab ca. 800 KB |
| **Kein persistenter Object Cache** | jede Anfrage startet bei null | Redis/Memcached-Drop-in |
| **`admin-ajax.php`** | bootet das komplette Admin für jede AJAX-Anfrage | REST-Endpunkte, die nur das Nötige laden |
| **WP-Cron per Pageview** | Prüfung und Loopback-Request im Nutzer-Request | `DISABLE_WP_CRON` plus System-Cron |
| **Alle Plugins pro Request** | kein Lazy Loading | Plugins schlank halten, Code hinter Bedingungen; MU-Plugin, das Plugins pro Route ausschließt (Filter `option_active_plugins`) |
| **`posts_per_page => -1`** | unbegrenzte Ergebnismengen, alle Meta-Zeilen werden geladen | paginieren, `fields => 'ids'`, `no_found_rows`, `update_post_meta_cache => false` |
| **`SQL_CALC_FOUND_ROWS`** | zählt die ganze Ergebnismenge mit | `no_found_rows => true`, wenn keine Pagination gebraucht wird |
| **Revisionen** | unbegrenzt viele pro Post | `WP_POST_REVISIONS` begrenzen |

Grundmuster: WordPress ist schnell bei **Zugriffen per ID und Slug** und bei **Taxonomie-Abfragen**. Langsam wird es bei **Abfragen über Attributwerte**, weil das EAV-Modell dafür nicht gebaut ist. Der Ausweg liegt fast immer im Datenmodell, nicht im Caching.

---

## 19. Lehren für Lib- und Framework-Design

**1. Generische Entitäten plus Diskriminator skalieren über Jahrzehnte.**

`wp_posts` mit `post_type` hat zwanzig Jahre Featurewachstum ohne Schemaänderung getragen. Jedes neue Feature erbt Revisionen, Rechte, Query, REST und Export. Der Preis: Constraints, Typen und Performance für Attributabfragen. Für eine Lib heißt das: Eine kleine Zahl generischer Grundtypen mit Typ-Tag und gemeinsamer Infrastruktur ist oft tragfähiger als viele spezialisierte Typen.

**2. Normalisierung nur entlang echter Unterscheidungen.**

Die Trennung `wp_terms` / `wp_term_taxonomy` modellierte eine Unterscheidung (Wort vs. Verwendung), die die Domäne nicht hatte. Der Rückbau dauerte drei Major-Versionen und braucht bis heute Kompatibilitätscode. Eine Abstraktionsebene, die niemand adressiert, wird zur Last.

**3. Schema als Laufzeit-Registrierung.**

`register_post_type`, `register_meta`, `register_block_type`, `register_rest_route`: Struktur wird als **Daten** beschrieben und in einer Registry gesammelt. Aus derselben Beschreibung entstehen UI, API, Schema und Doku. Dasselbe Prinzip steckt in `d.api` von `@domina/chain`: Methoden als Definitionen mit `params`, auslesbar für Tooling. Wichtig ist, dass die Registry die **einzige** Quelle ist, aus der alles abgeleitet wird.

**4. Hooks: maximale Erweiterbarkeit, minimale Garantie.**

Benannte Erweiterungspunkte an jeder Stelle machen ein System offen, ohne dass der Core die Erweiterungen kennen muss. Dafür ist der Kontrollfluss nicht mehr lokal lesbar, die Reihenfolge wird über Zahlen ausgehandelt, und es gibt keinen Typvertrag. Für eine Lib besser:

- wenige, dokumentierte Erweiterungspunkte;
- explizite Reihenfolge oder Komposition (Middleware-Kette statt Prioritätszahlen);
- Rückgabetypen festlegen;
- Entfernbarkeit über zurückgegebene Disposer statt über Callback-Identität, wie `listen()` in `@domina/chain`.

**5. Hook-Namen sind öffentliche API.**

Sobald ein Event-Name existiert, hängen Dritte daran. WordPress kann `save_post` nie umbenennen. Event- und Hook-Namen gehören in dieselbe Stabilitätskategorie wie Funktionssignaturen.

**6. Datei als Default, Speicher als Override.**

Block-Templates, `theme.json` und Global Styles sowie ACF Local JSON folgen demselben Muster: versionierbare Defaults im Code, Nutzeränderungen als Overlay, Merge zur Laufzeit, „Zurücksetzen“ = Overlay löschen. Das Muster lässt sich auf Konfigurationssysteme jeder Art übertragen.

**7. Serialisierungsformate mit Graceful Degradation.**

Das Block-Format ist gültiges HTML, auch wenn niemand es parst. Strukturierte Daten in Kommentaren oder Attributen eines ohnehin darstellbaren Formats bleiben robust gegenüber Tools, die die Struktur nicht kennen. Kehrseite: Zwei Wahrheiten (Attribute und gerendertes HTML) müssen synchron bleiben, daher die Block Validation.

**8. Rückwärtskompatibilität als Produktentscheidung.**

WordPress entfernt praktisch nichts (`_deprecated_function` loggt nur). Das Ökosystem verlässt sich darauf; dadurch ist die Plattform langlebig und der Core zugleich architektonisch eingefroren. Für eine Lib ist das eine bewusste Abwägung: lieber früh eine kleine, stabile Oberfläche als später eine große, die man nicht mehr bewegen kann.

**9. Implizite globale Zustände skalieren nicht.**

Der Loop mit `global $post` war für Theme-Autoren bequem und ist bis heute die häufigste Fehlerquelle (verschachtelte Queries, vergessenes `wp_reset_postdata`). Explizite Übergabe (`get_the_title($post)`) ist der robustere Weg. Die Block-Ära geht ihn mit Block-Context (`usesContext`, `providesContext`) konsequenter.

---

## Quellen

- WordPress Developer Resources: [developer.wordpress.org](https://developer.wordpress.org/) (Plugin Handbook, Theme Handbook, Block Editor Handbook, REST API Handbook, Code Reference)
- Datenbankschema: [Database Description](https://codex.wordpress.org/Database_Description)
- Shared-Term-Splitting: [make.wordpress.org/core, „Splitting Shared Terms“ (2015)](https://make.wordpress.org/core/2015/02/16/taxonomy-term-splitting-in-4-2-a-developer-guide/)
- Versionsgeschichte: [wordpress.org/documentation/wordpress-versions](https://wordpress.org/documentation/wordpress-versions/), [versionlog.com/wordpress](https://versionlog.com/wordpress/)
- WordPress 7.0 und 7.1: [wordpress.org/news](https://wordpress.org/news/), [make.wordpress.org Release-Pläne](https://make.wordpress.org/core/), [dreamhost.com/blog/wordpress-7-0](https://www.dreamhost.com/blog/wordpress-7-0/), [docs.pantheon.io Release Notes](https://docs.pantheon.io/release-notes)
- ACF: [advancedcustomfields.com/resources](https://www.advancedcustomfields.com/resources/); Secure Custom Fields: [wordpress.org/plugins/secure-custom-fields](https://wordpress.org/plugins/secure-custom-fields/)
