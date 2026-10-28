# Ionic

Eine Bibliothek von UI-Komponenten, die auf Android und iOS **wie native Steuerelemente aussehen und sich so verhalten**: Navigation mit Wischgesten, Listen, Tabs, Modals, Action Sheets, Pull-to-Refresh, in zwei Designs (Material Design für Android, Cupertino für iOS). Seit Ionic 4 (2019) als Web Components gebaut, mit Hüllen für Angular, React und Vue. Von der Firma Ionic (Max Lynch, Ben Sperry, Adam Bradley), seit 2013; seit 2022 Teil von OutSystems. Aktuell 9.x (2026), aktiv.

- Website: https://ionicframework.com
- Repository: https://github.com/ionic-team/ionic-framework
- Pakete: `@ionic/core` (Web Components), `@ionic/angular`, `@ionic/react`, `@ionic/vue`; Icons: `ionicons`
- Größe: lädt jede Komponente erst, wenn sie im DOM erscheint; die Grundlast ist klein, eine typische App lädt einige Dutzend kb
- Build: optional; `@ionic/core` lässt sich über ein CDN-Skript ohne Build benutzen

## Das Problem, das Ionic löst

Eine Web-App in einer WebView fühlt sich fremd an: Seitenwechsel ohne Übergang, Scrollen ohne Federn, Buttons, die nicht wie Buttons der Plattform aussehen, kein Wischen zurück. Ionic liefert die Bausteine, die eine App braucht, mit den Animationen, Gesten und Abständen der jeweiligen Plattform. Zusammen mit [Capacitor](capacitor.md) (gleiche Firma) wird daraus eine App für die Stores; Ionic läuft aber genauso als PWA im Browser.

Angefangen hat Ionic 2013 als AngularJS-Bibliothek auf Cordova. Mit Version 4 schrieb das Team alles als Web Components neu, mit dem eigens dafür entwickelten Compiler **Stencil**, um nicht mehr an ein Framework gebunden zu sein.

## Kernkonzepte

### 1. Komponenten als Custom Elements

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css">

<ion-app>
  <ion-header>
    <ion-toolbar>
      <ion-title>Notizen</ion-title>
      <ion-buttons slot="end"><ion-button id="add"><ion-icon slot="icon-only" name="add"></ion-icon></ion-button></ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item button detail>
        <ion-label><h2>Einkauf</h2><p>Milch, Brot</p></ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</ion-app>
```

Rund hundert Elemente, alle mit `ion-`-Präfix: Layout (`ion-app`, `ion-header`, `ion-content`, `ion-grid`), Navigation (`ion-router`, `ion-nav`, `ion-tabs`, `ion-menu`), Eingabe (`ion-input`, `ion-select`, `ion-toggle`, `ion-datetime`, `ion-range`), Overlays (`ion-modal`, `ion-popover`, `ion-action-sheet`, `ion-alert`, `ion-toast`), Listen (`ion-item-sliding`, `ion-reorder-group`, `ion-infinite-scroll`, `ion-refresher`).

### 2. Zwei Modi

```html
<html mode="ios">         <!-- oder "md"; ohne angabe nach plattform -->
<ion-button mode="md">   <!-- auch pro element -->
```

Jede Komponente hat Styles und Animationen für `md` (Material) und `ios`. Ohne Angabe wählt Ionic nach Plattform. Farben, Abstände und Radien sind CSS Custom Properties (`--ion-color-primary`, `--background`, `--padding-start`), Teile der Shadow-DOM-Komponenten sind über `::part()` erreichbar.

### 3. Overlays über Controller

```js
import { actionSheetController, toastController } from '@ionic/core';

const sheet = await actionSheetController.create({
  buttons: [{ handler: () => remove(item), role: 'destructive', text: 'Löschen' }, { role: 'cancel', text: 'Abbrechen' }],
  header: item.title,
});
await sheet.present();
const { role } = await sheet.onDidDismiss();

(await toastController.create({ duration: 2000, message: 'gespeichert' })).present();
```

Oder deklarativ: `<ion-modal trigger="open-settings">` öffnet sich, wenn das Element mit der ID geklickt wird; `<ion-modal breakpoints="[0, 0.5, 1]">` wird zum Bottom Sheet mit Rastpunkten.

### 4. Navigation mit Stack

```html
<ion-router>
  <ion-route url="/" component="page-home"></ion-route>
  <ion-route url="/note/:id" component="page-note"></ion-route>
</ion-router>
<ion-router-outlet></ion-router-outlet>
```

Der Router hält einen **Stapel** von Seiten wie eine native App: Eine neue Seite schiebt sich darüber, die alte bleibt im DOM (Scrollposition, Zustand), zurück wischt man vom linken Rand. In React, Vue und Angular übernimmt das jeweils deren Router mit einem Ionic-Outlet.

### 5. Plattformnahe Details

Safe Areas (`--ion-safe-area-top`), Tastatur-Verhalten, hardwareseitiger Zurück-Button auf Android (`ionBackButton`-Event mit Prioritäten), Haptik beim Umsortieren, Scroll-Assist bei Eingaben, die von der Tastatur verdeckt würden.

## Wie es intern arbeitet

Stencil compiliert TSX-Komponenten zu Custom Elements und erzeugt einen Lazy Loader: `ionic.esm.js` registriert zunächst nur kleine Platzhalter; erscheint ein `<ion-modal>` im DOM, lädt der Loader dessen Code nach. Die Komponenten nutzen Shadow DOM (manche Scoped CSS), Gesten laufen über eine eigene Gesten-Bibliothek (`createGesture`), Animationen über eine auf der Web Animations API aufgebaute `createAnimation`.

## Stärken und Schwächen

- **Stark:** sehr vollständiger Satz an App-Komponenten mit plattformtreuem Verhalten, unabhängig vom Framework, ohne Build über CDN nutzbar, gute Barrierefreiheit, eng mit Capacitor abgestimmt, gut dokumentiert.
- **Schwach:** Apps sehen schnell nach „Ionic“ aus, wenn man nicht viel umstylt; Shadow DOM erschwert tiefe Anpassungen; das Router- und Stack-Modell verlangt seine eigene Denkweise; Lazy Loading erzeugt viele kleine Dateien; die Zukunft hängt an einer Firma, die zu einem Low-Code-Anbieter gehört.

## Für rat und aufbau

- **aufbau ist der Gegenentwurf.** aufbaus Elemente (`btn-icon`, `pop-toast`, `input-value`, `data-index`) lösen dieselben Aufgaben, aber ohne Plattform-Nachahmung, mit gestalt als Designsprache und Cascade Layers statt Shadow DOM überall. Von Ionic lohnt sich vor allem das Verhalten abzuschauen: Bottom Sheets mit Rastpunkten, Zurück-Button mit Prioritäten, Scroll-Assist.
- **`ionBackButton` mit Prioritäten** ist die saubere Antwort auf „wer reagiert auf Zurück?“: ein Modal vor dem Menü vor der Navigation. rats `rat-area`s mit `overlay` und die Android-Apps (Launcher: Sheet, dann Drawer) lösen dasselbe bisher von Hand.
- **Stack-Navigation:** rats `rat-view`s bleiben im DOM und gleiten mit `transition='slide'`, ein Stapel mit Wischen zurück wäre der nächste Schritt.
- **Stencil** ist ein Compiler für Web Components wie rats für Komponenten; Stencil erzeugt Custom Elements mit eigenem Lazy Loader, rat Komponenten-Funktionen ohne eigenes Element pro Komponente.
- Verwandt: [Capacitor](capacitor.md), [Lit](lit.md).
