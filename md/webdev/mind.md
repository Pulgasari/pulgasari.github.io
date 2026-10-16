# mind

## codec

Zur Frage: Weder der Hexcode noch [100, 50, 50] ist der Codec. Der Codec ist die Übersetzung hin und zurück zwischen zwei Darstellungen derselben Sache:
{ r: 255, g: 128, b: 0 }   ⇄   '#ff8000'
        der Wert           der Codec        ein Format
'#ff8000' ist ein Format, also eine Schreibweise.
{ r, g, b } ist der Wert, mit dem gerechnet wird.
Die beiden Funktionen encode (Wert → '#ff8000') und decode ('#ff8000' → Wert) zusammen sind der Codec. Daher der Name: coder + decoder.
