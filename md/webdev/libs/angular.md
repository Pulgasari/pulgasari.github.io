# Angular

Ein vollständiges Framework für Web-Anwendungen, vom Angular-Team bei Google. Seit 2016 als Angular (Version 2), nach AngularJS von 2010; die beiden sind technisch verschiedene Systeme. Aktuell 22.2.3 (Oktober 2026), aktiv. Komponenten, Templates, Dependency Injection, Routing, Formulare und Server-Rendering gehören zum selben Werkzeugkasten. Das heutige Angular setzt auf Standalone-Komponenten und Signals, nicht mehr auf NgModules als Einstieg.

- Website: https://angular.dev
- Repository: https://github.com/angular/angular
- Abhängigkeiten: mehrere Angular-Pakete, RxJS je nach Einsatz; Zone.js für zoneless Anwendungen nicht nötig
- Build: ja, gewöhnlich über die Angular CLI und den Template-Compiler

## Das Problem, das Angular löst

Eine UI-Bibliothek beantwortet, wie Komponenten auf den Bildschirm kommen. Für große Anwendungen bleiben andere Fragen offen: Wer erzeugt Services? Wie kommen Daten in Routen? Wie werden Formulare geprüft, Komponenten getestet und Abhängigkeiten ausgetauscht?

Angular liefert dafür gemeinsame Konventionen. Das kostet Einstieg und Infrastruktur, verhindert aber, dass jedes Team Router, Datenfluss und Lebenszyklen neu zusammenstellt. Anders als [Preact](preact.md) ist Angular eine Architektur für die ganze Anwendung.

## Kernkonzepte

### 1. Komponenten mit kompilierten Templates

```ts
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  template: `<button (click)="count.update(increment)">{{ count() }}</button>`,
})
class Counter {
  count = signal(0);
  increment = (value: number) => value + 1;
}

bootstrapApplication(Counter);
```

Die Host-Seite enthält `<app-root></app-root>`. Der Decorator beschreibt die Komponente, die Klasse hält ihren Zustand. `(click)` bindet ein Event, `{{ … }}` einen Textausdruck; `[disabled]="busy()"` bindet eine Property.

### 2. Signals und abgeleitete Werte

```ts
import { computed, signal } from '@angular/core';

const count = signal(0);
const double = computed(() => count() * 2);
count.update(value => value + 1);
```

Lesen ist ein Funktionsaufruf, Schreiben erfolgt über `set` oder `update`. Computeds merken sich ihren Wert und die tatsächlich gelesenen Abhängigkeiten. Ein Objekt im Signal wird durch tiefe Mutation allein nicht reaktiv; dafür muss eine passende Änderung am Signal gemeldet werden.

### 3. Kontrollfluss und Identität

```html
@if (loading()) {
  <p>Lädt …</p>
} @else {
  @for (item of items(); track item.id) {
    <p>{{ item.title }}</p>
  } @empty {
    <p>Noch nichts da.</p>
  }
}
```

`track` beschreibt, welcher Datensatz zu welcher View gehört. Ein stabiler Schlüssel erhält die Zuordnung beim Umsortieren; die Position ist dafür bei veränderlichen Listen meist ungeeignet.

### 4. Dependency Injection

```ts
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
class Api {
  load() { return fetch('/api/items').then(response => response.json()); }
}

// inside a component field initializer
// api = inject(Api);
```

Services werden vom Injector bereitgestellt. Unterschiedliche Provider können dieselbe Schnittstelle im Test, für einen Teilbaum oder für die ganze Anwendung anders implementieren.

### 5. Router, RxJS und Server

Der Router verbindet URLs mit Komponenten, Guards und Daten. RxJS bleibt für Ereignisströme und bestehende APIs wichtig; `toSignal` und `toObservable` verbinden beide Modelle. SSR und Hydration bringen Server-HTML mit der Anwendung im Browser zusammen. Signals allein machen diesen Startvorgang nicht überflüssig.

## Wie es intern arbeitet

Der Template-Compiler übersetzt Markup in Anweisungen zum Anlegen und Aktualisieren von Views. Angular hält dazu Laufzeitstrukturen mit Bindungswerten und Komponentenbeziehungen; es erzeugt nicht bei jedem Update einen vollständigen Virtual-DOM-Baum.

Signal-Lesezugriffe registrieren Verbraucher. Änderungen markieren betroffene Arbeit, der Scheduler stößt Aktualisierungen an. Zoneless Betrieb erhält Benachrichtigungen unter anderem über Signals und gebundene Events, statt beliebige asynchrone Aufrufe mit Zone.js zu überwachen. „Hat Signals“ und „schreibt ausschließlich einen einzelnen Textknoten“ sind deshalb nicht automatisch dieselbe Aussage.

## Stärken und Schwächen

- **Stark:** abgestimmte Werkzeuge für große Teams, Template-Typprüfung, austauschbare Services, umfangreiches Routing und Formularmodell. Signals lassen sich schrittweise mit bestehendem RxJS-Code verbinden.
- **Schwach:** viele Konzepte und Pakete, deutliche Bindung an Compiler und Framework. Ein kleines Widget bezahlt einen hohen organisatorischen Einstieg; ältere Angular-Beispiele zeigen oft ein anderes Modell als die aktuelle Dokumentation.

## Für rat und aufbau

- **`@if` und `@for`** sind ein naher Vergleich für rats Kontrollfluss: Markup bekommt eigene Struktur, statt JavaScript-Ausdrücke mit Listen von VNodes zu verschachteln. Angular zeigt außerdem, wie wichtig eine klare `track`-Regel und Diagnostik für instabile Schlüssel sind.
- **Signals ändern nicht allein die Render-Granularität.** Bei rat übersetzt der Compiler Ausdrücke in einzelne Bindungen; Angular verbindet Signals mit seinem bestehenden View-Modell. Dieser Unterschied gehört in [reactivity_models.md](../reactivity_models.md).
- **Provider als Grenze** könnten für austauschbare Dienste in aufbau interessant sein (Vorschlag). Eine globale Service-Registry samt Decorators wäre dafür nicht zwingend nötig; zuerst wären Lebensdauer und Gültigkeitsbereich festzulegen.
- **Template-Typprüfung** ist für rats LSP relevanter als Angulars Paketumfang: Properties, Event-Payloads und Schleifenvariablen müssen bis ins Markup denselben Typ behalten.

Quellen: [Überblick](https://angular.dev/overview), [Signals](https://angular.dev/guide/signals), [Kontrollfluss](https://angular.dev/guide/templates/control-flow), [npm-Versionsstand](https://registry.npmjs.org/@angular/core/latest). Stand: 17. Oktober 2026.
