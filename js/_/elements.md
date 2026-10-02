Alles in `aufbau/css` ist aktuell total egal. Lass das in ruhe. 

und `:state(by-field)` is ugly af.

`aufbau-upload` wäre dann wohl `input-file` und `input-by-upload` ? Und `input-by-text`.

und `input-chips` könnte vllt `input-by-chips` sein.

und zu deiner frage bzgl entscheidungen:

keine ahnung. Ich will jdf das ich im ergebnis solches markup habe:

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
<input-range type='date'>
<input-range type='number'>
<input-range type='time'>
<input-range type='year'>
<input-range look='fields'>
<input-range look='slider'>
<input-range look='steppers'>

<input-value>
<input-value type='color'>
<input-value type='date'>
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


