# todo

mindestens zu bearbeitende files:
```
aufbau/runtime/boot.js
aufbau/runtime/gui.js
aufbau/runtime/index.js

```

import * as client   from './client.js';
import * as dom      from '@domina/core';
import * as webfonts from '@aufbau/webfonts';

aufbau/filters
aufbau/gestures
aufbau/import
aufbau/patterns
aufbau/webfonts

bekommen ne bessere/saubere API/facade verpasst:
- sodass sie wenn sie zb von der runtime direkt importiert werden, nicht direkt massenweise files mit sich ziehen
- recht einheitlich und intuitiv genutzt werden können


```javascript
import aufbau from '@aufbau/runtime';

// original methoden
aufbau.filters.apiMethod();
aufbau.gestures.apiMethod();
aufbau.patterns.apiMethod();
aufbau.webfonts.apiMethod();

// zusätzlich schafft sich die aufbau/runtime noch eine zusätzliche facade:

aufbau.applyFilter  = aufbau.filters.apply;
aufbau.applyPattern = aufbau.patterns.apply;

```

```javascript
