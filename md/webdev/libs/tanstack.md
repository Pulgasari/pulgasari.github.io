# TanStack

Eine Familie von Werkzeugen für Web-Anwendungen, initiiert von Tanner Linsley. Wichtige Wurzeln sind React Table (seit 2016) und React Query (seit 2019); unter TanStack wurden daraus zunehmend frameworkunabhängige Kerne mit Adaptern. Es gibt keine gemeinsame TanStack-Version. Aktuell unter anderem Query Core 5.104.3, React Table 9.3.1 und React Router 1.170.45 (alle Oktober 2026), aktiv. Dieser Steckbrief konzentriert sich auf Query und ordnet die weiteren Werkzeuge ein.

- Website: https://tanstack.com
- Repositories: https://github.com/TanStack/query, https://github.com/TanStack/table, https://github.com/TanStack/router
- Abhängigkeiten: je Werkzeug ein Kern und gegebenenfalls ein Framework-Adapter
- Build: für die jeweilige App üblich; Query Core braucht keinen JSX-Compiler

## Das Problem, das TanStack löst

Ein UI-Renderer löst nicht automatisch Cache, veraltete Serverdaten, Tabellenzustand oder typsichere Navigation. Solche Aufgaben landen schnell in selbst geschriebenen Hooks und Stores. Sie sehen anfangs einfach aus, wachsen aber mit Abbruch, Wiederholung, Pagination und mehreren gleichzeitig interessierten Views.

TanStack liefert spezialisierte Werkzeuge für diese Aufgaben. Query verwaltet asynchronen Serverzustand; Table berechnet Tabellenmodelle ohne ein festes Aussehen; Router verbindet Navigation und Typen. Das gemeinsame Motiv ist wiederverwendbare Logik, nicht eine einzige UI-Runtime.

## Kernkonzepte

### 1. Serverzustand ist ein Cache

```js
import { QueryClient } from '@tanstack/query-core';

const client = new QueryClient();
const items = await client.fetchQuery({
  queryKey: ['items'],
  queryFn: async ({ signal }) => {
    const response = await fetch('/api/items', { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  staleTime: 30_000,
});
```

Der Schlüssel beschreibt die Ressource, nicht den DOM-Ort. Parameter gehören in den Schlüssel, etwa `['item', id]`. Mehrere Verbraucher können so dieselben Daten und einen laufenden Ladevorgang teilen.

### 2. Frisch, veraltet und unbenutzt

`staleTime` bestimmt, wie lange Daten als frisch gelten. `gcTime` bestimmt bei Query 5, wie lange unbenutzter Cache normalerweise erhalten bleibt. Das sind verschiedene Zeitachsen. Veraltete Daten dürfen weiter angezeigt werden, während eine erneute Anfrage läuft; Mount, Fokus oder Netzwerkverbindung können abhängig von Optionen Refetches auslösen.

### 3. Änderungen invalidieren Daten

```js
await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Neu' }),
});
await client.invalidateQueries({ queryKey: ['items'] });
```

Das Beispiel zeigt nur die Invalidierung; eine echte Mutation prüft auch die Antwort und behandelt Fehler. Invalidierung markiert passende Queries als veraltet und kann aktive Abfragen erneut laden. Optimistische Updates brauchen zusätzlich einen definierten Rückweg bei Fehlern.

### 4. Adapter verbinden Cache und View

```tsx
import { useQuery } from '@tanstack/react-query';

function Items() {
  const query = useQuery({
    queryKey: ['items'],
    queryFn: ({ signal }) => fetch('/api/items', { signal }).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }),
  });
  return <p>{query.isPending ? 'Lädt …' : query.isError ? 'Fehler' : query.data.length}</p>;
}
```

Das React-Beispiel benötigt einen `QueryClientProvider` in der App. Der Adapter übersetzt Cache-Benachrichtigungen in das Update-Modell des Frameworks; der Kern enthält nicht diese konkrete View.

### 5. Table, Virtual, Router und Start

| Werkzeug | Aufgabe | Grenze |
|---|---|---|
| Query | Serverzustand und asynchrone Daten | kein allgemeiner Ersatz für jeden lokalen Store |
| Table | Tabellenzustand und Zeilenmodelle | Styling und Markup bleiben bei der Anwendung |
| Virtual | sichtbare Ausschnitte großer Listen | ersetzt nicht deren fachliches Datenmodell |
| Router | typsichere Navigation und Routen | Adapter und unterstützte Frameworks prüfen |
| Start | Full-Stack-App-Schicht um den Router | andere Abstraktion als ein einzelner Headless-Kern |

## Wie es intern arbeitet

Query hält einen Cache aus Query-Objekten, identifiziert über aus Schlüsseln abgeleitete Hashes. Observers abonnieren Ergebnisse, der Client koordiniert Laden, Benachrichtigungen, Wiederholungen und Invalidierung. Ein `AbortSignal` kann an den Transport weitergereicht werden; die konkrete Anfrage muss es auch verwenden.

Die übrigen Werkzeuge haben eigene Architekturen. Table berechnet aus Daten, Zustand und Optionen Zeilenmodelle; ein Adapter verbindet diese mit einer View. „Headless“ bezeichnet die fehlende vorgeschriebene Darstellung und bedeutet nicht, dass alle TanStack-Produkte dieselbe API oder dieselben Adapter haben.

## Stärken und Schwächen

- **Stark:** schwierige Zustandslogik wiederverwenden, Darstellung frei halten, etablierte Cache- und Tabellenmodelle. Einzelne Werkzeuge können unabhängig eingeführt werden.
- **Schwach:** Cache-Identität und Defaults müssen verstanden werden. Ein Datenfehler durch einen unvollständigen Query-Key wird durch die Bibliothek nicht verhindert; Versionslinien und Adapter sind je Produkt verschieden.

## Für rat und aufbau

- **Query Core als möglicher Adapterpunkt:** Ein rat-Adapter könnte Observer-Ergebnisse in Signals übertragen (Vorschlag). Er müsste Subscription, Client-Lebensdauer, SSR-Isolation und Cleanup definieren; ein React-Hook ist dafür keine direkte Vorlage.
- **Servercache und `@aufbau/store` trennen:** Lokale Einstellungen und aus dem Netz rekonstruierbare Daten haben andere Lebenszyklen. Persistenz allein löst weder Frische noch Invalidierung.
- **Headless passt zu eigenen Elementen:** Table könnte Logik für aufbau-Tabellen liefern, während Custom Elements die Darstellung übernehmen (Vorschlag). Dafür muss die API der gewählten Hauptversion geprüft werden.
- **Nicht alles gleichzeitig übernehmen:** Für zugriff wäre ein konkret fehlender Cache- oder Virtualisierungsmechanismus ein besserer Einstieg als eine Entscheidung für „den TanStack“.

Quellen: [Produkte](https://tanstack.com/), [Query](https://tanstack.com/query/latest/docs/framework/react/overview), [Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [Query-Version](https://registry.npmjs.org/@tanstack/query-core/latest), [Table-Version](https://registry.npmjs.org/@tanstack/react-table/latest), [Router-Version](https://registry.npmjs.org/@tanstack/react-router/latest). Stand: 17. Oktober 2026.
