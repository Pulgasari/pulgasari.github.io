# stylescript

entwurf für ss als ne art htx für css.

## examples

```javascript
// define reusable sub-snippets
const colorWithBenefits = css`type(<color> | bg | fg | ink)`;
```

```javascript
// cnstruct the main CSS string
let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg ${colorWithBenefits} : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);
```

```javascript
// ::::::::: extended variant 1
import { css } from '@aufbau/stylescript';

css.types.colorWithBenefits      = css`type(<color> | bg | fg | ink)`;
css.types['color-with-benefits'] = css`type(<color> | bg | fg | ink)`;

let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg <color-with-benefits> : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);
```

```javascript
// ::::::::: extended variant 2
import { css } from '@aufbau/stylescript';

css.types['color-with-benefits'] = css`type(<color> | bg | fg | ink)`;
css.types['color-with-benefits'] = ['<color>', 'bg', 'fg', 'ink'];

let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg <color-with-benefits> : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);
```
