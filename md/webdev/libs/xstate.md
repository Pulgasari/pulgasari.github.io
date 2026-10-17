# XState

Eine Bibliothek für Zustandsmaschinen, Statecharts und Actors. Von David Khourshid, seit 2015; heute im Stately-Umfeld entwickelt. Aktuell 5.33.3 (Oktober 2026), aktiv. XState beschreibt erlaubte Zustände und Übergänge ausdrücklich und führt diese Beschreibung als Actor aus. Es ist kein UI-Renderer und nicht an React gebunden.

- Website: https://stately.ai/docs/xstate
- Repository: https://github.com/statelyai/xstate
- Abhängigkeiten: Kern ohne bestimmtes UI-Framework; Adapter wie `@xstate/react` separat
- Build: keiner grundsätzlich nötig; TypeScript und Bundler sind übliche Werkzeuge

## Das Problem, das XState löst

Mehrere Booleans können widersprüchliche Zustände ausdrücken: `loading`, `success` und `error` gleichzeitig. Bei Requests kommen weitere Fragen hinzu: Darf während des Ladens erneut gestartet werden? Was passiert beim Abbruch? Welche Antwort gehört noch zum aktuellen Vorgang?

Eine Zustandsmaschine benennt die erlaubten Situationen und die Ereignisse, die zwischen ihnen wechseln. Statecharts ergänzen Hierarchie, parallele Bereiche und weitere Struktur. Das ist besonders nützlich, wenn die Übergänge komplizierter sind als die Daten selbst.

## Kernkonzepte

### 1. Eine Maschine beschreibt erlaubte Übergänge

```js
import { createActor, createMachine } from 'xstate';

const toggle = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: { on: { TOGGLE: 'on' } },
    on: { on: { TOGGLE: 'off' } },
  },
});

const actor = createActor(toggle);
actor.subscribe(snapshot => console.log(snapshot.value));
actor.start();
actor.send({ type: 'TOGGLE' });
```

Die Maschine ist die Logik, der Actor ihre laufende Instanz. Ein Event ohne passenden Übergang muss keinen Zustandswechsel auslösen. Der aktuelle Snapshot beschreibt das beobachtbare Ergebnis.

### 2. Kontext und reine Bedingungen

```js
import { assign, createMachine } from 'xstate';

const counter = createMachine({
  context: { count: 0 },
  on: {
    ADD: {
      guard: ({ context }) => context.count < 10,
      actions: assign({ count: ({ context }) => context.count + 1 }),
    },
  },
});
```

`context` hält zusätzliche Daten, `guard` entscheidet, ob der Übergang erlaubt ist. `assign` beschreibt Kontextänderungen. Guards sollten keine Seiteneffekte ausführen; Aktionen sind die dafür vorgesehene Stelle.

### 3. Asynchrone Arbeit als Actor

```js
import { createMachine, fromPromise } from 'xstate';

const loader = createMachine({
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: fromPromise(async ({ signal }) => {
          const response = await fetch('/api/items', { signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        onDone: 'ready',
        onError: 'failed',
      },
    },
    ready: {},
    failed: { on: { RETRY: 'loading' } },
  },
});
```

Das Beispiel zeigt Übergänge, speichert das Ergebnis aber noch nicht im Kontext. Ein invoked Actor ist an den aktiven Zustand gebunden. Für tatsächlichen Transportabbruch muss die Arbeit das übergebene Signal verwenden.

### 4. Hierarchie und Parallelität

Ein Zustand wie `editing` kann Unterzustände `clean` und `dirty` enthalten. Ein paralleler Statechart kann gleichzeitig eine Verbindung und einen Editorzustand verwalten. `snapshot.matches(...)` fragt diese Struktur ab, ohne sich auf einen einzigen flachen String zu verlassen.

### 5. Actors und Lebensdauer

Actors empfangen Events, erzeugen Snapshots und können weitere Actors starten. `subscribe` beobachtet Ergebnisse, `stop` beendet die laufende Instanz. Persistierte Snapshots können ein Fortsetzen unterstützen; externe Ressourcen und Seiteneffekte sind dadurch nicht beliebig als JSON wiederherstellbar.

## Wie es intern arbeitet

Ein Actor verarbeitet Ereignisse gegen seine aktive Zustandskonfiguration. Die Maschine sucht passende Übergänge, prüft Guards, führt Austritte und Aktionen aus und tritt in Zielzustände ein. Ereignislose Übergänge und weitere interne Schritte werden nach den Statechart-Regeln verarbeitet, bevor der nächste stabile Snapshot beobachtet wird.

Der Snapshot enthält unter anderem Zustand, Kontext und Status. UI-Adapter abonnieren ihn und übersetzen Änderungen in das jeweilige Render-Modell. XState braucht deshalb weder einen eigenen DOM-Baum noch eigene Template-Bindungen: Es liefert die Logik vor der Darstellung.

## Stärken und Schwächen

- **Stark:** erlaubte Abläufe sind sichtbar, widersprüchliche Modi lassen sich vermeiden, Hierarchie und Actor-Lebensdauer helfen bei komplexer Interaktion. Das Modell kann unabhängig von einer View untersucht werden.
- **Schwach:** zusätzliche Sprache und Struktur, für einfache Werte oft zu viel Aufwand. Eine unübersichtlich geschnittene Maschine bleibt unübersichtlich; Zustandsmodellierung ersetzt keine klare Daten- und Effektgrenze.

## Für rat und aufbau

- **Signals halten Werte, Maschinen erlauben Übergänge.** Ein Signal für `loading` ist noch keine Beschreibung, ob `RETRY` oder `CANCEL` in diesem Zustand erlaubt ist. Beide Modelle können sich ergänzen.
- **Adapter als kleine Grenze:** Eine rat-Behavior könnte einen Actor starten, dessen Snapshot in ein Signal übernehmen und ihn beim Abbau stoppen (Vorschlag). Das UI müsste dafür nicht in XState beschrieben werden.
- **Für `@aufbau/store` gezielt einsetzen:** Mehrstufiges Speichern, Anmeldung oder Editor-Modi sind mögliche Kandidaten. Ein Theme-Wert oder eine einfache Auswahl brauchen nicht automatisch eine Maschine.
- **Ressourcen an Zustände binden:** Invoked Actors zeigen einen klaren Vertrag für Requests und Timer. Eine entsprechende rat-Abstraktion müsste sowohl veraltete Ergebnisse ignorieren als auch, wo möglich, die laufende Arbeit abbrechen.

Quellen: [Überblick](https://stately.ai/docs/xstate), [Maschinen](https://stately.ai/docs/machines), [Actors](https://stately.ai/docs/actors), [Promise-Actors](https://stately.ai/docs/promise-actors), [npm](https://registry.npmjs.org/xstate/latest). Stand: 17. Oktober 2026.
