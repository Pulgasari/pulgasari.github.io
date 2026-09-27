/**
 * Micro-library to evaluate any CSS function or expression on the fly.
 */
const evaluateCSS = (() => {
  let helperElement = null;

  // Pattern mapping for automatic property detection
  const PROPERTY_MAP = [
    {
      // Color values: hex, rgb/rgba, hsl/hsla, lab, oklch, light-dark(), etc.
      pattern: /^(#|rgb|hsl|lab|lch|color|light-dark|color-mix)/i,
      property: 'color'
    },
    {
      // Filter functions: blur(), drop-shadow(), brightness(), etc.
      pattern: /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)/i,
      property: 'filter'
    },
    {
      // Transform functions: rotate(), scale(), translate(), matrix(), etc.
      pattern: /^(rotate|scale|translate|matrix|skew)/i,
      property: 'transform'
    },
    {
      // Time values: 300ms, 1.5s
      pattern: /\d+(s|ms)$/i,
      property: 'transition-duration'
    }
  ];

  /**
   * Helper to guess the most fitting CSS property for an expression.
   */
  function detectProperty(value) {
    const trimmed = value.trim();
    for (const { pattern, property } of PROPERTY_MAP) {
      if (pattern.test(trimmed)) return property;
    }
    // Default to 'width' for math and length expressions (calc, clamp, min, max, px, rem, etc.)
    return 'width';
  }

  /**
   * Evaluates a CSS expression and returns its resolved value.
   *
   * @param {string} expression - The CSS function/value to evaluate (e.g., 'rgba(255, 0, 0, 0.5)', 'clamp(10px, 2vw, 20px)').
   * @param {string} [property] - Optional CSS property override.
   * @param {HTMLElement} [parent=document.body] - Optional parent element for relative percentage/em context.
   * @returns {string} The computed resolved value.
   */
  return function evaluate(expression, property, parent = document.body) {
    if (!expression) return '';

    // Lazily create the DOM element on first use
    if (!helperElement) {
      helperElement = document.createElement('div');
      helperElement.style.position = 'absolute';
      helperElement.style.visibility = 'hidden';
      helperElement.style.pointerEvents = 'none';
      helperElement.setAttribute('aria-hidden', 'true');
    }

    // Attach to the specified parent if context changed or detached
    if (helperElement.parentElement !== parent && parent) {
      parent.appendChild(helperElement);
    }

    const targetProperty = property || detectProperty(expression);

    // Reset styles to avoid leftover side effects
    helperElement.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none;';
    
    // Assign expression and evaluate
    helperElement.style.setProperty(targetProperty, expression);
    return window.getComputedStyle(helperElement).getPropertyValue(targetProperty);
  };
})();
