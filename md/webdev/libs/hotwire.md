# Hotwire

Ein Ansatz für Web-Anwendungen, bei dem der Server HTML statt UI-Daten als JSON liefert. Von Basecamp, heute 37signals, Ende 2020 vorgestellt. Hotwire ist kein einzelnes npm-Paket: **Turbo** übernimmt Navigation und HTML-Updates, **Stimulus** lokales Verhalten, **Hotwire Native** die Einbettung in mobile Apps. Aktuell Turbo 8.0.23 (Januar 2026), Stimulus 3.2.2 (August 2023); Stand Oktober 2026.

- Website: https://hotwired.dev
- Repositories: https://github.com/hotwired/turbo und https://github.com/hotwired/stimulus
- Laufzeit: Browser, dazu ein Server für HTML-Antworten; nicht an Rails gebunden
- Build: keiner zwingend nötig, Browser-Bundles oder Import Maps möglich

## Das Problem, das Hotwire löst

Eine servergerenderte Anwendung hat Templates, Formulare und URLs bereits. Wird daraus eine SPA, müssen Darstellung und Zustandsübergänge häufig noch einmal im Browser nachgebaut werden, dazu APIs und Synchronisierung.

Hotwire behält die Templates auf dem Server und verbessert die Navigation im Browser. Für viele Oberflächen reicht das: Formulare schicken Daten, der Server liefert HTML, der Browser ersetzt oder ergänzt den passenden Bereich. [htmx](htmx.md) verfolgt eine ähnliche Grundidee mit einer anderen Attribut- und Request-API.

## Kernkonzepte

### 1. Turbo Drive

```html
<a href="/projects">Projekte</a>
<a href="/download" data-turbo="false">Download</a>
```

Turbo übernimmt geeignete Links und Formulare, lädt die Antwort und aktualisiert die Seite ohne vollständigen Browser-Neustart. History und Navigation gehören zum Modell. Ein langlebiges Dokument bedeutet zugleich, dass Skripte nicht bei jedem Besuch von null anfangen.

### 2. Frames als abgegrenzte Navigation

```html
<turbo-frame id="messages" src="/messages">
  <p>Lädt …</p>
</turbo-frame>
```

Die Antwort liefert einen Frame mit derselben ID. Links und Formulare innerhalb des Frames aktualisieren normalerweise diesen Bereich. Ein Frame ist eine Navigationsgrenze, kein beliebiger CSS-Selektor für einen Swap.

### 3. Streams als HTML-Kommandos

```html
<turbo-stream action="append" target="messages">
  <template><p id="message_42">Hallo</p></template>
</turbo-stream>
```

Streams beschreiben Aktionen wie `append`, `replace`, `update` oder `remove`. Sie können als Antwort auf eine Formularübermittlung oder über eine dauerhafte Verbindung ankommen. „Stream“ bezeichnet hier das Nachrichtenformat; WebSocket ist nicht für jede Verwendung erforderlich.

### 4. Stimulus verbindet Verhalten mit HTML

```html
<div data-controller="counter">
  <button data-action="click->counter#increment">+1</button>
  <output data-counter-target="value">0</output>
</div>
```

```js
import { Application, Controller } from '@hotwired/stimulus';

class Counter extends Controller {
  static targets = ['value'];
  increment() {
    this.valueTarget.textContent = String(Number(this.valueTarget.textContent) + 1);
  }
}

Application.start().register('counter', Counter);
```

Targets geben benannte DOM-Verweise, Actions verbinden Events und Methoden. Values können typisierte Datenattribute abbilden. Controller leben am HTML und werden beim Einfügen oder Entfernen verbunden und getrennt.

### 5. Morphing und persistente Elemente

Turbo 8 kann Seiten-Refreshes über Morphing ausführen. `data-turbo-permanent` kennzeichnet mit stabiler ID Elemente, die Navigation überstehen sollen. Das ist für Player oder andere lokale Zustände wichtig; es ist keine allgemeine Garantie, dass beliebige JavaScript-Objekte serialisiert werden.

## Wie es intern arbeitet

Turbo fängt Navigation ab, lädt HTML, verarbeitet die Antwort und verwaltet Besuche samt History und Cache. Frames extrahieren den passenden Teil, Streams interpretieren deklarierte DOM-Aktionen. Bei Morphing wird vorhandener DOM-Zustand möglichst erhalten, statt alles zu ersetzen; siehe [morphdom / idiomorph](morphdom.md).

Stimulus beobachtet über MutationObserver relevante Änderungen an Attributen und Elementen. Daraus entstehen Controller-Lebenszyklen und Target-Zuordnungen. Der Server bleibt für die fachliche Darstellung zuständig, Controller ergänzen örtlich begrenzte Interaktion.

## Stärken und Schwächen

- **Stark:** bestehende Server-Templates bleiben nutzbar, wenig selbst geschriebener Browsercode, normale URLs und Formulare als Grundlage. Gut für datenbankgetriebene Oberflächen.
- **Schwach:** viele Aktionen warten auf das Netzwerk. Offline-Arbeit und komplexe lokale Editoren brauchen zusätzliche Architektur; das langlebige Dokument verlangt sauberes Aufräumen und einen bewussten Umgang mit Caches.

## Für rat und aufbau

- **Stimulus ist ein Vergleich für Behaviors:** Verhalten hängt an vorhandenem HTML, ohne dessen gesamten Baum zu besitzen. Für rat wären explizite Targets und ein klarer Abbauvertrag übertragbar (Vorschlag).
- **Server-Fragmente und Signals sind verschiedene Grenzen:** HTML kann einen Bereich ersetzen; lokale Signals sollten dabei nicht unbeabsichtigt neu entstehen. Besitz und Lebensdauer müssen vor einer Integration festgelegt werden.
- **Persistenz braucht Identität:** Stabile IDs und bewusst ausgesparte Teilbäume sind für eingebettete aufbau-Editoren wichtiger als eine pauschale Morphing-Zusage.
- **Nicht jede Interaktion gehört auf den Server:** Ein lokaler rat-Zähler braucht keinen Request. Hotwire zeigt vor allem, wie Navigation und serverseitige Darstellung ergänzt werden können.

Quellen: [Hotwire](https://hotwired.dev/), [Turbo-Handbuch](https://turbo.hotwired.dev/handbook/introduction), [Stimulus-Handbuch](https://stimulus.hotwired.dev/handbook/introduction), [Turbo-Version](https://registry.npmjs.org/@hotwired/turbo/latest), [Stimulus-Version](https://registry.npmjs.org/@hotwired/stimulus/latest). Stand: 17. Oktober 2026.
