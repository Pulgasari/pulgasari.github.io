# Playwright

Eine Bibliothek, die **echte Browser fernsteuert**: Chromium, Firefox und WebKit, sichtbar oder headless, aus Node, Python, Java oder .NET. Dazu ein Test-Runner (`@playwright/test`) für End-to-End-Tests mit automatischem Warten, Parallelisierung, Traces und Screenshots. Von Microsoft, seit Januar 2020, gebaut vom Team, das vorher bei Google Puppeteer entwickelt hatte (Andrey Lushnikov, Dmitry Gozman, Pavel Feldman u. a.). Aktuell 1.64 (Oktober 2026), aktiv, Apache-2.0.

- Website: https://playwright.dev
- Repository: https://github.com/microsoft/playwright
- Browser: Chromium, Firefox, WebKit (eigene, gepatchte Builds), dazu installiertes Chrome und Edge
- Sprachen: TypeScript/JavaScript, Python, Java, .NET
- Build: keiner; `npx playwright install` lädt die Browser

## Das Problem, das Playwright löst

Selenium spricht über WebDriver mit Browsern: ein langsames HTTP-Protokoll mit vielen Runden, und Tests, die ständig an Timing scheitern („Element nicht gefunden“, weil die Seite noch lädt). Puppeteer (2017) war schneller, weil es das Chrome DevTools Protocol direkt nutzt, aber nur Chrome konnte. Playwright bringt beides zusammen: ein schnelles Protokoll **für alle drei Engines** und eine API, die von sich aus wartet, bis ein Element sichtbar, stabil und klickbar ist.

## Kernkonzepte

### 1. Browser, Kontext, Seite

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();                                    // ein prozess
const context = await browser.newContext({ viewport: { height: 860, width: 412 }, locale: 'de-DE' });
const page    = await context.newPage();

await page.goto('http://localhost:5173/');
await page.screenshot({ path: 'home.png', fullPage: true });
await browser.close();
```

Ein **Kontext** ist ein frisches Browserprofil (eigene Cookies, Storage, Berechtigungen) und in Millisekunden angelegt. Jeder Test bekommt seinen eigenen; Tests teilen sich den Browser, aber keinen Zustand. Geräte lassen sich nachbilden (`devices['Pixel 7']`: Viewport, User Agent, Touch, Pixeldichte).

### 2. Locators mit automatischem Warten

```js
await page.getByRole('button', { name: 'Speichern' }).click();
await page.getByLabel('Titel').fill('Einkauf');
await page.getByText('gespeichert').waitFor();
await page.locator('.tree .entry', { hasText: 'src' }).click();
```

Ein Locator ist eine Beschreibung, kein Element: Er wird bei jeder Aktion neu aufgelöst. Vor einem Klick wartet Playwright, bis das Element existiert, sichtbar ist, nicht mehr animiert, Ereignisse empfängt und aktiviert ist. `getByRole`, `getByLabel`, `getByText` suchen wie ein Mensch oder ein Screenreader und brechen nicht, wenn sich Klassen ändern.

### 3. Der Test-Runner

```js
import { expect, test } from '@playwright/test';

test('eine notiz anlegen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Neu' }).click();
  await page.getByLabel('Titel').fill('Einkauf');
  await expect(page.getByRole('listitem')).toHaveText(['Einkauf']);
});
```

`expect` mit Web-Assertions wiederholt die Prüfung, bis sie passt oder die Zeit abläuft. Fixtures (`page`, `context`, eigene) bauen Zustand auf und ab. Der Runner verteilt Testdateien auf Worker, wiederholt fehlgeschlagene Tests, startet bei Bedarf den Dev-Server (`webServer` in der Konfiguration) und läuft gegen mehrere Browser als „Projekte“.

### 4. Netz abfangen

```js
await page.route('**/api/notes', route => route.fulfill({ json: [{ id: 1, title: 'Einkauf' }] }));
await page.route(url => !url.href.startsWith('http://localhost'), route => route.abort());
```

Jede Anfrage lässt sich ändern, beantworten oder abbrechen: Backends mocken, Fehler simulieren, externe Dienste aussperren. `page.on('console')`, `page.on('pageerror')` und `page.on('requestfailed')` sammeln, was im Browser schiefgeht.

### 5. Werkzeuge rund um die Tests

- **Trace Viewer:** zeichnet jeden Schritt mit DOM-Schnappschuss, Netz und Konsole auf; nach einem Fehlschlag in CI lässt sich der Lauf Schritt für Schritt ansehen.
- **Codegen:** `npx playwright codegen url` schreibt Testcode mit, während man klickt.
- **UI-Modus:** Tests im Watch-Modus mit Zeitleiste.
- **Visuelle Vergleiche:** `expect(page).toHaveScreenshot()` vergleicht pixelweise mit einer Referenz.
- **Komponenten-Tests** (experimentell) für React, Vue, Svelte.
- **MCP-Server:** `@playwright/mcp` gibt KI-Agenten die Steuerung eines Browsers über das Accessibility-Tree-Abbild der Seite (siehe [../llm/mcp.md](../llm/mcp.md)).

## Wie es intern arbeitet

Die Bibliothek spricht mit einem Treiberprozess, der die Browser über deren Debug-Protokolle steuert: Chromium über CDP, Firefox und WebKit über eigene, von Playwright gepflegte Protokolle in gepatchten Builds. Deshalb lädt Playwright seine eigenen Browser herunter, deren Version zur Bibliotheksversion passt. Selektoren werden in einem eingeschleusten Skript in der Seite ausgewertet; Klicks sind echte Eingabeereignisse auf Betriebssystemebene, keine `element.click()`-Aufrufe.

## Stärken und Schwächen

- **Stark:** drei Engines mit einer API, zuverlässiges automatisches Warten, isolierte Kontexte, ausgezeichnete Werkzeuge (Trace, Codegen, UI-Modus), schnelle parallele Läufe, Netz-Abfangen, auch als einfache Automatisierungsbibliothek ohne Tests nutzbar.
- **Schwach:** große Downloads (je Browser über 100 MB), gepatchte statt originaler Firefox- und WebKit-Builds, End-to-End-Tests bleiben langsamer und empfindlicher als Unit-Tests, kein echtes Safari auf iOS, Hinter-Proxy-Setups brauchen Handarbeit.

## Für rat und aufbau

- **Im Alltag schon da.** Die rat- und zugriff-Apps werden mit Playwright geprüft: Seite bauen, ausliefern, durchklicken, Screenshot, Konsolenfehler sammeln. `context.route` holt externe Anfragen über `curl`, wenn der Browser nicht durch den Proxy kommt; `serviceWorkers: 'block'` verhindert, dass ein alter Service Worker die neue Version verdeckt.
- **Locators nach Rolle** belohnen sauberes Markup: Wer `getByRole('button', { name })` benutzt, merkt sofort, wenn ein `btn-icon` kein `label` hat. Für aufbaus Elemente ist das ein kostenloser Barrierefreiheits-Test (siehe [../a11y.md](../a11y.md)).
- **Mocks über `route`** passen zu rats Treibern: Ein Test kann statt der Treiber das Netz mocken (WebDAV, GitHub-API) und die App unverändert lassen.
- **Ein Test-Runner für rat** würde nahe an Playwrights Modell liegen: eine `.rat.html`-Komponente mounten, mit Locators bedienen, Signale beobachten.
