# Qwik

Ein Komponenten-Framework mit **Resumability**: servergerenderte Anwendungen sollen im Browser weiterlaufen, ohne den ganzen Komponentenbaum zunächst erneut auszuführen. Von Miško Hevery und dem ursprünglichen Builder.io-Team, seit 2021; heute im QwikDev-Projekt. Aktuell `@builder.io/qwik` 1.20.2 (Oktober 2026), aktiv. Dieser Steckbrief beschreibt die 1.x-API; die gesonderte v2-Dokumentation ist kein stiller Austausch dieser Beispiele.

- Website: https://qwik.dev
- Repository: https://github.com/QwikDev/qwik
- Abhängigkeiten: Qwik-Runtime und Optimizer, Qwik City optional für das Anwendungsframework
- Build: ja, gewöhnlich über Vite und den Qwik-Optimizer

## Das Problem, das Qwik löst

Server-Rendering zeigt Inhalte früh, viele Frameworks laden danach aber die Anwendung und führen Komponenten erneut aus, um Zustand, Listener und Abhängigkeiten wiederherzustellen. Diese Hydration kostet Zeit, obwohl die Person womöglich nur einen einzigen Button benutzt.

Qwik verlagert die Rekonstruktion in die Serverausgabe. HTML und serialisierte Metadaten beschreiben, welcher Zustand und welcher Code zu einer Interaktion gehören. Der Browser kann gezielt fortsetzen, statt erst den gesamten Baum wieder aufzubauen. [Astro](astro.md) verkleinert Hydration auf Islands; Qwik verändert den Startmechanismus selbst.

## Kernkonzepte

### 1. Komponenten und Signals

```tsx
import { component$, useSignal } from '@builder.io/qwik';

export default component$(() => {
  const count = useSignal(0);
  return <button onClick$={() => count.value++}>{count.value}</button>;
});
```

Das Beispiel ist eine Komponente innerhalb eines Qwik-Projekts, kein selbstständiger Browser-Einstieg. Signals halten Werte; `useStore` stellt beobachtbaren Objektzustand bereit.

### 2. Das Dollarzeichen markiert auslagerbaren Code

`component$`, `onClick$` und ähnliche APIs markieren Grenzen für den Optimizer. Er kann Funktionen aus dem unmittelbaren Modul herauslösen und als später ladbare Symbole referenzieren. `$` ist Teil des API-Namens, keine JavaScript-Syntax und kein allgemeines „reaktiv“-Zeichen.

### 3. Serialisierbare Umgebung

```tsx
const label = 'Speichern';
const count = useSignal(0);

return <button onClick$={() => {
  console.log(label, ++count.value);
}}>{label}</button>;
```

Der spätere Handler braucht seine eingefangenen Werte wieder. Qwik muss diese Umgebung darstellen können; beliebige offene Ressourcen oder DOM-Knoten lassen sich nicht einfach als Closure-Zustand über den Servertransport erhalten. `noSerialize` ist eine bewusste Ausnahme, deren Inhalt im Browser nicht automatisch rekonstruiert wird.

### 4. Ableitungen und Arbeit im Browser

```tsx
import { useComputed$ } from '@builder.io/qwik';

// inside a component
const double = useComputed$(() => count.value * 2);
```

`useTask$` beschreibt verfolgte Arbeit, `useVisibleTask$` ausdrücklich browserseitige Arbeit. Ein sichtbarer Task kann Code früh laden und damit den Vorteil des späten Ladens verkleinern. Ableitungen gehören nach Möglichkeit in Computeds statt in Effekte, die andere Werte nachführen.

### 5. Qwik City

City ergänzt dateibasiertes Routing, Layouts, serverseitige Loader und Actions. Das ist die App-Schicht um Qwik, nicht Voraussetzung für das Verständnis eines Signals. Serverfunktionen und Browserhandler benötigen trotzdem klare Daten- und Vertrauensgrenzen.

## Wie es intern arbeitet

Beim Server-Rendering zeichnet Qwik unter anderem Zustand, Bezüge und Ereigniszuordnungen auf. Der Optimizer erzeugt Code-Grenzen, QRLs referenzieren ladbare Funktionen. Ein kleiner Loader kann Ereignisse aufnehmen und den zugehörigen Code laden; Prefetching kann diesen Bedarf vorwegnehmen.

Serialisierte Informationen erlauben, die Anwendung fortzusetzen, ohne zuerst alle Komponenten auszuführen. Nach dem Start verfolgt die Runtime reaktive Abhängigkeiten und aktualisiert die betroffenen Ansichten. Das ist weder „gar kein JavaScript“ noch die Garantie, dass eine erste Interaktion nie auf Netzwerk oder Ausführung warten muss.

## Stärken und Schwächen

- **Stark:** gezieltes Laden statt großer Hydration, Serverausgabe und Interaktivität sind aufeinander abgestimmt, Signals und Serialisierung gehören zum Modell.
- **Schwach:** Serialisierbarkeit beeinflusst die Programmstruktur, Optimizer und Deployment müssen zusammenpassen. Chunking, Prefetching und browserseitige Tasks können Kosten verschieben, statt sie vollständig zu beseitigen.

## Für rat und aufbau

- **Lazy Loading ist nicht Resumability:** Rats vorgeschlagenes `lazy:visible` kann Code später laden; daraus folgen noch keine serialisierten Abhängigkeiten oder wiederaufnehmbaren Closures.
- **Ein eigenes Fortsetzungsprotokoll wäre eine große Entscheidung.** Für rat müssten Compiler, Serverausgabe, Signal-Identität und Event-Payloads gemeinsam entworfen werden. Das ist kein kleiner Runtime-Schalter.
- **`$` bedeutet etwas anderes:** Rats Script-Sugar und Qwiks Optimizer-Grenzen sollten in Dokumentation nicht unter demselben Reaktivitätsbegriff zusammenfallen.
- **Nützlicher kleinerer Schritt:** aufbau könnte zuerst die Kosten einzelner interaktiver Bereiche messen und Code-Grenzen gezielt setzen (Vorschlag), bevor es ein umfassendes Serialisierungsmodell übernimmt.

Quellen: [Resumability](https://qwik.dev/docs/concepts/resumable/), [Zustand](https://qwik.dev/docs/core/state/), [Optimizer](https://qwik.dev/docs/advanced/optimizer/), [npm](https://registry.npmjs.org/@builder.io/qwik/latest). Stand: 17. Oktober 2026.
