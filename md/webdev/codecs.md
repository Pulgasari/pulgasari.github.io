# Codecs

Ein **Codec** ist ein Paar aus zwei Umwandlungen: **en**coden und **dec**oden (daher der Name, *coder-decoder*). Er übersetzt zwischen zwei Darstellungen *derselben Sache*, hin und zurück. Das Wort kommt aus der Nachrichtentechnik, wo es Geräte bezeichnete, die analoge Signale digital machen und zurück; heute meint es meist ein Stück Software.

Weiterführend: [data_structures.md](data_structures.md) (Daten zur Laufzeit prüfen), [protocols.md](protocols.md), `rat/.md/causa_types.md` (Typen, Schemas, Darstellungen).

---

## Das Bild

```
           encode
  Wert  ───────────▶  Darstellung
        ◀───────────
           decode
```

Links steht das, womit ein Programm arbeitet, rechts das, was gespeichert, verschickt oder angezeigt wird. Der Codec ist **die Beziehung zwischen beiden**, nicht eine der beiden Seiten.

Am Farbbeispiel:

```js
{ r: 255, g: 128, b: 0 }   // der Wert, mit dem sich rechnen lässt
'#ff8000'                  // eine Darstellung davon: ein Format
```

```js
const hex = {
  encode : ({ r, g, b }) => '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join(''),
  decode : text => {
    const [r, g, b] = text.slice(1).match(/../g).map(pair => parseInt(pair, 16));
    return { r, g, b };
  },
};

hex.encode({ r: 255, g: 128, b: 0 });   // '#ff8000'
hex.decode('#ff8000');                  // { r: 255, g: 128, b: 0 }
```

- `'#ff8000'` ist **kein Codec**, sondern ein **Format** (eine Darstellung).
- `{ r, g, b }` ist der **Wert**.
- `hex` (die zwei Funktionen dazwischen) ist der **Codec**.

Dieselbe Farbe hat weitere Darstellungen: `'rgb(255 128 0)'`, `'hsl(30 100% 50%)'`, `[255, 128, 0]`. Jede braucht ihren eigenen Codec zum Wert.

---

## „Codec fehlt“: die bekannte Bedeutung

Beim Video- und Audioabspielen ist es genau dasselbe, nur mit viel mehr Rechenarbeit dazwischen.

```
Pixel, Samples   ──encode──▶   H.264, AV1, AAC, Opus …   (komprimierte Bytes)
(roh, riesig)    ◀─decode───
```

Ein unkomprimiertes 1080p-Video sind rund 180 MB pro Sekunde. Ein Video-Codec wie **H.264**, **VP9** oder **AV1** rechnet die Bilder in eine viel kleinere Beschreibung um (welche Bildteile sich bewegen, was gleich bleibt) und beim Abspielen wieder zurück. Audio-Codecs wie **AAC**, **MP3** oder **Opus** machen das mit Tonwellen.

„Codec fehlt“ heißt: Der Player hat die Decode-Hälfte für dieses Format nicht. Die Datei ist in Ordnung, das Programm kann sie nur nicht zurückübersetzen.

### Container und Codec

Die zweite Quelle der Verwirrung: `.mp4`, `.mkv`, `.webm`, `.mov` sind **keine Codecs**, sondern **Container**. Ein Container ist eine Verpackung, die mehrere Spuren zusammenhält (Video, Audio, Untertitel, Kapitel) und sagt, welcher Codec in jeder steckt.

| Container | übliche Video-Codecs | übliche Audio-Codecs |
|---|---|---|
| `.mp4` | H.264, H.265, AV1 | AAC |
| `.webm` | VP8, VP9, AV1 | Vorbis, Opus |
| `.mkv` | fast alles | fast alles |

Darum gibt es das klassische „Bild läuft, aber kein Ton“: Der Player öffnet den Container und kennt den Video-Codec, aber nicht den Audio-Codec der zweiten Spur. Im Browser fragt man das so ab:

```js
video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');   // 'probably', 'maybe' or ''
MediaSource.isTypeSupported('video/webm; codecs="av01.0.05M.08"');
```

---

## Verlustfrei und verlustbehaftet

Die wichtigste Eigenschaft eines Codecs ist, ob der Weg hin und zurück wieder genau das Ausgangsstück ergibt (*round trip*):

```js
decode(encode(value))  // equal to value?
```

| | Round trip | Beispiele |
|---|---|---|
| **verlustfrei** (*lossless*) | immer gleich | PNG, FLAC, ZIP/gzip, JSON für reine Daten, Base64, der `hex`-Codec oben |
| **verlustbehaftet** (*lossy*) | nur ähnlich | JPEG, MP3, AAC, H.264, `hsl` → `rgb` mit Rundung |

Verlustbehaftete Codecs werfen absichtlich weg, was Menschen kaum wahrnehmen (feine Farbunterschiede, sehr hohe Töne), und werden dadurch viel kleiner. Für Daten in einem Programm will man fast immer verlustfrei.

Die umgekehrte Richtung ist oft *nicht* exakt, auch bei verlustfreien Codecs:

```js
hex.decode('#FF8000');                // { r: 255, g: 128, b: 0 }
hex.encode(hex.decode('#FF8000'));    // '#ff8000', not '#FF8000'
```

Mehrere Darstellungen (`#FF8000`, `#ff8000`, `#f80` als Kurzform) zeigen auf denselben Wert. `encode` wählt eine davon, die **kanonische Form**. Der Wert überlebt den Weg, die Schreibweise nicht unbedingt.

---

## Verwandte Wörter

