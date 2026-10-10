Alles in `aufbau/css` ist aktuell total egal. Lass das in ruhe. 

und `:state(by-field)` is ugly af.

`aufbau-upload` wäre dann wohl `input-file` und `input-by-upload` ? Und `input-by-text`.

und `input-chips` könnte vllt `input-by-chips` sein.

und zu deiner frage bzgl entscheidungen:

keine ahnung. Ich will jdf das ich im ergebnis:
1. sauberes und nachvollziehbares markup habe
2. wenn man es mit css später (um)stylen will, man keine macke bekommt

aber irgendwie egal wie man es dreht und wendet, ich bekomms einfach nich ganz rund.

```html
<input-number look='field'>
```

```html
<input-date>
<input-date-range>
<input-number>
<input-number-range>
<input-time>
<input-time-range>
```

```html
<input-number look='field'>
<input-number look='slider'>
```

```html
<input-range>
<input-value>
```

```html
<input-range>

<input-range look='fields'>
<input-range look='slider'>
<input-range look='steppers'>

<input-range type='date'>
<input-range type='datetime'>
<input-range type='number'>
<input-range type='time'>
<input-range type='year'>
```

```html
<input-value>

<input-value look='field'>
<input-value look='slider'>
<input-value look='stepper'>

<input-value type='color'>
<input-value type='date'>
<input-value type='datetime'>
<input-value type='email'>
<input-value type='language'>
<input-value type='locale'>
<input-value type='number'>
<input-value type='password'>
<input-value type='search'>
<input-value type='time'>
<input-value type='timezone'>
<input-value type='url'>
<input-value type='year'>
```

```md
resultiert in 1 wert
resultiert in 1 wert aus liste
resultiert in i wert aus range

resultiert in 2 werte
resultiert in 2 werte aus liste
resultiert in 2 werte aus range
```

```html
<input-value>

<input-value look='field'>
<input-value look='segments'>
<input-value look='slider'>
<input-value look='stepper'>

<input-value type='color'>
<input-value type='date'>
<input-value type='datetime'>
<input-value type='email'>
<input-value type='language'>
<input-value type='locale'>
<input-value type='number'>
<input-value type='password'>
<input-value type='search'>
<input-value type='time'>
<input-value type='timezone'>
<input-value type='url'>
<input-value type='year'>
```

```html
<input-cycle name='viewmode'>
  <input-option type='string' value='grid'></input-option>
  <input-option type='string' value='list'></input-option>
</input-cycle>

<input-choice name='viewmode'>
  <input-option type='string' value='grid'></input-option>
  <input-option type='string' value='list'></input-option>
</input-choice>
```

```css
input-cycle {
  &::part(icon) {}
}

input-field {
  &::part(icon)  {}
  &::part(input) {}
}

input-segments {
  &::part(segment) {}
}

input-slider {
  &::part(input) {}
  &::part(thumb) {}
  &::part(track) {}
}

input-stepper {
  &::part(button) {}
  &::part(input) {}
}

input-toggle {
  &::part(thumb) {}
  &::part(track) {}
}

input-toggle[look="button"] {}
input-toggle[look="checkbox"] {}
```

```css
input-value {
  &[look="field"] {
    &::part(input) {}
  }
  
  &[look="slider"] {
    &::part(input) {}
    &::part(thumb) {}
    &::part(track) {}
  }
  
  &[look="stepper"] {
    &::part(button) {}
    &::part(input) {}
  }
}
```
