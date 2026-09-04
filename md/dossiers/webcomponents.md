# custom elements | webcomponents

## snippets

### get tagName

```javascript
class CustomButton extends HTMLElement {
  constructor() {
    // Always call super() first before accessing 'this'
    super();

     // 1. Lowercase tag name (e.g., "custom-button") - recommended
    const localName = this.localName;

    // 2. Uppercase tag name (e.g., "CUSTOM-BUTTON")
    const tagName = this.tagName;

    // 3. Tag name retrieved from the registry via the class constructor
    const registeredName = customElements.getName(this.constructor);

    console.log({ localName, tagName, registeredName });
  }
}

customElements.define('custom-button', CustomButton);
```