| Wort | Bedeutung | Beispiel |
|---|---|---|
| **Format** | wie eine Darstellung aufgebaut ist | `#rrggbb`, JSON, PNG, CSV |
| **Encoding** | eine Darstellung, oft für Zeichen oder Bytes; auch: die Encode-Richtung | UTF-8, Base64, URL-Encoding |
| **Codec** | das Paar encode + decode | `hex` oben, H.264, `JSON.stringify` + `JSON.parse` |
| **Serialisieren** / **Deserialisieren** | encode / decode, wenn das Ziel Bytes oder Text zum Speichern oder Verschicken sind | `JSON.stringify`, `structuredClone` intern, Protobuf |
| **Parsen** | decode aus Text, meist mit Prüfung | `JSON.parse`, `new URL()`, `Date.parse` |
| **Formatieren** | encode für Menschen, oft nur in eine Richtung | `Intl.NumberFormat`, `toLocaleString()` |
| **Kompression** | ein Codec, der kleiner macht | gzip, brotli, zstd |
| **Container** | Verpackung für mehrere codierte Spuren | MP4, MKV, ZIP |

Nicht jede Umwandlung ist ein Codec. `Intl.NumberFormat('de').format(1234.5)` ergibt `'1.234,5'`, aber es gibt keine eingebaute Rückrichtung: ein Formatierer, kein Codec.

---

## Codecs im Browser und in JavaScript

Viel Alltägliches ist schon ein Codec, nur nicht so genannt:

| Codec | encode | decode | Anmerkung |
|---|---|---|---|
| JSON | `JSON.stringify` | `JSON.parse` | verlustfrei nur für JSON-Daten: `Date` wird zum String, `Map`, `Set`, `undefined`, `BigInt` gehen verloren oder werfen |
| UTF-8 | `new TextEncoder().encode(text)` | `new TextDecoder().decode(bytes)` | Text ↔ Bytes. Falsch decodiert entsteht Zeichensalat: `ä` als Latin-1 gelesen wird `Ã¤` |
| Base64 | `btoa`, `Uint8Array.prototype.toBase64` | `atob`, `Uint8Array.fromBase64` | Bytes ↔ Text, für Daten in URLs, JSON, `data:`-URLs |
| URL | `encodeURIComponent`, `URLSearchParams` | `decodeURIComponent` | `a b&c` ↔ `a%20b%26c` |
| Kompression | `CompressionStream('gzip')` | `DecompressionStream('gzip')` | auch `deflate`, `deflate-raw` |
| Bilder | `canvas.toBlob(cb, 'image/webp')` | `createImageBitmap(blob)` | Pixel ↔ PNG, JPEG, WebP |
| Media | `VideoEncoder`, `AudioEncoder` | `VideoDecoder`, `AudioDecoder` | die **WebCodecs**-API, direkter Zugriff auf die Codecs des Browsers |

Die eigentlichen Medien-Codecs liefert der Browser beziehungsweise das Betriebssystem. Deshalb spielt Safari manche WebM-Dateien nicht ab, die Chrome kann: Es fehlt die Decode-Hälfte.

---

## Codecs bauen und verketten

Ein Codec ist im Code nichts weiter als ein Objekt mit zwei Funktionen. Interessant wird es, weil sich Codecs **hintereinanderschalten** lassen:

```js
const chain = (...codecs) => ({
  encode : value => codecs.reduce((current, codec) => codec.encode(current), value),
  decode : value => codecs.reduceRight((current, codec) => codec.decode(current), value),
});

const date = { encode: value => value.toISOString(), decode: text => new Date(text) };
const json = { encode: JSON.stringify, decode: JSON.parse };

const stored = chain(date, json);
const text   = stored.encode(new Date);   // '"2026-10-16T09:00:00.000Z"'
stored.decode(text);                      // a Date again, not a string
```

Encode läuft von links nach rechts, decode in umgekehrter Reihenfolge, wie beim An- und Ausziehen: Was zuletzt eingepackt wurde, wird zuerst ausgepackt.

### Codec und Schema

Ein Schema prüft, ob ein Wert passt ([zod.md](libs/zod.md), [valibot.md](libs/valibot.md)). Ein Codec übersetzt. Zusammen ergeben sie, was man an jeder Grenze eines Programms braucht:

```
Text aus localStorage ──decode (JSON)──▶ unbekannte Daten ──prüfen (Schema)──▶ vertrauenswürdiger Wert
```

Zod hat seit Version 4.1 beides in einem: `z.codec(z.iso.datetime(), z.date(), { decode, encode })` beschreibt die gespeicherte Form, die Arbeitsform und den Weg dazwischen, und prüft beide Seiten.

---

## Für rat und aufbau

- **`@aufbau/store`** speichert Werte mit `JSON.stringify` und liest sie mit `JSON.parse`. Das ist ein Codec, nur fest eingebaut. Ein `Date` kommt deshalb als String zurück. Ein Codec pro Typ (`{ type: 'date' }` mit eigenem encode/decode) würde das lösen.
- **`@rat/types`** (siehe `rat/.md/causa_types.md`): Ein Schema `Color` mit Codecs für `hex`, `rgb()` und `hsl()` könnte jede Schreibweise einlesen und eine kanonische ausgeben. Ein Input dafür bekäme ein Textfeld, das über den Codec läuft, neben den Slidern.
- **URL als Zustand:** Filter, Tabs oder Suchbegriffe in der URL brauchen einen Codec vom Zustand zu `URLSearchParams` und zurück. Mit einem Schema dahinter ist auch eine von Hand veränderte URL sicher.
- **zugriff:** Die Apps arbeiten viel mit Dateien. Base64 für Daten in JSON, `TextDecoder` für Textdateien in unbekannter Kodierung, `CompressionStream` für Exporte und WebCodecs für Video und Audio (statt ffmpeg in WebAssembly, wo der Browser den Codec schon hat) sind alles dasselbe Muster.
