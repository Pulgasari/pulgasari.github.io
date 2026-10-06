# todo @ aufbau

https://blog.logrocket.com/ux-design/40-essential-ui-elements/

---

## `AufbauCore`

```javascript
class AudioPlaylist {
  static container = 'audio-playlist';
}
```

```javascript
class AudioPlaylist {
  static containerName = 'audio-playlist';
}
```

```javascript
class AudioPlaylist {
  static meta = {
    '@container' : 'audio-playlist';
  };
}
```

---

```
aufbau-avatar
aufbau-emoji
aufbau-feedback
aufbau-form
aufbau-paginate
aufbau-stepper
aufbau-tabs
aufbau-timeline
aufbau-tooltip

aufbau-dropdown
aufbau-flyout
aufbau-popover
aufbau-sidescroll

badge / chip
card
charts
comment
empty
skeleton
```

```
btn-copy
btn-share

audio-bandcamp
audio-embed
audio-player
audio-playlist
audio-song
audio-release

video-embed
video-player
video-youtube

embed-bandcamp
embed-mastodon
embed-soundcloud
embed-spotify
embed-youtube

indicate-error
indicate-loading
indicate-success

input-bool
input-chips
input-color
input-date
input-email
input-number
inout-password
input-phone
input-search
input-slug
input-text
input-time
input-url
input-year

menu-actions
menu-bento
menu-context

pick-color
pick-country
pick-currency
pick-date
pick-emoji
pick-font
pick-hotkey
pick-icon
pick-item
pick-language
pick-locale
pick-time
pick-timezone
pick-unit
pick-year

view-json
view-pdf
view-zip
```

---

## aufbau/elements/core

### bessere props und logging

```js
#isMounted = false;
#tag       = this.localName;
#logger    = new Logger({ prefix: this.#tag });

#error  = (...args) => this.#logger.error (...args);
#info   = (...args) => this.#logger.info  (...args);
#log    = (...args) => this.#logger.log   (...args);
#warn   = (...args) => this.#logger.warn  (...args);
```

wobei vermutlich für jedes element ne neue instanz zu machen quatsch ist. aber vom grundprinzip dachte ich mir, dass man so besseres debugging zur verfügung stellen könnte.

### `<aufbau-input>` enhancements

`<aufbau-input>` sollte optional so icons/buttons mitbringen für: clear, copy, paste

### `<aufbau-progress>`

- könnte als look vllt noch `circle` bekommen

## new elements

- [ ] `aufbau-breadcrumbs` (oder `aufbau-crumbs`?)
- [ ] `aufbau-menu`
- [ ] `aufbau-menu-item`
- [ ] `aufbau-modal` + interface

und bei denen weiss ich nicht genau, ob die eigene elements oder lieber type/look sein sollten:

- [ ] `aufbau-contextmenu` (oder teil von `aufbau-menu`) ?

---

# `@aufbau/gestures`

```js
gestures(element, {
  onTap        : gesture => select(gesture.target),
  onSwipeLeft  : gesture => next(),
  onSwipeRight : { minimumSpeed: 1, handler: gesture => previous() },
});

element.addEventListener('swipeleft', event => next());   // the same, as a dom event
```

```js
import gestures from '@aufbau/gestures';

gestures.apply(element, {
  onTap        : gesture => select(gesture.target),
  onSwipeLeft  : gesture => next(),
  onSwipeRight : { minimumSpeed: 1, handler: gesture => previous() },
});
```

```js
//
import '@aufbau/gestures/prototype.js';

element.addGestureListener('swipeleft',  event => {});
element.addGestureListener('swiperight', event => {});
```

```js
//
import { onSwipeLeft, onSwipeRight } from '@aufbau/gestures';

onSwipeLeft  (element, handler);
onSwipeRight (element, handler);
```

